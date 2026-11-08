import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Star, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, any> = { Free: Zap, Basic: Star, School: Crown, Premium: Crown };

export interface PlanCard {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  features: string[];
  max_students?: number | null;
}

interface Props {
  plans: PlanCard[];
  currentPlanId?: string | null;
  currentPlanName?: string | null;
  currentPlanPrice?: number;
  loadingPlanId?: string | null;
  onSelect?: (planId: string) => void;
  ctaLabel?: string;
  /** Hide CTA button (e.g. preview mode in super admin) */
  hideCta?: boolean;
  /** Hide Premium banner & icon styling (used on landing page) */
  hidePremiumBadge?: boolean;
  /** Tailwind grid class override. */
  gridClassName?: string;
}

const formatRupiah = (n: number) => (n === 0 ? "Gratis" : `Rp\u00A0${n.toLocaleString("id-ID")}`);
const isLimitFeature = (f: string) => /^(Maks|Kelas unlimited|Siswa unlimited)/i.test(f);

export function PlanCardsGrid({
  plans,
  currentPlanId,
  currentPlanName,
  currentPlanPrice = 0,
  loadingPlanId,
  onSelect,
  ctaLabel = "Pilih Paket",
  hideCta = false,
  hidePremiumBadge = false,
  gridClassName,
}: Props) {
  if (!plans || plans.length === 0) return null;

  const allFeatures = Array.from(
    new Set(plans.flatMap((p) => (p.features || []).filter((f) => !isLimitFeature(f))))
  );

  const defaultGrid =
    plans.length === 3
      ? "grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto"
      : plans.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto"
      : "grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4";

  return (
    <div className={gridClassName || defaultGrid}>
      {plans.map((plan, i) => {
        const planAllFeatures = plan.features || [];
        const planLimitFeatures = planAllFeatures.filter(isLimitFeature);
        const planFeatureSet = new Set(planAllFeatures.filter((f) => !isLimitFeature(f)));
        const isCurrent =
          currentPlanId === plan.id ||
          (currentPlanName && currentPlanName === plan.name);
        const isLower = !!currentPlanName && plan.price < currentPlanPrice && !isCurrent;
        const highlighted = !isCurrent && plan.name === "School";
        const isPremium = plan.name === "Premium";
        const PIcon = iconMap[plan.name] || Star;

        const sortedFeatures = [...allFeatures].sort((a, b) => {
          const aIn = planFeatureSet.has(a) ? 0 : 1;
          const bIn = planFeatureSet.has(b) ? 0 : 1;
          return aIn - bIn;
        });

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i }}
          >
            <Card
              className={`border-0 relative overflow-hidden flex flex-col h-full ${
                isCurrent
                  ? "ring-2 ring-primary shadow-lg"
                  : highlighted
                  ? "ring-2 ring-primary/60 shadow-lg"
                  : isPremium
                  ? "ring-1 ring-amber-400/50 shadow-lg"
                  : "shadow-card"
              }`}
            >
              {isCurrent && (
                <div className="gradient-primary text-primary-foreground text-[11px] font-semibold text-center py-1.5 inline-flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" /> Paket Saat Ini
                </div>
              )}
              {!isCurrent && highlighted && (
                <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[11px] font-semibold text-center py-1.5 inline-flex items-center justify-center gap-1">
                  <Star className="h-3 w-3" /> Rekomendasi
                </div>
              )}
              {!isCurrent && !highlighted && isPremium && !hidePremiumBadge && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-semibold text-center py-1.5 inline-flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3" /> Premium
                </div>
              )}

              <div className="p-3 sm:p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div
                    className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "gradient-primary text-primary-foreground"
                        : isPremium
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                        : highlighted
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <PIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{plan.description}</p>
                    )}
                  </div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <p className="text-lg sm:text-2xl font-extrabold text-foreground">
                    {formatRupiah(plan.price)}
                    {plan.price > 0 && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-normal ml-1">
                        / bln
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex-1 mb-4">
                  <ul className="space-y-1 sm:space-y-1.5">
                    {planLimitFeatures.map((f, fi) => (
                      <li key={`limit-${fi}`} className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5 text-success" />
                        <span className="text-foreground font-medium">{f}</span>
                      </li>
                    ))}
                    {sortedFeatures.map((f, fi) => {
                      const isIncluded = planFeatureSet.has(f);
                      return (
                        <li
                          key={fi}
                          className={`flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs ${
                            !isIncluded ? "opacity-40" : ""
                          }`}
                        >
                          <Check
                            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5 ${
                              isIncluded ? "text-success" : "text-muted-foreground"
                            }`}
                          />
                          <span className={isIncluded ? "text-foreground" : "text-muted-foreground line-through"}>
                            {f}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {!hideCta && (
                  <Button
                    className={`w-full font-semibold text-[11px] sm:text-sm h-8 sm:h-10 ${
                      isCurrent
                        ? "bg-secondary text-muted-foreground"
                        : isPremium
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                        : highlighted
                        ? "gradient-primary hover:opacity-90 text-primary-foreground shadow-md"
                        : ""
                    }`}
                    variant={isCurrent ? "secondary" : highlighted || isPremium ? "default" : "outline"}
                    disabled={isCurrent || isLower || loadingPlanId === plan.id}
                    onClick={() => onSelect?.(plan.id)}
                  >
                    {loadingPlanId === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Memproses...
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        Paket Aktif
                      </>
                    ) : isLower ? (
                      "—"
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-1.5" />
                        {ctaLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
