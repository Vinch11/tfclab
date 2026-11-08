/**
 * Contexte PRIVÉ d'un refus `403 team_scope_forbidden` (Nolio V2), destiné au SEUL coach
 * connecté dans son navigateur. Pur (aucune API Deno/DOM) : utilisé côté serveur (extraction)
 * ET côté client (re-validation avant affichage).
 *
 * Contrat officiel (openapi.json SHA-256 75e3850e…f9238, `ApiError`/`ApiErrorBody` ; guide
 * migration v1→v2 §4.3) : enveloppe `{error:{code,message,scopes?,team_name?,team_options_url?}}`.
 * `team_name` : nom de l'équipe dont les options refusent le scope ; `scopes` : scopes refusés ;
 * `team_options_url` (format uri) : présent seulement si l'appelant gère l'équipe.
 *
 * Règles : seuls ces trois champs sont lus ; message, fields, athlete_name, identifiants et tout
 * le reste sont ignorés. Ce contexte n'est JAMAIS journalisé ni stocké en base (le reçu reste
 * minimal et immuable) ; il n'est renvoyé que dans la réponse HTTP authentifiée du coach.
 */

/** Scopes officiels (components.securitySchemes.oauth2.flows.authorizationCode.scopes). */
export const NOLIO_V2_OFFICIAL_SCOPES = [
  "real:read", "real:write", "real:delete", "planned:read", "planned:write", "planned:delete",
  "metrics:read", "metrics:write", "metrics:delete", "messaging:read", "messaging:write", "messaging:delete",
  "library:read", "library:write", "library:delete", "settings:read", "settings:write", "settings:delete",
  "team:read", "team:write", "team:delete", "marketplace:read", "marketplace:write", "marketplace:delete",
  "billing:read", "app:manage",
] as const;
export type NolioV2Scope = typeof NOLIO_V2_OFFICIAL_SCOPES[number];

export type TeamScopeContext = { teamName: string | null; scopes: NolioV2Scope[]; teamOptionsUrl: string | null };

export const TEAM_NAME_MAX = 80;
export const TEAM_URL_MAX = 512;
const NOLIO_ORIGIN = "https://www.nolio.io";
/** Noms de paramètres ressemblant à des secrets / credentials : URL refusée entière. */
const CREDENTIAL_PARAM = /(code|state|token|secret|password|passwd|pwd|key|auth|session|jwt|sig|credential|bearer|cookie|nonce)/i;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Texte affichable borné : retire contrôles (Cc), formats/bidi/zéro-largeur (Cf), séparateurs de ligne. */
export function sanitizeTeamName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const cleaned = x.replace(/[\t\n\r\v\f\p{Zl}\p{Zp}]/gu, " ").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const cps = [...cleaned];
  return cps.length > TEAM_NAME_MAX ? `${cps.slice(0, TEAM_NAME_MAX).join("")}…` : cleaned;
}

export function sanitizeScopes(x: unknown): NolioV2Scope[] {
  if (!Array.isArray(x)) return [];
  const out: NolioV2Scope[] = [];
  for (const s of x.slice(0, 64))
    if (typeof s === "string" && (NOLIO_V2_OFFICIAL_SCOPES as readonly string[]).includes(s) && !out.includes(s as NolioV2Scope)) out.push(s as NolioV2Scope);
  return out;
}

/** HTTPS, origine exacte https://www.nolio.io (port 443 implicite), sans userinfo/fragment/paramètre credential. */
export function validateTeamOptionsUrl(x: unknown): string | null {
  if (typeof x !== "string" || x.length === 0 || x.length > TEAM_URL_MAX) return null;
  if (/[\s\p{Cc}\p{Cf}\\]/u.test(x)) return null;
  if (!x.toLowerCase().startsWith(`${NOLIO_ORIGIN}/`)) return null;
  let u: URL;
  try { u = new URL(x); } catch { return null; }
  if (u.protocol !== "https:" || u.hostname !== "www.nolio.io" || u.port !== "" || u.origin !== NOLIO_ORIGIN) return null;
  if (u.username || u.password || u.hash) return null;
  for (const k of u.searchParams.keys()) if (CREDENTIAL_PARAM.test(k)) return null;
  return u.href;
}

/** Projette un objet (déjà décodé) vers un contexte sûr, ou null si rien d'utile. */
export function projectTeamScopeContext(x: unknown): TeamScopeContext | null {
  if (!isObj(x)) return null;
  const c: TeamScopeContext = { teamName: sanitizeTeamName(x.teamName), scopes: sanitizeScopes(x.scopes), teamOptionsUrl: validateTeamOptionsUrl(x.teamOptionsUrl) };
  return c.teamName || c.scopes.length || c.teamOptionsUrl ? c : null;
}

/** Serveur : extrait depuis le corps 403 brut, SEULEMENT si error.code === "team_scope_forbidden". */
export function extractTeamScopeContext(status: number, text: string | null): TeamScopeContext | null {
  if (status !== 403) return null;
  let j: unknown;
  try { j = JSON.parse(text ?? ""); } catch { return null; }
  if (!isObj(j) || !isObj(j.error) || j.error.code !== "team_scope_forbidden") return null;
  return projectTeamScopeContext({ teamName: j.error.team_name, scopes: j.error.scopes, teamOptionsUrl: j.error.team_options_url });
}
