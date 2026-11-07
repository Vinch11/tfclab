import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { extractTeamScopeContext, validateTeamOptionsUrl, sanitizeTeamName, sanitizeScopes, projectTeamScopeContext } from "../../../../supabase/functions/_shared/nolioV2/teamScopeContext";
import { postDryRun, buildDryRunBody, DRY_RUN_FIXTURE_CODE, type DryFetch } from "../../../../supabase/functions/_shared/nolioV2/dryRun";
import { runDryRunAction } from "../../../../supabase/functions/_shared/nolioV2/dryRunAction";
import { verifyReceipt } from "@/qa/pilot-review/dryRunReceipt";
import { TeamScopeDetails } from "@/qa/pilot-review/TeamScopeDetails";

// Valeurs SYNTHÉTIQUES uniquement (jamais un vrai nom d'équipe ni un vrai lien).
const SYN_NAME = "Équipe Synthétique QA";
const SYN_URL = "https://www.nolio.io/team/0/manage/?options=api";
const body403 = (error: Record<string, unknown>) => JSON.stringify({ error: { message: "secret raw message", athlete_name: "Athlète Privé", fields: { x: ["y"] }, ...error } });
const TEAM = body403({ code: "team_scope_forbidden", team_name: SYN_NAME, scopes: ["planned:write"], team_options_url: SYN_URL });

describe("extraction team_scope_forbidden uniquement", () => {
  it("enveloppe officielle ⇒ nom, scopes, lien", () => {
    expect(extractTeamScopeContext(403, TEAM)).toEqual({ teamName: SYN_NAME, scopes: ["planned:write"], teamOptionsUrl: SYN_URL });
  });
  it("autres codes / statuts / formes ⇒ null", () => {
    expect(extractTeamScopeContext(403, body403({ code: "missing_scope", team_name: SYN_NAME, scopes: ["planned:write"] }))).toBeNull();
    expect(extractTeamScopeContext(400, TEAM)).toBeNull();
    expect(extractTeamScopeContext(200, TEAM)).toBeNull();
    for (const t of [null, "", "<html>", "[]", JSON.stringify({ team_name: SYN_NAME })]) expect(extractTeamScopeContext(403, t)).toBeNull();
  });
  it("ignore message, athlete_name, fields et clés inconnues", () => {
    const c = extractTeamScopeContext(403, TEAM);
    expect(Object.keys(c!).sort()).toEqual(["scopes", "teamName", "teamOptionsUrl"]);
    expect(JSON.stringify(c)).not.toMatch(/secret raw|Athlète Privé/);
  });
  it("team_scope_forbidden sans détails ⇒ null (absence honnête)", () => {
    expect(extractTeamScopeContext(403, body403({ code: "team_scope_forbidden" }))).toBeNull();
  });
});

describe("validation du lien", () => {
  it("accepte seulement https://www.nolio.io", () => { expect(validateTeamOptionsUrl(SYN_URL)).toBe(SYN_URL); });
  it("refuse externe, schémas exotiques, port, userinfo, credentials, fragment, contrôles", () => {
    for (const u of [
      "http://www.nolio.io/team/0/", "https://nolio.io/team/0/", "https://evil.com/?x=https://www.nolio.io/", "https://www.nolio.io.evil.com/",
      "https://www.nolio.io:8443/team/", "https://www.nolio.io:443/team/", "https://user:pw@www.nolio.io/team/", "https://www.nolio.io@evil.com/",
      "javascript:alert(1)", "data:text/html,<b>x</b>", "//www.nolio.io/team/", "/team/0/",
      "https://www.nolio.io/team/0/?code=abc", "https://www.nolio.io/team/0/?state=s", "https://www.nolio.io/team/0/?access_token=t",
      "https://www.nolio.io/team/0/?client_secret=s", "https://www.nolio.io/team/0/?api_key=k", "https://www.nolio.io/team/0/#token=t",
      "https://www.nolio.io/team/0/\u202e", "https://www.nolio.io/team\\0", " https://www.nolio.io/team/0/", "https://www.nolio.io/" + "a".repeat(600), 42, null,
    ]) expect(validateTeamOptionsUrl(u)).toBeNull();
  });
});

describe("nom et scopes", () => {
  it("nom : contrôles/bidi retirés, borné, HTML conservé comme texte", () => {
    expect(sanitizeTeamName("A\u0000B\u202eC\u200bD\nE")).toBe("ABCD E");
    expect([...sanitizeTeamName("x".repeat(200))!].length).toBe(81);
    expect(sanitizeTeamName("<img src=x onerror=alert(1)>")).toBe("<img src=x onerror=alert(1)>");
    for (const v of ["", "   ", "\u202e", 5, null]) expect(sanitizeTeamName(v)).toBeNull();
  });
  it("scopes : seulement l'allowlist officielle, dédupliqués", () => {
    expect(sanitizeScopes(["planned:write", "evil:all", "planned:write", "PLANNED:WRITE", 3, "real:read"])).toEqual(["planned:write", "real:read"]);
    expect(sanitizeScopes("planned:write")).toEqual([]);
  });
});

