import { describe, it, expect } from "vitest";
import { buildCompactTriathlonNolioSessions } from "../testingWeekNolioSessions";

/**
 * Fix "exporter le calendrier compact vers Nolio comme un plan" (demande
 * coach) : convertit les 18 jours du calendrier compact triathlon (vélo +
 * course + natation) en séances au format attendu par l'edge function
 * `nolio-send-plan` (weekNumber/dayIndex 0-6, sport, title, objectif).
 *
 * Fix "FTP et TTE mélangés" (demande coach) : la semaine vélo TFCL puis la
 * semaine course CAP passent chacune de 8 à 9 jours (seuil/FTP et TTE testés
 * séparément), portant le calendrier compact à 18 jours / 20 séances Nolio.
 */
describe("buildCompactTriathlonNolioSessions", () => {
  const sessions = buildCompactTriathlonNolioSessions();

  it("produit 20 séances (18 jours, dont 2 jours combinant 2 séances)", () => {
    expect(sessions).toHaveLength(20);
  });

  it("n'a jamais isRest=true (sinon nolio-send-plan ignorerait silencieusement la séance)", () => {
    for (const s of sessions) {
      expect(s.isRest).toBe(false);
    }
  });

  it("construit, pour chaque étape de chaque séance (y compris à l'intérieur des blocs de répétition), un step sans cible chiffrée (demande coach : \"empty unit\" + texte explicatif, pas de valeur liée à un athlète précis)", () => {
    for (const s of sessions) {
      for (const item of s.structuredWorkout) {
        const steps = item.type === "repetition" ? item.steps : [item];
        for (const step of steps) {
          expect(step.type).toBe("step");
          expect(step.step_duration_type).toBe("duration");
          expect(step.target_type).toBe("no_target");
          expect(step.step_duration_value).toBeGreaterThan(0);
          expect(step.notes.trim().length).toBeGreaterThan(0);
          expect(["warmup", "active", "cooldown"]).toContain(step.intensity_type);
        }
      }
    }
  });

  /**
   * Fix "séances structurées comme le Pool Day créé à la main dans Nolio"
   * (demande coach) : CAP D1 répète 2 sprints 15s identiques séparés d'une
   * récupération de 8 min — jusqu'ici aplati en 3 étapes séquentielles
   * (sprint 1, récup, sprint 2), perdant le rendu "2x { ... }" natif que
   * Nolio sait afficher (mêmes blocs `type:"repetition"` que le coach a
   * construits manuellement pour TFCL Pool Day™). groupRepeatedEffort()
   * détecte ce pattern (2 efforts identiques, même durée, séparés d'une même
   * récup) et le regroupe en un vrai bloc de répétition Nolio.
   */
  it("regroupe les 2 sprints identiques de CAP D1 en un bloc de répétition Nolio natif (2x { sprint, récup })", () => {
    const capSprintDay = sessions.find((s) => s.title === "TEST SPRINT 15s");
    expect(capSprintDay).toBeDefined();

    const repBlock = capSprintDay!.structuredWorkout.find((it) => it.type === "repetition");
    expect(repBlock).toBeDefined();
    expect(repBlock!.value).toBe(2);
    expect(repBlock!.steps).toHaveLength(2);
    expect(repBlock!.steps[0].intensity_type).toBe("active");
    expect(repBlock!.steps[0].notes).toContain("SPRINT MAXIMAL 15s");
    expect(repBlock!.steps[0].notes).not.toContain("(essai");
    expect(repBlock!.steps[0].step_duration_value).toBe(15);
    expect(repBlock!.steps[1].intensity_type).toBe("cooldown");
    expect(repBlock!.steps[1].step_duration_value).toBe(480);

    // Jamais un "step" à plat pour les 2 sprints d'origine — uniquement le bloc de répétition.
    const flatSprintSteps = capSprintDay!.structuredWorkout.filter(
      (it) => it.type === "step" && it.notes.includes("SPRINT MAXIMAL 15s"),
    );
    expect(flatSprintSteps).toHaveLength(0);
  });

  it("ne regroupe PAS deux efforts distincts qui se suivent (TFCL D1 : P30s puis P60s, pas 2 tentatives identiques)", () => {
    const tfclGlycoDay = sessions.find((s) => s.title === "TEST GLYCOLYTIQUE (P30s + P60s)");
    expect(tfclGlycoDay).toBeDefined();
    const repBlocks = tfclGlycoDay!.structuredWorkout.filter((it) => it.type === "repetition");
    expect(repBlocks).toHaveLength(0);
  });

  it("a un structuredWorkout non vide pour toute séance qui a effectivement des étapes physiques", () => {
    // "OFF + COHÉRENCE CHECK" (D7) n'a aucune étape physique dans le protocole officiel
    // (juste une table de cohérence à remplir) — structuredWorkout vide y est donc correct,
    // pas un oubli. Toutes les autres séances doivent avoir au moins une étape.
    const withoutSteps = sessions.filter((s) => s.structuredWorkout.length === 0);
    for (const s of withoutSteps) {
      expect(s.title).toBe("OFF + COHÉRENCE CHECK");
    }
    expect(sessions.length - withoutSteps.length).toBeGreaterThan(0);
  });

  it("garde dayIndex dans 0-6 pour toutes les séances (contrat dur de nolio-send-plan)", () => {
    for (const s of sessions) {
      expect(s.dayIndex).toBeGreaterThanOrEqual(0);
      expect(s.dayIndex).toBeLessThanOrEqual(6);
    }
  });

  it("numérote weekNumber/dayIndex de façon strictement séquentielle depuis le Jour 1", () => {
    // Jour 1 (2 séances combinées vélo+course) → semaine 1, jour 0
    expect(sessions[0]).toMatchObject({ weekNumber: 1, dayIndex: 0, sessionIndex: 0 });
    expect(sessions[1]).toMatchObject({ weekNumber: 1, dayIndex: 0, sessionIndex: 1 });
    // Jour 2 (natation) → semaine 1, jour 1
    expect(sessions[2]).toMatchObject({ weekNumber: 1, dayIndex: 1, sessionIndex: 0, sport: "Natation" });
    // Jour 8 → semaine 2, jour 0
    const jour8 = sessions.find((s) => s.title === "Récupération" && s.weekNumber === 2 && s.dayIndex === 0);
    expect(jour8).toBeDefined();
    // Jour 18 (2 séances combinées, dernier jour) → semaine 3, jour 3
    const last = sessions[sessions.length - 1];
    const secondToLast = sessions[sessions.length - 2];
    expect(secondToLast).toMatchObject({ weekNumber: 3, dayIndex: 3, sessionIndex: 0 });
    expect(last).toMatchObject({ weekNumber: 3, dayIndex: 3, sessionIndex: 1 });
  });

  it("inclut les 3 sports (Vélo, Course à pied, Natation)", () => {
    const sports = new Set(sessions.map((s) => s.sport));
    expect(sports.has("Vélo")).toBe(true);
    expect(sports.has("Course à pied")).toBe(true);
    expect(sports.has("Natation")).toBe(true);
  });

  it("la séance natation reprend le contenu officiel TFCL Pool Day™ (pas de divergence)", () => {
    const swim = sessions.find((s) => s.sport === "Natation");
    expect(swim).toBeDefined();
    expect(swim!.title).toBe("TFCL Pool Day™");
    expect(swim!.objectif).toContain("Sprint 25m départ plongé maximal");
    expect(swim!.objectif).toContain("RÉSULTATS À CALCULER");
  });

  it("signale le point de vigilance (séance à pacing contrôlé après les deux tests TTE) dans l'objectif de la séance concernée", () => {
    const flagged = sessions.find((s) => s.objectif.includes("suit directement DEUX tests TTE consécutifs"));
    expect(flagged).toBeDefined();
    expect(flagged!.title).toContain("Endurance Validation");
    expect(flagged!.objectif).toContain("⚠️ POINT DE VIGILANCE");
  });

  it("chaque séance a un objectif non vide, et jamais de champ structure (évite l'aplatissement toListLines de nolio-send-plan)", () => {
    for (const s of sessions) {
      expect(s.objectif.trim().length).toBeGreaterThan(0);
      expect("structure" in s).toBe(false);
    }
  });

  it("sépare clairement les sections d'un jour de test multi-étapes (échauffement / corps de séance / règles / critères / à enregistrer)", () => {
    const glyco = sessions.find((s) => s.title.includes("TEST GLYCOLYTIQUE"));
    expect(glyco).toBeDefined();
    for (const header of ["🔥 ÉCHAUFFEMENT", "💪 CORPS DE SÉANCE", "🧭 RÈGLES DE PACING", "✅ CRITÈRES DE VALIDITÉ", "📋 À ENREGISTRER"]) {
      expect(glyco!.objectif).toContain(header);
    }
    // Chaque section démarre sur sa propre ligne, séparée par une ligne vide — jamais fusionnée.
    expect(glyco!.objectif).toMatch(/\n\n🔥 ÉCHAUFFEMENT/);
    expect(glyco!.objectif).toMatch(/\n\n💪 CORPS DE SÉANCE/);
  });

  it("découpe le structuredWorkout en une étape par étape réelle du protocole (jamais une seule étape fourre-tout, contrairement au bug initial)", () => {
    const glyco = sessions.find((s) => s.title.includes("TEST GLYCOLYTIQUE"));
    expect(glyco).toBeDefined();
    // Officiellement (TFCL_TESTING_WEEK D1) : 4 étapes d'échauffement + 3 étapes de corps de séance + 1 retour au calme = 8.
    expect(glyco!.structuredWorkout.length).toBe(8);
    // Durée totale des étapes = somme exacte des durées officielles (26 + 11.5 + 10 min) — aucune étape perdue en route.
    const totalSec = glyco!.structuredWorkout.reduce((acc, s) => acc + s.step_duration_value, 0);
    expect(totalSec).toBe(47.5 * 60);
  });

  it("la séance natation a une étape structurée par bloc officiel (4 blocs)", () => {
    const swim = sessions.find((s) => s.sport === "Natation");
    expect(swim).toBeDefined();
    expect(swim!.structuredWorkout).toHaveLength(4);
    expect(swim!.structuredWorkout[0].intensity_type).toBe("warmup");
  });
});
