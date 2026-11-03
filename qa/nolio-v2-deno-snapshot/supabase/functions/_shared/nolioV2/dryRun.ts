/**
 * Nolio V2 — validation `dry_run` d'UNE séance technique (QA). DRY-RUN ONLY.
 *
 * Contrat officiel courant (https://www.nolio.io/api/v2/openapi.json, récupéré le
 * 2026-11-03, SHA-256 75e3850e…f9238) :
 * - Route `POST /api/v2/planned/trainings/` (operationId planned_trainings_create) :
 *   « `dry_run: true` validates the whole body and returns `{dry_run, is_valid, summary}`
 *   without writing » ; « Unknown body fields are rejected with 400 ».
 * - Le champ est dans le CORPS (pas de paramètre query documenté). Il n'apparaît pas dans
 *   `PlannedTrainingCreateRequest.properties` : écart connu, documenté dans la preuve.
 * - Schéma `WorkoutDryRun` : { dry_run: bool (« Always true: nothing was written »),
 *   is_valid: bool (« Always true; an invalid payload answers 400 »), summary: string },
 *   tous requis. Le code HTTP de cette réponse n'est pas déclaré (seul 201 = créé l'est).
 *
 * Ce module NE PEUT PAS créer : le corps est construit ici depuis une fixture fixe et
 * `dry_run: true` est posé APRÈS tout spread ; le transport refuse tout corps où
 * `dry_run !== true`. Aucun ledger de création, aucun appel à `sendPlannedV2`.
 * Succès STRICT = 2xx + objet exactement {dry_run:true, is_valid:true, summary:string}.
 * Tout le reste (2xx arbitraire, ressource créée, HTML, timeout, perte) ⇒ jamais confirmé.
 */
import { NOLIO_V2_CONTRACT } from "./plannedMapper.ts";

export const DRY_RUN_OPENAPI_SHA256 = "75e3850e12c2b81d9d34eed3656109f8ece270d45324dd2f48b12c13652f9238";
export const DRY_RUN_URL = `https://www.nolio.io${NOLIO_V2_CONTRACT.trainingsPath}`;
export const DRY_RUN_FIXTURE_CODE = "QA_TECH_RUN_10MIN_NO_TARGET" as const;
/** Budget total serveur (fetch + lecture du corps), même si l'abort est ignoré. */
export const DRY_RUN_SERVER_BUDGET_MS = 15_000;

export const DRY_RUN_OUTCOMES = ["DRY_RUN_VALID", "REFUSED", "UNKNOWN"] as const;
export type DryRunOutcome = typeof DRY_RUN_OUTCOMES[number];
export const DRY_RUN_CODES = [
  "dry_run_valid", "validation_rejected_400", "auth_rejected_401", "forbidden_403", "rate_limited_429",
  "http_other", "success_shape_invalid", "unexpected_created_resource", "body_not_json",
  "timeout_or_lost", "network_error", "local_guard_refused",
  ...["team_scope_forbidden", "missing_scope", "athlete_api_access_denied", "permission_denied", "wrong_api_version", "pat_required"] as const,
] as const;
/** Codes 403 officiels (guide migration v1→v2, §4.3 et tableau §5.7, enveloppe {error:{code}}). Allowlist stricte. */
export const NOLIO_403_CODES = ["team_scope_forbidden", "missing_scope", "athlete_api_access_denied", "permission_denied", "wrong_api_version", "pat_required"] as const;
/** Extrait UNIQUEMENT error.code s'il est dans l'allowlist ; tout le reste (message, fields, team_name, URL…) est ignoré. */
export function official403Code(text: string | null): typeof NOLIO_403_CODES[number] | null {
  let j: unknown;
  try { j = JSON.parse(text ?? ""); } catch { return null; }
  if (!isObj(j) || !isObj(j.error)) return null;
  const c = j.error.code;
  return typeof c === "string" && (NOLIO_403_CODES as readonly string[]).includes(c) ? c as typeof NOLIO_403_CODES[number] : null;
}
export type DryRunCode = typeof DRY_RUN_CODES[number];

