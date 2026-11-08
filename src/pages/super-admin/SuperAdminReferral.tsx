import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Settings, Users, Trophy, Star, Save, Loader2 } from "lucide-react";

const SuperAdminReferral = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [pointsRegister, setPointsRegister] = useState("10");
  const [pointsTrial, setPointsTrial] = useState("20");
  const [pointsPaid, setPointsPaid] = useState("100");
  const [doublePoints, setDoublePoints] = useState(false);

  // Rewards
  const [rewards, setRewards] = useState<any[]>([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // All referrals
  const [allReferrals, setAllReferrals] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, rewardsRes] = await Promise.all([
        supabase.from('platform_settings').select('key, value')
          .in('key', ['referral_points_register', 'referral_points_trial', 'referral_points_paid', 'referral_double_points']),
        supabase.from('rewards').select('*').order('sort_order'),
      ]);

      const settings: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settings[s.key] = s.value; });
      setPointsRegister(settings.referral_points_register || '10');
      setPointsTrial(settings.referral_points_trial || '20');
      setPointsPaid(settings.referral_points_paid || '100');
      setDoublePoints(settings.referral_double_points === 'true');
      setRewards((rewardsRes.data as any) || []);

      // Fetch leaderboard
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/referral`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'leaderboard' }),
        });
        const data = await res.json();
        if (data.success) setLeaderboard(data.leaderboard || []);
      } catch {}

      // All referrals (super admin)
      const { data: refs } = await supabase.from('referrals').select('*').order('created_at', { ascending: false }).limit(100);
      setAllReferrals((refs as any) || []);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const updates = [
      { key: 'referral_points_register', value: pointsRegister },
      { key: 'referral_points_trial', value: pointsTrial },
      { key: 'referral_points_paid', value: pointsPaid },
      { key: 'referral_double_points', value: doublePoints ? 'true' : 'false' },
    ];

    for (const u of updates) {
      await supabase.from('platform_settings').update({ value: u.value }).eq('key', u.key);
    }
    toast.success("Pengaturan referral berhasil disimpan!");
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Referral Management
        </h1>
        <p className="text-sm text-muted-foreground">Kelola sistem referral, poin, dan reward</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="rewards">Reward</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="referrals">Semua Referral</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Pengaturan Poin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Poin Register</Label>
                  <Input type="number" value={pointsRegister} onChange={e => setPointsRegister(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Poin Trial</Label>
                  <Input type="number" value={pointsTrial} onChange={e => setPointsTrial(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Poin Paid</Label>
                  <Input type="number" value={pointsPaid} onChange={e => setPointsPaid(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Switch checked={doublePoints} onCheckedChange={setDoublePoints} />
                <div>
                  <p className="text-sm font-medium">Double Points Campaign</p>
                  <p className="text-xs text-muted-foreground">Aktifkan untuk memberikan 2x poin semua event</p>
                </div>
                {doublePoints && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">ACTIVE</Badge>}
              </div>

              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Pengaturan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Reward</CardTitle>
              <CardDescription>Reward yang tersedia untuk ditukar</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Poin</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Star className="h-3 w-3 inline text-yellow-500 mr-1" />{r.points_required}</TableCell>
                      <TableCell>{r.duration_days} hari</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Top Referrer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead className="text-right">Lifetime Poin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{u.referral_code}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{u.lifetime_points}</TableCell>
                    </TableRow>
                  ))}
                  {leaderboard.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Semua Referral ({allReferrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Poin</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allReferrals.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-primary">+{r.points_awarded}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                  {allReferrals.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Belum ada referral</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminReferral;
