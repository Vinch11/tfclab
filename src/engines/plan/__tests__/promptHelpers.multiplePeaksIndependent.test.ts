import { describe, it, expect } from "vitest";
import { buildUserPrompt, classifyMultiObjectiveGoals } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Audit "structure d'un plan à plusieurs objectifs" (Marathon février 2027 +
 * Ironman juillet 2027, ~5 mois d'écart) : la littérature de périodisation
 * (Bompa & Haff — double/triple périodisation ; Issurin 2010, Block
 * Periodization) admet plusieurs pics de forme complets par saison quand
 * l'écart calendaire est suffisant pour une vraie récupération + un bloc
 * spécifique complet avant le pic suivant.
 *
 * AVANT ce fix, deux mécanismes indépendants décidaient chacun de leur côté
 * qui est "le vrai pic du plan" : la chronologie pure (dernière course
 * datée = taper complet) ET l'étiquette de priorité A/B/C (toujours liée au
 * champ "objectif principal" du formulaire, indépendante de la date) — un
 * coach mettant le Marathon (plus proche) comme objectif principal (A) et
 * l'Ironman (plus tardif) en objectif additionnel (B) obtenait un prompt
 * contradictoire : "l'Ironman DOIT être la dernière semaine du plan avec
 * taper complet" ET "le Marathon (A) est le pic de forme PRINCIPAL, l'Ironman
 * (B) n'a droit qu'à un mini-taper de 7-10 jours".
 */
function makeConfig(raceGoals: any[]) {
  return {
    objective: raceGoals[0]?.objective,
    planStartDate: "2027-01-04", // lundi
    raceGoals,
  };
}

describe("classifyMultiObjectiveGoals — écart calendaire réel, pas l'étiquette de priorité", () => {
  it("Marathon (A, février) + Ironman (B, juillet, ~5 mois) : les DEUX sont des pics complets", () => {
    const classification = classifyMultiObjectiveGoals([
      { objective: "Marathon", raceName: "Marathon de Paris", raceDate: "2027-02-07", priority: "A" },
      { objective: "IM", raceName: "Ironman Nice", raceDate: "2027-07-04", priority: "B" },
    ]);
    const marathon = classification.find((c) => c.goal.objective === "Marathon")!;
    const im = classification.find((c) => c.goal.objective === "IM")!;

    expect(marathon.isFullPeak).toBe(true);
    expect(marathon.isLast).toBe(false);
    expect(marathon.taperWeeks).toBe(2);

    expect(im.isFullPeak).toBe(true);
    expect(im.isLast).toBe(true);
    expect(im.taperWeeks).toBe(3);
  });

  it("10K (A, mars) + Marathon (B, juin, ~13 sem) : le 10K reste un jalon (format non éligible à un second pic, quel que soit l'écart)", () => {
    const classification = classifyMultiObjectiveGoals([
      { objective: "10K", raceName: "10K B", raceDate: "2026-03-02", priority: "A" },
      { objective: "Marathon", raceName: "Marathon A", raceDate: "2026-06-01", priority: "B" },
    ]);
    const tenK = classification.find((c) => c.goal.objective === "10K")!;
    const marathon = classification.find((c) => c.goal.objective === "Marathon")!;

    expect(tenK.isFullPeak).toBe(false);
    expect(marathon.isFullPeak).toBe(true);
    expect(marathon.isLast).toBe(true);
  });

  it("Marathon (février) + Ironman (mars, ~6 sem — écart trop court pour un second pic complet)", () => {
    const classification = classifyMultiObjectiveGoals([
      { objective: "Marathon", raceDate: "2027-02-07", priority: "A" },
      { objective: "IM", raceDate: "2027-03-21", priority: "B" },
    ]);
    const marathon = classification.find((c) => c.goal.objective === "Marathon")!;
    const im = classification.find((c) => c.goal.objective === "IM")!;

    // ~6 semaines d'écart < minGapWeeksForFullPeak("Marathon") = 8 sem : pas
    // assez de temps pour une vraie récupération + un bloc IM complet avant
    // l'Ironman — le Marathon reste un jalon (mini-taper), pas un pic complet.
    expect(marathon.isFullPeak).toBe(false);
    expect(im.isFullPeak).toBe(true); // toujours la dernière course datée
    expect(im.taperWeeks).toBe(3);
  });
});

