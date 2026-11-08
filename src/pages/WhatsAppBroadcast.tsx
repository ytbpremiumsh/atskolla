import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { PremiumGate } from "@/components/PremiumGate";

const WhatsAppBroadcast = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ name: string; wa_group_id: string | null }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [sendingGroup, setSendingGroup] = useState(false);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    supabase.from("classes").select("name, wa_group_id").eq("school_id", schoolId).order("name")
      .then(({ data }) => {
        setClasses(data || []);
        setLoading(false);
      });
  }, [schoolId]);

  const handleSendToGroup = async () => {
    if (!selectedClass || !groupMessage.trim() || !schoolId) {
      toast.error("Pilih kelas dan isi pesan");
      return;
    }
    const cls = classes.find(c => c.name === selectedClass);
    if (!cls?.wa_group_id) {
      toast.error("Kelas ini belum memiliki ID Grup WhatsApp. Atur di halaman Kelas.");
      return;
    }
    setSendingGroup(true);
    try {
      const res = await supabase.functions.invoke("send-whatsapp", {
        body: { school_id: schoolId, group_id: cls.wa_group_id, message: groupMessage, message_type: "group_broadcast" },
      });
      const data = res.data as any;
      if (data?.success) {
        toast.success(`Pesan berhasil dikirim ke grup ${selectedClass}`);
        setGroupMessage("");
      } else {
        const errMsg = data?.error || data?.details?.[0]?.data?.msg || data?.details?.[0]?.data?.message || "Gagal mengirim";
        if (errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("koneksi")) {
          toast.error("Koneksi WhatsApp terputus. Silakan scan ulang QR di halaman Pengaturan WhatsApp.");
        } else {
          toast.error("Gagal kirim ke grup: " + errMsg);
        }
      }
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    }
    setSendingGroup(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Memuat...</div>;

  return (
    <PremiumGate featureLabel="WhatsApp Gateway" requiredPlan="Premium">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            Kirim Pesan ke Grup Kelas
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Kirim pesan broadcast ke grup WhatsApp kelas
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kirim Pesan Custom ke Grup Kelas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Kelas</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} {c.wa_group_id ? "" : "(Belum ada grup)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Isi Pesan</Label>
              <Textarea value={groupMessage} onChange={(e) => setGroupMessage(e.target.value)}
                rows={5} placeholder="Ketik pesan yang akan dikirim ke grup WhatsApp kelas..." />
            </div>
            <Button onClick={handleSendToGroup} disabled={sendingGroup || !selectedClass || !groupMessage.trim()}>
              {sendingGroup ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Kirim ke Grup
            </Button>

            {classes.filter(c => !c.wa_group_id).length > 0 && (
              <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                Beberapa kelas belum memiliki ID Grup WhatsApp. Atur di halaman <strong>Kelas</strong> → klik kelas → isi WA Group ID.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
};

export default WhatsAppBroadcast;
