/**
 * Nolio Export — generates intervals.icu JSON workout files (one per session)
 * packaged in a ZIP, for direct import into Nolio (.json intervals.icu accepted).
 *
 * intervals.icu workout JSON minimal schema:
 *   { name, type, description, moving_time }
 * type: "Ride" | "Run" | "Swim" | "WeightTraining" | "Other"
 *
 * One file per session, named: YYYY-MM-DD_sport_titre.json
 * Files grouped under semaine-XX/ folders inside the ZIP.
 */
import JSZip from "jszip";
import { format, parseISO, startOfWeek } from "date-fns";

export interface NolioSessionInput {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  custom_workout_title: string | null;
  custom_workout_description: string | null;
  phase: string | null;
}

function sportFromTitle(title: string | null): {
  type: "Ride" | "Run" | "Swim" | "WeightTraining" | "Other";
  label: string;
} {
  if (!title) return { type: "Other", label: "autre" };
  const t = title.toLowerCase();
  if (t.includes("natation") || t.includes("swim")) return { type: "Swim", label: "natation" };
  if (t.includes("vélo") || t.includes("velo") || t.includes("bike") || t.includes("home-trainer") || t.includes("ht ")) return { type: "Ride", label: "velo" };
  if (t.includes("cap") || t.includes("course") || t.includes("run") || t.includes("trail")) return { type: "Run", label: "cap" };
  if (t.includes("muscu") || t.includes("force") || t.includes("renfo")) return { type: "WeightTraining", label: "force" };
  if (t.includes("brick")) return { type: "Ride", label: "brick" };
  return { type: "Other", label: "autre" };
}

/**
 * Heuristic duration extraction from description text.
 * Looks for patterns like "1h30", "90 min", "2 h", "45'", etc.
 * Returns seconds, or a sport-aware default if not found.
 */
function extractDurationSec(description: string | null, sport: string): number {
  if (!description) return defaultDurationSec(sport);
  const txt = description.toLowerCase();

  // "1h30" or "2h"
  const hMin = txt.match(/(\d+)\s*h\s*(\d{1,2})?/);
  if (hMin) {
    const h = parseInt(hMin[1], 10);
    const m = hMin[2] ? parseInt(hMin[2], 10) : 0;
    if (h > 0 && h < 12) return h * 3600 + m * 60;
  }
  // "90 min", "45min"
  const minOnly = txt.match(/(\d{2,3})\s*min/);
  if (minOnly) {
    const m = parseInt(minOnly[1], 10);
    if (m >= 10 && m <= 600) return m * 60;
  }
  // "45'"
  const apo = txt.match(/(\d{2,3})\s*['′]/);
  if (apo) {
    const m = parseInt(apo[1], 10);
    if (m >= 10 && m <= 600) return m * 60;
  }
  return defaultDurationSec(sport);
}

function defaultDurationSec(sport: string): number {
  switch (sport) {
    case "natation": return 60 * 60;       // 1h
    case "velo": return 90 * 60;           // 1h30
    case "cap": return 60 * 60;            // 1h
    case "force": return 45 * 60;
    case "brick": return 120 * 60;         // 2h
    default: return 60 * 60;
  }
}

function sanitize(str: string, max = 80): string {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

export function buildNolioWorkoutJson(session: NolioSessionInput): {
  filename: string;
  content: string;
} {
  const sport = sportFromTitle(session.custom_workout_title);
  const title = session.custom_workout_title || "Séance";
  const description = session.custom_workout_description || "";
  const movingTime = extractDurationSec(description, sport.label);

  const workout = {
    name: title,
    type: sport.type,
    description: [
      session.phase ? `[${session.phase}]` : null,
      description,
    ].filter(Boolean).join("\n\n"),
    moving_time: movingTime,
  };

  const dateStr = session.date; // already YYYY-MM-DD
  const filename = `${dateStr}_${sport.label}_${sanitize(title, 60)}.json`;
  return { filename, content: JSON.stringify(workout, null, 2) };
}

/**
 * Group sessions into ISO weeks (Monday start) for folder structure.
 */
function groupByWeek(sessions: NolioSessionInput[]): Map<string, NolioSessionInput[]> {
  const map = new Map<string, NolioSessionInput[]>();
  for (const s of sessions) {
    const d = parseISO(s.date);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(ws, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

export async function exportSessionsToNolioZip(
  sessions: NolioSessionInput[],
  zipBaseName: string,
): Promise<Blob> {
  const zip = new JSZip();
  const weekGroups = groupByWeek(sessions);

  // Sort weeks chronologically
  const sortedKeys = Array.from(weekGroups.keys()).sort();
  sortedKeys.forEach((weekKey, idx) => {
    const folder = zip.folder(`semaine-${String(idx + 1).padStart(2, "0")}_${weekKey}`);
    if (!folder) return;
    const ws = weekGroups.get(weekKey)!;
    // Sort by date within week
    ws.sort((a, b) => a.date.localeCompare(b.date));
    for (const s of ws) {
      if (!s.custom_workout_title || /repos|rest/i.test(s.custom_workout_title)) continue;
      const { filename, content } = buildNolioWorkoutJson(s);
      folder.file(filename, content);
    }
  });

  // README
  zip.file(
    "README.txt",
    [
      "Export Nolio — Potentiel Physiologique TFCL™",
      "",
      "Format : intervals.icu workout JSON (1 fichier = 1 séance).",
      "Import dans Nolio : onglet 'Prévu' > 'Importer' > glisser le ZIP.",
      "Nolio acceptera tous les .json présents dans l'archive.",
      "",
      `Sessions : ${sessions.length}`,
      `Semaines : ${sortedKeys.length}`,
      `Généré : ${new Date().toISOString()}`,
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob" });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
