REVOKE ALL ON FUNCTION public.expire_spp_payment_transactions_on_invoice_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_spp_payment_transactions_on_invoice_delete() FROM anon;
REVOKE ALL ON FUNCTION public.expire_spp_payment_transactions_on_invoice_delete() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_spp_payment_transactions_on_invoice_delete() TO service_role;