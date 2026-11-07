import {isNumericString,workoutReadbackDifferences,rawTargetEvidence,type ReadbackDifference,type RawTargetEvidence} from './readbackDifferences.ts';
import {alignSpeedReadPrecision} from './speedReadPrecision.ts';
/**
 * Expéditeur Nolio V2 (planned) — utilise EXACTEMENT les opérations produites
 * par `mapPlanToNolioV2`. Séparé de V1 : connexion, jetons, ids opaques propres.
 *
 * Nolio V2 ne déduplique pas les créations et n'a plus d'id_partner. Chaque
 * opération passe par un journal durable :
 *   claim atomique "sending" (AVANT le POST) → confirmed (id distant retourné)
 *   réponse perdue / 5xx ⇒ sent_unconfirmed. Une opération déjà réservée n'est
 *   JAMAIS renvoyée automatiquement : seule une réconciliation EXACTE (lecture
 *   paginée complète + détail, structure/durée/heure/audience/description+
 *   marqueur identiques, candidat unique) la confirme ; partiel/édité ⇒
 *   ambiguous ; absent ⇒ reste incertain (arrêt, aucun 2e POST). 429 seul
 *   permet un nouvel essai par compare-and-set. 400/404/409/422 ⇒ rejected.
 * L'id de plan_versions ne rend PAS un POST Nolio idempotent.
 *
 * Sans connexion V2 autorisée ⇒ BLOCKED avant tout appel réseau.
 */
import { canonicalJson, type NolioV2Refs, type V2Operation } from "./plannedMapper.ts";

export type LedgerState = "sending" | "sent_unconfirmed" | "confirmed" | "ambiguous" | "rejected" | "rate_limited";
export type LedgerEntry = {
  opKey: string; planVersionId: string; sessionKey: string; path: string; athleteRef: string;
  payloadSha256: string; apiVersion: "v2"; state: LedgerState; remoteId: string | null; detail: string | null;
};
/**
 * Journal durable ATOMIQUE. `claim` = INSERT … ON CONFLICT DO NOTHING (réservation
 * unique par opKey, état "sending" écrit AVANT tout POST) ; `transition` =
 * compare-and-set (UPDATE … WHERE state = from). Aucune dépendance à un verrou
 * de processus JS : deux exécutions concurrentes ne peuvent pas toutes deux
 * réserver la même opération. Toute erreur ⇒ exception ⇒ arrêt sans POST.
 */
export interface NolioV2Ledger {
  claim(e: LedgerEntry): Promise<{ claimed: true } | { claimed: false; existing: LedgerEntry }>;
  transition(opKey: string, from: LedgerState, to: LedgerState, patch: { remoteId?: string | null; detail?: string | null }): Promise<boolean>;
}
export type HttpResult = { kind: "response"; status: number; json: unknown } | { kind: "lost"; detail: string };
export type ListPage = { ok: true; items: Array<Record<string, unknown>>; hasMore: boolean } | { ok: false; detail: string };
export interface NolioV2Http {
  post(path: string, body: unknown): Promise<HttpResult>;
  /** Une page du calendrier planifié de l'athlète (keyset : starting_after + has_more). */
  listPage(path: string, athleteRef: string, date: string, startingAfter: string | null): Promise<ListPage>;
  /** Détail (seul le détail sert `workout`). */
  getDetail(path: string, id: string, athleteRef: string): Promise<{ ok: true; item: Record<string, unknown> } | { ok: false; detail: string }>;
}
export type NolioV2Connection = {
  apiVersion: "v2";
  /** "real" : refs synthétiques refusées. "test-mock" : transport simulé de test uniquement. */
  mode: "real" | "test-mock";
  grantedScopes: string[];
};
export type SendStatus = "BLOCKED" | "DONE" | "STOPPED_UNCONFIRMED" | "STOPPED_AMBIGUOUS" | "STOPPED_IN_FLIGHT" | "STOPPED_RATE_LIMITED" | "STOPPED_AUTH" | "STOPPED_LEDGER_UNAVAILABLE" | "DRY_RUN_NOT_VALIDATED" | "STOPPED_BATCH_LIMIT" | "STOPPED_REJECTED";
export type SendReport = {
  status: SendStatus;
  reason: string | null;
  results: Array<{ sessionKey: string; state: LedgerState | "skipped_confirmed" | "dry_run_ok" | "dry_run_rejected"; remoteId: string | null }>;
};

