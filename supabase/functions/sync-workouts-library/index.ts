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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    // Verify user is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Role check: only STAFF_COACH can sync the shared library
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "STAFF_COACH") {
      return new Response(JSON.stringify({ error: "Forbidden: staff role required" }), {
        status: 403, headers: corsHeaders,
      });
    }


    const { workouts } = await req.json();

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return new Response(JSON.stringify({ error: "No workouts provided" }), { status: 400, headers: corsHeaders });
    }

    // Map to DB schema
    const rows = workouts.map((w: any) => ({
      id: w.id,
      title: w.title || w.objectif?.slice(0, 80) || w.id,
      type: w.cat || "A",
      sport: w.sport || w.sportKey || "mixed",
      phase_tag: Array.isArray(w.phase) ? w.phase.join(",") : w.phase || "base",
      intensity_tag: extractIntensity(w),
      duration_min: resolveCanonicalDuration(w, "build") || 60,
      duration_min_low: durationBounds(w)[0],
      duration_min_high: durationBounds(w)[1],
      duration_by_phase: buildDurationByPhase(w),
      description: buildDescription(w),
    }));

    // Deduplicate by ID (keep first occurrence)
    const seen = new Set<string>();
    const uniqueRows = rows.filter((r: any) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Delete all existing
    const { error: deleteError } = await supabase
      .from("workouts_library")
      .delete()
      .neq("id", "__impossible__");
    
    if (deleteError) {
      console.error("Delete error:", deleteError);
    }

    // Insert in batches of 50
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < uniqueRows.length; i += 50) {
      const batch = uniqueRows.slice(i, i + 50);
      const { error } = await supabase.from("workouts_library").insert(batch);
      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
        console.error(`Batch ${i} error:`, error);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted, 
        deduplicated: rows.length - uniqueRows.length,
        total: uniqueRows.length, 
        errors 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ── Durées canoniques par phase (miroir de src/lib/plan/workoutDurationResolver.ts) ── */
const PHASES = ["base", "build", "peak", "taper"] as const;
type Phase = typeof PHASES[number];
const PHASE_DURATION_WEIGHT: Record<Phase, number> = {
  base: 0.25,
  build: 0.55,
  peak: 0.85,
  taper: 0.1,
};

function durationBounds(w: any): [number, number] {
  const d = w?.durationMin;
  if (Array.isArray(d)) {
    const lo = Number(d[0]) || 0;
    const hi = Number(d[1]) || lo;
    return [lo, hi];
  }
  const v = Number(d) || 0;
  return [v, v];
}

function roundDuration(min: number): number {
  const step = min >= 120 ? 10 : 5;
  return Math.round(min / step) * step;
}

function resolveCanonicalDuration(w: any, phase: Phase): number {
  const [lo, hi] = durationBounds(w);
  const explicit = w?.durationByPhase?.[phase];
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.max(explicit, lo), hi || explicit);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= 0) return 0;
  if (hi <= lo) return roundDuration(lo);
  const raw = lo + (hi - lo) * PHASE_DURATION_WEIGHT[phase];
  return Math.min(hi, Math.max(lo, roundDuration(raw)));
}

function buildDurationByPhase(w: any): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PHASES) {
    const v = resolveCanonicalDuration(w, p);
    if (v > 0) out[p] = v;
  }
  return out;
}

function extractIntensity(w: any): string | null {
  if (!w.structure || !Array.isArray(w.structure)) return w.metricKey || null;
  const mainPart = w.structure.find((s: any) => s.part === "Main");
  if (mainPart?.zones?.length) return mainPart.zones[0];
  return w.metricKey || null;
}

function buildDescription(w: any): string {
  const parts: string[] = [];
  if (w.objectif) parts.push(w.objectif);
  if (w.when) parts.push(`Quand: ${w.when}`);
  if (w.necessite) parts.push(`Priorité: ${w.necessite}`);
  if (Array.isArray(w.structure)) {
    for (const s of w.structure) {
      parts.push(`${s.part}: ${s.text}`);
    }
  }
  if (w.variants) {
    const v = Object.entries(w.variants).map(([k, val]) => `${k}: ${val}`).join(" | ");
    if (v) parts.push(`Variantes: ${v}`);
  }
  if (w.notes) parts.push(w.notes);
  return parts.join(". ").slice(0, 2000);
}
