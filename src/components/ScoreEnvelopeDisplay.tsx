/**
 * Composant universel d'affichage des ScoreEnvelope
 * Modes: ATHLETE (simple) et STAFF (détaillé)
 */

import { 
  ScoreEnvelope, 
  formatEnvelopeForAthlete, 
  getSourceIcon, 
  getSourceLabel,
  getConfidenceBadgeClass,
} from "@/lib/scoreEnvelope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { ChevronDown, Info, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreEnvelopeDisplayProps {
  envelope: ScoreEnvelope;
  mode?: "athlete" | "staff";
  compact?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

/**
 * Affichage d'un ScoreEnvelope avec mode Athlète ou Staff
 */
export function ScoreEnvelopeDisplay({
  envelope,
  mode = "athlete",
  compact = false,
  showRecommendations = true,
  className,
}: ScoreEnvelopeDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  
  const athleteView = formatEnvelopeForAthlete(envelope);
  const sourceIcon = getSourceIcon(envelope.source);
  const sourceLabel = getSourceLabel(envelope.source);
  const confBadgeClass = getConfidenceBadgeClass(envelope.confidence);
  
  // Couleur de la valeur selon le contexte
  const getValueColor = () => {
    if (envelope.value === null) return "text-muted-foreground";
    if (envelope.confidence < 0.45) return "text-yellow-600";
    return "";
  };

  // Format de la valeur
  const formatValue = () => {
    if (envelope.value === null) return "—";
    if (envelope.metricId === "vlamax" || envelope.metricId === "ftpKg") {
      return envelope.value.toFixed(2);
    }
    return Math.round(envelope.value).toString();
  };

  // Format de la plage
  const formatRange = () => {
    if (!envelope.range) return "";
    if (envelope.metricId === "vlamax" || envelope.metricId === "ftpKg") {
      return `${envelope.range.low.toFixed(2)}–${envelope.range.high.toFixed(2)}`;
    }
    return `${Math.round(envelope.range.low)}–${Math.round(envelope.range.high)}`;
  };

  // Mode compact (inline)
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center gap-2", className)}>
              <span className={cn("font-semibold", getValueColor())}>
                {formatValue()}
              </span>
              {envelope.range && (
                <span className="text-xs text-muted-foreground">
                  ({formatRange()})
                </span>
              )}
              <span className="text-xs">{sourceIcon}</span>
              <Badge variant="outline" className={cn("text-xs", confBadgeClass)}>
                {envelope.confidenceLabel}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">{envelope.label}</p>
            <p className="text-xs text-muted-foreground">{envelope.uncertaintyNote}</p>
            {envelope.contextNote && (
              <p className="text-xs mt-1">{envelope.contextNote}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Mode Athlète (simple)
  if (mode === "athlete") {
    return (
      <Card className={cn("", className)}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{envelope.label}</span>
            <Badge variant="outline" className={cn("text-xs", confBadgeClass)}>
              {athleteView.confidenceText}
            </Badge>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", getValueColor())}>
              {formatValue()}
            </span>
            {envelope.unit && (
              <span className="text-sm text-muted-foreground">{envelope.unit}</span>
            )}
            {envelope.range && (
              <span className="text-sm text-muted-foreground">
                (≈{formatRange()})
              </span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            {athleteView.simpleMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mode Staff (détaillé)
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {envelope.label}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{envelope.contextNote}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sourceIcon} {sourceLabel}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", confBadgeClass)}>
              {Math.round(envelope.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Valeur et plage */}
        <div className="flex items-baseline gap-3">
          <span className={cn("text-3xl font-bold", getValueColor())}>
            {formatValue()}
          </span>
          {envelope.unit && (
            <span className="text-base text-muted-foreground">{envelope.unit}</span>
          )}
          {envelope.range && (
            <span className="text-base text-muted-foreground font-medium">
              (≈ {formatRange()})
            </span>
          )}
        </div>

        {/* Barre de confiance */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confiance: {envelope.confidenceLabel}</span>
            <span>{Math.round(envelope.confidence * 100)}%</span>
          </div>
          <Progress 
            value={envelope.confidence * 100} 
            className="h-2"
          />
        </div>

        {/* Note d'incertitude */}
        <div className={cn(
          "text-xs p-2 rounded-md flex items-start gap-2",
          envelope.confidence < 0.45 ? "bg-red-50 text-red-700" :
          envelope.confidence < 0.75 ? "bg-yellow-50 text-yellow-700" :
          "bg-green-50 text-green-700"
        )}>
          {envelope.confidence < 0.45 ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          ) : envelope.confidence < 0.75 ? (
            <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{envelope.uncertaintyNote}</span>
        </div>

        {/* Section détaillée (collapsible) */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180"
            )} />
            {expanded ? "Masquer détails" : "Voir détails staff"}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3 space-y-3">
            {/* Pourquoi */}
            {envelope.why.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">📍 Pourquoi cette valeur</p>
                <ul className="text-xs space-y-1 pl-4">
                  {envelope.why.map((w, i) => (
                    <li key={i} className="list-disc">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommandations */}
            {showRecommendations && envelope.recommendations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">💡 Pistes (non prescriptif)</p>
                <ul className="text-xs space-y-1 pl-4">
                  {envelope.recommendations.map((r, i) => (
                    <li key={i} className="list-disc">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contexte */}
            <div className="text-xs text-muted-foreground italic">
              {envelope.contextNote}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

/**
 * Grille de plusieurs ScoreEnvelope
 */
interface ScoreEnvelopeGridProps {
  envelopes: ScoreEnvelope[];
  mode?: "athlete" | "staff";
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ScoreEnvelopeGrid({
  envelopes,
  mode = "athlete",
  columns = 3,
  className,
}: ScoreEnvelopeGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {envelopes.map((envelope) => (
        <ScoreEnvelopeDisplay
          key={envelope.metricId}
          envelope={envelope}
          mode={mode}
        />
      ))}
    </div>
  );
}

/**
 * Résumé inline d'un ScoreEnvelope (pour tableaux)
 */
export function ScoreEnvelopeInline({ envelope }: { envelope: ScoreEnvelope }) {
  return (
    <ScoreEnvelopeDisplay 
      envelope={envelope} 
      compact={true} 
    />
  );
}
