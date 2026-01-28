/**
 * Race Simulation Module TFCL™
 * Simulateur de scénarios de course avec modes BASIC et PRO
 * 
 * CONNEXION Race Readiness → Simulation:
 * - Race Readiness a TOUJOURS priorité sur la Simulation
 * - Accès conditionnel: RED=disabled, ORANGE=limited, GREEN=standard, BLUE=advanced
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
  Gauge,
  Sparkles,
  BookOpen,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SimulationMode,
  RaceType,
  AmbitionLevel,
  HeatCondition,
  TerrainType,
  ScenarioType,
  RaceSimulationInput,
  RaceSimulationResult,
  BasicSimulationInput,
  BasicSimulationResult,
  PacingScenario,
  computeRaceSimulation,
  computeBasicSimulation,
  checkProModeEligibility,
  getScenarioColor,
  getScenarioBgColor,
  getDepletionRiskColor,
  getDepletionRiskBgColor,
  getBasicRiskColor,
  getBasicRiskBgColor,
  getIntensityZoneColor,
  getIntensityZoneBgColor,
  SIMULATION_DEFINITIONS,
  SIMULATION_MODE_LABELS,
} from '@/lib/v2/raceSimulation';
import { GlycogenDepletionChart } from '@/components/charts/GlycogenDepletionChart';
import { FatMaxRaceIntensityChart } from '@/components/charts/FatMaxRaceIntensityChart';
import { FatMaxTFCLResult } from '@/lib/v2/fatmaxTFCL';
import {
  computeSimulationAccess,
  getSimulationContextMessages,
  ACCESS_LEVEL_COLORS,
  ACCESS_STATUS_LABELS,
  SIMULATION_ACCESS_DEFINITIONS,
  type SimulationAccessResult,
} from '@/lib/v2/raceReadinessSimulationConnector';
import type { RaceReadinessV2Result } from '@/lib/v2/raceReadinessV2';

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
  raceReadinessScore?: number | null;
  raceReadinessResult?: RaceReadinessV2Result | null;
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
  defaultMode?: SimulationMode;
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
  raceReadinessScore = null,
  raceReadinessResult = null,
  injuryRiskLevel = null,
  ftp = null,
  vma = null,
  paceThreshold = null,
  weight = null,
  className,
  compact = false,
  staffMode = false,
  defaultRaceType = 'Marathon',
  defaultMode = 'basic',
}: RaceSimulationModuleProps) {
  // State
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(defaultMode);
  const [raceType, setRaceType] = useState<RaceType>(defaultRaceType);
  const [ambition, setAmbition] = useState<AmbitionLevel>('perf');
  const [heat, setHeat] = useState<HeatCondition>('moderate');
  const [terrain, setTerrain] = useState<TerrainType>('flat');
  const [plannedCarbsGH, setPlannedCarbsGH] = useState<number>(60);
  const [useNutrition, setUseNutrition] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('optimal');
  const [showSimulation, setShowSimulation] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RACE READINESS → SIMULATION ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const simulationAccess = useMemo(() => 
    computeSimulationAccess(raceReadinessResult, raceReadinessScore ?? undefined),
    [raceReadinessResult, raceReadinessScore]
  );
  
  const accessMessages = useMemo(() => 
    getSimulationContextMessages(simulationAccess, raceReadinessResult),
    [simulationAccess, raceReadinessResult]
  );
  
  // Filtrer les scénarios autorisés
  const allowedScenarios = simulationAccess.modifiers.allowedScenarios;
  
  // Pro mode eligibility check
  const proInput: RaceSimulationInput = useMemo(() => ({
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
    // ✅ Passer les modificateurs Race Readiness au moteur de simulation
    readinessModifiers: simulationAccess.enabled ? simulationAccess.modifiers : null,
  }), [
    raceType, ambition, heat, terrain, plannedCarbsGH, useNutrition,
    vlamaxEffectif, vlamaxConfidence, vlamaxDiscipline, tteMin, tteConfidence,
    fatmax, disponibiliteScore, disponibiliteLevel, injuryRiskLevel, ftp, vma, paceThreshold, weight,
    simulationAccess // Ajout de la dépendance
  ]);
  
  const proEligibility = useMemo(() => checkProModeEligibility(proInput), [proInput]);
  
  // Basic input
  const basicInput: BasicSimulationInput = useMemo(() => ({
    raceType,
    ambition,
    heat,
    terrain,
    disponibiliteScore,
    disponibiliteLevel,
    raceReadinessScore,
    ftp,
    vma,
    paceThreshold,
    injuryRiskLevel,
  }), [raceType, ambition, heat, terrain, disponibiliteScore, disponibiliteLevel, raceReadinessScore, ftp, vma, paceThreshold, injuryRiskLevel]);
  
  // Résultats simulation
  const basicSimulation = useMemo(() => {
    if (!showSimulation || simulationMode !== 'basic') return null;
    return computeBasicSimulation(basicInput);
  }, [basicInput, showSimulation, simulationMode]);
  
  const proSimulation = useMemo(() => {
    if (!showSimulation || simulationMode !== 'pro') return null;
    return computeRaceSimulation(proInput);
  }, [proInput, showSimulation, simulationMode]);
  
  // Scénario sélectionné (PRO only)
  const currentScenario = useMemo(() => {
    if (!proSimulation) return null;
    return proSimulation.scenarios.find(s => s.type === selectedScenario) ?? proSimulation.scenarios[1];
  }, [proSimulation, selectedScenario]);
  
  const handleSimulate = () => {
    setShowSimulation(true);
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MODE SELECTOR
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ModeSelector = () => (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Taille de l'analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {(['basic', 'pro'] as SimulationMode[]).map((mode) => {
            const isSelected = simulationMode === mode;
            const modeInfo = SIMULATION_MODE_LABELS[mode];
            const isProDisabled = mode === 'pro' && !proEligibility.eligible;
            
            return (
              <button
                key={mode}
                onClick={() => !isProDisabled && setSimulationMode(mode)}
                disabled={isProDisabled}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left relative",
                  isSelected 
                    ? mode === 'basic'
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-border hover:border-muted-foreground/50",
                  isProDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {mode === 'basic' ? (
                    <Shield className={cn("w-5 h-5", isSelected ? "text-green-600" : "text-muted-foreground")} />
                  ) : (
                    <Sparkles className={cn("w-5 h-5", isSelected ? "text-blue-600" : "text-muted-foreground")} />
                  )}
                  <Badge 
                    variant={isSelected ? "default" : "secondary"}
                    className={cn(
                      isSelected && mode === 'basic' && "bg-green-600",
                      isSelected && mode === 'pro' && "bg-blue-600"
                    )}
                  >
                    {modeInfo.badge}
                  </Badge>
                </div>
                <div className={cn(
                  "font-medium text-sm mb-1",
                  isSelected 
                    ? mode === 'basic' ? "text-green-700 dark:text-green-300" : "text-blue-700 dark:text-blue-300"
                    : "text-foreground"
                )}>
                  {mode === 'basic' ? "Décision robuste" : "Analyse complète"}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {modeInfo.description}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Message éligibilité PRO */}
        {!proEligibility.eligible && (
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {proEligibility.message}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Philosophie */}
        <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground italic">
          <BookOpen className="w-3 h-3 inline mr-1" />
          {SIMULATION_DEFINITIONS.philosophy}
        </div>
      </CardContent>
    </Card>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ConfigPanel = () => (
    <div className="space-y-6">
      {/* Sélecteur de mode */}
      <ModeSelector />
      
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
      
      {/* Nutrition (PRO only) */}
      {simulationMode === 'pro' && (
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
      )}
      
      {/* Profil TFCL utilisé */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Profil TFCL utilisé
          <Badge variant="outline" className="text-xs">
            {simulationMode === 'basic' ? 'Simplifié' : 'Complet'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {simulationMode === 'pro' && (
            <>
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
            </>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Disponibilité</span>
            <span className={disponibiliteScore ? "font-medium" : "text-muted-foreground"}>
              {disponibiliteScore ? `${Math.round(disponibiliteScore)}/100` : "—"}
            </span>
          </div>
          {raceReadinessScore && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Race Readiness</span>
              <span className="font-medium">{Math.round(raceReadinessScore)}/100</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bouton simuler */}
      <Button onClick={handleSimulate} className="w-full" size="lg">
        <BarChart3 className="w-4 h-4 mr-2" />
        {simulationMode === 'basic' ? 'Analyser (BASIC)' : 'Simuler les scénarios (PRO)'}
      </Button>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RESULTS PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const BasicResultsPanel = () => {
    if (!basicSimulation) return null;
    
    return (
      <div className="space-y-6">
        {/* Badge version */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Shield className="w-3 h-3 mr-1" />
            VERSION BASIC
          </Badge>
          <span className="text-sm text-muted-foreground">
            {basicSimulation.raceLabel} - {basicSimulation.ambitionLabel}
          </span>
        </div>
        
        {/* Garde-fous */}
        {basicSimulation.guardrails.length > 0 && (
          <div className="space-y-2">
            {basicSimulation.guardrails.map((guardrail, i) => (
              <Alert key={i} variant={guardrail.type === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{guardrail.title}</AlertTitle>
                <AlertDescription>{guardrail.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Zone d'intensité */}
        <Card className={cn("border-2", getIntensityZoneBgColor(basicSimulation.intensityZone))}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Zone d'intensité conseillée</div>
              <div className={cn("text-3xl font-bold", getIntensityZoneColor(basicSimulation.intensityZone))}>
                {basicSimulation.intensityZoneLabel}
              </div>
              <p className="text-sm mt-2 text-muted-foreground">
                {basicSimulation.intensityZoneDescription}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Indice global de risque */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Indice global de risque</div>
                <div className={cn("text-2xl font-bold", getBasicRiskColor(basicSimulation.globalRiskLevel))}>
                  {basicSimulation.globalRiskLevel}
                </div>
                <div className="text-sm text-muted-foreground">
                  {basicSimulation.globalRiskLabel}
                </div>
              </div>
              <div className={cn("p-4 rounded-full", getBasicRiskBgColor(basicSimulation.globalRiskLevel))}>
                <Gauge className={cn("w-8 h-8", getBasicRiskColor(basicSimulation.globalRiskLevel))} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Messages secondaires */}
        {basicSimulation.secondaryMessages.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />
                Points d'attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {basicSimulation.secondaryMessages.map((msg, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {/* Scénarios simples */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scénarios disponibles</CardTitle>
            <CardDescription>Le coach choisit le scénario adapté</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['conservative', 'optimal', 'aggressive'] as ScenarioType[]).map((type) => {
              const Icon = SCENARIO_ICONS[type];
              const isRecommended = basicSimulation.recommendedScenario === type;
              
              return (
                <div
                  key={type}
                  className={cn(
                    "p-3 rounded-lg border flex items-center gap-3",
                    isRecommended && getScenarioBgColor(type)
                  )}
                >
                  <Icon className={cn("w-5 h-5", getScenarioColor(type))} />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{basicSimulation.scenarioLabels[type]}</span>
                  </div>
                  {isRecommended && (
                    <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Disclaimer */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Info className="w-4 h-4 inline mr-1" />
          {basicSimulation.disclaimer}
        </div>
        
        {/* Bouton retour */}
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
  // PRO RESULTS PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ProResultsPanel = () => {
    if (!proSimulation) return null;
    
    return (
      <div className="space-y-6">
        {/* Badge version */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Sparkles className="w-3 h-3 mr-1" />
            VERSION PRO
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {proSimulation.sourcesUsed.length} sources
          </Badge>
        </div>
        
        {/* Garde-fous */}
        {proSimulation.guardrails.length > 0 && (
          <div className="space-y-2">
            {proSimulation.guardrails.map((guardrail, i) => (
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
                {proSimulation.estimatedTimeLabel}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="outline">
                  Confiance: {proSimulation.timeConfidenceLabel}
                </Badge>
                {proSimulation.missingData.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {proSimulation.missingData.length} données manquantes
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
            {proSimulation.scenarios.map((scenario) => {
              const Icon = SCENARIO_ICONS[scenario.type];
              const isSelected = selectedScenario === scenario.type;
              const isRecommended = proSimulation.recommendedScenario === scenario.type;
              
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
            distanceKm={proSimulation.distanceKm}
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
        {proSimulation.failureRisks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <TrendingDown className="w-4 h-4" />
                Ce qui ferait échouer ce scénario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {proSimulation.failureRisks.map((risk) => (
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
          {proSimulation.disclaimer}
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
  // ACCESS BLOCKED PANEL (RED STATUS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const AccessBlockedPanel = () => (
    <div className="space-y-6">
      {/* Status badge */}
      <div className="flex items-center justify-center">
        <Badge 
          variant="destructive" 
          className="gap-2 px-4 py-2 text-base"
        >
          <Lock className="w-4 h-4" />
          Simulation Non Disponible
        </Badge>
      </div>
      
      {/* Explanation card */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-destructive">
                {simulationAccess.message}
              </h3>
              <p className="text-sm text-muted-foreground">
                {simulationAccess.explanation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Context messages */}
      {accessMessages.map((msg, i) => (
        <Alert 
          key={i} 
          variant={msg.type === 'critical' ? 'destructive' : 'default'}
        >
          <span className="mr-2">{msg.icon}</span>
          <AlertTitle>{msg.title}</AlertTitle>
          <AlertDescription>{msg.content}</AlertDescription>
        </Alert>
      ))}
      
      {/* Recommendations */}
      {simulationAccess.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {simulationAccess.recommendations.map((rec, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Principle reminder */}
      <div className="p-4 bg-muted/30 rounded-lg border text-center space-y-2">
        <p className="text-sm font-medium">
          {SIMULATION_ACCESS_DEFINITIONS.title}
        </p>
        <p className="text-xs text-muted-foreground italic">
          {SIMULATION_ACCESS_DEFINITIONS.principle}
        </p>
      </div>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS STATUS HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  
  const AccessStatusHeader = () => {
    if (simulationAccess.status === 'RED') return null;
    
    const colors = ACCESS_LEVEL_COLORS[simulationAccess.accessLevel];
    const statusInfo = ACCESS_STATUS_LABELS[simulationAccess.status];
    
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border mb-4",
        colors.bg, colors.border
      )}>
        <span className="text-lg">{statusInfo.emoji}</span>
        <div className="flex-1">
          <span className={cn("text-sm font-medium", colors.text)}>
            Mode {statusInfo.label}
          </span>
          {simulationAccess.status === 'ORANGE' && (
            <span className="text-xs text-muted-foreground ml-2">
              — Paramètres modérés
            </span>
          )}
          {simulationAccess.status === 'BLUE' && (
            <span className="text-xs text-muted-foreground ml-2">
              — Stratégies avancées disponibles
            </span>
          )}
        </div>
        {simulationAccess.warnings.length > 0 && (
          <Badge variant="outline" className={cn("text-xs", colors.text)}>
            {simulationAccess.warnings.length} avertissement{simulationAccess.warnings.length > 1 ? 's' : ''}
          </Badge>
        )}
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
              {!simulationAccess.enabled
                ? "Simulation désactivée — Race Readiness insuffisant"
                : showSimulation 
                  ? simulationMode === 'basic'
                    ? `${basicSimulation?.raceLabel} - ${basicSimulation?.ambitionLabel} (BASIC)`
                    : `${proSimulation?.raceLabel} - ${proSimulation?.ambitionLabel} (PRO)`
                  : "Comparez des scénarios de pacing et nutrition"
              }
            </CardDescription>
          </div>
          {/* Status badge */}
          <Badge 
            variant="outline" 
            className={cn(
              !simulationAccess.enabled 
                ? "border-destructive text-destructive"
                : showSimulation 
                  ? simulationMode === 'basic' 
                    ? "border-green-500 text-green-600" 
                    : "border-blue-500 text-blue-600"
                  : ACCESS_LEVEL_COLORS[simulationAccess.accessLevel].border + " " + ACCESS_LEVEL_COLORS[simulationAccess.accessLevel].text
            )}
          >
            {!simulationAccess.enabled 
              ? '🔴 BLOQUÉ'
              : showSimulation 
                ? simulationMode === 'basic' ? 'BASIC' : 'PRO'
                : ACCESS_STATUS_LABELS[simulationAccess.status].emoji + ' ' + ACCESS_STATUS_LABELS[simulationAccess.status].label.toUpperCase()
            }
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? "h-[400px]" : "h-auto"}>
          {/* Access blocked: show blocked panel */}
          {!simulationAccess.enabled && <AccessBlockedPanel />}
          
          {/* Access granted: show normal UI */}
          {simulationAccess.enabled && (
            <>
              <AccessStatusHeader />
              {!showSimulation && <ConfigPanel />}
              {showSimulation && simulationMode === 'basic' && <BasicResultsPanel />}
              {showSimulation && simulationMode === 'pro' && <ProResultsPanel />}
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default RaceSimulationModule;
