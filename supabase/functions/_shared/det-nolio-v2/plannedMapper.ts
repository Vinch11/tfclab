/**
 * Nolio API V2 — mapping PUR `detStructuredWorkout` (V400) → opérations planned V2.
 *
 * Contrat : docs/qa/nolio-v2/planning-contract-2026-11-02.json (OpenAPI 3.1.0,
 * API 2.0.0, SHA-256 bc43cbcd…1965). Module partagé par l'expéditeur V2
 * (`plannedClient.ts`) ET par les tests : c'est le même chemin.
 *
 * Règles :
 * - Séances → POST /api/v2/planned/trainings/ ; course objectif → POST
 *   /api/v2/planned/competitions/ UNIQUEMENT si l'événement est confirmé dans
 *   les références (date + nom). La course n'a pas de recette : pas de workout.
 * - Les blocs et cibles viennent exclusivement du V400 sérialisé ; jamais du texte.
 * - Aucun id Nolio n'est inventé : sport / athlète / exercice viennent des
 *   références confirmées. Des références `synthetic:true` ne sont jamais
 *   acceptées pour un envoi réel (voir plannedClient).
 * - Allures : anciennes archives en m/s exactes ; nouvelles versions pace-v1
 *   en /km ou /100m, avec les secondes décimales source conservées.
 * - Tout ce qui ne peut pas être représenté fidèlement ⇒ refus explicite.
 * Aucun réseau, aucun secret.
 */

import { isRealYmd, startProblems, hhmm, type CoachSessionStart } from "./localTime.ts";
import { formatPaceSeconds, parsePaceSeconds } from "./paceTarget.ts";

export const NOLIO_V2_CONTRACT = {
  openapiSha256: "bc43cbcd9298e6190237680024c4d969654e47b60bd646cf45d6d02b9b4a1965",
  apiVersion: "2.0.0",
  trainingsPath: "/api/v2/planned/trainings/",
  competitionsPath: "/api/v2/planned/competitions/",
} as const;

// ---- Entrée : V400 sérialisé (copie structurelle, sans import hors _shared) ----
export type DetTarget = { metric: "watts" | "sec_per_km" | "sec_per_100m" | "m_per_sec" | "coach_rpe_load"; min: number | null; max: number | null };
export type DetLeaf = {
  kind: "step"; role: "warmup" | "main" | "cooldown"; label: string; domain: string | null;
  dose: { seconds: number } | { meters: number } | { reps: number };
  repsTarget?: number; sides?: number; rpe?: { min: number; max: number }; target: DetTarget | null;
};
export type DetRepeat = { kind: "repeat"; label: string; count: number; betweenSec: number; restAfterLast: false; steps: DetNode[] };
export type DetNode = DetLeaf | DetRepeat;
export type DetWorkout = { schema: "det-structured-workout-v1"; sourceId: string; sport: string; chosenDurationMin: number; nodes: DetNode[]; exactSeconds: number | null };

export type PlanSessionInput = {
  sessionKey: string; date: string; title: string; details?: string; sport: string;
  isRest?: boolean; catalogId?: string | null; durationMin?: number;
  detStructuredWorkout?: DetWorkout;
  detStructuredComponents?: {schema:'det-brick-components-preview-v1';bike:DetWorkout;run:DetWorkout}; detStructureRefusal?: { reason: string };
  /** Début confirmé par le coach (date/heure locale + fuseau + offset réel). Absent ⇒ aucune heure envoyée. */
  coachStart?: CoachSessionStart;
};

export type NolioV2Refs = {
  /** true = fixtures de test ; jamais acceptées pour un envoi. */
  synthetic: boolean;
  athleteId: string;                       // usr_… lu via l'API V2
  sportIds: Partial<Record<string, string>>; // spt_… par sport TFCL, confirmés
  exerciseIds: Partial<Record<string, string>>; // exf_… par libellé de bloc, confirmés
  competition: { date: string; name: string; sport: string; goalType?: "a" | "b" } | null;
  /** Fuseau du calendrier Nolio de l'athlète, CONFIRMÉ. Absent ⇒ une séance avec heure est refusée (jamais supposé). */
  calendarTimeZone?: string | null;
};

// ---- Sortie : corps V2 ----
type Q<U extends string> = { value: number; unit: U };
export type V2Target =
  | { type: "raw"; value: number | string; unit: string; value_max?: number | string }
  | { type: "rpe"; rpe: number; rpe_max?: number }
  | { type: "no_target" };
