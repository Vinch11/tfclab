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
  /** #7 audit : volume RÉEL calculé par sommation des durées de séances. */
  computedVolumeMin?: number;
  /** #7 audit : volume formaté "8h30" à partir de computedVolumeMin. */
  computedVolumeStr?: string;
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

export interface ParsedPlan {
  title: string;
  diagnostic?: string;
  strategicRecap?: StrategicRecap;
  phases: { name: string; weeks: string; objective?: string; volume?: string }[];
  weeks: ParsedWeek[];
  totalWeeks: number;
}

const DAY_MAP: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3,
  vendredi: 4, samedi: 5, dimanche: 6,
};

function formatVolumeMin(totalMin: number): string {
  const rounded = Math.round(totalMin / 5) * 5;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h <= 0) return `${m}min`;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function parseOneDurationMin(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/,/g, ".");
  const hMin = s.match(/(\d+(?:\.\d+)?)\s*h\s*(\d{1,2})?/);
  if (hMin) {
    return Number(hMin[1]) * 60 + (hMin[2] ? Number(hMin[2]) : 0);
  }
  const min = s.match(/(\d{1,3})\s*(?:min|mn|'|′|’)/);
  if (min) return Number(min[1]);
  return null;
}

function parseDurationExpressionMin(raw: string): number | null {
  const cleaned = raw.trim();
  const range = cleaned.match(
    /(\d+(?:[,.]\d+)?\s*h\s*\d{0,2}|\d{1,3}\s*(?:min|mn|'|′|’))\s*[-–—àa]\s*(\d+(?:[,.]\d+)?\s*h\s*\d{0,2}|\d{1,3}\s*(?:min|mn|'|′|’))/i
  );
  if (range) {
    const a = parseOneDurationMin(range[1]);
    const b = parseOneDurationMin(range[2]);
    if (a != null && b != null) return (a + b) / 2;
  }
  return parseOneDurationMin(cleaned);
}

function estimateSessionDurationMin(session: ParsedSession): number | null {
  if (session.isRest) return null;
  const text = `${session.details || ""} ${session.title || ""}`;
  const durationToken = "(?:\\d+(?:[,.]\\d+)?\\s*h\\s*\\d{0,2}|\\d{1,3}\\s*(?:min|mn|'|′|’))";

  const sportBlocks = [...text.matchAll(new RegExp(`\\b(?:bike|v[ée]lo|velo|run|cap|natation|nat|swim)\\b\\s*[:\\-–—]?\\s*(${durationToken}(?:\\s*[-–—àa]\\s*${durationToken})?)`, "gi"))];
  if (sportBlocks.length >= 2) {
    const total = sportBlocks.reduce((sum, match) => sum + (parseDurationExpressionMin(match[1]) ?? 0), 0);
    if (total > 0) return total;
  }

  const plusSection = (text.split(/[.;]/)[0] || text).slice(0, 180);
  if (/[+]/.test(plusSection)) {
    const plusDurations = [...plusSection.matchAll(new RegExp(`(${durationToken}(?:\\s*[-–—àa]\\s*${durationToken})?)`, "gi"))]
      .map((match) => parseDurationExpressionMin(match[1]))
      .filter((value): value is number => value != null && value >= 10 && value <= 420);
    if (plusDurations.length >= 2) return plusDurations.reduce((sum, value) => sum + value, 0);
  }

  const firstSentence = text.split(/[.;]/)[0] || text;
  const leading = firstSentence.trim();

  // Prefer explicit top-level durations at the beginning of the prescription.
  // This avoids counting interval fragments later in the text, e.g. "3×8min".
  const startsWithDuration = /^\s*(?:[A-ZÉÈÀÇ]{2,}\s+)?\d/.test(leading);
  const searchable = startsWithDuration ? leading : text.slice(0, 140);
  const matches = [...searchable.matchAll(new RegExp(durationToken, "gi"))];
  if (matches.length === 0) return null;

  const firstIndex = matches[0].index ?? 0;
  if (!startsWithDuration && firstIndex > 35) return null;
  const first = matches[0];
  const next = matches[1];
  const expr = next && /^\s*[-–—àa]\s*$/i.test(searchable.slice(firstIndex + first[0].length, next.index))
    ? `${first[0]}-${next[0]}`
    : first[0];
  const duration = parseDurationExpressionMin(expr);
  return duration != null && duration >= 10 && duration <= 420 ? duration : null;
}

function dedupeStrategicLimiters(limiters: StrategicLimiter[]): StrategicLimiter[] {
  const seenRanks = new Set<number>();
  const seenRows = new Set<string>();
  const deduped: StrategicLimiter[] = [];
  for (const limiter of limiters) {
    const rowKey = `${limiter.rank}|${limiter.name}|${limiter.block}|${limiter.weeks}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (seenRanks.has(limiter.rank) || seenRows.has(rowKey)) continue;
    seenRanks.add(limiter.rank);
    seenRows.add(rowKey);
    deduped.push(limiter);
  }
  return deduped.sort((a, b) => a.rank - b.rank);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCanonicalPlanTitle(rawTitle: string, markdown: string, totalWeeks: number): string {
  const haystack = `${rawTitle}\n${markdown}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isLCW = /\blcw\b|long\s*course\s*weekend/.test(haystack);
  const isHalf = /70\s*[\.,]?\s*3|703|half\s*iron|half\s*distance/.test(haystack);
  if (isLCW && isHalf && totalWeeks > 0) {
    return `Plan TFCL™ — 70.3 LCW — ${totalWeeks} semaine${totalWeeks > 1 ? "s" : ""}`;
  }
  return rawTitle || "Plan TFCL™";
}

function normDay(raw: string): { name: string; index: number } {
  // Strip markdown emphasis (**, *, _), emoji and leading punctuation so labels
  // like "**Lundi matin**", "_Mardi_", "🟦 Mercredi" still resolve.
  const cleaned = raw
    .replace(/[*_`~]+/g, " ")
    .replace(/^[\s\-–—:•·\u{1F300}-\u{1FAFF}\u2600-\u27BF]+/u, "")
    .trim()
    .toLowerCase();
  for (const [key, idx] of Object.entries(DAY_MAP)) {
    if (cleaned.startsWith(key)) return { name: key.charAt(0).toUpperCase() + key.slice(1), index: idx };
  }
  // Fallback: search anywhere in the string
  for (const [key, idx] of Object.entries(DAY_MAP)) {
    if (cleaned.includes(key)) return { name: key.charAt(0).toUpperCase() + key.slice(1), index: idx };
  }
  return { name: raw.trim(), index: -1 };
}

function isRestSession(sport: string, title: string): boolean {
  const combined = `${sport} ${title}`.toLowerCase();
  return /repos|rest|off|récup|recovery/.test(combined);
}

function parseWeekHeader(line: string): { weekNumber: number; theme: string } | null {
  // Accept headers like:
  //   ### Semaine 7 — Theme
  //   ### Semaine 7 (du 09/03 au 15/03) — Theme
  //   Semaine 7
  const match = line.match(
    /^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*(\d+)\s*\*{0,2}(?:\s*\([^)]*\))?(?:\s*[—\-–:]\s*(.+))?$/i
  );
  if (!match) return null;
  const weekNumber = parseInt(match[1], 10);
  const theme = (match[2] || `Semaine ${weekNumber}`).trim();
  return { weekNumber, theme };
}

function parsePhaseOrBlocHeader(line: string): { name: string; weeksRange: string } | null {
  const cleaned = line
    .replace(/^#{2,4}\s*/, "")
    .replace(/^\*{1,2}|\*{1,2}$/g, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/u, "")
    .trim();

  const match = cleaned.match(/^(Phase|Bloc)\s*(\d+)\s*[:\-–—]\s*(.+?)(?:\s*\(.*?(\d+)\s*[-–—àa]\s*(\d+).*?\))?\s*$/i);
  if (!match) return null;

  const kind = match[1];
  const number = match[2];
  const label = match[3].replace(/^\*{1,2}|\*{1,2}$/g, "").trim();
  const weeksRange = match[4] && match[5] ? `${match[4]}-${match[5]}` : "";

  return {
    name: `${kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase()} ${number} : ${label}`,
    weeksRange,
  };
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
      const computedVolumeMin = pendingSessions.reduce((sum, session) => {
        return sum + (estimateSessionDurationMin(session) ?? 0);
      }, 0);
      const computedVolumeStr = computedVolumeMin > 0 ? formatVolumeMin(computedVolumeMin) : undefined;
      const newWeek: ParsedWeek = {
        weekNumber: currentWeekNumber,
        theme: currentWeekTheme || `Semaine ${currentWeekNumber}`,
        phase: currentPhase,
        phaseObjective: currentPhaseObjective,
        volumeTarget: currentVolumeTarget || undefined,
        computedVolumeMin: computedVolumeMin > 0 ? computedVolumeMin : undefined,
        computedVolumeStr,
        coachNotes: currentCoachNotes.trim() || undefined,
        sessions: [...pendingSessions],
      };

      // === DEDUPLICATION: If this week number already exists, keep the one with more real sessions ===
      const existingIdx = weeks.findIndex(w => w.weekNumber === currentWeekNumber);
      if (existingIdx !== -1) {
        const existing = weeks[existingIdx];
        const existingRealSessions = existing.sessions.filter(s => !s.isRest).length;
        const newRealSessions = newWeek.sessions.filter(s => !s.isRest).length;
        if (newRealSessions > existingRealSessions) {
          // New version is better — replace
          weeks[existingIdx] = newWeek;
        }
        // Otherwise keep existing (it has more or equal real sessions)
      } else {
        weeks.push(newWeek);
      }

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

    // Table header row (French or English)
    if (trimmed.startsWith("|") && /\b(jour|day)\b/i.test(trimmed)) {
      tableHeaders = trimmed.split("|").map(c => c.trim()).filter(Boolean);
      inTable = true;
      continue;
    }

    // Table separator
    if (inTable && /^\|[\s\-:]+\|/.test(trimmed)) continue;

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

  // === POST-PROCESSING: Remove contradictory rest entries ===
  // If a day has both real sessions and a "Repos" entry, remove the rest entry
  for (const week of weeks) {
    const dayHasRealSession = new Set<number>();
    for (const s of week.sessions) {
      if (!s.isRest && s.dayIndex >= 0) dayHasRealSession.add(s.dayIndex);
    }
    week.sessions = week.sessions.filter(
      s => !(s.isRest && s.dayIndex >= 0 && dayHasRealSession.has(s.dayIndex))
    );
  }

  // === POST-PROCESSING: Fill empty weeks with rest placeholders ===
  // Detect weeks with 0 sessions (AI skipped the table) and fill them
  // by cloning the nearest non-empty week's structure as rest days,
  // or inserting 7 rest days as fallback.
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  for (const week of weeks) {
    if (week.sessions.length === 0) {
      // Try to find the nearest non-empty week to detect expected session count
      const nearestWeek = weeks.find(w => w.sessions.length > 0);
      
      // Fill with 7 rest days so the week is visible in the viewer
      week.sessions = DAYS.map((day, idx) => ({
        weekNumber: week.weekNumber,
        weekTheme: week.theme,
        phase: week.phase,
        dayName: day,
        dayIndex: idx,
        sport: "Repos",
        title: "⚠️ Semaine non générée — Régénérer",
        details: "L'IA n'a pas produit de séances pour cette semaine. Utilisez la régénération pour la compléter.",
        isRest: true,
      }));

      // Flag the week for the coach
      if (!week.coachNotes) {
        week.coachNotes = "⚠️ Cette semaine a été détectée comme vide lors de la génération. Veuillez la régénérer.";
      }
    }
  }

  // === POST-PROCESSING: Detect and fill gaps in week numbering ===
  // If we have weeks 1, 3, 5 but not 2, 4 — insert placeholder weeks
  if (weeks.length > 0) {
    const maxWeekNum = Math.max(...weeks.map(w => w.weekNumber));
    const existingNums = new Set(weeks.map(w => w.weekNumber));
    
    for (let n = 1; n <= maxWeekNum; n++) {
      if (!existingNums.has(n)) {
        // Find the phase this week should belong to
        const prevWeek = weeks.filter(w => w.weekNumber < n).sort((a, b) => b.weekNumber - a.weekNumber)[0];
        const phase = prevWeek?.phase || "";
        
        weeks.push({
          weekNumber: n,
          theme: `Semaine ${n} — ⚠️ Non générée`,
          phase,
          sessions: DAYS.map((day, idx) => ({
            weekNumber: n,
            weekTheme: `Semaine ${n} — Non générée`,
            phase,
            dayName: day,
            dayIndex: idx,
            sport: "Repos",
            title: "⚠️ Semaine manquante — Régénérer",
            details: "Cette semaine n'a pas été générée par l'IA. Utilisez la régénération pour la compléter.",
            isRest: true,
          })),
          coachNotes: "⚠️ Cette semaine est manquante dans la génération originale. Veuillez la régénérer.",
        });
      }
    }
    
    // Re-sort weeks by number
    weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  }

  const dedupedLimiters = dedupeStrategicLimiters(recapLimiters);
  const strategicRecap: StrategicRecap | undefined =
    dedupedLimiters.length > 0
      ? { limiters: dedupedLimiters, synergies: dedupeStrings(recapSynergies) }
      : undefined;
  const canonicalTitle = buildCanonicalPlanTitle(title, markdown, weeks.length);

  return {
    title: canonicalTitle,
    diagnostic: diagnostic || undefined,
    strategicRecap,
    phases,
    weeks,
    totalWeeks: weeks.length,
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

/**
 * ─── FILET DE SÉCURITÉ TRIATHLON : suppression des séances trail ───
 * Un plan triathlon (IM / 70.3 / LCW) ne doit JAMAIS afficher de séance trail,
 * quel que soit le contenu généré par l'IA. Cette fonction filtre les séances
 * dont title/details/sport contiennent des marqueurs trail (IDs, vocab).
 *
 * Complète les trois autres barrières :
 *   1) exclusions catalogue (useAITrainingPlan.getCatalogExclusions)
 *   2) hard-ban prompt (promptHelpers → HARD BAN TRAIL)
 *   3) surgical regen serveur (index.ts → trail-contaminated weeks)
 *
 * Retourne : { plan filtré, séances supprimées } pour affichage d'un warning.
 */
export function sanitizeTrailFromTriathlonPlan(
  plan: ParsedPlan,
  objective: string | null | undefined,
): { plan: ParsedPlan; removed: Array<{ week: number; day: string; title: string }> } {
  const obj = (objective || "").toLowerCase();
  const isTriathlon =
    obj.includes("70.3") ||
    obj === "703" ||
    obj.includes("ironman") ||
    obj === "im" ||
    obj.includes("triathlon");
  const isTrailGoal =
    obj.includes("trail") || obj.includes("utmb") || obj.includes("ccc") || obj.includes("occ") ||
    (obj.includes("ultra") && !obj.includes("ironman"));
  const isRoadRunning =
    !isTriathlon && !isTrailGoal &&
    (obj.includes("semi") || obj.includes("marathon") ||
     obj.includes("10k") || obj.includes("10 km") || obj.includes("10km") ||
     obj.includes("5k") || obj.includes("5 km") || obj.includes("5km") ||
     obj.includes("start") || obj.includes("débutant") || obj.includes("beginner"));

  if (!isTriathlon && !isRoadRunning) return { plan, removed: [] };

  // Marqueurs trail SANS ambiguïté : ID catalogue trail explicite,
  // ou sport déclaré "trail", ou titre "séance trail / trail run".
  const TRAIL_ID_RX =
    /\b(HEDGEHOG_[A-Z0-9_]+|URBAN_[A-Z0-9_]+|TRAIL_[A-Z0-9_]+|[A-Z]+_TRAIL_[A-Z0-9_]+|[A-D]_TR(?:50)?_[A-Z0-9_]+|EXPE_HORS_VILLE_[A-Z0-9_]+|V3_TRAIL_[A-Z0-9_]+)\b/;
  const TRAIL_SPORT_RX = /^\s*trail(\s*running)?\s*$/i;
  const TRAIL_STRONG_TITLE_RX =
    /(s[ée]ance\s+trail|trail\s+run(ning)?|sortie\s+trail|entra[iî]nement\s+trail)/i;

  const removed: Array<{ week: number; day: string; title: string }> = [];

  const cleanedWeeks: ParsedWeek[] = plan.weeks.map((week) => {
    const kept: ParsedSession[] = [];
    for (const s of week.sessions) {
      const title = s.title || "";
      const details = s.details || "";
      const sport = s.sport || "";
      const isTrail =
        TRAIL_ID_RX.test(title) ||
        TRAIL_ID_RX.test(details) ||
        TRAIL_SPORT_RX.test(sport) ||
        TRAIL_STRONG_TITLE_RX.test(title);
      if (isTrail) {
        removed.push({
          week: week.weekNumber,
          day: s.dayName || `J${s.dayIndex + 1}`,
          title: title || "(séance sans titre)",
        });
        // eslint-disable-next-line no-console
        console.warn(
          `🚫 [Sanitizer] Séance trail retirée (objectif non-trail) : S${week.weekNumber} ${s.dayName} — ${title}`,
        );
        continue;
      }
      kept.push(s);
    }
    return { ...week, sessions: kept };
  });

  return { plan: { ...plan, weeks: cleanedWeeks }, removed };
}

