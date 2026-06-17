// Nolio Records — récupère les records de performance (ppr/par/phrr) depuis Nolio
// et les stocke dans la table `nolio_records`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_RECORDS_BASE = "https://www.nolio.io/api/get/records/";

// Sport mappings Nolio
const BIKE_SPORTS = [14, 18];
const RUN_SPORTS = [2, 52];
const SWIM_SPORT = 19;

type NolioRecord = {
  item_seconds?: number;
  value?: number | string;
  date_recorded?: string;
  date?: string;
  sport_id?: number;
  sport?: number;
  athlete_id?: number;
  [k: string]: unknown;
};

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  currentToken: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = currentToken.expires_at ? new Date(currentToken.expires_at).getTime() : 0;
  const skewMs = 60_000;
  if (expiresAt && expiresAt - skewMs > Date.now()) return currentToken.access_token;
  if (!currentToken.refresh_token) return currentToken.access_token;

  const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!clientSecret) return currentToken.access_token;

  const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentToken.refresh_token,
  });
  const resp = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!resp.ok) return currentToken.access_token;
  const json = await resp.json().catch(() => null) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null;
  if (!json?.access_token) return currentToken.access_token;

  const newExpiresAt = new Date(
    Date.now() + (json.expires_in ?? 24 * 60 * 60) * 1000,
  ).toISOString();
  await admin
    .from("nolio_tokens")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? currentToken.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq("user_id", userId);

  return json.access_token;
}

async function fetchRecords(
  accessToken: string,
  nolioAthleteId: number,
  cat: "ppr" | "par" | "phrr",
  recordType: "time" | "distance",
  sports?: number[],
): Promise<NolioRecord[]> {
  const params = new URLSearchParams({
    cat,
    record_type: recordType,
    athlete_id: String(nolioAthleteId),
  });
  if (sports && sports.length > 0) {
    params.set("sports", sports.join(","));
  }
  const url = `${NOLIO_RECORDS_BASE}?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!resp.ok) {
    console.warn(`nolio-records fetch ${cat}/${recordType} for ${nolioAthleteId} → HTTP ${resp.status}`);
    return [];
  }
  const json = await resp.json().catch(() => null);
  if (!json) return [];
  // L'API peut renvoyer { results: [...] } ou directement un tableau
  if (Array.isArray(json)) return json as NolioRecord[];
  if (Array.isArray((json as any).results)) return (json as any).results as NolioRecord[];
  if (Array.isArray((json as any).records)) return (json as any).records as NolioRecord[];
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Token
    const { data: tokenRow } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Athlètes liés
    const { data: athletes, error: athErr } = await admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);

    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error", detail: athErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: Array<{ athlete: string; imported: number; errors: string[] }> = [];
    let totalImported = 0;

    for (const ath of athletes ?? []) {
      const nolioId = (ath as any).nolio_id as number;
      const athleteId = (ath as any).id as string;
      const errors: string[] = [];
      const rowsToUpsert: Array<Record<string, unknown>> = [];

      const queries: Array<{
        cat: "ppr" | "par" | "phrr";
        recordType: "time" | "distance";
        sports?: number[];
        defaultSportIds: number[];
      }> = [
        { cat: "ppr", recordType: "time", defaultSportIds: BIKE_SPORTS },
        { cat: "par", recordType: "time", defaultSportIds: RUN_SPORTS },
        { cat: "par", recordType: "time", sports: [SWIM_SPORT], defaultSportIds: [SWIM_SPORT] },
      ];

      for (const q of queries) {
        try {
          const records = await fetchRecords(accessToken, nolioId, q.cat, q.recordType, q.sports);
          for (const r of records) {
            const item_seconds = Number(r.item_seconds);
            const value = Number(r.value);
            const sport_id = Number(r.sport_id ?? r.sport ?? q.defaultSportIds[0]);
            if (!Number.isFinite(item_seconds) || !Number.isFinite(value) || !Number.isFinite(sport_id)) continue;
            rowsToUpsert.push({
              athlete_id: athleteId,
              nolio_athlete_id: nolioId,
              cat: q.cat,
              record_type: q.recordType,
              item_seconds,
              value,
              date_recorded: (r.date_recorded ?? r.date ?? null) as string | null,
              sport_id,
              synced_at: new Date().toISOString(),
            });
          }
        } catch (e) {
          errors.push(`${q.cat}/${q.recordType}: ${(e as Error).message}`);
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error: upErr } = await admin
          .from("nolio_records")
          .upsert(rowsToUpsert, {
            onConflict: "athlete_id,cat,record_type,item_seconds,sport_id",
          });
        if (upErr) {
          errors.push(`upsert: ${upErr.message}`);
        } else {
          totalImported += rowsToUpsert.length;
        }
      }

      summary.push({
        athlete: (ath as any).name ?? String(athleteId),
        imported: rowsToUpsert.length,
        errors,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        athletes_processed: athletes?.length ?? 0,
        total_records: totalImported,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("nolio-records error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
