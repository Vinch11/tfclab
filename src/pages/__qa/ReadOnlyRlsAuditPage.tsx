/**
 * DEV-ONLY — recette RLS en LECTURE SEULE avec la vraie session navigateur.
 * Aucun écrit, aucun appel Edge/Nolio, aucun état persisté. N'affiche jamais
 * token, e-mail, UID complet, UUID athlète ni URL backend.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { canonicalJson, sha256Hex } from "@/lib/plan/appendOnlyPlanVersionSave";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const QA_BACKEND_REF = "lkjesdacgpolrwfxulbo";

// Identifiants purement synthétiques QA (en mémoire, jamais affichés).
export const QA_COACHES = {
  A: { uid: "573e045a-bbea-4e37-a30f-33183b9fbe13", athleteId: "c155204f-43e2-4367-9b66-6d068ef89212" },
  B: { uid: "6b4c1722-2105-4889-ab14-41bab798cdf7", athleteId: "9758ace0-da71-4200-87bf-04e74bbb4ed9" },
} as const;

/**
 * Les 4 versions initiales de Coach A (relevé lecture seule du 2026-11-02) :
 * SHA-256 de canonicalJson({id, athlete_id, coach_id, objective, weeks_count,
 * sessions_count, validator_score, validator_grade, validator_summary, plan_json}).
 * Elles doivent rester présentes et identiques ; toute autre version propre
 * est une version ajoutée pendant la recette (légitime, comptée à part).
 */
export const QA_BASELINE_VERSIONS: Readonly<Record<string, string>> = {
  "30909fcd-c421-4e35-b6ed-cbf1436fe77e": "29feb12f464632f3c3cac367b88478a2e5718c4fc09d530641d27c956c30c2e2",
  "b50e51e4-f89b-4e77-b92a-123894163ab4": "5b2e67a763acaaab7c4219356e88508c5ed5476c6fa41a7a261d9611a13d62f0",
  "dbef1593-d86d-4f23-a587-29bd67e6936f": "90c706f09863690c7cd8a0c4622401178141a5e96c30479b38e0b16aa0377714",
  "f49326ef-528d-4f75-9d64-047a9c705585": "ccecd0fd5c319571572b94fb58465731b9ac354bba5cc39c7506482a1672571e",
};
export const QA_BASELINE_OWNER: QaCoachKeyLiteral = "A";
type QaCoachKeyLiteral = "A" | "B";
export const BASELINE_COLUMNS = "id,athlete_id,coach_id,objective,weeks_count,sessions_count,validator_score,validator_grade,validator_summary,plan_json";
export type QaCoachKey = keyof typeof QA_COACHES;

export function isExpectedQaOrigin(backendUrl: string | undefined): boolean {
  if (!backendUrl) return false;
  try {
    return new URL(backendUrl).hostname.split(".").includes(QA_BACKEND_REF);
  } catch {
    return false;
  }
}

export function identifyCoach(uid: string | null | undefined): QaCoachKey | null {
  if (uid === QA_COACHES.A.uid) return "A";
  if (uid === QA_COACHES.B.uid) return "B";
  return null;
}

export interface RlsCounts {
  ownAthlete: number;
  foreignAthleteInList: number;
  foreignAthleteDirect: number;
  ownVersions: number;
  foreignVersionsInList: number;
  foreignVersionsDirect: number;
  ownPlan: number;
  foreignPlanInList: number;
  foreignPlanDirect: number;
  /** Lignes visibles dont coach_id ≠ UID connecté (doit être 0). */
  wrongCoachRows: number;
  /** Versions initiales visibles et identiques à leur empreinte. */
  baselineIntact: number;
  /** Versions initiales visibles mais modifiées / doublées. */
  baselineAltered: number;
  /** Versions initiales visibles (doit être 0 pour le coach non propriétaire). */
  baselineVisible: number;
  /** Versions propres hors des 4 initiales (ajoutées pendant la recette). */
  addedVersions: number;
}

export type Verdict = "PASS" | "FAIL" | "BLOCKED";

