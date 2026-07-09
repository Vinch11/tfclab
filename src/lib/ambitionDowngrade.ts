// =============================================
// Ambition Downgrade — cohérence Ambition × Niveau d'entraînement
// Applique une seule mutation en amont (ambitionEffective = min(saisie, max(niveau)))
// Tout ce qui dérive de l'ambition (volume, qualités/sem, prescriptions) doit
// consommer `ambitionEffective`. La saisie utilisateur reste exposée pour
// afficher le "gap vers l'objectif visé" (GapAmbitionPanel).
// =============================================

import type { AmbitionLevel } from "@/types/ambitionLevel";
import {
  AMBITION_DEFINITIONS,
  AMBITION_LEVELS_ORDERED,
  normalizeAmbitionLevel,
} from "@/types/ambitionLevel";

// Ordre canonique croissant : découverte < confirmé < compétiteur < qualifiable < elite
// (utilise les clés internes historiques du projet)
export const AMBITION_ORDER: AmbitionLevel[] = [...AMBITION_LEVELS_ORDERED];

export type CoachTrainingLevel =
  | "untrained"
  | "light"
  | "trained"
  | "highly_trained";

// Matrice ambition maximale autorisée par niveau d'entraînement.
// `null` = aucun plafond (elite/world_class autorisé).
export const AMBITION_MAX_BY_LEVEL: Record<CoachTrainingLevel, AmbitionLevel | null> = {
  untrained:      "finisher",     // Découverte
  light:          "age_group",    // Confirmé
  trained:        "elite",        // Qualifiable
  highly_trained: null,           // Aucune limite
};

// Conversion TSS 7j → niveau équivalent (bornes prudentes).
export function deriveTrainingLevelFromTSS(tss7d: number | null | undefined): CoachTrainingLevel | null {
  if (tss7d == null || !Number.isFinite(tss7d) || tss7d <= 0) return null;
  if (tss7d < 150) return "untrained";
  if (tss7d < 350) return "light";
  if (tss7d < 600) return "trained";
  return "highly_trained";
}

export type TrainingLevelSource = "manual" | "auto-tss" | "fallback-prudent";

export interface EffectiveTrainingLevel {
  level: CoachTrainingLevel;
  source: TrainingLevelSource;
}

export function resolveEffectiveTrainingLevel(
  trainingLevel: CoachTrainingLevel | "auto" | null | undefined,
  tss7d: number | null | undefined,
): EffectiveTrainingLevel {
  if (trainingLevel && trainingLevel !== "auto") {
    return { level: trainingLevel as CoachTrainingLevel, source: "manual" };
  }
  const fromTss = deriveTrainingLevelFromTSS(tss7d);
  if (fromTss) return { level: fromTss, source: "auto-tss" };
  console.warn("⚠️ TSS indisponible, niveau fallback prudent appliqué");
  return { level: "light", source: "fallback-prudent" };
}

function ambitionRank(a: AmbitionLevel): number {
  const idx = AMBITION_ORDER.indexOf(a);
  return idx >= 0 ? idx : 0;
}

function ambitionMin(a: AmbitionLevel, b: AmbitionLevel): AmbitionLevel {
  return ambitionRank(a) <= ambitionRank(b) ? a : b;
}

const TRAINING_LEVEL_LABELS: Record<CoachTrainingLevel, string> = {
  untrained:      "reprise",
  light:          "1-3 séances/sem",
  trained:        "régulier",
  highly_trained: "pic de forme",
};

export interface AmbitionResolution {
  ambitionSaisie: AmbitionLevel;
  ambitionEffective: AmbitionLevel;
  downgraded: boolean;
  effectiveTrainingLevel: CoachTrainingLevel;
  trainingLevelSource: TrainingLevelSource;
  /** Note lisible destinée au Diagnostic TFCL du plan. */
  diagnosticNote: string | null;
  /** Label court "Qualifiable → Confirmé" ou null si inchangé. */
  downgradeArrow: string | null;
}

export function computeAmbitionEffective(params: {
  ambitionSaisie: unknown;
  trainingLevel: CoachTrainingLevel | "auto" | null | undefined;
  tss7d: number | null | undefined;
}): AmbitionResolution {
  const ambitionSaisie = normalizeAmbitionLevel(params.ambitionSaisie);
  const { level: effectiveTrainingLevel, source: trainingLevelSource } =
    resolveEffectiveTrainingLevel(params.trainingLevel, params.tss7d);

  const cap = AMBITION_MAX_BY_LEVEL[effectiveTrainingLevel];
  const ambitionEffective = cap ? ambitionMin(ambitionSaisie, cap) : ambitionSaisie;
  const downgraded = ambitionEffective !== ambitionSaisie;

  let diagnosticNote: string | null = null;
  let downgradeArrow: string | null = null;

  if (downgraded) {
    const saisieLabel = AMBITION_DEFINITIONS[ambitionSaisie].label;
    const effLabel = AMBITION_DEFINITIONS[ambitionEffective].label;
    const lvlLabel = TRAINING_LEVEL_LABELS[effectiveTrainingLevel];
    downgradeArrow = `${saisieLabel} → ${effLabel}`;
    diagnosticNote =
      `Ambition ajustée ${saisieLabel} → ${effLabel} en cohérence avec le ` +
      `niveau d'entraînement déclaré (${lvlLabel}). ` +
      `La physiologie commande, l'ambition module la structure.`;
    const trainingLevelLabelsFull: Record<CoachTrainingLevel, string> = {
      untrained:      "Pas du tout entraîné",
      light:          "Un peu entraîné",
      trained:        "Bien entraîné",
      highly_trained: "Très chargé",
    };
    console.log(
      `⬇️ Ambition déclassée : ${saisieLabel} (${ambitionSaisie}) → ${effLabel} (${ambitionEffective}) ` +
      `[niveau=${trainingLevelLabelsFull[effectiveTrainingLevel]} (${effectiveTrainingLevel})` +
      `${trainingLevelSource === "auto-tss" ? " · auto-TSS" : trainingLevelSource === "fallback-prudent" ? " · fallback prudent" : ""}]`
    );
      `⬇️ Ambition déclassée : ${ambitionSaisie} → ${ambitionEffective} ` +
      `(niveau=${effectiveTrainingLevel}${trainingLevelSource === "auto-tss" ? " · auto-TSS" : ""})`
    );
  }

  return {
    ambitionSaisie,
    ambitionEffective,
    downgraded,
    effectiveTrainingLevel,
    trainingLevelSource,
    diagnosticNote,
    downgradeArrow,
  };
}
