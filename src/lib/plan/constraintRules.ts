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

    // Interdiction globale d'un sport (sans jour précisé)
    if (days.length === 0 && negated && sport !== "any") {
      if (!rules.bannedSports.includes(sport)) rules.bannedSports.push(sport);
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
