/**
 * Export d'un plan sauvegardé (IA ou DET) vers le calendrier Nolio V2.
 *
 * - Préparation (sans réseau) : plan DET (provenance det/app-profile) → chemin
 *   éprouvé `preparePlan` (structure DET bloc par bloc, bricks en deux activités
 *   liées, courses déclarées) ; plan IA → `mapAiSessionsToNolioV2`.
 *   Chaque séance reçoit un statut : opération, repos exclu ou refus motivé.
 * - Envoi par lots bornés : chaque nouvelle opération est d'abord validée par
 *   Nolio en simulation (`dry_run`), puis créée via `sendPlannedV2` (journal
 *   durable : réservation avant POST, jamais de second POST pour une opération
 *   incertaine, opérations confirmées jamais renvoyées).
 */
import { bodyToSend, operationKey } from "./marker.ts";
import { sessionsFromPlanJson } from "./planSessions.ts";
import { preparePlan } from "./planDryRun.ts";
import { mapAiSessionsToNolioV2 } from "./aiTextMapper.ts";
import { postDryRun, type DryFetch } from "./dryRun.ts";
import { sendPlannedV2, type NolioV2Connection, type NolioV2Http, type NolioV2Ledger, type SendReport } from "./plannedClient.ts";
import type { NolioV2Refs, V2Operation } from "./plannedMapper.ts";

export type ExportRow = { sessionKey: string; date: string | null; sport: string; title: string; status: "operation" | "excluded_rest" | "refused"; reason: string | null };
export type ExportOp = { sessionKey: string; date: string; kind: "training" | "competition"; source: V2Operation; body: Record<string, unknown>; opKey: string };
export type PreparedExport = { engine: "det" | "ai"; rows: ExportRow[]; ops: ExportOp[]; problems: string[] };

export function planEngine(planJson: unknown): "det" | "ai" {
  const p = (planJson as { _provenance?: { engine?: string; mode?: string; syntheticFixture?: boolean } } | null)?._provenance;
  return p?.engine === "det" && p.mode === "app-profile" && p.syntheticFixture === false ? "det" : "ai";
}

export async function prepareExport(planJson: unknown, refs: NolioV2Refs, planVersionId: string): Promise<PreparedExport> {
  const engine = planEngine(planJson);
  if (engine === "det") {
    const p = await preparePlan(planJson, refs, planVersionId);
    const ops: ExportOp[] = [];
    for (const o of p.ops) ops.push({ sessionKey: o.sessionKey, date: o.date, kind: o.kind, source: o.source, body: o.body, opKey: (await operationKey(planVersionId, o.source)).opKey });
    return { engine, rows: p.precheck.rows.map(({ opIndex: _ignored, ...r }) => r), ops, problems: p.precheck.planProblems };
  }
  const extraction = sessionsFromPlanJson(planJson);
  if (extraction.problems.length && !extraction.sessions.length) return { engine, rows: [], ops: [], problems: extraction.problems };
  const mapped = mapAiSessionsToNolioV2(extraction.sessions, refs);
  const refusedBy = new Map(mapped.refusals.map((r) => [r.sessionKey, r.reason]));
  const byKey = new Map(mapped.operations.map((o) => [o.sessionKey, o]));
  const rows: ExportRow[] = [];
  const ops: ExportOp[] = [];
  for (const s of extraction.sessions) {
    const base = { sessionKey: s.sessionKey, date: s.date ?? null, sport: s.sport, title: s.title };
    if (s.isRest) { rows.push({ ...base, status: "excluded_rest", reason: "repos_sans_contenu" }); continue; }
    const op = byKey.get(s.sessionKey);
    if (!op) { rows.push({ ...base, status: "refused", reason: refusedBy.get(s.sessionKey) ?? refusedBy.get("*") ?? "not_mapped" }); continue; }
    rows.push({ ...base, status: "operation", reason: null });
    ops.push({ sessionKey: op.sessionKey, date: String(op.body.date_start), kind: op.kind, source: op, body: await bodyToSend(planVersionId, op), opKey: (await operationKey(planVersionId, op)).opKey });
  }
  return { engine, rows, ops, problems: [...extraction.problems, ...(refusedBy.has("*") ? [`global:${refusedBy.get("*")}`] : [])] };
}

export type BatchResult = {
  status: "DONE" | "PROGRESS" | "STOPPED";
  reason: string | null;
  confirmed: number; total: number; createdThisBatch: number;
  failedSession: { sessionKey: string; title: string; date: string; code: string; fields: string[] } | null;
};

/**
 * Un lot : opérations encore non confirmées, simulation Nolio puis création.
 * `confirmedKeys` = opKeys déjà confirmés dans le journal (lus par l'appelant).
 */
