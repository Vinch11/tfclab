/**
 * Race Simulation Module TFCL™
 * Simulateur de scénarios de course avec estimation de temps et risque glycogène
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Timer,
  Flame,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Zap,
  TrendingDown,
  Shield,
  Rocket,
  Scale,
  ThermometerSun,
  Mountain,
  Cookie,
  Activity,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RaceType,
  AmbitionLevel,
  HeatCondition,
  TerrainType,
  ScenarioType,
  RaceSimulationInput,
  RaceSimulationResult,
  PacingScenario,
  computeRaceSimulation,
  getScenarioColor,
  getScenarioBgColor,
  getDepletionRiskColor,
  getDepletionRiskBgColor,
  SIMULATION_DEFINITIONS,
} from '@/lib/v2/raceSimulation';
import { GlycogenDepletionChart } from '@/components/charts/GlycogenDepletionChart';
import { FatMaxRaceIntensityChart } from '@/components/charts/FatMaxRaceIntensityChart';
import { FatMaxTFCLResult } from '@/lib/v2/fatmaxTFCL';

interface RaceSimulationModuleProps {
  // Profil TFCL (automatique)
  vlamaxEffectif?: number | null;
  vlamaxConfidence?: number;
  vlamaxDiscipline?: 'bike' | 'run';
  tteMin?: number | null;
  tteConfidence?: number;
  fatmax?: FatMaxTFCLResult | null;
  disponibiliteScore?: number | null;
  disponibiliteLevel?: string | null;
  injuryRiskLevel?: string | null;
  ftp?: number | null;
  vma?: number | null;
  paceThreshold?: number | null;
  weight?: number | null;
  
  // Props UI
  className?: string;
  compact?: boolean;
  staffMode?: boolean;
  defaultRaceType?: RaceType;
}

const SCENARIO_ICONS: Record<ScenarioType, typeof Shield> = {
  conservative: Shield,
  optimal: Scale,
  aggressive: Rocket,
};

export function RaceSimulationModule({
  vlamaxEffectif = null,
  vlamaxConfidence = 0.5,
  vlamaxDiscipline = 'bike',
  tteMin = null,
  tteConfidence = 0.5,
  fatmax = null,
  disponibiliteScore = null,
  disponibiliteLevel = null,
  injuryRiskLevel = null,
  ftp = null,
  vma = null,
  paceThreshold = null,
  weight = null,
  className,
  compact = false,
  staffMode = false,
  defaultRaceType = 'Marathon',
}: RaceSimulationModuleProps) {
  // State
  const [raceType, setRaceType] = useState<RaceType>(defaultRaceType);
  const [ambition, setAmbition] = useState<AmbitionLevel>('perf');
  const [heat, setHeat] = useState<HeatCondition>('moderate');
  const [terrain, setTerrain] = useState<TerrainType>('flat');
  const [plannedCarbsGH, setPlannedCarbsGH] = useState<number>(60);
  const [useNutrition, setUseNutrition] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('optimal');
  const [showSimulation, setShowSimulation] = useState(false);
  
  // Input pour la simulation
  const simulationInput: RaceSimulationInput = useMemo(() => ({
    raceType,
    raceDate: null,
    distanceKm: null,
    targetDurationMin: null,
    heat,
    terrain,
    plannedCarbsGH: useNutrition ? plannedCarbsGH : null,
    nutritionType: 'mixed',
    ambition,
    vlamaxEffectif,
    vlamaxConfidence,
    vlamaxDiscipline,
    tteMin,
    tteConfidence,
    fatmaxCenterPct: fatmax?.centerPctFTP ?? null,
    fatmaxRange: fatmax ? [fatmax.minPctFTP, fatmax.maxPctFTP] : null,
    disponibiliteScore,
    disponibiliteLevel,
    injuryRiskLevel,
    ftp,
    vma,
    paceThreshold,
    weight,
  }), [
    raceType, ambition, heat, terrain, plannedCarbsGH, useNutrition,
    vlamaxEffectif, vlamaxConfidence, vlamaxDiscipline, tteMin, tteConfidence,
    fatmax, disponibiliteScore, disponibiliteLevel, injuryRiskLevel, ftp, vma, paceThreshold, weight
  ]);
  
  // Résultat simulation
  const simulation = useMemo(() => {
    if (!showSimulation) return null;
    return computeRaceSimulation(simulationInput);
  }, [simulationInput, showSimulation]);
  
  // Scénario sélectionné
  const currentScenario = useMemo(() => {
    if (!simulation) return null;
    return simulation.scenarios.find(s => s.type === selectedScenario) ?? simulation.scenarios[1];
  }, [simulation, selectedScenario]);
  
  const handleSimulate = () => {
    setShowSimulation(true);
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ConfigPanel = () => (
    <div className="space-y-6">
      {/* Type de course */}
      <div className="space-y-2">
        <Label>Type de course</Label>
        <Select value={raceType} onValueChange={(v) => setRaceType(v as RaceType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IM">Ironman (vélo)</SelectItem>
            <SelectItem value="70.3">70.3 (vélo)</SelectItem>
            <SelectItem value="Marathon">Marathon</SelectItem>
            <SelectItem value="Semi">Semi-Marathon</SelectItem>
            <SelectItem value="10km">10 km</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Ambition */}
      <div className="space-y-2">
        <Label>Niveau d'ambition</Label>
        <Select value={ambition} onValueChange={(v) => setAmbition(v as AmbitionLevel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="finish">Finisher</SelectItem>
            <SelectItem value="perf">Performance</SelectItem>
            <SelectItem value="sub">Objectif chrono</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Conditions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ThermometerSun className="w-4 h-4" />
            Chaleur
          </Label>
          <Select value={heat} onValueChange={(v) => setHeat(v as HeatCondition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="moderate">Modérée</SelectItem>
              <SelectItem value="high">Forte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mountain className="w-4 h-4" />
            Terrain
          </Label>
          <Select value={terrain} onValueChange={(v) => setTerrain(v as TerrainType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Plat</SelectItem>
              <SelectItem value="hilly">Dénivelé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Nutrition */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Cookie className="w-4 h-4" />
            Nutrition planifiée
          </Label>
          <Switch checked={useNutrition} onCheckedChange={setUseNutrition} />
        </div>
        
        {useNutrition && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Glucides (g/h)</span>
              <span className="font-medium">{plannedCarbsGH} g/h</span>
            </div>
            <Slider
              value={[plannedCarbsGH]}
              onValueChange={([v]) => setPlannedCarbsGH(v)}
              min={30}
              max={120}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30 g/h</span>
              <span>120 g/h</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Profil TFCL utilisé */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Profil TFCL utilisé
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">VLamax</span>
            <span className={vlamaxEffectif ? "font-medium" : "text-muted-foreground"}>
              {vlamaxEffectif ? `${vlamaxEffectif.toFixed(2)} mmol/L/s` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TTE</span>
            <span className={tteMin ? "font-medium" : "text-muted-foreground"}>
              {tteMin ? `${tteMin} min` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">FatMax</span>
            <span className={fatmax ? "font-medium" : "text-muted-foreground"}>
              {fatmax ? `${fatmax.minPctFTP}-${fatmax.maxPctFTP}%` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Disponibilité</span>
            <span className={disponibiliteScore ? "font-medium" : "text-muted-foreground"}>
              {disponibiliteScore ? `${Math.round(disponibiliteScore)}/100` : "—"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Bouton simuler */}
      <Button onClick={handleSimulate} className="w-full" size="lg">
        <BarChart3 className="w-4 h-4 mr-2" />
        Simuler les scénarios
      </Button>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ResultsPanel = () => {
    if (!simulation) return null;
    
    return (
      <div className="space-y-6">
        {/* Garde-fous */}
        {simulation.guardrails.length > 0 && (
          <div className="space-y-2">
            {simulation.guardrails.map((guardrail, i) => (
              <Alert key={i} variant={guardrail.type === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{guardrail.title}</AlertTitle>
                <AlertDescription>{guardrail.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Temps estimé global */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Temps probable</div>
              <div className="text-3xl font-bold text-primary">
                {simulation.estimatedTimeLabel}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="outline">
                  Confiance: {simulation.timeConfidenceLabel}
                </Badge>
                {simulation.missingData.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {simulation.missingData.length} données manquantes
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sélection scénario */}
        <div className="space-y-3">
          <Label>Scénarios de pacing</Label>
          <div className="grid grid-cols-3 gap-2">
            {simulation.scenarios.map((scenario) => {
              const Icon = SCENARIO_ICONS[scenario.type];
              const isSelected = selectedScenario === scenario.type;
              const isRecommended = simulation.recommendedScenario === scenario.type;
              
              return (
                <button
                  key={scenario.type}
                  onClick={() => setSelectedScenario(scenario.type)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left",
                    isSelected 
                      ? getScenarioBgColor(scenario.type) + " border-current"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("w-4 h-4", getScenarioColor(scenario.type))} />
                    <span className={cn("font-medium text-sm", isSelected && getScenarioColor(scenario.type))}>
                      {scenario.label}
                    </span>
                  </div>
                  {isRecommended && (
                    <Badge variant="secondary" className="text-xs mb-1">
                      Recommandé
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    ~{Math.round(scenario.estimatedTimeMin)} min
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Détails du scénario sélectionné */}
        {currentScenario && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={cn("text-lg flex items-center gap-2", getScenarioColor(currentScenario.type))}>
                  {React.createElement(SCENARIO_ICONS[currentScenario.type], { className: "w-5 h-5" })}
                  {currentScenario.label}
                </CardTitle>
                <Badge className={getDepletionRiskBgColor(currentScenario.overallDepletionRisk)}>
                  Risque: {currentScenario.overallDepletionRisk}
                </Badge>
              </div>
              <CardDescription>{currentScenario.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Métriques clés */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Intensité cible</div>
                  <div className="text-lg font-bold">{currentScenario.targetIntensityPct}%</div>
                  <div className="text-xs text-muted-foreground">
                    {vlamaxDiscipline === 'bike' ? 'FTP' : 'VMA'}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Probabilité succès</div>
                  <div className="text-lg font-bold">{Math.round(currentScenario.successProbability * 100)}%</div>
                  <Progress 
                    value={currentScenario.successProbability * 100} 
                    className="h-1.5 mt-1"
                  />
                </div>
              </div>
              
              {/* Point de bascule */}
              {currentScenario.breakpointKm && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Point de bascule :</strong> Km {Math.round(currentScenario.breakpointKm)}
                    <br />
                    <span className="text-sm">{currentScenario.breakpointRisk}</span>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Forces et faiblesses */}
              <div className="grid grid-cols-2 gap-4">
                {currentScenario.strengths.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Atouts
                    </div>
                    {currentScenario.strengths.map((s, i) => (
                      <div key={i} className="text-xs text-muted-foreground">• {s}</div>
                    ))}
                  </div>
                )}
                {currentScenario.warnings.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Risques
                    </div>
                    {currentScenario.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-muted-foreground">• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Graphique déplétion */}
        {currentScenario && (
          <GlycogenDepletionChart
            segments={currentScenario.segments}
            distanceKm={simulation.distanceKm}
            compact={compact}
          />
        )}
        
        {/* Graphique FatMax vs Intensité */}
        {fatmax && currentScenario && (
          <FatMaxRaceIntensityChart
            fatmax={fatmax}
            raceIntensityPct={currentScenario.targetIntensityPct}
            staffMode={staffMode}
          />
        )}
        
        {/* Ce qui ferait échouer */}
        {simulation.failureRisks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <TrendingDown className="w-4 h-4" />
                Ce qui ferait échouer ce scénario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {simulation.failureRisks.map((risk) => (
                  <div key={risk.id} className="flex items-start gap-2 text-sm">
                    <Badge 
                      variant={risk.probability === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs mt-0.5"
                    >
                      {risk.probability === 'high' ? 'Élevé' : 'Modéré'}
                    </Badge>
                    <div>
                      <div className="font-medium">{risk.label}</div>
                      <div className="text-xs text-muted-foreground">{risk.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Disclaimer */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Info className="w-4 h-4 inline mr-1" />
          {simulation.disclaimer}
        </div>
        
        {/* Bouton retour config */}
        <Button 
          variant="outline" 
          onClick={() => setShowSimulation(false)}
          className="w-full"
        >
          Modifier les paramètres
        </Button>
      </div>
    );
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              Simulation de Course TFCL™
            </CardTitle>
            <CardDescription>
              {showSimulation 
                ? `${simulation?.raceLabel} - ${simulation?.ambitionLabel}`
                : "Comparez des scénarios de pacing et nutrition"
              }
            </CardDescription>
          </div>
          {showSimulation && simulation && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {simulation.sourcesUsed.length} sources
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? "h-[400px]" : "h-auto"}>
          {showSimulation ? <ResultsPanel /> : <ConfigPanel />}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default RaceSimulationModule;
