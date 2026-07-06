/**
 * Race Simulation Module TFCL™
 * Simulateur de scénarios de course avec modes BASIC et PRO
 * 
 * CONNEXION Potentiel Physiologique → Simulation:
 * - Potentiel Physiologique a TOUJOURS priorité sur la Simulation
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  ChevronDown,
  Utensils,
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
  ACCESS_STATUS_LABELS,
  SIMULATION_ACCESS_DEFINITIONS,
  computeSimulationAccess,
  getSimulationContextMessages,
  ACCESS_LEVEL_COLORS,
  type SimulationAccessResult,
  type PotentielV2Result,
} from '@/lib/v2/potentielTypes';

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
  potentielPhysiologiqueScore?: number | null;
  potentielPhysiologiqueResult?: PotentielV2Result | null;
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

// Helper pour formater les durées
function formatDurationCompact(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHÈSE COACH — pyramide inversée
// Traduit les indices bruts (0-100) en langage clair et construit une phrase
// narrative à partir de la sortie du moteur (aucun recalcul).
// ─────────────────────────────────────────────────────────────────────────────

type DepletionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const DEPLETION_WORDS: Record<DepletionRiskLevel, { word: string; tone: string; bg: string; ring: string }> = {
  LOW:      { word: 'Faible',   tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
  MEDIUM:   { word: 'Modéré',   tone: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/10',   ring: 'ring-amber-500/30' },
  HIGH:     { word: 'Élevé',    tone: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-500/10',  ring: 'ring-orange-500/30' },
  CRITICAL: { word: 'Critique', tone: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10',     ring: 'ring-red-500/30' },
};

function depletionWord(risk: DepletionRiskLevel): string {
  return DEPLETION_WORDS[risk]?.word ?? String(risk);
}

/** Recommandation carburant clé : cible g/h max sur les segments, ou 1er warning actionnable. */
function pickKeyAction(scenario: PacingScenario): { text: string; carbsGh: number | null } {
  const carbsMax = scenario.segments.reduce((m, s) => Math.max(m, s.carbsNeeded ?? 0), 0);
  if (carbsMax >= 60) {
    return { text: `Viser ${Math.round(carbsMax)} g glucides/h`, carbsGh: Math.round(carbsMax) };
  }
  const w = scenario.warnings.find((w) => w && w.length < 90);
  if (w) return { text: w, carbsGh: null };
  const s = scenario.strengths[0];
  if (s) return { text: s, carbsGh: null };
  return { text: 'Pacing sous contrôle — pas d\'action prioritaire', carbsGh: null };
}

/** Phrase narrative construite depuis la sortie moteur (aucun calcul). */
function buildRaceSummary(scenario: PacingScenario, raceLabel: string): string {
  const time = formatDurationCompact(scenario.estimatedTimeMin);
  const risk = depletionWord(scenario.overallDepletionRisk).toLowerCase();
  const parts: string[] = [];
  parts.push(`Scénario ${scenario.label.toLowerCase()} : ${raceLabel} en ~${time}, risque carburant ${risk}`);
  if (scenario.breakpointKm != null) {
    parts.push(` Point critique au km ${Math.round(scenario.breakpointKm)}${scenario.breakpointRisk ? ' — ' + scenario.breakpointRisk.toLowerCase() : ''}`);
  } else {
    parts.push(' Aucun point de rupture détecté sur ce profil');
  }
  const action = pickKeyAction(scenario);
  if (action.carbsGh != null) {
    parts.push(` — sécurisable en montant à ${action.carbsGh} g/h`);
  }
  return parts.join('.') + '.';
}

// Helper pour calculer l'allure (min/km) à partir de la VMA et du % d'intensité
function computePaceFromVMA(vmaKmh: number | null, intensityPct: number): string | null {
  if (!vmaKmh || vmaKmh <= 0) return null;
  
  // Vitesse cible = VMA × (intensité / 100)
  const targetSpeedKmh = vmaKmh * (intensityPct / 100);
  if (targetSpeedKmh <= 0) return null;
  
  // Allure = 60 / vitesse (min/km)
  const paceMinPerKm = 60 / targetSpeedKmh;
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
}

