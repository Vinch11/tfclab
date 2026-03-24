// =============================================
// SÉLECTEUR RAPIDE D'AMBITION
// Modification de l'ambition sans quitter le dashboard
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AmbitionLevel,
  AMBITION_LEVELS_ORDERED,
  getAmbitionDefinition,
  getRunningTimeHint,
  DEFAULT_AMBITION,
  SexeForHints,
} from "@/types/ambitionLevel";

interface QuickAmbitionSelectorProps {
  currentAmbition: AmbitionLevel;
  onAmbitionChange: (ambition: AmbitionLevel) => Promise<boolean>;
  objectif?: string;
  sexe?: SexeForHints;
  disabled?: boolean;
}

export function QuickAmbitionSelector({
  currentAmbition,
  onAmbitionChange,
  objectif,
  sexe,
  disabled = false,
}: QuickAmbitionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentDef = getAmbitionDefinition(currentAmbition || DEFAULT_AMBITION);

  const handleSelect = async (level: AmbitionLevel) => {
    if (level === currentAmbition) {
      setOpen(false);
      return;
    }
    
    setLoading(true);
    const success = await onAmbitionChange(level);
    setLoading(false);
    
    if (success) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 h-9 px-3 font-medium border-2 shadow-sm",
            "hover:shadow-md transition-all duration-200",
            "bg-gradient-to-r from-background to-muted/30",
            currentDef.color
          )}
          disabled={disabled || loading}
        >
          <span className="text-lg">{currentDef.icon}</span>
          <span className="font-semibold">{currentDef.label}</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 pb-2 border-b">
            <Star className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Niveau d'ambition</p>
          </div>
          {AMBITION_LEVELS_ORDERED.map((level) => {
            const def = getAmbitionDefinition(level);
            const isSelected = level === currentAmbition;
            
            return (
              <button
                key={level}
                onClick={() => handleSelect(level)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]",
                  isSelected && "bg-primary/10 border-2 border-primary/30 shadow-sm"
                )}
              >
                <span className="text-2xl">{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold", def.color)}>
                      {def.label}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const hint = objectif ? getRunningTimeHint(objectif, level, sexe) : null;
                      return hint ? <>{def.description} — <span className="font-medium">{hint}</span></> : def.description;
                    })()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t bg-muted/30 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
          <p className="text-[10px] text-muted-foreground text-center">
            Les cibles VLamax, TTE et FTP/kg s'adaptent à votre ambition
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
