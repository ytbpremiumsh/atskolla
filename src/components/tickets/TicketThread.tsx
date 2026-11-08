import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, ArrowLeft, Shield, User, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { motion } from "framer-motion";

interface TicketThreadProps {
  ticket: any;
  isAdmin?: boolean;
  schoolName?: string;
  onBack: () => void;
  onTicketUpdated?: () => void;
  statusControl?: React.ReactNode;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Menunggu", color: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "Diproses", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "Selesai", color: "bg-success/10 text-success border-success/20" },
};

const TicketThread = ({ ticket, isAdmin = false, schoolName, onBack, onTicketUpdated, statusControl }: TicketThreadProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isResolved = ticket.status === "resolved";
  const status = statusConfig[ticket.status] || statusConfig.open;

  const fetchReplies = async () => {
    const { data } = await supabase
      .from("ticket_replies")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setReplies(data || []);
    setLoadingReplies(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    fetchReplies();

    // Realtime subscription for new replies
    const channel = supabase
      .channel(`ticket-replies-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_replies",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setReplies((prev) => {
            // Avoid duplicates
            if (prev.find((r) => r.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    const ext = imageFile.name.split(".").pop();
    const path = `${ticket.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, imageFile);
    setUploading(false);
    if (error) {
      toast.error("Gagal mengunggah gambar");
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("ticket-attachments")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSend = async () => {
    if (!replyText.trim() && !imageFile) return;
    if (!user) return;

    setSending(true);
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (imageFile && !imageUrl) {
        setSending(false);
        return;
      }
    }

    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      message: replyText.trim() || (imageUrl ? "📷 Gambar" : ""),
      is_admin: isAdmin,
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Gagal mengirim balasan");
    } else {
      setReplyText("");
      removeImage();

      // Send notification
      if (isAdmin) {
        await supabase.from("notifications").insert({
          school_id: ticket.school_id,
          title: `Balasan Tiket: ${ticket.subject}`,
          message: replyText.trim().slice(0, 200) || "Admin mengirim gambar",
          type: "info",
        });
      }

      onTicketUpdated?.();
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
      </Button>

      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="text-base font-bold text-foreground">{ticket.subject}</h2>
              <p className="text-xs text-muted-foreground">
                {schoolName ? `${schoolName} • ` : ""}
                {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
          </div>

          {/* Original message */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4 mt-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Chat thread */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {loadingReplies ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : replies.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada balasan</p>
            ) : (
              replies.map((r) => {
                const isMine = isAdmin ? r.is_admin : !r.is_admin;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      r.is_admin
                        ? "bg-primary/5 border border-primary/10"
                        : "bg-muted"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {r.is_admin ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-semibold text-foreground">
                          {r.is_admin ? "Admin" : (isAdmin ? "Sekolah" : "Anda")}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          {" • "}
                          {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {r.image_url && (
                        <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                          <img
                            src={r.image_url}
                            alt="Lampiran"
                            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}
                      {r.message && r.message !== "📷 Gambar" && (
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap">{r.message}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Status control (admin only) */}
          {statusControl && <div className="mt-4 pt-3 border-t">{statusControl}</div>}

          {/* Reply input */}
          {isResolved && !isAdmin ? (
            <div className="mt-4 p-3 bg-success/5 rounded-lg border border-success/10 text-center">
              <p className="text-xs text-success font-medium">Tiket ini telah ditandai selesai</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {/* Image preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                  <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-auto"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Textarea
                  placeholder="Tulis balasan..."
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || uploading || (!replyText.trim() && !imageFile)}
                  size="icon"
                  className="gradient-primary text-primary-foreground h-auto"
                >
                  {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketThread;