export type V2Step = { kind: "step"; duration?: Q<"s" | "min" | "h">; distance?: Q<"m" | "km" | "mi">; targets: V2Target[]; intensity?: "warmup" | "work" | "rest" | "cooldown"; comment?: string };
export type V2Set = { reps?: number; duration?: Q<"s">; distance?: Q<"m">; count?: number; targets?: V2Target[]; comment?: string };
export type V2Exercise = { kind: "exercise"; exercise: string; sets: V2Set[]; comment?: string };
export type V2Repeat = { kind: "repeat"; times: number; steps: V2Node[]; skip_last?: boolean };
export type V2Node = V2Step | V2Repeat | V2Exercise;

export type V2Operation =
  | { kind: "training"; path: typeof NOLIO_V2_CONTRACT.trainingsPath; sessionKey: string; sourceId: string; body: Record<string, unknown>; precisionNotes: string[]; schedule?: CoachSessionStart }
  | { kind: "competition"; path: typeof NOLIO_V2_CONTRACT.competitionsPath; sessionKey: string; sourceId: null; body: Record<string, unknown>; precisionNotes: string[] };
export type MapRefusal = { sessionKey: string; reason: string };
export type MapResult = { operations: V2Operation[]; refusals: MapRefusal[] };

const fin = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const OPAQUE = { usr: /^usr_[A-Za-z0-9]+$/, spt: /^spt_[A-Za-z0-9]+$/, exf: /^exf_[A-Za-z0-9]+$/ };

/** Cible V400 → cible V2, ou raison du refus. Ordre des bornes toujours value ≤ value_max. */
export function mapTarget(t: DetTarget, notes: string[], options: { paceTargets?: boolean; sport?: string } = {}): V2Target | string {
  const { min, max } = t;
  if (min === null && max === null) return "target_without_bounds";
  if ((min !== null && !fin(min)) || (max !== null && !fin(max))) return "target_bound_not_finite";
  if (min !== null && max !== null && min > max) return "target_bounds_inverted";
  if (options.paceTargets && (t.metric === 'sec_per_km' || t.metric === 'sec_per_100m' || (t.metric === 'm_per_sec' && options.sport === 'run'))) {
    if (min === null || max === null) return 'open_pace_bound_unrepresentable';
    if (min <= 0 || max <= 0) return 'pace_not_positive';
    const fast = t.metric === 'm_per_sec' ? 1000 / max : min;
    const slow = t.metric === 'm_per_sec' ? 1000 / min : max;
    // Production : allures transmises au format documenté m:ss (secondes entières,
    // arrondi au plus proche, écart ≤ 0,5 s). Les secondes décimales ("4:07.4")
    // ne figurent pas dans les exemples du contrat Nolio. HYPOTHÈSE non confirmée :
    // elles seraient la cause du HTTP 400 observé en simulation QA (S1, V3P_RUN_136).
    // La simulation dry_run avant chaque création reste le juge ; la prescription
    // source reste intacte dans le plan.
    const fastS = Math.round(fast), slowS = Math.max(Math.round(slow), Math.round(fast));
    const value = formatPaceSeconds(fastS), valueMax = formatPaceSeconds(slowS);
    if (value === null || valueMax === null) return 'pace_precision_unrepresentable';
    const unit = t.metric === 'sec_per_100m' ? '/100m' : '/km';
    notes.push(`allure transmise en ${unit} au format m:ss (arrondi à la seconde)`);
    return { type: 'raw', value, ...(fastS === slowS ? {} : { value_max: valueMax }), unit };
  }
  if (t.metric === "coach_rpe_load") {
    if (min === null || !Number.isInteger(min) || (max !== null && !Number.isInteger(max))) return "rpe_not_integer";
    if (min < 0 || (max ?? min) > 10) return "rpe_out_of_range";
    return max !== null && max !== min ? { type: "rpe", rpe: min, rpe_max: max } : { type: "rpe", rpe: min };
  }
  if (t.metric === "watts" || t.metric === "m_per_sec") {
    const unit = t.metric === "watts" ? "W" : "m/s";
    if (min === null) return { type: "raw", value: 0, value_max: max!, unit }; // plafond documenté : value 0 + value_max
    if (max === null) return "open_upper_bound_unrepresentable";
    return min === max ? { type: "raw", value: min, unit } : { type: "raw", value: min, value_max: max, unit };
  }
  if (t.metric !== "sec_per_km" && t.metric !== "sec_per_100m") return "target_metric_unknown"; // jamais de défaut silencieux
  // Allures (s/km, s/100 m) : plus lent = vitesse basse. Conversion exacte, signalée.
  const dist = t.metric === "sec_per_km" ? 1000 : 100;
  if ((min !== null && min <= 0) || (max !== null && max <= 0)) return "pace_not_positive";
  if (min === null) return "open_fast_bound_unrepresentable"; // pas de vitesse maximale connue
  const lo = max === null ? 0 : dist / max;
  const hi = dist / min;
  notes.push(`allure ${t.metric} [${min ?? "—"}..${max ?? "—"}] convertie exactement en m/s (pas d'arrondi m:ss)`);
  return lo === hi ? { type: "raw", value: hi, unit: "m/s" } : { type: "raw", value: lo, value_max: hi, unit: "m/s" };
}

