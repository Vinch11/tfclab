// =============================================
// Volume Ramp × Charge Récente — cohérence rampe de volume / charge réelle
// =============================================
// Constat (audit sprint qualité Marathon/Ironman, oct. 2026) : la rampe de
// volume Sem 1 (`volumeRamp`, planConfigBuilder.ts) ne lit QUE le
// `trainingLevel` déclaré par le coach — jamais la Charge Récente de
// Référence (CRR, `chargeRecenteReference.ts`), pourtant calculée juste à
// côté. Le prompt envoie déjà au modèle deux blocs d'instructions adjacents
// mais non réconciliés pour la même décision (vitesse de montée en charge
// Sem 1-2) : le bloc "CHARGE RÉCENTE" donne une consigne dépendante du statut
// CRR, le bloc "RAMPE DE VOLUME OBLIGATOIRE" l'ignore complètement.
//
// Ce module ferme cet écart SANS introduire de règle universelle rigide :
// il ne déclasse le niveau déclaré que lorsqu'une donnée de charge RÉELLEMENT
// MESURÉE (source NOLIO ou SNAPSHOT, jamais une estimation manuelle dérivée
// du niveau lui-même — sinon la comparaison serait circulaire) contredit ce
// niveau. Un athlète sans historique de charge (cas fréquent pour un nouvel
// athlète) n'est jamais pénalisé : seule une preuve réelle contraire change
// le comportement par défaut.

import type { ChargeRecenteReference, ChargeScore } from "./chargeRecenteReference";

export type CoachTrainingLevel = "untrained" | "light" | "trained" | "highly_trained";

const LEVEL_ORDER: CoachTrainingLevel[] = ["untrained", "light", "trained", "highly_trained"];

export interface VolumeRampLoadAdjustment {
  /** Niveau effectivement utilisé pour choisir la ligne de la matrice de rampe. */
  effectiveLevel: CoachTrainingLevel;
  /** true si effectiveLevel diffère du niveau déclaré par le coach. */
  triggered: boolean;
  /** Raison lisible par le coach/le modèle — présente seulement si triggered. */
  reason?: string;
  /** Plafond de progression hebdomadaire à utiliser à la place du défaut (0.10), si l'ajustement le réduit. */
  weeklyIncreasePctMaxOverride?: number;
}

/**
 * Ne fait AUCUN ajustement si la CRR ne provient pas d'une mesure réelle —
 * évite la circularité : quand aucune donnée n'existe, `computeCRR()` dérive
 * une estimation manuelle À PARTIR du `trainingLevel` déclaré lui-même
 * (planConfigBuilder.ts), donc comparer cette estimation au niveau déclaré
 * ne détecterait jamais rien d'utile — seulement l'écho de la saisie.
 */
function isRealMeasuredLoad(crr: ChargeRecenteReference): boolean {
  return crr.source === "NOLIO" || crr.source === "SNAPSHOT";
}

export function resolveVolumeRampLoadAdjustment(
  declaredLevel: CoachTrainingLevel,
  crr: ChargeRecenteReference,
  chargeStatus: ChargeScore["status"],
): VolumeRampLoadAdjustment {
  if (!isRealMeasuredLoad(crr)) {
    return { effectiveLevel: declaredLevel, triggered: false };
  }

  const idx = LEVEL_ORDER.indexOf(declaredLevel);

  // Surcharge réelle mesurée : le texte du prompt (bloc CHARGE RÉCENTE) impose
  // déjà "NE PAS dépasser +5-7 TSS/sem, prévoir 1 semaine d'allègement avant
  // montée en charge" — une rampe agressive ("trained"/"highly_trained":
  // 80-95% dès Sem 1, 1-2 semaines) serait directement contradictoire.
  // Plafonné à "light" (jamais relevé si déjà "untrained").
  if (chargeStatus === "overload" && idx > 1) {
    return {
      effectiveLevel: "light",
      triggered: true,
      reason: `Charge récente réelle mesurée en surcharge (${crr.label}) malgré un niveau déclaré "${declaredLevel}" — rampe plafonnée au niveau "light" et progression limitée à +7%/sem, conformément à la consigne charge récente (allègement avant remontée).`,
      weeklyIncreasePctMaxOverride: 0.07,
    };
  }

  // Charge réelle mesurée franchement sous la cible de l'objectif : le texte
  // dit déjà "pas de saut brutal de volume sur S1-S2" — un palier plus
  // conservateur (une marche en dessous du niveau déclaré) réconcilie la
  // rampe avec cette consigne existante, sans jamais descendre sous
  // "untrained".
  if (chargeStatus === "low" && idx > 0) {
    const steppedDown = LEVEL_ORDER[idx - 1];
    return {
      effectiveLevel: steppedDown,
      triggered: true,
      reason: `Charge récente réelle mesurée basse (${crr.label}) pour un niveau déclaré "${declaredLevel}" — rampe calculée sur le palier "${steppedDown}" par prudence (pas de saut brutal de volume en S1-S2).`,
    };
  }

  // "optimal" / "high" (mesurés) : cohérents avec une déclaration raisonnable,
  // ou déjà couverts par le cap existant de la matrice — aucun changement.
  return { effectiveLevel: declaredLevel, triggered: false };
}
