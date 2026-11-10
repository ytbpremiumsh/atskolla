-- Per-school choices retain the existing school/finance RLS policies.
alter table public.school_payment_preferences
 add column if not exists disabled_methods text[] not null default '{}'::text[];
