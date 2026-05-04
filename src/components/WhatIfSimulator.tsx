// =============================================
// WHAT-IF SCENARIO SIMULATOR - Mader Model Based
// Two For Coaching Lab - Scientific precision
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
  Scale, RefreshCcw, ArrowRight, ChevronRight, AlertTriangle, 
  Crosshair, Flame, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MaderProfile,
  MaderPredictions,
  predictMaderPerformance,
  generateMaderLactateCurve,
  calibrateVLamaxFromMLSS,
  calibrateVLamaxFromTTE,
  calibrateVLamaxFromFatMax
} from "@/lib/v2/maderMetabolicModel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart
} from "recharts";

// =============================================
// TYPES
// =============================================

type SimulatorMode = "calibration" | "objectif";

interface WhatIfSimulatorProps {
  initialProfile?: Partial<MaderProfile>;
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
          <span className="font-mono">{data?.power}W</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lactate:</span>
          <span className="font-mono font-semibold">{data?.lactate} mmol/L</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lipides:</span>
          <span className="font-mono">{data?.fatOx} g/min</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Glucides:</span>
          <span className="font-mono">{data?.carbOx} g/min</span>
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
  observed,
  showDivergence = false
}: { 
  label: string; 
  current: number | string; 
  simulated: number | string; 
  unit?: string;
  icon: any;
  isInverse?: boolean;
  observed?: number | null;
  showDivergence?: boolean;
}) {
  const currentNum = typeof current === "string" ? parseFloat(current) : current;
  const simulatedNum = typeof simulated === "string" ? parseFloat(simulated) : simulated;
  
  const diff = simulatedNum - currentNum;
  const diffPct = currentNum > 0 ? ((diff / currentNum) * 100).toFixed(1) : "0";
  
  const isPositive = isInverse ? diff < 0 : diff > 0;
  const isNegative = isInverse ? diff > 0 : diff < 0;
  
  // Check divergence from observed
  const divergence = observed ? Math.abs(currentNum - observed) / observed * 100 : 0;
  const hasDivergence = showDivergence && divergence > 15;
  
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg border",
      hasDivergence ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-muted/30"
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          {observed && (
            <span className="text-[9px] text-green-600 dark:text-green-400">
              Mesuré: {observed}{unit}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">
          {typeof current === "string" ? current : Math.round(currentNum)}{unit}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          "text-sm font-mono font-semibold",
          isPositive && "text-green-600",
          isNegative && "text-red-600"
        )}>
          {typeof simulated === "string" ? simulated : Math.round(simulatedNum)}{unit}
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
  const defaultProfile: MaderProfile = {
    vo2max: initialProfile?.vo2max || 55,
    vlamax: initialProfile?.vlamax || 0.45,
    weight: initialProfile?.weight || 70,
  };
  
  // State
  const [current] = useState(defaultProfile);
  const [simulated, setSimulated] = useState(defaultProfile);
  const [mode, setMode] = useState<SimulatorMode>("calibration");
  const [activeTab, setActiveTab] = useState<"base" | "derived" | "substrate">("base");
  
  // Derived targets (for objectif mode)
  const [targetFTP, setTargetFTP] = useState(0);
  const [targetTTE, setTargetTTE] = useState(45);
  const [targetFatMax, setTargetFatMax] = useState(65);
  
  // Predictions from Mader model
  const currentPrediction = useMemo(() => predictMaderPerformance(current), [current]);
  const simulatedPrediction = useMemo(() => predictMaderPerformance(simulated), [simulated]);
  
  // Initialize targets from predictions or observed values
  useEffect(() => {
    setTargetFTP(observedFTP ?? currentPrediction.mlssPower);
    setTargetTTE(observedTTE ?? currentPrediction.tteAtMLSS);
    setTargetFatMax(observedFatMax ?? currentPrediction.fatMaxIntensity);
  }, [currentPrediction, observedFTP, observedTTE, observedFatMax]);
  
  // Lactate curves from Mader model
  const currentLactateCurve = useMemo(() => 
    generateMaderLactateCurve(current), [current]
  );
  const simulatedLactateCurve = useMemo(() => 
    generateMaderLactateCurve(simulated), [simulated]
  );
  
  // Inverse calibration when in objectif mode
  useEffect(() => {
    if (mode !== "objectif") return;
    
    // Calculate required VLamax for each target using Mader model
    const vlamaxForFTP = calibrateVLamaxFromMLSS(targetFTP, current.vo2max, simulated.weight);
    const vlamaxForTTE = calibrateVLamaxFromTTE(targetTTE, current.vo2max, simulated.weight, targetFTP);
    const vlamaxForFatMax = calibrateVLamaxFromFatMax(targetFatMax, current.vo2max, simulated.weight);

    // Weighted average — if TTE estimation failed (returned null), redistribute
    // its weight onto the other two valid signals instead of biasing the result.
    let avgVlamax: number;
    if (vlamaxForTTE !== null) {
      avgVlamax = vlamaxForFTP * 0.3 + vlamaxForTTE * 0.5 + vlamaxForFatMax * 0.2;
    } else {
      avgVlamax = vlamaxForFTP * 0.6 + vlamaxForFatMax * 0.4;
    }

    setSimulated(prev => ({
      ...prev,
      vlamax: Number(avgVlamax.toFixed(3))
    }));
  }, [mode, targetFTP, targetTTE, targetFatMax, current.vo2max, simulated.weight]);
  
  // Handlers
  const handleBaseChange = (key: keyof MaderProfile, value: number) => {
    setSimulated(prev => ({ ...prev, [key]: value }));
  };
  
  const handleReset = () => {
    setSimulated(current);
    setTargetFTP(observedFTP ?? currentPrediction.mlssPower);
    setTargetTTE(observedTTE ?? currentPrediction.tteAtMLSS);
    setTargetFatMax(observedFatMax ?? currentPrediction.fatMaxIntensity);
  };
  
  // Combined lactate data for chart
  const combinedLactateData = useMemo(() => {
    return currentLactateCurve.map((point, i) => ({
      intensity: point.intensity,
      power: point.power,
      current: point.lactate,
      simulated: simulatedLactateCurve[i]?.lactate || 0,
      zone: point.zone,
      fatOx: point.fatOx,
      carbOx: point.carbOx
    }));
  }, [currentLactateCurve, simulatedLactateCurve]);
  
  // Substrate data for visualization
  const substrateData = useMemo(() => {
    return simulatedLactateCurve.map(point => ({
      intensity: point.intensity,
      power: point.power,
      fatOx: point.fatOx * 60, // Convert to g/h
      carbOx: point.carbOx * 60, // Convert to g/h
      lactate: point.lactate
    }));
  }, [simulatedLactateCurve]);
  
  const hasChanges = 
    simulated.vo2max !== current.vo2max ||
    simulated.vlamax !== current.vlamax ||
    simulated.weight !== current.weight;
  
  // Check for model-observed divergence
  const ftpDivergence = observedFTP ? 
    Math.abs(currentPrediction.mlssPower - observedFTP) / observedFTP * 100 : 0;
  const tteDivergence = observedTTE ? 
    Math.abs(currentPrediction.tteAtMLSS - observedTTE) / observedTTE * 100 : 0;
  const hasMajorDivergence = ftpDivergence > 15 || tteDivergence > 30;
  
  // Check feasibility of targets
  const infeasibleTarget = mode === "objectif" && (simulated.vlamax < 0.15 || simulated.vlamax > 1.0);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Simulateur Métabolique
            <Badge variant="outline" className="text-[9px] font-normal">
              Mader Model
            </Badge>
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
              Exploration
            </span>
            <Switch
              checked={mode === "objectif"}
              onCheckedChange={(checked) => setMode(checked ? "objectif" : "calibration")}
            />
            <span className={cn("text-xs", mode === "objectif" && "font-semibold text-primary")}>
              Objectifs
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Divergence Warning */}
        {hasMajorDivergence && mode === "calibration" && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Écart modèle/terrain détecté.</span>
              {" "}Le modèle prédit {currentPrediction.tteAtMLSS}min TTE vs {observedTTE}min mesuré. 
              Ajustez VLamax ou passez en mode Objectifs pour calibrer.
            </div>
          </div>
        )}
        
        {/* Mode Description */}
        <div className={cn(
          "p-2 rounded-lg text-xs",
          mode === "calibration" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" 
                                 : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        )}>
          {mode === "calibration" ? (
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Explorez l'impact de VO2max, VLamax et Poids sur les seuils et substrats (modèle Mader)</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Crosshair className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Définissez vos objectifs FTP/TTE/FatMax → le modèle calcule la VLamax requise</span>
            </div>
          )}
        </div>
        
        {/* Input Controls */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="base" className="text-xs">
              {mode === "calibration" ? "Paramètres" : "Objectifs"}
            </TabsTrigger>
            <TabsTrigger value="derived" className="text-xs">Performance</TabsTrigger>
            <TabsTrigger value="substrate" className="text-xs">Substrats</TabsTrigger>
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
                <ParameterSlider
                  label="FTP cible (MLSS)"
                  icon={Zap}
                  current={observedFTP ?? currentPrediction.mlssPower}
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
                  current={observedTTE ?? currentPrediction.tteAtMLSS}
                  value={targetTTE}
                  onChange={setTargetTTE}
                  min={15}
                  max={120}
                  step={1}
                  unit="min"
                  decimals={0}
                  highlight
                />
                <ParameterSlider
                  label="FatMax cible"
                  icon={Flame}
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
                
                {/* Show calculated VLamax */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    VLamax requise calculée
                  </h5>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">VLamax effective:</span>
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      infeasibleTarget ? "text-red-600" : "text-primary"
                    )}>
                      {simulated.vlamax.toFixed(3)} mmol/L/s
                    </span>
                  </div>
                  {infeasibleTarget && (
                    <p className="text-[10px] text-red-600">
                      Objectifs hors limites physiologiques
                    </p>
                  )}
                </div>
              </>
            )}
          </TabsContent>
          
          {/* PERFORMANCE TAB */}
          <TabsContent value="derived" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <MetricCompare 
                label="MLSS / FTP" 
                current={currentPrediction.mlssPower} 
                simulated={simulatedPrediction.mlssPower}
                unit="W"
                icon={Zap}
                observed={observedFTP}
                showDivergence
              />
              <MetricCompare 
                label="FTP/kg" 
                current={currentPrediction.mlssWkg} 
                simulated={simulatedPrediction.mlssWkg}
                unit=" W/kg"
                icon={Scale}
              />
              <MetricCompare 
                label="LT1 (2mmol)" 
                current={currentPrediction.lt1Power} 
                simulated={simulatedPrediction.lt1Power}
                unit="W"
                icon={Activity}
              />
              <MetricCompare 
                label="LT2 (4mmol)" 
                current={currentPrediction.lt2Power} 
                simulated={simulatedPrediction.lt2Power}
                unit="W"
                icon={Activity}
              />
              <MetricCompare 
                label="TTE @ MLSS" 
                current={currentPrediction.tteAtMLSS} 
                simulated={simulatedPrediction.tteAtMLSS}
                unit=" min"
                icon={Clock}
                observed={observedTTE}
                showDivergence
              />
              <MetricCompare 
                label="FatMax" 
                current={currentPrediction.fatMaxIntensity} 
                simulated={simulatedPrediction.fatMaxIntensity}
                unit="%"
                icon={Flame}
                observed={observedFatMax}
                showDivergence
              />
              <MetricCompare 
                label="MAP (VO2max)" 
                current={currentPrediction.pMax} 
                simulated={simulatedPrediction.pMax}
                unit="W"
                icon={TrendingUp}
              />
            </div>
          </TabsContent>
          
          {/* SUBSTRATE TAB */}
          <TabsContent value="substrate" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border">
                <div className="text-[10px] text-muted-foreground">FatMax Rate</div>
                <div className="font-mono font-bold text-lg text-amber-700 dark:text-amber-400">
                  {simulatedPrediction.fatMaxGrams} g/min
                </div>
                <div className="text-[10px]">@ {simulatedPrediction.fatMaxPower}W</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border">
                <div className="text-[10px] text-muted-foreground">Glucides @ FatMax</div>
                <div className="font-mono font-bold text-lg text-orange-700 dark:text-orange-400">
                  {simulatedPrediction.carbAtFatMax} g/h
                </div>
                <div className="text-[10px]">carbs simultanés</div>
              </div>
            </div>
            
            {/* Substrate Chart */}
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={substrateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="intensity" 
                    tick={{ fontSize: 9 }} 
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }} 
                    label={{ value: "g/h", angle: -90, position: "insideLeft", fontSize: 9 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${Math.round(value)} g/h`, 
                      name === "fatOx" ? "Lipides" : "Glucides"
                    ]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={25}
                    formatter={(value) => (
                      <span className="text-[10px]">{value === "fatOx" ? "Lipides" : "Glucides"}</span>
                    )}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="fatOx" 
                    fill="hsl(45, 93%, 80%)" 
                    stroke="hsl(45, 93%, 47%)"
                    stackId="1"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="carbOx" 
                    fill="hsl(24, 95%, 80%)" 
                    stroke="hsl(24, 95%, 53%)"
                    stackId="1"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Lactate Curve Comparison */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Courbe de Lactate (Cinétique Mader)
          </h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedLactateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="intensity" 
                  tick={{ fontSize: 9 }} 
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  domain={[0, 12]}
                  label={{ value: "mmol/L", angle: -90, position: "insideLeft", fontSize: 9 }}
                />
                <Tooltip content={<LactateTooltip />} />
                <ReferenceLine y={2} stroke="hsl(142, 71%, 45%)" strokeDasharray="5 5" label={{ value: "LT1", fontSize: 8 }} />
                <ReferenceLine y={4} stroke="hsl(24, 95%, 53%)" strokeDasharray="5 5" label={{ value: "LT2", fontSize: 8 }} />
                <Legend 
                  verticalAlign="top" 
                  height={25}
                  formatter={(value) => (
                    <span className="text-[10px]">{value === "current" ? "Actuel" : "Simulé"}</span>
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
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          Modèle basé sur Mader (2003), Heck & Schulz (2002). Cinétique du lactate et substrats couplés.
        </p>
      </CardContent>
    </Card>
  );
}
