// =============================================
// FIX 11 - EFFECTIVE REFS (Source unique de vérité)
// Snapshot actif > Dernier snapshot > Profil (athlete.refs) > null
// ZÉRO valeur par défaut inventée
// =============================================

import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";

export type RefSource = "snapshot" | "profile" | "none";

export interface EffectiveRefs {
  weightKg: number | null;
  fatPct: number | null;
  fcMax: number | null;
  vma: number | null;
  ftp: number | null;
  css: number | null;
  vo2max: number | null;
  sources: {
    weightKg: RefSource;
    fatPct: RefSource;
    fcMax: RefSource;
    vma: RefSource;
    ftp: RefSource;
    css: RefSource;
    vo2max: RefSource;
  };
  // Snapshot utilisé pour les valeurs (si applicable)
  snapshotUsed: DbSnapshot | null;
}

/**
 * Récupère le snapshot effectif (actif si défini, sinon dernier par date)
 */
export function getEffectiveSnapshot(
  athlete: DbAthlete | null,
  snapshots: DbSnapshot[]
): DbSnapshot | null {
  if (!athlete) return null;
  
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
  if (athleteSnapshots.length === 0) return null;

  // Si active_snapshot_id défini et trouvé
  if (athlete.active_snapshot_id) {
    const active = athleteSnapshots.find(s => s.id === athlete.active_snapshot_id);
    if (active) return active;
  }

  // Sinon dernier par date
  const sorted = [...athleteSnapshots].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted[0] || null;
}

/**
 * Parse les refs JSON de l'athlète de manière sécurisée
 */
function parseAthleteRefs(refs: unknown): Record<string, number | null> {
  if (!refs || typeof refs !== "object") return {};
  return refs as Record<string, number | null>;
}

/**
 * Calcule les valeurs effectives avec priorité:
 * Snapshot > Profil (athlete.refs) > null
 * 
 * IMPORTANT: Aucune valeur par défaut (pas de 18%, pas de 70kg)
 */
export function getEffectiveRefs(
  athlete: DbAthlete | null,
  snapshots: DbSnapshot[]
): EffectiveRefs {
  const snapshot = getEffectiveSnapshot(athlete, snapshots);
  const profileRefs = parseAthleteRefs(athlete?.refs);

  // Helper: récupère valeur avec source
  const getValue = (
    snapshotKey: keyof DbSnapshot,
    profileKey: string,
    minValid?: number,  // Valeur minimale considérée comme valide
    maxValid?: number   // Valeur maximale considérée comme valide
  ): { value: number | null; source: RefSource } => {
    // 1. Snapshot
    if (snapshot) {
      const snapshotVal = snapshot[snapshotKey];
      if (snapshotVal != null && typeof snapshotVal === "number") {
        // Vérifier si la valeur est dans les limites valides
        const isValid = (minValid === undefined || snapshotVal >= minValid) &&
                        (maxValid === undefined || snapshotVal <= maxValid);
        if (isValid) {
          return { value: snapshotVal, source: "snapshot" };
        }
        // Valeur aberrante dans le snapshot - on l'ignore et on passe au profil
      }
    }
    // 2. Profil
    const profileVal = profileRefs[profileKey];
    if (profileVal != null && typeof profileVal === "number") {
      return { value: profileVal, source: "profile" };
    }
    // 3. Null
    return { value: null, source: "none" };
  };

  const weightKg = getValue("weight_kg", "weightKg", 30, 200);  // 30-200 kg
  const fatPct = getValue("fat_pct", "fatPct", 3, 50);          // 3-50%
  const fcMax = getValue("fc_max", "fcMax", 100, 250);          // 100-250 bpm
  const vma = getValue("vma", "vma", 8, 30);                    // 8-30 km/h
  const ftp = getValue("ftp", "ftp", 50, 500);                  // 50-500 W
  const css = getValue("css", "css", 50, 200);                  // 50-200 s/100m (valeurs < 50 sont aberrantes)
  const vo2max = getValue("vo2max", "vo2max", 20, 100);         // 20-100 ml/kg/min

  return {
    weightKg: weightKg.value,
    fatPct: fatPct.value,
    fcMax: fcMax.value,
    vma: vma.value,
    ftp: ftp.value,
    css: css.value,
    vo2max: vo2max.value,
    sources: {
      weightKg: weightKg.source,
      fatPct: fatPct.source,
      fcMax: fcMax.source,
      vma: vma.source,
      ftp: ftp.source,
      css: css.source,
      vo2max: vo2max.source,
    },
    snapshotUsed: snapshot,
  };
}

