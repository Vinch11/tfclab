// Nolio Sync — récupère les athlètes Nolio et fusionne dans public.athletes
// Stratégie : ne JAMAIS écraser les champs non fournis par Nolio.
// Matching : par refs.nolio_id si déjà connu, sinon par nom (insensible à la casse).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_ATHLETES_URL = "https://www.nolio.io/api/get/athletes/";
const NOLIO_TRAINING_URL = "https://www.nolio.io/api/get/training/";
const NOLIO_METRIC_URL = "https://www.nolio.io/api/get/metric/";

type NolioAthlete = {
  id?: string | number;
  uuid?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  birth_date?: string;
  birthdate?: string;
  date_of_birth?: string;
  sex?: string;
  gender?: string;
  vo2max?: number;
  weight?: number;
  goal?: string;
  [k: string]: unknown;
};

function normName(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

function pickName(a: NolioAthlete): string | null {
  if (a.full_name) return String(a.full_name).trim();
  if (a.name) return String(a.name).trim();
  const fn = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
  return fn || null;
}

function pickBirthDate(a: NolioAthlete): string | null {
  const raw = a.birth_date ?? a.birthdate ?? a.date_of_birth;
  if (!raw) return null;
  const s = String(raw);
  // garde YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function pickSex(a: NolioAthlete): string | null {
  const raw = (a.sex ?? a.gender) as string | undefined;
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  if (v.startsWith("m") || v === "homme" || v === "male") return "M";
  if (v.startsWith("f") || v === "femme" || v === "female") return "F";
  return null;
}

function pickNolioId(a: NolioAthlete): string | null {
  const raw = a.uuid ?? a.id;
  return raw == null ? null : String(raw);
}

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
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(jwt);
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

    // 1) Récupère le token Nolio
    const { data: tokenRow, error: tokErr } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (tokErr) {
      console.error("nolio-sync token select error", tokErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tokenRow?.access_token) {
      return new Response(
        JSON.stringify({ error: "Nolio non connecté" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Appelle l'API Nolio
    const nolioResp = await fetch(NOLIO_ATHLETES_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const nolioText = await nolioResp.text();
    if (!nolioResp.ok) {
      console.error("nolio athletes fetch failed", nolioResp.status, nolioText);
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: `Nolio API ${nolioResp.status}: ${nolioText.slice(0, 500)}`,
      });
      return new Response(
        JSON.stringify({
          error: "Échec de l'appel à l'API Nolio",
          status: nolioResp.status,
          body: nolioText.slice(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let nolioJson: unknown;
    try {
      nolioJson = JSON.parse(nolioText);
    } catch {
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: "Réponse Nolio non-JSON",
      });
      return new Response(JSON.stringify({ error: "Réponse Nolio invalide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tolère plusieurs formats : [], {results:[]}, {data:[]}, {athletes:[]}
    const nolioAthletes: NolioAthlete[] = Array.isArray(nolioJson)
      ? (nolioJson as NolioAthlete[])
      : Array.isArray((nolioJson as { results?: unknown })?.results)
        ? ((nolioJson as { results: NolioAthlete[] }).results)
        : Array.isArray((nolioJson as { data?: unknown })?.data)
          ? ((nolioJson as { data: NolioAthlete[] }).data)
          : Array.isArray((nolioJson as { athletes?: unknown })?.athletes)
            ? ((nolioJson as { athletes: NolioAthlete[] }).athletes)
            : [];

    // 3) Charge les athlètes existants du coach
    const { data: existing, error: athErr } = await admin
      .from("athletes")
      .select("id, name, refs, birth_date, sex, vo2max, goal")
      .eq("coach_id", userId);

    if (athErr) {
      console.error("nolio-sync athletes select", athErr);
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const byNolioId = new Map<string, typeof existing[number]>();
    const byName = new Map<string, typeof existing[number]>();
    for (const a of existing ?? []) {
      const refs = (a.refs ?? {}) as Record<string, unknown>;
      const nolioId = refs.nolio_id != null ? String(refs.nolio_id) : null;
      if (nolioId) byNolioId.set(nolioId, a);
      const n = normName(a.name);
      if (n) byName.set(n, a);
    }

    let updated = 0;
    let inserted = 0;
    const errors: string[] = [];

    for (const na of nolioAthletes) {
      try {
        const name = pickName(na);
        if (!name) continue;
        const nolioId = pickNolioId(na);
        const birth = pickBirthDate(na);
        const sex = pickSex(na);
        const vo2max =
          typeof na.vo2max === "number" && Number.isFinite(na.vo2max)
            ? na.vo2max
            : null;
        const goal = typeof na.goal === "string" ? na.goal : null;

        const match =
          (nolioId && byNolioId.get(nolioId)) ||
          byName.get(normName(name)) ||
          null;

        // Fusion refs : on garde l'existant et on ajoute / écrase uniquement les clés Nolio.
        const baseRefs = (match?.refs ?? {}) as Record<string, unknown>;
        const mergedRefs: Record<string, unknown> = {
          ...baseRefs,
          nolio: { ...(baseRefs.nolio as Record<string, unknown> ?? {}), ...na },
        };
        if (nolioId) mergedRefs.nolio_id = nolioId;

        if (match) {
          // Mise à jour : ne JAMAIS écraser un champ existant non fourni par Nolio.
          const patch: Record<string, unknown> = { refs: mergedRefs };
          if (birth && !match.birth_date) patch.birth_date = birth;
          if (sex && !match.sex) patch.sex = sex;
          if (vo2max != null && match.vo2max == null) patch.vo2max = vo2max;
          if (goal && !match.goal) patch.goal = goal;
          // name : on ne le change pas pour éviter d'écraser un nom déjà saisi.

          const { error: upErr } = await admin
            .from("athletes")
            .update(patch)
            .eq("id", match.id);
          if (upErr) {
            errors.push(`update ${match.id}: ${upErr.message}`);
          } else {
            updated += 1;
          }
        } else {
          // Création : nouvel athlète rattaché au coach.
          const insertRow: Record<string, unknown> = {
            coach_id: userId,
            name,
            refs: mergedRefs,
          };
          if (birth) insertRow.birth_date = birth;
          if (sex) insertRow.sex = sex;
          if (vo2max != null) insertRow.vo2max = vo2max;
          if (goal) insertRow.goal = goal;

          const { error: insErr } = await admin
            .from("athletes")
            .insert(insertRow);
          if (insErr) {
            errors.push(`insert ${name}: ${insErr.message}`);
          } else {
            inserted += 1;
          }
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }

    const totalTouched = updated + inserted;
    const status = errors.length === 0 ? "success" : (totalTouched > 0 ? "partial" : "error");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: totalTouched,
      status,
      error_message: errors.length ? errors.slice(0, 5).join(" | ").slice(0, 1000) : null,
    });

    return new Response(
      JSON.stringify({
        ok: status !== "error",
        athletes_count: totalTouched,
        updated,
        inserted,
        received: nolioAthletes.length,
        status,
        errors: errors.slice(0, 5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("nolio-sync fatal", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