export async function sendExportBatch(a: {
  prepared: PreparedExport; planVersionId: string; refs: NolioV2Refs; connection: NolioV2Connection;
  http: NolioV2Http; ledger: NolioV2Ledger; dryFetch: DryFetch; accessToken: string;
  confirmedKeys: Set<string>; batchSize: number; deadline: number;
}): Promise<BatchResult> {
  const total = a.prepared.ops.length;
  const pending = a.prepared.ops.filter((o) => !a.confirmedKeys.has(o.opKey));
  const already = total - pending.length;
  const result = (status: BatchResult["status"], reason: string | null, created: number, failed: BatchResult["failedSession"] = null): BatchResult =>
    ({ status, reason, confirmed: already + created, total, createdThisBatch: created, failedSession: failed });
  if (!pending.length) return result("DONE", null, 0);
  const batch = pending.slice(0, a.batchSize);
  // 1) Simulation Nolio de chaque opération du lot AVANT toute création.
  for (const o of batch) {
    if (Date.now() > a.deadline - 15_000) return result("PROGRESS", "time_budget", 0);
    const dry = await postDryRun({ fetch: a.dryFetch, accessToken: a.accessToken, body: { ...o.body, dry_run: true }, kind: o.kind });
    if (dry.outcome !== "DRY_RUN_VALID") {
      const fields = (dry.validationIssues ?? []).map((i) => i.field).filter(Boolean).slice(0, 5);
      const row = a.prepared.rows.find((r) => r.sessionKey === o.sessionKey);
      return result("STOPPED", `nolio_refused_simulation:${dry.code}`, 0, { sessionKey: o.sessionKey, title: row?.title ?? "", date: o.date, code: dry.code, fields });
    }
  }
  // 2) Création (journal durable, lot borné).
  const report: SendReport = await sendPlannedV2({
    connection: a.connection, refs: a.refs, planVersionId: a.planVersionId,
    operations: batch.map((o) => o.source), ledger: a.ledger, http: a.http,
    maxNewPosts: batch.length, stopOnRejected: true,
  });
  const created = report.results.filter((r) => r.state === "confirmed").length;
  if (report.status === "DONE" || report.status === "STOPPED_BATCH_LIMIT") {
    return result(already + created >= total ? "DONE" : "PROGRESS", null, created);
  }
  const last = report.results.at(-1);
  const row = last ? a.prepared.rows.find((r) => r.sessionKey === last.sessionKey) : undefined;
  return result("STOPPED", `${report.status}:${report.reason ?? ""}`, created,
    last && row ? { sessionKey: last.sessionKey, title: row.title, date: row.date ?? "", code: String(last.state), fields: [] } : null);
}

// ---------------- Relecture du calendrier Nolio ----------------
export type LedgerRow = { op_key: string; session_key: string; path: string; state: string; remote_id: string | null };
export type VerifyResult = {
  checked: number; present: number;
  missing: Array<{ sessionKey: string; title: string; date: string | null }>;
  unknown: Array<{ sessionKey: string; title: string; date: string | null; detail: string }>;
  nextIndex: number | null; totalConfirmed: number;
};

/** Opérations confirmées du journal, restreintes aux opérations actuelles du plan, ordre stable. */
export function confirmedRowsForPlan(prepared: PreparedExport, rows: LedgerRow[]): LedgerRow[] {
  const keys = new Set(prepared.ops.map((o) => o.opKey));
  return rows.filter((r) => r.state === "confirmed" && r.remote_id && keys.has(r.op_key)).sort((a, b) => a.session_key.localeCompare(b.session_key, "en") || a.path.localeCompare(b.path, "en"));
}

/**
 * Relit dans Nolio chaque activité confirmée (détail par id). 404 = supprimée
 * dans Nolio ; toute autre lecture non concluante = inconnue (jamais « présente »).
 */
export async function verifyConfirmedBatch(a: {
  prepared: PreparedExport; confirmed: LedgerRow[]; http: NolioV2Http; athleteRef: string; fromIndex: number; deadline: number; maxReads?: number;
}): Promise<VerifyResult> {
  const out: VerifyResult = { checked: 0, present: 0, missing: [], unknown: [], nextIndex: null, totalConfirmed: a.confirmed.length };
  const rowOf = (key: string) => a.prepared.rows.find((r) => r.sessionKey === key.replace(/~(bike|run)$/, ""));
  const max = a.maxReads ?? 30;
  for (let i = Math.max(0, a.fromIndex); i < a.confirmed.length; i++) {
    if (out.checked >= max || Date.now() > a.deadline - 8_000) { out.nextIndex = i; break; }
    const r = a.confirmed[i];
    const info = { sessionKey: r.session_key, title: rowOf(r.session_key)?.title ?? r.session_key, date: rowOf(r.session_key)?.date ?? null };
    const d = await a.http.getDetail(r.path, r.remote_id!, a.athleteRef);
    out.checked++;
    if (d.ok === true) { out.present++; continue; }
    const detail = (d as { detail: string }).detail;
    if (detail === "http_404") out.missing.push(info);
    else out.unknown.push({ ...info, detail });
  }
  return out;
}
