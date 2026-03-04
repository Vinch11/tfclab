/**
 * AI Plan Markdown Parser
 * Parses structured Markdown tables from AI-generated TFCL™ training plans
 * into actionable session objects ready for the training_plan table.
 */

export interface ParsedSession {
  weekNumber: number;
  weekTheme: string;
  phase: string;
  dayName: string;       // "Lundi", "Mardi", etc.
  dayIndex: number;      // 0=Lundi ... 6=Dimanche
  sport: string;
  title: string;
  details: string;
  isRest: boolean;
}

export interface ParsedWeek {
  weekNumber: number;
  theme: string;
  phase: string;
  phaseObjective?: string;
  volumeTarget?: string;
  coachNotes?: string;
  sessions: ParsedSession[];
}

export interface StrategicLimiter {
  rank: number;
  name: string;
  status: string;
  block: string;
  weeks: string;
  keySessions: string;
}

export interface StrategicRecap {
  limiters: StrategicLimiter[];
  synergies: string[];
}

export interface WeekQualityScore {
  weekNumber: number;
  activeDays: number;          // days with non-rest sessions (0-7)
  totalSessions: number;       // non-rest sessions count
  earlyWeekSessions: number;   // sessions Mon-Wed (dayIndex 0-2)
  lateWeekSessions: number;    // sessions Thu-Sun (dayIndex 3-6)
  maxConsecutiveRest: number;  // longest consecutive rest streak
  hasKeySession: boolean;      // has at least one 🔑 session
  distributionScore: number;   // 0-100, penalized if lopsided
  qualityFlags: string[];      // warnings
}

export interface ParsedPlan {
  title: string;
  diagnostic?: string;
  strategicRecap?: StrategicRecap;
  phases: { name: string; weeks: string; objective?: string; volume?: string }[];
  weeks: ParsedWeek[];
  totalWeeks: number;
  qualityScores?: WeekQualityScore[];
}

const DAY_MAP: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3,
  vendredi: 4, samedi: 5, dimanche: 6,
};

function normDay(raw: string): { name: string; index: number } {
  // Strip bold markers, emojis, and extra whitespace
  const lower = raw.trim()
    .replace(/\*{1,2}/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+/gu, "")
    .trim()
    .toLowerCase();
  for (const [key, idx] of Object.entries(DAY_MAP)) {
    if (lower.startsWith(key)) return { name: key.charAt(0).toUpperCase() + key.slice(1), index: idx };
  }
  // Also handle abbreviated forms: "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"
  const abbrevMap: Record<string, string> = { lun: "lundi", mar: "mardi", mer: "mercredi", jeu: "jeudi", ven: "vendredi", sam: "samedi", dim: "dimanche" };
  for (const [abbrev, full] of Object.entries(abbrevMap)) {
    if (lower.startsWith(abbrev)) {
      const idx = DAY_MAP[full];
      return { name: full.charAt(0).toUpperCase() + full.slice(1), index: idx };
    }
  }
  return { name: raw.trim(), index: -1 };
}

function isRestSession(sport: string, title: string): boolean {
  const combined = `${sport} ${title}`.toLowerCase();
  return /repos|rest|off|récup|recovery/.test(combined);
}

