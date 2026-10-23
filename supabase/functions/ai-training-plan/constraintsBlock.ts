// =============================================================================
// CONTRAINTES ATHLÈTE — bloc prompt HAUTE PRIORITÉ (miroir edge de
// src/lib/plan/constraintRules.ts). Le champ libre "Contraintes" du formulaire
// n'était injecté qu'en une puce noyée en fin de diagnostic → très faible
// adhérence du modèle. On le remonte ici en bloc dur, en tête de prompt,
// répété sur CHAQUE chunk.
// =============================================================================

export type WeekDay =
  | "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";

const WEEK_DAYS: WeekDay[] = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
];

export type ConstraintSport = "run" | "bike" | "swim" | "strength" | "any";

export interface DayBan { day: WeekDay; sport: ConstraintSport; source: string }

export interface AthleteConstraintRules {
  dayBans: DayBan[];
  bannedSports: ConstraintSport[];
  injuries: string[];
  rawText: string;
  hasHardRules: boolean;
  /** Sprint 2 (audit "fiabilisation moteur", 2026-10-23) — miroir client,
   *  cf. constraintRules.ts pour la docstring complète : fragments où un ban
   *  a été détecté mais nuancé par un qualificatif restrictif ou une
   *  réautorisation plus loin dans le texte — jamais ajoutés à `bannedSports`. */
  ambiguousRestrictions: string[];
}

const SPORT_PATTERNS: Array<{ sport: ConstraintSport; rx: RegExp }> = [
  { sport: "bike", rx: /\b(v[ée]lo|bike|cyclisme|home\s*trainer|ht)\b/i },
  { sport: "swim", rx: /\b(natation|nage|swim|piscine)\b/i },
  { sport: "strength", rx: /\b(renfo(rcement)?|muscu(lation)?|ppg|strength|gainage)\b/i },
  { sport: "run", rx: /\b(course\s*[àa]?\s*pied|running|run|cap|footing|jogging)\b/i },
];

const INJURY_ZONES = [
  "genou", "cheville", "dos", "hanche", "mollet", "achille", "tendon",
  "ischio", "quadriceps", "psoas", "épaule", "epaule", "pied", "aponévrose",
  "aponevrose", "fascia", "tibia", "périostite", "periostite", "adducteur",
];

const DAY_RX = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/gi;
const NEGATION_RX = /\b(pas|jamais|aucun[e]?|interdit[e]?s?|impossible|indisponible|exclu[e]?s?|no|sans)\b/i;
const REST_RX = /\b(repos|off|r[ée]cup(?:[ée]ration)?\s*totale|jour\s*sans)\b/i;

function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectSport(fragment: string): ConstraintSport {
  for (const { sport, rx } of SPORT_PATTERNS) if (rx.test(fragment)) return sport;
  return "any";
}

/**
 * Bug réel (B-5K-BEGINNER, Pilot Cockpit, 2026-10-13) — miroir du correctif
 * client (src/lib/plan/constraintRules.ts, même docstring complète là-bas) :
 * l'ancienne détection d'interdiction GLOBALE (sans jour précisé) considérait
 * qu'une négation et un mot-clé sportif N'IMPORTE OÙ dans le même fragment
 * suffisaient à bannir ce sport sur tout le plan. "Objectif distinct du
 * template Start-to-Run statique (jamais généré par IA en production)" a
 * ainsi été lu comme "jamais [de] Run" (le tiret de "Start-to-Run" crée une
 * frontière de mot, `\brun\b` matchait), sans aucun rapport réel. Correctif :
 * proximité grammaticale directe négation↔sport (± connecteur court réel),
 * jamais une simple co-occurrence fragment-wide.
 */
const PRE_NEGATORS_SRC =
  "(?:pas|jamais|aucun(?:e)?|interdit(?:e)?s?|impossible|indisponible|exclu(?:e)?s?|no|sans)";
const POST_NEGATORS_SRC =
  "(?:interdit(?:e)?s?|exclu(?:e)?s?|impossible|indisponible|banni(?:e)?s?)";
