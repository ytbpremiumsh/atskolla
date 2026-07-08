
-- 1. Kolom baru di spp_invoices
ALTER TABLE public.spp_invoices
  ADD COLUMN IF NOT EXISTS allow_installment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_paid_amount bigint NOT NULL DEFAULT 0;

-- 2. Kolom baru di schools (default aktif untuk semua sekolah)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS installment_enabled boolean NOT NULL DEFAULT true;

-- 3. Tabel spp_installments
CREATE TABLE IF NOT EXISTS public.spp_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.spp_invoices(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'online_mayar',
  payment_channel text,
  mayar_transaction_id text,
  mayar_payment_url text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spp_installments_invoice ON public.spp_installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_spp_installments_school ON public.spp_installments(school_id);
CREATE INDEX IF NOT EXISTS idx_spp_installments_status ON public.spp_installments(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spp_installments TO authenticated;
GRANT ALL ON public.spp_installments TO service_role;

ALTER TABLE public.spp_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin all installments"
  ON public.spp_installments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "School users manage own installments"
  ON public.spp_installments FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_spp_installments_updated_at
  BEFORE UPDATE ON public.spp_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Validasi: cegah cicilan pada tagihan SPP / tagihan yg belum diaktifkan cicilannya
CREATE OR REPLACE FUNCTION public.trg_validate_installment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill_type text;
  _allow boolean;
  _school_allow boolean;
  _total bigint;
  _paid bigint;
BEGIN
  SELECT i.bill_type, i.allow_installment, i.total_amount,
         COALESCE(s.installment_enabled, true)
  INTO _bill_type, _allow, _total, _school_allow
  FROM public.spp_invoices i
  LEFT JOIN public.schools s ON s.id = i.school_id
  WHERE i.id = NEW.invoice_id;

  IF _bill_type IS NULL THEN
    RAISE EXCEPTION 'Tagihan tidak ditemukan';
  END IF;

  IF _bill_type = 'spp' THEN
    RAISE EXCEPTION 'Tagihan SPP wajib dibayar penuh, tidak dapat dicicil';
  END IF;

  IF NOT _school_allow THEN
    RAISE EXCEPTION 'Fitur cicilan dinonaktifkan untuk sekolah ini';
  END IF;

  IF NOT _allow THEN
    RAISE EXCEPTION 'Tagihan ini belum diaktifkan untuk cicilan oleh bendahara';
  END IF;

  -- Batasi total cicilan tidak melebihi total tagihan
  SELECT COALESCE(SUM(amount), 0) INTO _paid
  FROM public.spp_installments
  WHERE invoice_id = NEW.invoice_id
    AND status = 'paid'
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF (_paid + NEW.amount) > _total AND NEW.status = 'paid' THEN
    RAISE EXCEPTION 'Total cicilan (%) melebihi tagihan (%)', _paid + NEW.amount, _total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_spp_installments
  BEFORE INSERT OR UPDATE ON public.spp_installments
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_installment();

-- 5. Trigger recompute invoice.installment_paid_amount + auto-lunas
CREATE OR REPLACE FUNCTION public.trg_recalc_invoice_from_installments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invoice_id uuid;
  _total bigint;
  _paid bigint;
  _current_status text;
BEGIN
  _invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total_amount, status INTO _total, _current_status
  FROM public.spp_invoices WHERE id = _invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO _paid
  FROM public.spp_installments
  WHERE invoice_id = _invoice_id AND status = 'paid';

  UPDATE public.spp_invoices
  SET installment_paid_amount = _paid,
      status = CASE
        WHEN _paid >= _total THEN 'paid'
        WHEN _current_status = 'paid' AND _paid < _total THEN 'pending'
        ELSE _current_status
      END,
      paid_at = CASE
        WHEN _paid >= _total AND paid_at IS NULL THEN now()
        WHEN _paid < _total AND _current_status = 'paid' THEN NULL
        ELSE paid_at
      END,
      payment_method = CASE
        WHEN _paid >= _total AND payment_method IS NULL THEN 'installment'
        ELSE payment_method
      END,
      net_amount = CASE
        WHEN _paid >= _total THEN total_amount
        ELSE net_amount
      END
  WHERE id = _invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_invoice_after_installment
  AFTER INSERT OR UPDATE OR DELETE ON public.spp_installments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_from_installments();
