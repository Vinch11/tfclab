/**
 * Vue client de la simulation dry_run d'un plan complet. Le verdict « plan entièrement
 * validé par Nolio en simulation » n'est affiché QUE si la relecture RLS du job et des
 * reçus confirme, indépendamment du serveur :
 * - manifeste complet (index 0..n-1, séance, date, kind/path fermés, empreinte du corps)
 *   dont l'empreinte recalculée = ops_sha256 du job relu ; plan/refs = job relu ;
 * - dénominateur intégral recompté depuis les lignes (0 refus, repos, opérations = manifeste) ;
 * - pour CHAQUE opération, exactement un reçu DRY_RUN_VALID du même job/coach, même séance,
 *   même date, même empreinte de corps, http non NULL 2xx, code dry_run_valid.
 * Une valeur NULL ou absente ne satisfait jamais un fait positif ; un reçu d'un autre corps,
 * une permutation, un doublon ou un refus masqué ⇒ non confirmé.
 */
import { opsDigest, type ManifestEntry } from "../../../supabase/functions/_shared/nolioV2/planDryRun";
import { DRY_RUN_PATHS, type DryRunKind } from "../../../supabase/functions/_shared/nolioV2/dryRun";

export type CoverageRowView = { sessionKey: string; date: string | null; sport: string; title: string; status: "operation" | "excluded_rest" | "refused"; reason: string | null; opIndex: number | null };
export type PrecheckView = {
  totalSessions: number; operations: number; excludedRest: number; refused: number; complete: boolean; weeks: number;
  firstDate: string | null; lastDate: string | null; sports: string[]; competition: string; missingExercises: string[]; missingSports: string[];
  planProblems: string[]; rows: CoverageRowView[];
  raceSource: { date: string; name: string; sport: string; goalType: null } | null;
  opsByKind?: { training: number; competition: number };
};
export type ProgressView = { jobId: string; totalOps: number; valid: number; refused: number; unknown: number; pending: number; stoppedOn: string | null; processedThisBatch: number; fullyValidated: boolean };
export type PlanDryResp = {
  status: string; code: string; precheck: PrecheckView | null; progress: ProgressView | null;
  planSha256: string | null; refsSha256: string | null; opsSha256: string | null; manifest: ManifestEntry[] | null;
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const int = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^[0-9a-f]{64}$/, YMD = /^\d{4}-\d{2}-\d{2}$/, KEY = /^S[0-9]+-J[0-6]-[0-9]+(?:~(?:bike|run))?$/;
const hexOrNull = (x: unknown) => (typeof x === "string" && HEX.test(x) ? x : null);

function parseManifest(x: unknown): ManifestEntry[] | null {
  if (!Array.isArray(x)) return null;
  const out: ManifestEntry[] = [];
  for (const e of x) {
    if (!isObj(e) || !int(e.opIndex) || typeof e.sessionKey !== "string" || !KEY.test(e.sessionKey) || typeof e.date !== "string" || !YMD.test(e.date)
      || (e.kind !== "training" && e.kind !== "competition") || e.path !== DRY_RUN_PATHS[e.kind as DryRunKind] || typeof e.bodySha256 !== "string" || !HEX.test(e.bodySha256)) return null;
    out.push({ opIndex: e.opIndex, sessionKey: e.sessionKey, date: e.date, kind: e.kind as DryRunKind, path: e.path as string, bodySha256: e.bodySha256 });
  }
  return out;
}

export function parsePlanDryResp(x: unknown): PlanDryResp | null {
  if (!isObj(x) || typeof x.status !== "string" || typeof x.code !== "string") return null;
  let precheck: PrecheckView | null = null;
  if (x.precheck != null) {
    const p = x.precheck;
    if (!isObj(p) || !int(p.totalSessions) || !int(p.operations) || !int(p.excludedRest) || !int(p.refused) || typeof p.complete !== "boolean" || !Array.isArray(p.rows)) return null;
    if (p.operations + p.excludedRest + p.refused !== p.totalSessions || p.rows.length !== p.totalSessions) return null; // dénominateur intégral
    precheck = { ...(p as unknown as PrecheckView), raceSource: (p.raceSource ?? null) as PrecheckView["raceSource"] };
  }
  let progress: ProgressView | null = null;
  if (x.progress != null) {
    const g = x.progress;
    if (!isObj(g) || typeof g.jobId !== "string" || !UUID.test(g.jobId) || !int(g.totalOps) || !int(g.valid) || g.fullyValidated !== true && g.fullyValidated !== false) return null;
    progress = { ...(g as unknown as ProgressView), processedThisBatch: int(g.processedThisBatch) ? g.processedThisBatch : 0 };
  }
  const manifest = x.manifest == null ? null : parseManifest(x.manifest);
  if (x.manifest != null && !manifest) return null;
  return { status: x.status, code: x.code, precheck, progress, planSha256: hexOrNull(x.planSha256), refsSha256: hexOrNull(x.refsSha256), opsSha256: hexOrNull(x.opsSha256), manifest };
}

export const PLAN_DRY_JOB_COLS = "id,coach_id,plan_version_id,plan_sha256,refs_sha256,ops_sha256,total_ops,total_sessions";
export const PLAN_DRY_RECEIPT_COLS = "job_id,coach_id,op_index,session_key,session_date,body_sha256,outcome,code,http_status";

type Confirm = { confirmed: boolean; validRead: number; reason: string };
const no = (reason: string, validRead = 0): Confirm => ({ confirmed: false, validRead, reason });

/** Relecture RLS concordante (job + chaque reçu) contre le manifeste et ses empreintes. */
export async function confirmFullPlanDryRun(a: {
  planVersionId: string; coachId: string; resp: PlanDryResp; job: unknown; receipts: unknown[] | null; localPlanSha256?: string | null;
}): Promise<Confirm> {
  const g = a.resp.progress, pc = a.resp.precheck, m = a.resp.manifest;
  if (!g || !pc || !pc.complete) return no("precheck_incomplete");
  if (!m || !a.resp.planSha256 || !a.resp.refsSha256 || !a.resp.opsSha256) return no("manifest_absent");
  // Dénominateur recompté indépendamment depuis les lignes.
  const ops = pc.rows.filter((r) => r.status === "operation"), rest = pc.rows.filter((r) => r.status === "excluded_rest");
  if (pc.rows.some((r) => r.status === "refused") || pc.refused !== 0) return no("refusal_present");
  if (pc.rows.length !== pc.totalSessions || ops.length + rest.length !== pc.totalSessions || rest.length !== pc.excludedRest || ops.length !== pc.operations) return no("denominator_mismatch");
  if (m.length !== ops.length || m.length !== g.totalOps || m.length === 0) return no("manifest_incomplete");
  const keys = new Set<string>();
  for (let i = 0; i < m.length; i++) {
    if (m[i].opIndex !== i || keys.has(m[i].sessionKey)) return no("manifest_order_or_duplicate");
    keys.add(m[i].sessionKey);
  }
  for (const r of ops) {
    const e = r.opIndex === null || !int(r.opIndex) ? undefined : m[r.opIndex];
    if (!e || e.sessionKey !== r.sessionKey || e.date !== r.date) return no("row_manifest_mismatch");
  }
  if ((await opsDigest(m)) !== a.resp.opsSha256) return no("manifest_digest_mismatch");
  if (a.localPlanSha256 !== undefined && a.localPlanSha256 !== a.resp.planSha256) return no("plan_digest_differs_from_local_plan");
  const j = a.job;
  if (!isObj(j) || j.id !== g.jobId || j.coach_id !== a.coachId || j.plan_version_id !== a.planVersionId || j.total_ops !== m.length || j.total_sessions !== pc.totalSessions
    || j.plan_sha256 !== a.resp.planSha256 || j.refs_sha256 !== a.resp.refsSha256 || j.ops_sha256 !== a.resp.opsSha256) return no("job_readback_mismatch");
  if (!Array.isArray(a.receipts)) return no("receipts_unreadable");
  const valid = new Map<number, number>();
  for (const r of a.receipts) {
    if (!isObj(r) || r.job_id !== j.id || r.coach_id !== a.coachId || !int(r.op_index)) return no("receipt_foreign_or_malformed");
    const e = m[r.op_index as number];
    if (!e) return no("receipt_outside_manifest");
    const sameOp = r.session_key === e.sessionKey && r.session_date === e.date && r.body_sha256 === e.bodySha256;
    if (r.outcome === "DRY_RUN_VALID") {
      if (!sameOp) return no("receipt_body_or_session_mismatch");
      if (r.code !== "dry_run_valid" || typeof r.http_status !== "number" || !Number.isInteger(r.http_status) || r.http_status < 200 || r.http_status > 299) return no("receipt_positive_fact_missing");
      valid.set(r.op_index as number, (valid.get(r.op_index as number) ?? 0) + 1);
    } else if (r.outcome === "UNKNOWN") return no("unknown_receipt_present");
    else if (r.outcome === "REFUSED") { if (r.code !== "rate_limited_429") return no("refused_receipt_present"); }
    else return no("receipt_outcome_unknown");
  }
  for (const [, n] of valid) if (n !== 1) return no("duplicate_valid_receipt", valid.size);
  const confirmed = g.fullyValidated === true && valid.size === m.length && m.every((e) => valid.get(e.opIndex) === 1);
  return { confirmed, validRead: valid.size, reason: confirmed ? "ok" : "not_all_ops_valid" };
}

// ---------------- Exécution séquentielle bornée (aucun réseau ici) ----------------
export const PLAN_DRY_SEQ_TOTAL_MS = 240_000;
export const PLAN_DRY_SEQ_CALL_MS = 45_000;
export const PLAN_DRY_SEQ_PAUSE_MS = 2_000;
const CONTINUE_ON = new Set(["batch_limit", "batch_budget"]);

/**
 * Enchaîne des lots serveur (chacun borné) jusqu'à : couverture complète, arrêt coach, budget
 * total, identité/plan changés, ou toute issue inhabituelle (BUSY/BLOCKED, 429, 401/403,
 * inconnu, refus, aucun progrès). Aucune relance automatique d'un lot échoué ou inconnu.
 * Garde AVANT et APRÈS chaque await ; une réponse tardive n'est jamais publiée.
 */
export async function runPlanDrySequence(a: {
  runBatch: () => Promise<PlanDryResp | null>;
  isCurrent: () => boolean; stopRequested: () => boolean; now: () => number; sleep: (ms: number) => Promise<void>;
  onProgress: (r: PlanDryResp) => void;
  totalBudgetMs?: number; callBudgetMs?: number; pauseMs?: number; maxCalls?: number;
}): Promise<{ stop: string; last: PlanDryResp | null; calls: number }> {
  const t0 = a.now(), total = a.totalBudgetMs ?? PLAN_DRY_SEQ_TOTAL_MS, call = a.callBudgetMs ?? PLAN_DRY_SEQ_CALL_MS;
  const max = a.maxCalls ?? 60;
  let last: PlanDryResp | null = null, calls = 0;
  for (;;) {
    if (!a.isCurrent()) return { stop: "stale", last, calls };
    if (a.stopRequested()) return { stop: "stopped_by_coach", last, calls };
    if (calls >= max) return { stop: "max_calls", last, calls };
    if (a.now() - t0 + call > total) return { stop: "total_budget", last, calls };
    calls++;
    const r = await a.runBatch();
    if (!a.isCurrent()) return { stop: "stale", last, calls };
    if (!r) return { stop: "unknown_response", last, calls };
    last = r; a.onProgress(r);
    if (r.status !== "PROGRESS" || !r.progress) return { stop: r.code || "not_progress", last, calls };
    const g = r.progress;
    if (g.fullyValidated) return { stop: "complete", last, calls };
    if (g.unknown > 0) return { stop: "unknown_present_no_retry", last, calls };
    if (g.refused > 0) return { stop: "refused_present", last, calls };
    if (g.stoppedOn && !CONTINUE_ON.has(g.stoppedOn)) return { stop: g.stoppedOn, last, calls };
    if (g.processedThisBatch <= 0) return { stop: "no_progress", last, calls };
    if (a.stopRequested()) return { stop: "stopped_by_coach", last, calls };
    await a.sleep(a.pauseMs ?? PLAN_DRY_SEQ_PAUSE_MS);
  }
}

export const REASON_FR: Record<string, string> = {
  coach_plan_provenance_invalid: "origine du plan indisponible : régénérez-le depuis la fiche de l’athlète",
  coach_plan_profile_binding_invalid: "le plan ne correspond plus au profil sauvegardé",
  coach_plan_sporting_violation: "une incohérence sportive du plan doit être corrigée",
  coach_plan_blocking_issue: "une incohérence bloquante du plan doit être corrigée",
  coach_plan_native_sources_missing: "les prescriptions détaillées sont absentes de cette ancienne version du plan",
  coach_plan_native_prescription_changed: "la prescription affichée diffère de ses blocs sauvegardés : corrigez le plan avant l’export",
  response_lost: "réponse Nolio non reçue ; présence des activités à vérifier",
  unconfirmed_response: "réponse Nolio non confirmée ; présence des activités à vérifier",
  rate_limited: "quota Nolio atteint ; reprendre après vérification",
  no_retry_after_429: "quota Nolio atteint ; aucune nouvelle tentative automatique",
  no_authorized_v2_connection: "connexion Nolio de l’athlète à vérifier",
  brick_run_date_requires_transition: "le vélo traverse minuit : la date de la course doit être précisée",

  sport_reference_missing: "sport Nolio non associé : vérifiez les correspondances de la connexion",
  athlete_reference_not_opaque: "connexion Nolio de l’athlète invalide",
  exercise_reference_missing: "exercice Nolio non confirmé (renforcement)",
  competition_identity_unconfirmed: "course objectif : compétition non confirmée par le coach sur la connexion active",
  competition_date_mismatch: "course objectif : date confirmée différente de la séance source",
  competition_name_mismatch: "course objectif : nom confirmé différent de la séance source",
  competition_sport_mismatch: "course objectif : sport confirmé différent de la séance source",
  competition_priority_mismatch: "course objectif : priorité absente de la source (ne pas l'ajouter)",
  repos_sans_contenu: "repos : rien à envoyer",
};
export const reasonFr = (r: string | null) => (r ? REASON_FR[r.split(":")[0]] ?? r : "");

export const STOP_FR: Record<string, string> = {
  complete: "couverture intégrale atteinte", stopped_by_coach: "arrêt demandé par le coach (reprise possible, même job)",
  total_budget: "budget total de la séquence atteint (reprise possible)", stale: "identité ou plan changé : séquence abandonnée",
  unknown_response: "réponse absente ou invalide : arrêt, aucune relance", rate_limited_429: "quota Nolio (429) : arrêt, reprendre plus tard",
  quota_low_stop: "quota horaire Nolio bas : arrêt prudent", unknown_present_no_retry: "résultat inconnu présent : jamais relancé, décision humaine",
  refused_present: "refus Nolio présent : arrêt", batch_in_progress: "un autre lot tourne déjà (verrou) : arrêt", no_progress: "aucun progrès : arrêt",
  max_calls: "nombre maximal de lots atteint",
};
export const stopFr = (s: string) => STOP_FR[s] ?? `arrêt : ${s}`;
