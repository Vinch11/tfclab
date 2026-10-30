/**
 * Read-only coach preview, without casting incomplete V3 data to the legacy
 * LibraryWorkout (which requires a numeric duration). No Nolio API calls.
 */
import { getDoctrineDomain } from "../zones/tfclDoctrine";
import {
  evaluateV3Workout, type Overrides, type Paces, type V3Block, type V3Workout,
} from "./catalogueRuntime";

function amount(minimum: number, maximum: number, value: number, override?: number): number {
  const n = override ?? value;
  if (!Number.isFinite(n) || n < minimum || n > maximum) throw new Error("V3_PREVIEW_OUT_OF_BOUNDS");
  return n;
}
function formatSeconds(sec: number): string {
  const mins = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return mins > 0 ? (seconds ? mins + "min" + seconds + "s" : mins + "min") : seconds + "s";
}
function blockText(block: V3Block, path: string, overrides: Overrides, indent: string): string[] {
  if (block.kind === "repeat") {
    const count = amount(block.count.min, block.count.max, block.count.base, overrides[path + ".count"]);
    const head = indent + count + "× " + block.label +
      (block.betweenSec ? " — récupération ENTRE séries : " + formatSeconds(block.betweenSec) : "");
    return [head, ...block.steps.flatMap((b, i) => blockText(b, path + "." + i, overrides, indent + "  "))];
  }
  const unit = block.kind === "time" ? "seconds" : block.kind === "distance" ? "meters" : "reps";
  const bounds = block[unit]!;
  const q = amount(bounds.min, bounds.max, bounds.base, overrides[path + "." + unit]);
  const quantity = unit === "seconds" ? formatSeconds(q) : unit === "meters" ? q + "m" : q + " répétitions";
  const intensity = block.domain ? " · " + getDoctrineDomain(block.domain).label : "";
  const sides = block.kind === "reps" && block.sides === 2 ? " par côté" : "";
  return [indent + "• " + quantity + sides + " — " + block.label + intensity];
}

export function previewV3Workout(
  workout: V3Workout,
  opts: { swimPaces?: Paces; overrides?: Overrides } = {},
) {
  // Fail on an invalid override before showing a misleading preview.
  const duration = evaluateV3Workout(workout, opts);
  const sections = workout.blocks.flatMap((b, i) => blockText(b, String(i), opts.overrides ?? {}, ""));
  const durationText = duration.status === "unresolved"
    ? "Durée non résolue : fournir les allures personnelles pour chaque domaine nécessaire"
    : duration.status === "estimated"
      ? "Durée indicative (hors réglages/transitions) : " + duration.minutes!.toFixed(1) + " min"
      : "Durée calculée : " + duration.minutes!.toFixed(1) + " min";
  return {
    id: workout.id,
    title: workout.title,
    sport: workout.sport,
    objective: workout.focus,
    physiologicalIntent: workout.primaryIntent,
    phase: workout.phase,
    sections,
    durationText,
    distanceM: duration.distanceM,
    unresolved: duration.unknown,
    status: "candidate" as const,
    automaticallyPrescribable: false as const,
    fullText: [
      workout.title + " [" + workout.id + "]",
      "Intention : " + workout.focus,
      ...sections,
      durationText,
      duration.distanceM ? "Distance : " + duration.distanceM + " m" : "",
      "Arrêt : " + workout.stopRule,
      "Statut : candidat non validé — aucune prescription automatique",
    ].filter(Boolean).join("\n"),
  };
}