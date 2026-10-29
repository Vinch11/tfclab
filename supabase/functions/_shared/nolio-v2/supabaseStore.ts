import type { SupabaseClient } from "npm:@supabase/supabase-js@2.89.0";
import type { LinkDTO } from "./contracts.ts";
import type { LinkStore } from "./store.ts";
import { NolioError } from "./errors.ts";
function dto(row: Record<string, string>): LinkDTO {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    nolioUserId: row.nolio_user_id,
    accessStatus: row.access_status,
    lastVerifiedAt: row.last_verified_at,
  };
}
export function createLinkStore(db: SupabaseClient): LinkStore {
  const get: LinkStore["get"] = async (coach, connection, athlete) => {
    const { data, error } = await db.from("nolio_v2_athlete_links").select(
      "id,athlete_id,nolio_user_id,access_status,last_verified_at",
    )
      .eq("coach_id", coach).eq("connection_key", connection).eq(
        "athlete_id",
        athlete,
      ).maybeSingle();
    if (error) throw new NolioError("storage_error", 503);
    return data ? dto(data) : null;
  };
  return {
    async ownsAthlete(coach, athlete) {
      const { data, error } = await db.from("athletes").select("id").eq(
        "id",
        athlete,
      ).eq("coach_id", coach).maybeSingle();
      if (error) throw new NolioError("storage_error", 503);
      return !!data;
    },
    get,
    async associate(coach, connection, athlete, remote) {
      const { data, error } = await db.from("nolio_v2_athlete_links").insert({
        coach_id: coach,
        connection_key: connection,
        athlete_id: athlete,
        nolio_user_id: remote,
      }).select("id,athlete_id,nolio_user_id,access_status,last_verified_at")
        .single();
      if (error?.code === "23505") {
        const existing = await get(coach, connection, athlete);
        if (existing?.nolioUserId === remote) return existing;
        throw new NolioError("identity_collision", 409);
      }
      if (error || !data) throw new NolioError("storage_error", 503);
      return dto(data);
    },
    async unlink(coach, connection, athlete) {
      const { error } = await db.from("nolio_v2_athlete_links").delete().eq(
        "coach_id",
        coach,
      ).eq("connection_key", connection).eq("athlete_id", athlete);
      if (error) throw new NolioError("storage_error", 503);
    },
  };
}
