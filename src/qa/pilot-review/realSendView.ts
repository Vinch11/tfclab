/**
 * Vue client de l'envoi RÉEL du plan complet (QA). Ne déduit jamais un succès :
 * READY/DONE ne sont affichés que sur réponse de forme exacte ; tout le reste = inconnu/bloqué.
 */
export type RealSendResp = { verifyNextIndex?:number; verifiedBatch?:number; status: string; reason: string | null; gate: string[]; preview: null | { totalSessions: number; operations: number; excludedRest: number; refused: number; opsByKind: { training: number; competition: number } } };

const GATE_FR: Record<string, string> = {
  coach_consent_for_this_plan_absent: "consentement explicite du coach pour CE plan absent",
  expected_hashes_invalid: "empreintes de la simulation relue absentes",
  plan_changed_since_review: "plan modifié depuis la simulation",
  refs_changed_resimulation_required: "correspondances modifiées : nouvelle simulation intégrale requise",
  operations_changed_resimulation_required: "séances préparées différentes : nouvelle simulation intégrale requise",
  precheck_incomplete: "couverture incomplète (refus ou séances non préparées)",
  dry_run_job_absent: "aucune simulation concordante relue",
  dry_run_job_not_matching: "la simulation relue ne correspond pas exactement à ce plan et à ces correspondances",
  dry_run_has_non_valid_receipts: "la simulation contient des résultats non valides",
  plan_not_prescription_allowed: "plan non autorisé à la prescription (plan technique QA)",
  plan_is_synthetic_non_prescriptive: "plan synthétique non prescriptif",
  coach_review_absent_or_stale: "revue du coach absente ou périmée pour ce plan et ces associations",
  release_sporting_attestation_absent: "release non attestée : une revue ordinaire ne peut pas lever ce blocage",
  human_plan_attestation_absent: "attestation humaine du plan absente (aucune source vérifiée ; jamais fabriquée)",
};
export function gateFr(code: string): string {
  if (code.startsWith("dry_run_not_validated_for_all_ops:")) return `simulation non validée pour ${code.split(":")[1]} séance(s) avec le corps marqué exact`;
  if (code.startsWith("frozen_body_mismatch:")) return "corps figé incohérent";
  return GATE_FR[code] ?? `blocage : ${code}`;
}
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export function parseRealSendResp(x: unknown): RealSendResp | null {
  if (!isObj(x) || typeof x.status !== "string") return null;
  const gate = Array.isArray(x.gate) && x.gate.every((g) => typeof g === "string") ? x.gate as string[] : null;
  if (!gate) return null;
  const pv = isObj(x.preview) ? x.preview : null;
  const n = (k: string) => (pv && Number.isSafeInteger(pv[k]) ? pv[k] as number : NaN);
  const kinds = pv && isObj(pv.opsByKind) ? pv.opsByKind : null;
  const preview = pv && kinds && [n("totalSessions"), n("operations"), n("excludedRest"), n("refused")].every(Number.isFinite)
    ? { totalSessions: n("totalSessions"), operations: n("operations"), excludedRest: n("excludedRest"), refused: n("refused"), opsByKind: { training: Number(kinds.training), competition: Number(kinds.competition) } } : null;
  // READY seulement sans aucune raison de blocage.
  const status = x.status === "READY" && gate.length > 0 ? "BLOCKED" : x.status;
  const results=Array.isArray(x.results)?x.results:[];
  const verifiedBatch=results.filter(r=>isObj(r)&&r.result==="verified_unique"&&typeof r.receiptId==="string").length;
  const last=results.at(-1) as Record<string,unknown>|undefined;
  const verifyNextIndex=status==="VERIFY" && results.length>0 && verifiedBatch===results.length && Number.isSafeInteger(last?.opIndex)?Number(last?.opIndex)+1:undefined;
  return { verifiedBatch, verifyNextIndex, status, reason: typeof x.reason === "string" ? x.reason : null, gate, preview };
}
