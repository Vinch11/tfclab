/**
 * Rafraîchissement du jeton Nolio V2 (QA) — logique PURE, dépendances injectées.
 *
 * Source : guide officiel « migration v1 → v2 » §4.1 (SHA-256 7dcea57a…a48d,
 * relevé 2026-11-03) : jeton d'accès 24 h ; refresh token sans expiration,
 * TOURNÉ à chaque rafraîchissement, « sans période de grâce : sérialiser par
 * utilisateur ». Token URL `https://www.nolio.io/api/token/`, authentification
 * client `client_secret_post` acceptée. Seuls les champs OAuth2 standard sont lus.
 *
 * Sérialisation DURABLE (jamais un mutex mémoire) : RPC service-role
 * `nolio_v2_refresh_begin/commit/fail` (ligne du grant FOR UPDATE, état
 * `refreshing` + lock_id + bail, génération = fencing token).
 * - un grant par compte Nolio, sinon `account_ambiguous` (aucune fusion, pas de
 *   pool de jetons partagé) — vérifié au begin ET au commit ; limite assumée :
 *   plusieurs coachs/athlètes liés au même compte Nolio ne sont PAS pris en charge.
 * - bail expiré ⇒ `unknown` (le refresh token a PU tourner) : jamais un 2e essai.
 * - refus explicite (`invalid_grant`, 400/401) ⇒ `needs_reconnect`.
 * - réponse perdue / 5xx / 429 / corps hors contrat ⇒ `unknown`, aucun nouvel essai.
 * - commit refusé (reconnexion entre-temps = nouvelle génération) ⇒ `superseded`.
 * Aucune valeur de jeton n'est retournée par ce module ni journalisée.
 */
import { NOLIO_V2_REQUIRED_SCOPES } from "./plannedClient.ts";
import { TOKEN_URL, validateTokenResponse, type Fetch, type OAuthConfig } from "./oauth.ts";

export const REFRESH_LEASE_SECONDS = 30;
/** Rafraîchir quand il reste moins de 10 min (un envoi ne doit pas expirer en cours). */
export const REFRESH_BEFORE_MS = 10 * 60_000;

export type BeginResult = { ok: true; refreshToken: string; generation: number } | { ok: false; reason: string };
export type CommitResult = { ok: true; generation: number } | { ok: false; reason: string };
export interface RefreshStore {
  begin(grantId: string, expectedGeneration: number, lockId: string, leaseSeconds: number): Promise<BeginResult>;
  commit(grantId: string, lockId: string, generation: number, access: string, refresh: string, expiresAtIso: string, scopes: string[]): Promise<CommitResult>;
  fail(grantId: string, lockId: string, outcome: "needs_reconnect" | "unknown" | "released_not_sent"): Promise<boolean>;
}
export type RefreshStatus = "REFRESHED" | "BLOCKED" | "IN_PROGRESS" | "NEEDS_RECONNECT" | "UNKNOWN" | "SUPERSEDED" | "AMBIGUOUS";
export type RefreshOutcome = { status: RefreshStatus; reason: string; generation?: number };

export function needsRefresh(tokenExpiresAtIso: string, now: number): boolean {
  const exp = Date.parse(tokenExpiresAtIso);
  return !Number.isFinite(exp) || exp - now < REFRESH_BEFORE_MS;
}

