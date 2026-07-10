/**
 * RacePaceSimulation — Per-km pacing table for Marathon/Semi plans
 * Self-contained: computes pacing from VMA/threshold data without full PacingEnvelope dependency.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Timer, Footprints, AlertTriangle, Fuel, Activity,
  TrendingDown, CheckCircle2, Droplets, Cookie,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface RacePaceSimulationProps {
  objective: string;           // "Marathon" | "Semi"
  ambition: string;
  vma: number | null;          // km/h
  thresholdPace: number | null; // sec/km (derived from VMA or direct)
  vlamaxRun: number | null;
  vo2max: number | null;
  weightKg: number | null;
  athleteName?: string;
  /**
   * Centre d'intensité (% du seuil) imposé par le coach IA.
   * Si fourni, remplace la valeur par défaut basée sur l'objectif et permet d'aligner
   * la simulation sur les zones de la séance objectif du Plan IA.
   */
  intensityCenterPct?: number | null;
  /**
   * Source de la calibration (ex: "Plan IA", "Snapshot seuil", "Estimation VMA×0.85")
   * Affichée dans un bandeau pour transparence.
   */
  calibrationSource?: string | null;
}

interface NutritionCue {
  type: 'gel' | 'water' | 'iso';
  icon: string;
  label: string;
  detail: string; // e.g. "25g CHO" or "150ml"
}

