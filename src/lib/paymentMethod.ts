// Helper bersama untuk format payment_method jadi label rapi (UI & export)
export const formatPaymentMethodLabel = (m?: string | null, channel?: string | null): string => {
  const c = (channel || "").toLowerCase();
  if (c) {
    if (c.includes("qris")) return "QRIS";
    if (c.includes("va") || c.includes("virtual") || c.includes("bank") || c.includes("transfer")) return "Transfer Bank";
    if (c.includes("alfa") || c.includes("indomaret") || c.includes("retail") || c.includes("gerai")) return "Gerai Ritel";
    if (c.includes("wallet") || c.includes("ovo") || c.includes("dana") || c.includes("shopee")) return "E-Wallet";
  }
  const v = (m || "").toLowerCase();
  if (v === "offline_cash") return "Tunai";
  if (v === "offline_transfer") return "Transfer Manual ke Rekening";
  if (v === "qris") return "QRIS";
  if (v === "wa_credit" || v.includes("wa_credit")) return "Kredit WA";
  if (v === "doku" || v.includes("doku")) return "Transfer Bank";
  if (v === "mayar" || v.includes("mayar")) return "QRIS";
  if (v.includes("transfer") || v.includes("bank") || v === "va") return "Transfer Bank";
  if (v === "spp" || v === "" || !v) return "QRIS / Transfer Bank";
  return m || "-";
};