export async function refreshGrantToken(a: {
  grantId: string; generation: number; currentScopes: string[];
  config: { ok: true; value: OAuthConfig } | { ok: false; reason: string };
  store: RefreshStore; fetch: Fetch; now: () => number; lockId?: string;
}): Promise<RefreshOutcome> {
  if (a.config.ok === false) return { status: "BLOCKED", reason: a.config.reason }; // aucune réservation, aucun réseau
  const lockId = a.lockId ?? crypto.randomUUID();
  let b: BeginResult;
  try { b = await a.store.begin(a.grantId, a.generation, lockId, REFRESH_LEASE_SECONDS); }
  catch { return { status: "BLOCKED", reason: "refresh_store_unavailable" }; }
  if (b.ok === false) {
    const map: Record<string, RefreshStatus> = {
      refresh_in_progress: "IN_PROGRESS", refresh_unknown: "UNKNOWN", needs_reconnect: "NEEDS_RECONNECT",
      stale_generation: "SUPERSEDED", account_ambiguous: "AMBIGUOUS",
    };
    return { status: map[b.reason] ?? "BLOCKED", reason: b.reason };
  }
  const markFail = async (o: "needs_reconnect" | "unknown") => { try { await a.store.fail(a.grantId, lockId, o); } catch { /* reste refreshing ⇒ bail ⇒ unknown */ } };

  // Une seule requête sortante. Toute issue non prouvée ⇒ unknown, jamais de nouvel essai.
  let status: number, body: unknown;
  try {
    const r = await a.fetch(TOKEN_URL, {
      method: "POST", redirect: "error",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: b.refreshToken, client_id: a.config.value.clientId, client_secret: a.config.value.clientSecret }).toString(),
    });
    status = r.status;
    body = await r.json().catch(() => undefined);
  } catch {
    await markFail("unknown");
    return { status: "UNKNOWN", reason: "refresh_response_lost" };
  }
  if (status === 400 || status === 401) {
    const err = body && typeof body === "object" ? (body as Record<string, unknown>).error : undefined;
    if (err === "invalid_grant" || err === "invalid_client" || status === 401) {
      await markFail("needs_reconnect");
      return { status: "NEEDS_RECONNECT", reason: `refresh_refused:${err === "invalid_client" ? "invalid_client" : "invalid_grant"}` };
    }
    await markFail("unknown");
    return { status: "UNKNOWN", reason: "refresh_400_unexplained" };
  }
  if (status !== 200) { await markFail("unknown"); return { status: "UNKNOWN", reason: `refresh_http_${status}` }; }
  const tok = validateTokenResponse(body, a.now());
  // Rotation obligatoire : un 200 sans nouveau refresh token est hors contrat (l'ancien est peut-être invalidé).
  if (tok.ok === false || !tok.refreshToken || tok.refreshToken.length < 8) { await markFail("unknown"); return { status: "UNKNOWN", reason: "refresh_response_invalid" }; }
  const scopes = tok.scopes ? tok.scopes.filter((s) => a.currentScopes.includes(s)) : [...a.currentScopes];
  if (NOLIO_V2_REQUIRED_SCOPES.some((s) => !scopes.includes(s))) { await markFail("needs_reconnect"); return { status: "NEEDS_RECONNECT", reason: "refresh_scopes_reduced" }; }
  let c: CommitResult;
  try { c = await a.store.commit(a.grantId, lockId, b.generation, tok.accessToken, tok.refreshToken, tok.expiresAt, scopes); }
  catch { return { status: "UNKNOWN", reason: "refresh_commit_unconfirmed" }; } // reste refreshing ⇒ bail ⇒ unknown
  if (c.ok === false && c.reason === "account_ambiguous") return { status: "AMBIGUOUS", reason: "refresh_commit_account_ambiguous" };
  if (c.ok === false) return c.reason === "fenced" ? { status: "SUPERSEDED", reason: "refresh_fenced_by_reconnect" } : { status: "UNKNOWN", reason: `refresh_commit_refused:${c.reason}` };
  return { status: "REFRESHED", reason: "ok", generation: c.generation };
}

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;
/** Store sur RPC service-role (client créé APRÈS getClaims + propriété, ou côté serveur seulement). */
export function supabaseRefreshStore(admin: Admin): RefreshStore {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await admin.rpc(fn, args);
    if (error || !data || typeof data !== "object") throw new Error("rpc_failed");
    return data as Record<string, unknown>;
  };
  return {
    async begin(grantId, gen, lockId, lease) {
      const d = await rpc("nolio_v2_refresh_begin", { p_grant_id: grantId, p_expected_generation: gen, p_lock_id: lockId, p_lease_seconds: lease });
      return d.ok === true && typeof d.refresh_token === "string" ? { ok: true, refreshToken: d.refresh_token, generation: Number(d.generation) } : { ok: false, reason: String(d.reason ?? "begin_refused") };
    },
    async commit(grantId, lockId, gen, access, refresh, exp, scopes) {
      const d = await rpc("nolio_v2_refresh_commit", { p_grant_id: grantId, p_lock_id: lockId, p_generation: gen, p_access: access, p_refresh: refresh, p_expires: exp, p_scopes: scopes });
      return d.ok === true ? { ok: true, generation: Number(d.generation) } : { ok: false, reason: String(d.reason ?? "commit_refused") };
    },
    async fail(grantId, lockId, outcome) {
      const d = await rpc("nolio_v2_refresh_fail", { p_grant_id: grantId, p_lock_id: lockId, p_outcome: outcome });
      return d.ok === true;
    },
  };
}
