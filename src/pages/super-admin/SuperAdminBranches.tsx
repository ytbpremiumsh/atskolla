import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, School, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

const SuperAdminBranches = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const fetchData = async () => {
    const [groupsRes, schoolsRes] = await Promise.all([
      supabase.from("school_groups").select("*").order("name"),
      supabase.from("schools").select("id, name, group_id"),
    ]);
    setGroups(groupsRes.data || []);
    setSchools(schoolsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { toast.error("Nama grup wajib diisi"); return; }
    const { error } = await supabase.from("school_groups").insert({ name: newGroupName.trim() });
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success("Grup cabang berhasil dibuat!");
    setDialogOpen(false);
    setNewGroupName("");
    fetchData();
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Hapus grup cabang ini?")) return;
    // Unlink schools first
    await supabase.from("schools").update({ group_id: null }).eq("group_id", id);
    const { error } = await supabase.from("school_groups").delete().eq("id", id);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success("Grup dihapus");
    fetchData();
  };

  const handleAssign = async () => {
    if (!selectedSchool || !selectedGroup) return;
    const groupId = selectedGroup === "none" ? null : selectedGroup;
    const { error } = await supabase.from("schools").update({ group_id: groupId }).eq("id", selectedSchool);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success("Sekolah berhasil dipindahkan!");
    setAssignDialogOpen(false);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi Cabang Sekolah</h1>
          <p className="text-muted-foreground text-sm">Kelola grup cabang dan hubungkan sekolah</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" /> Hubungkan
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Tambah Grup
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada grup cabang. Buat grup untuk mengelola sekolah multi-cabang.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const groupSchools = schools.filter((s) => s.group_id === group.id);
            return (
              <Card key={group.id} className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      {group.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{groupSchools.length} sekolah</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupSchools.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada sekolah di grup ini</p>
                  ) : (
                    <div className="space-y-2">
                      {groupSchools.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                          <School className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned schools */}
      {schools.filter((s) => !s.group_id).length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="text-base text-muted-foreground">Sekolah Tanpa Grup</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {schools.filter((s) => !s.group_id).map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                  <School className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{s.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Grup Cabang</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Grup</Label><Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Contoh: Yayasan XYZ" /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateGroup} className="gradient-primary text-primary-foreground">Buat Grup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign School Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hubungkan Sekolah ke Grup</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sekolah</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger><SelectValue placeholder="Pilih Sekolah" /></SelectTrigger>
                <SelectContent>{schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grup Cabang</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger><SelectValue placeholder="Pilih Grup" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tanpa Grup —</SelectItem>
                  {groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAssign} className="gradient-primary text-primary-foreground">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminBranches;
