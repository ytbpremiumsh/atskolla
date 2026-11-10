begin;
create table if not exists public.school_payment_preferences (
 school_id uuid primary key references public.schools(id) on delete cascade,
 enabled_channels text[] not null default array['qris','va','retail']::text[],
 updated_at timestamptz not null default now(),
 constraint valid_school_payment_channels check (enabled_channels <@ array['qris','va','retail']::text[])
);
alter table public.school_payment_preferences enable row level security;
revoke all on public.school_payment_preferences from anon;
grant select,insert,update on public.school_payment_preferences to authenticated;
grant all on public.school_payment_preferences to service_role;
create policy school_payment_preferences_read on public.school_payment_preferences for select to authenticated
using (public.has_role(auth.uid(),'super_admin') or (school_id=public.get_user_school_id(auth.uid()) and (public.has_role(auth.uid(),'bendahara') or public.has_role(auth.uid(),'school_admin'))));
create policy school_payment_preferences_insert on public.school_payment_preferences for insert to authenticated
with check (public.has_role(auth.uid(),'super_admin') or (school_id=public.get_user_school_id(auth.uid()) and (public.has_role(auth.uid(),'bendahara') or public.has_role(auth.uid(),'school_admin'))));
create policy school_payment_preferences_update on public.school_payment_preferences for update to authenticated
using (public.has_role(auth.uid(),'super_admin') or (school_id=public.get_user_school_id(auth.uid()) and (public.has_role(auth.uid(),'bendahara') or public.has_role(auth.uid(),'school_admin'))))
with check (public.has_role(auth.uid(),'super_admin') or (school_id=public.get_user_school_id(auth.uid()) and (public.has_role(auth.uid(),'bendahara') or public.has_role(auth.uid(),'school_admin'))));
alter table public.spp_invoices add column if not exists payment_fee_model text;
alter table public.spp_invoices add column if not exists doku_payment_method text, add column if not exists gateway_fee_estimate integer;
-- Historical invoices and existing bank confirmations are deliberately preserved.

alter table public.spp_invoices add column if not exists doku_payment_method text, add column if not exists gateway_fee_estimate integer;
create or replace function public.school_payment_costs() returns jsonb language plpgsql security definer set search_path='' as $$
declare tariffs jsonb; admin_fee text;
begin
 if auth.uid() is null or not (public.has_role(auth.uid(),'school_admin') or public.has_role(auth.uid(),'bendahara') or public.has_role(auth.uid(),'super_admin')) then raise exception 'Akses ditolak' using errcode='42501';end if;
 select value::jsonb into tariffs from public.platform_settings where key='doku_merchant_tariffs';
 select value into admin_fee from public.platform_settings where key='atskolla_admin_fee';
 return jsonb_build_object('tariffs',coalesce(tariffs,'{}'::jsonb),'admin_fee',coalesce(admin_fee,'3000')::integer);
end $$;
revoke all on function public.school_payment_costs() from public,anon;
grant execute on function public.school_payment_costs() to authenticated;


alter table public.spp_installments add column if not exists gateway_fee_estimate integer;
create or replace function public.update_installment_gateway_fee_estimate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.gateway_fee_estimate is not null then
 update public.spp_invoices set gateway_fee_estimate=(select coalesce(sum(gateway_fee_estimate),0) from public.spp_installments where invoice_id=new.invoice_id and status='paid')
 where id=new.invoice_id and payment_fee_model='school_gateway_admin_v1';
 end if;return new;
end $$;
revoke all on function public.update_installment_gateway_fee_estimate() from public,anon,authenticated;
drop trigger if exists installment_gateway_estimate on public.spp_installments;
create trigger installment_gateway_estimate after insert or update of status on public.spp_installments for each row execute function public.update_installment_gateway_fee_estimate();

commit;
