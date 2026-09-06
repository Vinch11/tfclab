/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) :
 * applyWbalRecoveryRecalc ne vérifiait jamais cpResult.dataQuality avant de
 * prescrire des temps de repos — un CP/W' "implausible" (courbe de
 * puissance trop plate, écart CP-FTP extrême) était utilisé sans aucun
 * avertissement visible pour le coach. CP/W' restent bornés (effectiveCP,
 * clamp W' [10;35]kJ) donc la prescription reste sûre — mais un
 * avertissement est désormais ajouté à l'annotation pour signaler que les
 * données source (P30s/P60s/MAP5') sont suspectes.
 */
import { describe, it, expect } from "vitest";
import { applyWbalRecoveryRecalc } from "../wbalPostProcessor";
import type { ParsedPlan, ParsedSession, PlanAthleteData } from "../types";

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Intervalles",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlan(sessions: ParsedSession[]): ParsedPlan {
  return {
    weeks: [{ weekNumber: 1, theme: "Test", phase: "build", sessions }],
  } as ParsedPlan;
}

// Reproduit la trace de l'audit : régression CP tombant à ~166W très en
// dessous du FTP réel (280W) — données de puissance courte non-maximales.
// effectiveCP reste borné à ftp+10=290W (garde-fou symétrique).
const ATHLETE_IMPLAUSIBLE: PlanAthleteData = {
  ftp: 280,
  p30s: 1500,
  p60s: 1200,
  map5min: 330,
  weightKg: 70,
} as PlanAthleteData;

describe("applyWbalRecoveryRecalc — avertit sur un CP/W' 'implausible' au lieu de rester silencieux", () => {
  it("réécrit toujours le repos (CP effectif borné et sûr) mais ajoute un avertissement dataQuality à l'annotation", () => {
    const session = makeSession({ details: "5×4min @ 110%FTP, R=3min" });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_IMPLAUSIBLE);

    expect(stats.rewritten).toBe(1);
    expect(session.details).toContain("W'bal recalc");
    expect(session.details).toContain("Données CP/W' peu fiables");
  });
});
