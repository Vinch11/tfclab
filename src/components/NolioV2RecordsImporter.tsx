/**
 * Pré-remplissage du snapshot depuis les records Nolio V2 (REST), sur une
 * période choisie par le coach. Aperçu uniquement : le coach choisit, édite
 * si besoin, puis "Importer la sélection" verse les valeurs dans le
 * formulaire de snapshot habituel — l'enregistrement reste le bouton
 * "Enregistrer" existant, par le même chemin qu'une saisie manuelle.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface NolioV2RecordsImportResult {
  pmax_5s?: string; p30s_w?: string; p60s_w?: string; map5min_w?: string; ftp?: string;
  css?: string; fc_max?: string;
}

type SnapshotField = "pmax_5s" | "p30s_w" | "p60s_w" | "map5min_w" | "ftp_estimated" | "time_5k_sec" | "time_10k_sec" | "time_half_sec" | "time_marathon_sec" | "css" | "fc_max";
type SnapshotCandidate = {
  field: SnapshotField; label: string; sportGroup: "bike" | "run" | "swim" | "other";
  value: number; unit: "W" | "s" | "s/100m" | "bpm"; windowLabel: string; date: string;
  trainingName: string | null; source: string | null; rawValue: number; rawUnit: string; plausibilityChecked: boolean;
};
type MapperWarning = { reason: string; detail: string };

/** Champs sans représentation dans le formulaire de snapshot aujourd'hui (temps de course) :
 * affichés pour transparence, importables plus tard quand le formulaire les accueillera. */
const IMPORTABLE: ReadonlySet<SnapshotField> = new Set(["pmax_5s", "p30s_w", "p60s_w", "map5min_w", "ftp_estimated", "css", "fc_max"]);
const FORM_KEY: Partial<Record<SnapshotField, keyof NolioV2RecordsImportResult>> = {
  pmax_5s: "pmax_5s", p30s_w: "p30s_w", p60s_w: "p60s_w", map5min_w: "map5min_w", ftp_estimated: "ftp", css: "css", fc_max: "fc_max",
};

const REASON_FR: Record<string, string> = {
  no_authorized_v2_connection: "Nolio V2 n'est pas connecté pour cet athlète.",
  connection_not_active: "La connexion Nolio V2 n'est plus active.",
  token_expired_or_expiring: "La connexion Nolio a expiré — reconnectez-la.",
  metrics_scope_missing: "La connexion Nolio actuelle n'autorise pas la lecture des métriques. Reconnectez Nolio en accordant cette autorisation.",
  all_queries_failed: "Nolio n'a répondu à aucune requête de records — réessayez plus tard.",
};

export function NolioV2RecordsImporter({ athleteId, onImport }: { athleteId: string; onImport: (values: NolioV2RecordsImportResult) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(sixtyDaysAgo);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<SnapshotCandidate[]>([]);
  const [warnings, setWarnings] = useState<MapperWarning[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [imported, setImported] = useState(false);

  const fetchRecords = async () => {
    setBusy(true); setError(null); setCandidates([]); setWarnings([]); setChecked({}); setEdited({}); setImported(false);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("nolio-v2-records-preview", { body: { athleteId, from, to } });
      if (invokeError) throw new Error(invokeError.message);
      if (data?.status === "BLOCKED") { setError(REASON_FR[data.reason] ?? `Bloqué : ${data.reason}`); return; }
      if (data?.status !== "PREVIEW") { setError("Réponse inattendue du serveur."); return; }
      setCandidates(data.candidates ?? []);
      setWarnings(data.warnings ?? []);
      const initChecked: Record<number, boolean> = {};
      (data.candidates as SnapshotCandidate[] ?? []).forEach((c, i) => { if (IMPORTABLE.has(c.field)) initChecked[i] = true; });
      setChecked(initChecked);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  const doImport = () => {
    const values: NolioV2RecordsImportResult = {};
    candidates.forEach((c, i) => {
      if (!checked[i] || !IMPORTABLE.has(c.field)) return;
      const key = FORM_KEY[c.field];
      if (!key) return;
      const raw = edited[i] ?? String(c.value);
      if (Number.isFinite(Number(raw))) values[key] = raw;
    });
    onImport(values);
    setImported(true);
  };

  const groupLabel: Record<SnapshotCandidate["sportGroup"], string> = { bike: "Vélo", run: "Course", swim: "Natation", other: "Fréquence cardiaque" };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground block">Du</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" disabled={busy} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block">Au</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" disabled={busy} />
        </div>
        <Button type="button" size="sm" variant="outline" disabled={busy || from > to} onClick={() => void fetchRecords()}>
          {busy ? "Récupération…" : "Récupérer les records Nolio"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary>{warnings.length} valeur(s) écartée(s) par les contrôles de plausibilité</summary>
          <ul className="list-disc pl-4">{warnings.map((w, i) => <li key={i}>{w.detail}</li>)}</ul>
        </details>
      )}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Un record Nolio n'est pas un test validé — vérifiez la date et la provenance avant d'importer.
          </p>
          <div className="max-h-72 overflow-auto space-y-1">
            {candidates.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm border-b pb-1">
                <Checkbox checked={checked[i] === true} disabled={!IMPORTABLE.has(c.field)} onCheckedChange={(v) => setChecked((p) => ({ ...p, [i]: v === true }))} />
                <Badge variant="outline" className="shrink-0">{groupLabel[c.sportGroup]}</Badge>
                <span className="flex-1 min-w-[140px]">{c.label} <span className="text-muted-foreground">({c.windowLabel})</span></span>
                <Input
                  type="number" className="h-7 w-24" disabled={!IMPORTABLE.has(c.field)}
                  value={edited[i] ?? String(c.value)}
                  onChange={(e) => setEdited((p) => ({ ...p, [i]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground w-14">{c.unit}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {c.date}{c.trainingName ? ` · ${c.trainingName}` : ""}
                </span>
                {!IMPORTABLE.has(c.field) && <Badge variant="secondary" className="shrink-0 text-[10px]">pas encore importable</Badge>}
              </div>
            ))}
          </div>
          <Button type="button" size="sm" disabled={!Object.values(checked).some(Boolean)} onClick={doImport}>
            Importer la sélection dans le formulaire
          </Button>
          {imported && <p className="text-xs text-muted-foreground" role="status">Valeurs insérées ci-dessus — vérifiez puis enregistrez normalement.</p>}
        </div>
      )}
    </div>
  );
}
