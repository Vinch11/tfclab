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
 *
 * Fix "intégrer la natation" (demande coach) : ajoute le protocole TFCL Pool
 * Day™ (PROTOCOLS["pool-day"] de buildDiagnosticProtocolHTML.ts, réutilisé
 * tel quel pour ne jamais diverger de la fiche officielle) en Jour 2, juste
 * après l'activation D-1 — décale tous les jours suivants de +1 et porte le
 * calendrier à 16 jours / 18 chapitres.
 */
describe("buildTestingWeekDossierHTML — triathlon-compact (calendrier fusionné 16 jours)", () => {
  const html = buildTestingWeekDossierHTML("triathlon-compact", "Athlète Test");

  it("contient les 18 chapitres (16 jours, dont 2 jours splittés en a/b) numérotés Jour 1a à Jour 16b", () => {
    const labels = ["Jour 1a", "Jour 1b", "Jour 2", "Jour 3", "Jour 4", "Jour 5", "Jour 6", "Jour 7", "Jour 8", "Jour 9", "Jour 10", "Jour 11", "Jour 12", "Jour 13", "Jour 14", "Jour 15", "Jour 16a", "Jour 16b"];
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

  it("place le repos complet course (Jour 12) juste après le test FTP+TTE vélo (Jour 11), et le signale explicitement", () => {
    const idxJour11 = html.indexOf("Jour 11");
    const idxJour12 = html.indexOf("Jour 12");
    const idxRunSeuilTTE = html.indexOf("TEST ALLURE SEUIL");
    expect(idxJour11).toBeGreaterThan(-1);
    expect(idxJour12).toBeGreaterThan(idxJour11);
    expect(idxRunSeuilTTE).toBeGreaterThan(idxJour12);
    expect(html).toContain("Point de vigilance (calendrier compact)");
    expect(html).toContain("Ce repos complet suit directement le test Vélo D5");
  });

  it("mentionne la méthode de construction du calendrier compact dans les prérequis", () => {
    expect(html).toContain("Calendrier compact — comment il a été construit");
  });

  it("intègre le protocole natation TFCL Pool Day™ en Jour 2, avec son contenu officiel complet", () => {
    expect(html).toContain("Jour 2");
    expect(html).toContain("TFCL Pool Day™");
    // Contenu réel du protocole (PROTOCOLS["pool-day"]) — garantit l'absence de divergence.
    expect(html).toContain("Bloc 2 — Sprint (VLamax nage)");
    expect(html).toContain("Bloc 3 — CSS (200 + 400m)");
    expect(html).toContain("Bloc 4 — Endurance critique (1500m)");
    expect(html).toContain("CSS estimée");
    expect(html).toContain("VLamax nage estimée");
    const idxJour1b = html.indexOf("Jour 1b");
    const idxJour2 = html.indexOf("Jour 2");
    const idxJour3 = html.indexOf("Jour 3");
    expect(idxJour1b).toBeGreaterThan(-1);
    expect(idxJour2).toBeGreaterThan(idxJour1b);
    expect(idxJour3).toBeGreaterThan(idxJour2);
  });

  it("ajoute une carte prérequis et une ligne de synthèse dédiées à la natation", () => {
    expect(html).toContain("Profil natation");
  });
});
