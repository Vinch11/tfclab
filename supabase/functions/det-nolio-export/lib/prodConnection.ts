/**
 * Connexion Nolio V2 de production : autorisation par coach + liens par athlète.
 * Utilisé UNIQUEMENT par les Edge Functions après getClaims et contrôle de
 * propriété (client service-role créé ensuite). Aucun jeton n'est renvoyé au
 * navigateur ni journalisé.
 */
import { NOLIO_V2_REQUIRED_SCOPES, type NolioV2Connection } from "./plannedClient.ts";
import type { NolioV2Refs } from "./plannedMapper.ts";
import type { RemoteSport } from "./refs.ts";
import type { AllowedAthlete, Fetch, OAuthConfig } from "./oauth.ts";
import { needsRefresh, refreshGrantToken, supabaseRefreshStore } from "./tokenRefresh.ts";

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type GrantRow = {
  id: string; coach_id: string; app_type: "partner" | "team"; granted_scopes: string[]; nolio_user_ref: string;
  allowed_athletes: AllowedAthlete[]; access_token: string; refresh_token: string | null; token_expires_at: string;
  token_generation: number; refresh_state: "idle" | "refreshing" | "needs_reconnect" | "unknown";
};
export type LinkRow = {
  id: string; coach_id: string; athlete_id: string; grant_id: string; nolio_athlete_ref: string; nolio_athlete_name: string | null;
  sport_ids: Record<string, string>; remote_sports: RemoteSport[]; refs_loaded_at: string;
};

export async function readGrant(admin: Admin, coachId: string): Promise<GrantRow | null | "error"> {
  const { data, error } = await admin.from("det_nolio_v2_grants").select("*").eq("coach_id", coachId).maybeSingle();
  if (error) return "error";
  return (data as GrantRow | null) ?? null;
}
export async function readLink(admin: Admin, coachId: string, athleteId: string): Promise<LinkRow | null | "error"> {
  const { data, error } = await admin.from("det_nolio_v2_athlete_links").select("*").eq("coach_id", coachId).eq("athlete_id", athleteId).maybeSingle();
  if (error) return "error";
  return (data as LinkRow | null) ?? null;
}

