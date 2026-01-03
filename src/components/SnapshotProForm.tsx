// =============================================
// SNAPSHOT PRO FORM - Formulaire staff-grade complet
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Save, X, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// =============================================
// TYPES
// =============================================

export interface SnapshotProFormData {
  // Général
  date: string;
  sport_main: "bike" | "run" | "tri";
  objectif: "Sprint" | "Olympic" | "703" | "IM" | "Marathon" | "Other";
  
  // Références
  weight_kg: number | null;
  ftp: number | null;
  pace_threshold_sec_per_km: number | null;
  fc_max: number | null;
  vma: number | null;
  css: number | null;
  
  // VLamax PRO
  vlamax: number | null;
  vlamax_source: "lab" | "field" | "estimated" | null;
  vlamax_protocol: string;
  vlamax_is_reference: boolean;
  
  // TTE PRO
  tte_mode: "OBSERVED" | "LOAD";
  tte_observed_min: number | null;
  tss_7d: number | null;
  
  // Charge & fatigue
  fatigue_state: "ok" | "uncertain" | "high";
  
  // Économie vélo
  bike_cadence_rpm: number | null;
  bike_hr_drift_flag: boolean;
  
  // Économie CAP
  run_pace_ref_sec_per_km: number | null;
  run_hr_drift_flag: boolean;
  
  // Nutrition
  carb_tolerance_band: "<60" | "60-80" | "80-100" | ">100" | null;
  gi_issues_flag: boolean;
  
  // Notes
  coach_notes: string;
}

interface SnapshotProFormProps {
  athleteName: string;
  onSubmit: (data: SnapshotProFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<SnapshotProFormData>;
  isLoading?: boolean;
}

// =============================================
// HELPERS
// =============================================

function parsePaceToSec(pace: string): number | null {
  if (!pace.trim()) return null;
  const parts = pace.split(":");
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const sec = parseInt(parts[1], 10);
    if (!isNaN(min) && !isNaN(sec)) {
      return min * 60 + sec;
    }
  }
  return null;
}

