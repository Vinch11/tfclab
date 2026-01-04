import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Zap,
  Timer,
  Target,
  Info,
  ChevronRight,
  Clock,
  Activity,
  Heart,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { 
  STRATEGY_ENGINE_DEFINITION, 
  SEASON_PHASES, 
  AGE_ADAPTATIONS,
  SeasonPhase,
  AgeAdaptation,
} from "@/lib/strategyEngineDefinitions";

interface StrategyEngineDefinitionProps {
  currentAge?: number | null;
  currentPhase?: SeasonPhase | null;
  onClose?: () => void;
}

export function StrategyEngineDefinition({ 
  currentAge, 
  currentPhase,
  onClose 
}: StrategyEngineDefinitionProps) {
  const [openSections, setOpenSections] = useState<string[]>(["definition"]);
  
  // Déterminer l'adaptation d'âge applicable
  const currentAgeAdaptation = currentAge !== null && currentAge !== undefined
    ? AGE_ADAPTATIONS.find(a => {
        if (currentAge < 30) return a.category === "young";
        if (currentAge < 40) return a.category === "prime";
        if (currentAge < 50) return a.category === "master1";
        return a.category === "master2";
      })
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {STRATEGY_ENGINE_DEFINITION.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {STRATEGY_ENGINE_DEFINITION.subtitle}
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Accordion 
        type="multiple" 
        value={openSections} 
        onValueChange={setOpenSections}
        className="space-y-4"
      >
        {/* Définition du moteur */}
        <AccordionItem value="definition" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-primary" />
              <span className="font-semibold">Le Strategy Engine</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {STRATEGY_ENGINE_DEFINITION.definition}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Les 3 leviers */}
        <AccordionItem value="levers" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">Les 3 leviers du moteur</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              {STRATEGY_ENGINE_DEFINITION.levers.map((lever) => (
                <div 
                  key={lever.id} 
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{lever.emoji}</span>
                    <span className="font-semibold">{lever.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{lever.description}</p>
                  <p className="text-sm mt-2 text-primary">{lever.impact}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Intégration de l'âge */}
        <AccordionItem value="age" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Intégration de l'âge</span>
              {currentAge && (
                <Badge variant="outline" className="ml-2">
                  {currentAge} ans
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <Alert className="border-primary/30 bg-primary/5">
                <AlertDescription className="font-medium">
                  {STRATEGY_ENGINE_DEFINITION.ageIntegration.principle}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground italic">
                {STRATEGY_ENGINE_DEFINITION.ageIntegration.note}
              </p>
              
              {/* Adaptations par âge */}
              <div className="grid gap-3 mt-4">
                {AGE_ADAPTATIONS.map((adaptation) => (
                  <div 
                    key={adaptation.category}
                    className={`p-4 rounded-lg border ${
                      currentAgeAdaptation?.category === adaptation.category
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{adaptation.range}</Badge>
                        {currentAgeAdaptation?.category === adaptation.category && (
                          <Badge className="bg-primary text-primary-foreground">
                            Votre tranche
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium">{adaptation.toleranceShock}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {adaptation.vlamaxInterpretation}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {adaptation.priorities.map((priority, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {priority}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Phases de la saison */}
        <AccordionItem value="phases" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Phases physiologiques de la saison</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Alert className="mb-4 bg-muted/50">
              <AlertDescription className="text-sm">
                Vue stratégique sans planification automatique
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              {SEASON_PHASES.map((phase) => (
                <div 
                  key={phase.id}
                  className={`p-4 rounded-lg border-2 ${phase.bgColor} ${
                    currentPhase?.id === phase.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{phase.iconEmoji}</span>
                    <span className={`font-bold ${phase.color}`}>
                      Phase {phase.id}
                    </span>
                    <span className="font-semibold">— {phase.name}</span>
                    {currentPhase?.id === phase.id && (
                      <Badge className="ml-auto">Phase actuelle</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Priorité :</span>
                      <span className="ml-2 font-medium">{phase.priorityFocus}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VLamax :</span>
                      <span className="ml-2">{phase.vlamaxNote}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">TTE :</span>
                      <span className="ml-2">{phase.tteNote}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nutrition :</span>
                      <span className="ml-2">{phase.nutritionNote}</span>
                    </div>
                  </div>
                  
                  {phase.risks.length > 0 && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-amber-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{phase.risks.join(" • ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Race Readiness */}
        <AccordionItem value="readiness" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="font-semibold">Race Readiness</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {STRATEGY_ENGINE_DEFINITION.raceReadinessFormula.title} est calculée à partir de :
              </p>
              <ul className="space-y-2">
                {STRATEGY_ENGINE_DEFINITION.raceReadinessFormula.components.map((comp, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    {comp}
                  </li>
                ))}
              </ul>
              <Alert className="border-primary/30 bg-primary/5">
                <AlertDescription className="text-sm italic">
                  "{STRATEGY_ENGINE_DEFINITION.raceReadinessFormula.message}"
                </AlertDescription>
              </Alert>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* TTE vs VO2max */}
        <AccordionItem value="tte" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">{STRATEGY_ENGINE_DEFINITION.tteVsVo2max.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {STRATEGY_ENGINE_DEFINITION.tteVsVo2max.explanation}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Positionnement scientifique */}
        <AccordionItem value="scientific" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">{STRATEGY_ENGINE_DEFINITION.scientificPositioning.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {STRATEGY_ENGINE_DEFINITION.scientificPositioning.content}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
