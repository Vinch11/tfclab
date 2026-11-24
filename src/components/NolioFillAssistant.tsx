import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NolioPeriodTestFinder } from "@/components/NolioPeriodTestFinder";
import { NolioCriticalRecordsImporter } from "@/components/NolioCriticalRecordsImporter";
import { NolioDurabilityFinder } from "@/components/NolioDurabilityFinder";
import type { SnapshotRecordFields } from "@/lib/nolioV2Records";
import type { CriticalMetricKey, StoredCriticalMetrics, StoredCriticalSport } from "@/lib/criticalMetrics";
import type { DurabilitySport, StoredDurability, StoredDurabilitySport } from "@/lib/durability/longSessionDurability";

type NolioAthlete = { id: string; name: string; has_api_access: boolean };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const DAY = 864e5;

interface Props {
  athleteName: string;
  current: Record<string, unknown>;
  storedCritical: StoredCriticalMetrics;
  storedDurability: StoredDurability;
  onApplyFields: (fields: SnapshotRecordFields, notes: string) => void;
  onSaveCritical: (sport: CriticalMetricKey, value: StoredCriticalSport | null) => void;
  onSaveDurability: (sport: DurabilitySport, value: StoredDurabilitySport) => void;
}

/**
 * Assistant Nolio unique : un athlète, une période, une recherche.
 * Enchaîne les lectures (tests → records critiques → durabilité) pour ménager l'API Nolio ;
 * chaque résultat reste à valider par le coach avant d'entrer dans la fiche.
 */
export function NolioFillAssistant({ athleteName, current, storedCritical, storedDurability, onApplyFields, onSaveCritical, onSaveDurability }: Props) {
  const [athletes, setAthletes] = useState<NolioAthlete[] | null>(null);
  const [athlete, setAthlete] = useState("");
  const [from, setFrom] = useState(iso(new Date(Date.now() - 42 * DAY)));
  const [to, setTo] = useState(iso(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState({ tests: 0, records: 0, durability: 0 });
  const [stage, setStage] = useState<"idle" | "tests" | "records" | "durability" | "done">("idle");

  useEffect(() => {
    let live = true;
    supabase.functions.invoke("nolio-v2-oauth", { body: { action: "catalogues" } }).then(({ data, error: e }) => {
      if (!live) return;
      if (e) { setError("Connexion Nolio indisponible."); setAthletes([]); return; }
      const list = ((data as { athletes?: NolioAthlete[] } | null)?.athletes ?? []).filter(a => a.has_api_access);
      setAthletes(list);
      const match = list.find(a => norm(a.name) === norm(athleteName)) ?? list.find(a => norm(a.name).includes(norm(athleteName).split(" ")[0] ?? ""));
      if (match) setAthlete(match.id);
    });
    return () => { live = false; };
  }, [athleteName]);

  const start = () => {
    setStage("tests");
    setKeys(k => ({ ...k, tests: k.tests + 1 }));
  };
  const testsDone = useCallback(() => { setStage("records"); setKeys(k => ({ ...k, records: k.records + 1 })); }, []);
  const recordsDone = useCallback(() => { setStage("durability"); setKeys(k => ({ ...k, durability: k.durability + 1 })); }, []);
  const durabilityDone = useCallback(() => setStage("done"), []);
  const reset = () => { setStage("idle"); setKeys({ tests: 0, records: 0, durability: 0 }); };

  const busy = stage === "tests" || stage === "records" || stage === "durability";
  const durabilityFrom = iso(new Date(Date.parse(to + "T00:00:00Z") - 89 * DAY));
  const athleteLabel = athletes?.find(a => a.id === athlete)?.name;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Une seule recherche lit les tests de la période, les records de puissance et les sorties longues. Rien n’entre dans la fiche sans ta validation, et une valeur déjà saisie n’est jamais remplacée.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:min-w-0">
        <div className="sm:col-span-2">
          <Label htmlFor="nolio-fill-athlete">Athlète Nolio</Label>
          <select id="nolio-fill-athlete" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={athlete} disabled={busy || !athletes} onChange={e => { setAthlete(e.target.value); reset(); }}>
            <option value="">{athletes ? "Choisir un athlète" : "Chargement…"}</option>
            {athletes?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div><Label htmlFor="nolio-fill-from">Tests du</Label><Input id="nolio-fill-from" type="date" value={from} max={to} disabled={busy} onChange={e => { setFrom(e.target.value); reset(); }} /></div>
        <div><Label htmlFor="nolio-fill-to">Au (inclus)</Label><Input id="nolio-fill-to" type="date" value={to} min={from} disabled={busy} onChange={e => { setTo(e.target.value); reset(); }} /></div>
      </div>
      <Button className="h-auto min-h-11 max-w-full whitespace-normal" onClick={start} disabled={busy || !athlete || !from || !to || from > to}>
        <Search className="mr-2 h-4 w-4 shrink-0" />
        {busy ? `Lecture Nolio… (${stage === "tests" ? "1" : stage === "records" ? "2" : "3"}/3)` : stage === "done" ? "Relancer la recherche" : "Chercher dans Nolio"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {athlete && stage !== "idle" && (
        <div className="space-y-4 divide-y divide-border rounded-lg border border-border bg-background p-3">
          <NolioPeriodTestFinder embedded athlete={athlete} from={from} to={to} current={current} onApply={onApplyFields} runKey={keys.tests} onDone={testsDone} />
          <NolioCriticalRecordsImporter athleteName={athleteLabel ?? athleteName} stored={storedCritical} onSave={onSaveCritical} athlete={athlete} from={from} to={to} runKey={keys.records} onDone={recordsDone} />
          <div className="pt-4"><NolioDurabilityFinder athleteName={athleteName} stored={storedDurability} onSave={onSaveDurability} athlete={athlete} from={durabilityFrom} to={to} runKey={keys.durability} onDone={durabilityDone} /></div>
        </div>
      )}
    </div>
  );
}
