import { staffLactateUpdate } from "@/lib/vlamaxEvidence";
// =============================================
// PROFIL PHYSIOLOGIQUE MANAGER - Gestion des Profils Two For Coaching Lab™ (Cloud)
// Anciennement "Snapshot Manager"
// + TTE PRO: LOAD (FTP+TSS7d) / OBSERVED (test)
// + ÉCONOMIE CAP: allure/FC/dérive
// =============================================

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { PROFILE_TERMINOLOGY, PROFILE_DEFINITION, PROFILE_SAFEGUARD } from "@/lib/v2/profileTerminology";
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
import { Camera, Plus, Trash2, Edit, TrendingUp, Brain, Pin, HelpCircle, Beaker, Bike, Battery } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { LabImportDialog } from "@/components/LabImportDialog";
import { NolioImporter, NolioImportResult } from "@/components/NolioImporter";
import { NolioPeriodRecords } from "@/components/NolioPeriodRecords";
import { mergeEmptyFields, type SnapshotRecordFields } from "@/lib/nolioV2Records";
import { DbSnapshot, useCloudData } from "@/contexts/CloudDataContext";
import { deriveMetabolicProfile, generateTwoForCoachingInsights, calculateDelta, formatValue } from "@/types/snapshot";
import { computeTTEEffectif } from "@/engines/diagnostic";
import { 
  parsePaceToSec, 
  formatSecToPace, 
  computeRunEconomyScore, 
} from "@/lib/runningEconomySnapshot";
import { usePersistedFormState, usePersistedDialogState } from "@/hooks/usePersistedFormState";
import { pickReferenceSnapshot } from "@/lib/referenceSnapshot";
import { SnapshotTestDays } from "@/components/SnapshotTestDays";
import { checkSnapshotForm, readVo2max, snapshotConfidence, snapshotProtocolQuality, VO2MAX_ORIGIN_OPTIONS, writeVo2max, type Vo2maxOrigin } from "@/lib/snapshotTestDays";
import { NolioRestingHrHint } from "@/components/NolioRestingHrHint";
import { NolioFillAssistant } from "@/components/NolioFillAssistant";
import { SnapshotFillMenu } from "@/components/SnapshotFillMenu";
import { SnapshotSheet } from "@/components/SnapshotSheet";
import type { SheetBlockId, SheetSnapshot } from "@/lib/snapshotSheet";
import { fillEmpty, labValuesToForm, type FillSource } from "@/lib/snapshotFill";
import { CriticalEffortsPanel } from "@/components/CriticalEffortsPanel";
import { parseStoredDurability, withDurability } from "@/lib/durability/longSessionDurability";
import { criticalEnvelope, parseStoredCriticalMetrics } from "@/lib/criticalMetrics";
import { ThresholdOriginSelect } from "@/components/ThresholdOriginSelect";
import { readThresholdOrigin, withThresholdOrigin, type ThresholdOrigin } from "@/lib/zones/thresholdOrigin";

// CAP objectives where running economy is critical
const CAP_OBJECTIVES = [
  "Marathon", "marathon", "Semi", "semi", "SemiMarathon", "Course", "Trail", "TrailCourt", "TrailLong",
  "TrailMountain", "TrailUltra", "TrailShort", "TriathlonLD", "TriathlonOD",
  "IM", "Ironman", "ironman", "70.3", "703", "olympic", "OD"
];

function isRunningObjective(goal: string | null | undefined): boolean {
  if (!goal) return false;
  return CAP_OBJECTIVES.includes(goal);
}

// Triathlon objectives where bike vs run comparison is relevant
const TRIATHLON_OBJECTIVES = ["IM", "Ironman", "70.3", "703", "TriathlonLD", "TriathlonOD"];

function isTriathlonObjective(goal: string | null | undefined): boolean {
  if (!goal) return false;
  return TRIATHLON_OBJECTIVES.includes(goal);
}

interface SnapshotManagerProps {
  athleteId: string;
  athleteName: string;
  athleteGoal: string;
  activeSnapshotId?: string | null;
  staffMode?: boolean; // ✅ Mode Staff pour VLamax mesurée
}

// Initial form state - used for reset
const INITIAL_FORM_STATE = {
  date: new Date().toISOString().slice(0, 10),
  cycle_tag: "",
  sport_main: "", // "" = auto (déduit de l'objectif), "run"/"bike"/"triathlon"/"swim"
  confidence: "",
  fc_max: "",
  fc_repos: "",
  vma: "",
  ftp: "",
  ftp_origin: "" as ThresholdOrigin | "",
  css: "",
  vo2max: "",
  vo2max_origin: "" as Vo2maxOrigin | "",
  vlamax: "",
  vlamax_run: "", // ✅ VLamax CAP
  weight_kg: "",
  fat_pct: "",
  pmax_5s: "",
  // ✅ VLamax Bike V2 Enhanced - Power indices
  p30s_w: "",
  p60s_w: "",
  map5min_w: "",
  protocol_quality: "3",
  tte_mode: "LOAD",
  tss_7d: "",
  tte_observed_min: "",
  tte_observed_min_run: "",
  critical_metrics: "",
  // ⚡ État de fatigue au moment du snapshot
  fatigue_state: "ok",
  // 🏃 Économie CAP
  run_pace_ref: "",
  run_hr_ref: "",
  run_duration_min: "",
  run_hr_drift_pct: "",
  run_economy_score_manual: "",
  // 🏃 VLamax CAP (données pour estimation)
  pace_threshold: "",
  pace_threshold_origin: "" as ThresholdOrigin | "",
  sprint_15s: "",
  run_power_max: "",
  run_power_threshold: "",
  run_power_1s: "",
  run_power_5s: "",
  run_power_30s: "",
  run_power_60s: "",
  run_power_5min: "",
  coach_notes: "",
};

