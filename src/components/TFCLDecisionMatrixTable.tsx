/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TABLE MATRICE DÉCISIONNELLE TFCL™
 * Two For Coaching Lab Method™
 * 
 * Table interactive: Profil → Symptômes → Interprétation → Levier
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Brain,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  type TFCLSymptomId,
  type SymptomAnalysisResult,
  TFCL_SYMPTOMS,
  ALL_SYMPTOMS,
  analyzeSymptoms,
  suggestSymptomsFromMetrics,
  categorizeMetric,
  SYMPTOM_CATEGORY_LABELS,
} from "@/lib/v2/tfclSymptoms";
import { TFCLSymptomSignatureChart } from "./TFCLSymptomSignatureChart";
import type { TrainingLever } from "@/lib/v2/tfclDecisionMatrix";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricsContext {
  vo2max: number | null;
  vo2maxTarget: number;
  vlamax: number | null;
  vlamaxTarget: number;
  tte: number | null;
  tteTarget: number;
  fatmax: number | null;
  fatmaxTarget: number;
  freshness: number | null;
}

interface TFCLDecisionMatrixTableProps {
  metrics: MetricsContext;
  onAnalysisComplete?: (result: SymptomAnalysisResult) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIDENCE_BADGES = {
  "élevé": { color: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300", icon: CheckCircle2 },
  "modéré": { color: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300", icon: AlertCircle },
  "faible": { color: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300", icon: XCircle },
};

const LEVER_LABELS: Record<TrainingLever, string> = {
  decrease_vlamax: "↓ VLamax",
  increase_vo2max: "↑ VO2max",
  increase_tte: "↑ TTE",
  increase_fat_oxidation: "↑ FatMax / Nutrition",
  recovery: "Récupération / Taper",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function TFCLDecisionMatrixTable({
  metrics,
  onAnalysisComplete,
  className,
}: TFCLDecisionMatrixTableProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<TFCLSymptomId[]>([]);
  const [showChart, setShowChart] = useState(false);
  
  // Calculer le contexte physiologique
  const physioContext = useMemo(() => ({
    vo2max: categorizeMetric(metrics.vo2max, metrics.vo2maxTarget, 0.1, false),
    vlamax: categorizeMetric(metrics.vlamax, metrics.vlamaxTarget, 0.15, true),
    tte: categorizeMetric(metrics.tte, metrics.tteTarget, 0.15, false),
    fatmax: categorizeMetric(metrics.fatmax, metrics.fatmaxTarget, 0.1, false),
    freshness: categorizeMetric(metrics.freshness, 70, 0.2, false),
  }), [metrics]);
  
  // Calculer la complétude des données
  const dataCompleteness = useMemo(() => {
    const fields = [metrics.vo2max, metrics.vlamax, metrics.tte, metrics.fatmax, metrics.freshness];
    const filled = fields.filter(f => f !== null).length;
    return Math.round((filled / fields.length) * 100);
  }, [metrics]);
  
  // Analyser les symptômes sélectionnés
  const analysisResult = useMemo(() => {
    if (selectedSymptoms.length === 0) return null;
    const result = analyzeSymptoms(selectedSymptoms, physioContext, dataCompleteness);
    onAnalysisComplete?.(result);
    return result;
  }, [selectedSymptoms, physioContext, dataCompleteness, onAnalysisComplete]);
  
  // Suggestions automatiques basées sur les métriques
  const suggestedSymptoms = useMemo(() => 
    suggestSymptomsFromMetrics(physioContext),
  [physioContext]);
  
  // Toggle symptôme
  const toggleSymptom = (symptomId: TFCLSymptomId) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };
  
  // Appliquer les suggestions
  const applySuggestions = () => {
    setSelectedSymptoms(suggestedSymptoms);
  };
  
  // Reset
  const reset = () => {
    setSelectedSymptoms([]);
  };
  
  // Grouper les symptômes par catégorie
  const symptomsByCategory = useMemo(() => {
    const groups: Record<string, typeof ALL_SYMPTOMS> = {};
    for (const symptom of ALL_SYMPTOMS) {
      if (!groups[symptom.category]) groups[symptom.category] = [];
      groups[symptom.category].push(symptom);
    }
    return groups;
  }, []);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Matrice Décisionnelle TFCL™
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {selectedSymptoms.length} symptôme{selectedSymptoms.length > 1 ? "s" : ""} sélectionné{selectedSymptoms.length > 1 ? "s" : ""}
            </Badge>
            {suggestedSymptoms.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={applySuggestions}
                className="h-7 text-xs gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Suggestions auto
              </Button>
            )}
            {selectedSymptoms.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={reset}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Symptômes terrain → Leviers physiologiques
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sélection des symptômes par catégorie */}
        <div className="space-y-3">
          {Object.entries(symptomsByCategory).map(([category, symptoms]) => {
            const catInfo = SYMPTOM_CATEGORY_LABELS[category as keyof typeof SYMPTOM_CATEGORY_LABELS];
            const selectedInCategory = symptoms.filter(s => selectedSymptoms.includes(s.id)).length;
            
            return (
              <Collapsible key={category} defaultOpen={selectedInCategory > 0}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between h-auto py-2 px-3 bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px]", `border-${catInfo.color}-300`)}
                      >
                        {catInfo.label}
                      </Badge>
                      {selectedInCategory > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ({selectedInCategory} sélectionné{selectedInCategory > 1 ? "s" : ""})
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                    {symptoms.map((symptom) => {
                      const isSelected = selectedSymptoms.includes(symptom.id);
                      const isSuggested = suggestedSymptoms.includes(symptom.id);
                      
                      return (
                        <TooltipProvider key={symptom.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                                  isSelected 
                                    ? "bg-primary/10 border-primary" 
                                    : isSuggested
                                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700"
                                      : "bg-background border-border hover:border-primary/50"
                                )}
                                onClick={() => toggleSymptom(symptom.id)}
                              >
                                <Checkbox 
                                  checked={isSelected}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span>{symptom.emoji}</span>
                                    <span className="text-xs font-medium truncate">
                                      {symptom.label}
                                    </span>
                                    {isSuggested && !isSelected && (
                                      <Sparkles className="h-3 w-3 text-amber-500" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-xs">{symptom.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
        
        {/* Résultat de l'analyse */}
        {analysisResult && (
          <div className="space-y-4">
            {/* Tableau de résultats */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Profil TFCL</TableHead>
                    <TableHead className="w-[30%]">Interprétation</TableHead>
                    <TableHead className="w-[20%]">Levier prioritaire</TableHead>
                    <TableHead className="w-[15%]">Confiance</TableHead>
                    <TableHead className="w-[10%]">Cohérence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        Cas {analysisResult.matchedCase}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {analysisResult.interpretation.slice(0, 80)}...
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {LEVER_LABELS[analysisResult.matchedLever]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const conf = CONFIDENCE_BADGES[analysisResult.confidence];
                        const Icon = conf.icon;
                        return (
                          <Badge variant="outline" className={cn("text-xs gap-1", conf.color)}>
                            <Icon className="h-3 w-3" />
                            {analysisResult.confidence}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs font-medium",
                        analysisResult.coherenceWithMetrics === "forte" && "text-green-600",
                        analysisResult.coherenceWithMetrics === "modérée" && "text-amber-600",
                        analysisResult.coherenceWithMetrics === "faible" && "text-red-600"
                      )}>
                        {analysisResult.coherenceWithMetrics}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Séances recommandées */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Séances à favoriser
                  </span>
                </div>
                <ul className="space-y-1">
                  {analysisResult.sessionsToFavor.slice(0, 4).map((item, i) => (
                    <li key={i} className="text-xs text-green-800 dark:text-green-200 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    Séances à limiter
                  </span>
                </div>
                <ul className="space-y-1">
                  {analysisResult.sessionsToLimit.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-red-800 dark:text-red-200 flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Toggle graphique */}
            <Collapsible open={showChart} onOpenChange={setShowChart}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Brain className="h-4 w-4" />
                  {showChart ? "Masquer" : "Afficher"} le graphique signature
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showChart && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <TFCLSymptomSignatureChart
                  selectedSymptoms={selectedSymptoms}
                  primaryLever={analysisResult.matchedLever}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        
        {/* Message si aucun symptôme */}
        {selectedSymptoms.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Sélectionne les symptômes observés pour générer l'analyse
            </p>
            {suggestedSymptoms.length > 0 && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={applySuggestions}
                className="mt-2"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Utiliser les suggestions automatiques ({suggestedSymptoms.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
