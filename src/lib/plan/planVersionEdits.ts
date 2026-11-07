/**
 * Édition et restauration de versions de plan — voie commune de l'app.
 *
 * - Une version sauvegardée est IMMUABLE : renommer/éditer crée une NOUVELLE
 *   version via `AppendOnlyPlanVersionSaver` (identité = contenu). L'ancienne
 *   ligne, son contenu et sa provenance stockée restent intacts ; aucun
 *   nouvel horodatage d'origine n'est inventé (`_provenance` copiée telle quelle).
 * - Restaurer comme plan courant = deux écritures ordonnées :
 *   1. archive append-only de l'ancien courant (si différent) ;
 *   2. upsert `plans` (PK athlete_id) avec reçu exact, puis relecture.
 *   Aucune 2e écriture si l'archive n'est pas CONFIRMED. Tout état non
 *   confirmé est rapporté comme partiel/incertain, jamais comme succès.
 */
import {
  AppendOnlyPlanVersionSaver, READBACK_COLUMNS, canonicalJson,
  type PlanVersionPayload, type PlanVersionRow, type PlanVersionTransport, type SaveStatus,
} from "./appendOnlyPlanVersionSave";
import { PlanWriteUnconfirmedError, requirePlanWriteReceipt } from "./planWriteReceipt";

type Err = { code?: string; message?: string } | null;
// Client minimal (sous-ensemble du SDK) : le vrai client JWT de l'app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = { from(table: string): any };

export function supabasePlanVersionTransport(client: DbClient): PlanVersionTransport {
  return {
    insert: async (row) => {
      const { error } = await client.from("plan_versions").insert(row);
      return { error: error ? { code: error.code, message: error.message } : null };
    },
    readById: async (id) => {
      const { data, error } = await client.from("plan_versions").select(READBACK_COLUMNS).eq("id", id).maybeSingle();
      return { data: (data as PlanVersionRow | null) ?? null, error: error ? { code: error.code, message: error.message } : null };
    },
  };
}

/** Payload de la nouvelle version : tout copié de la ligne stockée, seul le libellé change. */
export function renamedVersionPayload(stored: PlanVersionRow, label: string | null): PlanVersionPayload {
  const pj = (stored.plan_json && typeof stored.plan_json === "object" ? stored.plan_json : {}) as Record<string, unknown>;
  const { id: _id, ...rest } = stored;
  return { ...rest, plan_json: { ...JSON.parse(JSON.stringify(pj)), _label: label } };
}

export async function saveRenamedVersion(saver: AppendOnlyPlanVersionSaver, stored: PlanVersionRow, label: string | null) {
  return saver.save(renamedVersionPayload(stored, label));
}

// ---------------- Restauration comme plan courant ----------------
export type CurrentRow = { athlete_id: string; coach_id: string; plan_json: unknown };
export interface CurrentPlanPorts {
  readCurrent(athleteId: string): Promise<{ data: CurrentRow | null; error: Err }>;
  /** upsert + select().single() : réponse brute passée au contrôle de reçu. */
  writeCurrent(row: CurrentRow & { updated_at: string }): PromiseLike<{ data: unknown; error: unknown }>;
}
export type RestoreStatus =
  | "CONFIRMED"              // courant relu = version restaurée
  | "ALREADY_CURRENT"        // rien à écrire
  | "NOT_STARTED"            // lecture initiale impossible : aucune écriture
  | "ARCHIVE_NOT_CONFIRMED"  // archive UNKNOWN/FAILED/BLOCKED : courant non touché
  | "PARTIAL_CURRENT_UNCHANGED" // archive OK, courant refusé ; ancien courant relu intact
  | "PARTIAL_CURRENT_UNKNOWN";  // archive OK, état du courant impossible à établir
export interface RestoreResult { status: RestoreStatus; archive: { status: SaveStatus | "SKIPPED"; id: string | null }; reason: string }

const same = (a: unknown, b: unknown) => { try { return canonicalJson(a) === canonicalJson(b); } catch { return false; } };

