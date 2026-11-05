import {timeTrialProblems,type TimeTrialDeclaration} from '../../../experimental/det-engine/v410-time-trial-contract';
import type { TrailPlanningDeclaration } from '../../../experimental/det-engine/v407-reviewed-trail-contract';
import type { RaceGoal } from '@/hooks/useAITrainingPlan';
import { canonicalJson } from "@/lib/plan/appendOnlyPlanVersionSave";
/**
 * Pont « contexte athlète réel → entrées DET/IA ». Pur, sans réseau.
 *
 * - Lit UNIQUEMENT ce que l'app possède déjà (fiche, profil physiologique
 *   effectif, diagnostic) ; ne copie aucune donnée ailleurs.
 * - Une valeur lue garde son origine (profil physiologique daté / référence
 *   de profil) ; la fiche ne dit pas si c'est une mesure : le coach choisit
 *   « mesure terrain » ou « estimation (+ incertitude) ». Jamais d'upgrade.
 * - Les limiteurs viennent du diagnostic de l'app ; l'ordre coach est tracé.
 * - Qualification bibliothèque (pool CI figé) ≠ vérifications propres à
 *   l'athlète (charge, fatigue, blessure, prérequis, contre-indications),
 *   confirmées UNE fois par liste, jamais déduites de l'absence de donnée.
 * - Aucune approbation de prescription ni attestation.
 */
import { v3FullCatalogue } from "../../../scripts/library-v3/catalogueRuntime";
import { resolveV3IntensityTargets } from "../../../scripts/library-v3/resolveV3Intensity";
import { fingerprintV3SportingSource } from "../../../scripts/library-v3/sportingQualification800";
import { coachFamilyFor, COACH_SHORT_TRI_BRICKS, COACH_703_BRICK_IDS, type CoachBrickApproval, type CoachConfirmedClock, type CoachFamily } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { V32_703_BRICK_BLUEPRINTS } from "../../../experimental/det-engine/v32-v3-specific-bricks";
import { V34_SAFE_RUN_BRICKS } from "../../../experimental/det-engine/v34-v3-low-run-bricks";
import { V3_BASE_BRICK_ID } from "../../../experimental/det-engine/v31-v3-brick";
import { IM_TAPER_BRICK } from "../../../experimental/det-engine/v404-im-taper-brick";
import {
  ANCHOR_LABELS, COACH_INPUTS_SCHEMA, PHYSIO_LABELS, SWIM_DOMAINS, SWIM_DOMAIN_LABELS, findSource,
  type AnchorEntry, type AnchorKey, type CoachDetInputSnapshot, type CoachReviewContext, type PhysioKey, type SourceQualification, type SwimDomain,
} from "./coachDetContext";
import { familySourcePool, type FamilySourcePool } from "./familySourcePools";

export type RecordOrigin = "snapshot" | "profile" | "none";
export interface AthleteRecordView {
  athleteId: string;
  coachId: string;
  birthDate: string | null;
  sex: string | null;
  /** Valeurs effectives de l'app (`getEffectiveRefs`) et leur origine. */
  refs: { vma: number | null; ftp: number | null; css: number | null; vo2max: number | null; weightKg: number | null; fcMax: number | null;
    sources: Record<"vma" | "ftp" | "css" | "vo2max" | "weightKg" | "fcMax", RecordOrigin> };
  /** Profil physiologique effectif (ligne existante), ou null. */
  snapshot: { id?: string; date?: string | null; vlamax_source?: string | null; vlamax_protocol?: string | null; pace_threshold_sec_per_km?: number | null; tte_observed_min_run?: number | null; vlamax_run?: number | null; vlamax?: number | null; fatigue_state?: string | null } | null;
  /** Limiteurs du diagnostic de l'app, dans l'ordre d'impact. */
  diagnosticLimiters: string[];
}
export interface PlanFormView {
  raceGoals?: RaceGoal[];
  objective: string; planStartDate: string; raceDate: string; weeksAvailable: number; weeklyHours: number;
  sessionsPerWeek: number; strengthSessionsPerWeek: number; maxSessionsPerDay: number; ambition: string;
}
export type FieldKey = AnchorKey | PhysioKey;
export interface PrefilledField { key: FieldKey; label: string; value: number | [number, number]; origin: Exclude<RecordOrigin, "none">; recordedOn: string | null; method: string;
  /** Nature déjà typée dans la fiche (seulement si un champ de source fiable existe), sinon absent ⇒ question au coach. */
  typedKind?: AnchorEntry["kind"] }
/** Seuls les champs de source réellement typés de la fiche sont repris (VLamax : lab / field_test / sprint ⇒ mesure ; estimation ⇒ estimation). */
export function typedKindFromSource(src: string | null | undefined): AnchorEntry["kind"] | undefined {
  if (!src) return undefined;
  if (["lab", "field_test", "sprint", "test"].includes(src)) return "field_measurement";
  if (["estimation", "estimated", "estimate"].includes(src)) return "explicit_estimate";
  return undefined;
}
export interface MissingItem { key: string; label: string; why: string }

