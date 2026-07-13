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
import { zDay, zPhase, zSport } from "@/lib/plan/planSchema";
import { useQARunner } from "@/lib/plan/qa/useQARunner";
import { buildQAReport, readQASessions, clearQASessions, type QASession } from "@/lib/plan/qa/verdict";
import { toast } from "sonner";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

const PROMPT_ENUMS = {
  day: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
  sport: ["swim", "bike", "run", "brick", "strength", "recovery", "rest"],
  phase: ["base", "build", "peak", "taper"],
};

const EXPECTED_ENUMS = {
  day: zDay.options,
  sport: zSport.options,
  phase: zPhase.options,
};

function sameValues(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every(v => b.includes(v));
}

function buildFullReport(stats: PlanGenerationStat[], testResults: TestResult[] | null): string {
  const enumLines = (Object.keys(EXPECTED_ENUMS) as Array<keyof typeof EXPECTED_ENUMS>).map(key => {
    const expected = EXPECTED_ENUMS[key];
    const prompt = PROMPT_ENUMS[key];
    return `${key}: expected=[${expected.join(", ")}] prompt=[${prompt.join(", ")}] match=${sameValues(expected, prompt)}`;
  }).join("\n");
  return [
    "# Plan Generation QA — rapport complet",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Enum audit",
    enumLines,
    "",
    "## Stats",
    JSON.stringify(stats, null, 2),
    "",
    "## Merge tests",
    JSON.stringify(testResults, null, 2),
  ].join("\n");
}

function StatsRow({ s, onSelect }: { s: PlanGenerationStat; onSelect: (s: PlanGenerationStat) => void }) {
  const color = s.ok
    ? (s.format === "json" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500")
    : "bg-red-500/10 text-red-500";
  const clickable = !s.ok && (s.errorCode === "SCHEMA_FAIL" || s.schemaFailDetails);
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
          : clickable
            ? <button type="button" className="text-red-500 text-xs underline underline-offset-2" onClick={() => onSelect(s)}>{s.errorCode}</button>
            : <span className="text-red-500 text-xs">{s.errorCode}</span>}
      </td>
    </tr>
  );
}

function SchemaFailDetails({ stat }: { stat: PlanGenerationStat }) {
  const d = stat.schemaFailDetails;
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-border/60 p-2"><span className="text-muted-foreground">chunk</span><div className="font-mono">{d.chunkIndex ?? "—"}</div></div>
        <div className="rounded border border-border/60 p-2"><span className="text-muted-foreground">finish_reason</span><div className="font-mono">{d.finishReason ?? "—"}</div></div>
        <div className="rounded border border-border/60 p-2"><span className="text-muted-foreground">constrained</span><div className="font-mono">{String(d.gateway?.constrained ?? "unknown")}</div></div>
      </div>
      {d.gateway?.constrained === false && (
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-600">
          constrained=false — le gateway n'a pas appliqué json_schema ; validation seulement a posteriori. {d.gateway.fallbackReason ?? ""}
        </div>
      )}
      <div>
        <div className="text-sm font-medium mb-2">Erreurs Zod verbatim</div>
        <div className="rounded border border-border/60 overflow-hidden">
          {(d.zodIssues ?? []).map((issue, i) => (
            <div key={i} className="grid grid-cols-[minmax(140px,240px)_1fr] gap-2 border-b border-border/40 p-2 text-xs last:border-b-0">
              <code>{issue.path}</code>
              <span>{issue.message}</span>
            </div>
          ))}
          {(!d.zodIssues || d.zodIssues.length === 0) && <div className="p-2 text-xs text-muted-foreground">Aucune issue structurée.</div>}
        </div>
      </div>
      {d.parseError && <div className="text-xs text-red-500 font-mono">parseError: {d.parseError}</div>}
      {d.repairs && d.repairs.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Réparations déterministes pré-validation</div>
          <pre className="rounded border border-border/60 p-3 text-xs overflow-auto max-h-40 whitespace-pre-wrap">{d.repairs.join("\n")}</pre>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-medium mb-2">Sortie brute — 800 premiers caractères</div>
          <pre className="rounded border border-border/60 p-3 text-xs overflow-auto max-h-72 whitespace-pre-wrap">{d.rawFirst800 ?? "—"}</pre>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Sortie brute — 400 derniers caractères</div>
          <pre className="rounded border border-border/60 p-3 text-xs overflow-auto max-h-72 whitespace-pre-wrap">{d.rawLast400 ?? "—"}</pre>
        </div>
      </div>
    </div>
  );
}

export default function PlanQAPage() {
  const [flag, setFlag] = useState(isJsonBetaEnabled());
  const [stats, setStats] = useState<PlanGenerationStat[]>(readPlanStats());
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [selectedSchemaFail, setSelectedSchemaFail] = useState<PlanGenerationStat | null>(null);

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
  const copyFullReport = async () => {
    await navigator.clipboard.writeText(buildFullReport(stats, testResults));
  };

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
            <Button size="sm" variant="outline" onClick={copyFullReport}>Copier le rapport complet</Button>
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
                  {[...stats].reverse().map((s, i) => <StatsRow key={i} s={s} onSelect={setSelectedSchemaFail} />)}
                </tbody>
              </table>
            </div>
          )}
          {selectedSchemaFail && (
            <div className="mt-5 rounded border border-border/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Diagnostic {selectedSchemaFail.errorCode}</div>
                  <div className="text-xs text-muted-foreground">{selectedSchemaFail.errorMessage}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedSchemaFail(null)}>Fermer</Button>
              </div>
              <SchemaFailDetails stat={selectedSchemaFail} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enum audit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit enums — schéma vs prompt JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(EXPECTED_ENUMS) as Array<keyof typeof EXPECTED_ENUMS>).map(key => {
            const expected = EXPECTED_ENUMS[key];
            const prompt = PROMPT_ENUMS[key];
            const ok = sameValues(expected, prompt);
            return (
              <div key={key} className="rounded border border-border/60 p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{key}</span>
                  <Badge variant="outline" className={ok ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}>{ok ? "MATCH" : "DIVERGENCE"}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">planSchema</span><pre className="mt-1 whitespace-pre-wrap">{expected.join(" | ")}</pre></div>
                  <div><span className="text-muted-foreground">systemPrompt JSON</span><pre className="mt-1 whitespace-pre-wrap">{prompt.join(" | ")}</pre></div>
                </div>
              </div>
            );
          })}
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
