import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  Gift, Copy, Share2, Star, TrendingUp, Users, Award,
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Loader2,
  Trophy, Medal, Crown, Sparkles
} from "lucide-react";
import { useReferral } from "@/hooks/useReferral";
import { PremiumGate } from "@/components/PremiumGate";
import confetti from "canvas-confetti";

const statusColors: Record<string, string> = {
  registered: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  trial_started: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  trial_active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  registered: "Registered",
  trial_started: "Trial",
  trial_active: "Trial Active",
  paid: "Paid",
};

const ReferralDashboard = () => {
  const { stats, rewards, loading, claiming, referralLink, claimReward, getBadge } = useReferral();
  const [activeTab, setActiveTab] = useState("overview");

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link referral berhasil disalin!");
  };

  const handleShareWA = () => {
    const text = `Gunakan ATSkolla untuk absensi digital sekolah! Daftar gratis:\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleClaim = async (rewardId: string) => {
    try {
      await claimReward(rewardId);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      toast.success("Reward berhasil ditukar!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menukar reward");
    }
  };

  // Find next reward milestone
  const nextReward = rewards.find(r => (stats?.current_points || 0) < r.points_required);
  const progressToNext = nextReward
    ? Math.min(((stats?.current_points || 0) / nextReward.points_required) * 100, 100)
    : 100;
  const pointsNeeded = nextReward ? nextReward.points_required - (stats?.current_points || 0) : 0;

  const badge = getBadge(stats?.total_referrals || 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <PremiumGate featureLabel="Referral & Poin" requiredPlan="Basic">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Referral & Poin
          </h1>
          <p className="text-sm text-muted-foreground">Ajak sekolah lain & dapatkan reward</p>
        </div>
        {badge && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
            <span className="text-2xl">{badge.icon}</span>
            <Badge variant="outline" className={`text-sm font-bold ${badge.color}`}>
              {badge.label} Referrer
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Poin Saat Ini", value: stats?.current_points || 0, icon: Star, color: "text-yellow-500" },
          { label: "Lifetime Poin", value: stats?.lifetime_points || 0, icon: TrendingUp, color: "text-primary" },
          { label: "Total Referral", value: stats?.total_referrals || 0, icon: Users, color: "text-blue-500" },
          { label: "Reward Diklaim", value: stats?.total_claims || 0, icon: Award, color: "text-green-500" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <Sparkles className="h-3 w-3 text-muted-foreground/30" />
                </div>
                <p className="text-2xl font-bold text-foreground">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Referral Link + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Link Referral Anda
              </CardTitle>
              <CardDescription className="text-xs">Bagikan link ini untuk mendapatkan poin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 p-2.5 bg-background rounded-lg border text-xs font-mono truncate text-foreground">
                  {referralLink || 'Memuat...'}
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button onClick={handleShareWA} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                <Share2 className="h-4 w-4" />
                Bagikan via WhatsApp
              </Button>
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Kode Referral</p>
                <p className="text-lg font-bold font-mono tracking-widest text-primary">{stats?.referral_code || '...'}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Progress Reward
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {nextReward ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Menuju: <span className="font-semibold text-foreground">{nextReward.name}</span></span>
                      <span className="font-bold text-primary">{stats?.current_points}/{nextReward.points_required}</span>
                    </div>
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }}>
                      <Progress value={progressToNext} className="h-3" />
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {pointsNeeded > 0 ? `${pointsNeeded} poin lagi untuk ${nextReward.name}` : 'Siap ditukar!'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Semua reward sudah tercapai!</p>
              )}

              {/* Achievement badges */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Achievement</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { min: 5, label: "Bronze", icon: Medal, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/30" },
                    { min: 20, label: "Silver", icon: Medal, color: "text-gray-500 bg-gray-50 dark:bg-gray-900/30" },
                    { min: 50, label: "Gold", icon: Crown, color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30" },
                  ].map(a => {
                    const achieved = (stats?.total_referrals || 0) >= a.min;
                    return (
                      <div
                        key={a.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${achieved ? a.color + ' border-current/20' : 'text-muted-foreground/40 bg-muted/30 border-muted'}`}
                      >
                        <a.icon className="h-3.5 w-3.5" />
                        {a.label} ({a.min}+)
                        {achieved && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Points breakdown */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Cara Dapat Poin</p>
                <div className="flex justify-between text-xs"><span>Register referral</span><span className="font-bold text-primary">+10 pts</span></div>
                <div className="flex justify-between text-xs"><span>Mulai trial</span><span className="font-bold text-primary">+20 pts</span></div>
                <div className="flex justify-between text-xs"><span>Bayar langganan</span><span className="font-bold text-primary">+100 pts</span></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Daftar Referral</TabsTrigger>
          <TabsTrigger value="rewards">Reward</TabsTrigger>
          <TabsTrigger value="history">Riwayat Poin</TabsTrigger>
        </TabsList>

        {/* Referral List */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-0">
              {(stats?.referrals || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Belum ada referral</p>
                  <p className="text-xs mt-1">Bagikan link referral Anda untuk mulai</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Sekolah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Poin</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stats?.referrals || []).map((ref, i) => (
                        <motion.tr
                          key={ref.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-sm">{ref.referred_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ref.school_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[ref.status] || ''}`}>
                              {statusLabels[ref.status] || ref.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary text-sm">+{ref.points_awarded}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(ref.created_at).toLocaleDateString('id-ID')}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards */}
        <TabsContent value="rewards">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((reward, i) => {
              const canClaim = (stats?.current_points || 0) >= reward.points_required;
              return (
                <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className={`border ${canClaim ? 'border-primary/30 bg-primary/5' : 'border-border/50'}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-foreground">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">{reward.description}</p>
                        </div>
                        <Gift className={`h-5 w-5 ${canClaim ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-sm font-bold text-foreground">{reward.points_required} poin</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{reward.duration_days} hari</Badge>
                      </div>
                      <Button
                        onClick={() => handleClaim(reward.id)}
                        disabled={!canClaim || claiming}
                        className="w-full"
                        size="sm"
                        variant={canClaim ? "default" : "outline"}
                      >
                        {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        {canClaim ? 'Tukar Sekarang' : `Butuh ${reward.points_required - (stats?.current_points || 0)} poin lagi`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {(stats?.transactions || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Belum ada transaksi poin</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(stats?.transactions || []).map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-3 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {tx.type === 'earn' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{tx.source}</p>
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'earn' ? '+' : ''}{tx.points}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </PremiumGate>
  );
};

export default ReferralDashboard;
