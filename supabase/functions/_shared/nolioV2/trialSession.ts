/**
 * Nolio V2 — essai RÉEL contrôlé d'UNE séance technique (QA), recette unique.
 *
 * Contrat officiel courant (https://www.nolio.io/api/v2/openapi.json, SHA-256 75e3850e…f9238,
 * guide migration v1→v2 SHA-256 7dcea57a…a7a48d) :
 * - `POST /api/v2/planned/trainings/` (planned_trainings_create) → 201 `PlannedTraining` (id `ptrn_…`).
 *   « Nolio no longer deduplicates creates » ; « If a request times out, read the calendar
 *   (GET with date_from/date_to) before retrying ». 429 : « do not retry in a loop ».
 * - `GET …/trainings/?athlete&date_from&date_to&limit&starting_after` → {data, has_more} (keyset) ;
 *   détail `GET …/trainings/{id}/?athlete` = la seule représentation complète (workout, description).
 *
 * Garanties de cette recette (indépendantes du sender général `sendPlannedV2`) :
 * - Essai FIGÉ une seule fois par (coach, athlète, code) : date + empreinte du corps stockées ;
 *   le corps est reconstruit à l'identique ou l'action est refusée (jamais un nouvel ID/date).
 * - Réservation SQL atomique `frozen → sending` AVANT le POST ; tout état ≠ frozen interdit
 *   définitivement un POST (timeout, perte, 5xx, 429, 4xx, reprise : lecture seulement).
 * - « POST accepté » ≠ « vérifié » : VERIFIED_UNIQUE exige liste complète du jour + détail de
 *   CHAQUE élément, un seul marqueur TFCLab, correspondance exacte du détail, id concordant.
 * - Le corps ne contient jamais `dry_run` (le transport réel le refuse d'ailleurs).
 */
import { exactRemoteMatch, type NolioV2Http } from "./plannedClient.ts";
import { NOLIO_V2_CONTRACT } from "./plannedMapper.ts";
import { canonical, sha256Hex } from "./dryRun.ts";
import type { LoadResult } from "./connectionStore.ts";

export const TRIAL_RECIPE_CODE = "QA_TECH_RUN_10MIN_NO_TARGET_REAL_1" as const;
export const TRIAL_PATH = NOLIO_V2_CONTRACT.trainingsPath;
export const TRIAL_POST_BUDGET_MS = 15_000;
export const TRIAL_VERIFY_BUDGET_MS = 20_000;
export const TRIAL_MAX_PAGES = 5;
export const TRIAL_MAX_DETAILS = 30;
export const TRIAL_PREVIEW = {
  code: TRIAL_RECIPE_CODE, name: "TFCLab QA — séance technique 10 min (non prescriptive)", sport: "run", durationMin: 10, target: "no_target",
  note: "Séance technique non prescriptive : aucune allure, FTP ou CSS ; cible « no_target ». Date seule, sans heure.",
} as const;
export const TRIAL_ACTIONS = ["prepare", "send", "verify"] as const;
export type TrialAction = typeof TRIAL_ACTIONS[number];
export type TrialState = "frozen" | "sending" | "post_accepted" | "post_refused" | "post_unconfirmed";
export type TrialRow = { id: string; trial_date: string; payload_sha256: string; state: TrialState; remote_id: string | null };
export type Verdict = "PREPARED" | "POST_ACCEPTED" | "POST_REFUSED" | "POST_UNCONFIRMED" | "VERIFIED_UNIQUE" | "DUPLICATE" | "DIVERGENT" | "ABSENT" | "UNKNOWN";
export type TrialReceiptInsert = {
  trial_id: string; coach_id: string; athlete_id: string; recipe_code: string; action: TrialAction; trial_date: string;
  payload_sha256: string; http_status: number | null; verdict: Verdict; code: string;
  items_read: number | null; marker_matches: number | null; exact_matches: number | null;
};
export interface TrialStore {
  get(): Promise<TrialRow | null>;
  /** INSERT … ON CONFLICT DO NOTHING puis relecture : renvoie TOUJOURS la ligne existante. */
  freeze(date: string, payloadSha256: string): Promise<TrialRow>;
  /** CAS SQL frozen → sending (payload identique). false ⇒ aucun POST. */
  claimSend(trialId: string, payloadSha256: string): Promise<boolean>;
  /** CAS SQL sending → état final. */
  finishSend(trialId: string, to: "post_accepted" | "post_refused" | "post_unconfirmed", remoteId: string | null, http: number | null): Promise<boolean>;
  insertReceipt(r: TrialReceiptInsert): Promise<string | null>;
}
export type TrialResult = {
  status: Verdict | "BLOCKED" | "NOT_SENT" | "ALREADY_SENT" | "IN_FLIGHT";
  code: string; trialId: string | null; trialDate: string | null; payloadSha256: string | null; state: TrialState | null;
  httpStatus: number | null; receiptIds: string[]; verify: null | { verdict: Verdict; code: string; receiptId: string | null; itemsRead: number | null; markerMatches: number | null; exactMatches: number | null };
  network: "none" | "post" | "post+read" | "read";
  /** Nom Nolio du destinataire lié aux refs utilisées pour CE hash ; réponse HTTP du coach seulement, jamais stocké. */
  recipient: null | { nolioName: string; payloadSha256: string };
};

