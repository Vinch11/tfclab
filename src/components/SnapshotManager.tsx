// =============================================
// SNAPSHOT MANAGER - Gestion des snapshots Dan Lorang (Cloud)
// + TTE PRO: LOAD (FTP+TSS7d) / OBSERVED (test)
// + ÉCONOMIE CAP: allure/FC/dérive
// =============================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, Plus, Trash2, Edit, TrendingUp, Brain, Calendar, Pin, HelpCircle, Sparkles } from "lucide-react";
import { DbSnapshot, useCloudData } from "@/hooks/useCloudData";
import { deriveMetabolicProfile, generateLorangInsights, calculateDelta, formatValue } from "@/types/snapshot";
import { computeTTEEffectif, getSourceLabel, formatTTEDisplay } from "@/lib/tteEffectif";
import { 
  parsePaceToSec, 
  formatSecToPace, 
  computeRunEconomyScore, 
  getEconomyLabelStyle,
  getEconomyRaceReadinessBonus
} from "@/lib/runningEconomySnapshot";
import { SnapshotProForm, SnapshotProFormData } from "@/components/SnapshotProForm";
import { toast } from "sonner";

// CAP objectives where running economy is critical
const CAP_OBJECTIVES = [
  "Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong", 
  "TrailMountain", "TrailUltra", "TrailShort", "TriathlonLD", "IM", "Ironman", "70.3"
];

function isRunningObjective(goal: string | null | undefined): boolean {
  if (!goal) return false;
  return CAP_OBJECTIVES.includes(goal);
}

interface SnapshotManagerProps {
  athleteId: string;
  athleteName: string;
  athleteGoal: string;
  activeSnapshotId?: string | null;
  staffMode?: boolean; // ✅ Mode Staff pour VLamax mesurée
}

