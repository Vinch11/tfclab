/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pilot Cockpit — pilote de qualification Mode B (5 profils, consigne coach)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Sélection d'un profil parmi les 5 validés, lancement d'UNE génération
 * réelle, visualisation du résultat, consommation (estimée + réelle si
 * disponible), export JSON complet. Vérification de budget AVANT chaque
 * lancement — une ESTIMATION affichée au coach, jamais un blocage
 * automatique garanti (consigne coach explicite, cf. pilotCockpitBudget.ts).
 *
 * Dimension A (fiabilité technique) est calculée ici (validatePlan +
 * runAllChecks, automatisable). Dimension B (qualité d'entraînement,
 * physiologique) ne l'est PAS — elle nécessite une relecture humaine
 * indépendante, rédigée AVANT consultation du score interne (cf. rapport
 * Étape 2) ; ce panneau le rappelle explicitement plutôt que de faire
 * semblant de l'automatiser.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePilotCockpit, type PilotCockpitResult } from "@/lib/plan/qa/usePilotCockpit";
import { PILOT_PROFILES } from "@/lib/plan/qa/pilotCockpitProfiles";
import { computeCumulative, type BudgetCheckResult } from "@/lib/plan/qa/pilotCockpitBudget";
import type { QAProfile } from "@/lib/plan/qa/syntheticProfiles";
import { exportTextFile } from "@/lib/exportFile";

function formatCredits(n: number): string {
  return n.toFixed(2);
}

function levelBadgeVariant(level: BudgetCheckResult["level"]): "default" | "secondary" | "destructive" {
  if (level === "over") return "destructive";
  if (level === "warning") return "secondary";
  return "default";
}

/**
 * Export JSON robuste multi-plateformes (cf. src/lib/exportFile.ts) : le
 * pattern Blob + `<a download>` seul échoue silencieusement sur iOS Safari
 * et dans certains contextes PWA — ce plan complet et cet audit P0 doivent
 * rester récupérables même dans ces contextes.
 */
async function downloadJSON(data: unknown, filename: string, successNote?: string): Promise<void> {
  const text = JSON.stringify(data, null, 2);
  const result = await exportTextFile(text, filename, "application/json");
  const suffix = successNote ? ` ${successNote}` : "";
  switch (result.method) {
    case "share":
      toast.success(`${filename} partagé.${suffix}`);
      break;
    case "download":
      toast.success(`${filename} téléchargé — vérifiez vos téléchargements.${suffix}`);
      break;
    case "window":
      toast.success(`${filename} ouvert dans un nouvel onglet — enregistrez-le manuellement (téléchargement direct indisponible ici).${suffix}`);
      break;
    case "cancelled":
      break;
    case "none":
      toast.error(`Impossible d'exporter ${filename} (partage, téléchargement et nouvel onglet tous bloqués).`);
      break;
  }
}

function buildExportPayload(profile: QAProfile, result: PilotCockpitResult) {
  const criticalIssues = result.validatorResult?.issues.filter((i) => i.severity === "error") ?? [];
  return {
    meta: {
      profileId: profile.id,
      profileLabel: profile.label,
      timestamp: new Date(result.ts).toISOString(),
      durationMs: result.durationMs,
      model: "google/gemini-3.7-flash",
      expectedChunks: profile.expectedChunks,
      usage: result.usage,
      errorMessage: result.errorMessage,
    },
    input: {
      athleteData: result.preparedContext?.athleteData ?? profile.athleteData,
      planConfig: result.preparedContext?.planConfig ?? profile.planConfig,
    },
    physiology: {
      diagnostic: result.preparedContext?.diagnostic ?? null,
      decision: result.preparedContext?.decision ?? null,
      trace: result.physiologicalTrace,
      sessionTraceability: result.sessionPhysiologicalTraceability,
    },
    output: {
      mergedPlan: result.merged,
    },
    validation: {
      technical: {
        checks: result.checks,
        stat: result.stat,
      },
      validatePlanResult: result.validatorResult
        ? {
            score: result.validatorResult.score,
            grade: result.validatorResult.grade,
            issues: result.validatorResult.issues,
            criticalIssueCount: criticalIssues.length,
            lorangCategories: result.validatorResult.lorangCategories,
          }
        : null,
      // Dimension B (qualité d'entraînement) : volontairement absente de
      // cet export automatique — à rédiger séparément, indépendamment de
      // ce qui précède (cf. gabarit Étape 2), puis archivée à part.
      physiologicalReviewPending: true,
    },
  };
}

