import {timeTrialProblems,type TimeTrialDeclaration} from '../../../experimental/det-engine/v410-time-trial-contract';
import type { TrailPlanningDeclaration } from '../../../experimental/det-engine/v407-reviewed-trail-contract';
import { v3ExtendedCatalogue } from '../../../scripts/library-v3/supplementalCatalogue';
import { findLibrary920Source,library920Catalogue,library920SourceMetadata } from '../../../scripts/library-v3/library920Catalogue';
import { library920ContextProblems } from './library920Selection';
import type { RaceGoal } from '@/hooks/useAITrainingPlan';
/**
 * Contexte de revue coach pour DET (QA). Pur, sérialisable, sans réseau.
 *
 * - Les entrées viennent UNIQUEMENT de ce que le coach a saisi/confirmé ;
 *   aucune valeur de fixture, aucun défaut de population.
 * - Une estimation reste une estimation : sa nature, sa méthode et son
 *   incertitude sont obligatoires et conservées.
 * - Une qualification de source V3 est liée à l'athlète, au coach, à
 *   l'empreinte des entrées et à la version des sources. Tout changement ⇒
 *   revue périmée ⇒ refus précis. Elle ne vaut JAMAIS approbation du plan.
 * - Aucune source n'est approuvée par défaut.
 */
import { v3FullCatalogue, type V3Workout } from "../../../scripts/library-v3/catalogueRuntime";
import { fingerprintV3SportingSource, type V3IndividualSportingEvidence } from "../../../scripts/library-v3/sportingQualification800";
import { resolveV3IntensityTargets, type V3AthleteAnchors } from "../../../scripts/library-v3/resolveV3Intensity";
import type { V3ReviewedSettings } from "../../../experimental/det-engine/v31-v3-catalogue";
import { clockProblems, coachObjectiveKey, coachFamilyFor, isRealYmd, COACH_BLOCKED_OBJECTIVES, COACH_FAMILIES, COACH_703_BRICK_IDS, coachBrickIdsFor, type CoachBrickApproval, type CoachConfirmedClock } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { canonicalJson, sha256Hex } from "@/lib/plan/appendOnlyPlanVersionSave";

export const COACH_INPUTS_SCHEMA = "tfcl.det.coach-inputs.v1" as const;

export type AnchorKey =
  | "runThresholdPaceSecPerKm" | "runVvo2SpeedMps" | "runSprintSpeedRangeMps"
  | "bikeFtpWatts" | "bikePmaWatts" | "bikeSprintPowerRangeWatts" | "cssSecPer100m";
export const ANCHOR_LABELS: Record<AnchorKey, string> = {
  runThresholdPaceSecPerKm: "Allure seuil course (s/km)",
  runVvo2SpeedMps: "Vitesse VO₂max course (m/s)",
  runSprintSpeedRangeMps: "Plage vitesse sprint course (m/s)",
  bikeFtpWatts: "FTP vélo (W)",
  bikePmaWatts: "PMA vélo (W)",
  bikeSprintPowerRangeWatts: "Plage puissance sprint vélo (W)",
  cssSecPer100m: "CSS natation (s/100 m)",
};

/** Domaines d'allure natation du catalogue V3 (clés exactes de `resolveV3IntensityTargets`). */
export const SWIM_DOMAINS = ["recovery", "moderate_lt1", "tempo", "im_pace", "703_pace", "marathon_pace", "sub_threshold", "semi_pace", "mlss", "vo2max", "neuromuscular"] as const;
export type SwimDomain = typeof SWIM_DOMAINS[number];
export const SWIM_DOMAIN_LABELS: Record<SwimDomain, string> = {
  recovery: "récupération", moderate_lt1: "endurance fondamentale", tempo: "tempo", im_pace: "allure Ironman", "703_pace": "allure 70.3",
  marathon_pace: "allure marathon", sub_threshold: "sous-seuil", semi_pace: "allure semi", mlss: "seuil (MLSS)", vo2max: "VO₂max", neuromuscular: "neuromusculaire",
};