function leafTargets(l: DetLeaf, notes: string[], options: MappingOptions, sport: string): V2Target[] | string {
  const out: V2Target[] = [];
  if (l.target) { const t = mapTarget(l.target, notes, { paceTargets: options.paceTargets, sport }); if (typeof t === "string") return `${t}:${l.label}`; out.push(t); }
  if (l.rpe) {
    if (!Number.isInteger(l.rpe.min) || !Number.isInteger(l.rpe.max) || l.rpe.min > l.rpe.max || l.rpe.min < 0 || l.rpe.max > 10) return `rpe_range_invalid:${l.label}`;
    if (!out.some((t) => t.type === "rpe")) out.push(l.rpe.min === l.rpe.max ? { type: "rpe", rpe: l.rpe.min } : { type: "rpe", rpe: l.rpe.min, rpe_max: l.rpe.max });
  }
  if (out.length > 2) return `too_many_targets:${l.label}`; // WorkoutTargets maxItems 2
  return out.length ? out : [{ type: "no_target" }];
}

/**
 * Même prédicat que mapNodes (et requiredExerciseLabels) : une feuille exige une référence
 * d'exercice officielle. Décidé UNIQUEMENT par le rôle et la dose structurés (jamais le nom) :
 * - série en répétitions (dose reps ou repsTarget), quel que soit le rôle ou le sport ;
 * - feuille principale (role main) d'une séance de renforcement, même temporisée.
 * Une phase warmup/cooldown temporisée ou en distance, sans répétitions, reste un step V2
 * (durée, intensité, cibles et libellé conservés), sans exerciseId.
 */
export type MappingOptions={timedCoachStrength?:boolean;declaredCompetitions?:boolean;paceTargets?:boolean};
export function nodeRequiresExercise(n: DetLeaf, sport: string,options:MappingOptions={}): boolean {
  if(options.timedCoachStrength&&sport==='strength'&&'seconds' in n.dose)return false;
  if ("reps" in n.dose || n.repsTarget !== undefined) return true;
  return sport === "strength" && n.role === "main";
}

/**
 * Libellés exacts de toutes les feuilles exigeant un exercice (repeats inclus),
 * uniquement depuis detStructuredWorkout des séances fournies — aucun texte,
 * catalogue ni nom deviné. Séance sans structure ⇒ ignorée (refus mapper explicite).
 */
export function requiredExerciseLabels(sessions: PlanSessionInput[],options:MappingOptions={}): string[] {
  const out = new Set<string>();
  const walk = (ns: DetNode[], sport: string) => { for (const n of ns) {
    if (n.kind === "repeat") { if (Array.isArray(n.steps)) walk(n.steps, sport); }
    else if (nodeRequiresExercise(n, sport,options) && typeof n.label === "string" && n.label) out.add(n.label);
  } };
  for (const s of sessions) {
    if (s.isRest) continue;
    const w = s.detStructuredWorkout;
    if (!w || w.schema !== "det-structured-workout-v1" || !Array.isArray(w.nodes)) continue;
    walk(w.nodes, w.sport);
  }
  return [...out];
}

/** Guide v1→v2 §8.2 : « Up to 3 levels of nesting » pour repeat. */
export const MAX_REPEAT_DEPTH = 3;

