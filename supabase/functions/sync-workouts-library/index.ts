const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** No authentication/body/DB access while non-atomic replacement is suspended. */
export function handleSyncRequest(req: Request): Response {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return Response.json({ success: false, code: "WORKOUT_SYNC_SUSPENDED", error: "Catalogue replacement suspended: atomic replacement unavailable", inserted: 0, errors: ["WORKOUT_SYNC_SUSPENDED"] },
    { status: 503, headers: corsHeaders });
}
Deno.serve(handleSyncRequest);

/* ── Durées canoniques par phase (miroir de src/lib/plan/workoutDurationResolver.ts) ── */
const PHASES = ["base", "build", "peak", "taper"] as const;
type Phase = typeof PHASES[number];
const PHASE_DURATION_WEIGHT: Record<Phase, number> = {
  base: 0.25,
  build: 0.55,
  peak: 0.85,
  taper: 0.1,
};

export function durationBounds(w: any): [number, number] {
  const d = w?.durationMin;
  if (Array.isArray(d)) {
    const lo = Number(d[0]) || 0;
    const hi = Number(d[1]) || lo;
    return [lo, hi];
  }
  const v = Number(d) || 0;
  return [v, v];
}

export function roundDuration(min: number): number {
  const step = min >= 120 ? 10 : 5;
  return Math.round(min / step) * step;
}

export function resolveCanonicalDuration(w: any, phase: Phase): number {
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

export function buildDurationByPhase(w: any): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PHASES) {
    const v = resolveCanonicalDuration(w, p);
    if (v > 0) out[p] = v;
  }
  return out;
}

export function extractIntensity(w: any): string | null {
  if (!w.structure || !Array.isArray(w.structure)) return w.metricKey || null;
  const mainPart = w.structure.find((s: any) => s.part === "Main");
  if (mainPart?.zones?.length) return mainPart.zones[0];
  return w.metricKey || null;
}

export function buildDescription(w: any): string {
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
