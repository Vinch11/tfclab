// Nolio OAuth2 — refresh access token using stored refresh_token
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
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

    const { data: row, error: selErr } = await admin
      .from("nolio_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      console.error("nolio-refresh select error", selErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!row?.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh_token stored" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
    if (!clientSecret) {
      console.error("NOLIO_CLIENT_SECRET missing");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
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
    const text = await resp.text();
    if (!resp.ok) {
      console.error("nolio refresh failed", resp.status, text);
      return new Response(
        JSON.stringify({ error: "Refresh failed", status: resp.status, body: text }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let json: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!json.access_token) {
      return new Response(JSON.stringify({ error: "Missing access_token" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresInSec = json.expires_in ?? 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const { error: updErr } = await admin
      .from("nolio_tokens")
      .update({
        access_token: json.access_token,
        refresh_token: json.refresh_token ?? row.refresh_token,
        expires_at: expiresAt,
      })
      .eq("user_id", userId);

    if (updErr) {
      console.error("nolio-refresh update error", updErr);
      return new Response(JSON.stringify({ error: "DB update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, expires_at: expiresAt }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("nolio-refresh error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
