import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Wallet, ClipboardList } from "lucide-react";
import PrincipalKeuangan from "./PrincipalKeuangan";
import PrincipalPersetujuan from "./PrincipalPersetujuan";

export default function PrincipalManajemen() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") || "keuangan";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Sekolah"
        subtitle="Ringkasan keuangan dan pusat persetujuan dalam satu halaman"
        icon={Briefcase}
      />

      <Tabs value={active} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="keuangan" className="gap-1.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Wallet className="h-4 w-4" /> Keuangan
          </TabsTrigger>
          <TabsTrigger value="persetujuan" className="gap-1.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardList className="h-4 w-4" /> Persetujuan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keuangan" className="mt-4">
          {active === "keuangan" && <PrincipalKeuangan />}
        </TabsContent>
        <TabsContent value="persetujuan" className="mt-4">
          {active === "persetujuan" && <PrincipalPersetujuan />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
