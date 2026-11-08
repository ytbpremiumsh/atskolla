import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Save, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";

const AccountSettings = () => {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch phone from profile
      supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
    }
  }, [user]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, phone: phone || null } as any)
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Gagal memperbarui profil: " + error.message);
    } else {
      toast.success("Profil berhasil diperbarui!");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Kata sandi tidak cocok");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Gagal mengganti password: " + error.message);
    } else {
      toast.success("Kata sandi berhasil diperbarui!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Pengaturan Akun
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Kelola profil dan keamanan akun Anda</p>
      </div>

      {/* Profile */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Nama Lengkap</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> No. WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="08xxxxxxxxxx"
            />
            <p className="text-[11px] text-muted-foreground">Nomor ini digunakan untuk menerima kode OTP saat atur ulang kata sandi</p>
          </div>
          <Button onClick={handleUpdateProfile} disabled={savingProfile} className="gradient-primary hover:opacity-90">
            <Save className="h-4 w-4 mr-2" />
            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />  Ganti Kata sandi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Kata sandi Baru</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Konfirmasi Kata sandi</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ketik ulang kata sandi baru" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
            <KeyRound className="h-4 w-4 mr-2" />
            {savingPassword ? "Menyimpan..." : "Ganti Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
