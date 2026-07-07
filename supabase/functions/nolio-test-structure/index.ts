// Sonde Nolio — 3 séances NATATION pour identifier le format d'allure /100m accepté.
// Hypothèses testées :
//   SWIM_A : target_type="pace", target_value en SEC/100m brut (90/85)
//   SWIM_B : target_type="pace", target_value en m/s (contrôle actuel — échoue en min/km)
//   SWIM_C : target_type="speed", target_value en m/s
// Aucune normalisation maison — payloads envoyés tels quels.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_TRAINING_URL = "https://www.nolio.io/api/create/planned/training/";
const NOLIO_DELETE_TRAINING_URL = "https://www.nolio.io/api/delete/planned/training/";
const NOLIO_GET_TRAINING_URL = "https://www.nolio.io/api/get/training/";

const SWIM_SPORT_ID = 19;

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

async function postNolio(url: string, token: string, payload: Record<string, unknown>) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const ctype = resp.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json");
  const parsed = isJson ? await resp.json().catch(() => null) : null;
  const detail = isJson ? JSON.stringify(parsed) : (await resp.text()).slice(0, 800);
  return { ok: resp.ok, status: resp.status, detail, data: parsed };
}

async function getNolio(url: string, token: string) {
  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const ctype = resp.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json");
  const parsed = isJson ? await resp.json().catch(() => null) : null;
  return { ok: resp.ok, status: resp.status, data: parsed };
}

type Probe = {
  label: string;
  hypothesis: string;
  step: Record<string, unknown>;
};

function buildProbes(): Probe[] {
  const mkSpeedStep = (distance: number) => ({
    type: "step",
    step_duration_type: "distance",
    step_duration_value: distance,
    intensity_type: "active",
    target_type: "speed",
    target_value: 1.143,
    target_value_min: 1.111, // 1:30/100m
    target_value_max: 1.176, // 1:25/100m
  });
  return [
    {
      label: "SONDE_DIST_50",
      hypothesis: "speed m/s 1.111-1.176 sur 50m — pace affiché doit rester ~1:25-1:30/100m si absolu",
      step: mkSpeedStep(50),
    },
    {
      label: "SONDE_DIST_100",
      hypothesis: "speed m/s 1.111-1.176 sur 100m — contrôle",
      step: mkSpeedStep(100),
    },
    {
      label: "SONDE_DIST_400",
      hypothesis: "speed m/s 1.111-1.176 sur 400m — pace doit rester ~1:25-1:30/100m si absolu",
      step: mkSpeedStep(400),
    },
  ];
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

    const body = await req.json().catch(() => ({})) as { nolio_athlete_id?: number; date_start?: string };
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

    let nolioAthleteId = body.nolio_athlete_id;
    if (!nolioAthleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      nolioAthleteId = ath?.nolio_id as number | undefined;
    }
    if (!nolioAthleteId) {
      return new Response(JSON.stringify({ error: "Aucun athlète Nolio lié — passe nolio_athlete_id en body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dateStart = body.date_start ?? new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
    const probes = buildProbes();
    const results: unknown[] = [];

    for (let i = 0; i < probes.length; i++) {
      const p = probes[i];
      const idPartner = Number(`${Date.now()}${i + 1}`.slice(-15));

      await postNolio(NOLIO_DELETE_TRAINING_URL, token, { id_partner: idPartner, athlete_id: nolioAthleteId }).catch(() => null);

      const payload = {
        id_partner: idPartner,
        athlete_id: nolioAthleteId,
        sport_id: SWIM_SPORT_ID,
        name: `[${p.label}]`,
        date_start: dateStart,
        description: `Sonde natation — ${p.hypothesis}`,
        structured_workout: [p.step],
      };

      const res = await postNolio(NOLIO_CREATE_TRAINING_URL, token, payload);
      results.push({
        label: p.label,
        hypothesis: p.hypothesis,
        id_partner: idPartner,
        session_sport_id: SWIM_SPORT_ID,
        step_sent: p.step,
        payload_sent: payload,
        response: res,
      });
    }

    // Bonus : lit une séance natation existante de Nolio pour vérifier le format qu'elle utilise.
    const existingSwim = await getNolio(
      `${NOLIO_GET_TRAINING_URL}?athlete_id=${nolioAthleteId}&sport_id=${SWIM_SPORT_ID}&limit=3`,
      token,
    ).catch(() => null);

    const summary = results.map((s) => {
      const x = s as { label: string; response: { ok: boolean; status: number; detail: string } };
      return `${x.label}: ${x.response.status}${x.response.ok ? " ✅ ACCEPTÉ" : " ❌ REJETÉ"} — ${x.response.detail.slice(0, 300)}`;
    }).join("\n");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: 0,
      status: "success",
      error_message: "SONDE swim pace format",
      notes: JSON.stringify({ nolio_athlete_id: nolioAthleteId, sport_id: SWIM_SPORT_ID, date_start: dateStart, results, existingSwim }).slice(0, 20000),
    });

    return new Response(JSON.stringify({
      ok: true,
      nolio_athlete_id: nolioAthleteId,
      sport_id_used: SWIM_SPORT_ID,
      date_start: dateStart,
      summary,
      results,
      existing_swim_from_nolio: existingSwim,
    }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
