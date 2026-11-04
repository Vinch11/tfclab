/**
 * Vérification client de l'essai réel Nolio V2 (recette unique). Le message
 * « séance vérifiée dans Nolio, une seule occurrence » n'est affiché que si le reçu
 * `verify` relu sous RLS (coach = soi) concorde champ par champ avec la réponse
 * ET porte VERIFIED_UNIQUE (1 marqueur, 1 correspondance exacte). Le client ne peut
 * ni insérer ni modifier un reçu (GRANT SELECT seul). Jamais d'attestation sportive.
 */
export const TRIAL_RECIPE_CODE = "QA_TECH_RUN_10MIN_NO_TARGET_REAL_1";
export const TRIAL_RECEIPT_COLS = "id,trial_id,coach_id,athlete_id,recipe_code,action,trial_date,payload_sha256,http_status,verdict,code,items_read,marker_matches,exact_matches";

export type TrialVerify = { verdict: string; code: string; receiptId: string | null; itemsRead: number | null; markerMatches: number | null; exactMatches: number | null };
export type TrialResponse = {
  status: string; code: string; trialId: string | null; trialDate: string | null; payloadSha256: string | null; state: string | null;
  httpStatus: number | null; receiptIds: string[]; verify: TrialVerify | null; network: string;
  recipient: { nolioName: string; payloadSha256: string } | null;
};
export type TrialReceiptRow = {
  id: string; trial_id: string; coach_id: string; athlete_id: string; recipe_code: string; action: string; trial_date: string;
  payload_sha256: string; http_status: number | null; verdict: string; code: string; items_read: number | null; marker_matches: number | null; exact_matches: number | null;
};
export type TrialView = { kind: "VERIFIED_UNIQUE" | "PREPARED" | "REFUSED" | "UNKNOWN" | "BLOCKED"; message: string; canVerify: boolean; canSend: boolean };

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const strOrNull = (x: unknown) => x === null || typeof x === "string";