const SPORTS_OF: Record<string, string> = { run: "course", bike: "vélo", swim: "natation", strength: "force", brick: "enchaînement vélo-course" };
const RESOLVER_TO_ANCHOR: Record<string, AnchorKey> = {
  bike_ftp_w: "bikeFtpWatts", run_threshold_pace_sec_per_km: "runThresholdPaceSecPerKm",
  bike_pma_w_validated_above_vo2_floor: "bikePmaWatts", run_vvo2_speed_mps_validated_above_vo2_floor: "runVvo2SpeedMps",
  bike_verified_sprint_power_range_w: "bikeSprintPowerRangeWatts", run_verified_sprint_speed_range_mps: "runSprintSpeedRangeMps",
};

function age(birth: string | null, on: string): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}/.test(birth)) return null;
  const [y, m, d] = birth.slice(0, 10).split("-").map(Number), [Y, M, D] = on.split("-").map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}

/** Valeurs DÉJÀ présentes dans l'app, avec origine et date ; aucune n'est inventée ni convertie au-delà d'une unité exacte. */
export function prefillFromRecord(r: AthleteRecordView): PrefilledField[] {
  const out: PrefilledField[] = [];
  const snapDate = r.snapshot?.date ?? null;
  const add = (key: FieldKey, value: number | null | undefined, origin: RecordOrigin, extra = "", typedKind?: AnchorEntry["kind"]) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || origin === "none") return;
    const label = (ANCHOR_LABELS as Record<string, string>)[key] ?? PHYSIO_LABELS[key as PhysioKey];
    out.push({ key, label, value, origin, recordedOn: origin === "snapshot" ? snapDate : null,
      method: `Fiche athlète TFCLab — ${origin === "snapshot" ? `profil physiologique${snapDate ? ` du ${snapDate}` : ""}` : "référence saisie dans le profil"}${extra}`, ...(typedKind ? { typedKind } : {}) });
  };
  add("runThresholdPaceSecPerKm", r.snapshot?.pace_threshold_sec_per_km, r.snapshot ? "snapshot" : "none");
  // Conversion d'unité exacte km/h → m/s (VMA de la fiche), pas une estimation.
  // Keep the full value: rounding here corrupts the anchor that is checked
  // against the app's VMA before generation (e.g. 17.5 km/h -> 4.861 m/s).
  add("runVvo2SpeedMps", r.refs.vma != null ? r.refs.vma / 3.6 : null, r.refs.sources.vma, r.refs.vma != null ? ` (VMA ${r.refs.vma} km/h ÷ 3,6)` : "");
  add("bikeFtpWatts", r.refs.ftp, r.refs.sources.ftp);
  add("cssSecPer100m", r.refs.css, r.refs.sources.css);
  add("vo2max", r.refs.vo2max, r.refs.sources.vo2max);
  add("weightKg", r.refs.weightKg, r.refs.sources.weightKg);
  add("fcMax", r.refs.fcMax, r.refs.sources.fcMax);
  add("tteRunMin", r.snapshot?.tte_observed_min_run, r.snapshot ? "snapshot" : "none");
  const vk = typedKindFromSource(r.snapshot?.vlamax_source);
  const vx = r.snapshot?.vlamax_source ? ` (source fiche : ${r.snapshot.vlamax_source}${r.snapshot.vlamax_protocol ? `, ${r.snapshot.vlamax_protocol}` : ""})` : "";
  add("vlamaxRun", r.snapshot?.vlamax_run, r.snapshot ? "snapshot" : "none", vx, vk);
  add("vlamaxBike", r.snapshot?.vlamax, r.snapshot ? "snapshot" : "none", vx, vk);
  return out;
}

/** Ancres réellement exigées : famille + sources du pool (via le résolveur V3). */
export function requiredAnchorKeys(family: CoachFamily, pool: FamilySourcePool): { anchors: AnchorKey[]; swimDomains: SwimDomain[]; strengthRpe: boolean } {
  const anchors = new Set<AnchorKey>(family.requiredAnchors as AnchorKey[]);
  const swim = new Set<SwimDomain>(); let strengthRpe = false;
  for (const id of pool.ids) {
    const w = findSource(id); if (!w) continue;
    if (family.sportFocus==='trail' && w.sport==='run') continue;
    const res = resolveV3IntensityTargets(w, {} as never) as { missing?: string[] };
    for (const m of res.missing ?? []) {
      if (RESOLVER_TO_ANCHOR[m]) anchors.add(RESOLVER_TO_ANCHOR[m]);
      else if (m.startsWith("swim_domain_pace_sec_per_100m.")) swim.add(m.split(".")[1] as SwimDomain);
      else if (m === "coach_verified_rpe_and_load") strengthRpe = true;
    }
  }
  return { anchors: [...anchors], swimDomains: SWIM_DOMAINS.filter((d) => swim.has(d)), strengthRpe };
}

