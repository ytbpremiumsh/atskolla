import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Radio, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Warns school admins when the number of active RFID devices is below the
 * tier requirement based on student count. Silent when everything is OK.
 */
export function RFIDDeviceWarning() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<{ have: number; need: number; students: number } | null>(null);

  useEffect(() => {
    const schoolId = profile?.school_id;
    if (!schoolId) return;
    (async () => {
      const [d, s, tiers, lic] = await Promise.all([
        supabase.from("rfid_devices").select("status").eq("school_id", schoolId),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("rfid_size_tiers").select("*").order("min_students", { ascending: false }),
        supabase.from("rfid_device_licenses").select("license_count").eq("school_id", schoolId).maybeSingle(),
      ]);
      const licenseCount = lic.data?.license_count || 0;
      // Only warn if this school has been issued licenses (i.e. uses RFID).
      if (licenseCount <= 0) return;

      const students = (s as any).count || 0;
      const tier = (tiers.data || []).find(
        (t: any) => students >= t.min_students && (t.max_students == null || students <= t.max_students),
      );
      const need = tier?.min_devices || 1;
      const have = (d.data || []).filter((x: any) => x.status === "active" || x.status === "inactive").length;
      if (have < need) setMsg({ have, need, students });
    })();
  }, [profile?.school_id]);

  if (!msg) return null;
  const canManage = roles.includes("school_admin");

  return (
    <button
      type="button"
      onClick={() => canManage && navigate("/rfid-devices")}
      className="w-full text-left rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" /> Perangkat RFID Kurang
        </div>
        <div className="text-xs text-amber-800/90">
          Dengan {msg.students} siswa dibutuhkan minimal <b>{msg.need}</b> perangkat aktif. Saat ini {msg.have} perangkat terpasang.
        </div>
      </div>
      {canManage && <ChevronRight className="h-4 w-4 text-amber-700 shrink-0" />}
    </button>
  );
}

export default RFIDDeviceWarning;
