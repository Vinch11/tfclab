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

function normalizeDay(raw: string): WeekDay | null {
  const d = deaccent(raw.toLowerCase()).trim();
  return WEEK_DAYS.find((w) => deaccent(w) === d) ?? null;
}

export function parseAthleteConstraints(text: string | null | undefined): AthleteConstraintRules {
  const rawText = String(text ?? "").trim();
  const rules: AthleteConstraintRules = {
    dayBans: [], bannedSports: [], injuries: [], rawText, hasHardRules: false,
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

    if (days.length === 0 && negated && sport !== "any") {
      if (!rules.bannedSports.includes(sport)) rules.bannedSports.push(sport);
      continue;
    }

    for (const zone of INJURY_ZONES) {
      if (lower.includes(zone) && !rules.injuries.includes(frag)) {
        rules.injuries.push(frag);
        break;
      }
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

  if (!rules.hasHardRules) {
    lines.push(`\n(Aucune règle dure automatiquement dérivée — applique littéralement le texte coach ci-dessus dans le placement des séances.)`);
  }

  lines.push(`\n✅ Avant de rendre ton JSON : relis chaque \`day\` de chaque séance et vérifie qu'aucune ligne ci-dessus n'est violée.`);
  return lines.join("\n");
}
