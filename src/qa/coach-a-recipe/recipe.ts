/**
 * DEV + QA uniquement — recette d'écriture Coach A exécutée dans le navigateur
 * du coach, avec SA session existante (client normal, JWT utilisateur).
 * N'utilise que les mécanismes communs : AppendOnlyPlanVersionSaver,
 * saveRenamedVersion, restoreVersionAsCurrent (reçu exact + relecture).
 * Données SYNTHÉTIQUES NON PRESCRIPTIVES ; aucune IA, aucun Nolio, aucun
 * UPDATE/DELETE de version. Le rapport ne contient ni jeton, ni cookie, ni URL.
 */
import {
  AppendOnlyPlanVersionSaver, canonicalJson, sha256Hex, READBACK_COLUMNS,
  type PlanVersionPayload, type PlanVersionRow, type PlanVersionTransport,
} from "@/lib/plan/appendOnlyPlanVersionSave";
import {
  restoreVersionAsCurrent, saveRenamedVersion, supabaseCurrentPlanPorts, supabasePlanVersionTransport, type DbClient,
} from "@/lib/plan/planVersionEdits";
import {
  BASELINE_COLUMNS, QA_BASELINE_VERSIONS, QA_COACHES, isExpectedQaOrigin, withTimeout, QA_STEP_TIMEOUT_MS,
} from "@/pages/__qa/ReadOnlyRlsAuditPage";

export const RECIPE_CODE = "QA_A_RECIPE_V1_NON_PRESCRIPTIVE";
export const QA_PROJECT_ID = "c3941303-40d2-447e-9b87-867d82727fd1";
export const REPORT_TABLE = "qa_coach_recipe_reports";
export const COACH_A = QA_COACHES.A;
export const ATHLETE_B = QA_COACHES.B.athleteId;
export const COACH_B = QA_COACHES.B.uid;

export type StepVerdict = "PASS" | "FAIL" | "BLOCKED" | "NON_EXERCEE";
export interface StepResult { code: string; label: string; verdict: StepVerdict; detail: string; refs?: Record<string, unknown> }

export const RECIPE_STEPS: ReadonlyArray<{ code: string; label: string }> = [
  { code: "IDENTITY", label: "Vérifier l'identité (getSession puis getUser serveur) et l'athlète A propriétaire" },
  { code: "BASELINE_BEFORE", label: "Relever les 4 archives historiques A (empreintes) et le plan courant A" },
  { code: "SAVE_SYNTHETIC", label: "Sauvegarder une version technique SYNTHÉTIQUE NON PRESCRIPTIVE" },
  { code: "SAME_PAYLOAD_NEW_INSTANCE", label: "Même envoi depuis une nouvelle instance : même ID, une seule ligne" },
  { code: "DOUBLE_CLICK", label: "Double clic simulé : la deuxième demande n'envoie rien" },
  { code: "ACK_LOST_AFTER_COMMIT", label: "Réponse perdue simulée APRÈS le vrai insert, puis relecture" },
  { code: "READBACK_UNAVAILABLE", label: "Relecture indisponible simulée : jamais de faux succès, puis reprise" },
  { code: "REOPEN", label: "Rouvrir la version sauvegardée (relecture exacte)" },
  { code: "EDIT_APPEND_ONLY", label: "Renommer : nouvelle version, l'originale reste identique" },
  { code: "CURRENT_RESTORE_CYCLE", label: "Plan courant : référence sauvegardée, restauration synthétique puis rétablissement exact" },
  { code: "ISOLATION_SELECT_B", label: "Isolement : aucune donnée de B visible" },
  { code: "ISOLATION_INSERT_B", label: "Isolement : insert lié à l'athlète B ou coach B usurpé refusé" },
  { code: "ISOLATION_PATCH_B", label: "Isolement : PATCH du courant B (même athlete_id) → 0 ligne" },
  { code: "BASELINE_AFTER", label: "Les 4 archives historiques A et le plan courant A sont inchangés" },
];

export const LIMITS = [
  "Une perte de réponse est SIMULÉE dans le navigateur après un vrai insert HTTP : ce n'est pas une coupure réseau réelle.",
  "Les versions créées sont des fixtures techniques, pas une génération ni une revue sportive.",
  "Les empreintes de B ne sont pas lisibles sous le JWT de A : leur comparaison avant/après est faite par le contrôle administrateur.",
  "Ce rapport n'est ni une attestation sportive ni la preuve d'un nouveau login.",
];

