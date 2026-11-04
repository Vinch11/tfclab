/**
 * DEV + QA uniquement — revue pilote des étapes restantes (/__qa/pilot-review).
 * Module PUR (aucun réseau sauf via le client injecté) :
 *  - empreinte canonique du plan (SHA-256, seul `_provenance.generatedAt` exclu) ;
 *  - résumé hebdomadaire et minutes par domaine CALCULÉES depuis la structure
 *    `detStructuredWorkout` sauvegardée/générée — jamais inventées ;
 *  - avis QA humain (jamais une attestation sportive, jamais prescriptionAllowed) ;
 *  - préparation Nolio hors ligne via le mapper pur, statut BLOCKED.
 */
import { canonicalJson, identityView, sha256Hex } from "@/lib/plan/appendOnlyPlanVersionSave";
import {
  mapPlanToNolioV2, type DetNode, type DetWorkout, type NolioV2Refs, type PlanSessionInput, type MapResult,
} from "../../../supabase/functions/_shared/nolioV2/plannedMapper";
import { NOLIO_V2_REQUIRED_SCOPES } from "../../../supabase/functions/_shared/nolioV2/plannedClient";
import { sessionsFromPlanJson } from "../../../supabase/functions/_shared/nolioV2/planSessions";
import { isDetCoachInputsProvenance, isDetPlanProvenance } from "@/lib/plan/planProvenance";

export const REVIEW_TABLE = "qa_pilot_review_reports";
export const REVIEW_LABEL = "Avis QA sur plan SYNTHÉTIQUE — non prescriptif, ni validation scientifique indépendante, ni autorisation pour un athlète réel.";

export const REVIEW_CRITERIA = [
  { code: "progression_phases", label: "Progression et phases" },
  { code: "recoveries", label: "Récupérations" },
  { code: "limiter_relevance", label: "Pertinence vis-à-vis du limiteur" },
  { code: "doses_intensities", label: "Doses et intensités exactes" },
  { code: "feasibility_safety", label: "Faisabilité / sécurité" },
  { code: "overall", label: "Observations générales" },
] as const;
export type CriterionCode = typeof REVIEW_CRITERIA[number]["code"];
export type Decision = "acceptable_for_QA" | "changes_required" | "undecided";
export const DECISIONS: readonly Decision[] = ["acceptable_for_QA", "changes_required", "undecided"];
/** Libellés affichés ; les valeurs stockées restent les enums ci-dessus. */
export const DECISION_LABELS: Record<Decision, string> = {
  acceptable_for_QA: "Acceptable en QA", changes_required: "À corriger", undecided: "Je ne sais pas",
};
export type CriterionAnswer = { decision: Decision | null; comment: string };
export type Draft = Record<CriterionCode, CriterionAnswer>;

/** Tous les critères NON RÉPONDUS par défaut. */
export function emptyDraft(): Draft {
  return Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.code, { decision: null, comment: "" }])) as Draft;
}

// ---------------- Empreinte canonique ----------------
export async function planSha256(plan: unknown, hash: (t: string) => Promise<string> = sha256Hex): Promise<string> {
  return hash(canonicalJson(identityView({ plan_json: plan }).plan_json));
}

// ---------------- Lecture du plan ----------------
type Sess = Record<string, unknown>;
type Week = { weekNumber?: unknown; phase?: unknown; theme?: unknown; sessions?: unknown };

export function domainSecondsOf(nodes: DetNode[], mult = 1, acc: Record<string, number> = {}): Record<string, number> {
  for (const n of nodes) {
    if (n.kind === "repeat") {
      domainSecondsOf(n.steps, mult * n.count, acc);
      const rests = Math.max(0, n.count - 1) * n.betweenSec * mult;
      if (rests > 0) acc["récup. inter-répétitions (domaine non renseigné)"] = (acc["récup. inter-répétitions (domaine non renseigné)"] ?? 0) + rests;
    } else if ("seconds" in n.dose) {
      const k = n.domain ?? "domaine non renseigné";
      acc[k] = (acc[k] ?? 0) + n.dose.seconds * mult;
    } else {
      const k = `${n.domain ?? "domaine non renseigné"} (dose non temporelle)`;
      acc[k] = acc[k] ?? 0;
    }
  }
  return acc;
}

export interface WeekSummary {
  weekNumber: number | null; phase: string | null; theme: string | null;
  sessions: number; plannedMin: number | null; recoveryLabel: string | null;
  domainMin: Record<string, number>; unstructured: number;
}

