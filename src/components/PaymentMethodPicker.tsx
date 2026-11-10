import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Wallet, QrCode, Store, Check } from "lucide-react";
import {
  PAYMENT_CHANNELS,
  PaymentChannelId,
  formatIDR,
} from "@/lib/paymentChannels";

type Props = {
  serviceFee?: number;
  paymentMethods?: {id:string;channel:string;label:string}[];
  enabledChannels?: PaymentChannelId[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  billAmount: number;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  feeOverrides?: Partial<Record<PaymentChannelId, number>>;
  qrisPercent?: number;
  onConfirm: (channel: PaymentChannelId, fee: number, total: number, paymentMethod: string) => void | Promise<void>;
};

const CHANNEL_ICONS: Record<PaymentChannelId, any> = {
  va: Wallet,
  qris: QrCode,
  retail: Store,
};

export function PaymentMethodPicker({
  open,
  serviceFee = 3000,
  paymentMethods = [{id:"QRIS",channel:"qris",label:"QRIS"}],
  enabledChannels = ["qris", "va", "retail"],
  onOpenChange,
  billAmount,
  title = "Pilih Metode Pembayaran",
  subtitle,
  loading = false,
  feeOverrides,
  qrisPercent,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<PaymentChannelId>("qris");
  const [chosenMethod,setChosenMethod]=useState("");
  const usableChannels=enabledChannels.filter(c=>paymentMethods.some(m=>m.channel===c));
  const selectedChannel = usableChannels.includes(selected) ? selected : usableChannels[0];
  const availableMethods=paymentMethods.filter(m=>m.channel===selectedChannel);
  const paymentMethod=availableMethods.some(m=>m.id===chosenMethod)?chosenMethod:availableMethods[0]?.id;
  const fee = serviceFee;
  const total = (billAmount || 0) + fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[calc(100dvh-1rem)] overflow-hidden gap-2 p-3 sm:p-4 [@media(max-height:600px)]:gap-1.5">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base sm:text-lg leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-snug line-clamp-2">{subtitle || "Pilih metode pembayaran yang tersedia."}</DialogDescription>
        </DialogHeader>

        {usableChannels.length === 0 && <p className="text-sm text-muted-foreground">Pembayaran online sedang dinonaktifkan sekolah.</p>}
        {/* Daftar channel */}
        <div className="space-y-1.5">
          {PAYMENT_CHANNELS.filter(c => usableChannels.includes(c.id)).map((c) => {
            const Icon = CHANNEL_ICONS[c.id];
            const active = selectedChannel === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                aria-pressed={active}
                className={`w-full text-left rounded-xl border-2 px-2.5 py-2 transition-colors ${
                  active
                    ? "border-[#5B6CF9] bg-[#5B6CF9]/5 shadow-sm"
                    : "border-border/70 hover:border-[#5B6CF9]/40 bg-background"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-[#5B6CF9] text-white" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <p className="font-semibold text-xs sm:text-sm text-foreground">{c.id==="va"?"Transfer Bank (VA)":c.id==="retail"?"Gerai Retail":c.label}</p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          active ? "bg-[#5B6CF9] text-white" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        +{formatIDR(serviceFee)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 [@media(max-height:650px)]:hidden">{c.id === "qris" ? "Bayar lewat e-wallet atau mobile banking" : c.id === "va" ? "Transfer lewat ATM atau mobile banking" : "Bayar tunai di Alfamart atau Indomaret"}</p>
                    <div className="flex flex-nowrap items-center gap-1 mt-1 [@media(max-height:650px)]:hidden">
                      {c.banks.map((b) => (
                        <div
                          key={b.code}
                          className="h-6 w-10 shrink-0 rounded-md bg-white border border-border/50 flex items-center justify-center p-1 shadow-sm"
                        >
                          <img
                            src={b.logo}
                            alt={b.name}
                            loading="lazy"
                            width={64}
                            height={32}
                            className="block h-full w-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div aria-hidden="true" className={`h-5 w-5 rounded-full bg-[#5B6CF9] flex items-center justify-center shrink-0 ${active ? "visible" : "invisible"}`}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                </div>
              </button>
            );
          })}
        </div>

        {availableMethods.length > 1 && <label className="flex items-center gap-2 text-xs"><span className="shrink-0">{selectedChannel==="va"?"Bank":"Gerai"}</span><select aria-label="Pilih bank atau gerai" className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs" value={paymentMethod} onChange={e=>setChosenMethod(e.target.value)}>{availableMethods.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
        {/* Ringkasan total */}
        <div className="rounded-xl border border-border/70 px-3 py-2 space-y-1 bg-background">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tagihan</span>
            <span className="font-medium">{formatIDR(billAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Biaya Layanan</span>
            <span className="font-medium">{formatIDR(fee)}</span>
          </div>
          <div className="border-t border-border/60 pt-1.5 flex justify-between">
            <span className="font-semibold text-foreground">Total Bayar</span>
            <span className="font-bold text-[#5B6CF9] text-base">{formatIDR(total)}</span>
          </div>
        </div>

        <Button
          size="default"
          disabled={loading || !selectedChannel || !paymentMethod}
          onClick={() => onConfirm(selectedChannel, fee, total, paymentMethod)}
          className="w-full bg-[#5B6CF9] hover:bg-[#5065E8] text-white font-semibold shadow-lg shadow-[#5B6CF9]/20"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...
            </>
          ) : (
            <>
              Lanjut Bayar {formatIDR(total)} <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