export function PilotCockpitPanel() {
  const { isRunning, lastResult, runProfile, checkBudget, budget, chunkProgress, exportLastRunSafety } = usePilotCockpit();
  const [p0Week1Hours, setP0Week1Hours] = useState("");
  const [p0RampPct, setP0RampPct] = useState("");
  const [p0RunQuota, setP0RunQuota] = useState("");
  const [p0HighRisk, setP0HighRisk] = useState<"unknown" | "yes" | "no">("unknown");
  const [selectedId, setSelectedId] = useState<string>(PILOT_PROFILES[0].id);
  // Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER
  // TEST CONTRÔLÉ (consigne coach explicite) : mode de test EXPLICITEMENT
  // opt-in (jamais activé par défaut), limité au 1er chunk uniquement —
  // permet d'examiner les premières semaines sans lancer automatiquement
  // les chunks suivants. Ne modifie AUCUNE génération normale (case décochée
  // par défaut, aucun champ posé dans ce cas — cf. usePilotCockpit.ts).
  const [limitToFirstChunk, setLimitToFirstChunk] = useState(false);
  // JOUR 1 — sécurisation du déploiement (consigne coach explicite) :
  // par défaut (true), chaque run appelle "ai-training-plan-test" (copie
  // exacte, isolée, de la fonction de production) — jamais la fonction
  // utilisée par les athlètes réels, tant que ce n'est pas explicitement
  // décoché. Décocher = bascule consciente vers la fonction de production,
  // jamais le comportement par défaut.
  const [useTestFunction, setUseTestFunction] = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState<{ profile: QAProfile; check: BudgetCheckResult; maxChunks?: number; functionName?: string } | null>(null);

  const selectedProfile = PILOT_PROFILES.find((p) => p.id === selectedId) ?? PILOT_PROFILES[0];
  const cumulative = computeCumulative(budget.runs);

  const handleLaunchClick = () => {
    const maxChunks = limitToFirstChunk ? 1 : undefined;
    const functionName = useTestFunction ? "ai-training-plan-test" : undefined;
    const effectiveChunks = maxChunks ? Math.min(maxChunks, selectedProfile.expectedChunks) : selectedProfile.expectedChunks;
    const check = checkBudget(effectiveChunks);
    setPendingConfirm({ profile: selectedProfile, check, maxChunks, functionName });
  };

  const handleConfirmLaunch = async () => {
    const profile = pendingConfirm?.profile;
    const maxChunks = pendingConfirm?.maxChunks;
    const functionName = pendingConfirm?.functionName;
    setPendingConfirm(null);
    if (!profile) return;
    try {
      const result = await runProfile(profile, maxChunks, functionName);
      if (result.errorMessage) {
        toast.error(`Échec génération ${profile.id} : ${result.errorMessage}`);
      } else {
        toast.success(`Génération ${profile.id} terminée (${(result.durationMs / 1000).toFixed(1)}s).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExport = async () => {
    if (!lastResult || !lastResult.merged) return;
    const profile = PILOT_PROFILES.find((p) => p.id === lastResult.profileId);
    if (!profile) return;
    const payload = buildExportPayload(profile, lastResult);
    const dateStr = new Date(lastResult.ts).toISOString().slice(0, 10);
    await downloadJSON(payload, `${dateStr}_${profile.id}_run1.json`);
  };

  const handleSafetyExport = async () => {
    if (!lastResult?.merged || lastResult.profileId !== "B-5K-BEGINNER") return;
    const hours = p0Week1Hours.trim() === "" ? null : Number(p0Week1Hours);
    const ramp = p0RampPct.trim() === "" ? null : Number(p0RampPct);
    const quota = p0RunQuota.trim() === "" ? null : Number(p0RunQuota);
    if ((hours !== null && (!Number.isFinite(hours) || hours <= 0)) ||
        (ramp !== null && (!Number.isFinite(ramp) || ramp < 0 || ramp > 100)) ||
        (quota !== null && (!Number.isInteger(quota) || quota < 1))) {
      toast.error("Contrats CAP invalides : corrigez les valeurs avant export.");
      return;
    }
    const report = exportLastRunSafety({
      trainingLevel: "untrained",
      highRunInjuryRisk: p0HighRisk === "yes",
      week1RunHoursMax: hours,
      weeklyRunIncreasePctMax: ramp === null ? null : ramp / 100,
      runSessionsPerWeek: quota,
      hasPriorLoadForDeload: false,
    });
    if (!report) return;
    await downloadJSON({
      ...report,
      coachSuppliedContracts: {
        week1RunHoursMax: hours, weeklyRunIncreasePctMax: ramp === null ? null : ramp / 100,
        runSessionsPerWeek: quota, highRunInjuryRisk: p0HighRisk === "yes",
        highRunInjuryRiskAssessment: p0HighRisk,
        hasPriorLoadForDeload: false,
        note: "Hypothèses explicites du coach ; champs vides = contrôle non évalué. Historique antérieur non confirmé.",
      },
    }, `${new Date(lastResult.ts).toISOString().slice(0, 10)}_B-5K-BEGINNER_audit-P0.json`, "Audit P0 local, sans appel IA.");
  };

  const criticalIssues = lastResult?.validatorResult?.issues.filter((i) => i.severity === "error") ?? [];
  const warningIssues = lastResult?.validatorResult?.issues.filter((i) => i.severity === "warning") ?? [];
  const uncertainTagging = lastResult?.validatorResult?.lorangCategories.uncertainTagging ?? 0;
  const physiologicalTrace = lastResult?.physiologicalTrace ?? null;
  const sessionTraceability = lastResult?.sessionPhysiologicalTraceability ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilot Cockpit — qualification Mode B (5 profils)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ─── Budget cumulé ─────────────────────────────────────────── */}
        <div className="rounded-md border p-3 space-y-1">
          <div className="text-sm font-medium">Budget pilote</div>
          <div className="text-sm text-muted-foreground">
            Cumul estimé : {formatCredits(cumulative.low)} à {formatCredits(cumulative.high)} crédits
            {" "}({budget.maxCredits} max, alerte à {budget.alertCredits}) — {cumulative.runsCount} run(s) effectué(s)
            {" "}({cumulative.measuredRunsCount} confirmé(s) par le gateway, {cumulative.fallbackRunsCount} sans confirmation).
          </div>
          {cumulative.hasRealUsage && (
            <div className="text-sm text-muted-foreground">
              Usage réel mesuré (cumul, tentatives finales + retry Zod — hors retries transitoires) : {cumulative.realTotalTokens} tokens.
            </div>
          )}
          {cumulative.fallbackRunsCount > 0 && (
            <div className="text-xs text-amber-600">
              ⚠ {formatCredits(cumulative.fallbackLow)} à {formatCredits(cumulative.fallbackHigh)} crédits (sur le total ci-dessus) proviennent de {cumulative.fallbackRunsCount} run(s) SANS usage confirmé par le gateway — ce n'est PAS une preuve d'absence de facturation : l'appel a pu être facturé avant tout retour d'usage. Estimation au coût plein (expectedChunks) retenue par précaution, jamais zéro.
            </div>
          )}
          <div className="text-xs text-muted-foreground italic">
            Estimation affichée avant chaque lancement — jamais un blocage automatique garanti pendant une génération en cours (aucune API de solde Lovable en temps réel câblée ici).
          </div>
        </div>

        {/* ─── Sélection + lancement ─────────────────────────────────── */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Profil</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PILOT_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                disabled={isRunning}
                className={`text-left rounded-md border p-2 text-sm transition-colors ${
                  selectedId === p.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.expectedChunks} chunk(s) de base</div>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={limitToFirstChunk}
              onChange={(e) => setLimitToFirstChunk(e.target.checked)}
              disabled={isRunning}
            />
            Limiter ce run au 1er chunk uniquement (test contrôlé — génération réelle partielle, pas simulée)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useTestFunction}
              onChange={(e) => setUseTestFunction(e.target.checked)}
              disabled={isRunning}
            />
            Utiliser la fonction de test "ai-training-plan-test" (coché par défaut — décocher pour appeler la fonction de production utilisée par les athlètes)
          </label>
          <div className="text-xs font-medium">
            Fonction qui sera appelée : <code>{useTestFunction ? "ai-training-plan-test" : "ai-training-plan"}</code>
            {!useTestFunction && <span className="text-destructive"> — PRODUCTION, athlètes réels</span>}
          </div>
          <Button onClick={handleLaunchClick} disabled={isRunning}>
            {isRunning ? "Génération en cours…" : `Lancer ${selectedProfile.id}${limitToFirstChunk ? " (1er chunk)" : ""}`}
          </Button>
          {isRunning && chunkProgress && (
            <div className="text-sm text-muted-foreground">
              Bloc {chunkProgress.currentChunk}/{chunkProgress.totalChunks} — semaine {chunkProgress.currentWeek}/{chunkProgress.totalWeeks}
            </div>
          )}
        </div>

        {/* ─── Résultat du dernier run ───────────────────────────────── */}
        {lastResult && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Dernier run : {lastResult.profileId}</span>
              {lastResult.errorMessage && <Badge variant="destructive">Échec</Badge>}
            </div>

            {lastResult.errorMessage && (
              <div className="text-sm text-destructive">{lastResult.errorMessage}</div>
            )}

            {lastResult.validatorResult && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Dimension A — Fiabilité technique (automatisable)
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={criticalIssues.length > 0 ? "destructive" : "default"}>
                    Score {lastResult.validatorResult.score}/100 — {lastResult.validatorResult.grade}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {criticalIssues.length} critique(s), {warningIssues.length} avertissement(s)
                  </span>
                </div>
                {uncertainTagging > 0 && (
                  <div className="text-xs text-amber-600">
                    ⚠ {uncertainTagging} séance(s) classée(s) Lorang A/B/C/D via le dernier recours (catalogId seul, zones/mots-clés absents) — catégorie NON certaine.
                  </div>
                )}
                {criticalIssues.length > 0 && (
                  <ul className="text-xs text-destructive list-disc pl-4 space-y-0.5">
                    {criticalIssues.slice(0, 8).map((i, idx) => (
                      <li key={idx}>{i.message}</li>
                    ))}
                  </ul>
                )}
                {lastResult.checks && (
                  <div className="text-xs text-muted-foreground">
                    Checks B1-B14 : {lastResult.checks.filter((c) => c.pass).length}/{lastResult.checks.length} OK
                    {lastResult.checks.some((c) => !c.pass) && (
                      <> — échecs : {lastResult.checks.filter((c) => !c.pass).map((c) => c.id).join(", ")}</>
                    )}
                  </div>
                )}
              </div>
            )}

            {physiologicalTrace && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium">Chaîne physiologique préparée</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={physiologicalTrace.diagnostic.executed ? "default" : "destructive"}>
                    Diagnostic {physiologicalTrace.diagnostic.executed ? "calculé" : "absent"}
                  </Badge>
                  <Badge variant={physiologicalTrace.decision.executed ? "default" : "destructive"}>
                    Stratégie {physiologicalTrace.decision.source}
                  </Badge>
                  <Badge variant="secondary">
                    Confiance diagnostic {physiologicalTrace.diagnostic.confidenceGlobal == null
                      ? "inconnue"
                      : `${Math.round(physiologicalTrace.diagnostic.confidenceGlobal * 100)}%`}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Limiteurs : {physiologicalTrace.diagnostic.limiters.length > 0
                    ? physiologicalTrace.diagnostic.limiters.map(limiter => `L${limiter.priority} ${limiter.metric} (${limiter.status})`).join(" · ")
                    : "aucun classable"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Leviers : {physiologicalTrace.decision.levers.length > 0
                    ? physiologicalTrace.decision.levers.map(lever => `#${lever.priority} ${lever.label}`).join(" · ")
                    : "aucun calculé"}
                </div>
                {physiologicalTrace.diagnostic.uncertainty.length > 0 && (
                  <ul className="text-xs text-amber-600 list-disc pl-4">
                    {physiologicalTrace.diagnostic.uncertainty.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {Object.entries(physiologicalTrace.transmission).map(([name, evidence]) => (
                    <div key={name} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                      <span>{name}</span>
                      <Badge variant={evidence.status === "missing" || evidence.status === "not_verified" ? "secondary" : "default"}>
                        {evidence.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  « Consommé » signifie qu’un consommateur du code est identifié. Cette trace décrit la préparation avant génération ;
                  le rapport des séances finales ci-dessous vérifie séparément les attributions réellement démontrables.
                </div>
              </div>
            )}

            {sessionTraceability && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="text-sm font-medium">Traçabilité des séances finales</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="default">{sessionTraceability.summary.verified} vérifiée(s)</Badge>
                  <Badge variant="secondary">{sessionTraceability.summary.uncertain} incertaine(s)</Badge>
                  <Badge variant="secondary">{sessionTraceability.summary.notVerified} non vérifiée(s)</Badge>
                  <Badge variant={sessionTraceability.summary.critical > 0 ? "destructive" : "default"}>
                    {sessionTraceability.summary.critical} conflit(s) critique(s)
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ce rapport est séparé du score QA existant. Une attribution « vérifiée » repose sur la séance finale,
                  son ID et ses métadonnées catalogue, un couple limiteur–levier calculé et une dose structurée concordante.
                </div>
                {sessionTraceability.sessions
                  .filter(session => session.status !== "not_applicable")
                  .slice(0, 16)
                  .map(session => (
                    <div key={session.sessionKey} className="rounded border px-2 py-1.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={session.status === "verified" ? "default" : "secondary"}>{session.status}</Badge>
                        <span className="font-medium">S{session.weekNumber} {session.dayName} — {session.title}</span>
                        {session.catalogId && <span className="text-muted-foreground">[{session.catalogId}]</span>}
                      </div>
                      <div className="text-muted-foreground">
                        {session.limiter ? `L${session.limiter.priority} ${session.limiter.metric}` : "limiteur non vérifié"}
                        {" → "}
                        {session.lever ? `#${session.lever.priority} ${session.lever.label}` : "levier non vérifié"}
                        {" → "}
                        {session.intention?.family ?? "intention non vérifiée"}
                        {" → dose "}{session.dose.status}
                      </div>
                      <div className="text-muted-foreground">{session.justification}</div>
                      {session.anomalies.some(item => item.severity !== "info") && (
                        <ul className="list-disc pl-4 text-amber-700">
                          {session.anomalies.filter(item => item.severity !== "info").map((item, index) => (
                            <li key={`${item.code}-${index}`}>{item.severity} · {item.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                {sessionTraceability.sessions.filter(session => session.status !== "not_applicable").length > 16 && (
                  <div className="text-xs text-muted-foreground">
                    Aperçu limité à 16 séances ; l’export JSON contient toutes les attributions et anomalies.
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 space-y-1">
              <div className="text-sm font-medium">Dimension B — Qualité d'entraînement (relecture indépendante requise)</div>
              <div className="text-xs text-muted-foreground">
                Non automatisée ici, volontairement. À rédiger séparément, à partir du plan exporté, AVANT de reconsulter le score ci-dessus
                (éviter le biais d'ancrage) — cf. gabarit d'évaluation A/B de l'Étape 2 (progression, intensités réelles, fatigue/récupération,
                spécificité, affûtage, faisabilité, et la grille dédiée aux mauvaises décisions d'entraînement).
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Consommation de ce run : {lastResult.usage
                ? `${lastResult.usage.totalChunksSeen} chunk(s) complété(s), ${lastResult.usage.totalTokens} tokens mesurés (${lastResult.usage.chunksWithUsage}/${lastResult.usage.totalChunksSeen} avec usage renvoyé par le gateway)`
                : "usage NON CONFIRMÉ par le gateway (échec avant tout retour d'usage) — ceci ne signifie PAS qu'aucun coût n'a été facturé ; un appel au modèle a pu avoir lieu avant l'échec. Estimation par plage retenue par précaution (voir Budget pilote ci-dessus)."}
            </div>

            {lastResult.profileId === "B-5K-BEGINNER" && lastResult.merged && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="text-sm font-medium">Audit P0 débutant — diagnostic local uniquement</div>
                <p className="text-xs text-muted-foreground">
                  Renseignez uniquement des plafonds CAP confirmés. Les champs vides ne sont pas évalués.
                  Le renforcement est exclu. Risque de blessure inconnu par défaut (contrôle d’intensité avancée non évalué si inconnu) ; historique antérieur non confirmé.
                  Le fichier contient le plan complet : à conserver de manière confidentielle.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="text-xs space-y-1">
                    <span>Plafond CAP S1 (heures)</span>
                    <input className="w-full rounded border bg-background px-2 py-1" type="number" min="0.1" step="0.1"
                      value={p0Week1Hours} onChange={e => setP0Week1Hours(e.target.value)} placeholder="Non évalué" />
                  </label>
                  <label className="text-xs space-y-1">
                    <span>Hausse CAP max (%)</span>
                    <input className="w-full rounded border bg-background px-2 py-1" type="number" min="0" max="100" step="1"
                      value={p0RampPct} onChange={e => setP0RampPct(e.target.value)} placeholder="Non évalué" />
                  </label>
                  <label className="text-xs space-y-1">
                    <span>Séances CAP / semaine</span>
                    <input className="w-full rounded border bg-background px-2 py-1" type="number" min="1" step="1"
                      value={p0RunQuota} onChange={e => setP0RunQuota(e.target.value)} placeholder="Non évalué" />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs">
                  <span>Risque de blessure CAP (évaluation coach)</span>
                  <select className="w-full rounded border bg-background px-2 py-1" value={p0HighRisk}
                    onChange={e => setP0HighRisk(e.target.value as "unknown" | "yes" | "no")}>
                    <option value="unknown">Inconnu — contrôle intensité non évalué</option>
                    <option value="yes">Élevé — confirmé</option>
                    <option value="no">Non élevé — confirmé</option>
                  </select>
                </label>
                <Button variant="outline" size="sm" onClick={handleSafetyExport}>
                  Exporter audit P0 + plan complet (JSON, sans IA)
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleExport} disabled={!lastResult.merged}>
              Exporter le plan complet (JSON)
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Lancer {pendingConfirm?.profile.id}{pendingConfirm?.maxChunks ? ` (limité à ${pendingConfirm.maxChunks} chunk)` : ""} — appel IA payant
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium">
                  Fonction appelée : <code>{pendingConfirm?.functionName || "ai-training-plan"}</code>
                  {!pendingConfirm?.functionName && <span className="text-destructive"> — PRODUCTION, athlètes réels</span>}
                </div>
                <div>{pendingConfirm?.check.message}</div>
                {pendingConfirm?.maxChunks && (
                  <div className="text-xs text-amber-600">
                    Mode test contrôlé : seul{pendingConfirm.maxChunks > 1 ? "s" : ""} {pendingConfirm.maxChunks} chunk{pendingConfirm.maxChunks > 1 ? "s" : ""} sur {pendingConfirm.profile.expectedChunks} sera{pendingConfirm.maxChunks > 1 ? "nt" : ""} réellement généré{pendingConfirm.maxChunks > 1 ? "s" : ""} — génération RÉELLE partielle, jamais simulée.
                  </div>
                )}
                <div className="text-xs">
                  Cette vérification est une estimation affichée avant de cliquer — elle n'empêchera pas la génération d'aller jusqu'au bout
                  si elle dépasse la projection (aucun blocage automatique garanti pendant une génération en cours).
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLaunch}>
              Lancer malgré tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
