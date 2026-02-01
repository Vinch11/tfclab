/**
 * QuickObjectiveSelector - Sélecteur rapide d'objectif pour le header
 */

import { useState } from "react";
import { Target, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ObjectifType, getObjectifLabel } from "@/types/athlete";

// Objectifs groupés
const OBJECTIF_GROUPS = {
  triathlon: {
    label: "🏊 Triathlon",
    options: [
      { value: "IM", label: "Ironman" },
      { value: "703", label: "70.3" },
    ],
  },
  running: {
    label: "🏃 Course à pied",
    options: [
      { value: "Marathon", label: "Marathon" },
      { value: "Semi", label: "Semi-Marathon" },
      { value: "10K", label: "10K" },
      { value: "5K", label: "5K" },
    ],
  },
  trail: {
    label: "⛰️ Trail",
    options: [
      { value: "TrailShort", label: "Trail Court" },
      { value: "TrailMountain", label: "Trail Montagne" },
      { value: "TrailUltra", label: "Ultra Trail" },
    ],
  },
};

// Icônes par type
const OBJECTIF_ICONS: Record<string, string> = {
  IM: "🏊",
  "703": "🏊",
  Marathon: "🏃",
  Semi: "🏃",
  "10K": "🏃",
  "5K": "🏃",
  TrailShort: "⛰️",
  TrailMountain: "⛰️",
  TrailUltra: "⛰️",
};

interface QuickObjectiveSelectorProps {
  currentGoal: string | null;
  onGoalChange: (goal: ObjectifType) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function QuickObjectiveSelector({
  currentGoal,
  onGoalChange,
  disabled = false,
  className,
}: QuickObjectiveSelectorProps) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSelect = async (goal: string) => {
    if (goal === currentGoal) {
      setOpen(false);
      return;
    }
    
    setSaving(true);
    try {
      await onGoalChange(goal as ObjectifType);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const icon = currentGoal ? OBJECTIF_ICONS[currentGoal] || "🎯" : "🎯";
  const label = currentGoal ? getObjectifLabel(currentGoal as ObjectifType) : "Objectif";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 gap-1.5 text-sm", className)}
          disabled={disabled || saving}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span>{icon}</span>
          )}
          <span className="truncate max-w-[80px]">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {Object.entries(OBJECTIF_GROUPS).map(([key, group], idx) => (
          <DropdownMenuGroup key={key}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs">{group.label}</DropdownMenuLabel>
            {group.options.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "cursor-pointer",
                  currentGoal === opt.value && "bg-primary/10 font-medium"
                )}
              >
                <span className="mr-2">{OBJECTIF_ICONS[opt.value]}</span>
                {opt.label}
                {currentGoal === opt.value && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
