import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Users, Image, ShoppingCart, CheckCircle2, Clock, Truck, Printer, Package, ArrowLeft, ChevronRight, Eye, Wallet, Search, Sparkles, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PaymentIframeDialog } from "@/components/PaymentIframeDialog";
import { PageHeader } from "@/components/PageHeader";

import idcardDesign1 from "@/assets/idcard-design-1.png";
import idcardDesign2 from "@/assets/idcard-design-2.png";
import idcardDesign3 from "@/assets/idcard-design-3.png";

const fallbackDesigns = [
  { id: "fallback-1", name: "Blue Professional", preview_url: idcardDesign1 },
  { id: "fallback-2", name: "Colorful Kids", preview_url: idcardDesign2 },
  { id: "fallback-3", name: "Navy Gold Elegant", preview_url: idcardDesign3 },
];

const PROGRESS_STEPS = [
  { key: "waiting_payment", label: "Menunggu Bayar", icon: Clock, pct: 10 },
  { key: "paid", label: "Dibayar", icon: CheckCircle2, pct: 30 },
  { key: "processing", label: "Diproses", icon: Package, pct: 50 },
  { key: "printing", label: "Dicetak", icon: Printer, pct: 70 },
  { key: "shipping", label: "Dikirim", icon: Truck, pct: 90 },
  { key: "completed", label: "Selesai", icon: CheckCircle2, pct: 100 },
];

