import { mpwaFailureMessage } from '../../supabase/functions/_shared/mpwaResponse';

export function whatsAppSendError(data: any): string | null {
  if (data?.success === true) return null;
  const failed = data?.details?.find?.((item: any) => item.ok === false);
  if (failed?.data) return mpwaFailureMessage(failed.data);
  if (typeof data?.error === 'string' && !/^mpwa error$/i.test(data.error)) return data.error;
  return mpwaFailureMessage(data);
}
