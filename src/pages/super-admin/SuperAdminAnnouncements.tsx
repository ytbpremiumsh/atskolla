import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, Loader2, Info, CreditCard, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { motion } from "framer-motion";

const typeOptions = [
  { value: "announcement", label: "Pengumuman", icon: Megaphone },
  { value: "info", label: "Informasi", icon: Info },
  { value: "subscription", label: "Langganan", icon: CreditCard },
];

const SuperAdminAnnouncements = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [targetSchool, setTargetSchool] = useState<string>("all");
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("schools").select("id, name").order("name"),
    ])
      .then(([notifRes, schoolRes]) => {
        setNotifications(notifRes.data || []);
        setSchools(schoolRes.data || []);
      })
      .catch(() => toast.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Mohon isi judul dan pesan");
      return;
    }
    setSending(true);

    if (targetSchool === "all") {
      // Send to all schools
      const schoolIds = schools.map((s) => s.id);
      const inserts = schoolIds.map((sid) => ({
        school_id: sid,
        title: title.trim(),
        message: message.trim(),
        type,
        created_by: user?.id,
      }));
      // Also add a global one (school_id = null)
      inserts.push({
        school_id: null as any,
        title: title.trim(),
        message: message.trim(),
        type,
        created_by: user?.id,
      });
      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) {
        toast.error("Gagal mengirim notifikasi");
      } else {
        toast.success(`Notifikasi terkirim ke ${schoolIds.length} sekolah!`);
        setTitle("");
        setMessage("");
        // Refresh
        const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
        setNotifications(data || []);
      }
    } else {
      const { error } = await supabase.from("notifications").insert({
        school_id: targetSchool,
        title: title.trim(),
        message: message.trim(),
        type,
        created_by: user?.id,
      });
      if (error) {
        toast.error("Gagal mengirim notifikasi");
      } else {
        const schoolName = schools.find((s) => s.id === targetSchool)?.name || "";
        toast.success(`Notifikasi terkirim ke ${schoolName}!`);
        setTitle("");
        setMessage("");
        const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
        setNotifications(data || []);
      }
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notifikasi dihapus");
  };

  const typeColors: Record<string, string> = {
    announcement: "bg-warning/10 text-warning",
    info: "bg-primary/10 text-primary",
    subscription: "bg-success/10 text-success",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pengumuman & Notifikasi</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Kirim pengumuman ke semua atau sekolah tertentu</p>
      </div>

      {/* Send form */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Kirim Notifikasi Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tipe</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target</Label>
              <Select value={targetSchool} onValueChange={setTargetSchool}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sekolah</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Judul</Label>
            <Input placeholder="Judul notifikasi..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Pesan</Label>
            <Textarea placeholder="Isi pesan..." rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={handleSend} disabled={sending} className="gradient-primary text-primary-foreground">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Kirim Notifikasi
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Riwayat Notifikasi ({notifications.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : notifications.length === 0 ? (
          <Card className="border-0 shadow-card"><CardContent className="p-6 text-center text-sm text-muted-foreground">Belum ada notifikasi</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className={`text-[10px] ${typeColors[n.type] || ""}`}>
                          {typeOptions.find((t) => t.value === n.type)?.label || n.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAnnouncements;