const SPT = /^spt_[A-Za-z0-9]+$/, USR = /^usr_[A-Za-z0-9]+$/, YMD = /^\d{4}-\d{2}-\d{2}$/, PTRN = /^ptrn_[A-Za-z0-9]+$/;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export async function trialMarker(coachId: string, athleteId: string): Promise<string> {
  return `[TFCLab-QA-TRIAL ${(await sha256Hex(`tfclab-nolio-v2-trial-1|${coachId}|${athleteId}|${TRIAL_RECIPE_CODE}`)).slice(0, 24)}]`;
}
/** Corps réel fixe. Aucun champ venant du client ; aucun `dry_run`. */
export function buildTrialBody(a: { runSportId: unknown; athleteRef: unknown; date: unknown; marker: string }):
  { ok: true; body: Record<string, unknown> } | { ok: false; reason: string } {
  if (typeof a.runSportId !== "string" || !SPT.test(a.runSportId)) return { ok: false, reason: "run_sport_unconfirmed" };
  if (typeof a.athleteRef !== "string" || !USR.test(a.athleteRef)) return { ok: false, reason: "athlete_ref_invalid" };
  if (typeof a.date !== "string" || !YMD.test(a.date)) return { ok: false, reason: "date_invalid" };
  if (!/^\[TFCLab-QA-TRIAL [0-9a-f]{24}\]$/.test(a.marker)) return { ok: false, reason: "marker_invalid" };
  return { ok: true, body: {
    name: TRIAL_PREVIEW.name, date_start: a.date, sport: a.runSportId, athletes: [a.athleteRef],
    description: `Séance technique TFCLab QA, non prescriptive : aucune allure, FTP ou CSS.\n\n${a.marker}`,
    duration: { value: 600, unit: "s" },
    workout: [{ kind: "step", duration: { value: 600, unit: "s" }, targets: [{ type: "no_target" }] }],
  } };
}
export const tomorrowUtc = (now: number) => new Date(now + 86_400_000).toISOString().slice(0, 10);

