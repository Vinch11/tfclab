/**
 * usePlanAdaptation — Façade unifiée pour adapter un plan IA en cours
 *
 *  - applyPatch(...)       : transformation déterministe instantanée (Option 1)
 *  - regenerateWindow(...) : régénération IA d'une fenêtre (Option 2)
 *  - listHistory(...)      : historique des adaptations
 *
 * Toutes les adaptations sont journalisées et soumises au garde-fou anti-cascade.
 */

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { parseAIPlan } from "@/lib/aiPlanParser";
import {
  applyDeload,
  redistributeMissedSession,
  swapModality,
  shiftRaceDate,
  type PatchResult,
  type DeloadOptions,
  type MissedSessionOptions,
  type SwapModalityOptions,
  type ShiftRaceDateOptions,
} from "@/engines/plan/planPatcher";
import {
  buildWindowRegenConfig,
  mergeWindowIntoPlan,
  type WindowRegenRequest,
} from "@/engines/plan/planWindowRegen";
import {
  checkAdaptationGuard,
  journalAdaptation,
  listRecentAdaptations,
  type AdaptationTrigger,
} from "@/engines/plan/planAdaptationJournal";
import { useAITrainingPlan, type PlanConfig, type PlanAthleteData } from "@/hooks/useAITrainingPlan";
import { postProcessParsedPlan } from "@/engines/plan/computePlan";
import type { PlanGenerationConfig } from "@/engines/plan/types";
import { validatePlan, type ValidationIssue } from "@/engines/plan/planValidator";

export type PatchKind = "deload" | "missed_session" | "swap_modality" | "shift_race";

export interface ApplyPatchArgs {
  athleteId: string;
  coachId: string;
  currentPlan: ParsedPlan;
  triggeredBy: AdaptationTrigger;
  kind: PatchKind;
  options:
    | DeloadOptions
    | MissedSessionOptions
    | SwapModalityOptions
    | ShiftRaceDateOptions;
  /**
   * Config du plan d'origine (objectif, ambition, contraintes…) — nécessaire
   * pour appliquer le même post-traitement déterministe (résolution des
   * plages de durée, W'bal…) et le même garde-fou de validation qu'à la
   * génération initiale (cf. `postProcessParsedPlan` / `validatePlan`).
   */
  planConfig: PlanConfig;
  athleteData?: PlanAthleteData;
}

