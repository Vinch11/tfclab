// =============================================
// WHAT-IF SCENARIO SIMULATOR - INSCYD-inspired
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Beaker, TrendingUp, Target, Clock, Zap, Activity, 
  Scale, RefreshCcw, ArrowRight, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MetabolicProfile,
  WhatIfScenario,
  predictPerformance,
  generateLactateCurve,
  generateWhatIfScenarios,
  compareScenarios,
  PerformancePrediction,
  LactatePoint
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
  Legend,
  BarChart,
  Bar
} from "recharts";

// =============================================
// PROPS
// =============================================

interface WhatIfSimulatorProps {
  initialProfile?: Partial<MetabolicProfile>;
  className?: string;
}

// =============================================
// CUSTOM TOOLTIP
// =============================================

function LactateTooltip({ active, payload, label }: any) {
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
  isInverse = false 
}: { 
  label: string; 
  current: number | string; 
  simulated: number | string; 
  unit?: string;
  icon: any;
  isInverse?: boolean;
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
        <span className="text-xs text-muted-foreground">{label}</span>
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
              isPositive && "bg-green-100 text-green-700 border-green-300",
              isNegative && "bg-red-100 text-red-700 border-red-300"
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
// MAIN COMPONENT
// =============================================

export function WhatIfSimulator({ initialProfile, className }: WhatIfSimulatorProps) {
  // Default profile
  const defaultProfile: MetabolicProfile = {
    vo2max: initialProfile?.vo2max || 55,
    vlamax: initialProfile?.vlamax || 0.45,
    weight: initialProfile?.weight || 70,
    ftp: initialProfile?.ftp || 250,
    fcMax: initialProfile?.fcMax || 180
  };
  
  // State for current and simulated values
  const [current] = useState(defaultProfile);
  const [simulated, setSimulated] = useState(defaultProfile);
  const [activeTab, setActiveTab] = useState<"sliders" | "presets">("sliders");
  
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
  
  // Handle slider changes
  const handleVO2Change = (value: number[]) => {
    setSimulated(prev => ({ ...prev, vo2max: value[0] }));
  };
  
  const handleVLamaxChange = (value: number[]) => {
    setSimulated(prev => ({ ...prev, vlamax: value[0] }));
  };
  
  const handleWeightChange = (value: number[]) => {
    setSimulated(prev => ({ ...prev, weight: value[0] }));
  };
  
  const handleReset = () => {
    setSimulated(current);
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
      color: point.color,
      wattsC: point.watts,
      wattsS: simulatedLactateCurve[i]?.watts || 0
    }));
  }, [currentLactateCurve, simulatedLactateCurve]);
  
  const hasChanges = 
    simulated.vo2max !== current.vo2max ||
    simulated.vlamax !== current.vlamax ||
    simulated.weight !== current.weight;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Simulateur What-If
            <Badge variant="outline" className="text-[10px]">INSCYD-style</Badge>
          </CardTitle>
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
              <RefreshCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Input Controls */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sliders" className="text-xs">Ajustements</TabsTrigger>
            <TabsTrigger value="presets" className="text-xs">Scénarios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sliders" className="space-y-4 mt-4">
            {/* VO2max Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  VO2max
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{current.vo2max}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-sm font-mono font-semibold">{simulated.vo2max.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">ml/kg/min</span>
                </div>
              </div>
              <Slider
                value={[simulated.vo2max]}
                onValueChange={handleVO2Change}
                min={35}
                max={85}
                step={0.5}
                className="w-full"
              />
            </div>
            
            {/* VLamax Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  VLamax
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{current.vlamax}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-sm font-mono font-semibold">{simulated.vlamax.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">mmol/L/s</span>
                </div>
              </div>
              <Slider
                value={[simulated.vlamax]}
                onValueChange={handleVLamaxChange}
                min={0.15}
                max={1.0}
                step={0.01}
                className="w-full"
              />
            </div>
            
            {/* Weight Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  Poids
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{current.weight}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-sm font-mono font-semibold">{simulated.weight.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
              </div>
              <Slider
                value={[simulated.weight]}
                onValueChange={handleWeightChange}
                min={45}
                max={120}
                step={0.5}
                className="w-full"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="presets" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presetScenarios.slice(1).map((scenario, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex-col items-start text-left"
                  onClick={() => applyPreset(scenario)}
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
          <div className="h-48 w-full">
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
        
        {/* Performance Impact */}
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
            />
            <MetricCompare 
              label="FatMax" 
              current={currentPrediction.fatMaxIntensity} 
              simulated={simulatedPrediction.fatMaxIntensity}
              unit="%"
              icon={Activity}
            />
          </div>
        </div>
        
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
