// =============================================
// ATHLETE HELPERS - Effective Profile & Utils
// =============================================

import { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";

/**
 * Get the active snapshot for an athlete
 */
export function getActiveSnapshot(
  athlete: DbAthlete | null,
  snapshots: DbSnapshot[]
): DbSnapshot | null {
  if (!athlete?.active_snapshot_id) return null;
  return snapshots.find(s => s.id === athlete.active_snapshot_id) || null;
}

/**
 * Get the most recent snapshot for an athlete
 */
export function getLatestSnapshot(
  athleteId: string,
  snapshots: DbSnapshot[]
): DbSnapshot | null {
  const athleteSnapshots = snapshots
    .filter(s => s.athlete_id === athleteId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return athleteSnapshots[0] || null;
}

/**
 * Effective profile combines athlete refs with active snapshot data
 * Snapshot values override athlete refs when present
 */
export interface EffectiveProfile {
  fcMax: number | null;
  vma: number | null;
  ftp: number | null;
  css: number | null;
  vo2max: number | null;
  vlamax: number | null;
  weightKg: number | null;
  fatPct: number | null;
  pmax5s: number | null;
  metabolicProfile: string | null;
  metabolicScore: number | null;
  source: "refs" | "snapshot" | "mixed";
}

export function getEffectiveProfile(
  athlete: DbAthlete | null,
  snapshots: DbSnapshot[]
): EffectiveProfile {
  const defaultProfile: EffectiveProfile = {
    fcMax: null,
    vma: null,
    ftp: null,
    css: null,
    vo2max: null,
    vlamax: null,
    weightKg: null,
    fatPct: null,
    pmax5s: null,
    metabolicProfile: null,
    metabolicScore: null,
    source: "refs"
  };

  if (!athlete) return defaultProfile;

  // Parse athlete refs (stored as JSONB)
  const refs = (athlete.refs as Record<string, unknown>) || {};
  
  // Start with refs values
  const profile: EffectiveProfile = {
    fcMax: safeNum(refs.fcMax),
    vma: safeNum(refs.vma),
    ftp: safeNum(refs.ftp),
    css: safeNum(refs.css),
    vo2max: safeNum(athlete.vo2max) ?? safeNum(refs.vo2max),
    vlamax: null,
    weightKg: safeNum(refs.weightKg),
    fatPct: safeNum(refs.fatPct),
    pmax5s: safeNum(refs.pmax5s),
    metabolicProfile: null,
    metabolicScore: null,
    source: "refs"
  };

  // Get active snapshot if set
  const activeSnapshot = getActiveSnapshot(athlete, snapshots);
  
  if (activeSnapshot) {
    // Override with snapshot values where present
    if (activeSnapshot.fc_max != null) profile.fcMax = activeSnapshot.fc_max;
    if (activeSnapshot.vma != null) profile.vma = Number(activeSnapshot.vma);
    if (activeSnapshot.ftp != null) profile.ftp = activeSnapshot.ftp;
    if (activeSnapshot.css != null) profile.css = Number(activeSnapshot.css);
    if (activeSnapshot.vo2max != null) profile.vo2max = Number(activeSnapshot.vo2max);
    if (activeSnapshot.vlamax != null) profile.vlamax = Number(activeSnapshot.vlamax);
    if (activeSnapshot.weight_kg != null) profile.weightKg = Number(activeSnapshot.weight_kg);
    if (activeSnapshot.fat_pct != null) profile.fatPct = Number(activeSnapshot.fat_pct);
    if (activeSnapshot.pmax_5s != null) profile.pmax5s = activeSnapshot.pmax_5s;
    if (activeSnapshot.metabolic_profile) profile.metabolicProfile = activeSnapshot.metabolic_profile;
    if (activeSnapshot.metabolic_score != null) profile.metabolicScore = activeSnapshot.metabolic_score;
    
    profile.source = "snapshot";
  } else {
    // Check if we have any values from refs
    const hasRefs = Object.values(profile).some(v => v !== null && v !== "refs");
    if (!hasRefs) {
      profile.source = "refs";
    }
  }

  return profile;
}

/**
 * Create an empty athlete object (no demo data)
 */
export function createEmptyAthleteData(name: string, goal?: string) {
  return {
    name: name.trim() || "Nouvel athlète",
    goal: goal || null,
    refs: {
      fcMax: null,
      vma: null,
      ftp: null,
      css: null,
      vo2max: null,
      weightKg: null,
      fatPct: null,
      pmax5s: null
    },
    vo2max: null,
    active_snapshot_id: null
  };
}

/**
 * Check if an athlete appears to be demo data
 */
export function isDemoAthlete(athlete: DbAthlete | null): boolean {
  if (!athlete) return false;
  const name = (athlete.name || "").toLowerCase();
  const demoNames = ["alice", "bob", "charlie", "demo", "example", "exemple", "test athlete"];
  return demoNames.some(d => name.includes(d));
}

// Helper to safely convert to number
function safeNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
