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

function formatCredits(n: number): string {
  return n.toFixed(2);
}

function levelBadgeVariant(level: BudgetCheckResult["level"]): "default" | "secondary" | "destructive" {
  if (level === "over") return "destructive";
  if (level === "warning") return "secondary";
  return "default";
}

function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
      athleteData: profile.athleteData,
      planConfig: profile.planConfig,
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
  const { isRunning, lastResult, runProfile, checkBudget, budget, chunkProgress } = usePilotCockpit();
  const [selectedId, setSelectedId] = useState<string>(PILOT_PROFILES[0].id);
  const [pendingConfirm, setPendingConfirm] = useState<{ profile: QAProfile; check: BudgetCheckResult } | null>(null);

  const selectedProfile = PILOT_PROFILES.find((p) => p.id === selectedId) ?? PILOT_PROFILES[0];
  const cumulative = computeCumulative(budget.runs);

  const handleLaunchClick = () => {
    const check = checkBudget(selectedProfile.expectedChunks);
    setPendingConfirm({ profile: selectedProfile, check });
  };

  const handleConfirmLaunch = async () => {
    const profile = pendingConfirm?.profile;
    setPendingConfirm(null);
    if (!profile) return;
    try {
      const result = await runProfile(profile);
      if (result.errorMessage) {
        toast.error(`Échec génération ${profile.id} : ${result.errorMessage}`);
      } else {
        toast.success(`Génération ${profile.id} terminée (${(result.durationMs / 1000).toFixed(1)}s).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExport = () => {
    if (!lastResult || !lastResult.merged) return;
    const profile = PILOT_PROFILES.find((p) => p.id === lastResult.profileId);
    if (!profile) return;
    const payload = buildExportPayload(profile, lastResult);
    const dateStr = new Date(lastResult.ts).toISOString().slice(0, 10);
    downloadJSON(payload, `${dateStr}_${profile.id}_run1.json`);
  };

  const criticalIssues = lastResult?.validatorResult?.issues.filter((i) => i.severity === "error") ?? [];
  const warningIssues = lastResult?.validatorResult?.issues.filter((i) => i.severity === "warning") ?? [];
  const uncertainTagging = lastResult?.validatorResult?.lorangCategories.uncertainTagging ?? 0;

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
          <Button onClick={handleLaunchClick} disabled={isRunning}>
            {isRunning ? "Génération en cours…" : `Lancer ${selectedProfile.id}`}
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

            <Button variant="outline" size="sm" onClick={handleExport} disabled={!lastResult.merged}>
              Exporter le plan complet (JSON)
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lancer {pendingConfirm?.profile.id} — appel IA payant</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>{pendingConfirm?.check.message}</div>
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
