// Sonde temporaire Nolio — création de variantes natation pour identifier
// le seul format CREATE qui se relit correctement côté Nolio.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_TRAINING_URL = "https://www.nolio.io/api/create/planned/training/";
const NOLIO_GET_PLANNED_URL = "https://www.nolio.io/api/get/planned/training/";

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

    const body = await req.json().catch(() => ({})) as { nolio_athlete_id?: number; date_start?: string };
    if (!body.nolio_athlete_id) {
      return new Response(JSON.stringify({ error: "nolio_athlete_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const start = body.date_start ?? "2026-07-24";
    const base = Date.parse(`${start}T00:00:00Z`);
    const ymd = (offset: number) => new Date(base + offset * 86400000).toISOString().slice(0, 10);
    const target = { target_value_min: 1.1111, target_value_max: 1.1765, manual_values: true };
    const targetKmh = { target_value_min: 4.0, target_value_max: 4.235, manual_values: true };
    const variants = [
      { key: "A", label: "type-min100-name-pace", step: { target_type: "min/100m", name: "pace", ...target } },
      { key: "B", label: "type-min100-name-min100", step: { target_type: "min/100m", name: "min/100m", ...target } },
      { key: "C", label: "type-pace-name-min100", step: { target_type: "pace", name: "min/100m", ...target } },
      { key: "D", label: "type-pace-no-name", step: { target_type: "pace", ...target } },
      { key: "E", label: "type-speed-kmh", step: { target_type: "speed", name: "speed", ...targetKmh } },
      { key: "F", label: "type-speed-ms", step: { target_type: "speed", name: "min/100m", ...target } },
      { key: "G", label: "type-min100-space", step: { target_type: "min/100 m", name: "min/100m", ...target } },
      { key: "H", label: "type-sec100", step: { target_type: "sec/100m", name: "sec/100m", ...target } },
    ];

    const created: unknown[] = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const payload = {
        id_partner: Number(`${body.nolio_athlete_id}99${i}${new Date().getUTCDate()}`),
        athlete_id: body.nolio_athlete_id,
        sport_id: 19,
        name: `[PROBE] Swim ${v.key} ${v.label}`,
        date_start: ymd(i),
        duration: 600,
        description: "debug swim target_type variants",
        structured_workout: [
          {
            type: "step",
            intensity_type: "active",
            step_duration_type: "distance",
            step_duration_value: 100,
            ...v.step,
          },
        ],
      };
      const resp = await fetch(NOLIO_CREATE_TRAINING_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await resp.text();
      created.push({ key: v.key, ok: resp.ok, status: resp.status, raw, payload });
    }

    const params = new URLSearchParams({ from: ymd(0), to: ymd(variants.length - 1), limit: "100", athlete_id: String(body.nolio_athlete_id) });
    const getResp = await fetch(`${NOLIO_GET_PLANNED_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const getRaw = await getResp.text();
    const parsed = JSON.parse(getRaw);
    const list = Array.isArray(parsed) ? parsed : (parsed?.results ?? []);
    const probes = list.filter((t: Record<string, unknown>) => String(t.name ?? "").startsWith("[PROBE] Swim"));

    return new Response(JSON.stringify({ created, probes }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});