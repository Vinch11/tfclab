import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseAthleteConstraints } from "./constraintsBlock.ts";

/**
 * Bug réel (B-5K-BEGINNER, Pilot Cockpit, 2026-10-13) — miroir edge du
 * correctif client (src/lib/plan/constraintRules.ts, cf.
 * constraintRules.test.ts, même docstring complète là-bas) : l'ancienne
 * détection d'interdiction GLOBALE considérait qu'une négation et un
 * mot-clé sportif n'importe où dans le même fragment suffisaient à bannir
 * ce sport sur tout le plan. "Profil distinct du template Start-to-Run
 * statique (jamais généré par IA en production)" a ainsi été lu comme
 * "jamais [de] Run" (le tiret de "Start-to-Run" crée une frontière de mot),
 * sans aucun rapport réel — cette interdiction fantôme se propageait
 * ensuite dans buildAthleteConstraintsBlock() directement dans le prompt
 * IA ("❌ course à pied : 0 séance... Redistribue le volume"), expliquant
 * pourquoi le modèle a fidèlement obéi à une contrainte jamais saisie par
 * le coach.
 */

Deno.test("parseAthleteConstraints — ne bannit rien sur le texte réel du bug (Start-to-Run + négation sans rapport)", () => {
  const rules = parseAthleteConstraints(
    "Profil distinct du template Start-to-Run statique (jamais généré par IA en production)",
  );
  assertEquals(rules.bannedSports, []);
});

Deno.test("parseAthleteConstraints — ne bannit rien quand le sport est mentionné dans un nom de programme sans négation adjacente", () => {
  const rules = parseAthleteConstraints("A suivi le programme Start-to-Run avant de nous rejoindre");
  assertEquals(rules.bannedSports, []);
});

Deno.test("parseAthleteConstraints — ne bannit rien sur une description historique (négation et sport dans le même fragment mais sans lien grammatical direct)", () => {
  const rules = parseAthleteConstraints(
    "N'a jamais suivi de plan structuré mais pratique le vélo depuis longtemps",
  );
  assertEquals(rules.bannedSports, []);
});

Deno.test("parseAthleteConstraints — détecte les véritables interdictions globales (forme pré)", () => {
  assertEquals(parseAthleteConstraints("pas de vélo").bannedSports, ["bike"]);
  assertEquals(parseAthleteConstraints("jamais de natation").bannedSports, ["swim"]);
  assertEquals(parseAthleteConstraints("aucune course à pied").bannedSports, ["run"]);
  assertEquals(parseAthleteConstraints("sans renforcement").bannedSports, ["strength"]);
});

Deno.test("parseAthleteConstraints — détecte les véritables interdictions globales (forme post, adjectif prédicatif)", () => {
  assertEquals(parseAthleteConstraints("vélo interdit").bannedSports, ["bike"]);
  assertEquals(parseAthleteConstraints("natation exclue").bannedSports, ["swim"]);
  assertEquals(parseAthleteConstraints("course à pied est interdite").bannedSports, ["run"]);
});

Deno.test("parseAthleteConstraints — ban de jour (comportement inchangé)", () => {
  const rules = parseAthleteConstraints("pas de vélo le mardi");
  assertEquals(rules.bannedSports, []);
  assertEquals(rules.dayBans, [{ day: "mardi", sport: "bike", source: "pas de vélo le mardi" }]);
});

Deno.test("parseAthleteConstraints — blessure détectée", () => {
  const rules = parseAthleteConstraints("douleur au genou droit depuis 3 semaines");
  assertEquals(rules.injuries, ["douleur au genou droit depuis 3 semaines"]);
});