export const DRY_RUN_FIXTURE_PREVIEW = {
  code: DRY_RUN_FIXTURE_CODE, name: "QA technique — test dry_run (non prescriptif)", sport: "run", durationMin: 10,
  note: "Séance technique non prescriptive : aucune allure, FTP ou CSS ; cible « no_target ». Simulation : rien n'est ajouté au calendrier.",
} as const;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const SPT = /^spt_[A-Za-z0-9]+$/, USR = /^usr_[A-Za-z0-9]+$/, YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Corps fixe. `dry_run: true` est posé en DERNIER : aucune valeur antérieure ne peut l'écraser. */
export function buildDryRunBody(a: { fixtureCode: unknown; runSportId: unknown; athleteRef: unknown; date: unknown }):
  { ok: true; body: Record<string, unknown> } | { ok: false; reason: string } {
  if (a.fixtureCode !== DRY_RUN_FIXTURE_CODE) return { ok: false, reason: "fixture_unknown" };
  if (typeof a.runSportId !== "string" || !SPT.test(a.runSportId)) return { ok: false, reason: "run_sport_unconfirmed" };
  if (typeof a.athleteRef !== "string" || !USR.test(a.athleteRef)) return { ok: false, reason: "athlete_ref_invalid" };
  if (typeof a.date !== "string" || !YMD.test(a.date)) return { ok: false, reason: "date_invalid" };
  const base: Record<string, unknown> = {
    name: DRY_RUN_FIXTURE_PREVIEW.name,
    date_start: a.date,
    sport: a.runSportId,
    athletes: [a.athleteRef],
    description: "Test technique TFCLab QA (dry_run). Non prescriptif.",
    duration: { value: 600, unit: "s" },
    workout: [{ kind: "step", duration: { value: 600, unit: "s" }, targets: [{ type: "no_target" }] }],
  };
  return { ok: true, body: { ...base, dry_run: true } };
}

export function forceDryRun(body: Record<string, unknown>): Record<string, unknown> {
  return { ...body, dry_run: true };
}

/** Classement strict de la réponse (aucun contenu brut conservé). */
export function classifyDryRunResponse(status: number, text: string | null): { outcome: DryRunOutcome; code: DryRunCode } {
  if (!Number.isInteger(status) || status < 100) return { outcome: "UNKNOWN", code: "local_guard_refused" };
  if (status === 400) return { outcome: "REFUSED", code: "validation_rejected_400" };
  if (status === 401) return { outcome: "REFUSED", code: "auth_rejected_401" };
  if (status === 403) return { outcome: "REFUSED", code: official403Code(text) ?? "forbidden_403" };
  if (status === 429) return { outcome: "REFUSED", code: "rate_limited_429" };
  if (status < 200 || status >= 300) return { outcome: "UNKNOWN", code: "http_other" };
  let j: unknown;
  try { j = JSON.parse(text ?? ""); } catch { return { outcome: "UNKNOWN", code: "body_not_json" }; }
  if (isObj(j) && "id" in j) return { outcome: "UNKNOWN", code: "unexpected_created_resource" };
  if (!isObj(j)) return { outcome: "UNKNOWN", code: "success_shape_invalid" };
  const keys = Object.keys(j).sort().join(",");
  if (keys !== "dry_run,is_valid,summary" || j.dry_run !== true || j.is_valid !== true || typeof j.summary !== "string")
    return { outcome: "UNKNOWN", code: "success_shape_invalid" };
  return { outcome: "DRY_RUN_VALID", code: "dry_run_valid" };
}

export type DryFetch = (url: string, init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal; redirect: "error" }) =>
  Promise<{ status: number; text(): Promise<string> }>;

/** Transport dédié : URL fixe, redirect error, budget total fetch+corps, aucun retry. */
export async function postDryRun(a: { fetch: DryFetch; accessToken: string; body: Record<string, unknown>; budgetMs?: number }):
  Promise<{ outcome: DryRunOutcome; code: DryRunCode; httpStatus: number | null }> {
  if (!isObj(a.body) || a.body.dry_run !== true) return { outcome: "UNKNOWN", code: "local_guard_refused", httpStatus: null };
  if (!a.accessToken) return { outcome: "UNKNOWN", code: "local_guard_refused", httpStatus: null };
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((r) => { timer = setTimeout(() => { ctl.abort(); r("timeout"); }, a.budgetMs ?? DRY_RUN_SERVER_BUDGET_MS); });
  try {
    const run = (async () => {
      const r = await a.fetch(DRY_RUN_URL, {
        method: "POST", redirect: "error", signal: ctl.signal,
        headers: { Authorization: `Bearer ${a.accessToken}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(forceDryRun(a.body)),
      });
      let text: string | null = null;
      try { text = await r.text(); } catch { return { status: r.status, text: null, lost: true }; }
      return { status: r.status, text, lost: false };
    })();
    const res = await Promise.race([run, deadline]);
    if (res === "timeout") return { outcome: "UNKNOWN", code: "timeout_or_lost", httpStatus: null };
    if (res.lost) return { outcome: "UNKNOWN", code: "timeout_or_lost", httpStatus: res.status };
    return { ...classifyDryRunResponse(res.status, res.text), httpStatus: res.status };
  } catch (e) {
    return { outcome: "UNKNOWN", code: (e as Error)?.name === "AbortError" ? "timeout_or_lost" : "network_error", httpStatus: null };
  } finally { clearTimeout(timer); }
}

export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Clés triées : empreinte stable du corps envoyé (stockée ; le corps lui-même ne l'est pas). */
export function canonical(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonical).join(",")}]`;
  if (isObj(x)) return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canonical(x[k])}`).join(",")}}`;
  return JSON.stringify(x);
}
