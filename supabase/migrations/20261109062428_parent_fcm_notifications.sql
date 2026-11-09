BEGIN;
CREATE SCHEMA IF NOT EXISTS atskolla_push_private;
REVOKE ALL ON SCHEMA atskolla_push_private FROM PUBLIC,anon,authenticated;

CREATE TABLE public.parent_push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fcm_token text NOT NULL UNIQUE CHECK(length(fcm_token) BETWEEN 20 AND 4096),
 session_token text NOT NULL REFERENCES public.parent_sessions(token) ON DELETE CASCADE,
 app_package text NOT NULL CHECK(app_package='com.atskolla.parent'),
 app_version integer NOT NULL DEFAULT 0,
 registered_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 disabled_at timestamptz
);
CREATE TABLE public.parent_push_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('attendance','invoice_new')),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expanded_at timestamptz
);
CREATE TABLE public.parent_push_deliveries (
 event_id bigint NOT NULL REFERENCES public.parent_push_events(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.parent_push_devices(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','dead')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 delivered_at timestamptz,
 last_error text,
 PRIMARY KEY(event_id,device_id)
);
CREATE TABLE public.parent_push_runtime (
 id integer PRIMARY KEY CHECK(id=1), enabled boolean NOT NULL DEFAULT false,
 project_id text NOT NULL DEFAULT 'atskolla-parent', last_dispatch_at timestamptz
);
INSERT INTO public.parent_push_runtime(id) VALUES(1);
ALTER TABLE public.parent_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_push_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_push_runtime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_push_devices,public.parent_push_events,public.parent_push_deliveries,public.parent_push_runtime FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.parent_push_devices,public.parent_push_events,public.parent_push_deliveries,public.parent_push_runtime TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.parent_push_events_id_seq TO service_role;
CREATE INDEX parent_push_events_unexpanded ON public.parent_push_events(created_at) WHERE expanded_at IS NULL;
CREATE INDEX parent_push_deliveries_pending ON public.parent_push_deliveries(next_attempt_at) WHERE status IN ('pending','sending');
CREATE INDEX parent_push_devices_session ON public.parent_push_devices(session_token);

CREATE FUNCTION atskolla_push_private.phone(raw text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN d LIKE '0%' THEN '62'||substr(d,2) WHEN d LIKE '8%' THEN '62'||d ELSE d END
 FROM (SELECT regexp_replace(coalesce(raw,''),'[^0-9]','','g') AS d) s;
$$;
REVOKE ALL ON FUNCTION atskolla_push_private.phone(text) FROM PUBLIC,anon,authenticated;

-- Credentials stay in Vault and are never embedded in application code or returned to clients.
CREATE FUNCTION atskolla_push_private.kick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE worker_key text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.parent_push_runtime WHERE id=1 AND enabled) THEN RETURN; END IF;
 IF current_setting('atskolla.push_kicked',true)='1' THEN RETURN; END IF;
 SELECT decrypted_secret INTO worker_key FROM vault.decrypted_secrets WHERE name='email_queue_service_role_key' LIMIT 1;
 IF worker_key IS NULL THEN RETURN; END IF;
 PERFORM set_config('atskolla.push_kicked','1',true);
 PERFORM net.http_post(url:='https://bohuglednqirnaearrkj.supabase.co/functions/v1/parent-push-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_key),body:='{}'::jsonb,timeout_milliseconds:=10000);
EXCEPTION WHEN OTHERS THEN NULL; -- Notification transport must never stop attendance or billing writes.
END;
$$;
REVOKE ALL ON FUNCTION atskolla_push_private.kick() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION atskolla_push_private.enqueue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE event_kind text; event_payload jsonb; event_key text;
BEGIN
 IF TG_TABLE_NAME='attendance_logs' THEN
  IF NEW.status<>'hadir' OR NEW.attendance_type NOT IN ('masuk','datang','check_in','pulang','check_out') THEN RETURN NEW; END IF;
  event_kind:='attendance';event_key:='attendance:'||NEW.id::text;
  event_payload:=jsonb_build_object('id',NEW.id,'date',NEW.date,'time',NEW.time,'status',NEW.status,'attendance_type',NEW.attendance_type,'method',NEW.method);
 ELSE
  IF NEW.status NOT IN ('pending','unpaid','partial') THEN RETURN NEW; END IF;
  event_kind:='invoice_new';event_key:='invoice_new:'||NEW.id::text;
  event_payload:=jsonb_build_object('id',NEW.id,'period_label',NEW.period_label,'invoice_number',NEW.invoice_number,'total_amount',NEW.total_amount,'due_date',NEW.due_date,'status',NEW.status,'created_at',NEW.created_at);
 END IF;
 INSERT INTO public.parent_push_events(event_key,kind,school_id,student_id,payload)
 VALUES(event_key,event_kind,NEW.school_id,NEW.student_id,event_payload) ON CONFLICT DO NOTHING;
 PERFORM atskolla_push_private.kick();
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Parent push enqueue failed: %',SQLSTATE;RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION atskolla_push_private.enqueue() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER parent_push_attendance AFTER INSERT OR UPDATE OF status,attendance_type ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION atskolla_push_private.enqueue();
CREATE TRIGGER parent_push_invoice AFTER INSERT ON public.spp_invoices FOR EACH ROW EXECUTE FUNCTION atskolla_push_private.enqueue();

-- Only the server worker may claim deliveries. Ownership is resolved from current
-- parent sessions and student phone data, never the currently selected child.
CREATE FUNCTION public.claim_parent_push_batch(batch_size integer DEFAULT 100)
RETURNS TABLE(event_id bigint,device_id uuid,attempt integer,fcm_token text,session_token text,event_key text,kind text,student_id uuid,payload jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 WITH expanded AS (
  UPDATE public.parent_push_events e SET expanded_at=now()
  WHERE e.id IN (SELECT q.id FROM public.parent_push_events q WHERE q.expanded_at IS NULL ORDER BY q.id LIMIT 200 FOR UPDATE SKIP LOCKED)
  RETURNING e.*
 )
 INSERT INTO public.parent_push_deliveries(event_id,device_id)
 SELECT e.id,d.id FROM expanded e JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id
 JOIN public.parent_sessions ps ON atskolla_push_private.phone(ps.phone)=atskolla_push_private.phone(s.parent_phone) AND ps.expires_at>now()
 JOIN public.parent_push_devices d ON d.session_token=ps.token AND d.disabled_at IS NULL AND d.registered_at<=e.created_at
 WHERE e.created_at>now()-interval '24 hours' ON CONFLICT DO NOTHING;

 RETURN QUERY
 WITH candidates AS (
  SELECT d.event_id,d.device_id FROM public.parent_push_deliveries d
  JOIN public.parent_push_events e ON e.id=d.event_id
  JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id
  JOIN public.parent_push_devices dev ON dev.id=d.device_id AND dev.disabled_at IS NULL
  JOIN public.parent_sessions ps ON ps.token=dev.session_token AND ps.expires_at>now()
    AND atskolla_push_private.phone(ps.phone)=atskolla_push_private.phone(s.parent_phone)
  WHERE (d.status='pending' OR (d.status='sending' AND d.lease_until<now())) AND d.next_attempt_at<=now()
    AND d.attempts<6 AND e.created_at>now()-interval '24 hours'
  ORDER BY d.event_id LIMIT greatest(1,least(batch_size,200)) FOR UPDATE OF d SKIP LOCKED
 ), leased AS (
  UPDATE public.parent_push_deliveries d SET status='sending',attempts=d.attempts+1,lease_until=now()+interval '2 minutes'
  FROM candidates c WHERE d.event_id=c.event_id AND d.device_id=c.device_id RETURNING d.*
 )
 SELECT l.event_id,l.device_id,l.attempts,dev.fcm_token,dev.session_token,e.event_key,e.kind,e.student_id,e.payload
 FROM leased l JOIN public.parent_push_devices dev ON dev.id=l.device_id JOIN public.parent_push_events e ON e.id=l.event_id;
 DELETE FROM public.parent_push_events WHERE created_at<now()-interval '7 days';
 DELETE FROM public.parent_push_devices WHERE last_seen_at<now()-interval '45 days';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_parent_push_batch(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_parent_push_batch(integer) TO service_role;

-- Enable retry scheduling only after the worker authenticates with Firebase.
CREATE FUNCTION public.enable_parent_push_delivery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.parent_push_runtime SET enabled=true,last_dispatch_at=now() WHERE id=1;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='atskolla-parent-push') THEN
  PERFORM cron.schedule('atskolla-parent-push','* * * * *','SELECT atskolla_push_private.kick();');
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enable_parent_push_delivery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enable_parent_push_delivery() TO service_role;
COMMIT;
