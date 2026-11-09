// Nolio API v2 — OAuth connection (team/partner app) + read-only probe.
// Actions (POST JSON {action}): start | exchange | status | probe | disconnect.
// Tokens never leave the server. Read-only: no write call to Nolio.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ownsPersonalConnection, validPeriod, canReadTestSession } from "./recordContract.ts";

const AUTHORIZE_URL = "https://www.nolio.io/api/authorize/";
const TOKEN_URL = "https://www.nolio.io/api/token/";
const API = "https://www.nolio.io/api/v2/";
const REDIRECT_URI = "https://tfcl.twoforcoaching.be/nolio-v2/callback";
const SCOPES = "metrics:read real:read planned:read settings:read team:read";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomToken(n = 32) { const b = new Uint8Array(n); crypto.getRandomValues(b); return b64url(b); }
async function sha256(s: string) { return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))); }

async function tokenRequest(params: Record<string, string>) {
  const id = Deno.env.get("NOLIO_V2_CLIENT_ID")?.trim(), secret = Deno.env.get("NOLIO_V2_CLIENT_SECRET")?.trim();
  if (!id || !secret) throw new Error("missing_client_credentials");
  let res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${id}:${secret}`) },
    body: new URLSearchParams(params),
  });
  if (res.status === 401) {
    // Some OAuth servers only accept client credentials in the form body.
    await res.body?.cancel();
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, client_id: id, client_secret: secret }),
    });
  }
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok) return { ok: false as const, status: res.status, error: String(body.error ?? text.slice(0, 200)) };
  return { ok: true as const, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
    const userId = claims?.claims?.sub;
    if (cErr || !userId) return json({ error: "unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // A shared personal key must never become accessible to another signed-in coach.
    const configuredPersonalKey = Deno.env.get("NOLIO_PERSONAL_TOKEN")?.trim();
    let personalKey: string | null = null;
    if (configuredPersonalKey) {
      const profileResponse = await fetch(API + "settings/profile/", { headers: { Authorization: `Bearer ${configuredPersonalKey}` } });
      const profile = await profileResponse.json().catch(() => null);
      if (profileResponse.ok && ownsPersonalConnection(claims?.claims?.email, profile?.email)) personalKey = configuredPersonalKey;
    }

    if (action === "start") {
      const state = randomToken(), verifier = randomToken(48);
      await admin.from("nolio_v2_oauth_states").delete().lt("expires_at", new Date().toISOString());
      const { error } = await admin.from("nolio_v2_oauth_states").insert({ state_hash: await sha256(state), user_id: userId, code_verifier: verifier });
      if (error) throw error;
      const u = new URL(AUTHORIZE_URL);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("client_id", Deno.env.get("NOLIO_V2_CLIENT_ID") ?? "");
      u.searchParams.set("redirect_uri", REDIRECT_URI);
      u.searchParams.set("scope", SCOPES);
      u.searchParams.set("state", state);
      u.searchParams.set("code_challenge", await sha256(verifier));
      u.searchParams.set("code_challenge_method", "S256");
      return json({ url: u.toString() });
    }

    if (action === "exchange") {
      const code = String(body?.code ?? ""), state = String(body?.state ?? "");
      if (!code || !state || code.length > 2000 || state.length > 200) return json({ error: "invalid_request" }, 400);
      const hash = await sha256(state);
      const { data: row } = await admin.from("nolio_v2_oauth_states").select("*").eq("state_hash", hash).maybeSingle();
      await admin.from("nolio_v2_oauth_states").delete().eq("state_hash", hash);
      if (!row || row.user_id !== userId || new Date(row.expires_at) < new Date()) return json({ error: "invalid_state" }, 400);
      const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI, code_verifier: row.code_verifier });
      if (!t.ok) return json({ error: "token_exchange_failed", status: t.status, detail: t.error }, 502);
      const b = t.body;
      await admin.from("nolio_v2_connections").upsert({
        user_id: userId, access_token: String(b.access_token), refresh_token: b.refresh_token ? String(b.refresh_token) : null,
        expires_at: new Date(Date.now() + Number(b.expires_in ?? 86400) * 1000).toISOString(),
        scopes: b.scope ? String(b.scope) : null, updated_at: new Date().toISOString(),
      });
      return json({ connected: true, scopes: b.scope ?? null });
    }

    if (action === "personal_probe") {
      // Personal API key (nolio_sk_…): read-only GETs only, never returned to the client.
      const pk = personalKey;
      if (!pk) return json({ error: "missing_personal_token" }, 400);
      const get = async (path: string) => {
        const res = await fetch(API + path, { headers: { Authorization: `Bearer ${pk}`, Accept: "application/json" } });
        const text = await res.text();
        let data: unknown = null;
        try { data = JSON.parse(text); } catch { data = text.slice(0, 300); }
        return { status: res.status, data };
      };
      const [me, athletes, windows] = await Promise.all([get("me/"), get("me/athletes/?limit=100"), get("metrics/records/")]);
      const raw = athletes.data as { data?: Array<Record<string, unknown>>; results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
      const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? [];
      return json({
        me: { status: me.status, error: me.status >= 400 ? me.data : undefined },
        athletes: { status: athletes.status, count: list.length, has_api_access: list.filter((a) => a.has_api_access).length,
          keys: list[0] ? Object.keys(list[0]) : [], error: athletes.status >= 400 ? athletes.data : undefined },
        records_windows: { status: windows.status, sample: windows.status < 400 ? JSON.stringify(windows.data).slice(0, 1500) : undefined,
          error: windows.status >= 400 ? windows.data : undefined },
      });
    }

    const { data: conn } = await admin.from("nolio_v2_connections").select("*").eq("user_id", userId).maybeSingle();

    if (action === "status") {
      if (!conn && personalKey) return json({ connected: true, scopes: "Clé personnelle Nolio (lecture seule)", mode: "personal" });
      return json({ connected: !!conn, scopes: conn?.scopes ?? null, expires_at: conn?.expires_at ?? null, mode: conn ? "oauth" : null });
    }

    if (action === "disconnect") {
      await admin.from("nolio_v2_connections").delete().eq("user_id", userId);
      return json({ connected: false });
    }

    if (action === "probe" || action === "records" || action === "catalogues" || action === "test_session") {
      if (!conn && !personalKey) return json({ error: "not_connected" }, 400);
      let token = conn ? String(conn.access_token) : personalKey;
      if (!token) return json({ error: "not_connected" }, 403);
      if (conn && conn.expires_at && new Date(conn.expires_at).getTime() - Date.now() < 120_000 && conn.refresh_token) {
        const r = await tokenRequest({ grant_type: "refresh_token", refresh_token: conn.refresh_token });
        if (!r.ok) return json({ error: "reauthorization_required" }, 401);
        token = String(r.body.access_token);
        await admin.from("nolio_v2_connections").update({
          access_token: token, refresh_token: r.body.refresh_token ? String(r.body.refresh_token) : conn.refresh_token,
          expires_at: new Date(Date.now() + Number(r.body.expires_in ?? 86400) * 1000).toISOString(), updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
      const get = async (path: string) => {
        const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
        const text = await res.text();
        let data: unknown = null;
        try { data = JSON.parse(text); } catch { data = text.slice(0, 300); }
        return { status: res.status, data };
      };
      const collection = async (path: string) => {
        const items: Array<Record<string, unknown>> = [];
        for (let page = 0; page < 20; page++) {
          const separator = path.includes('?') ? '&' : '?';
          const last = items.at(-1)?.id;
          const result = await get(path + separator + 'limit=100' + (last ? '&starting_after=' + encodeURIComponent(String(last)) : ''));
          if (result.status >= 400) throw new Error('nolio_read_failed');
          const data = result.data as { data?: Array<Record<string, unknown>>; has_more?: boolean };
          if (!Array.isArray(data.data)) throw new Error('invalid_collection');
          items.push(...data.data);
          if (!data.has_more) return { items, complete: true };
          if (!data.data.length || !items.at(-1)?.id) break;
        }
        return { items, complete: false };
      };
      if (action === 'catalogues') {
        const [athletes, sports, windows] = await Promise.all([collection('me/athletes/'), collection('sports/'), get('metrics/records/')]);
        if (windows.status >= 400) return json({ error:'records_catalogue_unavailable' }, 502);
        return json({ athletes: athletes.items.map(a => ({id:a.id,name:a.name,has_api_access:a.has_api_access})), sports: sports.items.map(s => ({id:s.id,name:s.name,sport_base:s.sport_base})), windows:(windows.data as {windows?: unknown})?.windows, complete:athletes.complete && sports.complete });
      }
      if (action === 'test_session') {
        if (!validPeriod(body.from, body.to) || typeof body.athlete !== 'string' || !/^usr_[A-Za-z0-9_-]+$/.test(body.athlete) || typeof body.training !== 'string' || !/^trn_[A-Za-z0-9_-]+$/.test(body.training)) return json({error:'invalid_session_request'},400);
        const athletes=await collection('me/athletes/');
        if(!athletes.complete||!athletes.items.some(a=>a.id===body.athlete&&a.has_api_access===true))return json({error:'athlete_not_accessible'},403);
        const query=new URLSearchParams({athlete:body.athlete,from:body.from,to:body.to});
        const sessions=await collection('real/trainings/?'+query);
        if(!sessions.complete)return json({error:'incomplete_session_list'},502);
        if(!canReadTestSession(body.athlete,body.training,athletes.items,sessions.items,athletes.complete&&sessions.complete))return json({error:'session_outside_athlete_period'},403);
        const laps=await get(`real/trainings/${body.training}/laps/`);
        if(laps.status===204)return json({laps:[],available:false});
        if(laps.status>=400)return json({error:'session_laps_unavailable',status:laps.status},502);
        // Return measured lap data only, not signed file URLs or arbitrary metadata.
        const payload=laps.data as {data?:unknown[];laps?:unknown[]};
        const list=Array.isArray(laps.data)?laps.data:payload?.data??payload?.laps;
        if(!Array.isArray(list))return json({laps:[],available:false});
        const clean=(value:unknown):unknown=>{
          if(typeof value==='number')return Number.isFinite(value)?value:null;
          if(typeof value==='string')return /^[-+\d:.,% A-Za-z/²_-]{1,60}$/.test(value)&&!value.includes('http')?value:null;
          if(Array.isArray(value))return value.map(clean);
          if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/url|token|secret|email|name|description/i.test(key)).map(([key,v])=>[key,clean(v)]));
          return null;
        };
        return json({laps:list.map(clean),available:list.length>0});
      }
      if (action === 'records') {
        if (!validPeriod(body.from, body.to) || typeof body.athlete !== 'string' || !/^usr_[A-Za-z0-9_-]+$/.test(body.athlete) || typeof body.sport !== 'string' || !/^spt_[A-Za-z0-9_-]+$/.test(body.sport) || !['ppr','phrr','par','ptr','pvar','pcadr'].includes(body.cat) || !['time','distance'].includes(body.record_type)) return json({error:'invalid_record_request'},400);
        const [athletes, sports] = await Promise.all([collection('me/athletes/'), collection('sports/')]);
        if (!athletes.items.some(a => a.id === body.athlete && a.has_api_access === true) || !sports.items.some(s => s.id === body.sport)) return json({error:'athlete_or_sport_not_accessible'},403);
        const query = new URLSearchParams({athlete:body.athlete,sports:body.sport,cat:body.cat,record_type:body.record_type,from:body.from,to:body.to,top:'1'});
        const result = await get('metrics/records/?' + query);
        if (result.status >= 400) return json({error:result.status === 429 ? 'nolio_rate_limit' : 'records_read_failed',status:result.status},502);
        const payload = result.data as {data?: Array<Record<string, unknown>>;has_more?: boolean};
        if (!Array.isArray(payload.data)) return json({error:'invalid_records_response'},502);
        return json({records:payload.data.map(r => ({value:r.value,unit:r.unit,date:r.date,cat:r.cat,record_type:r.record_type,inner_val:r.inner_val,source:r.source,training_id:r.training_id,training_name:r.training_name,sport_id:r.sport_id,sport_name:r.sport_name})),complete:payload.has_more === false});
      }
      const [me, athletes, windows] = await Promise.all([get("me/"), get("me/athletes/?limit=100"), get("metrics/records/")]);
      const rawList = athletes.data as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
      const list = Array.isArray(rawList) ? rawList : rawList?.data ?? [];
      return json({
        me: { status: me.status },
        athletes: { status: athletes.status, count: list.length,
          items: list.map((a) => ({ id: a.id, name: a.name ?? [a.first_name, a.last_name].filter(Boolean).join(" "), has_api_access: a.has_api_access })) },
        records_windows: { status: windows.status, windows: (windows.data as { windows?: unknown })?.windows ?? null,
          error: windows.status >= 400 ? windows.data : undefined },
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("nolio-v2-oauth error", e instanceof Error ? e.message : "unknown");
    return json({ error: "internal_error" }, 500);
  }
});
