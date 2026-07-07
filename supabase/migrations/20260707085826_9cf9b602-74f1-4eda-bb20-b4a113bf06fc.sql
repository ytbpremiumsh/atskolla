CREATE OR REPLACE FUNCTION public.expire_spp_payment_transactions_on_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.payment_transactions
  SET status = 'expired'
  WHERE school_id = OLD.school_id
    AND payment_method = 'spp'
    AND status = 'pending'
    AND (
      (OLD.mayar_invoice_id IS NOT NULL AND mayar_transaction_id = OLD.mayar_invoice_id)
      OR (OLD.payment_url IS NOT NULL AND mayar_payment_url = OLD.payment_url)
    );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_expire_spp_payment_transactions_on_invoice_delete ON public.spp_invoices;
CREATE TRIGGER trg_expire_spp_payment_transactions_on_invoice_delete
BEFORE DELETE ON public.spp_invoices
FOR EACH ROW
EXECUTE FUNCTION public.expire_spp_payment_transactions_on_invoice_delete();