/**
 * Magasin de connexions Nolio V2 (table `nolio_v2_connections`, service_role
 * seulement, aucune policy ; séparé de `nolio_tokens` V1).
 * Appelé UNIQUEMENT après getClaims + propriété plan/athlète vérifiées, avec
 * le coach authentifié ET l'athlète du plan. Magasin vide ⇒ BLOCKED avant
 * réseau. Toute valeur absente/périmée/hors contrat ⇒ BLOCKED (jamais de
 * défaut, jamais de jeton V1). Le jeton n'est jamais retourné dans un rapport.
 */
import type { NolioV2Connection } from "./plannedClient.ts";
import { NOLIO_V2_REQUIRED_SCOPES } from "./plannedClient.ts";
import type { NolioV2Refs } from "./plannedMapper.ts";

export type LoadedV2Connection = { connection: NolioV2Connection; refs: NolioV2Refs; accessToken: string };
export type LoadResult = { ok: true; value: LoadedV2Connection } | { ok: false; reason: string };

export type ConnectionStoreClient = {
  from(t: "nolio_v2_connections"): {
    select(cols: string): { eq(c: string, v: string): { eq(c: string, v: string): { eq(c: string, v: string): { limit(n: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> } } } };
  };
};

export const MIN_TOKEN_VALIDITY_MS = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Validation pure d'une ligne du magasin pour (coach, athlète) déjà vérifiés. */
export function validateV2ConnectionRow(row: unknown, ctx: { coachId: string; athleteId: string; now: number }): LoadResult {
  if (!isObj(row)) return { ok: false, reason: "connection_row_invalid" };
  if (row.coach_id !== ctx.coachId || row.athlete_id !== ctx.athleteId) return { ok: false, reason: "connection_binding_mismatch" };
  if (row.status !== "active") return { ok: false, reason: "connection_not_active" };
  if (row.api_version !== "v2") return { ok: false, reason: "connection_not_v2" };
  if (row.app_type !== "partner" && row.app_type !== "team") return { ok: false, reason: "app_type_must_be_partner_or_team" };
  if (typeof row.nolio_athlete_ref !== "string" || !/^usr_[A-Za-z0-9]+$/.test(row.nolio_athlete_ref)) return { ok: false, reason: "athlete_ref_invalid" };
  const scopes = row.granted_scopes;
  if (!Array.isArray(scopes) || !scopes.every((s) => typeof s === "string")) return { ok: false, reason: "scopes_invalid" };
  const missing = NOLIO_V2_REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  if (missing.length) return { ok: false, reason: `scopes_missing:${missing.join(",")}` };
  if (typeof row.access_token !== "string" || !row.access_token) return { ok: false, reason: "access_token_absent" };
  const exp = typeof row.token_expires_at === "string" ? Date.parse(row.token_expires_at) : NaN;
  if (!Number.isFinite(exp)) return { ok: false, reason: "token_expiry_unknown" };
  if (exp - ctx.now < MIN_TOKEN_VALIDITY_MS) return { ok: false, reason: "token_expired_or_expiring" };
  if (typeof row.consent_confirmed_at !== "string" || !Number.isFinite(Date.parse(row.consent_confirmed_at))) return { ok: false, reason: "consent_unconfirmed" };
  const r = row.refs;
  if (!isObj(r)) return { ok: false, reason: "refs_invalid" };
  const allowed = new Set(["sportIds", "exerciseIds", "competition", "calendarTimeZone"]);
  const extra = Object.keys(r).filter((k) => !allowed.has(k));
  if (extra.length) return { ok: false, reason: `refs_unknown_keys:${extra.join(",")}` }; // ex. synthetic/athleteId : jamais lus du magasin
  const mapOf = (x: unknown, re: RegExp) => isObj(x) && Object.values(x).every((v) => typeof v === "string" && re.test(v));
  if (!mapOf(r.sportIds, /^spt_[A-Za-z0-9]+$/) || Object.keys(r.sportIds as object).length === 0) return { ok: false, reason: "sport_ids_unconfirmed" };
  if (!mapOf(r.exerciseIds ?? {}, /^[a-z]+_[A-Za-z0-9]+$/)) return { ok: false, reason: "exercise_ids_invalid" };
  if (r.calendarTimeZone !== undefined && r.calendarTimeZone !== null && typeof r.calendarTimeZone !== "string") return { ok: false, reason: "calendar_timezone_invalid" };
  if (typeof r.calendarTimeZone === "string") { try { new Intl.DateTimeFormat("en", { timeZone: r.calendarTimeZone }); } catch { return { ok: false, reason: "calendar_timezone_invalid" }; } }
  const comp = r.competition ?? null;
  if (comp !== null && !(isObj(comp) && typeof comp.date === "string" && typeof comp.name === "string" && typeof comp.sport === "string")) return { ok: false, reason: "competition_ref_invalid" };
  return {
    ok: true,
    value: {
      connection: { apiVersion: "v2", mode: "real", grantedScopes: [...scopes] as string[] },
      refs: {
        synthetic: false, athleteId: row.nolio_athlete_ref,
        sportIds: { ...(r.sportIds as Record<string, string>) }, exerciseIds: { ...((r.exerciseIds ?? {}) as Record<string, string>) },
        competition: comp as NolioV2Refs["competition"], calendarTimeZone: (r.calendarTimeZone as string | null | undefined) ?? null,
      },
      accessToken: row.access_token,
    },
  };
}

/** Lecture du magasin (client service-role créé APRÈS getClaims + propriété). */
export async function loadAuthorizedV2Connection(admin: ConnectionStoreClient, ctx: { coachId: string; athleteId: string; now?: number }): Promise<LoadResult> {
  if (!UUID.test(ctx.coachId) || !UUID.test(ctx.athleteId)) return { ok: false, reason: "binding_invalid" };
  let res: { data: unknown[] | null; error: { message: string } | null };
  try {
    res = await admin.from("nolio_v2_connections").select("*").eq("coach_id", ctx.coachId).eq("athlete_id", ctx.athleteId).eq("status", "active").limit(2);
  } catch { return { ok: false, reason: "connection_store_unavailable" }; }
  if (res.error || !Array.isArray(res.data)) return { ok: false, reason: "connection_store_unavailable" };
  if (res.data.length === 0) return { ok: false, reason: "no_authorized_v2_connection" };
  if (res.data.length > 1) return { ok: false, reason: "connection_store_ambiguous" };
  return validateV2ConnectionRow(res.data[0], { coachId: ctx.coachId, athleteId: ctx.athleteId, now: ctx.now ?? Date.now() });
}

/**
 * Chargeur avec rafraîchissement paresseux : si la connexion active est liée à
 * un grant (`grant_id`) et que le jeton expire dans < 10 min, un SEUL
 * rafraîchissement sérialisé est tenté (RPC durable), puis relecture. Échec /
 * inconnu ⇒ jeton actuel si encore valide, sinon BLOCKED (jamais de nouvel essai).
 */
export async function loadV2ConnectionWithRefresh(
  admin: ConnectionStoreClient,
  ctx: { coachId: string; athleteId: string; now?: () => number },
  refresh: (grantId: string, generation: number, scopes: string[]) => Promise<{ status: string; reason: string }>,
  refreshBeforeMs = 10 * 60_000,
): Promise<LoadResult & { refresh?: string }> {
  const now = ctx.now ?? Date.now;
  if (!UUID.test(ctx.coachId) || !UUID.test(ctx.athleteId)) return { ok: false, reason: "binding_invalid" };
  const read = async () => {
    try {
      const r = await admin.from("nolio_v2_connections").select("*").eq("coach_id", ctx.coachId).eq("athlete_id", ctx.athleteId).eq("status", "active").limit(2);
      if (r.error || !Array.isArray(r.data)) return "error" as const;
      return r.data;
    } catch { return "error" as const; }
  };
  const rows = await read();
  if (rows === "error") return { ok: false, reason: "connection_store_unavailable" };
  if (rows.length === 0) return { ok: false, reason: "no_authorized_v2_connection" };
  if (rows.length > 1) return { ok: false, reason: "connection_store_ambiguous" };
  const row = rows[0] as Record<string, unknown>;
  const exp = typeof row.token_expires_at === "string" ? Date.parse(row.token_expires_at) : NaN;
  const first = validateV2ConnectionRow(row, { coachId: ctx.coachId, athleteId: ctx.athleteId, now: now() });
  const soon = !Number.isFinite(exp) || exp - now() < refreshBeforeMs;
  if (!soon || typeof row.grant_id !== "string" || typeof row.token_generation !== "number") return first;
  if (first.ok === false && first.reason !== "token_expired_or_expiring") return first;
  const out = await refresh(row.grant_id, row.token_generation, Array.isArray(row.granted_scopes) ? row.granted_scopes as string[] : []);
  // Fail closed: any non-confirmed refresh (IN_PROGRESS, SUPERSEDED, UNKNOWN,
  // NEEDS_RECONNECT, AMBIGUOUS, ...) blocks. The pre-refresh cached row is
  // never returned as success, even if its access token is still time-valid.
  if (out.status !== "REFRESHED") {
    const reason = out.status === "IN_PROGRESS"
      ? `token_refresh_in_progress_retry_later:${out.reason}`
      : `token_refresh_${String(out.status).toLowerCase()}:${out.reason}`;
    return { ok: false, reason, refresh: out.reason };
  }
  const again = await read();
  if (again === "error" || again.length !== 1) return { ok: false, reason: "connection_reload_failed_after_refresh" };
  return { ...validateV2ConnectionRow(again[0], { coachId: ctx.coachId, athleteId: ctx.athleteId, now: now() }), refresh: "refreshed" };
}
