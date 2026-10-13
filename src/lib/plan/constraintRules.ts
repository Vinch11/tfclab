// =============================================================================
// CONTRAINTES ATHLÈTE — parsing déterministe du champ libre "Contraintes"
// Objectif : transformer le texte saisi par le coach ("Pas de vélo le mardi,
// blessure genou gauche…") en règles exploitables :
//   1. par le prompt IA (bloc dur, prioritaire) — miroir edge function
//   2. par le réconciliateur déterministe (filet post-génération)
// Aucune invention : tout ce qui n'est pas reconnu reste en texte libre.
// =============================================================================

export type WeekDay =
  | "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";

export const WEEK_DAYS: WeekDay[] = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
];

/** Sport canonique utilisé dans les plans. `any` = toute séance. */
export type ConstraintSport = "run" | "bike" | "swim" | "strength" | "any";

export interface DayBan {
  day: WeekDay;
  sport: ConstraintSport;
  source: string;
}

export interface AthleteConstraintRules {
  /** Jours (avec sport ciblé ou `any`) interdits. */
  dayBans: DayBan[];
  /** Sports totalement interdits sur le plan. */
  bannedSports: ConstraintSport[];
  /** Zones de blessure détectées (genou, dos, tendon d'Achille…). */
  injuries: string[];
  /** Texte brut restant, ré-injecté tel quel dans le prompt. */
  rawText: string;
  /** true si au moins une règle dure a été extraite. */
  hasHardRules: boolean;
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

function detectSport(fragment: string): ConstraintSport {
  for (const { sport, rx } of SPORT_PATTERNS) {
    if (rx.test(fragment)) return sport;
  }
  return "any";
}

/**
 * Bug réel (B-5K-BEGINNER, Pilot Cockpit, 2026-10-13) : l'ancienne détection
 * d'interdiction GLOBALE (sans jour précisé) considérait qu'une négation et
 * un mot-clé sportif N'IMPORTE OÙ dans le même fragment (= souvent une
 * phrase entière, le découpage ne coupant que sur virgule/point-virgule)
 * suffisaient à bannir ce sport sur tout le plan. Un texte de documentation
 * — "Objectif distinct du template Start-to-Run statique (**jamais**
 * généré par IA en production)" — a ainsi été lu comme "jamais [de] **Run**"
 * (le tiret de "Start-to-Run" crée une frontière de mot, donc `\brun\b`
 * matchait), alors que "jamais" ne portait que sur "généré par IA", sans
 * aucun rapport avec le sport.
 *
 * Correctif : exiger une PROXIMITÉ GRAMMATICALE directe entre la négation et
 * le sport — soit juste avant lui (± un connecteur court : article/
 * préposition réels, jamais un mot de contenu arbitraire), soit juste après
 * lui sous forme d'adjectif prédicatif (± un verbe de liaison). Ça couvre
 * les formulations réelles ("pas de vélo", "jamais de natation", "aucune
 * course à pied", "vélo interdit", "natation exclue") sans plus jamais
 * laisser une négation sans rapport, ailleurs dans la phrase, "adopter" un
 * mot-clé sportif qui se trouve juste être une sous-chaîne d'un nom de
 * fonctionnalité ("Start-to-Run"), d'un programme, ou d'une description
 * historique sans lien avec une vraie contrainte.
 *
 * Limite assumée (déterministe, pas une vraie grammaire) : une formulation
 * qui placerait volontairement la négation et le sport à une distance telle
 * qu'elle ne colle à aucun des deux gabarits ci-dessous ne sera pas détectée
 * — préférable à l'inverse (faux positif = interdiction fantôme appliquée à
 * tout le plan).
 */
const PRE_NEGATORS_SRC =
  "(?:pas|jamais|aucun(?:e)?|interdit(?:e)?s?|impossible|indisponible|exclu(?:e)?s?|no|sans)";
const POST_NEGATORS_SRC =
  "(?:interdit(?:e)?s?|exclu(?:e)?s?|impossible|indisponible|banni(?:e)?s?)";
/** Connecteur grammatical court toléré entre la négation et le sport — JAMAIS
 *  un mot de contenu arbitraire (cf. docstring ci-dessus). */
const CONNECTOR_SRC = "(?:\\s+(?:de|d['’]|du|des|la|le|les|toute?s?))?\\s*";
/** Verbe de liaison court toléré entre le sport et l'adjectif qui le bannit
 *  ("vélo EST interdit") — même principe de restriction que CONNECTOR_SRC. */
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

/** Interdiction GLOBALE (sans jour précisé) d'un sport — proximité stricte, cf. docstring BAN_PATTERNS. */
function detectBannedSportStrict(fragment: string): ConstraintSport | null {
  for (const { sport, rx } of BAN_PATTERNS) {
    if (rx.test(fragment)) return sport;
  }
  return null;
}

function normalizeDay(raw: string): WeekDay | null {
  const d = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const found = WEEK_DAYS.find(
    (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === d,
  );
  return found ?? null;
}

const DAY_RX = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/gi;
const NEGATION_RX = /\b(pas|jamais|aucun[e]?|interdit[e]?s?|impossible|indisponible|exclu[e]?s?|no|sans)\b/i;
const REST_RX = /\b(repos|off|r[ée]cup(?:[ée]ration)?\s*totale|jour\s*sans)\b/i;

/**
 * Parse le champ libre "Contraintes" en règles dures + texte résiduel.
 * Découpe par virgule / point-virgule / retour ligne / " et ".
 */
export function parseAthleteConstraints(
  text: string | null | undefined,
): AthleteConstraintRules {
  const rawText = String(text ?? "").trim();
  const rules: AthleteConstraintRules = {
    dayBans: [],
    bannedSports: [],
    injuries: [],
    rawText,
    hasHardRules: false,
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

    // Jours mentionnés dans ce fragment
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

    // Interdiction globale d'un sport (sans jour précisé) — proximité stricte
    // négation↔sport requise (cf. detectBannedSportStrict), pas la simple
    // co-occurrence fragment-wide utilisée ci-dessus pour les bans de JOUR
    // (qui restent, eux, intrinsèquement ancrés/désambiguïsés par le jour
    // explicite — risque de faux positif bien plus faible en pratique).
    const bannedSport = detectBannedSportStrict(frag);
    if (days.length === 0 && bannedSport !== null) {
      if (!rules.bannedSports.includes(bannedSport)) rules.bannedSports.push(bannedSport);
      continue;
    }

    // Blessures
    for (const zone of INJURY_ZONES) {
      if (lower.includes(zone) && !rules.injuries.includes(frag)) {
        rules.injuries.push(frag);
        break;
      }
    }
  }

  rules.hasHardRules =
    rules.dayBans.length > 0 ||
    rules.bannedSports.length > 0 ||
    rules.injuries.length > 0;
  return rules;
}

const SPORT_LABEL: Record<ConstraintSport, string> = {
  run: "course à pied",
  bike: "vélo",
  swim: "natation",
  strength: "renforcement",
  any: "toute séance",
};

export function constraintSportLabel(s: ConstraintSport): string {
  return SPORT_LABEL[s];
}

/** Normalise un sport de séance de plan vers un ConstraintSport. */
export function toConstraintSport(sport: string | null | undefined): ConstraintSport {
  const s = String(sport ?? "").toLowerCase();
  if (/bike|velo|vélo|cycl/.test(s)) return "bike";
  if (/swim|nat|nage/.test(s)) return "swim";
  if (/strength|renfo|muscu|ppg/.test(s)) return "strength";
  if (/run|course|cap|trail/.test(s)) return "run";
  return "any";
}
