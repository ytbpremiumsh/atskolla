import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Landmark, ShieldAlert } from "lucide-react";
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
    ? "Rekening sekolah masih menunggu verifikasi dari tim ATSkolla. Tagihan SPP dan tagihan lainnya baru dapat dibuat setelah rekening terverifikasi."
    : blocked === "rejected"
      ? "Pengajuan rekening ditolak. Perbaiki data rekening melalui Dasbor Bendahara dan ajukan kembali. Tagihan baru dapat dibuat setelah rekening terverifikasi."
      : blocked === "unavailable"
        ? "Status verifikasi rekening belum dapat diperiksa. Periksa koneksi Anda, lalu coba lagi. Tagihan belum dibuat."
        : "Daftarkan rekening pencairan sekolah melalui Dasbor Bendahara terlebih dahulu, lalu tunggu hingga statusnya Terverifikasi sebelum membuat tagihan.";
  return <Guard.Provider value={ensureVerified}>
    {children}
    <Dialog open={blocked !== null} onOpenChange={(open) => { if (!open) setBlocked(null); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-primary/20 p-0 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 p-6 pr-10 text-left text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:12px_12px]" />
          <ShieldAlert className="relative mb-3 h-8 w-8" aria-hidden="true" />
          <DialogTitle className="relative text-lg text-white">Tagihan belum dapat dibuat</DialogTitle>
          <DialogDescription className="relative text-xs text-white/85">Rekening sekolah harus terverifikasi terlebih dahulu.</DialogDescription>
        </DialogHeader>
        <p className="p-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <DialogFooter className="gap-2 border-t bg-primary/5 p-4 sm:gap-2">
          <Button variant="outline" onClick={() => setBlocked(null)}>Mengerti</Button>
          {blocked !== "unavailable" && <Button asChild><Link to={roles.includes("bendahara") ? "/bendahara/withdraw?tab=pencairan" : "/staff"} onClick={() => setBlocked(null)}>
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