export function evaluateRls(coach: QaCoachKey, c: RlsCounts): { verdict: Verdict; failures: string[] } {
  const failures: string[] = [];
  if (c.ownAthlete !== 1) failures.push(`Athlète propre visible ${c.ownAthlete}/1`);
  if (c.foreignAthleteInList !== 0 || c.foreignAthleteDirect !== 0) failures.push("Athlète autre visible");
  const nBase = Object.keys(QA_BASELINE_VERSIONS).length;
  if (coach === QA_BASELINE_OWNER) {
    if (c.baselineIntact !== nBase) failures.push(`Versions initiales intactes ${c.baselineIntact}/${nBase}`);
    if (c.baselineAltered !== 0) failures.push(`Versions initiales modifiées ou doublées : ${c.baselineAltered}`);
  } else if (c.baselineVisible !== 0) failures.push("Versions initiales d'un autre coach visibles");
  if (c.ownVersions !== (coach === QA_BASELINE_OWNER ? c.baselineIntact : 0) + c.addedVersions)
    failures.push("Décompte des versions propres incohérent");
  if (c.foreignVersionsInList !== 0 || c.foreignVersionsDirect !== 0) failures.push("Versions autres visibles");
  // Le plan courant peut légitimement être créé/restauré pendant la recette : 0 ou 1 (clé athlete_id).
  if (c.ownPlan > 1) failures.push(`Plan courant propre doublé : ${c.ownPlan}`);
  if (c.foreignPlanInList !== 0 || c.foreignPlanDirect !== 0) failures.push("Plan autre visible");
  if (c.wrongCoachRows !== 0) failures.push("Lignes d'un autre coach visibles");
  return { verdict: failures.length ? "FAIL" : "PASS", failures };
}

export interface AuditResult {
  verdict: Verdict;
  coach?: QaCoachKey;
  originOk: boolean;
  transport?: string;
  counts?: RlsCounts;
  messages: string[];
  needLogin?: boolean;
}

type Row = { id?: string; athlete_id?: string; coach_id?: string };

/** Délai max par étape (getSession, getUser, lot de SELECT). Au-delà : BLOCKED explicite. */
export const QA_STEP_TIMEOUT_MS = 8000;

export class QaStepTimeout extends Error {
  constructor(public step: string, public ms: number) {
    super(`Délai dépassé (${Math.round(ms / 1000)} s) à l'étape « ${step} »`);
  }
}

export function withTimeout<T>(p: PromiseLike<T>, step: string, ms = QA_STEP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new QaStepTimeout(step, ms)), ms);
    Promise.resolve(p).then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}

/** Message d'erreur lisible, tronqué ; jamais de jeton (on n'inclut que .message). */
function describeError(err: unknown): string {
  if (err instanceof QaStepTimeout) return `${err.message} — résultat non concluant.`;
  const msg = err instanceof Error ? err.message : String(err);
  return `Exception : ${msg.slice(0, 200)} — résultat non concluant.`;
}

const currentBackendUrl = () => import.meta.env.VITE_SUPABASE_URL as string | undefined;