export type PhysioKey = "vo2max" | "weightKg" | "tteRunMin" | "vlamaxRun" | "vlamaxBike" | "fcMax";
export const PHYSIO_LABELS: Record<PhysioKey, string> = {
  vo2max: "VO₂max (ml/kg/min)", weightKg: "Poids (kg)", tteRunMin: "TTE course (min)",
  vlamaxRun: "VLamax course (mmol/l/s)", vlamaxBike: "VLamax vélo (mmol/l/s)", fcMax: "FC max (bpm)",
};

/** Libellés coach : les séances cardio et la force sont comptées séparément. */
export const SESSION_COUNT_LABELS = {
  sessionsPerWeek: "Séances d'endurance/cardio par semaine (force non comprise)",
  strengthSessionsPerWeek: "Séances de force par semaine (comptées à part)",
  maxSessionsPerDay: "Séances maximum par jour (toutes séances)",
} as const;
export const ATHLETE_LEVEL_LABELS: Record<V3ReviewedSettings["athleteLevel"], string> = {
  untrained: "Débutant (peu ou pas d'entraînement structuré)",
  light: "Entraînement léger et régulier",
  trained: "Entraîné (plusieurs années, séances structurées)",
  highly_trained: "Très entraîné (haut niveau de pratique)",
};
export const RECENT_LOAD_LABELS: Record<string, string> = { low: "faible", moderate: "modérée", high: "élevée", unknown: "inconnue" };
export const FATIGUE_LABELS: Record<string, string> = { ready: "en forme", fatigued: "fatigué", unknown: "inconnue" };
export const INJURY_LABELS: Record<string, string> = { cleared_by_coach: "aucun signe, vérifié par le coach", contraindication: "contre-indication présente", unknown: "non vérifié" };
export const INTENT_LABELS: Record<string, string> = {
  recovery: "récupération", moderate_lt1: "endurance fondamentale", sub_threshold: "sous-seuil", mixed_intensity: "intensités mixtes",
  mlss: "seuil", vo2max: "VO₂max", neuromuscular: "neuromusculaire", max_strength: "force maximale", strength_endurance: "force-endurance",
  technique_economy: "technique / économie", mobility_prevention: "mobilité / prévention", mixed_specific: "spécifique mixte",
  race_specific: "allure spécifique course", fatmax: "FatMax", test: "test",
};
export const SPORT_LABELS: Record<string, string> = { run: "course", bike: "vélo", swim: "natation", strength: "force" };
/** Libellés des métriques limitantes du diagnostic (noms techniques en second). */
export const LIMITER_LABELS: Record<string, string> = {
  TTE: "Durabilité au seuil (TTE)", VLamax: "Capacité glycolytique (VLamax)", VO2max: "VO₂max", VMA: "VMA",
  FTP: "FTP", "FTP/kg": "FTP/kg", FatMax: "FatMax", "Économie": "Économie de course", "W' (kJ)": "Réserve anaérobie (W')",
};

export interface AnchorEntry {
  value: number | [number, number];
  /** A recorded app reference preserves unknown nature; it is never upgraded to measurement. */
  kind: "field_measurement" | "explicit_estimate" | "app_reference";
  recordReference?: {
    athleteId:string; coachId:string; field:string; origin:"snapshot"|"profile"; recordId:string;
    recordedOn:string|null; source:string|null; planningInputFingerprint:string;
    declaredNature:"field_measurement"|"explicit_estimate"|"undocumented";
  };
  /** Protocole de mesure ou méthode d'estimation (obligatoire). */
  method: string;
  measuredOn: string | null;
  /** Obligatoire pour une estimation (ex. « ±5 s/km »). */
  uncertainty: string | null;
}