/**
 * Calcule FTP/kg de manière sécurisée (null si données manquantes)
 */
export function computeFtpKg(effective: EffectiveRefs): number | null {
  if (effective.ftp == null || effective.weightKg == null) return null;
  if (effective.weightKg <= 0) return null;
  return effective.ftp / effective.weightKg;
}

/**
 * Liste les champs manquants pour un calcul donné
 */
export function getMissingFields(
  effective: EffectiveRefs,
  required: (keyof EffectiveRefs["sources"])[]
): string[] {
  const labels: Record<keyof EffectiveRefs["sources"], string> = {
    weightKg: "Poids",
    fatPct: "Masse grasse",
    fcMax: "FCmax",
    vma: "VMA",
    ftp: "FTP",
    css: "CSS",
    vo2max: "VO₂max",
  };

  return required
    .filter(key => effective.sources[key] === "none")
    .map(key => labels[key]);
}

/**
 * Retourne le label de source pour l'UI
 */
export function getSourceLabel(source: RefSource): string {
  switch (source) {
    case "snapshot":
      return "Mesuré (snapshot)";
    case "profile":
      return "Renseigné (profil)";
    case "none":
      return "Non renseigné";
  }
}

/**
 * Retourne la classe CSS pour le badge de source
 */
export function getSourceBadgeClass(source: RefSource): string {
  switch (source) {
    case "snapshot":
      return "bg-success/10 text-success border-success/30";
    case "profile":
      return "bg-primary/10 text-primary border-primary/30";
    case "none":
      return "bg-muted text-muted-foreground border-border";
  }
}

// =============================================
// RACE RECORDS (Nolio) — fallback Supabase
// =============================================
import { supabase } from "@/integrations/supabase/client";
import type { RaceRecordsInput } from "@/lib/v2/vlamaxRunV2Enhanced";

/**
 * Récupère les records de course (sport_id=2) depuis nolio_records pour
 * un athlète et renvoie un RaceRecordsInput prêt à passer à
 * `calibrateVLamaxFromRaceRecords` / `computeVLamaxRunV2Enhanced`.
 *
 * Mapping : item_seconds = distance(m), value = temps(s), cat='ppr', record_type='time'.
 */
export async function fetchAthleteRaceRecords(
  athleteId: string,
  vma: number | null,
): Promise<RaceRecordsInput | null> {
  if (!athleteId || !vma || vma <= 0) return null;
  const { data, error } = await supabase
    .from("nolio_records")
    .select("item_seconds, value")
    .eq("athlete_id", athleteId)
    .eq("sport_id", 2)
    .eq("cat", "ppr")
    .eq("record_type", "time")
    .in("item_seconds", [400, 1000, 5000, 10000]);
  if (error || !data || data.length === 0) return null;

  const byDist = new Map<number, number>();
  for (const r of data) {
    const d = Number((r as { item_seconds: number }).item_seconds);
    const v = Number((r as { value: number | string }).value);
    if (Number.isFinite(d) && Number.isFinite(v) && v > 0) {
      // Garde le meilleur (plus petit temps)
      const prev = byDist.get(d);
      if (prev === undefined || v < prev) byDist.set(d, v);
    }
  }

  return {
    vma,
    pace400m_sec: byDist.get(400) ?? null,
    pace1km_sec: byDist.get(1000) ?? null,
    pace5km_sec: byDist.get(5000) ?? null,
    pace10km_sec: byDist.get(10000) ?? null,
  };
}