export function parseTrialResponse(x: unknown): TrialResponse | null {
  if (!isObj(x) || typeof x.status !== "string" || typeof x.code !== "string") return null;
  if (!strOrNull(x.trialId) || !strOrNull(x.trialDate) || !strOrNull(x.payloadSha256) || !strOrNull(x.state)) return null;
  if (!(x.httpStatus === null || typeof x.httpStatus === "number")) return null;
  if (!Array.isArray(x.receiptIds) || !x.receiptIds.every((r) => typeof r === "string")) return null;
  if (!(x.verify === null || (isObj(x.verify) && typeof x.verify.verdict === "string" && typeof x.verify.code === "string" && strOrNull(x.verify.receiptId)))) return null;
  const rc = x.recipient;
  const recipient = isObj(rc) && typeof rc.nolioName === "string" && typeof rc.payloadSha256 === "string" && rc.payloadSha256 === x.payloadSha256
    ? { nolioName: cleanName(rc.nolioName), payloadSha256: rc.payloadSha256 } : null;
  return { ...(x as unknown as TrialResponse), recipient: recipient && recipient.nolioName ? recipient : null };
}
// eslint-disable-next-line no-control-regex -- retrait volontaire des caractères de contrôle
const cleanName = (n: string) => n.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
const isCount = (n: unknown, min: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= min;

const UNSENT_STATES = new Set(["frozen"]);
const BLOCKED_HINT = "Bloqué avant tout envoi Nolio";

/** `rows` = reçus relus sous RLS pour resp.receiptIds. */
export function verifyTrialReceipts(resp: TrialResponse, rows: unknown[] | null, who: { coachId: string; athleteId: string }): TrialView {
  const sentOrUnknown = resp.state !== null && !UNSENT_STATES.has(resp.state);
  const base = { canVerify: sentOrUnknown, canSend: resp.state === "frozen" };
  if (resp.status === "BLOCKED") return { ...base, kind: "BLOCKED", message: `${BLOCKED_HINT} : ${resp.code}.` };
  if (resp.status === "NOT_SENT") return { ...base, kind: "PREPARED", message: "Essai figé, jamais envoyé : rien à vérifier dans Nolio." };
  if (resp.status === "ALREADY_SENT" || resp.status === "IN_FLIGHT")
    return { ...base, canSend: false, canVerify: true, kind: "UNKNOWN", message: "Cet essai a déjà été réservé ou envoyé : aucun deuxième envoi. Utilisez seulement « Vérifier dans Nolio »." };
  if (!Array.isArray(rows) || rows.length !== resp.receiptIds.length || resp.receiptIds.length === 0)
    return { ...base, canSend: false, kind: "UNKNOWN", message: "Résultat inconnu : reçu absent ou illisible. Aucun nouvel envoi ; vérifiez seulement." };
  const byId = new Map<string, TrialReceiptRow>();
  for (const r of rows) if (isObj(r) && typeof r.id === "string") byId.set(r.id, r as unknown as TrialReceiptRow);
  const common = (r: TrialReceiptRow | undefined) => !!r && r.coach_id === who.coachId && r.athlete_id === who.athleteId && r.recipe_code === TRIAL_RECIPE_CODE
    && r.trial_id === resp.trialId && r.trial_date === resp.trialDate && r.payload_sha256 === resp.payloadSha256;
  if (!resp.receiptIds.every((id) => common(byId.get(id))))
    return { ...base, canSend: false, kind: "UNKNOWN", message: "Résultat inconnu : les reçus relus ne correspondent pas. Aucun nouvel envoi." };

  if ((resp.status === "PREPARED" || resp.state === "frozen") && !resp.recipient)
    return { ...base, canSend: false, kind: "BLOCKED", message: "Destinataire Nolio non confirmé pour ce contenu figé : envoi bloqué." };
  if (resp.status === "PREPARED") {
    const r = byId.get(resp.receiptIds[0]);
    if (resp.receiptIds.length !== 1 || r?.action !== "prepare" || r.verdict !== "PREPARED") return { ...base, canSend: false, kind: "UNKNOWN", message: "Préparation non confirmée." };
    return { ...base, kind: "PREPARED", message: resp.state === "frozen" ? `Essai figé pour le ${resp.trialDate} (date seule). Rien n'a été envoyé.` : `Essai déjà figé pour le ${resp.trialDate} et déjà réservé/envoyé : vérification seulement.` };
  }
  if (resp.status === "POST_REFUSED") {
    const r = byId.get(resp.receiptIds[0]);
    if (r?.action !== "send" || r.verdict !== "POST_REFUSED" || r.http_status !== resp.httpStatus) return { ...base, canSend: false, kind: "UNKNOWN", message: "Refus non confirmé par le reçu. Aucun nouvel envoi." };
    return { ...base, canSend: false, kind: "REFUSED", message: `Nolio a refusé la création (${r.code}). Aucun nouvel envoi automatique ; vous pouvez seulement vérifier.` };
  }
  const v = resp.verify;
  const vr = v?.receiptId ? byId.get(v.receiptId) : undefined;
  if (v && vr && vr.action === "verify" && vr.verdict === v.verdict && vr.code === v.code && vr.items_read === v.itemsRead
      && vr.marker_matches === v.markerMatches && vr.exact_matches === v.exactMatches
      && vr.verdict === "VERIFIED_UNIQUE" && v.verdict === "VERIFIED_UNIQUE" && vr.code === "exact_unique"
      && isCount(vr.items_read, 1) && vr.marker_matches === 1 && vr.exact_matches === 1)
    return { ...base, canSend: false, kind: "VERIFIED_UNIQUE", message: `Séance vérifiée dans Nolio, une seule occurrence (le ${resp.trialDate}, ${vr.items_read} séance(s) lue(s) ce jour-là).` };
  const why = vr ? ({ DUPLICATE: "plusieurs occurrences avec le marqueur TFCLab", DIVERGENT: "séance trouvée mais détail différent", ABSENT: "séance non trouvée à la lecture", UNKNOWN: "lecture incomplète" } as Record<string, string>)[vr.verdict] ?? vr.verdict : "relecture non confirmée";
  return { ...base, canSend: false, canVerify: true, kind: "UNKNOWN", message: `Résultat inconnu (${why}). Aucun deuxième envoi : utilisez seulement « Vérifier dans Nolio ».` };
}
