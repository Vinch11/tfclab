import { describe, it, expect } from "vitest";
import { getTrailSessionAlternatives } from "../trailSessionAlternatives";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela) : l'alternative
 * "Tapis" affichait "Bloc continu 20–40 min à 76–85% incl. au seuil" pour la
 * séance "Sortie longue Z1 Seiler" — un tapis de course ne dépasse jamais
 * 20% d'inclinaison en usage réel. 76-85% était en fait extrait de la phrase
 * du texte de la séance elle-même : "le 'black hole' (Z3, 76-85% FCmax) est
 * la zone à ÉVITER absolument" — une zone physiologique à ÉVITER, confondue
 * avec un pourcentage d'inclinaison tapis suggéré.
 *
 * Cause : `parseIncline` matchait N'IMPORTE QUEL "N-M%" du texte sans borne
 * de plausibilité (contrairement à sa propre branche "valeur unique", qui
 * rejetait déjà tout ce qui sort de 1-20%). Fix : même borne 1-20% sur la
 * branche "range".
 */
describe("getTrailSessionAlternatives — l'inclinaison tapis suggérée reste physiquement plausible (1-20%)", () => {
  it("ignore un pourcentage de zone physiologique (%FCmax) et retombe sur le fallback plausible", () => {
    const input = {
      sport: "run",
      title: "Sortie longue Z1 Seiler",
      details:
        "Cette sortie doit rester sous le premier seuil lactique. Le 'black hole' (Z3, 76-85% FCmax) est la zone à ÉVITER absolument. Terrain : côte modérée.",
    };
    const alts = getTrailSessionAlternatives(input);
    const treadmill = alts.find((a) => a.kind === "treadmill");
    expect(treadmill, "une alternative tapis doit être générée pour cette séance (contient 'côte' + 'seuil')").toBeTruthy();
    expect(
      treadmill!.hint.includes("76") || treadmill!.hint.includes("85"),
      `l'inclinaison tapis ne doit jamais reprendre une zone %FCmax (76-85%) — hint actuel: "${treadmill!.hint}"`,
    ).toBe(false);
    // Fallback attendu pour la branche "seuil_cote" sans incline plausible détecté.
    expect(treadmill!.hint).toContain("3–6%");
  });

  it("continue d'extraire une inclinaison plausible (1-20%) quand elle est réellement présente dans le texte", () => {
    const input = {
      sport: "run",
      title: "Seuil côte",
      details: "3-5 × 6-10 min Z4 sur côte 8-12%, récup descente trot",
    };
    const alts = getTrailSessionAlternatives(input);
    const treadmill = alts.find((a) => a.kind === "treadmill");
    expect(treadmill).toBeTruthy();
    expect(treadmill!.hint).toContain("8–12%");
  });
});
