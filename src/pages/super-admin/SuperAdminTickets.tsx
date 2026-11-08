import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { motion } from "framer-motion";
import TicketThread from "@/components/tickets/TicketThread";

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Menunggu", color: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "Diproses", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "Selesai", color: "bg-success/10 text-success border-success/20" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Rendah", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-primary/10 text-primary" },
  high: { label: "Tinggi", color: "bg-destructive/10 text-destructive" },
};

const SuperAdminTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [schools, setSchools] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchData = async () => {
    const [ticketRes, schoolRes] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name"),
    ]);
    setTickets(ticketRes.data || []);
    const map: Record<string, string> = {};
    (schoolRes.data || []).forEach((s: any) => { map[s.id] = s.name; });
    setSchools(map);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket || !user) return;
    setNewStatus(status);

    await supabase.from("support_tickets").update({
      status,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedTicket.id);

    if (status === "resolved") {
      await supabase.from("notifications").insert({
        school_id: selectedTicket.school_id,
        title: `Tiket Selesai: ${selectedTicket.subject}`,
        message: "Tiket bantuan Anda telah ditandai selesai oleh admin.",
        type: "info",
      });
    }

    setSelectedTicket((prev: any) => prev ? { ...prev, status } : prev);
    toast.success("Status tiket diperbarui");
    fetchData();
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  if (selectedTicket) {
    return (
      <TicketThread
        ticket={selectedTicket}
        isAdmin={true}
        schoolName={schools[selectedTicket.school_id]}
        onBack={() => { setSelectedTicket(null); fetchData(); }}
        onTicketUpdated={fetchData}
        statusControl={
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Label className="text-[10px] text-muted-foreground">Status</Label>
              <Select value={newStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Menunggu</SelectItem>
                  <SelectItem value="in_progress">Diproses</SelectItem>
                  <SelectItem value="resolved">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tiket Bantuan</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Kelola tiket bantuan dari sekolah</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu", value: openCount, color: "text-warning" },
          { label: "Diproses", value: inProgressCount, color: "text-primary" },
          { label: "Selesai", value: resolvedCount, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-card">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { value: "all", label: "Semua" },
          { value: "open", label: "Menunggu" },
          { value: "in_progress", label: "Diproses" },
          { value: "resolved", label: "Selesai" },
        ].map((f) => (
          <Button key={f.value} variant={filter === f.value ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada tiket</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket, i) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const prio = priorityConfig[ticket.priority] || priorityConfig.normal;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="border-0 shadow-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTicket(ticket)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{schools[ticket.school_id] || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{ticket.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${prio.color}`}>{prio.label}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminTickets;