export interface CoachDetInputSnapshot {
  schema: typeof COACH_INPUTS_SCHEMA;
  /** Empreinte du profil de planification complet de l'app (IA = DET) auquel ces vérifications se rapportent. */
  planningInputFingerprint?: string;
  sourceContentReview?:{notes:string;manifestHash:string;athleteChecksKey:string};
  raceGoals?: RaceGoal[];
  trail?: TrailPlanningDeclaration;
  timeTrial?:TimeTrialDeclaration;
  athleteId: string;
  coachId: string;
  objective: string;
  planStartDate: string;
  raceDate: string;
  weeksAvailable: number;
  weeklyHours: number;
  sessionsPerWeek: number;
  strengthSessionsPerWeek: number;
  maxSessionsPerDay: number;
  ambition: string;
  athleteLevel: V3ReviewedSettings["athleteLevel"];
  age: number | null;
  anchors: Partial<Record<AnchorKey, AnchorEntry>>;
  /** Données physiologiques du diagnostic, chacune avec sa provenance (aucune valeur par défaut). */
  physiology?: Partial<Record<PhysioKey, AnchorEntry>>;
  sex?: "M" | "F" | null;
  /**
   * Ordre de priorité des limiteurs CONFIRMÉ par le coach (noms de métriques
   * du diagnostic, ex. "TTE", "VLamax"). Absent/null ⇒ classement automatique.
   * Ne fait que réordonner les limiteurs éligibles détectés ; n'ajoute ni ne
   * retire aucune métrique. Inclus dans l'empreinte : toute modification
   * périme la revue.
   */
  coachLimiterOrder?: string[] | null;
  coachValidatedStrengthLoadAndRpe: boolean;
  /** Allures natation par domaine (s/100 m), chacune avec sa provenance. Aucune n'est déduite. */
  swimDomainPaces?: Partial<Record<SwimDomain, AnchorEntry>>;
  /** Le coach confirme explicitement d'utiliser la CSS comme proxy du seuil natation. */
  coachConfirmsCssAsMlssProxy?: boolean;
  /**
   * Base des séances : pool d'ADMISSION INGÉNIERIE (scénario CI, empreinte figée).
   * Ce n'est jamais une qualification scientifique : `independentScientificReview` vaut toujours false.
   */
  sourcePool?: { family: string; ciScenario: string; pinnedFingerprint: string; independentScientificReview: false };
  /** Revue humaine réelle réutilisée (distincte du pool CI) ; absente ⇒ aucune revue. */
  sourceReviewProvenance?: { kind: "genuine_coach_source_review"; reviewContextId: string; reviewedAt: string; reviewedIds: number; origin?: "det_coach_review_contexts" | "det_library_source_reviews"; libraryManifestHash?: string };
}

/** Qualification individuelle d'UNE source pour CET athlète (pas d'auteur nominatif). */
export interface SourceQualification {
  id: string;
  sourceFingerprint: string;
  evidence: Omit<V3IndividualSportingEvidence, "athleteId" | "sourceFingerprint">;
  preferReviewedV3?: true;
  targetDurationMin?: number;
  overrides?: Record<string, number>;
  allowWorksetChange?: true;
}

export interface CoachReviewContext {
  coachId: string;
  athleteId: string;
  inputsHash: string;
  sourcesVersion: string;
  qualifications: SourceQualification[];
  clock: CoachConfirmedClock | null;
  /** Bricks validés un par un par le coach (70.3 uniquement), avec transition explicite. */
  brickApprovals?: CoachBrickApproval[];
}

export type ContextCheck =
  | { ok: true; reviews: V3ReviewedSettings[]; anchors: V3AthleteAnchors }
  | { ok: false; refusals: string[] };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const pos = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;