/** Grant utilisable : jeton valide (rafraîchi si nécessaire, une seule fois, sérialisé en base). */
export async function readyGrant(a: { admin: Admin; coachId: string; config: { ok: true; value: OAuthConfig } | { ok: false; reason: string }; fetch: Fetch }):
  Promise<{ ok: true; grant: GrantRow } | { ok: false; reason: string }> {
  let g = await readGrant(a.admin, a.coachId);
  if (g === "error") return { ok: false, reason: "grant_read_failed" };
  if (!g) return { ok: false, reason: "not_connected" };
  if (g.refresh_state === "needs_reconnect" || g.refresh_state === "unknown") return { ok: false, reason: "reconnect_required" };
  if (g.refresh_state === "refreshing") return { ok: false, reason: "refresh_in_progress" };
  const scopes = g.granted_scopes;
  if (NOLIO_V2_REQUIRED_SCOPES.some((s) => !scopes.includes(s))) return { ok: false, reason: "scopes_missing_reconnect" };
  if (needsRefresh(g.token_expires_at, Date.now())) {
    if (!g.refresh_token) return { ok: false, reason: "reconnect_required" };
    const out = await refreshGrantToken({ grantId: g.id, generation: g.token_generation, currentScopes: g.granted_scopes,
      config: a.config, store: supabaseRefreshStore(a.admin), fetch: a.fetch, now: Date.now });
    if (out.status !== "REFRESHED") return { ok: false, reason: out.status === "NEEDS_RECONNECT" ? "reconnect_required" : `token_refresh_${out.status.toLowerCase()}` };
    g = await readGrant(a.admin, a.coachId);
    if (!g || g === "error") return { ok: false, reason: "grant_read_failed" };
    if (Date.parse(g.token_expires_at) <= Date.now() + 60_000) return { ok: false, reason: "token_still_expired" };
  }
  return { ok: true, grant: g };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Ordre de préférence par sport TFCL (nom du sport Nolio de l'athlète). */
const SPORT_PATTERNS: Record<string, RegExp[]> = {
  run: [/^course a pied$/, /^running$/, /^course$/, /^run$/, /course a pied|running|^course/],
  bike: [/^velo route$/, /^cyclisme$/, /^velo$/, /^cycling$/, /^road cycling$/, /velo|cycl|bike/],
  swim: [/^natation$/, /^swimming$/, /^natation piscine$/, /natation|swim/],
  strength: [/^renforcement musculaire$/, /^renforcement$/, /^musculation$/, /^strength training$/, /renfo|muscu|strength|ppg|gainage/],
};
/**
 * Associe automatiquement chaque sport TFCL au sport Nolio de l'athlète, par nom,
 * parmi les sports actifs acceptant les séances structurées. Le coach voit
 * l'association et peut la modifier ; un sport sans correspondance reste absent
 * (ses séances seront refusées, jamais envoyées sous un autre sport).
 */
export function autoSportIds(remote: RemoteSport[]): Record<string, string> {
  const usable = remote.filter((s) => s.isActive && s.structuredEnabled);
  const out: Record<string, string> = {};
  for (const [key, patterns] of Object.entries(SPORT_PATTERNS)) {
    for (const re of patterns) {
      const hits = usable.filter((s) => re.test(norm(s.name)));
      if (hits.length) { out[key] = hits[0].sport; break; }
    }
  }
  // Compétition triathlon : sport « Triathlon » actif unique (jamais deviné autrement).
  const tri = [...new Set(remote.filter((s) => s.isActive && norm(s.name) === "triathlon").map((s) => s.sport))];
  if (tri.length === 1) out.brick = tri[0];
  return out;
}
/** Validation d'associations choisies par le coach contre les sports réellement lus. */
export function validateSportIds(remote: RemoteSport[], value: unknown): { ok: true; sportIds: Record<string, string> } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "sport_ids_invalid" };
  const allowedKeys = new Set(["run", "bike", "swim", "strength", "brick"]);
  const active = new Set(remote.filter((s) => s.isActive).map((s) => s.sport));
  const usable = new Set(remote.filter((s) => s.isActive && s.structuredEnabled).map((s) => s.sport));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedKeys.has(k)) return { ok: false, reason: `sport_key_invalid:${k.slice(0, 20)}` };
    if (v === null || v === "") continue;
    if (typeof v !== "string" || !/^spt_[A-Za-z0-9]+$/.test(v)) return { ok: false, reason: `sport_ref_invalid:${k}` };
    if (!(k === "brick" ? active.has(v) : usable.has(v))) return { ok: false, reason: `sport_ref_not_allowed_for_athlete:${k}` };
    out[k] = v;
  }
  if (!Object.keys(out).length) return { ok: false, reason: "no_sport_associated" };
  return { ok: true, sportIds: out };
}

export function refsFromLink(link: LinkRow): NolioV2Refs {
  return { synthetic: false, athleteId: link.nolio_athlete_ref, sportIds: { ...link.sport_ids }, exerciseIds: {}, competition: null, calendarTimeZone: null };
}
export function connectionFromGrant(g: GrantRow): NolioV2Connection {
  return { apiVersion: "v2", mode: "real", grantedScopes: [...g.granted_scopes] };
}
/** opKeys déjà confirmés pour cette version (journal durable, lu côté serveur). */
export async function confirmedOpKeys(admin: Admin, coachId: string, planVersionId: string): Promise<Set<string> | null> {
  const { data, error } = await admin.from("det_nolio_v2_operations").select("op_key,state").eq("coach_id", coachId).eq("plan_version_id", planVersionId);
  if (error || !Array.isArray(data)) return null;
  return new Set((data as Array<{ op_key: string; state: string }>).filter((r) => r.state === "confirmed").map((r) => r.op_key));
}