/** Listes à vérifier UNE fois pour cet athlète (dédupliquées sur tout le pool). */
export function athleteChecklist(pool: FamilySourcePool) {
  const pre = new Set<string>(), ci = new Set<string>(); const sports = new Set<string>(); let raceSpecific = false, hasTest = false;
  for (const id of pool.ids) { const w = findSource(id); if (!w) continue; w.prerequisites.forEach((x) => pre.add(x)); w.contraindications.forEach((x) => ci.add(x)); sports.add(w.sport); if (w.primaryIntent === "race_specific") raceSpecific = true; if (w.primaryIntent === "test") hasTest = true; }
  return { prerequisites: [...pre].sort(), contraindications: [...ci].sort(), sports: [...sports], raceSpecific, hasTest };
}

export const GENERAL_CONFIRMATIONS = {
  stopRuleExplained: "Les règles d'arrêt des séances ont été expliquées à l'athlète",
  environmentAndEquipmentConfirmed: "Lieux et matériel nécessaires disponibles",
  limiterAndSportingGoalReviewed: "Objectif et priorités de limiteurs relus avec l'athlète",
  trainingLoadCompatible: "Volume demandé compatible avec la charge actuelle",
  recoveryContextReviewed: "Récupération (sommeil, travail, vie) prise en compte",
  highIntensityHistoryConfirmed: "L'athlète a déjà pratiqué des séances intenses encadrées",
} as const;
export type GeneralKey = keyof typeof GENERAL_CONFIRMATIONS;
export const CONDITIONAL_CONFIRMATIONS = {
  runningImpactToleranceConfirmed: { label: "Tolérance aux impacts de la course vérifiée", when: (c: ReturnType<typeof athleteChecklist>) => c.sports.includes("run") },
  swimmingSafetyConfirmed: { label: "Sécurité en natation vérifiée (encadrement, eau libre)", when: (c: ReturnType<typeof athleteChecklist>) => c.sports.includes("swim") },
  racePaceGoalConfirmed: { label: "Allure objectif de course confirmée avec l'athlète", when: (c: ReturnType<typeof athleteChecklist>) => c.raceSpecific },
  testProtocolConfirmed: { label: "Protocole des séances-tests expliqué et accepté", when: (c: ReturnType<typeof athleteChecklist>) => c.hasTest },
  cssPairedTestConfirmed: { label: "CSS issue d'un test appairé (400/200 m)", when: (c: ReturnType<typeof athleteChecklist>) => c.sports.includes("swim") },
} as const;
export type ConditionalKey = keyof typeof CONDITIONAL_CONFIRMATIONS;

export interface CoachAnswers {
  timeTrial?:TimeTrialDeclaration;
  trail?: TrailPlanningDeclaration;
  /** Choix de provenance pour chaque valeur reprise de la fiche. */
  provenance: Partial<Record<FieldKey, { kind: AnchorEntry["kind"]; uncertainty?: string }>>;
  /** Valeurs manquantes saisies par le coach (avec méthode et provenance). */
  entered: Partial<Record<FieldKey, { value: number | [number, number]; kind: AnchorEntry["kind"]; method: string; uncertainty?: string; measuredOn?: string }>>;
  swimPaces: Partial<Record<SwimDomain, { value: number; kind: AnchorEntry["kind"]; method: string; uncertainty?: string }>>;
  athleteLevel: CoachDetInputSnapshot["athleteLevel"] | "";
  recentLoad: "low" | "moderate" | "high" | "";
  fatigue: "ready" | "fatigued" | "";
  /** Jamais déduit de l'absence de signalement. */
  injuryScreen: "cleared_by_coach" | "contraindication" | "";
  general: Partial<Record<GeneralKey | ConditionalKey, boolean>>;
  prerequisitesAllMet: boolean; unmetPrerequisites: string[];
  contraindicationsAllAbsent: boolean; presentContraindications: string[];
  strengthLoadAndRpeConfirmed: boolean;
  /** Une heure habituelle par sport + jours ; `perDay` (HH:MM ou vide) remplace si l'horaire varie selon le jour. */
  clock: { timeZone: string; bySport: Record<string, { time: string; days: boolean[]; perDay?: string[] }> };
  bricksConfirmed: boolean;
  coachLimiterOrder: string[] | null;
}

export interface BridgeResult {
  /** Confirmed clock available for recording a new human source review; grants no source authority. */
  reviewClock?:CoachConfirmedClock|null;
  family: CoachFamily | null;
  pool: FamilySourcePool | null;
  missing: MissingItem[];
  snapshot: CoachDetInputSnapshot | null;
  ctx: Omit<CoachReviewContext, "inputsHash" | "sourcesVersion"> | null;
  excludedSources: { id: string; reason: string }[];
  limiterTrace: LimiterTrace;
  /** Statut de la revue humaine des séances : jamais déduit du pool CI ni de la liste athlète. */
  sourceReview: SourceReviewStatus;
}

/**
 * Revue RÉELLE des séances par le coach (grille par séance « Avancé »), lue depuis
 * `det_coach_review_contexts` du même coach + athlète. Seule autorité qui peut porter
 * `coachReviewedSource:true`. Le pool CI (`familySourcePools.ts`) n'en est PAS une.
 */
