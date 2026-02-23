/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COACH DECISION CENTER TFCL™ — Carte Unifiée (Phase 1e UX)
 * Consolidation de:
 * - TFCLDecisionMatrixCard (Diagnostic + Facteur limitant)
 * - TFCLDecisionMatrixTable (Matrice Symptômes)
 * - LorangStrategyCard (Leviers + Interdictions)
 * 
 * 3 onglets: Diagnostic | Symptômes | Leviers
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import {
  Brain,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { TFCLDecisionMatrixCard } from "./TFCLDecisionMatrixCard";
import { TFCLDecisionMatrixTable } from "./TFCLDecisionMatrixTable";
import { LorangStrategyCard } from "./LorangStrategyCard";

import type { TFCLDecisionInput } from "@/lib/v2/tfclDecisionMatrix";
import { computeTFCLDecisionMatrix } from "@/lib/v2/tfclDecisionMatrix";
import type { LorangStrategyInput } from "@/lib/v2/lorangStrategyEngine";
import { computeLorangStrategy } from "@/lib/v2/lorangStrategyEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricsContext {
  vo2max: number | null;
  vo2maxTarget: number;
  vlamax: number | null;
  vlamaxTarget: number;
  tte: number | null;
  tteTarget: number;
  fatmax: number | null;
  fatmaxTarget: number;
  freshness: number | null;
}

export interface CoachDecisionUnifiedCardProps {
  decisionInput: TFCLDecisionInput;
  symptomMetrics: MetricsContext;
  lorangInput: LorangStrategyInput;
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function CoachDecisionUnifiedCard({
  decisionInput,
  symptomMetrics,
  lorangInput,
  staffMode = false,
  compact = false,
  className,
}: CoachDecisionUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState("diagnostic");

  // Compute results for header summary
  const decisionResult = useMemo(() => computeTFCLDecisionMatrix(decisionInput), [decisionInput]);
  const lorangResult = useMemo(() => computeLorangStrategy(lorangInput), [lorangInput]);

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
                decisionResult.isRobust
                  ? "border-green-500 text-green-700 dark:text-green-400"
                  : "border-amber-500 text-amber-700 dark:text-amber-400"
              )}
            >
              {decisionResult.isRobust ? "Robuste" : "Marginal"}
            </Badge>
          </div>
        </div>

        {/* Summary row: Limiteur + Levier + Sprint Ban */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{decisionResult.limitingFactorEmoji}</span>
            <span className="font-medium">{decisionResult.limitingFactorLabel}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{decisionResult.leverIcon}</span>
            <span className="font-medium text-primary">{decisionResult.leverLabel}</span>
          </div>
          {lorangResult.hasSprintBan && (
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

          {/* Diagnostic Tab — Reuse existing TFCLDecisionMatrixCard (embedded, no outer Card) */}
          <AnimatedTabsContent value="diagnostic" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <TFCLDecisionMatrixCard
              input={decisionInput}
              compact={compact}
              showDomainDetails={staffMode}
              className="border-0 shadow-none"
            />
          </AnimatedTabsContent>

          {/* Symptoms Tab — Deferred rendering */}
          <LazyTabsContent value="symptoms" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <TFCLDecisionMatrixTable
              metrics={symptomMetrics}
              className="border-0 shadow-none"
            />
          </LazyTabsContent>

          {/* Levers Tab — Deferred rendering */}
          <LazyTabsContent value="levers" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <LorangStrategyCard
              input={lorangInput}
              showStaffLevers={staffMode}
              compact={compact}
              className="border-0 shadow-none"
            />
          </LazyTabsContent>
          </SwipeableTabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default CoachDecisionUnifiedCard;
