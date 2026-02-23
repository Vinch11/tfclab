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

export interface ParsedPlan {
  title: string;
  diagnostic?: string;
  phases: { name: string; weeks: string; objective?: string; volume?: string }[];
  weeks: ParsedWeek[];
  totalWeeks: number;
}

const DAY_MAP: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3,
  vendredi: 4, samedi: 5, dimanche: 6,
};

function normDay(raw: string): { name: string; index: number } {
  const lower = raw.trim().toLowerCase();
  for (const [key, idx] of Object.entries(DAY_MAP)) {
    if (lower.startsWith(key)) return { name: key.charAt(0).toUpperCase() + key.slice(1), index: idx };
  }
  return { name: raw.trim(), index: -1 };
}

function isRestSession(sport: string, title: string): boolean {
  const combined = `${sport} ${title}`.toLowerCase();
  return /repos|rest|off|récup|recovery/.test(combined);
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

  const flushWeek = () => {
    if (currentWeekNumber > 0 && pendingSessions.length > 0) {
      weeks.push({
        weekNumber: currentWeekNumber,
        theme: currentWeekTheme,
        phase: currentPhase,
        phaseObjective: currentPhaseObjective,
        volumeTarget: currentVolumeTarget,
        coachNotes: currentCoachNotes.trim() || undefined,
        sessions: [...pendingSessions],
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

    // Phase header: ## Phase N : Name (Semaines X-Y)
    const phaseMatch = trimmed.match(/^##\s*Phase\s*(\d+)\s*[:\-–—]\s*(.+?)(?:\s*\(.*?(\d+)\s*[-–—à]\s*(\d+).*?\))?$/i);
    if (phaseMatch) {
      flushWeek();
      collectingCoachNotes = false;
      currentPhase = `Phase ${phaseMatch[1]} : ${phaseMatch[2].trim()}`;
      const weeksRange = phaseMatch[3] && phaseMatch[4] ? `${phaseMatch[3]}-${phaseMatch[4]}` : "";
      phases.push({ name: currentPhase, weeks: weeksRange });
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

    // Week header: ### Semaine N — Theme
    const weekMatch = trimmed.match(/^###\s*Semaine\s*(\d+)\s*[—\-–:]\s*(.+)/i);
    if (weekMatch) {
      flushWeek();
      collectingCoachNotes = false;
      currentWeekNumber = parseInt(weekMatch[1], 10);
      currentWeekTheme = weekMatch[2].trim();
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

    // Table header row
    if (trimmed.startsWith("|") && trimmed.includes("Jour")) {
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

  return {
    title: title || "Plan TFCL™",
    diagnostic: diagnostic || undefined,
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
