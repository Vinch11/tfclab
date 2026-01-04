import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  Apple,
  Shield,
  Info,
} from "lucide-react";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { 
  determinePhase, 
  getAgeAdaptation, 
  getAgeRaceReadinessModifier,
  SeasonPhase,
} from "@/lib/strategyEngineDefinitions";
import { calculateAge } from "@/lib/ageAdjustment";
import { cn } from "@/lib/utils";

interface StrategyPhaseDashboardProps {
  athleteName: string;
  objectif: string;
  birthDate?: string | null;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
}

export function StrategyPhaseDashboard({
  athleteName,
  objectif,
  birthDate,
  vlamaxEffectif,
  tteEffectif,
  readiness,
}: StrategyPhaseDashboardProps) {
  const age = calculateAge(birthDate);
  const ageAdaptation = getAgeAdaptation(age);
  const ageModifier = getAgeRaceReadinessModifier(age);
  
  const phaseAnalysis = useMemo(() => {
    return determinePhase(
      vlamaxEffectif.value,
      tteEffectif.tte_min,
      tteEffectif.target ?? 45,
      readiness.score,
      objectif as any
    );
  }, [vlamaxEffectif, tteEffectif, readiness, objectif]);

  const currentPhase = phaseAnalysis.phase;
  
  // Indicateurs de progression
  const tteProgress = tteEffectif.tte_min && tteEffectif.target 
    ? Math.min(100, (tteEffectif.tte_min / tteEffectif.target) * 100) 
    : 0;
  
  const vlamaxInRange = vlamaxEffectif.value !== null && 
    vlamaxEffectif.value >= 0.25 && 
    vlamaxEffectif.value <= 0.45;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête avec phase actuelle */}
      <Card className={`border-2 ${currentPhase.bgColor}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentPhase.iconEmoji}</span>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Phase {currentPhase.id} — {currentPhase.name}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "ml-2",
                      phaseAnalysis.confidence === "élevé" && "text-green-600 border-green-600",
                      phaseAnalysis.confidence === "modéré" && "text-amber-600 border-amber-600",
                      phaseAnalysis.confidence === "faible" && "text-red-600 border-red-600"
                    )}
                  >
                    Confiance: {phaseAnalysis.confidence}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {athleteName} • {objectif}
                </p>
              </div>
            </div>
            
            {/* Badge âge */}
            {age !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">
                  {age} ans — {ageAdaptation.label}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Priorité */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                Priorité
              </div>
              <p className="font-semibold text-primary">{currentPhase.priorityFocus}</p>
            </div>
            
            {/* VLamax */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                VLamax
              </div>
              <p className="font-medium">{currentPhase.vlamaxNote}</p>
            </div>
            
            {/* TTE */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                TTE
              </div>
              <p className="font-medium">{currentPhase.tteNote}</p>
            </div>
            
            {/* Nutrition */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Apple className="h-4 w-4" />
                Nutrition
              </div>
              <p className="font-medium">{currentPhase.nutritionNote}</p>
            </div>
          </div>
          
          {/* Raisons de la phase */}
          {phaseAnalysis.reasons.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Pourquoi cette phase ?
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {phaseAnalysis.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progression des indicateurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progression vers l'objectif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TTE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">TTE</span>
              <span className="text-sm text-muted-foreground">
                {tteEffectif.tte_min ?? "—"} / {tteEffectif.target ?? "—"} min
              </span>
            </div>
            <Progress value={tteProgress} className="h-2" />
          </div>
          
          {/* VLamax */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">VLamax</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {vlamaxEffectif.value?.toFixed(2) ?? "—"} mmol/L/s
                </span>
                {vlamaxInRange ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  vlamaxInRange ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ 
                  width: `${vlamaxEffectif.value 
                    ? Math.min(100, Math.max(0, (1 - (vlamaxEffectif.value - 0.25) / 0.5) * 100)) 
                    : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.25 (Optimal endurance)</span>
              <span>0.75 (Glycolytique)</span>
            </div>
          </div>
          
          {/* Race Readiness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Race Readiness</span>
              <span className={cn(
                "text-sm font-bold",
                readiness.score >= 80 ? "text-green-500" :
                readiness.score >= 60 ? "text-amber-500" : "text-red-500"
              )}>
                {readiness.score}%
              </span>
            </div>
            <Progress 
              value={readiness.score} 
              className={cn(
                "h-2",
                readiness.score >= 80 ? "[&>div]:bg-green-500" :
                readiness.score >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adaptation âge */}
      {age !== null && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Adaptation âge — {ageAdaptation.range}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Tolérance aux chocs</p>
                  <p className="font-medium">{ageAdaptation.toleranceShock}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Interprétation VLamax</p>
                  <p className="font-medium">{ageAdaptation.vlamaxInterpretation}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Bloc intensif</p>
                  <Badge variant={
                    ageAdaptation.blocIntense === "Acceptable" ? "default" :
                    ageAdaptation.blocIntense === "Modéré" ? "secondary" : "destructive"
                  }>
                    {ageAdaptation.blocIntense}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Priorités</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ageAdaptation.priorities.slice(0, 2).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Message staff */}
            <Alert className="mt-4 bg-blue-500/5 border-blue-500/30">
              <Shield className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm italic">
                {ageModifier.staffMessage}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Risques de la phase */}
      {currentPhase.risks.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-600">Risques de la phase</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              {currentPhase.risks.map((risk, i) => (
                <li key={i}>• {risk}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