export interface GenuineSourceReviews {
  origin: "det_coach_review_contexts" | "det_library_source_reviews";
  libraryManifestHash?: string;
  libraryFamily?: string;
  athleteChecksKey?: string;
  reviewContextId: string; coachId: string; athleteId: string; reviewedAt: string;
  qualifications: SourceQualification[];
  brickApprovals: CoachBrickApproval[];
  /** Empreinte du profil de planification de l'app enregistrée avec la revue (absente sur les anciennes lignes). */
  planningInputFingerprint?: string | null;
}
export type SourceReviewStatus =
  | { status: "reviewed"; reviewContextId: string; reviewedAt: string; reviewedIds: number }
  | { status: "blocked_missing_source_review"; reason: string; unreviewedIds: string[]; unreviewedBricks: string[];
      /** Tâche amont réutilisable : revue par séance dans « Avancé », une fois, pour ce coach + athlète. */
      upstreamTask: "review_family_pool_sources_in_advanced_grid" }
  | { status: "not_evaluated" };
export interface LimiterTrace {
  diagnostic: string[];
  /** Ordre explicitement choisi par le coach ; null ⇒ ordre automatique DET (aucun ordre « coach » implicite). */
  coach: string[] | null;
}

const hhmm = (s: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim()); if (!m) return null; const v = +m[1] * 60 + +m[2]; return v < 1440 ? v : null; };
export const BRICKS_703: CoachBrickApproval[] = [
  { id: V3_BASE_BRICK_ID, transitionSeconds: 300 },
  ...V32_703_BRICK_BLUEPRINTS.map((b) => ({ id: b.id, transitionSeconds: b.transitionSeconds })),
  ...V34_SAFE_RUN_BRICKS.map((b) => ({ id: b.id, transitionSeconds: b.transitionSeconds })),
].filter((b) => COACH_703_BRICK_IDS.includes(b.id));
export const BRICKS_IM: CoachBrickApproval[] = [{ id: IM_TAPER_BRICK.id, transitionSeconds: IM_TAPER_BRICK.transitionSeconds }];
export const bricksForFamily = (family: string): CoachBrickApproval[] => family === "triathlon_sprint" ? COACH_SHORT_TRI_BRICKS.filter(b=>b.goal==="sprint").map(b=>({id:b.id,transitionSeconds:180})) : family === "triathlon_olympic" ? COACH_SHORT_TRI_BRICKS.filter(b=>b.goal==="olympic").map(b=>({id:b.id,transitionSeconds:180})) : family === "triathlon_703" ? BRICKS_703 : family === "triathlon_ironman" ? BRICKS_IM : [];

/** Sports pour lesquels un horaire doit être confirmé. */
export function clockSportsFor(family: CoachFamily, pool: FamilySourcePool): string[] {
  const s = new Set<string>(family.requiredClockSports as string[]);
  for (const sp of athleteChecklist(pool).sports) s.add(sp);
  if (bricksForFamily(family.key).length) s.add("brick");
  return [...s];
}

export function buildAthleteDetInputs(record: AthleteRecordView, form: PlanFormView, a: CoachAnswers, genuine: GenuineSourceReviews | null = null, planningFingerprint: string | null = null): BridgeResult {
  const r = buildAthleteDetInputsCore(record, form, a, genuine, planningFingerprint);
  if (!planningFingerprint || !r.snapshot) return r;
  return { ...r, snapshot: { ...r.snapshot, planningInputFingerprint: planningFingerprint } };
}

