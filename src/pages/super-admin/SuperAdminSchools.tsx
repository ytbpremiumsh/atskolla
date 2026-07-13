import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, Ban, PlayCircle, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SchoolCard, { SchoolData } from "@/components/super-admin/SchoolCard";
import SchoolDetailDialog from "@/components/super-admin/SchoolDetailDialog";
import SchoolEditDialog from "@/components/super-admin/SchoolEditDialog";
import SchoolSubscriptionDialog from "@/components/super-admin/SchoolSubscriptionDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface PlanOption {
  id: string;
  name: string;
  price: number;
}

const statusOptions = [
  { value: "active", label: "Aktif", color: "bg-success/10 text-success" },
  { value: "expired", label: "Kedaluwarsa", color: "bg-warning/10 text-warning" },
  { value: "cancelled", label: "Dibatalkan", color: "bg-destructive/10 text-destructive" },
  { value: "pending", label: "Menunggu", color: "bg-muted text-muted-foreground" },
];

const getStatusBadge = (status: string) => {
  const opt = statusOptions.find((o) => o.value === status);
  return <Badge className={`${opt?.color || "bg-muted text-muted-foreground"} text-[10px] border-0`}>{opt?.label || status}</Badge>;
};

const SuperAdminSchools = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [detailSchool, setDetailSchool] = useState<SchoolData | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolData | null>(null);
  const [subSchool, setSubSchool] = useState<SchoolData | null>(null);
  const [suspendSchool, setSuspendSchool] = useState<SchoolData | null>(null);
  const [deleteSchool, setDeleteSchool] = useState<SchoolData | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchSchools = async () => {
    const [schoolsRes, studentsRes, profilesRes, loginLogsRes] = await Promise.all([
      supabase.from("schools").select("*"),
      supabase.from("students").select("school_id, class"),
      supabase.from("profiles").select("school_id, full_name, phone, user_id"),
      supabase.from("login_logs").select("user_id, email").order("created_at", { ascending: false }),
    ]);

    const { data: adminRoles } = await supabase.from("user_roles").select("user_id, role").eq("role", "school_admin");
    const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));

    const emailMap: Record<string, string> = {};
    (loginLogsRes.data || []).forEach((l: any) => {
      if (l.email && !emailMap[l.user_id]) emailMap[l.user_id] = l.email;
    });

    const schoolsList = schoolsRes.data || [];
    const students = studentsRes.data || [];
    const profiles = profilesRes.data || [];
    setPlans([]);

    const mapped: SchoolData[] = schoolsList.map((s: any) => {
      const schoolStudents = students.filter((st: any) => st.school_id === s.id);
      const uniqueClasses = new Set(schoolStudents.map((st: any) => st.class));

      const adminProfile = profiles.find((p: any) => p.school_id === s.id && adminUserIds.has(p.user_id));

      return {
        ...s,
        studentCount: schoolStudents.length,
        classCount: uniqueClasses.size,
        adminName: adminProfile?.full_name || s.principal_name || null,
        adminPhone: adminProfile?.phone || s.whatsapp || null,
        adminEmail: (adminProfile ? emailMap[adminProfile.user_id] : null) || s.email || null,
        subscription: null,
      };
    });
    setSchools(mapped);
    setLoading(false);
  };


  useEffect(() => { fetchSchools(); }, []);

  const openSuspend = (s: SchoolData) => {
    setSuspendSchool(s);
    setSuspendReason(s.suspended_reason ?? "");
  };

  const confirmSuspend = async () => {
    if (!suspendSchool) return;
    setProcessing(true);
    const suspend = !suspendSchool.is_suspended;
    const { error } = await supabase
      .from("schools")
      .update({
        is_suspended: suspend,
        suspended_at: suspend ? new Date().toISOString() : null,
        suspended_reason: suspend ? (suspendReason || null) : null,
      } as any)
      .eq("id", suspendSchool.id);
    setProcessing(false);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: suspend ? "Sekolah ditangguhkan" : "Sekolah diaktifkan kembali",
      description: suspendSchool.name,
    });
    setSuspendSchool(null);
    setSuspendReason("");
    fetchSchools();
  };

  const confirmDelete = async () => {
    if (!deleteSchool) return;
    if (deleteConfirm.trim() !== deleteSchool.name) {
      toast({ title: "Konfirmasi tidak cocok", description: "Ketik nama sekolah persis untuk melanjutkan.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    const { error } = await supabase.from("schools").delete().eq("id", deleteSchool.id);
    setProcessing(false);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sekolah dihapus", description: deleteSchool.name });
    setDeleteSchool(null);
    setDeleteConfirm("");
    fetchSchools();
  };

  const filtered = schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Sekolah</h1>
          <p className="text-muted-foreground text-sm">{schools.length} sekolah terdaftar</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari sekolah..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((s, i) => (
          <SchoolCard
            key={s.id}
            school={s}
            index={i}
            onDetail={setDetailSchool}
            onSubscription={setSubSchool}
            onEdit={setEditSchool}
            onSuspend={openSuspend}
            onDelete={(sc) => { setDeleteSchool(sc); setDeleteConfirm(""); }}
            getStatusBadge={getStatusBadge}
          />
        ))}
      </div>

      <SchoolDetailDialog school={detailSchool} onClose={() => setDetailSchool(null)} getStatusBadge={getStatusBadge} />
      <SchoolEditDialog school={editSchool} onClose={() => setEditSchool(null)} onSaved={fetchSchools} />
      <SchoolSubscriptionDialog school={subSchool} plans={plans} onClose={() => setSubSchool(null)} onSaved={fetchSchools} />

      {/* Suspend / Unsuspend Dialog */}
      <Dialog open={!!suspendSchool} onOpenChange={(o) => !o && setSuspendSchool(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suspendSchool?.is_suspended ? (
                <><PlayCircle className="h-5 w-5 text-success" /> Aktifkan Kembali Sekolah</>
              ) : (
                <><Ban className="h-5 w-5 text-amber-600" /> Tangguhkan Akses Sekolah</>
              )}
            </DialogTitle>
            <DialogDescription>
              {suspendSchool?.is_suspended
                ? `Sekolah "${suspendSchool?.name}" akan kembali dapat mengakses dashboard, absensi, dan seluruh fitur.`
                : `Sekolah "${suspendSchool?.name}" tidak akan bisa masuk ke dashboard, monitoring, bendahara, atau kepsek sampai diaktifkan kembali. Data tidak akan dihapus.`}
            </DialogDescription>
          </DialogHeader>
          {!suspendSchool?.is_suspended && (
            <div className="space-y-2">
              <label className="text-xs font-medium">Alasan (opsional, ditampilkan ke pengguna)</label>
              <Textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Contoh: Tagihan berlangganan belum diselesaikan."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendSchool(null)} disabled={processing}>Batal</Button>
            <Button
              onClick={confirmSuspend}
              disabled={processing}
              variant={suspendSchool?.is_suspended ? "default" : "destructive"}
            >
              {suspendSchool?.is_suspended ? "Aktifkan Kembali" : "Tangguhkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteSchool} onOpenChange={(o) => !o && setDeleteSchool(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Hapus Sekolah
            </DialogTitle>
            <DialogDescription>
              Tindakan ini <b>permanen</b> dan menghapus seluruh data terkait sekolah (siswa, kelas, absensi, SPP, dsb).
              Akun user pada sekolah ini tidak otomatis terhapus.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Ketik nama sekolah <b>{deleteSchool?.name}</b> persis untuk konfirmasi.</p>
          </div>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={deleteSchool?.name}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSchool(null)} disabled={processing}>Batal</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={processing || deleteConfirm.trim() !== deleteSchool?.name}
            >
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSchools;