function mapNodes(ns: DetNode[], sport: string, refs: NolioV2Refs, notes: string[], depth = 0,options:MappingOptions={}): V2Node[] | string {
  const out: V2Node[] = [];
  for (const n of ns) {
    if (n.kind === "repeat") {
      if (!Number.isSafeInteger(n.count) || n.count < 1) return `repeat_count_invalid:${n.label}`;
      if (!fin(n.betweenSec) || n.betweenSec < 0) return `repeat_rest_invalid:${n.label}`;
      if (n.restAfterLast !== false) return `repeat_rest_after_last_unsupported:${n.label}`;
      if (depth + 1 > MAX_REPEAT_DEPTH) return `repeat_nesting_too_deep:${n.label}`;
      // WorkoutRepeat.steps accepte tout type de nœud, mélangés (OpenAPI courant) : un exercice
      // répété N fois avec repos entre séries reste fidèle (repos = step rest + skip_last).
      const inner = mapNodes(n.steps, sport, refs, notes, depth + 1,options);
      if (typeof inner === "string") return inner;
      if (n.betweenSec > 0) {
        // Repos ENTRE répétitions : skip_last omet le repos après la dernière (contrat V2).
        inner.push({ kind: "step", duration: { value: n.betweenSec, unit: "s" }, intensity: "rest", targets: [{ type: "no_target" }] });
        out.push({ kind: "repeat", times: n.count, steps: inner, skip_last: true });
      } else out.push({ kind: "repeat", times: n.count, steps: inner });
      continue;
    }
    const tg = leafTargets(n, notes, options, sport);
    if (typeof tg === "string") return tg;
    const isStrength = nodeRequiresExercise(n, sport,options);
    if (isStrength) {
      const ex = refs.exerciseIds[n.label];
      if (!ex) return `exercise_reference_missing:${n.label}`;
      if (!OPAQUE.exf.test(ex)) return `exercise_reference_not_opaque:${n.label}`;
      if (n.sides !== undefined && n.sides !== 1) return `laterality_mapping_unconfirmed:${n.label}`;
      // Un seul axe par série (contrainte sémantique WorkoutSet).
      const set: V2Set = { targets: tg };
      if ("reps" in n.dose) set.reps = n.dose.reps;
      else if ("seconds" in n.dose) {
        set.duration = { value: n.dose.seconds, unit: "s" }; // fenêtre de temps de la source, pas une durée dérivée de répétitions
        if (n.repsTarget !== undefined) set.comment = `objectif ${n.repsTarget} répétitions dans la fenêtre`;
      } else set.distance = { value: n.dose.meters, unit: "m" };
      // Libellé V3 conservé tel quel (aucun contenu supprimé, aucune charge inventée).
      out.push({ kind: "exercise", exercise: ex, sets: [set], comment: n.label });
      continue;
    }
    if (n.role === "main" && n.domain === null && !(options.timedCoachStrength&&sport==="strength"&&"seconds" in n.dose)) return `main_step_without_domain:${n.label}`;
    const step: V2Step = { kind: "step", targets: tg, intensity: n.role === "warmup" ? "warmup" : n.role === "cooldown" ? "cooldown" : "work", comment: n.label+(n.repsTarget!==undefined?` · objectif ${n.repsTarget} répétitions dans la fenêtre`:"")+(n.sides!==undefined?` · ${n.sides} côté(s)`:"") };
    if ("seconds" in n.dose) step.duration = { value: n.dose.seconds, unit: "s" };
    else if ("meters" in n.dose) step.distance = { value: n.dose.meters, unit: "m" };
    else return `reps_dose_outside_strength:${n.label}`;
    out.push(step);
  }
  return out;
}

/** Contrôles sémantiques non exprimés par le JSON Schema. Retourne les violations. */
export function semanticViolations(nodes: V2Node[], path = ""): string[] {
  const v: string[] = [];
  nodes.forEach((n, i) => {
    const p = `${path}${i}`;
    if ("id" in (n as object)) v.push(`${p}:node_id_on_create`);
    if (n.kind === "step") {
      if (n.duration && n.distance) v.push(`${p}:step_duration_and_distance`);
      if (!n.targets?.length || n.targets.length > 2) v.push(`${p}:step_targets_cardinality`);
      for (const t of n.targets) {
        if (t.type === "raw" && t.value_max !== undefined) {
          const lo = rawTargetValue(t.value, t.unit), hi = rawTargetValue(t.value_max, t.unit);
          if (lo !== null && hi !== null && lo > hi) v.push(`${p}:raw_bounds_inverted`);
        }
        if (t.type === "rpe" && t.rpe_max !== undefined && t.rpe > t.rpe_max) v.push(`${p}:rpe_bounds_inverted`);
      }
    } else if (n.kind === "repeat") {
      if (!Number.isSafeInteger(n.times) || n.times < 1) v.push(`${p}:repeat_times`);
      if (!n.steps.length) v.push(`${p}:repeat_empty`);
      v.push(...semanticViolations(n.steps, `${p}.`));
    } else {
      if (!OPAQUE.exf.test(n.exercise)) v.push(`${p}:exercise_id_not_opaque`);
      for (const s of n.sets) if ([s.reps, s.duration, s.distance].filter((x) => x !== undefined).length !== 1) v.push(`${p}:set_axis_count`);
    }
  });
  return v;
}

