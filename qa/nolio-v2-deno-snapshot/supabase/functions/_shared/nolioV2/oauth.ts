/**
 * Nolio V2 OAuth (QA uniquement) — logique PURE, dépendances injectées.
 *
 * Sources : docs/qa/nolio-v2/read-contract-2026-11-02.json (info.description,
 * securitySchemes.oauth2) + OpenAPI public courant (App, Me, MeAthleteList ;
 * SHA-256 64e5307d…b5a1 relevé le 2026-11-03). Endpoint de jeton non décrit
 * par un schéma : seuls les champs OAuth2 standard sont lus, le reste refusé.
 *
 * Garanties :
 * - state aléatoire 256 bits, seul son SHA-256 stocké ; lié coach+athlète,
 *   route de retour FIXE, vérificateur PKCE (S256) côté serveur, TTL 10 min,
 *   consommation unique atomique (via le store).
 * - redirections uniquement vers QA_RETURN_ORIGIN + QA_RETURN_PATH avec un code
 *   d'issue énuméré : jamais de code d'autorisation, jeton ni texte distant.
 * - jeton échangé côté serveur ; app type, scopes, me, athlètes gérés vérifiés
 *   AVANT tout stockage. Le résultat est un « grant » EN ATTENTE, jamais une
 *   connexion active : `nolio_v2_connections` n'est jamais écrite ici.
 * - configuration absente ⇒ BLOCKED explicite, aucun réseau.
 */
import { NOLIO_V2_REQUIRED_SCOPES } from "./plannedClient.ts";
import { parseStoredRefs, REFS_MAX_AGE_MS, validateActivationRefs, type RemoteRefs, type RemoteSport } from "./refs.ts";
import { canonicalJson } from "./plannedMapper.ts";
import { needsRefresh, type RefreshOutcome } from "./tokenRefresh.ts";

export const QA_BACKEND_REF = "lkjesdacgpolrwfxulbo";
export const QA_RETURN_ORIGIN = "https://id-preview--c3941303-40d2-447e-9b87-867d82727fd1.lovable.app";
export const QA_RETURN_PATH = "/__qa/pilot-review";
export const QA_COACHES: ReadonlySet<string> = new Set([
  "573e045a-bbea-4e37-a30f-33183b9fbe13", "6b4c1722-2105-4889-ab14-41bab798cdf7",
]);
export const NOLIO_BASE = "https://www.nolio.io";
export const AUTHORIZE_URL = `${NOLIO_BASE}/api/authorize/`;
export const TOKEN_URL = `${NOLIO_BASE}/api/token/`;
export const STATE_TTL_MS = 10 * 60_000; // = durée de vie documentée du code
export const DOCUMENTED_TOKEN_TTL_MS = 24 * 3600_000;
export const MAX_ATHLETE_PAGES = 20;
export const CALLBACK_FUNCTION = "nolio-v2-oauth-callback";

export const OUTCOMES = [
  "grant_pending_selection", "blocked_missing_config", "invalid_request", "state_invalid_or_replayed",
  "consent_denied", "token_exchange_failed", "token_response_invalid", "wrong_app_type", "scopes_missing",
  "me_invalid", "athletes_invalid", "remote_unreadable", "store_failed",
] as const;
export type Outcome = typeof OUTCOMES[number];

export type OAuthEnv = { clientId?: string; clientSecret?: string; supabaseUrl?: string };
export type OAuthConfig = { clientId: string; clientSecret: string; callbackUrl: string };

