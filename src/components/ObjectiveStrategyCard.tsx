/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CARTE STRATÉGIE OBJECTIF TFCL™
 *
 * Présente, pour l'objectif sélectionné, deux plans de course :
 *   • Plan A — stratégie principale recommandée (centre/optimal de l'enveloppe)
 *   • Plan B — repli si Plan A ne tient pas en course (digestif, jambes, météo)
 *
 * Pour chaque plan : Vélo (W, NP, IF, plafond montées, FC, régularité), Course
 * (split + allure cible), Nutrition résumée (gels / barres / iso / eau).
 *
 * Composant 100% présentation — calculs dérivés à partir des props.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Bike, Footprints, Apple, Target, AlertTriangle, ShieldCheck, Download, Mountain, Thermometer, ArrowRightLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { computeBaseRateMader } from "@/lib/v2/nutritionUnified";
import { computeNegativeSplitDelta } from "@/lib/v2/pacingDisciplineRules";
import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";

interface ObjectiveStrategyCardProps {
  raceObjective: RaceObjective;
  /** Enveloppe vélo (tri ou objectif vélo) */
  bikeEnvelope?: PacingEnvelopeResult | null;
  /** Enveloppe course (objectif run ou tri) */
  runEnvelope?: PacingEnvelopeResult | null;

  ftp?: number | null;
  paceThresholdSecKm?: number | null;
  weightKg?: number | null;

  vlamaxBike?: number | null;
  vlamaxRun?: number | null;
  vo2max?: number | null;
  tteMin?: number | null;

  /** Durées par segment (min) — utilisées pour la nutrition */
  bikeDurationMin?: number | null;
  runDurationMin?: number | null;

  /** P3 — Conditions de course (modulent l'IF Plan A/B) */
  elevationGainM?: number | null;
  heatC?: number | null;

  /** Audit Lit. — Niveau d'ambition (module le centre Plan A sur 70.3) */
  ambition?: "finisher" | "age_group" | "competitor" | "elite" | string | null;
  /** Audit Lit. — W' (J) pour autoriser la surcharge "mur >8%" si W' > 20 kJ */
  wPrimeJ?: number | null;

  className?: string;
}

type PlanKey = "A" | "B";

interface PlanConfig {
  key: PlanKey;
  label: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
  description: string;
  intensityFactor: number;     // multiplicateur appliqué au centre de l'enveloppe (1 = centre, 0.97 = repli)
  carbsFactor: number;         // multiplicateur sur baseRate CHO (Plan B = digestif limite)
  splitBias: "negative" | "even" | "positive";
}

const PLANS: PlanConfig[] = [
  {
    key: "A",
    label: "Plan A — Course parfaite",
    badge: "Cible",
    badgeVariant: "default",
    description:
      "Tout va bien : jambes fraîches, digestion OK, météo conforme. On joue le centre de l'enveloppe avec discipline.",
    intensityFactor: 1.0,
    carbsFactor: 1.0,
    splitBias: "negative",
  },
  {
    key: "B",
    label: "Plan B — Replis course",
    badge: "Sécurité",
    badgeVariant: "secondary",
    description:
      "Si Plan A ne passe pas (estomac, chaleur, jambes lourdes, perte de cadence) : on protège l'arrivée. Intensité réduite, nutrition allégée et plus liquide.",
    intensityFactor: 0.96,
    carbsFactor: 0.75,
    splitBias: "even",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtPaceSecKm(sec?: number | null): string {
  if (sec == null || !isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function bikeWatts(envelope: PacingEnvelopeResult, ftp: number, intensityFactor: number) {
  const center = envelope.boundary.centerPct * intensityFactor;
  const low = envelope.boundary.lowPct * intensityFactor;
  const high = envelope.boundary.highPct * intensityFactor;
  // NP cible = centre. IF = NP/FTP.
  const target = (center / 100) * ftp;
  return {
    targetW: Math.round(target),
    rangeW: [Math.round((low / 100) * ftp), Math.round((high / 100) * ftp)] as [number, number],
    capClimbW: Math.round(((envelope.boundary.toleratedPct * intensityFactor) / 100) * ftp),
    flatW: Math.round(((center * intensityFactor) / 100) * ftp),
    if: +(target / ftp).toFixed(2),
    vi: 1.05, // Variability Index cible <1.05 = très régulier (objectif)
  };
}

function runPace(envelope: PacingEnvelopeResult, paceThr: number, intensityFactor: number, format?: RaceObjective) {
  // En course, "haut %" = plus rapide. centerPct est le % du seuil tenable.
  const center = envelope.boundary.centerPct * intensityFactor; // ex: 95
  const low = envelope.boundary.lowPct * intensityFactor;
  const high = envelope.boundary.highPct * intensityFactor;
  // pace = paceThr / fraction
  const targetSec = paceThr / (center / 100);

  // Plafond run : toleratedPct brut = burst anaérobie (~120%), pertinent uniquement courte distance.
  // Pour longue distance on borne à high + petite marge pour éviter d'afficher un plafond
  // beaucoup plus rapide que la plage (ex: plafond 4:10 vs plage 5:08–5:31).
  const capMarginPct =
    format === "IM" ? 2 :
    format === "70.3" ? 2 :
    format === "Marathon" ? 3 :
    format === "Semi" ? 4 :
    /* 10km, Trail, défaut */ 6;
  const cappedToleratedPct = Math.min(envelope.boundary.toleratedPct * intensityFactor, high + capMarginPct);

  return {
    targetPaceSec: targetSec,
    rangePaceSec: [paceThr / (high / 100), paceThr / (low / 100)] as [number, number], // [plus rapide, plus lent]
    cap: paceThr / (cappedToleratedPct / 100),
  };
}

function fcZone(centerPct: number): string {
  // Heuristique : %FTP ↔ %FCmax approx (Coggan Z)
  if (centerPct >= 95) return "Z4 (88–93% FCmax)";
  if (centerPct >= 88) return "Z3-haut (83–88% FCmax)";
  if (centerPct >= 80) return "Z3 (78–83% FCmax)";
  if (centerPct >= 70) return "Z2-haut (73–78% FCmax)";
  return "Z2 (68–73% FCmax)";
}

function nutritionItems(carbsGh: number, durationH: number, plan: PlanConfig) {
  const totalCho = Math.round(carbsGh * durationH * plan.carbsFactor);
  // Répartition simple :
  //  - 1 gel = 25 g CHO
  //  - 1 barre = 30 g CHO
  //  - 1 bidon iso 500ml = 30 g CHO + 500ml
  //  - eau pure complète l'hydratation (~600ml/h cible)
  const liquideTargetMl = Math.round(durationH * 600);
  // Plan A : 50% iso, 30% gels, 20% barres ; Plan B : 70% iso, 30% gels, 0% barres
  const ratios = plan.key === "A" ? { iso: 0.5, gel: 0.3, bar: 0.2 } : { iso: 0.7, gel: 0.3, bar: 0 };
  const isoCho = totalCho * ratios.iso;
  const gelCho = totalCho * ratios.gel;
  const barCho = totalCho * ratios.bar;
  const iso = Math.max(0, Math.round(isoCho / 30));
  const gels = Math.max(0, Math.round(gelCho / 25));
  const bars = Math.max(0, Math.round(barCho / 30));
  const isoMl = iso * 500;
  const eauMl = Math.max(0, liquideTargetMl - isoMl);
  return { totalCho, gels, bars, iso, isoMl, eauMl, perHour: Math.round(carbsGh * plan.carbsFactor) };
}

function splitLabel(bias: PlanConfig["splitBias"], deltaPct: number): string {
  if (bias === "negative") return `Negative split (~${deltaPct.toFixed(1)}% plus rapide en 2e moitié)`;
  if (bias === "positive") return "Positive split (départ légèrement + rapide, gérer la fin)";
  return "Even split (allure stable du début à la fin)";
}

// P3 — Dérate IF selon conditions (terrain + chaleur)
// Renvoie un multiplicateur ≤ 1 à appliquer en plus du intensityFactor du plan.
function derateFromConditions(elevationGainM: number | null | undefined, heatC: number | null | undefined): {
  factor: number;
  reasons: string[];
} {
  let factor = 1;
  const reasons: string[] = [];
  const elev = elevationGainM ?? 0;
  if (elev >= 1500) { factor *= 0.97; reasons.push(`Terrain ≥ 1500 m D+ : −3% IF`); }
  else if (elev >= 800) { factor *= 0.985; reasons.push(`Terrain ${elev} m D+ : −1.5% IF`); }
  const heat = heatC ?? null;
  if (heat != null) {
    // Calibration Périard 2015 (heat stress) : −6% IF à ≥32 °C, −3% à ≥28 °C.
    if (heat >= 32) { factor *= 0.94; reasons.push(`Chaleur ≥ 32 °C : −6% IF (Périard 2015)`); }
    else if (heat >= 28) { factor *= 0.97; reasons.push(`Chaleur ${heat} °C : −3% IF (Périard 2015)`); }
  }
  return { factor: +factor.toFixed(4), reasons };
}

// P6 — Cadences cibles vélo par segment
function bikeCadence(label: string): string {
  if (label.startsWith("Plat")) return "85–95 rpm";
  if (label.startsWith("Faux-plat montant")) return "82–90 rpm";
  if (label.startsWith("Mur")) return "65–75 rpm (force, court)";
  if (label.startsWith("Côte courte")) return "75–85 rpm";
  if (label.startsWith("Côte longue")) return "75–82 rpm (min 70)";
  if (label.startsWith("Descente")) return "≥ 90 rpm relâché";
  return "—";
}

// ─── Découpage par segment ────────────────────────────────────────────────────

function runSegmentsForFormat(format: RaceObjective): { label: string; share: number }[] {
  // share = fraction de la distance/durée totale, doit sommer à 1
  if (format === "Marathon") {
    return [
      { label: "Km 0–10",  share: 10 / 42.195 },
      { label: "Km 10–21", share: 11 / 42.195 },
      { label: "Km 21–32", share: 11 / 42.195 },
      { label: "Km 32–42", share: 10.195 / 42.195 },
    ];
  }
  if (format === "10km") {
    return [
      { label: "Km 0–2.5", share: 0.25 },
      { label: "Km 2.5–5", share: 0.25 },
      { label: "Km 5–7.5", share: 0.25 },
      { label: "Km 7.5–10", share: 0.25 },
    ];
  }
  // Semi, tri-run, autres : 4 quarts
  return [
    { label: "Q1 (départ)",  share: 0.25 },
    { label: "Q2",           share: 0.25 },
    { label: "Q3",           share: 0.25 },
    { label: "Q4 (finish)",  share: 0.25 },
  ];
}

function paceSegments(targetPaceSec: number, bias: PlanConfig["splitBias"], deltaPct: number, format: RaceObjective) {
  const segs = runSegmentsForFormat(format);
  // Offsets (% de l'allure moyenne) pour chaque quart, somme ≈ 0.
  // Negative split : on démarre plus lent (positif = plus lent), on finit plus rapide (négatif).
  let offsets: number[];
  if (bias === "negative") {
    const d = Math.max(0.5, deltaPct); // amplitude
    offsets = [+0.75 * d, +0.25 * d, -0.25 * d, -0.75 * d];
  } else if (bias === "positive") {
    const d = Math.max(0.5, deltaPct);
    offsets = [-0.5 * d, -0.15 * d, +0.15 * d, +0.5 * d];
  } else {
    offsets = [+0.2, 0, -0.05, -0.15];
  }
  return segs.map((s, i) => ({
    label: s.label,
    paceSec: targetPaceSec * (1 + offsets[i] / 100),
  }));
}

interface BikeSegment { label: string; targetW: number; rangeW: [number, number]; note: string; }

function bikeSegments(
  envelope: PacingEnvelopeResult,
  ftp: number,
  intensityFactor: number,
  opts?: { wPrimeJ?: number | null; allowMurOverload?: boolean }
): BikeSegment[] {
  const center = envelope.boundary.centerPct * intensityFactor;
  const low = envelope.boundary.lowPct * intensityFactor;
  const high = envelope.boundary.highPct * intensityFactor;
  const cap = envelope.boundary.toleratedPct * intensityFactor;
  const w = (pct: number) => Math.round((pct / 100) * ftp);

  // Audit Lit. — Mur >8% : si W' > 20 kJ, surcharge admissible étendue à +12–15% (15–30 s).
  const wPrime = opts?.wPrimeJ ?? null;
  const murOverloadOK = !!opts?.allowMurOverload && wPrime != null && wPrime > 20000;
  const murCenterPct = murOverloadOK ? Math.min(cap + 12, cap * 1.12) : Math.min(cap + 8, cap * 1.06);
  const murHighPct = murOverloadOK ? Math.min(cap + 15, cap * 1.15) : Math.min(cap + 12, cap * 1.10);
  const murNote = murOverloadOK
    ? `W' ≈ ${(wPrime! / 1000).toFixed(1)} kJ : surcharge tolérée jusqu'à ${w(murHighPct)} W (15–30 s max), remets-toi assis dès que la pente passe sous 8 %.`
    : `Brève surcharge tolérée (15–30 s max) : reste sous ${w(murHighPct)} W, remets-toi assis dès que la pente passe sous 8 %.`;

  return [
    {
      label: "Plat / faux-plat",
      targetW: w(center),
      rangeW: [w(low), w(high)],
      note: "Cible NP — relâché, cadence 85–95.",
    },
    {
      label: "Faux-plat montant",
      targetW: w(center + 3),
      rangeW: [w(center), w(center + 6)],
      note: "Légère hausse (+3%), ne pas pousser.",
    },
    {
      label: "Côte courte · <3 min",
      targetW: w(cap),
      rangeW: [w(center + 5), w(cap)],
      note: `Plafond strict ≤ ${w(cap)} W. Accepter 5–10 s perdus.`,
    },
    {
      label: "Mur raide · >8% · 15–30 s",
      targetW: w(murCenterPct),
      rangeW: [w(cap), w(murHighPct)],
      note: murNote,
    },
    {
      label: "Côte longue · >5 min",
      targetW: w(center + 5),
      rangeW: [w(center), w(center + 8)],
      note: "Tenir NP, jamais au-dessus du plafond.",
    },
    {
      label: "Descente / récup",
      targetW: w(Math.max(40, center - 20)),
      rangeW: [w(Math.max(30, center - 30)), w(center - 10)],
      note: "Récup active, boire, manger.",
    },
  ];
}

function SegmentsTable({ rows, cadenceHeader = "Cadence" }: { rows: { label: string; col1: string; col2?: string; cadence?: string; note?: string }[]; cadenceHeader?: string }) {
  const hasCadence = rows.some((r) => r.cadence);
  const cols = hasCadence ? "grid-cols-[1.2fr_1fr_1fr_1fr]" : "grid-cols-[1.2fr_1fr_1fr]";
  return (
    <div className="rounded-md border border-border/40 overflow-hidden">
      <div className={cn("grid bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1", cols)}>
        <div>Segment</div>
        <div>Cible</div>
        <div>Plage</div>
        {hasCadence && <div>{cadenceHeader}</div>}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "grid px-2 py-1.5 text-[11px]",
            cols,
            i % 2 === 0 ? "bg-background/40" : "bg-muted/10",
          )}
        >
          <div className="font-medium text-foreground">{r.label}</div>
          <div className="font-semibold">{r.col1}</div>
          <div className="text-muted-foreground">{r.col2 ?? "—"}</div>
          {hasCadence && <div className="text-muted-foreground">{r.cadence ?? "—"}</div>}
          {r.note && <div className={cn("text-[10px] text-muted-foreground italic mt-0.5", hasCadence ? "col-span-4" : "col-span-3")}>{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function BikeBlock({
  envelope, ftp, plan, conditionsFactor = 1, raceObjective, ambition, wPrimeJ,
}: {
  envelope: PacingEnvelopeResult; ftp: number; plan: PlanConfig; conditionsFactor?: number;
  raceObjective?: RaceObjective; ambition?: string | null; wPrimeJ?: number | null;
}) {
  // Audit Lit. — 70.3 Plan A : +2 pts FTP sur centre nominal pour competitor/elite (Coggan/Allen 0.84–0.88 pros).
  const planABoost = (
    plan.key === "A" &&
    raceObjective === "70.3" &&
    (ambition === "competitor" || ambition === "elite")
  ) ? 1.025 : 1; // ~+2.5% sur le centre ≈ +2 pts FTP autour de 80%
  const effIF = plan.intensityFactor * conditionsFactor * planABoost;
  const w = bikeWatts(envelope, ftp, effIF);
  const segs = bikeSegments(envelope, ftp, effIF, { wPrimeJ, allowMurOverload: true });
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bike className="h-4 w-4 text-primary" />
        Stratégie vélo
        {conditionsFactor < 1 && (
          <Badge variant="outline" className="text-[9px] ml-auto">Ajusté conditions : ×{conditionsFactor.toFixed(3)}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Metric label="Puissance cible (NP)" value={`${w.targetW} W`} />
        <Metric label="Plage" value={`${w.rangeW[0]}–${w.rangeW[1]} W`} />
        <Metric label="IF (NP/FTP)" value={w.if.toString()} />
        <Metric label="Watts plat" value={`${w.flatW} W`} />
        <Metric label="Plafond montées" value={`≤ ${w.capClimbW} W`} />
        <Metric label="VI cible" value={`< ${w.vi}`} />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-foreground/80">Par segment de terrain</div>
        <SegmentsTable
          rows={segs.map((s) => ({
            label: s.label,
            col1: `${s.targetW} W`,
            col2: `${s.rangeW[0]}–${s.rangeW[1]} W`,
            cadence: bikeCadence(s.label),
            note: s.note,
          }))}
        />
      </div>

      <div className="text-[11px] text-muted-foreground leading-relaxed">
        FC indicative : <strong>{fcZone(envelope.boundary.centerPct * effIF)}</strong>.
        Régularité = <strong>NP très proche de la puissance moyenne (VI &lt; 1.05)</strong>. Dans les côtes,
        ne JAMAIS dépasser le plafond — accepter de perdre 5–10s vs un partenaire.
        Sur un mur &gt; 8 %, surcharge tolérée 15–30 s puis revenir sous plafond dès que la pente baisse.
      </div>
    </div>
  );
}

function RunBlock({
  envelope, paceThr, plan, format, vlamax, tteMin, durationMin, conditionsFactor = 1,
}: {
  envelope: PacingEnvelopeResult;
  paceThr: number;
  plan: PlanConfig;
  format: RaceObjective;
  vlamax: number | null;
  tteMin: number | null;
  durationMin: number;
  conditionsFactor?: number;
}) {
  const effIF = plan.intensityFactor * conditionsFactor;
  const p = runPace(envelope, paceThr, effIF, format);
  const deltaPct = React.useMemo(() => {
    if (format === "Marathon" || format === "10km") {
      return computeNegativeSplitDelta(format, vlamax, tteMin, durationMin).targetPct;
    }
    return 1.2;
  }, [format, vlamax, tteMin, durationMin]);

  // P6 — cadence cible run par segment (~spm). Approx selon allure cible et split.
  const runCadenceForSeg = (idx: number, total: number): string => {
    // Plus on avance, plus on tient la cadence haute (180-184 spm fin de course).
    const base = format === "Marathon" ? 178 : 182;
    const drift = idx === 0 ? -2 : idx === total - 1 ? +2 : 0;
    return `${base + drift}–${base + drift + 4} spm`;
  };
  const segs = paceSegments(p.targetPaceSec, plan.splitBias, deltaPct, format);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Footprints className="h-4 w-4 text-primary" />
        Stratégie course à pied
        {conditionsFactor < 1 && (
          <Badge variant="outline" className="text-[9px] ml-auto">Ajusté conditions : ×{conditionsFactor.toFixed(3)}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Metric label="Allure cible" value={fmtPaceSecKm(p.targetPaceSec)} />
        <Metric label="Plage" value={`${fmtPaceSecKm(p.rangePaceSec[0])} – ${fmtPaceSecKm(p.rangePaceSec[1])}`} />
        <Metric label="Plafond (à éviter)" value={`+ rapide que ${fmtPaceSecKm(p.cap)}`} />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-foreground/80">Allures &amp; cadences par segment</div>
        <SegmentsTable
          cadenceHeader="Cadence"
          rows={segs.map((s, i) => ({
            label: s.label,
            col1: fmtPaceSecKm(s.paceSec),
            col2: "± 3 s/km",
            cadence: runCadenceForSeg(i, segs.length),
          }))}
        />
      </div>
      <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
        <div className="text-[11px] font-semibold text-primary mb-0.5">Stratégie de pacing</div>
        <div className="text-[11px] text-foreground leading-relaxed">
          Vu ton profil ({vlamax ? `VLamax ${vlamax.toFixed(2)}` : "VLamax estimée"}
          {tteMin ? `, TTE ${tteMin}min` : ""}) :{" "}
          <strong>{splitLabel(plan.splitBias, deltaPct)}</strong>.
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
          Démarrer 3–5 s/km plus lent que l'allure cible sur les 20 premières minutes,
          retrouver la cible au tiers, accélérer progressivement sur la 2e moitié. Cadence stable, jamais sous −4 spm de la cible.
        </div>
      </div>
    </div>
  );
}

export type NutriOverride = Partial<{ gels: number; bars: number; iso: number; eauMl: number }>;

function NumStepper({
  value, onChange, min = 0, max = 99, step = 1, suffix,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-6 w-6 rounded border border-border/60 bg-background text-xs font-bold hover:bg-muted"
        aria-label="Diminuer"
      >−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-14 h-6 rounded border border-border/60 bg-background text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-6 w-6 rounded border border-border/60 bg-background text-xs font-bold hover:bg-muted"
        aria-label="Augmenter"
      >+</button>
      {suffix && <span className="text-[10px] text-muted-foreground ml-1">{suffix}</span>}
    </div>
  );
}

function EditableMetric({
  label, value, onChange, suffix, step, max,
}: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number; max?: number }) {
  return (
    <div className="rounded-md bg-background/60 border border-border/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5"><NumStepper value={value} onChange={onChange} step={step} max={max} suffix={suffix} /></div>
    </div>
  );
}

function NutritionBlock({
  weightKg, vo2, vlamax, durationH, intensityPct, sport, plan, label,
  override, onOverrideChange, onResetOverride,
}: {
  weightKg: number;
  vo2: number | null;
  vlamax: number | null;
  durationH: number;
  intensityPct: number;
  sport: "velo" | "cap";
  plan: PlanConfig;
  label: string;
  override: NutriOverride;
  onOverrideChange: (patch: NutriOverride) => void;
  onResetOverride: () => void;
}) {
  const { baseRate } = computeBaseRateMader(weightKg, sport, vo2, vlamax, intensityPct, durationH, false);
  const auto = nutritionItems(baseRate, durationH, plan);
  const gels = override.gels ?? auto.gels;
  const bars = override.bars ?? auto.bars;
  const iso = override.iso ?? auto.iso;
  const eauMl = override.eauMl ?? auto.eauMl;
  const isEdited = override.gels != null || override.bars != null || override.iso != null || override.eauMl != null;
  // Total CHO recalculé depuis les saisies utilisateur
  const totalCho = gels * 25 + bars * 30 + iso * 30;
  const liquideMl = iso * 500 + eauMl;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Apple className="h-4 w-4 text-primary" />
          Nutrition {label}
        </div>
        {isEdited && (
          <button
            type="button"
            onClick={onResetOverride}
            className="text-[10px] text-primary hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">
        Cible auto : <strong>{auto.perHour} g CHO/h</strong> · Total saisi : <strong>{totalCho} g</strong> ({Math.round(totalCho / Math.max(0.1, durationH))} g/h) · Liquide saisi : <strong>{liquideMl} ml</strong>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <EditableMetric label="Gels (~25g)" value={gels} onChange={(v) => onOverrideChange({ gels: v })} max={30} />
        <EditableMetric label="Barres (~30g)" value={bars} onChange={(v) => onOverrideChange({ bars: v })} max={20} />
        <EditableMetric label="Bidons iso 500ml" value={iso} onChange={(v) => onOverrideChange({ iso: v })} max={20} />
        <EditableMetric label="Eau pure" value={eauMl} onChange={(v) => onOverrideChange({ eauMl: v })} step={50} max={5000} suffix="ml" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/60 border border-border/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

// ─── Export PDF (printable HTML) ──────────────────────────────────────────────

export interface ExportSections { bike: boolean; run: boolean; nutrition: boolean; }

function buildStrategyHtml(
  props: ObjectiveStrategyCardProps,
  overrides: Record<string, NutriOverride> = {},
  include: ExportSections = { bike: true, run: true, nutrition: true },
  conditionsFactor: number = 1,
  conditionsReasons: string[] = [],
): string {
  const {
    raceObjective, bikeEnvelope, runEnvelope,
    ftp, paceThresholdSecKm, weightKg,
    vlamaxBike, vlamaxRun, vo2max, tteMin,
    bikeDurationMin, runDurationMin,
    ambition, wPrimeJ,
  } = props;
  const w = weightKg ?? 70;
  const hasBike = !!bikeEnvelope && !!ftp && ftp > 0;
  const hasRun = !!runEnvelope && !!paceThresholdSecKm && paceThresholdSecKm > 0;
  const bikeIntensityPct = bikeEnvelope?.boundary.centerPct ?? 75;
  const runIntensityPct = runEnvelope?.boundary.centerPct ?? 88;
  const bikeH = (bikeDurationMin ?? 0) / 60;
  const runH = (runDurationMin ?? 0) / 60;

  const planSection = (plan: PlanConfig) => {
    const planABoost = (plan.key === "A" && raceObjective === "70.3" && (ambition === "competitor" || ambition === "elite")) ? 1.025 : 1;
    const effIF = plan.intensityFactor * conditionsFactor * planABoost;
    let html = `<section class="plan"><h2>${plan.label}${conditionsFactor < 1 ? ` <span style="font-size:10px;color:#b45309;">(ajusté conditions ×${conditionsFactor.toFixed(3)})</span>` : ""}${planABoost > 1 ? ` <span style="font-size:10px;color:#047857;">(70.3 ${ambition} : +2 pts FTP)</span>` : ""}</h2><p class="desc">${plan.description}</p>`;

    if (hasBike && include.bike) {
      const bw = bikeWatts(bikeEnvelope!, ftp!, effIF);
      const segs = bikeSegments(bikeEnvelope!, ftp!, effIF, { wPrimeJ, allowMurOverload: true });
      html += `<h3>Vélo</h3>
        <table class="kv"><tbody>
          <tr><th>Puissance cible (NP)</th><td>${bw.targetW} W</td><th>Plage</th><td>${bw.rangeW[0]}–${bw.rangeW[1]} W</td></tr>
          <tr><th>IF</th><td>${bw.if}</td><th>Plafond montées</th><td>≤ ${bw.capClimbW} W</td></tr>
          <tr><th>FC indicative</th><td colspan="3">${fcZone(bikeEnvelope!.boundary.centerPct * effIF)}</td></tr>
        </tbody></table>
        <table class="seg"><thead><tr><th>Segment</th><th>Cible</th><th>Plage</th><th>Cadence</th><th>Note</th></tr></thead><tbody>
          ${segs.map(s => `<tr><td>${s.label}</td><td>${s.targetW} W</td><td>${s.rangeW[0]}–${s.rangeW[1]} W</td><td>${bikeCadence(s.label)}</td><td>${s.note}</td></tr>`).join("")}
        </tbody></table>`;
    }

    if (hasRun && include.run) {
      const p = runPace(runEnvelope!, paceThresholdSecKm!, effIF, raceObjective);
      const deltaPct = (raceObjective === "Marathon" || raceObjective === "10km")
        ? computeNegativeSplitDelta(raceObjective, vlamaxRun ?? null, tteMin ?? null, runDurationMin ?? 0).targetPct
        : 1.2;
      const segs = paceSegments(p.targetPaceSec, plan.splitBias, deltaPct, raceObjective);
      const baseSpm = raceObjective === "Marathon" ? 178 : 182;
      html += `<h3>Course à pied</h3>
        <table class="kv"><tbody>
          <tr><th>Allure cible</th><td>${fmtPaceSecKm(p.targetPaceSec)}</td><th>Plage</th><td>${fmtPaceSecKm(p.rangePaceSec[0])} – ${fmtPaceSecKm(p.rangePaceSec[1])}</td></tr>
          <tr><th>Plafond</th><td colspan="3">+ rapide que ${fmtPaceSecKm(p.cap)}</td></tr>
          <tr><th>Stratégie</th><td colspan="3">${splitLabel(plan.splitBias, deltaPct)}</td></tr>
        </tbody></table>
        <table class="seg"><thead><tr><th>Segment</th><th>Allure cible</th><th>Tolérance</th><th>Cadence</th></tr></thead><tbody>
          ${segs.map((s, i) => {
            const drift = i === 0 ? -2 : i === segs.length - 1 ? +2 : 0;
            return `<tr><td>${s.label}</td><td>${fmtPaceSecKm(s.paceSec)}</td><td>± 3 s/km</td><td>${baseSpm + drift}–${baseSpm + drift + 4} spm</td></tr>`;
          }).join("")}
        </tbody></table>`;
    }

    if (include.nutrition) {
      const nutriRow = (sport: "velo" | "cap", durationH: number, label: string, vla: number | null, intensityPct: number) => {
        if (durationH <= 0) return "";
        const { baseRate } = computeBaseRateMader(w, sport, vo2max ?? null, vla, intensityPct, durationH, false);
        const auto = nutritionItems(baseRate, durationH, plan);
        const ov = overrides[`${plan.key}-${sport}`] ?? {};
        const gels = ov.gels ?? auto.gels;
        const bars = ov.bars ?? auto.bars;
        const iso = ov.iso ?? auto.iso;
        const eauMl = ov.eauMl ?? auto.eauMl;
        const totalCho = gels * 25 + bars * 30 + iso * 30;
        const perHour = Math.round(totalCho / Math.max(0.1, durationH));
        const edited = ov.gels != null || ov.bars != null || ov.iso != null || ov.eauMl != null;
        return `<tr>
          <th>${label}${edited ? " ✎" : ""}</th>
          <td>${perHour} g/h</td>
          <td>${totalCho} g</td>
          <td>${gels} gels</td>
          <td>${bars} barres</td>
          <td>${iso} iso (${iso * 500} ml)</td>
          <td>${eauMl} ml eau</td>
        </tr>`;
      };
      const bikeNutri = hasBike && bikeH > 0 ? nutriRow("velo", bikeH, "Vélo", vlamaxBike ?? null, bikeIntensityPct * effIF) : "";
      const runNutri = hasRun && runH > 0 ? nutriRow("cap", runH, "Course", vlamaxRun ?? null, runIntensityPct * effIF) : "";
      if (bikeNutri || runNutri) {
        html += `<h3>Nutrition</h3>
          <table class="seg"><thead><tr><th>Segment</th><th>CHO/h</th><th>Total</th><th>Gels</th><th>Barres</th><th>Iso</th><th>Eau</th></tr></thead><tbody>
            ${bikeNutri}
            ${runNutri}
          </tbody></table>`;
      }
    }

    if (plan.key === "A") {
      html += `<h3>Critères de bascule Plan A → Plan B</h3>
        <table class="seg"><thead><tr><th>Signal</th><th>Seuil</th><th>Action</th></tr></thead><tbody>
          <tr><td>Dérive FC à puissance/allure constante</td><td>≥ +8 bpm sur 10 min</td><td>Bascule Plan B</td></tr>
          <tr><td>Ratio Puissance / FC</td><td>Chute &gt; 8%</td><td>Bascule Plan B</td></tr>
          <tr><td>Perte de cadence (run)</td><td>≥ −5 spm vs cible</td><td>Bascule Plan B</td></tr>
          <tr><td>Perte de cadence (vélo)</td><td>&lt; 70 rpm soutenu hors mur</td><td>Changer braquet, sinon Plan B</td></tr>
          <tr><td>Écœurement / crampes naissantes</td><td>Apparition franche</td><td>Plan B nutrition liquide + −5% IF</td></tr>
          <tr><td>Chaleur non anticipée</td><td>&gt; 28 °C</td><td>Plan B + +200 mL/h</td></tr>
          <tr><td>RPE déconnecté</td><td>RPE ≥ 8 sur Plan A</td><td>Bascule Plan B immédiate</td></tr>
        </tbody></table>
        <p class="warn">Règle des 2/3 : 2 critères en &lt; 10 min ou 3 sur la course → bascule Plan B sans hésiter.</p>`;
    }

    if (plan.key === "B") {
      html += `<p class="warn"><strong>Protocole de bascule.</strong> Réduire l'intensité à l'IF Plan B affiché, passer aux liquides, relancer doucement après 10 min. Si 2 critères restent actifs après 15 min, mode "finish only" : −5% IF supplémentaire, marche en côte autorisée.</p>`;
    }

    html += `</section>`;
    return html;
  };

  const conditionsBanner = conditionsReasons.length > 0
    ? `<div class="meta" style="background:#fef3c7;border-left:3px solid #d97706;padding:6px 8px;color:#92400e;">Conditions appliquées : ${conditionsReasons.join(" · ")} (dérate IF ×${conditionsFactor.toFixed(3)})</div>`
    : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
<title>Stratégie ${raceObjective} — TFCL™</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0f172a; }
  h2 { font-size: 14px; margin: 14px 0 6px; padding: 4px 8px; background: #f1f5f9; border-left: 3px solid #2563eb; }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #1e293b; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 12px; }
  .desc { color: #475569; font-style: italic; margin: 2px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.kv th { width: 22%; text-align: left; padding: 3px 6px; background: #f8fafc; color: #475569; font-weight: 500; }
  table.kv td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
  table.seg th { background: #e2e8f0; padding: 4px 6px; text-align: left; font-size: 10px; }
  table.seg td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  .plan { page-break-inside: avoid; margin-bottom: 16px; }
  .warn { background: #fef3c7; border-left: 3px solid #d97706; padding: 6px 8px; font-size: 10px; margin-top: 6px; }
  .footer { margin-top: 16px; font-size: 9px; color: #64748b; text-align: center; font-style: italic; }
  @media print { .noprint { display: none; } }
  .noprint { position: fixed; top: 8px; right: 8px; }
  .noprint button { padding: 6px 12px; background: #2563eb; color: white; border: 0; border-radius: 4px; cursor: pointer; font-size: 12px; }
</style></head>
<body>
<div class="noprint"><button onclick="window.print()">Imprimer / PDF</button></div>
<h1>Stratégie ${raceObjective} — Plan A & Plan B</h1>
<div class="meta">Généré le ${new Date().toLocaleDateString("fr-FR")} · Potentiel Physiologique TFCL™</div>
${conditionsBanner}
${PLANS.map(planSection).join("")}
<div class="footer">Calibrations : Pacing Envelope™ TFCL · Nutrition Mader-Heck (g CHO/h) · Negative split = Hanley 2020 / Casado 2021.</div>
<script>setTimeout(() => window.print(), 400);</script>
</body></html>`;
}

function downloadStrategyPdf(
  props: ObjectiveStrategyCardProps,
  overrides: Record<string, NutriOverride>,
  include: ExportSections,
  conditionsFactor: number = 1,
  conditionsReasons: string[] = [],
) {
  const html = buildStrategyHtml(props, overrides, include, conditionsFactor, conditionsReasons);
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategie-${props.raceObjective}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ObjectiveStrategyCard(props: ObjectiveStrategyCardProps) {
  const {
    raceObjective, bikeEnvelope, runEnvelope,
    ftp, paceThresholdSecKm, weightKg,
    vlamaxBike, vlamaxRun, vo2max, tteMin,
    bikeDurationMin, runDurationMin,
    elevationGainM: elevationGainMProp, heatC: heatCProp,
    ambition, wPrimeJ,
    className,
  } = props;

  // P3 — Conditions de course (terrain + chaleur). Initialisées via props, éditables inline.
  const [elevationGainM, setElevationGainM] = React.useState<number>(elevationGainMProp ?? 0);
  const [heatC, setHeatC] = React.useState<number>(heatCProp ?? 22);
  const conditions = React.useMemo(() => derateFromConditions(elevationGainM, heatC), [elevationGainM, heatC]);

  const isTri = raceObjective === "IM" || raceObjective === "70.3";
  const hasBike = !!bikeEnvelope && !!ftp && ftp > 0;
  const hasRun = !!runEnvelope && !!paceThresholdSecKm && paceThresholdSecKm > 0;
  const w = weightKg ?? 70;

  // Overrides nutrition par (plan, sport)
  const [nutriOverrides, setNutriOverrides] = React.useState<Record<string, NutriOverride>>({});
  const overrideKey = (planK: PlanKey, sport: "velo" | "cap") => `${planK}-${sport}`;
  const patchOverride = (planK: PlanKey, sport: "velo" | "cap", patch: NutriOverride) =>
    setNutriOverrides((prev) => ({ ...prev, [overrideKey(planK, sport)]: { ...prev[overrideKey(planK, sport)], ...patch } }));
  const resetOverride = (planK: PlanKey, sport: "velo" | "cap") =>
    setNutriOverrides((prev) => { const { [overrideKey(planK, sport)]: _, ...rest } = prev; return rest; });

  // Sections à inclure dans l'export PDF
  const [exportSections, setExportSections] = React.useState<ExportSections>({
    bike: hasBike,
    run: hasRun,
    nutrition: true,
  });
  const noneSelected = !exportSections.bike && !exportSections.run && !exportSections.nutrition;

  if (!hasBike && !hasRun) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="text-base">Stratégie objectif</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Données insuffisantes pour générer une stratégie : il manque la FTP (vélo) et/ou l'allure seuil (course).
        </CardContent>
      </Card>
    );
  }

  const bikeIntensityPct = bikeEnvelope?.boundary.centerPct ?? 75;
  const runIntensityPct = runEnvelope?.boundary.centerPct ?? 88;

  return (
    <Card className={cn("border-2 border-primary/30", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Stratégie {raceObjective} — Plan A & Plan B
            </CardTitle>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Deux plans complets : on vise le Plan A. Si quelque chose dérape en course, on bascule sur le Plan B sans paniquer.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">
              {isTri ? "Triathlon" : raceObjective}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-3 space-y-2">
                <div className="text-xs font-semibold">Sections à exporter</div>
                <div className="space-y-1.5">
                  {hasBike && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="export-bike"
                        checked={exportSections.bike}
                        onCheckedChange={(v) => setExportSections((s) => ({ ...s, bike: v === true }))}
                      />
                      <Label htmlFor="export-bike" className="text-xs cursor-pointer flex items-center gap-1.5">
                        <Bike className="h-3.5 w-3.5 text-primary" /> Vélo
                      </Label>
                    </div>
                  )}
                  {hasRun && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="export-run"
                        checked={exportSections.run}
                        onCheckedChange={(v) => setExportSections((s) => ({ ...s, run: v === true }))}
                      />
                      <Label htmlFor="export-run" className="text-xs cursor-pointer flex items-center gap-1.5">
                        <Footprints className="h-3.5 w-3.5 text-primary" /> Course (CAP)
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-nutri"
                      checked={exportSections.nutrition}
                      onCheckedChange={(v) => setExportSections((s) => ({ ...s, nutrition: v === true }))}
                    />
                    <Label htmlFor="export-nutri" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <Apple className="h-3.5 w-3.5 text-primary" /> Nutrition
                    </Label>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-[11px] gap-1"
                  disabled={noneSelected}
                  onClick={() => downloadStrategyPdf(props, nutriOverrides, exportSections, conditions.factor, conditions.reasons)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Exporter
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* P3 — Conditions de course */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold">
            <Mountain className="h-3.5 w-3.5 text-primary" />
            Conditions de course
            {conditions.factor < 1 && (
              <Badge variant="outline" className="text-[9px] ml-auto">
                Dérate IF : ×{conditions.factor.toFixed(3)}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-[11px]">
              <Mountain className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">D+ (m)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={elevationGainM}
                onChange={(e) => setElevationGainM(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 h-6 rounded border border-border/60 bg-background text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px]">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Chaleur (°C)</span>
              <input
                type="number"
                min={-5}
                max={45}
                step={1}
                value={heatC}
                onChange={(e) => setHeatC(Number(e.target.value) || 0)}
                className="w-20 h-6 rounded border border-border/60 bg-background text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
          {conditions.reasons.length > 0 ? (
            <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-400">
              {conditions.reasons.join(" · ")}
            </div>
          ) : (
            <div className="mt-1.5 text-[10px] text-muted-foreground italic">
              Conditions standards : aucun ajustement appliqué.
            </div>
          )}
        </div>

        <Tabs defaultValue="A" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            {PLANS.map((p) => (
              <TabsTrigger key={p.key} value={p.key} className="text-xs sm:text-sm">
                {p.key === "A" ? <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PLANS.map((plan) => {
            const bikeH = (bikeDurationMin ?? 0) / 60;
            const runH = (runDurationMin ?? 0) / 60;
            const effIF = plan.intensityFactor * conditions.factor;

            return (
              <TabsContent key={plan.key} value={plan.key} className="space-y-3 mt-4">
                <div className="rounded-md bg-muted/40 border border-border/60 p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={plan.badgeVariant} className="text-[10px]">{plan.badge}</Badge>
                    <span className="text-xs font-medium">{plan.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                {hasBike && (
                  <BikeBlock envelope={bikeEnvelope!} ftp={ftp!} plan={plan} conditionsFactor={conditions.factor} raceObjective={raceObjective} ambition={ambition} wPrimeJ={wPrimeJ} />
                )}

                {hasRun && (
                  <RunBlock
                    envelope={runEnvelope!}
                    paceThr={paceThresholdSecKm!}
                    plan={plan}
                    format={raceObjective}
                    vlamax={vlamaxRun ?? null}
                    tteMin={tteMin ?? null}
                    durationMin={runDurationMin ?? 0}
                    conditionsFactor={conditions.factor}
                  />
                )}

                <Separator className="my-1" />

                {hasBike && bikeH > 0 && (
                  <NutritionBlock
                    weightKg={w}
                    vo2={vo2max ?? null}
                    vlamax={vlamaxBike ?? null}
                    durationH={bikeH}
                    intensityPct={bikeIntensityPct * effIF}
                    sport="velo"
                    plan={plan}
                    label="vélo"
                    override={nutriOverrides[overrideKey(plan.key, "velo")] ?? {}}
                    onOverrideChange={(patch) => patchOverride(plan.key, "velo", patch)}
                    onResetOverride={() => resetOverride(plan.key, "velo")}
                  />
                )}

                {hasRun && runH > 0 && (
                  <NutritionBlock
                    weightKg={w}
                    vo2={vo2max ?? null}
                    vlamax={vlamaxRun ?? null}
                    durationH={runH}
                    intensityPct={runIntensityPct * effIF}
                    sport="cap"
                    plan={plan}
                    label="course"
                    override={nutriOverrides[overrideKey(plan.key, "cap")] ?? {}}
                    onOverrideChange={(patch) => patchOverride(plan.key, "cap", patch)}
                    onResetOverride={() => resetOverride(plan.key, "cap")}
                  />
                )}

                {/* P2 — Critères de bascule Plan A → Plan B (structurés, toujours visibles côté Plan A) */}
                {plan.key === "A" && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Critères de bascule Plan A → Plan B
                    </div>
                    <div className="rounded-md border border-border/40 overflow-hidden bg-background/40">
                      <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">
                        <div>Signal</div>
                        <div>Seuil</div>
                        <div>Action</div>
                      </div>
                      {[
                        { sig: "Dérive FC à puissance/allure constante", seuil: "≥ +8 bpm sur 10 min", act: "Bascule Plan B" },
                        { sig: "Ratio Puissance / FC", seuil: "Chute > 8%", act: "Bascule Plan B" },
                        { sig: "Perte de cadence (run)", seuil: "≥ −5 spm vs cible", act: "Bascule Plan B" },
                        { sig: "Perte de cadence (vélo)", seuil: "< 70 rpm soutenu hors mur", act: "Changer braquet, sinon Plan B" },
                        { sig: "Écœurement / nausée / crampes naissantes", seuil: "Apparition franche", act: "Plan B nutrition (liquide) + −5% IF" },
                        { sig: "Température ressentie", seuil: "> 28 °C non anticipée", act: "Plan B + +200 mL/h" },
                        { sig: "RPE déconnecté de la puissance", seuil: "RPE ≥ 8 sur Plan A IF", act: "Bascule Plan B immédiate" },
                      ].map((r, i) => (
                        <div key={i} className={cn("grid grid-cols-[1.4fr_1fr_1fr] px-2 py-1.5 text-[10.5px]", i % 2 === 0 ? "bg-background/40" : "bg-muted/10")}>
                          <div className="font-medium text-foreground">{r.sig}</div>
                          <div className="text-muted-foreground">{r.seuil}</div>
                          <div className="text-foreground/90">{r.act}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground italic">
                      Règle des 2/3 : 2 critères déclenchés en moins de 10 min ou 3 sur la course → bascule Plan B sans hésiter.
                    </div>
                  </div>
                )}

                {plan.key === "B" && (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Protocole de bascule.</strong> Réduire l'intensité à l'IF Plan B affiché, passer aux liquides (iso + eau),
                    relancer progressivement après 10 min. Si 2 critères du tableau ci-dessus restent actifs après 15 min en Plan B,
                    passer en mode "finish only" : IF −5% supplémentaire, marche en côte autorisée.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="text-[10px] text-muted-foreground italic text-center mt-3">
          Calibrations : Pacing Envelope™ TFCL · Nutrition Mader-Heck (g CHO/h) ·
          Negative split = Hanley 2020 / Casado 2021.
        </p>
      </CardContent>
    </Card>
  );
}

export default ObjectiveStrategyCard;