export async function runAudit(ms = QA_STEP_TIMEOUT_MS): Promise<AuditResult> {
  const originOk = isExpectedQaOrigin(currentBackendUrl());
  if (!originOk) return { verdict: "BLOCKED", originOk, messages: ["Origine backend non QA — aucune requête envoyée."] };

  try {
    const { data: sess, error: sessErr } = await withTimeout(supabase.auth.getSession(), "getSession", ms);
    if (sessErr) return { verdict: "BLOCKED", originOk, messages: [`Lecture de session impossible : ${sessErr.message}`] };
    if (!sess.session) return { verdict: "BLOCKED", originOk, needLogin: true, messages: ["Aucune session navigateur — aucune requête de données envoyée."] };

    const { data: userData, error: userErr } = await withTimeout(supabase.auth.getUser(), "getUser", ms);
    if (userErr || !userData.user) return { verdict: "BLOCKED", originOk, needLogin: true, messages: [`getUser() refusé par le serveur Auth${userErr ? ` : ${userErr.message}` : ""}.`] };
    const user = userData.user;
    if (user.role !== "authenticated") return { verdict: "BLOCKED", originOk, messages: ["Rôle Auth inattendu (pas un utilisateur authentifié standard)."] };
    if (user.id !== sess.session.user.id) return { verdict: "BLOCKED", originOk, messages: ["Session et getUser() incohérents."] };

    const coach = identifyCoach(user.id);
    if (!coach) return { verdict: "BLOCKED", originOk, needLogin: true, messages: ["Compte connecté hors comptes QA A/B — aucune requête de données envoyée."] };
    const transport = `JWT utilisateur (${sess.session.token_type ?? "bearer"}), vérifié par getUser()`;

    const own = QA_COACHES[coach].athleteId;
    const foreign = QA_COACHES[coach === "A" ? "B" : "A"].athleteId;
    const both = [own, foreign];

    const queries = await withTimeout(Promise.all([
      supabase.from("athletes").select("id,coach_id,name").in("id", both),
      supabase.from("athletes").select("id,coach_id").eq("id", foreign),
      supabase.from("plan_versions").select("id,athlete_id,coach_id").in("athlete_id", both),
      supabase.from("plan_versions").select("id,athlete_id,coach_id").eq("athlete_id", foreign),
      supabase.from("plans").select("athlete_id,coach_id").in("athlete_id", both),
      supabase.from("plans").select("athlete_id,coach_id").eq("athlete_id", foreign),
      supabase.from("plan_versions").select(BASELINE_COLUMNS).in("id", Object.keys(QA_BASELINE_VERSIONS)),
    ]), "SELECT athletes/plan_versions/plans", ms);
    const failed = queries.filter(q => q.error || (q.status && q.status >= 400));
    if (failed.length) {
      return { verdict: "BLOCKED", originOk, coach, transport,
        messages: [`${failed.length} requête(s) en erreur (statuts : ${failed.map(q => q.status).join(", ")}).`,
          ...failed.map(q => q.error?.message).filter((m): m is string => !!m).map(m => m.slice(0, 200))] };
    }
    const [aList, aDirect, vList, vDirect, pList, pDirect, baseRows] = queries.map(q => (q.data ?? []) as Row[]);
    const allRows = [...aList, ...aDirect, ...vList, ...vDirect, ...pList, ...pDirect, ...baseRows];
    const seen = new Map<string, number>();
    let baselineIntact = 0;
    let baselineAltered = 0;
    for (const r of baseRows) {
      const id = r.id ?? "";
      seen.set(id, (seen.get(id) ?? 0) + 1);
      const h = await sha256Hex(canonicalJson(r));
      if (QA_BASELINE_VERSIONS[id] === h && seen.get(id) === 1) baselineIntact++;
      else baselineAltered++;
    }
    const ownV = vList.filter(r => r.athlete_id === own);
    const counts: RlsCounts = {
      ownAthlete: aList.filter(r => r.id === own).length,
      foreignAthleteInList: aList.filter(r => r.id === foreign).length,
      foreignAthleteDirect: aDirect.length,
      ownVersions: ownV.length,
      baselineIntact,
      baselineAltered,
      baselineVisible: baseRows.length,
      addedVersions: ownV.filter(r => !(r.id && r.id in QA_BASELINE_VERSIONS)).length,
      foreignVersionsInList: vList.filter(r => r.athlete_id === foreign).length,
      foreignVersionsDirect: vDirect.length,
      ownPlan: pList.filter(r => r.athlete_id === own).length,
      foreignPlanInList: pList.filter(r => r.athlete_id === foreign).length,
      foreignPlanDirect: pDirect.length,
      wrongCoachRows: allRows.filter(r => r.coach_id !== user.id).length,
    };
    const { verdict, failures } = evaluateRls(coach, counts);
    return { verdict, originOk, coach, transport, counts, messages: failures };
  } catch (err) {
    return { verdict: "BLOCKED", originOk, messages: [describeError(err)] };
  }
}

/** État de session affiché au chargement : lecture LOCALE (getSession) uniquement, aucune requête de données. */
export type SessionStatus =
  | { kind: "checking" }
  | { kind: "origin-blocked" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; coach: QaCoachKey | null }
  | { kind: "blocked"; message: string };

export async function readSessionStatus(ms = QA_STEP_TIMEOUT_MS): Promise<SessionStatus> {
  if (!isExpectedQaOrigin(currentBackendUrl())) return { kind: "origin-blocked" };
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), "getSession", ms);
    if (error) return { kind: "blocked", message: `Lecture de session impossible : ${error.message}` };
    if (!data.session) return { kind: "signed-out" };
    // Indicatif seulement : l'identité est revérifiée par getUser() au lancement de l'audit.
    return { kind: "signed-in", coach: identifyCoach(data.session.user?.id) };
  } catch (err) {
    return { kind: "blocked", message: describeError(err) };
  }
}

