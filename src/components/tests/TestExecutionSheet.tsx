/**
 * Test Execution Sheet
 * Full-screen sheet for executing a test protocol with guided input
 */

import { useState, useMemo } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  Zap,
  BadgeCheck,
  Save,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { 
  IntegratedTestProtocol, 
  getDifficultyLabel,
  getConfidenceLabel
} from "@/data/testProtocolsLibrary";
import { toast } from "sonner";

interface TestExecutionSheetProps {
  test: IntegratedTestProtocol;
  athlete: { id: string; name: string };
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

type Step = "overview" | "conditions" | "warmup" | "protocol" | "input" | "results";

export function TestExecutionSheet({ test, athlete, onClose, onSave }: TestExecutionSheetProps) {
  const [currentStep, setCurrentStep] = useState<Step>("overview");
  const [conditionsChecked, setConditionsChecked] = useState<Record<string, boolean>>({});
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const difficulty = getDifficultyLabel(test.difficulty);
  
  const steps: Step[] = ["overview", "conditions", "warmup", "protocol", "input", "results"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  const allConditionsMet = useMemo(() => {
    const criticalConditions = test.validityConditions.filter(c => c.critical);
    return criticalConditions.every(c => conditionsChecked[c.id]);
  }, [test.validityConditions, conditionsChecked]);
  
  const canProceedToInput = currentStep === "protocol" || currentStep === "warmup";
  
  const allRequiredFieldsFilled = useMemo(() => {
    return test.inputFields
      .filter(f => f.required)
      .every(f => inputValues[f.key] !== undefined && inputValues[f.key] !== null);
  }, [test.inputFields, inputValues]);
  
  const computedResult = useMemo(() => {
    if (!allRequiredFieldsFilled) return null;
    return test.compute(inputValues);
  }, [test, inputValues, allRequiredFieldsFilled]);
  
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };
  
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };
  
