/**
 * DEV + QA uniquement — /__qa/coach-a-recipe. S'exécute avec la session
 * navigateur EXISTANTE du coach (client normal). Aucune connexion de
 * remplacement, aucun jeton affiché ni stocké dans le rapport.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LIMITS, RECIPE_CODE, RECIPE_STEPS, REPORT_TABLE, checkGuard, overallVerdict, recoverCurrentFromLatestReference, runRecipe,
  type GuardState, type RunOutput, type StepResult,
} from "@/qa/coach-a-recipe/recipe";
import type { DbClient } from "@/lib/plan/planVersionEdits";

const db = supabase as unknown as DbClient;

export function guardMessage(g: GuardState): string {
  switch (g.kind) {
    case "checking": return "Vérification de la session…";
    case "not-dev": return "BLOCKED — page disponible uniquement en mode développement QA.";
    case "origin-blocked": return "BLOCKED — backend non QA : aucune requête envoyée.";
    case "signed-out": return "Non connecté dans CE navigateur — aucune lecture ni écriture. Connectez-vous comme Coach A dans ce navigateur.";
    case "wrong-account": return g.who === "B" ? "Connecté comme Coach B — recette réservée à Coach A, bouton inactif." : "Compte hors QA — bouton inactif.";
    case "athlete-not-owned": return `BLOCKED — ${g.detail}`;
    case "blocked": return `BLOCKED — ${g.message}`;
    case "ready": return "Coach A vérifié par getUser() serveur ; athlète A propriétaire.";
  }
}

const vClass = (v: string) => (v === "PASS" ? "text-primary" : v === "NON_EXERCEE" ? "text-muted-foreground" : "text-destructive");

export default function CoachARecipePage() {
  const [guard, setGuard] = useState<GuardState>({ kind: "checking" });
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [out, setOut] = useState<RunOutput | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    checkGuard({ isDev: import.meta.env.DEV, backendUrl: import.meta.env.VITE_SUPABASE_URL, auth: supabase.auth as never, db })
      .then(g => { if (alive) setGuard(g); });
    return () => { alive = false; };
  }, []);

  const onRun = async () => {
    setRunning(true); setOut(null); setSteps([]);
    // Garde revérifiée au clic : aucune action sans getUser() = Coach A.
    const g = await checkGuard({ isDev: import.meta.env.DEV, backendUrl: import.meta.env.VITE_SUPABASE_URL, auth: supabase.auth as never, db });
    setGuard(g);
    if (g.kind !== "ready") { setRunning(false); return; }
    try { setOut(await runRecipe({ db, userId: g.userId, onStep: setSteps })); }
    finally { setRunning(false); }
  };

  const onRecover = async () => {
    const g = await checkGuard({ isDev: import.meta.env.DEV, backendUrl: import.meta.env.VITE_SUPABASE_URL, auth: supabase.auth as never, db });
    setGuard(g);
    if (g.kind !== "ready") return;
    const r = await recoverCurrentFromLatestReference(db, g.userId);
    setRecovery(`${r.status} — ${r.detail}`);
  };

  const json = out ? JSON.stringify({ ...out.report, persisted: out.persisted }, null, 2) : "";
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${RECIPE_CODE}-${out?.runId}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const shown = out?.steps ?? steps;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Recette Coach A — sauvegarde et isolement (QA, données techniques non prescriptives)</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p data-testid="coach-a-guard" className={guard.kind === "ready" ? "font-semibold" : "font-semibold text-destructive"}>{guardMessage(guard)}</p>
          {(guard.kind === "signed-out" || guard.kind === "wrong-account") && (
            <Button asChild variant="outline" size="sm"><Link to="/auth">Se connecter</Link></Button>
          )}
          <div>
            <p className="font-semibold">Ce que fait le bouton :</p>
            <ol className="list-decimal pl-5 space-y-1">{RECIPE_STEPS.map(s => <li key={s.code}>{s.label}</li>)}</ol>
          </div>
          <Link className="underline text-xs" to="/__qa/pilot-review">QA — Revue pilote</Link>
          <ul className="list-disc pl-5 text-muted-foreground">{LIMITS.map(l => <li key={l}>{l}</li>)}</ul>
          <Button onClick={onRun} disabled={running || guard.kind !== "ready"}>
            {running ? "Vérifications en cours…" : "Lancer les vérifications Coach A"}
          </Button>
          {shown.length > 0 && (
            <div className="space-y-1" data-testid="coach-a-steps">
              {shown.map(s => <p key={s.code}><span className={`font-bold ${vClass(s.verdict)}`}>{s.verdict}</span> — {s.label} : {s.detail}</p>)}
            </div>
          )}
          {out && (
            <div className="space-y-2">
              <p className={`text-lg font-bold ${vClass(overallVerdict(out.steps))}`}>Verdict global : {overallVerdict(out.steps)}</p>
              <p className={out.persisted.ok ? "" : "text-destructive"}>
                Rapport « {REPORT_TABLE} » : {out.persisted.ok ? "enregistré et relu." : `NON confirmé (${out.persisted.detail}) — téléchargez ou copiez le JSON ci-dessous.`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={download}>Télécharger le JSON</Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(json)}>Copier le JSON</Button>
              </div>
              <pre className="max-h-96 overflow-auto rounded border p-2 text-xs">{json}</pre>
            </div>
          )}
          <div className="border-t pt-3 space-y-2">
            <p className="text-muted-foreground">En cas d'interruption pendant l'essai du plan courant :</p>
            <Button variant="outline" size="sm" onClick={onRecover} disabled={running || guard.kind !== "ready"}>Rétablir le plan courant de référence</Button>
            {recovery && <p>{recovery}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