/** Classement de la réponse de création. Seul 201 + PlannedTraining concordant = POST accepté (pas « vérifié »). */
export function classifyCreate(r: { kind: "response"; status: number; json: unknown } | { kind: "lost"; detail: string } | "timeout", sent: Record<string, unknown>):
  { to: "post_accepted" | "post_refused" | "post_unconfirmed"; code: string; http: number | null; remoteId: string | null } {
  if (r === "timeout") return { to: "post_unconfirmed", code: "timeout", http: null, remoteId: null };
  if (r.kind === "lost") return { to: "post_unconfirmed", code: `lost_${r.detail}`.slice(0, 64).replace(/[^a-z0-9_]/g, "_"), http: null, remoteId: null };
  const s = r.status;
  if (!Number.isInteger(s) || s < 100) return { to: "post_unconfirmed", code: "local_guard_refused", http: null, remoteId: null };
  if ([400, 401, 403, 404, 409, 422, 429].includes(s)) return { to: "post_refused", code: `http_${s}`, http: s, remoteId: null };
  if (s !== 201) return { to: "post_unconfirmed", code: s >= 200 && s < 300 ? "unexpected_2xx" : "http_other", http: s, remoteId: null };
  const j = r.json;
  if (!isObj(j) || "dry_run" in j || typeof j.id !== "string" || !PTRN.test(j.id) || j.date_start !== sent.date_start)
    return { to: "post_unconfirmed", code: "created_shape_invalid", http: s, remoteId: null };
  return { to: "post_accepted", code: "created_201", http: s, remoteId: j.id };
}

type VerifyOut = { verdict: Verdict; code: string; itemsRead: number | null; markerMatches: number | null; exactMatches: number | null };
/** Lecture complète du jour + détail de chaque élément. Aucune écriture Nolio. */
/** Jeton d'arrêt : une fois `stopped`, aucune nouvelle page/détail n'est démarrée et le résultat est ignoré. */
export type StopToken = { stopped: boolean };
export async function verifyTrial(http: NolioV2Http, athleteRef: string, sent: Record<string, unknown>, marker: string, knownRemoteId: string | null, stop: StopToken = { stopped: false }): Promise<VerifyOut> {
  const unknown = (code: string, itemsRead: number | null = null): VerifyOut => ({ verdict: "UNKNOWN", code, itemsRead, markerMatches: null, exactMatches: null });
  const ids: string[] = [];
  let after: string | null = null;
  for (let page = 0; ; page++) {
    if (page >= TRIAL_MAX_PAGES) return unknown("pagination_limit");
    if (stop.stopped) return unknown("read_timeout");
    const r = await http.listPage(TRIAL_PATH, athleteRef, String(sent.date_start), after);
    if (stop.stopped) return unknown("read_timeout");
    if (!r.ok) return unknown(`list_${(r as { detail: string }).detail}`.slice(0, 64));
    for (const it of r.items) {
      const id = it.id as string;
      if (ids.includes(id)) return unknown("list_repeated_item");
      ids.push(id);
    }
    if (!r.hasMore) break;
    const last = r.items.at(-1)?.id;
    if (typeof last !== "string" || last === after) return unknown("pagination_cursor_invalid");
    after = last;
  }
  if (ids.length > TRIAL_MAX_DETAILS) return unknown("too_many_items", ids.length);
  const marked: string[] = [], exact: string[] = [];
  for (const id of ids) {
    if (stop.stopped) return unknown("read_timeout", ids.length);
    const d = await http.getDetail(TRIAL_PATH, id, athleteRef);
    if (stop.stopped) return unknown("read_timeout", ids.length);
    if (!d.ok) return unknown(`detail_${(d as { detail: string }).detail}`.slice(0, 64), ids.length);
    if (d.item.id !== id) return unknown("detail_id_mismatch", ids.length);
    if (typeof d.item.description === "string" && d.item.description.includes(marker)) {
      marked.push(id);
      if (exactRemoteMatch(d.item, sent)) exact.push(id);
    }
  }
  const counts = { itemsRead: ids.length, markerMatches: marked.length, exactMatches: exact.length };
  if (marked.length === 0) return { verdict: "ABSENT", code: "marker_absent", ...counts };
  if (marked.length > 1) return { verdict: "DUPLICATE", code: "marker_multiple", ...counts };
  if (exact.length !== 1) return { verdict: "DIVERGENT", code: "detail_not_exact", ...counts };
  if (knownRemoteId !== null && knownRemoteId !== exact[0]) return { verdict: "DIVERGENT", code: "remote_id_mismatch", ...counts };
  return { verdict: "VERIFIED_UNIQUE", code: "exact_unique", ...counts };
}