function buildAthleteDetInputsCore(record: AthleteRecordView, form: PlanFormView, a: CoachAnswers, genuine: GenuineSourceReviews | null, planningFingerprint: string | null): BridgeResult {
  const NE: SourceReviewStatus = { status: "not_evaluated" };
  const missing: MissingItem[] = [];
  const family = coachFamilyFor(form.objective);
  const trace = { diagnostic: [...record.diagnosticLimiters], coach: a.coachLimiterOrder ? [...a.coachLimiterOrder] : null };
  if (!family) return { family: null, pool: null, missing: [{ key: "objective", label: "Objectif", why: `« ${form.objective} » n'est pas encore pris en charge par DET (voir le tableau des familles). L'IA reste disponible.` }], snapshot: null, ctx: null, excludedSources: [], limiterTrace: trace, sourceReview: NE };
  const pool = familySourcePool(family.key);
  if (family.sportFocus === "trail" && !a.trail) missing.push({key:"trail",label:"Données terrain",why:"Compléter parcours, historique et limites individuelles avant génération."});
  const req = requiredAnchorKeys(family, pool);
  const pre = new Map(prefillFromRecord(record).map((p) => [p.key, p]));
  const entry = (k: FieldKey, required: boolean): AnchorEntry | null => {
    const label = (ANCHOR_LABELS as Record<string, string>)[k] ?? PHYSIO_LABELS[k as PhysioKey];
    const p = pre.get(k), e = a.entered[k];
    if (p) {
      const pv = a.provenance[k] ?? (p.typedKind === "field_measurement" ? { kind: "field_measurement" as const } : p.typedKind ? { kind: p.typedKind } : undefined);
      if (p.typedKind === "explicit_estimate" && pv?.kind === "field_measurement") { missing.push({ key: `prov:${k}`, label, why: "la fiche indique une estimation : elle ne peut pas être déclarée mesure" }); return null; }
      if (!pv) { if (required) missing.push({ key: `prov:${k}`, label, why: `valeur ${Array.isArray(p.value) ? p.value.join("–") : p.value} reprise de la fiche : indiquer s'il s'agit d'une mesure terrain ou d'une estimation` }); return null; }
      if (pv.kind === "explicit_estimate" && !pv.uncertainty?.trim()) { missing.push({ key: `unc:${k}`, label, why: "estimation : préciser l'incertitude (ex. ±5 s/km)" }); return null; }
      return { value: p.value, kind: pv.kind, method: p.method, measuredOn: p.recordedOn, uncertainty: pv.uncertainty?.trim() || null };
    }
    if (e) {
      if (!e.method.trim()) { missing.push({ key: `met:${k}`, label, why: "préciser comment la valeur a été obtenue" }); return null; }
      if (e.kind === "explicit_estimate" && !e.uncertainty?.trim()) { missing.push({ key: `unc:${k}`, label, why: "estimation : préciser l'incertitude" }); return null; }
      return { value: e.value, kind: e.kind, method: `Saisie coach — ${e.method.trim()}`, measuredOn: e.measuredOn || null, uncertainty: e.uncertainty?.trim() || null };
    }
    if (required) missing.push({ key: `val:${k}`, label, why: "absent de la fiche : à saisir (mesure ou estimation identifiée)" });
    return null;
  };
  const anchors: CoachDetInputSnapshot["anchors"] = {};
  for (const k of ["runThresholdPaceSecPerKm", "runVvo2SpeedMps", "runSprintSpeedRangeMps", "bikeFtpWatts", "bikePmaWatts", "bikeSprintPowerRangeWatts", "cssSecPer100m"] as AnchorKey[]) {
    const v = entry(k, req.anchors.includes(k)); if (v) anchors[k] = v;
  }
  const physiology: NonNullable<CoachDetInputSnapshot["physiology"]> = {};
  for (const k of ["vo2max", "weightKg", "tteRunMin", "vlamaxRun", "vlamaxBike", "fcMax"] as PhysioKey[]) { const v = entry(k, false); if (v) physiology[k] = v; }
  const swimDomainPaces: NonNullable<CoachDetInputSnapshot["swimDomainPaces"]> = {};
  for (const d of req.swimDomains) {
    const s = a.swimPaces[d];
    if (!s) { missing.push({ key: `swim:${d}`, label: `Allure natation ${SWIM_DOMAIN_LABELS[d]} (s/100 m)`, why: "absente de la fiche : à saisir, jamais déduite de la CSS" }); continue; }
    if (!s.method.trim() || (s.kind === "explicit_estimate" && !s.uncertainty?.trim())) { missing.push({ key: `swim:${d}`, label: `Allure natation ${SWIM_DOMAIN_LABELS[d]}`, why: "méthode et, pour une estimation, incertitude requises" }); continue; }
    swimDomainPaces[d] = { value: s.value, kind: s.kind, method: `Saisie coach — ${s.method.trim()}`, measuredOn: null, uncertainty: s.uncertainty?.trim() || null };
  }
  if (req.strengthRpe && !a.strengthLoadAndRpeConfirmed) missing.push({ key: "strengthRpe", label: "Charges et RPE de force", why: "confirmer que les charges et l'échelle RPE de force sont maîtrisées par l'athlète" });
  if (!a.athleteLevel) missing.push({ key: "athleteLevel", label: "Niveau d'entraînement", why: "à choisir (non stocké dans la fiche)" });
  if (!a.recentLoad) missing.push({ key: "recentLoad", label: "Charge des 4 dernières semaines", why: "à confirmer" });
  if (!a.fatigue) missing.push({ key: "fatigue", label: "État de forme actuel", why: record.snapshot?.fatigue_state ? `fiche : « ${record.snapshot.fatigue_state} » — à confirmer` : "à confirmer" });
  if (!a.injuryScreen) missing.push({ key: "injuryScreen", label: "Blessure / douleur", why: "à vérifier avec l'athlète (l'absence de signalement ne vaut pas feu vert)" });
  if (a.injuryScreen === "contraindication") missing.push({ key: "injuryScreen", label: "Blessure / douleur", why: "contre-indication présente : DET ne génère pas de plan, voir avec un professionnel de santé" });
  if (a.recentLoad && a.recentLoad !== "low" && a.recentLoad !== "moderate" && a.recentLoad !== "high") missing.push({ key: "recentLoad", label: "Charge", why: "valeur inconnue" });
  const list = athleteChecklist(pool);
  const generalKeys: Array<GeneralKey | ConditionalKey> = [...(Object.keys(GENERAL_CONFIRMATIONS) as GeneralKey[]),
    ...(Object.keys(CONDITIONAL_CONFIRMATIONS) as ConditionalKey[]).filter((k) => CONDITIONAL_CONFIRMATIONS[k].when(list))];
  for (const k of generalKeys) if (a.general[k] !== true) missing.push({ key: `gen:${k}`, label: (GENERAL_CONFIRMATIONS as Record<string, string>)[k] ?? CONDITIONAL_CONFIRMATIONS[k as ConditionalKey].label, why: "à confirmer pour cet athlète" });
  if (!a.prerequisitesAllMet) missing.push({ key: "prereq", label: `Prérequis des séances (${list.prerequisites.length})`, why: "relire la liste et confirmer (marquer ceux qui ne sont pas remplis)" });
  if (!a.contraindicationsAllAbsent) missing.push({ key: "contra", label: `Contre-indications (${list.contraindications.length})`, why: "relire la liste et confirmer leur absence (marquer celles présentes)" });
  // Sources écartées par les réponses propres à l'athlète (jamais l'inverse).
  const excluded: { id: string; reason: string }[] = [];
  const unmet = new Set(a.unmetPrerequisites), present = new Set(a.presentContraindications);
  const kept: string[] = [];
  for (const id of pool.ids) {
    const w = findSource(id)!;
    const u = w.prerequisites.find((p) => unmet.has(p)), c = w.contraindications.find((x) => present.has(x));
    if (u) excluded.push({ id, reason: `prérequis non rempli : ${u}` }); else if (c) excluded.push({ id, reason: `contre-indication présente : ${c}` }); else kept.push(id);
  }
  // Horaires : un horaire habituel par sport + jours, confirmés par le coach.
  const sports = clockSportsFor(family, pool);
  let clock: CoachConfirmedClock | null = null;
  if (!a.clock.timeZone.trim()) missing.push({ key: "tz", label: "Fuseau horaire", why: "à confirmer" });
  const minutesBySport: Record<string, Array<number | null>> = {};
  for (const sp of sports) {
    const c = a.clock.bySport[sp];
    const row = !c ? null : c.perDay?.length === 7 ? c.perDay.map((t) => (t.trim() ? hhmm(t) : null)) : (() => { const m = hhmm(c.time); return m === null ? null : c.days.map((d) => (d ? m : null)); })();
    const badPerDay = !!c?.perDay && c.perDay.some((t) => t.trim() !== "" && hhmm(t) === null);
    if (!row || badPerDay || !row.some((m) => m !== null)) { missing.push({ key: `clock:${sp}`, label: `Horaire ${SPORTS_OF[sp] ?? sp}`, why: "heure habituelle et jours possibles à indiquer" }); continue; }
    minutesBySport[sp] = row;
  }
  if (a.clock.timeZone.trim() && Object.keys(minutesBySport).length) clock = { timeZone: a.clock.timeZone.trim(), minutesBySport } as CoachConfirmedClock;
  if (bricksForFamily(family.key).length && !a.bricksConfirmed) missing.push({ key: "bricks", label: "Enchaînements vélo-course", why: `confirmer les horaires des enchaînements du registre ${family.label} (ne vaut pas revue des compositions)` });
  for(const why of timeTrialProblems(a.timeTrial,record.athleteId,{...form,raceGoals:form.raceGoals})){missing.push({key:'timeTrial',label:'Revue CLM',why});}
  const ymd = form.planStartDate;
  const snapshot: CoachDetInputSnapshot = {
    ...(form.raceGoals?.length ? { raceGoals: structuredClone(form.raceGoals) } : {}),
    schema: COACH_INPUTS_SCHEMA, athleteId: record.athleteId, coachId: record.coachId, objective: form.objective,
    planStartDate: form.planStartDate, raceDate: form.raceDate, weeksAvailable: form.weeksAvailable, weeklyHours: form.weeklyHours,
    sessionsPerWeek: form.sessionsPerWeek, strengthSessionsPerWeek: form.strengthSessionsPerWeek, maxSessionsPerDay: form.maxSessionsPerDay,
    ambition: form.ambition, athleteLevel: (a.athleteLevel || "trained") as CoachDetInputSnapshot["athleteLevel"],
    age: age(record.birthDate, ymd), sex: record.sex === "M" || record.sex === "F" ? record.sex : null,
    ...(a.timeTrial ? {timeTrial:structuredClone(a.timeTrial)} : {}),
    ...(a.trail ? {trail:structuredClone(a.trail)} : {}),
    anchors, physiology, coachValidatedStrengthLoadAndRpe: a.strengthLoadAndRpeConfirmed === true,
    ...(Object.keys(swimDomainPaces).length ? { swimDomainPaces } : {}),
    coachLimiterOrder: a.coachLimiterOrder ? [...a.coachLimiterOrder] : null,
    sourcePool: { family: pool.family, ciScenario: pool.ciScenario, pinnedFingerprint: pool.pinnedFingerprint, independentScientificReview: false },
  };
  if (missing.length) return { family, pool, missing, snapshot: null, ctx: null, excludedSources: excluded, limiterTrace: trace, sourceReview: NE };
  // Revue des séances : uniquement une revue humaine réelle, liée au même coach + athlète
  // et à l'empreinte actuelle de chaque séance. Le pool CI ne remplace jamais cette revue.
  const sameAthlete = genuine && (genuine.origin === "det_coach_review_contexts" || genuine.origin === "det_library_source_reviews") && genuine.coachId === record.coachId && genuine.athleteId === record.athleteId;
  // Chemin normal : la revue doit porter sur le MÊME profil de planification (empreinte complète).
  const staleContext = !!(sameAthlete && ((genuine!.athleteChecksKey && genuine!.athleteChecksKey!==canonicalJson(a)) || (planningFingerprint && genuine!.planningInputFingerprint !== planningFingerprint)
    || (genuine!.origin === "det_library_source_reviews" && (genuine!.libraryFamily !== family.key || genuine!.athleteChecksKey !== canonicalJson(a)))));
  const g = sameAthlete && !staleContext ? genuine : null;
  const byId = new Map((g?.qualifications ?? []).map((q) => [q.id, q]));
  const qualifications: SourceQualification[] = []; const unreviewedIds: string[] = [];
  for (const id of kept) {
    const q = byId.get(id), w = findSource(id)!;
    const ev = q?.evidence as { coachReviewedSource?: unknown } | undefined;
    if (q && ev?.coachReviewedSource === true && q.sourceFingerprint === fingerprintV3SportingSource(w)) qualifications.push(q);
    else unreviewedIds.push(id);
  }
  const familyBricks = bricksForFamily(family.key);
  const needBricks = familyBricks.length > 0;
  const approvedBricks = new Set((g?.brickApprovals ?? []).map((b) => b.id));
  const unreviewedBricks = familyBricks.map((b) => b.id).filter((id) => !approvedBricks.has(id));
  if (unreviewedIds.length || unreviewedBricks.length) {
    return { family, pool, missing, snapshot, ctx: null, reviewClock:clock, excludedSources: excluded, limiterTrace: trace,
      sourceReview: { status: "blocked_missing_source_review", unreviewedIds, unreviewedBricks, upstreamTask: "review_family_pool_sources_in_advanced_grid",
        reason: (staleContext ? "La revue enregistrée concerne un autre état du profil de l'athlète (données, objectif, budget ou ordre des limiteurs modifiés) : elle n'est pas reprise. " : "") + `${unreviewedIds.length} séance(s)${unreviewedBricks.length ? ` et ${unreviewedBricks.length} enchaînement(s)` : ""} de cette famille n'ont pas de revue réelle par le coach pour cet athlète. La sélection CI du moteur n'est pas une revue humaine : faire la revue une fois dans « Avancé — revue par séance ».` } };
  }
  const reviewedSnapshot: CoachDetInputSnapshot = { ...snapshot, sourceReviewProvenance: { kind: "genuine_coach_source_review", reviewContextId: g!.reviewContextId, reviewedAt: g!.reviewedAt, reviewedIds: qualifications.length, origin: g!.origin, ...(g!.libraryManifestHash ? { libraryManifestHash: g!.libraryManifestHash } : {}) } };
  return { family, pool, missing, snapshot: reviewedSnapshot, reviewClock:clock, excludedSources: excluded, limiterTrace: trace,
    sourceReview: { status: "reviewed", reviewContextId: g!.reviewContextId, reviewedAt: g!.reviewedAt, reviewedIds: qualifications.length },
    ctx: { coachId: record.coachId, athleteId: record.athleteId, qualifications, clock,
      ...(needBricks ? { brickApprovals: (g!.brickApprovals).filter((b) => familyBricks.some((x) => x.id === b.id)) } : {}) } };
}

