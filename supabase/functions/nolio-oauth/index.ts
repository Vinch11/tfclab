// Nolio OAuth2 — start + callback
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_AUTHORIZE_URL = "https://www.nolio.io/api/authorize/";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const REDIRECT_URI =
  "https://hipitsvyceiiylyjvcwc.supabase.co/functions/v1/nolio-oauth/callback";

function randomString(len = 24): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

function appOrigin(req: Request): string {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      /* noop */
    }
  }
  return "https://tfclab.lovable.app";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  try {
    // ----- START -----
    if (path.endsWith("/nolio-oauth/start") || path.endsWith("/start")) {
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
      const origin = appOrigin(req);

      const random = randomString(16);
      const state = b64urlEncode(
        JSON.stringify({ u: userId, r: random, o: origin }),
      );

      const authorizeUrl = new URL(NOLIO_AUTHORIZE_URL);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", NOLIO_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authorizeUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ url: authorizeUrl.toString(), state }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ----- CALLBACK -----
    if (path.endsWith("/nolio-oauth/callback") || path.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        return new Response("Missing code or state", {
          status: 400,
          headers: corsHeaders,
        });
      }

      let userId: string;
      let appOriginUrl = "https://tfclab.lovable.app";
      try {
        const decoded = JSON.parse(b64urlDecode(state));
        userId = decoded.u;
        if (decoded.o) appOriginUrl = decoded.o;
        if (!userId) throw new Error("no user");
      } catch {
        return new Response("Invalid state", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
      if (!clientSecret) {
        console.error("NOLIO_CLIENT_SECRET is not configured");
        return new Response("Server misconfigured", {
          status: 500,
          headers: corsHeaders,
        });
      }

      const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      });

      const tokenResp = await fetch(NOLIO_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      const tokenText = await tokenResp.text();
      if (!tokenResp.ok) {
        console.error("Nolio token exchange failed", tokenResp.status, tokenText);
        return new Response(
          `Token exchange failed: ${tokenResp.status} ${tokenText}`,
          { status: 502, headers: corsHeaders },
        );
      }

      let tokenJson: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      try {
        tokenJson = JSON.parse(tokenText);
      } catch {
        return new Response("Invalid token response", {
          status: 502,
          headers: corsHeaders,
        });
      }

      const accessToken = tokenJson.access_token;
      const refreshToken = tokenJson.refresh_token ?? null;
      if (!accessToken) {
        return new Response("Missing access_token", {
          status: 502,
          headers: corsHeaders,
        });
      }

      const expiresInSec = tokenJson.expires_in ?? 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error: upsertErr } = await admin
        .from("nolio_tokens")
        .upsert(
          {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
          },
          { onConflict: "user_id" },
        );

      if (upsertErr) {
        console.error("Failed to persist nolio tokens", upsertErr);
        return new Response("Failed to persist tokens", {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${appOriginUrl}/configuration?nolio=connected`,
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  } catch (e) {
    console.error("nolio-oauth error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
