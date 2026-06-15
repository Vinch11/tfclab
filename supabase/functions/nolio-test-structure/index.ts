// Test edge function — envoie 3 variantes du structured_workout V3_BIKE_VO2_NORWEGIAN_4x8
// à Nolio pour identifier le champ qui cause le 400 "Structured workout format error".
// Logge chaque réponse dans nolio_sync_log avec label test_A / test_B / test_C.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_TRAINING_URL = "https://www.nolio.io/api/create/planned/training/";
const NOLIO_DELETE_TRAINING_URL = "https://www.nolio.io/api/delete/planned/training/";

const WORKOUT_ID = "V3_BIKE_VO2_NORWEGIAN_4x8";

type Step = Record<string, unknown>;

/** Supprime les clés dont la valeur est null ou undefined (récursivement). */
function stripNulls<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripNulls).filter((x) => x !== null && x !== undefined) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === null || val === undefined) continue;
      out[k] = stripNulls(val);
    }
    return out as unknown as T;
  }
  return v;
}

/** Renomme repeat_count -> value (spec Nolio officielle) sur tous les nœuds repetition. */
function fixRepetitionField(steps: Step[]): Step[] {
  return steps.map((s) => {
    if (s.type === "repetition") {
      const { repeat_count, steps: inner, ...rest } = s as { repeat_count?: number; steps?: Step[] };
      return {
        ...rest,
        type: "repetition",
        value: typeof repeat_count === "number" ? repeat_count : (rest as { value?: number }).value,
        steps: Array.isArray(inner) ? fixRepetitionField(inner as Step[]) : inner,
      };
    }
    return s;
  });
}

/** Variante A : retire tous les champs pct_* et garde target_value_min/max. Retire aussi target_value. */
function variantA(steps: Step[]): Step[] {
  return steps.map((s) => {
    const out: Step = { ...s };
    for (const k of Object.keys(out)) {
      if (k.startsWith("pct_") || k === "target_value") delete out[k];
    }
    if (Array.isArray((out as { steps?: Step[] }).steps)) {
      (out as { steps: Step[] }).steps = variantA((out as { steps: Step[] }).steps);
    }
    return out;
  });
}

/** Variante B : retire target_value_min/max/value, garde uniquement les pct_*. */
function variantB(steps: Step[]): Step[] {
  return steps.map((s) => {
    const out: Step = { ...s };
    for (const k of Object.keys(out)) {
      if (k === "target_value_min" || k === "target_value_max" || k === "target_value") delete out[k];
    }
    if (Array.isArray((out as { steps?: Step[] }).steps)) {
      (out as { steps: Step[] }).steps = variantB((out as { steps: Step[] }).steps);
    }
    return out;
  });
}

/** Variante C : target_type "power" -> "watt", garde tout le reste (mais retire target_value singulier). */
function variantC(steps: Step[]): Step[] {
  return steps.map((s) => {
    const out: Step = { ...s };
    if (out.target_type === "power") out.target_type = "watt";
    if ("target_value" in out) delete out.target_value;
    if (Array.isArray((out as { steps?: Step[] }).steps)) {
      (out as { steps: Step[] }).steps = variantC((out as { steps: Step[] }).steps);
    }
    return out;
  });
}

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
  const detail = isJson ? JSON.stringify(parsed) : (await resp.text()).slice(0, 500);
  return { ok: resp.ok, status: resp.status, detail, data: parsed };
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

    const body = await req.json().catch(() => ({})) as { nolio_athlete_id?: number };
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Récupère le token Nolio
    const { data: tokenRow } = await admin.from("nolio_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Récupère le structured_workout généré pour V3_BIKE_VO2_NORWEGIAN_4x8
    const { data: gen } = await admin
      .from("nolio_structures_generated")
      .select("structured_workout, sport_id")
      .eq("workout_id", WORKOUT_ID)
      .maybeSingle();
    if (!gen || !Array.isArray(gen.structured_workout)) {
      return new Response(JSON.stringify({ error: `Pas de structure générée pour ${WORKOUT_ID}` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const baseSteps = gen.structured_workout as Step[];
    const sportId = (gen.sport_id as number) ?? 14;

    // 3) Récupère l'athlète Nolio cible (premier athlète lié si non fourni)
    let nolioAthleteId = body.nolio_athlete_id;
    if (!nolioAthleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      nolioAthleteId = ath?.nolio_id as number | undefined;
    }
    if (!nolioAthleteId) {
      return new Response(JSON.stringify({ error: "Aucun athlète Nolio lié — passe nolio_athlete_id en body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4) Build des 3 variantes (avec normalisation spec : repeat_count -> value, strip nulls)
    const normalize = (steps: Step[]) => stripNulls(fixRepetitionField(steps));
    const variants: Array<{ label: string; structured_workout: Step[]; transform: string }> = [
      { label: "test_A", structured_workout: normalize(variantA(baseSteps)), transform: "strip pct_*, target_value | keep target_value_min/max" },
      { label: "test_B", structured_workout: normalize(variantB(baseSteps)), transform: "strip target_value_min/max/value | keep pct_*" },
      { label: "test_C", structured_workout: normalize(variantC(baseSteps)), transform: "target_type power -> watt" },
    ];

    const sessions: unknown[] = [];
    const dateStart = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

    for (const v of variants) {
      // id_partner unique par variante pour éviter collisions
      const idPartner = Number(`${Date.now()}${v.label === "test_A" ? 1 : v.label === "test_B" ? 2 : 3}`.slice(-15));

      // Best-effort delete au cas où
      await postNolio(NOLIO_DELETE_TRAINING_URL, token, { id_partner: idPartner, athlete_id: nolioAthleteId }).catch(() => null);

      const payload = {
        id_partner: idPartner,
        athlete_id: nolioAthleteId,
        sport_id: sportId,
        name: `[${v.label}] ${WORKOUT_ID}`,
        date_start: dateStart,
        description: `Test variante: ${v.transform}`,
        structured_workout: v.structured_workout,
      };

      const res = await postNolio(NOLIO_CREATE_TRAINING_URL, token, payload);
      sessions.push({
        label: v.label,
        transform: v.transform,
        id_partner: idPartner,
        payload_sent: payload,
        response: res,
      });
    }

    const winner = sessions.find((s) => (s as { response: { ok: boolean } }).response.ok) as { label: string } | undefined;
    const summary = sessions.map((s) => {
      const x = s as { label: string; response: { ok: boolean; status: number; detail: string } };
      return `${x.label}: ${x.response.status}${x.response.ok ? " ✅" : " ❌"} ${x.response.detail.slice(0, 200)}`;
    }).join("\n");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: 0,
      status: winner ? "success" : "error",
      error_message: winner ? `WINNER: ${winner.label}` : "All 3 variants failed",
      notes: JSON.stringify({ workout_id: WORKOUT_ID, nolio_athlete_id: nolioAthleteId, sport_id: sportId, sessions }).slice(0, 20000),
    });

    return new Response(JSON.stringify({
      ok: true,
      workout_id: WORKOUT_ID,
      winner: winner?.label ?? null,
      summary,
      sessions,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