export const RACE_TITLE_PREFIX = "COURSE : ";
export type RaceIdentity = { sessionKey: string; date: string; name: string; sport: string; goalType: null };
/**
 * Identité SOURCE d'une course objectif (séance sans recette titrée « COURSE : … ») :
 * date, nom (titre sans préfixe), sport. Le schéma de plan V3 actuel ne porte aucune
 * priorité ⇒ goalType null : une priorité ajoutée côté coach ne correspond pas à la source.
 */
export function raceIdentityOf(s: PlanSessionInput): RaceIdentity | null {
  if (s.isRest || s.catalogId || typeof s.title !== "string" || !s.title.startsWith(RACE_TITLE_PREFIX)) return null;
  const name = s.title.slice(RACE_TITLE_PREFIX.length).trim();
  if (!name || !isRealYmd(s.date) || !s.sport) return null;
  return { sessionKey: s.sessionKey, date: s.date, name, sport: s.sport, goalType: null };
}

export function mapPlanToNolioV2(sessions: PlanSessionInput[], refs: NolioV2Refs,options:MappingOptions={}): MapResult {
  const operations: V2Operation[] = []; const refusals: MapRefusal[] = [];
  const refuse = (sessionKey: string, reason: string) => { refusals.push({ sessionKey, reason }); };
  if (!OPAQUE.usr.test(refs.athleteId)) return { operations, refusals: [{ sessionKey: "*", reason: "athlete_reference_not_opaque" }] };
  const seen = new Set<string>();
  for (const s of sessions) {
    if (s.isRest) continue;
    if (seen.has(s.sessionKey)) { refuse(s.sessionKey, "duplicate_session_key"); continue; }
    seen.add(s.sessionKey);
    if (!isRealYmd(s.date)) { refuse(s.sessionKey, "date_invalid"); continue; }
    let time: string | undefined;
    if (s.coachStart !== undefined) {
      const sp = startProblems(s.coachStart, s.date);
      if (sp.length) { refuse(s.sessionKey, sp[0]); continue; }
      if (!refs.calendarTimeZone) { refuse(s.sessionKey, "athlete_calendar_timezone_unconfirmed"); continue; }
      if (refs.calendarTimeZone !== s.coachStart.timeZone) { refuse(s.sessionKey, "athlete_calendar_timezone_differs"); continue; }
      time = hhmm(s.coachStart.minuteOfDay);
    }
    const notes: string[] = [];
    if (!s.catalogId) {
      // Course objectif : uniquement sur identité d'événement confirmée par le coach ET identique
      // à la séance source (date, nom, sport ; priorité seulement si la source en porte une).
      const src = raceIdentityOf(s);
      const c = options.declaredCompetitions ? src : refs.competition;
      if (!src) { refuse(s.sessionKey, "session_without_source_not_a_race"); continue; }
      if (!c) { refuse(s.sessionKey, "competition_identity_unconfirmed"); continue; }
      if (c.date !== src.date) { refuse(s.sessionKey, "competition_date_mismatch"); continue; }
      if (c.name !== src.name) { refuse(s.sessionKey, "competition_name_mismatch"); continue; }
      if (c.sport !== src.sport) { refuse(s.sessionKey, "competition_sport_mismatch"); continue; }
      if ((c.goalType ?? null) !== src.goalType) { refuse(s.sessionKey, "competition_priority_mismatch"); continue; }
      const sport = refs.sportIds[c.sport];
      if (!sport || !OPAQUE.spt.test(sport)) { refuse(s.sessionKey, `sport_reference_missing:${c.sport}`); continue; }
      const body: Record<string, unknown> = { name: c.name, date_start: c.date, sport, athletes: [refs.athleteId] };
      if (c.goalType) body.goal_type = c.goalType;
      if (time) body.time = time;
      const outP = v2BodyProblems(body, "competition");
      if (outP.length) { refuse(s.sessionKey, `output:${outP.join(",")}`); continue; }
      operations.push({ kind: "competition", path: NOLIO_V2_CONTRACT.competitionsPath, sessionKey: s.sessionKey, sourceId: null, body, precisionNotes: notes });
      continue;
    }
    const w = s.detStructuredWorkout;
    if (!w) { refuse(s.sessionKey, `det_structure_absent:${s.detStructureRefusal?.reason ?? "unknown"}`); continue; }
    if (w.schema !== "det-structured-workout-v1") { refuse(s.sessionKey, "det_structure_schema_unknown"); continue; }
    // V2 has one sport per training and no confirmed sport on workout nodes.
    // Never flatten a reviewed bike/transition/run structure or split it into unlinked sends.
    if (w.sport === "brick" || "composition" in w) { refuse(s.sessionKey, "multisport_contract_unconfirmed"); continue; }
    const inP = detWorkoutProblems(w);
    if (inP.length) { refuse(s.sessionKey, `input:${inP[0]}`); continue; }
    if (w.sourceId !== s.catalogId) { refuse(s.sessionKey, "det_structure_source_mismatch"); continue; }
    if (s.durationMin !== undefined && w.chosenDurationMin !== s.durationMin) { refuse(s.sessionKey, "det_structure_duration_mismatch"); continue; }
    if (w.sport !== s.sport) { refuse(s.sessionKey, "det_structure_sport_mismatch"); continue; }
    const sport = refs.sportIds[w.sport];
    if (!sport || !OPAQUE.spt.test(sport)) { refuse(s.sessionKey, `sport_reference_missing:${w.sport}`); continue; }
    const nodes = mapNodes(w.nodes, w.sport, refs, notes,0,options);
    if (typeof nodes === "string") { refuse(s.sessionKey, nodes); continue; }
    const sem = semanticViolations(nodes);
    if (sem.length) { refuse(s.sessionKey, `semantic:${sem.join(",")}`); continue; }
    const body: Record<string, unknown> = {
      name: s.title, date_start: s.date, sport, athletes: [refs.athleteId],
      duration: { value: w.chosenDurationMin, unit: "min" }, workout: nodes,
    };
    if (s.details) body.description = s.details;
    if (time) body.time = time;
    const outP = v2BodyProblems(body, "training");
    if (outP.length) { refuse(s.sessionKey, `output:${outP.join(",")}`); continue; }
    const op: V2Operation = { kind: "training", path: NOLIO_V2_CONTRACT.trainingsPath, sessionKey: s.sessionKey, sourceId: w.sourceId, body, precisionNotes: [...new Set(notes)] };
    if (s.coachStart) op.schedule = { ...s.coachStart };
    operations.push(op);
  }
  return { operations, refusals };
}

