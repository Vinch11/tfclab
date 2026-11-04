/**
 * Orchestration pure du dry_run QA (injectée → testable sans réseau). L'appelant (Edge)
 * a déjà fait getClaims + coach QA + athlète possédé (client RLS) AVANT d'appeler ceci,
 * et crée le service-role seulement ensuite. Aucune branche vers sendPlannedV2.
 */
import { buildDryRunBody, canonical, postDryRun, sha256Hex, DRY_RUN_FIXTURE_CODE, type DryFetch, type DryRunCode, type DryRunOutcome } from "./dryRun.ts";
import type { LoadResult } from "./connectionStore.ts";
import type { TeamScopeContext } from "./teamScopeContext.ts";

export type ReceiptInsert = { coach_id: string; athlete_id: string; fixture_code: string; payload_sha256: string | null; http_status: number | null; outcome: DryRunOutcome; code: DryRunCode | string };
export type DryRunActionResult = {
  status: "DRY_RUN_VALID" | "REFUSED" | "UNKNOWN" | "BLOCKED"; code: string; httpStatus: number | null;
  receiptId: string | null; payloadSha256: string | null; network: "none" | "dry_run_post"; realSend: "ABSENT";
  /** Privé, coach connecté seulement ; jamais dans le reçu ni les journaux. */
  teamContext?: TeamScopeContext;
};

export async function runDryRunAction(a: {
  coachId: string; athleteId: string; fixtureCode: unknown; now: () => number;
  loadConnection: () => Promise<LoadResult>;
  fetch: DryFetch; budgetMs?: number;
  insertReceipt: (r: ReceiptInsert) => Promise<string | null>;
}): Promise<DryRunActionResult> {
  const base = { receiptId: null, payloadSha256: null, httpStatus: null, realSend: "ABSENT" as const };
  if (a.fixtureCode !== DRY_RUN_FIXTURE_CODE) return { ...base, status: "REFUSED", code: "fixture_unknown", network: "none" };
  const loaded = await a.loadConnection();
  if (!loaded.ok) return { ...base, status: "BLOCKED", code: (loaded as { reason: string }).reason, network: "none" };
  const date = new Date(a.now() + 86_400_000).toISOString().slice(0, 10);
  const b = buildDryRunBody({ fixtureCode: a.fixtureCode, runSportId: loaded.value.refs.sportIds.run, athleteRef: loaded.value.refs.athleteId, date });
  if (!b.ok) return { ...base, status: "BLOCKED", code: (b as { reason: string }).reason, network: "none" };
  const payloadSha256 = await sha256Hex(canonical(b.body));
  const r = await postDryRun({ fetch: a.fetch, accessToken: loaded.value.accessToken, body: b.body, budgetMs: a.budgetMs });
  let receiptId: string | null = null;
  try {
    receiptId = await a.insertReceipt({ coach_id: a.coachId, athlete_id: a.athleteId, fixture_code: DRY_RUN_FIXTURE_CODE, payload_sha256: payloadSha256, http_status: r.httpStatus, outcome: r.outcome, code: r.code });
  } catch { receiptId = null; }
  const out: DryRunActionResult = { status: r.outcome, code: r.code, httpStatus: r.httpStatus, receiptId, payloadSha256, network: "dry_run_post", realSend: "ABSENT" };
  // Contexte d'équipe seulement si refus 403 team_scope_forbidden ET reçu enregistré (sinon rien ne peut être confirmé).
  if (receiptId && r.teamContext && r.outcome === "REFUSED" && r.code === "team_scope_forbidden" && r.httpStatus === 403) out.teamContext = r.teamContext;
  return out;
}
