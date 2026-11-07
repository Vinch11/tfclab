import { describe, expect, it } from "vitest";
import { classifyDryRunResponse, NOLIO_403_CODES } from "../../../../supabase/functions/_shared/nolioV2/dryRun";
import { verifyReceipt, DRY_RUN_FIXTURE_CODE } from "@/qa/pilot-review/dryRunReceipt";

const who = { coachId: "c", athleteId: "a" };
const view = (code: string) => {
  const resp = { status: "REFUSED", code, httpStatus: 403, receiptId: "rid", payloadSha256: "h", realSend: "ABSENT" };
  const row = { id: "rid", coach_id: "c", athlete_id: "a", fixture_code: DRY_RUN_FIXTURE_CODE, payload_sha256: "h", http_status: 403, outcome: "REFUSED", code, real_send: "ABSENT" };
  return verifyReceipt(resp, row, who);
};

describe("classeur 403", () => {
  for (const c of NOLIO_403_CODES) it(`${c} imbriqué ⇒ code officiel`, () => {
    expect(classifyDryRunResponse(403, JSON.stringify({ error: { code: c, message: "x", scopes: ["planned:write"] } }))).toEqual({ outcome: "REFUSED", code: c });
  });
  it("code inconnu / ref / token / message brut ⇒ forbidden_403", () => {
    for (const code of ["evil", "usr_ABC", "Bearer abc", "team_scope_forbidden ", "TEAM_SCOPE_FORBIDDEN", 42, null])
      expect(classifyDryRunResponse(403, JSON.stringify({ error: { code, message: "secret token", team_name: "T", athlete_name: "N" } })).code).toBe("forbidden_403");
  });
  it("403 malformé / HTML / forme inconnue ⇒ forbidden_403", () => {
    for (const t of [null, "", "<html>403</html>", "{", "[]", JSON.stringify({ code: "missing_scope" }), JSON.stringify({ error: "access_denied" }), JSON.stringify({ error: ["missing_scope"] })])
      expect(classifyDryRunResponse(403, t)).toEqual({ outcome: "REFUSED", code: "forbidden_403" });
  });
  it("le corps d'un autre statut n'est pas lu comme motif 403", () => {
    expect(classifyDryRunResponse(400, JSON.stringify({ error: { code: "missing_scope" } })).code).toBe("validation_rejected_400");
    expect(classifyDryRunResponse(200, JSON.stringify({ error: { code: "missing_scope" } })).outcome).toBe("UNKNOWN");
    expect(classifyDryRunResponse(200, JSON.stringify({ dry_run: true, is_valid: true, summary: "s" })).code).toBe("dry_run_valid");
  });
});

describe("messages de refus", () => {
  it("team_scope_forbidden ⇒ admin d'équipe, Options d'équipe > API et MCP", () => {
    const m = view("team_scope_forbidden").message;
    expect(m).toContain("Options d'équipe > API et MCP"); expect(m).toContain("HTTP 403"); expect(m).toContain("Envoi réel : ABSENT");
  });
  it("missing_scope ⇒ vérifier les droits, pas de reconnexion automatique", () => {
    expect(view("missing_scope").message).toContain("ne reconnecte rien automatiquement");
  });
  it("403 générique ⇒ motif non identifié, sans recommandation de clé/login", () => {
    const m = view("forbidden_403").message;
    expect(m).toContain("Motif non identifié par TFCLab"); expect(m).not.toMatch(/clé|reconnect|login/i);
    expect(view("forbidden_403").kind).toBe("CONFIRMED_REFUSED");
  });
});
