/** Auth commune des Edge Functions Nolio V2 : getClaims sur le JWT appelant
 * (verify_jwt ne suffit pas : la clé anon est elle-même un JWT valide). */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export type Caller = {
  coachId: string;
  // deno-lint-ignore no-explicit-any
  user: any;
  // deno-lint-ignore no-explicit-any
  admin: any;
  supabaseUrl: string;
};

export async function authenticate(req: Request): Promise<Caller | Response> {
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { status: "REFUSED", reason: "server_misconfigured" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { status: "REFUSED", reason: "unauthorized" });
  const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await user.auth.getClaims(auth.slice(7));
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || !UUID.test(sub)) return json(401, { status: "REFUSED", reason: "unauthorized" });
  return { coachId: sub, user, admin: createClient(url, service), supabaseUrl: url };
}

/** Athlète possédé par le coach, lu avec le client de l'appelant (RLS). */
export async function ownsAthlete(c: Caller, athleteId: unknown): Promise<boolean | "error"> {
  if (typeof athleteId !== "string" || !UUID.test(athleteId)) return false;
  const { data, error } = await c.user.from("athletes").select("id").eq("id", athleteId).eq("coach_id", c.coachId).maybeSingle();
  if (error) return "error";
  return !!data;
}

export const nativeFetch = async (u: string, i: { method: string; headers: Record<string, string>; body?: string; redirect: "error" }) => {
  const res = await fetch(u, i);
  return { status: res.status, json: () => res.json() };
};
