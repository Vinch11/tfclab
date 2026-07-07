// Sonde Nolio — MODE DIAGNOSTIC
// Récupère les séances planifiées d'un athlète sur une plage de dates,
// et renvoie le JSON BRUT tel que Nolio le stocke — pour comparer :
//   - séance créée manuellement dans l'éditeur (source de vérité min/100m)
//   - séances envoyées par nolio-send-plan
// Aucune écriture / création. Body : { nolio_athlete_id?, date_start?, date_end? }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_GET_PLANNED_URL = "https://www.nolio.io/api/get/planned/training/";
const NOLIO_CREATE_PLANNED_URL = "https://www.nolio.io/api/create/planned/training/";
const NOLIO_DELETE_PLANNED_URL = "https://www.nolio.io/api/delete/planned/training/";

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  cur: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const secret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!secret) return cur.access_token;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${secret}`);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: cur.refresh_token });
  const resp = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!resp.ok) return cur.access_token;
  const j = await resp.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!j?.access_token) return cur.access_token;
  const newExp = new Date(Date.now() + (j.expires_in ?? 86400) * 1000).toISOString();
  await admin.from("nolio_tokens").update({
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? cur.refresh_token,
    expires_at: newExp,
  }).eq("user_id", userId);
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({})) as {
      nolio_athlete_id?: number;
      date_start?: string;
      date_end?: string;
      use_current_user?: boolean;
      mode?: "read" | "create_probe" | "delete_probe";
      id_partner?: number;
      target_type?: string;
      name?: string;
      with_values?: boolean;
    };
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tokenRow } = await admin.from("nolio_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    let nolioAthleteId = body.use_current_user ? undefined : body.nolio_athlete_id;
    if (!body.use_current_user && !nolioAthleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      nolioAthleteId = ath?.nolio_id as number | undefined;
    }
    if (!body.use_current_user && !nolioAthleteId) {
      return new Response(JSON.stringify({ error: "Aucun athlète Nolio lié — passe nolio_athlete_id en body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dateStart = body.date_start ?? "2026-07-01";
    const dateEnd = body.date_end ?? "2026-07-31";

    let create_probe: unknown = null;
    let delete_probe: unknown = null;
    if (body.mode === "delete_probe" && body.id_partner) {
      const payload: Record<string, unknown> = { id_partner: body.id_partner };
      if (nolioAthleteId) payload.athlete_id = nolioAthleteId;
      const dResp = await fetch(NOLIO_DELETE_PLANNED_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dRaw = await dResp.text();
      let dParsed: unknown = dRaw;
      try { dParsed = JSON.parse(dRaw); } catch { /* keep raw */ }
      delete_probe = { ok: dResp.ok, status: dResp.status, payload, response: dParsed };
    }
    if (body.mode === "create_probe") {
      const idPartner = body.id_partner ?? Number(`907${new Date().getUTCDate()}${new Date().getUTCHours()}${new Date().getUTCMinutes()}`);
      const payload: Record<string, unknown> = {
        id_partner: idPartner,
        sport_id: 19,
        name: body.name ?? `[PROBE] Nolio visible ${idPartner}`,
        date_start: dateStart,
        description: "Probe visibilité calendrier TFCLab",
        duration: 1200,
        structured_workout: [
          {
            type: "step",
            step_duration_type: "distance",
            step_duration_value: 50,
            intensity_type: "active",
            target_type: body.target_type ?? "no_target",
            ...(body.with_values === false ? {} : { target_value_min: 1.1111, target_value_max: 1.182 }),
          },
          {
            type: "step",
            step_duration_type: "distance",
            step_duration_value: 200,
            intensity_type: "active",
            target_type: body.target_type ?? "no_target",
            ...(body.with_values === false ? {} : { target_value_min: 1.1111, target_value_max: 1.182 }),
          },
        ],
      };
      if (nolioAthleteId) payload.athlete_id = nolioAthleteId;
      const cResp = await fetch(NOLIO_CREATE_PLANNED_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const cRaw = await cResp.text();
      let cParsed: unknown = cRaw;
      try { cParsed = JSON.parse(cRaw); } catch { /* keep raw */ }
      create_probe = { ok: cResp.ok, status: cResp.status, payload, response: cParsed };
    }

    const params = new URLSearchParams({ from: dateStart, to: dateEnd, limit: "100" });
    if (nolioAthleteId) params.set("athlete_id", String(nolioAthleteId));
    const url = `${NOLIO_GET_PLANNED_URL}?${params.toString()}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const raw = await resp.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { /* keep raw */ }

    // Extraction : ne garder que les séances natation (sport_id=19) ou celles dont le nom contient TEST/CSS/nat
    const list = Array.isArray(parsed) ? parsed : ((parsed as { results?: unknown[] })?.results ?? []);
    const swim = (list as Array<Record<string, unknown>>).filter((t) => {
      const sid = t.sport_id ?? t.sport ?? null;
      const name = String(t.name ?? "").toLowerCase();
      return sid === 19 || name.includes("nat") || name.includes("[test]") || name.includes("css");
    });

    return new Response(JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      nolio_athlete_id: nolioAthleteId,
      date_range: { start: dateStart, end: dateEnd },
      url,
      create_probe,
      delete_probe,
      swim_count: swim.length,
      swim_trainings_raw: swim,
      _total_returned: Array.isArray(list) ? list.length : 0,
    }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