interface SegmentRow {
  km: number;
  phase: "start" | "install" | "push";
  intensityPct: number;        // % threshold
  paceSecKm: number | null;
  rpe: number;                 // 1-10
  glycogenPct: number;         // sans nutrition
  glycogenFedPct: number;      // avec nutrition (gel/iso)
  zone: "green" | "orange" | "red";
  alert?: string;
  nutritionCues: NutritionCue[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DISTANCES: Record<string, number> = {
  Marathon: 42,
  Semi: 21,
};

/** Base intensity ranges by objective (% of threshold pace) */
const BASE_INTENSITY: Record<string, { center: number; low: number; high: number }> = {
  Marathon: { center: 88, low: 85, high: 92 },
  Semi: { center: 93, low: 90, high: 96 },
};

/**
 * Modulation du centre d'intensité par ambition (méthode TFCL).
 * Elite/Compétiteur peut soutenir une intensité plus proche du seuil,
 * un athlète Loisir doit rester plus conservateur.
 */
function ambitionCenterDelta(ambition: string): number {
  const a = ambition.toLowerCase();
  if (a.includes("elite") || a.includes("élite")) return +2;
  if (a.includes("compet") || a.includes("compét")) return +1;
  if (a.includes("loisir") || a.includes("découverte") || a.includes("decouverte")) return -2;
  return 0;
}

/** Negative split phases (% of race distance) */
const PHASE_BOUNDARIES = {
  start: 0.20,    // 0-20%: conservative
  install: 0.70,  // 20-70%: installation
  // push: 70-100%: controlled rise
};

/** VLamax modulation: high VLamax = tighter zones, more glycolytic cost */
function vlamaxModifier(vlamax: number | null): { zoneNarrow: number; depletionRate: number } {
  if (vlamax == null) return { zoneNarrow: 0, depletionRate: 1.0 };
  if (vlamax > 0.45) return { zoneNarrow: 2, depletionRate: 1.3 };
  if (vlamax > 0.35) return { zoneNarrow: 0, depletionRate: 1.0 };
  return { zoneNarrow: -2, depletionRate: 0.8 }; // low VLamax = more aerobic
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE
// ═══════════════════════════════════════════════════════════════

function deriveThresholdPace(vma: number | null): number | null {
  if (!vma || vma <= 0) return null;
  // Threshold ≈ 85% VMA → sec/km
  const thresholdKmH = vma * 0.85;
  return Math.round(3600 / thresholdKmH);
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

function computeSegments(
  objective: string,
  thresholdPace: number,
  vlamaxRun: number | null,
  ambition: string,
  intensityCenterPct: number | null | undefined,
): SegmentRow[] {
  const totalKm = DISTANCES[objective] || 21;
  const baseRaw = BASE_INTENSITY[objective] || BASE_INTENSITY.Semi;

  // Centre effectif: priorité au centre fourni (Plan IA), sinon base + delta ambition
  const ambitionDelta = ambitionCenterDelta(ambition);
  const center = intensityCenterPct != null
    ? intensityCenterPct
    : baseRaw.center + ambitionDelta;
  // Recalcul cohérent des bornes autour du nouveau centre
  const halfWidth = (baseRaw.high - baseRaw.low) / 2;
  const base = {
    center,
    low: center - halfWidth,
    high: center + halfWidth,
  };
  const vlaMod = vlamaxModifier(vlamaxRun);

  const segments: SegmentRow[] = [];
  let glycogen = 100;
  let glycogenFed = 100;

  // Base depletion per km
  const baseDepletion = objective === "Marathon" ? 2.2 : 2.8;

  // Carb refuel per nutrition item (expressed as % glycogen recovered)
  // Gel ~25g CHO ≈ ~5% of muscle glycogen stores (~500g total)
  // Iso ~30g CHO per serving ≈ ~6%
  const GEL_REFUEL_PCT = 5;
  const ISO_REFUEL_PCT = 6;

  for (let km = 1; km <= totalKm; km++) {
    const distPct = km / totalKm;

    // Phase & intensity via negative split
    let phase: SegmentRow["phase"];
    let intensity: number;

    if (distPct <= PHASE_BOUNDARIES.start) {
      phase = "start";
      const progress = distPct / PHASE_BOUNDARIES.start;
      intensity = base.low + progress * (base.center - base.low - 1);
    } else if (distPct <= PHASE_BOUNDARIES.install) {
      phase = "install";
      const progress = (distPct - PHASE_BOUNDARIES.start) / (PHASE_BOUNDARIES.install - PHASE_BOUNDARIES.start);
      intensity = (base.center - 1) + progress * 2;
    } else {
      phase = "push";
      const progress = (distPct - PHASE_BOUNDARIES.install) / (1 - PHASE_BOUNDARIES.install);
      const maxPush = base.high - vlaMod.zoneNarrow;
      intensity = base.center + 1 + progress * (maxPush - base.center - 1);
    }

    intensity = Math.round(intensity * 10) / 10;

    // Pace from intensity
    const paceSecKm = Math.round(thresholdPace * (100 / intensity));

    // RPE estimation (progressive with fatigue)
    const baseRpe = objective === "Marathon"
      ? 5 + distPct * 4.5
      : 6 + distPct * 3.5;
    const rpe = Math.min(10, Math.round(baseRpe * 10) / 10);

    // Glycogen depletion (same for both tracks)
    const zoneMultiplier = intensity > base.high - 1 ? 1.4 : intensity > base.center ? 1.1 : 1.0;
    const depletion = baseDepletion * zoneMultiplier * vlaMod.depletionRate;
    glycogen = Math.max(0, glycogen - depletion);
    glycogenFed = Math.max(0, glycogenFed - depletion);

    // Zone classification
    let zone: SegmentRow["zone"] = "green";
    if (intensity > base.high - vlaMod.zoneNarrow) zone = "red";
    else if (intensity > base.center + 1) zone = "orange";

    // Alerts (based on unfed glycogen)
    let alert: string | undefined;
    if (glycogen < 15) alert = "⚠️ Risque de déplétion critique";
    else if (glycogen < 30 && km < totalKm - 3) alert = "Réserves basses — maintenir la discipline";

    // Nutrition cues based on timing and glycogen
    const nutritionCues: NutritionCue[] = [];

    // Gel: every ~25-30 min (approx every 5-6 km at marathon pace)
    const gelInterval = glycogenFed < 30 ? 4 : 5;
    if (km >= 5 && km % gelInterval === 0) {
      nutritionCues.push({ type: 'gel', icon: '🟡', label: 'Gel', detail: '25g CHO' });
      glycogenFed = Math.min(100, glycogenFed + GEL_REFUEL_PCT);
    }

    // Water: every ~15-20 min → approximately every 3km
    if (km >= 3 && km % 3 === 0) {
      nutritionCues.push({ type: 'water', icon: '💧', label: 'Eau', detail: '150ml' });
    }

    // Isotonic drink: alternate with water, every 6km
    if (km >= 6 && km % 6 === 0) {
      const waterIdx = nutritionCues.findIndex(c => c.type === 'water');
      if (waterIdx >= 0) nutritionCues.splice(waterIdx, 1);
      nutritionCues.push({ type: 'iso', icon: '🧃', label: 'Iso', detail: '200ml · 30g CHO' });
      glycogenFed = Math.min(100, glycogenFed + ISO_REFUEL_PCT);
    }

    segments.push({
      km,
      phase,
      intensityPct: intensity,
      paceSecKm,
      rpe,
      glycogenPct: Math.round(glycogen),
      glycogenFedPct: Math.round(glycogenFed),
      zone,
      alert,
      nutritionCues,
    });
  }

  return segments;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const ZONE_COLORS = {
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  orange: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const PHASE_LABELS = {
  start: "Conservateur",
  install: "Installation",
  push: "Poussée contrôlée",
};

function GlycogenBar({ pct }: { pct: number }) {
  const color = pct > 40 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export function RacePaceSimulation({
  objective,
  ambition,
  vma,
  thresholdPace: thresholdPaceProp,
  vlamaxRun,
  vo2max,
  weightKg,
  athleteName,
  intensityCenterPct,
  calibrationSource,
}: RacePaceSimulationProps) {
  const normalizedObj = useMemo(() => {
    const lower = objective.toLowerCase();
    if (lower.includes("marathon") && !lower.includes("semi")) return "Marathon";
    if (lower.includes("semi")) return "Semi";
    return null;
  }, [objective]);

  const thresholdPace = useMemo(() => {
    if (thresholdPaceProp) return thresholdPaceProp;
    return deriveThresholdPace(vma);
  }, [thresholdPaceProp, vma]);

  // Source effective de la calibration affichée à l'utilisateur
  const effectiveCalibrationSource = useMemo(() => {
    if (calibrationSource) return calibrationSource;
    if (intensityCenterPct != null) return "Plan IA (zones coach)";
    if (thresholdPaceProp) return "Allure seuil mesurée";
    return "Estimation depuis VMA (×0.85)";
  }, [calibrationSource, intensityCenterPct, thresholdPaceProp]);

  const segments = useMemo(() => {
    if (!normalizedObj || !thresholdPace) return null;
    return computeSegments(normalizedObj, thresholdPace, vlamaxRun, ambition, intensityCenterPct ?? null);
  }, [normalizedObj, thresholdPace, vlamaxRun, ambition, intensityCenterPct]);

  // Don't render for non-running objectives
  if (!normalizedObj || !segments || !thresholdPace) return null;

  const totalKm = DISTANCES[normalizedObj];
  const criticalKm = segments.find(s => s.glycogenPct < 15);
  const avgPace = Math.round(
    segments.reduce((acc, s) => acc + (s.paceSecKm || 0), 0) / segments.length
  );
  const estimatedTime = avgPace * totalKm;
  const estMin = Math.floor(estimatedTime / 60);
  const estSec = estimatedTime % 60;

  // Show every km for semi, every 2km for marathon (with first, last, and critical always shown)
  const displaySegments = normalizedObj === "Marathon"
    ? segments.filter((s, i) =>
        i === 0 || i === segments.length - 1 ||
        s.km % 5 === 0 || s.km === 30 || s.km === 35 ||
        s.alert != null
      )
    : segments;

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2 min-w-0 flex-1">
            <Timer className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">Simulation Pacing — {normalizedObj}</span>
            {athleteName && <span className="text-muted-foreground font-normal text-sm truncate">· {athleteName}</span>}
          </CardTitle>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            Seuil: {formatPace(thresholdPace)}/km
          </Badge>
        </div>
        {/* Bandeau d'alignement avec le coach IA */}
        <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px]">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-foreground/80">
            <span className="font-medium">Calibration :</span> {effectiveCalibrationSource}
            {intensityCenterPct != null && (
              <> · centre cible <span className="font-mono font-semibold">{Math.round(intensityCenterPct)}% seuil</span></>
            )}
            {ambition && (
              <span className="text-muted-foreground"> · ambition {ambition}</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Footprints className="h-3 w-3" /> {totalKm} km
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> Allure moy: {formatPace(avgPace)}/km
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" /> ≈ {Math.floor(estMin / 60) > 0 ? `${Math.floor(estMin / 60)}h` : ""}{estMin % 60}min
          </span>
          {vlamaxRun != null && (
            <span className="flex items-center gap-1">
              VLamax: {vlamaxRun.toFixed(2)}
              {vlamaxRun > 0.45 && (
                <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 ml-1">Sensible</Badge>
              )}
            </span>
          )}
          {criticalKm && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Déplétion critique au km {criticalKm.km}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Strategy summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Stratégie Negative Split TFCL™
          </p>
          <p className="text-muted-foreground">
            Départ conservateur ({BASE_INTENSITY[normalizedObj].low}% seuil), installation progressive,
            poussée contrôlée dans le dernier tiers si glycogène &gt; 25%.
          </p>
        </div>

        {/* Phase & nutrition legend */}
        <div className="flex flex-wrap gap-2">
          {(["start", "install", "push"] as const).map(phase => (
            <Badge key={phase} variant="outline" className="text-[10px]">
              {phase === "start" && "🟢"} {phase === "install" && "🔵"} {phase === "push" && "🟠"}
              {" "}{PHASE_LABELS[phase]}
            </Badge>
          ))}
          <span className="text-muted-foreground mx-1">|</span>
          <Badge variant="outline" className="text-[10px]">🟡 Gel</Badge>
          <Badge variant="outline" className="text-[10px]">💧 Eau</Badge>
          <Badge variant="outline" className="text-[10px]">🧃 Iso</Badge>
        </div>

        {/* Pacing table */}
        <ScrollArea className="w-full">
          <div className="min-w-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium w-12">Km</th>
                  <th className="text-center py-2 px-2 font-medium">Phase</th>
                  <th className="text-center py-2 px-2 font-medium">% Seuil</th>
                  <th className="text-center py-2 px-2 font-medium">Allure</th>
                  <th className="text-center py-2 px-2 font-medium">RPE</th>
                  <th className="text-center py-2 px-2 font-medium min-w-[100px]">
                    <span className="flex items-center justify-center gap-1">
                      <Fuel className="h-3 w-3" /> Sans nutri
                    </span>
                  </th>
                  <th className="text-center py-2 px-2 font-medium min-w-[100px]">
                    <span className="flex items-center justify-center gap-1">
                      <Cookie className="h-3 w-3" /> Avec nutri
                    </span>
                  </th>
                  <th className="text-center py-2 px-2 font-medium">
                    <span className="flex items-center justify-center gap-1">
                      <Droplets className="h-3 w-3" /> Nutrition
                    </span>
                  </th>
                  <th className="text-left py-2 px-2 font-medium">Alerte</th>
                </tr>
              </thead>
              <tbody>
                {displaySegments.map(seg => (
                  <tr
                    key={seg.km}
                    className={`border-b border-border/30 ${
                      seg.alert ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="py-1.5 px-2 font-semibold tabular-nums">{seg.km}</td>
                    <td className="py-1.5 px-2 text-center">
                      <Badge variant="outline" className="text-[9px]">
                        {PHASE_LABELS[seg.phase]}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <Badge className={`text-[10px] ${ZONE_COLORS[seg.zone]}`}>
                        {seg.intensityPct}%
                      </Badge>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-semibold">
                      {seg.paceSecKm ? formatPace(seg.paceSecKm) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`font-semibold ${
                        seg.rpe >= 9 ? "text-red-600 dark:text-red-400" :
                        seg.rpe >= 7 ? "text-amber-600 dark:text-amber-400" :
                        "text-muted-foreground"
                      }`}>
                        {seg.rpe.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <GlycogenBar pct={seg.glycogenPct} />
                    </td>
                    <td className="py-1.5 px-2">
                      <GlycogenBar pct={seg.glycogenFedPct} />
                    </td>
                    <td className="py-1.5 px-2">
                      {seg.nutritionCues.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {seg.nutritionCues.map((cue, i) => (
                            <span
                              key={i}
                              className="text-[10px] whitespace-nowrap cursor-default"
                              title={cue.label}
                            >
                              {cue.icon} <span className="font-medium">{cue.label}</span>{" "}
                              <span className="text-muted-foreground">{cue.detail}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[10px] text-amber-600 dark:text-amber-400">
                      {seg.alert || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic">
          Projection basée sur le profil physiologique actuel. Le temps final dépend de l'exécution
          disciplinée du pacing. La simulation ne prédit pas — elle révèle les conséquences de chaque stratégie.
        </p>
      </CardContent>
    </Card>
  );
}
