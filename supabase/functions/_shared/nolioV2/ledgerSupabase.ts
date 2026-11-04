/**
 * Adaptateur du journal durable Nolio V2 sur les RPC SQL atomiques
 * `nolio_v2_claim_operation` (INSERT … ON CONFLICT DO NOTHING + lecture de
 * l'existant) et `nolio_v2_transition_operation` (UPDATE … WHERE state = from).
 * Les RPC sont exécutables UNIQUEMENT par service_role : le client passé ici
 * doit être créé APRÈS vérification de l'appelant (getClaims) et de la
 * propriété coach/plan. Le coach est lié à chaque appel (contrôle SQL).
 * Toute erreur RPC ⇒ exception ⇒ l'expéditeur s'arrête sans POST.
 */
import type { LedgerEntry, LedgerState, NolioV2Ledger } from "./plannedClient.ts";

export type RpcClient = {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const STATES = new Set<LedgerState>(["sending", "sent_unconfirmed", "confirmed", "ambiguous", "rejected", "rate_limited"]);

function parseExisting(x: unknown): LedgerEntry {
  const o = (x ?? {}) as Record<string, unknown>;
  const str = (k: string) => { if (typeof o[k] !== "string") throw new Error(`ledger_existing_invalid:${k}`); return o[k] as string; };
  const state = str("state") as LedgerState;
  if (!STATES.has(state)) throw new Error(`ledger_state_unknown:${state}`); // 'prepared' (déprécié) inclus ⇒ arrêt
  if (o.apiVersion !== "v2") throw new Error("ledger_api_version_not_v2");
  return {
    opKey: str("opKey"), planVersionId: str("planVersionId"), sessionKey: str("sessionKey"), path: str("path"),
    athleteRef: str("athleteRef"), payloadSha256: str("payloadSha256"), apiVersion: "v2", state,
    remoteId: typeof o.remoteId === "string" ? o.remoteId : null, detail: typeof o.detail === "string" ? o.detail : null,
  };
}

export function supabaseNolioV2Ledger(client: RpcClient, coachId: string): NolioV2Ledger {
  return {
    async claim(e) {
      if (e.state !== "sending") throw new Error("claim_must_start_sending");
      const { data, error } = await client.rpc("nolio_v2_claim_operation", {
        p_op_key: e.opKey, p_coach_id: coachId, p_plan_version_id: e.planVersionId, p_session_key: e.sessionKey,
        p_path: e.path, p_athlete_ref: e.athleteRef, p_payload_sha256: e.payloadSha256,
      });
      if (error) throw new Error(`ledger_claim_error:${error.message}`);
      const d = data as { claimed?: unknown; existing?: unknown } | null;
      if (d?.claimed === true) return { claimed: true };
      if (d?.claimed === false) return { claimed: false, existing: parseExisting(d.existing) };
      throw new Error("ledger_claim_response_invalid");
    },
    async transition(opKey, from, to, patch) {
      const { data, error } = await client.rpc("nolio_v2_transition_operation", {
        p_op_key: opKey, p_coach_id: coachId, p_from: from, p_to: to,
        p_remote_id: patch.remoteId ?? null, p_detail: patch.detail ?? null,
      });
      if (error) throw new Error(`ledger_transition_error:${error.message}`);
      if (typeof data !== "boolean") throw new Error("ledger_transition_response_invalid");
      return data;
    },
  };
}