// ---------------- Garde ----------------
export type GuardState =
  | { kind: "checking" }
  | { kind: "not-dev" }
  | { kind: "origin-blocked" }
  | { kind: "signed-out" }
  | { kind: "wrong-account"; who: "B" | "autre" }
  | { kind: "athlete-not-owned"; detail: string }
  | { kind: "blocked"; message: string }
  | { kind: "ready"; userId: string; tokenType: string };

export interface AuthLike {
  getSession(): Promise<{ data: { session: { user: { id: string }; token_type?: string } | null }; error: { message: string } | null }>;
  getUser(): Promise<{ data: { user: { id: string; role?: string } | null }; error: { message: string } | null }>;
}
export interface GuardDeps { isDev: boolean; backendUrl: string | undefined; auth: AuthLike; db: DbClient; ms?: number }

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

export async function checkGuard(d: GuardDeps): Promise<GuardState> {
  if (!d.isDev) return { kind: "not-dev" };
  if (!isExpectedQaOrigin(d.backendUrl)) return { kind: "origin-blocked" };
  const ms = d.ms ?? QA_STEP_TIMEOUT_MS;
  try {
    const s = await withTimeout(d.auth.getSession(), "getSession", ms);
    if (s.error) return { kind: "blocked", message: `Session illisible : ${s.error.message}` };
    if (!s.data.session) return { kind: "signed-out" };
    const u = await withTimeout(d.auth.getUser(), "getUser", ms);
    if (u.error || !u.data.user) return { kind: "signed-out" };
    if (u.data.user.role && u.data.user.role !== "authenticated") return { kind: "blocked", message: "Rôle Auth inattendu." };
    if (u.data.user.id !== s.data.session.user.id) return { kind: "blocked", message: "Session et getUser() incohérents." };
    if (u.data.user.id !== COACH_A.uid) return { kind: "wrong-account", who: u.data.user.id === COACH_B ? "B" : "autre" };
    const a = await withTimeout(d.db.from("athletes").select("id,coach_id").eq("id", COACH_A.athleteId).maybeSingle(), "athlète A", ms) as
      { data: { id: string; coach_id: string } | null; error: { message: string } | null };
    if (a.error) return { kind: "blocked", message: `Lecture athlète A impossible : ${a.error.message}` };
    if (!a.data || a.data.coach_id !== COACH_A.uid) return { kind: "athlete-not-owned", detail: "Athlète A non visible ou non propriétaire." };
    return { kind: "ready", userId: u.data.user.id, tokenType: s.data.session.token_type ?? "bearer" };
  } catch (e) {
    return { kind: "blocked", message: errMsg(e) };
  }
}

// ---------------- Verdict global ----------------
export function overallVerdict(steps: StepResult[]): "PASS" | "PARTIEL" | "FAIL" | "BLOCKED" {
  if (steps.some(s => s.verdict === "FAIL")) return "FAIL";
  if (steps.length === 0 || steps[0].verdict !== "PASS") return "BLOCKED";
  const all = RECIPE_STEPS.every(r => steps.find(s => s.code === r.code)?.verdict === "PASS");
  return all ? "PASS" : "PARTIEL";
}

// ---------------- Transports simulés (enveloppent le VRAI transport) ----------------
/** Exécute le vrai insert HTTP puis fait comme si la réponse avait été perdue. */
export function ackLostAfterCommit(real: PlanVersionTransport): PlanVersionTransport & { realInsertError: () => unknown } {
  let realErr: unknown = undefined;
  return {
    insert: async (row) => { const r = await real.insert(row); realErr = r.error; return { error: { message: "simulated_lost_response" } }; },
    readById: real.readById,
    realInsertError: () => realErr,
  };
}
/** Vrai insert, mais toute relecture échoue. */
export function readbackUnavailable(real: PlanVersionTransport): PlanVersionTransport {
  return { insert: real.insert, readById: async () => ({ data: null, error: { code: "SIMULATED", message: "simulated_readback_unavailable" } }) };
}

