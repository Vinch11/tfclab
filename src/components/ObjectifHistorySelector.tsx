// =============================================
// SÉLECTEUR D'OBJECTIF AVEC HISTORIQUE
// Permet de changer l'objectif et revenir à un ancien
// =============================================

import { useState } from "react";
import { ObjectifType, getObjectifLabel } from "@/types/athlete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Target, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Tous les objectifs disponibles groupés par catégorie
const OBJECTIF_GROUPS = {
  triathlon: {
    label: "Triathlon",
    options: ["IM", "703", "Olympic", "Sprint"] as ObjectifType[],
  },
  running: {
    label: "Course à pied",
    options: ["Marathon", "Semi", "10K", "5K", "StartToRun"] as ObjectifType[],
  },
  trail: {
    label: "Trail",
    options: ["TrailShort", "TrailMountain", "TrailUltra"] as ObjectifType[],
  },
};

interface ObjectifHistorySelectorProps {
  currentObjectif: ObjectifType;
  previousObjectifs?: ObjectifType[];
  onObjectifChange: (objectif: ObjectifType) => void;
  showHistory?: boolean;
}

export function ObjectifHistorySelector({
  currentObjectif,
  previousObjectifs = [],
  onObjectifChange,
  showHistory = true,
}: ObjectifHistorySelectorProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Filtrer les objectifs précédents uniques (sans l'actuel)
  const uniquePreviousObjectifs = [...new Set(previousObjectifs)]
    .filter((obj) => obj !== currentObjectif)
    .slice(0, 3); // Max 3 objectifs précédents

  const handleRestore = (objectif: ObjectifType) => {
    onObjectifChange(objectif);
  };

  return (
    <div className="space-y-3">
      {/* Sélecteur principal */}
      <Select value={currentObjectif} onValueChange={(v) => onObjectifChange(v as ObjectifType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(OBJECTIF_GROUPS).map(([key, group]) => (
            <div key={key}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
              {group.options.map((obj) => (
                <SelectItem key={obj} value={obj}>
                  <span className="flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    {getObjectifLabel(obj)}
                    {obj === currentObjectif && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
                        actuel
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {/* Historique des objectifs précédents */}
      {showHistory && uniquePreviousObjectifs.length > 0 && (
        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                <span className="text-xs">Objectifs précédents ({uniquePreviousObjectifs.length})</span>
              </span>
              {isHistoryOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {uniquePreviousObjectifs.map((obj, index) => (
              <div
                key={`${obj}-${index}`}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border/50"
              >
                <span className="text-sm flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  {getObjectifLabel(obj)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(obj)}
                  className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurer
                </Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