export async function restoreVersionAsCurrent(input: {
  ports: CurrentPlanPorts; saver: AppendOnlyPlanVersionSaver;
  coachId: string; athleteId: string; version: PlanVersionRow; now?: () => Date;
}): Promise<RestoreResult> {
  const { ports, coachId, athleteId, version } = input;
  if (version.athlete_id !== athleteId || version.coach_id !== coachId)
    return { status: "NOT_STARTED", archive: { status: "SKIPPED", id: null }, reason: "version_owner_mismatch" };
  let cur: CurrentRow | null;
  try {
    const r = await ports.readCurrent(athleteId);
    if (r.error) return { status: "NOT_STARTED", archive: { status: "SKIPPED", id: null }, reason: `read_current_failed:${r.error.code ?? "?"}` };
    cur = r.data;
  } catch { return { status: "NOT_STARTED", archive: { status: "SKIPPED", id: null }, reason: "read_current_lost" }; }
  if (cur && same(cur.plan_json, version.plan_json))
    return { status: "ALREADY_CURRENT", archive: { status: "SKIPPED", id: null }, reason: "same_content" };

  let archive: RestoreResult["archive"] = { status: "SKIPPED", id: null };
  if (cur) {
    const pj = cur.plan_json as { weeks?: Array<{ sessions?: unknown[] }>; totalWeeks?: number } | null;
    const a = await input.saver.save({
      athlete_id: athleteId, coach_id: coachId, plan_json: cur.plan_json,
      objective: "[ARCHIVE] plan courant avant restauration",
      weeks_count: Array.isArray(pj?.weeks) ? pj!.weeks!.length : null,
      sessions_count: Array.isArray(pj?.weeks) ? pj!.weeks!.reduce((n, w) => n + (w.sessions?.length ?? 0), 0) : null,
      validator_score: null, validator_grade: null, validator_summary: null,
    });
    archive = { status: a.status, id: a.attemptId };
    if (a.status !== "CONFIRMED") return { status: "ARCHIVE_NOT_CONFIRMED", archive, reason: a.reason };
  }

  const now = (input.now ?? (() => new Date()))().toISOString();
  try {
    await requirePlanWriteReceipt(ports.writeCurrent({ athlete_id: athleteId, coach_id: coachId, plan_json: version.plan_json, updated_at: now }),
      { operation: "current", athleteId, coachId, planJson: version.plan_json });
    return { status: "CONFIRMED", archive, reason: "receipt_exact" };
  } catch (e) {
    // Relecture : jamais de succès sans preuve.
    let rb: { data: CurrentRow | null; error: Err };
    try { rb = await ports.readCurrent(athleteId); } catch { return { status: "PARTIAL_CURRENT_UNKNOWN", archive, reason: "write_and_readback_lost" }; }
    if (rb.error) return { status: "PARTIAL_CURRENT_UNKNOWN", archive, reason: `readback_failed:${rb.error.code ?? "?"}` };
    if (rb.data && rb.data.coach_id === coachId && same(rb.data.plan_json, version.plan_json))
      return { status: "CONFIRMED", archive, reason: "readback_exact_after_lost_receipt" };
    const unchanged = cur ? !!rb.data && same(rb.data.plan_json, cur.plan_json) : rb.data === null;
    if (unchanged) return { status: "PARTIAL_CURRENT_UNCHANGED", archive, reason: e instanceof PlanWriteUnconfirmedError ? e.message : `write_refused:${(e as { code?: string })?.code ?? "?"}` };
    return { status: "PARTIAL_CURRENT_UNKNOWN", archive, reason: "current_differs_from_both" };
  }
}

export function supabaseCurrentPlanPorts(client: DbClient): CurrentPlanPorts {
  return {
    readCurrent: async (athleteId) => {
      const { data, error } = await client.from("plans").select("athlete_id,coach_id,plan_json").eq("athlete_id", athleteId).maybeSingle();
      return { data: (data as CurrentRow | null) ?? null, error: error ? { code: error.code, message: error.message } : null };
    },
    writeCurrent: (row) => client.from("plans").upsert([row], { onConflict: "athlete_id" }).select("athlete_id,coach_id,plan_json,updated_at").single(),
  };
}

export const RESTORE_MESSAGES: Record<RestoreStatus, string> = {
  CONFIRMED: "Version définie comme plan courant (relue et confirmée).",
  ALREADY_CURRENT: "Cette version est déjà le plan courant.",
  NOT_STARTED: "Plan courant illisible : rien n'a été modifié.",
  ARCHIVE_NOT_CONFIRMED: "Archivage de l'ancien plan courant non confirmé : le plan courant n'a pas été modifié.",
  PARTIAL_CURRENT_UNCHANGED: "Ancien plan archivé, mais la mise à jour du plan courant a échoué : l'ancien plan courant est conservé.",
  PARTIAL_CURRENT_UNKNOWN: "Ancien plan archivé ; état du plan courant incertain. Rechargez avant de réessayer.",
};
