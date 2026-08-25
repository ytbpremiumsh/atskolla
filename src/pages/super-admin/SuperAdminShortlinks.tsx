import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, BarChart3, Pencil, Link2, ExternalLink, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type ShortLink = {
  id: string;
  code: string;
  target_url: string;
  title: string | null;
  description: string | null;
  is_active: boolean;
  click_count: number;
  created_at: string;
};

type Click = {
  id: string;
  clicked_at: string;
  user_agent: string | null;
  referer: string | null;
};

const randomCode = (len = 6) => {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export default function SuperAdminShortlinks() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShortLink | null>(null);
  const [form, setForm] = useState({ code: "", target_url: "", title: "", description: "", is_active: true });

  // Analytics dialog
  const [analyticsLink, setAnalyticsLink] = useState<ShortLink | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);

  // GA settings
  const [gaId, setGaId] = useState("");
  const [savingGa, setSavingGa] = useState(false);

  const baseUrl = useMemo(() => `${window.location.origin}/s/`, []);

  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase.from("short_links").select("*").order("created_at", { ascending: false });
    setLinks((data as ShortLink[]) || []);
    setLoading(false);
  };

  const fetchGa = async () => {
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "ga_measurement_id").maybeSingle();
    setGaId((data?.value as string) || "");
  };

  useEffect(() => {
    fetchLinks();
    fetchGa();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: randomCode(), target_url: "", title: "", description: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (l: ShortLink) => {
    setEditing(l);
    setForm({
      code: l.code,
      target_url: l.target_url,
      title: l.title || "",
      description: l.description || "",
      is_active: l.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.target_url.trim()) {
      toast({ title: "Lengkapi data", description: "Kode dan URL target wajib diisi.", variant: "destructive" });
      return;
    }
    const code = form.code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!code) {
      toast({ title: "Kode tidak valid", description: "Hanya huruf, angka, - dan _.", variant: "destructive" });
      return;
    }
    const payload = {
      code,
      target_url: form.target_url.trim(),
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("short_links").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("short_links").insert(payload);
      if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
    toast({ title: "Tersimpan" });
    setOpen(false);
    fetchLinks();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus shortlink ini?")) return;
    const { error } = await supabase.from("short_links").delete().eq("id", id);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    toast({ title: "Terhapus" });
    fetchLinks();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(`${baseUrl}${code}`);
    toast({ title: "Tersalin", description: `${baseUrl}${code}` });
  };

  const openAnalytics = async (l: ShortLink) => {
    setAnalyticsLink(l);
    const { data } = await supabase
      .from("short_link_clicks")
      .select("id, clicked_at, user_agent, referer")
      .eq("link_id", l.id)
      .order("clicked_at", { ascending: false })
      .limit(200);
    setClicks((data as Click[]) || []);
  };

  const saveGa = async () => {
    setSavingGa(true);
    const trimmed = gaId.trim();
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "ga_measurement_id", value: trimmed }, { onConflict: "key" });
    setSavingGa(false);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    toast({ title: "Tersimpan", description: "Refresh halaman untuk memuat tracker." });
  };

  // Aggregate clicks by day for the analytics dialog
  const dayBuckets = useMemo(() => {
    const m = new Map<string, number>();
    clicks.forEach((c) => {
      const k = format(new Date(c.clicked_at), "yyyy-MM-dd");
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 14);
  }, [clicks]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shortlink & Analytics</h1>
          <p className="text-sm text-muted-foreground">Buat tautan pendek dan pantau jumlah klik. Konfigurasi Google Analytics di tab terpisah.</p>
        </div>
      </div>

      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-2" />Shortlink</TabsTrigger>
          <TabsTrigger value="ga"><BarChart3 className="h-4 w-4 mr-2" />Google Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daftar Shortlink</CardTitle>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Buat Baru</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Memuat…</p>
              ) : links.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada shortlink.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shortlink</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Klik</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="font-medium">{l.title || l.code}</div>
                            <button
                              onClick={() => copy(l.code)}
                              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              {baseUrl}{l.code} <Copy className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <a
                              href={l.target_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 truncate"
                            >
                              <span className="truncate max-w-[260px]">{l.target_url}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell>
                            {l.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                          </TableCell>
                          <TableCell className="text-right font-bold">{l.click_count.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openAnalytics(l)} title="Analytics">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(l)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => remove(l.id)} title="Hapus" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ga" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Analytics 4</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Measurement ID</Label>
                <Input
                  placeholder="G-XXXXXXXXXX"
                  value={gaId}
                  onChange={(e) => setGaId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Dapatkan dari Google Analytics → Admin → Data Streams. Format: <code>G-XXXXXXXXXX</code>.
                  Kosongkan untuk menonaktifkan tracking.
                </p>
              </div>
              <Button onClick={saveGa} disabled={savingGa}>
                {savingGa ? "Menyimpan…" : "Simpan"}
              </Button>
              <div className="text-xs text-muted-foreground border-t pt-3">
                Tracker akan otomatis dimuat di seluruh halaman publik &amp; aplikasi setelah disimpan dan halaman dimuat ulang.
                Pageview SPA dilacak otomatis pada setiap perpindahan rute.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Shortlink" : "Buat Shortlink Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Custom URL (kode)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{baseUrl}</span>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                  placeholder="promo-agustus"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, code: randomCode() })}>
                  Acak
                </Button>
              </div>
              {form.code && (
                <p className={`text-[11px] ${codeTaken ? "text-destructive" : "text-muted-foreground"}`}>
                  {codeTaken
                    ? "Kode ini sudah dipakai shortlink lain, gunakan kode lain."
                    : `Tautan: ${baseUrl}${form.code}`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>URL Tujuan</Label>
              <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://atskolla.com/pricing atau /register" />
              <p className="text-[11px] text-muted-foreground">Boleh URL eksternal (https://…) atau path internal (mis. /register).</p>
            </div>

            <div className="space-y-1.5">
              <Label>Judul (opsional)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promo Mei" />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>Aktif</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics dialog */}
      <Dialog open={!!analyticsLink} onOpenChange={(o) => !o && setAnalyticsLink(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analytics: {analyticsLink?.title || analyticsLink?.code}</DialogTitle>
          </DialogHeader>
          {analyticsLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Total Klik</div>
                  <div className="text-2xl font-bold">{analyticsLink.click_count.toLocaleString("id-ID")}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Dibuat</div>
                  <div className="text-sm font-medium">{format(new Date(analyticsLink.created_at), "d MMM yyyy", { locale: idLocale })}</div>
                </CardContent></Card>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Tren 14 hari</div>
                {dayBuckets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada klik.</p>
                ) : (
                  <div className="space-y-1">
                    {dayBuckets.map(([day, count]) => {
                      const max = Math.max(...dayBuckets.map(([, c]) => c));
                      const pct = (count / max) * 100;
                      return (
                        <div key={day} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-muted-foreground">{format(new Date(day), "d MMM", { locale: idLocale })}</span>
                          <div className="flex-1 h-5 bg-muted rounded">
                            <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Klik Terakhir (200 terbaru)</div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Referer</TableHead>
                        <TableHead>UA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clicks.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
                      ) : clicks.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{format(new Date(c.clicked_at), "d MMM HH:mm", { locale: idLocale })}</TableCell>
                          <TableCell className="text-xs truncate max-w-[160px]">{c.referer || "-"}</TableCell>
                          <TableCell className="text-xs truncate max-w-[200px]">{c.user_agent || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
