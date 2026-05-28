/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE™ — COURSE À PIED (TFCL Method™)
 * 
 * Ce module NE calcule PAS un temps magique.
 * Il définit ce qui est : AUTORISÉ / RISQUÉ / INTERDIT
 * 
 * CONCEPT OFFICIEL:
 * Le Pacing Envelope™ est la plage d'intensité et d'allure
 * dans laquelle l'athlète peut évoluer SANS déclencher un coût métabolique
 * irréversible avant la fin de la course.
 * 
 * DÉPENDANCES:
 * - Distance
 * - VLamax_run
 * - Durabilité
 * - Potentiel Physiologique
 * - Profil de risque
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PotentielRun, ReadinessState } from "./potentielTypes";
import type { RunningPhysioProfile } from "./runningDoubleLoop";
import { computePacingEnvelope, type AmbitionLevel } from "./pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RunningDistance = "10K" | "HM" | "MARATHON";
export type PacingZoneRun = "GREEN" | "ORANGE" | "RED";
export type AthleteExperience = "LOW" | "MEDIUM" | "HIGH";

export interface PacingInputsRun {
  distance: RunningDistance;
  vlamax_run_v2: number | null;          // 0.20-0.80
  vo2max_run: number | null;             // ml/kg/min
  threshold_pace: number | null;         // sec/km (ex: 270 = 4'30"/km)
  durability_index: number | null;       // minutes (TTE run)
  race_readiness_state: ReadinessState;
  race_readiness_score: number;          // 0-100
  athlete_experience: AthleteExperience;

  // ─────────────────────────────────────────────────────────────────────────────
  // CHANTIER C — Pont vers le moteur unifié (tous optionnels, fallback safe)
  // ─────────────────────────────────────────────────────────────────────────────
  /** Niveau d'ambition pour calibrer %CS soutenable (Smyth 2022). Défaut COMPETITOR. */
  ambition?: AmbitionLevel | null;
  /** VMA en km/h — sinon estimée depuis threshold_pace */
  vma?: number | null;
  /** Critical Power running (W/kg) ou estimation indirecte */
  cpWkg?: number | null;
  /** W' anaérobie running (J/kg) */
  wPrimeJkg?: number | null;
  /** Durée prédite de la course en minutes — sinon fallback distance */
  predictedDurationMin?: number | null;
}

export interface PacingZoneDefinitionRun {
  zone: PacingZoneRun;
  label: string;
  description: string;
  rangePctThreshold: [number, number];   // [min, max] % du seuil
  rangeSecPerKm?: [number, number];      // Allure en sec/km
  color: string;
  message: string;
  riskLevel: number;                     // 0-100
}

export interface PacingRulesRun {
  first_third: {
    max_intensity_pct: number;
    forbidden_zone: PacingZoneRun;
    rule: string;
  };
  middle_third: {
    allowed_variation_pct: number;
    rule: string;
  };
  last_third: {
    conditional_push_allowed: boolean;
    conditions: string[];
    rule: string;
  };
}

export interface PacingScenarioRun {
  type: "DISCIPLINED" | "OPTIMISTIC" | "AGGRESSIVE";
  label: string;
  description: string;
  pacing_profile: {
    first_third_pct: number;
    middle_third_pct: number;
    last_third_pct: number;
  };
  estimated_success_rate: number;        // 0-100%
  risk_warning: string | null;
  trajectory: Array<{ distancePct: number; intensityPct: number }>;
}

export interface PacingBriefingRun {
  key_phrase: string;
  rules_max_3: string[];
  message_to_remember: string;
  visualization_message: string;
}

export interface PacingEnvelopeRunResult {
  // Données d'entrée
  distance: RunningDistance;
  threshold_pace_sec_km: number | null;
  
  // Zones de pacing
  zones: PacingZoneDefinitionRun[];
  
  // Bornes canoniques en %seuil (alignées avec ObjectiveStrategyCard / RaceStrategyPlanCard).
  // Permet de partitionner les 3 scénarios de simulation avec les MÊMES ancres que Plan A/B.
  boundary_pct_threshold: {
    lowPct: number;
    centerPct: number;
    highPct: number;
    toleratedPct: number;
  };
  
  // Règles de discipline
  rules: PacingRulesRun;
  
  // 3 scénarios
  scenarios: PacingScenarioRun[];
  
  // Briefing athlète
  briefing: PacingBriefingRun;
  
  // Métadonnées
  discipline_required: boolean;
  discipline_level: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  
  // Confiance
  confidence: number;
  sources_used: string[];
  missing_data: string[];
  