/** JSON canonique (clés triées, clés spéciales préservées). */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

// ---- Validation runtime de l'ENTRÉE V400 (structure exacte, pas seulement le type TS) ----
const pos = (x: unknown) => fin(x) && x > 0;
const posInt = (x: unknown) => Number.isSafeInteger(x) && (x as number) > 0;
const KNOWN_METRICS = new Set(["watts", "sec_per_km", "sec_per_100m", "m_per_sec", "coach_rpe_load"]);
const ROLES = new Set(["warmup", "main", "cooldown"]);
const onlyKeys = (o: object, allowed: string[]) => Object.keys(o).filter((k) => !allowed.includes(k));

function nodeProblems(ns: unknown, p: string): string[] {
  if (!Array.isArray(ns) || ns.length === 0) return [`${p}nodes_empty_or_not_array`];
  const out: string[] = [];
  ns.forEach((n, i) => {
    const q = `${p}${i}:`;
    if (!n || typeof n !== "object") { out.push(`${q}node_not_object`); return; }
    const o = n as Record<string, unknown>;
    if (typeof o.label !== "string" || !o.label.trim()) out.push(`${q}label_missing`);
    if (o.kind === "repeat") {
      const extra = onlyKeys(o, ["kind", "label", "count", "betweenSec", "restAfterLast", "steps"]);
      if (extra.length) out.push(`${q}repeat_unknown_keys:${extra.join("|")}`);
      if (!posInt(o.count)) out.push(`${q}repeat_count_invalid`);
      if (!fin(o.betweenSec) || (o.betweenSec as number) < 0) out.push(`${q}repeat_rest_invalid`);
      if (o.restAfterLast !== false) out.push(`${q}repeat_rest_after_last_invalid`);
      out.push(...nodeProblems(o.steps, `${q}`));
      return;
    }
    if (o.kind !== "step") { out.push(`${q}kind_unknown`); return; }
    const extra = onlyKeys(o, ["kind", "role", "label", "domain", "dose", "repsTarget", "sides", "rpe", "target"]);
    if (extra.length) out.push(`${q}step_unknown_keys:${extra.join("|")}`);
    if (!ROLES.has(o.role as string)) out.push(`${q}role_unknown`);
    if (o.domain !== null && typeof o.domain !== "string") out.push(`${q}domain_invalid`);
    const d = o.dose as Record<string, unknown> | null;
    if (!d || typeof d !== "object") out.push(`${q}dose_missing`);
    else {
      const axes = Object.keys(d);
      if (axes.length !== 1 || !["seconds", "meters", "reps"].includes(axes[0])) out.push(`${q}dose_must_have_exactly_one_axis:${axes.join("|")}`);
      else if (axes[0] === "reps" ? !posInt(d.reps) : !pos(d[axes[0]])) out.push(`${q}dose_${axes[0]}_not_finite_positive`);
    }
    if (o.repsTarget !== undefined && !posInt(o.repsTarget)) out.push(`${q}reps_target_invalid`);
    if (o.sides !== undefined && !posInt(o.sides)) out.push(`${q}sides_invalid`);
    if (o.rpe !== undefined) {
      const r = o.rpe as Record<string, unknown> | null;
      if (!r || !Number.isInteger(r.min) || !Number.isInteger(r.max) || (r.min as number) < 0 || (r.max as number) > 10 || (r.min as number) > (r.max as number)) out.push(`${q}rpe_invalid`);
    }
    if (o.target !== null) {
      const t = o.target as Record<string, unknown> | undefined;
      if (!t || typeof t !== "object") out.push(`${q}target_invalid`);
      else if (!KNOWN_METRICS.has(t.metric as string)) out.push(`${q}target_metric_unknown`);
    }
  });
  return out;
}