describe("buildUserPrompt — multi-objectifs : plusieurs pics complets cohérents (pas de contradiction A vs chronologie)", () => {
  it("Marathon (A, février) + Ironman (B, juillet) : le Marathon reçoit un PIC DE FORME COMPLET, pas un mini-taper générique, et l'Ironman reste la dernière semaine du plan", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon de Paris", raceDate: "2027-02-07", priority: "A" },
      { objective: "IM", raceName: "Ironman Nice", raceDate: "2027-07-04", priority: "B" },
    ]);
    const prompt = buildUserPrompt({}, config);

    // Le Marathon (A, mais PAS la dernière course chronologiquement) ne doit
    // plus recevoir le mini-taper générique de jalon — c'est un pic complet.
    const marathonSection = prompt.match(/\*\*Objectif \d+[\s\S]*?Marathon[\s\S]*?(?=\*\*Objectif|\n\n###|$)/)![0];
    expect(marathonSection).toMatch(/PIC DE FORME COMPLET/i);
    expect(marathonSection).not.toMatch(/mini-taper \(7-10j\)/i);

    // L'Ironman (dernière course chronologiquement) reste bien "dernière semaine du plan".
    const imSection = prompt.match(/\*\*Objectif \d+[\s\S]*?IM[\s\S]*?(?=\*\*Objectif|\n\n###|$)/)![0];
    expect(imSection).toMatch(/DERNIÈRE semaine du plan.*taper complet/is);

    // Le rappel final ne doit PAS présenter le Marathon comme LE seul "objectif
    // principal" pendant que l'Ironman est relégué à un simple jalon — les deux
    // sont des pics complets et indépendants, sans hiérarchie artificielle.
    expect(prompt).toMatch(/2 pics de forme COMPLETS et INDÉPENDANTS/i);
    expect(prompt).not.toMatch(/Objectif principal \(A\)/i);
  });

  it("avec un seul objectif daté éligible (pas de second pic possible), le comportement mono-objectif est inchangé", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon A", raceDate: "2027-06-01", priority: "A" },
    ]);
    const prompt = buildUserPrompt({}, config);
    expect(prompt).toMatch(/DERNIÈRE semaine du plan.*taper complet/is);
    expect(prompt).not.toMatch(/CE N'EST PAS la dernière semaine du plan/i);
  });
});

/**
 * Fix "rappel contradictoire multi-objectifs" (audit coach, suite de l'audit
 * ci-dessus) : le bloc "Multi-objective: also emit sport coherence" filtrait
 * sur `priority !== "A"` brut — un objectif B/C qui obtenait malgré tout un
 * PIC DE FORME COMPLET (écart calendaire suffisant) recevait EN PLUS ce
 * rappel "Mini-taper 7-10j... relance vers objectif A", contredisant sa
 * propre section "PIC DE FORME COMPLET" générée juste au-dessus dans le même
 * prompt. Corrigé pour cibler les vrais JALONS (isFullPeak=false) via
 * classifyMultiObjectiveGoals, quelle que soit l'étiquette A/B/C — condition
 * nécessaire pour que le coach puisse marquer un 2e objectif "A" (audit
 * "priorité des événements") sans produire de prompt incohérent.
 */
describe("buildUserPrompt — rappel jalon multi-objectifs (cohérent avec la classification pic complet/jalon)", () => {
  it("Marathon (A, février) + Ironman (B, juillet, ~5 mois) : l'Ironman est un pic complet, PAS de rappel 'Jalon' contradictoire", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon de Paris", raceDate: "2027-02-07", priority: "A" },
      { objective: "IM", raceName: "Ironman Nice", raceDate: "2027-07-04", priority: "B" },
    ]);
    const prompt = buildUserPrompt({}, config);
    expect(prompt).not.toMatch(/RAPPEL : Jalon.*Ironman/is);
    expect(prompt).not.toMatch(/Mini-taper 10-14j avant\. Simulation race-pace/i);
  });

  it("2e objectif marqué \"A\" mais trop proche (~6 sem, < 8 sem requises pour Marathon) : reste un jalon et reçoit le rappel, sous le libellé neutre 'Jalon' (pas 'Objectif B')", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon A", raceDate: "2027-02-07", priority: "A" },
      { objective: "IM", raceName: "Ironman A2", raceDate: "2027-03-21", priority: "A" },
    ]);
    const prompt = buildUserPrompt({}, config);
    // Le Marathon (premier chronologiquement, écart insuffisant) reste un jalon
    // malgré son étiquette "A" — il reçoit le rappel générique, jamais "Objectif B".
    expect(prompt).toMatch(/RAPPEL : Jalon\s*\(Marathon A\) — Marathon/);
    expect(prompt).not.toMatch(/RAPPEL : Objectif B/);
  });

  it("3 objectifs (Marathon A proche + 10K B jalon + IM A lointain, pic complet) : seul le 10K (vrai jalon) reçoit le rappel", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon proche", raceDate: "2027-02-07", priority: "A" },
      { objective: "10K", raceName: "10K prépa", raceDate: "2027-04-15", priority: "B" },
      { objective: "IM", raceName: "Ironman lointain", raceDate: "2027-07-04", priority: "A" },
    ]);
    const prompt = buildUserPrompt({}, config);
    expect(prompt).toMatch(/RAPPEL : Jalon\s*\(10K prépa\) — 10K/);
    expect(prompt).not.toContain("RAPPEL : Jalon (Ironman lointain)");
  });
});
