import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Info untuk admin sekolah: SPP online butuh minimal satu bendahara. */
export function NoBendaharaBanner({ schoolId }: { schoolId?: string | null }) {
  const navigate = useNavigate();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id").eq("school_id", schoolId);
      const ids = (profiles || []).map((p: any) => p.user_id);
      if (!ids.length) { setMissing(true); return; }
      const { count } = await supabase.from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .in("user_id", ids).eq("role", "bendahara" as any);
      setMissing((count || 0) === 0);
    })();
  }, [schoolId]);

  if (!missing) return null;
  return (
    <Card className="border border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Tambahkan Bendahara untuk Mengaktifkan SPP Online</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pembayaran SPP online otomatis dikelola melalui Dashboard Bendahara. Tunjuk minimal satu bendahara terlebih dahulu agar
              tagihan, rekening pencairan, dan laporan SPP dapat diatur.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/staff")} className="shrink-0 rounded-lg">
          Tambah Bendahara <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
