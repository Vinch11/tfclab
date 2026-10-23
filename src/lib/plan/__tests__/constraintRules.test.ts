import { describe, it, expect } from "vitest";
import { parseAthleteConstraints, constraintSportLabel, toConstraintSport } from "../constraintRules";

/**
 * Bug réel (B-5K-BEGINNER, Pilot Cockpit, 2026-10-13) : l'ancienne détection
 * d'interdiction GLOBALE considérait qu'une négation et un mot-clé sportif
 * n'importe où dans le même fragment suffisaient à bannir ce sport sur tout
 * le plan. Un texte sans aucun rapport avec une vraie contrainte —
 * "Profil distinct du template Start-to-Run statique (jamais généré par IA
 * en production)" — a ainsi produit `bannedSports: ["run"]` ("jamais" portait
 * sur "généré par IA", mais `\brun\b` matchait dans "Start-to-Run" à cause du
 * tiret). Cette suite verrouille le correctif : proximité grammaticale
 * directe négation↔sport exigée, jamais une simple co-occurrence fragment-wide.
 */
describe("parseAthleteConstraints — faux positifs (régression B-5K-BEGINNER)", () => {
  it("ne bannit rien sur le texte réel du bug (Start-to-Run + négation sans rapport)", () => {
    const rules = parseAthleteConstraints(
      "Profil distinct du template Start-to-Run statique (jamais généré par IA en production)",
    );
    expect(rules.bannedSports).toEqual([]);
  });

  it("ne bannit rien quand le sport est mentionné dans un nom de programme sans négation adjacente", () => {
    const rules = parseAthleteConstraints("A suivi le programme Start-to-Run avant de nous rejoindre");
    expect(rules.bannedSports).toEqual([]);
  });

  it("ne bannit rien sur une description historique (négation et sport dans le même fragment mais sans lien grammatical direct)", () => {
    const rules = parseAthleteConstraints(
      "N'a jamais suivi de plan structuré mais pratique le vélo depuis longtemps",
    );
    // "jamais" porte sur "suivi de plan structuré", pas sur "vélo" (trop de mots entre les deux)
    expect(rules.bannedSports).toEqual([]);
  });

  it("ne bannit rien sur une simple mention du sport sans aucune négation dans le fragment", () => {
    const rules = parseAthleteConstraints("Aime beaucoup la natation en loisir");
    expect(rules.bannedSports).toEqual([]);
  });

  it("ne confond pas 'cap' (course à pied) utilisé comme mot ordinaire, même avec une négation plus loin dans le fragment", () => {
    const rules = parseAthleteConstraints("Jamais démotivé même quand le cap sur cet objectif semble loin");
    expect(rules.bannedSports).toEqual([]);
  });
});

describe("parseAthleteConstraints — véritables interdictions globales (forme pré)", () => {
  it("détecte 'pas de vélo'", () => {
    expect(parseAthleteConstraints("pas de vélo").bannedSports).toEqual(["bike"]);
  });

  it("détecte 'jamais de natation'", () => {
    expect(parseAthleteConstraints("jamais de natation").bannedSports).toEqual(["swim"]);
  });

  it("détecte 'aucune course à pied'", () => {
    expect(parseAthleteConstraints("aucune course à pied").bannedSports).toEqual(["run"]);
  });

  it("détecte 'sans renforcement'", () => {
    expect(parseAthleteConstraints("sans renforcement").bannedSports).toEqual(["strength"]);
  });
});

describe("parseAthleteConstraints — véritables interdictions globales (forme post, adjectif prédicatif)", () => {
  it("détecte 'vélo interdit'", () => {
    expect(parseAthleteConstraints("vélo interdit").bannedSports).toEqual(["bike"]);
  });

  it("détecte 'natation exclue'", () => {
    expect(parseAthleteConstraints("natation exclue").bannedSports).toEqual(["swim"]);
  });

  it("détecte 'course à pied est interdite' (verbe de liaison toléré)", () => {
    expect(parseAthleteConstraints("course à pied est interdite").bannedSports).toEqual(["run"]);
  });
});

/**
 * GRAND SPRINT P0, Sprint 2 ("fiabiliser les contraintes sportives",
 * 2026-10-23) : `detectBannedSportStrict` ne regardait jamais ce qui suit
 * la proximité négation↔sport — "natation interdite EN EAU FROIDE" et "pas
 * de natation EN MER" étaient donc lus comme des bannissements TOTAUX,
 * exactement comme "natation interdite" tout court. Conséquence réelle :
 * `redistributeTargetsForBannedSports` (planValidator.ts) redistribue le
 * quota natation à 0% pour tout le plan sur une simple ambiguïté de lieu/
 * condition, jamais une vraie interdiction totale demandée par le coach.
 */
