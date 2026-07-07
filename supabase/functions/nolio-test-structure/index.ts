// Sonde Nolio — 3 séances minimales pour tester le rendu de `description`.
// TEST HTML     : description avec balises <b>, <br>, <ul>, <li>, <i>.
// TEST MARKDOWN : description avec **, listes -, *italic*.
// TEST TEXTE    : description avec émojis + bullets Unicode (contrôle).
// Aucune conversion / normalisation maison — descriptions envoyées telles quelles.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_TRAINING_URL = "https://www.nolio.io/api/create/planned/training/";
const NOLIO_DELETE_TRAINING_URL = "https://www.nolio.io/api/delete/planned/training/";

const RUN_SPORT_ID = 2;

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

type Probe = {
  label: string;
  hypothesis: string;
  description: string;
};

function buildProbes(): Probe[] {
  return [
    {
      label: "SONDE_FICHE_HTML",
      hypothesis: "description en HTML — Nolio rend-il <b>/<br>/<ul>/<li>/<i> ?",
      description: "<b>ÉCHAUFFEMENT</b><br><ul><li>20' progressif Z1-Z2</li></ul><br><i>Variante Ironman</i>",
    },
    {
      label: "SONDE_FICHE_MARKDOWN",
      hypothesis: "description en Markdown — Nolio rend-il ** listes - et *italic* ?",
      description: "**ÉCHAUFFEMENT**\n- 20' progressif Z1-Z2\n\n*Variante Ironman*",
    },
    {
      label: "SONDE_FICHE_TEXTE",
      hypothesis: "description en texte brut avec émojis + bullets Unicode (contrôle)",
      description: "🔥 ÉCHAUFFEMENT\n• 20' progressif Z1-Z2\n\nVariante Ironman",
    },
  ];
}

// Step neutre pour toutes les sondes — on teste la description, pas le step.
const NEUTRAL_STEP = {
  type: "step",
  step_duration_type: "time",
  step_duration_value: 300, // 5 min
  intensity_type: "active",
  target_type: "no_target",
};

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

    // 1) Token Nolio
    const { data: tokenRow } = await admin.from("nolio_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Athlète cible
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

      // Best-effort delete si collision
      await postNolio(NOLIO_DELETE_TRAINING_URL, token, { id_partner: idPartner, athlete_id: nolioAthleteId }).catch(() => null);

      const payload = {
        id_partner: idPartner,
        athlete_id: nolioAthleteId,
        sport_id: RUN_SPORT_ID,
        name: `[SONDE] ${p.label}`,
        date_start: dateStart,
        description: `Hypothèse: ${p.hypothesis}. Payload envoyée brute, sans normalisation.`,
        structured_workout: [p.step],
      };

      const res = await postNolio(NOLIO_CREATE_TRAINING_URL, token, payload);
      results.push({
        label: p.label,
        hypothesis: p.hypothesis,
        id_partner: idPartner,
        payload_sent: payload,
        response: res,
      });
    }

    const summary = results.map((s) => {
      const x = s as { label: string; response: { ok: boolean; status: number; detail: string } };
      return `${x.label}: ${x.response.status}${x.response.ok ? " ✅ ACCEPTÉ" : " ❌ REJETÉ"} — ${x.response.detail.slice(0, 300)}`;
    }).join("\n");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: 0,
      status: "success",
      error_message: "SONDE step_percent",
      notes: JSON.stringify({ nolio_athlete_id: nolioAthleteId, sport_id: RUN_SPORT_ID, date_start: dateStart, results }).slice(0, 20000),
    });

    return new Response(JSON.stringify({
      ok: true,
      nolio_athlete_id: nolioAthleteId,
      sport_id: RUN_SPORT_ID,
      date_start: dateStart,
      summary,
      results,
    }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
