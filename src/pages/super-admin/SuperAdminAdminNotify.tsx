import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Send, Mail, Info, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEYS = [
  "admin_notify_email",
  "admin_notify_email_enabled",
  "admin_notify_email_ticket_subject",
  "admin_notify_email_ticket_html",
] as const;

const DEFAULT_SUBJECT = "[ATSkolla] Tiket Bantuan Baru dari {school} — {priority}";

const DEFAULT_HTML = `<div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <h2 style="margin: 0 0 8px; color: #5B6CF9;">Tiket Bantuan Baru</h2>
  <p style="margin: 0 0 16px; color: #475569;">Ada tiket bantuan baru yang perlu ditinjau.</p>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 0; color:#64748b; width: 110px;">Sekolah</td><td style="padding: 6px 0;"><b>{school}</b></td></tr>
    <tr><td style="padding: 6px 0; color:#64748b;">Pengirim</td><td style="padding: 6px 0;">{user}</td></tr>
    <tr><td style="padding: 6px 0; color:#64748b;">Prioritas</td><td style="padding: 6px 0;">{priority}</td></tr>
    <tr><td style="padding: 6px 0; color:#64748b;">Subjek</td><td style="padding: 6px 0;">{subject}</td></tr>
    <tr><td style="padding: 6px 0; color:#64748b;">Waktu</td><td style="padding: 6px 0;">{time}</td></tr>
  </table>

  <div style="margin-top: 16px; padding: 12px 14px; background: #f1f5f9; border-radius: 12px; white-space: pre-wrap; font-size: 14px;">
{message}
  </div>

  <p style="margin: 20px 0 0; font-size: 12px; color: #94a3b8;">Email otomatis dari ATSkolla — Panel Super Admin.</p>
</div>`;

const SAMPLE = {
  school: "SDN 1 Jakarta (TES)",
  user: "Budi Santoso",
  priority: "high",
  subject: "Tes notifikasi tiket bantuan",
  message: "Ini hanya email tes dari ATSkolla — server email Lovable aktif dan berjalan normal.",
  time: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
};

const substitute = (t: string, d: Record<string, string>) =>
  t
    .replace(/\{school\}/g, d.school)
    .replace(/\{user\}/g, d.user)
    .replace(/\{priority\}/g, d.priority)
    .replace(/\{subject\}/g, d.subject)
    .replace(/\{message\}/g, d.message)
    .replace(/\{time\}/g, d.time);