export function syntheticPayload(runId: string, variant: string): PlanVersionPayload {
  return {
    athlete_id: COACH_A.athleteId, coach_id: COACH_A.uid,
    plan_json: {
      _qaFixture: true, _qaNonPrescriptive: true, _qaRecipe: RECIPE_CODE, _qaRunId: runId, _qaVariant: variant,
      title: "QA — recette technique NON PRESCRIPTIVE (aucune séance)", weeks: [], phases: [],
    },
    objective: `[QA-RECETTE] ${RECIPE_CODE} — technique non prescriptive`,
    weeks_count: 0, sessions_count: 0, validator_score: null, validator_grade: null, validator_summary: null,
  };
}

export const shaOf = async (v: unknown) => sha256Hex(canonicalJson(v));

// ---------------- Rapport ----------------
export interface ReportRow {
  coach_id: string; athlete_id: string; recipe_code: string; run_id: string;
  kind: "reference" | "final" | "partial" | "recovery"; verified_user_id: string;
  reference_version_id: string | null; reference_current_sha256: string | null; report: unknown;
}

export async function persistReport(db: DbClient, row: ReportRow): Promise<{ ok: boolean; id: string | null; detail: string }> {
  const id = crypto.randomUUID();
  try {
    const ins = await db.from(REPORT_TABLE).insert({ id, ...row });
    const rb = await db.from(REPORT_TABLE).select("id,run_id,kind,report").eq("id", id).maybeSingle();
    if (rb.error) return { ok: false, id, detail: `relecture impossible (${rb.error.code ?? "?"})${ins.error ? `, insert ${ins.error.code}` : ""}` };
    if (!rb.data) return { ok: false, id: null, detail: `rapport absent après insert${ins.error ? ` (${ins.error.code})` : ""}` };
    if (canonicalJson(rb.data.report) !== canonicalJson(row.report) || rb.data.kind !== row.kind) return { ok: false, id, detail: "rapport relu divergent" };
    return { ok: true, id, detail: "relu et identique" };
  } catch (e) {
    return { ok: false, id, detail: errMsg(e) };
  }
}

// ---------------- Exécution ----------------
export interface RunDeps { db: DbClient; userId: string; now?: () => Date; onStep?: (s: StepResult[]) => void }
export interface RunOutput { runId: string; steps: StepResult[]; report: Record<string, unknown>; persisted: { ok: boolean; id: string | null; detail: string } }

type CurrentRef = { versionId: string; sha: string; reportOk: boolean } | null;

async function baselineSnapshot(db: DbClient) {
  const { data, error } = await db.from("plan_versions").select(BASELINE_COLUMNS).in("id", Object.keys(QA_BASELINE_VERSIONS));
  if (error) return { ok: false as const, detail: `lecture impossible (${error.code ?? "?"})` };
  const rows = (data ?? []) as Array<{ id: string }>;
  const fp: Record<string, string> = {};
  let intact = 0;
  for (const r of rows) { const h = await shaOf(r); fp[r.id] = h; if (QA_BASELINE_VERSIONS[r.id] === h) intact++; }
  const cur = await db.from("plans").select("athlete_id,coach_id,plan_json").eq("athlete_id", COACH_A.athleteId).maybeSingle();
  if (cur.error) return { ok: false as const, detail: `courant illisible (${cur.error.code ?? "?"})` };
  const curSha = cur.data ? await shaOf(cur.data.plan_json) : null;
  return { ok: true as const, intact, rows: rows.length, fp, current: cur.data as { plan_json: unknown } | null, curSha };
}

async function countId(db: DbClient, id: string): Promise<number | null> {
  const r = await db.from("plan_versions").select("id").eq("id", id);
  return r.error ? null : (r.data ?? []).length;
}

