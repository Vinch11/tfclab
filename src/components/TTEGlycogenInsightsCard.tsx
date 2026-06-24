/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TTE & GLYCOGEN INSIGHTS CARD
 *
 * Affiche dans la page Essentiels (Dashboard) :
 *  - Le mécanisme limitant TTE (glycogène / acidose / W' / fatigue centrale)
 *    + explication pédagogique + prescription d'entraînement (calculateTTEMechanisms).
 *  - Un warning "⚠️ Risque fringale estimé au km X" si calculateGlycogenDepletion
 *    détecte un bonkRiskKm avant la fin théorique de la course.
 *
 * Source unique des moteurs : src/lib/v2/maderMetabolicModel.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Brain, Flame, Activity, Zap, Info } from "lucide-react";
import {
  calculateTTEMechanisms,
  calculateGlycogenDepletion,
  recommendedCarbsToAvoidBonk,
  findMLSSPower,
  type TTELimitingMechanism,
  type MaderProfile,
} from "@/lib/v2/maderMetabolicModel";

interface Props {
  vlamax: number | null;
  vo2max: number | null;
  weightKg: number | null;
  ftp: number | null;
  vma: number | null;
  /** km/h moyens estimés. Si null : déduit de VMA (0.78×VMA) ou MLSS bike. */
  avgSpeedKmh?: number | null;
  /** Durée cible (min) — sert au modèle glycogène. */
  targetRaceDurationMin?: number | null;
  /** CP/W' optionnels (pour TTE W'). */
  criticalPower?: number | null;
  wPrimeKj?: number | null;
  sport: "run" | "bike";
  /** Apport CHO/h planifié (défaut 60). */
  plannedCarbsGH?: number;
}

const MECHANISM_META: Record<
  TTELimitingMechanism,
  { label: string; icon: typeof Brain; explanation: string; color: string }
> = {
  glycogen: {
    label: "Glycogène",
    icon: Flame,
    explanation:
      "Les réserves de glucides musculaires et hépatiques limitent la durée. Au-delà, c'est la fringale (bonk).",
    color: "text-amber-600 dark:text-amber-400",
  },
  acidosis: {
    label: "Acidose",
    icon: Activity,
    explanation:
      "L'accumulation de lactate dépasse la capacité tampon. Les muscles 'brûlent' et la puissance s'effondre.",
    color: "text-red-600 dark:text-red-400",
  },
  wprime: {
    label: "W' (capacité anaérobie)",
    icon: Zap,
    explanation:
      "La réserve d'énergie anaérobie au-dessus du seuil critique s'épuise. Typique des efforts courts supra-seuil.",
    color: "text-violet-600 dark:text-violet-400",
  },
  central: {
    label: "Fatigue centrale",
    icon: Brain,
    explanation:
      "Le système nerveux central plafonne le recrutement musculaire. Limite mentale/perception d'effort.",
    color: "text-blue-600 dark:text-blue-400",
  },
  mixed: {
    label: "Mécanismes combinés",
    icon: Info,
    explanation:
      "Plusieurs verrous co-limitent la durée (<15% d'écart entre eux). Travail multi-axe nécessaire.",
    color: "text-foreground",
  },
};