export function weekSummaries(plan: { weeks?: unknown }): WeekSummary[] {
  const weeks = Array.isArray(plan.weeks) ? (plan.weeks as Week[]) : [];
  return weeks.map((w) => {
    const ss = (Array.isArray(w.sessions) ? w.sessions : []) as Sess[];
    const active = ss.filter((s) => !s.isRest);
    const durs = active.map((s) => s.durationMin);
    const plannedMin = durs.every((d) => typeof d === "number") ? (durs as number[]).reduce((a, b) => a + b, 0) : null;
    const acc: Record<string, number> = {}; let unstructured = 0;
    for (const s of active) {
      const w2 = s.detStructuredWorkout as DetWorkout | undefined;
      if (w2 && Array.isArray(w2.nodes)) domainSecondsOf(w2.nodes, 1, acc); else unstructured++;
    }
    const theme = typeof w.theme === "string" ? w.theme : null;
    const phase = typeof w.phase === "string" ? w.phase : null;
    // Récupération : affichée seulement si le plan la nomme explicitement.
    const rec = [theme, phase].find((t) => t && /recup|récup|recovery|decharge|décharge|taper|affûtage/i.test(t)) ?? null;
    return {
      weekNumber: typeof w.weekNumber === "number" ? w.weekNumber : null, phase, theme,
      sessions: active.length, plannedMin, recoveryLabel: rec,
      domainMin: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Math.round((v / 60) * 10) / 10])),
      unstructured,
    };
  });
}

/** Champs d'une séance absents du contenu sauvegardé/généré (jamais complétés). */
export function missingSessionFields(s: Sess): string[] {
  if (s.isRest) return [];
  const m: string[] = [];
  if (typeof s.durationMin !== "number") m.push("durée");
  if (typeof s.catalogId !== "string") m.push("source catalogue");
  if (!s.detStructuredWorkout) m.push(`structure (${(s.detStructureRefusal as { reason?: string } | undefined)?.reason ?? "absente"})`);
  if (!s.coachStart && !s.startTime && !s.time) m.push("horaire (non fixé par le plan)");
  return m;
}

/** Preuve limiteur/spécifique : seulement si le plan la porte. */
export function limiterEvidence(plan: Record<string, unknown>): string | null {
  const p = plan._provenance as Record<string, unknown> | undefined;
  const lo = p?.limiterOrder;
  if (Array.isArray(lo) && lo.length) return `Ordre des limiteurs enregistré : ${lo.join(" > ")}`;
  return null;
}

// ---------------- Provenance du plan revu ----------------
export type PlanEngineBinding = { ok: true; engineVersion: string; releaseId: string | null } | { ok: false; reason: string };
/**
 * L'avis est lié au moteur qui a RÉELLEMENT généré le plan (`_provenance`),
 * jamais au code chargé maintenant. Provenance absente/malformée ⇒ refus.
 * `currentEngineVersion` fourni (scénario généré maintenant) ⇒ doit concorder.
 */
export function planEngineBinding(plan: unknown, currentEngineVersion?: string | null): PlanEngineBinding {
  const prov = (plan as { _provenance?: unknown } | null)?._provenance;
  if (!isDetPlanProvenance(prov) && !isDetCoachInputsProvenance(prov)) return { ok: false, reason: "provenance_moteur_absente_ou_malformee" };
  const rel = (prov as { releaseId?: unknown }).releaseId;
  if (rel !== null && rel !== undefined && (typeof rel !== "string" || !HEX64.test(rel))) return { ok: false, reason: "release_id_malforme" };
  if (currentEngineVersion !== undefined && prov.engineVersion !== currentEngineVersion) return { ok: false, reason: "moteur_du_plan_different_du_moteur_charge" };
  return { ok: true, engineVersion: prov.engineVersion, releaseId: (rel as string | undefined) ?? null };
}

// ---------------- Avis QA ----------------
export interface ReviewSubject {
  sourceKind: "scenario" | "owned_version";
  scenarioId: string | null; planVersionId: string | null;
  planSha256: string; engineComponentHash: string; releaseId: string | null;
}
export interface ReviewRow {
  coach_id: string; athlete_id: string; source_kind: string; scenario_id: string | null; plan_version_id: string | null;
  plan_sha256: string; engine_component_hash: string; release_id: string | null;
  decisions: Draft; report: Record<string, unknown>;
}

