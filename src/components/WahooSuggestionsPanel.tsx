/**
 * Wahoo Suggestions Panel
 * Displays AI-powered workout suggestions based on athlete profile
 * 
 * Shows in Templates section when athlete context is available
 * Supports Staff mode (detailed) and Athlete mode (simplified)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  ChevronDown, 
  AlertTriangle, 
  Target, 
  TrendingDown, 
  Timer, 
  Battery, 
  Leaf,
  Info,
  ExternalLink
} from "lucide-react";
import { useState } from "react";

import {
  type WahooSuggestion,
  type SuggestionEngineOutput,
  type TargetAxis,
  getAxisColor,
  getAxisLabel,
  getAxisIcon,
} from "@/lib/wahoo/wahooSuggestionEngine";

interface WahooSuggestionsPanelProps {
  output: SuggestionEngineOutput;
  staffMode: boolean;
  athleteName?: string;
}

function AxisIcon({ axis }: { axis: TargetAxis }) {
  const iconClass = "h-4 w-4";
  switch (axis) {
    case "VLAMAX":
      return <TrendingDown className={iconClass} />;
    case "TTE":
      return <Timer className={iconClass} />;
    case "ENDURANCE":
      return <Battery className={iconClass} />;
    case "FRESHNESS":
      return <Leaf className={iconClass} />;
  }
}

function SuggestionCard({ 
  suggestion, 
  staffMode,
  index 
}: { 
  suggestion: WahooSuggestion; 
  staffMode: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {index + 1}
          </div>
          <AxisIcon axis={suggestion.targetAxis} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{suggestion.workoutName}</span>
            <Badge className={`text-xs ${getAxisColor(suggestion.targetAxis)}`}>
              {getAxisIcon(suggestion.targetAxis)} {getAxisLabel(suggestion.targetAxis)}
            </Badge>
            <Badge 
              variant="outline" 
              className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Wahoo SYSTM
            </Badge>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Catégorie : {suggestion.wahooCategory}
            </span>
          </div>

          {/* Effects */}
          <div className="flex flex-wrap gap-1.5">
            {suggestion.expectedEffects.map((effect, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                {effect}
              </Badge>
            ))}
          </div>

          {/* Why - Collapsible in staff mode, always visible in athlete mode */}
          {staffMode ? (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Info className="h-3 w-3" />
                Pourquoi cette suggestion ?
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {suggestion.why}
                </p>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {getSimplifiedWhy(suggestion)}
            </p>
          )}

          {/* Caution */}
          {suggestion.caution && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{suggestion.caution}</span>
            </div>
          )}

          {/* Non-imposing badge */}
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            💡 Suggestion — non imposée
          </Badge>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplify the "why" message for athlete mode
 */
function getSimplifiedWhy(suggestion: WahooSuggestion): string {
  switch (suggestion.targetAxis) {
    case "VLAMAX":
      return "Cette séance favorise ton économie énergétique et ta capacité à utiliser les graisses comme carburant.";
    case "TTE":
      return "Cette séance améliore ta capacité à tenir ton allure cible plus longtemps.";
    case "ENDURANCE":
      return "Cette séance renforce ta base aérobie, fondation de toute performance d'endurance.";
    case "FRESHNESS":
      return "Cette séance favorise ta récupération et te prépare pour les prochains efforts.";
  }
}

export function WahooSuggestionsPanel({ 
  output, 
  staffMode,
  athleteName 
}: WahooSuggestionsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (output.suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Profil équilibré — aucune suggestion prioritaire</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Séances Wahoo recommandées
                {athleteName && (
                  <span className="text-sm font-normal text-muted-foreground">
                    (selon le profil {staffMode ? `de ${athleteName}` : ""})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {output.suggestions.length} suggestion{output.suggestions.length > 1 ? "s" : ""}
                </Badge>
                <ChevronDown 
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Diagnostic summary - staff only */}
            {staffMode && output.diagnosticSummary && (
              <Alert className="bg-primary/5 border-primary/20">
                <Target className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <span className="font-medium">Diagnostic : </span>
                  {output.diagnosticSummary}
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions list */}
            <div className="space-y-3">
              {output.suggestions.map((suggestion, idx) => (
                <SuggestionCard 
                  key={suggestion.id} 
                  suggestion={suggestion} 
                  staffMode={staffMode}
                  index={idx}
                />
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic text-center pt-2 border-t">
              Ces suggestions ne remplacent pas la planification du coach.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
