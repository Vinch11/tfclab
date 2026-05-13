// =============================================
// QUICK FATIGUE INPUT - Widget rapide Dashboard
// Saisie état de forme 1-10 (1=Nul/Épuisé, 10=Super/Frais)
// =============================================

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Battery, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCloudData, DbCheckin } from "@/contexts/CloudDataContext";
import { toast } from "@/hooks/use-toast";

interface QuickFatigueInputProps {
  athleteId: string;
  athleteName: string;
  onSubmit?: (value: number) => void;
}

// Labels pour chaque niveau — INVERSÉ: 1=Nul, 10=Super
const FATIGUE_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: "Épuisé", description: "Épuisement total, repos urgent", color: "text-red-600" },
  2: { label: "Très fatigué", description: "Récupération urgente nécessaire", color: "text-red-500" },
  3: { label: "Fatigué", description: "Fatigue importante", color: "text-orange-600" },
  4: { label: "Assez fatigué", description: "Récupération conseillée", color: "text-orange-500" },
  5: { label: "Moyen", description: "Fatigue perceptible", color: "text-amber-500" },
  6: { label: "Correct", description: "Légère fatigue résiduelle", color: "text-yellow-500" },
  7: { label: "Bien", description: "Bonne forme générale", color: "text-lime-500" },
  8: { label: "Très bien", description: "Excellente récupération", color: "text-green-400" },
  9: { label: "Frais", description: "En grande forme", color: "text-green-500" },
  10: { label: "Super", description: "Pleine forme, prêt pour tout", color: "text-green-600" },
};

function getFatigueIcon(value: number) {
  // Inversé: valeurs hautes = plein d'énergie
  if (value >= 9) return <BatteryFull className="h-5 w-5 text-green-500" />;
  if (value >= 7) return <BatteryMedium className="h-5 w-5 text-lime-500" />;
  if (value >= 5) return <BatteryLow className="h-5 w-5 text-amber-500" />;
  if (value >= 3) return <BatteryWarning className="h-5 w-5 text-orange-500" />;
  return <Battery className="h-5 w-5 text-red-500" />;
}

export function QuickFatigueInput({ athleteId, athleteName, onSubmit }: QuickFatigueInputProps) {
  const { addCheckin, updateCheckin, getCheckinsForAthlete } = useCloudData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Vérifier si un check-in existe déjà aujourd'hui
  const todayCheckins = getCheckinsForAthlete(athleteId).filter(
    c => c.date_iso === new Date().toISOString().slice(0, 10)
  );
  const existingCheckin = todayCheckins.length > 0 ? todayCheckins[0] : null;
  const existingFatigue = existingCheckin?.fatigue ?? null;

  // Valeur locale: soit existante, soit 5 par défaut
  const [value, setValue] = useState<number>(existingFatigue ?? 5);

  // Sync la valeur si le check-in existant change
  useEffect(() => {
    if (existingFatigue !== null && !isEditing) {
      setValue(existingFatigue);
    }
  }, [existingFatigue, isEditing]);

  const fatigueInfo = FATIGUE_LABELS[value];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const today = new Date();
      const weekTag = `${today.getFullYear()}-W${String(Math.ceil((today.getDate() + new Date(today.getFullYear(), 0, 1).getDay()) / 7)).padStart(2, "0")}`;
      
      if (existingCheckin) {
        // Mise à jour du check-in existant
        await updateCheckin(existingCheckin.id, {
          fatigue: value,
          notes: `Forme perçue: ${value}/10 - ${fatigueInfo.label}`,
        });
        toast({
          title: "Forme mise à jour",
          description: `${fatigueInfo.label} (${value}/10) pour ${athleteName}`,
        });
      } else {
        // Créer un nouveau check-in
        await addCheckin({
          athlete_id: athleteId,
          coach_id: "",
          date_iso: today.toISOString().slice(0, 10),
          week_tag: weekTag,
          fatigue: value,
          sleep: null,
          soreness: null,
          stress: null,
          motivation: null,
          rpe_key1: null,
          rpe_key2: null,
          pain_flag: false,
          notes: `Forme perçue: ${value}/10 - ${fatigueInfo.label}`,
          readiness: null,
        });
        toast({
          title: "Forme enregistrée",
          description: `${fatigueInfo.label} (${value}/10) pour ${athleteName}`,
        });
      }

      setIsEditing(false);
      onSubmit?.(value);
    } catch (error) {
      console.error("Error saving fatigue:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la forme",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode lecture seule (déjà soumis et pas en édition)
  if (existingFatigue !== null && !isEditing) {
    const info = FATIGUE_LABELS[existingFatigue];
    return (
      <Card className="border-border/50">
        <CardContent className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getFatigueIcon(existingFatigue)}
              <span className="text-sm text-muted-foreground">Forme</span>
              <span className={cn("font-bold", info.color)}>
                {existingFatigue}/10
              </span>
              <span className={cn("text-sm", info.color)}>
                {info.label}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setValue(existingFatigue);
                setIsEditing(true);
              }}
              className="h-7 px-2"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode édition ou première saisie
  return (
    <Card className="border-border/50">
      <CardContent className="px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFatigueIcon(value)}
            <span className="text-sm font-medium">Forme perçue</span>
            <span className={cn("font-bold", fatigueInfo.color)}>{value}/10</span>
            <span className={cn("text-xs", fatigueInfo.color)}>{fatigueInfo.label}</span>
          </div>
          <Badge variant="outline" className="text-xs h-5">
            {existingCheckin ? "Modifier" : "Saisie"}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Slider
            value={[value]}
            onValueChange={([v]) => setValue(v)}
            min={1}
            max={10}
            step={1}
            className="flex-1"
          />
          <div className="flex gap-1">
            {isEditing && (
              <Button 
                variant="ghost"
                onClick={() => setIsEditing(false)}
                size="sm"
                className="h-7 px-2"
              >
                ✕
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              size="sm"
              className="h-7 px-3"
            >
              {isSubmitting ? "..." : "OK"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
