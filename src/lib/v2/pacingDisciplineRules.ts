/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING DISCIPLINE RULES™ — Règles Comportementales Style Dan Lorang
 * Two For Coaching Lab Method™
 * 
 * PHILOSOPHIE:
 * "Les 30 premières minutes sont NON NÉGOCIABLES."
 * "Laisser partir les autres est une stratégie."
 * "Ce profil métabolique ne tolère pas les pics précoces."
 * 
 * PRINCIPE:
 * Génère automatiquement des règles non négociables, phrases coach et
 * interdictions claires basées sur le profil métabolique de l'athlète.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective } from "./pacingEnvelopeEngine";
import type { VLamaxEffectif } from "../vlamaxEffectif";
import { normalizeAmbitionLevel, type AmbitionLevel } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleCategory = "non_negotiable" | "coach_phrase" | "prohibition" | "tactical";
export type RulePriority = "critical" | "important" | "recommended";

export interface DisciplineRule {
  id: string;
  category: RuleCategory;
  priority: RulePriority;
  title: string;
  message: string;
  icon: string;
  context?: string; // Quand appliquer cette règle
  source?: string;  // D'où vient cette règle (e.g., "VLamax basse", "Ironman")
}

export interface DisciplineRulesResult {
  // Règles générées
  rules: DisciplineRule[];
  
  // Regroupement par catégorie
  nonNegotiables: DisciplineRule[];
  coachPhrases: DisciplineRule[];
  prohibitions: DisciplineRule[];
  tacticals: DisciplineRule[];
  
  // Badge profil sensible
  showSensitiveBadge: boolean;
  sensitiveMessage: string | null;
  
  // Résumé
  primaryMessage: string;
  ruleCount: number;
}

export interface DisciplineRulesInput {
  envelope: PacingEnvelopeResult;
  vlamaxEffectif: VLamaxEffectif | null;
  raceObjective: RaceObjective;
  sport: "bike" | "run";
  potentielPhysiologiqueScore?: number | null;
  /** Niveau d'ambition athlète — module la règle even/negative split sur l'IM run */
  ambition?: AmbitionLevel | string | null;
  /** TTE effective (min) — module les deltas de negative split personnalisés */
  tteMin?: number | null;
  /**
   * Données live des segments précédents (semi-marathon).
   * Si fournies, conditionne dynamiquement le finish km 18-21.
   * Si absentes, fallback sur estimation prédictive via VLamax/TTE/fatigue.
   */
  liveSegments?: SemiLiveSegments | null;
  /** FC max athlète (bpm) — requis pour évaluation finish */
  fcMaxBpm?: number | null;
  /** Niveau de fatigue ressenti pré-course 1-10 (mapping standard TFCL) */
  fatigueLevel?: number | null;
}

/**
 * Données live segment-par-segment du semi-marathon.
 * Toutes les valeurs sont optionnelles : le moteur s'adapte aux données dispo.
 */