  const handleSave = async () => {
    if (!computedResult?.ok) {
      toast.error("Résultats invalides");
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        ...computedResult.rawData,
        confidence: computedResult.confidence,
        estimatedVlamax: computedResult.result?.normalizedValue
      });
      toast.success("Test enregistré avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case "overview":
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Objectif du test
              </h3>
              <p className="text-sm text-muted-foreground">{test.objective}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    ~{test.warmup.reduce((acc, s) => acc + s.durationMin, 0) + 30} min
                  </div>
                  <div className="text-xs text-muted-foreground">Durée totale</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${difficulty.color}`} />
                  <div className="text-sm font-medium">{difficulty.label}</div>
                  <div className="text-xs text-muted-foreground">Difficulté</div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Paramètres ciblés</h3>
              <div className="flex flex-wrap gap-2">
                {test.targetParameters.map((param, i) => (
                  <Badge key={i} variant="secondary">{param}</Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Matériel requis</h3>
              <ul className="space-y-1">
                {test.equipment.map((eq, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {eq.required ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Info className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={!eq.required ? "text-muted-foreground" : ""}>
                      {eq.name}
                      {!eq.required && " (optionnel)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
        
      case "conditions":
        return (
          <div className="space-y-4">
            <Alert className="bg-orange-500/10 border-orange-500/30">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                Vérifiez toutes les conditions de validité avant de commencer le test.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {test.validityConditions.map((condition) => (
                <button
                  key={condition.id}
                  onClick={() => setConditionsChecked(prev => ({
                    ...prev,
                    [condition.id]: !prev[condition.id]
                  }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    conditionsChecked[condition.id]
                      ? "bg-green-500/10 border-green-500/30"
                      : condition.critical
                      ? "bg-muted/50 border-orange-500/30"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    conditionsChecked[condition.id]
                      ? "border-green-500 bg-green-500"
                      : "border-muted-foreground"
                  }`}>
                    {conditionsChecked[condition.id] && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-left flex-1">{condition.label}</span>
                  {condition.critical && (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                      Critique
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            
            {!allConditionsMet && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Toutes les conditions critiques doivent être validées pour continuer.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
        
      case "warmup":
        return (
          <div className="space-y-4">
            <h3 className="font-medium">Échauffement standardisé</h3>
            <div className="space-y-2">
              {test.warmup.map((step, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{step.description}</div>
                          {step.intensity && (
                            <div className="text-xs text-muted-foreground">{step.intensity}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">{step.durationMin} min</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium mb-1">Durée totale échauffement</div>
              <div className="text-2xl font-bold text-primary">
                {test.warmup.reduce((acc, s) => acc + s.durationMin, 0)} min
              </div>
            </div>
          </div>
        );
        
      case "protocol":
        return (
          <div className="space-y-4">
            <h3 className="font-medium">Protocole de test</h3>
            
            <div className="space-y-3">
              {test.protocol.map((step, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground shrink-0">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{step.description}</div>
                        {step.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{step.notes}</div>
                        )}
                        {step.durationMin && (
                          <Badge variant="outline" className="mt-2">{step.durationMin} min</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Règles de pacing
              </h4>
              <ul className="space-y-1">
                {test.pacingRules.map((rule, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
        
      case "input":
        return (
          <div className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                Saisissez les valeurs mesurées pendant le test.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              {test.inputFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                    <span className="text-xs text-muted-foreground">({field.unit})</span>
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    placeholder={field.placeholder || `${field.min || 0} - ${field.max || 999}`}
                    value={inputValues[field.key] || ""}
                    onChange={(e) => setInputValues(prev => ({
                      ...prev,
                      [field.key]: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    className="text-lg"
                  />
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-sm mb-2">Critères de validation</h4>
              <ul className="space-y-1">
                {test.validationCriteria.map((criteria, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {criteria.label}
                    {criteria.threshold && (
                      <Badge variant="outline" className="text-xs">{criteria.threshold}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
        
      case "results":
        return (
          <div className="space-y-4">
            {computedResult?.ok ? (
              <>
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Résultats du test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-primary">
                        {computedResult.result?.primaryValue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {computedResult.result?.label} ({computedResult.result?.unit})
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <BadgeCheck className={`w-5 h-5 mx-auto mb-1 ${getConfidenceLabel(computedResult.confidence).color}`} />
                        <div className="text-sm font-medium">
                          {(computedResult.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Confiance</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Target className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                        <div className="text-sm font-medium">
                          {computedResult.result?.normalizedValue.toFixed(3)}
                        </div>
                        <div className="text-xs text-muted-foreground">VLamax normalisée</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Traçabilité des calculs */}
                {computedResult.calculationTrace && computedResult.calculationTrace.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-purple-500" />
                        Traçabilité du calcul
                        <Badge variant="outline" className="ml-2 text-xs">
                          {computedResult.calculationTrace.length} étapes
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {computedResult.calculationTrace.map((step, index) => (
                          <div 
                            key={index} 
                            className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">
                                  {step.step}
                                </span>
                                <span className="text-sm font-mono font-bold text-primary">
                                  {typeof step.value === 'number' 
                                    ? step.value.toFixed(3) 
                                    : step.value}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-2 rounded bg-blue-500/5 border border-blue-500/20">
                        <p className="text-xs text-muted-foreground">
                          <strong>TFCL™:</strong> Chaque étape du calcul est traçable pour garantir la transparence.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Impact TFCL
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {test.tfclImpact.map((impact, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span>{impact.parameter}</span>
                          <Badge variant="outline" className="text-green-500 border-green-500/30">
                            +{impact.confidenceBoost.toFixed(2)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {computedResult?.error || "Veuillez remplir tous les champs requis."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case "conditions":
        return allConditionsMet;
      case "input":
        return allRequiredFieldsFilled;
      case "results":
        return computedResult?.ok;
      default:
        return true;
    }
  };
  
  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[95vh] flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10 text-primary">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{test.shortName}</div>
                  <div className="text-xs text-muted-foreground font-normal">{athlete.name}</div>
                </div>
              </div>
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Progress value={progress} className="h-1 mt-2" />
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          {renderStepContent()}
        </ScrollArea>
        
        <div className="px-4 py-3 border-t shrink-0 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
          
          {currentStep === "results" ? (
            <Button
              onClick={handleSave}
              disabled={!computedResult?.ok || isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Enregistrement..." : "Enregistrer le test"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
