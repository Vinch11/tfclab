/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FATIGUE & DISPONIBILITÉ UNIFIED CARD — Phase 1d UX Consolidation
 * 
 * Fusionne:
 * - DisponibiliteTFCLCard (affichage synthèse disponibilité)
 * - TFCLDailyReadinessCheck (formulaire questionnaire)
 * - ChargeRecenteCard (charge 7j TSS)
 * 
 * Architecture: Header statut + Tabs (Statut, Check-in, Charge)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Battery,
  ChevronDown,
  ChevronUp,
  Target,
  ClipboardCheck,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import {
  type DisponibiliteTFCL,
  type TFCLReadinessInput,
  computeDisponibiliteTFCL,
  getDisponibiliteBadgeClass,
  getDisponibiliteBgColor,
} from "@/lib/v2/disponibiliteTFCL";
import { DisponibiliteTFCLCard } from "@/components/DisponibiliteTFCLCard";
import { TFCLDailyReadinessCheck } from "@/components/TFCLDailyReadinessCheck";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import type { ChargeRecenteReference } from "@/lib/chargeRecenteReference";
import type { DbCheckin } from "@/hooks/useCloudData";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FatigueDisponibiliteUnifiedCardProps {
  // Disponibilité
  latestCheckin?: DbCheckin | null;
  previousCheckin?: DbCheckin | null;
  objectiveData?: TFCLReadinessInput['objective'];
  
  // Daily check-in form
  athleteId: string;
  athleteName: string;
  onCheckinSubmit?: (input: TFCLReadinessInput, result: DisponibiliteTFCL) => void;
  
  // Charge récente
  crr?: ChargeRecenteReference | null;
  objectif: string;
  onCRRUpdate?: (value: number) => Promise<void>;
  
  // Display
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FatigueDisponibiliteUnifiedCard({
  latestCheckin,
  previousCheckin,
  objectiveData,
  athleteId,
  athleteName,
  onCheckinSubmit,
  crr,
  objectif,
  onCRRUpdate,
  staffMode = false,
  compact = false,
  className,
}: FatigueDisponibiliteUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState<string>("statut");
  const [isOpen, setIsOpen] = useState(!compact);

  // ── Compute disponibilité from latest check-in ──
  const disponibilite = useMemo(() => {
    if (!latestCheckin) return null;

    const input: TFCLReadinessInput = {
      sleep: latestCheckin.sleep ?? null,
      fatigue: latestCheckin.fatigue ?? null,
      soreness: latestCheckin.soreness ?? null,
      stress: latestCheckin.stress ?? null,
      motivation: latestCheckin.motivation ?? null,
      alerts: latestCheckin.pain_flag ? { asymmetric_pain: true } : undefined,
      objective: objectiveData,
    };

    const computed = computeDisponibiliteTFCL(input);

    // Trend
    if (previousCheckin) {
      const prevInput: TFCLReadinessInput = {
        sleep: previousCheckin.sleep ?? null,
        fatigue: previousCheckin.fatigue ?? null,
        soreness: previousCheckin.soreness ?? null,
        stress: previousCheckin.stress ?? null,
        motivation: previousCheckin.motivation ?? null,
        objective: objectiveData,
      };
      const prevResult = computeDisponibiliteTFCL(prevInput);
      const diff = computed.score - prevResult.score;

      if (diff > 5) {
        computed.trend = 'improving';
        computed.trendLabel = `+${diff} pts`;
      } else if (diff < -5) {
        computed.trend = 'worsening';
        computed.trendLabel = `${diff} pts`;
      } else {
        computed.trend = 'stable';
        computed.trendLabel = 'Stable';
      }
    }

    return computed;
  }, [latestCheckin, previousCheckin, objectiveData]);

  const TrendIcon = disponibilite?.trend === 'improving' ? TrendingUp :
                    disponibilite?.trend === 'worsening' ? TrendingDown : Minus;

  const hasCheckin = !!latestCheckin;
  const hasCRR = !!crr && crr.value !== null;
  const showChargeTab = staffMode && crr;

  return (
    <Card className={cn("border-primary/20 overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ═══ HEADER ═══ */}
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Battery className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Fatigue & Disponibilité
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  {!isOpen && disponibilite && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {disponibilite.levelLabel} — {disponibilite.score}/100
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mini summary when collapsed */}
                {!isOpen && disponibilite && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    {disponibilite.trend && (
                      <TrendIcon className={cn(
                        "w-3.5 h-3.5",
                        disponibilite.trend === 'improving' ? "text-success" :
                        disponibilite.trend === 'worsening' ? "text-destructive" :
                        "text-muted-foreground"
                      )} />
                    )}
                  </div>
                )}

                {/* Score badge */}
                {disponibilite ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-lg px-3 py-1 font-bold",
                      getDisponibiliteBadgeClass(disponibilite.level)
                    )}
                  >
                    {disponibilite.levelEmoji} {disponibilite.score}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-sm px-2 py-1 text-muted-foreground">
                    Aucun check-in
                  </Badge>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        {/* ═══ EXPANDED CONTENT ═══ */}
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* ── Quick summary row ── */}
            {disponibilite && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                getDisponibiliteBgColor(disponibilite.level)
              )}>
                <div className="text-2xl">{disponibilite.levelEmoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{disponibilite.levelLabel}</span>
                    <span className="text-xs text-muted-foreground font-mono">{disponibilite.score}/100</span>
                    {disponibilite.trend && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <TrendIcon className="w-3 h-3" />
                        {disponibilite.trendLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {disponibilite.interpretation.recommendationLabel}
                  </p>
                </div>
                {hasCRR && crr && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Charge 7j</p>
                    <p className="font-bold text-sm font-mono">{crr.value} TSS</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TABS ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={cn("grid w-full", showChargeTab ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="statut" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                  <Target className="w-3.5 h-3.5" />
                  Statut
                </TabsTrigger>
                <TabsTrigger value="checkin" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Check-in
                </TabsTrigger>
                {showChargeTab && (
                  <TabsTrigger value="charge" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                    <Activity className="w-3.5 h-3.5" />
                    Charge
                  </TabsTrigger>
                )}
              </TabsList>

              <SwipeableTabsContent 
                tabs={showChargeTab ? ["statut", "checkin", "charge"] : ["statut", "checkin"]} 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
              >

              {/* ── Tab: Statut (Disponibilité TFCL display) ── */}
              <AnimatedTabsContent value="statut" activeValue={activeTab} className="pt-4">
                <DisponibiliteTFCLCard
                  latestCheckin={latestCheckin}
                  previousCheckin={previousCheckin}
                  objectiveData={objectiveData}
                  showDetails={staffMode}
                  showTrend={true}
                />
              </AnimatedTabsContent>

              {/* ── Tab: Check-in — deferred ── */}
              <LazyTabsContent value="checkin" activeValue={activeTab} className="pt-4">
                <TFCLDailyReadinessCheck
                  athleteId={athleteId}
                  athleteName={athleteName}
                  objectiveData={objectiveData}
                  onSubmit={onCheckinSubmit}
                  showStaffAlerts={staffMode}
                  compact={false}
                />
              </LazyTabsContent>

              {/* ── Tab: Charge — deferred ── */}
              {showChargeTab && crr && (
                <LazyTabsContent value="charge" activeValue={activeTab} className="pt-4">
                  <ChargeRecenteCard
                    crr={crr}
                    objectif={objectif}
                    staffMode={staffMode}
                    onUpdate={onCRRUpdate}
                  />
                </LazyTabsContent>
              )}
              </SwipeableTabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default FatigueDisponibiliteUnifiedCard;
