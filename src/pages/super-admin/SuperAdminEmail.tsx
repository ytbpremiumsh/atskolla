import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { Mail, Send, Loader2, Server, FileText, Megaphone, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface EmailSettings {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_email: string;
  from_name: string;
  is_active: boolean;
  send_on_register: boolean;
  send_on_spp_paid: boolean;
  template_register_subject: string;
  template_register_html: string;
  template_spp_subject: string;
  template_spp_html: string;
}

const emptySettings: EmailSettings = {
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_secure: true,
  from_email: "",
  from_name: "ATSkolla",
  is_active: false,
  send_on_register: true,
  send_on_spp_paid: true,
  template_register_subject: "Selamat datang di ATSkolla",
  template_register_html: "<h2>Halo {name}</h2><p>Akun ATSkolla untuk <b>{school}</b> berhasil dibuat. Silakan login menggunakan email <b>{email}</b>.</p>",
  template_spp_subject: "Pembayaran SPP Berhasil — {invoice}",
  template_spp_html: "<h2>Terima kasih, {name}</h2><p>Pembayaran SPP <b>{period}</b> sebesar <b>{amount}</b> telah kami terima. No. Invoice: <b>{invoice}</b>.</p>",
};

export default function SuperAdminEmail() {
  const [s, setS] = useState<EmailSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  // Broadcast
  const [bcSubject, setBcSubject] = useState("");
  const [bcHtml, setBcHtml] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [bcRecipients, setBcRecipients] = useState<"all" | "active">("all");

  // Logs
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("email_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setS(data as any);
      const { data: lg } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(lg || []);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { ...s };
    let res;
    if (s.id) {
      res = await supabase.from("email_settings").update(payload).eq("id", s.id);
    } else {
      const { id, ...rest } = payload as any;
      res = await supabase.from("email_settings").insert(rest).select().single();
      if (res.data) setS(res.data as any);
    }
    setSaving(false);
    if (res.error) toast.error("Gagal: " + res.error.message);
    else toast.success("Pengaturan email tersimpan");
  };

  const sendTest = async () => {
    if (!testTo) return toast.error("Isi email tujuan");
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { event_type: "test", to: testTo },
    });
    setTesting(false);
    if (error || !data?.success) toast.error("Gagal: " + (data?.error || error?.message));
    else toast.success("Email tes terkirim");
  };

  const sendBroadcast = async () => {
    if (!bcSubject || !bcHtml) return toast.error("Subjek & isi wajib diisi");
    setBcSending(true);
    // ambil daftar email sekolah dari profiles (school admin)
    let q = supabase.from("profiles").select("user_id, school_id");
    const { data: profs } = await q;
    const userIds = (profs || []).map((p: any) => p.user_id);
    // ambil email via admin? Kita pakai auth.users tidak bisa langsung -> gunakan profiles.email kalau ada, fallback skip
    // Sebagai gantinya, kita panggil edge function khusus untuk broadcast — namun untuk sederhana kita ambil dari schools.email kalau tersedia
    const { data: schools } = await supabase.from("schools").select("id, name, email");
    const targets = (schools || [])
      .filter((sc: any) => sc.email && (bcRecipients === "all" || true))
      .map((sc: any) => sc.email);

    if (targets.length === 0) {
      setBcSending(false);
      return toast.error("Tidak ada email sekolah yang tersimpan");
    }

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        event_type: "broadcast",
        to: targets,
        subject_override: bcSubject,
        html_override: bcHtml,
      },
    });
    setBcSending(false);
    if (error || !data?.success) toast.error("Sebagian/seluruh gagal: " + (data?.error || error?.message));
    else toast.success(`Broadcast terkirim ke ${data.sent} penerima`);
  };

  if (loading) return <div className="p-6">Memuat...</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Mail}
        title="Email Server (SMTP)"
        subtitle="Konfigurasi pengirim email untuk registrasi, broadcast, dan informasi SPP."
      />

      <Tabs defaultValue="smtp">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="smtp" className="gap-1.5"><Server className="h-3.5 w-3.5" /> SMTP</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Template</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Broadcast</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><History className="h-3.5 w-3.5" /> Log</TabsTrigger>
        </TabsList>

        {/* SMTP */}
        <TabsContent value="smtp" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Server SMTP</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>SMTP Host</Label><Input value={s.smtp_host} onChange={e => setS({ ...s, smtp_host: e.target.value })} placeholder="smtp.gmail.com" /></div>
              <div><Label>Port</Label><Input type="number" value={s.smtp_port} onChange={e => setS({ ...s, smtp_port: parseInt(e.target.value) || 587 })} /></div>
              <div><Label>Username</Label><Input value={s.smtp_username} onChange={e => setS({ ...s, smtp_username: e.target.value })} /></div>
              <div><Label>Kata sandi</Label><Input type="password" value={s.smtp_password} onChange={e => setS({ ...s, smtp_password: e.target.value })} placeholder="Kata sandi aplikasi" /></div>
              <div><Label>From Email</Label><Input value={s.from_email} onChange={e => setS({ ...s, from_email: e.target.value })} placeholder="noreply@domain.com" /></div>
              <div><Label>From Name</Label><Input value={s.from_name} onChange={e => setS({ ...s, from_name: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={s.smtp_secure} onCheckedChange={v => setS({ ...s, smtp_secure: v })} /> <Label>TLS/STARTTLS</Label></div>
              <div className="flex items-center gap-2"><Switch checked={s.is_active} onCheckedChange={v => setS({ ...s, is_active: v })} /> <Label>Aktifkan email server</Label></div>
              <div className="flex items-center gap-2"><Switch checked={s.send_on_register} onCheckedChange={v => setS({ ...s, send_on_register: v })} /> <Label>Kirim saat registrasi</Label></div>
              <div className="flex items-center gap-2"><Switch checked={s.send_on_spp_paid} onCheckedChange={v => setS({ ...s, send_on_spp_paid: v })} /> <Label>Kirim saat SPP lunas</Label></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tes Kirim</CardTitle></CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-2">
              <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="email-tujuan@contoh.com" />
              <Button onClick={sendTest} disabled={testing || !s.is_active}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Tes Kirim
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan</Button>
          </div>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Template Registrasi Berhasil</CardTitle><p className="text-xs text-muted-foreground">Variabel: {`{name}`} {`{school}`} {`{email}`}</p></CardHeader>
            <CardContent className="space-y-2">
              <Input value={s.template_register_subject} onChange={e => setS({ ...s, template_register_subject: e.target.value })} placeholder="Subjek" />
              <Textarea value={s.template_register_html} onChange={e => setS({ ...s, template_register_html: e.target.value })} rows={6} placeholder="HTML body" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Template Pembayaran SPP Berhasil</CardTitle><p className="text-xs text-muted-foreground">Variabel: {`{name}`} {`{invoice}`} {`{amount}`} {`{period}`} {`{school}`}</p></CardHeader>
            <CardContent className="space-y-2">
              <Input value={s.template_spp_subject} onChange={e => setS({ ...s, template_spp_subject: e.target.value })} placeholder="Subjek" />
              <Textarea value={s.template_spp_html} onChange={e => setS({ ...s, template_spp_html: e.target.value })} rows={6} placeholder="HTML body" />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>Simpan Template</Button>
          </div>
        </TabsContent>

        {/* BROADCAST */}
        <TabsContent value="broadcast" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Broadcast Email ke Semua Sekolah</CardTitle><p className="text-xs text-muted-foreground">Mengirim ke email kontak yang tersimpan pada data sekolah.</p></CardHeader>
            <CardContent className="space-y-2">
              <Input value={bcSubject} onChange={e => setBcSubject(e.target.value)} placeholder="Subjek" />
              <Textarea value={bcHtml} onChange={e => setBcHtml(e.target.value)} rows={8} placeholder="<p>Isi pesan HTML</p>" />
              <div className="flex justify-end">
                <Button onClick={sendBroadcast} disabled={bcSending || !s.is_active}>
                  {bcSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Email</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-sm">
                {logs.length === 0 ? <p className="p-4 text-muted-foreground">Belum ada log.</p> : logs.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{l.to_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.subject} • {l.event_type}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{l.status}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
