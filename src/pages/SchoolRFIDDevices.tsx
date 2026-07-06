import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, AlertTriangle, Activity, Users, Cpu } from "lucide-react";

const statusMeta: Record<string, { label: string; cls: string }> = {
  unassigned: { label: "Belum Ditugaskan", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  assigned:   { label: "Menunggu Aktivasi", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  active:     { label: "Aktif",             cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive:   { label: "Offline",           cls: "bg-orange-100 text-orange-700 border-orange-200" },
  revoked:    { label: "Dicabut",           cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta[status] || { label: status, cls: "bg-slate-100" };
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function timeAgo(iso: string | null) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))} dtk lalu`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  return `${Math.floor(diff / 86_400_000)} hari lalu`;
}

export default function SchoolRFIDDevices() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [license, setLicense] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [minRequired, setMinRequired] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    (async () => {
      const [d, l, s, tiers, ll] = await Promise.all([
        supabase.from("rfid_devices").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("rfid_device_licenses").select("license_count").eq("school_id", schoolId).maybeSingle(),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("rfid_size_tiers").select("*").order("min_students"),
        supabase.from("rfid_device_logs").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(50),
      ]);
      setDevices(d.data || []);
      setLicense(l.data?.license_count || 0);
      const n = (s as any).count || 0;
      setStudentCount(n);
      const t = (tiers.data || []).sort((a: any, b: any) => b.min_students - a.min_students);
      const tier = t.find((x: any) => n >= x.min_students && (x.max_students == null || n <= x.max_students));
      setMinRequired(tier?.min_devices || 1);
      setLogs(ll.data || []);
      setLoading(false);
    })();
  }, [schoolId]);

  const activeDevices = useMemo(
    () => devices.filter((d) => d.status === "active" || d.status === "inactive").length,
    [devices],
  );
  const under = activeDevices < minRequired;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center shadow-sm">
          <Radio className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perangkat RFID</h1>
          <p className="text-sm text-muted-foreground">Pantau status perangkat RFID resmi ATSkolla di sekolah Anda.</p>
        </div>
      </div>

      {under && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <div className="font-semibold">Jumlah perangkat kurang dari ketentuan.</div>
            Dengan {studentCount} siswa, minimal <b>{minRequired}</b> perangkat aktif diperlukan. Saat ini terpasang {activeDevices}. Hubungi Super Admin ATSkolla untuk penambahan lisensi.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Cpu}       label="Perangkat Terpasang" value={activeDevices} />
        <Stat icon={Activity}  label="Aktif Sekarang" value={devices.filter(d => d.status === "active").length} />
        <Stat icon={Users}     label="Jumlah Siswa" value={studentCount} />
        <Stat icon={AlertTriangle} label={`Min. Perangkat (Tier)`} value={minRequired} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perangkat</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Device ID</th>
                <th className="text-left px-3 py-2">Lokasi</th>
                <th className="text-left px-3 py-2">MAC</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Last Online</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Memuat…</td></tr>}
              {!loading && devices.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada perangkat RFID terpasang. Lisensi tersedia: {license}.</td></tr>
              )}
              {devices.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{d.device_id}</td>
                  <td className="px-3 py-2 text-xs">{d.location_label || "-"}</td>
                  <td className="px-3 py-2 text-xs">{d.mac_address || "-"}</td>
                  <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-3 py-2 text-xs">{timeAgo(d.last_online_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Log Aktivitas Terbaru</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Belum ada aktivitas.</div>}
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border p-2 text-xs flex justify-between">
              <div>
                <span className="font-semibold">{l.event_type}</span>
                <span className="text-muted-foreground ml-2 font-mono">{l.device_id}</span>
              </div>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("id-ID")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] text-white flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