export function snapshotProblems(s: CoachDetInputSnapshot): string[] {
  const p: string[] = [];
  if (s.schema !== COACH_INPUTS_SCHEMA) p.push("schema_entrees_inconnu");
  if (!s.objective) p.push("objectif manquant");
  if (!YMD.test(s.planStartDate ?? "")) p.push("date de début manquante");
  else if (!isRealYmd(s.planStartDate)) p.push("date de début invalide");
  if (!YMD.test(s.raceDate ?? "")) p.push("date de course manquante");
  else if (!isRealYmd(s.raceDate)) p.push("date de course invalide");
  const family = s.objective ? coachFamilyFor(s.objective) : null;
  if (s.objective && !family) {
    const key = coachObjectiveKey(s.objective);
    const why = COACH_BLOCKED_OBJECTIVES[key];
    const supported = Object.values(COACH_FAMILIES).map((f) => f.label).join(", ");
    p.push(why ? `objectif « ${s.objective} » hors du périmètre qualifié du mode entrées coach — ${why}`
      : `objectif « ${s.objective} » hors du périmètre qualifié du mode entrées coach (choisir exactement : ${supported})`);
  }
  p.push(...timeTrialProblems(s.timeTrial,s.athleteId,{objective:s.objective,planStartDate:s.planStartDate,raceDate:s.raceDate,weeksAvailable:s.weeksAvailable,raceGoals:s.raceGoals}));
  if (family?.sportFocus === "trail" && !s.trail) p.push("revue trail terrain/parcours/historique requise");
  if (s.trail && (s.trail.review.athleteId !== s.athleteId || s.trail.routes.some(r => r.athleteId !== s.athleteId))) p.push("revue terrain d’un autre athlète");
  if (family) {
    const [w0, w1] = family.testedEnvelope.weeks, [h0, h1] = (s.raceGoals?.length ?? 0) > 1 && family.sportFocus === "run" ? [8,8] : family.testedEnvelope.weeklyHours;
    if (Number.isInteger(s.weeksAvailable) && (s.weeksAvailable < w0 || s.weeksAvailable > w1))
      p.push(`${family.label} : ${s.weeksAvailable} semaines hors de la plage testée du moteur (${w0 === w1 ? w0 : `${w0}–${w1}`} semaines)`);
    if (pos(s.weeklyHours) && (s.weeklyHours < h0 || s.weeklyHours > h1))
      p.push(`${family.label} : ${s.weeklyHours} h/semaine hors de la plage testée du moteur (${h0 === h1 ? h0 : `${h0}–${h1}`} h)`);
    for (const k of family.requiredAnchors) if (!s.anchors[k as AnchorKey])
      p.push(`${family.label} : ${ANCHOR_LABELS[k as AnchorKey]} requis (mesure ou estimation identifiée) — aucune valeur par défaut`);
  }
  if (!(Number.isInteger(s.weeksAvailable) && s.weeksAvailable > 0)) p.push("nombre de semaines manquant");
  if (!pos(s.weeklyHours)) p.push("volume horaire hebdomadaire manquant");
  if (!(Number.isInteger(s.sessionsPerWeek) && s.sessionsPerWeek > 0)) p.push("séances par semaine manquantes");
  if (!(Number.isInteger(s.maxSessionsPerDay) && s.maxSessionsPerDay > 0)) p.push("séances max par jour manquantes");
  if (!(Number.isInteger(s.strengthSessionsPerWeek) && s.strengthSessionsPerWeek >= 0)) p.push("séances de force par semaine manquantes");
  if (!["untrained", "light", "trained", "highly_trained"].includes(s.athleteLevel)) p.push("niveau d'entraînement manquant");
  if (s.coachLimiterOrder != null) {
    const o = s.coachLimiterOrder;
    if (!Array.isArray(o) || o.length === 0 || o.some((m) => typeof m !== "string" || !m.trim())) p.push("ordre des limiteurs coach invalide");
    else if (new Set(o).size !== o.length) p.push("ordre des limiteurs coach : limiteur en double");
  }
  const entries: Array<[string, AnchorEntry]> = [
    ...(Object.entries(s.anchors) as [AnchorKey, AnchorEntry][]).map(([k, a]) => [ANCHOR_LABELS[k], a] as [string, AnchorEntry]),
    ...(Object.entries(s.physiology ?? {}) as [PhysioKey, AnchorEntry][]).map(([k, a]) => [PHYSIO_LABELS[k], a] as [string, AnchorEntry]),
    ...(Object.entries(s.swimDomainPaces ?? {}) as [SwimDomain, AnchorEntry][]).map(([k, a]) => [`Allure natation ${SWIM_DOMAIN_LABELS[k] ?? k} (s/100 m)`, a] as [string, AnchorEntry]),
  ];
  if ([...Object.values(s.physiology??{}),...Object.values(s.swimDomainPaces??{})].some(value=>value?.kind==="app_reference")) p.push("référence de l’app hors des ancres liées au profil partagé");
  for (const k of Object.keys(s.swimDomainPaces ?? {})) if (!(SWIM_DOMAINS as readonly string[]).includes(k)) p.push(`domaine d'allure natation inconnu « ${k} »`);
  if (s.coachConfirmsCssAsMlssProxy && !s.anchors.cssSecPer100m) p.push("proxy CSS→seuil confirmé sans CSS saisie");
  for (const [label, a] of entries) {
    const k = label;
    const v = a.value;
    const ok = Array.isArray(v) ? v.length === 2 && v.every(pos) && v[0] < v[1] : pos(v);
    if (!ok) p.push(`${k} : valeur invalide`);
    if (!a.method?.trim()) p.push(`${k} : méthode/protocole manquant`);
    if (a.kind === "explicit_estimate" && !a.uncertainty?.trim()) p.push(`${k} : estimation sans incertitude`);
    if (a.kind === "app_reference") {
      const r=a.recordReference;
      if(!r || r.athleteId!==s.athleteId || r.coachId!==s.coachId || !r.recordId?.trim() || !["snapshot","profile"].includes(r.origin) || !["field_measurement","explicit_estimate","undocumented"].includes(r.declaredNature) || r.planningInputFingerprint!==s.planningInputFingerprint || !/^[a-f0-9]{64}$/.test(r.planningInputFingerprint) || !a.uncertainty?.trim()) p.push(`${k} : référence de l’app non liée au profil courant`);
    } else if (a.kind !== "field_measurement" && a.kind !== "explicit_estimate") p.push(`${k} : provenance inconnue`);
  }
  return p;
}

