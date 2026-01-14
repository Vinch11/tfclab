// =============================================
// SÉLECTEUR RAPIDE D'AMBITION
// Modification de l'ambition sans quitter le dashboard
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AmbitionLevel,
  AMBITION_LEVELS_ORDERED,
  getAmbitionDefinition,
  DEFAULT_AMBITION,
} from "@/types/ambitionLevel";

interface QuickAmbitionSelectorProps {
  currentAmbition: AmbitionLevel;
  onAmbitionChange: (ambition: AmbitionLevel) => Promise<boolean>;
  disabled?: boolean;
}

export function QuickAmbitionSelector({
  currentAmbition,
  onAmbitionChange,
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
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 h-7 px-2 font-normal hover:bg-secondary/80",
            currentDef.color
          )}
          disabled={disabled || loading}
        >
          <span>{currentDef.icon}</span>
          <span className="hidden sm:inline">{currentDef.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Niveau d'ambition
          </p>
          {AMBITION_LEVELS_ORDERED.map((level) => {
            const def = getAmbitionDefinition(level);
            const isSelected = level === currentAmbition;
            
            return (
              <button
                key={level}
                onClick={() => handleSelect(level)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent"
                )}
              >
                <span className="text-lg">{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium text-sm", def.color)}>
                      {def.label}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {def.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground px-2">
            L'ambition ajuste les cibles physiologiques (VLamax, TTE, FTP/kg)
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
