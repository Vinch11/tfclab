/**
 * Client navigateur de l'export Nolio API V2 (Edge Functions
 * `nolio-v2-connect` et `nolio-v2-export-plan`). Aucun jeton ne transite ici :
 * le navigateur n'envoie que des identifiants et reçoit des statuts.
 */
import { supabase } from "@/integrations/supabase/client";

export type NolioV2Sport = { sport: string; name: string; usable: boolean; active: boolean };
export type NolioV2Status = {
  status: "OK";
  configured: boolean;
  connected: boolean;
  reconnectRequired: boolean;
  nolioUserRef: string | null;
  athletes: Array<{ id: string; name: string; has_api_access: boolean }>;
  link: null | { nolioAthleteRef: string; nolioAthleteName: string | null; sportIds: Record<string, string>; sports: NolioV2Sport[]; refsLoadedAt: string };
};
export type NolioV2Refusal = { status: "REFUSED" | "UNKNOWN" | "BLOCKED"; reason: string };
export type NolioV2Prepared = {
  status: "PREPARED"; engine: "ai" | "det"; nolioAthleteName: string | null;
  counts: { total: number; operations: number; rest: number; refused: number };
  problems: string[];
  refused: Array<{ sessionKey: string; date: string | null; title: string; sport: string; reason: string | null }>;
  alreadySent: number | null; firstDate: string | null; lastDate: string | null;
};
export type NolioV2Batch = {
  status: "DONE" | "PROGRESS" | "STOPPED"; reason: string | null;
  confirmed: number; total: number; createdThisBatch: number;
  failedSession: { sessionKey: string; title: string; date: string; code: string; fields: string[] } | null;
};

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T | NolioV2Refusal> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // Les refus métier sont renvoyés en 200 ; une erreur ici = réseau / 4xx-5xx.
    const ctx = (error as { context?: Response }).context;
    try { const j = ctx ? await ctx.json() : null; if (j && typeof j.reason === "string") return { status: "REFUSED", reason: j.reason }; } catch { /* corps illisible */ }
    return { status: "UNKNOWN", reason: error.message || "network_error" };
  }
  return data as T | NolioV2Refusal;
}

export const nolioV2 = {
  status: (athleteId?: string) => call<NolioV2Status>("nolio-v2-connect", { action: "status", ...(athleteId ? { athleteId } : {}) }),
  start: () => call<{ status: "REDIRECT"; authorizeUrl: string }>("nolio-v2-connect", { action: "start" }),
  refreshAthletes: () => call<{ status: "OK"; athletes: NolioV2Status["athletes"] }>("nolio-v2-connect", { action: "refresh_athletes" }),
  link: (athleteId: string, nolioAthleteRef: string, sportIds?: Record<string, string>) =>
    call<{ status: "LINKED"; sportIds: Record<string, string>; sports: NolioV2Sport[] }>("nolio-v2-connect", { action: "link", athleteId, nolioAthleteRef, ...(sportIds ? { sportIds } : {}) }),
  unlink: (athleteId: string) => call<{ status: "UNLINKED" }>("nolio-v2-connect", { action: "unlink", athleteId }),
  disconnect: () => call<{ status: "DISCONNECTED" }>("nolio-v2-connect", { action: "disconnect" }),
  prepare: (planVersionId: string) => call<NolioV2Prepared>("nolio-v2-export-plan", { action: "prepare", planVersionId }),
  sendBatch: (planVersionId: string) => call<NolioV2Batch>("nolio-v2-export-plan", { action: "send", planVersionId }),
};

export function isRefusal(x: unknown): x is NolioV2Refusal {
  return !!x && typeof x === "object" && ["REFUSED", "UNKNOWN", "BLOCKED"].includes((x as { status?: string }).status ?? "");
}

const REASONS: Record<string, string> = {
  not_connected: "Compte Nolio non connecté.",
  reconnect_required: "Nolio demande une nouvelle connexion du compte.",
  athlete_not_linked: "Cet athlète n'est pas encore relié à un athlète Nolio.",
  athlete_not_managed_by_account: "Cet athlète Nolio n'est pas géré par votre compte Nolio.",
  athlete_api_access_denied: "L'athlète n'a pas autorisé l'accès API dans Nolio.",
  nothing_to_send: "Aucune séance exportable dans ce plan.",
  plan_not_owned: "Plan introuvable ou non autorisé.",
  "missing_config:NOLIO_V2_CLIENT_ID/NOLIO_V2_CLIENT_SECRET": "Export Nolio V2 non configuré sur le serveur (identifiants OAuth manquants).",
  athlete_link_from_previous_connection_relink: "Le lien de cet athlète date d'une ancienne connexion : reliez-le à nouveau.",
  no_sport_associated: "Associez au moins un sport.",
  time_budget: "Lot interrompu par la limite de temps : reprise automatique.",
};
const SESSION_REASONS: Record<string, string> = {
  repos_sans_contenu: "repos",
  duration_unknown: "durée inconnue",
  title_missing: "titre manquant",
  date_invalid: "date invalide",
};
export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  if (REASONS[reason]) return REASONS[reason];
  if (SESSION_REASONS[reason]) return SESSION_REASONS[reason];
  if (reason.startsWith("sport_reference_missing:")) return `aucun sport Nolio associé à « ${reason.split(":")[1]} »`;
  if (reason.startsWith("sport_unrecognized:")) return `sport non reconnu (${reason.split(":")[1]})`;
  if (reason.startsWith("nolio_refused_simulation:")) return `refusée par Nolio en simulation (${reason.split(":")[1]})`;
  if (reason.startsWith("token_refresh_")) return "Rafraîchissement de la connexion Nolio impossible : reconnectez le compte.";
  return reason;
}
