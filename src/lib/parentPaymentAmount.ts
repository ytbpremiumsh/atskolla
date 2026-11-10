export type InstallmentPaymentMode = "full" | "installment" | null;

/** The choice dialog supplies either the remaining balance or a chosen installment. */
export function parentPaymentRequest(mode: InstallmentPaymentMode, chosenAmount: number, invoiceTotal: number) {
  const fromChoice = mode !== null;
  const amount = Math.round(Math.max(0, Number(fromChoice ? chosenAmount : invoiceTotal) || 0));
  return { action: fromChoice ? "spp_pay_installment" : "spp_pay", amount, fromChoice } as const;
}
