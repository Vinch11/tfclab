import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

type NolioAthlete = { nolio_id: number; name?: string; is_coach?: boolean };
type TfclAthlete = { id: string; name: string | null; nolio_id: number | null };

const NONE_VALUE = "__none__";
const SYSTEM_PATTERNS = ["LITTÉRATURE", "LITTERATURE", "COHORT", "TEST", "REFERENCE"];

function isSystemAthlete(name: string | null | undefined): boolean {
  if (!name) return false;
  const upper = name.toUpperCase();
  return SYSTEM_PATTERNS.some((p) => upper.includes(p));
}

export function NolioLinkAthletesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nolioAthletes, setNolioAthletes] = useState<NolioAthlete[]>([]);
  const [tfclAthletes, setTfclAthletes] = useState<TfclAthlete[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!open || !user || !session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSavedOk(false);
    (async () => {
      try {
        const { data: athletesData, error: athErr } = await supabase
          .from("athletes")
          .select("id, name, nolio_id")
          .eq("coach_id", user.id);
        if (athErr) throw athErr;

        const filtered = (athletesData ?? []).filter((a) => !isSystemAthlete(a.name));

        const { data: listData, error: listErr } = await supabase.functions.invoke(
          "nolio-list-athletes",
          { body: {} },
        );
        if (listErr) throw listErr;
        const list = ((listData as { athletes?: unknown[] })?.athletes ?? []) as NolioAthlete[];

        if (cancelled) return;
        const coachEntries = list.filter((n) => n.is_coach);
        const others = list.filter((n) => !n.is_coach).sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", "fr", { sensitivity: "base" }),
        );
        setNolioAthletes([...coachEntries, ...others]);
        setTfclAthletes(filtered);

        const initial: Record<string, string> = {};
        for (const a of filtered) {
          initial[a.id] = a.nolio_id != null ? String(a.nolio_id) : NONE_VALUE;
        }
        setSelections(initial);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user, session]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const updates = tfclAthletes.map((a) => {
        const sel = selections[a.id];
        const nolioId = sel && sel !== NONE_VALUE ? Number(sel) : null;
        return { id: a.id, nolio_id: nolioId };
      });
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from("athletes")
          .update({ nolio_id: u.nolio_id })
          .eq("id", u.id);
        if (upErr) throw upErr;
      }
      setSavedOk(true);
      toast({ title: "Liaisons enregistrées" });
    } catch (e) {
      setError((e as Error).message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Lier les athlètes Nolio</DialogTitle>
          <DialogDescription>
            Associez chaque athlète TFCLab à son équivalent Nolio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          ) : tfclAthletes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              Aucun athlète TFCLab à lier.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-2 font-medium">Athlète TFCLab</th>
                  <th className="py-2 pl-2 font-medium">Athlète Nolio</th>
                </tr>
              </thead>
              <tbody>
                {tfclAthletes.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-medium">{a.name ?? "—"}</td>
                    <td className="py-2 pl-2">
                      <Select
                        value={selections[a.id] ?? NONE_VALUE}
                        onValueChange={(v) =>
                          setSelections((s) => ({ ...s, [a.id]: v }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {nolioAthletes.map((n) => (
                            <SelectItem key={n.nolio_id} value={String(n.nolio_id)}>
                              {n.name ?? `#${n.nolio_id}`}
                            </SelectItem>
                          ))}
                          <SelectItem value={NONE_VALUE}>Aucun compte Nolio</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>


        <DialogFooter className="flex sm:justify-between items-center gap-3">
          {savedOk ? (
            <div className="flex items-center gap-2 text-success text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Liaisons enregistrées
            </div>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Fermer
            </Button>
            <Button onClick={handleSave} disabled={loading || saving || tfclAthletes.length === 0}>
              {saving ? "Enregistrement..." : "Enregistrer les liaisons"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
