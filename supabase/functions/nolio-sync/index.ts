// Nolio Sync — récupère les athlètes Nolio du coach et renseigne `athletes.nolio_id`.
// Endpoints officiels (slash final obligatoire) :
//   - GET https://www.nolio.io/api/get/athletes/?wants_coach=false
// /get/training/ et /get/metric/ ne sont pas encore appelés (autorisation en cours).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_ATHLETES_URL = "https://www.nolio.io/api/get/athletes/?wants_coach=false&limit=300";

type NolioAthlete = {
  nolio_id: number;
  name?: string;
  teams?: unknown[];
};

function normName(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
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

  // Optional body: { athlete_id?: string, nolio_id?: number }
  let requestedAthleteId: string | null = null;
  let requestedNolioId: number | null = null;
  try {
    if (req.method !== "GET") {
      const body = await req.clone().json().catch(() => null) as
        | { athlete_id?: string; nolio_id?: number | string }
        | null;
      if (body?.athlete_id) requestedAthleteId = String(body.athlete_id);
      if (body?.nolio_id != null) {
        const n = Number(body.nolio_id);
        if (Number.isFinite(n)) requestedNolioId = n;
      }
    }
  } catch { /* noop */ }


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

    const diagnosticLogs: string[] = [];
    const log = (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      console.log(line);
      diagnosticLogs.push(line);
    };

    // 1) Token diagnostics
    const tokenExpiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at as string).getTime() : 0;
    const isExpired = tokenExpiresAt ? tokenExpiresAt < Date.now() : true;
    log(`STEP 1 — Token présent: ${!!tokenRow.access_token}, expires_at: ${tokenRow.expires_at}, expiré: ${isExpired}, refresh_token présent: ${!!tokenRow.refresh_token}`);

    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });
    log(`STEP 1b — Token utilisé (préfixe): ${accessToken.slice(0, 12)}... (longueur: ${accessToken.length})`);

    // 2) Appelle l'API Nolio — athlètes du coach
    log(`STEP 2 — GET ${NOLIO_ATHLETES_URL}`);
    const nolioResp = await fetch(NOLIO_ATHLETES_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const nolioText = await nolioResp.text();
    log(`STEP 2b — Réponse Nolio HTTP ${nolioResp.status}, body length=${nolioText.length}, body (first 4000 chars): ${nolioText.slice(0, 4000)}`);
    if (!nolioResp.ok) {
      console.error("nolio athletes fetch failed", nolioResp.status, nolioText);
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: `Nolio API ${nolioResp.status}: ${nolioText.slice(0, 500)}`,
        notes: diagnosticLogs.join("\n").slice(0, 20000),
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
        notes: diagnosticLogs.join("\n").slice(0, 20000),
      });
      return new Response(JSON.stringify({ error: "Réponse Nolio invalide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // L'API renvoie un tableau d'objets { nolio_id, name, teams }
    const nolioAthletes: NolioAthlete[] = Array.isArray(nolioJson)
      ? (nolioJson as NolioAthlete[])
      : Array.isArray((nolioJson as { results?: unknown })?.results)
        ? ((nolioJson as { results: NolioAthlete[] }).results)
        : [];

    // 3) Nombre d'athlètes reçus
    log(`STEP 3 — ${nolioAthletes.length} athlètes reçus de Nolio`);

    // 4) Charge les athlètes existants du coach
    const { data: existing, error: athErr } = await admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId);

    if (athErr) {
      console.error("nolio-sync athletes select", athErr);
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: `DB error athletes: ${athErr.message}`,
        notes: diagnosticLogs.join("\n").slice(0, 20000),
      });
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log(`STEP 4 — ${existing?.length ?? 0} athlètes TFCLab pour ce coach: ${(existing ?? []).map(a => `"${a.name}" (nolio_id=${a.nolio_id ?? "null"})`).join(", ")}`);

    const byNolioId = new Map<number, typeof existing[number]>();
    const byName = new Map<string, typeof existing[number]>();
    for (const a of existing ?? []) {
      if (a.nolio_id != null) byNolioId.set(Number(a.nolio_id), a);
      const n = normName(a.name);
      if (n) byName.set(n, a);
    }

    let updated = 0;
    const errors: string[] = [];

    // Si un athlète spécifique est demandé, restreindre la liste Nolio à celui-ci
    let targetAthleteName: string | null = null;
    let nolioAthletesScoped = nolioAthletes;
    if (requestedAthleteId || requestedNolioId != null) {
      const targetTfcl = (existing ?? []).find(a =>
        (requestedAthleteId && a.id === requestedAthleteId) ||
        (requestedNolioId != null && Number(a.nolio_id) === requestedNolioId)
      );
      targetAthleteName = targetTfcl?.name ?? null;
      const targetNolioId = requestedNolioId ?? (targetTfcl?.nolio_id != null ? Number(targetTfcl.nolio_id) : null);
      nolioAthletesScoped = nolioAthletes.filter(na => Number(na.nolio_id) === targetNolioId);
      log(`SCOPE — athlète unique demandé (id=${requestedAthleteId}, nolio_id=${targetNolioId}, name=${targetAthleteName}) → ${nolioAthletesScoped.length} match Nolio`);
    }

    // 5) Matching détaillé
    for (const na of nolioAthletesScoped) {
      try {
        const nolioId = typeof na.nolio_id === "number" ? na.nolio_id : Number(na.nolio_id);
        const name = (na.name ?? "").trim();
        if (!Number.isFinite(nolioId)) {
          log(`  ↳ Nolio athlète name="${name}" nolio_id INVALIDE (${na.nolio_id}) — skip`);
          continue;
        }

        const matchById = byNolioId.get(nolioId);
        const matchByName = name ? byName.get(normName(name)) : undefined;
        const match = matchById || matchByName || null;

        if (!match) {
          log(`  ↳ Nolio athlète "${name}" (nolio_id=${nolioId}) — AUCUN MATCH TFCLab`);
          continue;
        }
        if (match.nolio_id === nolioId) {
          log(`  ↳ Nolio athlète "${name}" (nolio_id=${nolioId}) — match TFCLab "${match.name}" déjà à jour`);
          continue;
        }

        const matchVia = matchById ? "nolio_id" : "name";
        log(`  ↳ Nolio athlète "${name}" (nolio_id=${nolioId}) — MATCH TFCLab "${match.name}" via ${matchVia} → update`);

        const { error: upErr } = await admin
          .from("athletes")
          .update({ nolio_id: nolioId })
          .eq("id", match.id);
        if (upErr) {
          errors.push(`update ${match.id}: ${upErr.message}`);
          log(`    ✗ update KO: ${upErr.message}`);
        } else {
          updated += 1;
          log(`    ✓ update OK`);
        }
      } catch (e) {
        errors.push((e as Error).message);
        log(`  ↳ exception: ${(e as Error).message}`);
      }
    }

    log(`STEP 5 — Bilan: ${updated} mis à jour, ${errors.length} erreurs`);

    // STEP 5b — Diagnostic : sport_id réels Nolio sur plusieurs athlètes
    try {
      const candidates = (nolioAthletesScoped.length ? nolioAthletesScoped : nolioAthletes)
        .filter(a => Number.isFinite(Number(a.nolio_id)))
        .slice(0, 6);
      const sportIdMap = new Map<number, string>();
      for (const cand of candidates) {
        const diagNolioId = Number(cand.nolio_id);
        const diagUrl = `https://www.nolio.io/api/get/training/?athlete_id=${diagNolioId}&limit=20`;
        log(`STEP 5b — GET ${diagUrl} (${cand.name})`);
        try {
          const diagResp = await fetch(diagUrl, {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
          });
          const diagText = await diagResp.text();
          log(`STEP 5b — ${cand.name} HTTP ${diagResp.status}, len=${diagText.length}`);
          const diagJson = JSON.parse(diagText);
          const arr: any[] = Array.isArray(diagJson) ? diagJson : (Array.isArray(diagJson?.results) ? diagJson.results : []);
          const sports = arr.map(t => ({
            name: t?.name ?? null,
            sport: t?.sport ?? null,
            sport_id: t?.sport_id ?? null,
            date_start: t?.date_start ?? null,
          }));
          for (const s of sports) {
            if (typeof s.sport_id === "number" && !sportIdMap.has(s.sport_id)) {
              sportIdMap.set(s.sport_id, String(s.sport ?? s.name ?? "?"));
            }
          }
          log(`STEP 5b — ${cand.name} (${sports.length} séances): ${JSON.stringify(sports)}`);
        } catch (e) {
          log(`STEP 5b — ${cand.name} KO: ${(e as Error).message}`);
        }
      }
      const mapSummary = Array.from(sportIdMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([id, name]) => `${id}=${name}`).join(", ");
      log(`STEP 5b — MAPPING sport_id découverts: ${mapSummary || "(aucun)"}`);
    } catch (e) {
      log(`STEP 5b — exception diagnostic: ${(e as Error).message}`);
    }

    const status = errors.length === 0 ? "success" : (updated > 0 ? "partial" : "error");

    // Count total TFCLab athletes with a valid nolio_id (after updates)
    const { data: linkedRows } = await admin
      .from("athletes")
      .select("id, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);
    const linkedCount = linkedRows?.length ?? 0;


    const message = targetAthleteName
      ? `${targetAthleteName} — ${updated} mis à jour`
      : `Synchronisation réussie — ${linkedCount} athlètes liés à Nolio, ${updated} mis à jour`;
    log(`STEP 6 — ${message}`);

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: nolioAthletes.length,
      status,
      error_message: errors.length ? errors.slice(0, 5).join(" | ").slice(0, 1000) : null,
      notes: diagnosticLogs.join("\n").slice(0, 20000),
    });

    return new Response(
      JSON.stringify({
        ok: status !== "error",
        message,
        athletes_count: updated,
        updated,
        linked_total: linkedCount,
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
