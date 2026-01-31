/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CARTE SIMULATION DE COURSE TFCL™
 * 
 * Affiche les 3 scénarios avec courbes de pacing, glycogène et fatigue.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  CheckCircle2,
  XCircle,
  Activity,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PacingComparisonChart, 
  GlycogenDepletionChart 
} from "@/components/charts/PacingComparisonChart";
import type { 
  SimulationResult, 
  SimulationScenario,
  SimulationScenarioType 
} from "@/lib/v2/raceSimulationTFCL";
import { getScenarioColor, getScenarioEmoji } from "@/lib/v2/raceSimulationTFCL";

interface RaceSimulationCardProps {
  simulation: SimulationResult;
  thresholdPace?: number | null;
  onSelectScenario?: (scenario: SimulationScenarioType) => void;
  className?: string;
}

export function RaceSimulationCard({
  simulation,
  thresholdPace,
  onSelectScenario,
  className,
}: RaceSimulationCardProps) {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenarioType>(
    simulation.recommended_scenario
  );
  
  const currentScenario = simulation.scenarios.find(s => s.type === selectedScenario)!;
  
  // Extraire les zones depuis l'envelope
  const greenZone = simulation.scenarios[0].pacing_curve.find(p => p.zone === "GREEN");
  const greenMax = greenZone ? Math.max(...simulation.scenarios[0].pacing_curve.filter(p => p.zone === "GREEN").map(p => p.intensity_pct)) : 92;
  const orangeMax = Math.max(...simulation.scenarios[1].pacing_curve.map(p => p.intensity_pct));
  const greenMin = Math.min(...simulation.scenarios[0].pacing_curve.map(p => p.intensity_pct));

  const handleSelectScenario = (type: SimulationScenarioType) => {
    setSelectedScenario(type);
    onSelectScenario?.(type);
  };

  return (
    <Card className={cn("border-2 border-primary/30", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Simulation de Course TFCL™
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {simulation.distance}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Race Readiness: <span className={cn(
            simulation.readiness_state === "GREEN" ? "text-emerald-600" :
            simulation.readiness_state === "ORANGE" ? "text-amber-600" : "text-red-600"
          )}>{simulation.readiness_state}</span>
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sélecteur de scénario */}
        <Tabs value={selectedScenario} onValueChange={(v) => handleSelectScenario(v as SimulationScenarioType)}>
          <TabsList className="grid grid-cols-3 w-full">
            {simulation.scenarios.map((scenario) => (
              <TabsTrigger 
                key={scenario.type} 
                value={scenario.type}
                className={cn(
                  "text-xs",
                  scenario.type === simulation.recommended_scenario && "ring-2 ring-primary/50"
                )}
              >
                <span className="mr-1">{getScenarioEmoji(scenario.type)}</span>
                {scenario.type === "ROBUST" ? "Robuste" : 
                 scenario.type === "AMBITIOUS" ? "Ambitieux" : "Agressif"}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {simulation.scenarios.map((scenario) => (
            <TabsContent key={scenario.type} value={scenario.type} className="space-y-4 mt-4">
              <ScenarioDetails scenario={scenario} isRecommended={scenario.type === simulation.recommended_scenario} />
            </TabsContent>
          ))}
        </Tabs>
        
        <Separator />
        
        {/* Graphique de pacing */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Courbe de Pacing
          </h4>
          <PacingComparisonChart
            plannedCurve={currentScenario.pacing_curve}
            greenZoneRange={[greenMin, greenMax]}
            orangeZoneRange={[greenMax, orangeMax]}
            redZoneStart={orangeMax}
            thresholdPace={thresholdPace}
            decisionRobustness={currentScenario.decision_robustness}
          />
        </div>
        
        <Separator />
        
        {/* Graphique glycogène */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Déplétion Glycogène
          </h4>
          <GlycogenDepletionChart
            glycogenCurve={currentScenario.glycogen_curve}
            depletionPointPct={currentScenario.glycogen_depletion_point_pct}
            compact
          />
        </div>
        
        {/* Contraintes de l'enveloppe */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs">
          <p className="font-medium mb-1 flex items-center gap-1">
            <Target className="h-3 w-3" />
            Contraintes Pacing Envelope™
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Max premier tiers: {simulation.envelope_constraints.max_first_third_pct}% du seuil</li>
            <li>• Zone rouge interdite avant 50% de la course</li>
            <li>• Discipline requise: {simulation.envelope_constraints.discipline_required ? "OUI" : "Non"}</li>
          </ul>
        </div>
        
        {/* Philosophie TFCL */}
        <p className="text-[10px] text-muted-foreground italic text-center">
          💡 {simulation.philosophy.split("\n")[0]}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT — DÉTAILS D'UN SCÉNARIO
// ═══════════════════════════════════════════════════════════════════════════════

function ScenarioDetails({ 
  scenario, 
  isRecommended 
}: { 
  scenario: SimulationScenario; 
  isRecommended: boolean;
}) {
  const robustnessColors = {
    ROBUST: "text-emerald-600 bg-emerald-500/10",
    FRAGILE: "text-amber-600 bg-amber-500/10",
    VERY_FRAGILE: "text-red-600 bg-red-500/10",
  };
  
  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            {getScenarioEmoji(scenario.type)} {scenario.label}
            {isRecommended && (
              <Badge variant="default" className="text-[10px] ml-2">Recommandé</Badge>
            )}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">{scenario.description}</p>
        </div>
      </div>
      
      {/* Métriques clés */}
      <div className="grid grid-cols-3 gap-2">
        <MetricBox
          label="Prob. échec"
          value={`${scenario.failure_probability_pct}%`}
          icon={scenario.failure_probability_pct > 40 ? <XCircle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          color={scenario.failure_probability_pct > 40 ? "text-red-600" : scenario.failure_probability_pct > 25 ? "text-amber-600" : "text-emerald-600"}
        />
        <MetricBox
          label="Coût métab."
          value={`${scenario.metabolic_cost_index}/100`}
          icon={<Zap className="h-3 w-3 text-amber-500" />}
          color={scenario.metabolic_cost_index > 70 ? "text-red-600" : scenario.metabolic_cost_index > 50 ? "text-amber-600" : "text-emerald-600"}
        />
        <MetricBox
          label="Robustesse"
          value={scenario.decision_robustness}
          icon={<Target className="h-3 w-3 text-primary" />}
          color={robustnessColors[scenario.decision_robustness].split(" ")[0]}
        />
      </div>
      
      {/* Déplétion glycogène */}
      {scenario.glycogen_depletion_point_pct !== null && (
        <div className="p-2 bg-red-500/10 rounded text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Déplétion glycogène critique estimée à {scenario.glycogen_depletion_point_pct}% de la course</span>
        </div>
      )}
      
      {/* Warning si présent */}
      {scenario.risk_warning && (
        <div className="p-2 bg-amber-500/10 rounded text-xs text-amber-700 dark:text-amber-400">
          {scenario.risk_warning}
        </div>
      )}
      
      {/* Recommandation */}
      <p className="text-xs text-muted-foreground">{scenario.recommendation}</p>
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="p-2 rounded bg-muted/50 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-sm font-bold", color)}>{value}</p>
    </div>
  );
}
