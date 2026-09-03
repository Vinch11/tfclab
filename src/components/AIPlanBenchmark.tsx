/**
 * AIPlanBenchmark — Benchmarks a generated plan against elite reference standards
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Trophy, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Target, BarChart3, Zap, Info, Crosshair, ChevronDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { getEliteReference, getEliteCeilingReference, type EliteReference } from "@/lib/eliteReferences";
import type { UnifiedLimiterResult } from "@/engines/diagnostic";
import { validatePlan, derivePhasesFromWeeks, type LimiterCoverageItem } from "@/engines/plan/planValidator";

interface AIPlanBenchmarkProps {
  plan: ParsedPlan;
  objective: string;
  /** Ambition saisie par l'utilisateur (affichée à titre indicatif). */
  ambition: string;
  /** Ambition effective (après déclassement niveau). Utilisée pour choisir les standards. */
  ambitionEffective?: string | null;
  /** Label affichable de l'ambition effective (ex: "Confirmé"). */
  ambitionEffectiveLabel?: string | null;
  /** Label affichable de l'ambition saisie (ex: "Qualifiable"). Affiché en note si différent de l'effective. */
  ambitionSaisieLabel?: string | null;
  athleteName?: string;
  limiterResult?: UnifiedLimiterResult | null;
  prohibitions?: string[];
  raceWeekNumbers?: number[];
  identifiedLimiters?: string[];
  identifiedLimiterKeys?: string[];
  athleteData?: import("@/engines/plan/types").PlanAthleteData;
  coachLimiterOrder?: string[];
  /** Champ libre "Contraintes" (PlanConfig.constraints) — détecte une
   *  discipline bannie par le coach (ex: natation) pour que le contrôle de
   *  ratio par sport ne la traite pas comme un défaut de génération. */
  constraintsText?: string;
}

interface MetricGauge {
  label: string;
  value: number;
  refMin: number;
  refMax: number;
  eliteMin: number;
  eliteMax: number;
  unit: string;
  icon: React.ReactNode;
}

function computePlanMetrics(plan: ParsedPlan) {
  const totalWeeks = plan.weeks.length;
  if (totalWeeks === 0) return null;

  let totalSessions = 0;
  let restDays = 0;
  const sportCounts: Record<string, number> = {};

  // Track per-week sessions for progression analysis
  const weeklySessionCounts: number[] = [];

  for (const week of plan.weeks) {
    let weekActive = 0;
    for (const s of week.sessions) {
      if (s.isRest) {
        restDays++;
        continue;
      }
      totalSessions++;
      weekActive++;
      const sport = categorizeSport(s.sport);
      // Split Brick sessions 50/50 between Vélo and Course for accurate tri distribution
      if (sport === "Brick") {
        sportCounts["Vélo"] = (sportCounts["Vélo"] || 0) + 0.5;
        sportCounts["Course"] = (sportCounts["Course"] || 0) + 0.5;
      } else {
        sportCounts[sport] = (sportCounts[sport] || 0) + 1;
      }
    }
    weeklySessionCounts.push(weekActive);
  }

  const avgSessionsPerWeek = totalSessions / totalWeeks;

  // Detect doubles (days with >1 session)
  // Also handle dayIndex === -1 by grouping on dayName fallback
  let totalDoubles = 0;
  for (const week of plan.weeks) {
    const dayCounts: Record<string, number> = {};
    for (const s of week.sessions) {
      if (s.isRest) continue;
      // Use dayIndex if valid, otherwise fallback to dayName
      const key = s.dayIndex >= 0 ? String(s.dayIndex) : s.dayName.toLowerCase();
      if (key) {
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
    }
    for (const count of Object.values(dayCounts)) {
      if (count > 1) totalDoubles += count - 1;
    }
  }
  const avgDoublesPerWeek = totalDoubles / totalWeeks;

  // Detect key sessions — match AI markers: 🔑, intensity keywords, zone indicators
  let keySessions = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const text = `${s.title} ${s.details}`;
      // 🔑 is the primary AI marker for key sessions
      if (/🔑/.test(text)) {
        keySessions++;
        continue;
      }
      // Fallback: intensity keywords
      if (/seuil|threshold|interval|fractionn[ée]|vma|tempo|race[- ]?pace|sweet[- ]?spot|brick|clé|key|qualit[ée]|sp[ée]cifique|z[34567]|vo2|lactate|30\/30/i.test(text)) {
        keySessions++;
      }
    }
  }
  const avgKeyPerWeek = keySessions / totalWeeks;

  // Sport distribution percentages — computed only on tri-relevant sports (Natation/Vélo/Course)
  // so that Renfo/Autre don't dilute the comparison against elite references
  const triSports = ["Natation", "Vélo", "Course"];
  const totalTriSessions = triSports.reduce((sum, sp) => sum + (sportCounts[sp] || 0), 0);
  const sportPcts: Record<string, number> = {};
  for (const [k, v] of Object.entries(sportCounts)) {
    sportPcts[k] = totalTriSessions > 0 ? Math.round((v / totalTriSessions) * 100) : 0;
  }

  // Volume progression rate (avg week-over-week)
  let progressionRates: number[] = [];
  for (let i = 1; i < weeklySessionCounts.length; i++) {
    const prev = weeklySessionCounts[i - 1];
    if (prev > 0) {
      progressionRates.push(((weeklySessionCounts[i] - prev) / prev) * 100);
    }
  }

  // Detect load pattern (3:1 vs 2:1)
  let deloadWeeks = 0;
  for (let i = 1; i < weeklySessionCounts.length; i++) {
    if (weeklySessionCounts[i] < weeklySessionCounts[i - 1] * 0.75) {
      deloadWeeks++;
    }
  }
  const loadRatio = totalWeeks > 3 ? `${Math.round((totalWeeks - deloadWeeks) / Math.max(deloadWeeks, 1))}:1` : "N/A";

  return {
    totalWeeks,
    totalSessions,
    avgSessionsPerWeek: Math.round(avgSessionsPerWeek * 10) / 10,
    avgDoublesPerWeek: Math.round(avgDoublesPerWeek * 10) / 10,
    avgKeyPerWeek: Math.round(avgKeyPerWeek * 10) / 10,
    sportPcts,
    loadRatio,
    deloadWeeks,
  };
}