export function qaBackendOk(supabaseUrl: string | undefined): boolean {
  try { return !!supabaseUrl && new URL(supabaseUrl).hostname === `${QA_BACKEND_REF}.supabase.co`; } catch { return false; }
}
export function callbackUrlFor(supabaseUrl: string): string {
  return `https://${QA_BACKEND_REF}.supabase.co/functions/v1/${CALLBACK_FUNCTION}`;
}
export function loadConfig(env: OAuthEnv): { ok: true; value: OAuthConfig } | { ok: false; reason: string } {
  if (!qaBackendOk(env.supabaseUrl)) return { ok: false, reason: "backend_not_qa" };
  if (!env.clientId || !env.clientSecret) return { ok: false, reason: "missing_config:NOLIO_V2_CLIENT_ID/NOLIO_V2_CLIENT_SECRET" };
  return { ok: true, value: { clientId: env.clientId, clientSecret: env.clientSecret, callbackUrl: callbackUrlFor(env.supabaseUrl!) } };
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a); return b64url(a);
}
export async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}
export function returnLocation(o: Outcome): string {
  return `${QA_RETURN_ORIGIN}${QA_RETURN_PATH}?nolio_v2=${OUTCOMES.includes(o) ? o : "invalid_request"}`;
}

// ---------------- Store ----------------
export type StateRow = { state_digest: string; coach_id: string; athlete_id: string; return_path: string; pkce_verifier: string; expires_at: string };
export type AllowedAthlete = { id: string; name: string; has_api_access: boolean };
export type GrantRow = {
  id?: string; token_generation?: number; refresh_state?: "idle" | "refreshing" | "needs_reconnect" | "unknown";
  remote_refs?: unknown; remote_refs_loaded_at?: string | null;
  coach_id: string; athlete_id: string; status: "pending_athlete_selection" | "pending_refs" | "active"; api_version: "v2";
  app_type: "partner" | "team"; granted_scopes: string[]; nolio_user_ref: string; allowed_athletes: AllowedAthlete[];
  selected_athlete_ref: string | null; consent_confirmed_at: string | null;
  access_token: string; refresh_token: string | null; token_expires_at: string;
};
export interface OAuthStore {
  insertState(row: StateRow): Promise<boolean>;
  /** Atomique : consumed_at IS NULL AND expires_at > now, une seule fois. */
  consumeState(digest: string, nowIso: string): Promise<StateRow | null>;
  upsertGrant(row: GrantRow): Promise<boolean>;
  getGrant(coachId: string, athleteId: string): Promise<GrantRow | null | "error">;
  /** CAS : seulement si status=pending_athlete_selection. */
  selectAthlete(coachId: string, athleteId: string, ref: string, nowIso: string): Promise<boolean>;
  countActiveConnections(coachId: string, athleteId: string): Promise<number | null>;
  /** CAS génération ; refs téléchargées, jamais de fixture. */
  storeRemoteRefs?(grantId: string, generation: number, refs: unknown): Promise<boolean>;
  /** RPC atomique : copie le jeton depuis le grant, une seule connexion active. */
  activate?(grantId: string, coachId: string, athleteId: string, generation: number, refsDigest: string, refs: unknown): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Colonne `refs` SEULE de la connexion active (jamais le jeton). */
  getActiveConnectionRefs?(coachId: string, athleteId: string): Promise<unknown | null | "error">;
  /** RPC atomique : remplace UNIQUEMENT `refs` de la connexion active (CAS refs attendues + génération) ; jetons/consentement/association intacts. */
  updateActiveRefs?(grantId: string, coachId: string, athleteId: string, generation: number, refsDigest: string, expectedRefs: unknown, refs: unknown): Promise<{ ok: true } | { ok: false; reason: string }>;
}

// ---------------- Start ----------------
export async function startConnect(a: { coachId: string; athleteId: string; env: OAuthEnv; store: OAuthStore; now: number }):
  Promise<{ status: "REDIRECT"; authorizeUrl: string } | { status: "BLOCKED"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "BLOCKED", reason: "coach_not_qa" };
  const cfg = loadConfig(a.env);
  if (cfg.ok === false) return { status: "BLOCKED", reason: cfg.reason };
  const state = randomToken(32), verifier = randomToken(32);
  const ok = await a.store.insertState({
    state_digest: await sha256Hex(state), coach_id: a.coachId, athlete_id: a.athleteId, return_path: QA_RETURN_PATH,
    pkce_verifier: verifier, expires_at: new Date(a.now + STATE_TTL_MS).toISOString(),
  });
  if (!ok) return { status: "BLOCKED", reason: "state_store_failed" };
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.value.clientId);
  u.searchParams.set("redirect_uri", cfg.value.callbackUrl);
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", await pkceChallenge(verifier));
  u.searchParams.set("code_challenge_method", "S256");
  return { status: "REDIRECT", authorizeUrl: u.toString() };
}

