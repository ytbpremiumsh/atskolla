import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuperAdminEmail from "./SuperAdminEmail";
import SuperAdminAuthEmail from "./SuperAdminAuthEmail";
import SuperAdminAdminNotify from "./SuperAdminAdminNotify";

export default function SuperAdminEmailHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "smtp";
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Email</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi server SMTP, template email (auth & transaksional), dan notifikasi email Super Admin.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl flex-wrap h-auto">
          <TabsTrigger value="smtp" className="rounded-lg">Server SMTP</TabsTrigger>
          <TabsTrigger value="auth" className="rounded-lg">Template Auth Email</TabsTrigger>
          <TabsTrigger value="admin-notify" className="rounded-lg">Notifikasi Admin</TabsTrigger>
        </TabsList>
        <TabsContent value="smtp" className="mt-4"><SuperAdminEmail /></TabsContent>
        <TabsContent value="auth" className="mt-4"><SuperAdminAuthEmail /></TabsContent>
        <TabsContent value="admin-notify" className="mt-4"><SuperAdminAdminNotify /></TabsContent>
      </Tabs>
    </div>
  );
}