function recomputeExactSeconds(ns: DetNode[]): number | null {
  let s = 0;
  for (const n of ns) {
    if (n.kind === "repeat") { const inner = recomputeExactSeconds(n.steps); if (inner === null) return null; s += n.count * inner + (n.count - 1) * n.betweenSec; }
    else if ("seconds" in n.dose) s += n.dose.seconds; else return null;
  }
  return s;
}

/** Problèmes de structure d'une séance V400 sérialisée ; [] ⇒ entrée conforme. */
export function detWorkoutProblems(w: DetWorkout): string[] {
  const o = w as unknown as Record<string, unknown>;
  const p: string[] = [];
  const extra = onlyKeys(o, ["schema", "sourceId", "sport", "chosenDurationMin", "nodes", "exactSeconds"]);
  if (extra.length) p.push(`workout_unknown_keys:${extra.join("|")}`);
  if (typeof w.sourceId !== "string" || !w.sourceId) p.push("source_id_missing");
  if (typeof w.sport !== "string" || !w.sport) p.push("sport_missing");
  if (!pos(w.chosenDurationMin)) p.push("chosen_duration_not_finite_positive");
  if (w.exactSeconds !== null && !pos(w.exactSeconds)) p.push("exact_seconds_invalid");
  p.push(...nodeProblems(w.nodes, ""));
  if (p.length) return p;
  const secs = recomputeExactSeconds(w.nodes);
  if (secs !== w.exactSeconds) p.push(`exact_seconds_differs_from_blocks:${w.exactSeconds}!=${secs}`);
  else if (secs !== null && Math.abs(secs - w.chosenDurationMin * 60) > 1e-6) p.push(`chosen_duration_differs_from_blocks:${w.chosenDurationMin * 60}!=${secs}`);
  return p;
}

// ---- Validation runtime de la SORTIE contre le contrat importé ----
/** Propriétés de PlannedTrainingCreateRequest / PlannedCompetitionCreateRequest (contrat 2026-11-02). Vérifié par test contre le JSON importé. */
export const V2_TRAINING_CREATE_KEYS = ["recurrence", "athletes", "group", "time", "moment", "description", "description_html", "duration", "distance", "elevation_gain", "elevation_loss", "rpe", "show_rpe", "coggan_load", "color", "tags", "name", "date_start", "sport", "workout"] as const;
export const V2_COMPETITION_CREATE_KEYS = ["event", "location", "goal_type", "recurrence", "athletes", "group", "time", "moment", "description", "description_html", "duration", "distance", "elevation_gain", "elevation_loss", "rpe", "show_rpe", "coggan_load", "color", "tags", "name", "date_start", "sport"] as const;
const DUR_UNITS = new Set(["s", "min", "h"]); const DIST_UNITS = new Set(["m", "km", "mi"]);
function rawTargetValue(value: unknown, unit: unknown): number | null {
  return unit === '/km' || unit === '/100m' ? parsePaceSeconds(value) : fin(value) && value >= 0 ? value : null;
}
const quantityOk = (q: unknown, units: Set<string>) => !!q && typeof q === "object" && pos((q as { value: unknown }).value) && units.has((q as { unit: string }).unit) && Object.keys(q).length === 2;