// ---------------- Validateurs des réponses distantes ----------------
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export function validateTokenResponse(j: unknown, now: number):
  { ok: true; accessToken: string; refreshToken: string | null; expiresAt: string; scopes: string[] | null; expiryFromDocumentation: boolean } | { ok: false } {
  if (!isObj(j) || typeof j.access_token !== "string" || j.access_token.length < 8) return { ok: false };
  if (j.token_type !== undefined && (typeof j.token_type !== "string" || j.token_type.toLowerCase() !== "bearer")) return { ok: false };
  if (j.refresh_token !== undefined && j.refresh_token !== null && typeof j.refresh_token !== "string") return { ok: false };
  let ttl = DOCUMENTED_TOKEN_TTL_MS, fromDocs = true;
  if (j.expires_in !== undefined) {
    if (typeof j.expires_in !== "number" || !Number.isFinite(j.expires_in) || j.expires_in <= 60) return { ok: false };
    ttl = j.expires_in * 1000; fromDocs = false;
  }
  let scopes: string[] | null = null;
  if (j.scope !== undefined) { if (typeof j.scope !== "string") return { ok: false }; scopes = j.scope.split(/\s+/).filter(Boolean); }
  return { ok: true, accessToken: j.access_token, refreshToken: (j.refresh_token as string | undefined) ?? null, expiresAt: new Date(now + ttl).toISOString(), scopes, expiryFromDocumentation: fromDocs };
}
/** App : `multi_user` = partenaire, `team` = équipe ; `personal` refusé. */
export function validateApp(j: unknown): { ok: true; appType: "partner" | "team"; scopes: string[] } | { ok: false; reason: "wrong_app_type" | "token_response_invalid" } {
  if (!isObj(j) || !Array.isArray(j.scopes) || !j.scopes.every((s) => typeof s === "string")) return { ok: false, reason: "token_response_invalid" };
  if (j.type === "multi_user") return { ok: true, appType: "partner", scopes: j.scopes as string[] };
  if (j.type === "team") return { ok: true, appType: "team", scopes: j.scopes as string[] };
  return { ok: false, reason: "wrong_app_type" };
}
export function validateMe(j: unknown): string | null {
  return isObj(j) && typeof j.id === "string" && /^usr_[A-Za-z0-9]+$/.test(j.id) ? j.id : null;
}
export function validateAthletePage(j: unknown): { data: AllowedAthlete[]; hasMore: boolean } | null {
  if (!isObj(j) || !Array.isArray(j.data) || typeof j.has_more !== "boolean") return null;
  const out: AllowedAthlete[] = [];
  for (const a of j.data) {
    if (!isObj(a) || typeof a.id !== "string" || !/^usr_[A-Za-z0-9]+$/.test(a.id) || typeof a.name !== "string" || typeof a.has_api_access !== "boolean") return null;
    out.push({ id: a.id, name: a.name.slice(0, 120), has_api_access: a.has_api_access });
  }
  return { data: out, hasMore: j.has_more };
}

// ---------------- Callback ----------------
export type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; redirect: "error" }) => Promise<{ status: number; json(): Promise<unknown> }>;

