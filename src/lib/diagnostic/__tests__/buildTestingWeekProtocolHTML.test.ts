import { describe, it, expect } from "vitest";
import { buildTestingWeekDossierHTML } from "../buildTestingWeekProtocolHTML";
import { TFCL_TESTING_WEEK } from "@/data/tfclTestingWeek";
import { CAP_TESTING_WEEK } from "@/data/capTestingWeek";

/**
 * Bug réel corrigé (audit coach) : le "dossier complet" imprimable ne
 * contenait que des fiches condensées ("Track/Bike/Pool Day", format 2h en
 * une session) avec des tests et des champs différents des semaines de test
 * officielles (TFCL_TESTING_WEEK / CAP_TESTING_WEEK) réellement utilisées par
 * TFCLTestingWeekPage.tsx / CAPTestingWeekPage.tsx pour calibrer le snapshot.
 * Ce nouveau dossier lit DIRECTEMENT ces mêmes objets — ces tests vérifient
 * que rien n'est perdu/inventé dans le rendu HTML, garantissant qu'il ne peut
 * plus diverger des semaines de test numériques.
 */
describe("buildTestingWeekDossierHTML — vélo (TFCL)", () => {
  const html = buildTestingWeekDossierHTML("bike", "Athlète Test");

  it("contient chaque jour du protocole TFCL officiel (dayKey + titre)", () => {
    for (const day of TFCL_TESTING_WEEK.days) {
      expect(html).toContain(day.dayKey);
      expect(html).toContain(day.title);
    }
  });

  it("contient chaque donnée à enregistrer de chaque jour", () => {
    for (const day of TFCL_TESTING_WEEK.days) {
      for (const field of day.protocol.dataToRecord) {
        expect(html).toContain(field);
      }
    }
  });

  it("contient les notes home-trainer quand elles existent (D1)", () => {
    const d1 = TFCL_TESTING_WEEK.days.find((d) => d.dayKey === "D1")!;
    expect(d1.protocol.homeTrainerNotes).toBeDefined();
    expect(html).toContain("Variante home-trainer");
    expect(html).toContain(d1.protocol.homeTrainerNotes![1]);
  });

  it("ne contient pas les fiches course/natation (hors périmètre vélo)", () => {
    expect(html).not.toContain("TFCL Pool Day");
    expect(html).not.toContain(CAP_TESTING_WEEK.title);
  });
});

describe("buildTestingWeekDossierHTML — course à pied (CAP)", () => {
  const html = buildTestingWeekDossierHTML("run", "Athlète Test");

  it("contient chaque jour du protocole CAP officiel (dayKey + titre)", () => {
    for (const day of CAP_TESTING_WEEK.days) {
      expect(html).toContain(day.dayKey);
      expect(html).toContain(day.title);
    }
  });

  it("contient chaque donnée à enregistrer de chaque jour", () => {
    for (const day of CAP_TESTING_WEEK.days) {
      for (const field of day.protocol.dataToRecord) {
        expect(html).toContain(field);
      }
    }
  });

  it("contient le protocole tapis complet quand il existe (D3 VMA)", () => {
    const d3 = CAP_TESTING_WEEK.days.find((d) => d.dayKey === "D3")!;
    expect(d3.treadmillProtocol).toBeDefined();
    expect(html).toContain("Variante tapis");
    for (const field of d3.treadmillProtocol!.dataToRecord) {
      expect(html).toContain(field);
    }
  });
});

describe("buildTestingWeekDossierHTML — triathlon (combiné)", () => {
  const html = buildTestingWeekDossierHTML("triathlon", "Athlète Test");

  it("contient les deux semaines complètes (vélo + course)", () => {
    for (const day of TFCL_TESTING_WEEK.days) {
      expect(html).toContain(day.title);
    }
    for (const day of CAP_TESTING_WEEK.days) {
      expect(html).toContain(day.title);
    }
  });
});

/**
 * Fix "premier test complet — structure jour par jour + version compacte"
 * (demande coach) : fusionne les 2 semaines officielles (16 jours au total)
 * en un seul calendrier continu de 15 jours, numéroté "Jour 1" à "Jour 15"
 * comme le Tri Test Day — mais SANS reproduire son défaut (tests enchaînés
 * sans récupération). Ces tests vérifient que :
 *  - rien n'est perdu (tous les jours des 2 semaines apparaissent),
 *  - l'ordre respecte l'espacement de récupération voulu,
 *  - le seul arbitrage fait (repos avant le test Course D5) est bien signalé.
 */
describe("buildTestingWeekDossierHTML — triathlon-compact (calendrier fusionné 15 jours)", () => {
  const html = buildTestingWeekDossierHTML("triathlon-compact", "Athlète Test");

  it("contient les 17 chapitres (15 jours, dont 2 jours splittés en a/b) numérotés Jour 1a à Jour 15b", () => {
    const labels = ["Jour 1a", "Jour 1b", "Jour 2", "Jour 3", "Jour 4", "Jour 5", "Jour 6", "Jour 7", "Jour 8", "Jour 9", "Jour 10", "Jour 11", "Jour 12", "Jour 13", "Jour 14", "Jour 15a", "Jour 15b"];
    for (const label of labels) {
      expect(html).toContain(label);
    }
  });

  it("ne perd aucun jour des 2 semaines officielles (chaque titre apparaît)", () => {
    for (const day of TFCL_TESTING_WEEK.days) {
      expect(html).toContain(day.title);
    }
    for (const day of CAP_TESTING_WEEK.days) {
      expect(html).toContain(day.title);
    }
  });

  it("respecte l'ordre : test glycolytique vélo avant test sprint course avant test MAP5 vélo avant test VMA course", () => {
    const idxBikeGlyco = html.indexOf("TEST GLYCOLYTIQUE");
    const idxRunSprint = html.indexOf("TEST SPRINT 15s");
    const idxBikeMap = html.indexOf("TEST MAP 5 min");
    const idxRunVma = html.indexOf("TEST VMA");
    expect(idxBikeGlyco).toBeGreaterThan(-1);
    expect(idxRunSprint).toBeGreaterThan(idxBikeGlyco);
    expect(idxBikeMap).toBeGreaterThan(idxRunSprint);
    expect(idxRunVma).toBeGreaterThan(idxBikeMap);
  });

  it("place le repos complet course (Jour 11) juste après le test FTP+TTE vélo (Jour 10), et le signale explicitement", () => {
    const idxJour10 = html.indexOf("Jour 10");
    const idxJour11 = html.indexOf("Jour 11");
    const idxRunSeuilTTE = html.indexOf("TEST ALLURE SEUIL");
    expect(idxJour10).toBeGreaterThan(-1);
    expect(idxJour11).toBeGreaterThan(idxJour10);
    expect(idxRunSeuilTTE).toBeGreaterThan(idxJour11);
    expect(html).toContain("Point de vigilance (calendrier compact)");
    expect(html).toContain("Ce repos complet suit directement le test Vélo D5");
  });

  it("mentionne la méthode de construction du calendrier compact dans les prérequis", () => {
    expect(html).toContain("Calendrier compact — comment il a été construit");
  });
});