export async function hashCoachInputs(s: CoachDetInputSnapshot): Promise<string> {
  return sha256Hex(`tfcl.det.coach-inputs.hash.v1\n${canonicalJson(s)}`);
}

export function anchorsFromSnapshot(s: CoachDetInputSnapshot): V3AthleteAnchors {
  const out: Record<string, unknown> = {};
  for (const [k, a] of Object.entries(s.anchors)) if (a) out[k] = Array.isArray(a.value) ? [...a.value] : a.value;
  out.anchorReferenceKinds = Object.fromEntries(Object.entries(s.anchors).filter(([,value])=>value).map(([key,value])=>[key,value!.kind]));
  if (s.coachValidatedStrengthLoadAndRpe) out.coachValidatedStrengthLoadAndRpe = true;
  const swim: Record<string, number> = {};
  for (const [k, a] of Object.entries(s.swimDomainPaces ?? {})) if (a && typeof a.value === "number") swim[k] = a.value;
  if (Object.keys(swim).length) {
    out.swimDomainPacesSecPer100m = swim;
    out.swimDomainPaceKinds = Object.fromEntries(Object.entries(s.swimDomainPaces??{}).filter(([,value])=>value).map(([key,value])=>[key,value!.kind]));
  }
  if (s.coachConfirmsCssAsMlssProxy === true) out.coachConfirmsCssAsMlssProxy = true;
  return out as V3AthleteAnchors;
}

export function findSource(id: string): V3Workout | undefined {
  return v3ExtendedCatalogue.workouts.find((w) => w.id === id)??findLibrary920Source(id);
}

/** Recherche lisible : titre, sport, intention ou focus. L'identifiant reste secondaire. */
export function searchSources(query: string, limit = 12): Array<{ id: string; title: string; sport: string; intent: string; phases: string[] }> {
  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out: Array<{ id: string; title: string; sport: string; intent: string; phases: string[] }> = [];
  for (const w of [...v3ExtendedCatalogue.workouts,...library920Catalogue.workouts]) {
    const hay = norm([w.title, SPORT_LABELS[w.sport] ?? w.sport, INTENT_LABELS[w.primaryIntent] ?? w.primaryIntent, w.focus, w.id,library920SourceMetadata(w.id)?.sourceId??''].join(" "));
    if (terms.every((t) => hay.includes(t))) out.push({ id: w.id, title: w.title, sport: SPORT_LABELS[w.sport] ?? w.sport, intent: INTENT_LABELS[w.primaryIntent] ?? w.primaryIntent, phases: [...w.phase] });
    if (out.length >= limit) break;
  }
  return out;
}

