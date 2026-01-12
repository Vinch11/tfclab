// =============================================
// FIX 11 - PANNEAU PROFIL & RÉFÉRENCES
// Édition centralisée des refs athlète
// =============================================

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Activity, Save, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useCloudData, DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { calculateAge } from "@/lib/ageAdjustment";
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
  onUpdate?: () => void;
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

const PHYSIO_FIELDS: RefFieldConfig[] = [
  { key: "fcMax", label: "FCmax", unit: "bpm", placeholder: "190", min: 100, max: 250, profileKey: "fcMax" },
  { key: "vma", label: "VMA", unit: "km/h", placeholder: "18.5", step: "0.1", min: 8, max: 30, profileKey: "vma" },
  { key: "ftp", label: "FTP", unit: "W", placeholder: "280", min: 50, max: 500, profileKey: "ftp" },
  { key: "css", label: "CSS", unit: "s/100m", placeholder: "95", min: 50, max: 200, profileKey: "css" },
  { key: "vo2max", label: "VO₂max", unit: "ml/kg/min", placeholder: "55", step: "0.1", min: 20, max: 100, profileKey: "vo2max" },
];

export function AthleteRefsPanel({ athlete, snapshots, onUpdate, compact = false }: AthleteRefsPanelProps) {
  const { updateAthlete } = useCloudData();
  
  // Calcul des refs effectives
  const effective = useMemo(() => getEffectiveRefs(athlete, snapshots), [athlete, snapshots]);
  
  // État local du formulaire (valeurs profil uniquement)
  const [form, setForm] = useState<Record<string, string>>({});
  const [birthDate, setBirthDate] = useState(athlete.birth_date || "");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const age = calculateAge(birthDate);

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

    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.profileKey} className="text-sm font-medium">
            {field.label} <span className="text-muted-foreground text-xs">({field.unit})</span>
          </Label>
          <Badge 
            variant="outline" 
            className={`text-xs ${getSourceBadgeClass(source)}`}
          >
            {getSourceLabel(source)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isFromSnapshot && (
            <div className="flex-1 px-3 py-2 rounded-md bg-success/5 border border-success/20 text-sm font-medium">
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
            className={`${isFromSnapshot ? "w-24 text-center" : "flex-1"} bg-secondary/50`}
            title={isFromSnapshot ? "Valeur profil (snapshot prioritaire)" : undefined}
          />
        </div>
        
        {isFromSnapshot && formValue && (
          <p className="text-xs text-muted-foreground">
            Profil: {formValue} {field.unit} (snapshot prioritaire)
          </p>
        )}
      </div>
    );
  };

  // Mode compact pour sidebar
  if (compact) {
    const missingCount = Object.values(effective.sources).filter(s => s === "none").length;
    
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil & Références
            {missingCount > 0 && (
              <Badge variant="outline" className="ml-auto bg-warning/10 text-warning border-warning/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                {missingCount} manquant{missingCount > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[...ANTHROPO_FIELDS, ...PHYSIO_FIELDS].slice(0, 6).map(field => (
              <div key={field.key} className="flex justify-between">
                <span className="text-muted-foreground">{field.label}:</span>
                <span className={effective.sources[field.key] === "none" ? "text-muted-foreground" : ""}>
                  {effective[field.key] != null 
                    ? `${effective[field.key]!.toFixed(field.step === "0.1" ? 1 : 0)} ${field.unit}`
                    : "—"
                  }
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil & Références
          </CardTitle>
          {isDirty && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
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
                {age !== null && (
                  <Badge variant="outline" className="whitespace-nowrap">
                    {age} ans
                  </Badge>
                )}
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
