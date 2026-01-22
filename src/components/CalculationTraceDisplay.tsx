/**
 * CalculationTraceDisplay
 * 
 * Affiche la traçabilité des calculs VLamax/TTE avec chaque étape
 * détaillée pour transparence totale (philosophie TFCL).
 */

import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  Info,
  FlaskConical
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export interface CalculationStep {
  step: string;
  value: number | string;
  formula?: string;
  unit?: string;
}

interface CalculationTraceDisplayProps {
  trace: CalculationStep[];
  title?: string;
  resultLabel?: string;
  resultValue?: number;
  resultUnit?: string;
  confidence?: number;
  className?: string;
}

export function CalculationTraceDisplay({
  trace,
  title = "Traçabilité du calcul",
  resultLabel,
  resultValue,
  resultUnit,
  confidence,
  className
}: CalculationTraceDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!trace || trace.length === 0) {
    return null;
  }
  
  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-500" />
                {title}
                <Badge variant="outline" className="ml-2 text-xs">
                  {trace.length} étapes
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Résultat final en haut si fourni */}
            {resultValue !== undefined && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{resultLabel || "Résultat"}</div>
                    <div className="text-lg font-bold text-primary">
                      {typeof resultValue === 'number' ? resultValue.toFixed(3) : resultValue}
                      {resultUnit && <span className="text-sm font-normal ml-1">{resultUnit}</span>}
                    </div>
                  </div>
                  {confidence !== undefined && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Confiance</div>
                      <Badge 
                        variant="outline" 
                        className={
                          confidence >= 0.8 ? "text-green-500 border-green-500/30" :
                          confidence >= 0.6 ? "text-yellow-500 border-yellow-500/30" :
                          "text-red-500 border-red-500/30"
                        }
                      >
                        {(confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  )}
                </div>
                <Separator className="mb-3" />
              </>
            )}
            
            {/* Étapes de calcul */}
            <div className="space-y-2">
              {trace.map((step, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {step.step}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono font-bold text-primary">
                          {typeof step.value === 'number' 
                            ? step.value.toFixed(3) 
                            : step.value}
                        </span>
                        {step.unit && (
                          <span className="text-xs text-muted-foreground">{step.unit}</span>
                        )}
                      </div>
                    </div>
                    {step.formula && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calculator className="w-3 h-3 text-muted-foreground" />
                        <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-1 py-0.5 rounded">
                          {step.formula}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Note méthodologique */}
            <div className="mt-3 p-2 rounded bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong>Philosophie TFCL™:</strong> Chaque étape du calcul est traçable pour garantir 
                  la transparence. Les formules utilisées sont documentées et validées par la recherche.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
