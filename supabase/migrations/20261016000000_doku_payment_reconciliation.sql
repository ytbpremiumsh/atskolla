-- Durable DOKU order mapping and independent, authenticated recovery checks.
-- Never infer settlement from an unverified webhook or the browser redirect.
CREATE TABLE IF NOT EXISTS public.doku_payment_attempts (
  order_number text PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.spp_invoices(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.spp_installments(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  expected_amount numeric NOT NULL CHECK (expected_amount > 0),
  bill_amount numeric NOT NULL CHECK (bill_amount > 0),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','paid','review')),
  request_id bigint,
  requested_at timestamptz,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doku_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doku_payment_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.doku_payment_attempts TO service_role;
CREATE INDEX IF NOT EXISTS doku_attempts_due ON public.doku_payment_attempts(next_check_at) WHERE state='pending';

CREATE OR REPLACE FUNCTION public.register_doku_payment_attempt(p_transaction_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  t public.payment_transactions%ROWTYPE;
  v_invoice uuid;
  v_installment uuid;
  v_bill numeric;
BEGIN
  SELECT * INTO t FROM public.payment_transactions WHERE id=p_transaction_id;
  IF NOT FOUND OR t.payment_method NOT IN ('spp','spp_installment') OR t.mayar_transaction_id IS NULL THEN RETURN; END IF;
  IF t.payment_method='spp_installment' THEN
    SELECT s.invoice_id,s.id,s.amount INTO v_invoice,v_installment,v_bill
    FROM public.spp_installments s WHERE s.school_id=t.school_id
      AND s.gateway='doku' AND s.mayar_invoice_id=t.mayar_transaction_id;
  ELSE
    -- Creation logs preserve every order, including links replaced by regeneration.
    SELECT (array_agg(DISTINCT l.invoice_id))[1] INTO v_invoice FROM public.spp_logs l
    WHERE l.school_id=t.school_id AND l.event_type='create_invoice_doku' AND l.status='ok'
      AND coalesce(l.payload#>>'{response,order,invoice_number}',l.payload#>>'{order,invoice_number}')=t.mayar_transaction_id
      AND l.invoice_id IS NOT NULL
    HAVING count(DISTINCT l.invoice_id)=1;
    IF v_invoice IS NULL THEN RETURN; END IF;
    v_bill := t.amount-coalesce(t.service_fee,0);
  END IF;
  IF v_invoice IS NULL OR coalesce(v_bill,0)<=0 OR coalesce(t.amount,0)<=0 THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.spp_invoices WHERE id=v_invoice AND school_id=t.school_id) THEN RETURN; END IF;
  INSERT INTO public.doku_payment_attempts(order_number,invoice_id,installment_id,transaction_id,school_id,expected_amount,bill_amount,state,created_at)
  VALUES(t.mayar_transaction_id,v_invoice,v_installment,t.id,t.school_id,t.amount,v_bill,
    CASE WHEN t.status='paid' THEN 'paid' ELSE 'pending' END,t.created_at)
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.capture_doku_payment_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.register_doku_payment_attempt(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_doku_payment_attempt ON public.payment_transactions;
CREATE TRIGGER capture_doku_payment_attempt AFTER INSERT ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.capture_doku_payment_attempt();

-- Called only after DOKU signature verification or an authenticated status query.
CREATE OR REPLACE FUNCTION public.settle_verified_doku_payment(p_order text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  a public.doku_payment_attempts%ROWTYPE;
  i public.spp_invoices%ROWTYPE;
  t public.payment_transactions%ROWTYPE;
  v_order text := coalesce(p_payload#>>'{order,invoice_number}',p_payload#>>'{response,order,invoice_number}');
  v_status text := upper(coalesce(p_payload#>>'{transaction,status}',p_payload#>>'{response,transaction,status}',''));
  v_type text := upper(coalesce(p_payload#>>'{transaction,type}',p_payload#>>'{response,transaction,type}',''));
  v_amount numeric;
  v_paid_at timestamptz;
  v_changed boolean := false;
  v_duplicate boolean := false;
BEGIN
  SELECT * INTO a FROM public.doku_payment_attempts WHERE order_number=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOKU order not mapped: %',p_order; END IF;
  IF a.state='paid' THEN RETURN jsonb_build_object('already',true,'invoice_id',a.invoice_id); END IF;
  IF a.state='review' THEN RAISE EXCEPTION 'DOKU order requires review: %',p_order; END IF;
  IF v_order IS DISTINCT FROM p_order OR v_status NOT IN ('SUCCESS','PAID','SETTLED','COMPLETED','SUCCESSFUL') THEN
    RAISE EXCEPTION 'DOKU order/status mismatch';
  END IF;
  IF v_type NOT IN ('','SALE','CAPTURE','INSTALLMENT','RECURRING') THEN RAISE EXCEPTION 'DOKU transaction is not a captured payment'; END IF;
  v_amount := coalesce(p_payload#>>'{order,amount}',p_payload#>>'{response,order,amount}')::numeric;
  IF v_amount IS DISTINCT FROM a.expected_amount THEN RAISE EXCEPTION 'DOKU payment amount mismatch'; END IF;
  IF coalesce(p_payload#>>'{transaction,amount_details,currency}',p_payload#>>'{response,transaction,amount_details,currency}','IDR') <> 'IDR' THEN
    RAISE EXCEPTION 'DOKU payment currency mismatch';
  END IF;
  v_paid_at := coalesce(nullif(coalesce(p_payload#>>'{transaction,date}',p_payload#>>'{response,transaction,date}'), '')::timestamptz,now());
  IF v_paid_at>now()+interval '5 minutes' THEN RAISE EXCEPTION 'DOKU payment date is in the future'; END IF;
  SELECT * INTO i FROM public.spp_invoices WHERE id=a.invoice_id FOR UPDATE;
  SELECT * INTO t FROM public.payment_transactions WHERE id=a.transaction_id FOR UPDATE;
  IF i.school_id IS DISTINCT FROM a.school_id OR t.school_id IS DISTINCT FROM a.school_id
    OR t.mayar_transaction_id IS DISTINCT FROM p_order OR t.amount IS DISTINCT FROM a.expected_amount THEN
    RAISE EXCEPTION 'DOKU local transaction mismatch';
  END IF;
  IF a.installment_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.spp_installments s WHERE s.id=a.installment_id AND s.invoice_id=i.id
      AND s.school_id=a.school_id AND s.gateway='doku' AND s.mayar_invoice_id=p_order AND s.amount=a.bill_amount) THEN
      RAISE EXCEPTION 'DOKU installment mismatch';
    END IF;
    IF EXISTS(SELECT 1 FROM public.spp_installments WHERE id=a.installment_id AND status='paid') THEN
      v_changed:=false;
    ELSIF i.status='paid' THEN v_duplicate:=true;
    ELSE
      UPDATE public.spp_installments SET status='paid',paid_at=v_paid_at WHERE id=a.installment_id;
      v_changed:=true; -- existing trigger recalculates installment balance and parent invoice
    END IF;
  ELSE
    IF i.total_amount IS DISTINCT FROM a.bill_amount THEN RAISE EXCEPTION 'DOKU bill changed since checkout'; END IF;
    IF i.status='paid' THEN
      v_duplicate := i.mayar_invoice_id IS DISTINCT FROM p_order OR i.payment_method IS DISTINCT FROM 'doku';
    ELSIF coalesce(i.installment_paid_amount,0)>0 THEN
      -- Do not double-credit a full payment after partial settlement.
      v_duplicate:=true;
    ELSE
      UPDATE public.spp_invoices SET status='paid',paid_at=v_paid_at,payment_method='doku',
        mayar_invoice_id=p_order,service_fee=t.service_fee,payment_channel=t.payment_channel
      WHERE id=i.id;
      v_changed:=true;
    END IF;
  END IF;
  UPDATE public.payment_transactions SET status='paid',paid_at=coalesce(paid_at,v_paid_at) WHERE id=t.id;
  UPDATE public.doku_payment_attempts SET state=CASE WHEN v_duplicate THEN 'review' ELSE 'paid' END,
    request_id=NULL,requested_at=NULL,updated_at=now(),last_error=CASE WHEN v_duplicate THEN 'duplicate_payment_requires_review' ELSE NULL END
  WHERE order_number=p_order;
  INSERT INTO public.spp_logs(school_id,invoice_id,event_type,status,payload,message)
  VALUES(a.school_id,i.id,'doku_verified_settlement',CASE WHEN v_duplicate THEN 'review' ELSE 'paid' END,p_payload,
    CASE WHEN v_duplicate THEN 'Pembayaran tambahan diterima; perlu pemeriksaan bendahara: ' ELSE 'DOKU payment verified: ' END || p_order);
  IF v_changed OR v_duplicate THEN
    INSERT INTO public.notifications(school_id,title,message,type)
    VALUES(a.school_id,CASE WHEN v_duplicate THEN 'Pembayaran DOKU Perlu Diperiksa' ELSE 'Pembayaran SPP Diterima' END,
      'Invoice ' || i.invoice_number || ' — DOKU ' || p_order || CASE WHEN v_duplicate THEN ' telah dibayar lebih dari sekali atau setelah pembayaran lain; periksa sebelum pengembalian dana.' ELSE ' telah terverifikasi otomatis.' END,
      CASE WHEN v_duplicate THEN 'warning' ELSE 'success' END);
  END IF;
  RETURN jsonb_build_object('marked_paid',NOT v_duplicate,'review',v_duplicate,'invoice_id',i.id,'installment_id',a.installment_id,'changed',v_changed);
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_doku_payments(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  a public.doku_payment_attempts%ROWTYPE;
  r record;
  cfg jsonb;
  client_id text;
  secret_key text;
  base_url text;
  rid text;
  ts text;
  target text;
  sig text;
  v_request bigint;
  v_payload jsonb;
  v_status text;
  processed integer:=0;
  queued integer:=0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(16426,1) THEN RETURN jsonb_build_object('busy',true); END IF;
  FOR a IN SELECT * FROM public.doku_payment_attempts WHERE state='pending' AND request_id IS NOT NULL
    ORDER BY requested_at LIMIT 100 FOR UPDATE SKIP LOCKED LOOP
    SELECT * INTO r FROM net._http_response WHERE id=a.request_id;
    IF NOT FOUND THEN
      IF a.requested_at<now()-interval '2 minutes' THEN
        UPDATE public.doku_payment_attempts SET request_id=NULL,requested_at=NULL,last_error='status_query_timeout',next_check_at=now()+interval '1 minute' WHERE order_number=a.order_number;
      END IF;
      CONTINUE;
    END IF;
    BEGIN
      IF r.status_code<>200 OR r.timed_out OR r.error_msg IS NOT NULL THEN
        RAISE EXCEPTION 'DOKU status HTTP %, timeout=%',r.status_code,r.timed_out;
      END IF;
      v_payload:=r.content::jsonb;
      v_status:=upper(coalesce(v_payload#>>'{transaction,status}',v_payload#>>'{response,transaction,status}',''));
      IF v_status IN ('SUCCESS','PAID','SETTLED','COMPLETED','SUCCESSFUL') THEN
        PERFORM public.settle_verified_doku_payment(a.order_number,v_payload);
        processed:=processed+1;
      ELSE
        UPDATE public.doku_payment_attempts SET request_id=NULL,requested_at=NULL,updated_at=now(),
          last_error=CASE WHEN v_status='' THEN 'missing_gateway_status' ELSE 'gateway_' || lower(v_status) END,
          next_check_at=now()+CASE WHEN v_status IN ('EXPIRED','FAILED','REFUNDED') THEN interval '6 hours'
            WHEN created_at<now()-interval '1 day' THEN interval '1 hour' ELSE interval '1 minute' END
        WHERE order_number=a.order_number;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.doku_payment_attempts SET request_id=NULL,requested_at=NULL,updated_at=now(),
        last_error=SQLERRM,next_check_at=now()+interval '5 minutes' WHERE order_number=a.order_number;
      INSERT INTO public.spp_logs(school_id,invoice_id,event_type,status,message)
      VALUES(a.school_id,a.invoice_id,'doku_reconcile_error','error',a.order_number || ': ' || SQLERRM);
    END;
  END LOOP;
  SELECT jsonb_object_agg(key,value) INTO cfg FROM public.platform_settings
    WHERE key IN ('doku_client_id','doku_secret_key','doku_env');
  client_id:=cfg->>'doku_client_id'; secret_key:=cfg->>'doku_secret_key';
  IF coalesce(client_id,'')='' OR coalesce(secret_key,'')='' THEN RETURN jsonb_build_object('processed',processed,'error','DOKU not configured'); END IF;
  base_url:=CASE WHEN lower(cfg->>'doku_env')='sandbox' THEN 'https://api-sandbox.doku.com' ELSE 'https://api.doku.com' END;
  FOR a IN SELECT * FROM public.doku_payment_attempts WHERE state='pending' AND request_id IS NULL AND next_check_at<=now()
    ORDER BY next_check_at,created_at LIMIT greatest(1,least(p_limit,50)) FOR UPDATE SKIP LOCKED LOOP
    rid:=gen_random_uuid()::text;
    ts:=to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
    -- Order IDs are produced by spp-doku with an ASCII safe character set.
    IF a.order_number !~ '^[A-Za-z0-9-]+$' THEN
      UPDATE public.doku_payment_attempts SET state='review',last_error='invalid_order_number' WHERE order_number=a.order_number;
      CONTINUE;
    END IF;
    target:='/orders/v1/status/' || a.order_number;
    -- GET requests MUST omit Digest from both the signing string and headers.
    sig:='HMACSHA256=' || encode(extensions.hmac('Client-Id:' || client_id || E'\nRequest-Id:' || rid
      || E'\nRequest-Timestamp:' || ts || E'\nRequest-Target:' || target,secret_key,'sha256'),'base64');
    v_request:=net.http_get(url:=base_url || target,
      headers:=jsonb_build_object('Client-Id',client_id,'Request-Id',rid,'Request-Timestamp',ts,'Signature',sig),timeout_milliseconds:=10000);
    UPDATE public.doku_payment_attempts SET request_id=v_request,requested_at=now(),attempts=attempts+1,updated_at=now()
      WHERE order_number=a.order_number;
    queued:=queued+1;
  END LOOP;
  RETURN jsonb_build_object('processed',processed,'queued',queued);
END $$;

-- A webhook only wakes the independent status check; its payload cannot mark a bill paid.
CREATE OR REPLACE FUNCTION public.wake_doku_reconciliation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.event_type='doku_webhook' THEN
    UPDATE public.doku_payment_attempts SET next_check_at=least(next_check_at,now())
      WHERE order_number=coalesce(NEW.payload#>>'{body,order,invoice_number}',NEW.payload#>>'{body,response,order,invoice_number}') AND state='pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS wake_doku_reconciliation ON public.spp_logs;
CREATE TRIGGER wake_doku_reconciliation AFTER INSERT ON public.spp_logs FOR EACH ROW EXECUTE FUNCTION public.wake_doku_reconciliation();

REVOKE ALL ON FUNCTION public.register_doku_payment_attempt(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.capture_doku_payment_attempt() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.settle_verified_doku_payment(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconcile_doku_payments(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.wake_doku_reconciliation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_doku_payment_attempt(uuid),public.settle_verified_doku_payment(text,jsonb),public.reconcile_doku_payments(integer) TO service_role;

DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT id FROM public.payment_transactions WHERE payment_method IN ('spp','spp_installment') LOOP
    PERFORM public.register_doku_payment_attempt(t.id);
  END LOOP;
END $$;
-- First pass queues queries; the following tick processes responses. Normal recovery ~1-2 minutes.
SELECT cron.schedule('doku-payment-reconciliation','* * * * *','SELECT public.reconcile_doku_payments(20);');