export function SnapshotManager({ athleteId, athleteName, athleteGoal, activeSnapshotId, staffMode = false }: SnapshotManagerProps) {
  const { getSnapshotsForAthlete, addSnapshot, updateSnapshot, deleteSnapshot, setActiveSnapshot } = useCloudData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isProFormOpen, setIsProFormOpen] = useState(false);
  const [isProLoading, setIsProLoading] = useState(false);

  const [editingSnapshot, setEditingSnapshot] = useState<DbSnapshot | null>(null);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const snapshots = getSnapshotsForAthlete(athleteId);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    cycle_tag: "",
    confidence: "",
    fc_max: "",
    vma: "",
    ftp: "",
    css: "",
    vo2max: "",
    vlamax: "",
    weight_kg: "",
    fat_pct: "",
    pmax_5s: "",

    // ✅ PRO TTE
    tte_mode: "LOAD",
    tss_7d: "",
    tte_observed_min: "",

    // 🏃 ÉCONOMIE CAP
    run_pace_ref: "",        // format "m:ss"
    run_hr_ref: "",          // bpm
    run_duration_min: "",    // min
    run_hr_drift_pct: "",    // %

    coach_notes: "",
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      cycle_tag: "",
      confidence: "",
      fc_max: "",
      vma: "",
      ftp: "",
      css: "",
      vo2max: "",
      vlamax: "",
      weight_kg: "",
      fat_pct: "",
      pmax_5s: "",

      tte_mode: "LOAD",
      tss_7d: "",
      tte_observed_min: "",

      run_pace_ref: "",
      run_hr_ref: "",
      run_duration_min: "",
      run_hr_drift_pct: "",

      coach_notes: "",
    });
  };

  const loadSnapshotToForm = (s: DbSnapshot) => {
    setFormData({
      date: s.date || new Date().toISOString().slice(0, 10),
      cycle_tag: s.cycle_tag || "",
      confidence: s.confidence != null ? String(s.confidence) : "",
      fc_max: s.fc_max != null ? String(s.fc_max) : "",
      vma: s.vma != null ? String(s.vma) : "",
      ftp: s.ftp != null ? String(s.ftp) : "",
      css: s.css != null ? String(s.css) : "",
      vo2max: s.vo2max != null ? String(s.vo2max) : "",
      vlamax: s.vlamax != null ? String(s.vlamax) : "",
      weight_kg: s.weight_kg != null ? String(s.weight_kg) : "",
      fat_pct: s.fat_pct != null ? String(s.fat_pct) : "",
      pmax_5s: s.pmax_5s != null ? String(s.pmax_5s) : "",

      // ✅ PRO TTE
      tte_mode: (s.tte_mode as any) || "LOAD",
      tss_7d: s.tss_7d != null ? String(s.tss_7d) : "",
      tte_observed_min: s.tte_observed_min != null ? String(s.tte_observed_min) : "",

      // 🏃 ÉCONOMIE CAP
      run_pace_ref: s.run_pace_ref_sec_per_km != null ? formatSecToPace(s.run_pace_ref_sec_per_km) : "",
      run_hr_ref: s.run_hr_ref_bpm != null ? String(s.run_hr_ref_bpm) : "",
      run_duration_min: s.run_duration_min != null ? String(s.run_duration_min) : "",
      run_hr_drift_pct: s.run_hr_drift_pct != null ? String(s.run_hr_drift_pct) : "",

      coach_notes: s.coach_notes || "",
    });
  };

  const parseNum = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const handleCreate = async () => {
    // ✅ VLamax uniquement si mode Staff, sinon null (sera calculée)
    const vlamax = staffMode ? parseNum(formData.vlamax) : null;
    const vo2max = parseNum(formData.vo2max);
    const { profile, score } = deriveMetabolicProfile(vlamax, vo2max);

    // Calculer l'économie CAP
    const runPaceSec = parsePaceToSec(formData.run_pace_ref);
    const runHr = parseNum(formData.run_hr_ref);
    const runDuration = parseNum(formData.run_duration_min);
    const runDrift = parseNum(formData.run_hr_drift_pct);
    const fcMax = parseNum(formData.fc_max);
    
    const economyResult = computeRunEconomyScore({
      paceSec: runPaceSec ? Math.round(runPaceSec) : null,
      hr: runHr ? Math.round(runHr) : null,
      durationMin: runDuration ? Math.round(runDuration) : null,
      driftPct: runDrift,
      fcMax: fcMax ? Math.round(fcMax) : null,
    });

    await addSnapshot({
      athlete_id: athleteId,
      coach_id: "", // replaced in hook
      date: formData.date,
      source: staffMode && vlamax ? "staff" : "manual", // ✅ Marquer source "staff" si VLamax mesurée
      cycle_tag: formData.cycle_tag || null,
      confidence: parseNum(formData.confidence),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax, // ✅ Null si mode standard, valeur si mode Staff
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,

      // ✅ PRO TTE
      tte_mode: (formData.tte_mode as any) || "LOAD",
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: parseNum(formData.tte_observed_min) ? Math.round(parseNum(formData.tte_observed_min)!) : null,

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score,
      run_economy_label: economyResult.label,

      metabolic_profile: profile,
      metabolic_score: score,
      coach_notes: formData.coach_notes || null,
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingSnapshot) return;

    // ✅ VLamax uniquement si mode Staff, sinon conserver la valeur existante
    const vlamax = staffMode ? parseNum(formData.vlamax) : editingSnapshot.vlamax;
    const vo2max = parseNum(formData.vo2max);
    const { profile, score } = deriveMetabolicProfile(vlamax, vo2max);

    // Calculer l'économie CAP
    const runPaceSec = parsePaceToSec(formData.run_pace_ref);
    const runHr = parseNum(formData.run_hr_ref);
    const runDuration = parseNum(formData.run_duration_min);
    const runDrift = parseNum(formData.run_hr_drift_pct);
    const fcMax = parseNum(formData.fc_max);
    
    const economyResult = computeRunEconomyScore({
      paceSec: runPaceSec ? Math.round(runPaceSec) : null,
      hr: runHr ? Math.round(runHr) : null,
      durationMin: runDuration ? Math.round(runDuration) : null,
      driftPct: runDrift,
      fcMax: fcMax ? Math.round(fcMax) : null,
    });

    await updateSnapshot(editingSnapshot.id, {
      date: formData.date,
      cycle_tag: formData.cycle_tag || null,
      confidence: parseNum(formData.confidence),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax, // ✅ Conserve valeur existante si mode standard
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,

      // ✅ PRO TTE
      tte_mode: (formData.tte_mode as any) || "LOAD",
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: parseNum(formData.tte_observed_min) ? Math.round(parseNum(formData.tte_observed_min)!) : null,

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score,
      run_economy_label: economyResult.label,

      metabolic_profile: profile,
      metabolic_score: score,
      coach_notes: formData.coach_notes || null,
    });

    setIsEditOpen(false);
    setEditingSnapshot(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce snapshot ?")) {
      await deleteSnapshot(id);
    }
  };

  const openEdit = (s: DbSnapshot) => {
    setEditingSnapshot(s);
    loadSnapshotToForm(s);
    setIsEditOpen(true);
  };

  // =============================================
  // ✅ SNAPSHOT PRO - Handler
  // =============================================
  const handleProSubmit = async (data: SnapshotProFormData) => {
    setIsProLoading(true);
    try {
      const { profile, score } = deriveMetabolicProfile(data.vlamax, null);
      
      // Calculer l'économie CAP si données disponibles
      const runEconomyResult = data.run_pace_ref_sec_per_km 
        ? computeRunEconomyScore({
            paceSec: data.run_pace_ref_sec_per_km,
            hr: null,
            durationMin: null,
            driftPct: data.run_hr_drift_flag ? 5 : null, // estimation si flag
            fcMax: data.fc_max,
          })
        : { score: null, label: "unknown" };

      const newSnapshot = await addSnapshot({
        athlete_id: athleteId,
        coach_id: "", // replaced in hook
        date: data.date,
        source: data.vlamax_is_reference ? "staff" : "pro",
        
        // Général
        sport_main: data.sport_main,
        objectif: data.objectif,
        
        // Références
        weight_kg: data.weight_kg,
        ftp: data.ftp,
        fc_max: data.fc_max,
        vma: data.vma,
        css: data.css,
        pace_threshold_sec_per_km: data.pace_threshold_sec_per_km,
        
        // VLamax PRO
        vlamax: data.vlamax,
        vlamax_source: data.vlamax_source,
        vlamax_protocol: data.vlamax_protocol || null,
        vlamax_is_reference: data.vlamax_is_reference,
        
        // TTE PRO
        tte_mode: data.tte_mode,
        tte_observed_min: data.tte_observed_min,
        tss_7d: data.tss_7d,
        
        // Fatigue
        fatigue_state: data.fatigue_state,
        
        // Économie
        bike_cadence_rpm: data.bike_cadence_rpm,
        bike_hr_drift_flag: data.bike_hr_drift_flag,
        run_pace_ref_sec_per_km: data.run_pace_ref_sec_per_km,
        run_hr_drift_flag: data.run_hr_drift_flag,
        run_economy_score: runEconomyResult.score,
        run_economy_label: runEconomyResult.label,
        
        // Nutrition
        carb_tolerance_band: data.carb_tolerance_band,
        gi_issues_flag: data.gi_issues_flag,
        
        // Profil calculé
        metabolic_profile: profile,
        metabolic_score: score,
        coach_notes: data.coach_notes || null,
        
        // Confiance estimée
        confidence: calculateProConfidence(data),
      });

      if (newSnapshot) {
        // Set as active snapshot
        await setActiveSnapshot(athleteId, newSnapshot.id);
        toast.success("Snapshot PRO créé et défini comme actif !");
      }

      setIsProFormOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la création du Snapshot PRO");
    } finally {
      setIsProLoading(false);
    }
  };

  // Helper: calcule la confiance estimée du snapshot PRO
  const calculateProConfidence = (data: SnapshotProFormData): number => {
    let conf = 0.3; // Base
    if (data.weight_kg && data.ftp) conf += 0.15;
    if (data.tss_7d) conf += 0.1;
    if (data.vlamax_is_reference && data.vlamax) conf += 0.25;
    if (data.tte_mode === "OBSERVED" && data.tte_observed_min) conf += 0.2;
    return Math.min(1, conf);
  };

  const renderForm = () => (
    <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="cycle_tag">Tag de cycle</Label>
          <Input
            id="cycle_tag"
            placeholder="Base1, Build2, Peak..."
            value={formData.cycle_tag}
            onChange={(e) => setFormData({ ...formData, cycle_tag: e.target.value })}
          />
        </div>
      </div>

      {/* VO2max + VLamax section */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vo2max">VO₂max</Label>
          <Input
            id="vo2max"
            type="number"
            step="0.1"
            placeholder="55"
            value={formData.vo2max}
            onChange={(e) => setFormData({ ...formData, vo2max: e.target.value })}
          />
        </div>
        
        {/* ✅ VLamax - UNIQUEMENT visible en mode Staff */}
        {staffMode ? (
          <div>
            <Label htmlFor="vlamax" className="flex items-center gap-1.5">
              <span>VLamax (mesurée)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Mode Staff : VLamax mesurée en laboratoire (lactate). 
                      Cette valeur verrouille l'estimation automatique.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="vlamax"
              type="number"
              step="0.01"
              placeholder="0.40 (lactate)"
              value={formData.vlamax}
              onChange={(e) => setFormData({ ...formData, vlamax: e.target.value })}
              className="border-primary/50"
            />
            <p className="text-xs text-primary mt-1">
              ✓ Verrouille la VLamax (confiance 95%)
            </p>
          </div>
        ) : (
          <div>
            <Label className="text-muted-foreground flex items-center gap-1.5">
              <span>VLamax</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      La VLamax est calculée automatiquement à partir du snapshot.
                      Activez le Mode Staff pour saisir une mesure lactate.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="h-10 px-3 py-2 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground flex items-center">
              Calculée auto
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mode Staff pour VLamax mesurée
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="confidence">Confiance (0-1)</Label>
          <Input
            id="confidence"
            type="number"
            step="0.1"
            min="0"
            max="1"
            placeholder="0.8"
            value={formData.confidence}
            onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="ftp">FTP (W)</Label>
          <Input
            id="ftp"
            type="number"
            placeholder="280"
            value={formData.ftp}
            onChange={(e) => setFormData({ ...formData, ftp: e.target.value })}
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
          <Label htmlFor="fc_max">FC max</Label>
          <Input
            id="fc_max"
            type="number"
            placeholder="190"
            value={formData.fc_max}
            onChange={(e) => setFormData({ ...formData, fc_max: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
          <Label htmlFor="pmax_5s">Pmax 5s (W)</Label>
          <Input
            id="pmax_5s"
            type="number"
            placeholder="1200"
            value={formData.pmax_5s}
            onChange={(e) => setFormData({ ...formData, pmax_5s: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="css">CSS (min/100m)</Label>
          <Input
            id="css"
            type="number"
            step="0.01"
            placeholder="1.40"
            value={formData.css}
            onChange={(e) => setFormData({ ...formData, css: e.target.value })}
          />
        </div>
      </div>

      {/* ✅ TTE PRO */}
      <div className="p-3 rounded-lg border border-border bg-secondary/20">
        <p className="text-sm font-medium mb-2">TTE (PRO) — choisir le module</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Mode TTE</Label>
            <Select value={formData.tte_mode} onValueChange={(v) => setFormData({ ...formData, tte_mode: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOAD">Module A — Estimation via charge (FTP + TSS 7 jours)</SelectItem>
                <SelectItem value="OBSERVED">Module B — TTE observé (test seuil)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tss_7d" className={formData.tte_mode === "LOAD" && !formData.tss_7d ? "text-warning" : ""}>
              TSS 7 jours {formData.tte_mode === "LOAD" && <span className="text-xs">(requis pour Module A)</span>}
            </Label>
            <Input
              id="tss_7d"
              type="number"
              placeholder="ex: 450"
              value={formData.tss_7d}
              onChange={(e) => setFormData({ ...formData, tss_7d: e.target.value })}
              className={formData.tte_mode === "LOAD" && !formData.tss_7d ? "border-warning" : ""}
            />
            {formData.tte_mode === "LOAD" && !formData.tss_7d && (
              <p className="text-xs text-warning mt-1">⚠️ Renseignez TSS 7j pour un TTE fiable</p>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Label htmlFor="tte_observed_min" className={formData.tte_mode === "OBSERVED" && !formData.tte_observed_min ? "text-warning" : ""}>
            TTE observé (min) {formData.tte_mode === "OBSERVED" && <span className="text-xs">(requis pour Module B)</span>}
          </Label>
          <Input
            id="tte_observed_min"
            type="number"
            placeholder="ex: 55"
            value={formData.tte_observed_min}
            onChange={(e) => setFormData({ ...formData, tte_observed_min: e.target.value })}
            className={formData.tte_mode === "OBSERVED" && !formData.tte_observed_min ? "border-warning" : ""}
          />
          {formData.tte_mode === "OBSERVED" && !formData.tte_observed_min && (
            <p className="text-xs text-warning mt-1">⚠️ Renseignez le TTE mesuré pour utiliser le Module B</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Module B recommandé : effort au seuil continu / CP-like. Plus fiable que l'estimation par charge.
          </p>
        </div>

        {/* Preview */}
        <div className="mt-3 text-xs text-muted-foreground">
          {(() => {
            const tte = computeTTEEffectif({
              ftp: parseNum(formData.ftp),
              tss_7d: parseNum(formData.tss_7d),
              tte_mode: formData.tte_mode as any,
              tte_observed_min: parseNum(formData.tte_observed_min),
              objectif: athleteGoal,
            });
            const isIncomplete = (formData.tte_mode === "LOAD" && !formData.tss_7d) || 
                                  (formData.tte_mode === "OBSERVED" && !formData.tte_observed_min);
            return (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded border ${isIncomplete ? "bg-warning/10 border-warning/50" : "bg-background border-border"}`}>
                    TTE final: <b className="text-foreground">{tte.tte_min} min</b>
                  </span>
                  <span className={`px-2 py-1 rounded border ${tte.source === "unknown" ? "bg-warning/10 border-warning/50" : "bg-background border-border"}`}>
                    Source: <b className="text-foreground">{getSourceLabel(tte.source)}</b>
                  </span>
                  <span className={`px-2 py-1 rounded border ${tte.confidence < 0.6 ? "bg-warning/10 border-warning/50" : "bg-background border-border"}`}>
                    Confiance: <b className="text-foreground">{Math.round(tte.confidence * 100)}%</b>
                  </span>
                </div>
                {isIncomplete && (
                  <p className="text-warning text-xs">
                    ⚠️ Données manquantes — le TTE utilise un fallback moins fiable
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 🏃 ÉCONOMIE DE COURSE (CAP) - Module Staff-Grade */}
      {isRunningObjective(athleteGoal) && (
        <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-base font-semibold">🏃 Économie de course (CAP)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-medium mb-2">Économie de course = efficience physiologique</p>
                  <p className="text-xs mb-2">Combien d'effort cardiaque est nécessaire pour maintenir une allure donnée dans la durée.</p>
                  <p className="text-xs">Plus la FC est basse à allure donnée → meilleure économie → performance facilitée.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Description pédagogique */}
          <div className="p-3 rounded-lg bg-background/50 border border-border mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Cette section évalue l'efficience en course à pied : combien d'effort cardiaque est nécessaire pour maintenir une allure donnée dans la durée.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">L'économie de course est un facteur clé</strong> en semi-marathon, marathon, trail et triathlon longue distance.
            </p>
          </div>

          {/* Conseils intégrés */}
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
              💡 Sortie continue 60-90 min idéale
            </span>
            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
              💡 Tempo stable 30-45 min aussi valable
            </span>
            <span className="px-2 py-1 rounded bg-muted/50 text-muted-foreground border border-muted">
              ⚠️ Éviter séances fractionnées/irrégulières
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="run_pace_ref">Allure de référence (min:sec/km)</Label>
              <Input
                id="run_pace_ref"
                type="text"
                placeholder="4:30"
                value={formData.run_pace_ref}
                onChange={(e) => setFormData({ ...formData, run_pace_ref: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Allure tenue de façon stable pendant la séance</p>
            </div>
            <div>
              <Label htmlFor="run_hr_ref">Fréquence cardiaque moyenne (bpm)</Label>
              <Input
                id="run_hr_ref"
                type="number"
                placeholder="148"
                value={formData.run_hr_ref}
                onChange={(e) => setFormData({ ...formData, run_hr_ref: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">FC moyenne observée à cette allure</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <Label htmlFor="run_duration_min">Durée de la séance (min)</Label>
              <Input
                id="run_duration_min"
                type="number"
                placeholder="70"
                value={formData.run_duration_min}
                onChange={(e) => setFormData({ ...formData, run_duration_min: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Durée totale à allure stable</p>
            </div>
            <div>
              <Label htmlFor="run_hr_drift_pct">Dérive cardiaque % (recommandé)</Label>
              <Input
                id="run_hr_drift_pct"
                type="number"
                step="0.1"
                placeholder="4.5"
                value={formData.run_hr_drift_pct}
                onChange={(e) => setFormData({ ...formData, run_hr_drift_pct: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Augmentation FC entre début et fin (ex: +6%)</p>
            </div>
          </div>

          {/* Preview économie avec interprétation */}
          <div className="mt-4 p-3 rounded-lg border border-border bg-background/50">
            {(() => {
              const paceSec = parsePaceToSec(formData.run_pace_ref);
              const hr = parseNum(formData.run_hr_ref);
              const duration = parseNum(formData.run_duration_min);
              const drift = parseNum(formData.run_hr_drift_pct);
              const fcMax = parseNum(formData.fc_max);
              
              const result = computeRunEconomyScore({
                paceSec: paceSec ? Math.round(paceSec) : null,
                hr: hr ? Math.round(hr) : null,
                durationMin: duration ? Math.round(duration) : null,
                driftPct: drift,
                fcMax: fcMax ? Math.round(fcMax) : null,
              });
              
              const style = getEconomyLabelStyle(result.label);
              
              if (result.score === null) {
                return (
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground">
                      Score non calculé — renseignez allure + FC pour activer l'analyse
                    </span>
                  </div>
                );
              }
              
              // Bonus/Malus pour Race Readiness
              const bonusInfo = getEconomyRaceReadinessBonus(result.score, result.label);
              
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 items-center justify-center">
                    <div className={`px-4 py-2 rounded-lg ${style.bg}`}>
                      <span className={`text-2xl font-bold ${style.text}`}>{result.score}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    <div className={`px-3 py-2 rounded-lg ${style.bg}`}>
                      <span className="text-lg">{style.icon}</span>
                      <span className={`ml-2 font-medium ${style.text}`}>{style.labelFr}</span>
                    </div>
                  </div>
                  
                  {/* Interprétation du score */}
                  <div className="text-center">
                    {result.score >= 75 && (
                      <p className="text-xs text-green-600">
                        ✅ Économie excellente — Allure durable, faible dérive cardiaque
                        <br/><strong>→ BONUS important sur Race Readiness CAP</strong>
                      </p>
                    )}
                    {result.score >= 55 && result.score < 75 && (
                      <p className="text-xs text-blue-600">
                        ✔️ Bonne économie — Base solide mais perfectible
                        <br/><strong>→ BONUS modéré sur Race Readiness CAP</strong>
                      </p>
                    )}
                    {result.score < 55 && (
                      <p className="text-xs text-orange-600">
                        ⚠️ Économie fragile — Coût cardiaque élevé, dérive importante
                        <br/><strong>→ MALUS sur Race Readiness CAP</strong>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground border-t border-border pt-2">
                    Impact Race Readiness: <span className={bonusInfo.bonus >= 0 ? "text-green-600" : "text-orange-600"}>
                      {bonusInfo.description}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Méthodologie */}
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">📊 Méthodologie:</strong> Ce score est basé sur des données terrain.
              Il ne remplace pas un test laboratoire mais permet une analyse fiable pour la prise de décision coach.
              La précision dépend directement de la qualité des données saisies.
            </p>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="coach_notes">Notes coach</Label>
        <Textarea
          id="coach_notes"
          placeholder="Observations, ressenti, contexte..."
          value={formData.coach_notes}
          onChange={(e) => setFormData({ ...formData, coach_notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  const renderSnapshotCard = (s: DbSnapshot) => {
    const { profile, score } = deriveMetabolicProfile(s.vlamax ?? null, s.vo2max ?? null);

    const tteEff = computeTTEEffectif({
      ftp: s.ftp ?? null,
      tss_7d: s.tss_7d ?? null,
      tte_mode: (s.tte_mode as any) ?? "LOAD",
      tte_observed_min: s.tte_observed_min ?? null,
      objectif: athleteGoal,
    });

    const insights = generateLorangInsights(
      {
        id: s.id,
        athlete_id: s.athlete_id,
        coach_id: s.coach_id,
        date: s.date,
        source: s.source as "manual" | "nolio" | "import",
        cycle_tag: s.cycle_tag ?? undefined,
        confidence: s.confidence ?? undefined,
        vlamax: s.vlamax ?? undefined,
        vo2max: s.vo2max ?? undefined,
        ftp: s.ftp ?? undefined,
        vma: s.vma ?? undefined,
        weight_kg: s.weight_kg ?? undefined,
        coach_notes: s.coach_notes ?? undefined,
      },
      athleteGoal,
    );

    const isActive = s.id === activeSnapshotId;

    return (
      <Card key={s.id} className={`border-border/50 ${isActive ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {s.date}
                {s.cycle_tag && (
                  <Badge variant="secondary" className="ml-2">
                    {s.cycle_tag}
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="default" className="ml-2">
                    <Pin className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </CardTitle>

              <p className="text-sm text-muted-foreground mt-1">
                Profil: <span className="font-medium text-foreground">{profile}</span>
                {score != null && ` (score ${score}/100)`}
              </p>

              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-background border border-border">
                  TTE: <b className="text-foreground">{tteEff.tte_min} min</b>
                </span>
                <span className="px-2 py-1 rounded bg-background border border-border">
                  Source TTE: <b className="text-foreground">{getSourceLabel(tteEff.source)}</b>
                </span>
                <span className="px-2 py-1 rounded bg-background border border-border">
                  Confiance TTE: <b className="text-foreground">{Math.round(tteEff.confidence * 100)}%</b>
                </span>
              </div>
            </div>

            <div className="flex gap-1">
              <Button
                size="icon"
                variant={isActive ? "secondary" : "ghost"}
                onClick={() => setActiveSnapshot(athleteId, isActive ? null : s.id)}
                title={isActive ? "Retirer comme actif" : "Définir comme actif"}
              >
                <Pin className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">VO₂max:</span>{" "}
              <span className="font-medium">{formatValue(s.vo2max)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">VLamax:</span>{" "}
              <span className="font-medium">{formatValue(s.vlamax)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">FTP:</span>{" "}
              <span className="font-medium">{formatValue(s.ftp, "W")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">VMA:</span>{" "}
              <span className="font-medium">{formatValue(s.vma, "km/h")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">TSS 7d:</span>{" "}
              <span className={`font-medium ${!s.tss_7d ? "text-warning" : ""}`}>
                {s.tss_7d ? formatValue(s.tss_7d) : "—"}
              </span>
            </div>
          </div>

          {/* 🏃 Économie CAP (si données disponibles) */}
          {(s.run_economy_score != null || s.run_pace_ref_sec_per_km != null) && (
            <div className="p-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <p className="text-xs font-medium text-blue-600 mb-2">🏃 Économie CAP</p>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Allure:</span>{" "}
                  <span className="font-medium">
                    {s.run_pace_ref_sec_per_km ? formatSecToPace(s.run_pace_ref_sec_per_km) + "/km" : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">FC:</span>{" "}
                  <span className="font-medium">{s.run_hr_ref_bpm ? s.run_hr_ref_bpm + " bpm" : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Durée:</span>{" "}
                  <span className="font-medium">{s.run_duration_min ? s.run_duration_min + " min" : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dérive:</span>{" "}
                  <span className="font-medium">{s.run_hr_drift_pct != null ? s.run_hr_drift_pct + "%" : "—"}</span>
                </div>
                <div>
                  {(() => {
                    const label = (s.run_economy_label as any) || "unknown";
                    const style = getEconomyLabelStyle(label);
                    return (
                      <span className={`px-2 py-0.5 rounded text-xs ${style.bg} ${style.text}`}>
                        {style.icon} {s.run_economy_score ?? "—"}/100
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <Accordion type="single" collapsible>
            <AccordionItem value="insights" className="border-none">
              <AccordionTrigger className="py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Lecture Dan Lorang
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-sm">
                  {insights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            {s.coach_notes && (
              <AccordionItem value="notes" className="border-none">
                <AccordionTrigger className="py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Notes coach
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{s.coach_notes}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  const renderComparison = () => {
    const A = snapshots.find((s) => s.id === compareA);
    const B = snapshots.find((s) => s.id === compareB);

    if (!A || !B) return <p className="text-muted-foreground">Sélectionnez deux snapshots à comparer.</p>;

    const tteA = computeTTEEffectif({
      ftp: A.ftp ?? null,
      tss_7d: A.tss_7d ?? null,
      tte_mode: (A.tte_mode as any) ?? "LOAD",
      tte_observed_min: A.tte_observed_min ?? null,
      objectif: athleteGoal,
    });

    const tteB = computeTTEEffectif({
      ftp: B.ftp ?? null,
      tss_7d: B.tss_7d ?? null,
      tte_mode: (B.tte_mode as any) ?? "LOAD",
      tte_observed_min: B.tte_observed_min ?? null,
      objectif: athleteGoal,
    });

    const rows = [
      { label: "VO₂max", a: A.vo2max, b: B.vo2max },
      { label: "VLamax", a: A.vlamax, b: B.vlamax },
      { label: "FTP (W)", a: A.ftp, b: B.ftp },
      { label: "VMA (km/h)", a: A.vma, b: B.vma },
      { label: "Poids (kg)", a: A.weight_kg, b: B.weight_kg },
      { label: "TTE (min)", a: tteA.tte_min, b: tteB.tte_min },
      { label: "Confiance", a: A.confidence, b: B.confidence },
    ];

    const insightsB = generateLorangInsights(
      {
        id: B.id,
        athlete_id: B.athlete_id,
        coach_id: B.coach_id,
        date: B.date,
        source: B.source as "manual" | "nolio" | "import",
        vlamax: B.vlamax ?? undefined,
        vo2max: B.vo2max ?? undefined,
        ftp: B.ftp ?? undefined,
        vma: B.vma ?? undefined,
        weight_kg: B.weight_kg ?? undefined,
        confidence: B.confidence ?? undefined,
        coach_notes: B.coach_notes ?? undefined,
      },
      athleteGoal,
    );

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Variable</th>
                <th className="text-center py-2">A ({A.date})</th>
                <th className="text-center py-2">B ({B.date})</th>
                <th className="text-center py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/30">
                  <td className="py-2">{row.label}</td>
                  <td className="text-center">{formatValue(row.a as any)}</td>
                  <td className="text-center">{formatValue(row.b as any)}</td>
                  <td className="text-center font-medium">{calculateDelta(row.a as any, row.b as any)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Lecture Dan Lorang (sur B)
          </h4>
          <ul className="space-y-1 text-sm">
            {insightsB.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Snapshots — {athleteName}
          </CardTitle>

          <div className="flex gap-2">
            {snapshots.length >= 2 && (
              <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Comparer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Comparaison de snapshots</DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Snapshot A (avant)</Label>
                      <Select value={compareA} onValueChange={setCompareA}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.date} {s.cycle_tag && `• ${s.cycle_tag}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Snapshot B (après)</Label>
                      <Select value={compareB} onValueChange={setCompareB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.date} {s.cycle_tag && `• ${s.cycle_tag}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {renderComparison()}
                </DialogContent>
              </Dialog>
            )}

            {/* ✅ SNAPSHOT PRO BUTTON */}
            <Dialog open={isProFormOpen} onOpenChange={setIsProFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" className="bg-gradient-to-r from-primary to-primary/80">
                  <Sparkles className="h-4 w-4 mr-2" />
                  + Snapshot PRO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Snapshot PRO (Staff-Grade)
                  </DialogTitle>
                </DialogHeader>
                <SnapshotProForm
                  athleteName={athleteName}
                  onSubmit={handleProSubmit}
                  onCancel={() => setIsProFormOpen(false)}
                  isLoading={isProLoading}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Snapshot rapide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Créer un snapshot</DialogTitle>
                </DialogHeader>
                {renderForm()}
                <Button onClick={handleCreate} className="mt-4">
                  Créer
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Un snapshot = une photo du profil physiologique à un moment clé. Base de l'analyse Dan Lorang.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun snapshot pour cet athlète.</p>
            <p className="text-sm">Créez un snapshot après un test clé ou à la fin d'un cycle.</p>
          </div>
        ) : (
          snapshots.map(renderSnapshotCard)
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le snapshot</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <Button onClick={handleUpdate} className="mt-4">
            Sauvegarder
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
