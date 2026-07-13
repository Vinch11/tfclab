/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — /debug/plan-qa
 * ═══════════════════════════════════════════════════════════════════════════════
 * Admin console pour :
 *   • Activer/désactiver le feature-flag JSON beta (localStorage tfcl:plan_json_beta)
 *   • Consulter les stats de génération (last 50 : format, durée, erreurs)
 *   • Exécuter localement les 8 cas de tests du merge (mergePlanChunks +
 *     validateSportObjective) — Vitest étant cassé dans la sandbox, ces tests
 *     tournent en cliquant sur "Run all", sans appel IA ni réseau.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  readPlanStats, clearPlanStats,
  isJsonBetaEnabled, setJsonBetaEnabled,
  type PlanGenerationStat,
} from "@/lib/plan/planGenerationStats";
import { runMergeTests, type TestResult } from "@/lib/plan/mergeTests";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function StatsRow({ s }: { s: PlanGenerationStat }) {
  const color = s.ok
    ? (s.format === "json" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500")
    : "bg-red-500/10 text-red-500";
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 pr-3 text-xs whitespace-nowrap">{formatDate(s.ts)}</td>
      <td className="py-1.5 pr-3"><Badge variant="outline" className={color}>{s.format}</Badge></td>
      <td className="py-1.5 pr-3 text-xs">{s.objective ?? "—"}</td>
      <td className="py-1.5 pr-3 text-xs text-right">{s.totalWeeks ?? "—"}</td>
      <td className="py-1.5 pr-3 text-xs text-right">{s.totalChunks ?? "—"}</td>
      <td className="py-1.5 pr-3 text-xs text-right">{formatDuration(s.durationMs)}</td>
      <td className="py-1.5 pr-3 text-xs">
        {s.ok
          ? (s.sportObjectiveCriticalIssues ? <span className="text-amber-500">⚠ {s.sportObjectiveCriticalIssues}</span> : "OK")
          : <span className="text-red-500 text-xs">{s.errorCode}</span>}
      </td>
    </tr>
  );
}

export default function PlanQAPage() {
  const [flag, setFlag] = useState(isJsonBetaEnabled());
  const [stats, setStats] = useState<PlanGenerationStat[]>(readPlanStats());
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  const summary = useMemo(() => {
    const jsonOk = stats.filter(s => s.format === "json" && s.ok).length;
    const jsonFail = stats.filter(s => s.format === "json" && !s.ok).length;
    const fallbacks = stats.filter(s => s.format === "markdown-fallback-from-json").length;
    const markdown = stats.filter(s => s.format === "markdown" && s.ok).length;
    const consecutiveJsonOk = (() => {
      let n = 0;
      for (let i = stats.length - 1; i >= 0; i--) {
        const s = stats[i];
        if (s.format === "json" && s.ok) n++;
        else if (s.format === "markdown-fallback-from-json" || (s.format === "json" && !s.ok)) break;
        // markdown direct = ignore (JSON n'a pas été demandé)
      }
      return n;
    })();
    return { jsonOk, jsonFail, fallbacks, markdown, consecutiveJsonOk };
  }, [stats]);

  const toggle = (v: boolean) => {
    setJsonBetaEnabled(v);
    setFlag(v);
  };

  const refresh = () => setStats(readPlanStats());
  const wipe = () => { clearPlanStats(); setStats([]); };

  const runTests = async () => {
    setRunningTests(true);
    try {
      const results = await runMergeTests();
      setTestResults(results);
    } finally {
      setRunningTests(false);
    }
  };

  const passed = testResults?.filter(t => t.pass).length ?? 0;
  const failed = testResults?.filter(t => !t.pass).length ?? 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Plan Generation QA — Phase 1B</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Console admin : bascule contrôlée sur le chemin JSON, stats de fiabilité, tests locaux du merge.
        </p>
      </div>

      {/* Feature flag */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flag — Génération JSON (beta)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="font-medium">Chemin JSON structuré</div>
            <div className="text-xs text-muted-foreground mt-1">
              Injecte <code className="text-xs">_outputFormat: "json"</code> dans le planConfig. Fallback Markdown
              automatique si un chunk échoue Zod. Ne concerne que votre navigateur (localStorage).
            </div>
          </div>
          <Switch checked={flag} onCheckedChange={toggle} />
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Stats de génération (last 50)</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
            <Button size="sm" variant="outline" onClick={wipe}>Effacer</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
            <div className="rounded border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">JSON OK</div>
              <div className="text-lg font-semibold text-emerald-500">{summary.jsonOk}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">JSON échec</div>
              <div className="text-lg font-semibold text-red-500">{summary.jsonFail}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Fallbacks MD</div>
              <div className="text-lg font-semibold text-amber-500">{summary.fallbacks}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Markdown direct</div>
              <div className="text-lg font-semibold text-blue-500">{summary.markdown}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-xs text-muted-foreground">Série JSON OK</div>
              <div className="text-lg font-semibold">{summary.consecutiveJsonOk}</div>
            </div>
          </div>
          {stats.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-4 text-center">Aucune génération enregistrée.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-left py-2 pr-3">Format</th>
                    <th className="text-left py-2 pr-3">Objectif</th>
                    <th className="text-right py-2 pr-3">Sem</th>
                    <th className="text-right py-2 pr-3">Chunks</th>
                    <th className="text-right py-2 pr-3">Durée</th>
                    <th className="text-left py-2 pr-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats].reverse().map((s, i) => <StatsRow key={i} s={s} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge tests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Tests du merge (8 cas)</CardTitle>
          <Button size="sm" onClick={runTests} disabled={runningTests}>
            {runningTests ? "Run..." : "Run all"}
          </Button>
        </CardHeader>
        <CardContent>
          {testResults === null ? (
            <div className="text-sm text-muted-foreground italic py-4 text-center">
              Aucun test exécuté. Clique "Run all".
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm">
                <span className={failed === 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                  {passed}/{testResults.length} passing
                </span>
                {failed > 0 && <span className="text-red-500 ml-2">({failed} failed)</span>}
              </div>
              {testResults.map((r, i) => (
                <div key={i} className={`text-sm p-2 rounded border ${r.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start gap-2">
                    <span>{r.pass ? "✅" : "❌"}</span>
                    <div className="flex-1">
                      <div className="font-medium">{r.name}</div>
                      {!r.pass && <div className="text-xs text-red-500 mt-1 font-mono">{r.error}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground border-t border-border pt-3">
        Critère Phase 1C (suppression parser Markdown) : ≥ N générations JSON consécutives sans fallback sur les 3
        formats de test (70.3 chunké, semi 8 sem chunké, sprint 6 sem mono-bloc). Voir "Série JSON OK" ci-dessus.
      </div>
    </div>
  );
}