const conn = { ok: true as const, value: { accessToken: "t", connection: {}, refs: { athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTH1" } } } };
const run = (text: string, status = 403, ins = vi.fn(async () => "rid")) => runDryRunAction({
  coachId: "c", athleteId: "a", fixtureCode: DRY_RUN_FIXTURE_CODE, now: Date.now, loadConnection: async () => conn as never,
  fetch: (async () => ({ status, text: async () => text })) as unknown as DryFetch, insertReceipt: ins,
});

describe("propagation serveur", () => {
  it("contexte dans la réponse, JAMAIS dans le reçu", async () => {
    const ins = vi.fn(async () => "rid");
    const r = await run(TEAM, 403, ins);
    expect(r.code).toBe("team_scope_forbidden"); expect(r.teamContext?.teamName).toBe(SYN_NAME);
    const row = (ins.mock.calls as unknown as [Record<string, unknown>][])[0][0];
    expect(Object.keys(row).sort()).toEqual(["athlete_id", "coach_id", "code", "fixture_code", "http_status", "outcome", "payload_sha256"]);
    expect(JSON.stringify(row)).not.toMatch(/Synthétique|nolio\.io\/team|planned:write/);
  });
  it("aucun contexte si reçu non enregistré, autre refus ou 2xx", async () => {
    expect((await run(TEAM, 403, vi.fn(async () => null))).teamContext).toBeUndefined();
    expect((await run(body403({ code: "missing_scope", team_name: SYN_NAME, scopes: ["planned:write"] }))).teamContext).toBeUndefined();
    expect((await run(JSON.stringify({ dry_run: true, is_valid: true, summary: "s", error: { code: "team_scope_forbidden", team_name: SYN_NAME } }), 200)).teamContext).toBeUndefined();
  });
  it("transport : contexte présent seulement pour team_scope_forbidden", async () => {
    const b = buildDryRunBody({ fixtureCode: DRY_RUN_FIXTURE_CODE, runSportId: "spt_S", athleteRef: "usr_S", date: "2026-11-04" }); if (!b.ok) throw 0;
    const f = (t: string, s = 403) => (async () => ({ status: s, text: async () => t })) as unknown as DryFetch;
    expect((await postDryRun({ fetch: f(TEAM), accessToken: "t", body: b.body })).teamContext?.scopes).toEqual(["planned:write"]);
    expect((await postDryRun({ fetch: f(body403({ code: "permission_denied", team_name: SYN_NAME })), accessToken: "t", body: b.body })).teamContext).toBeUndefined();
  });
});

describe("relecture du reçu + affichage", () => {
  const who = { coachId: "c", athleteId: "a" };
  const ctx = projectTeamScopeContext({ teamName: SYN_NAME, scopes: ["planned:write"], teamOptionsUrl: SYN_URL });
  const resp = { status: "REFUSED", code: "team_scope_forbidden", httpStatus: 403, receiptId: "rid", payloadSha256: "h", realSend: "ABSENT", teamContext: ctx };
  const row = { id: "rid", coach_id: "c", athlete_id: "a", fixture_code: DRY_RUN_FIXTURE_CODE, payload_sha256: "h", http_status: 403, outcome: "REFUSED", code: "team_scope_forbidden", real_send: "ABSENT" };
  it("reçu concordant ⇒ contexte re-validé", () => { expect(verifyReceipt(resp, row, who).team?.context?.teamName).toBe(SYN_NAME); });
  it("reçu divergent, absent ou autre identité (A→B) ⇒ aucun contexte", () => {
    expect(verifyReceipt(resp, { ...row, code: "forbidden_403" }, who).team).toBeUndefined();
    expect(verifyReceipt(resp, null, who).team).toBeUndefined();
    expect(verifyReceipt(resp, row, { coachId: "b", athleteId: "a" }).team).toBeUndefined();
    expect(verifyReceipt({ ...resp, receiptId: null }, row, who).team).toBeUndefined();
  });
  it("contexte falsifié côté réponse ⇒ lien externe ignoré par le client", () => {
    const v = verifyReceipt({ ...resp, teamContext: { teamName: SYN_NAME, scopes: ["x:y"], teamOptionsUrl: "https://evil.com/" } }, row, who);
    expect(v.team?.context).toEqual({ teamName: SYN_NAME, scopes: [], teamOptionsUrl: null });
  });
  it("UI : nom, scopes et lien synthétiques visibles (texte échappé, nouvel onglet)", () => {
    render(<TeamScopeDetails context={{ teamName: "<b>X</b> " + SYN_NAME, scopes: ["planned:write"], teamOptionsUrl: SYN_URL }} />);
    expect(screen.getByTestId("nolio-team-name").textContent).toContain("<b>X</b> " + SYN_NAME);
    expect(screen.getByTestId("nolio-team-scopes").textContent).toContain("planned:write");
    const a = screen.getByTestId("nolio-team-options-link");
    expect(a.getAttribute("href")).toBe(SYN_URL); expect(a.getAttribute("target")).toBe("_blank"); expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });
  it("UI : sans contexte ⇒ état honnête, aucun lien", () => {
    render(<TeamScopeDetails context={null} />);
    expect(screen.getByTestId("nolio-team-name-missing").textContent).toContain("Nolio n'a pas fourni");
    expect(screen.getByTestId("nolio-team-link-missing").textContent).toContain("information non disponible");
    expect(screen.queryByTestId("nolio-team-options-link")).toBeNull();
  });
  it("UI : lien invalide injecté directement ⇒ non rendu", () => {
    render(<TeamScopeDetails context={{ teamName: SYN_NAME, scopes: [], teamOptionsUrl: "javascript:alert(1)" }} />);
    expect(screen.queryByTestId("nolio-team-options-link")).toBeNull();
  });
});
