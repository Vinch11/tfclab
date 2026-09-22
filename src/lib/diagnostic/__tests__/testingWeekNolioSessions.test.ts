import { describe, it, expect } from "vitest";
import { buildCompactTriathlonNolioSessions } from "../testingWeekNolioSessions";

/**
 * Fix "exporter le calendrier compact vers Nolio comme un plan" (demande
 * coach) : convertit les 16 jours du calendrier compact triathlon (vélo +
 * course + natation) en séances au format attendu par l'edge function
 * `nolio-send-plan` (weekNumber/dayIndex 0-6, sport, title, objectif).
 */
describe("buildCompactTriathlonNolioSessions", () => {
  const sessions = buildCompactTriathlonNolioSessions();

  it("produit 18 séances (16 jours, dont 2 jours combinant 2 séances)", () => {
    expect(sessions).toHaveLength(18);
  });

  it("n'a jamais isRest=true (sinon nolio-send-plan ignorerait silencieusement la séance)", () => {
    for (const s of sessions) {
      expect(s.isRest).toBe(false);
    }
  });

  it("construit, pour chaque étape de chaque séance, un step sans cible chiffrée (demande coach : \"empty unit\" + texte explicatif, pas de valeur liée à un athlète précis)", () => {
    for (const s of sessions) {
      for (const step of s.structuredWorkout) {
        expect(step.type).toBe("step");
        expect(step.step_duration_type).toBe("duration");
        expect(step.target_type).toBe("no_target");
        expect(step.step_duration_value).toBeGreaterThan(0);
        expect(step.notes.trim().length).toBeGreaterThan(0);
        expect(["warmup", "active", "cooldown"]).toContain(step.intensity_type);
      }
    }
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
    // Jour 16 (2 séances combinées, dernier jour) → semaine 3, jour 1
    const last = sessions[sessions.length - 1];
    const secondToLast = sessions[sessions.length - 2];
    expect(secondToLast).toMatchObject({ weekNumber: 3, dayIndex: 1, sessionIndex: 0 });
    expect(last).toMatchObject({ weekNumber: 3, dayIndex: 1, sessionIndex: 1 });
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

  it("signale le point de vigilance (repos après le test FTP+TTE vélo) dans l'objectif de la séance concernée", () => {
    const flagged = sessions.find((s) => s.objectif.includes("Ce repos complet suit directement le test Vélo D5"));
    expect(flagged).toBeDefined();
    expect(flagged!.title).toBe("Repos complet");
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