function v2NodeProblems(ns: unknown, p: string): string[] {
  if (!Array.isArray(ns) || ns.length === 0) return [`${p}workout_empty`];
  const out: string[] = [];
  ns.forEach((n, i) => {
    const q = `${p}${i}:`; const o = n as Record<string, unknown>;
    if ("id" in o) out.push(`${q}node_id_on_create`);
    if (o.kind === "step") {
      const hasD = o.duration !== undefined, hasM = o.distance !== undefined;
      if (hasD === hasM) out.push(`${q}step_needs_exactly_one_of_duration_distance`);
      if (hasD && !quantityOk(o.duration, DUR_UNITS)) out.push(`${q}step_duration_invalid`);
      if (hasM && !quantityOk(o.distance, DIST_UNITS)) out.push(`${q}step_distance_invalid`);
      const ts = o.targets as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(ts) || ts.length < 1 || ts.length > 2) out.push(`${q}targets_cardinality`);
      else for (const t of ts) {
        if (t.type === "raw") {
          const lo = rawTargetValue(t.value, t.unit), hi = t.value_max === undefined ? lo : rawTargetValue(t.value_max, t.unit);
          if (typeof t.unit !== 'string' || lo === null || hi === null || hi < lo) out.push(`${q}raw_target_invalid`);
        }
        else if (t.type === "rpe") { if (!Number.isInteger(t.rpe) || (t.rpe as number) < 0 || (t.rpe as number) > 10 || (t.rpe_max !== undefined && (!Number.isInteger(t.rpe_max) || (t.rpe_max as number) < (t.rpe as number) || (t.rpe_max as number) > 10))) out.push(`${q}rpe_target_invalid`); }
        else if (t.type !== "no_target") out.push(`${q}target_type_unknown`);
      }
    } else if (o.kind === "repeat") {
      if (!posInt(o.times)) out.push(`${q}repeat_times`);
      if (o.skip_last !== undefined && typeof o.skip_last !== "boolean") out.push(`${q}skip_last_not_boolean`);
      out.push(...v2NodeProblems(o.steps, q));
    } else if (o.kind === "exercise") {
      if (typeof o.exercise !== "string" || !OPAQUE.exf.test(o.exercise)) out.push(`${q}exercise_id_not_opaque`);
      const sets = o.sets as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(sets) || !sets.length) out.push(`${q}sets_empty`);
      else for (const st of sets) {
        const axes = [st.reps !== undefined, st.duration !== undefined, st.distance !== undefined].filter(Boolean).length;
        if (axes !== 1) out.push(`${q}set_axis_count`);
        if (st.reps !== undefined && !posInt(st.reps)) out.push(`${q}set_reps_invalid`);
        if (st.duration !== undefined && !quantityOk(st.duration, DUR_UNITS)) out.push(`${q}set_duration_invalid`);
        if (st.distance !== undefined && !quantityOk(st.distance, DIST_UNITS)) out.push(`${q}set_distance_invalid`);
      }
    } else out.push(`${q}kind_unknown`);
  });
  return out;
}

export function v2BodyProblems(body: Record<string, unknown>, kind: "training" | "competition"): string[] {
  const allowed = (kind === "training" ? V2_TRAINING_CREATE_KEYS : V2_COMPETITION_CREATE_KEYS) as readonly string[];
  const p: string[] = [];
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) p.push(`unknown_fields:${extra.join("|")}`);
  if (typeof body.name !== "string" || !body.name) p.push("name_missing");
  if (!isRealYmd(body.date_start)) p.push("date_start_invalid");
  if (typeof body.sport !== "string" || !OPAQUE.spt.test(body.sport)) p.push("sport_not_opaque");
  const ath = body.athletes as unknown[];
  if (!Array.isArray(ath) || ath.length !== 1 || typeof ath[0] !== "string" || !OPAQUE.usr.test(ath[0])) p.push("audience_must_be_one_opaque_athlete");
  if (body.time !== undefined && (typeof body.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))) p.push("time_not_hhmm");
  if (body.time !== undefined && body.moment !== undefined) p.push("time_and_moment_together");
  if (kind === "training") {
    if (!quantityOk(body.duration, DUR_UNITS)) p.push("duration_invalid");
    p.push(...v2NodeProblems(body.workout, "workout."));
  } else if ("workout" in body) p.push("competition_with_workout");
  return p;
}
