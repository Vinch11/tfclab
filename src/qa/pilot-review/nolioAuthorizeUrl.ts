/**
 * QA — validation stricte de l'URL d'autorisation Nolio V2 renvoyée par
 * `nolio-v2-oauth` (action start). Nolio refuse l'affichage en iframe : l'URL
 * est ouverte en navigation de premier niveau par l'utilisateur (lien
 * target=_blank ou copie manuelle dans un onglet normal), jamais par
 * navigation de la frame courante. URL conservée en mémoire React seulement,
 * jamais persistée, journalisée ni rapportée.
 */
export function validateNolioAuthorizeUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.origin !== "https://www.nolio.io") return null;
  if (u.username || u.password || u.port) return null;
  if (u.pathname !== "/api/authorize/") return null;
  // Le serveur produit la forme canonique (URL.toString()) : toute forme
  // non canonique est refusée plutôt que réécrite. L'URL rendue = l'URL reçue.
  if (u.toString() !== raw) return null;
  return raw;
}

export const NOLIO_AUTHORIZE_STATE_TTL_MIN = 10;
export const NOLIO_AUTHORIZE_TTL_MS = NOLIO_AUTHORIZE_STATE_TTL_MIN * 60_000;

export type PreparedNolioLink = { url: string; coachId: string; athleteId: string; sourceKey: string; at: number };

export function isPreparedLinkUsable(p: PreparedNolioLink | null, now: number): p is PreparedNolioLink {
  return !!p && now >= p.at && now - p.at < NOLIO_AUTHORIZE_TTL_MS;
}

/**
 * Tout événement Auth réel invalide le lien, sauf rafraîchissement de jeton
 * / session initiale pour le MÊME compte que celui qui a préparé la demande.
 */
export function shouldInvalidateOnAuthEvent(event: string, sessionUserId: string | null | undefined, linkCoachId: string): boolean {
  if ((event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && sessionUserId === linkCoachId) return false;
  return true;
}
