import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeachingSchedule from "./TeachingSchedule";
import LiveSchedule from "./LiveSchedule";

export default function JadwalCombined() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = requested && ["kelas", "mengajar", "live"].includes(requested) ? requested : "kelas";
  const setTab = (v: string) => setParams((previous) => { const next = new URLSearchParams(previous); next.set("tab", v); return next; }, { replace: true });

  return (
    <div className="min-w-0 space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl sm:inline-flex sm:w-auto">
          <TabsTrigger value="kelas" className="rounded-lg px-2 text-xs sm:px-3 sm:text-sm">Per Kelas</TabsTrigger>
          <TabsTrigger value="mengajar" className="rounded-lg px-2 text-xs sm:px-3 sm:text-sm">Jadwal Lengkap</TabsTrigger>
          <TabsTrigger value="live" className="rounded-lg px-2 text-xs sm:px-3 sm:text-sm">Jadwal Live</TabsTrigger>
        </TabsList>
        <TabsContent value="kelas" className="mt-4 min-w-0"><TeachingSchedule view="class" /></TabsContent>
        <TabsContent value="mengajar" className="mt-4"><TeachingSchedule /></TabsContent>
        <TabsContent value="live" className="mt-4"><LiveSchedule /></TabsContent>
      </Tabs>
    </div>
  );
}
