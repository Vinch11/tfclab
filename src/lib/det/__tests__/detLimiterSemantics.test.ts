/**
 * Sémantique typée des limiteurs (registre moteur V403) — pas le dictionnaire d'affichage.
 * Traductions sans perte seulement ; « Durabilité » ≠ « TTE » ; inconnu / faute de frappe ⇒ blocage nommé.
 */
import { describe, it, expect } from "vitest";
import {
  DET_LIMITER_CAPABILITIES, detPrimaryLimiterKey, resolveDetLimiter, traceLimiterSemantics, verifyReviewedRaceDurabilityKey,
} from "../../../../experimental/det-engine/v403-limiter-semantics";
import type { ParsedSession } from "@/lib/aiPlanParser";

describe("résolution sans perte (casse / accents / espaces), tracée", () => {
  it.each([
    ["TTE", "tte", "exact"], ["tte", "tte", "exact"], ["Tte", "tte", "case"], [" TTE ", "tte", "accent_or_whitespace"],
    ["Durabilité", "durability_race_relative", "exact"], ["DURABILITÉ", "durability_race_relative", "case"],
    ["VMA", "vma_velocity", "exact"], ["VLamax", "vlamax_reduction", "exact"], ["Durabilite", "durability_race_relative", "accent_or_whitespace"], ["VO2max", "vo2max", "exact"], ["FTP", "ftp", "exact"],
  ])("%s → %s (%s)", (raw, key, translation) => {
    expect(resolveDetLimiter(raw)).toEqual({ raw, status: "supported", key, translation });
  });
  it("le libellé brut est conservé dans la résolution", () => {
    expect(resolveDetLimiter("Durabilite").raw).toBe("Durabilite");
  });
});

