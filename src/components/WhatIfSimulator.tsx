// =============================================
// WHAT-IF SCENARIO SIMULATOR - INSCYD-inspired
// Two For Coaching Lab
// =============================================

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Beaker, TrendingUp, Target, Clock, Zap, Activity, 
  Scale, RefreshCcw, ArrowRight, ChevronRight, AlertTriangle, Crosshair
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MetabolicProfile,
  WhatIfScenario,
  predictPerformance,
  generateLactateCurve,
  generateWhatIfScenarios,
  PerformancePrediction,
  calibrateVLamaxFromFTP,
  calibrateVLamaxFromTTE,
  calibrateVLamaxFromFatMax,
  calibrateVO2maxFromFTP
} from "@/lib/v2/metabolicSimulator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts";

// =============================================
// TYPES
// =============================================

type SimulatorMode = "calibration" | "objectif";

interface WhatIfSimulatorProps {
  initialProfile?: Partial<MetabolicProfile>;
  observedTTE?: number | null;
  observedFTP?: number | null;
  observedFatMax?: number | null;
  className?: string;
}

// =============================================
// CUSTOM TOOLTIP
// =============================================

function LactateTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{data?.zone}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Intensité:</span>
          <span className="font-mono">{data?.intensity}% VO2max</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Puissance:</span>
          <span className="font-mono">{Math.round(data?.watts)}W</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lactate:</span>
          <span className="font-mono font-semibold">{data?.lactate?.toFixed(1)} mmol/L</span>
        </div>
      </div>
    </div>
  );
}

// =============================================
// METRIC COMPARISON CARD
// =============================================

function MetricCompare({ 
  label, 
  current, 
  simulated, 
  unit,
  icon: Icon,
  isInverse = false,
  observed
}: { 
  label: string; 
  current: number | string; 
  simulated: number | string; 
  unit?: string;
  icon: any;
  isInverse?: boolean;
  observed?: number | null;
}) {
  const currentNum = typeof current === "string" ? parseFloat(current) : current;
  const simulatedNum = typeof simulated === "string" ? parseFloat(simulated) : simulated;
  
  const diff = simulatedNum - currentNum;
  const diffPct = currentNum > 0 ? ((diff / currentNum) * 100).toFixed(1) : "0";
  
  const isPositive = isInverse ? diff < 0 : diff > 0;
  const isNegative = isInverse ? diff > 0 : diff < 0;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          {observed && (
            <span className="text-[9px] text-green-600">Mesuré: {observed}{unit}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">
          {typeof current === "string" ? current : current.toFixed(1)}{unit}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          "text-sm font-mono font-semibold",
          isPositive && "text-green-600",
          isNegative && "text-red-600"
        )}>
          {typeof simulated === "string" ? simulated : simulated.toFixed(1)}{unit}
        </span>
        {diff !== 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1",
              isPositive && "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
              isNegative && "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {diff > 0 ? "+" : ""}{diffPct}%
          </Badge>
        )}
      </div>
    </div>
  );
}

// =============================================
// SLIDER WITH LABEL
// =============================================

