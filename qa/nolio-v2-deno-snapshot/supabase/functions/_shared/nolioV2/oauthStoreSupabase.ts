/** Store OAuth V2 sur client service-role (créé APRÈS getClaims/propriété ou validation du state). */
import type { GrantRow, OAuthStore, StateRow } from "./oauth.ts";

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export function supabaseOAuthStore(admin: Admin): OAuthStore {
  return {
    async insertState(row: StateRow) {
      const { error } = await admin.from("nolio_v2_oauth_states").insert(row);
      return !error;
    },
    async consumeState(digest: string, nowIso: string) {
      const { data, error } = await admin.from("nolio_v2_oauth_states")
        .update({ consumed_at: nowIso })
        .eq("state_digest", digest).is("consumed_at", null).gt("expires_at", nowIso)
        .select("state_digest, coach_id, athlete_id, return_path, pkce_verifier, expires_at");
      if (error || !Array.isArray(data) || data.length !== 1) return null;
      return data[0] as StateRow;
    },
    /** Reconnexion explicite : RPC atomique (nouvelle génération, verrou effacé, connexions liées révoquées). */
    async upsertGrant(row: GrantRow) {
      const { data, error } = await admin.rpc("nolio_v2_grant_reconnect", {
        p_coach_id: row.coach_id, p_athlete_id: row.athlete_id, p_app_type: row.app_type, p_scopes: row.granted_scopes,
        p_user_ref: row.nolio_user_ref, p_allowed: row.allowed_athletes, p_access: row.access_token,
        p_refresh: row.refresh_token, p_expires: row.token_expires_at,
      });
      return !error && data?.ok === true;
    },
    async storeRemoteRefs(grantId: string, generation: number, refs: unknown) {
      const { data, error } = await admin.rpc("nolio_v2_store_remote_refs", { p_grant_id: grantId, p_generation: generation, p_refs: refs });
      return !error && data?.ok === true;
    },
    async activate(grantId: string, coachId: string, athleteId: string, generation: number, refsDigest: string, refs: unknown) {
      const { data, error } = await admin.rpc("nolio_v2_activate_connection", {
        p_grant_id: grantId, p_coach_id: coachId, p_athlete_id: athleteId, p_generation: generation, p_refs_digest: refsDigest, p_refs: refs,
      });
      if (error || !data) return { ok: false as const, reason: "activation_rpc_failed" };
      return data.ok === true ? { ok: true as const } : { ok: false as const, reason: String(data.reason ?? "activation_refused") };
    },
    async getGrant(coachId: string, athleteId: string) {
      const { data, error } = await admin.from("nolio_v2_oauth_grants").select("*").eq("coach_id", coachId).eq("athlete_id", athleteId).maybeSingle();
      if (error) return "error";
      return (data as GrantRow | null) ?? null;
    },
    async selectAthlete(coachId: string, athleteId: string, ref: string, nowIso: string) {
      const { data, error } = await admin.from("nolio_v2_oauth_grants")
        .update({ selected_athlete_ref: ref, consent_confirmed_at: nowIso, status: "pending_refs", updated_at: nowIso })
        .eq("coach_id", coachId).eq("athlete_id", athleteId).eq("status", "pending_athlete_selection").select("id");
      return !error && Array.isArray(data) && data.length === 1;
    },
    async countActiveConnections(coachId: string, athleteId: string) {
      const { count, error } = await admin.from("nolio_v2_connections").select("id", { count: "exact", head: true })
        .eq("coach_id", coachId).eq("athlete_id", athleteId).eq("status", "active");
      return error ? null : count ?? 0;
    },
  };
}
