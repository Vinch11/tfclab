/**
 * Nolio V2 — envoi RÉEL d'un plan complet (QA), pur et injectable.
 *
 * Avant tout réseau, `realSendGate` exige, dans cet ordre, sans exception :
 * - consentement explicite du coach POUR CE PLAN (consent === true dans la requête) ;
 * - empreintes plan/refs/opérations attendues par le client = empreintes recalculées
 *   côté serveur (aucun nouveau job silencieux si les refs ou le plan ont changé) ;
 * - précontrôle complet (0 refus, couverture intégrale) ;
 * - job de simulation du MÊME plan_version, MÊMES empreintes, et un reçu DRY_RUN_VALID
 *   (HTTP 2xx non NULL) pour CHAQUE opération avec le même index, séance, date et
 *   empreinte de corps MARQUÉ ;
 * - plan autorisé à la prescription (provenance prescriptionAllowed === true) ;
 * - attestation humaine du plan fournie par une source vérifiée (aucune n'existe
 *   aujourd'hui en QA ⇒ toujours absente ; jamais fabriquée ni déduite d'un avis QA).
 * Puis `sendPlannedV2` (journal durable, réservation avant POST, aucune relance d'une
 * opération incertaine, arrêt 401/403/429/refus), lot borné.
 */
import type { Prepared, ManifestEntry } from "./planDryRun.ts";
import { operationKey } from "./marker.ts";

export const PLAN_SEND_BATCH = 8;
export const PLAN_SEND_ACTIONS = ["precheck", "send", "verify"] as const;
export type PlanSendAction = typeof PLAN_SEND_ACTIONS[number];

export type Expected = { planSha256: string; refsSha256: string; opsSha256: string; jobId: string };
export type DryJob = { id: string; plan_version_id: string; plan_sha256: string; refs_sha256: string; ops_sha256: string; total_ops: number } | null;
export type DryReceipt = { op_index: number; session_key: string; session_date: string; body_sha256: string; outcome: string; code: string; http_status: number | null };
/** Attestation humaine vérifiée : AUCUNE source n'existe en QA ⇒ toujours null côté Edge. */
export type HumanAttestation = { planVersionId: string; planSha256: string; reviewer: string } | null;

export type GateInput = {
  planVersionId: string; prepared: Prepared; expected: Expected; consent: unknown;
  job: DryJob; receipts: DryReceipt[]; provenance: unknown; attestation: HumanAttestation;
};

const HEX64 = /^[0-9a-f]{64}$/;

/** Retourne TOUTES les raisons de blocage (liste vide ⇒ envoi permis). Jamais d'assouplissement. */
export async function realSendGate(g: GateInput): Promise<string[]> {
  const r: string[] = [];
  const p = g.prepared;
  if (g.consent !== true) r.push("coach_consent_for_this_plan_absent");
  const e = g.expected;
  if (!e || !HEX64.test(e.planSha256 ?? "") || !HEX64.test(e.refsSha256 ?? "") || !HEX64.test(e.opsSha256 ?? "")) r.push("expected_hashes_invalid");
  else {
    if (e.planSha256 !== p.planSha256) r.push("plan_changed_since_review");
    if (e.refsSha256 !== p.refsSha256) r.push("refs_changed_resimulation_required");
    if (e.opsSha256 !== p.opsSha256) r.push("operations_changed_resimulation_required");
  }
  if (!p.precheck.complete) r.push("precheck_incomplete");
  // Chaque corps figé = corps marqué du journal (même empreinte que la réservation d'envoi).
  for (const o of p.ops) {
    if ((await operationKey(g.planVersionId, o.source)).payloadSha256 !== o.bodySha256) { r.push(`frozen_body_mismatch:${o.opIndex}`); break; }
  }
  const j = g.job;
  if (!j) r.push("dry_run_job_absent");
  else if (j.id !== e?.jobId || j.plan_version_id !== g.planVersionId || j.plan_sha256 !== p.planSha256 || j.refs_sha256 !== p.refsSha256
    || j.ops_sha256 !== p.opsSha256 || j.total_ops !== p.ops.length) r.push("dry_run_job_not_matching");
  else {
    const missing = p.ops.filter((o: ManifestEntry) => !g.receipts.some((x) => x.op_index === o.opIndex && x.session_key === o.sessionKey
      && x.session_date === o.date && x.body_sha256 === o.bodySha256 && x.outcome === "DRY_RUN_VALID" && x.code === "dry_run_valid"
      && typeof x.http_status === "number" && x.http_status >= 200 && x.http_status < 300));
    if (missing.length) r.push(`dry_run_not_validated_for_all_ops:${missing.length}`);
    if (g.receipts.some((x) => x.outcome !== "DRY_RUN_VALID")) r.push("dry_run_has_non_valid_receipts");
  }
  const prov = g.provenance as { prescriptionAllowed?: unknown; syntheticFixture?: unknown } | null | undefined;
  if (!prov || prov.prescriptionAllowed !== true) r.push("plan_not_prescription_allowed");
  if (prov?.syntheticFixture === true) r.push("plan_is_synthetic_non_prescriptive");
  const a = g.attestation;
  if (!a || a.planVersionId !== g.planVersionId || a.planSha256 !== p.planSha256) r.push("human_plan_attestation_absent");
  return r;
}

/** Résumé public (sans corps ni id Nolio) affiché au coach avant tout consentement. */
export function sendPreview(p: Prepared) {
  return {
    totalSessions: p.precheck.totalSessions, operations: p.ops.length, excludedRest: p.precheck.excludedRest, refused: p.precheck.refused,
    opsByKind: p.precheck.opsByKind, firstDate: p.precheck.firstDate, lastDate: p.precheck.lastDate,
    planSha256: p.planSha256, refsSha256: p.refsSha256, opsSha256: p.opsSha256,
  };
}
