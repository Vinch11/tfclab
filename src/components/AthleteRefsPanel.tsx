// =============================================
// FIX 11 - PANNEAU PROFIL & RÉFÉRENCES
// Édition centralisée des refs athlète
// =============================================

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Activity, 
  Save, 
  AlertCircle, 
  Calendar, 
  Zap, 
  Timer, 
  Weight, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCloudData, DbAthlete, DbSnapshot } from "@/contexts/CloudDataContext";
import { AgeAdjustmentBadge } from "@/components/AgeAdjustmentBadge";
import { OutOfDomainBadge } from "@/components/OutOfDomainBadge";

import { 
  getEffectiveRefs, 
  getSourceLabel, 
  getSourceBadgeClass,
  type EffectiveRefs,
  type RefSource
} from "@/lib/effectiveRefs";

interface AthleteRefsPanelProps {
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  snapshot?: {
    ftp?: number | null;
    weight_kg?: number | null;
    vlamax?: number | null;
    vlamax_run?: number | null;
    tte_observed_min?: number | null;
    vo2max?: number | null;
    pmax_5s?: number | null;
    p30s_w?: number | null;
    vma?: number | null;
    css?: number | null;
    fc_max?: number | null;
  } | null;
  athleteGoal?: string;
  onUpdate?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCAPTest?: () => void;
  onNavigateToTFCLTest?: () => void;
  compact?: boolean;
}

interface RefFieldConfig {
  key: keyof EffectiveRefs["sources"];
  label: string;
  unit: string;
  placeholder: string;
  step?: string;
  min?: number;
  max?: number;
  profileKey: string;
}

const ANTHROPO_FIELDS: RefFieldConfig[] = [
  { key: "weightKg", label: "Poids", unit: "kg", placeholder: "68", step: "0.1", min: 30, max: 200, profileKey: "weightKg" },
  { key: "fatPct", label: "Masse grasse", unit: "%", placeholder: "12", step: "0.1", min: 3, max: 50, profileKey: "fatPct" },
];

const PHYSIO_FIELDS_ALL: RefFieldConfig[] = [
  { key: "fcMax", label: "FCmax", unit: "bpm", placeholder: "190", min: 100, max: 250, profileKey: "fcMax" },
  { key: "vma", label: "VMA", unit: "km/h", placeholder: "18.5", step: "0.1", min: 8, max: 30, profileKey: "vma" },
  { key: "ftp", label: "FTP", unit: "W", placeholder: "280", min: 50, max: 500, profileKey: "ftp" },
  { key: "css", label: "CSS", unit: "s/100m", placeholder: "95", min: 50, max: 200, profileKey: "css" },
  { key: "vo2max", label: "VO₂max", unit: "ml/kg/min", placeholder: "55", step: "0.1", min: 20, max: 100, profileKey: "vo2max" },
];

// Champs masqués en mode running (pas pertinents pour un coureur)
const RUNNING_HIDDEN_PHYSIO_KEYS = ["ftp", "css"];

