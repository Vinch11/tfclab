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
