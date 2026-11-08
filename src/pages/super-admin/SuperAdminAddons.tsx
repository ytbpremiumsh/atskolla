import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Globe, Package, Search, CheckCircle2, Clock, XCircle, ExternalLink, CreditCard, Image, Trash2, Plus, Pencil, Eye, Users, Download, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const PROGRESS_STEPS = [
  { key: "waiting_payment", label: "Menunggu Bayar" },
  { key: "paid", label: "Dibayar" },
  { key: "processing", label: "Diproses" },
  { key: "printing", label: "Dicetak" },
  { key: "shipping", label: "Dikirim" },
  { key: "completed", label: "Selesai" },
];

const SuperAdminAddons = () => {
  const [domainEnabled, setDomainEnabled] = useState(true);
  const [idcardEnabled, setIdcardEnabled] = useState(true);
  const [waCreditEnabled, setWaCreditEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [domainAddons, setDomainAddons] = useState<any[]>([]);
  const [idcardOrders, setIdcardOrders] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [pricePerCard, setPricePerCard] = useState("7000");
  const [waCreditPrice, setWaCreditPrice] = useState("50000");
  const [waCreditPerPack, setWaCreditPerPack] = useState("1000");
  const [waCredits, setWaCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [designDialog, setDesignDialog] = useState(false);
  const [editDesign, setEditDesign] = useState<any>(null);
  const [designName, setDesignName] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewBarcodeStudent, setViewBarcodeStudent] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [settingRes, addonsRes, ordersRes, designsRes, creditsRes] = await Promise.all([
      supabase.from("platform_settings").select("key, value").in("key", ["addon_custom_domain_enabled", "addon_idcard_enabled", "idcard_price_per_card", "addon_wa_credit_enabled", "wa_credit_price", "wa_credit_per_pack"]),
      supabase.from("school_addons").select("*, schools(name)").eq("addon_type", "custom_domain").order("created_at", { ascending: false }),
      supabase.from("id_card_orders").select("*, schools(name), id_card_designs(name, preview_url)").order("created_at", { ascending: false }),
      supabase.from("id_card_designs").select("*").order("sort_order"),
      supabase.from("wa_credits").select("*, schools(name)").order("updated_at", { ascending: false }),
    ]);
    (settingRes.data || []).forEach((s: any) => {
      if (s.key === "addon_custom_domain_enabled") setDomainEnabled(s.value !== "false");
      if (s.key === "addon_idcard_enabled") setIdcardEnabled(s.value !== "false");
      if (s.key === "idcard_price_per_card") setPricePerCard(s.value || "7000");
      if (s.key === "addon_wa_credit_enabled") setWaCreditEnabled(s.value !== "false");
      if (s.key === "wa_credit_price") setWaCreditPrice(s.value || "50000");
      if (s.key === "wa_credit_per_pack") setWaCreditPerPack(s.value || "1000");
    });
    setDomainAddons(addonsRes.data || []);
    setIdcardOrders(ordersRes.data || []);
    setDesigns(designsRes.data || []);
    setWaCredits(creditsRes.data || []);
    setLoading(false);
  };

  const toggleSetting = async (key: string, enabled: boolean, setter: (v: boolean) => void) => {
    setToggling(true);
    const { error } = await supabase.from("platform_settings").upsert({ key, value: enabled ? "true" : "false" }, { onConflict: "key" });
    if (error) toast.error("Gagal mengubah pengaturan");
    else { setter(enabled); toast.success("Pengaturan diperbarui"); }
    setToggling(false);
  };

  const updateDomainStatus = async (addonId: string, newStatus: string) => {
    const { error } = await supabase.from("school_addons").update({ domain_status: newStatus }).eq("id", addonId);
    if (error) toast.error("Gagal update status");
    else { toast.success(`Status domain diubah ke ${newStatus}`); setDomainAddons(domainAddons.map((a) => a.id === addonId ? { ...a, domain_status: newStatus } : a)); }
  };

  const updateOrderProgress = async (orderId: string, progress: string) => {
    const status = progress === "completed" ? "completed" : progress === "waiting_payment" ? "pending" : "active";
    const { error } = await supabase.from("id_card_orders").update({ progress, status }).eq("id", orderId);
    if (error) toast.error("Gagal update progress");
    else { toast.success("Progress pesanan diperbarui"); setIdcardOrders(idcardOrders.map((o) => o.id === orderId ? { ...o, progress, status } : o)); }
  };

  const savePricePerCard = async () => {
    const { error } = await supabase.from("platform_settings").upsert({ key: "idcard_price_per_card", value: pricePerCard }, { onConflict: "key" });
    if (error) toast.error("Gagal simpan harga");
    else toast.success("Harga per kartu diperbarui");
  };

  const saveWaCreditSettings = async () => {
    await Promise.all([
      supabase.from("platform_settings").upsert({ key: "wa_credit_price", value: waCreditPrice }, { onConflict: "key" }),
      supabase.from("platform_settings").upsert({ key: "wa_credit_per_pack", value: waCreditPerPack }, { onConflict: "key" }),
    ]);
    toast.success("Pengaturan kredit WA diperbarui");
  };

  const saveDesign = async () => {
    if (!designName) return;
    if (editDesign) {
      const { error } = await supabase.from("id_card_designs").update({ name: designName, preview_url: designUrl || null }).eq("id", editDesign.id);
      if (error) toast.error("Gagal update desain");
      else { toast.success("Desain diperbarui"); setDesigns(designs.map((d) => d.id === editDesign.id ? { ...d, name: designName, preview_url: designUrl } : d)); }
    } else {
      const { data, error } = await supabase.from("id_card_designs").insert({ name: designName, preview_url: designUrl || null, sort_order: designs.length }).select().single();
      if (error) toast.error("Gagal tambah desain");
      else { toast.success("Desain ditambahkan"); setDesigns([...designs, data]); }
    }
    setDesignDialog(false); setEditDesign(null); setDesignName(""); setDesignUrl("");
  };

  const deleteDesign = async (id: string) => {
    const { error } = await supabase.from("id_card_designs").update({ is_active: false }).eq("id", id);
    if (error) toast.error("Gagal hapus");
    else { toast.success("Desain dinonaktifkan"); setDesigns(designs.filter((d) => d.id !== id)); }
  };

  const openOrderDetail = async (order: any) => {
    setDetailOrder(order);
    setDetailLoading(true);
    setViewBarcodeStudent(null);
    const { data } = await supabase.from("id_card_order_items")
      .select("*, students(qr_code, student_id, name, class, photo_url)")
      .eq("order_id", order.id).order("student_class").order("student_name");
    setDetailItems(data || []);
    setDetailLoading(false);
  };

  const filteredDomain = domainAddons.filter((a) =>
    (a.schools?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.custom_domain || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrders = idcardOrders.filter((o) =>
    (o.schools?.name || "").toLowerCase().includes(orderSearch.toLowerCase())
  );

  const statusIcon: Record<string, any> = {
    active: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    pending: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
    expired: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          Kelola Add-on
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola fitur add-on untuk sekolah</p>
      </div>

      {/* Toggle Menus */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Custom Domain</h3>
                  <p className="text-xs text-muted-foreground">Rp 200.000 / masa aktif</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={domainEnabled ? "default" : "secondary"} className="text-[10px]">{domainEnabled ? "Aktif" : "Nonaktif"}</Badge>
                <Switch checked={domainEnabled} onCheckedChange={(v) => toggleSetting("addon_custom_domain_enabled", v, setDomainEnabled)} disabled={toggling} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">ID Card Siswa</h3>
                  <p className="text-xs text-muted-foreground">Rp {parseInt(pricePerCard).toLocaleString("id-ID")} / kartu</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={idcardEnabled ? "default" : "secondary"} className="text-[10px]">{idcardEnabled ? "Aktif" : "Nonaktif"}</Badge>
                <Switch checked={idcardEnabled} onCheckedChange={(v) => toggleSetting("addon_idcard_enabled", v, setIdcardEnabled)} disabled={toggling} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Kredit WA</h3>
                  <p className="text-xs text-muted-foreground">Rp {parseInt(waCreditPrice).toLocaleString("id-ID")} / {parseInt(waCreditPerPack).toLocaleString("id-ID")} pesan</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={waCreditEnabled ? "default" : "secondary"} className="text-[10px]">{waCreditEnabled ? "Aktif" : "Nonaktif"}</Badge>
                <Switch checked={waCreditEnabled} onCheckedChange={(v) => toggleSetting("addon_wa_credit_enabled", v, setWaCreditEnabled)} disabled={toggling} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="domain" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="domain" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Custom Domain</TabsTrigger>
          <TabsTrigger value="idcard-orders" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Pesanan ID Card</TabsTrigger>
          <TabsTrigger value="idcard-designs" className="gap-1.5"><Image className="h-3.5 w-3.5" /> Desain & Harga</TabsTrigger>
          <TabsTrigger value="wa-credits" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Kredit WA</TabsTrigger>
        </TabsList>

        {/* Domain Tab */}
        <TabsContent value="domain">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">Sekolah dengan Custom Domain ({domainAddons.length})</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Cari sekolah / domain..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDomain.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada sekolah yang membeli Custom Domain</p>
              ) : (
                <div className="space-y-3">
                  {filteredDomain.map((a) => (
                    <div key={a.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{a.schools?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{a.custom_domain || "Belum diatur"}</p>
                          {a.expires_at && <p className="text-[10px] text-muted-foreground mt-0.5">Exp: {new Date(a.expires_at).toLocaleDateString("id-ID")}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
                          {statusIcon[a.domain_status] || statusIcon.pending}
                          {a.domain_status}
                        </Badge>
                        {a.domain_status === "pending" && (
                          <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={() => updateDomainStatus(a.id, "active")}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Verifikasi
                          </Button>
                        )}
                        {a.domain_status === "active" && (
                          <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={() => window.open(`https://${a.custom_domain}`, "_blank")}>
                            <ExternalLink className="h-3 w-3 mr-1" /> Buka
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ID Card Orders Tab */}
        <TabsContent value="idcard-orders">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">Riwayat Pesanan ID Card ({idcardOrders.length})</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Cari sekolah..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada pesanan ID Card</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sekolah</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Desain</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium text-sm">{o.schools?.name || "—"}</TableCell>
                          <TableCell>{o.total_cards} kartu</TableCell>
                          <TableCell>Rp {(o.total_amount || 0).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-xs">{(o as any).id_card_designs?.name || (o.notes?.startsWith("Desain:") ? o.notes.replace("Desain: ", "") : "—")}</TableCell>
                          <TableCell>
                            <Select value={o.progress} onValueChange={(v) => updateOrderProgress(o.id, v)}>
                              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PROGRESS_STEPS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell>
                            <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={() => openOrderDetail(o)}>
                              <Eye className="h-3 w-3 mr-1" /> Detail
                            </Button>
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

        {/* Designs & Pricing Tab */}
        <TabsContent value="idcard-designs">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Harga per Kartu</h3>
                    <p className="text-xs text-muted-foreground">Harga yang berlaku untuk semua sekolah</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rp</span>
                    <Input type="number" className="w-32" value={pricePerCard} onChange={(e) => setPricePerCard(e.target.value)} />
                    <Button size="sm" className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={savePricePerCard}>Simpan</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Desain ID Card ({designs.length})</CardTitle>
                   <Button size="sm" className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={() => { setEditDesign(null); setDesignName(""); setDesignUrl(""); setDesignDialog(true); }}>
                     <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Desain
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {designs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada desain.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {designs.map((d) => (
                      <div key={d.id} className="border rounded-xl overflow-hidden">
                        {d.preview_url ? (
                          <img src={d.preview_url} alt={d.name} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-sm font-semibold">{d.name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDesign(d); setDesignName(d.name); setDesignUrl(d.preview_url || ""); setDesignDialog(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDesign(d.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WA Credits Tab */}
        <TabsContent value="wa-credits">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-sm">Pengaturan Harga Kredit WA</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Harga per Paket (Rp)</label>
                        <Input type="number" value={waCreditPrice} onChange={(e) => setWaCreditPrice(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Jumlah Pesan per Paket</label>
                        <Input type="number" value={waCreditPerPack} onChange={(e) => setWaCreditPerPack(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={saveWaCreditSettings}>Simpan</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kredit WA per Sekolah ({waCredits.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {waCredits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada sekolah dengan kredit WA</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sekolah</TableHead>
                          <TableHead>Sisa Kredit</TableHead>
                          <TableHead>Total Dibeli</TableHead>
                          <TableHead>Terpakai</TableHead>
                          <TableHead>Terakhir Update</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waCredits.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium text-sm">{(c as any).schools?.name || "—"}</TableCell>
                            <TableCell className="font-bold">{c.balance.toLocaleString("id-ID")}</TableCell>
                            <TableCell>{c.total_purchased.toLocaleString("id-ID")}</TableCell>
                            <TableCell>{c.total_used.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("id-ID")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Design Dialog */}
      <Dialog open={designDialog} onOpenChange={setDesignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDesign ? "Edit Desain" : "Tambah Desain Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Desain</label>
              <Input value={designName} onChange={(e) => setDesignName(e.target.value)} placeholder="e.g. Blue Professional" />
            </div>
            <div>
              <label className="text-sm font-medium">URL Preview Gambar (Portrait)</label>
              <Input value={designUrl} onChange={(e) => setDesignUrl(e.target.value)} placeholder="https://..." />
              {designUrl && <img src={designUrl} alt="Preview" className="mt-2 max-w-[150px] aspect-[2/3] object-cover rounded-lg border" loading="lazy" />}
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setDesignDialog(false)}>Batal</Button>
             <Button className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white" onClick={saveDesign} disabled={!designName}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) { setDetailOrder(null); setViewBarcodeStudent(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Detail Pesanan ID Card
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Sekolah</p>
                  <p className="font-bold">{detailOrder.schools?.name || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Jumlah Kartu</p>
                  <p className="font-bold">{detailOrder.total_cards}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Biaya</p>
                  <p className="font-bold">Rp {(detailOrder.total_amount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={detailOrder.progress === "completed" ? "default" : "secondary"} className="mt-1">
                    {PROGRESS_STEPS.find((s) => s.key === detailOrder.progress)?.label || detailOrder.progress}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-muted-foreground">Tanggal Pesan</p>
                  <p className="font-bold">{new Date(detailOrder.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>

              {/* Design chosen - prominent */}
              <div className="border rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-emerald-600" /> Desain yang Dipilih
                </h4>
                <div className="flex items-start gap-4">
                  {(detailOrder as any).id_card_designs?.preview_url ? (
                    <img src={(detailOrder as any).id_card_designs.preview_url} alt="Design" className="w-28 aspect-[2/3] object-cover rounded-lg border shadow-sm shrink-0" />
                  ) : (
                    <div className="w-28 aspect-[2/3] bg-muted rounded-lg border flex items-center justify-center shrink-0">
                      <Image className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">
                      {(detailOrder as any).id_card_designs?.name
                        || (detailOrder.notes?.startsWith("Desain:") ? detailOrder.notes.replace("Desain: ", "") : "Desain Default")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Desain kartu identitas yang dipilih sekolah untuk pesanan ini</p>
                    <p className="text-sm font-semibold mt-2 text-emerald-700 dark:text-emerald-400">Rp {(detailOrder.price_per_card || 7000).toLocaleString("id-ID")} / kartu</p>
                  </div>
                </div>
              </div>

              {/* Student list with barcode view */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> Daftar Siswa ({detailItems.length})
                  </h4>
                  {detailItems.length > 0 && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white"
                      onClick={() => {
                        // Open all barcodes
                        if (viewBarcodeStudent === "all") {
                          setViewBarcodeStudent(null);
                        } else {
                          setViewBarcodeStudent("all");
                        }
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" /> {viewBarcodeStudent === "all" ? "Tutup Semua" : "Lihat & Download Semua Barcode"}
                    </Button>
                  )}
                </div>
                {detailLoading ? (
                  <div className="flex justify-center py-4"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {detailItems.map((item, i) => {
                      const showBarcode = viewBarcodeStudent === "all" || viewBarcodeStudent?.id === item.id;
                      return (
                         <div key={item.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-6 text-center font-bold">{i + 1}</span>
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={(item as any).students?.photo_url || undefined} alt={item.student_name} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                {item.student_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.student_name}</p>
                              <p className="text-xs text-muted-foreground">{item.student_class} • NIS: {(item as any).students?.student_id || "-"}</p>
                            </div>
                            {(item as any).students?.qr_code && viewBarcodeStudent !== "all" && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white shrink-0"
                                onClick={() => setViewBarcodeStudent(showBarcode ? null : { id: item.id, name: item.student_name, class: item.student_class, qr_code: (item as any).students.qr_code })}
                              >
                                <Eye className="h-3 w-3 mr-1" /> {showBarcode ? "Tutup" : "Lihat Barcode"}
                              </Button>
                            )}
                          </div>
                          {showBarcode && (item as any).students?.qr_code && (
                            <div className="mt-3 p-4 bg-white dark:bg-gray-900 rounded-lg border flex flex-col items-center">
                              <QRCodeDisplay
                                data={(item as any).students.qr_code}
                                size={160}
                                studentName={item.student_name}
                                studentClass={item.student_class}
                                schoolName={detailOrder.schools?.name}
                                autoFrame={true}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {detailItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data siswa</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminAddons;
