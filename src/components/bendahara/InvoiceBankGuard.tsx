import { BankVerificationIllustration } from "@/components/bank/BankVerificationIllustration";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Landmark, LockKeyhole, Clock3 } from "lucide-react";
import { checkInvoiceBank, type InvoiceBankState } from "@/lib/invoiceBankVerification";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const Guard = createContext<((schoolId?: string | null) => Promise<boolean>) | null>(null);
export function InvoiceBankGuardProvider({ children }: { children: ReactNode }) {
  const { roles } = useAuth();
  const [blocked, setBlocked] = useState<InvoiceBankState | null>(null);
  const ensureVerified = async (schoolId?: string | null) => {
    const state = await checkInvoiceBank(schoolId);
    if (state === "verified") return true;
    setBlocked(state);
    return false;
  };
  const message = blocked === "pending"
    ? "Rekening sekolah masih menunggu verifikasi dari Penyedia Layanan Gateway. Tagihan SPP dan tagihan lainnya baru dapat dibuat setelah rekening terverifikasi."
    : blocked === "rejected"
      ? "Pengajuan rekening ditolak. Perbaiki data rekening melalui Dasbor Bendahara dan ajukan kembali. Tagihan baru dapat dibuat setelah rekening terverifikasi."
      : blocked === "unavailable"
        ? "Status verifikasi rekening belum dapat diperiksa. Periksa koneksi Anda, lalu coba lagi. Tagihan belum dibuat."
        : "Daftarkan rekening pencairan sekolah melalui Dasbor Bendahara terlebih dahulu, lalu tunggu hingga statusnya Terverifikasi sebelum membuat tagihan.";
  return <Guard.Provider value={ensureVerified}>
    {children}
    <Dialog open={blocked !== null} onOpenChange={(open) => { if (!open) setBlocked(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-lg gap-0 overflow-y-auto rounded-3xl border-primary/20 p-0 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100">
        <DialogHeader className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-violet-600 px-5 pb-6 pt-7 text-left text-white sm:px-6">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(white_0.75px,transparent_0.75px)] [background-size:16px_16px]" />
          <div className="relative grid grid-cols-[1fr_104px] items-center gap-2 sm:grid-cols-[1fr_148px]">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90"><LockKeyhole className="h-3 w-3" aria-hidden="true" />Verifikasi rekening</span>
              <DialogTitle className="text-xl font-bold leading-snug text-white sm:text-2xl">Tagihan belum dapat dibuat</DialogTitle>
              <DialogDescription className="mt-2 text-xs leading-relaxed text-white/85">Rekening sekolah harus terverifikasi terlebih dahulu.</DialogDescription>
            </div>
            <BankVerificationIllustration />
          </div>
        </DialogHeader>
        <div className="space-y-4 bg-gradient-to-b from-primary/[0.035] to-card px-5 py-5 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><Clock3 className="h-3 w-3" aria-hidden="true" />{blocked === "pending" ? "Menunggu verifikasi" : blocked === "rejected" ? "Data perlu diperbaiki" : blocked === "unavailable" ? "Pemeriksaan belum berhasil" : "Rekening belum diajukan"}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />Tagihan hanya dibuat setelah status rekening terverifikasi.</p>
        </div>
        <DialogFooter className="flex-row gap-2 border-t border-primary/10 bg-primary/[0.035] px-5 py-4 sm:gap-2 sm:px-6">
          <Button className="h-9 rounded-xl px-4 text-xs shadow-none sm:text-sm" variant="outline" onClick={() => setBlocked(null)}>Mengerti</Button>
          {blocked !== "unavailable" && <Button className="h-9 rounded-xl px-4 text-xs shadow-none sm:text-sm" asChild><Link to={roles.includes("bendahara") ? "/bendahara/withdraw?tab=pencairan" : "/staff"} onClick={() => setBlocked(null)}>
            <Landmark className="mr-2 h-4 w-4" aria-hidden="true" />{roles.includes("bendahara") ? "Kelola rekening" : "Kelola Bendahara"}
          </Link></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Guard.Provider>;
}
export function useInvoiceBankGuard() {
  const guard = useContext(Guard);
  if (!guard) throw new Error("Pemeriksaan rekening belum tersedia.");
  return guard;
}