function categorizeSport(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim") || s.includes("nage") || s.includes("piscine")) return "Natation";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike") || s.includes("cyclisme") || s.includes("ht") || s.includes("home trainer")) return "Vélo";
  if (s.includes("cap") || s.includes("course") || s.includes("run") || s.includes("footing") || s.includes("sortie longue")) return "Course";
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo") || s.includes("ppl") || s.includes("gym")) return "Renfo";
  if (s.includes("brick") || s.includes("enchaîn") || s.includes("enchaine")) return "Brick";
  return "Autre";
}

type GaugeStatus = "below" | "in_range" | "above";

function getGaugeStatus(value: number, min: number, max: number): GaugeStatus {
  if (value < min) return "below";
  if (value > max) return "above";
  return "in_range";
}

/**
 * Continuous proximity score [0-1] instead of binary in/out.
 * Returns 1.0 if value is within [min, max].
 * Falls off linearly: e.g. value at 50% of min → score 0.5
 */
function proximityScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1.0;
  if (value < min) {
    // How close are we to min? Use min as reference distance
    if (min === 0) return value === 0 ? 1.0 : 0;
    return Math.max(0, value / min); // e.g. 8/12 = 0.67
  }
  // above max - less penalizing (being above ref is often acceptable)
  if (max === 0) return 1.0;
  const overshoot = (value - max) / max;
  return Math.max(0, 1 - overshoot * 0.5); // gentle penalty for exceeding
}

function StatusIcon({ status }: { status: GaugeStatus }) {
  if (status === "in_range") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "below") return <TrendingDown className="h-4 w-4 text-amber-500" />;
  return <TrendingUp className="h-4 w-4 text-blue-500" />;
}

function statusLabel(status: GaugeStatus): string {
  if (status === "in_range") return "Dans la norme";
  if (status === "below") return "Sous la référence";
  return "Au-dessus";
}

function statusColor(status: GaugeStatus): string {
  if (status === "in_range") return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (status === "below") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
}

function GaugeRow({ label, value, refMin, refMax, eliteMin, eliteMax, unit, icon }: MetricGauge) {
  const status = getGaugeStatus(value, refMin, refMax);
  // Position within the elite range for the progress bar
  const range = eliteMax - 0;
  const pct = range > 0 ? Math.min(Math.max((value / eliteMax) * 100, 5), 100) : 50;
  const refMinPct = range > 0 ? (refMin / eliteMax) * 100 : 0;
  const refMaxPct = range > 0 ? (refMax / eliteMax) * 100 : 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] ${statusColor(status)}`}>
            <StatusIcon status={status} />
            <span className="ml-1">{statusLabel(status)}</span>
          </Badge>
          <span className="text-sm font-bold tabular-nums">{value}{unit}</span>
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {/* Reference range band */}
        <div
          className="absolute h-full bg-green-500/20 rounded-full"
          style={{ left: `${refMinPct}%`, width: `${refMaxPct - refMinPct}%` }}
        />
        {/* Value indicator */}
        <div
          className="absolute h-full w-1.5 rounded-full bg-primary"
          style={{ left: `${Math.min(pct, 98)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Réf: {refMin}-{refMax}{unit}</span>
        <span>Élite: {eliteMin}-{eliteMax}{unit}</span>
      </div>
    </div>
  );
}

