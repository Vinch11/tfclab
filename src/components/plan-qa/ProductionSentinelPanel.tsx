/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sentinelle légère — Production (30 derniers jours)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Lit `plan_generation_stats` (mirror non-PII du trafic réel) et calcule :
 *   • nb générations, taux fallback Markdown, taux retry Zod
 *   • nb substituted_offsport, nb offsport_unresolved
 *   • badge alerte 7j : 🔴 si fallback >5% ou ≥1 offsport_unresolved
 *                       🟠 si fallback 2-5%
 * Critère Phase 1C-B : "2 semaines de prod, fallback <2%".
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  ts: string;
  format: string;
  ok: boolean;
  retry_count: number | null;
  substituted_offsport_count: number | null;
  offsport_unresolved_count: number | null;
}

interface Aggregate {
  total: number;
  fallbacks: number;
  fallbackRate: number;
  retries: number;
  retryRate: number;
  substituted: number;
  unresolved: number;
}

function aggregate(rows: Row[]): Aggregate {
  const total = rows.length;
  const fallbacks = rows.filter(r => r.format === "markdown-fallback-from-json").length;
  const retries = rows.reduce((s, r) => s + (r.retry_count ?? 0), 0);
  const substituted = rows.reduce((s, r) => s + (r.substituted_offsport_count ?? 0), 0);
  const unresolved = rows.reduce((s, r) => s + (r.offsport_unresolved_count ?? 0), 0);
  return {
    total, fallbacks,
    fallbackRate: total > 0 ? fallbacks / total : 0,
    retries,
    retryRate: total > 0 ? retries / total : 0,
    substituted, unresolved,
  };
}

function badge(rate: number, unresolved: number): { icon: string; label: string; color: string } {
  if (rate > 0.05 || unresolved >= 1) {
    return { icon: "🔴", label: "Alerte : fallback >5% ou substitutions non résolues sur 7j", color: "border-red-500/40 bg-red-500/5 text-red-600" };
  }
  if (rate >= 0.02) {
    return { icon: "🟠", label: "Attention : taux de fallback entre 2 et 5% sur 7j", color: "border-amber-500/40 bg-amber-500/5 text-amber-600" };
  }
  return { icon: "🟢", label: "Sain : taux de fallback <2% sur 7j", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600" };
}

function pct(v: number): string { return `${(v * 100).toFixed(1)}%`; }

export function ProductionSentinelPanel() {
  const [rows30, setRows30] = useState<Row[] | null>(null);
  const [rows7, setRows7] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("plan_generation_stats")
        .select("ts, format, ok, retry_count, substituted_offsport_count, offsport_unresolved_count")
        .gte("ts", since30)
        .order("ts", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const all = (data ?? []) as Row[];
      setRows30(all);
      const cutoff7 = Date.now() - 7 * 86400_000;
      setRows7(all.filter(r => new Date(r.ts).getTime() >= cutoff7));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows30([]); setRows7([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const agg30 = rows30 ? aggregate(rows30) : null;
  const agg7 = rows7 ? aggregate(rows7) : null;
  const alert = agg7 ? badge(agg7.fallbackRate, agg7.unresolved) : null;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Production — 30 derniers jours (sentinelle légère)</CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "…" : "Rafraîchir"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Agrégat du trafic réel (table <code>plan_generation_stats</code>). Critère Phase 1C-B :
          2 semaines de prod avec fallback &lt;2%.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {alert && (
          <div className={`rounded border p-3 text-sm ${alert.color}`}>
            <b>{alert.icon} {alert.label}</b>
            {agg7 && (
              <span className="ml-2 text-xs opacity-80">
                (7j : {agg7.total} gén · fallback {pct(agg7.fallbackRate)} · unresolved {agg7.unresolved})
              </span>
            )}
          </div>
        )}
        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/5 text-red-600 p-2 text-xs">
            Lecture impossible : {error}
          </div>
        )}
        {agg30 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <Stat label="Générations 30j" value={String(agg30.total)} />
            <Stat label="Fallback Markdown" value={pct(agg30.fallbackRate)} sub={`${agg30.fallbacks}/${agg30.total}`} tone={agg30.fallbackRate > 0.05 ? "bad" : agg30.fallbackRate >= 0.02 ? "warn" : "good"} />
            <Stat label="Retry Zod (moy)" value={pct(agg30.retryRate)} sub={`${agg30.retries} tentatives`} />
            <Stat label="Substitutions off-sport" value={String(agg30.substituted)} />
            <Stat label="Off-sport non résolus" value={String(agg30.unresolved)} tone={agg30.unresolved > 0 ? "bad" : "good"} />
          </div>
        )}
        {agg7 && (
          <div className="text-xs text-muted-foreground">
            Fenêtre 7j : {agg7.total} générations · fallback {pct(agg7.fallbackRate)} ({agg7.fallbacks})
            · retries {agg7.retries} · substitutions {agg7.substituted} · non résolus {agg7.unresolved}
          </div>
        )}
        {rows30 && rows30.length === 0 && !error && (
          <div className="text-xs text-muted-foreground">
            Aucune génération enregistrée sur 30j. Les stats s'accumuleront au fil du trafic prod.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "";
  return (
    <div className="rounded border border-border/60 p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