function parseWeekHeader(line: string): { weekNumber: number; theme: string } | null {
  // Accept various formats:
  // ### Semaine 7 — Theme
  // **Semaine 7** — Theme
  // Semaine 7 : Theme
  // #### 🗓️ Semaine 7 — Theme
  // ### **Semaine 7 — Theme**
  // ## Semaine 7
  const cleaned = line
    .replace(/^#{1,5}\s*/, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u{1F4C5}\u{1F5D3}]+\s*/u, "")
    .replace(/^\*{1,2}/, "")
    .replace(/\*{1,2}$/, "")
    .trim();
  
  const match = cleaned.match(/^Semaine\s*(\d+)\s*(?:[—\-–:]\s*(.+))?$/i);
  if (!match) return null;
  const weekNumber = parseInt(match[1], 10);
  const theme = (match[2] || `Semaine ${weekNumber}`).replace(/\*{1,2}/g, "").trim();
  return { weekNumber, theme };
}

function parsePhaseOrBlocHeader(line: string): { name: string; weeksRange: string } | null {
  const cleaned = line
    .replace(/^#{1,5}\s*/, "")
    .replace(/^\*{1,2}|\*{1,2}$/g, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u{1F4E6}\u{2699}]+\s*/u, "")
    .trim();

  // Pattern 1: "Phase 2 : Label" or "Bloc 3 — Label (Semaines 5 à 8)"
  const match = cleaned.match(/^(Phase|Bloc)\s*(\d+)\s*[:\-–—]\s*(.+?)(?:\s*\(.*?(\d+)\s*[-–—àa]\s*(\d+).*?\))?\s*$/i);
  if (match) {
    const kind = match[1];
    const number = match[2];
    const label = match[3].replace(/^\*{1,2}|\*{1,2}$/g, "").trim();
    const weeksRange = match[4] && match[5] ? `${match[4]}-${match[5]}` : "";
    return {
      name: `${kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase()} ${number} : ${label}`,
      weeksRange,
    };
  }

  // Pattern 2: "Bloc Fondation" or "Bloc Chantier VLamax↓" without a number
  const match2 = cleaned.match(/^(Phase|Bloc)\s+([A-ZÀ-Ÿa-zà-ÿ].+?)(?:\s*\(.*?[Ss](?:emaines?)?\s*(\d+)\s*[-–—àa]\s*(\d+).*?\))?\s*$/i);
  if (match2) {
    const kind = match2[1];
    const label = match2[2].replace(/^\*{1,2}|\*{1,2}$/g, "").trim();
    const weeksRange = match2[3] && match2[4] ? `${match2[3]}-${match2[4]}` : "";
    return {
      name: `${kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase()} : ${label}`,
      weeksRange,
    };
  }

  return null;
}

/**
 * Normalize a week so it always contains Monday → Sunday.
 * If AI omitted a day, we inject an explicit rest row for that day.
 */
function normalizeWeekSessions(
  sessions: ParsedSession[],
  weekNumber: number,
  weekTheme: string,
  phase: string
): ParsedSession[] {
  const known = sessions
    .map((s, order) => ({ ...s, __order: order }))
    .filter(s => s.dayIndex >= 0);

  const unknown = sessions.filter(s => s.dayIndex < 0);

  const byDay = new Map<number, Array<ParsedSession & { __order: number }>>();
  for (const s of known) {
    const arr = byDay.get(s.dayIndex) || [];
    arr.push(s);
    byDay.set(s.dayIndex, arr);
  }

  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const normalized: ParsedSession[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const daySessions = byDay.get(dayIndex);
    if (daySessions && daySessions.length > 0) {
      daySessions
        .sort((a, b) => a.__order - b.__order)
        .forEach(({ __order, ...session }) => normalized.push(session));
    } else {
      normalized.push({
        weekNumber,
        weekTheme,
        phase,
        dayName: dayNames[dayIndex],
        dayIndex,
        sport: "Repos",
        title: "Repos complet",
        details: "Récupération, mobilité optionnelle",
        isRest: true,
      });
    }
  }

  return [...normalized, ...unknown];
}

/**
 * Parse the full AI Markdown response into structured plan data
 */
export function parseAIPlan(markdown: string): ParsedPlan {
  const lines = markdown.split("\n");

  let title = "";
  let diagnostic = "";
  let currentPhase = "";
  let currentPhaseObjective = "";
  let currentVolumeTarget = "";
  let currentWeekNumber = 0;
  let currentWeekTheme = "";
  let currentCoachNotes = "";
  let inTable = false;
  let tableHeaders: string[] = [];
  let pendingSessions: ParsedSession[] = [];
  const weeks: ParsedWeek[] = [];
  const phases: ParsedPlan["phases"] = [];
  let collectingCoachNotes = false;
  let inRecapTable = false;
  let recapLimiters: StrategicLimiter[] = [];
  let recapSynergies: string[] = [];
  let collectingSynergies = false;

  const flushWeek = () => {
    if (currentWeekNumber > 0) {
      const normalizedSessions = normalizeWeekSessions(
        pendingSessions,
        currentWeekNumber,
        currentWeekTheme || `Semaine ${currentWeekNumber}`,
        currentPhase
      );

      weeks.push({
        weekNumber: currentWeekNumber,
        theme: currentWeekTheme || `Semaine ${currentWeekNumber}`,
        phase: currentPhase,
        phaseObjective: currentPhaseObjective,
        volumeTarget: currentVolumeTarget,
        coachNotes: currentCoachNotes.trim() || undefined,
        sessions: normalizedSessions,
      });
      pendingSessions = [];
      currentCoachNotes = "";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Title: # Plan TFCL™ — ...
    if (!title && /^#\s/.test(trimmed) && !trimmed.startsWith("##")) {
      title = trimmed.replace(/^#\s*/, "");
      continue;
    }

    // Diagnostic block
    if (/^##\s*Diagnostic/i.test(trimmed)) {
      // Collect next few lines as diagnostic
      const diagLines: string[] = [];
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        if (/^##/.test(lines[j].trim())) break;
        if (lines[j].trim()) diagLines.push(lines[j].trim());
      }
      diagnostic = diagLines.join("\n");
      continue;
    }

    // Récapitulatif Stratégique section
    if (/^##\s*R[ée]capitulatif\s*Strat[ée]gique/i.test(trimmed)) {
      inRecapTable = false;
      collectingSynergies = false;
      continue;
    }

    // Recap table: ### Limiteurs → Blocs → Séances Clés
    if (/^###\s*Limiteurs/i.test(trimmed)) {
      inRecapTable = true;
      continue;
    }

    // Synergies section
    if (/^###\s*Synergies/i.test(trimmed)) {
      inRecapTable = false;
      collectingSynergies = true;
      continue;
    }

    // Parse recap table rows
    if (inRecapTable && trimmed.startsWith("|")) {
      // Skip header and separator rows
      const stripped = trimmed.replace(/\|/g, "").trim();
      if (/^[\s\-:|]+$/.test(stripped)) continue;
      if (/Limiteur\s*(D[ée]tect|Priorit|#|Rang)/i.test(stripped)) continue;
      // Also skip if the row is purely a header like "# | Limiteur | Statut..."
      if (/^\s*#\s*$/.test(stripped.split(/\s{2,}/)[0]) && /Limiteur/i.test(stripped)) continue;
      
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 4) {
        // Try to extract rank from first cell (could be "1", "#1", "1️⃣", "**1**", etc.)
        const rankStr = cells[0].replace(/[#*️⃣\u20E3\uFE0F]/g, "").replace(/\*\*/g, "").trim();
        const rank = parseInt(rankStr, 10);
        
        if (!isNaN(rank)) {
          if (cells.length >= 6) {
            // Full 6-column table: # | Limiteur | Statut | Bloc | Semaines | Séances
            recapLimiters.push({
              rank,
              name: cells[1].replace(/\*\*/g, ""),
              status: cells[2].replace(/\*\*/g, ""),
              block: cells[3].replace(/\*\*/g, ""),
              weeks: cells[4].replace(/\*\*/g, ""),
              keySessions: cells.slice(5).join(", ").replace(/\*\*/g, ""),
            });
          } else if (cells.length === 5) {
            // 5-column table: # | Limiteur | Statut | Bloc/Semaines | Séances
            recapLimiters.push({
              rank,
              name: cells[1].replace(/\*\*/g, ""),
              status: cells[2].replace(/\*\*/g, ""),
              block: cells[3].replace(/\*\*/g, ""),
              weeks: "",
              keySessions: cells[4].replace(/\*\*/g, ""),
            });
          } else {
            // 4-column table: # | Limiteur | Statut/Bloc | Séances
            recapLimiters.push({
              rank,
              name: cells[1].replace(/\*\*/g, ""),
              status: cells[2].replace(/\*\*/g, ""),
              block: "",
              weeks: "",
              keySessions: cells[3].replace(/\*\*/g, ""),
            });
          }
        }
      }
      continue;
    }

    // End recap table on non-table line
    if (inRecapTable && !trimmed.startsWith("|") && trimmed !== "") {
      inRecapTable = false;
    }

    // Collect synergies bullets
    if (collectingSynergies) {
      if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
        recapSynergies.push(trimmed.replace(/^[-•]\s*/, ""));
        continue;
      } else if (trimmed && !trimmed.startsWith("#")) {
        continue;
      } else {
        collectingSynergies = false;
      }
    }

    // Phase/Bloc header: supports variants with emoji/bold and multiple dash styles
    const phaseOrBloc = parsePhaseOrBlocHeader(trimmed);
    if (phaseOrBloc) {
      flushWeek();
      collectingCoachNotes = false;
      currentPhase = phaseOrBloc.name;
      phases.push({ name: currentPhase, weeks: phaseOrBloc.weeksRange });
      currentPhaseObjective = "";
      currentVolumeTarget = "";
      continue;
    }

    // Phase objective / volume
    if (/^\*\*Objectif physiologique/i.test(trimmed)) {
      currentPhaseObjective = trimmed.replace(/^\*\*Objectif physiologique\s*[:\s]\*\*\s*/i, "");
      if (phases.length) phases[phases.length - 1].objective = currentPhaseObjective;
      continue;
    }
    if (/^\*\*Volume cible/i.test(trimmed)) {
      currentVolumeTarget = trimmed.replace(/^\*\*Volume cible\s*[:\s]\*\*\s*/i, "");
      if (phases.length) phases[phases.length - 1].volume = currentVolumeTarget;
      continue;
    }

    // Week header: ### Semaine N — Theme (theme optional for chunked responses)
    const weekHeader = parseWeekHeader(trimmed);
    if (weekHeader) {
      flushWeek();
      collectingCoachNotes = false;
      currentWeekNumber = weekHeader.weekNumber;
      currentWeekTheme = weekHeader.theme;
      inTable = false;
      tableHeaders = [];
      continue;
    }

    // Coach notes: **Consignes coach :**
    if (/^\*\*Consignes?\s*coach/i.test(trimmed)) {
      collectingCoachNotes = true;
      const afterColon = trimmed.replace(/^\*\*Consignes?\s*coach\s*[:\s]\*\*\s*/i, "");
      if (afterColon) currentCoachNotes += afterColon + "\n";
      continue;
    }
    if (collectingCoachNotes) {
      if (/^#{1,3}\s/.test(trimmed) || /^\*\*/.test(trimmed) || trimmed.startsWith("|")) {
        collectingCoachNotes = false;
      } else {
        currentCoachNotes += trimmed + "\n";
        continue;
      }
    }

    // Table header row (French or English, various formats)
    // Strip bold markers for detection: **Jour** → Jour
    const trimmedNoBold = trimmed.replace(/\*{1,2}/g, "");
    if (trimmed.startsWith("|") && /\b(jour|day|lundi|mardi|mercredi|sport|séance|session)\b/i.test(trimmedNoBold)) {
      tableHeaders = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      inTable = true;
      continue;
    }

    // Also detect table start from separator row if preceded by header-like content
    if (!inTable && trimmed.startsWith("|") && currentWeekNumber > 0) {
      // Check if this looks like a data row with a day name
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const dayCheck = normDay(cells[0]);
        if (dayCheck.index >= 0) {
          // This is a table data row without a detected header - start table
          inTable = true;
          // Process this row as data (fall through to table data handler below)
        }
      }
    }

    // Table separator (skip both when in table and when just starting)
    if (/^\|[\s\-:]+\|/.test(trimmed)) {
      if (inTable || currentWeekNumber > 0) continue;
    }

    // Table data row
    if (inTable && trimmed.startsWith("|") && currentWeekNumber > 0) {
      const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const dayRaw = cells[0];
        const sport = cells[1] || "";
        const sessionTitle = cells[2] || "";
        const details = cells[3] || "";

        const { name, index } = normDay(dayRaw);
        const rest = isRestSession(sport, sessionTitle);

        pendingSessions.push({
          weekNumber: currentWeekNumber,
          weekTheme: currentWeekTheme,
          phase: currentPhase,
          dayName: name,
          dayIndex: index,
          sport: sport.replace(/\*\*/g, ""),
          title: sessionTitle.replace(/\*\*/g, ""),
          details: details.replace(/\*\*/g, ""),
          isRest: rest,
        });
      }
      continue;
    }

    // End of table
    if (inTable && !trimmed.startsWith("|") && trimmed !== "") {
      inTable = false;
    }
  }

  // Flush last week
  flushWeek();

  const strategicRecap: StrategicRecap | undefined =
    recapLimiters.length > 0
      ? { limiters: recapLimiters, synergies: recapSynergies }
      : undefined;

  // Compute quality scores per week
  const qualityScores = weeks.map(w => computeWeekQualityScore(w));

  return {
    title: title || "Plan TFCL™",
    diagnostic: diagnostic || undefined,
    strategicRecap,
    phases,
    weeks,
    totalWeeks: weeks.length,
    qualityScores,
  };
}

/**
 * Compute a quality score for a single week
 */
function computeWeekQualityScore(week: ParsedWeek): WeekQualityScore {
  const nonRest = week.sessions.filter(s => !s.isRest && s.dayIndex >= 0);
  const activeDaysSet = new Set(nonRest.map(s => s.dayIndex));
  const activeDays = activeDaysSet.size;
  const totalSessions = nonRest.length;

  // Early vs late week split
  const earlyWeekSessions = nonRest.filter(s => s.dayIndex >= 0 && s.dayIndex <= 2).length;
  const lateWeekSessions = nonRest.filter(s => s.dayIndex >= 3 && s.dayIndex <= 6).length;

  // Max consecutive rest days
  const dayHasSession = Array.from({ length: 7 }, (_, i) => activeDaysSet.has(i));
  let maxConsecutiveRest = 0;
  let currentStreak = 0;
  for (let d = 0; d < 7; d++) {
    if (!dayHasSession[d]) {
      currentStreak++;
      maxConsecutiveRest = Math.max(maxConsecutiveRest, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Key session check
  const hasKeySession = week.sessions.some(s => 
    s.title.includes("🔑") || s.details?.includes("🔑")
  );

  // Distribution score (0-100)
  const flags: string[] = [];
  let distributionScore = 100;

  // Penalty: no sessions Mon-Wed
  if (earlyWeekSessions === 0 && totalSessions > 0) {
    distributionScore -= 40;
    flags.push("Aucune séance Lundi-Mercredi");
  } else if (earlyWeekSessions === 1 && totalSessions >= 4) {
    distributionScore -= 20;
    flags.push("Seule 1 séance Lundi-Mercredi");
  }

  // Penalty: heavy concentration in late week
  if (totalSessions > 0 && lateWeekSessions / totalSessions > 0.8) {
    distributionScore -= 25;
    flags.push("80%+ des séances en fin de semaine");
  }

  // Penalty: too many consecutive rest days
  if (maxConsecutiveRest >= 3) {
    distributionScore -= 20;
    flags.push(`${maxConsecutiveRest} jours de repos consécutifs`);
  }

  // Penalty: too few active days relative to sessions
  if (totalSessions >= 5 && activeDays < 4) {
    distributionScore -= 15;
    flags.push("Trop de séances concentrées sur peu de jours");
  }

  // Penalty: no key session
  if (!hasKeySession && totalSessions >= 3) {
    distributionScore -= 10;
    flags.push("Aucune séance clé 🔑 identifiée");
  }

  distributionScore = Math.max(0, distributionScore);

  return {
    weekNumber: week.weekNumber,
    activeDays,
    totalSessions,
    earlyWeekSessions,
    lateWeekSessions,
    maxConsecutiveRest,
    hasKeySession,
    distributionScore,
    qualityFlags: flags,
  };
}

/**
 * Map parsed sessions to dates starting from a given Monday
 */
export function mapSessionsToDates(
  weeks: ParsedWeek[],
  startDate: Date
): { session: ParsedSession; date: Date }[] {
  const result: { session: ParsedSession; date: Date }[] = [];

  // Ensure startDate is a Monday
  const start = new Date(startDate);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);

  for (const week of weeks) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + (week.weekNumber - 1) * 7);

    for (const session of week.sessions) {
      if (session.dayIndex >= 0) {
        const sessionDate = new Date(weekStart);
        sessionDate.setDate(sessionDate.getDate() + session.dayIndex);
        result.push({ session, date: sessionDate });
      }
    }
  }

  return result;
}
