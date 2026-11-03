/** Store OAuth V2 sur client service-role (créé APRÈS getClaims/propriété ou validation du state). */
import type { GrantRow, OAuthStore, StateRow } from "./oauth.ts";

// deno-lint-ignore no-explicit-any
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
    async upsertGrant(row: GrantRow) {
      const { error } = await admin.from("nolio_v2_oauth_grants")
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "coach_id,athlete_id" });
      return !error;
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
