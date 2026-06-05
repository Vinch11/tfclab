/**
 * TFCL Test Sheet Component
 * Interactive test sheet with protocol steps, timer, and data entry
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePersistedFormState } from "@/hooks/usePersistedFormState";
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  TFCL_TESTING_WEEK, 
  getProtocolQualityLabel,
  getProtocolQualityColor 
} from "@/data/tfclTestingWeek";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAuth } from "@/contexts/AuthContext";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface TFCLTestSheetProps {
  dayKey: string;
  athlete: { id: string; name: string };
  snapshot: DbSnapshot | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function TFCLTestSheet({ dayKey, athlete, snapshot, onClose, onSave }: TFCLTestSheetProps) {
  const { user } = useAuth();
  const { addSnapshot, updateSnapshot, addTest, loadData } = useCloudDataContext();

  const day = useMemo(
    () => TFCL_TESTING_WEEK.days.find((d) => d.dayKey === dayKey),
    [dayKey]
  );

  // Persisted form state — survives iOS background kill / sleep
  const persistKey = `tfcl-test:${athlete.id}:${dayKey}`;
  const [persisted, setPersisted, clearPersisted] = usePersistedFormState<{
    checkedSteps: string[];
    formData: Record<string, string>;
    protocolQuality: number;
  }>(persistKey, { checkedSteps: [], formData: {}, protocolQuality: 3 });

  const checkedSteps = useMemo(() => new Set(persisted.checkedSteps), [persisted.checkedSteps]);
  const formData = persisted.formData;
  const protocolQuality = persisted.protocolQuality;

  const setCheckedSteps = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setPersisted((p) => ({ ...p, checkedSteps: Array.from(updater(new Set(p.checkedSteps))) }));
  }, [setPersisted]);
  const setFormData = useCallback((updater: (prev: Record<string, string>) => Record<string, string>) => {
    setPersisted((p) => ({ ...p, formData: updater(p.formData) }));
  }, [setPersisted]);
  const setProtocolQuality = useCallback((q: number) => {
    setPersisted((p) => ({ ...p, protocolQuality: q }));
  }, [setPersisted]);

  const [expandedSection, setExpandedSection] = useState<string | null>("main");
  const [isSaving, setIsSaving] = useState(false);

  if (!day) return null;

  const toggleStep = (stepId: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setIsSaving(true);
    
    try {
      // Map form data to snapshot fields based on dayKey
      const snapshotUpdates: Record<string, unknown> = {
        protocol_quality: protocolQuality,
        coach_notes: `Semaine de Référence TFCL — ${dayKey} complété le ${new Date().toLocaleDateString('fr-FR')}`
      };

      if (dayKey === "D1") {
        if (formData.p30s_avg) snapshotUpdates.p30s_w = parseInt(formData.p30s_avg);
        if (formData.p60s_avg) snapshotUpdates.p60s_w = parseInt(formData.p60s_avg);
        if (formData.hr_max) snapshotUpdates.fc_max = parseInt(formData.hr_max);
      } else if (dayKey === "D3") {
        if (formData.map5min_avg) snapshotUpdates.map5min_w = parseInt(formData.map5min_avg);
      } else if (dayKey === "D5") {
        if (formData.ftp_used) snapshotUpdates.ftp = parseInt(formData.ftp_used);
        if (formData.tte_observed) snapshotUpdates.tte_observed_min = parseInt(formData.tte_observed);
      }

      if (snapshot) {
        await updateSnapshot(snapshot.id, snapshotUpdates as Partial<DbSnapshot>);
        toast.success(`${dayKey} enregistré dans le profil existant`);
      } else {
        const newSnapshot = {
          athlete_id: athlete.id,
          coach_id: user.id,
          date: new Date().toISOString().split('T')[0],
          source: "tfcl_testing_week",
          ...snapshotUpdates
        } as Omit<DbSnapshot, "id" | "created_at" | "updated_at">;
        await addSnapshot(newSnapshot);
        toast.success(`${dayKey} enregistré dans un nouveau profil`);
      }

      // Save as test entry for continuous calibration (D1/D3/D5)
      if (["D1", "D3", "D5"].includes(dayKey)) {
        let testType = "TFCL";
        let testName = `TFCL ${dayKey}`;
        const rawData: Record<string, unknown> = {
          dayKey,
          category: "TFCL_REFERENCE_WEEK",
          source: "TFCL_TESTING_WEEK",
          protocolQuality,
          ...formData,
        };

        if (dayKey === "D1") {
          testType = "VLAMAX";
          testName = "TFCL D1 — Sprint P30s/P60s";
          if (formData.p30s_avg) rawData.p30s_w = parseInt(formData.p30s_avg);
          if (formData.p60s_avg) rawData.p60s_w = parseInt(formData.p60s_avg);
        } else if (dayKey === "D3") {
          testType = "MAP";
          testName = "TFCL D3 — MAP 5min";
          if (formData.map5min_avg) rawData.map5min_w = parseInt(formData.map5min_avg);
        } else if (dayKey === "D5") {
          testType = "TTE";
          testName = "TFCL D5 — FTP + TTE";
          if (formData.tte_observed) {
            rawData.tte_minutes = parseInt(formData.tte_observed);
            rawData.tteObserved = parseInt(formData.tte_observed);
          }
          if (formData.ftp_used) rawData.ftp = parseInt(formData.ftp_used);
        }

        const reliability = 0.5 + (protocolQuality - 3) * 0.075;
        await addTest(
          athlete.id,
          testType,
          testName,
          "bike",
          reliability,
          null,
          rawData as never,
          `Semaine de Référence TFCL — ${dayKey}`
        );

        // Create calibration_evidence row to feed the 42-day continuous calibration window
        const evidenceTypeMap: Record<string, string> = {
          D1: "P30",
          D3: "MAP",
          D5: "TTE_OBS",
        };
        await supabase.from("calibration_evidence").insert({
          athlete_id: athlete.id,
          coach_id: user.id,
          date: new Date().toISOString().split("T")[0],
          source_type: "TEST_PROTOCOL",
          evidence_type: evidenceTypeMap[dayKey] || "P30",
          raw_values: rawData as Json,
          protocol_quality: protocolQuality,
          confidence_evidence: reliability,
          validity: "OK",
          notes: `Semaine de Référence TFCL — ${dayKey}`,
          used_in_calibration: false,
          calibration_weight: 0,
        });
      }

      await loadData();
      clearPersisted();
      onClose();
    } catch (error) {
      console.error("Error saving test data:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSteps = (steps: typeof day.protocol.warmup, sectionKey: string) => (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const stepId = `${sectionKey}-${i}`;
        return (
          <div 
            key={stepId}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              checkedSteps.has(stepId) ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30'
            }`}
          >
            <Checkbox
              id={stepId}
              checked={checkedSteps.has(stepId)}
              onCheckedChange={() => toggleStep(stepId)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {step.durationMin} min
                </Badge>
                <span className="font-medium text-sm">{step.intensityLabel}</span>
              </div>
              {step.notes && (
                <p className="text-xs text-muted-foreground mt-1">{step.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDataInputs = () => {
    const fields: { key: string; label: string; unit: string }[] = [];

    if (dayKey === "D1") {
      fields.push(
        { key: "p30s_avg", label: "P30s avg", unit: "W" },
        { key: "p30s_max", label: "P30s max", unit: "W" },
        { key: "p60s_avg", label: "P60s avg", unit: "W" },
        { key: "p60s_max", label: "P60s max", unit: "W" },
        { key: "hr_max", label: "HR max", unit: "bpm" },
        { key: "rpe", label: "RPE", unit: "/10" }
      );
    } else if (dayKey === "D3") {
      fields.push(
        { key: "map5min_avg", label: "MAP 5min avg", unit: "W" },
        { key: "hr_avg", label: "HR avg", unit: "bpm" },
        { key: "hr_max", label: "HR max", unit: "bpm" },
        { key: "rpe", label: "RPE", unit: "/10" }
      );
    } else if (dayKey === "D5") {
      fields.push(
        { key: "ftp_used", label: "FTP utilisé", unit: "W" },
        { key: "tte_observed", label: "TTE observé", unit: "min" },
        { key: "power_avg", label: "Puissance moy.", unit: "W" },
        { key: "hr_drift", label: "HR drift", unit: "%" },
        { key: "rpe", label: "RPE", unit: "/10" }
      );
    } else if (dayKey === "D6") {
      fields.push(
        { key: "hr_drift", label: "HR drift", unit: "%" },
        { key: "cadence_avg", label: "Cadence moy.", unit: "rpm" },
        { key: "rpe", label: "RPE", unit: "/10" }
      );
    }

    if (fields.length === 0) return null;

    return (
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key} className="text-xs">
              {field.label} <span className="text-muted-foreground">({field.unit})</span>
            </Label>
            <Input
              id={field.key}
              type="number"
              placeholder="—"
              value={formData[field.key] || ""}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className="h-9"
            />
          </div>
        ))}
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    sectionKey, 
    count 
  }: { 
    title: string; 
    sectionKey: string; 
    count: number 
  }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
      className="w-full flex items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors"
    >
      <span>{title} ({count})</span>
      {expandedSection === sectionKey ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[95vh] p-0">
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-left">
                  {day.dayKey} — {day.title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {athlete.name} • ~{day.durationEstimateMin} min
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(95vh-140px)]">
          <div className="p-4 space-y-6">
            {/* Goal */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-sm">{day.goal}</p>
              </CardContent>
            </Card>

            {/* Protocol Steps */}
            {day.protocol.warmup.length > 0 && (
              <div>
                <SectionHeader 
                  title="Échauffement" 
                  sectionKey="warmup" 
                  count={day.protocol.warmup.length} 
                />
                {expandedSection === "warmup" && renderSteps(day.protocol.warmup, "warmup")}
              </div>
            )}

            {day.protocol.main.length > 0 && (
              <div>
                <SectionHeader 
                  title="Bloc principal" 
                  sectionKey="main" 
                  count={day.protocol.main.length} 
                />
                {expandedSection === "main" && renderSteps(day.protocol.main, "main")}
              </div>
            )}

            {day.protocol.recovery.length > 0 && (
              <div>
                <SectionHeader 
                  title="Récupération" 
                  sectionKey="recovery" 
                  count={day.protocol.recovery.length} 
                />
                {expandedSection === "recovery" && renderSteps(day.protocol.recovery, "recovery")}
              </div>
            )}

            <Separator />

            {/* Pacing & Validity */}
            {day.protocol.pacingCadenceRules.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Règles de pacing / cadence</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {day.protocol.pacingCadenceRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day.protocol.homeTrainerNotes && day.protocol.homeTrainerNotes.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <span>🏠</span> Variante Home-Trainer (intérieur)
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {day.protocol.homeTrainerNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">›</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day.protocol.validityCriteria.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Critères de validité
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {day.protocol.validityCriteria.map((criterion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* Data Entry */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Résultats à enregistrer</h4>
              {renderDataInputs()}
            </div>

            <Separator />

            {/* Protocol Quality */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Qualité du protocole</Label>
                <Badge className={getProtocolQualityColor(protocolQuality)}>
                  {protocolQuality}/5 — {getProtocolQualityLabel(protocolQuality)}
                </Badge>
              </div>
              <Slider
                value={[protocolQuality]}
                onValueChange={([v]) => setProtocolQuality(v)}
                min={1}
                max={5}
                step={1}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Impact confiance : {protocolQuality <= 2 ? "−0.10" : protocolQuality === 3 ? "0" : protocolQuality === 4 ? "+0.05" : "+0.10"}
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full gap-2"
            size="lg"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder dans le profil"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