export function usePlanAdaptation() {
  const [isApplying, setIsApplying] = useState(false);
  const [pendingCriticalIssues, setPendingCriticalIssues] = useState<ValidationIssue[] | null>(null);
  const pendingConfirmRef = useRef<(() => Promise<PatchResult | ParsedPlan | null>) | null>(null);
  const aiPlan = useAITrainingPlan();

  /** Confirme la sauvegarde malgré les problèmes critiques détectés (override coach). */
  const confirmPendingSave = useCallback(async (): Promise<PatchResult | ParsedPlan | null> => {
    const fn = pendingConfirmRef.current;
    setPendingCriticalIssues(null);
    pendingConfirmRef.current = null;
    if (!fn) return null;
    setIsApplying(true);
    try {
      return await fn();
    } finally {
      setIsApplying(false);
    }
  }, []);

  /** Annule la sauvegarde en attente (le plan adapté n'est PAS persisté). */
  const cancelPendingSave = useCallback(() => {
    setPendingCriticalIssues(null);
    pendingConfirmRef.current = null;
  }, []);

  /** Persiste un ParsedPlan dans `plans.plan_json`. */
  const persistPlan = useCallback(
    async (athleteId: string, coachId: string, plan: ParsedPlan) => {
      const { error } = await supabase
        .from("plans")
        .upsert(
          [
            {
              athlete_id: athleteId,
              coach_id: coachId,
              plan_json: plan as any,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "athlete_id" }
        );
      if (error) throw error;
    },
    []
  );

  /** Archive le plan courant dans plan_versions avant écrasement. */
  const archive = useCallback(
    async (athleteId: string, coachId: string, plan: ParsedPlan, reason: string) => {
      await supabase.from("plan_versions").insert([
        {
          athlete_id: athleteId,
          coach_id: coachId,
          plan_json: plan as any,
          objective: `[ADAPTATION] ${reason}`,
          weeks_count: plan.totalWeeks,
          sessions_count: plan.weeks.reduce((sum, w) => sum + w.sessions.length, 0),
        },
      ]);
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // OPTION 1 — Patch déterministe
  // ───────────────────────────────────────────────────────────────────────────
  const applyPatch = useCallback(
    async (args: ApplyPatchArgs): Promise<PatchResult | null> => {
      setIsApplying(true);
      try {
        const guard = await checkAdaptationGuard(args.athleteId, "patch");
        if (guard.reason) {
          toast.info(guard.reason);
        }

        let result: PatchResult;
        switch (args.kind) {
          case "deload":
            result = applyDeload(args.currentPlan, args.options as DeloadOptions);
            break;
          case "missed_session":
            result = redistributeMissedSession(
              args.currentPlan,
              args.options as MissedSessionOptions
            );
            break;
          case "swap_modality":
            result = swapModality(args.currentPlan, args.options as SwapModalityOptions);
            break;
          case "shift_race":
            result = shiftRaceDate(args.currentPlan, args.options as ShiftRaceDateOptions);
            break;
        }

        if (result.diff.length === 0) {
          toast.warning(
            `Aucune modification appliquée${result.warnings[0] ? ` — ${result.warnings[0]}` : ""}`
          );
          return result;
        }

        // Même post-traitement déterministe qu'à la génération initiale
        // (résolution des plages de durée, W'bal…) — sans ça, un patch pouvait
        // laisser passer des durées non résolues ("70-120min") jamais vues par
        // `postProcessParsedPlan`.
        const genConfig: PlanGenerationConfig = {
          ...(args.planConfig as unknown as PlanGenerationConfig),
          weeksAvailable: result.plan.weeks.length,
          mode: "ai",
        };
        const { plan: processedPlan } = postProcessParsedPlan(result.plan, genConfig, args.athleteData);
        const finalResult: PatchResult = { ...result, plan: processedPlan };

        const vr = validatePlan(
          processedPlan,
          args.planConfig.objective,
          args.planConfig.prohibitions,
          undefined,
          args.planConfig.identifiedLimitersRaw,
          undefined,
          args.athleteData,
        );
        const criticalIssues = vr.issues.filter((i) => i.severity === "error");

        const weeksImpacted = Array.from(new Set(result.diff.map((d) => d.weekNumber))).sort();
        const doPersist = async (): Promise<PatchResult> => {
          await archive(args.athleteId, args.coachId, args.currentPlan, `Patch ${args.kind}`);
          await persistPlan(args.athleteId, args.coachId, processedPlan);

          await journalAdaptation({
            athleteId: args.athleteId,
            coachId: args.coachId,
            type: "patch",
            triggeredBy: args.triggeredBy,
            reason: `${args.kind}`,
            fromWeek: weeksImpacted[0],
            toWeek: weeksImpacted[weeksImpacted.length - 1],
            diff: result.diff,
            warnings: result.warnings,
          });

          toast.success(`Plan adapté — ${result.diff.length} modification(s)`);
          return finalResult;
        };

        if (criticalIssues.length > 0) {
          pendingConfirmRef.current = doPersist;
          setPendingCriticalIssues(criticalIssues);
          return null;
        }

        return await doPersist();
      } catch (err) {
        console.error("[usePlanAdaptation] applyPatch error:", err);
        toast.error("Échec de l'adaptation du plan");
        return null;
      } finally {
        setIsApplying(false);
      }
    },
    [archive, persistPlan]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // OPTION 2 — Régénération partielle (fenêtre IA légère)
  // ───────────────────────────────────────────────────────────────────────────
  const regenerateWindow = useCallback(
    async (req: WindowRegenRequest & { athleteId: string; coachId: string; triggeredBy: AdaptationTrigger }) => {
      setIsApplying(true);
      try {
        const guard = await checkAdaptationGuard(req.athleteId, "window_regen");
        if (!guard.allowed) {
          toast.error(guard.reason ?? "Régénération bloquée par le garde-fou");
          return null;
        }

        const { config, athleteData } = buildWindowRegenConfig(req);

        toast.info(
          `Régénération fenêtre S${req.fromWeek}→S${req.toWeek} (${req.toWeek - req.fromWeek + 1} sem)…`
        );

        aiPlan.reset();
        await aiPlan.generatePlan(athleteData, config);

        // ⚠ `aiPlan.response` / `aiPlan.parsedPlan` sont des states React encore
        // périmés dans ce closure : on lit les refs remplies pendant le stream.
        const generatedMarkdown = aiPlan.lastResponseRef.current || aiPlan.response;
        const streamedParsed = aiPlan.lastParsedPlanRef.current;

        let windowPlan: ParsedPlan | null = streamedParsed;
        if (!windowPlan) {
          if (!generatedMarkdown || generatedMarkdown.trim().length < 100) {
            console.error("[usePlanAdaptation] regen — réponse vide", {
              markdownLength: generatedMarkdown?.length ?? 0,
            });
            toast.error("Régénération IA — réponse vide ou tronquée");
            return null;
          }
          windowPlan = parseAIPlan(generatedMarkdown);
        }

        if (!windowPlan.weeks || windowPlan.weeks.length === 0) {
          console.error("[usePlanAdaptation] regen — aucune semaine parsée");
          toast.error("Régénération IA — aucune semaine exploitable dans la réponse");
          return null;
        }

        const merged = mergeWindowIntoPlan(req.currentPlan, windowPlan, req.fromWeek, req.toWeek);

        // Post-traitement déterministe sur le PLAN COMPLET fusionné (pas
        // seulement la fenêtre) : `normalizeWeeksAndPhases` y réassigne les
        // phases de la fenêtre depuis le recap GLOBAL (`merged.phases`,
        // préservé par `mergeWindowIntoPlan`), et la résolution des plages de
        // durée s'applique enfin aux séances régénérées — jusqu'ici sautée.
        const genConfig: PlanGenerationConfig = {
          ...(req.baseConfig as unknown as PlanGenerationConfig),
          weeksAvailable: merged.weeks.length,
          mode: "ai",
        };
        const { plan: processedPlan } = postProcessParsedPlan(merged, genConfig, req.athleteData);

        const vr = validatePlan(
          processedPlan,
          req.baseConfig.objective,
          req.baseConfig.prohibitions,
          undefined,
          req.baseConfig.identifiedLimitersRaw,
          undefined,
          req.athleteData,
        );
        const criticalIssues = vr.issues.filter((i) => i.severity === "error");

        const doPersist = async (): Promise<ParsedPlan> => {
          await archive(req.athleteId, req.coachId, req.currentPlan, `Window regen S${req.fromWeek}-${req.toWeek}`);
          await persistPlan(req.athleteId, req.coachId, processedPlan);

          await journalAdaptation({
            athleteId: req.athleteId,
            coachId: req.coachId,
            type: "window_regen",
            triggeredBy: req.triggeredBy,
            reason: req.reason ?? `Régénération S${req.fromWeek}-S${req.toWeek}`,
            fromWeek: req.fromWeek,
            toWeek: req.toWeek,
            warnings: [],
          });

          toast.success(`Fenêtre régénérée — S${req.fromWeek} à S${req.toWeek}`);
          return processedPlan;
        };

        if (criticalIssues.length > 0) {
          pendingConfirmRef.current = doPersist;
          setPendingCriticalIssues(criticalIssues);
          return null;
        }

        return await doPersist();
      } catch (err) {
        console.error("[usePlanAdaptation] regenerateWindow error:", err);
        toast.error("Échec de la régénération partielle");
        return null;
      } finally {
        setIsApplying(false);
      }
    },
    [aiPlan, archive, persistPlan]
  );

  const listHistory = useCallback(
    (athleteId: string, days?: number) => listRecentAdaptations(athleteId, days),
    []
  );

  return {
    isApplying,
    isRegenStreaming: aiPlan.isLoading,
    regenProgress: aiPlan.chunkProgress,
    applyPatch,
    regenerateWindow,
    listHistory,
    /** Problèmes critiques (severity=error) bloquant la sauvegarde en attente d'une confirmation coach. */
    pendingCriticalIssues,
    /** Sauvegarde quand même malgré les problèmes critiques (override coach). */
    confirmPendingSave,
    /** Annule la sauvegarde en attente — le plan adapté n'est PAS persisté. */
    cancelPendingSave,
  };
}