export async function runRecipe(deps: RunDeps): Promise<RunOutput> {
  const { db, userId } = deps;
  const runId = crypto.randomUUID();
  const steps: StepResult[] = [];
  const push = (s: StepResult) => { steps.push(s); deps.onStep?.([...steps]); };
  const realT = supabasePlanVersionTransport(db);
  const created: string[] = [];
  let currentRef: CurrentRef = null;

  push({ code: "IDENTITY", label: RECIPE_STEPS[0].label, verdict: "PASS", detail: "getUser() serveur = Coach A ; athlète A propriétaire." });

  try {
    const before = await baselineSnapshot(db);
    const nBase = Object.keys(QA_BASELINE_VERSIONS).length;
    if (!before.ok) { push({ code: "BASELINE_BEFORE", label: RECIPE_STEPS[1].label, verdict: "BLOCKED", detail: before.detail }); throw new Error("stop"); }
    push({ code: "BASELINE_BEFORE", label: RECIPE_STEPS[1].label, verdict: before.intact === nBase && before.rows === nBase ? "PASS" : "FAIL",
      detail: `Archives intactes ${before.intact}/${nBase} ; plan courant ${before.current ? "présent" : "absent"}.`,
      refs: { baselineSha256: before.fp, currentSha256: before.curSha } });
    if (before.intact !== nBase) throw new Error("stop");

    // 1. Sauvegarde synthétique
    const p1 = syntheticPayload(runId, "base");
    const s1 = await new AppendOnlyPlanVersionSaver({ transport: realT }).save(p1);
    if (s1.attemptId) created.push(s1.attemptId);
    push({ code: "SAVE_SYNTHETIC", label: RECIPE_STEPS[2].label, verdict: s1.status === "CONFIRMED" ? "PASS" : "FAIL", detail: `${s1.status} (${s1.reason})`, refs: { versionId: s1.attemptId } });
    if (s1.status !== "CONFIRMED" || !s1.attemptId) throw new Error("stop");
    const id1 = s1.attemptId;

    // 2. Même envoi, nouvelle instance
    const s2 = await new AppendOnlyPlanVersionSaver({ transport: realT }).save(syntheticPayload(runId, "base"));
    const n2 = await countId(db, id1);
    push({ code: "SAME_PAYLOAD_NEW_INSTANCE", label: RECIPE_STEPS[3].label,
      verdict: s2.status === "CONFIRMED" && s2.attemptId === id1 && n2 === 1 ? "PASS" : "FAIL",
      detail: `${s2.status} (${s2.reason}) ; même ID : ${s2.attemptId === id1 ? "oui" : "non"} ; lignes avec cet ID : ${n2 ?? "illisible"}.` });

    // 3. Double clic
    const sv = new AppendOnlyPlanVersionSaver({ transport: realT });
    const [d1, d2] = await Promise.all([sv.save(syntheticPayload(runId, "double-clic")), sv.save(syntheticPayload(runId, "double-clic"))]);
    if (d1.attemptId) created.push(d1.attemptId);
    const nd = d1.attemptId ? await countId(db, d1.attemptId) : null;
    push({ code: "DOUBLE_CLICK", label: RECIPE_STEPS[4].label,
      verdict: d1.status === "CONFIRMED" && d2.status === "IN_PROGRESS" && nd === 1 ? "PASS" : "FAIL",
      detail: `1er : ${d1.status} ; 2e : ${d2.status} (${d2.reason}) ; lignes : ${nd ?? "illisible"}.` });

    // 4. ACK perdu après commit
    const lost = ackLostAfterCommit(realT);
    const a1 = await new AppendOnlyPlanVersionSaver({ transport: lost }).save(syntheticPayload(runId, "ack-perdu"));
    if (a1.attemptId) created.push(a1.attemptId);
    const a2 = await new AppendOnlyPlanVersionSaver({ transport: realT }).save(syntheticPayload(runId, "ack-perdu"));
    const na = a1.attemptId ? await countId(db, a1.attemptId) : null;
    push({ code: "ACK_LOST_AFTER_COMMIT", label: RECIPE_STEPS[5].label,
      verdict: lost.realInsertError() === null && a1.status === "CONFIRMED" && a1.reason === "readback_match_after_lost"
        && a2.status === "CONFIRMED" && a2.attemptId === a1.attemptId && na === 1 ? "PASS" : "FAIL",
      detail: `Vrai insert : ${lost.realInsertError() === null ? "accepté" : "erreur"} ; réponse simulée perdue → ${a1.status} (${a1.reason}) ; nouvel essai : ${a2.status} (${a2.reason}) ; lignes : ${na ?? "illisible"}.` });

    // 5. Relecture indisponible
    const u1 = await new AppendOnlyPlanVersionSaver({ transport: readbackUnavailable(realT) }).save(syntheticPayload(runId, "relecture-indispo"));
    if (u1.attemptId) created.push(u1.attemptId);
    const u2 = await new AppendOnlyPlanVersionSaver({ transport: realT }).save(syntheticPayload(runId, "relecture-indispo"));
    const nu = u1.attemptId ? await countId(db, u1.attemptId) : null;
    push({ code: "READBACK_UNAVAILABLE", label: RECIPE_STEPS[6].label,
      verdict: u1.status === "UNKNOWN" && u2.status === "CONFIRMED" && u2.attemptId === u1.attemptId && nu === 1 ? "PASS" : "FAIL",
      detail: `Sans relecture : ${u1.status} (${u1.reason}) — pas de succès affiché ; reprise : ${u2.status} (${u2.reason}) ; lignes : ${nu ?? "illisible"}.` });

    // 6. Réouverture
    const ro = await db.from("plan_versions").select(READBACK_COLUMNS).eq("id", id1).maybeSingle();
    const reopened = ro.data as PlanVersionRow | null;
    const reopenOk = !ro.error && !!reopened && canonicalJson(reopened.plan_json) === canonicalJson(p1.plan_json);
    push({ code: "REOPEN", label: RECIPE_STEPS[7].label, verdict: reopenOk ? "PASS" : "FAIL", detail: reopenOk ? "Version relue, contenu identique." : `Relecture ${ro.error ? `erreur ${ro.error.code}` : "divergente/absente"}.` });

    // 7. Édition append-only
    if (reopened) {
      const shaBeforeEdit = await shaOf(reopened);
      const e1 = await saveRenamedVersion(new AppendOnlyPlanVersionSaver({ transport: realT }), reopened, `QA renommage ${runId.slice(0, 8)}`);
      if (e1.attemptId) created.push(e1.attemptId);
      const ro2 = await db.from("plan_versions").select(READBACK_COLUMNS).eq("id", id1).maybeSingle();
      const unchanged = !ro2.error && !!ro2.data && (await shaOf(ro2.data)) === shaBeforeEdit;
      push({ code: "EDIT_APPEND_ONLY", label: RECIPE_STEPS[8].label,
        verdict: e1.status === "CONFIRMED" && e1.attemptId !== id1 && unchanged ? "PASS" : "FAIL",
        detail: `Nouvelle version ${e1.status} (${e1.reason}) ; ID distinct : ${e1.attemptId !== id1 ? "oui" : "non"} ; originale inchangée : ${unchanged ? "oui" : "non"}.`, refs: { renamedVersionId: e1.attemptId } });
    } else push({ code: "EDIT_APPEND_ONLY", label: RECIPE_STEPS[8].label, verdict: "BLOCKED", detail: "Version non relue." });

    // 8. Cycle du plan courant (seulement avec référence sûre)
    if (!before.current || !before.curSha) {
      push({ code: "CURRENT_RESTORE_CYCLE", label: RECIPE_STEPS[9].label, verdict: "NON_EXERCEE", detail: "Aucun plan courant A : rien à rétablir, étape non exercée." });
    } else if (!reopened) {
      push({ code: "CURRENT_RESTORE_CYCLE", label: RECIPE_STEPS[9].label, verdict: "NON_EXERCEE", detail: "Version synthétique non relue." });
    } else {
      const refSave = await new AppendOnlyPlanVersionSaver({ transport: realT }).save({
        athlete_id: COACH_A.athleteId, coach_id: COACH_A.uid, plan_json: before.current.plan_json,
        objective: `[QA-RECETTE] référence du plan courant A avant essai`, weeks_count: null, sessions_count: null,
        validator_score: null, validator_grade: null, validator_summary: null,
      });
      if (refSave.status !== "CONFIRMED" || !refSave.attemptId) {
        push({ code: "CURRENT_RESTORE_CYCLE", label: RECIPE_STEPS[9].label, verdict: "NON_EXERCEE", detail: `Référence non sauvegardée (${refSave.status}) : courant non touché.` });
      } else {
        created.push(refSave.attemptId);
        const refPersist = await persistReport(db, {
          coach_id: userId, athlete_id: COACH_A.athleteId, recipe_code: RECIPE_CODE, run_id: runId, kind: "reference",
          verified_user_id: userId, reference_version_id: refSave.attemptId, reference_current_sha256: before.curSha,
          report: { note: "Référence du plan courant A sauvegardée avant essai", referenceVersionId: refSave.attemptId, currentSha256: before.curSha },
        });
        currentRef = { versionId: refSave.attemptId, sha: before.curSha, reportOk: refPersist.ok };
        if (!refPersist.ok) {
          push({ code: "CURRENT_RESTORE_CYCLE", label: RECIPE_STEPS[9].label, verdict: "NON_EXERCEE", detail: `Référence enregistrée mais rapport de reprise non confirmé (${refPersist.detail}) : courant non touché.` });
        } else {
          const ports = supabaseCurrentPlanPorts(db);
          const r1 = await restoreVersionAsCurrent({ ports, saver: new AppendOnlyPlanVersionSaver({ transport: realT }), coachId: userId, athleteId: COACH_A.athleteId, version: reopened });
          if (r1.archive.id) created.push(r1.archive.id);
          const refRow = (await db.from("plan_versions").select(READBACK_COLUMNS).eq("id", refSave.attemptId).maybeSingle()).data as PlanVersionRow | null;
          const r2 = refRow ? await restoreVersionAsCurrent({ ports, saver: new AppendOnlyPlanVersionSaver({ transport: realT }), coachId: userId, athleteId: COACH_A.athleteId, version: refRow }) : null;
          if (r2?.archive.id) created.push(r2.archive.id);
          const after = await ports.readCurrent(COACH_A.athleteId);
          const shaAfter = after.data ? await shaOf(after.data.plan_json) : null;
          const ok = r1.status === "CONFIRMED" && r2?.status === "CONFIRMED" && shaAfter === before.curSha;
          push({ code: "CURRENT_RESTORE_CYCLE", label: RECIPE_STEPS[9].label, verdict: ok ? "PASS" : "FAIL",
            detail: `Synthétique → courant : ${r1.status} (${r1.reason}) ; rétablissement : ${r2?.status ?? "non lancé"} (${r2?.reason ?? "référence illisible"}) ; courant final identique à la référence : ${shaAfter === before.curSha ? "oui" : "NON — utilisez « Rétablir le plan courant de référence »"}.`,
            refs: { referenceVersionId: refSave.attemptId } });
        }
      }
    }

    // 9. Isolement A→B
    const [sb1, sb2, sb3] = await Promise.all([
      db.from("athletes").select("id").eq("id", ATHLETE_B),
      db.from("plan_versions").select("id").eq("athlete_id", ATHLETE_B),
      db.from("plans").select("athlete_id").eq("athlete_id", ATHLETE_B),
    ]);
    const selErr = [sb1, sb2, sb3].find(q => q.error);
    const selN = [sb1, sb2, sb3].reduce((n, q) => n + (q.data?.length ?? 0), 0);
    push({ code: "ISOLATION_SELECT_B", label: RECIPE_STEPS[10].label, verdict: selErr ? "BLOCKED" : selN === 0 ? "PASS" : "FAIL",
      detail: selErr ? `Erreur ${selErr.error?.code}` : `Lignes B visibles : ${selN}.` });

    const negIds = [crypto.randomUUID(), crypto.randomUUID()];
    const neg = syntheticPayload(runId, "negatif");
    const i1 = await db.from("plan_versions").insert({ ...neg, id: negIds[0], athlete_id: ATHLETE_B });
    const i2 = await db.from("plan_versions").insert({ ...neg, id: negIds[1], coach_id: COACH_B });
    const negRead = await db.from("plan_versions").select("id").in("id", negIds);
    const refused = !!i1.error && !!i2.error && !negRead.error && (negRead.data ?? []).length === 0;
    push({ code: "ISOLATION_INSERT_B", label: RECIPE_STEPS[11].label, verdict: refused ? "PASS" : negRead.error ? "BLOCKED" : "FAIL",
      detail: `Athlète B/coach A : ${i1.error ? `refusé ${i1.error.code}` : "ACCEPTÉ"} ; coach B usurpé : ${i2.error ? `refusé ${i2.error.code}` : "ACCEPTÉ"} ; lignes relues : ${negRead.data?.length ?? "illisible"}.` });

    const pb = await db.from("plans").update({ athlete_id: ATHLETE_B }).eq("athlete_id", ATHLETE_B).select("athlete_id");
    push({ code: "ISOLATION_PATCH_B", label: RECIPE_STEPS[12].label,
      verdict: pb.error ? (pb.error.code === "42501" ? "PASS" : "BLOCKED") : (pb.data ?? []).length === 0 ? "PASS" : "FAIL",
      detail: pb.error ? `Refusé ${pb.error.code}` : `Lignes renvoyées : ${(pb.data ?? []).length}.` });

    // 10. Contrôle final
    const fin = await baselineSnapshot(db);
    if (!fin.ok) push({ code: "BASELINE_AFTER", label: RECIPE_STEPS[13].label, verdict: "BLOCKED", detail: fin.detail });
    else {
      const ok = fin.intact === nBase && fin.rows === nBase && fin.curSha === before.curSha;
      push({ code: "BASELINE_AFTER", label: RECIPE_STEPS[13].label, verdict: ok ? "PASS" : "FAIL",
        detail: `Archives intactes ${fin.intact}/${nBase} ; courant identique : ${fin.curSha === before.curSha ? "oui" : "NON"}.`,
        refs: { baselineSha256: fin.fp, currentSha256: fin.curSha } });
    }
  } catch (e) {
    if (!(e instanceof Error && e.message === "stop")) push({ code: "EXCEPTION", label: "Interruption", verdict: "BLOCKED", detail: errMsg(e) });
  }

  const verdict = overallVerdict(steps);
  const report = {
    recipeCode: RECIPE_CODE, projectId: QA_PROJECT_ID, backendRef: "lkjesdacgpolrwfxulbo", runId,
    executedAt: (deps.now ?? (() => new Date()))().toISOString(),
    verifiedUser: { userId, method: "getSession puis getUser() serveur, session navigateur existante" },
    athleteId: COACH_A.athleteId, verdict, steps,
    createdVersionIds: [...new Set(created)], currentReference: currentRef,
    labels: { nonPrescriptive: true, sportsAttestation: false, newLogin: false, nolio: false, ai: false },
    limits: LIMITS,
  };
  const persisted = await persistReport(db, {
    coach_id: userId, athlete_id: COACH_A.athleteId, recipe_code: RECIPE_CODE, run_id: runId,
    kind: verdict === "PASS" ? "final" : "partial", verified_user_id: userId,
    reference_version_id: currentRef?.versionId ?? null, reference_current_sha256: currentRef?.sha ?? null, report,
  });
  return { runId, steps, report, persisted };
}

