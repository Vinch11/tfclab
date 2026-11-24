import { computeDecouplingPct } from "../durabilityDecoupling";
import { validTestDate } from "../testMeasurementReview";
import type { TestingWeekNolioSession, NolioStepLike } from "./testingWeekNolioSessions";

export type EnduranceSport = "bike" | "run";
export const durabilityProtocol = "tfcl-durability-paired-v1";
export const separateDay = "Prévoir la durabilité un autre jour que le Day ou les essais maximaux, pendant une sortie longue habituelle.";
export const criticalGuide = {
  run: "Vitesse critique : intégrée au Track Day (1500 m, 3000 m puis 1000 m maximaux, 30 min de récupération entre chaque). Les trois points tombent dans la même séance et se confirment dans le Day. Si le 3000 m dépasse 15 min, utiliser le test vitesse critique en temps (3, 7 et 12 min).",
  bike: "Puissance critique : intégrée au Bike Day, séance « Puissance critique » (12 min, 5 min puis 3 min maximaux, 30 min de récupération entre chaque). Les trois points tombent dans la même séance et se confirment dans le Day ; la FTP en découle (CP × 0,965). Les sprints se font un autre jour.",
};
export function intensity(sport: EnduranceSport, raw: string) {
  if (sport === "bike") return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : 0;
  const pace = /^(\d{1,2}):([0-5]\d)$/.exec(raw);
  return pace ? 60 * Number(pace[1]) + Number(pace[2]) : 0;
}
export function durabilitySession(sport: EnduranceSport, between: number, target: string): TestingWeekNolioSession[] {
  if (!Number.isInteger(between) || between < 1 || between > 300 || !intensity(sport, target)) return [];
  const title = "Durabilité · " + (sport === "bike" ? "vélo" : "course");
  const unit = sport === "bike" ? " W" : " min/km";
  const block = "Tenir " + target + unit + " sur terrain comparable. Marquer le tour. Relever la moyenne réelle, la FC moyenne des 5 dernières minutes et le ressenti sur 10.";
  const step = (minutes: number, notes: string, intensity_type: NolioStepLike["intensity_type"] = "active"): NolioStepLike =>
    ({type:"step", step_duration_type:"duration", step_duration_value:minutes*60, intensity_type, target_type:"no_target", notes});
  const details = separateDay + " Choisir une cible d’endurance déjà tolérée et conserver matériel, terrain et ravitaillement comparables. Consigner la chaleur et toute interruption.";
  return [{weekNumber:1,dayIndex:0,sessionIndex:0,sport,title,objectif:details,details,isRest:false,structuredWorkout:[
    step(15,"Échauffement progressif","warmup"),step(10,block),step(between,"Endurance habituelle, maintenir une intensité régulière."),step(10,block),step(5,"Retour au calme","cooldown"),
  ]}];
}

type SavedPair = {
  day: string; sport: EnduranceSport; between: number; target: string;
  early: string; late: string; hr1: number; hr2: number;
  rpe1: number; rpe2: number; context: string;
};
export function validPair(value: unknown): value is SavedPair {
  if (!value || typeof value !== "object") return false;
  const p = value as SavedPair;
  const num = (v: number, min:number, max:number) => Number.isInteger(v) && v >= min && v <= max;
  return (p.sport === "run" || p.sport === "bike") && typeof p.day === "string" && validTestDate(p.day)
    && num(p.between,1,300) && [p.target,p.early,p.late].every(v=>typeof v==="string" && intensity(p.sport,v)>0)
    && [p.hr1,p.hr2].every(v=>num(v,1,260)) && [p.rpe1,p.rpe2].every(v=>num(v,0,10))
    && typeof p.context === "string" && !!p.context.trim();
}

/** Positive = less output per heartbeat after the intervening load. Pace must first become speed. */
export function pairedDecoupling(pair: SavedPair): number | null {
  if (!validPair(pair)) return null;
  const output = (value: string) => pair.sport === 'bike' ? intensity('bike', value) : 1000 / intensity('run', value);
  return computeDecouplingPct({ output1: output(pair.early), output2: output(pair.late), hr1: pair.hr1, hr2: pair.hr2 });
}

export function latestPairs(tests: readonly { athlete_id:string; type:string; raw:unknown }[], athleteId:string, through?:string) {
  const rows = tests.flatMap(t=>t.athlete_id===athleteId && t.type===durabilityProtocol && validPair(t.raw) && (!through || t.raw.day <= through) ? [t.raw] : []);
  return (["run","bike"] as const).flatMap(sport => rows.filter(p=>p.sport===sport).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,1));
}

/**
 * Séance de durabilité pour le plan de tests (Days) : même structure que `durabilitySession`,
 * sans cible chiffrée (le coach la choisit à l'envoi dans « Durabilité »). Vélo ≥ 2 h, course ≥ 1 h 30.
 */
export function durabilityPlanSession(sport: EnduranceSport): TestingWeekNolioSession {
  const between = sport === "bike" ? 120 : 60;
  const block = "Tenir la cible d’endurance choisie par le coach (" + (sport === "bike" ? "puissance" : "allure") + " déjà tolérée, haut de Z2) sur terrain comparable. Marquer le tour. Relever la moyenne réelle, la FC moyenne des 5 dernières minutes et le ressenti sur 10.";
  const step = (minutes: number, notes: string, intensity_type: NolioStepLike["intensity_type"] = "active"): NolioStepLike =>
    ({type:"step", step_duration_type:"duration", step_duration_value:minutes*60, intensity_type, target_type:"no_target", notes});
  const details = separateDay + " Les deux blocs de 10 min à la même cible, au début et à la fin, mesurent la perte d’efficacité après l’effort prolongé. Enregistrer les résultats dans « Durabilité ».";
  return {weekNumber:1,dayIndex:0,sessionIndex:0,sport,title:"TFCL Durability Day™ · " + (sport === "bike" ? "vélo" : "course"),objectif:details,details,isRest:false,structuredWorkout:[
    step(15,"Échauffement progressif","warmup"),step(10,block),step(between,"Endurance habituelle, maintenir une intensité régulière ; ravitaillement comme en course."),step(10,block),step(5,"Retour au calme","cooldown"),
  ]};
}
