import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileImage, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

export const BANK_BOOK_BUCKET = "bank-account-documents";
export const MAX_BANK_BOOK_SIZE = 5 * 1024 * 1024;
export async function validateBankBook(file: File): Promise<void> {
  if (!file.size || file.size > MAX_BANK_BOOK_SIZE) throw new Error("Foto buku tabungan maksimal 5 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const webp = String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!((file.type === "image/jpeg" && jpeg) || (file.type === "image/png" && png) || (file.type === "image/webp" && webp))) {
    throw new Error("Gunakan foto JPG, PNG, atau WebP yang valid.");
  }
}

/** Signed URLs are created on demand and never persisted as public links. */
export function BankBookAttachment({ path, bank, holder }: { path?: string | null; bank?: string | null; holder?: string | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!path) return <p className="text-xs text-muted-foreground">Buku tabungan belum dilampirkan (rekening lama).</p>;
  const view = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase.storage.from(BANK_BOOK_BUCKET).createSignedUrl(path, 300);
      if (error || !data?.signedUrl) throw error || new Error("Lampiran tidak tersedia");
      setUrl(data.signedUrl);setOpen(true);
    } catch { toast.error("Lampiran tidak dapat dibuka. Periksa akses Anda lalu coba lagi."); }
    finally { setLoading(false); }
  };
  return <>
    <Button size="sm" variant="outline" type="button" onClick={view} disabled={loading} className="mt-2 h-8 text-xs">
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileImage className="mr-1.5 h-3.5 w-3.5" />}Lihat Buku Tabungan
    </Button>
    <Dialog open={open} onOpenChange={value => {setOpen(value);if (!value) {setUrl("");setFailed(false);}}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Halaman depan buku tabungan</DialogTitle><DialogDescription>{bank} · a.n. {holder}. Cocokkan bank, nomor rekening, dan nama pemilik sebelum memverifikasi.</DialogDescription></DialogHeader>
        {failed ? <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Foto gagal dimuat atau tautan sudah kedaluwarsa. Tutup lalu buka kembali lampiran.</div> : <img src={url} alt={`Buku tabungan ${bank || "bank"} atas nama ${holder || "pemilik rekening"}`} onError={() => setFailed(true)} className="max-h-[65dvh] w-full rounded-xl object-contain bg-muted" referrerPolicy="no-referrer" />}
        <p className="text-xs text-muted-foreground">Dokumen privat untuk keperluan verifikasi rekening. Tautan berlaku 5 menit.</p>
      </DialogContent>
    </Dialog>
  </>;
}
