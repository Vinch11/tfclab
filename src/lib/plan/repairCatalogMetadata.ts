import type { LibraryWorkout } from "@/types/workoutLibrary";
import { intentFamilyOf } from "./intentFamily";
import { ficheAllowedPhases } from "./phaseNormalization";
import type { RepairWorkoutMetadata } from "../../../supabase/functions/_shared/repairSportingEquivalence";

function mainZoneMax(workout: LibraryWorkout): number {
  let max = 0;
  for (const part of workout.structure ?? []) {
    if (!/main/i.test(part.part ?? "")) continue;
    for (const zone of part.zones ?? []) {
      const match = String(zone).match(/z\s*([1-7])/i);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }
  return max;
}

function specialContext(workout: LibraryWorkout): string | null {
  const id = String(workout.id ?? "");
  const tags = (workout.tags ?? []).map(String).join(" ").toLowerCase();
  const text = `${id} ${tags} ${workout.objectif ?? ""} ${workout.when ?? ""}`.toLowerCase();
  if (/(?:^|_)heat(?:_|$)|\bheat\b|sauna/.test(text)) return "heat";
  if (/fatigue-cognitive|fatigue cognitive/.test(text)) return "fatigue_cognitive";
  if (/altitude/.test(text)) return "altitude";
  if (/fatmax|fat[-_ ]?max/.test(text) || /^FM_/i.test(id)) return "fatmax_module";
  if (/train[-_ ]?low|sleep[-_ ]?low|fasted|a jeun|à jeun/.test(text)) return "fasted";
  if (/post[-_ ]?bike|off[-_ ]?bike|apres velo|après vélo|jambes fatiguees|jambes fatiguées/.test(text)) return "post_bike";
  return null;
}

function prerequisiteKeys(workout: LibraryWorkout): string[] {
  const text = `${workout.when ?? ""} · ${workout.avoid ?? ""}`;
  const keys = new Set<string>();
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const match of normalized.matchAll(/(?:sans|jamais sans)\s+([^.;·]+)/g)) {
    const key = match[1].replace(/\([^)]*\)/g, "").trim();
    if (key && !/^douleur|^fatigue|^adaptation/.test(key)) keys.add(key);
  }
  if (/lactatemetre|mesure lactate/.test(normalized)) keys.add("lactatemetre");
  if (/capteur de puissance|power meter/.test(normalized)) keys.add("capteur_puissance");
  if (/double threshold|double seuil/.test(normalized)) keys.add("bloc_double_seuil");
  return [...keys].sort();
}

function isObjectiveSpecific(workout: LibraryWorkout): boolean {
  const text = `${workout.id} ${workout.objectif ?? ""} ${workout.when ?? ""} ${(workout.tags ?? []).join(" ")}`;
  return /(?:^|_)(?:IM|703|SEMI|MAR(?:ATHON)?|10K|5K)(?:_|$)|70[.,]?3|ironman|semi[- ]?marathon|allure\s+(?:semi|marathon|10\s*km|5\s*km)/i.test(text);
}

export function buildRepairWorkoutMetadata(workout: LibraryWorkout): RepairWorkoutMetadata {
  const zones = new Set<string>();
  const structure = (workout.structure ?? []).map(part => {
    for (const zone of part.zones ?? []) zones.add(String(zone));
    return `${part.part}: ${part.text}`;
  }).join(" | ");
  return {
    variants: { ...(workout.variants ?? {}) },
    metadataVersion: 1,
    complete: true,
    id: workout.id,
    sport: workout.sport,
    title: workout.objectif || workout.id,
    objective: workout.objectif || "",
    intentFamily: intentFamilyOf(workout),
    goals: [...(workout.goals ?? [])],
    objectiveSpecific: isObjectiveSpecific(workout),
    phases: [...ficheAllowedPhases(workout)],
    durationMin: [workout.durationMin[0], workout.durationMin[1]],
    mainZoneMax: mainZoneMax(workout),
    specialContext: specialContext(workout),
    prerequisiteKeys: prerequisiteKeys(workout),
    necessity: workout.necessite,
    when: workout.when ?? "",
    avoid: workout.avoid ?? "",
    tags: [...(workout.tags ?? [])],
    structure,
    zones: [...zones],
  };
}

