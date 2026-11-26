import { staffLactateUpdate } from "@/lib/vlamaxEvidence";
// =============================================
// PROFIL PHYSIOLOGIQUE MANAGER - Gestion des Profils Two For Coaching Lab™ (Cloud)
// Anciennement "Snapshot Manager"
// + TTE PRO: LOAD (FTP+TSS7d) / OBSERVED (test)
// + ÉCONOMIE CAP: allure/FC/dérive
// =============================================

import { CARB_TOLERANCE_OPTIONS, readCarbTolerance, withCarbTolerance } from "@/lib/raceSimulation/carbTolerance";
import { DEFAULT_PRODUCTS, PRODUCT_LABEL, readRaceProducts, readSweatTest, withNutritionProfile, type ProductKind, type RaceProduct } from "@/lib/raceSimulation/raceNutritionProfile";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { Camera, Plus, Trash2, Edit, TrendingUp, Brain, Pin, Beaker, Bike, Battery } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { checkSnapshotForm, readLabExtras, withLabExtras, readTte, writeTte, readVo2max, snapshotConfidence, snapshotProtocolQuality, VO2MAX_ORIGIN_OPTIONS, writeVo2max, type Vo2maxOrigin } from "@/lib/snapshotTestDays";
import { NolioRestingHrHint } from "@/components/NolioRestingHrHint";
import { NolioFillAssistant } from "@/components/NolioFillAssistant";
import { SnapshotFillMenu } from "@/components/SnapshotFillMenu";
import { SnapshotSheet } from "@/components/SnapshotSheet";
import { buildSnapshotSheet, type SheetBlockId, type SheetDurabilityPair, type SheetSnapshot } from "@/lib/snapshotSheet";
import { latestPairs, pairedDecoupling } from "@/lib/diagnostic/durabilityDay";
import { fillEmpty, labValuesToForm, type FillSource } from "@/lib/snapshotFill";
import { CriticalEffortsPanel } from "@/components/CriticalEffortsPanel";
import { parseStoredDurability, withDurability } from "@/lib/durability/longSessionDurability";
import { criticalEnvelope, parseStoredCriticalMetrics } from "@/lib/criticalMetrics";
import { ThresholdOriginSelect } from "@/components/ThresholdOriginSelect";
import { readThresholdOrigin, withThresholdOrigin, type ThresholdOrigin } from "@/lib/zones/thresholdOrigin";

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
  tte_ref_w: "",
  tte_ref_pace: "",
  lab_mlss_w: "",
  lab_lactate_mmol: "",
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
  vma_origin: "" as ThresholdOrigin | "",
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
  const { getSnapshotsForAthlete, addSnapshot, updateSnapshot, deleteSnapshot, setActiveSnapshot, tests, athletes, updateAthlete } = useCloudData();
  /** Sexe et date de naissance : propres à l'athlète (communs à tous les bilans), ils ajustent les repères de l'objectif. */
  const athleteRecord = athletes.find(a => a.id === athleteId) ?? null;
  const [identity, setIdentity] = useState<{ sex: string; birthDate: string; carbTolerance: string; sweat: string; salty: string; products: Record<ProductKind, ProductDraft> }>({ sex: "", birthDate: "", carbTolerance: "", sweat: "", salty: "", products: emptyProductDrafts() });
  const storedTolerance = readCarbTolerance(athleteRecord?.refs);
  const storedSweat = readSweatTest(athleteRecord?.refs);
  const storedProductsKey = JSON.stringify((athleteRecord?.refs as Record<string, unknown> | null)?.raceProducts ?? null);
  const resetIdentity = useCallback(() => setIdentity({ sex: athleteRecord?.sex === "M" || athleteRecord?.sex === "F" ? athleteRecord.sex : "", birthDate: athleteRecord?.birth_date ?? "", carbTolerance: storedTolerance ? String(storedTolerance.gh) : "",
    sweat: storedSweat?.mlH ? String(storedSweat.mlH) : "", salty: storedSweat?.salty == null ? "" : storedSweat.salty ? "yes" : "no", products: productDrafts(athleteRecord?.refs) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les produits sont suivis par leur contenu (storedProductsKey)
    [athleteRecord?.sex, athleteRecord?.birth_date, storedTolerance?.gh, storedSweat?.mlH, storedSweat?.salty, storedProductsKey]);
  useEffect(() => { resetIdentity(); }, [resetIdentity]);
  const saveIdentity = async () => {
    if (!athleteRecord) return;
    // Une case laissée vide ne supprime jamais une valeur déjà connue.
    const sex = identity.sex === "M" || identity.sex === "F" ? identity.sex : athleteRecord.sex ?? null;
    const birth = identity.birthDate || athleteRecord.birth_date || null;
    // Tolérance glucides : « non testée » efface la valeur, une valeur choisie la date du jour.
    const tol = identity.carbTolerance === "none" ? null : identity.carbTolerance ? Number(identity.carbTolerance) : storedTolerance?.gh ?? null;
    const tolChanged = tol !== (storedTolerance?.gh ?? null);
    // Sueur et produits de course : propres à l'athlète, une case vide efface la valeur.
    const today = new Date().toISOString().slice(0, 10);
    const sweatMl = Number(identity.sweat) > 0 && Number(identity.sweat) <= 3000 ? Math.round(Number(identity.sweat)) : null;
    const salty = identity.salty === "yes" ? true : identity.salty === "no" ? false : null;
    const sweatChanged = sweatMl !== (storedSweat?.mlH ?? null) || salty !== (storedSweat?.salty ?? null);
    const products = productsFromDrafts(identity.products);
    const productsChanged = JSON.stringify(products) !== JSON.stringify(productsFromDrafts(productDrafts(athleteRecord.refs)));
    if (sex === (athleteRecord.sex ?? null) && birth === (athleteRecord.birth_date ?? null) && !tolChanged && !sweatChanged && !productsChanged) return;
    let refs: unknown = athleteRecord.refs;
    if (tolChanged) refs = withCarbTolerance(refs, tol, today);
    if (sweatChanged) refs = withNutritionProfile(refs, { sweatTest: { mlH: sweatMl, salty, date: today } });
    if (productsChanged) refs = withNutritionProfile(refs, { products });
    await updateAthlete(athleteId, { sex, birth_date: birth, ...(tolChanged || sweatChanged || productsChanged ? { refs: refs as never } : {}) });
  };

  // Use persisted dialog states to survive page minimize/restore
  const [isCreateOpen, setIsCreateOpen] = usePersistedDialogState(`snapshot-create-${athleteId}`, false);
  const [isEditOpen, setIsEditOpen] = usePersistedDialogState(`snapshot-edit-${athleteId}`, false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [criticalOpen, setCriticalOpen] = useState(false);
  const criticalRef = useRef<HTMLDetailsElement>(null);
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
    resetIdentity();
    clearFormData();
    setFilledFrom({});
    setEditBlock(null);
    setEditingSnapshotId({ id: null });
  };

  /** Durability Day (tests « deux blocs ») : découplage le plus récent par sport. */
  const durabilityPairs = useMemo<SheetDurabilityPair[]>(() => latestPairs(tests, athleteId).flatMap(p => {
    const pct = pairedDecoupling(p);
    return pct == null ? [] : [{ sport: p.sport, decouplingPct: pct, day: p.day }];
  }), [tests, athleteId]);

  /** Fiche en cours de saisie, au format de la fiche en lecture (pour les rappels CP/CS et durabilité). */
  const formSheetSnapshot = (): SheetSnapshot => ({
    date: formData.date, critical_metrics: (formData as Record<string, unknown>).critical_metrics,
  });

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
      ...(() => {
        // TTE en calcul ou gardée à part (tenue à un autre seuil), avec l'intensité réellement tenue.
        const t = readTte(s as unknown as Parameters<typeof readTte>[0]);
        return {
          tte_observed_min: t.bike.value != null ? String(t.bike.value) : "",
          tte_observed_min_run: t.run.value != null ? String(t.run.value) : "",
          tte_ref_w: t.bike.ref != null ? String(t.bike.ref) : "",
          tte_ref_pace: t.run.ref != null ? t.formatPace(t.run.ref) : "",
        };
      })(),
      critical_metrics: (s as any).critical_metrics ? JSON.stringify((s as any).critical_metrics) : "",
      ...(() => { const lab = readLabExtras((s as { critical_metrics?: unknown }).critical_metrics); return { lab_mlss_w: lab.mlssW != null ? String(lab.mlssW) : "", lab_lactate_mmol: lab.lactateMmol != null ? String(lab.lactateMmol) : "" }; })(),

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
      vma_origin: readThresholdOrigin(s.field_sources, "vma") ?? "",
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
    resetIdentity();
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
      withThresholdOrigin(withThresholdOrigin(withThresholdOrigin({}, "ftp", formData.ftp_origin), "pace_threshold_sec_per_km", formData.pace_threshold_origin), "vma", formData.vma_origin),
      parseNum(formData.vo2max), formData.vo2max_origin, formData.date,
    );
    const vo2max = vo2.vo2max;
    const tte = writeTte(vo2.field_sources, formData as unknown as Record<string, string>, formData.date);
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
      tte_mode: tte.tte_observed_min ? "OBSERVED" : ((formData.tte_mode as string) || "LOAD"),
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: tte.tte_observed_min,
      ...({ tte_observed_min_run: tte.tte_observed_min_run } as Record<string, unknown>),
      ...({ critical_metrics: (() => { const raw = (formData as Record<string, unknown>).critical_metrics; const m = withLabExtras(criticalEnvelope(raw), formData as unknown as Record<string, string>); return Object.keys(m).length ? m : null; })() } as Record<string, unknown>),

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score,
      run_economy_label: economyResult.label,

      // 🏃 VLamax CAP (données pour estimation)
      pace_threshold_sec_per_km: paceThresholdSec ? Math.round(paceThresholdSec) : null,
      field_sources: tte.field_sources as DbSnapshot["field_sources"],
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
    await saveIdentity();
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
      withThresholdOrigin(withThresholdOrigin(withThresholdOrigin(editingSnapshot.field_sources, "ftp", formData.ftp_origin), "pace_threshold_sec_per_km", formData.pace_threshold_origin), "vma", formData.vma_origin),
      parseNum(formData.vo2max), formData.vo2max_origin, formData.date,
    );
    const vo2max = vo2.vo2max;
    const tte = writeTte(vo2.field_sources, formData as unknown as Record<string, string>, formData.date);
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
      tte_mode: tte.tte_observed_min ? "OBSERVED" : ((formData.tte_mode as string) || "LOAD"),
      tss_7d: parseNum(formData.tss_7d) ? Math.round(parseNum(formData.tss_7d)!) : null,
      tte_observed_min: tte.tte_observed_min,
      ...({ tte_observed_min_run: tte.tte_observed_min_run } as Record<string, unknown>),
      ...({ critical_metrics: (() => { const raw = (formData as Record<string, unknown>).critical_metrics; const m = withLabExtras(criticalEnvelope(raw), formData as unknown as Record<string, string>); return Object.keys(m).length ? m : null; })() } as Record<string, unknown>),

      // 🏃 ÉCONOMIE CAP
      run_pace_ref_sec_per_km: runPaceSec ? Math.round(runPaceSec) : null,
      run_hr_ref_bpm: runHr ? Math.round(runHr) : null,
      run_duration_min: runDuration ? Math.round(runDuration) : null,
      run_hr_drift_pct: runDrift,
      run_economy_score: economyResult.score ?? editingSnapshot.run_economy_score ?? null,
      run_economy_label: economyResult.label,

      // 🏃 VLamax CAP (données pour estimation)
      pace_threshold_sec_per_km: paceThresholdSec ? Math.round(paceThresholdSec) : null,
      field_sources: tte.field_sources as DbSnapshot["field_sources"],
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
    await saveIdentity();
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

  /**
   * Ancien Profil (athlete.refs + VO₂max de l'athlète) : utilisé en secours quand le bilan est vide.
   * Une reprise unique le range dans le bilan actif (provenance « saisie coach ») puis le vide :
   * la fiche devient la seule source des valeurs de test.
   */
  const LEGACY: { key: string; col: keyof DbSnapshot; label: string; unit: string; min: number; max: number }[] = [
    { key: "weightKg", col: "weight_kg", label: "Poids", unit: "kg", min: 30, max: 200 },
    { key: "fatPct", col: "fat_pct", label: "Masse grasse", unit: "%", min: 3, max: 50 },
    { key: "fcMax", col: "fc_max", label: "FC max", unit: "bpm", min: 100, max: 250 },
    { key: "vma", col: "vma", label: "VMA", unit: "km/h", min: 8, max: 30 },
    { key: "ftp", col: "ftp", label: "FTP", unit: "W", min: 50, max: 500 },
    { key: "css", col: "css", label: "CSS", unit: "s/100 m", min: 50, max: 200 },
    { key: "vo2max", col: "vo2max", label: "VO₂max", unit: "ml/kg/min", min: 20, max: 100 },
  ];
  const legacy = useMemo(() => {
    const refs = (athleteRecord?.refs && typeof athleteRecord.refs === "object" ? athleteRecord.refs : {}) as Record<string, unknown>;
    const ref = pickReferenceSnapshot(snapshots, athleteId, activeSnapshotId) as unknown as Record<string, unknown> | null;
    const items = LEGACY.flatMap(f => {
      const raw = f.key === "vo2max" ? (refs.vo2max ?? athleteRecord?.vo2max) : refs[f.key];
      const v = typeof raw === "number" && raw >= f.min && raw <= f.max ? raw : null;
      return v == null ? [] : [{ ...f, value: v, text: `${Math.round(v * 10) / 10} ${f.unit}`, empty: !ref || ref[f.col] == null }];
    });
    return { items, toFill: items.filter(i => i.empty), ref };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteRecord?.refs, athleteRecord?.vo2max, snapshots, athleteId, activeSnapshotId]);
  const [migrating, setMigrating] = useState(false);
  const migrateLegacy = async () => {
    if (!athleteRecord) return;
    setMigrating(true);
    try {
      const values = Object.fromEntries(legacy.toFill.map(i => [i.col, i.col === "fc_max" || i.col === "ftp" ? Math.round(i.value) : i.value]));
      const sources: Record<string, unknown> = { ...((legacy.ref?.field_sources as Record<string, unknown> | null) ?? {}) };
      for (const i of legacy.toFill) sources[i.col === "ftp" ? "ftp" : i.col] = { source: "entered", protocol: "Saisie coach (ancien profil)" };
      if (legacy.toFill.length) {
        let ok = false;
        if (legacy.ref?.id) ok = await updateSnapshot(String(legacy.ref.id), { ...values, field_sources: sources } as Partial<DbSnapshot>);
        else {
          const created = await addSnapshot({ athlete_id: athleteId, coach_id: "", date: new Date().toISOString().slice(0, 10), source: "manual", ...values, field_sources: sources } as never);
          ok = !!created;
          if (created) await setActiveSnapshot(athleteId, (created as { id: string }).id);
        }
        if (!ok) return;
      }
      const refs = { ...((athleteRecord.refs && typeof athleteRecord.refs === "object" ? athleteRecord.refs : {}) as Record<string, unknown>) };
      for (const f of LEGACY) delete refs[f.key];
      await updateAthlete(athleteId, { refs: refs as never, vo2max: null });
      toast.success(legacy.toFill.length ? "Valeurs reprises dans le bilan actif ; ancien Profil vidé." : "Ancien Profil vidé.");
    } finally { setMigrating(false); }
  };

  // Lien profond « ?fiche=<bloc> » (Checklist coach, Profil) : ouvre le bilan actif sur le bon bloc.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const block = searchParams.get("fiche") as SheetBlockId | null;
    if (!block) return;
    const next = new URLSearchParams(searchParams); next.delete("fiche"); setSearchParams(next, { replace: true });
    const ref = pickReferenceSnapshot(snapshots, athleteId, activeSnapshotId);
    if (ref) openEdit(ref, block);
    else { resetForm(); setEditBlock(block); setIsCreateOpen(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        renderFooter={(tab) => {
          if (tab === "ctx") return (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <p className="text-xs font-medium">Athlète (commun à tous ses bilans)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="athlete-sex" className="text-xs">Sexe</Label>
                  <Select value={identity.sex || undefined} onValueChange={(v) => setIdentity(prev => ({ ...prev, sex: v }))}>
                    <SelectTrigger id="athlete-sex" className="h-11"><SelectValue placeholder="À renseigner" /></SelectTrigger>
                    <SelectContent><SelectItem value="F">Femme</SelectItem><SelectItem value="M">Homme</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="athlete-birth" className="text-xs">Date de naissance</Label>
                  <Input id="athlete-birth" type="date" className="h-11" value={identity.birthDate} onChange={(e) => setIdentity(prev => ({ ...prev, birthDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="athlete-carbs" className="text-xs">Glucides tolérés à l'entraînement (g/h)</Label>
                <Select value={identity.carbTolerance || undefined} onValueChange={(v) => setIdentity(prev => ({ ...prev, carbTolerance: v }))}>
                  <SelectTrigger id="athlete-carbs" className="h-11"><SelectValue placeholder="Non testée" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non testée</SelectItem>
                    {CARB_TOLERANCE_OPTIONS.map(v => <SelectItem key={v} value={String(v)}>{v} g/h</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">Le plus haut apport pris sans gêne digestive sur une sortie longue à allure de course. Il plafonne les glucides de la simulation.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="athlete-sweat" className="text-xs">Taux de sueur testé (ml/h)</Label>
                  <Input id="athlete-sweat" type="number" inputMode="numeric" min={100} max={3000} placeholder="Non testé" className="h-11" value={identity.sweat} onChange={(e) => setIdentity(prev => ({ ...prev, sweat: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="athlete-salty" className="text-xs">Sueur salée</Label>
                  <Select value={identity.salty || undefined} onValueChange={(v) => setIdentity(prev => ({ ...prev, salty: v === "unknown" ? "" : v }))}>
                    <SelectTrigger id="athlete-salty" className="h-11"><SelectValue placeholder="Ne sait pas" /></SelectTrigger>
                    <SelectContent><SelectItem value="unknown">Ne sait pas</SelectItem><SelectItem value="yes">Oui (traces blanches)</SelectItem><SelectItem value="no">Non</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Sueur : pesée nue avant et après 1 h à allure de course ; perte de poids (g) + boisson bue (ml) = ml/h. Vide : estimée par la simulation.</p>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Produits de course (vide = produit type)</p>
                {(["gel", "bar", "drink"] as const).map(k => (
                  <div key={k} className={`grid gap-2 ${k === "drink" ? "grid-cols-[1fr_4rem_4rem_4.5rem]" : "grid-cols-[1fr_4rem_4rem]"}`}>
                    <Input aria-label={`${PRODUCT_LABEL[k]} : nom`} className="h-11" placeholder={DEFAULT_PRODUCTS[k].name} value={identity.products[k].name} onChange={(e) => setIdentity(prev => ({ ...prev, products: { ...prev.products, [k]: { ...prev.products[k], name: e.target.value } } }))} />
                    <Input aria-label={`${PRODUCT_LABEL[k]} : glucides (g)`} type="number" inputMode="numeric" className="h-11" placeholder={`${DEFAULT_PRODUCTS[k].carbsG} g`} value={identity.products[k].carbsG} onChange={(e) => setIdentity(prev => ({ ...prev, products: { ...prev.products, [k]: { ...prev.products[k], carbsG: e.target.value } } }))} />
                    <Input aria-label={`${PRODUCT_LABEL[k]} : sodium (mg)`} type="number" inputMode="numeric" className="h-11" placeholder={`${DEFAULT_PRODUCTS[k].sodiumMg} mg`} value={identity.products[k].sodiumMg} onChange={(e) => setIdentity(prev => ({ ...prev, products: { ...prev.products, [k]: { ...prev.products[k], sodiumMg: e.target.value } } }))} />
                    {k === "drink" && <Input aria-label="Boisson : volume de la dose (ml)" type="number" inputMode="numeric" className="h-11" placeholder={`${DEFAULT_PRODUCTS.drink.volumeMl} ml`} value={identity.products.drink.volumeMl} onChange={(e) => setIdentity(prev => ({ ...prev, products: { ...prev.products, drink: { ...prev.products.drink, volumeMl: e.target.value } } }))} />}
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">Nom, glucides (g) et sodium (mg) par gel, barre ou dose de boisson ; pour la boisson, le volume de la dose. Ils servent au plan « quand prendre quoi ».</p>
              </div>
              <p className="text-[11px] text-muted-foreground">{!identity.sex || !identity.birthDate
                ? "À renseigner : sans sexe ni âge, les repères de l’objectif (VO₂max, VMA, W/kg, CSS) restent ceux d’un groupe surtout masculin, non ajustés."
                : "Les repères de l’objectif (VO₂max, VMA, W/kg, CSS) sont ajustés au sexe et à l’âge."}</p>
            </div>
          );
          if (tab !== "bike" && tab !== "run") return null;
          const sheet = buildSnapshotSheet(formSheetSnapshot(), { durabilityPairs });
          const sportRows = (sheet.find(b => b.id === tab)?.rows ?? []).filter(r => /critique/.test(r.label));
          const durRows = (sheet.find(b => b.id === "durability")?.rows ?? []).filter(r => r.label.startsWith(tab === "bike" ? "Vélo" : "Course"));
          return (
            <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2 text-xs">
              <p className="font-medium">{tab === "bike" ? "Puissance critique et durabilité" : "Vitesse critique et durabilité"}</p>
              {sportRows.length ? sportRows.map(r => <p key={r.label}>{r.label} : <b>{r.value}</b>{r.source && ` (${r.source})`}</p>)
                : <p className="text-muted-foreground">{tab === "bike" ? "CP / W′ : pas encore enregistrée (Bike Day « Puissance critique » ou records Nolio)." : "CS / D′ : pas encore enregistrée (Track Day 1 500 / 3 000 / 1 000 m ou records Nolio)."}</p>}
              {durRows.length ? durRows.map(r => <p key={r.label}>{r.label} : <b>{r.value}</b></p>)
                : <p className="text-muted-foreground">Durabilité : pas encore mesurée (Durability Day ou sorties longues Nolio).</p>}
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setCriticalOpen(true); requestAnimationFrame(() => criticalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>
                {tab === "bike" ? "Valider ou corriger la CP" : "Valider ou corriger la CS"}
              </Button>
            </div>
          );
        }}
        renderExtra={(key) => {
          if (key === "ftp") return <div className="mt-1"><ThresholdOriginSelect field="ftp" value={formData.ftp_origin} onChange={(v) => setFormData(prev => ({ ...prev, ftp_origin: v }))} /></div>;
          if (key === "vma") return <div className="mt-1"><ThresholdOriginSelect field="vma" value={formData.vma_origin} onChange={(v) => setFormData(prev => ({ ...prev, vma_origin: v }))} /></div>;
          if (key === "pace_threshold") return <div className="mt-1"><ThresholdOriginSelect field="pace_threshold_sec_per_km" value={formData.pace_threshold_origin} onChange={(v) => setFormData(prev => ({ ...prev, pace_threshold_origin: v }))} /></div>;
          if (key === "fc_repos") return <NolioRestingHrHint athleteId={athleteId} value={formData.fc_repos ?? ""} onApply={applyNolioRestingHr} />;
          if (key === "vo2max") return (
            <div className="mt-1 space-y-1">
              <Select value={formData.vo2max_origin || undefined} onValueChange={(v) => setFormData(prev => ({ ...prev, vo2max_origin: v as Vo2maxOrigin }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Provenance de la VO₂max" /></SelectTrigger>
                <SelectContent>{VO2MAX_ORIGIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {formData.vo2max_origin === "watch" && <p className="text-[11px] text-muted-foreground">Gardée pour information : elle n’entre dans aucun calcul.</p>}
              {staffMode ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <Label htmlFor="vlamax" className="text-xs">VLamax vélo (labo)</Label>
                    <Input id="vlamax" type="number" step="0.01" placeholder="0.40" className="h-11" value={formData.vlamax} onChange={(e) => setFormData(prev => ({ ...prev, vlamax: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="vlamax_run" className="text-xs">VLamax course (labo)</Label>
                    <Input id="vlamax_run" type="number" step="0.01" placeholder="0.35" className="h-11" value={formData.vlamax_run} onChange={(e) => setFormData(prev => ({ ...prev, vlamax_run: e.target.value }))} />
                  </div>
                </div>
              ) : filledFrom.vlamax === "Labo" && formData.vlamax ? (
                <p className="text-[11px] text-muted-foreground">VLamax du rapport labo : {formData.vlamax} mmol/L/s (mesure).</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">VLamax : seulement une mesure de laboratoire (« PDF labo » ou mode Staff). Sinon l’app l’estime.</p>
              )}
              {filledFrom.fat_pct === "Labo" && formData.fat_pct && <p className="text-[11px] text-muted-foreground">Masse grasse du rapport labo : {formData.fat_pct} %.</p>}
            </div>
          );
          return null;
        }}
      />

      <details ref={criticalRef} open={criticalOpen} onToggle={(e) => setCriticalOpen((e.currentTarget as HTMLDetailsElement).open)} className="border-b border-border"><summary className="cursor-pointer py-3 text-sm font-medium">Repères critiques · Course et vélo{filledFrom.critical_metrics ? ` · rempli depuis ${filledFrom.critical_metrics}` : ""}</summary><CriticalEffortsPanel athleteLabel={athleteName} stored={parseStoredCriticalMetrics((formData as Record<string, unknown>).critical_metrics)} onSave={(sport, value) => setFormData(prev => { const m = criticalEnvelope(prev.critical_metrics); if (value) m[sport] = value; else delete m[sport]; return { ...prev, critical_metrics: Object.keys(m).length ? JSON.stringify(m) : "" }; })}/></details>

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
          <SnapshotSheet snapshot={s as unknown as SheetSnapshot} durabilityPairs={isActive ? durabilityPairs : []} athlete={{ sex: athleteRecord?.sex ?? null, birthDate: athleteRecord?.birth_date ?? null, carbToleranceGH: storedTolerance?.gh ?? null, sweatRateMlH: storedSweat?.mlH ?? null, saltySweater: storedSweat?.salty ?? null, products: Object.values(readRaceProducts(athleteRecord?.refs)).filter(p => p.custom).map(p => `${p.name} ${p.carbsG} g`) }} onEditBlock={(block) => openEdit(s, block)} />

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
        {legacy.items.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm" role="status">
            <p className="font-medium">Valeurs saisies dans l’ancien Profil</p>
            <p className="text-muted-foreground">
              {legacy.items.map(i => `${i.label} ${i.text}`).join(" · ")}.{" "}
              {legacy.toFill.length
                ? "Elles sont encore utilisées en secours, sans provenance. Reprends-les dans le bilan actif (cases vides seulement, marquées « saisie coach ») ; l’ancien Profil sera ensuite vidé."
                : "Le bilan actif a déjà ses propres valeurs : l’ancien Profil peut être vidé."}
            </p>
            <Button size="sm" onClick={migrateLegacy} disabled={migrating}>{migrating ? "Reprise…" : legacy.toFill.length ? "Reprendre dans le bilan actif" : "Vider l’ancien Profil"}</Button>
          </div>
        )}
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

/** Produits de course en cours de saisie (textes des champs). */
interface ProductDraft { name: string; carbsG: string; sodiumMg: string; volumeMl: string }
function emptyProductDrafts(): Record<ProductKind, ProductDraft> {
  return { gel: { name: "", carbsG: "", sodiumMg: "", volumeMl: "" }, bar: { name: "", carbsG: "", sodiumMg: "", volumeMl: "" }, drink: { name: "", carbsG: "", sodiumMg: "", volumeMl: "" } };
}
function productDrafts(refs: unknown): Record<ProductKind, ProductDraft> {
  const read = readRaceProducts(refs), out = emptyProductDrafts();
  for (const k of ["gel", "bar", "drink"] as const) if (read[k].custom) out[k] = { name: read[k].name, carbsG: String(read[k].carbsG), sodiumMg: String(read[k].sodiumMg), volumeMl: read[k].volumeMl ? String(read[k].volumeMl) : "" };
  return out;
}
/** Un produit n'est gardé que si ses glucides (et le volume pour la boisson) sont renseignés. */
function productsFromDrafts(d: Record<ProductKind, ProductDraft>): Record<ProductKind, RaceProduct | null> {
  const n = (v: string) => (Number(v) > 0 ? Number(v) : null);
  const one = (k: ProductKind): RaceProduct | null => {
    const carbsG = n(d[k].carbsG), volumeMl = k === "drink" ? n(d[k].volumeMl) : null;
    if (carbsG == null || (k === "drink" && volumeMl == null)) return null;
    return { name: d[k].name.trim() || DEFAULT_PRODUCTS[k].name, carbsG, sodiumMg: n(d[k].sodiumMg) ?? 0, ...(volumeMl != null ? { volumeMl } : {}) };
  };
  return { gel: one("gel"), bar: one("bar"), drink: one("drink") };
}
