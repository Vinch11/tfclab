/**
 * Données de la carte de course, lues comme les rapports : bilan de référence (pickReferenceSnapshot),
 * valeurs effectives (poids reporté du dernier bilan, ancien profil en secours), TTE effective
 * (même entrée que la génération du plan), et liste des courses à simuler.
 */
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { getEffectiveRefs, getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { readCarbTolerance } from "./carbTolerance";
import { readRaceProducts, readSweatTest } from "./raceNutritionProfile";
import { normalizeAmbitionLevel } from "@/types/ambitionLevel";
import { raceKindFromObjective, RACE_LABEL, type RaceCardAthlete, type RaceKind } from "./raceCard";

const ageFrom = (birth: string | null | undefined, today: string) => {
  if (!birth) return null;
  const years = (Date.parse(today) - Date.parse(birth)) / (365.25 * 86400000);
  return Number.isFinite(years) && years > 0 ? Math.floor(years) : null;
};

/** VLamax mesurée = verrouillée (labo ou mode Staff), sinon estimation TFCL. */
const vlamaxOf = (v: VLamaxEffectif | null): { value: number; measured: boolean } | null =>
  v && typeof v.value === "number" && v.value > 0 ? { value: v.value, measured: !!v.isLocked } : null;

export function raceCardAthlete(athlete: DbAthlete | null, snapshots: DbSnapshot[], today = new Date().toISOString().slice(0, 10), tests: Parameters<typeof computeVLamaxEffectif>[0]["tests"] = []): RaceCardAthlete {
  const refs = getEffectiveRefs(athlete, snapshots);
  const snap = getEffectiveSnapshot(athlete, snapshots);
  const rawAmbition = (athlete?.refs as Record<string, unknown> | null)?.ambition ?? (athlete as unknown as Record<string, unknown> | null)?.ambition ?? null;
  const tte = snap?.ftp || refs.ftp ? computeTTEEffectif({
    ftp: refs.ftp, tss_7d: snap?.tss_7d, tte_mode: snap?.tte_mode, tte_observed_min: snap?.tte_observed_min,
    sport: "bike", objectif: athlete?.goal || "IM", age: ageFrom(athlete?.birth_date, today),
  }) : null;
  const vla = (sportOverride: "velo" | "cap") => athlete ? computeVLamaxEffectif({ athleteId: athlete.id, objectif: athlete.goal || "IM", activeSnapshotId: athlete.active_snapshot_id ?? null, tests, snapshots, sportOverride }) : null;
  return {
    vlamaxBike: vlamaxOf(vla("velo")),
    vlamaxRun: vlamaxOf(vla("cap")),
    carbToleranceGH: readCarbTolerance(athlete?.refs)?.gh ?? null,
    sweatRateMlH: readSweatTest(athlete?.refs)?.mlH ?? null, saltySweater: readSweatTest(athlete?.refs)?.salty ?? null, products: readRaceProducts(athlete?.refs),
    ambition: typeof rawAmbition === "string" && rawAmbition.trim() ? normalizeAmbitionLevel(rawAmbition) : null,
    weightKg: refs.weightKg,
    ftpW: refs.ftp,
    cssSecPer100: refs.css,
    vo2max: refs.vo2max,
    tteBikeMin: tte && tte.source !== "unknown" && tte.tte_min > 0 ? tte.tte_min : null,
    fcMax: refs.fcMax,
    snapshot: snap ? { ...snap, ftp: refs.ftp ?? snap.ftp, vma: refs.vma ?? snap.vma, weight_kg: refs.weightKg ?? snap.weight_kg, fc_max: refs.fcMax ?? snap.fc_max } : null,
  };
}

export interface RaceOption {
  key: string;
  kind: RaceKind;
  label: string;
  date: string | null;
  /** Objectif de course enregistré (race goal), pour le format et le résultat. */
  goalId: string | null;
  lcw: boolean;
}
interface GoalLike { id: string; race_type: string; race_name: string | null; race_date: string; race_format: string | null }

/** Courses à venir de l'athlète (objectifs datés), puis l'objectif principal s'il n'y figure pas. Sans 5 km ni StartToRun. */
export function raceOptions(athlete: { goal?: string | null } | null, goals: GoalLike[] | null | undefined, today = new Date().toISOString().slice(0, 10)): RaceOption[] {
  const out: RaceOption[] = [];
  for (const g of [...(goals ?? [])].filter(g => g.race_date >= today).sort((a, b) => a.race_date.localeCompare(b.race_date))) {
    const r = raceKindFromObjective(g.race_type);
    if (!r.kind) continue;
    out.push({ key: `goal:${g.id}`, kind: r.kind, label: `${g.race_name?.trim() || RACE_LABEL[r.kind]} · ${g.race_date.split("-").reverse().join("/")}`, date: g.race_date, goalId: g.id, lcw: g.race_format === "lcw_3day" });
  }
  const main = raceKindFromObjective(athlete?.goal);
  if (main.kind && !out.some(o => o.kind === main.kind)) out.push({ key: `main:${main.kind}`, kind: main.kind, label: `${RACE_LABEL[main.kind]} (objectif principal)`, date: null, goalId: null, lcw: false });
  return out;
}

/** Pourquoi la page n'a rien à simuler pour cet athlète. */
export function simulationUnavailable(athlete: { goal?: string | null } | null, options: RaceOption[]): "not_needed" | "trail" | "no_goal" | null {
  if (options.length) return null;
  const main = raceKindFromObjective(athlete?.goal);
  const reason = "reason" in main ? main.reason : null;
  if (reason === "not_needed") return "not_needed";
  if (reason === "trail") return "trail";
  return "no_goal";
}

/** Menu : la simulation n'apparaît pas pour un objectif StartToRun ou 5 km. */
export function simulationHiddenFor(goal: string | null | undefined): boolean {
  const r = raceKindFromObjective(goal);
  return "reason" in r && r.reason === "not_needed";
}
