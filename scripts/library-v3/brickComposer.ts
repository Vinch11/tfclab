/**
 * Experimental composite brick previews. A bike/run composite is NOT counted
 * among the 400 single-sport candidates and is NEVER an active plan session.
 * Each component retains its own warmup and cooldown. No hidden cropping.
 */
import { evaluateV3Workout, v3FullCatalogue, type V3Workout } from "./catalogueRuntime";
export interface V3BrickBlueprint {
  id: string;
  name: string;
  bikeId: string;
  runId: string;
  transitionSeconds: number;
  objective: "half" | "ironman";
  status: "candidate";
  coachApprovalRequired: true;
  notes: string;
}
export const brickBlueprints: V3BrickBlueprint[] = [
 { id:"V3B_703_001", name:"70.3 posture et sortie aérobie", bikeId:"V3P_BIKE_012",runId:"V3P_RUN_001",transitionSeconds:300,objective:"half",status:"candidate",coachApprovalRequired:true,notes:"Vélo spécifique + course aisée; conserver échauffement et retour au calme des composants" },
 { id:"V3B_703_002", name:"70.3 départ prudent transition course",bikeId:"V3P_BIKE_084",runId:"V3P_RUN_002",transitionSeconds:240,objective:"half",status:"candidate",coachApprovalRequired:true,notes:"Ne pas ajouter de charge au-delà de la recette; tenir compte du volume total" },
 { id:"V3B_703_003", name:"70.3 nutrition et aisance",bikeId:"V3P_BIKE_090",runId:"V3P_RUN_002",transitionSeconds:300,objective:"half",status:"candidate",coachApprovalRequired:true,notes:"Vérifier apport glucidique individuel" },
 { id:"V3B_703_004", name:"70.3 modulation posture et course facile",bikeId:"V3P_BIKE_085",runId:"V3P_RUN_001",transitionSeconds:300,objective:"half",status:"candidate",coachApprovalRequired:true,notes:"Vérifier posture aéro / locomotion après vélo" },
 { id:"V3B_703_005", name:"70.3 simulation par étages",bikeId:"V3P_BIKE_039",runId:"V3P_RUN_001",transitionSeconds:300,objective:"half",status:"candidate",coachApprovalRequired:true,notes:"Ne jamais substituer à un brick court en semaine de récupération" },
 { id:"V3B_IM_001", name:"Ironman durabilité après vélo long",bikeId:"V3P_BIKE_038",runId:"V3P_RUN_002",transitionSeconds:300,objective:"ironman",status:"candidate",coachApprovalRequired:true,notes:"Niveau et historique long indispensables" },
 { id:"V3B_IM_002", name:"Ironman préfatigue aérobie et transition",bikeId:"V3P_BIKE_083",runId:"V3P_RUN_001",transitionSeconds:300,objective:"ironman",status:"candidate",coachApprovalRequired:true,notes:"Ne pas employer comme récupération ni sortie courte" },
 { id:"V3B_IM_003", name:"Ironman pacing conservateur puis reprise",bikeId:"V3P_BIKE_081",runId:"V3P_RUN_001",transitionSeconds:300,objective:"ironman",status:"candidate",coachApprovalRequired:true,notes:"Longue durée; tester nutrition et récupération" },
];
function lookup(id: string): V3Workout {
  const w = v3FullCatalogue.workouts.find(x => x.id === id);
  if (!w) throw new Error("V3_BRICK_UNKNOWN_COMPONENT:" + id);
  return w;
}
export function previewV3Brick(id: string) {
 const spec = brickBlueprints.find(x => x.id === id);
 if (!spec) throw new Error("V3_BRICK_UNKNOWN:" + id);
 if (!Number.isFinite(spec.transitionSeconds) || spec.transitionSeconds < 0 || spec.transitionSeconds > 1200)
   throw new Error("V3_BRICK_UNSAFE_TRANSITION");
 const bike = lookup(spec.bikeId), run = lookup(spec.runId);
 if (bike.sport !== "bike" || run.sport !== "run") throw new Error("V3_BRICK_WRONG_DISCIPLINE");
 if (bike.automaticSelection || run.automaticSelection || bike.status !== "candidate" || run.status !== "candidate")
   throw new Error("V3_BRICK_UNEXPECTED_RELEASE_STATE");
 const bikeDuration = evaluateV3Workout(bike);
 const runDuration = evaluateV3Workout(run);
 if (bikeDuration.seconds === null || runDuration.seconds === null ||
     bikeDuration.status !== "confirmed" || runDuration.status !== "confirmed") throw new Error("V3_BRICK_UNVERIFIED_DURATION");
 const totalSeconds = bikeDuration.seconds + spec.transitionSeconds + runDuration.seconds;
 return {
   ...spec,
   bikeTitle: bike.title, runTitle: run.title,
   bikeMinutes: bikeDuration.minutes!, runMinutes: runDuration.minutes!,
   transitionMinutes: spec.transitionSeconds / 60, totalMinutes: totalSeconds / 60,
   automaticSelectionAllowed: false as const,
   durationCalculated: true as const,
   releaseDecision: "NO_GO_SPORTING_AND_PERSISTENCE" as const,
 };
}