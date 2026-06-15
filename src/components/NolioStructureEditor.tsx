/**
 * NolioStructureEditor — Modale d'édition de la structure Nolio (structured_workout)
 * pour une séance de la bibliothèque. Persiste dans `nolio_workout_overrides`.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Repeat, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type NolioIntensityType = "warmup" | "active" | "rest" | "cooldown";
export type NolioStepDurationType = "duration" | "distance";
export type NolioTargetType = "no_target" | "heartrate" | "power" | "pace";

export type NolioEditorStep = {
  type: "step";
  intensity_type: NolioIntensityType;
  step_duration_type: NolioStepDurationType;
  step_duration_value: number;
  target_type: NolioTargetType;
  target_value_min?: number;
  target_value_max?: number;
};

export type NolioEditorRep = {
  type: "repetition";
  intensity_type: "repetition";
  value: number;
  steps: NolioEditorStep[];
};

export type NolioEditorItem = NolioEditorStep | NolioEditorRep;

export const NOLIO_SPORT_OPTIONS = [
  { id: 2, label: "Course (2)" },
  { id: 14, label: "Vélo Route (14)" },
  { id: 18, label: "Home Trainer (18)" },
  { id: 19, label: "Natation (19)" },
  { id: 20, label: "Renforcement (20)" },
  { id: 52, label: "Trail (52)" },
];

function blankStep(): NolioEditorStep {
  return {
    type: "step",
    intensity_type: "active",
    step_duration_type: "duration",
    step_duration_value: 600,
    target_type: "no_target",
  };
}

function blankRep(): NolioEditorRep {
  return {
    type: "repetition",
    intensity_type: "repetition",
    value: 4,
    steps: [
      { ...blankStep(), intensity_type: "active", step_duration_value: 480 },
      { ...blankStep(), intensity_type: "rest", step_duration_value: 120 },
    ],
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionLabel?: string;
  defaultSportId?: number;
  onSaved?: () => void;
  workoutText?: string;
  sport?: string;
};

export function NolioStructureEditor({ open, onClose, sessionId, sessionLabel, defaultSportId, onSaved, workoutText, sport }: Props) {
  const [sportId, setSportId] = useState<number>(defaultSportId ?? 2);
  const [items, setItems] = useState<NolioEditorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("nolio_workout_overrides")
        .select("sport_id, structured_workout")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setSportId(Number(data.sport_id) || (defaultSportId ?? 2));
        setItems(Array.isArray(data.structured_workout) ? (data.structured_workout as NolioEditorItem[]) : []);
      } else {
        setSportId(defaultSportId ?? 2);
        setItems([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, sessionId, defaultSportId]);

  const updateItem = (idx: number, next: NolioEditorItem) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? next : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addStep = () => setItems((prev) => [...prev, blankStep()]);
  const addRep = () => setItems((prev) => [...prev, blankRep()]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      session_id: sessionId,
      sport_id: sportId,
      structured_workout: items as unknown as never,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("nolio_workout_overrides")
      .upsert([payload], { onConflict: "session_id" });

    setSaving(false);
    if (error) {
      toast({ title: "Erreur sauvegarde", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Structure Nolio sauvegardée", description: sessionId });
    onSaved?.();
    onClose();
  };

  const totalSec = useMemo(() => {
    let s = 0;
    for (const it of items) {
      if (it.type === "step") s += it.step_duration_value || 0;
      else s += (it.value || 0) * it.steps.reduce((a, st) => a + (st.step_duration_value || 0), 0);
    }
    return s;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Éditer la structure Nolio
            <div className="text-xs font-normal text-muted-foreground mt-1">
              <span className="font-mono">{sessionId}</span>
              {sessionLabel && <span> · {sessionLabel}</span>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sport Nolio</Label>
              <Select value={String(sportId)} onValueChange={(v) => setSportId(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOLIO_SPORT_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end text-xs text-muted-foreground">
              Durée totale estimée : <span className="font-mono ml-1">{Math.round(totalSec / 60)} min</span>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Aucun step défini. Utilisez les boutons ci-dessous.</p>
              )}
              {items.map((it, idx) => (
                <ItemCard
                  key={idx}
                  item={it}
                  onChange={(next) => updateItem(idx, next)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un step
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addRep}>
              <Repeat className="h-3 w-3 mr-1" /> Ajouter un bloc répétition
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepEditor({
  step,
  onChange,
  onRemove,
  compact,
}: {
  step: NolioEditorStep;
  onChange: (s: NolioEditorStep) => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const set = <K extends keyof NolioEditorStep>(k: K, v: NolioEditorStep[K]) => onChange({ ...step, [k]: v });
  const showTargets = step.target_type !== "no_target";
  return (
    <div className={`grid gap-2 ${compact ? "md:grid-cols-6" : "md:grid-cols-6"} grid-cols-2 items-end`}>
      <div>
        <Label className="text-[10px]">Type</Label>
        <Select value={step.intensity_type} onValueChange={(v) => set("intensity_type", v as NolioIntensityType)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="warmup">warmup</SelectItem>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="rest">rest</SelectItem>
            <SelectItem value="cooldown">cooldown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px]">Durée/Distance</Label>
        <Select value={step.step_duration_type} onValueChange={(v) => set("step_duration_type", v as NolioStepDurationType)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">duration (s)</SelectItem>
            <SelectItem value="distance">distance (m)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px]">Valeur</Label>
        <Input
          type="number"
          className="h-8 text-xs"
          value={step.step_duration_value}
          onChange={(e) => set("step_duration_value", parseInt(e.target.value, 10) || 0)}
        />
      </div>
      <div>
        <Label className="text-[10px]">Target</Label>
        <Select value={step.target_type} onValueChange={(v) => set("target_type", v as NolioTargetType)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no_target">no_target</SelectItem>
            <SelectItem value="heartrate">heartrate</SelectItem>
            <SelectItem value="power">power</SelectItem>
            <SelectItem value="pace">pace</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showTargets ? (
        <>
          <div>
            <Label className="text-[10px]">Min</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              value={step.target_value_min ?? ""}
              onChange={(e) => set("target_value_min", e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
            />
          </div>
          <div className="flex gap-1 items-end">
            <div className="flex-1">
              <Label className="text-[10px]">Max</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={step.target_value_max ?? ""}
                onChange={(e) => set("target_value_max", e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
              />
            </div>
            {onRemove && (
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="col-span-2 flex justify-end">
          {onRemove && (
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onChange,
  onRemove,
}: {
  item: NolioEditorItem;
  onChange: (i: NolioEditorItem) => void;
  onRemove: () => void;
}) {
  if (item.type === "step") {
    return (
      <Card>
        <CardContent className="p-3">
          <StepEditor step={item} onChange={onChange} onRemove={onRemove} />
        </CardContent>
      </Card>
    );
  }
  const rep = item;
  const updateChild = (i: number, s: NolioEditorStep) =>
    onChange({ ...rep, steps: rep.steps.map((c, idx) => (idx === i ? s : c)) });
  const removeChild = (i: number) =>
    onChange({ ...rep, steps: rep.steps.filter((_, idx) => idx !== i) });
  const addChild = () =>
    onChange({ ...rep, steps: [...rep.steps, blankStep()] });
  return (
    <Card className="border-primary/40">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <Label className="text-xs">Répétitions</Label>
          <Input
            type="number"
            className="h-8 w-20 text-xs"
            value={rep.value}
            onChange={(e) => onChange({ ...rep, value: parseInt(e.target.value, 10) || 1 })}
          />
          <span className="text-xs text-muted-foreground">× les steps ci-dessous</span>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={onRemove}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
        <div className="space-y-2 pl-4 border-l-2 border-primary/30">
          {rep.steps.map((s, i) => (
            <StepEditor key={i} step={s} onChange={(ns) => updateChild(i, ns)} onRemove={() => removeChild(i)} compact />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addChild}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter un step enfant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