export async function handleCallback(a: { query: URLSearchParams; env: OAuthEnv; store: OAuthStore; fetch: Fetch; now: number }): Promise<{ location: string; outcome: Outcome }> {
  const done = (o: Outcome) => ({ location: returnLocation(o), outcome: o });
  const state = a.query.get("state"), code = a.query.get("code"), err = a.query.get("error");
  if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return done("invalid_request");
  const st = await a.store.consumeState(await sha256Hex(state), new Date(a.now).toISOString());
  if (!st || st.return_path !== QA_RETURN_PATH || !QA_COACHES.has(st.coach_id)) return done("state_invalid_or_replayed");
  if (err) return done("consent_denied");
  if (!code || code.length > 2048) return done("invalid_request");
  const cfg = loadConfig(a.env);
  if (cfg.ok === false) return done("blocked_missing_config");

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: cfg.value.callbackUrl,
      client_id: cfg.value.clientId, client_secret: cfg.value.clientSecret, code_verifier: st.pkce_verifier,
    }).toString();
    const tr = await a.fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body, redirect: "error" });
    if (tr.status !== 200) return done("token_exchange_failed");
    const tok = validateTokenResponse(await tr.json().catch(() => null), a.now);
    if (tok.ok === false) return done("token_response_invalid");
    const get = async (path: string) => {
      const r = await a.fetch(`${NOLIO_BASE}${path}`, { method: "GET", headers: { Authorization: `Bearer ${tok.accessToken}`, Accept: "application/json" }, redirect: "error" });
      return r.status === 200 ? await r.json().catch(() => undefined) : undefined;
    };
    const app = validateApp(await get("/api/v2/app/"));
    if (app.ok === false) return done(app.reason);
    const effective = tok.scopes ? tok.scopes.filter((s) => app.scopes.includes(s)) : app.scopes;
    if (NOLIO_V2_REQUIRED_SCOPES.some((s) => !effective.includes(s))) return done("scopes_missing");
    const me = validateMe(await get("/api/v2/me/"));
    if (!me) return done("me_invalid");
    const athletes: AllowedAthlete[] = [];
    let after: string | null = null;
    for (let i = 0; ; i++) {
      if (i >= MAX_ATHLETE_PAGES) return done("athletes_invalid");
      const page = validateAthletePage(await get(`/api/v2/me/athletes/?limit=100${after ? `&starting_after=${encodeURIComponent(after)}` : ""}`));
      if (!page) return done("athletes_invalid");
      athletes.push(...page.data);
      if (!page.hasMore) break;
      if (!page.data.length) return done("athletes_invalid");
      after = page.data[page.data.length - 1].id;
    }
    const ok = await a.store.upsertGrant({
      coach_id: st.coach_id, athlete_id: st.athlete_id, status: "pending_athlete_selection", api_version: "v2",
      app_type: app.appType, granted_scopes: effective, nolio_user_ref: me, allowed_athletes: athletes,
      selected_athlete_ref: null, consent_confirmed_at: null,
      access_token: tok.accessToken, refresh_token: tok.refreshToken, token_expires_at: tok.expiresAt,
    });
    return done(ok ? "grant_pending_selection" : "store_failed");
  } catch {
    return done("remote_unreadable");
  }
}

