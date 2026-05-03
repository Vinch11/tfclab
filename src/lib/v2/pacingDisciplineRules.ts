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
    {
      id: "semi_finish_18_21",
      category: "tactical",
      priority: "recommended",
      title: "Finish km 18-21",
      message:
        "Push autorisé sur les 3 derniers km uniquement si FC < 95 % FCmax au km 18 et fraîcheur intacte. Sinon : tenir l'allure cible. Le finish kick semi est un bonus, pas un objectif.",
      icon: "🏁",
      source: "Format Semi — Littérature élite",
    },
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
    {
      id: "10k_last_2k",
      category: "non_negotiable",
      priority: "important",
      title: "Finish kick — standard",
      message: "Les 2 derniers km doivent être les plus rapides. Le finish kick est la norme physiologique sur 10K (Hanley 2020), pas un bonus conditionnel.",
      icon: "🏁",
      source: "Format 10 km — Littérature élite",
    },
  ],
};

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
  // Profil "élite-like" : low VLamax + niveau elite/competitor → autorise negative split modeste
  const eliteLike =
    (ambition === "elite" || ambition === "competitor") &&
    (vlamaxValue == null || vlamaxValue < 0.45);

  if (ambition === "elite" && eliteLike) {
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
  const { envelope, vlamaxEffectif, raceObjective, sport, potentielPhysiologiqueScore, ambition } = input;
  
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
