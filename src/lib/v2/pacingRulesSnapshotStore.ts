/**
 * Pacing Rules Snapshot Store
 * 
 * Persistance locale (localStorage) des snapshots de règles par surface
 * (interactive_full, staff_report, athlete_briefing) afin de comparer
 * avant/après une modification du mapping.
 *
 * Volontairement client-side : il s'agit d'un outil d'audit pour le coach,
 * pas d'une donnée athlète. Aucune table backend n'est requise.
 */

import {
  checkPacingRulesParity,
  type ExportSurface,
  type SurfaceSnapshot,
  type ParityCheckResult,
} from "./pacingRulesParityCheck";
import type { DisciplineRulesResult, DisciplineRule } from "./pacingDisciplineRules";

const STORAGE_KEY = "tfcl-pacing-rules-snapshots-v1";
const MAX_SNAPSHOTS = 20;

export interface StoredRule {
  id: string;
  title: string;
  message: string;
  priority: DisciplineRule["priority"];
  category?: string;
  source?: string;
}

export interface StoredSnapshot {
  id: string;                 // uuid local
  label: string;              // libellé saisi par le coach
  createdAt: string;          // ISO
  context: {
    raceObjective?: string;
    discipline?: string;
    athleteName?: string;
    rulesEngineVersion?: string;
  };
  surfaces: Record<ExportSurface, SurfaceSnapshot>;
  rules: StoredRule[];        // contenu complet pour pouvoir diff text
  parity: ParityCheckResult;
}

export interface SnapshotDiff {
  addedRuleIds: string[];
  removedRuleIds: string[];
  changedRuleIds: string[];   // même id, contenu différent
  bySurface: Record<
    ExportSurface,
    { added: string[]; removed: string[] }
  >;
  parityDelta: {
    droppedInStaffDelta: number;
    droppedInAthleteDelta: number;
    criticalIssuesDelta: number;
  };
}

function readAll(): StoredSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: StoredSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SNAPSHOTS)));
  } catch {
    // quota — ignore silencieusement
  }
}

function flattenRules(rules: DisciplineRulesResult): StoredRule[] {
  const all: DisciplineRule[] = [
    ...(rules.nonNegotiables ?? []),
    ...(rules.tacticals ?? []),
    ...(rules.coachPhrases ?? []),
    ...(rules.prohibitions ?? []),
  ];
  return all.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    priority: r.priority,
    category: (r as any).category,
    source: r.source,
  }));
}

export function listSnapshots(): StoredSnapshot[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSnapshot(
  rules: DisciplineRulesResult,
  label: string,
  context: StoredSnapshot["context"] = {},
): StoredSnapshot {
  const parity = checkPacingRulesParity(rules);
  const snapshot: StoredSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: label.trim() || `Snapshot ${new Date().toLocaleString("fr-FR")}`,
    createdAt: new Date().toISOString(),
    context,
    surfaces: {
      interactive_full: parity.snapshots.find((s) => s.surface === "interactive_full")!,
      staff_report: parity.snapshots.find((s) => s.surface === "staff_report")!,
      athlete_briefing: parity.snapshots.find((s) => s.surface === "athlete_briefing")!,
    },
    rules: flattenRules(rules),
    parity,
  };
  const all = [snapshot, ...readAll()];
  writeAll(all);
  return snapshot;
}

export function deleteSnapshot(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function clearSnapshots() {
  writeAll([]);
}

export function diffSnapshots(prev: StoredSnapshot, next: StoredSnapshot): SnapshotDiff {
  const prevIds = new Set(prev.rules.map((r) => r.id));
  const nextIds = new Set(next.rules.map((r) => r.id));
  const prevById = new Map(prev.rules.map((r) => [r.id, r]));
  const nextById = new Map(next.rules.map((r) => [r.id, r]));

  const addedRuleIds = [...nextIds].filter((id) => !prevIds.has(id));
  const removedRuleIds = [...prevIds].filter((id) => !nextIds.has(id));
  const changedRuleIds: string[] = [];
  for (const id of nextIds) {
    if (!prevIds.has(id)) continue;
    const a = prevById.get(id)!;
    const b = nextById.get(id)!;
    if (
      a.title !== b.title ||
      a.message !== b.message ||
      a.priority !== b.priority ||
      a.source !== b.source
    ) {
      changedRuleIds.push(id);
    }
  }

  const surfaces: ExportSurface[] = ["interactive_full", "staff_report", "athlete_briefing"];
  const bySurface = {} as SnapshotDiff["bySurface"];
  for (const s of surfaces) {
    const a = new Set(prev.surfaces[s].ruleIds);
    const b = new Set(next.surfaces[s].ruleIds);
    bySurface[s] = {
      added: [...b].filter((id) => !a.has(id)),
      removed: [...a].filter((id) => !b.has(id)),
    };
  }

  const prevCritical = prev.parity.issues.filter((i) => i.severity === "critical").length;
  const nextCritical = next.parity.issues.filter((i) => i.severity === "critical").length;

  return {
    addedRuleIds,
    removedRuleIds,
    changedRuleIds,
    bySurface,
    parityDelta: {
      droppedInStaffDelta:
        next.parity.summary.droppedInStaff - prev.parity.summary.droppedInStaff,
      droppedInAthleteDelta:
        next.parity.summary.droppedInAthlete - prev.parity.summary.droppedInAthlete,
      criticalIssuesDelta: nextCritical - prevCritical,
    },
  };
}

export function exportSnapshotsJSON(): string {
  return JSON.stringify(readAll(), null, 2);
}