const OrderIdCard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"select" | "design" | "confirm" | "history">("history");
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<string>("");
  const [pricePerCard, setPricePerCard] = useState(7000);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [paymentIframe, setPaymentIframe] = useState<string | null>(null);
  const [paymentTxnId, setPaymentTxnId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("status") === "success") {
      toast.success("Pembayaran berhasil! Pesanan sedang diproses.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!profile?.school_id) return;
    const load = async () => {
      const [studRes, designRes, orderRes, priceRes] = await Promise.all([
        supabase.from("students").select("id, name, class, student_id, photo_url").eq("school_id", profile.school_id).order("class").order("name"),
        supabase.from("id_card_designs").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("id_card_orders").select("*, id_card_designs(name, preview_url)").eq("school_id", profile.school_id).order("created_at", { ascending: false }),
        supabase.from("platform_settings").select("value").eq("key", "idcard_price_per_card").maybeSingle(),
      ]);
      const studs = studRes.data || [];
      setStudents(studs);
      setClasses([...new Set(studs.map((s: any) => s.class))].sort());
      const dbDesigns = designRes.data || [];
      setDesigns(dbDesigns.length > 0 ? dbDesigns : fallbackDesigns);
      setOrders(orderRes.data || []);
      if (priceRes.data?.value) setPricePerCard(parseInt(priceRes.data.value) || 7000);
      setLoading(false);
    };
    load();
  }, [profile?.school_id]);

  const filteredStudents = (selectedClass && selectedClass !== "all"
    ? students.filter((s) => s.class === selectedClass)
    : students
  ).filter((s) =>
    !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
  };

  const totalAmount = selectedStudents.size * pricePerCard;

  const handleSubmitOrder = async () => {
    if (!profile?.school_id || selectedStudents.size === 0 || !selectedDesign) return;
    setSubmitting(true);
    try {
      const isFallback = selectedDesign.startsWith("fallback");
      const chosenDesign = designs.find((d) => d.id === selectedDesign);
      const { data: order, error } = await supabase.from("id_card_orders").insert({
        school_id: profile.school_id,
        design_id: isFallback ? null : selectedDesign,
        total_cards: selectedStudents.size,
        price_per_card: pricePerCard,
        total_amount: totalAmount,
        status: "pending",
        progress: "waiting_payment",
        notes: isFallback ? `Desain: ${chosenDesign?.name || selectedDesign}` : null,
      }).select("id").single();
      if (error) throw error;

      const items = Array.from(selectedStudents).map((sid) => {
        const st = students.find((s) => s.id === sid);
        return { order_id: order.id, student_id: sid, student_name: st?.name || "", student_class: st?.class || "" };
      });
      await supabase.from("id_card_order_items").insert(items);

      toast.info("Mengarahkan ke halaman pembayaran...");
      const { data: payData, error: payError } = await supabase.functions.invoke("create-mayar-payment", {
        body: { addon_type: "idcard", order_id: order.id, school_id: profile.school_id },
      });

      if (payError) throw payError;
      if (payData?.payment_url) {
        setPaymentTxnId(payData.transaction_id || null);
        setPaymentIframe(payData.payment_url);
      }

      const { data: newOrders } = await supabase.from("id_card_orders")
        .select("*, id_card_designs(name, preview_url)")
        .eq("school_id", profile.school_id).order("created_at", { ascending: false });
      setOrders(newOrders || []);
      setStep("history");
      setSelectedStudents(new Set());
      setSelectedDesign("");
      toast.success("Pesanan berhasil dibuat! Silakan selesaikan pembayaran.");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    }
    setSubmitting(false);
  };

  const handlePayOrder = async (order: any) => {
    try {
      toast.info("Mengarahkan ke halaman pembayaran...");
      const { data, error } = await supabase.functions.invoke("create-mayar-payment", {
        body: { addon_type: "idcard", order_id: order.id, school_id: profile?.school_id },
      });
      if (error) throw error;
      if (data?.payment_url) { setPaymentTxnId(data.transaction_id || null); setPaymentIframe(data.payment_url); }
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat pembayaran");
    }
  };

  const openDetail = async (order: any) => {
    setDetailOrder(order);
    setDetailLoading(true);
    const { data } = await supabase.from("id_card_order_items")
      .select("*, students(qr_code, student_id, photo_url)")
      .eq("order_id", order.id).order("student_class").order("student_name");
    setDetailItems(data || []);
    setDetailLoading(false);
  };

  const getProgressPct = (progress: string) => PROGRESS_STEPS.find((s) => s.key === progress)?.pct || 0;
  const getProgressLabel = (progress: string) => PROGRESS_STEPS.find((s) => s.key === progress)?.label || progress;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // Current step index for stepper
  const stepOrder = ["select", "design", "confirm"] as const;
  const currentStepIdx = stepOrder.indexOf(step as any);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CreditCard}
        title="Pesan ID Card Siswa"
        subtitle="Cetak kartu identitas siswa dengan desain profesional"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/addons")}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={step === "history" ? "default" : "outline"} onClick={() => setStep("history")}
          className={step === "history" ? "bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white" : ""}>
          Riwayat Pesanan
        </Button>
        <Button size="sm" variant={step !== "history" ? "default" : "outline"} onClick={() => setStep("select")}
          className={step !== "history" ? "bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white" : ""}>
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Pesan Baru
        </Button>
      </div>

      {/* History */}
      {step === "history" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Belum Ada Pesanan</h3>
                <p className="text-muted-foreground text-sm mb-4">Mulai pesan ID Card untuk siswa Anda</p>
                <Button className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white" onClick={() => setStep("select")}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Pesan Sekarang
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CreditCard className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{order.total_cards} Kartu</span>
                            <Badge variant="outline" className="text-[10px]">
                              {(order as any).id_card_designs?.name || "Desain Default"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Rp {(order.total_amount || 0).toLocaleString("id-ID")} • {new Date(order.created_at).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.progress === "waiting_payment" && (
                          <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] text-white" onClick={() => handlePayOrder(order)}>
                            <Wallet className="h-3 w-3 mr-1" /> Bayar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(order)}>
                          <Eye className="h-3 w-3 mr-1" /> Detail
                        </Button>
                        <Badge variant={order.progress === "completed" ? "default" : "secondary"} className="text-xs">
                          {getProgressLabel(order.progress)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={getProgressPct(order.progress)} className="h-2" />
                      <div className="flex justify-between">
                        {PROGRESS_STEPS.map((s) => {
                          const reached = getProgressPct(order.progress) >= s.pct;
                          return (
                            <div key={s.key} className="flex flex-col items-center">
                              <s.icon className={`h-3 w-3 ${reached ? "text-primary" : "text-muted-foreground/30"}`} />
                              <span className={`text-[8px] mt-0.5 ${reached ? "text-foreground font-medium" : "text-muted-foreground/30"}`}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* New Order Flow - Premium Stepper */}
      {step !== "history" && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0">
            {stepOrder.map((s, i) => {
              const isActive = currentStepIdx === i;
              const isDone = currentStepIdx > i;
              const labels = ["Pilih Siswa", "Pilih Desain", "Konfirmasi"];
              const icons = [Users, Image, ShoppingCart];
              const Icon = icons[i];
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isDone ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white" :
                        isActive ? "bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] border-[#5B6CF9] text-white shadow-lg shadow-[#5B6CF9]/30" :
                        "bg-muted border-border text-muted-foreground"
                      }`}
                      animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </motion.div>
                    <span className={`text-[10px] mt-1.5 font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {labels[i]}
                    </span>
                  </div>
                  {i < stepOrder.length - 1 && (
                    <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-5 rounded-full transition-colors ${isDone ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Select Students - Premium */}
          <AnimatePresence mode="wait">
            {step === "select" && (
              <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] p-4 sm:p-5">
                    <div className="flex items-center gap-3 text-white">
                      <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">Pilih Siswa</h2>
                        <p className="text-white/70 text-sm">Pilih siswa yang akan dibuatkan ID Card</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Kelas</SelectItem>
                          {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Cari nama atau NIS..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                      </div>
                      <Button variant="outline" size="sm" onClick={selectAll} className="shrink-0">
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        {selectedStudents.size === filteredStudents.length ? "Batal Semua" : "Pilih Semua"}
                      </Button>
                    </div>

                    {/* Selected count banner */}
                    {selectedStudents.size > 0 && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                            {selectedStudents.size}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Siswa dipilih</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              Estimasi: Rp {(selectedStudents.size * pricePerCard).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                        <Sparkles className="h-5 w-5 text-emerald-500" />
                      </motion.div>
                    )}

                    {/* Student list */}
                    <div className="max-h-[400px] overflow-y-auto border rounded-xl divide-y">
                      {filteredStudents.map((s, i) => (
                        <motion.label
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                            selectedStudents.has(s.id)
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={s.photo_url || undefined} alt={s.name} />
                            <AvatarFallback className="bg-gradient-to-br from-[#5B6CF9]/20 to-[#4c5ded]/20 text-primary text-xs font-bold">
                              {getInitials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">NIS: {s.student_id} • {s.class}</p>
                          </div>
                          {selectedStudents.has(s.id) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            </motion.div>
                          )}
                        </motion.label>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="text-center py-12">
                          <Users className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                          <p className="text-sm text-muted-foreground">Tidak ada siswa ditemukan</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button disabled={selectedStudents.size === 0} onClick={() => setStep("design")}
                        className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white px-6">
                        Lanjut Pilih Desain <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Design Selection - Premium */}
            {step === "design" && (
              <motion.div key="design" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5">
                    <div className="flex items-center gap-3 text-white">
                      <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Image className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">Pilih Desain Kartu</h2>
                        <p className="text-white/70 text-sm">Pilih template desain ID Card yang diinginkan</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-5 space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {designs.map((d, i) => (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`relative group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                            selectedDesign === d.id
                              ? "ring-3 ring-primary shadow-xl shadow-primary/20 scale-[1.02]"
                              : "border-2 border-border hover:border-primary/40 hover:shadow-lg"
                          }`}
                          onClick={() => setSelectedDesign(d.id)}
                        >
                          {d.preview_url && (
                            <img src={d.preview_url} alt={d.name} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                          )}
                          {/* Overlay */}
                          <div className={`absolute inset-0 transition-opacity ${
                            selectedDesign === d.id ? "bg-primary/10" : "bg-transparent group-hover:bg-black/5"
                          }`} />
                          {/* Selected badge */}
                          {selectedDesign === d.id && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3">
                              <div className="h-8 w-8 rounded-full bg-primary shadow-lg flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              </div>
                            </motion.div>
                          )}
                          <div className={`p-3 transition-colors ${selectedDesign === d.id ? "bg-primary/5" : "bg-background"}`}>
                            <span className="text-sm font-bold">{d.name}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep("select")}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
                      </Button>
                      <Button disabled={!selectedDesign} onClick={() => setStep("confirm")}
                        className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white px-6">
                        Lanjut Konfirmasi <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Confirm - Premium */}
            {step === "confirm" && (
              <motion.div key="confirm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 sm:p-5">
                    <div className="flex items-center gap-3 text-white">
                      <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">Konfirmasi Pesanan</h2>
                        <p className="text-white/70 text-sm">Periksa kembali pesanan Anda sebelum pembayaran</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-5 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Design preview */}
                      <div className="flex flex-col items-center">
                        {selectedDesign && (
                          <img
                            src={designs.find((d) => d.id === selectedDesign)?.preview_url}
                            alt="Preview"
                            className="w-full max-w-[200px] rounded-xl border-2 border-border shadow-md"
                            loading="lazy"
                          />
                        )}
                        <p className="text-sm font-bold mt-3">{designs.find((d) => d.id === selectedDesign)?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">Desain yang dipilih</p>
                      </div>
                      {/* Order summary */}
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-xl p-4 space-y-3 border">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Jumlah Kartu</span>
                            <span className="font-bold">{selectedStudents.size} kartu</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Harga per Kartu</span>
                            <span className="font-semibold">Rp {pricePerCard.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="border-t pt-3 flex justify-between">
                            <span className="font-bold text-base">Total Biaya</span>
                            <span className="font-extrabold text-xl text-primary">Rp {totalAmount.toLocaleString("id-ID")}</span>
                          </div>
                        </div>

                        {/* Student avatars preview */}
                        <div className="bg-muted/30 rounded-xl p-3 border">
                          <p className="text-xs text-muted-foreground mb-2 font-medium">Siswa yang dipilih:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(selectedStudents).slice(0, 8).map((sid) => {
                              const st = students.find(s => s.id === sid);
                              if (!st) return null;
                              return (
                                <Avatar key={sid} className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={st.photo_url || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">{getInitials(st.name)}</AvatarFallback>
                                </Avatar>
                              );
                            })}
                            {selectedStudents.size > 8 && (
                              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                +{selectedStudents.size - 8}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-semibold mb-1 flex items-center gap-1.5"><Wallet className="h-4 w-4" /> Informasi Pembayaran</p>
                      <p className="text-xs">Setelah mengklik "Buat Pesanan & Bayar", Anda akan diarahkan ke halaman pembayaran. Pesanan akan diproses setelah pembayaran berhasil.</p>
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={() => setStep("design")}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
                      </Button>
                      <Button onClick={handleSubmitOrder} disabled={submitting}
                        className="bg-gradient-to-r from-[#5B6CF9] to-[#4c5ded] hover:from-[#4c5ded] hover:to-[#3d4ede] text-white px-6 shadow-lg shadow-[#5B6CF9]/20">
                        <Wallet className="h-4 w-4 mr-2" />
                        {submitting ? "Memproses..." : "Buat Pesanan & Bayar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Detail Pesanan
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Jumlah Kartu</p>
                  <p className="font-bold">{detailOrder.total_cards}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Biaya</p>
                  <p className="font-bold">Rp {(detailOrder.total_amount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Desain</p>
                  <p className="font-bold">{(detailOrder as any).id_card_designs?.name || (detailOrder.notes?.startsWith("Desain:") ? detailOrder.notes.replace("Desain: ", "") : "Default")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={detailOrder.progress === "completed" ? "default" : "secondary"} className="mt-1">
                    {getProgressLabel(detailOrder.progress)}
                  </Badge>
                </div>
              </div>

              {/* Design Preview */}
              {(detailOrder as any).id_card_designs?.preview_url && (
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Preview Desain</p>
                  <img src={(detailOrder as any).id_card_designs.preview_url} alt="Design" className="mx-auto max-w-[200px] aspect-[2/3] object-cover rounded-lg border shadow-sm" />
                </div>
              )}

              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Daftar Siswa ({detailItems.length})
                </h4>
                {detailLoading ? (
                  <div className="flex justify-center py-4"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {detailItems.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 text-sm">
                        <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={(item as any).students?.photo_url || undefined} alt={item.student_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {getInitials(item.student_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.student_name}</p>
                          <p className="text-xs text-muted-foreground">{item.student_class} • NIS: {(item as any).students?.student_id || "-"}</p>
                        </div>
                        {(item as any).students?.qr_code && (
                          <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{(item as any).students.qr_code}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentIframeDialog
        open={!!paymentIframe}
        paymentUrl={paymentIframe}
        title="Pembayaran ID Card — QRIS / Transfer Bank"
        checkPaid={async () => {
          if (!paymentTxnId) return false;
          const { data } = await supabase.from("payment_transactions").select("status").eq("id", paymentTxnId).maybeSingle();
          return data?.status === "paid";
        }}
        onPaid={() => {
          window.location.href = "/order-idcard?status=success";
        }}
        onClose={() => { setPaymentIframe(null); setPaymentTxnId(null); }}
      />
    </div>
  );
};

export default OrderIdCard;
