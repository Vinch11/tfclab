// PROBE TEMPORAIRE — valide le repli natation en no_target + course de contrôle.
// À supprimer après validation.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_URL = "https://www.nolio.io/api/create/planned/training/";

async function refreshIfNeeded(admin: ReturnType<typeof createClient>, userId: string, cur: { access_token: string; refresh_token: string | null; expires_at: string | null }): Promise<string> {
  const expAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expAt && expAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const secret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!secret) return cur.access_token;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${secret}`);
  const r = await fetch(NOLIO_TOKEN_URL, { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: cur.refresh_token }).toString() });
  if (!r.ok) return cur.access_token;
  const j = await r.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!j?.access_token) return cur.access_token;
  await admin.from("nolio_tokens").update({ access_token: j.access_token, refresh_token: j.refresh_token ?? cur.refresh_token, expires_at: new Date(Date.now() + (j.expires_in ?? 86400) * 1000).toISOString() }).eq("user_id", userId);
  return j.access_token;
}

const paceKmToMs = (min: number, sec: number) => Number((1000 / (min * 60 + sec)).toFixed(3));

// (a) Natation — steps TOUS en no_target, description contient les allures /100m
const swim = {
  name: "[TEST-NOTARGET] Natation endurance 4x400",
  duration: 2400,
  description:
    "<b>🎯 Endurance seuil natation — pace /100m dans la fiche</b><br><br>" +
    "<b>🔥 ÉCHAUFFEMENT</b><ul><li>400m nage libre progressif 1:45→1:30/100m</li><li>4×50m éducatifs (15\" R)</li></ul>" +
    "<b>💪 CORPS DE SÉANCE</b><ul><li>4×400m à 1:25-1:30/100m (30\" R entre 400)</li></ul>" +
    "<b>🧘 RETOUR AU CALME</b><ul><li>200m souple 1:45/100m</li></ul>",
  structured_workout: [
    { type: "step", intensity_type: "warmup", step_duration_type: "distance", step_duration_value: 400, target_type: "no_target" },
    { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 60, target_type: "no_target" },
    { type: "repetition", value: 4, steps: [
      { type: "step", intensity_type: "active", step_duration_type: "distance", step_duration_value: 400, target_type: "no_target" },
      { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 30, target_type: "no_target" },
    ]},
    { type: "step", intensity_type: "cooldown", step_duration_type: "distance", step_duration_value: 200, target_type: "no_target" },
  ],
};

// (b) Course de contrôle inchangée
const run = {
  name: "[TEST-NOTARGET] Course 5x3min",
  duration: 2400,
  description: "<b>🎯 5x3min à allure seuil, R=90\" trot</b>",
  structured_workout: [
    { type: "step", intensity_type: "warmup", step_duration_type: "duration", step_duration_value: 600,
      target_type: "pace", target_value_min: paceKmToMs(6, 0), target_value_max: paceKmToMs(5, 30) },
    { type: "repetition", value: 5, steps: [
      { type: "step", intensity_type: "active", step_duration_type: "duration", step_duration_value: 180,
        target_type: "pace", target_value_min: paceKmToMs(4, 10), target_value_max: paceKmToMs(3, 55) },
      { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 90,
        target_type: "pace", target_value_min: paceKmToMs(7, 0), target_value_max: paceKmToMs(6, 0) },
    ]},
    { type: "step", intensity_type: "cooldown", step_duration_type: "duration", step_duration_value: 300,
      target_type: "pace", target_value_min: paceKmToMs(6, 30), target_value_max: paceKmToMs(6, 0) },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tokenRows } = await admin.from("nolio_tokens").select("user_id, access_token, refresh_token, expires_at").limit(1);
    const tokenRow = tokenRows?.[0];
    if (!tokenRow?.access_token) return new Response(JSON.stringify({ error: "Aucun token Nolio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = tokenRow.user_id as string;
    const token = await refreshIfNeeded(admin, userId, { access_token: tokenRow.access_token as string, refresh_token: (tokenRow.refresh_token as string | null) ?? null, expires_at: (tokenRow.expires_at as string | null) ?? null });

    const body = await req.json().catch(() => ({})) as { date?: string; nolio_athlete_id?: number };
    let athleteId = body.nolio_athlete_id;
    if (!athleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      athleteId = ath?.nolio_id as number | undefined;
    }
    if (!athleteId) return new Response(JSON.stringify({ error: "Aucun athlète" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const date = body.date ?? "2026-07-29";

    const specs = [
      { ...swim, date_start: date, sport_id: 19, id_partner: Date.now(),     athlete_id: athleteId },
      { ...run,  date_start: date, sport_id: 2,  id_partner: Date.now() + 1, athlete_id: athleteId },
    ];
    const results = [];
    for (const spec of specs) {
      const r = await fetch(NOLIO_CREATE_URL, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(spec) });
      const text = await r.text();
      let json: unknown = null; try { json = JSON.parse(text); } catch { /* keep */ }
      results.push({ name: spec.name, status: r.status, ok: r.ok, response: json ?? text });
    }
    return new Response(JSON.stringify({ athlete_id: athleteId, date, results }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
