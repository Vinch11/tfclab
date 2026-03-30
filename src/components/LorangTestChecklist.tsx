/**
 * ═══════════════════════════════════════════════════════════════
 * LORANG TEST INTEGRATION CHECKLIST
 * 
 * Maps each TFCL test protocol to Lorang methodology limiters.
 * Shows which tests feed which decisions, completion status,
 * and confidence impact on the decision matrix.
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  AlertTriangle,
  Shield,
  Zap,
  Flame,
  Heart,
  Dumbbell,
  Battery,
  Target,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { DbSnapshot } from "@/hooks/useCloudData";
import {
  type LorangLimiter,
  LIMITER_DEFINITIONS,
} from "@/engines/decision";

// ── Types ──────────────────────────────────────────────────────

interface TestCheckItem {
  id: string;
  label: string;
  description: string;
  /** Which snapshot fields this test feeds */
  snapshotFields: (keyof DbSnapshot)[];
  /** Which Lorang limiter this test helps identify */
  targetLimiters: LorangLimiter[];
  /** Confidence boost when completed (0-1) */
  confidenceBoost: number;
  /** Priority: 1 = essential, 2 = recommended, 3 = optional */
  priority: 1 | 2 | 3;
  /** Sport context */
  sport: "bike" | "run" | "both";
  /** Test category for grouping */
  category: "vlamax" | "tte" | "fatmax" | "economy" | "reference" | "readiness";
}

interface LimiterTestGroup {
  limiter: LorangLimiter;
  label: string;
  icon: React.ReactNode;
  tests: TestCheckItem[];
  completionPct: number;
  confidenceLevel: "high" | "moderate" | "low";
}

// ── Test definitions mapped to Lorang ──────────────────────────

const LORANG_TEST_ITEMS: TestCheckItem[] = [
  // ── VLamax / Glycolytic ──
  {
    id: "sprint_15s",
    label: "Sprint 15s Vélo",
    description: "Pmax 5s/15s pour estimer VLamax via ratio sprint. Alimente la détection du limiteur glycolytique.",
    snapshotFields: ["pmax_5s"],
    targetLimiters: ["glycolytic"],
    confidenceBoost: 0.25,
    priority: 1,
    sport: "bike",
    category: "vlamax",
  },
  {
    id: "ftp_test",
    label: "Test FTP (20min ou Ramp)",
    description: "Puissance au seuil fonctionnel. Base de tous les calculs de zones et du modèle métabolique.",
    snapshotFields: ["ftp"],
    targetLimiters: ["motor", "glycolytic"],
    confidenceBoost: 0.20,
    priority: 1,
    sport: "bike",
    category: "reference",
  },
  {
    id: "tte_test",
    label: "TTE (Time To Exhaustion)",
    description: "Durée maximale à FTP. Détermine la durabilité et la tolérance à l'effort soutenu.",
    snapshotFields: ["tte_observed_min"],
    targetLimiters: ["glycolytic", "metabolic"],
    confidenceBoost: 0.15,
    priority: 1,
    sport: "bike",
    category: "tte",
  },
  {
    id: "vo2max_test",
    label: "VO2max (labo ou estimation)",
    description: "Capacité aérobie maximale. Identifie si le plafond moteur est le limiteur principal.",
    snapshotFields: ["vo2max"],
    targetLimiters: ["motor"],
    confidenceBoost: 0.20,
    priority: 1,
    sport: "both",
    category: "reference",
  },
  {
    id: "fatmax_test",
    label: "FatMax / Oxydation lipidique",
    description: "Intensité d'oxydation maximale des graisses. Clé pour la gestion énergétique en longue distance.",
    snapshotFields: ["fat_pct"],
    targetLimiters: ["metabolic"],
    confidenceBoost: 0.15,
    priority: 2,
    sport: "bike",
    category: "fatmax",
  },
  {
    id: "vma_test",
    label: "VMA (Vameval / demi-Cooper)",
    description: "Vitesse Maximale Aérobie. Alimente le modèle course à pied et la détection du limiteur moteur.",
    snapshotFields: ["vma"],
    targetLimiters: ["motor"],
    confidenceBoost: 0.15,
    priority: 1,
    sport: "run",
    category: "reference",
  },
  {
    id: "running_economy",
    label: "Test Économie de course",
    description: "Score d'efficacité biomécanique. Détecte le limiteur neuromusculaire en course.",
    snapshotFields: ["run_economy_score"],
    targetLimiters: ["neuromuscular"],
    confidenceBoost: 0.10,
    priority: 2,
    sport: "run",
    category: "economy",
  },
  {
    id: "css_test",
    label: "CSS Natation (Critical Swim Speed)",
    description: "Seuil fonctionnel natation. Équivalent du seuil lactique pour planifier les séances natation.",
    snapshotFields: ["css"],
    targetLimiters: ["motor"],
    confidenceBoost: 0.10,
    priority: 2,
    sport: "both",
    category: "reference",
  },
  {
    id: "weight_composition",
    label: "Poids & composition corporelle",
    description: "Poids pour calculer les W/kg. Impact sur la cible VLamax et le limiteur métabolique.",
    snapshotFields: ["weight_kg", "fat_pct"],
    targetLimiters: ["metabolic", "neuromuscular"],
    confidenceBoost: 0.05,
    priority: 2,
    sport: "both",
    category: "reference",
  },
  {
    id: "fc_max_test",
    label: "FC Max (terrain ou estimée)",
    description: "Fréquence cardiaque maximale. Nécessaire pour les zones cardio et la dérive cardiaque.",
    snapshotFields: ["fc_max"],
    targetLimiters: ["motor", "availability"],
    confidenceBoost: 0.05,
    priority: 2,
    sport: "both",
    category: "reference",
  },
  {
    id: "hr_drift_test",
    label: "Test de dérive cardiaque Z2",
    description: "Dérive FC sur effort long en Z2. Indicateur de fatigue et de disponibilité métabolique.",
    snapshotFields: ["run_hr_drift_pct"],
    targetLimiters: ["availability", "metabolic"],
    confidenceBoost: 0.10,
    priority: 3,
    sport: "both",
    category: "readiness",
  },
];