function formatSecToPace(sec: number | null): string {
  if (sec == null) return "";
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, "0")}`;
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// =============================================
// COMPOSANT
// =============================================

export function SnapshotProForm({ 
  athleteName, 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false 
}: SnapshotProFormProps) {
  // État formulaire
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    sport_main: initialData?.sport_main || "bike" as const,
    objectif: initialData?.objectif || "703" as const,
    
    weight_kg: initialData?.weight_kg != null ? String(initialData.weight_kg) : "",
    ftp: initialData?.ftp != null ? String(initialData.ftp) : "",
    pace_threshold: initialData?.pace_threshold_sec_per_km 
      ? formatSecToPace(initialData.pace_threshold_sec_per_km) 
      : "",
    fc_max: initialData?.fc_max != null ? String(initialData.fc_max) : "",
    vma: initialData?.vma != null ? String(initialData.vma) : "",
    css: initialData?.css != null ? String(initialData.css) : "",
    
    vlamax: initialData?.vlamax != null ? String(initialData.vlamax) : "",
    vlamax_source: initialData?.vlamax_source || null,
    vlamax_protocol: initialData?.vlamax_protocol || "",
    vlamax_is_reference: initialData?.vlamax_is_reference || false,
    
    tte_mode: initialData?.tte_mode || "LOAD" as const,
    tte_observed_min: initialData?.tte_observed_min != null ? String(initialData.tte_observed_min) : "",
    tss_7d: initialData?.tss_7d != null ? String(initialData.tss_7d) : "",
    
    fatigue_state: initialData?.fatigue_state || "ok" as const,
    
    bike_cadence_rpm: initialData?.bike_cadence_rpm != null ? String(initialData.bike_cadence_rpm) : "",
    bike_hr_drift_flag: initialData?.bike_hr_drift_flag || false,
    
    run_pace_ref: initialData?.run_pace_ref_sec_per_km 
      ? formatSecToPace(initialData.run_pace_ref_sec_per_km) 
      : "",
    run_hr_drift_flag: initialData?.run_hr_drift_flag || false,
    
    carb_tolerance_band: initialData?.carb_tolerance_band || null,
    gi_issues_flag: initialData?.gi_issues_flag || false,
    
    coach_notes: initialData?.coach_notes || "",
  });

  // =============================================
  // PREVIEW LIVE (Sorties)
  // =============================================
  const preview = useMemo(() => {
    const weight = parseNum(formData.weight_kg);
    const ftp = parseNum(formData.ftp);
    const vlamax = parseNum(formData.vlamax);
    const tteObs = parseNum(formData.tte_observed_min);
    const tss7d = parseNum(formData.tss_7d);

    // FTP/kg
    const ftpKg = weight && ftp ? (ftp / weight).toFixed(2) : null;

    // VLamax effectif
    let vlamaxEffectif: string | null = null;
    if (formData.vlamax_is_reference && vlamax != null) {
      vlamaxEffectif = `${vlamax.toFixed(2)} (référence)`;
    } else if (vlamax != null) {
      vlamaxEffectif = `${vlamax.toFixed(2)} (non verrouillée)`;
    }

    // TTE effectif
    let tteEffectif: string | null = null;
    if (formData.tte_mode === "OBSERVED" && tteObs != null) {
      tteEffectif = `${tteObs} min (observé)`;
    } else if (tss7d != null) {
      tteEffectif = `~${Math.round(40 + Math.log(tss7d + 1) * 5)} min (estimé via TSS)`;
    }

    // Confiance estimée (heuristique simple)
    let confidence = 0;
    if (weight && ftp) confidence += 20;
    if (tss7d) confidence += 20;
    if (formData.vlamax_is_reference && vlamax) confidence += 30;
    if (formData.tte_mode === "OBSERVED" && tteObs) confidence += 30;
    confidence = Math.min(100, confidence);

    return { ftpKg, vlamaxEffectif, tteEffectif, confidence };
  }, [formData]);

  // =============================================
  // VALIDATION & SUBMIT
  // =============================================
  const handleSubmit = async () => {
    // Warnings (non bloquants)
    const warnings: string[] = [];
    if (!formData.weight_kg.trim()) warnings.push("Poids manquant");
    if (!formData.ftp.trim()) warnings.push("FTP manquant");

    if (warnings.length > 0) {
      toast.warning(`Données incomplètes: ${warnings.join(", ")}`);
    }

    const data: SnapshotProFormData = {
      date: formData.date,
      sport_main: formData.sport_main,
      objectif: formData.objectif,
      
      weight_kg: parseNum(formData.weight_kg),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      pace_threshold_sec_per_km: parsePaceToSec(formData.pace_threshold),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      vma: parseNum(formData.vma),
      css: parseNum(formData.css),
      
      vlamax: parseNum(formData.vlamax),
      vlamax_source: formData.vlamax_source,
      vlamax_protocol: formData.vlamax_protocol,
      vlamax_is_reference: formData.vlamax_is_reference,
      
      tte_mode: formData.tte_mode,
      tte_observed_min: parseNum(formData.tte_observed_min) 
        ? Math.round(parseNum(formData.tte_observed_min)!) 
        : null,
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      
      fatigue_state: formData.fatigue_state,
      
      bike_cadence_rpm: parseNum(formData.bike_cadence_rpm) 
        ? Math.round(parseNum(formData.bike_cadence_rpm)!) 
        : null,
      bike_hr_drift_flag: formData.bike_hr_drift_flag,
      
      run_pace_ref_sec_per_km: parsePaceToSec(formData.run_pace_ref),
      run_hr_drift_flag: formData.run_hr_drift_flag,
      
      carb_tolerance_band: formData.carb_tolerance_band,
      gi_issues_flag: formData.gi_issues_flag,
      
      coach_notes: formData.coach_notes,
    };

    await onSubmit(data);
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Staff-Grade
          </Badge>
          <span className="text-sm text-muted-foreground">
            Snapshot PRO pour {athleteName}
          </span>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["general", "refs", "vlamax", "tte"]} className="w-full">
        {/* SECTION 1 — Général */}
        <AccordionItem value="general">
          <AccordionTrigger className="text-sm font-medium">
            1. Général
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Sport principal</Label>
                <Select 
                  value={formData.sport_main} 
                  onValueChange={(v) => setFormData({ ...formData, sport_main: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bike">🚴 Vélo</SelectItem>
                    <SelectItem value="run">🏃 Course</SelectItem>
                    <SelectItem value="tri">🏊 Triathlon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objectif</Label>
                <Select 
                  value={formData.objectif} 
                  onValueChange={(v) => setFormData({ ...formData, objectif: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sprint">Sprint</SelectItem>
                    <SelectItem value="Olympic">Olympic</SelectItem>
                    <SelectItem value="703">70.3 / Half</SelectItem>
                    <SelectItem value="IM">Ironman</SelectItem>
                    <SelectItem value="Marathon">Marathon</SelectItem>
                    <SelectItem value="Other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 2 — Références */}
        <AccordionItem value="refs">
          <AccordionTrigger className="text-sm font-medium">
            2. Références physiologiques
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <Label htmlFor="weight_kg">Poids (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ftp">FTP vélo (W)</Label>
                <Input
                  id="ftp"
                  type="number"
                  placeholder="280"
                  value={formData.ftp}
                  onChange={(e) => setFormData({ ...formData, ftp: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pace_threshold">Allure seuil CAP (m:ss)</Label>
                <Input
                  id="pace_threshold"
                  placeholder="4:30"
                  value={formData.pace_threshold}
                  onChange={(e) => setFormData({ ...formData, pace_threshold: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fc_max">FC max (bpm)</Label>
                <Input
                  id="fc_max"
                  type="number"
                  placeholder="190"
                  value={formData.fc_max}
                  onChange={(e) => setFormData({ ...formData, fc_max: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vma">VMA (km/h)</Label>
                <Input
                  id="vma"
                  type="number"
                  step="0.1"
                  placeholder="18"
                  value={formData.vma}
                  onChange={(e) => setFormData({ ...formData, vma: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="css">CSS (sec/100m)</Label>
                <Input
                  id="css"
                  type="number"
                  step="1"
                  placeholder="95"
                  value={formData.css}
                  onChange={(e) => setFormData({ ...formData, css: e.target.value })}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 3 — VLamax PRO */}
        <AccordionItem value="vlamax">
          <AccordionTrigger className="text-sm font-medium">
            3. VLamax (Référence)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="vlamax">VLamax</Label>
                  <Input
                    id="vlamax"
                    type="number"
                    step="0.01"
                    placeholder="0.40"
                    value={formData.vlamax}
                    onChange={(e) => setFormData({ ...formData, vlamax: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Select 
                    value={formData.vlamax_source || ""} 
                    onValueChange={(v) => setFormData({ ...formData, vlamax_source: v as any || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab">🔬 Laboratoire (lactate)</SelectItem>
                      <SelectItem value="field">🏃 Test terrain</SelectItem>
                      <SelectItem value="estimated">📊 Estimée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vlamax_protocol">Protocole</Label>
                  <Input
                    id="vlamax_protocol"
                    placeholder="Sprint 15s, 400m all-out..."
                    value={formData.vlamax_protocol}
                    onChange={(e) => setFormData({ ...formData, vlamax_protocol: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <Switch
                  id="vlamax_is_reference"
                  checked={formData.vlamax_is_reference}
                  onCheckedChange={(v) => setFormData({ ...formData, vlamax_is_reference: v })}
                />
                <Label htmlFor="vlamax_is_reference" className="flex-1 cursor-pointer">
                  <span className="font-medium">VLamax = mesure de référence (prioritaire)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Si activé, l'app utilisera cette VLamax comme référence et ne la recalculera pas automatiquement.
                          Confiance 95% si source labo, 85% si terrain.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 4 — TTE PRO */}
        <AccordionItem value="tte">
          <AccordionTrigger className="text-sm font-medium">
            4. TTE (PRO)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mode TTE</Label>
                  <Select 
                    value={formData.tte_mode} 
                    onValueChange={(v) => setFormData({ ...formData, tte_mode: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOAD">📊 Estimation via charge (TSS 7j)</SelectItem>
                      <SelectItem value="OBSERVED">⏱️ TTE observé (test seuil)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.tte_mode === "OBSERVED" && (
                  <div>
                    <Label htmlFor="tte_observed_min">TTE observé (min)</Label>
                    <Input
                      id="tte_observed_min"
                      type="number"
                      placeholder="45"
                      value={formData.tte_observed_min}
                      onChange={(e) => setFormData({ ...formData, tte_observed_min: e.target.value })}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="tss_7d">TSS 7 jours</Label>
                  <Input
                    id="tss_7d"
                    type="number"
                    placeholder="450"
                    value={formData.tss_7d}
                    onChange={(e) => setFormData({ ...formData, tss_7d: e.target.value })}
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⚡ Observé = priorité absolue. Sinon estimation via charge 7 jours.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 5 — Charge & fatigue */}
        <AccordionItem value="fatigue">
          <AccordionTrigger className="text-sm font-medium">
            5. Charge & fatigue
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-2">
              <Label>État de fatigue</Label>
              <Select 
                value={formData.fatigue_state} 
                onValueChange={(v) => setFormData({ ...formData, fatigue_state: v as any })}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">✅ OK - Récupéré</SelectItem>
                  <SelectItem value="uncertain">⚠️ Incertain - À surveiller</SelectItem>
                  <SelectItem value="high">🔴 Élevée - Fatigue marquée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 6 — Économie & dérive */}
        <AccordionItem value="economy">
          <AccordionTrigger className="text-sm font-medium">
            6. Économie & dérive (facultatif)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {/* Vélo */}
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <p className="text-xs font-medium mb-2">🚴 Vélo</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bike_cadence">Cadence dominante (rpm)</Label>
                    <Input
                      id="bike_cadence"
                      type="number"
                      placeholder="90"
                      value={formData.bike_cadence_rpm}
                      onChange={(e) => setFormData({ ...formData, bike_cadence_rpm: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="bike_hr_drift"
                      checked={formData.bike_hr_drift_flag}
                      onCheckedChange={(v) => setFormData({ ...formData, bike_hr_drift_flag: v })}
                    />
                    <Label htmlFor="bike_hr_drift" className="cursor-pointer text-sm">
                      Dérive FC observée
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Course */}
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <p className="text-xs font-medium mb-2">🏃 Course</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="run_pace_ref">Allure à ~75% FCmax (m:ss)</Label>
                    <Input
                      id="run_pace_ref"
                      placeholder="5:30"
                      value={formData.run_pace_ref}
                      onChange={(e) => setFormData({ ...formData, run_pace_ref: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="run_hr_drift"
                      checked={formData.run_hr_drift_flag}
                      onCheckedChange={(v) => setFormData({ ...formData, run_hr_drift_flag: v })}
                    />
                    <Label htmlFor="run_hr_drift" className="cursor-pointer text-sm">
                      Dérive FC observée
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 7 — Nutrition */}
        <AccordionItem value="nutrition">
          <AccordionTrigger className="text-sm font-medium">
            7. Nutrition
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label>Bande tolérance glucides (g/h)</Label>
                <Select 
                  value={formData.carb_tolerance_band || ""} 
                  onValueChange={(v) => setFormData({ ...formData, carb_tolerance_band: v as any || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non renseigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<60">&lt;60 g/h (faible)</SelectItem>
                    <SelectItem value="60-80">60-80 g/h (modéré)</SelectItem>
                    <SelectItem value="80-100">80-100 g/h (élevé)</SelectItem>
                    <SelectItem value=">100">&gt;100 g/h (très élevé)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="gi_issues"
                  checked={formData.gi_issues_flag}
                  onCheckedChange={(v) => setFormData({ ...formData, gi_issues_flag: v })}
                />
                <Label htmlFor="gi_issues" className="cursor-pointer">
                  Antécédents GI / hypo
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 8 — Notes */}
        <AccordionItem value="notes">
          <AccordionTrigger className="text-sm font-medium">
            8. Notes coach
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-2">
              <Textarea
                placeholder="Observations, contexte, historique..."
                value={formData.coach_notes}
                onChange={(e) => setFormData({ ...formData, coach_notes: e.target.value })}
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* PREVIEW LIVE */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Aperçu des sorties
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">FTP/kg</p>
              <p className="font-medium">{preview.ftpKg ? `${preview.ftpKg} W/kg` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VLamax effectif</p>
              <p className="font-medium">{preview.vlamaxEffectif || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TTE effectif</p>
              <p className="font-medium">{preview.tteEffectif || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confiance estimée</p>
              <div className="flex items-center gap-1">
                <span className={`font-medium ${
                  preview.confidence >= 70 ? "text-green-600" :
                  preview.confidence >= 40 ? "text-amber-600" :
                  "text-red-600"
                }`}>
                  {preview.confidence}%
                </span>
                {preview.confidence < 50 && (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Enregistrement..." : "Enregistrer Snapshot PRO"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
      </div>
    </div>
  );
}
