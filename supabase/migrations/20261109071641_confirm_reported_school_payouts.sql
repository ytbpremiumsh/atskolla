begin;
alter table public.spp_invoices
  add column if not exists settlement_status text check (settlement_status is null or settlement_status in ('paid','processing')),
  add column if not exists settlement_confirmed_at timestamptz,
  add column if not exists settlement_confirmation_source text check (settlement_confirmation_source is null or settlement_confirmation_source in ('provider','owner_reported'));

-- These fields are financial confirmations; ordinary client writes cannot set them.
create or replace function public.protect_invoice_settlement_confirmation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (TG_OP = 'INSERT' and (new.settlement_status is not null or new.settlement_confirmed_at is not null or new.settlement_confirmation_source is not null))
     or (TG_OP = 'UPDATE' and (new.settlement_status is distinct from old.settlement_status or new.settlement_confirmed_at is distinct from old.settlement_confirmed_at or new.settlement_confirmation_source is distinct from old.settlement_confirmation_source)) then
    if coalesce(auth.role(),'') <> 'service_role' and current_user not in ('postgres','supabase_admin') then
      raise exception 'Konfirmasi pencairan hanya dapat dicatat oleh layanan berwenang' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.protect_invoice_settlement_confirmation() from public,anon,authenticated;
drop trigger if exists protect_invoice_settlement_confirmation on public.spp_invoices;
create trigger protect_invoice_settlement_confirmation before insert or update on public.spp_invoices
for each row execute function public.protect_invoice_settlement_confirmation();

-- Owner confirmed these two specific daily groups in this conversation.
-- confirmed_at is the recording time, not an invented bank transfer timestamp.
do $$
declare affected integer;
begin
  if not exists (select 1 from public.schools where id='f6e13c8c-70fb-4a6a-adf9-e6014bdb44f1' and name='SMA Negeri 1 Cendikia') then raise exception 'Sekolah tidak cocok'; end if;
  if not exists (select 1 from public.spp_invoices where school_id='f6e13c8c-70fb-4a6a-adf9-e6014bdb44f1' and status='paid' and doku_split=true and settlement_id is null and (paid_at at time zone 'Asia/Jakarta')::date='2026-11-06' group by school_id having count(*)=2 and sum(total_amount)=36000)
  or not exists (select 1 from public.spp_invoices where school_id='f6e13c8c-70fb-4a6a-adf9-e6014bdb44f1' and status='paid' and doku_split=true and settlement_id is null and (paid_at at time zone 'Asia/Jakarta')::date='2026-11-07' group by school_id having count(*)=2 and sum(total_amount)=2000) then raise exception 'Kelompok pencairan tidak cocok'; end if;
  update public.spp_invoices set settlement_status='paid',settlement_confirmed_at=coalesce(settlement_confirmed_at,now()),settlement_confirmation_source='owner_reported'
  where school_id='f6e13c8c-70fb-4a6a-adf9-e6014bdb44f1' and status='paid' and doku_split=true and settlement_id is null and (paid_at at time zone 'Asia/Jakarta')::date in ('2026-11-06','2026-11-07');
  get diagnostics affected = row_count;
  if affected<>4 then raise exception 'Jumlah transaksi berubah'; end if;
end $$;
commit;
