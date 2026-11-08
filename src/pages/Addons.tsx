import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, CreditCard, Package, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Addons = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [domainEnabled, setDomainEnabled] = useState(true);
  const [idcardEnabled, setIdcardEnabled] = useState(true);
  const [waCreditEnabled, setWaCreditEnabled] = useState(true);
  const [domainAddon, setDomainAddon] = useState<any>(null);
  const [idcardOrders, setIdcardOrders] = useState<any[]>([]);
  const [waCredits, setWaCredits] = useState<any>(null);
  const [waCreditPrice, setWaCreditPrice] = useState(50000);
  const [waCreditPerPack, setWaCreditPerPack] = useState(1000);
  const [waPurchases, setWaPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["addon_custom_domain_enabled", "addon_idcard_enabled", "addon_wa_credit_enabled", "wa_credit_price", "wa_credit_per_pack"]);
      (data || []).forEach((d: any) => {
        if (d.key === "addon_custom_domain_enabled" && d.value === "false") setDomainEnabled(false);
        if (d.key === "addon_idcard_enabled" && d.value === "false") setIdcardEnabled(false);
        if (d.key === "addon_wa_credit_enabled" && d.value === "false") setWaCreditEnabled(false);
        if (d.key === "wa_credit_price") setWaCreditPrice(parseInt(d.value) || 50000);
        if (d.key === "wa_credit_per_pack") setWaCreditPerPack(parseInt(d.value) || 1000);
      });

      if (profile?.school_id) {
        const [domRes, orderRes, creditRes, waPayRes] = await Promise.all([
          supabase.from("school_addons").select("*").eq("school_id", profile.school_id).eq("addon_type", "custom_domain").maybeSingle(),
          supabase.from("id_card_orders").select("*, id_card_designs(name)").eq("school_id", profile.school_id).order("created_at", { ascending: false }).limit(5),
          supabase.from("wa_credits").select("*").eq("school_id", profile.school_id).maybeSingle(),
          supabase.from("payment_transactions").select("id, amount, created_at, status, payment_method").eq("school_id", profile.school_id).like("payment_method", "%wa_credit%").order("created_at", { ascending: false }).limit(5),
        ]);
        setDomainAddon(domRes.data);
        setIdcardOrders(orderRes.data || []);
        setWaCredits(creditRes.data);
        setWaPurchases(waPayRes.data || []);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [profile?.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const addons = [
    ...(domainEnabled ? [{
      key: "domain",
      icon: Globe,
      title: "Custom Domain",
      description: "Gunakan domain pribadi untuk dashboard sekolah Anda. Tampil lebih profesional dengan URL khusus.",
      price: "Rp 200.000",
      priceNote: "mengikuti masa aktif langganan",
      status: domainAddon?.status === "active" ? "active" : domainAddon ? "pending" : null,
      statusLabel: domainAddon?.status === "active" ? "Aktif" : domainAddon ? "Proses" : null,
      gradient: "from-blue-600 to-indigo-700",
      features: ["SSL Gratis & HTTPS", "Instant Setup", "Tutorial DNS Lengkap"],
      onClick: () => navigate("/custom-domain"),
    }] : []),
    ...(idcardEnabled ? [{
      key: "idcard",
      icon: CreditCard,
      title: "Cetak ID Card Siswa",
      description: "Cetak kartu identitas siswa profesional dengan QR Code unik untuk absensi dan identifikasi.",
      price: "Rp 7.000",
      priceNote: "per kartu",
      status: idcardOrders.length > 0 ? "has_orders" : null,
      statusLabel: idcardOrders.length > 0 ? `${idcardOrders.length} pesanan` : null,
      gradient: "from-emerald-600 to-teal-700",
      features: ["Pilih Desain Premium", "QR Code Otomatis", "Tracking Pengiriman"],
      onClick: () => navigate("/order-idcard"),
    }] : []),
    ...(waCreditEnabled ? [{
      key: "wacredit",
      icon: MessageSquare,
      title: "Kredit Pesan WhatsApp",
      description: "Top-up kredit pesan WhatsApp untuk notifikasi absensi dan broadcast ke wali murid.",
      price: `Rp\u00A0${waCreditPrice.toLocaleString("id-ID")}`,
      priceNote: `${waCreditPerPack.toLocaleString("id-ID")} pesan`,
      status: waCredits ? "active" : null,
      statusLabel: waCredits ? `${waCredits.balance.toLocaleString("id-ID")} sisa` : null,
      gradient: "from-violet-600 to-purple-700",
      features: ["Notifikasi Absensi Otomatis", "Broadcast Wali Murid", "Riwayat Pengiriman"],
      onClick: () => navigate("/wa-credit"),
    }] : []),
  ];

  // Determine grid columns based on number of addons
  const gridCols = addons.length === 1 ? "grid-cols-1" : addons.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  const getProgressLabel = (progress: string) => {
    const map: Record<string, string> = {
      waiting_payment: "Menunggu Bayar", paid: "Dibayar", processing: "Diproses",
      printing: "Dicetak", shipping: "Dikirim", completed: "Selesai",
    };
    return map[progress] || progress;
  };

  const recentHistory: { type: string; label: string; date: string; status: string; amount: number; icon: any; id: string }[] = [];
  idcardOrders.slice(0, 5).forEach((order) => {
    recentHistory.push({
      type: "idcard",
      label: `${order.total_cards} kartu • ${(order as any).id_card_designs?.name || "Desain Default"}`,
      date: order.created_at,
      status: getProgressLabel(order.progress),
      amount: order.total_amount || 0,
      icon: CreditCard,
      id: order.id,
    });
  });
  waPurchases.forEach((tx) => {
    const statusMap: Record<string, string> = { pending: "Menunggu Bayar", paid: "Berhasil", success: "Berhasil", failed: "Gagal", expired: "Kadaluarsa" };
    recentHistory.push({
      type: "wacredit",
      label: `Top-up Kredit Pesan WhatsApp`,
      date: tx.created_at,
      status: statusMap[tx.status] || tx.status,
      amount: tx.amount || 0,
      icon: MessageSquare,
      id: tx.id,
    });
  });


  recentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            Add-on
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Fitur tambahan untuk meningkatkan sistem sekolah Anda</p>
        </div>
      </div>

      {addons.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Belum Ada Add-on Tersedia</h3>
            <p className="text-muted-foreground text-sm">Add-on akan muncul di sini saat tersedia</p>
          </CardContent>
        </Card>
      )}

      {/* Add-on Cards */}
      <div className={`grid gap-5 ${gridCols}`}>
        {addons.map((addon, idx) => (
          <motion.div key={addon.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="cursor-pointer group overflow-hidden border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full" onClick={addon.onClick}>
              <CardContent className="p-0 flex flex-col h-full">
                <div className={`bg-gradient-to-r ${addon.gradient} p-5 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <addon.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{addon.title}</h3>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl font-extrabold">{addon.price}</span>
                          <span className="text-xs text-white/70">/ {addon.priceNote}</span>
                        </div>
                      </div>
                    </div>
                    {addon.statusLabel && (
                      <Badge className="bg-white/20 text-white border-white/30 text-[10px]">{addon.statusLabel}</Badge>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground leading-relaxed">{addon.description}</p>
                  <div className="space-y-2">
                    {addon.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <span className="text-sm font-semibold text-primary group-hover:underline">
                      {addon.status === "active" ? "Kelola" : addon.status === "has_orders" ? "Lihat Pesanan" : "Mulai Sekarang"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Add-on History */}
      {recentHistory.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Riwayat Pesanan Add-on
              </h3>
            </div>
            <div className="space-y-2">
              {recentHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === "idcard" ? "bg-emerald-500/10" : "bg-violet-500/10"
                    }`}>
                      <item.icon className={`h-4 w-4 ${item.type === "idcard" ? "text-emerald-600" : "text-violet-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{item.type === "idcard" ? "ID Card" : "Kredit WhatsApp"}</span>
                        <span className="text-xs text-muted-foreground truncate">• {item.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Rp {item.amount.toLocaleString("id-ID")} • {new Date(item.date).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={item.status === "Selesai" || item.status === "Berhasil" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Addons;
