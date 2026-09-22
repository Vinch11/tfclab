// nolio-download-fit — proxy de téléchargement d'un fichier .fit Nolio.
//
// Nolio expose un `file_url` par séance réalisée (CDN privé signé,
// cf. nolio-training-probe) mais ces URLs ne sont pas accessibles en
// fetch() cross-origin depuis le navigateur du coach (pas de CORS sur ce
// CDN). Cette fonction re-résout elle-même le file_url à partir du
// training_id (jamais celui fourni par le client — on ne fait pas
// confiance à une URL arbitraire, on la redérive depuis l'API Nolio pour
// éviter un proxy ouvert / SSRF) puis stream les octets bruts au client,
// qui peut ensuite les envelopper dans un `File` et les passer tel quel
// au pipeline d'analyse FIT existant (parseFitFile / analyzeFitSession).
//
// Body: { nolio_athlete_id: number, training_id: number }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_TRAINING_URL = "https://www.nolio.io/api/get/training/";

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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return jsonError("Unauthorized", 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string;
    if (!userId) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => ({})) as {
      nolio_athlete_id?: number;
      training_id?: number;
    };
    if (!body.nolio_athlete_id || !body.training_id) {
      return jsonError("nolio_athlete_id et training_id sont requis", 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tokenRow } = await admin.from("nolio_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
    if (!tokenRow?.access_token) return jsonError("Nolio non connecté", 400);
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // Re-résout le file_url depuis l'API Nolio (jamais celui fourni par le client).
    const params = new URLSearchParams({
      athlete_id: String(body.nolio_athlete_id),
      limit: "100",
      offset: "0",
      order_by: "-date_start",
    });
    const listResp = await fetch(`${NOLIO_TRAINING_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!listResp.ok) {
      return jsonError(`Nolio a refusé la lecture des séances (HTTP ${listResp.status})`, 502);
    }
    const listJson = await listResp.json().catch(() => null) as unknown;
    const list = Array.isArray(listJson) ? listJson : ((listJson as { results?: unknown[] })?.results ?? []);
    const match = (list as Array<Record<string, unknown>>).find(
      (t) => Number(t.nolio_id) === Number(body.training_id),
    );
    if (!match) return jsonError("Séance introuvable parmi les 100 dernières trainings de l'athlète", 404);
    const fileUrl = match.file_url as string | undefined;
    if (!fileUrl) return jsonError("Aucun fichier .fit disponible pour cette séance", 404);

    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok || !fileResp.body) {
      return jsonError(`Échec du téléchargement du fichier .fit (HTTP ${fileResp.status})`, 502);
    }

    return new Response(fileResp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="nolio-${body.training_id}.fit"`,
      },
    });
  } catch (e) {
    return jsonError((e as Error).message ?? "Erreur inconnue", 500);
  }
});
