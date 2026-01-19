/**
 * CAP Test Sheet - Modal for recording test data
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Timer,
  Target
} from "lucide-react";
import { CAP_TESTING_WEEK, CAPTestDay } from "@/data/capTestingWeek";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { DbSnapshot } from "@/hooks/useCloudData";
import { toast } from "sonner";

interface CAPTestSheetProps {
  dayKey: string;
  athlete: { id: string; name: string; goal?: string | null };
  snapshot: DbSnapshot | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

// Helper to parse pace mm:ss to seconds
const parsePaceToSeconds = (v: string): number | null => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);
      if (Number.isFinite(min) && Number.isFinite(sec) && min >= 0 && sec >= 0 && sec < 60) {
        return min * 60 + sec;
      }
    }
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function CAPTestSheet({ dayKey, athlete, snapshot, onClose, onSave }: CAPTestSheetProps) {
  const { updateSnapshot, addSnapshot } = useCloudDataContext();
  const day = CAP_TESTING_WEEK.days.find((d) => d.dayKey === dayKey);
  
  // Form state based on day
  const [sprint15s, setSprint15s] = useState(snapshot?.sprint_15s_distance?.toString() || "");
  const [vma, setVma] = useState(snapshot?.vma?.toString() || "");
  const [paceThreshold, setPaceThreshold] = useState(
    snapshot?.pace_threshold_sec_per_km 
      ? `${Math.floor(snapshot.pace_threshold_sec_per_km / 60)}:${(snapshot.pace_threshold_sec_per_km % 60).toString().padStart(2, "0")}`
      : ""
  );
  const [tteObserved, setTteObserved] = useState(snapshot?.tte_observed_min?.toString() || "");
  const [runPowerMax, setRunPowerMax] = useState(snapshot?.running_power_max?.toString() || "");
  const [runPowerThreshold, setRunPowerThreshold] = useState(snapshot?.running_power_threshold?.toString() || "");
  const snapWithQuality = snapshot as unknown as { protocol_quality?: number | null } | null;
  const [protocolQuality, setProtocolQuality] = useState(snapWithQuality?.protocol_quality?.toString() || "3");
  const [saving, setSaving] = useState(false);

  if (!day) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      
      // Protocol quality
      updates.protocol_quality = parseInt(protocolQuality) || 3;

      // Add data based on day
      if (dayKey === "D1") {
        updates.sprint_15s_distance = sprint15s ? parseFloat(sprint15s) : null;
      } else if (dayKey === "D3") {
        updates.vma = vma ? parseFloat(vma) : null;
      } else if (dayKey === "D5") {
        updates.pace_threshold_sec_per_km = parsePaceToSeconds(paceThreshold);
        updates.tte_observed_min = tteObserved ? parseInt(tteObserved) : null;
        if (runPowerMax) updates.running_power_max = parseFloat(runPowerMax);
        if (runPowerThreshold) updates.running_power_threshold = parseFloat(runPowerThreshold);
      }

      if (snapshot) {
        await updateSnapshot(snapshot.id, updates);
        toast.success("Données enregistrées");
      } else {
        toast.error("Aucun profil actif - créez d'abord un profil pour cet athlète");
      }
      
      await onSave(updates);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    switch (dayKey) {
      case "D1":
        return (
          <div className="space-y-4">
            <div>
              <Label>Distance Sprint 15s (meilleur essai)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 85"
                  value={sprint15s}
                  onChange={(e) => setSprint15s(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">mètres</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Distance parcourue lors du meilleur sprint de 15 secondes
              </p>
            </div>
          </div>
        );
      
      case "D3":
        return (
          <div className="space-y-4">
            <div>
              <Label>VMA mesurée</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 17.5"
                  value={vma}
                  onChange={(e) => setVma(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">km/h</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                VMA = Distance (m) / Temps (min) × 10 pour un test 6 min
              </p>
            </div>
          </div>
        );
      
      case "D5":
        return (
          <div className="space-y-4">
            <div>
              <Label>Allure Seuil (30 min test)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="text"
                  placeholder="4:30 ou 270"
                  value={paceThreshold}
                  onChange={(e) => setPaceThreshold(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">/km</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Allure moyenne sur le test de 30 min (format mm:ss ou secondes)
              </p>
            </div>
            
            <div>
              <Label>TTE observé (optionnel)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 45"
                  value={tteObserved}
                  onChange={(e) => setTteObserved(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Durée totale si vous avez continué au-delà des 30 min jusqu'à épuisement
              </p>
            </div>

            <Separator />
            <p className="text-sm font-medium">Données de puissance (optionnel)</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Puissance Max CAP</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 450"
                    value={runPowerMax}
                    onChange={(e) => setRunPowerMax(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">W</span>
                </div>
              </div>
              <div>
                <Label>Puissance Seuil CAP</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 280"
                    value={runPowerThreshold}
                    onChange={(e) => setRunPowerThreshold(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">W</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Ce jour n'a pas de données spécifiques à enregistrer.
          </p>
        );
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{day.dayKey}</Badge>
            {day.title}
          </SheetTitle>
          <SheetDescription>
            {day.goal}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Protocol Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Protocole
              </h4>
              
              {day.protocol.main.map((step, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="font-medium">{step.intensityLabel}</div>
                  {step.notes && (
                    <p className="text-muted-foreground text-xs mt-1">{step.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Validity Criteria */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Critères de validité
              </h4>
              <ul className="space-y-1">
                {day.protocol.validityCriteria.map((criteria, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">📊 Données à enregistrer</h4>
              {renderFormFields()}
            </div>

            <Separator />

            {/* Protocol Quality */}
            <div>
              <Label>Qualité du protocole (1–5)</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={protocolQuality === String(q) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProtocolQuality(String(q))}
                    className="w-10"
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                1 = Très mauvais, 3 = Correct, 5 = Excellent
              </p>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