export default function SuperAdminAdminNotify() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [s, setS] = useState({
    admin_notify_email: "",
    admin_notify_email_enabled: "true",
    admin_notify_email_ticket_subject: "",
    admin_notify_email_ticket_html: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings" as any)
        .select("key, value")
        .in("key", KEYS as unknown as string[]);
      const map: Record<string, string> = {};
      ((data as any[]) || []).forEach((it) => { map[it.key] = it.value; });
      setS((prev) => ({ ...prev, ...map }));
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((k) => ({ key: k, value: s[k] ?? "" }));
      const { error } = await supabase
        .from("platform_settings" as any)
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Pengaturan notifikasi email tersimpan");
    } catch (e: any) {
      toast.error("Gagal simpan: " + (e.message || e));
    }
    setSaving(false);
  };

  const handleTest = async () => {
    const raw = s.admin_notify_email.trim();
    if (!raw) return toast.error("Isi dulu email tujuan");
    const recipients = raw.split(/[,;]/).map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
    if (recipients.length === 0) return toast.error("Format email tidak valid");

    setTesting(true);
    try {
      const subjectOverride = s.admin_notify_email_ticket_subject
        ? substitute(s.admin_notify_email_ticket_subject, SAMPLE)
        : undefined;
      const htmlOverride = s.admin_notify_email_ticket_html
        ? substitute(s.admin_notify_email_ticket_html, SAMPLE)
        : undefined;

      let ok = 0;
      const errs: string[] = [];
      for (const to of recipients) {
        const { data, error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "admin-support-ticket",
            recipientEmail: to,
            templateData: SAMPLE,
            fromName: "ATSkolla - Tiket Bantuan Baru",
            subjectOverride,
            htmlOverride,
          },
        });
        if (error) errs.push(`${to}: ${error.message}`);
        else if ((data as any)?.error) errs.push(`${to}: ${(data as any).error}`);
        else ok++;
      }
      if (ok > 0 && errs.length === 0) toast.success(`Email tes terkirim ke ${recipients.join(", ")}`);
      else if (ok > 0) toast.warning(`Sebagian terkirim (${ok}/${recipients.length}). ${errs.join("; ")}`);
      else toast.error("Gagal: " + errs.join("; "));
    } catch (e: any) {
      toast.error("Gagal kirim tes: " + (e.message || e));
    }
    setTesting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const previewHtml = s.admin_notify_email_ticket_html
    ? substitute(s.admin_notify_email_ticket_html, SAMPLE)
    : "<p style='padding:16px;color:#64748b;font-family:Inter,sans-serif;'>Template default ATSkolla akan digunakan. Klik <b>Muat Template Default</b> untuk mulai custom.</p>";

  return (
    <div className="space-y-4">
      {/* Enable + destination */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Notifikasi Email Super Admin</h3>
                <p className="text-xs text-muted-foreground">Email otomatis setiap ada Tiket Bantuan baru dari sekolah.</p>
              </div>
            </div>
            <Switch
              checked={s.admin_notify_email_enabled === "true"}
              onCheckedChange={(v) => setS({ ...s, admin_notify_email_enabled: v ? "true" : "false" })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Email Super Admin Tujuan</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={s.admin_notify_email}
                onChange={(e) => setS({ ...s, admin_notify_email: e.target.value })}
                placeholder="admin@atskolla.com"
                className="flex-1"
              />
              <Button variant="outline" onClick={handleTest} disabled={testing || !s.admin_notify_email} className="shrink-0">
                {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Tes Email
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Boleh beberapa email, pisah dengan koma (mis. <code>admin@atskolla.com, cs@atskolla.com</code>).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-2 items-start">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Email dikirim via <b>server email bawaan Lovable</b> (domain <code>notify.atskolla.com</code>) — sama seperti email pendaftaran akun.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom template */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-foreground text-sm">Custom Template Email</h3>
              <p className="text-xs text-muted-foreground">Kosongkan untuk pakai template ATSkolla default.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setS({ ...s, admin_notify_email_ticket_subject: DEFAULT_SUBJECT, admin_notify_email_ticket_html: DEFAULT_HTML })}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Muat Template Default
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> {showPreview ? "Sembunyikan" : "Preview"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["{school}", "{user}", "{priority}", "{subject}", "{message}", "{time}"].map((v) => (
              <Badge key={v} variant="secondary" className="text-[10px] font-mono">{v}</Badge>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Subjek Email</Label>
            <Input
              value={s.admin_notify_email_ticket_subject}
              onChange={(e) => setS({ ...s, admin_notify_email_ticket_subject: e.target.value })}
              placeholder={DEFAULT_SUBJECT}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Isi Body Email (HTML)</Label>
            <Textarea
              value={s.admin_notify_email_ticket_html}
              onChange={(e) => setS({ ...s, admin_notify_email_ticket_html: e.target.value })}
              rows={14}
              className="resize-y font-mono text-xs"
              placeholder="Klik 'Muat Template Default' untuk contoh HTML lengkap…"
            />
          </div>

          {showPreview && (
            <div className="space-y-1">
              <Label className="text-xs">Preview (dengan data contoh)</Label>
              <div className="rounded-lg border bg-white overflow-hidden">
                <iframe
                  title="preview"
                  srcDoc={previewHtml}
                  className="w-full h-[420px] bg-white"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}
