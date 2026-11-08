import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Wallet, Trash2, Loader2, Mail, Lock, Phone, Pencil, User, UserPlus, GraduationCap, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge as Badge2 } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";

interface BendaharaUser { user_id: string; full_name: string; extra_roles?: string[]; }
interface AssignableUser { user_id: string; full_name: string; roles: string[]; }

export default function ManageBendahara() {
  const { profile } = useAuth();
  const [list, setList] = useState<BendaharaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BendaharaUser | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Assign existing user as Bendahara
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignables, setAssignables] = useState<AssignableUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").eq("school_id", profile.school_id);
    if (!profiles) { setList([]); setAssignables([]); setLoading(false); return; }
    const ids = profiles.map(p => p.user_id);
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
    const rolesByUser = new Map<string, string[]>();
    (allRoles || []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) || [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const bend: BendaharaUser[] = [];
    const assn: AssignableUser[] = [];
    profiles.forEach(p => {
      const rs = rolesByUser.get(p.user_id) || [];
      if (rs.includes("bendahara")) {
        bend.push({ user_id: p.user_id, full_name: p.full_name, extra_roles: rs.filter(r => r !== "bendahara") });
      } else if (rs.includes("teacher") || rs.includes("staff")) {
        assn.push({ user_id: p.user_id, full_name: p.full_name, roles: rs });
      }
    });
    setList(bend);
    setAssignables(assn);
    setLoading(false);
  };
  useEffect(() => { load(); }, [profile?.school_id]);

  const assignBendahara = async () => {
    if (!assignTarget) { toast.error("Pilih guru/staff terlebih dahulu"); return; }
    setAssigning(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: assignTarget, role: "bendahara" as any });
    setAssigning(false);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success("Tanggung jawab Bendahara berhasil diberikan");
    setAssignOpen(false); setAssignTarget(""); load();
  };

  const create = async () => {
    if (!form.full_name || !form.email || !form.password) { toast.error("Lengkapi data"); return; }
    if (form.password.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
    setCreating(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { ...form, role: "bendahara", school_id: profile!.school_id },
    });
    setCreating(false);
    if (res.error || res.data?.error) { toast.error(res.data?.error || res.error?.message); return; }
    toast.success(`Bendahara ${form.full_name} dibuat`);
    setOpen(false); setForm({ full_name: "", email: "", password: "", phone: "" }); load();
  };

  const openEdit = (u: BendaharaUser) => {
    setEditTarget(u);
    setEditForm({ full_name: u.full_name, email: "", password: "", phone: "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (editForm.password && editForm.password.length < 6) { toast.error("Kata sandi minimal 6 karakter"); return; }
    setSavingEdit(true);
    const payload: any = { user_id: editTarget.user_id };
    if (editForm.full_name && editForm.full_name !== editTarget.full_name) payload.full_name = editForm.full_name;
    if (editForm.email) payload.email = editForm.email;
    if (editForm.password) payload.password = editForm.password;
    if (editForm.phone) payload.phone = editForm.phone;
    const res = await supabase.functions.invoke("update-user", { body: payload });
    setSavingEdit(false);
    if (res.error || res.data?.error) { toast.error(res.data?.error || res.error?.message || "Gagal update"); return; }
    toast.success("Data Bendahara diperbarui");
    setEditOpen(false); setEditTarget(null); load();
  };

  const remove = async (u: BendaharaUser) => {
    if (!confirm(`Cabut role Bendahara dari ${u.full_name}?`)) return;
    await supabase.from("user_roles").delete().eq("user_id", u.user_id).eq("role", "bendahara" as any);
    toast.success("Role dicabut"); load();
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Wallet} title="Kelola Bendahara" subtitle="Tambah Bendahara baru atau berikan tanggung jawab Bendahara ke guru/staff yang sudah ada" actions={
        <div className="flex flex-wrap gap-2">
          <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Total Bendahara</p>
              <p className="text-base font-extrabold text-white">{list.length} Orang</p>
            </div>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-sm rounded-xl text-xs font-semibold shadow-md">
            <UserPlus className="h-4 w-4 mr-2" /> Beri Tanggung Jawab
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-white text-[#5B6CF9] hover:bg-white/90 rounded-xl text-xs font-bold shadow-lg shadow-black/10">
            <Plus className="h-4 w-4 mr-2" /> Tambah Bendahara Baru
          </Button>
        </div>
      } />
      {loading ? <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : list.length === 0 ? (
        <Card className="border-0 shadow-card"><CardContent className="p-10 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Belum ada Bendahara</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(u => {
            const hasExtra = (u.extra_roles && u.extra_roles.length > 0);
            return (
            <Card key={u.user_id} className="border-0 shadow-card"><CardContent className="p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] text-white flex items-center justify-center font-bold shrink-0">{u.full_name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{u.full_name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge className="text-[10px] bg-[#5B6CF9]/10 text-[#5B6CF9] dark:bg-[#5B6CF9]/20 dark:text-[#8b97fb] border-0"><Wallet className="h-3 w-3 mr-1" /> Bendahara</Badge>
                  {u.extra_roles?.includes("teacher") && (
                    <Badge2 variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 border-0"><GraduationCap className="h-3 w-3 mr-1" /> Guru</Badge2>
                  )}
                  {u.extra_roles?.includes("staff") && (
                    <Badge2 variant="secondary" className="text-[10px]"><Shield className="h-3 w-3 mr-1" /> Operator</Badge2>
                  )}
                  {u.extra_roles?.includes("school_admin") && (
                    <Badge2 variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-0"><Shield className="h-3 w-3 mr-1" /> Admin</Badge2>
                  )}
                </div>
              </div>
              {!hasExtra && (
                <Button variant="ghost" size="sm" className="text-[#5B6CF9] hover:text-[#4c5ded] hover:bg-[#5B6CF9]/10" onClick={() => openEdit(u)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(u)} title={hasExtra ? "Cabut tanggung jawab Bendahara" : "Hapus"}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent></Card>
          );})}
        </div>
      )}

      {/* Beri Tanggung Jawab ke guru/staff */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Beri Tanggung Jawab Bendahara</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pilih guru atau staff yang sudah terdaftar untuk diberi akses ke dashboard Bendahara. Saat login, mereka akan memilih dashboard mana yang ingin dibuka.</p>
            {assignables.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl">
                Tidak ada guru/staff yang tersedia. Tambahkan guru/staff dulu di menu "Guru & Staff".
              </div>
            ) : (
              <>
                <div>
                  <Label>Pilih Guru / Staff</Label>
                  <Select value={assignTarget} onValueChange={setAssignTarget}>
                    <SelectTrigger><SelectValue placeholder="-- Pilih orang --" /></SelectTrigger>
                    <SelectContent>
                      {assignables.map(a => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.full_name}{a.roles.includes("teacher") ? " (Guru)" : ""}{a.roles.includes("staff") ? " (Operator)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignBendahara} disabled={assigning || !assignTarget} className="w-full bg-[#5B6CF9] hover:bg-[#4c5ded]">
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />} Berikan Akses Bendahara
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tambah */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tambah Bendahara</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Lengkap</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><div className="relative"><Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="pl-9" /></div></div>
            <div><Label>Kata sandi</Label><div className="relative"><Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="pl-9" /></div></div>
            <div><Label>WhatsApp</Label><div className="relative"><Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="pl-9" /></div></div>
            <Button onClick={create} disabled={creating} className="w-full bg-[#5B6CF9] hover:bg-[#4c5ded]">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Buat Akun
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Bendahara</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Lengkap</Label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Email Baru</Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Kosongkan jika tidak diubah" className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Kata sandi Baru</Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Kosongkan jika tidak diubah" className="pl-9" />
              </div>
            </div>
            <div>
              <Label>WhatsApp</Label>
              <div className="relative">
                <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Kosongkan jika tidak diubah" className="pl-9" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Batal</Button>
              <Button onClick={saveEdit} disabled={savingEdit} className="flex-1 bg-[#5B6CF9] hover:bg-[#4c5ded]">
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pencil className="h-4 w-4 mr-2" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
