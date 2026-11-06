import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Split, Receipt } from "lucide-react";
import SuperAdminPayments from "./SuperAdminPayments";
import SuperAdminBendahara from "./SuperAdminBendahara";
import SuperAdminSplitSettlement from "./SuperAdminSplitSettlement";

const TABS = [
  { value: "bendahara", label: "Dana SPP Sekolah", icon: Wallet, desc: "Pantau dana SPP tiap sekolah: diproses, sudah ditransfer, dan saldo lama." },
  { value: "split", label: "Rekening & Split", icon: Split, desc: "Verifikasi rekening sekolah dan atur pembagian otomatis ke rekening sekolah." },
  { value: "payments", label: "Konfirmasi Bayar", icon: Receipt, desc: "Konfirmasi pembayaran paket dan add-on dari sekolah." },
];

export default function SuperAdminKeuanganHub() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") || "bendahara";
  const tab = TABS.some((t) => t.value === raw) ? raw : "bendahara";
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });
  const active = TABS.find((t) => t.value === tab)!;

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <div className="space-y-2">
        <TabsList className="rounded-xl flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-lg gap-2">
              <t.icon className="h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="text-xs text-muted-foreground">{active.desc}</p>
      </div>
      <TabsContent value="bendahara" className="mt-0"><SuperAdminBendahara /></TabsContent>
      <TabsContent value="split" className="mt-0"><SuperAdminSplitSettlement /></TabsContent>
      <TabsContent value="payments" className="mt-0"><SuperAdminPayments /></TabsContent>
    </Tabs>
  );
}