export interface SemiLiveSegments {
  /** Allure km 0-5 en sec/km */
  pace_km0_5_sec?: number | null;
  /** Allure km 5-10 en sec/km */
  pace_km5_10_sec?: number | null;
  /** Allure km 10-18 en sec/km */
  pace_km10_18_sec?: number | null;
  /** Allure cible course en sec/km */
  pace_target_sec?: number | null;
  /** FC moyenne km 10-18 (bpm) */
  hr_km10_18_bpm?: number | null;
  /** FC moyenne km 5-10 (bpm) — pour calculer la dérive cardiaque */
  hr_km5_10_bpm?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES - RÈGLES UNIVERSELLES
// ═══════════════════════════════════════════════════════════════════════════════

const UNIVERSAL_RULES: DisciplineRule[] = [
  {
    id: "first_30_min",
    category: "non_negotiable",
    priority: "critical",
    title: "Les 30 premières minutes",
    message: "Les 30 premières minutes sont NON NÉGOCIABLES. Rester impérativement dans la zone optimale.",
    icon: "⏱️",
    source: "Philosophie Dan Lorang",
  },
  {
    id: "let_others_go",
    category: "tactical",
    priority: "important",
    title: "Laisser partir",
    message: "Laisser partir les autres est une stratégie, pas un échec.",
    icon: "🧠",
    source: "Philosophie Dan Lorang",
  },
  {
    id: "discipline_over_power",
    category: "coach_phrase",
    priority: "important",
    title: "Discipline vs Puissance",
    message: "La discipline prime sur la puissance instantanée.",
    icon: "💪",
    source: "Méthodologie TFCL",
  },
];

// Règles par format de course
const RACE_SPECIFIC_RULES: Record<RaceObjective, DisciplineRule[]> = {
  IM: [
    {
      id: "im_first_hour",
      category: "non_negotiable",
      priority: "critical",
      title: "Première heure vélo",
      message: "La première heure vélo conditionne tout le marathon. Aucune exception.",
      icon: "🚴",
      context: "Segment vélo Ironman",
      source: "Format Ironman",
    },
    {
      id: "im_save_legs",
      category: "tactical",
      priority: "important",
      title: "Préserver les jambes",
      message: "Chaque watt économisé sur le vélo est une minute gagnée sur le marathon.",
      icon: "🏃",
      context: "Transition T2",
      source: "Format Ironman",
    },
    {
      id: "im_no_hero",
      category: "prohibition",
      priority: "critical",
      title: "Pas de mode héros",
      message: "Le mode héros sur le vélo = marche sur le marathon. Interdit.",
      icon: "🚫",
      source: "Format Ironman",
    },
    // Règle "im_run_even_split" injectée dynamiquement selon ambition (voir buildIronmanRunSplitRule).
  ],
  "70.3": [
    {
      id: "703_controlled_start",
      category: "non_negotiable",
      priority: "critical",
      title: "Départ contrôlé",
      message: "Départ vélo à -5% sous le plafond de l'enveloppe. Montée progressive.",
      icon: "📈",
      source: "Format 70.3",
    },
    {
      id: "703_last_20k",
      category: "tactical",
      priority: "important",
      title: "Derniers 20 km vélo",
      message: "Les derniers 20 km vélo se courent dans les 10 premiers km CAP.",
      icon: "🔄",
      source: "Format 70.3",
    },
    {
      id: "703_run_even_split",
      category: "non_negotiable",
      priority: "critical",
      title: "Semi 70.3 — even split minimum",
      message: "Premiers 5 km à allure cible exacte (pas plus rapide). Push autorisé seulement après 15 km si fraîcheur intacte.",
      icon: "🏃",
      source: "Format 70.3 — run",
    },
  ],
  Marathon: [
    // marathon_negative_split injecté dynamiquement (delta calibré VLamax + TTE)
    {
      id: "marathon_30k_wall",
      category: "non_negotiable",
      priority: "critical",
      title: "Mur du 30e km",
      message: "Tout se joue avant le 30e km. Arriver frais au mur = le traverser.",
      icon: "🧱",
      source: "Format Marathon",
    },
    {
      id: "marathon_no_pk_push",
      category: "prohibition",
      priority: "critical",
      title: "Pas de push au PK",
      message: "Aucune accélération sur le premier kilomètre sous peine de sanction métabolique.",
      icon: "🚫",
      source: "Format Marathon",
    },
  ],
  Semi: [
    {
      id: "semi_even_split_norm",
      category: "non_negotiable",
      priority: "critical",
      title: "Semi — quasi-even split / reverse split modeste",
      message:
        "Tendance littérature 2020-2024 (Hanley, Casado, Diaz) : sur semi-marathon, 70-80 % des podiums élites affichent un split quasi-symétrique (Δ ≤ ±1 %) ou un léger positive split (+1 à +2 %, dit \"reverse split modéré\"), pas un negative split agressif. Cible : 2ème moitié à allure cible ±1 %.",
      icon: "⚖️",
      source: "Format Semi — Littérature élite 2020-2024",
    },
    {
      id: "semi_first_5k",
      category: "non_negotiable",
      priority: "critical",
      title: "5 premiers km — allure cible -2 à -3 sec/km",
      message:
        "Départ à allure cible MOINS 2-3 sec/km seulement (pas -10). Verrouiller le rythme dès le km 3. Un départ trop conservateur (>5 sec/km plus lent) interdit le retour à allure cible sans sur-coût glycolytique.",
      icon: "🎯",
      source: "Format Semi-Marathon",
    },
    {
      id: "semi_lock_10_18",
      category: "non_negotiable",
      priority: "important",
      title: "Verrou km 10-18",
      message:
        "Section km 10 → 18 : maintenir l'allure cible ±1 %. Aucune accélération, aucune dérive. C'est la zone où se joue la performance, pas le finish.",
      icon: "🔒",
      source: "Format Semi-Marathon",
    },
    // semi_finish_18_21 injecté dynamiquement (cf. buildSemiFinishKickRule)
  ],
  "10km": [
    {
      id: "10k_controlled_2k",
      category: "non_negotiable",
      priority: "critical",
      title: "2 premiers km contrôlés",
      message: "2 premiers km = installation du rythme. Pas de départ explosif.",
      icon: "⏱️",
      source: "Format 10 km",
    },
    // 10k_last_2k injecté dynamiquement (delta calibré VLamax + TTE)
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SPLIT DELTA PERSONNALISÉ — fonction de VLamax + TTE
// ─────────────────────────────────────────────────────────────────────────────
// Principes (Hanley 2020, Casado 2021, Skiba 2014, Mader-Heck) :
//   • VLamax basse (< 0.40) → réserve glycolytique faible → finish kick limité
//     → delta ↓ (cible plus modeste, sécuritaire)
//   • VLamax haute (> 0.55) → réserve glycolytique large → finish kick possible
//     → delta ↑ (mais attention au coût glycogène)
//   • TTE court vs durée course → fatigue précoce → delta ↓
//   • TTE généreux vs durée course → marge → delta ↑
// Bornes : Marathon 0.5–4 %, 10K 0.3–2.5 %.
// ═══════════════════════════════════════════════════════════════════════════════
export interface NegativeSplitDelta {
  minPct: number;        // borne basse delta % (2ème moitié plus rapide)
  maxPct: number;        // borne haute delta %
  targetPct: number;     // cible centrale
  rationale: string;     // texte explicatif court
  confidence: "low" | "medium" | "high";
  /** Origine de chaque entrée : "observed" (athlète) ou "default" (littérature) */
  vlamaxSource: "observed" | "default";
  tteSource: "observed" | "default";
  /** Valeurs effectivement utilisées (utiles pour debug / UI) */
  vlamaxUsed: number;
  tteUsedMin: number;
}

// ─── Valeurs de fallback documentées ───────────────────────────────────────────
// VLamax défaut : 0.45 mmol/L/s = profil mixte endurant (Mader-Heck, médian
//   triathlètes/coureurs longue distance — Heck 1985, Hauser 2014).
// TTE défaut : ratio TTE/durée course = 0.85 (zone "limite" prudente),
//   correspond à un athlète moyennement entraîné qui arrive à puissance critique
//   un peu avant la fin (Skiba 2014, Jones 2019).
const VLAMAX_DEFAULT = 0.45;
const TTE_RATIO_DEFAULT = 0.85;

export function computeNegativeSplitDelta(
  format: "Marathon" | "10km",
  vlamaxValue: number | null,
  tteMin: number | null,
  raceDurationMin: number,
): NegativeSplitDelta {
  // Bornes physiologiques par format (littérature)
  const bounds = format === "Marathon"
    ? { absMin: 0.5, absMax: 4.0, baseMin: 1.0, baseMax: 3.0 }
    : { absMin: 0.3, absMax: 2.5, baseMin: 0.5, baseMax: 2.0 };

  // ─── Résolution VLamax avec fallback documenté ─────────────────────────────
  const vlamaxSource: "observed" | "default" = vlamaxValue != null ? "observed" : "default";
  const vlamaxUsed = vlamaxValue ?? VLAMAX_DEFAULT;

  let vlamaxFactor: number;
  let vlamaxNote: string;
  if (vlamaxUsed < 0.35) { vlamaxFactor = 0.6; vlamaxNote = `VLamax basse (${vlamaxUsed.toFixed(2)}) → finish kick limité`; }
  else if (vlamaxUsed < 0.45) { vlamaxFactor = 0.85; vlamaxNote = `VLamax modérée (${vlamaxUsed.toFixed(2)})`; }
  else if (vlamaxUsed < 0.55) { vlamaxFactor = 1.0; vlamaxNote = `VLamax équilibrée (${vlamaxUsed.toFixed(2)})`; }
  else if (vlamaxUsed < 0.65) { vlamaxFactor = 1.15; vlamaxNote = `VLamax haute (${vlamaxUsed.toFixed(2)}) → réserve glycolytique`; }
  else { vlamaxFactor = 1.3; vlamaxNote = `VLamax très haute (${vlamaxUsed.toFixed(2)}) → forte réserve mais coût glycogène`; }
  if (vlamaxSource === "default") {
    vlamaxNote = `VLamax non mesurée → défaut littérature ${VLAMAX_DEFAULT.toFixed(2)} (Mader-Heck, profil mixte)`;
  }

  // ─── Résolution TTE avec fallback documenté ────────────────────────────────
  const tteSource: "observed" | "default" = (tteMin != null && raceDurationMin > 0) ? "observed" : "default";
  const tteUsedMin = tteSource === "observed"
    ? (tteMin as number)
    : Math.round(raceDurationMin * TTE_RATIO_DEFAULT);

  let tteFactor: number;
  let tteNote: string;
  if (raceDurationMin > 0) {
    const ratio = tteUsedMin / raceDurationMin;
    if (ratio < 0.5) { tteFactor = 0.7; tteNote = `TTE faible (${tteUsedMin}min vs ${raceDurationMin}min course) → finish prudent`; }
    else if (ratio < 0.8) { tteFactor = 0.9; tteNote = `TTE limite (ratio ${ratio.toFixed(2)})`; }
    else if (ratio < 1.1) { tteFactor = 1.0; tteNote = `TTE adéquate (ratio ${ratio.toFixed(2)})`; }
    else { tteFactor = 1.15; tteNote = `TTE confortable (ratio ${ratio.toFixed(2)}) → marge pour push`; }
  } else {
    tteFactor = 1.0;
    tteNote = "TTE non évaluable (durée course manquante)";
  }
  if (tteSource === "default") {
    tteNote = `TTE non mesurée → défaut ratio ${TTE_RATIO_DEFAULT} × durée course (≈ ${tteUsedMin}min, Skiba 2014)`;
  }

  // ─── Application combinée ──────────────────────────────────────────────────
  const combined = vlamaxFactor * tteFactor;
  let minPct = bounds.baseMin * combined;
  let maxPct = bounds.baseMax * combined;

  // Clamp dans bornes physiologiques absolues
  minPct = Math.max(bounds.absMin, Math.min(bounds.absMax, minPct));
  maxPct = Math.max(bounds.absMin, Math.min(bounds.absMax, maxPct));
  if (maxPct < minPct + 0.3) maxPct = Math.min(bounds.absMax, minPct + 0.5);

  // Si AUCUN paramètre observé → on resserre la cible vers le centre littérature
  // pour éviter de présenter une recommandation trop précise basée sur des défauts.
  if (vlamaxSource === "default" && tteSource === "default") {
    minPct = bounds.baseMin;
    maxPct = bounds.baseMax;
  }

  const targetPct = (minPct + maxPct) / 2;

  // ─── Confiance ─────────────────────────────────────────────────────────────
  const confidence: NegativeSplitDelta["confidence"] =
    vlamaxSource === "observed" && tteSource === "observed" ? "high" :
    vlamaxSource === "observed" || tteSource === "observed" ? "medium" : "low";

  return {
    minPct: Math.round(minPct * 10) / 10,
    maxPct: Math.round(maxPct * 10) / 10,
    targetPct: Math.round(targetPct * 10) / 10,
    rationale: `${vlamaxNote} • ${tteNote}`,
    confidence,
    vlamaxSource,
    tteSource,
    vlamaxUsed: Math.round(vlamaxUsed * 100) / 100,
    tteUsedMin,
  };
}

function sourceTag(delta: NegativeSplitDelta): string {
  const v = delta.vlamaxSource === "observed" ? "VLamax mesurée" : "VLamax défaut";
  const t = delta.tteSource === "observed" ? "TTE mesurée" : "TTE défaut";
  return `${v} + ${t}`;
}

function buildMarathonNegativeSplitRule(delta: NegativeSplitDelta): DisciplineRule {
  const fallbackPrefix = delta.confidence === "low"
    ? "⚠ Calibration générique (aucune donnée athlète) — "
    : delta.confidence === "medium"
    ? "Calibration partielle — "
    : "";
  return {
    id: "marathon_negative_split",
    category: "non_negotiable",
    priority: "critical",
    title: `Negative split personnalisé — cible ${delta.targetPct}%`,
    message:
      `${fallbackPrefix}Viser un negative split de ${delta.minPct}–${delta.maxPct} % (cible ${delta.targetPct} %). ` +
      `Calibration : ${delta.rationale}. Référence : Hanley 2020, Casado 2021 (delta médian podiums marathon = 1.8 %).`,
    icon: "📊",
    source: `Marathon — ${sourceTag(delta)} [confiance ${delta.confidence}]`,
  };
}

function build10kFinishKickRule(delta: NegativeSplitDelta): DisciplineRule {
  const fallbackPrefix = delta.confidence === "low"
    ? "⚠ Calibration générique (aucune donnée athlète) — "
    : delta.confidence === "medium"
    ? "Calibration partielle — "
    : "";
  return {
    id: "10k_last_2k",
    category: "non_negotiable",
    priority: "important",
    title: `Finish kick personnalisé — ${delta.minPct}–${delta.maxPct}%`,
    message:
      `${fallbackPrefix}Les 2 derniers km doivent être ${delta.minPct}–${delta.maxPct} % plus rapides que les 8 premiers (cible ${delta.targetPct} %). ` +
      `Calibration : ${delta.rationale}. Norme physiologique 10K (Hanley 2020).`,
    icon: "🏁",
    source: `10K — ${sourceTag(delta)} [confiance ${delta.confidence}]`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IRONMAN RUN — RÈGLE EVEN vs NEGATIVE SPLIT CALIBRÉE PAR AMBITION
// ─────────────────────────────────────────────────────────────────────────────
// Littérature: Angehrn et al. (2022), Le Meur et al. (2011), Rüst et al. (2013).
// → Ironman = course glycogène-limitée. Le "negative split agressif" du marathon
//   pur ne s'applique PAS. La majorité des sub-9 et podiums AG affichent un
//   ralentissement progressif de 3 à 8 % entre 1ère et 2ème moitié du marathon.
// → Stratégie optimale : départ retenu (under-pace) pour limiter la casse,
//   even split visé, le "negative split" n'est réaliste que pour les élites
//   à VLamax basse + glycogène très bien géré sur le vélo.
// ═══════════════════════════════════════════════════════════════════════════════
function buildIronmanRunSplitRule(
  ambition: AmbitionLevel,
  vlamaxValue: number | null,
): DisciplineRule {
  // Profil "élite-like" : low VLamax + niveau world_class/elite/competitor → autorise negative split modeste
  const eliteLike =
    (ambition === "world_class" || ambition === "elite" || ambition === "competitor") &&
    (vlamaxValue == null || vlamaxValue < 0.45);

  if ((ambition === "world_class" || ambition === "elite") && eliteLike) {
    return {
      id: "im_run_even_split",
      category: "non_negotiable",
      priority: "critical",
      title: "Marathon IM Élite — negative split contrôlé",
      message:
        "Premiers 10 km à -3 à -5 % sous l'allure cible (≈ 5–8 sec/km plus lent). Stabiliser à allure cible sur 10–30 km. Push autorisé seulement après 32 km si glycogène et FC tiennent. Référence : Angehrn 2022, podiums Kona sub-8h45.",
      icon: "🏃",
      source: "Format Ironman run — Ambition Élite",
    };
  }

  if (ambition === "competitor") {
    return {
      id: "im_run_even_split",
      category: "non_negotiable",
      priority: "critical",
      title: "Marathon IM Compétiteur — even split prioritaire",
      message:
        "Premiers 10 km à -4 à -6 % sous l'allure cible (≈ 8–12 sec/km plus lent). Objectif : even split sur les 32 premiers km. Le negative split est un bonus, pas une cible. Tout départ à allure cible = effondrement quasi-garanti après 25 km.",
      icon: "🏃",
      source: "Format Ironman run — Ambition Compétiteur",
    };
  }

  if (ambition === "age_group") {
    return {
      id: "im_run_even_split",
      category: "non_negotiable",
      priority: "critical",
      title: "Marathon IM Age-Group — départ retenu obligatoire",
      message:
        "Premiers 10 km à -6 à -10 % sous l'allure cible (≈ 12–20 sec/km plus lent). Accepter un léger positive split (≤ +5 %) est physiologique et conforme à la littérature (Angehrn 2022 : 78 % des AG sub-11h ralentissent de 3–8 %). Priorité : éviter la marche après 30 km.",
      icon: "🏃",
      source: "Format Ironman run — Ambition Age-Group",
    };
  }

  // finisher (et fallback)
  return {
    id: "im_run_even_split",
    category: "non_negotiable",
    priority: "critical",
    title: "Marathon IM Finisher — survie & nutrition",
    message:
      "Démarrer à -10 à -15 % sous l'allure cible. Marche planifiée à chaque ravitaillement (30 sec). Objectif : finir en courant, pas en marchant. Un positive split de +5 à +10 % est attendu et acceptable.",
    icon: "🏃",
    source: "Format Ironman run — Ambition Finisher",
  };
}

/**
 * Génère les règles de discipline de pacing basées sur le profil
 */
export function generateDisciplineRules(input: DisciplineRulesInput): DisciplineRulesResult {
  const { envelope, vlamaxEffectif, raceObjective, sport, potentielPhysiologiqueScore, ambition, tteMin } = input;
  
  const rules: DisciplineRule[] = [...UNIVERSAL_RULES];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Règles spécifiques au format de course
  // ─────────────────────────────────────────────────────────────────────────────
  const raceRules = RACE_SPECIFIC_RULES[raceObjective] || [];
  rules.push(...raceRules);

  // 1.bis — Injection règle IM run calibrée ambition (uniquement segment run)
  if (raceObjective === "IM" && sport === "run") {
    const ambitionLevel = normalizeAmbitionLevel(ambition);
    rules.push(buildIronmanRunSplitRule(ambitionLevel, vlamaxEffectif?.value ?? null));
  }

  // 1.ter — Negative split delta personnalisé (Marathon + 10K)
  const RACE_DURATION_REF: Partial<Record<RaceObjective, number>> = {
    Marathon: 210,  // 3h30 référence
    "10km": 45,     // 45 min référence
  };
  if (raceObjective === "Marathon" || raceObjective === "10km") {
    const delta = computeNegativeSplitDelta(
      raceObjective,
      vlamaxEffectif?.value ?? null,
      tteMin ?? null,
      RACE_DURATION_REF[raceObjective] ?? 180,
    );
    if (raceObjective === "Marathon") {
      rules.push(buildMarathonNegativeSplitRule(delta));
    } else {
      rules.push(build10kFinishKickRule(delta));
    }
  }

  // 1.quater — Semi-marathon finish km 18-21 conditionnel (FC + fatigue)
  if (raceObjective === "Semi") {
    const assessment = assessSemiFinishKick(
      input.liveSegments ?? null,
      input.fcMaxBpm ?? null,
      vlamaxEffectif?.value ?? null,
      tteMin ?? null,
      input.fatigueLevel ?? null,
      potentielPhysiologiqueScore ?? null,
    );
    rules.push(buildSemiFinishKickRule(assessment));
  }



  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Règles basées sur VLamax
  // ─────────────────────────────────────────────────────────────────────────────
  const vlamaxValue = vlamaxEffectif?.value ?? null;
  let showSensitiveBadge = false;
  let sensitiveMessage: string | null = null;

  if (vlamaxValue != null) {
    if (vlamaxValue < 0.35) {
      // Profil très sensible
      showSensitiveBadge = true;
      sensitiveMessage = "Ce profil métabolique offre un rendement élevé mais une faible tolérance aux erreurs. La discipline prime sur la puissance instantanée.";
      
      rules.push({
        id: "low_vlamax_critical",
        category: "non_negotiable",
        priority: "critical",
        title: "Profil sensible détecté",
        message: "Ce profil métabolique ne tolère pas les pics précoces. Chaque dépassement coûte cher.",
        icon: "🟣",
        source: `VLamax ${vlamaxValue.toFixed(2)}`,
      });
      
      rules.push({
        id: "low_vlamax_strict",
        category: "prohibition",
        priority: "critical",
        title: "Tolérance zéro",
        message: `Toute dérive > +${Math.round(envelope.envelopeWidth)}% pendant plus de 2 minutes est interdite.`,
        icon: "⛔",
        source: "VLamax basse",
      });
    } else if (vlamaxValue < 0.45) {
      // Profil modéré
      rules.push({
        id: "moderate_vlamax",
        category: "coach_phrase",
        priority: "important",
        title: "Gestion fine requise",
        message: "Ce profil demande une gestion fine du pacing. Éviter les à-coups.",
        icon: "📏",
        source: `VLamax ${vlamaxValue.toFixed(2)}`,
      });
    } else if (vlamaxValue > 0.55) {
      // Profil tolérant mais attention
      rules.push({
        id: "high_vlamax_warning",
        category: "coach_phrase",
        priority: "recommended",
        title: "Tolérance ≠ Liberté",
        message: "Ce profil absorbe mieux les écarts mais le glycogène reste limité. Discipline maintenue.",
        icon: "⚠️",
        source: `VLamax ${vlamaxValue.toFixed(2)}`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Règles basées sur l'enveloppe
  // ─────────────────────────────────────────────────────────────────────────────
  const { boundary, envelopeWidth } = envelope;
  
  rules.push({
    id: "envelope_definition",
    category: "non_negotiable",
    priority: "important",
    title: "Couloir de pacing",
    message: `Rester entre ${boundary.lowPct}% et ${boundary.highPct}% (centre: ${boundary.centerPct}%).`,
    icon: "📐",
    source: "Pacing Envelope™",
  });

  if (envelopeWidth <= 5) {
    rules.push({
      id: "narrow_envelope",
      category: "prohibition",
      priority: "critical",
      title: "Enveloppe étroite",
      message: `Enveloppe très étroite (±${envelopeWidth}%). Marge d'erreur quasi-nulle.`,
      icon: "🎯",
      source: "Profil métabolique",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Règles Potentiel Physiologique
  // ─────────────────────────────────────────────────────────────────────────────
  if (potentielPhysiologiqueScore != null && potentielPhysiologiqueScore < 70) {
    rules.push({
      id: "low_readiness",
      category: "tactical",
      priority: "critical",
      title: "Readiness réduit",
      message: "Aujourd'hui, la robustesse prime sur l'ambition. Scénario conservateur conseillé.",
      icon: "🛡️",
      source: `Readiness ${potentielPhysiologiqueScore}%`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Règle générique dérive
  // ─────────────────────────────────────────────────────────────────────────────
  const driftLimit = vlamaxValue != null && vlamaxValue < 0.4 ? 5 : 10;
  const driftDuration = vlamaxValue != null && vlamaxValue < 0.4 ? 3 : 5;
  
  rules.push({
    id: "drift_prohibition",
    category: "prohibition",
    priority: "critical",
    title: "Limite de dérive",
    message: `Toute dérive > +${driftLimit}% pendant plus de ${driftDuration} minutes est interdite.`,
    icon: "📉",
    source: "Règle TFCL",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Regroupement par catégorie
  // ─────────────────────────────────────────────────────────────────────────────
  const nonNegotiables = rules.filter(r => r.category === "non_negotiable");
  const coachPhrases = rules.filter(r => r.category === "coach_phrase");
  const prohibitions = rules.filter(r => r.category === "prohibition");
  const tacticals = rules.filter(r => r.category === "tactical");

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Message principal
  // ─────────────────────────────────────────────────────────────────────────────
  let primaryMessage: string;
  if (showSensitiveBadge) {
    primaryMessage = "Profil sensible au pacing — discipline maximale requise.";
  } else if (potentielPhysiologiqueScore != null && potentielPhysiologiqueScore < 70) {
    primaryMessage = "Readiness modéré — approche conservatrice recommandée.";
  } else {
    primaryMessage = `Couloir de pacing défini : ${boundary.lowPct}–${boundary.highPct}%`;
  }

  return {
    rules,
    nonNegotiables,
    coachPhrases,
    prohibitions,
    tacticals,
    showSensitiveBadge,
    sensitiveMessage,
    primaryMessage,
    ruleCount: rules.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getCategoryColor(category: RuleCategory): string {
  switch (category) {
    case "non_negotiable":
      return "text-red-600 dark:text-red-400";
    case "prohibition":
      return "text-orange-600 dark:text-orange-400";
    case "coach_phrase":
      return "text-blue-600 dark:text-blue-400";
    case "tactical":
      return "text-green-600 dark:text-green-400";
    default:
      return "text-muted-foreground";
  }
}

export function getCategoryBgColor(category: RuleCategory): string {
  switch (category) {
    case "non_negotiable":
      return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800";
    case "prohibition":
      return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800";
    case "coach_phrase":
      return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800";
    case "tactical":
      return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800";
    default:
      return "bg-muted";
  }
}

export function getCategoryLabel(category: RuleCategory): string {
  switch (category) {
    case "non_negotiable":
      return "Non négociable";
    case "prohibition":
      return "Interdit";
    case "coach_phrase":
      return "Coach";
    case "tactical":
      return "Tactique";
    default:
      return category;
  }
}

export function getPriorityIcon(priority: RulePriority): string {
  switch (priority) {
    case "critical":
      return "🔴";
    case "important":
      return "🟠";
    case "recommended":
      return "🟢";
    default:
      return "⚪";
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// SEMI-MARATHON — FINISH KICK CONDITIONNEL
// ─────────────────────────────────────────────────────────────────────────────
// Modèle physiologique :
//   1) Si données live (FC + allures segments précédents) → décision "live"
//   2) Sinon → estimation prédictive via VLamax + TTE + fatigue pré-course
//
// Critères GO finish km 18-21 :
//   • FC km 10-18 < 95 % FCmax (ou drift FC 5→10 → 10→18 < 4 %)
//   • Aucune dérive pace > +1.5 % entre km 5-10 et km 10-18
//   • Niveau fatigue prédit (estimateFatigueLoad) ≤ 7/10
//
// Ref. : Hanley 2020, Casado 2021, Saunders 2004 (cardiac drift = proxy fatigue).
// ═══════════════════════════════════════════════════════════════════════════════
type FinishDecision = "GO" | "CAUTION" | "HOLD";

interface FinishKickAssessment {
  decision: FinishDecision;
  fcLoadPct: number | null;       // % FCmax estimé/observé au km 18
  hrDriftPct: number | null;      // dérive FC % entre 5-10 et 10-18
  paceDriftPct: number | null;    // dérive allure % entre 5-10 et 10-18
  fatigueScore: number;           // 1-10 (estimé ou prédit)
  source: "live" | "predictive";
  reasons: string[];
}

function assessSemiFinishKick(
  liveSegments: SemiLiveSegments | null | undefined,
  fcMaxBpm: number | null | undefined,
  vlamaxValue: number | null,
  tteMin: number | null,
  fatigueLevel: number | null | undefined,
  potentielScore: number | null | undefined,
): FinishKickAssessment {
  // ─── Mode LIVE : données segments dispo ───────────────────────────────────
  const hasLive =
    liveSegments &&
    (liveSegments.hr_km10_18_bpm != null ||
      (liveSegments.pace_km10_18_sec != null && liveSegments.pace_km5_10_sec != null));

  if (hasLive) {
    const reasons: string[] = [];
    let fcLoadPct: number | null = null;
    let hrDriftPct: number | null = null;
    let paceDriftPct: number | null = null;

    if (liveSegments!.hr_km10_18_bpm != null && fcMaxBpm) {
      fcLoadPct = (liveSegments!.hr_km10_18_bpm / fcMaxBpm) * 100;
      reasons.push(`FC km 10-18 = ${Math.round(fcLoadPct)} % FCmax`);
    }
    if (liveSegments!.hr_km5_10_bpm && liveSegments!.hr_km10_18_bpm) {
      hrDriftPct = ((liveSegments!.hr_km10_18_bpm - liveSegments!.hr_km5_10_bpm) / liveSegments!.hr_km5_10_bpm) * 100;
      reasons.push(`Dérive FC = +${hrDriftPct.toFixed(1)} %`);
    }
    if (liveSegments!.pace_km5_10_sec && liveSegments!.pace_km10_18_sec) {
      paceDriftPct = ((liveSegments!.pace_km10_18_sec - liveSegments!.pace_km5_10_sec) / liveSegments!.pace_km5_10_sec) * 100;
      reasons.push(`Dérive allure = ${paceDriftPct >= 0 ? "+" : ""}${paceDriftPct.toFixed(1)} %`);
    }

    let decision: FinishDecision = "GO";
    if (fcLoadPct != null && fcLoadPct >= 95) { decision = "HOLD"; reasons.push("FC saturée"); }
    else if (fcLoadPct != null && fcLoadPct >= 92) { decision = "CAUTION"; }
    if (hrDriftPct != null && hrDriftPct > 5) { decision = decision === "GO" ? "CAUTION" : "HOLD"; reasons.push("Drift cardiaque élevé"); }
    if (paceDriftPct != null && paceDriftPct > 1.5) { decision = "HOLD"; reasons.push("Pace déjà en perte"); }

    return {
      decision,
      fcLoadPct,
      hrDriftPct,
      paceDriftPct,
      fatigueScore: fatigueLevel ?? 5,
      source: "live",
      reasons,
    };
  }

  // ─── Mode PRÉDICTIF : estimation à partir profil + fatigue pré-course ─────
  // Estimation FC % FCmax au km 18 (modèle simple) :
  //   - Base 88 % FCmax (allure cible semi)
  //   - + drift attendu en fonction VLamax (haute = +2 %, basse = +1 %)
  //   - + ajustement fatigue (chaque point au-dessus de 4 = +0.7 %)
  //   - + ajustement readiness (chaque 10 pts sous 80 = +1 %)
  const baseFc = 88;
  const vlamaxAdj = vlamaxValue != null ? (vlamaxValue > 0.55 ? 2.5 : vlamaxValue > 0.45 ? 1.8 : 1.2) : 1.5;
  const fatAdj = Math.max(0, ((fatigueLevel ?? 4) - 4)) * 0.7;
  const readinessAdj = potentielScore != null ? Math.max(0, (80 - potentielScore) / 10) : 0;
  const tteAdj = tteMin != null ? (tteMin < 60 ? 1.5 : tteMin < 80 ? 0.5 : 0) : 0.5;

  const predFcLoad = baseFc + vlamaxAdj + fatAdj + readinessAdj + tteAdj;

  // Score fatigue prédit (1-10)
  const predFatigue = Math.min(
    10,
    (fatigueLevel ?? 4) +
      (potentielScore != null && potentielScore < 70 ? 1.5 : 0) +
      (tteMin != null && tteMin < 70 ? 1 : 0),
  );

  let decision: FinishDecision = "GO";
  const reasons: string[] = [
    `FC prédite km 18 ≈ ${Math.round(predFcLoad)} % FCmax`,
    `Fatigue prédite ${predFatigue.toFixed(1)}/10`,
  ];
  if (predFcLoad >= 95) { decision = "HOLD"; reasons.push("Saturation cardiaque attendue"); }
  else if (predFcLoad >= 92 || predFatigue > 7) { decision = "CAUTION"; }

  return {
    decision,
    fcLoadPct: predFcLoad,
    hrDriftPct: null,
    paceDriftPct: null,
    fatigueScore: predFatigue,
    source: "predictive",
    reasons,
  };
}

function buildSemiFinishKickRule(assessment: FinishKickAssessment): DisciplineRule {
  const sourceLabel = assessment.source === "live" ? "Données live segments" : "Estimation prédictive (profil + fatigue)";
  const reasonsTxt = assessment.reasons.join(" • ");

  if (assessment.decision === "GO") {
    return {
      id: "semi_finish_18_21",
      category: "tactical",
      priority: "recommended",
      title: "Finish km 18-21 — GO ✅",
      message: `Push autorisé : accélérer progressivement à allure cible -2 à -4 sec/km sur les 3 derniers km. ${reasonsTxt}.`,
      icon: "🏁",
      source: `Semi finish — ${sourceLabel}`,
    };
  }

  if (assessment.decision === "CAUTION") {
    return {
      id: "semi_finish_18_21",
      category: "non_negotiable",
      priority: "important",
      title: "Finish km 18-21 — PRUDENCE ⚠️",
      message: `Push limité : tenir l'allure cible jusqu'au km 19, push uniquement km 20-21 si la respiration reste contrôlée. ${reasonsTxt}.`,
      icon: "⚠️",
      source: `Semi finish — ${sourceLabel}`,
    };
  }

  return {
    id: "semi_finish_18_21",
    category: "prohibition",
    priority: "critical",
    title: "Finish km 18-21 — HOLD 🛑",
    message: `Push interdit : tenir l'allure cible jusqu'à l'arrivée. Toute accélération aboutirait à un effondrement. ${reasonsTxt}.`,
    icon: "🛑",
    source: `Semi finish — ${sourceLabel}`,
  };
}