const HEX64 = /^[a-f0-9]{64}$/;
export type BuildResult = { ok: true; row: ReviewRow } | { ok: false; reason: string };

export function buildReviewRow(a: { coachId: string; athleteId: string; subject: ReviewSubject; draft: Draft; now: string }): BuildResult {
  const { subject: s, draft } = a;
  if (!HEX64.test(s.planSha256)) return { ok: false, reason: "empreinte_plan_invalide" };
  if (!HEX64.test(s.engineComponentHash)) return { ok: false, reason: "hash_moteur_invalide" };
  if (s.sourceKind === "scenario" ? !s.scenarioId || s.planVersionId : !s.planVersionId) return { ok: false, reason: "source_incoherente" };
  const keys = Object.keys(draft).sort().join(",");
  if (keys !== REVIEW_CRITERIA.map((c) => c.code).sort().join(",")) return { ok: false, reason: "criteres_inattendus" };
  let answered = 0;
  for (const c of REVIEW_CRITERIA) {
    const d = draft[c.code];
    if (d.decision !== null && !DECISIONS.includes(d.decision)) return { ok: false, reason: `decision_invalide:${c.code}` };
    if (typeof d.comment !== "string" || d.comment.length > 4000) return { ok: false, reason: `commentaire_invalide:${c.code}` };
    if (d.decision !== null) answered++;
  }
  if (answered === 0) return { ok: false, reason: "aucune_reponse_explicite" };
  return {
    ok: true,
    row: {
      coach_id: a.coachId, athlete_id: a.athleteId, source_kind: s.sourceKind,
      scenario_id: s.scenarioId, plan_version_id: s.planVersionId,
      plan_sha256: s.planSha256, engine_component_hash: s.engineComponentHash, release_id: s.releaseId,
      decisions: draft,
      report: {
        label: REVIEW_LABEL, recordedAt: a.now, answered, unanswered: REVIEW_CRITERIA.length - answered,
        // Jamais accordé par cet avis (aussi imposé par contrainte SQL).
        sportingAttestation: false, prescriptionAllowed: false, sourceQualification: false, release: false, nolioSend: false,
      },
    },
  };
}

export interface ReviewDb {
  from(t: string): {
    insert(row: unknown): { select(c: string): { maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }> } };
  };
}

export type SubmitResult =
  | { status: "CONFIRMED"; id: string }
  | { status: "STALE"; reason: string }
  | { status: "REFUSED"; reason: string }
  | { status: "UNKNOWN"; reason: string };

export const READBACK_COLUMNS = "id,coach_id,athlete_id,source_kind,scenario_id,plan_version_id,plan_sha256,engine_component_hash,release_id,decisions,report";
/** Compare TOUS les champs soumis à la ligne relue (JSON comparé canoniquement). */
export function readbackMismatches(sent: ReviewRow, got: Partial<ReviewRow>): string[] {
  return (Object.keys(sent) as (keyof ReviewRow)[]).filter((k) => canonicalJson(sent[k] ?? null) !== canonicalJson(got[k] ?? null));
}

/** Recalcule l'empreinte et l'identité AU MOMENT du clic ; toute divergence invalide le brouillon. */
export async function submitReview(a: {
  db: ReviewDb; recheck: () => Promise<{ coachId: string; athleteId: string } | null>;
  currentPlan: unknown; subject: ReviewSubject; draft: Draft; now?: () => Date;
  hash?: (t: string) => Promise<string>;
}): Promise<SubmitResult> {
  const who = await a.recheck();
  if (!who) return { status: "REFUSED", reason: "identite_non_verifiee" };
  const sha = await planSha256(a.currentPlan, a.hash);
  if (sha !== a.subject.planSha256) return { status: "STALE", reason: "plan_modifie_depuis_le_brouillon" };
  const eng = planEngineBinding(a.currentPlan);
  if (eng.ok === false) return { status: "REFUSED", reason: eng.reason };
  if (eng.engineVersion !== a.subject.engineComponentHash || eng.releaseId !== a.subject.releaseId) return { status: "STALE", reason: "provenance_moteur_differente_du_brouillon" };
  const b = buildReviewRow({ coachId: who.coachId, athleteId: who.athleteId, subject: a.subject, draft: a.draft, now: (a.now ?? (() => new Date()))().toISOString() });
  if (b.ok === false) return { status: "REFUSED", reason: b.reason };
  try {
    const { data, error } = await a.db.from(REVIEW_TABLE).insert(b.row).select(READBACK_COLUMNS).maybeSingle();
    if (error) return { status: "REFUSED", reason: error.message.slice(0, 200) };
    const d = data as (Partial<ReviewRow> & { id?: string }) | null;
    if (!d?.id) return { status: "UNKNOWN", reason: "relecture_sans_id" };
    const bad = readbackMismatches(b.row, d);
    if (bad.length) return { status: "UNKNOWN", reason: `relecture_non_concordante:${bad.join(",")}` };
    return { status: "CONFIRMED", id: d.id };
  } catch (e) {
    return { status: "UNKNOWN", reason: e instanceof Error ? e.message.slice(0, 200) : "erreur" };
  }
}