// ---------------- Statut / sélection (après getClaims + propriété) ----------------
export type Stages = {
  configured: boolean; authorized: boolean; testAthleteSelected: boolean; refsLoaded: boolean;
  refsConfirmed: boolean; readyForTrial: boolean;
  /** Toujours ABSENT ici : seule une vraie action utilisateur puis une preuve serveur pourrait le changer. */
  realDryRunOrSendProof: "ABSENT";
  automaticRemoteWrites: false;
};
export type SafeStatus = {
  configured: boolean; callbackUrl: string | null;
  grant: null | { status: GrantRow["status"]; appType: GrantRow["app_type"]; scopes: string[]; nolioUserRef: string;
    allowedAthletes: AllowedAthlete[]; selectedAthleteRef: string | null; consentConfirmedAt: string | null;
    tokenExpiresAt: string; tokenExpired: boolean; refreshTokenStored: boolean;
    refreshState: NonNullable<GrantRow["refresh_state"]>; generation: number;
    remoteRefs: null | { loadedAt: string | null; digest: string; sports: RemoteSport[]; exercises: { status: string; items: { id: string; name: string; type: string | null }[] } } };
  activeConnections: number | null;
  /** Correspondances confirmées de la connexion active (aucun jeton) + empreinte pour CAS. */
  activeRefs: null | { sha256: string; sportIds: Record<string, string>; exerciseIds: Record<string, string>; competition: unknown; calendarTimeZone: string | null };
  stages: Stages;
  remaining: string[];
};
export async function connectionStatus(a: { coachId: string; athleteId: string; env: OAuthEnv; store: OAuthStore; now: number }): Promise<SafeStatus | { status: "BLOCKED"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "BLOCKED", reason: "coach_not_qa" };
  const cfg = loadConfig(a.env);
  const g = await a.store.getGrant(a.coachId, a.athleteId);
  if (g === "error") return { status: "BLOCKED", reason: "grant_read_failed" };
  const active = await a.store.countActiveConnections(a.coachId, a.athleteId);
  const activeRefs = active === 1 ? await readActiveRefs(a.store, a.coachId, a.athleteId) : null;
  const rs = g?.refresh_state ?? "idle";
  const refs = g ? parseStoredRefs(g.remote_refs) : null;
  const tokenValid = !!g && Date.parse(g.token_expires_at) > a.now + 60_000;
  const st: Stages = {
    configured: cfg.ok,
    authorized: !!g && rs !== "needs_reconnect" && rs !== "unknown",
    testAthleteSelected: !!g?.selected_athlete_ref && !!g.consent_confirmed_at,
    refsLoaded: !!refs && refs.athleteRef === g?.selected_athlete_ref,
    refsConfirmed: g?.status === "active" && active === 1,
    readyForTrial: false, realDryRunOrSendProof: "ABSENT", automaticRemoteWrites: false,
  };
  st.readyForTrial = st.configured && st.authorized && st.refsConfirmed && rs === "idle" && (tokenValid || !!g?.refresh_token);
  const remaining: string[] = [];
  if (!st.configured) remaining.push(cfg.ok === false ? cfg.reason : "config");
  if (!g) remaining.push("aucune autorisation V2 : préparer la connexion");
  else if (rs === "needs_reconnect") remaining.push("Nolio a refusé le rafraîchissement : reconnecter (nouveau consentement)");
  else if (rs === "unknown") remaining.push("issue du rafraîchissement inconnue (jeton peut-être tourné) : reconnecter, aucun nouvel essai automatique");
  else if (rs === "refreshing") remaining.push("rafraîchissement en cours");
  if (g && !st.testAthleteSelected) remaining.push("choisir l'athlète Nolio de test et confirmer le consentement");
  if (st.testAthleteSelected && !st.refsLoaded) remaining.push("cliquer « Charger les sports Nolio »");
  if (st.refsLoaded && !st.refsConfirmed) remaining.push("associer les sports du plan aux sports Nolio confirmés puis activer");
  if (refs && refs.exercises.status !== "loaded") remaining.push(`exercices de force non chargés (${refs.exercises.status}) : séances de force bloquées`);
  remaining.push("envoi calendrier : ABSENT (aucun envoi automatique)");
  return {
    configured: cfg.ok, callbackUrl: qaBackendOk(a.env.supabaseUrl) ? callbackUrlFor(a.env.supabaseUrl!) : null,
    grant: g ? {
      status: g.status, appType: g.app_type, scopes: g.granted_scopes, nolioUserRef: g.nolio_user_ref,
      allowedAthletes: g.allowed_athletes, selectedAthleteRef: g.selected_athlete_ref, consentConfirmedAt: g.consent_confirmed_at,
      tokenExpiresAt: g.token_expires_at, tokenExpired: Date.parse(g.token_expires_at) <= a.now, refreshTokenStored: !!g.refresh_token,
      refreshState: rs, generation: g.token_generation ?? 1,
      remoteRefs: refs ? { loadedAt: g.remote_refs_loaded_at ?? null, digest: refs.digest, sports: refs.sports, exercises: refs.exercises } : null,
    } : null,
    activeConnections: active, activeRefs: activeRefs && activeRefs !== "error" ? activeRefs : null, stages: st, remaining,
  };
}

