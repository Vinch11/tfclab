import { describe, it, expect } from "vitest";
import { checkB9 } from "../checks";

/**
 * Contract test — checkB9 lit `value_check_summary` produit par l'edge et
 * par le formatteur client (useAITrainingPlan). Toute divergence de nom de
 * champ (ex : `corrigés=` au lieu de `relativized=`) doit casser ce test
 * pour éviter le bug B9 "résumé mal formé / unresolved invisibles".
 */
describe("checkB9 — contrat summary v2 & affichage des unresolved", () => {
  const summary =
    "[info] value_check_summary: tokens=124 conforme=100 relativized=12 unresolved=12 residualAbs=8";

  it("FAIL si summary absent", () => {
    const r = checkB9([]);
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/absent/i);
  });

  it("parse le contrat canonique { tokens, conforme, relativized, unresolved, residualAbs }", () => {
    const r = checkB9([summary]);
    expect(r.pass).toBe(false); // unresolved>0 ou residualAbs>0
    expect(r.details[0]).toMatch(/tokens : 124/);
    expect(r.details[0]).toMatch(/relativisés 12/);
    expect(r.details[0]).toMatch(/unresolved 12/);
    expect(r.details[0]).toMatch(/absolus résiduels 8/);
  });

  it("PASS si unresolved=0 et residualAbs=0", () => {
    const r = checkB9([
      "[info] value_check_summary: tokens=50 conforme=50 relativized=0 unresolved=0 residualAbs=0",
    ]);
    expect(r.pass).toBe(true);
  });

  it("accepte l'ancien libellé 'relativisés=' (rétro-compat)", () => {
    const r = checkB9([
      "[info] value_check_summary: tokens=10 conforme=10 relativisés=0 unresolved=0 residualAbs=0",
    ]);
    expect(r.pass).toBe(true);
  });

  it("affiche TOUS les unresolved (pas de slice) avec token verbatim + raison", () => {
    const unresolved = Array.from({ length: 12 }, (_, i) =>
      `[critical] value_unresolved [absolu_ambigu]: W${i + 1} mardi bike — 600W → 214% FTP hors grille token="600W"`,
    );
    const r = checkB9([summary, ...unresolved]);
    // Les 12 unresolved doivent apparaître (bug initial : slice(0,6))
    const unresolvedShown = r.details.filter((d) => d.includes("value_unresolved"));
    expect(unresolvedShown.length).toBe(12);
    expect(r.details.some((d) => d.includes('token="600W"'))).toBe(true);
  });

  it("affiche les relativized (before → after)", () => {
    const r = checkB9([
      summary,
      '[warning] value_relativized: W1 mardi bike — 252W traduit en 90% FTP (FTP=280W) token="252W" before="252W" after="90% FTP"',
    ]);
    expect(r.details.some((d) => d.includes("90% FTP"))).toBe(true);
  });

  it("classifie les catégories unresolved (absolu_ambigu | pourcent_hors_grille | zone_inconnue)", () => {
    const r = checkB9([
      summary,
      "[critical] value_unresolved [zone_inconnue]: W2 jeudi bike — Zone \"Z9\" inconnue token=\"Z9\"",
      "[critical] value_unresolved [pourcent_hors_grille]: W3 vendredi bike — 350% FTP hors bornes token=\"350% FTP\"",
    ]);
    expect(r.details.some((d) => d.includes("[zone_inconnue]"))).toBe(true);
    expect(r.details.some((d) => d.includes("[pourcent_hors_grille]"))).toBe(true);
  });

  it("FAIL sur summary mal formé", () => {
    const r = checkB9(["[info] value_check_summary: garbage"]);
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/mal formé/i);
  });
});