// Fatigue state options
const FATIGUE_STATES = [
  { value: "fresh", label: "Frais", description: "Bien récupéré, prêt pour intensité", color: "text-green-500" },
  { value: "ok", label: "Normal", description: "État standard, entraînement normal", color: "text-blue-500" },
  { value: "fatigued", label: "Fatigué", description: "Fatigue perceptible, adapter la charge", color: "text-amber-500" },
  { value: "high", label: "Très fatigué", description: "Fatigue élevée, repos conseillé", color: "text-orange-500" },
  { value: "injured", label: "Blessé", description: "Blessure active, pas d'entraînement", color: "text-red-500" },
];

export function SnapshotManager({ athleteId, athleteName, athleteGoal, activeSnapshotId, staffMode = false }: SnapshotManagerProps) {
  const navigate = useNavigate();
  const { getSnapshotsForAthlete, addSnapshot, updateSnapshot, deleteSnapshot, setActiveSnapshot } = useCloudData();

  // Use persisted dialog states to survive page minimize/restore
  const [isCreateOpen, setIsCreateOpen] = usePersistedDialogState(`snapshot-create-${athleteId}`, false);
  const [isEditOpen, setIsEditOpen] = usePersistedDialogState(`snapshot-edit-${athleteId}`, false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  /** Bloc de la fiche à ouvrir dans le formulaire (« Modifier ce bloc »). */
  const [editBlock, setEditBlock] = useState<SheetBlockId | null>(null);

  // Persist the editing snapshot ID to restore state after page navigation
  const [editingSnapshotId, setEditingSnapshotId] = usePersistedFormState<{ id: string | null }>(
    `snapshot-editing-id-${athleteId}`,
    { id: null }
  );
  
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const snapshots = getSnapshotsForAthlete(athleteId);
  /** Champ → source du remplissage (Days, Nolio, Labo) : badge affiché dans la fiche. */
  const [filledFrom, setFilledFrom] = useState<Record<string, FillSource>>({});
  const markFilled = useCallback((keys: string[], source: FillSource) => {
    if (keys.length) setFilledFrom(prev => ({ ...prev, ...Object.fromEntries(keys.map(k => [k, source])) }));
  }, []);
  
  // Derive editingSnapshot from persisted ID
  const editingSnapshot = useMemo(() => {
    if (!editingSnapshotId.id) return null;
    return snapshots.find(s => s.id === editingSnapshotId.id) || null;
  }, [editingSnapshotId.id, snapshots]);

  // Use persisted form state to survive page minimize/restore
  const [formData, setFormData, clearFormData] = usePersistedFormState(
    `snapshot-form-${athleteId}`,
    { ...INITIAL_FORM_STATE, date: new Date().toISOString().slice(0, 10) }
  );

  const resetForm = () => {
    clearFormData();
    setFilledFrom({});
    setEditBlock(null);
    setEditingSnapshotId({ id: null });
  };

  const snapshotFormValues = (s: DbSnapshot): typeof formData => {
    const snapshotAny = s as unknown as Record<string, unknown>;
    return {
      date: s.date || new Date().toISOString().slice(0, 10),
      cycle_tag: s.cycle_tag || "",
      sport_main: (s as any).sport_main || "",
      confidence: s.confidence != null ? String(s.confidence) : "",
      fc_max: s.fc_max != null ? String(s.fc_max) : "",
      fc_repos: s.fc_repos != null ? String(s.fc_repos) : "",
      vma: s.vma != null ? String(s.vma) : "",
      ftp: s.ftp != null ? String(s.ftp) : "",
      ftp_origin: readThresholdOrigin(s.field_sources, "ftp") ?? "",
      css: s.css != null ? String(s.css) : "",
      vo2max: (() => { const v = readVo2max(s).value; return v != null ? String(v) : ""; })(),
      vo2max_origin: readVo2max(s).origin ?? "",
      vlamax: s.vlamax != null ? String(s.vlamax) : "",
      vlamax_run: s.vlamax_run != null ? String(s.vlamax_run) : "",
      weight_kg: s.weight_kg != null ? String(s.weight_kg) : "",
      fat_pct: s.fat_pct != null ? String(s.fat_pct) : "",
      pmax_5s: s.pmax_5s != null ? String(s.pmax_5s) : "",

      // VLamax Bike V2 Enhanced
      p30s_w: snapshotAny.p30s_w != null ? String(snapshotAny.p30s_w) : "",
      p60s_w: snapshotAny.p60s_w != null ? String(snapshotAny.p60s_w) : "",
      map5min_w: snapshotAny.map5min_w != null ? String(snapshotAny.map5min_w) : "",
      protocol_quality: snapshotAny.protocol_quality != null ? String(snapshotAny.protocol_quality) : "3",

      // PRO TTE
      tte_mode: (s.tte_mode as string) || "LOAD",
      tss_7d: s.tss_7d != null ? String(s.tss_7d) : "",
      tte_observed_min: s.tte_observed_min != null ? String(s.tte_observed_min) : "",
      tte_observed_min_run: (s as any).tte_observed_min_run != null ? String((s as any).tte_observed_min_run) : "",
      critical_metrics: (s as any).critical_metrics ? JSON.stringify((s as any).critical_metrics) : "",

      // ⚡ État de fatigue
      fatigue_state: s.fatigue_state || "ok",

      // ÉCONOMIE CAP
      run_pace_ref: s.run_pace_ref_sec_per_km != null ? formatSecToPace(s.run_pace_ref_sec_per_km) : "",
      run_hr_ref: s.run_hr_ref_bpm != null ? String(s.run_hr_ref_bpm) : "",
      run_duration_min: s.run_duration_min != null ? String(s.run_duration_min) : "",
      run_hr_drift_pct: s.run_hr_drift_pct != null ? String(s.run_hr_drift_pct) : "",
      run_economy_score_manual: "",

      // VLamax CAP
      pace_threshold: s.pace_threshold_sec_per_km != null ? formatSecToPace(s.pace_threshold_sec_per_km) : "",
      pace_threshold_origin: readThresholdOrigin(s.field_sources, "pace_threshold_sec_per_km") ?? "",
      sprint_15s: s.sprint_15s_distance != null ? String(s.sprint_15s_distance) : "",
      run_power_max: s.running_power_max != null ? String(s.running_power_max) : "",
      run_power_threshold: s.running_power_threshold != null ? String(s.running_power_threshold) : "",
      run_power_1s: (s as any).running_power_1s != null ? String((s as any).running_power_1s) : "",
      run_power_5s: (s as any).running_power_5s != null ? String((s as any).running_power_5s) : "",
      run_power_30s: (s as any).running_power_30s != null ? String((s as any).running_power_30s) : "",
      run_power_60s: (s as any).running_power_60s != null ? String((s as any).running_power_60s) : "",
      run_power_5min: (s as any).running_power_5min != null ? String((s as any).running_power_5min) : "",

      coach_notes: s.coach_notes || "",
    };
  };

  const loadSnapshotToForm = (s: DbSnapshot) => {
    setFilledFrom({});
    setFormData(snapshotFormValues(s));
  };

  const parseNum = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const blockIfInvalid = (): boolean => {
    const { errors } = checkSnapshotForm(formData as unknown as Record<string, string>);
    if (errors.length > 0) {
      toast.error(`Bilan non enregistré : ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1})` : ""}`);
      return true;
    }
    return false;
  };

  const handleCreate = async () => {
    if (blockIfInvalid()) return;
    // ✅ VLamax uniquement si mode Staff, sinon null (sera calculée)
    const vlamaxMeasured = staffMode || (formData as Record<string, unknown>).vlamax_from_lab === "true";
    const vlamax = vlamaxMeasured ? parseNum(formData.vlamax) : null;
    const vo2 = writeVo2max(
      withThresholdOrigin(withThresholdOrigin({}, "ftp", formData.ftp_origin), "pace_threshold_sec_per_km", formData.pace_threshold_origin),
      parseNum(formData.vo2max), formData.vo2max_origin, formData.date,
    );
    const vo2max = vo2.vo2max;
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

    // Note: Utiliser "as any" pour les nouveaux champs jusqu'à la régénération des types Supabase
    // Parse VLamax CAP fields
    const vlamaxRun = staffMode ? parseNum(formData.vlamax_run) : null;
    const paceThresholdSec = parsePaceToSec(formData.pace_threshold);

    const created = await addSnapshot({
      athlete_id: athleteId,
      coach_id: "", // replaced in hook
      date: formData.date,
      source: staffMode && vlamax ? "staff" : "manual", // ✅ Marquer source "staff" si VLamax mesurée
      ...staffLactateUpdate({}, vlamax, vlamaxRun),
      cycle_tag: formData.cycle_tag || null,
      sport_main: formData.sport_main || null,
      confidence: snapshotConfidence(formData as unknown as Record<string, string>),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      fc_repos: parseNum(formData.fc_repos) ? Math.round(parseNum(formData.fc_repos)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax, // ✅ Null si mode standard, valeur si mode Staff
      vlamax_run: vlamaxRun, // ✅ VLamax CAP
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,

      // ✅ VLamax Bike V2 Enhanced - Power indices (cast as any until types regenerated)
      ...({
        p30s_w: parseNum(formData.p30s_w) ? Math.round(parseNum(formData.p30s_w)!) : null,
        p60s_w: parseNum(formData.p60s_w) ? Math.round(parseNum(formData.p60s_w)!) : null,
        map5min_w: parseNum(formData.map5min_w) ? Math.round(parseNum(formData.map5min_w)!) : null,
        protocol_quality: snapshotProtocolQuality(formData as unknown as Record<string, string>),
      } as Record<string, unknown>),

      // ✅ PRO TTE
      // TTE estimé par la charge (module A) retiré de la saisie : un TTE observé passe en module B.
      tte_mode: parseNum(formData.tte_observed_min) ? "OBSERVED" : ((formData.tte_mode as string) || "LOAD"),
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: parseNum(formData.tte_observed_min) ? Math.round(parseNum(formData.tte_observed_min)!) : null,
      ...({ tte_observed_min_run: parseNum(formData.tte_observed_min_run) ? Math.round(parseNum(formData.tte_observed_min_run)!) : null } as Record<string, unknown>),
      ...({ critical_metrics: (() => { const raw = (formData as Record<string, unknown>).critical_metrics; const m = criticalEnvelope(raw); return Object.keys(m).length ? m : null; })() } as Record<string, unknown>),

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score,
      run_economy_label: economyResult.label,

      // 🏃 VLamax CAP (données pour estimation)
      pace_threshold_sec_per_km: paceThresholdSec ? Math.round(paceThresholdSec) : null,
      field_sources: vo2.field_sources as DbSnapshot["field_sources"],
      sprint_15s_distance: parseNum(formData.sprint_15s),
      running_power_max: parseNum(formData.run_power_max) ? Math.round(parseNum(formData.run_power_max)!) : null,
      running_power_threshold: parseNum(formData.run_power_threshold) ? Math.round(parseNum(formData.run_power_threshold)!) : null,
      ...({
        running_power_1s: parseNum(formData.run_power_1s) ? Math.round(parseNum(formData.run_power_1s)!) : null,
        running_power_5s: parseNum(formData.run_power_5s) ? Math.round(parseNum(formData.run_power_5s)!) : null,
        running_power_30s: parseNum(formData.run_power_30s) ? Math.round(parseNum(formData.run_power_30s)!) : null,
        running_power_60s: parseNum(formData.run_power_60s) ? Math.round(parseNum(formData.run_power_60s)!) : null,
        running_power_5min: parseNum(formData.run_power_5min) ? Math.round(parseNum(formData.run_power_5min)!) : null,
      } as Record<string, unknown>),

      metabolic_profile: profile,
      metabolic_score: score,
      fatigue_state: formData.fatigue_state || "ok",
      coach_notes: formData.coach_notes || null,
      // ✅ Semaine test → vlamax_is_reference
      ...((formData as any).vlamax_is_reference === "true" && { vlamax_is_reference: true } as Record<string, unknown>),
    });

    // Le formulaire reste ouvert (saisie conservée) si l'enregistrement échoue.
    if (!created) return;
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingSnapshot) return;
    if (blockIfInvalid()) return;

    // ✅ VLamax uniquement si mode Staff, sinon conserver la valeur existante
    const vlamaxMeasured = staffMode || (formData as Record<string, unknown>).vlamax_from_lab === "true";
    const vlamax = vlamaxMeasured ? parseNum(formData.vlamax) : editingSnapshot.vlamax;
    const vo2 = writeVo2max(
      withThresholdOrigin(withThresholdOrigin(editingSnapshot.field_sources, "ftp", formData.ftp_origin), "pace_threshold_sec_per_km", formData.pace_threshold_origin),
      parseNum(formData.vo2max), formData.vo2max_origin, formData.date,
    );
    const vo2max = vo2.vo2max;
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

    // Parse VLamax CAP fields — en mode Staff, un champ vide doit vraiment supprimer la valeur verrouillée.
    const vlamaxRun = staffMode ? parseNum(formData.vlamax_run) : editingSnapshot.vlamax_run;
    const paceThresholdSec = parsePaceToSec(formData.pace_threshold);

    const updated = await updateSnapshot(editingSnapshot.id, {
      date: formData.date,
      cycle_tag: formData.cycle_tag || null,
      sport_main: formData.sport_main || null,
      confidence: snapshotConfidence(formData as unknown as Record<string, string>),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      fc_repos: parseNum(formData.fc_repos) ? Math.round(parseNum(formData.fc_repos)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax, // ✅ Conserve valeur existante si mode standard
      vlamax_run: vlamaxRun,
      ...staffLactateUpdate(editingSnapshot, vlamax, vlamaxRun),
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,

      // ✅ VLamax Bike V2 Enhanced - Power indices (cast as any until types regenerated)
      ...({
        p30s_w: parseNum(formData.p30s_w) ? Math.round(parseNum(formData.p30s_w)!) : null,
        p60s_w: parseNum(formData.p60s_w) ? Math.round(parseNum(formData.p60s_w)!) : null,
        map5min_w: parseNum(formData.map5min_w) ? Math.round(parseNum(formData.map5min_w)!) : null,
        protocol_quality: snapshotProtocolQuality(formData as unknown as Record<string, string>),
      } as Record<string, unknown>),

      // ✅ PRO TTE
      // TTE estimé par la charge (module A) retiré de la saisie : un TTE observé passe en module B.
      tte_mode: parseNum(formData.tte_observed_min) ? "OBSERVED" : ((formData.tte_mode as string) || "LOAD"),
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: parseNum(formData.tte_observed_min) ? Math.round(parseNum(formData.tte_observed_min)!) : null,
      ...({ tte_observed_min_run: parseNum(formData.tte_observed_min_run) ? Math.round(parseNum(formData.tte_observed_min_run)!) : null } as Record<string, unknown>),
      ...({ critical_metrics: (() => { const raw = (formData as Record<string, unknown>).critical_metrics; const m = criticalEnvelope(raw); return Object.keys(m).length ? m : null; })() } as Record<string, unknown>),

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score ?? editingSnapshot.run_economy_score ?? null,
      run_economy_label: economyResult.label,

      // 🏃 VLamax CAP (données pour estimation)
      pace_threshold_sec_per_km: paceThresholdSec ? Math.round(paceThresholdSec) : null,
      field_sources: vo2.field_sources as DbSnapshot["field_sources"],
      sprint_15s_distance: parseNum(formData.sprint_15s),
      running_power_max: parseNum(formData.run_power_max) ? Math.round(parseNum(formData.run_power_max)!) : null,
      running_power_threshold: parseNum(formData.run_power_threshold) ? Math.round(parseNum(formData.run_power_threshold)!) : null,
      ...({
        running_power_1s: parseNum(formData.run_power_1s) ? Math.round(parseNum(formData.run_power_1s)!) : null,
        running_power_5s: parseNum(formData.run_power_5s) ? Math.round(parseNum(formData.run_power_5s)!) : null,
        running_power_30s: parseNum(formData.run_power_30s) ? Math.round(parseNum(formData.run_power_30s)!) : null,
        running_power_60s: parseNum(formData.run_power_60s) ? Math.round(parseNum(formData.run_power_60s)!) : null,
        running_power_5min: parseNum(formData.run_power_5min) ? Math.round(parseNum(formData.run_power_5min)!) : null,
      } as Record<string, unknown>),

      metabolic_profile: profile,
      metabolic_score: score,
      fatigue_state: formData.fatigue_state || "ok",
      coach_notes: formData.coach_notes || null,
      // ✅ Semaine test → vlamax_is_reference
      ...((formData as any).vlamax_is_reference === "true" && { vlamax_is_reference: true } as Record<string, unknown>),
    });

    if (!updated) return;
    setEditBlock(null);
    setIsEditOpen(false);
    setEditingSnapshotId({ id: null });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce snapshot ?")) {
      await deleteSnapshot(id);
    }
  };

  const handleClearVlamaxRun = async (s: DbSnapshot) => {
    if (!confirm("Effacer la VLamax CAP mesurée de ce profil ? L'estimation terrain redeviendra prioritaire.")) return;

    const success = await updateSnapshot(s.id, {
      vlamax_run: null,
      ...staffLactateUpdate(s, s.vlamax, null),
    } as Partial<DbSnapshot>);

    if (success && editingSnapshot?.id === s.id) {
      setFormData((prev) => ({ ...prev, vlamax_run: "" }));
    }
  };

  const openEdit = (s: DbSnapshot, block?: SheetBlockId) => {
    setEditBlock(block ?? null);
    setEditingSnapshotId({ id: s.id });
    loadSnapshotToForm(s);
    setIsEditOpen(true);
  };

  const handleNolioImport = (values: NolioImportResult) => {
    const map: Record<string, string> = { running_power_max: "run_power_max", running_power_threshold: "run_power_threshold", running_power_1s: "run_power_1s", running_power_5s: "run_power_5s", running_power_30s: "run_power_30s", running_power_60s: "run_power_60s", running_power_5min: "run_power_5min" };
    markFilled(Object.entries(values).filter(([k, v]) => v && !["date", "coach_notes", "protocol_quality", "is_semaine_test"].includes(k)).map(([k]) => map[k] ?? k), "Nolio");
    setFormData(prev => ({
      ...prev,
      ...(values.date && { date: values.date }),
      ...(values.pmax_5s && { pmax_5s: values.pmax_5s }),
      ...(values.p30s_w && { p30s_w: values.p30s_w }),
      ...(values.p60s_w && { p60s_w: values.p60s_w }),
      ...(values.map5min_w && { map5min_w: values.map5min_w }),
      ...(values.ftp && { ftp: values.ftp }),
      ...(values.pace_threshold && { pace_threshold: values.pace_threshold }),
      ...(values.vlamax_run && { vlamax_run: values.vlamax_run }),
      // ✅ FIX: Champs manquants — VMA, running power granulaires, meta
      ...(values.vma && { vma: values.vma }),
      ...(values.running_power_max && { run_power_max: values.running_power_max }),
      ...(values.running_power_threshold && { run_power_threshold: values.running_power_threshold }),
      ...(values.running_power_1s && { run_power_1s: values.running_power_1s }),
      ...(values.running_power_5s && { run_power_5s: values.running_power_5s }),
      ...(values.running_power_30s && { run_power_30s: values.running_power_30s }),
      ...(values.running_power_60s && { run_power_60s: values.running_power_60s }),
      ...(values.running_power_5min && { run_power_5min: values.running_power_5min }),
      ...(values.protocol_quality != null && { protocol_quality: String(values.protocol_quality) }),
      ...(values.is_semaine_test && { vlamax_is_reference: "true" }),
      ...(values.coach_notes && { coach_notes: prev.coach_notes ? `${prev.coach_notes}\n${values.coach_notes}` : values.coach_notes }),
    }));
  };

  const applyNolioRestingHr = useCallback((v: string) => {
    markFilled(["fc_repos"], "Nolio");
    setFormData(prev => ({ ...prev, fc_repos: v }));
  }, [setFormData, markFilled]);

  const applyNolioPeriod = (fields: SnapshotRecordFields, notes: string) => {
    markFilled(Object.entries(fields).filter(([k, v]) => v && !String((formData as Record<string, unknown>)[k] ?? "").trim()).map(([k]) => k), "Nolio");
    setFormData(prev => ({
      ...mergeEmptyFields(prev, fields),
      coach_notes: prev.coach_notes ? `${prev.coach_notes}\n${notes}` : notes,
    }));
  };

  const renderForm = () => (
    <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain pr-2">
      {(() => {
        const ref = pickReferenceSnapshot(snapshots, athleteId, activeSnapshotId);
        const editingRef = !!ref && editingSnapshot?.id === ref.id;
        const fillFromRef = () => {
          if (!ref) return;
          const { form, filled } = fillEmpty(formData as unknown as Record<string, unknown>, snapshotFormValues(ref) as unknown as Record<string, unknown>);
          if (!filled.length) { toast.info("Aucune case vide à remplir depuis ce bilan."); return; }
          setFormData({ ...(form as unknown as typeof formData), coach_notes: [formData.coach_notes, `Repris du bilan du ${ref.date} (${ref.source ?? "bilan"}).`].filter(Boolean).join("\n") });
          markFilled(filled, "Days");
          toast.success(`${filled.length} valeur${filled.length > 1 ? "s" : ""} reprise${filled.length > 1 ? "s" : ""} du bilan des Days.`);
        };
        const storedCritical = parseStoredCriticalMetrics((formData as Record<string, unknown>).critical_metrics);
        return (
          <SnapshotFillMenu
            days={!ref ? (
              <div className="space-y-2 text-sm">
                <p>Aucun bilan pour cet athlète : commence par un Day (Bike, Track, Pool…), il crée le bilan tout seul.</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/diagnostic")}>Ouvrir les Days</Button>
              </div>
            ) : editingRef ? (
              <p className="text-sm">Tu modifies déjà le bilan actif ({ref.date.split("-").reverse().join("/")}), celui que les Days complètent.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>Bilan actif du <b>{ref.date.split("-").reverse().join("/")}</b> ({ref.source ?? "bilan"}). Ses valeurs remplissent les cases vides de cette fiche.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={fillFromRef}>Reprendre les valeurs</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/diagnostic")}>Ouvrir les Days</Button>
                </div>
              </div>
            )}
            nolio={(
              <div className="space-y-4">
                <NolioFillAssistant
                  athleteName={athleteName}
                  current={formData as unknown as Record<string, unknown>}
                  storedCritical={storedCritical}
                  storedDurability={parseStoredDurability((formData as Record<string, unknown>).critical_metrics)}
                  onApplyFields={applyNolioPeriod}
                  onSaveCritical={(sport, value) => { setFormData(prev => { const m = criticalEnvelope(prev.critical_metrics); if (m[sport] || !value) return prev; return { ...prev, critical_metrics: JSON.stringify({ ...m, [sport]: value }) }; }); if (value) markFilled(["critical_metrics"], "Nolio"); }}
                  onSaveDurability={(sport, value) => { setFormData(prev => ({ ...prev, critical_metrics: withDurability((prev as Record<string, unknown>).critical_metrics, sport, value) })); markFilled(["critical_metrics"], "Nolio"); }}
                />
                <details className="border-t border-border pt-2">
                  <summary className="cursor-pointer py-2 text-sm font-medium">Avancé : fichier de courbes ou records détaillés</summary>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 p-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm text-muted-foreground">Fichier de courbes exporté de Nolio</span>
                      <NolioImporter
                        onImport={handleNolioImport}
                        variant="inline"
                        previousVLamax={ref?.vlamax ?? null}
                        currentFtp={ref?.ftp ?? null}
                        currentWeight={ref?.weight_kg ?? null}
                        currentVo2max={ref?.vo2max ?? null}
                        currentVlamax={ref?.vlamax ?? null}
                        objectif={athleteGoal}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Records détaillés · vérifie que l’athlète Nolio sélectionné est bien {athleteName}.</p>
                    <NolioPeriodRecords onApply={applyNolioPeriod} />
                  </div>
                </details>
              </div>
            )}
            lab={(
              <div className="space-y-2 text-sm">
                <p>Lis un rapport de laboratoire (PDF) : VO₂max, VLamax, FC max, poids et masse grasse. Tu vérifies chaque valeur avant qu’elle remplisse la fiche.</p>
                <LabImportDialog
                  athleteId={athleteId}
                  athleteName={athleteName}
                  athleteGoal={athleteGoal}
                  previousSnapshot={ref ?? null}
                  triggerLabel="Choisir le PDF labo"
                  onApplyToForm={(values) => {
                    const lab = labValuesToForm(values as Record<string, unknown>);
                    const { form, filled } = fillEmpty(formData as unknown as Record<string, unknown>, lab);
                    const note = typeof values.coach_notes === "string" ? values.coach_notes : "Import labo (PDF)";
                    setFormData({ ...(form as unknown as typeof formData), ...(filled.includes("vlamax") ? { vlamax_from_lab: "true" } : {}), coach_notes: [formData.coach_notes, note].filter(Boolean).join("\n") });
                    markFilled(filled, "Labo");
                  }}
                />
              </div>
            )}
          />
        );
      })()}

      <SnapshotTestDays
        formData={formData as unknown as Record<string, string>}
        filledFrom={filledFrom}
        initialTab={editBlock && ["ctx", "bike", "run", "swim", "labo"].includes(editBlock) ? editBlock : undefined}
        key={`fiche-${editingSnapshot?.id ?? "new"}-${editBlock ?? ""}`}
        onChange={(key, value) => {
          setFilledFrom(prev => { if (!(key in prev)) return prev; const n = { ...prev }; delete n[key]; return n; });
          setFormData(prev => ({ ...prev, [key]: value }));
        }}
        renderExtra={(key) => {
          if (key === "ftp") return <div className="mt-1"><ThresholdOriginSelect field="ftp" value={formData.ftp_origin} onChange={(v) => setFormData(prev => ({ ...prev, ftp_origin: v }))} /></div>;
          if (key === "pace_threshold") return <div className="mt-1"><ThresholdOriginSelect field="pace_threshold_sec_per_km" value={formData.pace_threshold_origin} onChange={(v) => setFormData(prev => ({ ...prev, pace_threshold_origin: v }))} /></div>;
          if (key === "fc_repos") return <NolioRestingHrHint athleteId={athleteId} value={formData.fc_repos ?? ""} onApply={applyNolioRestingHr} />;
          if (key === "vo2max") return (
            <div className="mt-1 space-y-1">
              <Select value={formData.vo2max_origin || undefined} onValueChange={(v) => setFormData(prev => ({ ...prev, vo2max_origin: v as Vo2maxOrigin }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Provenance de la VO₂max" /></SelectTrigger>
                <SelectContent>{VO2MAX_ORIGIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {formData.vo2max_origin === "watch" && <p className="text-[11px] text-muted-foreground">Gardée pour information : elle n’entre dans aucun calcul.</p>}
              {filledFrom.vlamax === "Labo" && formData.vlamax && <p className="text-[11px] text-muted-foreground">VLamax du rapport labo : {formData.vlamax} mmol/L/s (mesure).</p>}
              {filledFrom.fat_pct === "Labo" && formData.fat_pct && <p className="text-[11px] text-muted-foreground">Masse grasse du rapport labo : {formData.fat_pct} %.</p>}
            </div>
          );
          return null;
        }}
      />

      <details className="border-b border-border"><summary className="cursor-pointer py-3 text-sm font-medium">Repères critiques · Course et vélo{filledFrom.critical_metrics ? ` · rempli depuis ${filledFrom.critical_metrics}` : ""}</summary><CriticalEffortsPanel athleteLabel={athleteName} stored={parseStoredCriticalMetrics((formData as Record<string, unknown>).critical_metrics)} onSave={(sport, value) => setFormData(prev => { const m = criticalEnvelope(prev.critical_metrics); if (value) m[sport] = value; else delete m[sport]; return { ...prev, critical_metrics: Object.keys(m).length ? JSON.stringify(m) : "" }; })}/></details>

      <p className="text-sm font-medium pt-1">Compléments</p>

      <div>
        <Label htmlFor="cycle_tag">Tag de cycle <span className="text-xs text-muted-foreground font-normal">(optionnel)</span></Label>
        <Input
          id="cycle_tag"
          placeholder="Base1, Build2, Peak..."
          value={formData.cycle_tag}
          onChange={(e) => setFormData({ ...formData, cycle_tag: e.target.value })}
        />
      </div>

      {/* 🎯 Sport principal — verrouille le routage VLamax (CAP vs vélo) et les cibles */}
      <div>
        <Label htmlFor="sport_main" className="flex items-center gap-1.5">
          Sport principal
          <span className="text-xs text-muted-foreground font-normal">(détermine quelle VLamax utiliser)</span>
        </Label>
        <Select
          value={formData.sport_main || "auto"}
          onValueChange={(v) => setFormData({ ...formData, sport_main: v === "auto" ? "" : v })}
        >
          <SelectTrigger id="sport_main">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (depuis l'objectif)</SelectItem>
            <SelectItem value="run">Course à pied (CAP / Trail / Marathon)</SelectItem>
            <SelectItem value="bike">Vélo / Cyclisme</SelectItem>
            <SelectItem value="swim">Natation</SelectItem>
            <SelectItem value="triathlon">Triathlon</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Pour un athlète CAP/Trail, sélectionnez « Course à pied » pour que le dashboard utilise <code>vlamax_run</code> et les cibles CAP (au lieu de l'estimation FTP/kg vélo).
        </p>
      </div>

      {/* ⚡ État de fatigue au moment du snapshot */}
      <div>
        <Label className="flex items-center gap-1.5 mb-2">
          <Battery className="h-4 w-4" />
          État de forme au moment du snapshot
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {FATIGUE_STATES.map((state) => (
            <button
              key={state.value}
              type="button"
              onClick={() => setFormData({ ...formData, fatigue_state: state.value })}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                formData.fatigue_state === state.value
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className={cn("font-semibold", state.color)}>{state.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
              ✓ Verrouille la VLamax (source: test labo)
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
          
          <p className="text-xs text-muted-foreground mb-3">Rempli par le Track Day : allure stable, FC moyenne et dérive cardiaque sur la même séance.</p>

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
            return (
              <p className="mt-3 text-xs text-muted-foreground">
                {result.score === null
                  ? "Repère non calculé : renseigner allure et FC."
                  : `Repère cardiaque calculé : ${result.score}/100 (estimation à partir de la FC, pas une mesure d'économie).`}
              </p>
            );
          })()}
        </div>
      )}

      {/* 🏃 DONNÉES VLAMAX CAP (pour estimation) */}
      {isRunningObjective(athleteGoal) && (
        <div className="p-4 rounded-lg border-2 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-base font-semibold">🏃 Données VLamax CAP</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-medium mb-2">Données pour estimer la VLamax Course</p>
                  <p className="text-xs mb-2">Ces données permettent de calculer automatiquement la VLamax CAP, distincte de la VLamax vélo.</p>
                  <p className="text-xs">Plus vous remplissez de champs, plus l'estimation sera précise.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 text-xs gap-1"
              onClick={() => navigate("/cap-testing-week")}
            >
              <Beaker className="w-3 h-3" />
              Semaine Tests CAP
            </Button>
          </div>
          
          <div className="p-3 rounded-lg bg-background/50 border border-border mb-4">
            <p className="text-sm text-muted-foreground">
              Ces données servent à estimer la VLamax spécifique à la course à pied (glycolyse en course).
              Différente de la VLamax vélo car la biomécanique et le recrutement musculaire diffèrent.
            </p>
          </div>

          <p className="text-xs text-muted-foreground mb-2">Calculée à partir du bloc Course de la fiche (sprint 15 s, VMA, allure seuil).</p>

          {staffMode && (
            <div className="mt-4 pt-4 border-t border-border">
              <Label htmlFor="vlamax_run" className="flex items-center gap-1.5">
                <span>VLamax CAP (mesurée)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Mode Staff : VLamax CAP mesurée en laboratoire.
                        Cette valeur verrouille l'estimation automatique.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="vlamax_run"
                type="number"
                step="0.01"
                placeholder="0.35 (course)"
                value={formData.vlamax_run}
                onChange={(e) => setFormData({ ...formData, vlamax_run: e.target.value })}
                className="border-primary/50 mt-1"
              />
              <p className="text-xs text-primary mt-1">
                ✓ Verrouille la VLamax CAP (source: test labo)
              </p>
            </div>
          )}

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

    const insights = generateTwoForCoachingInsights(
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

            </div>

            <div className="flex gap-1">
              {s.vlamax_run != null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClearVlamaxRun(s)}
                  className="h-9 text-xs"
                  title="Effacer uniquement la VLamax CAP mesurée"
                >
                  Effacer VLamax CAP
                </Button>
              )}
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
          <SnapshotSheet snapshot={s as unknown as SheetSnapshot} onEditBlock={(block) => openEdit(s, block)} />

          <Accordion type="single" collapsible>
            <AccordionItem value="insights" className="border-none">
              <AccordionTrigger className="py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Lecture Two For Coaching Lab™
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
      tte_observed_min_run: (A as any).tte_observed_min_run ?? null,
      objectif: athleteGoal,
    });

    const tteB = computeTTEEffectif({
      ftp: B.ftp ?? null,
      tss_7d: B.tss_7d ?? null,
      tte_mode: (B.tte_mode as any) ?? "LOAD",
      tte_observed_min: B.tte_observed_min ?? null,
      tte_observed_min_run: (B as any).tte_observed_min_run ?? null,
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

    const insightsB = generateTwoForCoachingInsights(
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
            Lecture Two For Coaching Lab™ (sur B)
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
            {PROFILE_TERMINOLOGY.pluralShort} — {athleteName}
          </CardTitle>

          <div className="flex gap-2 flex-wrap">
            {/* ✅ NOUVEAU: Import Lab PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tfcl-testing-week")}
              className="gap-2"
            >
              <Beaker className="h-4 w-4" />
              Semaine TFCL
            </Button>
            
            <LabImportDialog
              athleteId={athleteId}
              athleteName={athleteName}
              athleteGoal={athleteGoal}
              previousSnapshot={snapshots.length > 0 ? snapshots[0] : null}
            />
            
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
                    <DialogTitle>Comparaison de {PROFILE_TERMINOLOGY.pluralShort.toLowerCase()}</DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Profil A (avant)</Label>
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
                      <Label>Profil B (après)</Label>
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

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  {PROFILE_TERMINOLOGY.actions.create}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{PROFILE_TERMINOLOGY.actions.create}</DialogTitle>
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
          {PROFILE_DEFINITION.summary} Base de l'analyse Two For Coaching Lab™.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun {PROFILE_TERMINOLOGY.shortName.toLowerCase()} pour cet athlète.</p>
            <p className="text-sm">Créez un profil après un test clé ou à la fin d'un cycle.</p>
          </div>
        ) : (
          snapshots.map(renderSnapshotCard)
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{PROFILE_TERMINOLOGY.actions.edit}</DialogTitle>
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