/**
 * Maps limiter → justified sport ratio deviations based on physiological logic.
 * Each limiter justifies ONE direction per sport only — never both.
 * Logic: which sport SHOULD increase/decrease given the identified bottleneck.
 */
const LIMITER_SPORT_JUSTIFICATIONS: Record<string, { sport: string; direction: GaugeStatus; reason: string }[]> = {
  // VO2max/FTP insuffisant → +Vélo (FTP), +Course (VO2max), -Natation (priorité basse)
  aerobic_engine: [
    { sport: "Vélo", direction: "above", reason: "FTP/VO2max: +volume vélo justifié" },
    { sport: "Course", direction: "above", reason: "VO2max: +intervalles CAP justifié" },
    { sport: "Natation", direction: "below", reason: "Priorité moteur aérobie vélo/CAP" },
    { sport: "Natation", direction: "above", reason: "Z2 nage contribue au volume aérobie total (toléré ≤3%)" },
  ],
  // VLamax trop haute → +Vélo Z2 long, +Natation Z2, -Course haute intensité
  glycolytic: [
    { sport: "Vélo", direction: "above", reason: "VLamax↓: +Z2 vélo longue durée justifié" },
    { sport: "Natation", direction: "above", reason: "VLamax↓: +Z2 nage aérobie justifié" },
    { sport: "Course", direction: "below", reason: "VLamax↓: priorité volume Z2 vélo/nage" },
    { sport: "Course", direction: "above", reason: "VLamax↓: +course Z2 lente contribue à baisser VLamax" },
  ],
  // FatMax insuffisant → +Vélo Z2 long, +Course Z2, -Natation
  metabolic_efficiency: [
    { sport: "Vélo", direction: "above", reason: "FatMax↑: +Z2 vélo long justifié" },
    { sport: "Course", direction: "above", reason: "FatMax↑: +SL CAP Z2 fat burn justifié" },
    { sport: "Course", direction: "below", reason: "FatMax↑: priorité vélo Z2 fat oxydation" },
    { sport: "Natation", direction: "below", reason: "FatMax↑: priorité sports porteurs" },
  ],
  // TTE insuffisant → +Vélo sweet spot, +Course tempo, -Natation
  specific_endurance: [
    { sport: "Vélo", direction: "above", reason: "TTE↑: +sweet spot vélo justifié" },
    { sport: "Course", direction: "above", reason: "TTE↑: +tempo/seuil CAP justifié" },
    { sport: "Natation", direction: "below", reason: "TTE↑: priorité vélo/CAP au seuil" },
    { sport: "Natation", direction: "above", reason: "TTE↑: +CSS nage longue pour TTE aquatique (toléré ≤3%)" },
  ],
  // Économie faible → +Course drills, +Natation technique, -Vélo
  neuromuscular: [
    { sport: "Course", direction: "above", reason: "Économie: +drills/cadence CAP justifié" },
    { sport: "Natation", direction: "above", reason: "Économie: +technique nage justifié" },
    { sport: "Vélo", direction: "below", reason: "Économie: priorité CAP/nage technique" },
    { sport: "Vélo", direction: "above", reason: "Économie: +SFR/force vélo neuromusculaire" },
  ],
  // Durabilité faible → +Vélo long, +Course longue, -Natation
  durability: [
    { sport: "Vélo", direction: "above", reason: "Durabilité: +volume Z2 vélo long justifié" },
    { sport: "Course", direction: "above", reason: "Durabilité: +sortie longue CAP justifié" },
    { sport: "Natation", direction: "below", reason: "Durabilité: priorité vélo/CAP long" },
  ],
};