// ---------------- Reprise après interruption ----------------
export async function recoverCurrentFromLatestReference(db: DbClient, userId: string): Promise<{ status: string; detail: string }> {
  const ref = await db.from(REPORT_TABLE).select("run_id,reference_version_id,reference_current_sha256,created_at")
    .eq("kind", "reference").eq("athlete_id", COACH_A.athleteId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (ref.error) return { status: "BLOCKED", detail: `Référence illisible (${ref.error.code})` };
  if (!ref.data?.reference_version_id) return { status: "NON_EXERCEE", detail: "Aucune référence enregistrée." };
  const v = await db.from("plan_versions").select(READBACK_COLUMNS).eq("id", ref.data.reference_version_id).maybeSingle();
  if (v.error || !v.data) return { status: "BLOCKED", detail: "Version de référence illisible." };
  if ((await shaOf(v.data.plan_json)) !== ref.data.reference_current_sha256) return { status: "BLOCKED", detail: "Empreinte de référence divergente : rien modifié." };
  const ports = supabaseCurrentPlanPorts(db);
  const cur = await ports.readCurrent(COACH_A.athleteId);
  if (cur.error) return { status: "BLOCKED", detail: "Courant illisible." };
  if (cur.data && (await shaOf(cur.data.plan_json)) === ref.data.reference_current_sha256) return { status: "ALREADY_CURRENT", detail: "Le plan courant est déjà celui de référence." };
  const r = await restoreVersionAsCurrent({ ports, saver: new AppendOnlyPlanVersionSaver({ transport: supabasePlanVersionTransport(db) }), coachId: userId, athleteId: COACH_A.athleteId, version: v.data as PlanVersionRow });
  const after = await ports.readCurrent(COACH_A.athleteId);
  const same = !!after.data && (await shaOf(after.data.plan_json)) === ref.data.reference_current_sha256;
  return { status: same ? "CONFIRMED" : r.status, detail: `${r.status} (${r.reason}) ; courant = référence : ${same ? "oui" : "non"}.` };
}