export default function ReadOnlyRlsAuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<SessionStatus>({ kind: "checking" });

  useEffect(() => {
    let alive = true;
    readSessionStatus().then(s => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  const onRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      setResult(await runAudit());
    } catch (err) {
      setResult({ verdict: "BLOCKED", originOk: false, messages: [describeError(err)] });
    } finally {
      setRunning(false);
    }
  };

  const c = result?.counts;
  const verdictClass = result?.verdict === "PASS" ? "text-primary" : "text-destructive";
  const showLogin = status.kind === "signed-out" || (status.kind === "signed-in" && !status.coach) || result?.needLogin;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Recette RLS — lecture seule (QA, dev uniquement)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ce contrôle prouve uniquement la visibilité réelle en lecture (SELECT) via votre JWT de session.
            Il ne prouve PAS les écritures (INSERT/UPDATE/DELETE), le réseau, le PDF ni la qualité sportive.
            Aucune donnée n'est écrite ni conservée.
          </p>

          <div className="rounded-md border p-3 text-sm space-y-2" data-testid="rls-audit-session">
            {status.kind === "checking" && <p>Vérification de la session…</p>}
            {status.kind === "origin-blocked" && <p className="text-destructive font-semibold">BLOCKED — origine backend non QA. Aucune requête ne sera envoyée.</p>}
            {status.kind === "signed-out" && <p className="font-semibold">Non connecté — connectez-vous avec le compte Coach A ou Coach B, puis revenez sur cette page.</p>}
            {status.kind === "signed-in" && status.coach && <p>Session détectée : Coach {status.coach} (sera revérifiée par le serveur Auth au lancement).</p>}
            {status.kind === "signed-in" && !status.coach && <p className="text-destructive">Session détectée hors comptes QA A/B — l'audit sera bloqué.</p>}
            {status.kind === "blocked" && <p className="text-destructive font-semibold">BLOCKED — {status.message}</p>}
            <p className="text-xs text-muted-foreground">Statut d'attestation : NON ATTESTÉ (un résultat n'a valeur de preuve que lancé par un coach réellement connecté).</p>
            {showLogin && (
              <Button asChild variant="outline" size="sm"><Link to="/auth">Se connecter</Link></Button>
            )}
          </div>

          <Button onClick={onRun} disabled={running || status.kind === "origin-blocked"}>
            {running ? "Vérification…" : "Vérifier mes accès (lecture seule)"}
          </Button>

          {result && (
            <div className="space-y-1 text-sm" data-testid="rls-audit-result">
              <p className={`text-lg font-bold ${verdictClass}`}>Verdict : {result.verdict}</p>
              <p>{result.originOk ? "Origine QA vérifiée" : "Origine QA NON vérifiée"}</p>
              {result.coach && <p>Connecté comme Coach {result.coach}</p>}
              {result.transport && <p>Transport Auth : {result.transport}</p>}
              {c && result.coach && (
                <>
                  <p>Athlète propre visible {c.ownAthlete}/1</p>
                  <p>Athlète autre invisible {c.foreignAthleteInList + c.foreignAthleteDirect}</p>
                  <p>Versions propres {c.ownVersions} (dont ajoutées pendant la recette : {c.addedVersions})</p>
                  {result.coach === QA_BASELINE_OWNER
                    ? <p>Versions initiales intactes {c.baselineIntact}/{Object.keys(QA_BASELINE_VERSIONS).length}, modifiées {c.baselineAltered}</p>
                    : <p>Versions initiales de l'autre coach visibles {c.baselineVisible}</p>}
                  <p>Versions autres {c.foreignVersionsInList + c.foreignVersionsDirect}</p>
                  <p>Plan courant propre {result.coach}={c.ownPlan}</p>
                  <p>Plan autre {c.foreignPlanInList + c.foreignPlanDirect}</p>
                </>
              )}
              {result.messages.map((m, i) => <p key={i} className="text-destructive">{m}</p>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