/** Garde commune aux actions refs/activation : grant sélectionné, consenti, contrat V2 vérifié. */
function grantReady(g: GrantRow | null | "error"): { ok: true; g: GrantRow & { id: string } } | { ok: false; reason: string } {
  if (g === "error") return { ok: false, reason: "grant_read_failed" };
  if (!g || !g.id) return { ok: false, reason: "no_grant" };
  if (g.api_version !== "v2" || (g.app_type !== "partner" && g.app_type !== "team")) return { ok: false, reason: "grant_contract_invalid" };
  if (!g.selected_athlete_ref || !g.consent_confirmed_at) return { ok: false, reason: "athlete_not_selected_or_consent_missing" };
  const hit = g.allowed_athletes.find((x) => x.id === g.selected_athlete_ref);
  if (!hit || !hit.has_api_access) return { ok: false, reason: "athlete_no_longer_authorized" };
  if (NOLIO_V2_REQUIRED_SCOPES.some((s) => !g.granted_scopes.includes(s))) return { ok: false, reason: "scopes_missing" };
  if ((g.refresh_state ?? "idle") !== "idle") return { ok: false, reason: `refresh_state_${g.refresh_state}` };
  return { ok: true, g: g as GrantRow & { id: string } };
}

/** « Charger les sports Nolio » : uniquement sur clic ; refresh paresseux si nécessaire. */
export async function loadRemoteRefsAction(a: {
  coachId: string; athleteId: string; store: OAuthStore; now: () => number;
  refresh: (grantId: string, generation: number, scopes: string[]) => Promise<RefreshOutcome>;
  fetchRefs: (accessToken: string, athleteRef: string, scopes: string[]) => Promise<{ ok: true; refs: RemoteRefs } | { ok: false; reason: string }>;
}): Promise<{ status: "REFS_LOADED"; digest: string; sports: number; usableSports: number; exercises: string } | { status: "REFUSED" | "UNKNOWN"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "REFUSED", reason: "coach_not_qa" };
  let r = grantReady(await a.store.getGrant(a.coachId, a.athleteId));
  if (r.ok === false) return { status: "REFUSED", reason: r.reason };
  if (r.g.status !== "pending_refs" && r.g.status !== "active") return { status: "REFUSED", reason: "grant_not_selected" };
  if (needsRefresh(r.g.token_expires_at, a.now())) {
    if (!r.g.refresh_token) return { status: "REFUSED", reason: "token_expired_reconnect" };
    const out = await a.refresh(r.g.id, r.g.token_generation ?? 1, r.g.granted_scopes);
    if (out.status !== "REFRESHED") return { status: out.status === "UNKNOWN" ? "UNKNOWN" : "REFUSED", reason: `refresh:${out.reason}` };
    r = grantReady(await a.store.getGrant(a.coachId, a.athleteId));
    if (r.ok === false) return { status: "REFUSED", reason: r.reason };
    if (Date.parse(r.g.token_expires_at) <= a.now() + 60_000) return { status: "UNKNOWN", reason: "token_still_expired_after_refresh" };
  }
  const got = await a.fetchRefs(r.g.access_token, r.g.selected_athlete_ref!, r.g.granted_scopes);
  if (got.ok === false) return { status: "UNKNOWN", reason: got.reason };
  if (!a.store.storeRemoteRefs) return { status: "REFUSED", reason: "store_unavailable" };
  const ok = await a.store.storeRemoteRefs(r.g.id, r.g.token_generation ?? 1, got.refs);
  if (!ok) return { status: "REFUSED", reason: "refs_store_cas_failed" };
  return { status: "REFS_LOADED", digest: got.refs.digest, sports: got.refs.sports.length,
    usableSports: got.refs.sports.filter((s) => s.isActive && s.structuredEnabled).length, exercises: got.refs.exercises.status };
}

