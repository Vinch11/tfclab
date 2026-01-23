/**
 * Race Readiness V2 Module — Vue complète des 3 piliers
 * 
 * Affiche Potentiel, Disponibilité et Décision dans un module intégré
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  Zap, 
  Battery, 
  ArrowRight,
  Info,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TFCLDecisionChart } from "./TFCLDecisionChart";
import { DisponibiliteTFCLCard } from "./DisponibiliteTFCLCard";
import {
  type RaceReadinessV2Result,
  type ComputeDecisionInput,
  computeDecisionTFCL,
  RACE_READINESS_V2_DEFINITIONS,
  getRaceReadinessV2BadgeClass,
} from "@/lib/v2/raceReadinessV2";
import type { CompassScores } from "@/lib/compassScoring";
import type { DisponibiliteTFCL, TFCLReadinessInput } from "@/lib/v2/disponibiliteTFCL";
import type { DbCheckin } from "@/hooks/useCloudData";

interface RaceReadinessV2ModuleProps {
  // Données requises
  compass: CompassScores;
  
  // Disponibilité (une des options)
  disponibilite?: DisponibiliteTFCL;
  latestCheckin?: DbCheckin | null;
  readinessInput?: TFCLReadinessInput;
  objectiveData?: TFCLReadinessInput['objective'];
  
  // Garde-fous
  guardrails?: {
    healthAlert?: boolean;
    injuryRiskLevel?: 'low' | 'moderate' | 'high' | 'critical';
    fatigueIndex?: number;
  };
  
  // Options d'affichage
  athleteName?: string;
  objectif?: string;
  compact?: boolean;
  defaultTab?: 'overview' | 'potential' | 'availability' | 'decision';
  className?: string;
}

export function RaceReadinessV2Module({
  compass,
  disponibilite,
  latestCheckin,
  readinessInput,
  objectiveData,
  guardrails,
  athleteName = "Athlète",
  objectif = "Objectif",
  compact = false,
  defaultTab = 'overview',
  className,
}: RaceReadinessV2ModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Calculer le résultat Race Readiness V2
  const result = useMemo(() => {
    // Construire l'input pour la disponibilité si nécessaire
    let readinessInputFinal: TFCLReadinessInput | undefined = readinessInput;
    
    if (!disponibilite && !readinessInput && latestCheckin) {
      readinessInputFinal = {
        sleep: latestCheckin.sleep ?? null,
        fatigue: latestCheckin.fatigue ?? null,
        soreness: latestCheckin.soreness ?? null,
        stress: latestCheckin.stress ?? null,
        motivation: latestCheckin.motivation ?? null,
        alerts: latestCheckin.pain_flag ? { asymmetric_pain: true } : undefined,
        objective: objectiveData,
      };
    }
    
    const input: ComputeDecisionInput = {
      compass,
      disponibilite,
      readinessInput: readinessInputFinal,
      guardrails,
    };
    
    return computeDecisionTFCL(input);
  }, [compass, disponibilite, latestCheckin, readinessInput, objectiveData, guardrails]);
  
  // Mode compact
  if (compact) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Race Readiness V2
            </CardTitle>
            <Badge 
              variant="outline" 
              className={cn("text-base", getRaceReadinessV2BadgeClass(result.readiness.category))}
            >
              {result.readiness.categoryEmoji} {result.readiness.score}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mini graphique inline */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{result.potential.score}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{result.availability.score}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-bold">{result.readiness.score}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {result.readiness.categoryLabel} — Confiance {result.readiness.confidenceLabel}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Race Readiness TFCL™ V2
            </CardTitle>
            <CardDescription>
              Potentiel × Disponibilité → Décision
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-lg px-3 py-1", getRaceReadinessV2BadgeClass(result.readiness.category))}
          >
            {result.readiness.categoryEmoji} {result.readiness.score}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Vue</TabsTrigger>
            <TabsTrigger value="potential" className="text-xs">Potentiel</TabsTrigger>
            <TabsTrigger value="availability" className="text-xs">Dispo</TabsTrigger>
            <TabsTrigger value="decision" className="text-xs">Décision</TabsTrigger>
          </TabsList>
          
          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="pt-4 space-y-4">
            <TFCLDecisionChart 
              result={result}
              athleteName={athleteName}
              objectif={objectif}
            />
          </TabsContent>
          
          {/* Potentiel */}
          <TabsContent value="potential" className="pt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Potentiel (Metabolic Performance Compass™)</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {RACE_READINESS_V2_DEFINITIONS.potential.definition}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <ScoreCard 
                  label="Capacité Aérobie" 
                  value={result.potential.sources.aerobic.value}
                  type={result.potential.sources.aerobic.type}
                />
                <ScoreCard 
                  label="Tolérance Effort" 
                  value={result.potential.sources.tolerance.value}
                  type={result.potential.sources.tolerance.type}
                />
                <ScoreCard 
                  label="Profil Métabolique" 
                  value={result.potential.sources.metabolic.value}
                  type={result.potential.sources.metabolic.type}
                />
                <ScoreCard 
                  label="Robustesse" 
                  value={result.potential.sources.robustness.value}
                  type={result.potential.sources.robustness.type}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{result.potential.score}</p>
                  <p className="text-xs text-muted-foreground">
                    Plage : {result.potential.range?.[0]}–{result.potential.range?.[1]}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Confiance : {(result.potential.confidence * 100).toFixed(0)}%</p>
                  {result.potential.mainStrength && (
                    <p className="text-green-600">+ {result.potential.mainStrength}</p>
                  )}
                  {result.potential.mainLimitation && (
                    <p className="text-orange-600">⚠ {result.potential.mainLimitation}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Disponibilité */}
          <TabsContent value="availability" className="pt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-3">
                <Battery className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Disponibilité (Disponibilité TFCL™)</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {RACE_READINESS_V2_DEFINITIONS.availability.definition}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold">{result.availability.score}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.availability.recommendation}
                  </p>
                </div>
                <Badge variant="outline">
                  Confiance {(result.availability.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              
              {result.availability.factors.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Facteurs :</p>
                  <div className="flex flex-wrap gap-1">
                    {result.availability.factors.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.availability.alerts.length > 0 && (
                <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {result.availability.alerts.join(' | ')}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Décision */}
          <TabsContent value="decision" className="pt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Décision (Race Readiness TFCL™)</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {RACE_READINESS_V2_DEFINITIONS.decision.definition}
              </p>
              
              <div className={cn(
                "p-4 rounded-lg border mb-4",
                getRaceReadinessV2BadgeClass(result.readiness.category)
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{result.readiness.score}</p>
                    <p className="text-sm font-medium">{result.readiness.categoryLabel}</p>
                  </div>
                  <div className="text-4xl">{result.readiness.categoryEmoji}</div>
                </div>
              </div>
              
              {/* Formule */}
              <div className="p-3 rounded bg-muted/50 text-xs font-mono mb-4">
                <p>RR = 0.65 × P + 0.35 × D - Pénalités</p>
                <p className="text-muted-foreground">
                  = 0.65×{result.potential.score} + 0.35×{result.availability.score} - {result.penalties.total}
                </p>
                <p className="text-muted-foreground">
                  = {result.readiness.rawScore} - {result.penalties.total} = {result.readiness.score}
                </p>
              </div>
              
              {/* Explication */}
              <div className="space-y-3">
                <p className="text-sm">{result.explanation.why}</p>
                
                {result.explanation.suggestedFocus.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Focus suggéré :</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.explanation.suggestedFocus.map((f, i) => (
                        <li key={i}>→ {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Définitions (footer) */}
        <div className="flex items-center gap-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>{result.disclaimer}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant interne pour les scores
function ScoreCard({ 
  label, 
  value, 
  type 
}: { 
  label: string; 
  value: number; 
  type: 'measured' | 'estimated' | 'modeled' 
}) {
  const typeLabel = type === 'measured' ? '📏' : type === 'estimated' ? '📊' : '🧮';
  const typeTooltip = type === 'measured' ? 'Mesuré' : type === 'estimated' ? 'Estimé' : 'Modélisé';
  
  return (
    <div className="p-3 rounded bg-background/50 border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs" title={typeTooltip}>{typeLabel}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default RaceReadinessV2Module;
