import type { RepairIntentFamily as IntentFamily } from "./repairSportingEquivalence.ts";
const FAMILY_PATTERNS: Array<{ family: IntentFamily; rx: RegExp }> = [
  // Ordre : le plus spécifique en tête (test, race_pace avant seuil/vo2).
  // "brick" est volontairement en AVANT-DERNIÈRE position (juste avant le
  // fallback endurance_fondamentale) : la quasi-totalité des fiches de sport
  // "brick" contiennent littéralement "brick"/"BR_" dans leur id, donc placer
  // ce motif en tête (comme avant ce fix) les fait TOUTES matcher "brick" en
  // premier, avant même d'avoir la chance d'être classées par leur intention
  // réelle (race-pace, seuil, technique...). Résultat mesuré : les 32 fiches
  // brick de la bibliothèque tombaient dans UN SEUL groupe (sport×famille),
  // limitant le socle de couverture à 4 places pour TOUTE la diversité brick
  // (repos actif, race-pace, transition, race-sim...), quel que soit le
  // nombre réel d'intentions différentes présentes. En dernière priorité,
  // "brick" ne capture plus que les fiches génériques sans signal de zone/
  // intention plus spécifique (repris comme fallback légitime).
  { family: "test",                  rx: /\btest\b|assessment|\beval\b|_tt\b|time[-_\s]?trial|\bTT\b/i },
  { family: "race_pace",             rx: /race[-_\s]?pace|race[-_\s]?sim|allure\s*(marathon|semi|10k|ironman|half|course|specifique)|sp[eé]cifique\s*(marathon|semi|10k|70\.3|IM)|repetition\s*generale|dress[-_\s]?rehearsal/i },
  // Explicit over-under is a mixed stimulus, NEVER a pure threshold/VO2 alias.
  { family: "mixed_intensity",       rx: /\bover[-_\s]?under\b|\bsous[-_\s]?sur\s*seuil\b/i },
  { family: "fatmax",                rx: /fatmax|fat[-_\s]?max|train[-_\s]?low|fasted|jeun/i },
  { family: "sprint",                rx: /\bsprint\b|neuromuscul|pmax|_PMAX_|strides?|acceleration/i },
  { family: "vo2",                   rx: /\bvo2(?:max)?\b|\bvma\b|30[-_\s]?30|15[-_\s]?15|hill[-_\s]?repeat|c[oô]tes\s*courtes|intervalles?\s*courts/i },
  { family: "seuil",                 rx: /\bseuil\b|threshold|sv2|sweet[-_\s]?spot|\btempo\b|norwegian|over[-_\s]?under|MLSS|CSS/i },
  { family: "force",                 rx: /\bforce\b|strength|renfo|nordic|isometric|pap_|swim[-_\s]?cord|\bppg\b|\bcore\b|gainage|hypertroph/i },
  { family: "technique",             rx: /technique|\bdrill\b|[eé]ducatif|gammes|proprio|mobilit|educatifs/i },
  { family: "recuperation",          rx: /\brecup\b|r[eé]cup|recovery|repos\s*actif|active[-_\s]?recovery/i },
  { family: "brick",                 rx: /\bbrick\b|_BR_|^BR_|enchainement/i },
  { family: "endurance_fondamentale",rx: /endurance\s*(?:fondament|foncier|longue|base|a[eé]robie)|sortie\s*longue|\bSL\b|long[-_\s]?(?:run|ride|swim)|volume\s*a[eé]robie|steady\s*long|z2[-_\s]?(?:long|volume|continu|easy)|nage\s*continue|continuous/i },
];

const EASY_ONLY_FAMILIES = new Set<IntentFamily>(["technique", "endurance_fondamentale"]);

export interface IntentEvidenceClassification {
  family: IntentFamily;
  source: "pattern" | "zone_fallback" | "unclassified";
}

/**
 * Classifie une preuve textuelle déjà matérialisée (séance finale, métadonnée
 * de réparation, etc.) avec les mêmes règles que le catalogue. Le résultat
 * distingue un motif explicite du simple fallback de zone : les contrôles de
 * traçabilité peuvent ainsi refuser de présenter une déduction faible comme
 * une intention vérifiée.
 */
export function classifyIntentEvidence(text: string, mainZoneMax = 0): IntentEvidenceClassification {
  for (const { family, rx } of FAMILY_PATTERNS) {
    if (EASY_ONLY_FAMILIES.has(family) && mainZoneMax >= 4) continue;
    if (rx.test(text)) return { family, source: "pattern" };
  }
  if (mainZoneMax > 0 && mainZoneMax <= 2) {
    return { family: "endurance_fondamentale", source: "zone_fallback" };
  }
  return { family: "other", source: "unclassified" };
}

