/**
 * NolioStructureEditor — Édition minimaliste de la structure d'une séance
 * (warm-up / main / cool-down) avant envoi vers Nolio.
 *
 * Persiste dans `nolio_workout_overrides` : { session_id, sport_id, structured_workout }
 * où `structured_workout` est ici un tableau `[{ part, text, zones }, ...]`
 * (même shape que `LibraryWorkout.structure`). Le edge `nolio-send-plan`
 * détecte cette shape et l'utilise comme source de parsing à la place
 * du texte original de la séance.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const NOLIO_SPORT_OPTIONS = [
  { id: 2, label: "Course (2)" },
  { id: 14, label: "Vélo Route (14)" },
  { id: 18, label: "Home Trainer (18)" },
  { id: 19, label: "Natation (19)" },
  { id: 20, label: "Renforcement (20)" },
  { id: 52, label: "Trail (52)" },
];

export type OverridePart = { part: string; text: string; zones: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionLabel?: string;
  defaultSportId?: number;
  defaultStructure?: OverridePart[];
  onSaved?: () => void;
};

type Row = { text: string; zones: string };

function findRow(parts: OverridePart[] | undefined, keys: string[]): Row {
  const found = (parts ?? []).find((p) =>
    keys.some((k) => (p.part || "").toLowerCase().includes(k))
  );
  return {
    text: found?.text ?? "",
    zones: (found?.zones ?? []).join(", "),
  };
}

function parseZones(s: string): string[] {
  return s
    .split(/[,;]+/)
    .map((z) => z.trim())
    .filter(Boolean);
}

export function NolioStructureEditor({
  open,
  onClose,
  sessionId,
  sessionLabel,
  defaultSportId,
  defaultStructure,
  onSaved,
}: Props) {
  const [sportId, setSportId] = useState<number>(defaultSportId ?? 2);
  const [warm, setWarm] = useState<Row>({ text: "", zones: "" });
  const [main, setMain] = useState<Row>({ text: "", zones: "" });
  const [cool, setCool] = useState<Row>({ text: "", zones: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

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

      // Source : override si présent ET au bon format, sinon structure par défaut
      let parts: OverridePart[] | undefined;
      let sId = defaultSportId ?? 2;
      let isOverride = false;
      if (data) {
        sId = Number(data.sport_id) || sId;
        if (
          Array.isArray(data.structured_workout) &&
          data.structured_workout.length > 0 &&
          typeof (data.structured_workout as unknown[])[0] === "object" &&
          (data.structured_workout as Array<Record<string, unknown>>)[0]?.part !== undefined
        ) {
          parts = data.structured_workout as unknown as OverridePart[];
          isOverride = true;
        }
      }
      if (!parts) parts = defaultStructure;

      setSportId(sId);
      setWarm(findRow(parts, ["warm", "echauf", "éch"]));
      setMain(findRow(parts, ["main", "corps", "princ"]));
      setCool(findRow(parts, ["cool", "retour", "récup"]));
      setHasOverride(isOverride);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, sessionId, defaultSportId, defaultStructure]);

  const handleSave = async () => {
    setSaving(true);
    const structured_workout: OverridePart[] = [
      { part: "warm", text: warm.text.trim(), zones: parseZones(warm.zones) },
      { part: "main", text: main.text.trim(), zones: parseZones(main.zones) },
      { part: "cool", text: cool.text.trim(), zones: parseZones(cool.zones) },
    ].filter((p) => p.text.length > 0 || p.zones.length > 0);

    const { error } = await supabase
      .from("nolio_workout_overrides")
      .upsert(
        [{
          session_id: sessionId,
          sport_id: sportId,
          structured_workout: structured_workout as unknown as never,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: "session_id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Erreur sauvegarde", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Structure personnalisée sauvegardée", description: sessionId });
    onSaved?.();
    onClose();
  };

  const handleReset = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("nolio_workout_overrides")
      .delete()
      .eq("session_id", sessionId);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur réinitialisation", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Override supprimé", description: "Retour au texte original." });
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Éditer structure Nolio
            <div className="text-xs font-normal text-muted-foreground mt-1">
              <span className="font-mono">{sessionId}</span>
              {sessionLabel && <span> · {sessionLabel}</span>}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-4">
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

            {([
              { label: "Warm-up", row: warm, set: setWarm },
              { label: "Main", row: main, set: setMain },
              { label: "Cool-down", row: cool, set: setCool },
            ] as const).map(({ label, row, set }) => (
              <div key={label} className="space-y-1 rounded-md border p-2">
                <Label className="text-xs font-semibold">{label}</Label>
                <Textarea
                  className="text-xs min-h-[60px]"
                  placeholder="Texte de la séance…"
                  value={row.text}
                  onChange={(e) => set({ ...row, text: e.target.value })}
                />
                <div>
                  <Label className="text-[10px] text-muted-foreground">Zones (ex: Z1, Z2)</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Z1, Z2"
                    value={row.zones}
                    onChange={(e) => set({ ...row, zones: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          {hasOverride && (
            <Button variant="ghost" onClick={handleReset} disabled={saving} className="mr-auto">
              <RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