const fmtSec = (s: number) => (s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
const fmtBounds = (b: { min: number; base: number; max: number } | undefined, f: (n: number) => string) =>
  !b ? "" : b.min === b.max ? f(b.base) : `${f(b.base)} (${f(b.min)}–${f(b.max)})`;
/** Blocs d'une source en texte lisible (durées, répétitions, RPE), sans JSON. */
export function describeSourceBlocks(blocks: V3Workout["blocks"], depth = 0): string[] {
  const pad = "  ".repeat(depth);
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.kind === "repeat") {
      lines.push(`${pad}${fmtBounds(b.count, (n) => `${n}`)} × ${b.label}${b.betweenSec ? ` — récup. ${fmtSec(b.betweenSec)} entre répétitions` : ""}`);
      lines.push(...describeSourceBlocks(b.steps, depth + 1));
      continue;
    }
    const amount = b.kind === "time" ? fmtBounds(b.seconds, fmtSec) : b.kind === "distance" ? fmtBounds(b.meters, (n) => `${n} m`) : `${fmtBounds(b.reps, (n) => `${n}`)} répétitions${b.sides && b.sides > 1 ? " par côté" : ""}`;
    const rpe = b.rpeRange ? ` · RPE ${b.rpeRange.min === b.rpeRange.max ? b.rpeRange.min : `${b.rpeRange.min}–${b.rpeRange.max}`}` : "";
    const role = b.role === "warmup" ? "Échauffement" : b.role === "cooldown" ? "Retour au calme" : "Corps";
    lines.push(`${pad}${role} : ${b.label} — ${amount}${rpe}`);
  }
  return lines;
}

/** Prérequis/contre-indications à vérifier par le coach — affichés, jamais cochés d'office. */
export function sourceReviewSheet(w: V3Workout) {
  return {
    id: w.id, sport: w.sport, title: (w as unknown as { title?: string }).title ?? w.id,
    fingerprint: fingerprintV3SportingSource(w),
    phases: [...w.phase],
    prerequisites: [...w.prerequisites],
    contraindications: [...w.contraindications],
    blocks: w.blocks,
  };
}

/**
 * Vérifie le contexte stocké contre l'état ACTUEL. Fail-closed : la moindre
 * dérive (coach, athlète, entrées, version des sources, empreinte de source,
 * prérequis non cochés, ancre manquante, créneau manquant) ⇒ refus précis.
 */
