import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NolioPeriodRecords } from "@/components/NolioPeriodRecords";

type Probe = {
  me: { status: number };
  athletes: { status: number; count: number; items: { id: string; name: string; has_api_access?: boolean }[] };
  records_windows: { status: number; windows: unknown; error?: unknown };
};

async function call(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("nolio-v2-oauth", { body: { action, ...extra } });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(details);
  }
  return data;
}

/** Connexion Nolio — nouvelle version (lecture seule). Sert aussi de page de retour /nolio-v2/callback. */
export default function NolioV2Page() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ connected: boolean; scopes?: string | null; mode?: string } | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const exchanged = useRef(false);

  const refresh = () => call("status").then(setStatus).catch((e) => setMessage(String(e.message)));

  useEffect(() => {
    const code = params.get("code"), state = params.get("state"), err = params.get("error");
    if (err) { setMessage(`Nolio a refusé l'autorisation (${err}).`); refresh(); return; }
    if (code && state && !exchanged.current) {
      exchanged.current = true;
      setBusy(true);
      call("exchange", { code, state })
        .then(() => { setMessage("Connexion à Nolio réussie."); navigate("/nolio-v2", { replace: true }); })
        .catch((e) => setMessage(`Échec de la connexion : ${e.message}`))
        .finally(() => { setBusy(false); refresh(); });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    try { const { url } = await call("start"); window.location.href = url; }
    catch (e) { setMessage(`Impossible de démarrer : ${(e as Error).message}`); setBusy(false); }
  };
  const runProbe = async () => {
    setBusy(true); setMessage(null);
    try { setProbe(await call("probe")); } catch (e) { setMessage(`Lecture impossible : ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="container max-w-3xl py-8 space-y-4">
      <Card>
        <CardHeader><CardTitle>Nolio — nouvelle version (lecture seule)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {status === null ? "Vérification…" : status.connected ? "Connecté à Nolio." : "Pas encore connecté."}
          </p>
          {message && <p className="text-sm">{message}</p>}
          <div className="flex flex-wrap gap-2">
            {status?.mode !== 'personal' && <Button onClick={connect} disabled={busy}>{status?.connected ? "Reconnecter Nolio" : "Connecter Nolio"}</Button>}
            {status?.connected && <Button variant="outline" onClick={runProbe} disabled={busy}>Tester la lecture</Button>}
          </div>
          {status?.scopes && <p className="text-xs text-muted-foreground">Permissions accordées : {status.scopes}</p>}
        </CardContent>
      </Card>
      {status?.connected && <NolioPeriodRecords/>}
      {probe && (
        <Card>
          <CardHeader><CardTitle>Ce que Nolio renvoie</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Profil : {probe.me.status === 200 ? "lu" : `refusé (${probe.me.status})`}</p>
            <p>Athlètes : {probe.athletes.status === 200 ? `${probe.athletes.count} trouvé(s)` : `refusé (${probe.athletes.status})`}</p>
            <ul className="list-disc pl-5">
              {probe.athletes.items.map((a) => (
                <li key={a.id}>{a.name || a.id}{a.has_api_access === false ? " — accès refusé par l'athlète" : ""}</li>
              ))}
            </ul>
            <p>Durées et distances de records : {probe.records_windows.status === 200 ? "disponibles" : `refusé (${probe.records_windows.status})`}</p>
            <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(probe.records_windows.windows ?? probe.records_windows.error, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
