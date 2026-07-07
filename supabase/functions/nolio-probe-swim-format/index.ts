// PROBE TEMPORAIRE — envoie 3 séances de test à Nolio pour valider le nouveau
// format natation `min/100m` + `manual_values:true` + `name:"pace_min100"`.
// À SUPPRIMER après validation visuelle sur desktop Nolio.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_URL = "https://www.nolio.io/api/create/planned/training/";

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  cur: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expAt && expAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const secret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!secret) return cur.access_token;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${secret}`);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: cur.refresh_token });
  const r = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!r.ok) return cur.access_token;
  const j = await r.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!j?.access_token) return cur.access_token;
  const newExp = new Date(Date.now() + (j.expires_in ?? 86400) * 1000).toISOString();
  await admin.from("nolio_tokens").update({
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? cur.refresh_token,
    expires_at: newExp,
  }).eq("user_id", userId);
  return j.access_token;
}

// Format 100m/min pace : 1'24/100m = 84s/100m = 100/84 m/s = 1.1905 m/s
const pacePer100 = (min: number, sec: number) => Number((100 / (min * 60 + sec)).toFixed(10));

// (a) Natation intervalles : même allure cible sur 50m ET 200m → doit afficher le MÊME pace
const swim_a = {
  name: "[TEST-FORMAT] Nat 50+200 même allure",
  duration: 1800,
  structured_workout: [
    { type: "step", intensity_type: "warmup", step_duration_type: "distance", step_duration_value: 300, target_type: "no_target" },
    { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 60, target_type: "no_target" },
    { type: "step", intensity_type: "active", step_duration_type: "distance", step_duration_value: 50,
      target_type: "min/100m", manual_values: true, name: "pace_min100",
      target_value_min: pacePer100(1, 30), target_value_max: pacePer100(1, 24) },
    { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 30, target_type: "no_target" },
    { type: "step", intensity_type: "active", step_duration_type: "distance", step_duration_value: 200,
      target_type: "min/100m", manual_values: true, name: "pace_min100",
      target_value_min: pacePer100(1, 30), target_value_max: pacePer100(1, 24) },
    { type: "step", intensity_type: "cooldown", step_duration_type: "distance", step_duration_value: 200, target_type: "no_target" },
  ],
};

// (b) Natation endurance avec repos : actifs en min/100m, repos SANS empty_unit
const swim_b = {
  name: "[TEST-FORMAT] Nat endurance + repos",
  duration: 2400,
  structured_workout: [
    { type: "step", intensity_type: "warmup", step_duration_type: "distance", step_duration_value: 400, target_type: "no_target" },
    { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 60, target_type: "no_target" },
    { type: "repetition", value: 4, steps: [
      { type: "step", intensity_type: "active", step_duration_type: "distance", step_duration_value: 400,
        target_type: "min/100m", manual_values: true, name: "pace_min100",
        target_value_min: pacePer100(1, 45), target_value_max: pacePer100(1, 35) },
      { type: "step", intensity_type: "rest", step_duration_type: "duration", step_duration_value: 30, target_type: "no_target" },
    ]},
    { type: "step", intensity_type: "cooldown", step_duration_type: "distance", step_duration_value: 200, target_type: "no_target" },
  ],
};

// (c) Course contrôle : inchangée (pace m/s classique)
const paceKmToMs = (min: number, sec: number) => Number((1000 / (min * 60 + sec)).toFixed(3));
const run_c = {
  name: "[TEST-FORMAT] Course 5x3min",
  duration: 2400,
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
    // PROBE : on prend l'unique coach ayant un token Nolio (service role bypass RLS).
    const { data: tokenRows, error: tokErr } = await admin.from("nolio_tokens")
      .select("user_id, access_token, refresh_token, expires_at")
      .limit(1);
    const tokenRow = tokenRows?.[0];
    if (!tokenRow?.access_token) return new Response(JSON.stringify({ error: "Aucun token Nolio en base", tokErr, rows_count: tokenRows?.length ?? 0 }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userId = tokenRow.user_id as string;
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });


    const body = await req.json().catch(() => ({})) as { nolio_athlete_id?: number; date?: string };
    let athleteId = body.nolio_athlete_id;
    if (!athleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      athleteId = ath?.nolio_id as number | undefined;
    }
    if (!athleteId) return new Response(JSON.stringify({ error: "Aucun athlète Nolio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const date = body.date ?? "2026-07-28";
    const dates = [date, date, date]; // 3 séances même jour

    const specs = [
      { ...swim_a, date_start: dates[0], sport_id: 19, id_partner: `test-format-swim-a-${Date.now()}`, athlete_id: athleteId, description: "TEST FORMAT: 50m et 200m doivent afficher LE MÊME pace min/100m" },
      { ...swim_b, date_start: dates[1], sport_id: 19, id_partner: `test-format-swim-b-${Date.now()}`, athlete_id: athleteId, description: "TEST FORMAT: repos SANS empty_unit" },
      { ...run_c,  date_start: dates[2], sport_id: 2,  id_partner: `test-format-run-c-${Date.now()}`,  athlete_id: athleteId, description: "TEST FORMAT: course contrôle inchangée" },
    ];

    const results = [];
    for (const spec of specs) {
      const r = await fetch(NOLIO_CREATE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(spec),
      });
      const text = await r.text();
      let json: unknown = null; try { json = JSON.parse(text); } catch { /* keep */ }
      results.push({ name: spec.name, status: r.status, ok: r.ok, response: json ?? text, sent: spec });
    }

    return new Response(JSON.stringify({ athlete_id: athleteId, results }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