const CONNECTOR_SRC = "(?:\\s+(?:de|d['’]|du|des|la|le|les|toute?s?))?\\s*";
const LINKING_VERB_SRC = "(?:\\s+(?:est|sera|reste))?\\s+";

const BAN_PATTERNS: Array<{ sport: ConstraintSport; rx: RegExp }> = SPORT_PATTERNS.map(
  ({ sport, rx }) => ({
    sport,
    rx: new RegExp(
      `${PRE_NEGATORS_SRC}${CONNECTOR_SRC}${rx.source}|${rx.source}${LINKING_VERB_SRC}${POST_NEGATORS_SRC}`,
      "i",
    ),
  }),
);

function detectBannedSportStrict(fragment: string): ConstraintSport | null {
  for (const { sport, rx } of BAN_PATTERNS) {
    if (rx.test(fragment)) return sport;
  }
  return null;
}

/**
 * Sprint 2 (audit "fiabilisation moteur", 2026-10-23) — miroir client, cf.
 * constraintRules.ts pour la docstring complète : un fragment qui détecte un
 * ban ET un qualificatif restrictif (lieu/condition/durée) ne rejoint pas
 * `bannedSports` — ambiguïté probable entre interdiction totale et partielle
 * ("natation interdite EN EAU FROIDE" ≠ "natation interdite").
 */
const PARTIAL_QUALIFIER_RX = new RegExp(
  [
    "\\bsauf\\b", "\\bexcept[ée]e?\\b", "\\bhormis\\b",
    "\\bseulement\\b", "\\buniquement\\b",
    "\\ben\\s+(?:eau|mer|rivi[èe]re|lac|ext[ée]rieur|altitude|comp[ée]tition)\\b",
    "\\bopen\\s*water\\b",
    "\\ben\\s+cas\\s+de\\b", "\\bsous\\s+conditions?\\b",
    "\\btemporairement\\b", "\\bpour\\s+le\\s+moment\\b", "\\bpour\\s+l['’]instant\\b",
    "\\bjusqu['’]\\s*[aà]\\b", "\\b[àa]\\s+partir\\s+de\\b",
  ].join("|"),
  "i",
);

/** Réautorisation explicite d'un sport précédemment banni dans le même champ libre. */
const REAUTHORIZATION_RX = /\b(autoris[ée]e?s?|permis(?:e)?s?|possible|ok|tol[ée]r[ée]e?s?)\b/i;

function normalizeDay(raw: string): WeekDay | null {
  const d = deaccent(raw.toLowerCase()).trim();
  return WEEK_DAYS.find((w) => deaccent(w) === d) ?? null;
}

export function parseAthleteConstraints(text: string | null | undefined): AthleteConstraintRules {
  const rawText = String(text ?? "").trim();
  const rules: AthleteConstraintRules = {
    dayBans: [], bannedSports: [], injuries: [], rawText, hasHardRules: false,
    ambiguousRestrictions: [],
  };
  if (!rawText) return rules;

  const fragments = rawText
    .split(/[,;\n•\u2022]|(?:\s+et\s+)/i)
    .map((f) => f.trim())
    .filter(Boolean);

  const seenBan = new Set<string>();
  for (const frag of fragments) {
    const lower = frag.toLowerCase();
    const negated = NEGATION_RX.test(lower);
    const rest = REST_RX.test(lower);
    const sport = detectSport(frag);

    const days: WeekDay[] = [];
    DAY_RX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DAY_RX.exec(frag)) !== null) {
      const d = normalizeDay(m[1]);
      if (d && !days.includes(d)) days.push(d);
    }

    if (days.length > 0 && (negated || rest)) {
      for (const day of days) {
        const key = `${day}::${sport}`;
        if (seenBan.has(key)) continue;
        seenBan.add(key);
        rules.dayBans.push({ day, sport, source: frag });
      }
      continue;
    }

    const bannedSport = detectBannedSportStrict(frag);
    if (days.length === 0 && bannedSport !== null) {
      if (PARTIAL_QUALIFIER_RX.test(frag)) {
        if (!rules.ambiguousRestrictions.includes(frag)) rules.ambiguousRestrictions.push(frag);
      } else if (!rules.bannedSports.includes(bannedSport)) {
        rules.bannedSports.push(bannedSport);
      }
      continue;
    }

    for (const zone of INJURY_ZONES) {
      if (lower.includes(zone) && !rules.injuries.includes(frag)) {
        rules.injuries.push(frag);
        break;
      }
    }
  }

  for (const frag of fragments) {
    if (!REAUTHORIZATION_RX.test(frag)) continue;
    const sport = detectSport(frag);
    if (sport === "any") continue;
    const idx = rules.bannedSports.indexOf(sport);
    if (idx !== -1) {
      rules.bannedSports.splice(idx, 1);
      if (!rules.ambiguousRestrictions.includes(frag)) rules.ambiguousRestrictions.push(frag);
    }
  }

  rules.hasHardRules =
    rules.dayBans.length > 0 || rules.bannedSports.length > 0 || rules.injuries.length > 0;
  return rules;
}

