import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, UserCheck, BookOpen } from "lucide-react";
import PrincipalKehadiran from "./PrincipalKehadiran";
import PrincipalPembelajaran from "./PrincipalPembelajaran";

export default function PrincipalMonitoring() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") || "kehadiran";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        subtitle="Pantau kehadiran dan aktivitas pembelajaran secara real-time"
        icon={Activity}
      />

      <Tabs value={active} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="kehadiran" className="gap-1.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <UserCheck className="h-4 w-4" /> Kehadiran
          </TabsTrigger>
          <TabsTrigger value="pembelajaran" className="gap-1.5 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4" /> Pembelajaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kehadiran" className="mt-4">
          {active === "kehadiran" && <PrincipalKehadiran />}
        </TabsContent>
        <TabsContent value="pembelajaran" className="mt-4">
          {active === "pembelajaran" && <PrincipalPembelajaran />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
