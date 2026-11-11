/**
 * Nolio API V2 — OAuth de production (logique PURE, dépendances injectées).
 *
 * Modèle : UNE autorisation Nolio par coach TFCLab (`det_nolio_v2_grants`), puis
 * chaque athlète TFCLab est relié à UN athlète Nolio géré par ce compte
 * (`det_nolio_v2_athlete_links`). Le rafraîchissement du jeton (rotation sans délai
 * de grâce côté Nolio) est donc sérialisé sur une seule ligne par compte.
 *
 * Reprend les validateurs éprouvés en QA (jeton, app, me, athlètes gérés) :
 * - state aléatoire 256 bits, seul son SHA-256 stocké, PKCE S256, TTL 10 min,
 *   consommation unique atomique ;
 * - redirection uniquement vers l'origine de l'app + route fixe, avec un code
 *   d'issue énuméré (jamais de code d'autorisation, jeton ni texte distant) ;
 * - échange du code côté serveur, app type / scopes / me / athlètes vérifiés
 *   AVANT tout stockage. Configuration absente ⇒ refus explicite sans réseau.
 */
import { NOLIO_V2_REQUIRED_SCOPES } from "./plannedClient.ts";

export const NOLIO_BASE = "https://www.nolio.io";
export const AUTHORIZE_URL = `${NOLIO_BASE}/api/authorize/`;
export const TOKEN_URL = `${NOLIO_BASE}/api/token/`;
export const STATE_TTL_MS = 10 * 60_000;
export const DOCUMENTED_TOKEN_TTL_MS = 24 * 3600_000;
export const MAX_ATHLETE_PAGES = 20;
export const CALLBACK_FUNCTION = "det-nolio-callback";
/** Origine de l'application publiée (surchargée par NOLIO_V2_APP_ORIGIN). */
export const DEFAULT_APP_ORIGIN = "https://tfcl.twoforcoaching.be";
/** Page de retour fixe : la page de planification. */
export const RETURN_PATH = "/__det/coach/index.html";

export const OUTCOMES = [
  "connected", "blocked_missing_config", "invalid_request", "state_invalid_or_replayed",
  "consent_denied", "token_exchange_failed", "token_response_invalid", "wrong_app_type", "scopes_missing",
  "me_invalid", "athletes_invalid", "remote_unreadable", "store_failed",
] as const;
export type Outcome = typeof OUTCOMES[number];

export type OAuthEnv = { clientId?: string; clientSecret?: string; supabaseUrl?: string; appOrigin?: string };
export type OAuthConfig = { clientId: string; clientSecret: string; callbackUrl: string };

export function callbackUrlFor(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname;
  return `https://${host}/functions/v1/${CALLBACK_FUNCTION}`;
}
export function loadConfig(env: OAuthEnv): { ok: true; value: OAuthConfig } | { ok: false; reason: string } {
  if (!env.supabaseUrl) return { ok: false, reason: "missing_config:SUPABASE_URL" };
  try { new URL(env.supabaseUrl); } catch { return { ok: false, reason: "missing_config:SUPABASE_URL" }; }
  if (!env.clientId || !env.clientSecret) return { ok: false, reason: "missing_config:NOLIO_V2_CLIENT_ID/NOLIO_V2_CLIENT_SECRET" };
  return { ok: true, value: { clientId: env.clientId, clientSecret: env.clientSecret, callbackUrl: callbackUrlFor(env.supabaseUrl) } };
}
/** Origine de retour : https uniquement, sans chemin ni paramètre ; sinon l'origine publiée. */
export function appOriginFrom(value: string | undefined): string {
  if (!value) return DEFAULT_APP_ORIGIN;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || (u.pathname !== "/" && u.pathname !== "") || u.search || u.hash) return DEFAULT_APP_ORIGIN;
    return u.origin;
  } catch { return DEFAULT_APP_ORIGIN; }
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
export function returnLocation(appOrigin: string, o: Outcome): string {
  return `${appOriginFrom(appOrigin)}${RETURN_PATH}?nolio_v2=${OUTCOMES.includes(o) ? o : "invalid_request"}`;
}

// ---------------- Store ----------------
export type StateRow = { state_digest: string; coach_id: string; pkce_verifier: string; expires_at: string };
export type AllowedAthlete = { id: string; name: string; has_api_access: boolean };
export type GrantInput = {
  coach_id: string; app_type: "partner" | "team"; granted_scopes: string[]; nolio_user_ref: string;
  allowed_athletes: AllowedAthlete[]; access_token: string; refresh_token: string | null; token_expires_at: string;
};
export interface OAuthStore {
  insertState(row: StateRow): Promise<boolean>;
  /** Atomique : consumed_at IS NULL AND expires_at > now, une seule fois. */
  consumeState(digest: string, nowIso: string): Promise<StateRow | null>;
  /** RPC atomique : nouvelle génération de jeton, verrou effacé. */
  upsertGrant(row: GrantInput): Promise<boolean>;
}

// ---------------- Start ----------------
export async function startConnect(a: { coachId: string; env: OAuthEnv; store: OAuthStore; now: number }):
  Promise<{ status: "REDIRECT"; authorizeUrl: string } | { status: "BLOCKED"; reason: string }> {
  const cfg = loadConfig(a.env);
  if (cfg.ok === false) return { status: "BLOCKED", reason: cfg.reason };
  const state = randomToken(32), verifier = randomToken(32);
  const ok = await a.store.insertState({
    state_digest: await sha256Hex(state), coach_id: a.coachId,
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

export type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; redirect: "error" }) => Promise<{ status: number; json(): Promise<unknown> }>;

/** Liste paginée des athlètes gérés par le compte (jamais une liste vide inventée). */
export async function fetchManagedAthletes(get: (path: string) => Promise<unknown>): Promise<AllowedAthlete[] | null> {
  const athletes: AllowedAthlete[] = [];
  let after: string | null = null;
  for (let i = 0; ; i++) {
    if (i >= MAX_ATHLETE_PAGES) return null;
    const page = validateAthletePage(await get(`/api/v2/me/athletes/?limit=100${after ? `&starting_after=${encodeURIComponent(after)}` : ""}`));
    if (!page) return null;
    athletes.push(...page.data);
    if (!page.hasMore) break;
    if (!page.data.length) return null;
    after = page.data[page.data.length - 1].id;
  }
  return athletes;
}

// ---------------- Callback ----------------
export async function handleCallback(a: { query: URLSearchParams; env: OAuthEnv; store: OAuthStore; fetch: Fetch; now: number }): Promise<{ location: string; outcome: Outcome }> {
  const origin = appOriginFrom(a.env.appOrigin);
  const done = (o: Outcome) => ({ location: returnLocation(origin, o), outcome: o });
  const state = a.query.get("state"), code = a.query.get("code"), err = a.query.get("error");
  if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return done("invalid_request");
  const st = await a.store.consumeState(await sha256Hex(state), new Date(a.now).toISOString());
  if (!st) return done("state_invalid_or_replayed");
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
    const athletes = await fetchManagedAthletes(get);
    if (!athletes) return done("athletes_invalid");
    const ok = await a.store.upsertGrant({
      coach_id: st.coach_id, app_type: app.appType, granted_scopes: effective, nolio_user_ref: me, allowed_athletes: athletes,
      access_token: tok.accessToken, refresh_token: tok.refreshToken, token_expires_at: tok.expiresAt,
    });
    return done(ok ? "connected" : "store_failed");
  } catch {
    return done("remote_unreadable");
  }
}
