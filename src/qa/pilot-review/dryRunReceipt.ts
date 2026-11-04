/**
 * Vérification client du reçu dry_run : le résultat n'est CONFIRMÉ que si la relecture
 * RLS (coach = soi) du reçu écrit par le serveur concorde champ par champ avec la réponse.
 * Le client ne peut pas insérer de reçu (GRANT SELECT seul). Jamais d'attestation / GO.
 */
import { projectTeamScopeContext, type TeamScopeContext } from "../../../supabase/functions/_shared/nolioV2/teamScopeContext";

export const DRY_RUN_FIXTURE_CODE = "QA_TECH_RUN_10MIN_NO_TARGET";
export type DryRunResponse = { status: string; code: string; httpStatus: number | null; receiptId: string | null; payloadSha256: string | null; realSend: string; teamContext?: unknown };
export type ReceiptRow = { id: string; coach_id: string; athlete_id: string; fixture_code: string; payload_sha256: string | null; http_status: number | null; outcome: string; code: string; real_send: string };
export type DryRunView = {
  kind: "CONFIRMED_VALID" | "CONFIRMED_REFUSED" | "CONFIRMED_UNKNOWN" | "BLOCKED" | "UNCONFIRMED"; message: string;
  /** Présent SEULEMENT pour un reçu concordant REFUSED/403/team_scope_forbidden ; `context` null = Nolio n'a rien fourni d'exploitable. Privé : jamais journalisé. */
  team?: { context: TeamScopeContext | null };
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function parseDryRunResponse(x: unknown): DryRunResponse | null {
  if (!isObj(x) || typeof x.status !== "string" || typeof x.code !== "string" || x.realSend !== "ABSENT") return null;
  if (!(x.httpStatus === null || typeof x.httpStatus === "number")) return null;
  if (!(x.receiptId === null || typeof x.receiptId === "string")) return null;
  if (!(x.payloadSha256 === null || typeof x.payloadSha256 === "string")) return null;
  return x as unknown as DryRunResponse;
}

/** Explications françaises des refus 403 (codes officiels Nolio). Aucun contenu Nolio brut n'est jamais affiché. */
export const REFUSAL_HINTS: Record<string, string> = {
  team_scope_forbidden: "L'équipe Nolio bloque l'écriture API du calendrier planifié de cet athlète. Prochaine action : demander à un administrateur de l'équipe Nolio de vérifier « Options d'équipe > API et MCP » (droits d'écriture du calendrier planifié), puis relancer un seul test.",
  missing_scope: "Nolio indique qu'un droit d'accès accordé à TFCLab manque. Prochaine action : vérifier les droits accordés lors de l'autorisation Nolio V2 avant tout nouveau test ; TFCLab ne reconnecte rien automatiquement.",
  athlete_api_access_denied: "L'athlète a désactivé l'accès API de ses coachs dans Nolio. Prochaine action : demander à l'athlète de réactiver cet accès.",
  permission_denied: "Nolio refuse la permission (abonnement payant du propriétaire de l'app, athlète non coaché, ou réglage côté athlète). Prochaine action : vérifier ces trois points côté Nolio.",
  wrong_api_version: "Nolio indique des identifiants d'une autre version d'API. Prochaine action : vérifier que la connexion utilisée est bien l'app Nolio V2.",
  pat_required: "Nolio exige une clé d'app pour cette route. Prochaine action : signaler ce résultat ; la route de simulation ne devrait pas l'exiger.",
  forbidden_403: "Motif non identifié par TFCLab. Prochaine action : copier simplement ce nouveau résultat pour diagnostic.",
};

export function verifyReceipt(resp: DryRunResponse, row: unknown, who: { coachId: string; athleteId: string }): DryRunView {
  if (resp.status === "BLOCKED") return { kind: "BLOCKED", message: `Bloqué avant tout appel Nolio : ${resp.code}` };
  if (!resp.receiptId) return { kind: "UNCONFIRMED", message: "Résultat non confirmé : reçu non enregistré." };
  if (!isObj(row)) return { kind: "UNCONFIRMED", message: "Résultat non confirmé : reçu illisible." };
  const r = row as ReceiptRow;
  const same = r.id === resp.receiptId && r.coach_id === who.coachId && r.athlete_id === who.athleteId && r.fixture_code === DRY_RUN_FIXTURE_CODE
    && r.payload_sha256 === resp.payloadSha256 && r.http_status === resp.httpStatus && r.outcome === resp.status && r.code === resp.code && r.real_send === "ABSENT";
  if (!same) return { kind: "UNCONFIRMED", message: "Résultat non confirmé : le reçu relu ne correspond pas." };
  if (r.outcome === "DRY_RUN_VALID" && r.code === "dry_run_valid" && r.http_status !== null && r.http_status >= 200 && r.http_status < 300)
    return { kind: "CONFIRMED_VALID", message: `Simulation validée par Nolio (HTTP ${r.http_status}). Rien n'a été ajouté au calendrier. Envoi réel : ABSENT.` };
  if (r.outcome === "REFUSED") {
    const v: DryRunView = { kind: "CONFIRMED_REFUSED", message: `Refusé par Nolio : ${r.code}${r.http_status ? ` (HTTP ${r.http_status})` : ""}. ${REFUSAL_HINTS[r.code] ?? ""}${REFUSAL_HINTS[r.code] ? " " : ""}Envoi réel : ABSENT.` };
    // Contexte d'équipe re-validé côté client ; uniquement après relecture concordante du reçu.
    if (r.code === "team_scope_forbidden" && r.http_status === 403) v.team = { context: projectTeamScopeContext(resp.teamContext) };
    return v;
  }
  return { kind: "CONFIRMED_UNKNOWN", message: `Résultat inconnu (jamais compté comme succès) : ${r.code}. Ne pas relancer sans vérifier.` };
}