export function checkCoachReviewContext(input: {
  ctx: CoachReviewContext | null;
  current: { coachId: string; athleteId: string; snapshot: CoachDetInputSnapshot; inputsHash: string; sourcesVersion: string | null };
}): ContextCheck {
  const { ctx, current } = input;
  const r: string[] = [];
  r.push(...snapshotProblems(current.snapshot));
  if (current.snapshot.athleteId !== current.athleteId) r.push("entrées liées à un autre athlète");
  if (current.snapshot.coachId !== current.coachId) r.push("entrées liées à un autre coach");
  if (!current.sourcesVersion) r.push("version des sources DET indisponible");
  if (!ctx) return { ok: false, refusals: [...r, "aucune revue coach enregistrée pour cet athlète"] };
  if (ctx.coachId !== current.coachId) r.push("revue enregistrée par un autre coach : non réutilisable");
  if (ctx.athleteId !== current.athleteId) r.push("revue d'un autre athlète : non réutilisable");
  if (ctx.inputsHash !== current.inputsHash) r.push("profil/ancres modifiés depuis la revue : revue périmée, à reconfirmer");
  if (current.sourcesVersion && ctx.sourcesVersion !== current.sourcesVersion) r.push("version des sources DET modifiée depuis la revue : revue périmée");
  if (!ctx.qualifications.length) r.push("aucune source V3 qualifiée individuellement (aucune n'est approuvée par défaut)");
  if (!ctx.clock) r.push("horaires de séance non confirmés");
  const anchors = anchorsFromSnapshot(current.snapshot);
  const ids = new Set<string>();
  const sports = new Set<string>();
  for (const q of ctx.qualifications) {
    if (ids.has(q.id)) { r.push(`source ${q.id} qualifiée deux fois`); continue; }
    ids.add(q.id);
    const w = findSource(q.id);
    if (!w) { r.push(`source ${q.id} inconnue du catalogue courant`); continue; }
    r.push(...library920ContextProblems(w,current.snapshot.objective,current.snapshot.athleteLevel).map(problem=>`source ${q.id} : ${problem}`));
    sports.add(w.sport);
    if (q.sourceFingerprint !== fingerprintV3SportingSource(w)) r.push(`source ${q.id} modifiée depuis la qualification : revue périmée`);
    const checked = new Set(q.evidence.checkedPrerequisites);
    for (const pre of w.prerequisites) if (!checked.has(pre)) r.push(`source ${q.id} : prérequis non vérifié « ${pre} »`);
    const ci = new Set(q.evidence.checkedContraindications);
    for (const c of w.contraindications) if (!ci.has(c)) r.push(`source ${q.id} : contre-indication non vérifiée « ${c} »`);
    const route=current.snapshot.trail?.routes.find(r=>r.sourceId===w.id);
    const terrain=route?{athleteId:current.athleteId,sourceId:w.id,terrainContextId:route.routeId,fieldReviewReference:current.snapshot.trail!.fieldReviewReference,coachConfirmsFieldEffortReview:true as const,domainRpe:current.snapshot.trail!.domainRpe}:undefined;
    const res = resolveV3IntensityTargets(w, {...anchors,...(terrain?{runTerrainReview:terrain}:{})});
    if (res.status !== "resolved") r.push(`source ${q.id} : ancres manquantes (${res.missing.join(", ")})`);
    if (q.overrides && Object.keys(q.overrides).length && !q.allowWorksetChange && q.targetDurationMin === undefined)
      r.push(`source ${q.id} : modification de dose sans permission explicite`);
  }
  const fam = coachFamilyFor(current.snapshot.objective);
  for (const b of ctx.brickApprovals ?? []) {
    if (COACH_703_BRICK_IDS.includes(b.id) && fam?.key !== "triathlon_703") r.push(`brick ${b.id} : enchaînements validés uniquement pour le triathlon 70.3`);
    else if (!coachBrickIdsFor(fam?.key ?? "").includes(b.id)) r.push(`brick ${b.id} inconnu du registre de cette famille`);
    if (!(Number.isInteger(b.transitionSeconds) && b.transitionSeconds >= 180 && b.transitionSeconds <= 600)) r.push(`brick ${b.id} : transition non confirmée (3–10 min)`);
  }
  if (ctx.clock && fam) for (const sp of fam.requiredClockSports) {
    const row = ctx.clock.minutesBySport[sp];
    if (!row || row.length !== 7 || !row.some((m) => typeof m === "number")) r.push(`${fam.label} : aucun créneau confirmé pour le sport ${SPORT_LABELS[sp] ?? sp}`);
  }
  if (ctx.clock) {
    r.push(...clockProblems(ctx.clock, current.snapshot.planStartDate, Number.isInteger(current.snapshot.weeksAvailable) ? current.snapshot.weeksAvailable : 0));
    for (const sp of sports) {
      const row = ctx.clock.minutesBySport[sp];
      if (!row || row.length !== 7 || !row.some((m) => typeof m === "number")) r.push(`aucun créneau confirmé pour le sport ${sp}`);
    }
  }
  if (r.length) return { ok: false, refusals: r };
  const s = current.snapshot;
  const reviews: V3ReviewedSettings[] = ctx.qualifications.map((q) => {
    const w = findSource(q.id)!;
    return {
      id: q.id, objective: s.objective, athleteLevel: s.athleteLevel, athleteLevelSource: "manual",
      allPrerequisitesChecked: true, individualCoachApproval: true,
      ...(q.preferReviewedV3 ? { preferReviewedV3: true as const } : {}),
      ...(w.sport === "strength" && s.coachValidatedStrengthLoadAndRpe ? { verifiedStrengthLoadAndRpe: true as const } : {}),
      expectedAthleteId: current.athleteId,
      sportingReview: { ...q.evidence, athleteId: current.athleteId, sourceFingerprint: q.sourceFingerprint },
      athleteAnchors: {...structuredClone(anchors),...(s.trail&&w.sport==='run'?{runTerrainReview:{athleteId:s.athleteId,sourceId:w.id,terrainContextId:s.trail.routes.find(r=>r.sourceId===w.id)?.routeId??'',fieldReviewReference:s.trail.fieldReviewReference,coachConfirmsFieldEffortReview:true as const,domainRpe:s.trail.domainRpe}}:{})},
      ...(s.trail&&w.sport==='run'?{expectedRunTerrainContextId:s.trail.routes.find(r=>r.sourceId===w.id)?.routeId??''}:{}),
      ...(q.overrides ? { overrides: { ...q.overrides } } : {}),
      ...(q.targetDurationMin !== undefined ? { targetDurationMin: q.targetDurationMin } : {}),
      ...(q.allowWorksetChange ? { allowWorksetChange: true as const } : {}),
    };
  });
  return { ok: true, reviews, anchors };
}
