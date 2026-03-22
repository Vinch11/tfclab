import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { workouts } = await req.json();

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return new Response(JSON.stringify({ error: "No workouts provided" }), { status: 400, headers: corsHeaders });
    }

    // Map to DB schema
    const rows = workouts.map((w: any) => ({
      id: w.id, // Use the string ID as UUID-safe identifier
      title: w.title || w.objectif || w.id,
      type: w.cat || "A",
      sport: w.sport || w.sportKey || "mixed",
      phase_tag: Array.isArray(w.phase) ? w.phase[0] || "base" : w.phase || "base",
      intensity_tag: w.zones?.[0] || w.metricKey || null,
      duration_min: Array.isArray(w.durationMin) ? Math.round((w.durationMin[0] + w.durationMin[1]) / 2) : w.durationMin || 60,
      description: buildDescription(w),
    }));

    // Delete all existing and insert fresh (atomic sync)
    const { error: deleteError } = await supabase.from("workouts_library").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
      console.error("Delete error:", deleteError);
    }

    // Insert in batches of 100
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from("workouts_library").insert(batch);
      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, total: rows.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildDescription(w: any): string {
  const parts: string[] = [];
  if (w.objectif) parts.push(w.objectif);
  if (w.when) parts.push(`Quand: ${w.when}`);
  if (w.avoid) parts.push(`Éviter: ${w.avoid}`);
  if (w.necessite) parts.push(`Priorité: ${w.necessite}`);
  if (Array.isArray(w.structure)) {
    for (const s of w.structure) {
      parts.push(`${s.part}: ${s.text}`);
    }
  }
  if (w.variants) {
    const v = Object.entries(w.variants).map(([k, v]) => `${k}: ${v}`).join(" | ");
    if (v) parts.push(`Variantes: ${v}`);
  }
  if (w.notes) parts.push(w.notes);
  return parts.join(". ").slice(0, 2000);
}
