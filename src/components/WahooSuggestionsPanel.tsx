/**
 * Wahoo Suggestions Panel v3
 * Displays AI-powered workout suggestions organized by temporal phases
 * 
 * Shows in Templates section when athlete context is available
 * Supports Staff mode (detailed) and Athlete mode (simplified)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ExternalLink,
  Copy,
  CheckCircle2,
  Activity,
  Calendar,
  Clock
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type WahooSuggestion,
  type SuggestionEngineOutput,
  type TargetAxis,
  type TemporalPhase,
  type PhasedSuggestions,
  getAxisColor,
  getAxisLabel,
  getAxisIcon,
  getNeedLabel,
  formatSuggestionsForCopy,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  getPhaseColor,
} from "@/lib/wahoo/wahooSuggestionEngine";
import { getRiskLabel, getRiskColor } from "@/data/wahooMapping";

interface WahooSuggestionsPanelProps {
  output: SuggestionEngineOutput;
  staffMode: boolean;
  athleteName?: string;
  onAskAssistant?: (workoutName: string, workoutId: string) => void;
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
    case "VO2":
      return <Activity className={iconClass} />;
  }
}

function PhaseIcon({ phase }: { phase: TemporalPhase }) {
  const iconClass = "h-4 w-4";
  switch (phase) {
    case 1:
      return <span className="text-green-600 dark:text-green-400 font-bold text-sm">1</span>;
    case 2:
      return <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">2</span>;
    case 3:
      return <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">3</span>;
  }
}

function SuggestionCard({ 
  suggestion, 
  staffMode,
  index,
  onAskAssistant
}: { 
  suggestion: WahooSuggestion; 
  staffMode: boolean;
  index: number;
  onAskAssistant?: (workoutName: string, workoutId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
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
            <span className="font-semibold text-foreground text-sm">{suggestion.wahoo_name}</span>
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

          {/* Frequency */}
          {suggestion.frequencyPerWeek && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{suggestion.frequencyPerWeek}</span>
            </div>
          )}

          {/* Risk level - staff only */}
          {staffMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Risque : 
              </span>
              <span className={`text-xs font-medium ${getRiskColor(suggestion.riskLevel)}`}>
                {getRiskLabel(suggestion.riskLevel)}
              </span>
              <span className="text-xs text-muted-foreground">
                • Confiance : {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>
          )}

          {/* Effects */}
          <div className="flex flex-wrap gap-1">
            {suggestion.expected_effects.map((effect, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                {effect}
              </Badge>
            ))}
          </div>

          {/* Why - Collapsible in staff mode, always visible in athlete mode */}
          {staffMode ? (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Info className="h-3 w-3" />
                Pourquoi cette suggestion ?
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                  {suggestion.why}
                </p>
                {suggestion.staffAnnotation && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                    {suggestion.staffAnnotation}
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {getSimplifiedWhy(suggestion)}
            </p>
          )}

          {/* Cautions */}
          {suggestion.cautions.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{suggestion.cautions.join(" • ")}</span>
            </div>
          )}

          {/* Ask Assistant button */}
          {onAskAssistant && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary hover:bg-primary/10 h-7"
              onClick={() => onAskAssistant(suggestion.wahoo_name, suggestion.wahoo_id)}
            >
              <Info className="h-3 w-3 mr-1" />
              Demander à l'Assistant
            </Button>
          )}
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
    case "VO2":
      return "Cette séance développe ta capacité aérobie maximale de façon contrôlée.";
  }
}

function PhaseSection({ 
  phase, 
  suggestions, 
  staffMode,
  onAskAssistant
}: { 
  phase: TemporalPhase; 
  suggestions: WahooSuggestion[];
  staffMode: boolean;
  onAskAssistant?: (workoutName: string, workoutId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(phase === 1);

  if (suggestions.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getPhaseColor(phase)} cursor-pointer hover:opacity-90 transition-opacity`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium text-sm">{PHASE_LABELS[phase]}</span>
            <span className="text-xs opacity-75">({PHASE_DESCRIPTIONS[phase]})</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {suggestions.length} séance{suggestions.length > 1 ? "s" : ""}
            </Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="space-y-2 pl-2 border-l-2 border-muted ml-4">
          {suggestions.map((suggestion, idx) => (
            <SuggestionCard 
              key={suggestion.id} 
              suggestion={suggestion} 
              staffMode={staffMode}
              index={idx}
              onAskAssistant={onAskAssistant}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WahooSuggestionsPanel({ 
  output, 
  staffMode,
  athleteName,
  onAskAssistant
}: WahooSuggestionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = formatSuggestionsForCopy(output);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Suggestions copiées !");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSuggestions = output.suggestions.length;

  if (totalSuggestions === 0) {
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
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
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
                  {totalSuggestions} suggestion{totalSuggestions > 1 ? "s" : ""}
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

            {/* Need analysis - staff only */}
            {staffMode && output.needAnalysis.rationale.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Besoins identifiés :</p>
                <div className="flex flex-wrap gap-1">
                  {output.needAnalysis.needs.map((need, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {getNeedLabel(need)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Phased suggestions */}
            <div className="space-y-3">
              <PhaseSection 
                phase={1} 
                suggestions={output.phasedSuggestions.phase1} 
                staffMode={staffMode}
                onAskAssistant={onAskAssistant}
              />
              <PhaseSection 
                phase={2} 
                suggestions={output.phasedSuggestions.phase2} 
                staffMode={staffMode}
                onAskAssistant={onAskAssistant}
              />
              <PhaseSection 
                phase={3} 
                suggestions={output.phasedSuggestions.phase3} 
                staffMode={staffMode}
                onAskAssistant={onAskAssistant}
              />
            </div>

            {/* Copy button - staff only */}
            {staffMode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier toutes les suggestions
                  </>
                )}
              </Button>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic text-center pt-2 border-t">
              Ces suggestions ne remplacent pas la planification du coach. 
              Elles éclairent un besoin physiologique identifié.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}