describe("physiologies différentes : jamais traduites", () => {
  it("Durabilité ≠ TTE : clés, définitions et branches distinctes", () => {
    expect(resolveDetLimiter("Durabilité")).toMatchObject({ key: "durability_race_relative" });
    expect(DET_LIMITER_CAPABILITIES.durability_race_relative.primaryBranches).not.toEqual(DET_LIMITER_CAPABILITIES.tte.primaryBranches);
    expect(DET_LIMITER_CAPABILITIES.durability_race_relative.appMeaning).toMatch(/RELATIVE À L'ÉPREUVE/);
    expect(DET_LIMITER_CAPABILITIES.durability_race_relative.scientificReview).toBe(false);
  });
  it.each([
    ["Durabilité (découplage)", /découplage/], ["FTP/kg", /FTP\/kg/], ["FatMax", /aucune branche DET primaire/],
    ["Durabilté", /inconnu/], ["TTEE", /inconnu/], ["Foo", /inconnu/], ["", /inconnu/],
  ])("%s ⇒ non supporté (raison nommée)", (raw, reason) => {
    const r = resolveDetLimiter(raw);
    expect(r.status).toBe("unsupported");
    expect(r.key).toBeNull();
    expect(r.status === "unsupported" && r.reason).toMatch(reason);
  });
  it("clé primaire moteur : la casse ne masque plus l'audit V358 (« TTE » de l'app ⇒ tte)", () => {
    expect(detPrimaryLimiterKey({ identifiedLimitersRaw: ["TTE"] })).toBe("tte");
    expect(detPrimaryLimiterKey({ identifiedLimitersRaw: ["Durabilité", "TTE"] })).toBe("durability_race_relative");
    expect(detPrimaryLimiterKey({ identifiedLimitersRaw: ["Durabilté", "TTE"] })).toBeNull();
    expect(detPrimaryLimiterKey({})).toBeNull();
  });
});

describe("politique primaire / secondaire par famille", () => {
  it("marathon : primaire inconnu (faute de frappe) ⇒ blocked_unsupported_limiter avec éléments manquants, priorités conservées", () => {
    const t = traceLimiterSemantics(["Durabilté", "TTE"], "marathon");
    expect(t.blocking).toMatchObject({ code: "blocked_unsupported_limiter", raw: "Durabilté" });
    expect(t.blocking!.missingItems.length).toBe(3);
    expect(t.rawPriorities).toEqual(["Durabilté", "TTE"]);
    expect(t.resolutions.map((r) => r.policy)).toEqual(["blocked_unsupported_primary", "native_validators_only"]);
  });
  it("marathon : VLamax conserve sa nouvelle branche distincte, jamais remplacé par TTE", () => {
    const t = traceLimiterSemantics(["VLamax", "TTE"], "marathon");
    expect(t.blocking).toBeNull();
    expect(t.resolutions[0]).toMatchObject({key:"vlamax_reduction",policy:"det_primary_branch"});
    expect(t.rawPriorities).toEqual(["VLamax", "TTE"]);
  });
  it("marathon : Durabilité et TTE primaires définis", () => {
    expect(traceLimiterSemantics(["Durabilité", "TTE"], "marathon").blocking).toBeNull();
    expect(traceLimiterSemantics(["TTE", "Durabilité"], "marathon").blocking).toBeNull();
  });
  it("secondaire non supporté : conservé et tracé, jamais omis, ne bloque pas", () => {
    const t = traceLimiterSemantics(["TTE", "Durabilité (découplage)", "Foo"], "marathon");
    expect(t.blocking).toBeNull();
    expect(t.resolutions.map((r) => [r.raw, r.policy])).toEqual([
      ["TTE", "det_primary_branch"], ["Durabilité (découplage)", "retained_unsupported_secondary"], ["Foo", "retained_unsupported_secondary"]]);
  });
  it("semi : branche typée ; 70.3 : politique native historique conservée", () => {
    expect(traceLimiterSemantics(["VLamax"], "semi_marathon").resolutions[0].policy).toBe("det_primary_branch");
    expect(traceLimiterSemantics(["Foo"], "triathlon_703").blocking).toBeNull();
  });
});

describe("preuve de séance clé « Durabilité » : seul le levier de l'app (seuil soutenu) compte", () => {
  const sess = (id: string, durationMin = 60): ParsedSession => ({ catalogId: id, durationMin, sport: "run", isKeySession: true, isRest: false } as unknown as ParsedSession);
  const dose = (id: string, high: number, durationMin = 60) => ({ low: durationMin - high, mid: 0, high, unknown: 0, durationMin, sourceIds: [id], provenance: "v3_individually_configured_blocks_only" as const });
  const proof = (keys: string[], domain: string, high: number) => ({
    exactDose: (id: string, m: number) => dose(id, high, m), limiterKeys: () => keys, primaryDomain: () => domain });
  it("source MLSS threshold_tolerance + fractional_utilization, ≥20 min Z4 exactes ⇒ vérifiée", () => {
    expect(verifyReviewedRaceDurabilityKey(sess("V3P_RUN_136"), proof(["fractional_utilization", "threshold_tolerance"], "mlss", 24)))
      .toMatchObject({ verified: true, basis: "app_lever_increase_tte_threshold_sustain", scientificAttestation: false });
  });
  it("clé V3 « durability » (endurance LT1) : refusée (autre domaine)", () => {
    expect(verifyReviewedRaceDurabilityKey(sess("V3P_RUN_031"), proof(["aerobic_capacity", "durability", "running_impact_tolerance"], "moderate_lt1", 0)).verified).toBe(false);
  });
  it("allure marathon (race_pace_durability) : refusée comme preuve de semaine de charge", () => {
    expect(verifyReviewedRaceDurabilityKey(sess("V3P_RUN_081"), proof(["fueling_tolerance", "race_pace_durability"], "marathon_pace", 60)).verified).toBe(false);
  });
  it("MLSS mais < 20 min exactes ⇒ refusée ; séance non clé ⇒ refusée", () => {
    expect(verifyReviewedRaceDurabilityKey(sess("V3P_RUN_136"), proof(["fractional_utilization", "threshold_tolerance"], "mlss", 19)).verified).toBe(false);
    expect(verifyReviewedRaceDurabilityKey({ ...sess("V3P_RUN_136"), isKeySession: false } as ParsedSession, proof(["fractional_utilization", "threshold_tolerance"], "mlss", 30)).verified).toBe(false);
  });
});
