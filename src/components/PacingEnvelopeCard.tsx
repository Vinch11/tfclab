/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE™ CARD — Affichage Complet du Système de Pacing
 * Two For Coaching Lab Method™
 * 
 * Composant principal affichant:
 * - Le couloir de pacing (Envelope)
 * - Les règles de discipline
 * - Le profil de sensibilité
 * - Les scénarios de risque
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, 
  AlertTriangle, 
  Shield, 
  Lightbulb,
  TrendingUp,
  Activity,
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

import { 
  computePacingEnvelope, 
  type PacingEnvelopeInput, 
  type PacingEnvelopeResult,
  PACING_ENVELOPE_DEFINITIONS,
  formatEnvelopeRange,
} from "@/lib/v2/pacingEnvelopeEngine";

import { 
  generateDisciplineRules, 
  type DisciplineRulesResult,
  getCategoryBgColor,
  getCategoryLabel,
} from "@/lib/v2/pacingDisciplineRules";

import { 
  simulatePacingScenarios, 
  type ScenarioSimulationResult,
  getSeverityBgColor,
  getSeverityLabel,
} from "@/lib/v2/pacingScenarioSimulator";

import { PacingDisciplineChart } from "@/components/charts/PacingDisciplineChart";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PacingEnvelopeCardProps {
  input: PacingEnvelopeInput;
  
  // Options d'affichage
  showChart?: boolean;
  showRules?: boolean;
  showScenarios?: boolean;
  staffMode?: boolean;
  compact?: boolean;
  
  // Données de course (pour simulation)
  raceDistanceKm?: number;
  raceDurationMin?: number;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

function EnvelopeSummary({ envelope }: { envelope: PacingEnvelopeResult }) {
  const { boundary, envelopeWidth, envelopeWidthLabel, pacingProfile, confidenceLabel } = envelope;
  
  return (
    <div className="space-y-3">
      {/* Référence d'intensité - TFCL V2 */}
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg text-xs",
        boundary.isFallbackReference 
          ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700"
          : "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
      )}>
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>
          Intensités exprimées en <strong>% de {boundary.referenceShortLabel}</strong>
          {boundary.isFallbackReference && (
            <span className="text-orange-600 dark:text-orange-400 ml-1">(estimation indirecte)</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Centre */}
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
            {boundary.centerPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">de {boundary.referenceShortLabel}</div>
        </div>
        
        {/* Plage */}
        <div className="bg-muted rounded-lg p-3 text-center">
          <div className="text-lg font-bold font-mono">
            {boundary.lowPct}–{boundary.highPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Zone Optimale</div>
        </div>
        
        {/* Largeur */}
        <div className="bg-muted rounded-lg p-3 text-center">
          <div className="text-lg font-bold font-mono">±{envelopeWidth}%</div>
          <div className="text-[10px] text-muted-foreground">{envelopeWidthLabel.split(" ")[0]}</div>
        </div>
        
        {/* Confiance */}
        <div className="bg-muted rounded-lg p-3 text-center">
          <div className="text-lg font-bold">{confidenceLabel}</div>
          <div className="text-[10px] text-muted-foreground">Confiance</div>
        </div>
      </div>
    </div>
  );
}

function RulesSection({ rules }: { rules: DisciplineRulesResult }) {
  return (
    <div className="space-y-3">
      {/* Badge profil sensible */}
      {rules.showSensitiveBadge && rules.sensitiveMessage && (
        <Alert className="bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-800">
          <Target className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-xs text-purple-700 dark:text-purple-300">
            {rules.sensitiveMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Non négociables */}
      {rules.nonNegotiables.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Non négociables
          </h4>
          {rules.nonNegotiables.slice(0, 3).map(rule => (
            <div 
              key={rule.id} 
              className={cn("p-2 rounded-lg border text-xs", getCategoryBgColor(rule.category))}
            >
              <div className="flex items-start gap-2">
                <span>{rule.icon}</span>
                <div>
                  <div className="font-medium">{rule.title}</div>
                  <div className="text-muted-foreground mt-0.5">{rule.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Interdictions */}
      {rules.prohibitions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Interdictions
          </h4>
          {rules.prohibitions.slice(0, 2).map(rule => (
            <div 
              key={rule.id} 
              className={cn("p-2 rounded-lg border text-xs", getCategoryBgColor(rule.category))}
            >
              <div className="flex items-start gap-2">
                <span>{rule.icon}</span>
                <div>
                  <div className="font-medium">{rule.title}</div>
                  <div className="text-muted-foreground mt-0.5">{rule.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Phrases coach */}
      {rules.coachPhrases.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Phrases coach
          </h4>
          {rules.coachPhrases.slice(0, 2).map(rule => (
            <div 
              key={rule.id} 
              className={cn("p-2 rounded-lg border text-xs", getCategoryBgColor(rule.category))}
            >
              <div className="flex items-start gap-2">
                <span>{rule.icon}</span>
                <div className="text-muted-foreground italic">"{rule.message}"</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScenariosSection({ scenarios }: { scenarios: ScenarioSimulationResult }) {
  return (
    <div className="space-y-3">
      {/* Avertissement principal */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          {scenarios.primaryWarning}
        </AlertDescription>
      </Alert>
      
      {/* Scénarios critiques */}
      {scenarios.criticalScenarios.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Scénarios critiques
          </h4>
          {scenarios.criticalScenarios.map(scenario => (
            <div 
              key={scenario.id} 
              className={cn("p-3 rounded-lg border", getSeverityBgColor(scenario.consequence.severity))}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{scenario.icon}</span>
                <span className="font-medium text-sm">{scenario.title}</span>
                <Badge variant="destructive" className="text-[9px] px-1.5">
                  {getSeverityLabel(scenario.consequence.severity)}
                </Badge>
              </div>
              
              <div className="text-xs space-y-1 mt-2">
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground font-medium">SI:</span>
                  <span>{scenario.condition.description}</span>
                </div>
                <div className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">{scenario.consequence.description}</span>
                </div>
              </div>
              
              <div className="mt-2 p-2 bg-background/50 rounded text-[10px] text-muted-foreground italic">
                💡 {scenario.pedagogicalMessage}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Autres scénarios */}
      {scenarios.scenarios.filter(s => s.consequence.severity !== "critical").slice(0, 2).map(scenario => (
        <div 
          key={scenario.id} 
          className={cn("p-2 rounded-lg border text-xs", getSeverityBgColor(scenario.consequence.severity))}
        >
          <div className="flex items-center gap-2">
            <span>{scenario.icon}</span>
            <span className="font-medium">{scenario.title}</span>
            <Badge variant="outline" className="text-[9px] px-1.5">
              {getSeverityLabel(scenario.consequence.severity)}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1">{scenario.condition.description}</div>
        </div>
      ))}
      
      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground italic">
        {scenarios.disclaimer}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function PacingEnvelopeCard({
  input,
  showChart = true,
  showRules = true,
  showScenarios = true,
  staffMode = false,
  compact = false,
  raceDistanceKm,
  raceDurationMin = 180,
  className,
}: PacingEnvelopeCardProps) {
  // Calculer l'enveloppe
  const envelope = useMemo(() => computePacingEnvelope(input), [input]);
  
  // Générer les règles
  const rules = useMemo(() => {
    if (!envelope) return null;
    return generateDisciplineRules({
      envelope,
      vlamaxEffectif: input.vlamaxEffectif,
      raceObjective: input.raceObjective,
      sport: input.sport,
      raceReadinessScore: input.raceReadinessScore,
    });
  }, [envelope, input]);
  
  // Générer les scénarios
  const scenarios = useMemo(() => {
    if (!envelope) return null;
    return simulatePacingScenarios({
      envelope,
      raceObjective: input.raceObjective,
      vlamaxValue: input.vlamaxEffectif?.value ?? null,
      tteMin: input.tteEffectif?.tte_min ?? null,
      raceDistanceKm: raceDistanceKm ?? 90,
      raceDurationMin,
    });
  }, [envelope, input, raceDistanceKm, raceDurationMin]);
  
  if (!envelope) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          Données insuffisantes pour calculer le Pacing Envelope™
        </CardContent>
      </Card>
    );
  }

  // Version compacte
  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Pacing Envelope™</CardTitle>
            </div>
            <Badge variant="outline">{input.raceObjective}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <EnvelopeSummary envelope={envelope} />
          {envelope.readinessMessage && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{envelope.readinessMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Version complète avec onglets
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pacing Envelope™ TFCL</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {envelope.pacingProfile.badge && (
              <Badge className="bg-purple-600 text-white text-[10px]">
                {envelope.pacingProfile.badge}
              </Badge>
            )}
            <Badge variant="outline">{input.raceObjective}</Badge>
            {staffMode && (
              <Badge variant="secondary" className="text-[10px]">STAFF</Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          {PACING_ENVELOPE_DEFINITIONS.official.slice(0, 100)}...
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé de l'enveloppe */}
        <EnvelopeSummary envelope={envelope} />
        
        {/* Alerte Readiness */}
        {envelope.readinessMessage && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">{envelope.readinessMessage}</AlertDescription>
          </Alert>
        )}

        {/* Onglets */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="chart" className="text-xs">Graphique</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Règles</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Scénarios</TabsTrigger>
          </TabsList>
          
          {showChart && (
            <TabsContent value="chart" className="mt-3">
              <PacingDisciplineChart
                envelope={envelope}
                xAxisMode="time"
                totalDuration={raceDurationMin}
                totalDistance={raceDistanceKm}
                staffMode={staffMode}
              />
            </TabsContent>
          )}
          
          {showRules && rules && (
            <TabsContent value="rules" className="mt-3">
              <RulesSection rules={rules} />
            </TabsContent>
          )}
          
          {showScenarios && scenarios && (
            <TabsContent value="scenarios" className="mt-3">
              <ScenariosSection scenarios={scenarios} />
            </TabsContent>
          )}
        </Tabs>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic pt-2 border-t">
          {PACING_ENVELOPE_DEFINITIONS.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default PacingEnvelopeCard;
