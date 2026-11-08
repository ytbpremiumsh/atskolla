import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import {
  FileText, CheckCircle2, XCircle, Clock, Search, Paperclip, Loader2, Calendar, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveRow {
  id: string;
  type: string;
  date: string;
  reason: string;
  status: string;
  review_note: string | null;
  created_at: string;
  attachment_url: string | null;
  parent_phone: string;
  student_id: string;
  students?: { name: string; class: string; student_id: string } | null;
}

export default function LeaveRequests() {
  const { user, profile, roles } = useAuth();
  const schoolId = profile?.school_id;
  const isAdmin = roles.includes("school_admin") || roles.includes("super_admin");
  const isWaliKelas = roles.includes("wali_kelas") || roles.includes("teacher");

  const [items, setItems] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [myClasses, setMyClasses] = useState<string[]>([]);

  const [reviewItem, setReviewItem] = useState<LeaveRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!schoolId) { setLoading(false); return; }
    setLoading(true);
    try {
      let classFilter: string[] = [];
      if (!isAdmin && user) {
        const { data: ct } = await supabase
          .from("class_teachers").select("class_name").eq("user_id", user.id).eq("school_id", schoolId);
        classFilter = (ct || []).map(c => c.class_name);
        setMyClasses(classFilter);
        if (classFilter.length === 0) { setItems([]); return; }
      }

      const { data } = await supabase
        .from("parent_leave_requests")
        .select("id, type, date, reason, status, review_note, created_at, attachment_url, parent_phone, student_id, students(name, class, student_id)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      let rows = (data || []) as any[];
      if (!isAdmin && classFilter.length > 0) {
        rows = rows.filter(r => classFilter.includes(r.students?.class));
      }
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [schoolId, user, isAdmin]);

  const filtered = useMemo(() => {
    let r = items;
    if (tab !== "all") r = r.filter(i => i.status === tab);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.students?.name.toLowerCase().includes(q) ||
        i.students?.class.toLowerCase().includes(q) ||
        i.reason.toLowerCase().includes(q)
      );
    }
    return r;
  }, [items, tab, search]);

  const counts = useMemo(() => ({
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
  }), [items]);

  const openReview = (item: LeaveRow, action: "approved" | "rejected") => {
    setReviewItem(item); setReviewAction(action); setReviewNote("");
  };

  const submitReview = async () => {
    if (!reviewItem) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("parent_leave_requests")
        .update({
          status: reviewAction,
          review_note: reviewNote || null,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reviewItem.id);
      if (error) throw error;

      // Auto-sync attendance log if approved (replace any existing record for that date)
      if (reviewAction === "approved") {
        const newStatus = reviewItem.type === "sakit" ? "sakit" : "izin";
        // Remove existing logs for the student on that date so the approved status takes precedence
        await supabase
          .from("attendance_logs")
          .delete()
          .eq("school_id", schoolId)
          .eq("student_id", reviewItem.student_id)
          .eq("date", reviewItem.date);
        await supabase.from("attendance_logs").insert({
          school_id: schoolId,
          student_id: reviewItem.student_id,
          date: reviewItem.date,
          status: newStatus,
          method: "manual",
          attendance_type: "datang",
          notes: `Disetujui dari pengajuan wali murid: ${reviewItem.reason}`,
          recorded_by: user?.id,
        });
      }

      // Notify parent via WhatsApp
      try {
        const tgl = new Date(reviewItem.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const msg = reviewAction === "approved"
          ? `*Pengajuan ${reviewItem.type.toUpperCase()} DISETUJUI*\n\nAnanda *${reviewItem.students?.name}* (${reviewItem.students?.class})\nTanggal: ${tgl}${reviewNote ? `\nCatatan: ${reviewNote}` : ""}\n\nKehadiran sudah otomatis tercatat.`
          : `*Pengajuan ${reviewItem.type.toUpperCase()} DITOLAK*\n\nAnanda *${reviewItem.students?.name}* (${reviewItem.students?.class})\nTanggal: ${tgl}${reviewNote ? `\nCatatan: ${reviewNote}` : ""}\n\nMohon hubungi wali kelas untuk informasi lebih lanjut.`;
        await supabase.functions.invoke("send-whatsapp", {
          body: { school_id: schoolId, phone: reviewItem.parent_phone, message: msg, message_type: "leave_review" },
        });
      } catch (e) { console.error(e); }

      toast.success(reviewAction === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak");
      setReviewItem(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Gagal memproses");
    } finally {
      setSaving(false);
    }
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-500 text-white",
    approved: "bg-emerald-500 text-white",
    rejected: "bg-red-500 text-white",
  };
  const TYPE_COLOR: Record<string, string> = {
    izin: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    sakit: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Pengajuan Izin / Sakit"
        subtitle={isAdmin ? "Semua pengajuan dari wali murid" : `Pengajuan untuk kelas: ${myClasses.join(", ") || "—"}`}
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu", value: counts.pending, icon: Clock, color: "bg-amber-500/10 text-amber-600" },
          { label: "Disetujui", value: counts.approved, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Ditolak", value: counts.rejected, icon: XCircle, color: "bg-red-500/10 text-red-600" },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl border-0 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="pending">Menunggu</TabsTrigger>
            <TabsTrigger value="approved">Disetujui</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari siswa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-muted-foreground text-sm">
            Tidak ada pengajuan pada kategori ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className="rounded-2xl border-0 shadow-card overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-[#5B6CF9]/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-[#5B6CF9]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-bold truncate">{item.students?.name || "—"}</p>
                        <Badge variant="outline" className={cn("text-[10px]", TYPE_COLOR[item.type])}>{item.type.toUpperCase()}</Badge>
                        <Badge className={cn("text-[10px] border-0", STATUS_BADGE[item.status])}>
                          {item.status === "pending" ? "Menunggu" : item.status === "approved" ? "Disetujui" : "Ditolak"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {item.students?.class} • NIS {item.students?.student_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{new Date(item.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <p className="text-sm text-foreground">{item.reason}</p>
                  {item.attachment_url && (
                    <a href={item.attachment_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 text-xs text-[#5B6CF9] hover:underline mt-1">
                      <Paperclip className="h-3 w-3" /> Lihat surat lampiran
                    </a>
                  )}
                  {item.review_note && (
                    <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 mt-1.5">
                      Catatan review: {item.review_note}
                    </p>
                  )}
                </div>

                {item.status === "pending" && (
                  <div className="flex gap-2">
                    <Button onClick={() => openReview(item, "approved")} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Setujui
                    </Button>
                    <Button onClick={() => openReview(item, "rejected")} variant="outline" className="flex-1 border-red-500/30 text-red-600 hover:bg-red-50 rounded-xl">
                      <XCircle className="h-4 w-4 mr-1.5" /> Tolak
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === "approved" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              {reviewAction === "approved" ? "Setujui Pengajuan" : "Tolak Pengajuan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Pengajuan <strong>{reviewItem?.type}</strong> dari <strong>{reviewItem?.students?.name}</strong> pada {reviewItem && new Date(reviewItem.date).toLocaleDateString("id-ID")}.
            </p>
            {reviewAction === "approved" && (
              <p className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200/40">
                Status absensi {reviewItem?.type} akan otomatis tercatat untuk siswa pada tanggal tersebut.
              </p>
            )}
            <div>
              <label className="text-xs font-medium">Catatan (opsional)</label>
              <Textarea rows={5} className="mt-1 min-h-[120px] resize-y" placeholder="Tulis catatan untuk wali murid..." value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewItem(null)} disabled={saving} className="rounded-xl">Batal</Button>
            <Button
              onClick={submitReview}
              disabled={saving}
              className={cn("rounded-xl text-white", reviewAction === "approved" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {reviewAction === "approved" ? "Setujui & Catat Absensi" : "Tolak Pengajuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