// Limiter icon map
const LIMITER_ICONS: Record<LorangLimiter, React.ReactNode> = {
  motor: <Heart className="h-4 w-4" />,
  glycolytic: <Flame className="h-4 w-4" />,
  metabolic: <Zap className="h-4 w-4" />,
  durability: <Timer className="h-4 w-4" />,
  neuromuscular: <Dumbbell className="h-4 w-4" />,
  availability: <Battery className="h-4 w-4" />,
};

const LIMITER_COLORS: Record<LorangLimiter, string> = {
  motor: "text-rose-600 dark:text-rose-400",
  glycolytic: "text-amber-600 dark:text-amber-400",
  metabolic: "text-emerald-600 dark:text-emerald-400",
  durability: "text-purple-600 dark:text-purple-400",
  neuromuscular: "text-violet-600 dark:text-violet-400",
  availability: "text-blue-600 dark:text-blue-400",
};

// ── Props ──────────────────────────────────────────────────────

export interface LorangTestChecklistProps {
  snapshot: DbSnapshot | null;
  className?: string;
}

// ── Main Component ─────────────────────────────────────────────

export function LorangTestChecklist({
  snapshot,
  className,
}: LorangTestChecklistProps) {
  const [expandedLimiter, setExpandedLimiter] = useState<LorangLimiter | null>(null);

  // Check completion of each test
  const testCompletion = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const test of LORANG_TEST_ITEMS) {
      const completed = test.snapshotFields.some((field) => {
        const val = snapshot?.[field];
        return val !== null && val !== undefined && val !== 0;
      });
      map.set(test.id, completed);
    }
    return map;
  }, [snapshot]);

  // Group by limiter
  const limiterGroups = useMemo<LimiterTestGroup[]>(() => {
    const limiters: LorangLimiter[] = ["motor", "glycolytic", "metabolic", "neuromuscular", "availability"];

    return limiters.map((limiter) => {
      const tests = LORANG_TEST_ITEMS.filter((t) => t.targetLimiters.includes(limiter));
      const completed = tests.filter((t) => testCompletion.get(t.id)).length;
      const total = tests.length;
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

      const essentialComplete = tests
        .filter((t) => t.priority === 1)
        .every((t) => testCompletion.get(t.id));

      const confidenceLevel: "high" | "moderate" | "low" = essentialComplete && completionPct >= 80
        ? "high"
        : completionPct >= 50
          ? "moderate"
          : "low";

      return {
        limiter,
        label: LIMITER_DEFINITIONS[limiter].label,
        icon: LIMITER_ICONS[limiter],
        tests,
        completionPct,
        confidenceLevel,
      };
    });
  }, [testCompletion]);

  // Global stats
  const globalStats = useMemo(() => {
    const total = LORANG_TEST_ITEMS.length;
    const completed = LORANG_TEST_ITEMS.filter((t) => testCompletion.get(t.id)).length;
    const essential = LORANG_TEST_ITEMS.filter((t) => t.priority === 1);
    const essentialDone = essential.filter((t) => testCompletion.get(t.id)).length;
    const totalConfidence = LORANG_TEST_ITEMS
      .filter((t) => testCompletion.get(t.id))
      .reduce((sum, t) => sum + t.confidenceBoost, 0);

    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100),
      essentialTotal: essential.length,
      essentialDone,
      essentialPct: Math.round((essentialDone / essential.length) * 100),
      totalConfidence: Math.min(totalConfidence, 1),
    };
  }, [testCompletion]);

  const toggleLimiter = (limiter: LorangLimiter) => {
    setExpandedLimiter((prev) => (prev === limiter ? null : limiter));
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Checklist Tests — Méthode Lorang
          </CardTitle>
          <Badge
            variant={globalStats.essentialPct === 100 ? "default" : "outline"}
            className="text-[10px] gap-1"
          >
            <Target className="h-3 w-3" />
            {globalStats.completed}/{globalStats.total} tests
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* ── Global progress ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Couverture globale</span>
            <span className="font-mono font-medium">{globalStats.percentage}%</span>
          </div>
          <Progress value={globalStats.percentage} className="h-2" />

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Tests essentiels
            </span>
            <span className={cn(
              "font-mono font-medium",
              globalStats.essentialPct === 100 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {globalStats.essentialDone}/{globalStats.essentialTotal}
            </span>
          </div>
          <Progress
            value={globalStats.essentialPct}
            className={cn(
              "h-1.5",
              globalStats.essentialPct === 100 && "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* ── Confidence impact ── */}
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 text-[11px]">
            <span className="text-muted-foreground">Fiabilité décisionnelle Lorang : </span>
            <span className="font-mono font-medium">
              {Math.round(globalStats.totalConfidence * 100)}%
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Chaque test complété augmente la fiabilité de l&apos;identification
                  du limiteur principal et des leviers d&apos;entraînement Lorang.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* ── Limiter groups ── */}
        <div className="space-y-1.5">
          {limiterGroups.map((group) => (
            <Collapsible
              key={group.limiter}
              open={expandedLimiter === group.limiter}
              onOpenChange={() => toggleLimiter(group.limiter)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Icon */}
                  <span className={cn("shrink-0", LIMITER_COLORS[group.limiter])}>
                    {group.icon}
                  </span>

                  {/* Label + progress */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{group.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {group.tests.filter((t) => testCompletion.get(t.id)).length}/{group.tests.length}
                      </span>
                    </div>
                    <Progress value={group.completionPct} className="h-1 mt-1" />
                  </div>

                  {/* Confidence badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] shrink-0",
                      group.confidenceLevel === "high" && "text-green-600 dark:text-green-400 border-green-300 dark:border-green-800",
                      group.confidenceLevel === "moderate" && "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800",
                      group.confidenceLevel === "low" && "text-red-600 dark:text-red-400 border-red-300 dark:border-red-800",
                    )}
                  >
                    {group.confidenceLevel === "high" ? "Robuste" : group.confidenceLevel === "moderate" ? "Partiel" : "Insuffisant"}
                  </Badge>

                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                    expandedLimiter === group.limiter && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pl-8 pr-2 pb-2 space-y-1.5"
                  >
                    {group.tests
                      .sort((a, b) => a.priority - b.priority)
                      .map((test) => {
                        const done = testCompletion.get(test.id) ?? false;
                        return (
                          <div
                            key={test.id}
                            className={cn(
                              "flex items-start gap-2.5 p-2 rounded-md transition-colors",
                              done ? "bg-green-50/50 dark:bg-green-950/10" : "bg-muted/20"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className={cn(
                                "h-4 w-4 shrink-0 mt-0.5",
                                test.priority === 1 ? "text-amber-500" : "text-muted-foreground/40"
                              )} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={cn(
                                  "text-xs font-medium",
                                  done ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {test.label}
                                </span>
                                {test.priority === 1 && !done && (
                                  <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
                                    Essentiel
                                  </Badge>
                                )}
                                {test.priority === 2 && !done && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 text-muted-foreground">
                                    Recommandé
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                                  {test.sport === "bike" ? "🚴" : test.sport === "run" ? "🏃" : "🏊🚴🏃"}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                {test.description}
                              </p>
                              {!done && (
                                <div className="flex items-center gap-1 mt-1 text-[9px] text-primary/70">
                                  <ArrowRight className="h-2.5 w-2.5" />
                                  +{Math.round(test.confidenceBoost * 100)}% fiabilité
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </motion.div>
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* ── Lorang philosophy footer ── */}
        <div className="text-[10px] text-muted-foreground p-2 bg-muted/20 rounded-lg border border-border/30 italic">
          <strong>Philosophie Lorang :</strong> Un athlète n&apos;est jamais optimisé sur tous les fronts.
          L&apos;art du coaching est de choisir <em>le bon levier au bon moment</em>.
          Compléter les tests essentiels garantit une décision robuste.
        </div>
      </CardContent>
    </Card>
  );
}

export default LorangTestChecklist;
