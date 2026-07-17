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
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  readPlanStats, clearPlanStats,
  isForceMarkdownEnabled, setForceMarkdownEnabled,
  type PlanGenerationStat,
} from "@/lib/plan/planGenerationStats";
import { runMergeTests, type TestResult } from "@/lib/plan/mergeTests";
import { zDay, zPhase, zSport } from "@/lib/plan/planSchema";
import { useQARunner } from "@/lib/plan/qa/useQARunner";
import { TrailProbePanel } from "@/components/debug/TrailProbePanel";
import { buildQAReport, readQASessions, readQASessionsCloud, clearQASessions, type QASession } from "@/lib/plan/qa/verdict";
import { supabase } from "@/integrations/supabase/client";
import { ProductionSentinelPanel } from "@/components/plan-qa/ProductionSentinelPanel";
import { toast } from "sonner";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

/**
 * Rapport QA volumineux : le presse-papier mobile échoue silencieusement
 * (payload > ~1 MB ou perte du geste utilisateur après await). On télécharge
 * TOUJOURS un .md (fallback fiable) et on tente le clipboard en best-effort.
 */
/**
 * Export robuste multi-plateformes :
 *  1) iOS/Android : Web Share API (partage/enregistrement natif, marche dans les iframes).
 *  2) Desktop : téléchargement blob classique via <a download>.
 *  3) Fallback ultime (iframe sans allow-downloads, iOS Safari) : ouverture d'un nouvel onglet
 *     avec le rapport en <pre> — l'utilisateur peut faire "Enregistrer sous" / copier.
 *  Toujours tenté en parallèle : copie presse-papier (best-effort).
 */
async function exportReport(text: string, filename: string): Promise<void> {
  const size = text.length;
  const sizeKB = (size / 1024).toFixed(1);

  // Copie best-effort (à faire tôt, tant que le user-gesture est frais)
  let clipboardOk = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      clipboardOk = true;
    }
  } catch { /* ignore */ }

  // 1) Web Share API avec fichier — fonctionne sur iOS/Android même en iframe
  try {
    const file = new File([text], filename, { type: "text/markdown;charset=utf-8" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] }) && typeof navigator.share === "function") {
      await navigator.share({ files: [file], title: filename });
      toast.success(`Rapport partagé (${sizeKB} KB)${clipboardOk ? " + copié" : ""}.`);
      return;
    }
  } catch (e) {
    // AbortError = user cancelled → on ne fallback pas
    if (e instanceof Error && e.name === "AbortError") {
      toast.message("Partage annulé.");
      return;
    }
    // sinon on tente le download classique
  }

  // 2) Téléchargement blob classique
  let downloadTriggered = false;
  try {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    downloadTriggered = true;
  } catch { /* fallback ci-dessous */ }

  // 3) Fallback : nouvelle fenêtre avec le contenu (iframe sans allow-downloads / iOS in-app browser)
  try {
    const win = window.open("", "_blank");
    if (win) {
      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      win.document.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title>` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<style>body{font:13px/1.4 ui-monospace,Menlo,monospace;padding:12px;margin:0;white-space:pre-wrap;word-break:break-word}` +
        `header{position:sticky;top:0;background:#111;color:#fff;padding:8px 12px;margin:-12px -12px 12px;font-family:system-ui}` +
        `button{background:#fff;color:#111;border:0;padding:6px 10px;border-radius:6px;font-weight:600}</style></head>` +
        `<body><header>${filename} — ${sizeKB} KB &nbsp;` +
        `<button onclick="navigator.clipboard.writeText(document.getElementById('c').innerText)">Copier</button>` +
        `</header><pre id="c">${escaped}</pre></body></html>`,
      );
      win.document.close();
      toast.success(`Rapport ouvert dans un onglet (${sizeKB} KB)${clipboardOk ? " + copié" : ""}.`);
      return;
    }
  } catch { /* ignore */ }

  if (downloadTriggered) {
    toast.success(`Téléchargement lancé (${sizeKB} KB)${clipboardOk ? " + copié" : ""}. Vérifiez vos téléchargements.`);
  } else if (clipboardOk) {
    toast.success(`Rapport copié dans le presse-papier (${sizeKB} KB).`);
  } else {
    toast.error("Impossible d'exporter le rapport (téléchargement/partage/presse-papier bloqués).");
  }
}