export function AthleteRefsPanel({ 
  athlete, 
  snapshots, 
  snapshot,
  athleteGoal = "IM",
  onUpdate, 
  onNavigateToProfile,
  onNavigateToCAPTest,
  onNavigateToTFCLTest,
  compact = false 
}: AthleteRefsPanelProps) {
  const { updateAthlete } = useCloudData();
  
  // Détection mode running
  const isRunningGoal = ["Marathon", "Semi", "5K", "10K", "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra"].includes(athleteGoal);
  const PHYSIO_FIELDS = isRunningGoal 
    ? PHYSIO_FIELDS_ALL.filter(f => !RUNNING_HIDDEN_PHYSIO_KEYS.includes(f.key))
    : PHYSIO_FIELDS_ALL;
  
  // Calcul des refs effectives
  const effective = useMemo(() => getEffectiveRefs(athlete, snapshots), [athlete, snapshots]);
  
  // État local du formulaire (valeurs profil uniquement)
  const [form, setForm] = useState<Record<string, string>>({});
  const [birthDate, setBirthDate] = useState(athlete.birth_date || "");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCompactExpanded, setIsCompactExpanded] = useState(false);

  // Initialiser le formulaire avec les valeurs profil actuelles
  useEffect(() => {
    const currentRefs = (athlete.refs && typeof athlete.refs === "object") 
      ? athlete.refs as Record<string, number | null>
      : {};
    
    const newForm: Record<string, string> = {};
    [...ANTHROPO_FIELDS, ...PHYSIO_FIELDS].forEach(field => {
      const val = currentRefs[field.profileKey];
      newForm[field.profileKey] = val != null ? String(val) : "";
    });
    setForm(newForm);
    setBirthDate(athlete.birth_date || "");
    setIsDirty(false);
  }, [athlete.refs, athlete.birth_date]);

  const handleBirthDateChange = (value: string) => {
    setBirthDate(value);
    setIsDirty(true);
  };

  const handleChange = (profileKey: string, value: string) => {
    setForm(prev => ({ ...prev, [profileKey]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentRefs = (athlete.refs && typeof athlete.refs === "object")
        ? { ...athlete.refs as Record<string, unknown> }
        : {};

      // Mettre à jour avec les nouvelles valeurs
      [...ANTHROPO_FIELDS, ...PHYSIO_FIELDS].forEach(field => {
        const val = form[field.profileKey];
        if (val === "" || val == null) {
          currentRefs[field.profileKey] = null;
        } else {
          const parsed = parseFloat(val);
          currentRefs[field.profileKey] = isNaN(parsed) ? null : parsed;
        }
      });

      const success = await updateAthlete(athlete.id, { 
        refs: currentRefs as any,
        birth_date: birthDate || null
      });
      if (success) {
        toast.success("Profil mis à jour");
        setIsDirty(false);
        onUpdate?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: RefFieldConfig) => {
    const effectiveValue = effective[field.key];
    const source = effective.sources[field.key];
    const formValue = form[field.profileKey] || "";

    // Si valeur vient du snapshot, montrer la valeur effective + input profil séparé
    const isFromSnapshot = source === "snapshot";

    // Métrique littérature pour flag "hors domaine" (uniquement VO₂max ici — VLamax n'est pas dans PHYSIO_FIELDS)
    const outOfDomainMetric =
      field.key === "vo2max" ? (isRunningGoal ? "run_vo2max" : "bike_vo2max") : null;

    return (
      <div key={field.key} className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={field.profileKey} className="text-sm font-medium truncate">
            {field.label} <span className="text-muted-foreground text-xs">({field.unit})</span>
          </Label>
          <div className="flex items-center gap-1 shrink-0">
            {outOfDomainMetric && effectiveValue != null && (
              <OutOfDomainBadge metric={outOfDomainMetric} value={effectiveValue} />
            )}
            <Badge
              variant="outline"
              className={`text-xs ${getSourceBadgeClass(source)}`}
            >
              {getSourceLabel(source)}
            </Badge>
          </div>
        </div>

        
        <div className="flex items-center gap-2 min-w-0">
          {isFromSnapshot && (
            <div className="flex-1 min-w-0 px-3 py-2 rounded-md bg-success/5 border border-success/20 text-sm font-medium truncate">
              {effectiveValue != null ? effectiveValue.toFixed(field.step === "0.1" ? 1 : 0) : "—"} {field.unit}
            </div>
          )}
          
          <Input
            id={field.profileKey}
            type="number"
            step={field.step || "1"}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            value={formValue}
            onChange={(e) => handleChange(field.profileKey, e.target.value)}
            className={`${isFromSnapshot ? "w-24 text-center shrink-0" : "flex-1"} bg-secondary/50 min-w-0`}
            title={isFromSnapshot ? "Valeur profil (snapshot prioritaire)" : undefined}
          />
        </div>
        
        {isFromSnapshot && formValue && (
          <p className="text-xs text-muted-foreground truncate">
            Profil: {formValue} {field.unit} (snapshot prioritaire)
          </p>
        )}
      </div>
    );
  };

  // Mode compact pour dashboard - intègre les données manquantes
  if (compact) {
    const missingCount = Object.values(effective.sources).filter(s => s === "none").length;
    
    // Calculer les données manquantes du snapshot (métaboliques)
    const isTriathlon = ["IM", "Ironman", "70.3", "703", "TriathlonLD"].includes(athleteGoal);
    const isRunning = ["Marathon", "Semi", "5K", "10K", "StartToRun", "Course", "Trail", "TrailShort", "TrailMountain", "TrailUltra"].includes(athleteGoal);
    
    const metabolicFields = [
      ...(isRunning ? [] : [
        { key: "vlamax", label: "VLamax Vélo", value: snapshot?.vlamax, priority: isTriathlon ? "critical" : "critical" as const },
      ]),
      { key: "tte", label: "TTE", value: snapshot?.tte_observed_min, priority: "critical" as const },
      ...(isRunning ? [] : [
        { key: "ftp", label: "FTP", value: snapshot?.ftp, priority: "critical" as const },
        { key: "pmax_5s", label: "Pmax 5s", value: snapshot?.pmax_5s, priority: "important" as const },
        { key: "p30s_w", label: "P30s", value: snapshot?.p30s_w, priority: "important" as const },
      ]),
      ...(isTriathlon || isRunning ? [
        { key: "vlamax_run", label: "VLamax CAP", value: snapshot?.vlamax_run, priority: "critical" as const },
        { key: "vma", label: "VMA", value: snapshot?.vma, priority: isRunning ? "critical" : "important" as const },
      ] : []),
      { key: "vo2max", label: "VO₂max", value: snapshot?.vo2max, priority: isRunning ? "critical" : "recommended" as const },
      { key: "fc_max", label: "FC Max", value: snapshot?.fc_max, priority: "recommended" as const },
    ];
    
    const missingMetabolic = metabolicFields.filter(f => f.value == null);
    const criticalMissing = missingMetabolic.filter(f => f.priority === "critical");
    const totalFieldCount = [...ANTHROPO_FIELDS, ...PHYSIO_FIELDS].length + metabolicFields.length;
    const completedCount = totalFieldCount - missingCount - missingMetabolic.length;
    const completionPct = Math.round((completedCount / totalFieldCount) * 100);
    const hasCriticalMissing = criticalMissing.length > 0 || missingCount > 2;
    const isComplete = missingCount === 0 && missingMetabolic.length === 0;
    
    return (
      <Card className={cn(
        "border-border/50",
        hasCriticalMissing && "border-warning/30",
        isComplete && "border-primary/30 bg-primary/5"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil & Données
            </CardTitle>
            {isComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complet
              </Badge>
            ) : (
              <Badge variant="outline" className={cn(
                hasCriticalMissing 
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-muted text-muted-foreground"
              )}>
                {completionPct}%
              </Badge>
            )}
          </div>
          {!isComplete && (
            <Progress 
              value={completionPct} 
              className={cn("h-1.5 mt-2", hasCriticalMissing && "[&>div]:bg-warning")}
            />
          )}
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          {/* Références actuelles - toujours visible */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {[...ANTHROPO_FIELDS, ...PHYSIO_FIELDS].slice(0, 6).map(field => (
              <div key={field.key} className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{field.label}:</span>
                <span className={cn(
                  "text-xs font-medium",
                  effective.sources[field.key] === "none" ? "text-muted-foreground" : ""
                )}>
                  {effective[field.key] != null 
                    ? `${effective[field.key]!.toFixed(field.step === "0.1" ? 1 : 0)} ${field.unit}`
                    : "—"
                  }
                </span>
              </div>
            ))}
          </div>
          
          {/* Section données manquantes (collapsible) */}
          {!isComplete && (
            <>
              <Separator className="my-2" />
              
              <Collapsible open={isCompactExpanded} onOpenChange={setIsCompactExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-between p-2 h-auto",
                      hasCriticalMissing ? "bg-destructive/5 hover:bg-destructive/10" : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className={cn(
                        "h-3.5 w-3.5",
                        hasCriticalMissing ? "text-destructive" : "text-warning"
                      )} />
                      <span className="text-xs font-medium">
                        {missingCount + missingMetabolic.length} donnée{(missingCount + missingMetabolic.length) > 1 ? "s" : ""} manquante{(missingCount + missingMetabolic.length) > 1 ? "s" : ""}
                      </span>
                    </div>
                    {isCompactExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="pt-2 space-y-2">
                  {/* Champs critiques */}
                  {criticalMissing.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Critiques
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {criticalMissing.map(f => (
                          <Badge key={f.key} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Champs profil manquants */}
                  {missingCount > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Profil
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {[...ANTHROPO_FIELDS, ...PHYSIO_FIELDS]
                          .filter(f => effective.sources[f.key] === "none")
                          .map(f => (
                            <Badge key={f.key} variant="outline" className="text-xs">
                              {f.label}
                            </Badge>
                          ))
                        }
                      </div>
                    </div>
                  )}
                  
                  {/* Actions rapides */}
                  <div className="pt-2 space-y-1.5">
                    {onNavigateToProfile && (
                      <Button
                        onClick={onNavigateToProfile}
                        size="sm"
                        variant={hasCriticalMissing ? "default" : "secondary"}
                        className="w-full h-7 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Compléter le profil
                      </Button>
                    )}
                    <div className="flex gap-1.5">
                      {onNavigateToTFCLTest && (
                        <Button 
                          onClick={onNavigateToTFCLTest}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Tests TFCL
                        </Button>
                      )}
                      {onNavigateToCAPTest && (
                        <Button 
                          onClick={onNavigateToCAPTest}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                        >
                          <Activity className="h-3 w-3 mr-1" />
                          Tests CAP
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil & Références
          </CardTitle>
          <div className="flex items-center gap-2">
            <QuickChronoDialog athleteId={athlete.id} snapshots={snapshots} activeSnapshotId={athlete.active_snapshot_id ?? null} onSaved={onUpdate} />
            {isDirty && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </div>
        </div>
        {effective.snapshotUsed && (
          <p className="text-sm text-muted-foreground">
            Snapshot actif: {effective.snapshotUsed.date}
            {effective.snapshotUsed.cycle_tag && ` (${effective.snapshotUsed.cycle_tag})`}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Date de naissance + Anthropométrie */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date de naissance */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="birthDate" className="text-sm font-medium">
                  Date de naissance
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="flex-1 bg-secondary/50"
                />
                <AgeAdjustmentBadge 
                  birthDate={birthDate} 
                  variant="compact" 
                  showTooltip={false}
                />
              </div>
            </div>
            {ANTHROPO_FIELDS.map(renderField)}
          </div>
        </div>

        <Separator />

        {/* Références physiologiques */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Références physiologiques
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHYSIO_FIELDS.map(renderField)}
          </div>
        </div>

        {/* Badge AAI avec explications détaillées */}
        {birthDate && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
            <AgeAdjustmentBadge 
              birthDate={birthDate} 
              variant="full"
            />
            <p className="text-xs text-muted-foreground">
              L'âge impacte les cibles TTE, {isRunningGoal ? "VMA" : "FTP/kg"}, le risque blessure et les recommandations nutritionnelles.
            </p>
          </div>
        )}

        {/* Info sur la priorité */}
        <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
          <p className="font-medium mb-1">📋 Priorité des valeurs:</p>
          <p>Snapshot actif → Profil → Non renseigné</p>
          <p className="mt-1">Les valeurs du snapshot (si actif) sont prioritaires. Vous pouvez toujours saisir des valeurs profil qui seront utilisées en l'absence de snapshot.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// QuickChronoDialog — Saisie rapide d'un chrono (par défaut: semi)
// Met à jour le snapshot actif (ou crée un snapshot minimal).
// ============================================================
type ChronoDistance = "5k" | "10k" | "20k" | "half" | "marathon";
const CHRONO_OPTIONS: { value: ChronoDistance; label: string; km: number }[] = [
  { value: "5k", label: "5 km", km: 5 },
  { value: "10k", label: "10 km", km: 10 },
  { value: "20k", label: "20 km", km: 20 },
  { value: "half", label: "Semi-marathon (21,1 km)", km: 21.0975 },
  { value: "marathon", label: "Marathon (42,2 km)", km: 42.195 },
];
const CHRONO_FIELDS: Record<ChronoDistance, { sec: string; date: string }> = {
  "5k": { sec: "time_5k_sec", date: "time_5k_date" },
  "10k": { sec: "time_10k_sec", date: "time_10k_date" },
  "20k": { sec: "time_20k_sec", date: "time_20k_date" },
  half: { sec: "time_half_sec", date: "time_half_date" },
  marathon: { sec: "time_marathon_sec", date: "time_marathon_date" },
};

function QuickChronoDialog({
  athleteId,
  snapshots,
  activeSnapshotId,
  onSaved,
}: {
  athleteId: string;
  snapshots: DbSnapshot[];
  activeSnapshotId: string | null;
  onSaved?: () => void;
}) {
  const { addSnapshot, loadData } = useCloudData();
  const [open, setOpen] = useState(false);
  const [distance, setDistance] = useState<ChronoDistance>("half");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [dateChrono, setDateChrono] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const activeSnapshot = useMemo(() => {
    if (activeSnapshotId) return snapshots.find((s) => s.id === activeSnapshotId);
    return snapshots
      .filter((s) => s.athlete_id === athleteId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  }, [snapshots, activeSnapshotId, athleteId]);

  const opt = CHRONO_OPTIONS.find((o) => o.value === distance)!;
  const cleanTimePart = (value: string, max: number) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    if (!digits) return "";
    return String(Math.min(Number(digits), max));
  };
  const parsed = (Number(hours || 0) * 3600) + (Number(minutes || 0) * 60) + Number(seconds || 0);
  const paceHint = parsed && parsed > 0
    ? (() => {
        const paceSec = Math.round(parsed / opt.km);
        return `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, "0")}/km`;
      })()
    : null;

  const handleSave = async () => {
    if (!parsed || parsed < 60) {
      toast.error("Chrono invalide. Renseigne au moins les minutes.");
      return;
    }
    if (!dateChrono) {
      toast.error("Renseigne la date du chrono");
      return;
    }
    setSaving(true);
    try {
      let snapshotId = activeSnapshot?.id;
      if (!snapshotId) {
        const created = await addSnapshot({
          athlete_id: athleteId,
          coach_id: "",
          date: dateChrono,
          source: "race_time_quick_entry",
        } as any);
        if (!created) { setSaving(false); return; }
        snapshotId = created.id;
      }
      const fields = CHRONO_FIELDS[distance];
      const { error } = await supabase
        .from("snapshots")
        .update({ [fields.sec]: parsed, [fields.date]: dateChrono })
        .eq("id", snapshotId);
      if (error) {
        toast.error(`Erreur : ${error.message}`);
        setSaving(false);
        return;
      }
      toast.success(`Chrono ${opt.label} enregistré`);
      setHours("");
      setMinutes("");
      setSeconds("");
      await loadData();
      onSaved?.();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Timer className="h-4 w-4" />
          Saisir chrono
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Saisir un chrono récent
          </DialogTitle>
          <DialogDescription>
            Alimente l'analyse durabilité, l'économie de course (CAP) et la calibration MLSS.
            Saisis heures, minutes et secondes séparément.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Distance</Label>
            <Select value={distance} onValueChange={(v) => setDistance(v as ChronoDistance)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHRONO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Chrono</Label>
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                <Input
                  placeholder="h"
                  value={hours}
                  onChange={(e) => setHours(cleanTimePart(e.target.value, 23))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  className="text-center"
                  aria-label="heures"
                />
                <span className="text-muted-foreground font-mono">:</span>
                <Input
                  placeholder="mm"
                  value={minutes}
                  onChange={(e) => setMinutes(cleanTimePart(e.target.value, 59))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  className="text-center"
                  aria-label="minutes"
                />
                <span className="text-muted-foreground font-mono">:</span>
                <Input
                  placeholder="ss"
                  value={seconds}
                  onChange={(e) => setSeconds(cleanTimePart(e.target.value, 59))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  className="text-center"
                  aria-label="secondes"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateChrono}
                onChange={(e) => setDateChrono(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          {paceHint && (
            <p className="text-xs text-muted-foreground">
              Allure moyenne&nbsp;: <span className="font-medium text-foreground">{paceHint}</span>
            </p>
          )}
          {!activeSnapshot && (
            <p className="text-xs text-muted-foreground italic">
              Aucun snapshot actif — un snapshot minimal sera créé automatiquement.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !parsed} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