  // Textes officiels
  disclaimer: string;
  methodology: string;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES — BORNES PAR DISTANCE
// ═══════════════════════════════════════════════════════════════════════════════

// Intensités en % du seuil (threshold pace)
const ZONE_BOUNDARIES: Record<RunningDistance, {
  green: [number, number];
  orange: [number, number];
  red: [number, number];
}> = {
  MARATHON: {
    green: [88, 92],
    orange: [92, 95],
    red: [95, 105],
  },
  HM: {
    green: [90, 94],
    orange: [94, 97],
    red: [97, 105],
  },
  "10K": {
    green: [92, 96],
    orange: [96, 100],
    red: [100, 110],
  },
};

// Modulation VLamax
const VLAMAX_MODIFIERS = {
  HIGH: { threshold: 0.45, green_shrink: -2, orange_shift: -2 },
  LOW: { threshold: 0.30, green_expand: 2, allow_aggressive_finish: true },
} as const;

// Modulation Potentiel Physiologique
const READINESS_MODIFIERS: Record<ReadinessState, {
  green_reduction: number;
  orange_label: string;
  forbidden_before_pct: number;
}> = {
  GREEN: { green_reduction: 0, orange_label: "Conditionnelle", forbidden_before_pct: 0 },
  ORANGE: { green_reduction: 2, orange_label: "Très conditionnelle", forbidden_before_pct: 50 },
  RED: { green_reduction: 4, orange_label: "Déconseillée", forbidden_before_pct: 100 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTES OFFICIELS
// ═══════════════════════════════════════════════════════════════════════════════

const PACING_TEXTS = {
  disclaimer: `TFCL ne cherche pas l'allure parfaite, mais l'allure la plus robuste jusqu'à la ligne.`,
  
  methodology: `Le Pacing Envelope™ CAP est calculé via le moteur unifié TFCL™ (Chantier C):
• Centre = modèle continu %CS f(durée, ambition) — Smyth & Muniz-Pumares 2022
• Largeur asymétrique haut/bas — Skiba 2024 (W'-balance dynamics)
• Conversion %VMA → %seuil via vCS/vVMA = 0.90 (Jones-Vanhatalo 2017)
• Modulation VLamax CAP, Durabilité, Potentiel Physiologique`,
  
  lorang_quote: `"Si tu te sens facile au km 5, TU NE CHANGES RIEN. La course commence après le km 30."`,
  
  discipline_message: `La discipline de pacing n'est pas une limitation — c'est une stratégie de performance.
L'erreur précoce coûte toujours plus cher qu'elle ne rapporte.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function pctThresholdToSecPerKm(thresholdPace: number, pct: number): number {
  // Plus le % est haut, plus l'allure est rapide (sec/km plus bas)
  // threshold = 100%, donc à 95% → allure = threshold * (100/95)
  return Math.round(thresholdPace * (100 / pct));
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computePacingEnvelopeRun(inputs: PacingInputsRun): PacingEnvelopeRunResult {
  const {
    distance,
    vlamax_run_v2,
    vo2max_run,
    threshold_pace,
    durability_index,
    race_readiness_state,
    race_readiness_score,
    athlete_experience,
  } = inputs;

  const sourcesUsed: string[] = [];
  const missingData: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // CHANTIER C — STEP 1-4 UNIFIÉS via le moteur générique (Smyth/Skiba/W'-balance)
  // Bornes calculées par computePacingEnvelope, puis converties %VMA → %seuil
  // via vCS/vVMA = 0.90 (Jones-Vanhatalo 2017).
  // ─────────────────────────────────────────────────────────────────────────────
  const RACE_OBJ_MAP = { "10K": "10km", HM: "Semi", MARATHON: "Marathon" } as const;
  const RACE_DURATION_FALLBACK_MIN: Record<RunningDistance, number> = {
    "10K": 45, HM: 105, MARATHON: 210,
  };

  const readinessScoreApprox =
    race_readiness_score > 0
      ? race_readiness_score
      : race_readiness_state === "GREEN" ? 80
      : race_readiness_state === "ORANGE" ? 65
      : 45;

  const VCS_OVER_VMA = 0.90;
  const unifiedEnvelope = computePacingEnvelope({
    vlamaxEffectif: vlamaxEffectifBridge as never,
    tteEffectif: tteEffectifBridge as never,
    fatmax: null,
    potentielPhysiologiqueScore: readinessScoreApprox,
    fatigueIndex: null,
    raceObjective: RACE_OBJ_MAP[distance],
    sport: "run",
    vma: inputs.vma ?? null,
    paceThreshold: threshold_pace,
    ambition: inputs.ambition ?? null,
    cpWkg: inputs.cpWkg ?? null,
    wPrimeJkg: inputs.wPrimeJkg ?? null,
    predictedDurationMin: inputs.predictedDurationMin ?? RACE_DURATION_FALLBACK_MIN[distance],
  });

  // Conversion %VMA → %seuil (1/0.90 ≈ 1.111). Bornes physiologiques.
  const toPctSeuil = (pctVMA: number): number => clamp(pctVMA / VCS_OVER_VMA, 60, 115);

  let green: [number, number];
  let orange: [number, number];
  let red: [number, number];
  let centerPctSeuil: number;
  let toleratedPctSeuil: number;
  let allowAggressiveFinish = false;

  if (unifiedEnvelope) {
    sourcesUsed.push(...unifiedEnvelope.sourcesUsed);
    missingData.push(...unifiedEnvelope.missingData);
    const b = unifiedEnvelope.boundary;
    green = [Math.round(toPctSeuil(b.lowPct)), Math.round(toPctSeuil(b.highPct))];
    centerPctSeuil = Math.round(toPctSeuil(b.centerPct));
    toleratedPctSeuil = Math.round(toPctSeuil(b.toleratedPct));
    orange = [green[1], toleratedPctSeuil];
    red = [orange[1], Math.round(Math.min(orange[1] + 8, 115))];
    allowAggressiveFinish =
      race_readiness_state !== "RED" &&
      b.asymmetryRatio >= 0.85 &&
      !(vlamax_run_v2 != null && vlamax_run_v2 > 0.55 && distance === "MARATHON");
  } else {
    const baseBounds = ZONE_BOUNDARIES[distance];
    green = [...baseBounds.green] as [number, number];
    orange = [...baseBounds.orange] as [number, number];
    red = [...baseBounds.red] as [number, number];
    centerPctSeuil = Math.round((green[0] + green[1]) / 2);
    toleratedPctSeuil = orange[1];
    missingData.push("Moteur unifié indisponible — fallback statique");
  }


  // Lecture passive Potentiel Physio pour les labels conditionnels (orange_label, etc.)
  const readinessMod = READINESS_MODIFIERS[race_readiness_state];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Construire les zones
  // ─────────────────────────────────────────────────────────────────────────────
  const zones: PacingZoneDefinitionRun[] = [
    {
      zone: "GREEN",
      label: "Zone Verte — Sustainable",
      description: "Effort tenable jusqu'à la ligne d'arrivée",
      rangePctThreshold: green,
      rangeSecPerKm: threshold_pace ? [
        pctThresholdToSecPerKm(threshold_pace, green[1]),
        pctThresholdToSecPerKm(threshold_pace, green[0]),
      ] : undefined,
      color: "hsl(var(--success))",
      message: "Reste ici — c'est la zone de performance robuste",
      riskLevel: 15,
    },
    {
      zone: "ORANGE",
      label: `Zone Orange — ${readinessMod.orange_label}`,
      description: "Effort possible mais avec coût cumulatif",
      rangePctThreshold: [green[1], orange[1]],
      rangeSecPerKm: threshold_pace ? [
        pctThresholdToSecPerKm(threshold_pace, orange[1]),
        pctThresholdToSecPerKm(threshold_pace, green[1]),
      ] : undefined,
      color: "hsl(var(--warning))",
      message: readinessMod.forbidden_before_pct > 0 
        ? `Interdit avant ${readinessMod.forbidden_before_pct}% de la course` 
        : "Utilisable uniquement si pacing parfait jusque-là",
      riskLevel: 55,
    },
    {
      zone: "RED",
      label: "Zone Rouge — Unsustainable",
      description: "Déclenchement probable de dérive lactate / glycogène",
      rangePctThreshold: red,
      rangeSecPerKm: threshold_pace ? [
        pctThresholdToSecPerKm(threshold_pace, red[1]),
        pctThresholdToSecPerKm(threshold_pace, red[0]),
      ] : undefined,
      color: "hsl(var(--destructive))",
      message: "INTERDIT en début de course — coût irréversible",
      riskLevel: 90,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Règles de discipline (Lorang-style)
  // ─────────────────────────────────────────────────────────────────────────────
  const rules: PacingRulesRun = {
    first_third: {
      max_intensity_pct: green[1],
      forbidden_zone: "RED",
      rule: `JAMAIS entrer en zone rouge avant 33% de la course. Max: ${green[1]}% du seuil.`,
    },
    middle_third: {
      allowed_variation_pct: 2,
      rule: "Maintenir l'allure stable. Variation max: ±2% autour du centre de l'enveloppe.",
    },
    last_third: {
      conditional_push_allowed: allowAggressiveFinish && race_readiness_state !== "RED",
      conditions: [
        "VLamax basse confirmée",
        "Potentiel Physiologique GREEN ou ORANGE haut",
        "Aucune dérive cardiaque détectée",
      ],
      rule: allowAggressiveFinish && race_readiness_state !== "RED"
        ? "Negative split autorisé : montée progressive vers le haut de l'enveloppe"
        : "Maintenir la discipline — ne pas accélérer sans confirmation physiologique",
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Générer les 3 scénarios
  // ─────────────────────────────────────────────────────────────────────────────
  const centerGreen = (green[0] + green[1]) / 2;
  
  const scenarios: PacingScenarioRun[] = [
    {
      type: "DISCIPLINED",
      label: "Scénario Discipliné — Negative Split",
      description: "Départ contenu, montée progressive vers le haut de l'enveloppe — standard élite (Hanley 2020)",
      pacing_profile: {
        first_third_pct: green[0],
        middle_third_pct: centerGreen,
        last_third_pct: green[1],
      },
      estimated_success_rate: race_readiness_state === "GREEN" ? 92 : race_readiness_state === "ORANGE" ? 85 : 70,
      risk_warning: null,
      trajectory: generateTrajectory("DISCIPLINED", green, orange),
    },
    {
      type: "OPTIMISTIC",
      label: "Scénario Optimiste",
      description: "Touche l'orange tardivement — performance possible mais fragile",
      pacing_profile: {
        first_third_pct: centerGreen,
        middle_third_pct: green[1],
        last_third_pct: orange[0] + 1,
      },
      estimated_success_rate: race_readiness_state === "GREEN" ? 75 : race_readiness_state === "ORANGE" ? 60 : 40,
      risk_warning: "Risque de dérive si fatigue précoce",
      trajectory: generateTrajectory("OPTIMISTIC", green, orange),
    },
    {
      type: "AGGRESSIVE",
      label: "Scénario Agressif",
      description: "Rouge précoce — maximise le risque d'effondrement",
      pacing_profile: {
        first_third_pct: green[1] + 2,
        middle_third_pct: orange[1],
        last_third_pct: red[0],
      },
      estimated_success_rate: race_readiness_state === "GREEN" ? 45 : race_readiness_state === "ORANGE" ? 25 : 10,
      risk_warning: "⚠️ Ce scénario maximise le risque d'effondrement. Non recommandé.",
      trajectory: generateTrajectory("AGGRESSIVE", green, orange),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: Générer le briefing athlète
  // ─────────────────────────────────────────────────────────────────────────────
  const briefing = generateBriefing(distance, green, race_readiness_state, threshold_pace);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 9: Calculer le niveau de discipline requis
  // ─────────────────────────────────────────────────────────────────────────────
  let disciplineLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" = "MODERATE";
  
  if (race_readiness_state === "RED" || (vlamax_run_v2 != null && vlamax_run_v2 > 0.50)) {
    disciplineLevel = "VERY_HIGH";
  } else if (race_readiness_state === "ORANGE" || distance === "MARATHON") {
    disciplineLevel = "HIGH";
  } else if (distance === "10K" && race_readiness_state === "GREEN") {
    disciplineLevel = "LOW";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 10: Calcul confiance
  // ─────────────────────────────────────────────────────────────────────────────
  let confidence = 0.5;
  if (vlamax_run_v2 != null) confidence += 0.15;
  if (durability_index != null) confidence += 0.15;
  if (threshold_pace != null) confidence += 0.1;
  if (vo2max_run != null) confidence += 0.1;
  confidence = clamp(confidence, 0.4, 0.95);

  return {
    distance,
    threshold_pace_sec_km: threshold_pace,
    zones,
    rules,
    scenarios,
    briefing,
    discipline_required: disciplineLevel !== "LOW",
    discipline_level: disciplineLevel,
    confidence,
    sources_used: sourcesUsed,
    missing_data: missingData,
    disclaimer: PACING_TEXTS.disclaimer,
    methodology: PACING_TEXTS.methodology,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — GÉNÉRATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateTrajectory(
  type: "DISCIPLINED" | "OPTIMISTIC" | "AGGRESSIVE",
  green: [number, number],
  orange: [number, number]
): Array<{ distancePct: number; intensityPct: number }> {
  const centerGreen = (green[0] + green[1]) / 2;
  
  switch (type) {
    case "DISCIPLINED":
      // Negative split: démarrage sous le centre, finition au plafond vert
      return [
        { distancePct: 0, intensityPct: green[0] },
        { distancePct: 10, intensityPct: green[0] + 0.5 },
        { distancePct: 33, intensityPct: green[0] + (centerGreen - green[0]) * 0.6 },
        { distancePct: 50, intensityPct: centerGreen },
        { distancePct: 66, intensityPct: centerGreen + (green[1] - centerGreen) * 0.5 },
        { distancePct: 80, intensityPct: green[1] - 0.5 },
        { distancePct: 100, intensityPct: green[1] },
      ];
    case "OPTIMISTIC":
      return [
        { distancePct: 0, intensityPct: centerGreen },
        { distancePct: 10, intensityPct: centerGreen + 1 },
        { distancePct: 33, intensityPct: green[1] },
        { distancePct: 50, intensityPct: green[1] },
        { distancePct: 66, intensityPct: green[1] + 1 },
        { distancePct: 80, intensityPct: orange[0] },
        { distancePct: 100, intensityPct: orange[0] + 1 },
      ];
    case "AGGRESSIVE":
      return [
        { distancePct: 0, intensityPct: green[1] + 2 },
        { distancePct: 10, intensityPct: orange[0] },
        { distancePct: 33, intensityPct: orange[1] },
        { distancePct: 50, intensityPct: orange[1] + 2 },
        { distancePct: 66, intensityPct: orange[1] + 3 },
        { distancePct: 80, intensityPct: orange[1] + 1 }, // Effondrement simulé
        { distancePct: 100, intensityPct: green[1] }, // Récupération forcée
      ];
  }
}

function generateBriefing(
  distance: RunningDistance,
  green: [number, number],
  readiness: ReadinessState,
  thresholdPace: number | null
): PacingBriefingRun {
  const distanceLabels: Record<RunningDistance, string> = {
    "10K": "10 km",
    HM: "semi-marathon",
    MARATHON: "marathon",
  };
  
  const distanceKeyMoments: Record<RunningDistance, string> = {
    "10K": "5 km",
    HM: "15 km",
    MARATHON: "30 km",
  };

  const keyPhrase = distance === "MARATHON"
    ? `Si tu te sens facile au km 10, TU NE CHANGES RIEN. La course commence après le km 30.`
    : distance === "HM"
    ? `Si tu te sens facile au km 5, TU NE CHANGES RIEN. Le semi se court après le km 15.`
    : `Reste dans l'enveloppe les 5 premiers km. C'est là que la course se gagne ou se perd.`;

  const rules: string[] = [];
  
  // Règle 1 : Zone interdite
  rules.push(`Interdit de sortir de la zone verte avant ${distanceKeyMoments[distance]}`);
  
  // Règle 2 : Allure si disponible
  if (thresholdPace) {
    const targetPace = pctThresholdToSecPerKm(thresholdPace, (green[0] + green[1]) / 2);
    rules.push(`Allure cible : ${formatPace(targetPace)} (±5 sec/km max)`);
  } else {
    rules.push(`Intensité cible : ${Math.round((green[0] + green[1]) / 2)}% du seuil`);
  }
  
  // Règle 3 : Readiness
  if (readiness === "RED") {
    rules.push(`Aujourd'hui : objectif = finir. Pas de performance.`);
  } else if (readiness === "ORANGE") {
    rules.push(`Discipline renforcée : aucun dépassement avant 50% de course`);
  } else {
    rules.push(`Negative split autorisé dans le dernier tiers si tout va bien`);
  }

  return {
    key_phrase: keyPhrase,
    rules_max_3: rules.slice(0, 3),
    message_to_remember: PACING_TEXTS.lorang_quote,
    visualization_message: `La zone verte est ton ami. L'orange est un invité occasionnel. Le rouge est interdit.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export { formatPace, pctThresholdToSecPerKm };

export const PACING_ZONE_COLORS: Record<PacingZoneRun, string> = {
  GREEN: "hsl(142, 76%, 36%)",
  ORANGE: "hsl(38, 92%, 50%)",
  RED: "hsl(0, 84%, 60%)",
};

export const PACING_ZONE_LABELS: Record<PacingZoneRun, string> = {
  GREEN: "Sustainable",
  ORANGE: "Conditionnel",
  RED: "Interdit",
};