function sessionFilename(s: QASession): string {
  const d = new Date(s.ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `qa_report_${stamp}_N${s.n}.md`;
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

function buildFullReport(stats: PlanGenerationStat[], testResults: TestResult[] | null, lastSession: QASession | null): string {
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
    "## Dernière session QA",
    lastSession ? buildQAReport(lastSession) : "_aucune session QA enregistrée_",
    "",
    "## Stats",
    stats.length === 0 ? "_aucune stat enregistrée_" : JSON.stringify(stats, null, 2),
    "",
    "## Merge tests (dernier click Run all)",
    testResults === null ? "_non exécutés dans cet onglet_" : JSON.stringify(testResults, null, 2),
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
  const [flag, setFlag] = useState(isForceMarkdownEnabled());
  const [stats, setStats] = useState<PlanGenerationStat[]>(readPlanStats());
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [selectedSchemaFail, setSelectedSchemaFail] = useState<PlanGenerationStat | null>(null);
  const [qaN, setQaN] = useState<1 | 3 | 5>(1);
  const [qaSessions, setQaSessions] = useState<QASession[]>(readQASessions());
  const qa = useQARunner();

  // Charge l'historique QA depuis le cloud (source de vérité cross-onglet).
  useEffect(() => {
    void readQASessionsCloud().then(cloud => {
      if (cloud.length > 0) setQaSessions(cloud);
    });
  }, []);

  // Expose to Playwright/E2E for targeted runs
  useEffect(() => {
    (window as any).__tfclQA = {
      runFullSuite: qa.runFullSuite,
      buildQAReport,
      readQASessions,
      readQASessionsCloud,
    };
    return () => { try { delete (window as any).__tfclQA; } catch { /* noop */ } };
  }, [qa.runFullSuite]);

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
    setForceMarkdownEnabled(v);
    setFlag(v);
  };

  const refresh = () => setStats(readPlanStats());
  const wipe = () => { clearPlanStats(); setStats([]); };
  const copyFullReport = async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    await exportReport(buildFullReport(stats, testResults, qa.lastSession), `qa_full_report_${stamp}.md`);
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

  // ── Self-test préconditions (auth + supabase) ─────────────────────────────
  const [selfTest, setSelfTest] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) { setSelfTest({ ok: false, message: `Auth: ${error.message}` }); return; }
        if (!data.session) { setSelfTest({ ok: false, message: "Pas de session d'authentification active — connectez-vous avant de lancer un run." }); return; }
        setSelfTest({ ok: true, message: `Runner opérationnel — session utilisateur ${data.session.user.email ?? data.session.user.id}` });
      } catch (e) {
        setSelfTest({ ok: false, message: `Self-test exception: ${e instanceof Error ? e.message : String(e)}` });
      }
    })();
  }, []);

  const runnerReady = selfTest?.ok === true;


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

      {/* Self-test préconditions */}
      {selfTest && (
        <div
          className={`rounded border p-3 text-sm ${
            selfTest.ok
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
              : "border-red-500/40 bg-red-500/5 text-red-600"
          }`}
        >
          <b>{selfTest.ok ? "✅ Runner opérationnel" : "🔴 Runner indisponible"}</b> — {selfTest.message}
        </div>
      )}

      {/* Sentinelle légère prod */}
      <ProductionSentinelPanel />

      {/* Quick relaunch — B-70.3 N=1 */}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">🚀 Relance rapide — B-70.3 N=1</CardTitle>
          <p className="text-xs text-muted-foreground">
            Relance en un clic le profil B-70.3 (trail probe) et affiche le statut de la génération en direct.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={qa.progress.running || !runnerReady}
            onClick={async () => {
              try {
                const s = await qa.runFullSuite(1, ["B-70.3"]);
                setStats(readPlanStats());
                setQaSessions(await readQASessionsCloud());
                if (s.verdict === "🟢") toast.success(`B-70.3 N=1 — ${s.summary}`);
                else if (s.verdict === "🟠") toast.warning(`B-70.3 N=1 — ${s.summary}`);
                else toast.error(`B-70.3 N=1 — ${s.summary}`);
              } catch (e) {
                toast.error(`B-70.3 interrompu : ${e instanceof Error ? e.message : String(e)}`);
              }
            }}
          >
            {qa.progress.running ? "⏳ Génération en cours…" : "🐾 Relancer B-70.3 N=1"}
          </Button>
          {qa.progress.running ? (
            <div className="rounded border border-primary/40 bg-background/60 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span>
                  Run <b>{qa.progress.currentRun}/{qa.progress.totalRuns}</b>
                  {qa.progress.currentProfile && (
                    <> — profil <b>{qa.progress.currentProfile}</b> (itération {qa.progress.currentRunOfProfile}/{qa.progress.N})</>
                  )}
                </span>
                {qa.progress.phase && (
                  <span className="text-muted-foreground">phase <b>{qa.progress.phase}</b></span>
                )}
              </div>
              <div className="h-1.5 bg-border/40 rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(qa.progress.currentRun / Math.max(qa.progress.totalRuns, 1)) * 100}%` }}
                />
              </div>
            </div>
          ) : qa.lastSession ? (
            <div className="text-xs text-muted-foreground">
              Dernier verdict : <b>{qa.lastSession.summary}</b> · {new Date(qa.lastSession.ts).toLocaleTimeString()}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Prêt. Aucune génération en cours.</div>
          )}
        </CardContent>
      </Card>



      {/* Feature flag */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flag — Forcer Markdown (debug)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="font-medium">Chemin Markdown legacy</div>
            <div className="text-xs text-muted-foreground mt-1">
              Le chemin JSON est activé par défaut pour tous les utilisateurs.
              Ce toggle rebranche explicitement le chemin Markdown legacy pour
              debug/diagnostic. Ne concerne que votre navigateur (localStorage).
            </div>
          </div>
          <Switch checked={flag} onCheckedChange={toggle} />
        </CardContent>
      </Card>

      {/* Phase 0 — Run complet 3 profils × N */}
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Run complet — 3 profils synthétiques × N</CardTitle>
          <p className="text-xs text-muted-foreground">
            Génère les plans B-70.3 · B-SEMI · B-SPRINT en mode JSON forcé et applique les checks B1-B7.
            Chaque itération consomme des crédits IA (~1 génération complète). Séquentiel, pas de parallèle.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm">N =</span>
            {([1, 3, 5] as const).map(n => (
              <Button
                key={n}
                size="sm"
                variant={qaN === n ? "default" : "outline"}
                onClick={() => setQaN(n)}
                disabled={qa.progress.running}
              >
                {n} run{n > 1 ? "s" : ""} / profil
              </Button>
            ))}
            <span className="text-xs text-muted-foreground">
              → {3 * qaN} génération{3 * qaN > 1 ? "s" : ""} totales
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  const s = await qa.runFullSuite(1, ["B-70.3"]);
                  setStats(readPlanStats());
                  setQaSessions(await readQASessionsCloud());
                  toast.info(`B-70.3 N=1 terminé — ${s.summary}`);
                } catch (e) {
                  toast.error(`B-70.3 interrompu : ${e instanceof Error ? e.message : String(e)}`);
                }
              }}
              disabled={qa.progress.running || !runnerReady}
            >
              🐾 B-70.3 N=1 (trail probe)
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={async () => {
                try {
                  const s = await qa.runFullSuite(qaN);
                  setStats(readPlanStats());
                  setQaSessions(await readQASessionsCloud());
                  if (s.verdict === "🟢") toast.success(`QA terminée — ${s.summary}`);
                  else if (s.verdict === "🟠") toast.warning(`QA terminée — ${s.summary}`);
                  else toast.error(`QA terminée — ${s.summary}`);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  toast.error(`QA interrompue : ${msg}`);
                  setStats(readPlanStats());
                  setQaSessions(await readQASessionsCloud());
                }
              }}
              disabled={qa.progress.running || !runnerReady}
            >
              {qa.progress.running ? "En cours…" : `Lancer (${3 * qaN} plans)`}
            </Button>
          </div>
          <TrailProbePanel />
          {qa.progress.running && (
            <div className="rounded border border-border/60 p-3 text-xs space-y-1">
              <div>
                Run <b>{qa.progress.currentRun}/{qa.progress.totalRuns}</b>
                {qa.progress.currentProfile && (
                  <> — profil <b>{qa.progress.currentProfile}</b> (itération {qa.progress.currentRunOfProfile}/{qa.progress.N})</>
                )}
                {qa.progress.phase && <> · phase <b>{qa.progress.phase}</b></>}
              </div>
              <div className="h-1.5 bg-border/40 rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(qa.progress.currentRun / Math.max(qa.progress.totalRuns, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
          {qa.lastSession && (
            <div className="rounded border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Verdict : {qa.lastSession.summary}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(qa.lastSession.ts).toLocaleString()} — {qa.lastSession.runs.length} runs, N={qa.lastSession.n}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!qa.lastSession}
                  onClick={() => exportReport(buildQAReport(qa.lastSession!), sessionFilename(qa.lastSession!))}
                >
                  Télécharger le rapport QA
                </Button>
              </div>

              {/* Merge tests bloc — jamais null */}
              <div className="text-xs">
                <b>Merge tests</b> :{" "}
                {qa.lastSession.mergeTests ? (
                  <span className={qa.lastSession.mergeTests.every(t => t.pass) ? "text-emerald-500" : "text-red-500"}>
                    {qa.lastSession.mergeTests.filter(t => t.pass).length}/{qa.lastSession.mergeTests.length} passing
                  </span>
                ) : (
                  <span className="text-red-500">
                    ⚠️ non exécutés — {qa.lastSession.mergeTestsError ?? "raison inconnue"}
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1">
                {qa.lastSession.runs.map((r, i) => {
                  const crit = r.checks.filter(c => c.level === "critical" && !c.pass);
                  const isErr = !!r.errorMessage;
                  const status = isErr ? "🔴" : crit.length > 0 ? "🔴" : "🟢";
                  return (
                    <div
                      key={i}
                      className={`rounded p-2 ${isErr ? "border border-red-500/40 bg-red-500/5" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{status}</span>
                        <span className="font-mono">{r.profileId}#{r.runIndex}</span>
                        <span className="text-muted-foreground">
                          {r.stat?.format ?? "?"} · {(r.durationMs / 1000).toFixed(1)}s
                          {crit.length > 0 && ` · ${crit.length} critical`}
                        </span>
                      </div>
                      {isErr && (
                        <div className="mt-1 text-red-500 font-mono text-[11px] whitespace-pre-wrap">
                          {r.errorMessage}
                          {r.errorStack && `\n${r.errorStack}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {qaSessions.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Historique QA ({qaSessions.length} session{qaSessions.length > 1 ? "s" : ""}) — persisté cloud
              </summary>
              <div className="mt-2 space-y-1">
                {[...qaSessions].reverse().map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-b-0">
                    <span>{s.verdict}</span>
                    <span className="text-muted-foreground">{new Date(s.ts).toLocaleString()}</span>
                    <span>— N={s.n} · {s.runs.length} runs</span>
                    <button
                      className="ml-auto text-primary underline underline-offset-2"
                      onClick={() => qa.setLastSession(s)}
                    >
                      afficher
                    </button>
                    <button
                      className="text-primary underline underline-offset-2"
                      onClick={() => exportReport(buildQAReport(s), sessionFilename(s))}
                    >
                      télécharger
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    clearQASessions();
                    setQaSessions([]);
                    // clearQASessions supprime aussi côté cloud (fire-and-forget).
                  }}
                >
                  Effacer l'historique QA
                </Button>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
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
