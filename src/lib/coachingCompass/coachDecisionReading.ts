import { nextFieldCheck } from "../diagnostic/compactFieldAssessment";
import { coachPriorities } from "./coachPriorities";
import type { CoachingCompassInput, TFCLCoachingCompassResult } from "./types";

export function coachDecisionReading(input: CoachingCompassInput, presentation?: TFCLCoachingCompassResult["presentation"]) {
  const { factors, overlap, tied } = coachPriorities(input, presentation);
  const lead = factors[0];
  const shared = overlap?.contested && !lead?.hypothesis;
  const reviewGlycolysis = shared || (!lead && overlap) || (lead?.metric === "VLamax" && lead.hypothesis);
  const check = lead?.sport && lead.metric === "tte" && !reviewGlycolysis
    ? { text: "Vérifier la durée tenue au seuil en " + (lead.sport === "run" ? "course à pied" : "vélo") + " et le motif de l’arrêt dans la séance de référence.", module: lead.sport === "run" ? "hold-run" as const : "hold-bike" as const }
    : nextFieldCheck(input, !!reviewGlycolysis);
  return { factors, overlap, tied, lead, shared, check };
}