// ---------------- Nolio : préparation hors ligne ----------------
export const NOLIO_STATUS = "BLOCKED_CONNECTION_NOT_CONFIGURED" as const;
export const NOLIO_PREREQUISITES: readonly string[] = [
  "Application Nolio V2 de type « partenaire » ou « équipe » (pas d'app personnelle ; le mode dev partenaire est limité à 5 comptes, ce n'est pas un bac à sable).",
  "Identifiants OAuth2 V2 de l'application, enregistrés uniquement dans Paramètres du projet → Secrets (jamais dans le chat) ; callback QA dédié, pas celui de production V1.",
  "Consentement OAuth V2 de l'athlète, horodaté (consent_confirmed_at).",
  `Scopes accordés : ${NOLIO_V2_REQUIRED_SCOPES.join(", ")}.`,
  "Ligne du magasin V2 (service-role seulement) liée au coach ET à l'athlète TFCL, status=active, api_version=v2, jeton valide > 60 s.",
  "Références opaques confirmées : athlète usr_…, sports spt_… par sport, exercices exf_… pour la force, fuseau du calendrier si une heure est envoyée.",
  "Progression réelle de la connexion : voir la carte « Connexion Nolio V2 (QA) » (état lu côté serveur, indépendant de cet aperçu local).",
  "Puis seulement : dry_run serveur authentifié explicitement autorisé (jamais fait ici).",
];
const SYNTH_REFS = (sports: string[]): NolioV2Refs => ({
  synthetic: true, athleteId: "usr_SYNTHQA",
  sportIds: Object.fromEntries(sports.map((s) => [s, `spt_SYNTH${s.toUpperCase().replace(/[^A-Z]/g, "")}`])),
  exerciseIds: {}, competition: null,
});

/**
 * Même extraction que l'expéditeur réel (`nolio-v2-send-plan` → `sessionsFromPlanJson`) :
 * `_planStartDate` sauvegardé, clés `S{semaine}-J{jour}-{i}`, `coachStart` conservé.
 * Tout problème d'extraction ⇒ aucun mapping (comme le serveur, 422).
 */
export function nolioOfflinePreview(plan: unknown):
  | { status: typeof NOLIO_STATUS; requestsSent: 0; extractionProblems: string[]; map: MapResult | null; note: string } {
  const ex = sessionsFromPlanJson(plan);
  const note = "Mapping local avec références SYNTHÉTIQUES (usr_SYNTH…) — aucune requête GET/POST Nolio, aucun dry_run serveur. Validation locale ≠ validation Nolio.";
  if (ex.problems.length) return { status: NOLIO_STATUS, requestsSent: 0, extractionProblems: ex.problems, map: null, note };
  const sports = [...new Set(ex.sessions.map((s) => s.sport).filter(Boolean))];
  return { status: NOLIO_STATUS, requestsSent: 0, extractionProblems: [], map: mapPlanToNolioV2(ex.sessions, SYNTH_REFS(sports)), note };
}

// ---------------- Check-list pilote ----------------
export const PILOT_CHECKLIST: readonly { item: string; status: "VALIDÉ_QA" | "EN_ATTENTE" | "NON_EXERCÉ" | "BLOQUÉ" }[] = [
  { item: "Sauvegarde/isolement A (recette df34b87b…, rapport bbfc0b8e…, 14/14) et B persistés, empreintes relues", status: "VALIDÉ_QA" },
  { item: "Nouvelle connexion (login neuf) A/B", status: "NON_EXERCÉ" },
  { item: "Revue sportive indépendante", status: "EN_ATTENTE" },
  { item: "Nolio V2 réel (connexion, dry_run, envoi)", status: "BLOQUÉ" },
  { item: "Attestation production / déploiement", status: "EN_ATTENTE" },
  { item: "Activation pilote / athlète réel", status: "BLOQUÉ" },
];