// Helper pour formater une plage d'allures
function computePaceRangeFromVMA(
  vmaKmh: number | null, 
  intensityRange: [number, number]
): string | null {
  if (!vmaKmh || vmaKmh <= 0) return null;
  
  const paceFast = computePaceFromVMA(vmaKmh, intensityRange[1]); // Plus rapide (intensité haute)
  const paceSlow = computePaceFromVMA(vmaKmh, intensityRange[0]); // Plus lent (intensité basse)
  
  if (!paceFast || !paceSlow) return null;
  return `${paceFast} – ${paceSlow}`;
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
  potentielPhysiologiqueScore = null,
  potentielPhysiologiqueResult = null,
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
  // Conditions thermiques avancées (P1 — modèle continu chaleur+humidité)
  const [useAdvancedClimate, setUseAdvancedClimate] = useState<boolean>(false);
  const [ambientTempC, setAmbientTempC] = useState<number>(20);
  const [humidityPct, setHumidityPct] = useState<number>(50);
  const [acclimatized, setAcclimatized] = useState<boolean>(false);
  const [plannedCarbsGH, setPlannedCarbsGH] = useState<number>(60);
  const [useNutrition, setUseNutrition] = useState(true);
  const [gutTraining, setGutTraining] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('optimal');
  const [showSimulation, setShowSimulation] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RACE READINESS → SIMULATION ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  const simulationAccess = useMemo(() => 
    computeSimulationAccess(potentielPhysiologiqueResult, potentielPhysiologiqueScore),
    [potentielPhysiologiqueResult, potentielPhysiologiqueScore]
  );
  
  const accessMessages = useMemo(() => 
    getSimulationContextMessages(simulationAccess.status),
    [simulationAccess]
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
    ambientTempC: useAdvancedClimate ? ambientTempC : null,
    humidityPct: useAdvancedClimate ? humidityPct : null,
    acclimatized: useAdvancedClimate ? acclimatized : null,
    plannedCarbsGH: useNutrition ? plannedCarbsGH : null,
    gutTraining,
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
    // ✅ Passer les modificateurs Potentiel Physiologique au moteur de simulation
    readinessModifiers: simulationAccess.enabled ? simulationAccess.modifiers : null,
  }), [
    raceType, ambition, heat, terrain, plannedCarbsGH, useNutrition, gutTraining,
    useAdvancedClimate, ambientTempC, humidityPct, acclimatized,
    vlamaxEffectif, vlamaxConfidence, vlamaxDiscipline, tteMin, tteConfidence,
    fatmax, disponibiliteScore, disponibiliteLevel, injuryRiskLevel, ftp, vma, paceThreshold, weight,
    simulationAccess
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
    potentielPhysiologiqueScore,
    ftp,
    vma,
    paceThreshold,
    injuryRiskLevel,
  }), [raceType, ambition, heat, terrain, disponibiliteScore, disponibiliteLevel, potentielPhysiologiqueScore, ftp, vma, paceThreshold, injuryRiskLevel]);
  
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
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Taille de l'analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  "p-3 sm:p-4 rounded-lg border-2 transition-all text-left relative touch-manipulation min-h-[88px]",
                  isSelected 
                    ? mode === 'basic'
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-border hover:border-muted-foreground/50 active:bg-muted/50",
                  isProDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  {mode === 'basic' ? (
                    <Shield className={cn("w-4 h-4 sm:w-5 sm:h-5", isSelected ? "text-green-600" : "text-muted-foreground")} />
                  ) : (
                    <Sparkles className={cn("w-4 h-4 sm:w-5 sm:h-5", isSelected ? "text-blue-600" : "text-muted-foreground")} />
                  )}
                  <Badge 
                    variant={isSelected ? "default" : "secondary"}
                    className={cn(
                      "text-[10px] sm:text-xs",
                      isSelected && mode === 'basic' && "bg-green-600",
                      isSelected && mode === 'pro' && "bg-blue-600"
                    )}
                  >
                    {modeInfo.badge}
                  </Badge>
                </div>
                <div className={cn(
                  "font-medium text-xs sm:text-sm mb-0.5 sm:mb-1",
                  isSelected 
                    ? mode === 'basic' ? "text-green-700 dark:text-green-300" : "text-blue-700 dark:text-blue-300"
                    : "text-foreground"
                )}>
                  {mode === 'basic' ? "Décision robuste" : "Analyse complète"}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-tight">
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
  
  // Détecter si c'est un objectif course à pied
  const isRunning = ['Marathon', 'Semi', '10km'].includes(raceType);
  
  const ConfigPanel = () => (
    <div className="space-y-6">
      {/* Sélecteur de mode */}
      <ModeSelector />
      
      {/* Affichage des modificateurs Potentiel Physiologique si présents */}
      {simulationAccess.enabled && simulationAccess.status !== 'GREEN' && (
        <Card className={cn(
          "border-2",
          simulationAccess.status === 'ORANGE' && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10",
          simulationAccess.status === 'BLUE' && "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {simulationAccess.status === 'ORANGE' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-700 dark:text-amber-300">Modificateurs appliqués</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-700 dark:text-blue-300">Mode avancé actif</span>
                </>
              )}
              <Badge variant="outline" className="text-xs ml-auto">
                {ACCESS_STATUS_LABELS[simulationAccess.status].emoji} {ACCESS_STATUS_LABELS[simulationAccess.status].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {/* FTP/Seuil effectif */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {isRunning ? 'VMA effective' : 'FTP effectif'}
                </span>
                <span className={cn(
                  "font-mono font-medium",
                  simulationAccess.modifiers.effectiveFtpMultiplier[1] < 1 ? "text-amber-600" : 
                  simulationAccess.modifiers.effectiveFtpMultiplier[0] > 1 ? "text-blue-600" : ""
                )}>
                  {Math.round(simulationAccess.modifiers.effectiveFtpMultiplier[0] * 100)}-{Math.round(simulationAccess.modifiers.effectiveFtpMultiplier[1] * 100)}%
                </span>
              </div>
              
              {/* FatMax shift */}
              {simulationAccess.modifiers.fatmaxShiftPct !== 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Décalage FatMax</span>
                  <span className={cn(
                    "font-mono font-medium",
                    simulationAccess.modifiers.fatmaxShiftPct < 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {simulationAccess.modifiers.fatmaxShiftPct > 0 ? '+' : ''}{simulationAccess.modifiers.fatmaxShiftPct}%
                  </span>
                </div>
              )}
              
              {/* Glycogen depletion */}
              {simulationAccess.modifiers.glycogenDepletionRateMultiplier !== 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Déplétion glycogène</span>
                  <span className={cn(
                    "font-mono font-medium",
                    simulationAccess.modifiers.glycogenDepletionRateMultiplier > 1 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    ×{simulationAccess.modifiers.glycogenDepletionRateMultiplier.toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* TTE multiplier */}
              {simulationAccess.modifiers.tteUsableMultiplier !== 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">TTE utilisable</span>
                  <span className={cn(
                    "font-mono font-medium",
                    simulationAccess.modifiers.tteUsableMultiplier < 1 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    ×{simulationAccess.modifiers.tteUsableMultiplier.toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* Scénarios autorisés */}
              <div className="col-span-2 flex items-center justify-between pt-1 border-t border-border/50 mt-1">
                <span className="text-muted-foreground">Scénarios</span>
                <div className="flex gap-1">
                  {(['conservative', 'optimal', 'aggressive'] as const).map((s) => {
                    const allowed = simulationAccess.modifiers.allowedScenarios.includes(s);
                    const labels: Record<string, string> = {
                      conservative: 'C',
                      optimal: 'O',
                      aggressive: 'A'
                    };
                    return (
                      <span
                        key={s}
                        className={cn(
                          "w-5 h-5 rounded text-xs flex items-center justify-center font-medium",
                          allowed 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
                            : "bg-muted text-muted-foreground line-through"
                        )}
                        title={allowed ? `${s} disponible` : `${s} désactivé`}
                      >
                        {labels[s]}
                      </span>
                    );
                  })}
                </div>
              </div>
              
              {/* Stratégies pacing (mode BLUE) */}
              {simulationAccess.status === 'BLUE' && (
                <div className="col-span-2 flex gap-2 pt-1">
                  {simulationAccess.modifiers.negativeSplitAllowed && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      <Rocket className="w-3 h-3 mr-1" />
                      Negative split
                    </Badge>
                  )}
                  {simulationAccess.modifiers.lateRaceIntensityBoostAllowed && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      <Zap className="w-3 h-3 mr-1" />
                      Boost final
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
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

      {/* Conditions climatiques avancées (PRO) — modèle continu T+RH+acclimatation */}
      {simulationMode === 'pro' && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <ThermometerSun className="w-4 h-4 text-orange-500" />
              Conditions climatiques précises
            </Label>
            <Switch checked={useAdvancedClimate} onCheckedChange={setUseAdvancedClimate} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Active un modèle continu (T° + humidité + acclimatation) qui remplace le réglage discret « Chaleur » (Périard 2021).
          </p>

          {useAdvancedClimate && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Température ambiante</span>
                  <span className="font-medium">{ambientTempC} °C</span>
                </div>
                <Slider
                  value={[ambientTempC]}
                  onValueChange={([v]) => setAmbientTempC(v)}
                  min={-5}
                  max={42}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-5 °C</span><span>42 °C</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Humidité relative</span>
                  <span className="font-medium">{humidityPct} %</span>
                </div>
                <Slider
                  value={[humidityPct]}
                  onValueChange={([v]) => setHumidityPct(v)}
                  min={10}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>10 %</span><span>100 %</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-background/60 p-2">
                <div>
                  <Label htmlFor="acclim-switch" className="text-xs cursor-pointer">
                    Acclimaté à la chaleur
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    ≥ 10–14 j d'exposition récente &gt; 25 °C
                  </p>
                </div>
                <Switch
                  id="acclim-switch"
                  checked={acclimatized}
                  onCheckedChange={setAcclimatized}
                />
              </div>

              <p className="text-[10px] text-muted-foreground italic">
                T° équivalente ≈ {Math.round(ambientTempC + 0.3 * Math.max(0, humidityPct - 40))} °C
                {acclimatized ? ' • pénalité réduite (~-35%)' : ''}
              </p>
            </div>
          )}
        </div>
      )}
      
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
              <div className="flex items-center justify-between mt-2 p-2 bg-muted/30 rounded-lg">
                <Label htmlFor="gut-training-sim" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                  Gut Training
                </Label>
                <Switch id="gut-training-sim" checked={gutTraining} onCheckedChange={setGutTraining} />
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
                  {fatmax ? `${fatmax.minPctFTP}-${fatmax.maxPctFTP}% ${isRunning ? 'VMA' : 'FTP'}` : "—"}
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
          {potentielPhysiologiqueScore && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potentiel Physiologique</span>
              <span className="font-medium">{Math.round(potentielPhysiologiqueScore)}/100</span>
            </div>
          )}
          {/* Afficher VMA pour course / FTP pour vélo */}
          {isRunning ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VMA</span>
              <span className={vma ? "font-medium" : "text-muted-foreground"}>
                {vma ? `${vma.toFixed(1)} km/h` : "—"}
              </span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">FTP</span>
              <span className={ftp ? "font-medium" : "text-muted-foreground"}>
                {ftp ? `${ftp} W` : "—"}
              </span>
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
        
        {/* Temps estimé du scénario sélectionné - optimisé mobile */}
        {currentScenario && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="text-center">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Temps ({currentScenario.label})
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {formatDurationCompact(currentScenario.estimatedTimeRange[0])} – {formatDurationCompact(currentScenario.estimatedTimeRange[1])}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Centre: {formatDurationCompact(currentScenario.estimatedTimeMin)}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {proSimulation.timeConfidenceLabel}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-[10px] sm:text-xs", getScenarioBgColor(currentScenario.type))}
                  >
                    {currentScenario.type === 'conservative' ? 'Sécurisé' : 
                     currentScenario.type === 'optimal' ? 'Équilibré' : 'Ambitieux'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Sélection scénario - optimisé tactile */}
        <div className="space-y-3">
          <Label className="text-sm sm:text-base">Scénarios de pacing</Label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {proSimulation.scenarios.map((scenario) => {
              const Icon = SCENARIO_ICONS[scenario.type];
              const isSelected = selectedScenario === scenario.type;
              const isRecommended = proSimulation.recommendedScenario === scenario.type;
              
              return (
                <button
                  key={scenario.type}
                  onClick={() => setSelectedScenario(scenario.type)}
                  className={cn(
                    "p-2 sm:p-3 rounded-lg border-2 transition-all text-left touch-manipulation min-h-[80px] active:scale-[0.98]",
                    isSelected 
                      ? getScenarioBgColor(scenario.type) + " border-current"
                      : "border-border hover:border-muted-foreground/50 active:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", getScenarioColor(scenario.type))} />
                    <span className={cn("font-medium text-[11px] sm:text-sm truncate", isSelected && getScenarioColor(scenario.type))}>
                      {scenario.label}
                    </span>
                  </div>
                  {isRecommended && (
                    <Badge variant="secondary" className="text-[9px] sm:text-xs mb-1 px-1 sm:px-1.5">
                      Recommandé
                    </Badge>
                  )}
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    ~{Math.round(scenario.estimatedTimeMin)} min
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Détails du scénario sélectionné - optimisé mobile */}
        {currentScenario && (
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className={cn("text-base sm:text-lg flex items-center gap-1.5 sm:gap-2 min-w-0", getScenarioColor(currentScenario.type))}>
                  {React.createElement(SCENARIO_ICONS[currentScenario.type], { className: "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" })}
                  <span className="truncate">{currentScenario.label}</span>
                </CardTitle>
                <Badge className={cn("text-[10px] sm:text-xs flex-shrink-0", getDepletionRiskBgColor(currentScenario.overallDepletionRisk))}>
                  {currentScenario.overallDepletionRisk}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">{currentScenario.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              {/* Métriques clés - grille responsive */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Intensité</div>
                  <div className="text-base sm:text-lg font-bold">{currentScenario.targetIntensityPct}%</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {isRunning ? 'VMA' : 'FTP'}
                  </div>
                </div>
                {/* Allure cible pour running, Temps estimé pour vélo */}
                {isRunning && vma ? (
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Allure</div>
                    <div className="text-base sm:text-lg font-bold font-mono">
                      {computePaceFromVMA(vma, currentScenario.targetIntensityPct) ?? '—'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {computePaceRangeFromVMA(vma, currentScenario.targetIntensityRange) ?? '/km'}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Temps</div>
                    <div className="text-base sm:text-lg font-bold">
                      {formatDurationCompact(currentScenario.estimatedTimeMin)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDurationCompact(currentScenario.estimatedTimeRange[0])} – {formatDurationCompact(currentScenario.estimatedTimeRange[1])}
                    </div>
                  </div>
                )}
              </div>
              {/* Temps estimé séparé pour running (on a besoin des deux) */}
              {isRunning && (
                <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Temps estimé</div>
                      <div className="text-sm sm:text-base font-bold">
                        {formatDurationCompact(currentScenario.estimatedTimeMin)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Plage</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {formatDurationCompact(currentScenario.estimatedTimeRange[0])} – {formatDurationCompact(currentScenario.estimatedTimeRange[1])}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Succès</div>
                  <div className="text-base sm:text-lg font-bold">{Math.round(currentScenario.successProbability * 100)}%</div>
                  <Progress 
                    value={currentScenario.successProbability * 100} 
                    className="h-1 sm:h-1.5 mt-1"
                  />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Risque global</div>
                  <div className={cn("text-lg font-bold", getDepletionRiskColor(currentScenario.overallDepletionRisk))}>
                    {currentScenario.overallDepletionRisk}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Indice: {Math.round(currentScenario.overallFuelRisk)}/100
                  </div>
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
        
        {/* Tableau des segments avec allures (running uniquement) */}
        {currentScenario && isRunning && vma && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Progression par segment
              </CardTitle>
              <CardDescription>
                Allure cible et risque par kilomètre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 font-medium text-muted-foreground">Km</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Intensité</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Allure</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Glyco.</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Risque</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">RPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentScenario.segments.map((seg, idx) => {
                      const pace = computePaceFromVMA(vma, seg.intensityPct);
                      return (
                        <tr 
                          key={idx} 
                          className={cn(
                            "border-b border-border/50 transition-colors",
                            seg.depletionRisk === 'CRITICAL' && "bg-destructive/10",
                            seg.depletionRisk === 'HIGH' && "bg-amber-500/10"
                          )}
                        >
                          <td className="py-1.5 px-1 font-medium">
                            {Math.round(seg.distanceKm)} km
                          </td>
                          <td className="text-center py-1.5 px-1">
                            {Math.round(seg.intensityPct)}%
                          </td>
                          <td className="text-center py-1.5 px-1 font-mono font-medium">
                            {pace ?? '—'}
                          </td>
                          <td className="text-center py-1.5 px-1">
                            <span className={cn(
                              seg.glycogenRemaining < 30 ? "text-destructive font-medium" :
                              seg.glycogenRemaining < 50 ? "text-amber-600" : ""
                            )}>
                              {Math.round(seg.glycogenRemaining)}%
                            </span>
                          </td>
                          <td className="text-center py-1.5 px-1">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] px-1.5",
                                getDepletionRiskBgColor(seg.depletionRisk),
                                getDepletionRiskColor(seg.depletionRisk)
                              )}
                            >
                              {seg.depletionRisk}
                            </Badge>
                          </td>
                          <td className="text-center py-1.5 px-1 text-muted-foreground">
                            {seg.rpeEstimate.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <strong>Lecture :</strong> L'allure est calculée à partir de la VMA ({vma.toFixed(1)} km/h) 
                et de l'intensité cible du segment. Le RPE (Rating of Perceived Exertion) indique l'effort perçu sur 10.
              </div>
            </CardContent>
          </Card>
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
      {accessMessages.map((msg: any, i: number) => (
        <Alert 
          key={i} 
          variant="default"
        >
          <AlertDescription>{typeof msg === 'string' ? msg : msg?.content ?? ''}</AlertDescription>
        </Alert>
      ))}
      
      {/* Recommendations */}
      {(simulationAccess.recommendations ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(simulationAccess.recommendations ?? []).map((rec: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  {typeof rec === 'string' ? rec : rec?.content ?? ''}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Principle reminder */}
      <div className="p-4 bg-muted/30 rounded-lg border text-center space-y-2">
        <p className="text-sm font-medium">
          {SIMULATION_ACCESS_DEFINITIONS['title']}
        </p>
        <p className="text-xs text-muted-foreground italic">
          {SIMULATION_ACCESS_DEFINITIONS['principle']}
        </p>
      </div>
    </div>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS STATUS HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  
  const AccessStatusHeader = () => {
    if (simulationAccess.status === 'RED') return null;
    
    const statusInfo = ACCESS_STATUS_LABELS[simulationAccess.status];
    const statusColor = ACCESS_LEVEL_COLORS[simulationAccess.status];
    
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border mb-4 bg-muted/30">
        <span className="text-lg">{statusInfo.emoji}</span>
        <div className="flex-1">
          <span className="text-sm font-medium">
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
          <Badge variant="outline" className="text-xs">
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
      <CardHeader className="px-3 sm:px-6 pb-3 sm:pb-4">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Simulation TFCL™</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-1 sm:line-clamp-none">
              {!simulationAccess.enabled
                ? "Potentiel Physiologique insuffisant"
                : showSimulation 
                  ? simulationMode === 'basic'
                    ? `${basicSimulation?.raceLabel} - ${basicSimulation?.ambitionLabel}`
                    : `${proSimulation?.raceLabel} - ${proSimulation?.ambitionLabel}`
                  : "Comparez des scénarios"
              }
            </CardDescription>
          </div>
          {/* Status badge - compact on mobile */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] sm:text-xs flex-shrink-0 whitespace-nowrap",
              !simulationAccess.enabled 
                ? "border-destructive text-destructive"
                : showSimulation 
                  ? simulationMode === 'basic' 
                    ? "border-green-500 text-green-600" 
                    : "border-blue-500 text-blue-600"
                  : "border-muted text-muted-foreground"
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
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Mobile: no ScrollArea wrapper (native scroll), Desktop: use ScrollArea for compact mode */}
        <div className={compact ? "hidden" : "block"}>
          {/* Access blocked: show blocked panel */}
          {!simulationAccess.enabled && <AccessBlockedPanel />}
          
          {/* Access granted: show normal UI */}
          {simulationAccess.enabled && (
            <div className="space-y-4">
              <AccessStatusHeader />
              
              {/* Quick config summary when simulation is active */}
              {showSimulation && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Badge variant="outline" className="font-medium">
                        {raceType}
                      </Badge>
                      <span className="text-muted-foreground">·</span>
                      <span className="capitalize">{ambition}</span>
                      <span className="text-muted-foreground hidden sm:inline">·</span>
                      <span className="hidden sm:inline text-muted-foreground">
                        {heat === 'low' ? 'Froid' : heat === 'moderate' ? 'Tempéré' : 'Chaud'}
                      </span>
                      <span className="text-muted-foreground hidden sm:inline">·</span>
                      <span className="hidden sm:inline text-muted-foreground">
                        {terrain === 'flat' ? 'Plat' : 'Dénivelé'}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSimulation(false)}
                      className="h-7 px-2 text-xs touch-manipulation"
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
              )}
              
              {!showSimulation && <ConfigPanel />}
              {showSimulation && simulationMode === 'basic' && <BasicResultsPanel />}
              {showSimulation && simulationMode === 'pro' && <ProResultsPanel />}
            </div>
          )}
        </div>
        
        {/* Compact mode: use ScrollArea */}
        {compact && (
          <ScrollArea className="h-[400px]">
            {!simulationAccess.enabled && <AccessBlockedPanel />}
            {simulationAccess.enabled && (
              <div className="space-y-4">
                <AccessStatusHeader />
                {showSimulation && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Badge variant="outline" className="font-medium">{raceType}</Badge>
                        <span className="text-muted-foreground">·</span>
                        <span className="capitalize">{ambition}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowSimulation(false)} className="h-7 px-2 text-xs touch-manipulation">
                        Modifier
                      </Button>
                    </div>
                  </div>
                )}
                {!showSimulation && <ConfigPanel />}
                {showSimulation && simulationMode === 'basic' && <BasicResultsPanel />}
                {showSimulation && simulationMode === 'pro' && <ProResultsPanel />}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default RaceSimulationModule;
