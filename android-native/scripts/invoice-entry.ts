import { generateSppInvoicePDF, type SppInvoicePDFData } from '../../src/lib/sppInvoicePDF';

// The APK uses the web generator itself, never a second native invoice template.
(window as any).makeSchoolInvoice = async (data: SppInvoicePDFData) => {
  try {
    const doc = await generateSppInvoicePDF(data);
    (window as any).__invoiceResult = doc.output('datauristring').split(',')[1];
  } catch {
    (window as any).__invoiceResult = 'ERROR';
  }
};