function getDeviationJustification(
  sport: string,
  status: GaugeStatus,
  limiterResult: UnifiedLimiterResult
): { justified: boolean; reason: string } | null {
  const limiter = limiterResult.primaryLimiter;
  if (limiter === "none") return null;

  // Check primary limiter rules
  const rules = LIMITER_SPORT_JUSTIFICATIONS[limiter];
  if (rules) {
    const match = rules.find(r => r.sport === sport && r.direction === status);
    if (match) {
      return { justified: true, reason: match.reason };
    }
  }

  // Check secondary limiter if available (L2 can also justify deviations)
  const l2 = (limiterResult as any).secondaryLimiter;
  if (l2 && l2 !== "none" && l2 !== limiter) {
    const l2Rules = LIMITER_SPORT_JUSTIFICATIONS[l2];
    if (l2Rules) {
      const l2Match = l2Rules.find(r => r.sport === sport && r.direction === status);
      if (l2Match) {
        return { justified: true, reason: `L2: ${l2Match.reason}` };
      }
    }
  }

  // Deviation exists but NOT justified by any limiter
  const deviation = status === "above" ? "Excès" : "Déficit";
  return {
    justified: false,
    reason: `${deviation} non justifié par ${limiterResult.limiterLabel}`,
  };
}

// Phase colors mapped by index (1=Fondation → 5=Affûtage)
/** Libellés lisibles des clés limiteurs (évite les codes tronqués type "DURABILIT"). */
const LIMITER_KEY_LABELS: Record<string, string> = {
  aerobic_engine: "Moteur aérobie",
  vo2max: "VO2max",
  vlamax: "VLamax",
  glycolytic: "Glycolytique",
  metabolic_efficiency: "Efficience métabolique",
  fatmax: "FatMax",
  specific_endurance: "Endurance spécifique",
  tte: "TTE (temps au seuil)",
  durability: "Durabilité",
  durabilite: "Durabilité",
  neuromuscular: "Neuromusculaire",
  economy: "Économie de course",
  strength: "Force",
};

function limiterLabelFromKey(key: string): string {
  const k = key.toLowerCase().trim();
  return LIMITER_KEY_LABELS[k] || key.replace(/_/g, " ");
}

const PHASE_COLORS: Record<number, string> = {
  1: "#D9DDF7", // Fondation — périwinkle clair
  2: "#9AA6F0", // Chantier — périwinkle moyen
  3: "#7A56C2", // Consolidation — violet
  4: "#5555E0", // Race-Specific — périwinkle profond
  5: "#7FD3AE", // Affûtage — mint
};

/** Couleur de texte lisible (blanc ou encre) selon la luminance du fond. */
function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#14131A" : "#FFFFFF";
}


const PHASE_INDEX_MAP: Record<string, number> = {
  fondation: 1, adaptation: 1, base: 1,
  chantier: 2, build: 2, développement: 2, developpement: 2, intensification: 2,
  consolidation: 3, transition: 3,
  "race-specific": 4, spécifique: 4, specifique: 4, compétition: 4, competition: 4,
  affûtage: 5, affutage: 5, taper: 5, tapering: 5, récupération: 5,
};

function getPhaseColorIdx(name: string): number {
  const lower = name.toLowerCase().trim();
  for (const [key, idx] of Object.entries(PHASE_INDEX_MAP)) {
    if (lower.includes(key)) return idx;
  }
  return 0;
}

