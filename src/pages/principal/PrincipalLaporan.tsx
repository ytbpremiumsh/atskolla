import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileSpreadsheet, Users, GraduationCap, Wallet, BookOpen,
  Receipt, Landmark, ClipboardList,
} from "lucide-react";
import LaporanAbsensiSiswa from "./reports/LaporanAbsensiSiswa";
import LaporanAbsensiGuru from "./reports/LaporanAbsensiGuru";
import LaporanSPP from "./reports/LaporanSPP";
import LaporanTunggakan from "./reports/LaporanTunggakan";
import LaporanBukuKas from "./reports/LaporanBukuKas";
import LaporanSettlement from "./reports/LaporanSettlement";
import LaporanJurnal from "./reports/LaporanJurnal";

const tabs = [
  { key: "absensi-siswa", label: "Absensi Siswa", icon: Users, C: LaporanAbsensiSiswa },
  { key: "absensi-guru", label: "Absensi Guru", icon: GraduationCap, C: LaporanAbsensiGuru },
  { key: "spp", label: "SPP", icon: Receipt, C: LaporanSPP },
  { key: "tunggakan", label: "Tunggakan", icon: Wallet, C: LaporanTunggakan },
  { key: "buku-kas", label: "Buku Kas", icon: BookOpen, C: LaporanBukuKas },
  { key: "settlement", label: "Settlement", icon: Landmark, C: LaporanSettlement },
  { key: "jurnal", label: "Jurnal Mengajar", icon: ClipboardList, C: LaporanJurnal },
];

export default function PrincipalLaporan() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") || "absensi-siswa";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Sekolah"
        subtitle="Semua laporan sekolah dalam satu tempat — pilih tab untuk berpindah rekap"
        icon={FileSpreadsheet}
      />

      <Tabs value={active} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="w-full flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1 rounded-2xl">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="gap-1.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {active === t.key && <t.C />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