/** Activation : clic séparé, aucune requête réseau, aucun envoi ; refs validées contre la lecture serveur. */
export async function activateConnectionAction(a: {
  coachId: string; athleteId: string; store: OAuthStore; now: number;
  consent: unknown; refsDigest: unknown; sportIds: unknown; exerciseIds: unknown; calendarTimeZone: unknown;
}): Promise<{ status: "ACTIVE_NO_SEND" } | { status: "REFUSED"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "REFUSED", reason: "coach_not_qa" };
  if (a.consent !== true) return { status: "REFUSED", reason: "consent_not_confirmed" };
  const r = grantReady(await a.store.getGrant(a.coachId, a.athleteId));
  if (r.ok === false) return { status: "REFUSED", reason: r.reason };
  if (r.g.status !== "pending_refs") return { status: "REFUSED", reason: r.g.status === "active" ? "already_active" : "grant_not_pending_refs" };
  if (Date.parse(r.g.token_expires_at) <= a.now + 60_000) return { status: "REFUSED", reason: "token_expired_load_refs_again" };
  const remote = parseStoredRefs(r.g.remote_refs);
  if (!remote) return { status: "REFUSED", reason: "refs_not_loaded" };
  if (typeof a.refsDigest !== "string" || a.refsDigest !== remote.digest) return { status: "REFUSED", reason: "refs_digest_mismatch" };
  const loadedAt = Date.parse(r.g.remote_refs_loaded_at ?? "");
  if (!Number.isFinite(loadedAt) || a.now - loadedAt > REFS_MAX_AGE_MS) return { status: "REFUSED", reason: "refs_too_old_reload" };
  const v = validateActivationRefs({ remote, selectedRef: r.g.selected_athlete_ref!, sportIds: a.sportIds, exerciseIds: a.exerciseIds, calendarTimeZone: a.calendarTimeZone });
  if (v.ok === false) return { status: "REFUSED", reason: v.reason };
  if (!a.store.activate) return { status: "REFUSED", reason: "store_unavailable" };
  const res = await a.store.activate(r.g.id, a.coachId, a.athleteId, r.g.token_generation ?? 1, remote.digest, v.refs);
  return res.ok === true ? { status: "ACTIVE_NO_SEND" } : { status: "REFUSED", reason: res.reason };
}
export async function selectAthlete(a: { coachId: string; athleteId: string; nolioAthleteRef: unknown; consent: unknown; store: OAuthStore; now: number }):
  Promise<{ status: "PENDING_REFS" } | { status: "REFUSED"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "REFUSED", reason: "coach_not_qa" };
  if (a.consent !== true) return { status: "REFUSED", reason: "consent_not_confirmed" };
  if (typeof a.nolioAthleteRef !== "string" || !/^usr_[A-Za-z0-9]+$/.test(a.nolioAthleteRef)) return { status: "REFUSED", reason: "athlete_ref_invalid" };
  const g = await a.store.getGrant(a.coachId, a.athleteId);
  if (g === "error") return { status: "REFUSED", reason: "grant_read_failed" };
  if (!g) return { status: "REFUSED", reason: "no_grant" };
  if (g.status !== "pending_athlete_selection") return { status: "REFUSED", reason: "grant_not_pending_selection" };
  if (Date.parse(g.token_expires_at) <= a.now) return { status: "REFUSED", reason: "token_expired_reconnect" };
  const hit = g.allowed_athletes.find((x) => x.id === a.nolioAthleteRef);
  if (!hit) return { status: "REFUSED", reason: "athlete_not_managed_by_grant" };
  if (!hit.has_api_access) return { status: "REFUSED", reason: "athlete_api_access_denied" };
  const ok = await a.store.selectAthlete(a.coachId, a.athleteId, a.nolioAthleteRef, new Date(a.now).toISOString());
  return ok ? { status: "PENDING_REFS" } : { status: "REFUSED", reason: "selection_cas_failed" };
}

