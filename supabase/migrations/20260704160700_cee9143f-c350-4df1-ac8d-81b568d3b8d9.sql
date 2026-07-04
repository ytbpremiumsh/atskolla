
ALTER TABLE public.bendahara_bank_accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

ALTER TABLE public.spp_settlements
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
