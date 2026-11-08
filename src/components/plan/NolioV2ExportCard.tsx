/**
 * Export Nolio API V2 d'un plan sauvegardé (moteur IA ou DET).
 *
 * Parcours coach : 1) connecter son compte Nolio (une fois), 2) relier l'athlète
 * TFCLab à son athlète Nolio (une fois, sports associés automatiquement et
 * modifiables), 3) « Exporter vers Nolio » : contrôle séance par séance, puis
 * envoi par lots (simulation Nolio avant chaque création, aucune séance créée
 * deux fois).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Link2, Loader2, RefreshCw, Send, Unlink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { isRefusal, nolioV2, reasonLabel, type NolioV2Prepared, type NolioV2Status } from "@/lib/nolio/nolioV2Client";

const SPORT_LABELS: Record<string, string> = { run: "Course à pied", bike: "Vélo", swim: "Natation", strength: "Renforcement", brick: "Compétition triathlon" };
const NONE = "__none__";

interface Props {
  athleteId: string;
  athleteName?: string;
  /** Version sauvegardée du plan affiché ; null tant que le plan n'est pas sauvegardé. */
  planVersionId: string | null;
}

export function NolioV2ExportCard({ athleteId, athleteName, planVersionId }: Props) {
  const [status, setStatus] = useState<NolioV2Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [chosenRef, setChosenRef] = useState<string>("");
  const [prepared, setPrepared] = useState<NolioV2Prepared | null>(null);
  const [progress, setProgress] = useState<{ confirmed: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const cancelRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await nolioV2.status(athleteId);
    setLoading(false);
    if (isRefusal(r)) { setStatus(null); setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    setStatus(r);
    setChosenRef(r.link?.nolioAthleteRef ?? "");
  }, [athleteId]);

  useEffect(() => { cancelRef.current = true; setPrepared(null); setProgress(null); setMessage(null); void refresh(); }, [refresh, planVersionId]);

  const connect = async () => {
    setBusy("connect");
    const r = await nolioV2.start();
    setBusy(null);
    if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    window.location.assign(r.authorizeUrl);
  };

  const refreshAthletes = async () => {
    setBusy("athletes");
    const r = await nolioV2.refreshAthletes();
    setBusy(null);
    if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    await refresh();
  };

  const link = async (ref: string, sportIds?: Record<string, string>) => {
    setBusy("link");
    const r = await nolioV2.link(athleteId, ref, sportIds);
    setBusy(null);
    if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    setMessage({ kind: "ok", text: "Athlète relié. Vérifiez l'association des sports ci-dessous." });
    setPrepared(null);
    await refresh();
  };

  const unlink = async () => {
    setBusy("unlink");
    const r = await nolioV2.unlink(athleteId);
    setBusy(null);
    if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    setPrepared(null);
    await refresh();
  };

  const changeSport = async (key: string, value: string) => {
    if (!status?.link) return;
    const next = { ...status.link.sportIds };
    if (value === NONE) delete next[key]; else next[key] = value;
    await link(status.link.nolioAthleteRef, next);
  };

  const prepare = async () => {
    if (!planVersionId) return;
    setBusy("prepare"); setMessage(null);
    const r = await nolioV2.prepare(planVersionId);
    setBusy(null);
    if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); return; }
    setPrepared(r);
  };

  const send = async () => {
    if (!planVersionId || !prepared) return;
    cancelRef.current = false;
    setBusy("send"); setMessage(null);
    setProgress({ confirmed: prepared.alreadySent ?? 0, total: prepared.counts.operations });
    for (let i = 0; i < 200; i++) {
      if (cancelRef.current) break;
      const r = await nolioV2.sendBatch(planVersionId);
      if (isRefusal(r)) { setMessage({ kind: "error", text: reasonLabel(r.reason) }); break; }
      setProgress({ confirmed: r.confirmed, total: r.total });
      if (r.status === "DONE") {
        setMessage({ kind: "ok", text: `${r.confirmed} séance(s) présentes dans le calendrier Nolio de ${status?.link?.nolioAthleteName ?? athleteName ?? "l'athlète"}.` });
        toast.success("Plan exporté vers Nolio");
        break;
      }
      if (r.status === "STOPPED") {
        const f = r.failedSession;
        setMessage({ kind: "error", text: f
          ? `Export arrêté sur « ${f.title} » (${f.date}) : ${reasonLabel(r.reason)}${f.fields.length ? ` — champs : ${f.fields.join(", ")}` : ""}. ${r.confirmed}/${r.total} séances déjà créées ; elles ne seront pas recréées.`
          : `Export arrêté : ${reasonLabel(r.reason)}. ${r.confirmed}/${r.total} séances déjà créées ; elles ne seront pas recréées.` });
        break;
      }
    }
    setBusy(null);
  };

  if (loading && !status) {
    return <Card><CardContent className="py-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Nolio V2…</CardContent></Card>;
  }

  return (
    <Card data-testid="nolio-v2-export">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" />Exporter vers Nolio (API V2)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status && !status.configured && (
          <p className="text-amber-600 text-xs">Export Nolio V2 non configuré sur le serveur (identifiants OAuth Nolio V2 manquants).</p>
        )}

        {status?.configured && (!status.connected || status.reconnectRequired) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {status.reconnectRequired ? "Nolio demande une nouvelle autorisation du compte." : "Connectez une fois votre compte coach Nolio pour exporter les plans de vos athlètes."}
            </p>
            <Button size="sm" onClick={() => { void connect(); }} disabled={!!busy}>
              {busy === "connect" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
              {status.reconnectRequired ? "Reconnecter Nolio" : "Connecter mon compte Nolio"}
            </Button>
          </div>
        )}

        {status?.connected && !status.reconnectRequired && !status.link && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Reliez {athleteName ?? "cet athlète"} à son profil Nolio :</p>
            <div className="flex gap-2">
              <Select value={chosenRef} onValueChange={setChosenRef}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Athlète Nolio" /></SelectTrigger>
                <SelectContent>
                  {status.athletes.map(a => (
                    <SelectItem key={a.id} value={a.id} disabled={!a.has_api_access}>{a.name}{a.has_api_access ? "" : " (accès API refusé)"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" title="Actualiser la liste Nolio" onClick={() => { void refreshAthletes(); }} disabled={!!busy}>
                {busy === "athletes" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            <Button size="sm" onClick={() => { void link(chosenRef); }} disabled={!chosenRef || !!busy}>
              {busy === "link" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}Relier
            </Button>
          </div>
        )}

        {status?.link && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs">Relié à <strong>{status.link.nolioAthleteName ?? status.link.nolioAthleteRef}</strong></span>
              <Button size="sm" variant="ghost" onClick={() => { void unlink(); }} disabled={!!busy}><Unlink className="h-3.5 w-3.5 mr-1" />Délier</Button>
            </div>
            <details className="rounded border p-2">
              <summary className="cursor-pointer text-xs">Sports associés ({Object.keys(status.link.sportIds).length})</summary>
              <div className="mt-2 space-y-1.5">
                {Object.keys(SPORT_LABELS).map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-36 text-xs">{SPORT_LABELS[key]}</span>
                    <Select value={status.link!.sportIds[key] ?? NONE} onValueChange={v => { void changeSport(key, v); }} disabled={!!busy}>
                      <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— aucun —</SelectItem>
                        {status.link!.sports.filter(s => key === "brick" ? s.active : s.usable).map(s => (
                          <SelectItem key={s.sport} value={s.sport}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </details>

            {!planVersionId ? (
              <p className="text-xs text-muted-foreground">Sauvegardez le plan (« Sauvegarder au planning ») ou rouvrez-le depuis l'historique pour l'exporter.</p>
            ) : (
              <div className="space-y-2">
                <Button size="sm" variant="outline" onClick={() => { void prepare(); }} disabled={!!busy}>
                  {busy === "prepare" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Vérifier l'export
                </Button>
                {prepared && (
                  <div className="rounded border p-2 space-y-1 text-xs">
                    <div>
                      Plan {prepared.engine === "det" ? "DET (séances structurées bloc par bloc)" : "IA (prescription complète en description)"} ·{" "}
                      <strong>{prepared.counts.operations}</strong> séance(s) à envoyer
                      {prepared.firstDate && prepared.lastDate ? ` du ${prepared.firstDate} au ${prepared.lastDate}` : ""}
                      {prepared.alreadySent ? ` · ${prepared.alreadySent} déjà présentes` : ""}
                    </div>
                    {prepared.counts.refused > 0 && (
                      <div className="text-amber-600">
                        <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />{prepared.counts.refused} séance(s) non exportables :
                        <ul className="list-disc pl-5">
                          {prepared.refused.slice(0, 8).map(r => <li key={r.sessionKey}>{r.date} · {r.title} — {reasonLabel(r.reason)}</li>)}
                        </ul>
                      </div>
                    )}
                    {prepared.problems.length > 0 && <div className="text-amber-600">{prepared.problems.map(reasonLabel).join(" · ")}</div>}
                    <Button size="sm" onClick={() => { void send(); }} disabled={!!busy || prepared.counts.operations === 0}>
                      {busy === "send" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                      Exporter vers Nolio
                    </Button>
                    <p className="text-[11px] text-muted-foreground">Une version déjà exportée puis modifiée crée de nouvelles séances : supprimez dans Nolio celles de l'ancienne version si besoin.</p>
                  </div>
                )}
                {progress && (
                  <div className="space-y-1">
                    <Progress value={progress.total ? (100 * progress.confirmed) / progress.total : 0} />
                    <div className="text-xs text-muted-foreground">{progress.confirmed}/{progress.total} séances dans Nolio</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {message && (
          <p className={`text-xs ${message.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}>
            {message.kind === "ok" ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> : <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
