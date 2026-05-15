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
import { Bike, Footprints, Apple, Target, AlertTriangle, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function runPace(envelope: PacingEnvelopeResult, paceThr: number, intensityFactor: number) {
  // En course, "haut %" = plus rapide. centerPct est le % du seuil tenable.
  const center = envelope.boundary.centerPct * intensityFactor; // ex: 95
  const low = envelope.boundary.lowPct * intensityFactor;
  const high = envelope.boundary.highPct * intensityFactor;
  // pace = paceThr / fraction
  const targetSec = paceThr / (center / 100);
  return {
    targetPaceSec: targetSec,
    rangePaceSec: [paceThr / (high / 100), paceThr / (low / 100)] as [number, number], // [plus rapide, plus lent]
    cap: paceThr / ((envelope.boundary.toleratedPct * intensityFactor) / 100),
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

function bikeSegments(envelope: PacingEnvelopeResult, ftp: number, intensityFactor: number): BikeSegment[] {
  const center = envelope.boundary.centerPct * intensityFactor;
  const low = envelope.boundary.lowPct * intensityFactor;
  const high = envelope.boundary.highPct * intensityFactor;
  const cap = envelope.boundary.toleratedPct * intensityFactor;
  const w = (pct: number) => Math.round((pct / 100) * ftp);
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
      label: "Côte courte (<3 min)",
      targetW: w(cap),
      rangeW: [w(center + 5), w(cap)],
      note: `Plafond strict ≤ ${w(cap)} W. Accepter 5–10 s perdus.`,
    },
    {
      label: "Côte longue (>5 min)",
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

function SegmentsTable({ rows }: { rows: { label: string; col1: string; col2?: string; note?: string }[] }) {
  return (
    <div className="rounded-md border border-border/40 overflow-hidden">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">
        <div>Segment</div>
        <div>Cible</div>
        <div>Plage</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[1.2fr_1fr_1fr] px-2 py-1.5 text-[11px]",
            i % 2 === 0 ? "bg-background/40" : "bg-muted/10",
          )}
        >
          <div className="font-medium text-foreground">{r.label}</div>
          <div className="font-semibold">{r.col1}</div>
          <div className="text-muted-foreground">{r.col2 ?? "—"}</div>
          {r.note && <div className="col-span-3 text-[10px] text-muted-foreground italic mt-0.5">{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function BikeBlock({
  envelope, ftp, plan,
}: { envelope: PacingEnvelopeResult; ftp: number; plan: PlanConfig }) {
  const w = bikeWatts(envelope, ftp, plan.intensityFactor);
  const segs = bikeSegments(envelope, ftp, plan.intensityFactor);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bike className="h-4 w-4 text-primary" />
        Stratégie vélo
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
            note: s.note,
          }))}
        />
      </div>

      <div className="text-[11px] text-muted-foreground leading-relaxed">
        FC indicative : <strong>{fcZone(envelope.boundary.centerPct * plan.intensityFactor)}</strong>.
        Régularité = <strong>NP très proche de la puissance moyenne (VI &lt; 1.05)</strong>. Dans les côtes,
        ne JAMAIS dépasser le plafond — accepter de perdre 5–10s vs un partenaire.
      </div>
    </div>
  );
}

function RunBlock({
  envelope, paceThr, plan, format, vlamax, tteMin, durationMin,
}: {
  envelope: PacingEnvelopeResult;
  paceThr: number;
  plan: PlanConfig;
  format: RaceObjective;
  vlamax: number | null;
  tteMin: number | null;
  durationMin: number;
}) {
  const p = runPace(envelope, paceThr, plan.intensityFactor);
  // Calibration split via helper existant pour Marathon/10km, sinon estimation locale
  const deltaPct = React.useMemo(() => {
    if (format === "Marathon" || format === "10km") {
      return computeNegativeSplitDelta(format, vlamax, tteMin, durationMin).targetPct;
    }
    // Semi / segment tri-run : 1.0–1.5% par défaut
    return 1.2;
  }, [format, vlamax, tteMin, durationMin]);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Footprints className="h-4 w-4 text-primary" />
        Stratégie course à pied
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Metric label="Allure cible" value={fmtPaceSecKm(p.targetPaceSec)} />
        <Metric label="Plage" value={`${fmtPaceSecKm(p.rangePaceSec[0])} – ${fmtPaceSecKm(p.rangePaceSec[1])}`} />
        <Metric label="Plafond (à éviter)" value={`+ rapide que ${fmtPaceSecKm(p.cap)}`} />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-foreground/80">Allures par segment</div>
        <SegmentsTable
          rows={paceSegments(p.targetPaceSec, plan.splitBias, deltaPct, format).map((s) => ({
            label: s.label,
            col1: fmtPaceSecKm(s.paceSec),
            col2: "± 3 s/km",
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
          retrouver la cible au tiers, accélérer progressivement sur la 2e moitié.
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

function buildStrategyHtml(props: ObjectiveStrategyCardProps, overrides: Record<string, NutriOverride> = {}): string {
  const {
    raceObjective, bikeEnvelope, runEnvelope,
    ftp, paceThresholdSecKm, weightKg,
    vlamaxBike, vlamaxRun, vo2max, tteMin,
    bikeDurationMin, runDurationMin,
  } = props;
  const w = weightKg ?? 70;
  const hasBike = !!bikeEnvelope && !!ftp && ftp > 0;
  const hasRun = !!runEnvelope && !!paceThresholdSecKm && paceThresholdSecKm > 0;
  const bikeIntensityPct = bikeEnvelope?.boundary.centerPct ?? 75;
  const runIntensityPct = runEnvelope?.boundary.centerPct ?? 88;
  const bikeH = (bikeDurationMin ?? 0) / 60;
  const runH = (runDurationMin ?? 0) / 60;

  const planSection = (plan: PlanConfig) => {
    let html = `<section class="plan"><h2>${plan.label}</h2><p class="desc">${plan.description}</p>`;

    if (hasBike) {
      const bw = bikeWatts(bikeEnvelope!, ftp!, plan.intensityFactor);
      const segs = bikeSegments(bikeEnvelope!, ftp!, plan.intensityFactor);
      html += `<h3>Vélo</h3>
        <table class="kv"><tbody>
          <tr><th>Puissance cible (NP)</th><td>${bw.targetW} W</td><th>Plage</th><td>${bw.rangeW[0]}–${bw.rangeW[1]} W</td></tr>
          <tr><th>IF</th><td>${bw.if}</td><th>Plafond montées</th><td>≤ ${bw.capClimbW} W</td></tr>
          <tr><th>FC indicative</th><td colspan="3">${fcZone(bikeEnvelope!.boundary.centerPct * plan.intensityFactor)}</td></tr>
        </tbody></table>
        <table class="seg"><thead><tr><th>Segment</th><th>Cible</th><th>Plage</th><th>Note</th></tr></thead><tbody>
          ${segs.map(s => `<tr><td>${s.label}</td><td>${s.targetW} W</td><td>${s.rangeW[0]}–${s.rangeW[1]} W</td><td>${s.note}</td></tr>`).join("")}
        </tbody></table>`;
    }

    if (hasRun) {
      const p = runPace(runEnvelope!, paceThresholdSecKm!, plan.intensityFactor);
      const deltaPct = (raceObjective === "Marathon" || raceObjective === "10km")
        ? computeNegativeSplitDelta(raceObjective, vlamaxRun ?? null, tteMin ?? null, runDurationMin ?? 0).targetPct
        : 1.2;
      const segs = paceSegments(p.targetPaceSec, plan.splitBias, deltaPct, raceObjective);
      html += `<h3>Course à pied</h3>
        <table class="kv"><tbody>
          <tr><th>Allure cible</th><td>${fmtPaceSecKm(p.targetPaceSec)}</td><th>Plage</th><td>${fmtPaceSecKm(p.rangePaceSec[0])} – ${fmtPaceSecKm(p.rangePaceSec[1])}</td></tr>
          <tr><th>Plafond</th><td colspan="3">+ rapide que ${fmtPaceSecKm(p.cap)}</td></tr>
          <tr><th>Stratégie</th><td colspan="3">${splitLabel(plan.splitBias, deltaPct)}</td></tr>
        </tbody></table>
        <table class="seg"><thead><tr><th>Segment</th><th>Allure cible</th><th>Tolérance</th></tr></thead><tbody>
          ${segs.map(s => `<tr><td>${s.label}</td><td>${fmtPaceSecKm(s.paceSec)}</td><td>± 3 s/km</td></tr>`).join("")}
        </tbody></table>`;
    }

    // Nutrition
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
    html += `<h3>Nutrition</h3>
      <table class="seg"><thead><tr><th>Segment</th><th>CHO/h</th><th>Total</th><th>Gels</th><th>Barres</th><th>Iso</th><th>Eau</th></tr></thead><tbody>
        ${hasBike && bikeH > 0 ? nutriRow("velo", bikeH, "Vélo", vlamaxBike ?? null, bikeIntensityPct * plan.intensityFactor) : ""}
        ${hasRun && runH > 0 ? nutriRow("cap", runH, "Course", vlamaxRun ?? null, runIntensityPct * plan.intensityFactor) : ""}
      </tbody></table>`;

    if (plan.key === "B") {
      html += `<p class="warn"><strong>Quand basculer Plan B ?</strong> FC qui décroche &gt; 8 bpm sous cible pour la même puissance, écœurement nutritionnel, crampes naissantes, perte de cadence &gt; 5 spm, ou chaleur &gt; 28 °C non anticipée. Réduire l'intensité, passer aux liquides, relancer doucement après 10 min.</p>`;
    }

    html += `</section>`;
    return html;
  };

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
${PLANS.map(planSection).join("")}
<div class="footer">Calibrations : Pacing Envelope™ TFCL · Nutrition Mader-Heck (g CHO/h) · Negative split = Hanley 2020 / Casado 2021.</div>
<script>setTimeout(() => window.print(), 400);</script>
</body></html>`;
}

function downloadStrategyPdf(props: ObjectiveStrategyCardProps, overrides: Record<string, NutriOverride>) {
  const html = buildStrategyHtml(props, overrides);
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
    bikeDurationMin, runDurationMin, className,
  } = props;

  const isTri = raceObjective === "IM" || raceObjective === "70.3";
  const hasBike = !!bikeEnvelope && !!ftp && ftp > 0;
  const hasRun = !!runEnvelope && !!paceThresholdSecKm && paceThresholdSecKm > 0;
  const w = weightKg ?? 70;

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

  // Overrides nutrition par (plan, sport)
  const [nutriOverrides, setNutriOverrides] = React.useState<Record<string, NutriOverride>>({});
  const overrideKey = (planK: PlanKey, sport: "velo" | "cap") => `${planK}-${sport}`;
  const patchOverride = (planK: PlanKey, sport: "velo" | "cap", patch: NutriOverride) =>
    setNutriOverrides((prev) => ({ ...prev, [overrideKey(planK, sport)]: { ...prev[overrideKey(planK, sport)], ...patch } }));
  const resetOverride = (planK: PlanKey, sport: "velo" | "cap") =>
    setNutriOverrides((prev) => { const { [overrideKey(planK, sport)]: _, ...rest } = prev; return rest; });

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
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] gap-1"
              onClick={() => downloadStrategyPdf(props, nutriOverrides)}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
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
            // Estimation cumulée nutrition pour le résumé tri (vélo + cap)
            const bikeH = (bikeDurationMin ?? 0) / 60;
            const runH = (runDurationMin ?? 0) / 60;

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
                  <BikeBlock envelope={bikeEnvelope!} ftp={ftp!} plan={plan} />
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
                  />
                )}

                <Separator className="my-1" />

                {hasBike && bikeH > 0 && (
                  <NutritionBlock
                    weightKg={w}
                    vo2={vo2max ?? null}
                    vlamax={vlamaxBike ?? null}
                    durationH={bikeH}
                    intensityPct={bikeIntensityPct * plan.intensityFactor}
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
                    intensityPct={runIntensityPct * plan.intensityFactor}
                    sport="cap"
                    plan={plan}
                    label="course"
                    override={nutriOverrides[overrideKey(plan.key, "cap")] ?? {}}
                    onOverrideChange={(patch) => patchOverride(plan.key, "cap", patch)}
                    onResetOverride={() => resetOverride(plan.key, "cap")}
                  />
                )}

                {plan.key === "B" && (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Quand basculer sur Plan B ?</strong> Frequence cardiaque qui décroche &gt; 8 bpm sous la cible
                    pour la même puissance, écœurement nutritionnel, crampes naissantes, perte de cadence
                    &gt; 5 spm, ou chaleur &gt; 28 °C non anticipée. Réduire l'intensité, passer aux liquides,
                    relancer doucement après 10 min.
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