function ParameterSlider({
  label,
  icon: Icon,
  current,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals = 1,
  highlight = false
}: {
  label: string;
  icon: any;
  current: number;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  highlight?: boolean;
}) {
  const hasChanged = Math.abs(value - current) > step / 2;
  
  return (
    <div className={cn(
      "space-y-2 p-2 rounded-lg transition-colors",
      highlight && "bg-primary/5 border border-primary/20"
    )}>
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{current.toFixed(decimals)}</span>
          <ArrowRight className="h-3 w-3" />
          <span className={cn(
            "text-sm font-mono font-semibold",
            hasChanged && "text-primary"
          )}>
            {value.toFixed(decimals)}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function WhatIfSimulator({ 
  initialProfile, 
  observedTTE, 
  observedFTP,
  observedFatMax,
  className 
}: WhatIfSimulatorProps) {
  // Default profile
  const defaultProfile: MetabolicProfile = {
    vo2max: initialProfile?.vo2max || 55,
    vlamax: initialProfile?.vlamax || 0.45,
    weight: initialProfile?.weight || 70,
    ftp: initialProfile?.ftp || 250,
    fcMax: initialProfile?.fcMax || 180
  };
  
  // State
  const [current] = useState(defaultProfile);
  const [simulated, setSimulated] = useState(defaultProfile);
  const [mode, setMode] = useState<SimulatorMode>("calibration");
  const [activeTab, setActiveTab] = useState<"base" | "derived" | "presets">("base");
  
  // Derived targets (for objectif mode)
  const [targetFTP, setTargetFTP] = useState(defaultProfile.ftp);
  const [targetTTE, setTargetTTE] = useState(45);
  const [targetFatMax, setTargetFatMax] = useState(65);
  
  // Initialize targets from predictions
  const initialPrediction = useMemo(() => predictPerformance(defaultProfile), []);
  
  useEffect(() => {
    setTargetFTP(observedFTP ?? initialPrediction.ftpWatts);
    setTargetTTE(observedTTE ?? initialPrediction.tteAtFTP);
    setTargetFatMax(observedFatMax ?? initialPrediction.fatMaxIntensity);
  }, [initialPrediction, observedFTP, observedTTE, observedFatMax]);
  
  // Predictions
  const currentPrediction = useMemo(() => predictPerformance(current), [current]);
  const simulatedPrediction = useMemo(() => predictPerformance(simulated), [simulated]);
  
  // Lactate curves
  const currentLactateCurve = useMemo(() => 
    generateLactateCurve(current.vo2max, current.vlamax, current.ftp), 
    [current]
  );
  const simulatedLactateCurve = useMemo(() => 
    generateLactateCurve(simulated.vo2max, simulated.vlamax, simulated.ftp), 
    [simulated]
  );
  
  // Preset scenarios
  const presetScenarios = useMemo(() => generateWhatIfScenarios(current), [current]);
  
  // Inverse calibration when in objectif mode and derived values change
  useEffect(() => {
    if (mode !== "objectif") return;
    
    // Calculate required VLamax for each target
    const vlamaxForFTP = calibrateVLamaxFromFTP(targetFTP, current.vo2max, simulated.weight);
    const vlamaxForTTE = calibrateVLamaxFromTTE(targetTTE, current.vo2max);
    const vlamaxForFatMax = calibrateVLamaxFromFatMax(targetFatMax);
    
    // Use weighted average prioritizing TTE (most reliable)
    const avgVlamax = (vlamaxForFTP * 0.3 + vlamaxForTTE * 0.5 + vlamaxForFatMax * 0.2);
    const requiredVO2 = calibrateVO2maxFromFTP(targetFTP, avgVlamax, simulated.weight);
    
    setSimulated(prev => ({
      ...prev,
      vlamax: Number(avgVlamax.toFixed(3)),
      vo2max: Number(requiredVO2.toFixed(1))
    }));
  }, [mode, targetFTP, targetTTE, targetFatMax, current.vo2max, simulated.weight]);
  
  // Handlers
  const handleBaseChange = (key: keyof MetabolicProfile, value: number) => {
    setSimulated(prev => ({ ...prev, [key]: value }));
  };
  
  const handleReset = () => {
    setSimulated(current);
    setTargetFTP(observedFTP ?? currentPrediction.ftpWatts);
    setTargetTTE(observedTTE ?? currentPrediction.tteAtFTP);
    setTargetFatMax(observedFatMax ?? currentPrediction.fatMaxIntensity);
  };
  
  const applyPreset = (scenario: WhatIfScenario) => {
    setSimulated(prev => ({
      ...prev,
      vo2max: scenario.vo2max,
      vlamax: scenario.vlamax,
      weight: scenario.weight
    }));
  };
  
  // Combined lactate data for chart
  const combinedLactateData = useMemo(() => {
    return currentLactateCurve.map((point, i) => ({
      intensity: point.intensity,
      current: point.lactate,
      simulated: simulatedLactateCurve[i]?.lactate || 0,
      zone: point.zone,
      watts: point.watts
    }));
  }, [currentLactateCurve, simulatedLactateCurve]);
  
  const hasChanges = 
    simulated.vo2max !== current.vo2max ||
    simulated.vlamax !== current.vlamax ||
    simulated.weight !== current.weight;
  
  // Check feasibility of targets
  const infeasibleTarget = mode === "objectif" && (simulated.vlamax < 0.18 || simulated.vlamax > 0.95);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Simulateur What-If
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
                <RefreshCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Mode:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", mode === "calibration" && "font-semibold text-primary")}>
              Calibration
            </span>
            <Switch
              checked={mode === "objectif"}
              onCheckedChange={(checked) => setMode(checked ? "objectif" : "calibration")}
            />
            <span className={cn("text-xs", mode === "objectif" && "font-semibold text-primary")}>
              Objectif
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Mode Description */}
        <div className={cn(
          "p-2 rounded-lg text-xs",
          mode === "calibration" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" 
                                 : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        )}>
          {mode === "calibration" ? (
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Ajustez VO2max, VLamax, Poids pour voir l'impact sur FTP, TTE et FatMax</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Crosshair className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Définissez vos objectifs FTP/TTE/FatMax - le modèle calcule les paramètres requis</span>
            </div>
          )}
        </div>
        
        {/* Input Controls */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="base" className="text-xs">
              {mode === "calibration" ? "Paramètres" : "Poids"}
            </TabsTrigger>
            <TabsTrigger value="derived" className="text-xs">
              {mode === "calibration" ? "Prédictions" : "Objectifs"}
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-xs">Scénarios</TabsTrigger>
          </TabsList>
          
          {/* BASE PARAMETERS TAB */}
          <TabsContent value="base" className="space-y-3 mt-4">
            {mode === "calibration" ? (
              <>
                <ParameterSlider
                  label="VO2max"
                  icon={Activity}
                  current={current.vo2max}
                  value={simulated.vo2max}
                  onChange={(v) => handleBaseChange("vo2max", v)}
                  min={35}
                  max={85}
                  step={0.5}
                  unit="ml/kg/min"
                />
                <ParameterSlider
                  label="VLamax"
                  icon={Zap}
                  current={current.vlamax}
                  value={simulated.vlamax}
                  onChange={(v) => handleBaseChange("vlamax", v)}
                  min={0.15}
                  max={1.0}
                  step={0.01}
                  unit="mmol/L/s"
                  decimals={2}
                />
                <ParameterSlider
                  label="Poids"
                  icon={Scale}
                  current={current.weight}
                  value={simulated.weight}
                  onChange={(v) => handleBaseChange("weight", v)}
                  min={45}
                  max={120}
                  step={0.5}
                  unit="kg"
                />
              </>
            ) : (
              <>
                {/* In objectif mode, only weight is adjustable as base param */}
                <ParameterSlider
                  label="Poids cible"
                  icon={Scale}
                  current={current.weight}
                  value={simulated.weight}
                  onChange={(v) => handleBaseChange("weight", v)}
                  min={45}
                  max={120}
                  step={0.5}
                  unit="kg"
                />
                
                {/* Show calculated base params */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground">Paramètres requis calculés:</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VO2max requis:</span>
                      <span className="font-mono font-semibold">{simulated.vo2max.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VLamax requise:</span>
                      <span className="font-mono font-semibold">{simulated.vlamax.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
                
                {infeasibleTarget && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-red-700 dark:text-red-300">
                      Objectifs non réalistes - VLamax hors plage physiologique ({simulated.vlamax.toFixed(2)})
                    </span>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          {/* DERIVED / OBJECTIVES TAB */}
          <TabsContent value="derived" className="space-y-3 mt-4">
            {mode === "calibration" ? (
              // Show predicted values (read-only in calibration mode)
              <div className="space-y-1.5">
                <MetricCompare 
                  label="FTP" 
                  current={currentPrediction.ftpWatts} 
                  simulated={simulatedPrediction.ftpWatts}
                  unit="W"
                  icon={Zap}
                  observed={observedFTP}
                />
                <MetricCompare 
                  label="FTP/kg" 
                  current={currentPrediction.ftpWkg} 
                  simulated={simulatedPrediction.ftpWkg}
                  unit=" W/kg"
                  icon={Scale}
                />
                <MetricCompare 
                  label="TTE @ FTP" 
                  current={currentPrediction.tteAtFTP} 
                  simulated={simulatedPrediction.tteAtFTP}
                  unit=" min"
                  icon={Clock}
                  observed={observedTTE}
                />
                <MetricCompare 
                  label="FatMax" 
                  current={currentPrediction.fatMaxIntensity} 
                  simulated={simulatedPrediction.fatMaxIntensity}
                  unit="%"
                  icon={Activity}
                  observed={observedFatMax}
                />
              </div>
            ) : (
              // Editable targets in objectif mode
              <>
                <ParameterSlider
                  label="FTP cible"
                  icon={Zap}
                  current={observedFTP ?? currentPrediction.ftpWatts}
                  value={targetFTP}
                  onChange={setTargetFTP}
                  min={100}
                  max={450}
                  step={5}
                  unit="W"
                  decimals={0}
                  highlight
                />
                <ParameterSlider
                  label="TTE cible"
                  icon={Clock}
                  current={observedTTE ?? currentPrediction.tteAtFTP}
                  value={targetTTE}
                  onChange={setTargetTTE}
                  min={15}
                  max={90}
                  step={1}
                  unit="min"
                  decimals={0}
                  highlight
                />
                <ParameterSlider
                  label="FatMax cible"
                  icon={Activity}
                  current={observedFatMax ?? currentPrediction.fatMaxIntensity}
                  value={targetFatMax}
                  onChange={setTargetFatMax}
                  min={40}
                  max={80}
                  step={1}
                  unit="%"
                  decimals={0}
                  highlight
                />
              </>
            )}
          </TabsContent>
          
          {/* PRESETS TAB */}
          <TabsContent value="presets" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presetScenarios.slice(1).map((scenario, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex-col items-start text-left"
                  onClick={() => {
                    if (mode === "objectif") setMode("calibration");
                    applyPreset(scenario);
                  }}
                >
                  <span className="text-xs font-medium">{scenario.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    VO2: {scenario.vo2max.toFixed(0)} • VLa: {scenario.vlamax.toFixed(2)}
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Lactate Curve Comparison */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Courbe de Lactate Prédictive
          </h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedLactateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="intensity" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "% VO2max", position: "bottom", fontSize: 10, offset: -5 }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  domain={[0, 12]}
                  tickFormatter={(v) => `${v}`}
                  label={{ value: "mmol/L", angle: -90, position: "insideLeft", fontSize: 10 }}
                />
                <Tooltip content={<LactateTooltip />} />
                <ReferenceLine y={2} stroke="hsl(142, 71%, 45%)" strokeDasharray="5 5" label={{ value: "LT1", fontSize: 9 }} />
                <ReferenceLine y={4} stroke="hsl(24, 95%, 53%)" strokeDasharray="5 5" label={{ value: "LT2", fontSize: 9 }} />
                <Legend 
                  verticalAlign="top" 
                  height={30}
                  formatter={(value) => (
                    <span className="text-xs">{value === "current" ? "Actuel" : "Simulé"}</span>
                  )}
                />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="current"
                />
                <Line 
                  type="monotone" 
                  dataKey="simulated" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="simulated"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Performance Impact Summary (only in calibration mode) */}
        {mode === "calibration" && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Impact sur la Performance
            </h4>
            <div className="space-y-1.5">
              <MetricCompare 
                label="FTP" 
                current={currentPrediction.ftpWatts} 
                simulated={simulatedPrediction.ftpWatts}
                unit="W"
                icon={Zap}
                observed={observedFTP}
              />
              <MetricCompare 
                label="TTE @ FTP" 
                current={currentPrediction.tteAtFTP} 
                simulated={simulatedPrediction.tteAtFTP}
                unit=" min"
                icon={Clock}
                observed={observedTTE}
              />
              <MetricCompare 
                label="FatMax" 
                current={currentPrediction.fatMaxIntensity} 
                simulated={simulatedPrediction.fatMaxIntensity}
                unit="%"
                icon={Activity}
                observed={observedFatMax}
              />
            </div>
          </div>
        )}
        
        {/* Race Time Predictions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Prédictions de Temps de Course
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/30 border">
              <div className="text-[10px] text-muted-foreground">Semi-Marathon</div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono">{currentPrediction.halfMarathon}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-sm font-mono font-semibold text-primary">{simulatedPrediction.halfMarathon}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 border">
              <div className="text-[10px] text-muted-foreground">Marathon</div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono">{currentPrediction.marathon}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-sm font-mono font-semibold text-primary">{simulatedPrediction.marathon}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 border">
              <div className="text-[10px] text-muted-foreground">Ironman 70.3</div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono">{currentPrediction.ironman70_3}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-sm font-mono font-semibold text-primary">{simulatedPrediction.ironman70_3}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 border">
              <div className="text-[10px] text-muted-foreground">Ironman</div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono">{currentPrediction.ironman}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-sm font-mono font-semibold text-primary">{simulatedPrediction.ironman}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          Estimations basées sur le modèle métabolique simplifié. Usage indicatif uniquement.
        </p>
      </CardContent>
    </Card>
  );
}