/** Ordre initial proposé au coach : ordre du diagnostic de l'app restreint aux limiteurs éligibles DET. */
/** Affichage seulement : `fromDiagnostic` (détectés par l'app) et `appendedEligible` (éligibles DET non détectés) sont séparés ; rien n'est enregistré comme choix coach sans action explicite. */
export function initialLimiterOrder(diagnostic: string[], eligible: string[]): { order: string[]; fromDiagnostic: string[]; appendedEligible: string[]; notGuiding: string[] } {
  const fromDiagnostic = diagnostic.filter((m) => eligible.includes(m));
  const appendedEligible = eligible.filter((m) => !fromDiagnostic.includes(m));
  return { order: [...fromDiagnostic, ...appendedEligible], fromDiagnostic, appendedEligible, notGuiding: diagnostic.filter((m) => !eligible.includes(m)) };
}

export const CATALOGUE_SIZE = v3FullCatalogue.workouts.length;

const DAY_FR: Record<string, string> = { Lundi: "lundi", Mardi: "mardi", Mercredi: "mercredi", Jeudi: "jeudi", Vendredi: "vendredi", Samedi: "samedi", Dimanche: "dimanche", Monday: "lundi", Tuesday: "mardi", Wednesday: "mercredi", Thursday: "jeudi", Friday: "vendredi", Saturday: "samedi", Sunday: "dimanche" };
const PHASE_FR: Record<string, string> = { base: "base", build: "développement", peak: "pic", taper: "affûtage", race: "course", recovery: "récupération" };
/** Explication en français d'un refus moteur, à partir des contrôles réellement bloquants (aucun horaire proposé). */
export function explainEngineRefusal(issues: { code: string; week: number | null; message: string }[]): string[] {
  const out: string[] = [];
  const recovery = new Set(issues.filter((i) => i.code === "det_v3_recovery_safe_slot_unfillable").map((i) => i.week));
  for (const i of issues) {
    if(i.code==='det_v336_root_source_matching_conflict'){
      let d:{slotsRequired?:number;distinctSourcesAvailable?:number}={};
      try{d=JSON.parse(i.message);}catch{/* diagnostic non structuré */}
      out.push(`Semaine ${i.week} : ${d.slotsRequired??"plusieurs"} créneaux exigent des séances distinctes, mais seulement ${d.distinctSourcesAvailable??"trop peu de"} source(s) revue(s) restent compatibles avec les doses et horaires confirmés. Il faut revoir les disponibilités réelles ou les sources admissibles ; aucune séance n'est dupliquée artificiellement.`);
    }
    if (i.code === "det_required_horizon_source_missing") {
      let d: { day?: string; sport?: string; phase?: string } = {};
      try { d = JSON.parse(i.message); } catch { /* message non structuré */ }
      const sp = SPORTS_OF[d.sport ?? ""] ?? d.sport ?? "?";
      out.push(`Semaine ${i.week} (${PHASE_FR[d.phase ?? ""] ?? d.phase ?? "?"}) : le calendrier exige une séance de ${sp} le ${DAY_FR[d.day ?? ""] ?? d.day ?? "?"}, mais aucune source revue n'est disponible pour cet objectif et cette phase. Il faut compléter la revue des séances ou des enchaînements adaptés ; augmenter le temps de calcul ne suffit pas.`);
    }
    if (i.code !== "det_empty_catalogue_slot") continue;
    let d: { day?: string; sport?: string; phase?: string; minDurationMin?: number | null; maxDurationMin?: number | null } = {};
    try { d = JSON.parse(i.message); } catch { /* message non structuré */ }
    const sp = SPORTS_OF[d.sport ?? ""] ?? d.sport ?? "?";
    const dur = d.minDurationMin != null || d.maxDurationMin != null ? ` (${d.minDurationMin ?? "?"}–${d.maxDurationMin ?? "?"} min)` : "";
    out.push(recovery.has(i.week)
      ? `Semaine ${i.week} (${PHASE_FR[d.phase ?? ""] ?? d.phase ?? "?"}) : la séance de ${sp} du ${DAY_FR[d.day ?? ""] ?? d.day ?? "?"}${dur} ne peut pas être placée. Avec les horaires confirmés, aucune séance disponible ne respecte le temps de récupération avant ou après la séance voisine. Il faut corriger les heures ou jours RÉELS de l'athlète (aucun horaire n'est supposé).`
      : `Semaine ${i.week} : aucune séance de ${sp} compatible pour le ${DAY_FR[d.day ?? ""] ?? d.day ?? "?"}${dur} (phase ${PHASE_FR[d.phase ?? ""] ?? d.phase ?? "?"}).`);
  }
  for (const i of issues) {
    if (i.code === "polarization" && i.week != null) out.push(`Semaine ${i.week} : la répartition des intensités n'est pas assez polarisée (${(/(\d+)%/.exec(i.message) ?? [])[1] ?? "?"} % en zones faciles, cible ≥ 75 %). L'ordre des limiteurs ou le volume disponible peut en être la cause ; DET ne retire aucune exigence.`);
    if (i.code === "lorang_categories" && i.week != null) out.push(`Semaine ${i.week} : aucune séance d'intensité (HIT ou seuil) disponible pour cette semaine hors décharge. Les séances revues compatibles avec les interdictions de cet athlète (ex. interdiction de sprints) ne suffisent pas.`);
  }
  const known: Record<string, string> = {
    load_pattern: "Trop de semaines consécutives sans décharge pour cette durée de plan.",
    det_v316_strict_periodization_not_proven: "La périodisation (base → développement → pic → affûtage) n'a pas pu être prouvée sur cette durée.",
    det_structured_polarization_target_search_unresolved: "La répartition des intensités n'a pas été trouvée dans le temps de calcul autorisé.",
    det_v315_bounded_multiweek_replays_unresolved: "Recherche bornée sur plusieurs semaines sans solution.",
    det_v351_marathon_exact_source_horizon_evidence_unverified: "Les preuves marathon (blocs de développement, spécificité du pic) ne sont pas réunies sur cet horizon.",
  };
  for (const c of [...new Set(issues.map((i) => i.code))]) if (known[c]) out.push(known[c]);
  return out;
}
