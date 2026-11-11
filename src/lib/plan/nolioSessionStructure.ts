/**
 * Étape 2 « Séances précises » : structure envoyée à Nolio.
 * Priorité au texte réel de la séance du plan (« Warm-up: … | Main: … |
 * Cool-down: … »), une fois les tranches de durée résolues — c'est ce que
 * l'athlète doit faire et ce que l'app compte. La structure de la fiche
 * catalogue sert de repli seulement si elle ne contient aucune tranche.
 */
import type { WorkoutStructurePart } from "@/types/workoutLibrary";
import { hasDurationRange, resolveSessionDurationRanges } from "./resolveDurationRanges";

const PART_RX = /^\s*(warm[\s-]*up|échauffement|echauffement|main|corps|cool[\s-]*down|retour au calme)\s*:\s*/i;

function partLabel(raw: string): string {
  const p = raw.toLowerCase();
  if (/warm|chauff/.test(p)) return "Warm-up";
  if (/cool|calme/.test(p)) return "Cool-down";
  return "Main";
}
const zonesOf = (t: string) => [...new Set((t.match(/Z[1-5][abc]?/gi) ?? []).map(z => z.toUpperCase()))];

export function structureFromSessionText(details: string | null | undefined): WorkoutStructurePart[] | null {
  if (!details) return null;
  const chunks = details.replace(/\[ID:[^\]]*\]/g, "").split(/\s*\|\s*/).filter(Boolean);
  const parts: WorkoutStructurePart[] = [];
  for (const c of chunks) {
    const m = c.match(PART_RX);
    if (!m) continue;
    const text = c.slice(m[0].length).trim();
    if (text) parts.push({ part: partLabel(m[1]), text, zones: zonesOf(text) });
  }
  return parts.length ? parts : null;
}

export interface NolioStructureInput { details?: string | null; durationMin?: number; sport?: string | null; isRest?: boolean; phase?: string }

/** Structure à envoyer ; null = description texte seule. */
export function nolioStructureForSession(s: NolioStructureInput, libStructure?: WorkoutStructurePart[] | null): WorkoutStructurePart[] | null {
  if (s.isRest) return null;
  const resolved = resolveSessionDurationRanges({ details: s.details ?? "", durationMin: s.durationMin ?? 0, sport: s.sport ?? undefined, isRest: false, phase: s.phase } as never);
  const details = resolved?.details ?? s.details ?? "";
  const fromText = structureFromSessionText(details);
  if (fromText && !fromText.some(p => hasDurationRange(p.text))) return fromText;
  if (libStructure?.length && !libStructure.some(p => hasDurationRange(p.text))) return libStructure;
  return null;
}
