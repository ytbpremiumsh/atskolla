import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TeacherDashboard from "./TeacherDashboard";
import WaliKelasDashboard from "./WaliKelasDashboard";

export default function TeacherWaliDashboard() {
  const { user, profile } = useAuth();
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "mengajar";
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });

  useEffect(() => {
    if (!user || !profile?.school_id) return;
    supabase.from("class_teachers").select("id").eq("user_id", user.id).eq("school_id", profile.school_id).limit(1).then(({ data }) => {
      setIsWaliKelas((data || []).length > 0);
    });
  }, [user, profile?.school_id]);

  if (!isWaliKelas) return <TeacherDashboard />;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="rounded-xl w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
        <TabsTrigger value="mengajar" className="rounded-lg">Mengajar</TabsTrigger>
        <TabsTrigger value="wali" className="rounded-lg">Wali Kelas</TabsTrigger>
      </TabsList>
      <TabsContent value="mengajar" className="mt-4"><TeacherDashboard /></TabsContent>
      <TabsContent value="wali" className="mt-4"><WaliKelasDashboard /></TabsContent>
    </Tabs>
  );
}
