/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COACH DECISION CENTER TFCL™ — Carte Unifiée (Phase 2 Architecture)
 * 
 * Consomme désormais les engines unifiés :
 * - AthleteDiagnostic (Diagnostic Engine)
 * - TrainingPrescription (Decision Engine)
 * 
 * 3 onglets: Diagnostic | Symptômes | Leviers
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import {
  Brain,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react";

import { TFCLDecisionMatrixCard } from "./TFCLDecisionMatrixCard";
import { TFCLDecisionMatrixTable } from "./TFCLDecisionMatrixTable";
import { LorangStrategyCard } from "./LorangStrategyCard";

import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { TrainingPrescription } from "@/engines/decision";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS — Nouvelle interface basée sur les engines
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoachDecisionUnifiedCardProps {
  diagnostic: AthleteDiagnostic;
  prescription: TrainingPrescription;
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function CoachDecisionUnifiedCard({
  diagnostic,
  prescription,
  staffMode = false,
  compact = false,
  className,
}: CoachDecisionUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState("diagnostic");

  const { strategy } = prescription;
  const matrixResult = strategy._matrixResult;
  const lorangResult = strategy._lorangResult;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header synthétique */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Centre Décisionnel TFCL™</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Diagnostic • Symptômes • Leviers d'action
            </p>
          </div>

          {/* Résumé rapide */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                strategy.isRobust
                  ? "border-green-500 text-green-700 dark:text-green-400"
                  : "border-amber-500 text-amber-700 dark:text-amber-400"
              )}
            >
              {strategy.isRobust ? "Robuste" : "Marginal"}
            </Badge>
          </div>
        </div>

        {/* Summary row: Limiteur + Levier + Sprint Ban */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{matrixResult?.limitingFactorEmoji ?? "🔍"}</span>
            <span className="font-medium">{matrixResult?.limitingFactorLabel ?? diagnostic.limiter.limiterLabel}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{matrixResult?.leverIcon ?? "🎯"}</span>
            <span className="font-medium text-primary">{matrixResult?.leverLabel ?? strategy.primaryAction}</span>
          </div>
          {strategy.hasSprintBan && (
            <Badge variant="destructive" className="text-[10px]">
              Sprint Ban
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 pt-2">
            <TabsTrigger value="diagnostic" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <Target className="h-3.5 w-3.5" />
              Diagnostic
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Symptômes
            </TabsTrigger>
            <TabsTrigger value="levers" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <Zap className="h-3.5 w-3.5" />
              Leviers
            </TabsTrigger>
          </TabsList>

          <SwipeableTabsContent tabs={["diagnostic", "symptoms", "levers"]} activeTab={activeTab} onTabChange={setActiveTab}>

          {/* Diagnostic Tab — Pass the matrix input from prescription internals */}
          <AnimatedTabsContent value="diagnostic" activeValue={activeTab} className="px-4 pb-4 mt-0">
            {matrixResult ? (
              <TFCLDecisionMatrixCard
                input={matrixResult._input ?? ({} as any)}
                compact={compact}
                showDomainDetails={staffMode}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <p className="font-medium">{diagnostic.synthesis.headline}</p>
                <p className="mt-1 text-xs">Confiance : {Math.round(diagnostic.meta.confidenceGlobal * 100)}%</p>
              </div>
            )}
          </AnimatedTabsContent>

          {/* Symptoms Tab */}
          <LazyTabsContent value="symptoms" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <TFCLDecisionMatrixTable
              metrics={{
                vo2max: diagnostic.limiter.gapAnalysis.find(g => g.metric === "VO2max")?.current ?? null,
                vo2maxTarget: diagnostic.targets.current.ftp_kg_min * 15,
                vlamax: diagnostic.effectifs.vlamax.value,
                vlamaxTarget: diagnostic.targets.vlamaxRange.optimal,
                tte: diagnostic.effectifs.tte.tte_min,
                tteTarget: diagnostic.targets.current.tte_min,
                fatmax: null,
                fatmaxTarget: 50,
                freshness: 100 - diagnostic.effectifs.fatigue.score,
              }}
              className="border-0 shadow-none"
            />
          </LazyTabsContent>

          {/* Levers Tab */}
          <LazyTabsContent value="levers" activeValue={activeTab} className="px-4 pb-4 mt-0">
            {lorangResult ? (
              <LorangStrategyCard
                input={lorangResult._input ?? ({} as any)}
                showStaffLevers={staffMode}
                compact={compact}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <p className="font-medium">{strategy.primaryAction}</p>
                <p className="mt-1 text-xs">{strategy.whyThis}</p>
              </div>
            )}
          </LazyTabsContent>
          </SwipeableTabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CoachDecisionUnifiedCard;