const SPORT_LABEL: Record<ConstraintSport, string> = {
  run: "course à pied", bike: "vélo", swim: "natation",
  strength: "renforcement", any: "TOUTE séance (jour off complet)",
};

/**
 * Bloc prompt à placer EN TÊTE du user prompt de chaque chunk.
 * Retourne "" si aucune contrainte saisie.
 */
export function buildAthleteConstraintsBlock(constraints: string | null | undefined): string {
  const rules = parseAthleteConstraints(constraints);
  if (!rules.rawText) return "";

  const lines: string[] = [];
  lines.push(`\n🚫 CONTRAINTES ATHLÈTE — PRIORITÉ ABSOLUE (NON NÉGOCIABLES)`);
  lines.push(`Ces contraintes ont été saisies par le coach. Elles PRIMENT sur la matrice de volume, sur les quotas hebdo et sur toute règle de périodisation. Une seule violation invalide le plan entier.`);
  lines.push(`\n**Texte coach (verbatim) :** « ${rules.rawText} »`);

  if (rules.dayBans.length > 0) {
    lines.push(`\n**Interdictions de créneaux (règles dures dérivées) :**`);
    for (const b of rules.dayBans) {
      lines.push(`- ❌ **${b.day.toUpperCase()}** : aucune séance de ${SPORT_LABEL[b.sport]}. Déplace le stimulus sur un autre jour de la MÊME semaine (ne le supprime pas, sauf si le quota est déjà atteint).`);
    }
  }

  if (rules.bannedSports.length > 0) {
    lines.push(`\n**Disciplines interdites sur tout le plan :**`);
    for (const s of rules.bannedSports) {
      lines.push(`- ❌ ${SPORT_LABEL[s]} : 0 séance, quel que soit le jour ou la phase. Redistribue le volume sur les disciplines autorisées.`);
    }
  }

  if (rules.injuries.length > 0) {
    lines.push(`\n**Blessures / limitations déclarées :**`);
    for (const inj of rules.injuries) lines.push(`- 🩹 « ${inj} »`);
    lines.push(`- Conséquences obligatoires : pas de sprint maximal ni de pliométrie tant que la zone est citée, côtes et descentes réduites, progression de volume ≤ 5%/semaine sur la discipline concernée, et mention explicite de l'adaptation dans les notes de la séance concernée.`);
  }

  if (rules.ambiguousRestrictions.length > 0) {
    lines.push(`\n**Restrictions partielles détectées (PAS un bannissement total) :**`);
    for (const r of rules.ambiguousRestrictions) lines.push(`- ⚠️ « ${r} » : interprète cette restriction littéralement (lieu/condition précis) — ne supprime PAS la discipline concernée du reste du plan.`);
  }

  if (!rules.hasHardRules) {
    lines.push(`\n(Aucune règle dure automatiquement dérivée — applique littéralement le texte coach ci-dessus dans le placement des séances.)`);
  }

  lines.push(`\n✅ Avant de rendre ton JSON : relis chaque \`day\` de chaque séance et vérifie qu'aucune ligne ci-dessus n'est violée.`);
  return lines.join("\n");
}