export const NOLIO_V2_REQUIRED_SCOPES = ["planned:write", "planned:read"] as const;
export const RECONCILE_MAX_PAGES = 50;

import { originMarker, bodyToSend, operationKey } from "./marker.ts";
export { originMarker, bodyToSend, operationKey };

// ---- Réconciliation EXACTE ----
const READ_ONLY = new Set(["id", "revision", "summary", "load", "time_in_zones", "has_structured_workout"]);
const UNIT = { s: 1, min: 60, h: 3600, m: 1, km: 1000, mi: 1609.344 } as Record<string, number>;
function normalize(v: unknown, top = false): unknown {
  if (Array.isArray(v)) return v.map((x) => normalize(x));
  if (!v || typeof v !== "object") return v;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  // Raw W and m/s targets explicitly allow number|string in Nolio's schema.
  // Convert only finite numeric strings in these unambiguous physical units;
  // formatted paces, percentages and all other fields remain untouched.
  if(o.type==='raw'&&(o.unit==='W'||o.unit==='m/s')){
    const next={...o};let changed=false;
    for(const key of ['value','value_max'])if(isNumericString(next[key])){next[key]=Number(next[key]);changed=true;}
    if(changed)return normalize(next,top);
  }
  if (keys.length === 2 && typeof o.value === "number" && typeof o.unit === "string" && o.unit in UNIT) {
    const dim = ["s", "min", "h"].includes(o.unit) ? "s" : "m";
    return { value: o.value * UNIT[o.unit], unit: dim };
  }
  const out: Record<string, unknown> = {};
  for (const k of keys.sort()) {
    // `id` de nœud (lecture, jamais à la création) et `resolved` (enrichissement
    // readOnly des cibles, « accepted and ignored on write ») : champs de lecture.
    if (k === "id" || k === "resolved" || (top && READ_ONLY.has(k))) continue;
    if (o[k] === null || o[k] === undefined) continue; // null = non défini (contrat)
    out[k] = normalize(o[k]);
  }
  return out;
}
function deepEqualTol(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqualTol(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in (b as object) && deepEqualTol((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}
/**
 * Lecture servie avec des valeurs « non défini » que la création n'a pas
 * envoyées : retirées SEULEMENT quand le corps envoyé n'a pas la clé.
 * - `workout: []` : « null and [] mean not set » (contrat).
 * - `tags: []` : aucune étiquette.
 * - `show_rpe: false` sans `rpe` envoyé : visibilité d'un RPE absent.
 * - `duration`/`distance` de l'événement absents de l'envoi alors qu'un
 *   `workout` non vide a été envoyé : total dérivé du workout (« an unchanged
 *   total stays derived from the workout ») ; le workout reste comparé en entier.
 * Toute autre clé ou valeur différente ⇒ pas de correspondance (prudent).
 */
export function stripReadDefaults(remote: Record<string, unknown>, sent: Record<string, unknown>): Record<string, unknown> {
  const r = { ...remote };
  // Current official read contract: [] identifies a single-part activity.
  // Non-empty parts must remain compared: never verify just one leg while
  // silently hiding another provider activity. Aggregate totals are read-only;
  // the actual per-activity dose and every workout node remain compared.
  if (!("parts" in sent) && Array.isArray(r.parts) && r.parts.length === 0) {
    delete r.parts;
    for (const field of ["total_duration", "total_distance"]) if (!(field in sent)) delete r[field];
  }
  const absent = (k: string) => !(k in sent) || sent[k] === undefined;
  if (absent("workout") && Array.isArray(r.workout) && r.workout.length === 0) delete r.workout;
  if (absent("tags") && Array.isArray(r.tags) && r.tags.length === 0) delete r.tags;
  if (absent("show_rpe") && absent("rpe") && r.show_rpe === false) delete r.show_rpe;
  const sentWorkout = Array.isArray(sent.workout) && sent.workout.length > 0;
  if (sentWorkout) for (const k of ["duration", "distance"]) if (absent(k)) delete r[k];
  return r;
}
/** Égalité exacte des champs significatifs (nom, date, heure, sport, audience, durée, description+marqueur, structure complète). */
export function exactRemoteMatch(remote: Record<string, unknown>, sent: Record<string, unknown>): boolean {
  const a=normalize(stripReadDefaults(remote,sent),true) as Record<string,unknown>,b=normalize(sent,true) as Record<string,unknown>;
  if('workout' in a&&'workout' in b)a.workout=alignSpeedReadPrecision(a.workout,b.workout);
  return deepEqualTol(a,b);
}
/** Diagnostic restricted to contract field names; never expose provider values. */
export function remoteMismatchFields(remote: Record<string, unknown>, sent: Record<string, unknown>): string[] {
  const a = normalize(stripReadDefaults(remote, sent), true) as Record<string, unknown>;
  const b = normalize(sent, true) as Record<string, unknown>;
  if('workout' in a&&'workout' in b)a.workout=alignSpeedReadPrecision(a.workout,b.workout);
  const allowed = new Set(['name','sport','description','description_html','date_start','date_end','time','moment','athletes','group','duration','distance','elevation_gain','elevation_loss','tonnage','rpe','show_rpe','coggan_load','color','tags','workout','recurrence','recurrence_result','recurrence_preview','parts','total_duration','total_distance','event','location','goal_type']);
  return [...new Set([...Object.keys(a), ...Object.keys(b)].filter(k => !deepEqualTol(a[k], b[k])).map(k => allowed.has(k) ? k : 'other_field'))].sort();
}
const looselySame = (it: Record<string, unknown>, body: Record<string, unknown>, marker: string) =>
  (typeof it.description === "string" && it.description.includes(marker)) ||
  (it.name === body.name && it.date_start === body.date_start && it.sport === body.sport);

type Reconcile = { kind: "exact"; id: string } | { kind: "absent" } | { kind: "ambiguous"; detail: string; diagnostic?: { candidates: number; exact: number; fields: string[]; workout?: ReadbackDifference[]; targets?: RawTargetEvidence[] } } | { kind: "read_failed"; detail: string };
export async function reconcileExact(http: NolioV2Http, op: V2Operation, athlete: string, sent: Record<string, unknown>, marker: string, budget?: {deadline:number;now:()=>number}): Promise<Reconcile> {
  const expired=()=>!!budget && budget.now()>=budget.deadline;
  const candidates: Array<Record<string, unknown>> = [];
  let after: string | null = null;
  for (let page = 0; ; page++) {
    if (page >= RECONCILE_MAX_PAGES) return { kind: "read_failed", detail: "pagination_limit_reached" };
    if(expired())return {kind:"read_failed",detail:"deadline"};
    const r = await http.listPage(op.path, athlete, String(sent.date_start), after);
    if(expired())return {kind:"read_failed",detail:"deadline"};
    if (!r.ok) return { kind: "read_failed", detail: (r as { detail: string }).detail };
    candidates.push(...r.items.filter((it) => looselySame(it, sent, marker)));
    if (!r.hasMore) break;
    const last = r.items.at(-1)?.id;
    if (typeof last !== "string" || last === after) return { kind: "read_failed", detail: "pagination_cursor_missing" };
    after = last;
  }
  if (!candidates.length) return { kind: "absent" };
  const exact: string[] = [];
  const fields = new Set<string>();
  const workout:ReadbackDifference[]=[];
  const targets:RawTargetEvidence[]=[];
  for (const c of candidates) {
    if (typeof c.id !== "string") return { kind: "ambiguous", detail: "candidate_without_id" };
    if(expired())return {kind:"read_failed",detail:"deadline"};
    const d = await http.getDetail(op.path, c.id, athlete);
    if(expired())return {kind:"read_failed",detail:"deadline"};
    if (!d.ok) return { kind: "read_failed", detail: `detail:${(d as { detail: string }).detail}` };
    if (d.item.id !== c.id) return { kind: "ambiguous", detail: "detail_id_mismatch" };
    if (exactRemoteMatch(d.item, sent)) exact.push(c.id);
    else {
      for (const field of remoteMismatchFields(d.item, sent)) fields.add(field);
      if(targets.length<5)targets.push(...rawTargetEvidence(d.item.workout,sent.workout).slice(0,5-targets.length));
      if(workout.length<5)workout.push(...workoutReadbackDifferences(alignSpeedReadPrecision(normalize(d.item.workout),normalize(sent.workout)),normalize(sent.workout),deepEqualTol).slice(0,5-workout.length));
    }
  }
  if (exact.length === 1 && candidates.length === 1) return { kind: "exact", id: exact[0] };
  return { kind: "ambiguous", detail: `${candidates.length} candidat(s), ${exact.length} exact(s)`, diagnostic: { candidates: candidates.length, exact: exact.length, fields: [...fields].sort(), ...(workout.length?{workout}:{}), ...(targets.length?{targets}:{}) } };
}

const REMOTE_ID = { "/api/v2/planned/trainings/": /^ptrn_[A-Za-z0-9]+$/, "/api/v2/planned/competitions/": /^pcmp_[A-Za-z0-9]+$/ } as Record<string, RegExp>;

export async function sendPlannedV2(input: {
  connection: NolioV2Connection | null;
  refs: NolioV2Refs;
  planVersionId: string;
  operations: V2Operation[];
  ledger: NolioV2Ledger;
  http: NolioV2Http | null;
  dryRun?: boolean;
  /** Nombre max de NOUVEAUX POST dans cet appel (lot borné) ; les opérations confirmées ne comptent pas. */
  maxNewPosts?: number;
  /** Plan complet : un refus 400/404/409/422 ARRÊTE le lot (aucun état partiel silencieux). */
  stopOnRejected?: boolean;
  noRetry?: boolean;
}): Promise<SendReport> {
  const blocked = (reason: string): SendReport => ({ status: "BLOCKED", reason, results: [] });
  const c = input.connection;
  if (!c || !input.http) return blocked("no_authorized_v2_connection");
  if (c.apiVersion !== "v2") return blocked("connection_not_v2");
  if (c.mode === "real" && input.refs.synthetic) return blocked("synthetic_references_refused_for_real_send");
  const missing = NOLIO_V2_REQUIRED_SCOPES.filter((s) => !c.grantedScopes.includes(s));
  if (missing.length) return blocked(`scopes_missing:${missing.join(",")}`);
  if (!/^[0-9a-f-]{36}$/i.test(input.planVersionId)) return blocked("plan_version_id_invalid");
  const http = input.http, ledger = input.ledger;
  const results: SendReport["results"] = [];
  let newPosts = 0;
  const stop = (status: SendStatus, reason: string, extra?: SendReport["results"][number]): SendReport => ({ status, reason, results: extra ? [...results, extra] : results });

  for (const op of input.operations) {
    if ((op.body.athletes as string[] | undefined)?.length !== 1 || (op.body.athletes as string[])[0] !== input.refs.athleteId)
      return stop("BLOCKED", `athlete_mismatch:${op.sessionKey}`);
    const sent = await bodyToSend(input.planVersionId, op);
    if (input.dryRun) {
      const r = await http.post(op.path, { ...sent, dry_run: true });
      // Validation serveur UNIQUEMENT : 200 ≤ status < 300 avec corps objet JSON.
      // Blocage local (status 0), chemin refusé, timeout, corps illisible ⇒ jamais validé.
      const serverOk = r.kind === "response" && r.status >= 200 && r.status < 300 && !!r.json && typeof r.json === "object" && !Array.isArray(r.json);
      results.push({ sessionKey: op.sessionKey, state: serverOk ? "dry_run_ok" : "dry_run_rejected", remoteId: null });
      if (!serverOk) return stop("DRY_RUN_NOT_VALIDATED", `dry_run_not_server_validated:${op.sessionKey}:${r.kind === "response" ? `status_${r.status}` : r.detail}`);
      continue;
    }
    const marker = await originMarker(input.planVersionId, op);
    const { opKey, payloadSha256 } = await operationKey(input.planVersionId, op);
    const entry: LedgerEntry = { opKey, planVersionId: input.planVersionId, sessionKey: op.sessionKey, path: op.path,
      athleteRef: input.refs.athleteId, payloadSha256, apiVersion: "v2", state: "sending", remoteId: null, detail: null };
    // Lot borné : vérifié AVANT toute réservation (aucune opération réservée sans POST).
    if (input.maxNewPosts !== undefined && newPosts >= input.maxNewPosts) return stop("STOPPED_BATCH_LIMIT", "batch_limit");
    let claim: Awaited<ReturnType<NolioV2Ledger["claim"]>>;
    try { claim = await ledger.claim(entry); } catch { return stop("STOPPED_LEDGER_UNAVAILABLE", `claim_failed:${op.sessionKey}`); }

    if (!claim.claimed) {
      const prev = (claim as { existing: LedgerEntry }).existing;
      if (prev.payloadSha256 !== payloadSha256 || prev.athleteRef !== entry.athleteRef || prev.path !== op.path) return stop("BLOCKED", `ledger_divergence:${op.sessionKey}`);
      if (prev.state === "confirmed") { results.push({ sessionKey: op.sessionKey, state: "skipped_confirmed", remoteId: prev.remoteId }); continue; }
      if (prev.state === "rejected") { if (input.stopOnRejected) return stop("STOPPED_REJECTED", `rejected:${op.sessionKey}`); results.push({ sessionKey: op.sessionKey, state: "rejected", remoteId: null }); continue; }
      if (prev.state === "ambiguous") return stop("STOPPED_AMBIGUOUS", `ambiguous:${op.sessionKey}`);
      if (prev.state === "rate_limited") {
        if(input.noRetry)return stop("STOPPED_RATE_LIMITED","no_retry_after_429");
        // 429 = non traité de façon certaine : seule exception où un nouvel essai est permis, via CAS.
        let won = false;
        try { won = await ledger.transition(opKey, "rate_limited", "sending", { detail: "retry_after_429" }); } catch { return stop("STOPPED_LEDGER_UNAVAILABLE", `cas_failed:${op.sessionKey}`); }
        if (!won) return stop("STOPPED_IN_FLIGHT", `concurrent_retry:${op.sessionKey}`);
      } else {
        if(input.noRetry)return stop("STOPPED_UNCONFIRMED",`explicit_durable_verification_required:${op.sessionKey}`);
        // "sending" (POST possiblement en vol ou interrompu) ou "sent_unconfirmed" : JAMAIS de renvoi automatique.
        const rc = await reconcileExact(http, op, input.refs.athleteId, sent, marker);
        if (rc.kind === "exact") {
          let ok = false;
          try { ok = await ledger.transition(opKey, prev.state, "confirmed", { remoteId: rc.id, detail: "réconcilié: correspondance exacte unique + marqueur (indice d'origine, pas preuve absolue)" }); } catch { ok = false; }
          if (!ok) return stop("STOPPED_UNCONFIRMED", `reconcile_cas_failed:${op.sessionKey}`);
          results.push({ sessionKey: op.sessionKey, state: "confirmed", remoteId: rc.id });
          continue;
        }
        if (rc.kind === "ambiguous") {
          try { await ledger.transition(opKey, prev.state, "ambiguous", { detail: rc.detail }); } catch { /* reste incertain */ }
          return stop("STOPPED_AMBIGUOUS", `ambiguous:${op.sessionKey}`);
        }
        if (rc.kind === "read_failed") return stop("STOPPED_UNCONFIRMED", `reconcile_read_failed:${op.sessionKey}`);
        // Absent à la lecture : première requête peut-être encore en vol ou visibilité retardée ⇒ aucun 2e POST.
        return stop(prev.state === "sending" ? "STOPPED_IN_FLIGHT" : "STOPPED_UNCONFIRMED", `absent_at_read_no_auto_resend:${op.sessionKey}`, { sessionKey: op.sessionKey, state: prev.state, remoteId: null });
      }
    }

    // Réservation acquise (état "sending" durable) ⇒ un seul POST.
    newPosts++;
    const r = await http.post(op.path, sent);
    const cas = async (to: LedgerState, patch: { remoteId?: string | null; detail?: string | null }) => {
      try { return await ledger.transition(opKey, "sending", to, patch); } catch { return false; }
    };
    if (r.kind === "lost") {
      await cas("sent_unconfirmed", { detail: `lost:${r.detail}` });
      return stop("STOPPED_UNCONFIRMED", `response_lost:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "sent_unconfirmed", remoteId: null });
    }
    if (r.status === 429) {
      await cas("rate_limited", { detail: "HTTP 429" });
      return stop("STOPPED_RATE_LIMITED", `rate_limited:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "rate_limited", remoteId: null });
    }
    if (r.status === 401 || r.status === 403) {
      await cas("rejected", { detail: `HTTP ${r.status}` });
      return stop("STOPPED_AUTH", `http_${r.status}:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "rejected", remoteId: null });
    }
    if (r.status === 400 || r.status === 404 || r.status === 409 || r.status === 422) {
      await cas("rejected", { detail: `HTTP ${r.status}` });
      if (input.stopOnRejected) return stop("STOPPED_REJECTED", `http_${r.status}:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "rejected", remoteId: null });
      results.push({ sessionKey: op.sessionKey, state: "rejected", remoteId: null });
      continue;
    }
    const id = (r.json as { id?: unknown } | null)?.id;
    if (r.status < 200 || r.status >= 300 || typeof id !== "string" || !REMOTE_ID[op.path]?.test(id)) {
      await cas("sent_unconfirmed", { detail: `unconfirmed_response:HTTP ${r.status}` });
      return stop("STOPPED_UNCONFIRMED", `unconfirmed_response:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "sent_unconfirmed", remoteId: null });
    }
    if (!(await cas("confirmed", { remoteId: id, detail: "id retourné par la création" })))
      return stop("STOPPED_UNCONFIRMED", `confirm_cas_failed:${op.sessionKey}`, { sessionKey: op.sessionKey, state: "sent_unconfirmed", remoteId: id });
    results.push({ sessionKey: op.sessionKey, state: "confirmed", remoteId: id });
  }
  return { status: "DONE", reason: null, results };
}

/**
 * Configuration OAuth V2 QA : séparée de V1. Refuse tout callback de
 * production ou le callback V1 codé en dur. Aucun secret retourné.
 */
export const V1_PRODUCTION_CALLBACK_HOST = "wtwjkmawntybyehatkjo.supabase.co";
export function checkV2OAuthConfig(cfg: { clientId?: string | null; redirectUri?: string | null; expectedQaHost: string; appType?: string | null }): string[] {
  const p: string[] = [];
  if (!cfg.clientId) p.push("client_id_v2_absent");
  if (cfg.appType !== "partner" && cfg.appType !== "team") p.push("app_type_must_be_partner_or_team");
  let u: URL | null = null;
  try { u = cfg.redirectUri ? new URL(cfg.redirectUri) : null; } catch { u = null; }
  if (!u) p.push("redirect_uri_absent_or_invalid");
  else {
    if (u.protocol !== "https:") p.push("redirect_uri_not_https");
    if (u.host === V1_PRODUCTION_CALLBACK_HOST) p.push("redirect_uri_is_v1_production_callback");
    if (u.host !== cfg.expectedQaHost) p.push("redirect_uri_not_qa_host");
    if (/nolio-oauth\/callback$/.test(u.pathname)) p.push("redirect_uri_reuses_v1_callback_path");
  }
  return p;
}
