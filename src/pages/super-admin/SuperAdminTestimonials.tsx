import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Save, Upload, X, Star, Building2, MessageSquareQuote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrustedSchool {
  id?: string;
  name: string;
  initials: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Testimonial {
  id?: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  sort_order: number;
  is_active: boolean;
}

const SuperAdminTestimonials = () => {
  const [schools, setSchools] = useState<TrustedSchool[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchData = async () => {
    const [schoolsRes, testimonialsRes] = await Promise.all([
      supabase.from("landing_trusted_schools").select("*").order("sort_order"),
      supabase.from("landing_testimonials").select("*").order("sort_order"),
    ]);
    setSchools((schoolsRes.data as any[]) || []);
    setTestimonials((testimonialsRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // === Trusted Schools ===
  const addSchool = () => {
    setSchools(prev => [...prev, { name: "", initials: "", logo_url: null, sort_order: prev.length, is_active: true }]);
  };

  const updateSchool = (idx: number, field: string, value: any) => {
    setSchools(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSchool = async (idx: number) => {
    const school = schools[idx];
    if (school.id) {
      await supabase.from("landing_trusted_schools").delete().eq("id", school.id);
    }
    setSchools(prev => prev.filter((_, i) => i !== idx));
    toast.success("Sekolah dihapus");
  };

  const handleLogoUpload = async (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(`school-${idx}`);
    const ext = file.name.split(".").pop();
    const path = `trusted-school-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("landing-assets").upload(path, file);
    if (error) { toast.error("Gagal unggah"); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("landing-assets").getPublicUrl(path);
    updateSchool(idx, "logo_url", urlData.publicUrl);
    setUploading(null);
  };

  const saveSchools = async () => {
    setSaving(true);
    const valid = schools.filter(s => s.name.trim());
    for (let i = 0; i < valid.length; i++) {
      const s = { ...valid[i], sort_order: i };
      if (s.id) {
        await supabase.from("landing_trusted_schools").update({
          name: s.name, initials: s.initials, logo_url: s.logo_url, sort_order: s.sort_order, is_active: s.is_active,
        }).eq("id", s.id);
      } else {
        await supabase.from("landing_trusted_schools").insert({
          name: s.name, initials: s.initials, logo_url: s.logo_url, sort_order: s.sort_order, is_active: s.is_active,
        });
      }
    }
    toast.success("Sekolah berhasil disimpan!");
    fetchData();
    setSaving(false);
  };

  // === Testimonials ===
  const addTestimonial = () => {
    setTestimonials(prev => [...prev, { name: "", role: "", text: "", rating: 5, sort_order: prev.length, is_active: true }]);
  };

  const updateTestimonial = (idx: number, field: string, value: any) => {
    setTestimonials(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const removeTestimonial = async (idx: number) => {
    const t = testimonials[idx];
    if (t.id) {
      await supabase.from("landing_testimonials").delete().eq("id", t.id);
    }
    setTestimonials(prev => prev.filter((_, i) => i !== idx));
    toast.success("Testimoni dihapus");
  };

  const saveTestimonials = async () => {
    setSaving(true);
    const valid = testimonials.filter(t => t.name.trim() && t.text.trim());
    for (let i = 0; i < valid.length; i++) {
      const t = { ...valid[i], sort_order: i };
      if (t.id) {
        await supabase.from("landing_testimonials").update({
          name: t.name, role: t.role, text: t.text, rating: t.rating, sort_order: t.sort_order, is_active: t.is_active,
        }).eq("id", t.id);
      } else {
        await supabase.from("landing_testimonials").insert({
          name: t.name, role: t.role, text: t.text, rating: t.rating, sort_order: t.sort_order, is_active: t.is_active,
        });
      }
    }
    toast.success("Testimoni berhasil disimpan!");
    fetchData();
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sekolah & Testimoni</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Kelola logo sekolah dan testimoni di halaman utama</p>
      </div>

      <Tabs defaultValue="schools">
        <TabsList>
          <TabsTrigger value="schools" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Sekolah Terpercaya</TabsTrigger>
          <TabsTrigger value="testimonials" className="gap-1.5"><MessageSquareQuote className="h-3.5 w-3.5" /> Testimoni</TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{schools.length} sekolah</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addSchool}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
              <Button size="sm" onClick={saveSchools} disabled={saving} className="gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />} Simpan
              </Button>
            </div>
          </div>

          {schools.map((school, idx) => (
            <Card key={school.id || idx} className="border-0 shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Aktif</Label>
                      <Switch checked={school.is_active} onCheckedChange={(v) => updateSchool(idx, "is_active", v)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSchool(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Sekolah</Label>
                    <Input value={school.name} onChange={(e) => updateSchool(idx, "name", e.target.value)} placeholder="SD Negeri 1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Inisial</Label>
                    <Input value={school.initials} onChange={(e) => updateSchool(idx, "initials", e.target.value)} placeholder="SDN1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Logo</Label>
                    <div className="flex items-center gap-2">
                      {school.logo_url && (
                        <div className="relative">
                          <img src={school.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain border" />
                          <button onClick={() => updateSchool(idx, "logo_url", null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                      <div>
                        <input type="file" accept="image/*" id={`school-logo-${idx}`} className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(idx, f); }} />
                        <Button type="button" variant="outline" size="sm" disabled={uploading === `school-${idx}`}
                          onClick={() => document.getElementById(`school-logo-${idx}`)?.click()}>
                          {uploading === `school-${idx}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}

                          Unggah
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Testimonials Tab */}
        <TabsContent value="testimonials" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{testimonials.length} testimoni</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addTestimonial}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah</Button>
              <Button size="sm" onClick={saveTestimonials} disabled={saving} className="gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />} Simpan
              </Button>
            </div>
          </div>

          {testimonials.map((t, idx) => (
            <Card key={t.id || idx} className="border-0 shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Aktif</Label>
                      <Switch checked={t.is_active} onCheckedChange={(v) => updateTestimonial(idx, "is_active", v)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTestimonial(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama</Label>
                    <Input value={t.name} onChange={(e) => updateTestimonial(idx, "name", e.target.value)} placeholder="Ibu Sari Dewi" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jabatan / Peran</Label>
                    <Input value={t.role} onChange={(e) => updateTestimonial(idx, "role", e.target.value)} placeholder="Kepala Sekolah, SD Negeri 1" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Testimoni</Label>
                  <Textarea value={t.text} onChange={(e) => updateTestimonial(idx, "text", e.target.value)} rows={3} className="resize-none" placeholder="Tuliskan testimoni..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rating (1-5)</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => updateTestimonial(idx, "rating", r)}>
                        <Star className={`h-5 w-5 transition-colors ${r <= t.rating ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminTestimonials;