function PhaseGanttTimeline({ phases, totalWeeks }: { phases: { name: string; weeks: string; objective?: string }[]; totalWeeks: number }) {
  // Parse week ranges from phase data — tolérant à tous les séparateurs
  // ("S1-S6", "S1 → S6", "Semaines 1 à 6", "S4"…). On lit simplement les
  // nombres présents dans la chaîne.
  const parsed = phases.map(p => {
    const nums = (p.weeks || "").match(/\d+/g)?.map(n => parseInt(n, 10)) ?? [];
    const start = nums.length > 0 ? nums[0] : 1;
    const end = nums.length > 1 ? Math.max(nums[1], start) : start;
    const colorIdx = getPhaseColorIdx(p.name);
    const color = PHASE_COLORS[colorIdx] || "#94a3b8";
    return { ...p, start, end, color, colorIdx };
  });

  if (parsed.length < 2) return null;

  // Garde-fou : si `totalWeeks` est absent/incohérent, on le déduit des phases.
  const span = Math.max(totalWeeks || 0, ...parsed.map(p => p.end), 1);

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        📊 Timeline de périodisation
      </h4>
      <div className="space-y-1">
        {parsed.map((phase, i) => {
          const leftPct = ((phase.start - 1) / span) * 100;
          const widthPct = ((phase.end - phase.start + 1) / span) * 100;
          const fg = readableOn(phase.color);
          return (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative h-7 cursor-help">
                    <div className="absolute inset-0 rounded-md bg-muted/40" />
                    <div
                      className="absolute rounded-md shadow-sm transition-all"
                      style={{
                        marginLeft: `${leftPct}%`,
                        width: `${Math.max(widthPct, 6)}%`,
                        backgroundColor: phase.color,
                        height: "100%",
                      }}
                    >
                      <div className="flex items-center justify-center h-full px-1.5">
                        <span
                          className="text-[9px] sm:text-[10px] font-semibold truncate"
                          style={{ color: fg }}
                        >
                          {phase.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>

                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-semibold text-xs">{phase.name}</p>
                  <p className="text-[10px] text-muted-foreground">Semaines {phase.start}–{phase.end} ({phase.end - phase.start + 1} sem)</p>
                  {phase.objective && <p className="text-[10px] text-muted-foreground mt-0.5">{phase.objective}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      {/* Week axis */}
      <div className="relative h-4">
        {Array.from({ length: span }, (_, i) => i + 1)
          .filter(w => span <= 12 || w % 2 === 1)
          .map(w => (
            <span
              key={w}
              className="absolute text-[8px] text-muted-foreground"
              style={{ left: `${((w - 0.5) / span) * 100}%`, transform: "translateX(-50%)" }}
            >
              S{w}
            </span>
          ))}
      </div>
    </div>
  );
}

export function AIPlanBenchmark({ plan, objective, ambition, ambitionEffective, ambitionEffectiveLabel, ambitionSaisieLabel, athleteName, limiterResult, prohibitions, raceWeekNumbers, identifiedLimiters, identifiedLimiterKeys, athleteData, coachLimiterOrder, constraintsText }: AIPlanBenchmarkProps) {
  const metrics = useMemo(() => computePlanMetrics(plan), [plan]);
  // Ambition utilisée pour les standards : effective si déclassement, sinon saisie.
  const ambitionForRef = ambitionEffective || ambition;
  const isDowngraded = !!(ambitionEffective && ambitionEffective !== ambition);
  const ref = useMemo(() => getEliteReference(objective, ambitionForRef), [objective, ambitionForRef]);
  const eliteRef = useMemo(() => getEliteCeilingReference(objective), [objective]);
  const validationResult = useMemo(
    () => validatePlan(plan, objective, prohibitions, raceWeekNumbers, identifiedLimiters, identifiedLimiterKeys, athleteData, coachLimiterOrder, undefined, undefined, ambitionForRef, constraintsText),
    [plan, objective, prohibitions, raceWeekNumbers, identifiedLimiters, identifiedLimiterKeys, athleteData, coachLimiterOrder, ambitionForRef, constraintsText]
  );

  if (!metrics) return null;

  // eliteReferences.ts ne couvre que 5 objectifs (IM/703/Marathon/Semi/10K) ×
  // 4 ambitions (Elite/Competitor/Age Group/Finisher) — 5K, StartToRun,
  // Trail (toutes variantes), Sprint, Olympic, et l'ambition World Class ne
  // sont dans aucune entrée. Avant ce fix, `ref === null` faisait disparaître
  // toute la carte sans explication — un athlète sur un de ces
  // objectifs/ambitions ne voyait jamais de benchmark, sans savoir pourquoi
  // (lu comme un bug plutôt qu'une limite connue des données de référence).
  if (!ref) {
    return (
      <CollapsibleCard
        defaultOpen={false}
        storageKey="ai_plan_benchmark"
        icon={<Info className="h-4 w-4 text-muted-foreground" />}
        title="Benchmark vs Référence"
      >
        <p className="text-xs text-muted-foreground">
          Comparaison indisponible : aucune donnée de référence élite pour l'objectif «&nbsp;{objective}&nbsp;»
          {ambitionForRef ? <> en ambition «&nbsp;{ambitionForRef}&nbsp;»</> : null}. Les standards ne couvrent
          aujourd'hui que IM / 70.3 / Marathon / Semi / 10K, niveaux Elite à Finisher.
        </p>
      </CollapsibleCard>
    );
  }
  const elite = eliteRef || ref;

  // Source unique avec le validateur : semaines de décharge et pattern de charge
  // sont dérivés de validationResult.weekMetrics (détection thème + volume),
  // et non d'un simple comptage de séances (qui sous-détecte les décharges).
  const deloadWeeks = validationResult.weekMetrics.filter(m => m.isDeload && !m.isRaceWeek).length;
  const loadWeeks = validationResult.weekMetrics.length - deloadWeeks;
  const loadRatio = deloadWeeks > 0 && validationResult.weekMetrics.length > 3
    ? `${Math.round((loadWeeks / deloadWeeks) * 10) / 10}:1`
    : "N/A";
  const derivedPhases = plan.phases && plan.phases.length >= 2 ? plan.phases : derivePhasesFromWeeks(plan);

  const gauges: MetricGauge[] = [
    {
      label: "Séances / semaine",
      value: metrics.avgSessionsPerWeek,
      refMin: ref.sessionsPerWeek[0],
      refMax: ref.sessionsPerWeek[1],
      eliteMin: elite.sessionsPerWeek[0],
      eliteMax: elite.sessionsPerWeek[1],
      unit: "",
      icon: <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      label: "Doubles / semaine",
      value: metrics.avgDoublesPerWeek,
      refMin: ref.doublesPerWeek[0],
      refMax: ref.doublesPerWeek[1],
      eliteMin: elite.doublesPerWeek[0],
      eliteMax: elite.doublesPerWeek[1],
      unit: "",
      icon: <Zap className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      label: "Séances clés / semaine",
      value: metrics.avgKeyPerWeek,
      refMin: ref.keySessions[0],
      refMax: ref.keySessions[1],
      eliteMin: elite.keySessions[0],
      eliteMax: elite.keySessions[1],
      unit: "",
      icon: <Target className="h-3.5 w-3.5 text-muted-foreground" />,
    },
  ];

  // Sport distribution comparison for triathlon
  const isTriathlon = ref.swimPct != null;
  const sportComparisons = isTriathlon && ref.swimPct && ref.bikePct && ref.runPct
    ? [
        { sport: "Natation", pct: metrics.sportPcts["Natation"] || 0, refMin: ref.swimPct[0], refMax: ref.swimPct[1] },
        { sport: "Vélo", pct: metrics.sportPcts["Vélo"] || 0, refMin: ref.bikePct[0], refMax: ref.bikePct[1] },
        { sport: "Course", pct: metrics.sportPcts["Course"] || 0, refMin: ref.runPct[0], refMax: ref.runPct[1] },
      ]
    : null;

  // Overall conformity score — continuous proximity instead of binary
  const proximityScores = gauges.map(g => proximityScore(g.value, g.refMin, g.refMax));
  if (sportComparisons) {
    sportComparisons.forEach(sc => proximityScores.push(proximityScore(sc.pct, sc.refMin, sc.refMax)));
  }
  const avgProximity = proximityScores.reduce((a, b) => a + b, 0) / proximityScores.length;
  const conformityPct = Math.round(avgProximity * 100);

  return (
    <CollapsibleCard
      defaultOpen={false}
      storageKey="ai_plan_benchmark"
      icon={<Trophy className="h-4 w-4 text-primary" />}
      title={
        <>
          Benchmark vs Référence
          {ambitionEffectiveLabel ? <> — {ambitionEffectiveLabel}</> : null}
          {athleteName ? ` — ${athleteName}` : ""}
        </>
      }
      rightSlot={
        <Badge
          variant="outline"
          className={conformityPct >= 80 ? "border-green-500/50 text-green-700 dark:text-green-300" :
            conformityPct >= 50 ? "border-amber-500/50 text-amber-700 dark:text-amber-300" :
              "border-destructive/50 text-destructive"}
        >
          {conformityPct}% conforme
        </Badge>
      }
    >
        <p className="text-xs text-muted-foreground -mt-1 mb-2">
          Comparaison du plan généré avec les standards <span className="font-semibold">{ref.label}</span>
          {ref.longRunMax && <> · SL max: {ref.longRunMax}</>}
          {" · "}Charge: {ref.loadPattern}
        </p>
        {isDowngraded && ambitionSaisieLabel && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 -mt-1 mb-2 italic">
            Ambition visée : <strong>{ambitionSaisieLabel}</strong> (plan ajusté au niveau déclaré).
          </p>
        )}
        {/* Main gauges */}
        {gauges.map(g => (
          <GaugeRow key={g.label} {...g} />
        ))}

        {/* Sport distribution for triathlon */}
        {sportComparisons && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground">Répartition sportive</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed">
                    <p className="font-semibold mb-1">Ratios basés sur la littérature :</p>
                    <ul className="list-disc pl-3 space-y-0.5">
                      <li>Muñoz et al. (2014) — Training intensification in triathlon: distribution &amp; performance outcomes</li>
                      <li>Frontiers in Physiology (2024) — Optimal volume distribution in long-distance triathlon</li>
                      <li>Etxebarria et al. (2019) — Training periodisation of elite triathletes</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sportComparisons.map(sc => {
                const status = getGaugeStatus(sc.pct, sc.refMin, sc.refMax);
                const justification = status !== "in_range" && limiterResult
                  ? getDeviationJustification(sc.sport, status, limiterResult)
                  : null;
                return (
                  <div key={sc.sport} className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">{sc.sport}</div>
                    <div className="text-lg font-bold">{sc.pct}%</div>
                    <div className="text-[10px] text-muted-foreground">Réf: {sc.refMin}-{sc.refMax}%</div>
                    <Badge className={`text-[9px] ${statusColor(status)}`}>
                      <StatusIcon status={status} />
                    </Badge>
                    {justification && (
                      <div className={`text-[9px] mt-0.5 px-1 py-0.5 rounded ${justification.justified
                        ? "bg-green-500/10 text-green-700 dark:text-green-300"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                        {justification.justified ? "✅" : "⚠️"} {justification.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {limiterResult && limiterResult.primaryLimiter !== "none" && (
              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 mt-1">
                <span className="font-semibold">{limiterResult.limiterEmoji} Limiteur principal :</span>{" "}
                {limiterResult.limiterLabel} (impact: {Math.round(limiterResult.robustnessScore)}%)
                {" — "}Levier: {limiterResult.leverEmoji} {limiterResult.leverLabel}
              </div>
            )}
          </div>
        )}

        {/* Load pattern */}
        {(() => {
          const refNum = parseFloat(String(ref.loadPattern).split(":")[0]) || 3;
          const obsNum = deloadWeeks > 0 ? loadWeeks / deloadWeeks : Infinity;
          // Tolérance : un plan est conforme s'il ne dépasse pas la réf de +1 semaine de charge
          const conform = Number.isFinite(obsNum) && obsNum <= refNum + 1;
          return (
            <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
              <span className="text-muted-foreground">Pattern de charge détecté</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{loadRatio}</Badge>
                {conform ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-xs text-muted-foreground">Réf: {ref.loadPattern}</span>
              </div>
            </div>
          );
        })()}


        {/* Catalog usage stats */}
        {validationResult.catalogStats.totalKeySessions > 0 && (() => {
          const cs = validationResult.catalogStats;
          const catalogPct = Math.round((cs.catalogSessions / cs.totalKeySessions) * 100);
          const statusColor = catalogPct >= 80 ? "text-green-600 dark:text-green-400" 
            : catalogPct >= 50 ? "text-amber-600 dark:text-amber-400" 
            : "text-destructive";
          const barColor = catalogPct >= 80 ? "bg-green-500" 
            : catalogPct >= 50 ? "bg-amber-500" 
            : "bg-destructive";
          return (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  📚 Utilisation du catalogue TFCL™
                </h4>
                <Badge variant="outline" className={`text-[9px] ${statusColor}`}>
                  {catalogPct}% catalogue
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-lg font-bold text-primary">{cs.uniqueCatalogIds}</div>
                  <div className="text-[10px] text-muted-foreground">Séances uniques</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-lg font-bold text-foreground">{cs.catalogSessions}</div>
                  <div className="text-[10px] text-muted-foreground">Catalogue</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-lg font-bold text-foreground">{cs.customSessions}</div>
                  <div className="text-[10px] text-muted-foreground">Custom</div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${catalogPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{cs.catalogSessions} catalogue + {cs.customSessions} custom + {cs.untaggedSessions} non-tagué = {cs.totalKeySessions} clés</span>
                <span>Cible ≥80%</span>
              </div>
            </div>
          );
        })()}

        {/* Prohibition compliance — collapsible, default closed */}
        {validationResult.summary.prohibitionComplianceScore < 100 && (
          <Collapsible defaultOpen={false} className="pt-2 border-t border-border">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h4 className="text-xs font-semibold text-destructive flex items-center gap-1">
                🚫 Conformité prohibitions
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
              </h4>
              <Badge variant="destructive" className="text-[9px] hidden group-data-[state=open]:inline-flex">
                {validationResult.summary.prohibitionComplianceScore}/100
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {validationResult.issues
                .filter(i => i.rule === "prohibition_compliance")
                .slice(0, 5)
                .map((issue, idx) => (
                  <p key={idx} className="text-[10px] text-destructive/80 bg-destructive/5 rounded p-1.5">
                    {issue.message}
                  </p>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Phase coherence — collapsible, default closed */}
        {validationResult.summary.phaseCoherenceScore < 80 && (
          <Collapsible defaultOpen={false} className="pt-2 border-t border-border">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                📦 Cohérence des phases
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
              </h4>
              <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-600 dark:text-amber-400 hidden group-data-[state=open]:inline-flex">
                {validationResult.summary.phaseCoherenceScore}/100
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {validationResult.issues
                .filter(i => i.rule === "phase_coherence")
                .slice(0, 5)
                .map((issue, idx) => (
                  <p key={idx} className="text-[10px] text-amber-700/80 dark:text-amber-300/80 bg-amber-500/5 rounded p-1.5">
                    {issue.message}
                  </p>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Race Day presence */}
        {validationResult.summary.raceDayScore < 100 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                🏁 Jour de course
              </h4>
              <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-600 dark:text-red-400">
                Absent
              </Badge>
            </div>
            {validationResult.issues
              .filter(i => i.rule === "race_day")
              .slice(0, 3)
              .map((issue, idx) => (
                <p key={idx} className="text-[10px] text-red-700/80 dark:text-red-300/80 bg-red-500/5 rounded p-1.5">
                  {issue.message}
                </p>
              ))}
          </div>
        )}

        {/* Limiter Coverage Breakdown (L1→L4) */}
        {validationResult.limiterCoverage.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Crosshair className="h-3 w-3" />
                Couverture Limiteurs ↔ Séances clés
              </h4>
              <Badge
                variant="outline"
                className={`text-[9px] ${
                  validationResult.summary.limiterCoherenceScore >= 80
                    ? "border-green-500/50 text-green-700 dark:text-green-300"
                    : validationResult.summary.limiterCoherenceScore >= 50
                    ? "border-amber-500/50 text-amber-700 dark:text-amber-300"
                    : "border-destructive/50 text-destructive"
                }`}
              >
                {validationResult.summary.limiterCoherenceScore}/100
              </Badge>
            </div>
            <div className="space-y-1.5">
              {validationResult.limiterCoverage.map((item) => {
                const barColor =
                  item.status === "ok"
                    ? "bg-green-500"
                    : item.status === "low"
                    ? "bg-amber-500"
                    : "bg-destructive";
                const bgColor =
                  item.status === "ok"
                    ? "bg-green-500/10"
                    : item.status === "low"
                    ? "bg-amber-500/10"
                    : "bg-destructive/10";
                const textColor =
                  item.status === "ok"
                    ? "text-green-700 dark:text-green-300"
                    : item.status === "low"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-destructive";
                const rankLabel = item.rank <= 2 ? (item.rank === 1 ? "🎯 L1" : "⚡ L2") : `📋 L${item.rank}`;
                return (
                  <div key={item.key} className={`rounded p-1.5 ${bgColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold ${textColor}`}>
                        {rankLabel} — {limiterLabelFromKey(item.key)}
                      </span>
                      <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>
                        {item.pct}% ({item.hits}/{item.totalKeySessions})
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`absolute h-full rounded-full ${barColor} transition-all`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                      {/* Target marker */}
                      <div
                        className="absolute h-full w-0.5 bg-foreground/40"
                        style={{ left: `${Math.min(item.target, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span>Cible ≥{item.target}%</span>
                      <span>
                        {item.status === "ok" ? "✅ Conforme" : item.status === "low" ? "⚠️ Sous-couvert" : "❌ Absent"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {derivedPhases.length >= 2 && (
          <PhaseGanttTimeline phases={derivedPhases} totalWeeks={plan.totalWeeks} />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
          <span className="text-muted-foreground">Grade qualité TFCL™</span>
          <Badge
            variant="outline"
            className={`text-xs ${
              validationResult.grade === "A" ? "border-green-500/50 text-green-700 dark:text-green-300" :
              validationResult.grade === "B" ? "border-blue-500/50 text-blue-700 dark:text-blue-300" :
              validationResult.grade === "C" ? "border-amber-500/50 text-amber-700 dark:text-amber-300" :
              "border-destructive/50 text-destructive"
            }`}
          >
            {validationResult.grade} ({validationResult.score}/100)
          </Badge>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p><strong>{metrics.totalSessions}</strong> séances sur <strong>{metrics.totalWeeks}</strong> semaines · <strong>{deloadWeeks}</strong> semaines de décharge</p>
          {conformityPct < 50 && (
            <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Écart significatif avec les standards — vérifier la cohérence du plan
            </p>
          )}
        </div>
    </CollapsibleCard>
  );
}
