/**
 * QuickObjectiveSelector - Sélecteur rapide d'objectif pour le header
 * Avec modale pour saisir le nom, la date et le format de la course
 */

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Target, ChevronDown, Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
      { value: "StartToRun", label: "Start to Run" },
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
  StartToRun: "👟",
  TrailShort: "⛰️",
  TrailMountain: "⛰️",
  TrailUltra: "⛰️",
};

export type RaceFormatUI = 'continuous' | 'lcw_3day';

const RACE_FORMAT_OPTIONS: { value: RaceFormatUI; label: string; description: string }[] = [
  { value: 'continuous', label: 'Triathlon classique', description: 'Enchaînement Natation → Vélo → Course en continu' },
  { value: 'lcw_3day', label: 'Long Course Weekend (3 jours)', description: 'Natation J1, Vélo J2, Course J3' },
];

interface QuickObjectiveSelectorProps {
  currentGoal: string | null;
  onGoalChange: (goal: ObjectifType, options?: { 
    raceName?: string; 
    raceDate?: string;
    raceFormat?: RaceFormatUI;
  }) => Promise<void>;
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  });

  const [raceFormat, setRaceFormat] = useState<RaceFormatUI>('continuous');

  const isTriathlon = selectedGoal === 'IM' || selectedGoal === '703';

  const handleSelect = (goal: string) => {
    // Toujours ouvrir la modale (même si on garde le même objectif)
    // pour permettre la modification du nom et/ou de la date de la course
    setSelectedGoal(goal);
    setRaceName("");
    setRaceFormat('continuous');
    // Date par défaut: 3 mois dans le futur
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    setRaceDate(defaultDate);
    setDropdownOpen(false);
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedGoal) return;
    
    setSaving(true);
    try {
      await onGoalChange(selectedGoal as ObjectifType, {
        raceName: raceName.trim() || undefined,
        raceDate: raceDate ? format(raceDate, "yyyy-MM-dd") : undefined,
        raceFormat: isTriathlon ? raceFormat : undefined,
      });
      setModalOpen(false);
      setSelectedGoal(null);
      setRaceName("");
      setRaceFormat('continuous');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setModalOpen(false);
    setSelectedGoal(null);
    setRaceName("");
    setRaceFormat('continuous');
  };

  const icon = currentGoal ? OBJECTIF_ICONS[currentGoal] || "🎯" : "🎯";
  const label = currentGoal ? getObjectifLabel(currentGoal as ObjectifType) : "Objectif";
  const selectedGoalLabel = selectedGoal ? getObjectifLabel(selectedGoal as ObjectifType) : "";
  const selectedGoalIcon = selectedGoal ? OBJECTIF_ICONS[selectedGoal] || "🎯" : "🎯";

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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

      {/* Modal pour saisir les détails de la course */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedGoalIcon}</span>
              Nouvel objectif: {selectedGoalLabel}
            </DialogTitle>
            <DialogDescription>
              Renseigne les détails de ta prochaine course pour un suivi optimal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Nom de la course */}
            <div className="grid gap-2">
              <Label htmlFor="race-name">Nom de la course (optionnel)</Label>
              <Input
                id="race-name"
                placeholder="Ex: Marathon de Paris, Trail des Géants..."
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Date de la course */}
            <div className="grid gap-2">
              <Label>Date de la course</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !raceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {raceDate ? (
                      format(raceDate, "d MMMM yyyy", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={raceDate}
                    onSelect={setRaceDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                La date sera utilisée pour planifier ta préparation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Confirmer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