describe("parseAthleteConstraints — distinguer interdiction totale et restriction partielle (Sprint 2)", () => {
  it("'natation interdite en eau froide' → PAS un ban total, reporté dans ambiguousRestrictions", () => {
    const rules = parseAthleteConstraints("natation interdite en eau froide");
    expect(rules.bannedSports).toEqual([]);
    expect(rules.ambiguousRestrictions).toEqual(["natation interdite en eau froide"]);
    expect(rules.rawText).toBe("natation interdite en eau froide"); // texte verbatim toujours transmis au prompt
  });

  it("'pas de natation en mer, autorisée en piscine' → ban détecté puis réautorisé par le fragment suivant", () => {
    const rules = parseAthleteConstraints("pas de natation en mer, autorisée en piscine");
    expect(rules.bannedSports).toEqual([]);
    expect(rules.ambiguousRestrictions.length).toBeGreaterThan(0);
  });

  it("'vélo interdit sauf en home trainer' → restriction partielle, pas un ban total", () => {
    const rules = parseAthleteConstraints("vélo interdit sauf en home trainer");
    expect(rules.bannedSports).toEqual([]);
  });

  it("'natation interdite temporairement' → restriction partielle (bornée dans le temps), pas un ban permanent", () => {
    const rules = parseAthleteConstraints("natation interdite temporairement");
    expect(rules.bannedSports).toEqual([]);
  });

  it("une vraie interdiction totale SANS qualificatif reste détectée normalement (aucune régression)", () => {
    expect(parseAthleteConstraints("natation interdite").bannedSports).toEqual(["swim"]);
    expect(parseAthleteConstraints("pas de natation").bannedSports).toEqual(["swim"]);
  });

  it("une interdiction totale accompagnée d'une blessure réelle (pas un qualificatif de lieu/condition) reste un ban total", () => {
    const rules = parseAthleteConstraints("pas de course à pied, douleur au genou");
    expect(rules.bannedSports).toEqual(["run"]);
  });
});

describe("parseAthleteConstraints — bans de jour (comportement inchangé, risque plus faible)", () => {
  it("détecte 'pas de vélo le mardi' comme un ban de jour, pas un ban global", () => {
    const rules = parseAthleteConstraints("pas de vélo le mardi");
    expect(rules.bannedSports).toEqual([]);
    expect(rules.dayBans).toEqual([{ day: "mardi", sport: "bike", source: "pas de vélo le mardi" }]);
  });

  it("détecte 'lundi repos' comme un jour off complet", () => {
    const rules = parseAthleteConstraints("lundi repos");
    expect(rules.dayBans).toEqual([{ day: "lundi", sport: "any", source: "lundi repos" }]);
  });
});

describe("parseAthleteConstraints — blessures", () => {
  it("détecte une zone de blessure mentionnée", () => {
    const rules = parseAthleteConstraints("douleur au genou droit depuis 3 semaines");
    expect(rules.injuries).toEqual(["douleur au genou droit depuis 3 semaines"]);
  });
});

describe("parseAthleteConstraints — cas combinés et texte vide", () => {
  it("retourne des règles vides pour un texte vide/null/undefined", () => {
    expect(parseAthleteConstraints("").hasHardRules).toBe(false);
    expect(parseAthleteConstraints(null).hasHardRules).toBe(false);
    expect(parseAthleteConstraints(undefined).hasHardRules).toBe(false);
  });

  it("combine ban global + ban de jour + blessure sans interférence croisée", () => {
    const rules = parseAthleteConstraints("jamais de natation, pas de vélo le mardi, douleur au dos");
    expect(rules.bannedSports).toEqual(["swim"]);
    expect(rules.dayBans).toEqual([{ day: "mardi", sport: "bike", source: "pas de vélo le mardi" }]);
    expect(rules.injuries).toEqual(["douleur au dos"]);
    expect(rules.hasHardRules).toBe(true);
  });
});

describe("constraintSportLabel / toConstraintSport", () => {
  it("retourne le libellé français pour chaque sport", () => {
    expect(constraintSportLabel("run")).toBe("course à pied");
    expect(constraintSportLabel("bike")).toBe("vélo");
    expect(constraintSportLabel("swim")).toBe("natation");
    expect(constraintSportLabel("strength")).toBe("renforcement");
  });

  it("normalise un sport de séance de plan vers un ConstraintSport", () => {
    expect(toConstraintSport("Vélo")).toBe("bike");
    expect(toConstraintSport("Course")).toBe("run");
    expect(toConstraintSport("Natation")).toBe("swim");
    expect(toConstraintSport("Renfo")).toBe("strength");
  });
});
