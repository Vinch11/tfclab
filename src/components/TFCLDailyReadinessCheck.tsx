/**
 * TFCL Daily Readiness Check — Questionnaire structuré
 * 
 * Questionnaire quotidien standardisé pour évaluer la disponibilité de l'athlète.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { 
  Moon, 
  Zap, 
  Heart, 
  Brain, 
  Flame,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  CheckCircle2,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TFCL_READINESS_QUESTIONS,
  TFCL_ALERT_QUESTIONS,
  type TFCLReadinessInput,
  computeDisponibiliteTFCL,
  getDisponibiliteBadgeClass,
  getConfidenceBadgeClass,
  type DisponibiliteTFCL
} from "@/lib/v2/disponibiliteTFCL";

interface TFCLDailyReadinessCheckProps {
  athleteId: string;
  athleteName: string;
  objectiveData?: TFCLReadinessInput['objective'];
  declaredLoad?: 'light' | 'moderate' | 'heavy' | null;
  onSubmit?: (input: TFCLReadinessInput, result: DisponibiliteTFCL) => void;
  compact?: boolean;
  showStaffAlerts?: boolean;
}

const QUESTION_ICONS: Record<string, React.ReactNode> = {
  sleep: <Moon className="h-5 w-5" />,
  fatigue: <Zap className="h-5 w-5" />,
  soreness: <Heart className="h-5 w-5" />,
  stress: <Brain className="h-5 w-5" />,
  motivation: <Flame className="h-5 w-5" />,
};

export function TFCLDailyReadinessCheck({
  athleteId,
  athleteName,
  objectiveData,
  declaredLoad,
  onSubmit,
  compact = false,
  showStaffAlerts = false,
}: TFCLDailyReadinessCheckProps) {
  // State pour les réponses
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});
  const [showAlertSection, setShowAlertSection] = useState(showStaffAlerts);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Calcul du résultat
  const result = useMemo(() => {
    const input: TFCLReadinessInput = {
      sleep: answers.sleep ?? null,
      fatigue: answers.fatigue ?? null,
      soreness: answers.soreness ?? null,
      stress: answers.stress ?? null,
      motivation: answers.motivation ?? null,
      alerts: showAlertSection ? {
        joint_pain: alerts.joint_pain ?? false,
        illness: alerts.illness ?? false,
        asymmetric_pain: alerts.asymmetric_pain ?? false,
      } : undefined,
      objective: objectiveData,
      declaredLoad,
    };
    
    // Calculer seulement si au moins une réponse
    const hasAnswers = Object.values(answers).some(v => v !== undefined);
    if (!hasAnswers) return null;
    
    return computeDisponibiliteTFCL(input);
  }, [answers, alerts, showAlertSection, objectiveData, declaredLoad]);
  
  const handleSliderChange = (questionId: string, value: number[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value[0] }));
    setIsSubmitted(false);
  };
  
  const handleAlertToggle = (alertId: string, checked: boolean) => {
    setAlerts(prev => ({ ...prev, [alertId]: checked }));
    setIsSubmitted(false);
  };
  
  const handleSubmit = () => {
    if (!result) return;
    
    const input: TFCLReadinessInput = {
      sleep: answers.sleep ?? null,
      fatigue: answers.fatigue ?? null,
      soreness: answers.soreness ?? null,
      stress: answers.stress ?? null,
      motivation: answers.motivation ?? null,
      alerts: showAlertSection ? {
        joint_pain: alerts.joint_pain ?? false,
        illness: alerts.illness ?? false,
        asymmetric_pain: alerts.asymmetric_pain ?? false,
      } : undefined,
      objective: objectiveData,
      declaredLoad,
    };
    
    onSubmit?.(input, result);
    setIsSubmitted(true);
  };
  
  const isComplete = TFCL_READINESS_QUESTIONS.every(q => answers[q.id] !== undefined);
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              TFCL Daily Readiness Check
            </CardTitle>
            <CardDescription>
              Évalue ta disponibilité pour une séance de qualité
            </CardDescription>
          </div>
          {result && (
            <Badge 
              variant="outline" 
              className={cn("text-base px-3 py-1", getDisponibiliteBadgeClass(result.level))}
            >
              {result.levelEmoji} {result.score}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Questions principales */}
        <div className="space-y-5">
          {TFCL_READINESS_QUESTIONS.map((question) => (
            <div key={question.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {QUESTION_ICONS[question.id]}
                  </span>
                  <Label className="text-sm font-medium">{question.label}</Label>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {answers[question.id] ?? '—'}/10
                </span>
              </div>
              
              <div className="px-1">
                <Slider
                  value={[answers[question.id] ?? 5]}
                  onValueChange={(v) => handleSliderChange(question.id, v)}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{question.anchor0}</span>
                <span>{question.anchor10}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Section alertes (staff) */}
        <Collapsible open={showAlertSection} onOpenChange={setShowAlertSection}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Signaux d'alerte (mode staff)
              </span>
              {showAlertSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <p className="text-xs text-muted-foreground mb-3">
                Si un signal d'alerte est coché, une "Alerte disponibilité" sera affichée 
                indépendamment du score numérique.
              </p>
              
              {TFCL_ALERT_QUESTIONS.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between py-2">
                  <Label htmlFor={alert.id} className="text-sm cursor-pointer">
                    {alert.label}
                  </Label>
                  <Switch
                    id={alert.id}
                    checked={alerts[alert.id] ?? false}
                    onCheckedChange={(checked) => handleAlertToggle(alert.id, checked)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Separator />
        
        {/* Résultat en temps réel */}
        {result && (
          <div className={cn(
            "p-4 rounded-lg border",
            getDisponibiliteBadgeClass(result.level).replace('text-', 'border-').split(' ')[2],
            result.level === 'high' ? 'bg-green-500/5' :
            result.level === 'moderate' ? 'bg-yellow-500/5' :
            result.level === 'low' ? 'bg-orange-500/5' : 'bg-red-500/5'
          )}>
            {/* Header résultat */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{result.levelEmoji}</span>
                <div>
                  <p className="font-semibold">Disponibilité {result.levelLabel}</p>
                  <p className="text-xs text-muted-foreground">{result.levelDescription}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{result.score}</p>
                <Badge variant="outline" className={cn("text-xs", getConfidenceBadgeClass(result.confidence))}>
                  Confiance {result.confidenceLabel}
                </Badge>
              </div>
            </div>
            
            {/* Alertes */}
            {result.hasAlerts && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 mb-3">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alerte Disponibilité
                </p>
                <ul className="mt-1 text-xs text-red-600 dark:text-red-400 space-y-1">
                  {result.alertMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Incohérences */}
            {result.inconsistencies.length > 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 mb-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {result.inconsistencies[0]}
                </p>
              </div>
            )}
            
            {/* Recommandation */}
            <div className="mb-3">
              <p className="text-sm">
                <span className="font-medium">Recommandation : </span>
                <span className="font-semibold">{result.interpretation.recommendationLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {result.interpretation.recommendationExplanation}
              </p>
            </div>
            
            {/* Raisons principales */}
            {result.interpretation.mainReasons.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-1">Raisons principales :</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {result.interpretation.mainReasons.slice(0, 3).map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Sources utilisées */}
            <div className="flex flex-wrap gap-1">
              {result.sourcesUsed.map((source, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
            
            {/* Message athlète (compact) */}
            {!compact && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <p className="text-sm italic text-muted-foreground">
                  {result.athleteMessage}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Bouton soumettre */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isComplete ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Questionnaire complet
              </span>
            ) : (
              <span>
                {Object.keys(answers).length}/5 questions répondues
              </span>
            )}
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!result || isSubmitted}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitted ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center">
          La Disponibilité TFCL™ éclaire une décision, elle ne donne jamais un ordre.
        </p>
      </CardContent>
    </Card>
  );
}

export default TFCLDailyReadinessCheck;
