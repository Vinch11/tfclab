/**
 * WorkoutRecommendationsPanel — Two For Coaching Lab
 * Affiche les recommandations Wahoo/Zwift basées sur les indices physiologiques
 * 
 * Badges couleur:
 * - Vert = recommandé
 * - Gris = neutre  
 * - Rouge = déconseillé
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Activity,
  Target,
  Info,
  AlertTriangle,
  Bike,
  Footprints,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WorkoutRecommendation,
  RecommendationEngineOutput,
  computeWorkoutRecommendations,
  RecommendationContext,
  RecommendationType,
  FATIGUE_VELO_GUIDELINE,
} from "@/lib/workoutRecommendationEngine";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { FatigueEffectif } from "@/lib/fatigueEffectif";
import { RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================
// TYPES
// =============================================

interface WorkoutRecommendationsPanelProps {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  fatigueEffectif: FatigueEffectif;
  runInjuryRisk: RunInjuryRiskEnvelope;
  objectif: string;
  sportFocus: "bike" | "run" | "tri";
  isStaffMode?: boolean;
  onAskAssistant?: (context: string) => void;
}

// =============================================
// HELPERS
// =============================================

function getRecommendationBadge(type: RecommendationType) {
  switch (type) {
    case "RECOMMENDED":
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Recommandé
        </Badge>
      );
    case "NEUTRAL":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <MinusCircle className="w-3 h-3 mr-1" />
          Neutre
        </Badge>
      );
    case "DISCOURAGED":
      return (
        <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50">
          <XCircle className="w-3 h-3 mr-1" />
          Déconseillé
        </Badge>
      );
  }
}

function getRecommendationColor(type: RecommendationType): string {
  switch (type) {
    case "RECOMMENDED": return "border-l-green-500";
    case "NEUTRAL": return "border-l-muted-foreground";
    case "DISCOURAGED": return "border-l-red-500";
  }
}

// =============================================
// WORKOUT CARD
// =============================================

interface RecommendationCardProps {
  recommendation: WorkoutRecommendation;
  onAskAssistant?: (context: string) => void;
}

function RecommendationCard({ recommendation, onAskAssistant }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAskAssistant = () => {
    const context = `
Séance: ${recommendation.workout_name}
Type: ${recommendation.workout_type}
Statut: ${recommendation.recommendation_type}
Raison: ${recommendation.reason_long}
Indices liés: ${recommendation.linked_indices.join(", ")}
    `.trim();
    
    onAskAssistant?.(context);
  };

  return (
    <Card className={cn("border-l-4", getRecommendationColor(recommendation.recommendation_type))}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getRecommendationBadge(recommendation.recommendation_type)}
                  <span className="text-xs text-muted-foreground">
                    {recommendation.workout_type}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{recommendation.workout_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {recommendation.reason_short}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-3 border-t border-muted/30 mt-2">
            {/* Explication complète */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Pourquoi cette recommandation ?
              </p>
              <p className="text-sm">{recommendation.reason_long}</p>
            </div>

            {/* Indices liés */}
            {recommendation.linked_indices.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Indices utilisés
                </p>
                <div className="flex flex-wrap gap-1">
                  {recommendation.linked_indices.map((index, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {index}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Confiance */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confiance:</span>
              <Progress value={recommendation.confidence * 100} className="h-1.5 w-20" />
              <span className="font-mono">{Math.round(recommendation.confidence * 100)}%</span>
            </div>

            {/* Bouton Assistant */}
            {onAskAssistant && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={handleAskAssistant}
              >
                <MessageCircle className="w-4 h-4" />
                Demander à l'Assistant
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================
// INDICES SUMMARY
// =============================================

interface IndicesSummaryProps {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  fatigueEffectif: FatigueEffectif;
  runInjuryRisk: RunInjuryRiskEnvelope;
}

function IndicesSummary({
  vlamaxEffectif,
  tteEffectif,
  fatigueEffectif,
  runInjuryRisk,
}: IndicesSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium">VLamax</span>
        </div>
        <p className="text-sm font-mono font-bold">
          {vlamaxEffectif.value?.toFixed(2) || "—"}
        </p>
        <p className="text-[10px] text-muted-foreground">{vlamaxEffectif.label}</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium">TTE</span>
        </div>
        <p className="text-sm font-mono font-bold">{tteEffectif.tte_min} min</p>
        <p className="text-[10px] text-muted-foreground">{tteEffectif.source}</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Activity className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-medium">Fatigue</span>
        </div>
        <p className="text-sm font-mono font-bold">{fatigueEffectif.score}%</p>
        <p className="text-[10px] text-muted-foreground">{String(fatigueEffectif.level ?? 'N/A')}</p>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Footprints className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-medium">Risque CAP</span>
        </div>
        <p className="text-sm font-mono font-bold">{runInjuryRisk.score}%</p>
        <p className="text-[10px] text-muted-foreground">{runInjuryRisk.levelLabel}</p>
      </div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function WorkoutRecommendationsPanel({
  vlamaxEffectif,
  tteEffectif,
  fatigueEffectif,
  runInjuryRisk,
  objectif,
  sportFocus,
  isStaffMode = false,
  onAskAssistant,
}: WorkoutRecommendationsPanelProps) {
  const [activeTab, setActiveTab] = useState<"recommended" | "all" | "discouraged">("recommended");

  const context: RecommendationContext = {
    vlamaxEffectif,
    tteEffectif,
    fatigueEffectif,
    runInjuryRisk,
    objectif,
    sportFocus,
  };

  const output = useMemo(() => computeWorkoutRecommendations(context), [
    vlamaxEffectif,
    tteEffectif,
    fatigueEffectif,
    runInjuryRisk,
    objectif,
    sportFocus,
  ]);

  const recommendedWorkouts = output.recommendations.filter(r => r.recommendation_type === "RECOMMENDED");
  const neutralWorkouts = output.recommendations.filter(r => r.recommendation_type === "NEUTRAL");
  const discouragedWorkouts = output.recommendations.filter(r => r.recommendation_type === "DISCOURAGED");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Recommandations Séances</CardTitle>
              <CardDescription className="text-xs">
                Basées sur vos indices physiologiques actuels
              </CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm font-medium mb-2">Logique de recommandation</p>
                <p className="text-xs text-muted-foreground">
                  Les recommandations sont calculées à partir de vos indices VLamax, TTE, 
                  Fatigue et Risque CAP. Chaque séance est classée selon sa compatibilité 
                  avec votre profil actuel.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé des indices */}
        <IndicesSummary
          vlamaxEffectif={vlamaxEffectif}
          tteEffectif={tteEffectif}
          fatigueEffectif={fatigueEffectif}
          runInjuryRisk={runInjuryRisk}
        />

        {/* Diagnostic */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">Analyse du profil</p>
          <p className="text-sm">{output.diagnosticSummary}</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommended" className="gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Recommandées ({recommendedWorkouts.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1">
              Toutes ({output.recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="discouraged" className="gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Éviter ({discouragedWorkouts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="mt-3">
            <ScrollArea className="h-[40vh]">
              <div className="space-y-2 pr-3">
                {recommendedWorkouts.length > 0 ? (
                  recommendedWorkouts.map(rec => (
                    <RecommendationCard 
                      key={rec.workout_id} 
                      recommendation={rec}
                      onAskAssistant={onAskAssistant}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <MinusCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Aucune séance spécifiquement recommandée.
                    <br />
                    Les séances neutres sont toutes compatibles.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="mt-3">
            <ScrollArea className="h-[40vh]">
              <div className="space-y-2 pr-3">
                {output.recommendations.slice(0, 20).map(rec => (
                  <RecommendationCard 
                    key={rec.workout_id} 
                    recommendation={rec}
                    onAskAssistant={onAskAssistant}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="discouraged" className="mt-3">
            <ScrollArea className="h-[40vh]">
              <div className="space-y-2 pr-3">
                {discouragedWorkouts.length > 0 ? (
                  discouragedWorkouts.map(rec => (
                    <RecommendationCard 
                      key={rec.workout_id} 
                      recommendation={rec}
                      onAskAssistant={onAskAssistant}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                    Aucune séance déconseillée.
                    <br />
                    Votre profil est compatible avec toutes les séances.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Guideline Fatigue Vélo (staff mode) */}
        {isStaffMode && sportFocus === "bike" && (
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              Guideline Fatigue Vélo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FATIGUE_VELO_GUIDELINE.map((item, idx) => (
                <div key={idx} className="text-xs p-2 bg-background rounded border">
                  <p className="font-mono font-medium">{item.range}</p>
                  <p className="text-muted-foreground">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          {output.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