/** Lecture des correspondances actives (sans jeton) + empreinte canonique. */
async function readActiveRefs(store: OAuthStore, coachId: string, athleteId: string) {
  if (!store.getActiveConnectionRefs) return null;
  const r = await store.getActiveConnectionRefs(coachId, athleteId);
  if (r === "error" || r === null || typeof r !== "object" || Array.isArray(r)) return r === "error" ? "error" as const : null;
  const o = r as Record<string, unknown>;
  const map = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string> : {});
  return { sha256: await sha256Hex(canonicalJson(r)), sportIds: map(o.sportIds), exerciseIds: map(o.exerciseIds), competition: o.competition ?? null,
    calendarTimeZone: typeof o.calendarTimeZone === "string" ? o.calendarTimeZone : null };
}

/**
 * Mise à jour EXPLICITE des correspondances d'une connexion déjà ACTIVE (clic + consentement) :
 * sports / exercices / compétition / fuseau validés contre les références officielles déjà
 * chargées (< 1 h, même empreinte), CAS sur les correspondances actuellement lues par le coach.
 * Aucun réseau, aucun jeton lu ni modifié, aucune reconnexion, aucun envoi.
 */
export async function updateActiveRefsAction(a: {
  coachId: string; athleteId: string; store: OAuthStore; now: number;
  consent: unknown; refsDigest: unknown; currentRefsSha: unknown; sportIds: unknown; exerciseIds: unknown; calendarTimeZone: unknown; competition: unknown;
}): Promise<{ status: "REFS_UPDATED_NO_SEND" } | { status: "REFUSED"; reason: string }> {
  if (!QA_COACHES.has(a.coachId)) return { status: "REFUSED", reason: "coach_not_qa" };
  if (a.consent !== true) return { status: "REFUSED", reason: "consent_not_confirmed" };
  const r = grantReady(await a.store.getGrant(a.coachId, a.athleteId));
  if (r.ok === false) return { status: "REFUSED", reason: r.reason };
  if (r.g.status !== "active") return { status: "REFUSED", reason: "grant_not_active" };
  const remote = parseStoredRefs(r.g.remote_refs);
  if (!remote) return { status: "REFUSED", reason: "refs_not_loaded" };
  if (typeof a.refsDigest !== "string" || a.refsDigest !== remote.digest) return { status: "REFUSED", reason: "refs_digest_mismatch" };
  const loadedAt = Date.parse(r.g.remote_refs_loaded_at ?? "");
  if (!Number.isFinite(loadedAt) || a.now - loadedAt > REFS_MAX_AGE_MS) return { status: "REFUSED", reason: "refs_too_old_reload" };
  if ((await a.store.countActiveConnections(a.coachId, a.athleteId)) !== 1) return { status: "REFUSED", reason: "active_connection_not_unique" };
  if (!a.store.getActiveConnectionRefs || !a.store.updateActiveRefs) return { status: "REFUSED", reason: "store_unavailable" };
  const current = await a.store.getActiveConnectionRefs(a.coachId, a.athleteId);
  if (current === "error" || current === null) return { status: "REFUSED", reason: "active_refs_unreadable" };
  if (typeof a.currentRefsSha !== "string" || a.currentRefsSha !== await sha256Hex(canonicalJson(current))) return { status: "REFUSED", reason: "active_refs_changed_reload_status" };
  const v = validateActivationRefs({ remote, selectedRef: r.g.selected_athlete_ref!, sportIds: a.sportIds, exerciseIds: a.exerciseIds, calendarTimeZone: a.calendarTimeZone, competition: a.competition });
  if (v.ok === false) return { status: "REFUSED", reason: v.reason };
  const res = await a.store.updateActiveRefs(r.g.id, a.coachId, a.athleteId, r.g.token_generation ?? 1, remote.digest, current, v.refs);
  return res.ok === true ? { status: "REFS_UPDATED_NO_SEND" } : { status: "REFUSED", reason: res.reason };
}