export function TTEGlycogenInsightsCard({
  vlamax,
  vo2max,
  weightKg,
  ftp,
  vma,
  avgSpeedKmh,
  targetRaceDurationMin,
  criticalPower,
  wPrimeKj,
  sport,
  plannedCarbsGH = 60,
}: Props) {
  const insights = useMemo(() => {
    if (!vlamax || !vo2max || !weightKg) return null;

    const profile: MaderProfile = {
      vo2max,
      vlamax,
      weight: weightKg,
    };

    // Puissance cible pour TTE : FTP si dispo, sinon MLSS dérivée.
    const power = ftp && ftp > 0 ? ftp : findMLSSPower(profile);

    const mechanisms = calculateTTEMechanisms(profile, power, {
      criticalPower: criticalPower ?? undefined,
      wPrimeJ: wPrimeKj ? wPrimeKj * 1000 : undefined,
      externalCarbIntake: plannedCarbsGH,
    });

    // ── Glycogène ──
    // Vitesse moyenne pour mapper bonkRiskMin → km
    let speedKmh = avgSpeedKmh ?? null;
    if (!speedKmh) {
      if (sport === "run" && vma) {
        speedKmh = vma * 0.78; // pace tempo
      } else if (sport === "bike") {
        speedKmh = 32; // hypothèse course longue
      } else {
        speedKmh = 12;
      }
    }

    const durationMin = targetRaceDurationMin && targetRaceDurationMin > 30
      ? targetRaceDurationMin
      : Math.min(360, Math.max(60, mechanisms.tteFinal));

    // Intensité estimée à FTP/MLSS = ~75% VO2max (zone soutenable longue distance)
    const intensityPct = 75;
    const depletion = calculateGlycogenDepletion(
      profile,
      intensityPct,
      durationMin,
      plannedCarbsGH,
      speedKmh,
    );
    const recommendedCarbs = recommendedCarbsToAvoidBonk(profile, intensityPct);

    const totalKm = (durationMin / 60) * speedKmh;
    const bonkInRace =
      Number.isFinite(depletion.bonkRiskKm) &&
      depletion.bonkRiskKm > 0 &&
      depletion.bonkRiskKm < totalKm;

    return {
      mechanisms,
      power,
      depletion,
      recommendedCarbs,
      speedKmh,
      durationMin,
      bonkInRace,
      totalKm,
    };
  }, [
    vlamax,
    vo2max,
    weightKg,
    ftp,
    vma,
    avgSpeedKmh,
    targetRaceDurationMin,
    criticalPower,
    wPrimeKj,
    sport,
    plannedCarbsGH,
  ]);

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Mécanisme limitant & glycogène
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Données insuffisantes (VLamax, VO2max et poids requis).
          </p>
        </CardContent>
      </Card>
    );
  }

  const { mechanisms, power, depletion, recommendedCarbs, bonkInRace, totalKm } = insights;
  const meta = MECHANISM_META[mechanisms.limitingMechanism];
  const Icon = meta.icon;

  const limitingFactorLabel: Record<typeof depletion.limitingFactor, string> = {
    muscle_glycogen: "glycogène musculaire",
    liver_glycogen: "glycogène hépatique",
    blood_glucose: "glycémie",
    none: "aucun (apport CHO suffisant)",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Mécanisme limitant TTE & réserves glycogène
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Cible : {power} W • TTE final ~ {mechanisms.tteFinal} min •
          confiance {Math.round(mechanisms.mechanismConfidence * 100)}%
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── TTE limiting mechanism ──────────────────────────────────── */}
        <div className="rounded-lg border bg-card/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${meta.color}`} />
            <span className="text-sm font-semibold">Facteur limitant : {meta.label}</span>
            <Badge variant="outline" className="ml-auto text-[10px] font-mono">
              {Math.round(mechanisms.tteFinal)} min
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{meta.explanation}</p>

          {/* Détails par mécanisme */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
            <MechBlock label="Glycogène" value={mechanisms.tteGlycogen} highlight={mechanisms.limitingMechanism === "glycogen"} />
            <MechBlock label="Acidose" value={mechanisms.tteAcidosis} highlight={mechanisms.limitingMechanism === "acidosis"} />
            <MechBlock label="W'" value={mechanisms.tteWprime} highlight={mechanisms.limitingMechanism === "wprime"} />
            <MechBlock label="Centrale" value={mechanisms.tteCentral} highlight={mechanisms.limitingMechanism === "central"} />
          </div>

          {/* Prescription pédagogique */}
          <Alert className="bg-primary/5 border-primary/20 mt-2">
            <AlertDescription className="text-xs">
              <span className="font-semibold">Prescription : </span>
              {mechanisms.recommendation}
            </AlertDescription>
          </Alert>
        </div>

        {/* ── Glycogène (musculaire / hépatique / glycémie) ───────────── */}
        <div className="rounded-lg border bg-card/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold">Réserves glycogène</span>
            <Badge variant="outline" className="ml-auto text-[10px] font-mono">
              {plannedCarbsGH} g/h CHO planifiés
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <PoolBlock label="Muscle (g)" value={depletion.muscleGlycogenG} />
            <PoolBlock label="Foie (g)" value={depletion.liverGlycogenG} />
            <PoolBlock label="Glycémie (mmol/L)" value={depletion.bloodGlucoseMmol} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Facteur limitant projeté : <span className="font-medium">{limitingFactorLabel[depletion.limitingFactor]}</span>
            {" • "}Risque hypoglycémie : <span className="font-medium">{depletion.hypoglycemiaRisk}</span>
          </p>

          {bonkInRace ? (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">
                  ⚠️ Risque fringale estimé au km {depletion.bonkRiskKm}
                </span>
                {" "}
                (sur ~{Math.round(totalKm)} km projetés) — augmenter à <strong>{recommendedCarbs} g/h</strong> de glucides pour sécuriser.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-emerald-500/10 border-emerald-500/30">
              <AlertDescription className="text-xs">
                Réserves projetées suffisantes sur la durée cible ({Math.round(insights.durationMin)} min).
                Cible CHO recommandée : <strong>{recommendedCarbs} g/h</strong>.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MechBlock({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded border px-2 py-1 ${highlight ? "border-primary/50 bg-primary/5" : "border-border/50"}`}>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-xs">{Math.round(value)} min</div>
    </div>
  );
}

function PoolBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/50 px-2 py-1">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}
