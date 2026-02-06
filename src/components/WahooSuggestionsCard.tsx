/**
 * Wahoo SYSTM Suggestions Card
 * Affiche les suggestions d'entraînement Wahoo basées sur le profil physiologique
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Dumbbell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WahooSuggestion, PhasedSuggestions } from "@/lib/wahoo/wahooSuggestionEngine";

interface WahooSuggestionsCardProps {
  suggestions: WahooSuggestion[];
  phasedSuggestions?: PhasedSuggestions;
  diagnosticSummary: string;
  compact?: boolean;
}

export function WahooSuggestionsCard({
  suggestions, phasedSuggestions, diagnosticSummary, compact
}: WahooSuggestionsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!suggestions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Suggestions Wahoo SYSTM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune suggestion disponible avec les données actuelles.</p>
        </CardContent>
      </Card>
    );
  }

  const priorityColors: Record<number, string> = {
    1: "bg-red-500/10 border-red-500/20",
    2: "bg-amber-500/10 border-amber-500/20",
    3: "bg-green-500/10 border-green-500/20",
  };

  const displaySuggestions = compact ? suggestions.slice(0, 3) : suggestions;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          Suggestions Wahoo SYSTM
          <Badge variant="outline" className="text-[10px] ml-auto">{suggestions.length} séances</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground leading-relaxed">{diagnosticSummary}</p>
        </div>

        {!compact && phasedSuggestions && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg p-2 bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-medium text-primary">Phase 1</p>
              <p className="text-lg font-bold text-primary">{phasedSuggestions.phase1.length}</p>
            </div>
            <div className="rounded-lg p-2 bg-amber-500/5 border border-amber-500/10">
              <p className="text-[10px] font-medium text-amber-700">Phase 2</p>
              <p className="text-lg font-bold text-amber-700">{phasedSuggestions.phase2.length}</p>
            </div>
            <div className="rounded-lg p-2 bg-green-500/5 border border-green-500/10">
              <p className="text-[10px] font-medium text-green-700">Phase 3</p>
              <p className="text-lg font-bold text-green-700">{phasedSuggestions.phase3.length}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {displaySuggestions.map((s) => (
            <Collapsible key={s.id} open={expandedId === s.id} onOpenChange={(open) => setExpandedId(open ? s.id : null)}>
              <CollapsibleTrigger className="w-full">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/30",
                  priorityColors[s.priority] || ""
                )}>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{s.wahoo_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.why}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[9px]">P{s.priority}</Badge>
                    {s.frequencyPerWeek && (
                      <span className="text-[10px] text-muted-foreground">{s.frequencyPerWeek}/sem</span>
                    )}
                    {expandedId === s.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 ml-3 p-3 rounded-lg bg-muted/30 space-y-2">
                  {s.expected_effects.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" /> Effets attendus
                      </p>
                      <ul className="text-[10px] text-muted-foreground pl-4 list-disc">
                        {s.expected_effects.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                  {s.cautions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600" /> Précautions
                      </p>
                      <ul className="text-[10px] text-muted-foreground pl-4 list-disc">
                        {s.cautions.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                  {s.staffAnnotation && (
                    <p className="text-[10px] text-primary italic">{s.staffAnnotation}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {compact && suggestions.length > 3 && (
          <p className="text-xs text-center text-muted-foreground">
            + {suggestions.length - 3} autres suggestions disponibles
          </p>
        )}
      </CardContent>
    </Card>
  );
}