/** Nom affichable : texte borné, sans caractères de contrôle/bidi. */
export function sanitizeRecipientName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  // eslint-disable-next-line no-control-regex -- retrait volontaire des caractères de contrôle
  const t = x.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return t.length ? t : null;
}

async function withDeadline<T>(p: Promise<T>, ms: number, stop?: StopToken): Promise<T | "timeout"> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([p, new Promise<"timeout">((r) => { t = setTimeout(() => { if (stop) stop.stopped = true; r("timeout"); }, ms); })]); }
  finally { clearTimeout(t); }
}

/**
 * Orchestration pure (dépendances injectées). L'appelant (Edge) a déjà fait getClaims + coach QA +
 * athlète possédé (client RLS) et ne crée le service-role qu'ensuite.
 */
export async function runTrialAction(a: {
  coachId: string; athleteId: string; recipeCode: unknown; action: unknown; now: () => number;
  loadConnection: () => Promise<LoadResult>;
  /** Nom Nolio de l'athlète `athleteRef` d'après le grant OAuth actif ET sélectionné pour CETTE connexion (aucun appel Nolio). */
  loadRecipient: (athleteRef: string) => Promise<{ ok: true; name: string } | { ok: false; reason: string }>;
  http: (accessToken: string) => NolioV2Http;
  store: TrialStore;
  postBudgetMs?: number; verifyBudgetMs?: number;
}): Promise<TrialResult> {
  const res = (p: Partial<TrialResult> & Pick<TrialResult, "status" | "code">): TrialResult =>
    ({ trialId: null, trialDate: null, payloadSha256: null, state: null, httpStatus: null, receiptIds: [], verify: null, network: "none", recipient: null, ...p });
  if (a.recipeCode !== TRIAL_RECIPE_CODE) return res({ status: "BLOCKED", code: "recipe_unknown" });
  if (!(TRIAL_ACTIONS as readonly unknown[]).includes(a.action)) return res({ status: "BLOCKED", code: "action_unknown" });
  const action = a.action as TrialAction;

  let existing: TrialRow | null;
  try { existing = await a.store.get(); } catch { return res({ status: "BLOCKED", code: "trial_store_unavailable" }); }
  if (action !== "prepare" && !existing) return res({ status: "BLOCKED", code: "trial_not_prepared" });

  const loaded = await a.loadConnection();
  if (!loaded.ok) return res({ status: "BLOCKED", code: (loaded as { reason: string }).reason });
  const marker = await trialMarker(a.coachId, a.athleteId);
  const date = existing ? existing.trial_date : tomorrowUtc(a.now());
  const b = buildTrialBody({ runSportId: loaded.value.refs.sportIds.run, athleteRef: loaded.value.refs.athleteId, date, marker });
  if (!b.ok) return res({ status: "BLOCKED", code: (b as { reason: string }).reason });
  const body = b.body;
  const sha = await sha256Hex(canonical(body));
  // Destinataire : nom Nolio lié EXACTEMENT à la ref qui vient d'entrer dans le corps haché.
  let rec: { ok: true; name: string } | { ok: false; reason: string };
  try { rec = await a.loadRecipient(loaded.value.refs.athleteId); } catch { rec = { ok: false, reason: "recipient_unavailable" }; }
  const recName = rec.ok ? sanitizeRecipientName(rec.name) : null;
  if (action !== "verify" && !recName) return res({ status: "BLOCKED", code: rec.ok ? "recipient_name_invalid" : (rec as { reason: string }).reason });

  let trial: TrialRow;
  if (existing) trial = existing;
  else {
    try { trial = await a.store.freeze(date, sha); } catch { return res({ status: "BLOCKED", code: "trial_freeze_failed" }); }
  }
  const base = { trialId: trial.id, trialDate: trial.trial_date, payloadSha256: trial.payload_sha256, state: trial.state,
    recipient: recName ? { nolioName: recName, payloadSha256: sha } : null };
  // Même essai = même date + même corps ; sinon refus (jamais une nouvelle séance).
  if (trial.payload_sha256 !== sha || trial.trial_date !== date) return res({ ...base, recipient: null, status: "BLOCKED", code: "trial_payload_divergent" });

  const receipt = async (r: Omit<TrialReceiptInsert, "trial_id" | "coach_id" | "athlete_id" | "recipe_code" | "trial_date" | "payload_sha256">) => {
    try { return await a.store.insertReceipt({ trial_id: trial.id, coach_id: a.coachId, athlete_id: a.athleteId, recipe_code: TRIAL_RECIPE_CODE, trial_date: trial.trial_date, payload_sha256: sha, ...r }); }
    catch { return null; }
  };
  const http = a.http(loaded.value.accessToken);
  const doVerify = async (knownRemoteId: string | null) => {
    const stop: StopToken = { stopped: false };
    const v = await withDeadline(verifyTrial(http, loaded.value.refs.athleteId, body, marker, knownRemoteId, stop), a.verifyBudgetMs ?? TRIAL_VERIFY_BUDGET_MS, stop);
    stop.stopped = true;
    const out: VerifyOut = v === "timeout" ? { verdict: "UNKNOWN", code: "read_timeout", itemsRead: null, markerMatches: null, exactMatches: null } : v;
    const id = await receipt({ action: "verify", http_status: null, verdict: out.verdict, code: out.code, items_read: out.itemsRead, marker_matches: out.markerMatches, exact_matches: out.exactMatches });
    return { ...out, receiptId: id };
  };

  if (action === "prepare") {
    const id = await receipt({ action: "prepare", http_status: null, verdict: "PREPARED", code: existing ? "already_frozen" : "frozen", items_read: null, marker_matches: null, exact_matches: null });
    return res({ ...base, status: "PREPARED", code: existing ? "already_frozen" : "frozen", receiptIds: id ? [id] : [] });
  }
  if (action === "verify") {
    if (trial.state === "frozen") return res({ ...base, status: "NOT_SENT", code: "trial_never_sent" });
    const v = await doVerify(trial.remote_id);
    return res({ ...base, status: v.verdict, code: v.code, receiptIds: v.receiptId ? [v.receiptId] : [], verify: v, network: "read" });
  }
  // send
  if (trial.state !== "frozen") return res({ ...base, status: trial.state === "sending" ? "IN_FLIGHT" : "ALREADY_SENT", code: "no_second_post_verify_only" });
  let won = false;
  try { won = await a.store.claimSend(trial.id, sha); } catch { return res({ ...base, status: "BLOCKED", code: "trial_claim_failed" }); }
  if (!won) return res({ ...base, status: "IN_FLIGHT", code: "claim_lost_no_post" });
  // Réservation durable acquise ⇒ UN SEUL POST, jamais répété.
  const raw = await withDeadline(http.post(TRIAL_PATH, body), a.postBudgetMs ?? TRIAL_POST_BUDGET_MS);
  const c = classifyCreate(raw, body);
  let finished = false;
  try { finished = await a.store.finishSend(trial.id, c.to, c.remoteId, c.http); } catch { finished = false; }
  const state: TrialState = finished ? c.to : "sending";
  const postVerdict: Verdict = c.to === "post_accepted" ? "POST_ACCEPTED" : c.to === "post_refused" ? "POST_REFUSED" : "POST_UNCONFIRMED";
  const pid = await receipt({ action: "send", http_status: c.http, verdict: finished ? postVerdict : "POST_UNCONFIRMED", code: finished ? c.code : "finish_cas_failed", items_read: null, marker_matches: null, exact_matches: null });
  const ids = pid ? [pid] : [];
  if (c.to === "post_refused") return res({ ...base, state, status: "POST_REFUSED", code: c.code, httpStatus: c.http, receiptIds: ids, network: "post" });
  const v = await doVerify(c.remoteId);
  if (v.receiptId) ids.push(v.receiptId);
  return res({ ...base, state, status: finished ? postVerdict : "POST_UNCONFIRMED", code: c.code, httpStatus: c.http, receiptIds: ids, verify: v, network: "post+read" });
}
