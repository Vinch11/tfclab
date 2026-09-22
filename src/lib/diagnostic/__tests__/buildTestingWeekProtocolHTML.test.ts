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
 * (demande coach) : fusionne les 2 semaines officielles en un seul
 * calendrier continu, numéroté "Jour 1" à "Jour N" comme le Tri Test Day —
 * mais SANS reproduire son défaut (tests enchaînés sans récupération). Ces
 * tests vérifient que :
 *  - rien n'est perdu (tous les jours des 2 semaines apparaissent),
 *  - l'ordre respecte l'espacement de récupération voulu,
 *  - le seul arbitrage fait est bien signalé.
 *
 * Fix "intégrer la natation" (demande coach) : ajoute le protocole TFCL Pool
 * Day™ (PROTOCOLS["pool-day"] de buildDiagnosticProtocolHTML.ts, réutilisé
 * tel quel pour ne jamais diverger de la fiche officielle) en Jour 2, juste
 * après l'activation D-1.
 *
 * Fix "FTP et TTE mélangés" (demande coach) : la semaine vélo TFCL passe de
 * 8 à 9 jours (D5 FTP dédié, D6 Z2 tampon, D7 TTE dédié testé au FTP de D5,
 * D8 OFF+cohérence) — porte le calendrier compact à 17 jours / 19 chapitres,
 * et déplace le point de vigilance (repos/séance à pacing contrôlé après
 * l'effort le plus exigeant) du jour suivant le vieux D5 combiné vers le
 * jour suivant le nouveau D7 (TTE), désormais l'effort le plus exigeant.
 */
describe("buildTestingWeekDossierHTML — triathlon-compact (calendrier fusionné 17 jours)", () => {
  const html = buildTestingWeekDossierHTML("triathlon-compact", "Athlète Test");

  it("contient les 19 chapitres (17 jours, dont 2 jours splittés en a/b) numérotés Jour 1a à Jour 17b", () => {
    const labels = [
      "Jour 1a", "Jour 1b", "Jour 2", "Jour 3", "Jour 4", "Jour 5", "Jour 6", "Jour 7",
      "Jour 8", "Jour 9", "Jour 10", "Jour 11", "Jour 12", "Jour 13", "Jour 14", "Jour 15",
      "Jour 16", "Jour 17a", "Jour 17b",
    ];
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

  it("teste le FTP vélo (Jour 11) avant la sortie Z2 tampon (Jour 14) avant le TTE vélo (Jour 15)", () => {
    const idxFtp = html.indexOf("TEST FTP (20 min)");
    const idxZ2 = html.indexOf("Z2 Validation");
    const idxTte = html.indexOf("TEST TTE (au FTP validé D5)");
    expect(idxFtp).toBeGreaterThan(-1);
    expect(idxZ2).toBeGreaterThan(idxFtp);
    expect(idxTte).toBeGreaterThan(idxZ2);
  });

  it("place la séance course à pacing contrôlé (Jour 16) juste après le test TTE vélo (Jour 15), et le signale explicitement", () => {
    const idxJour15 = html.indexOf("Jour 15");
    const idxJour16 = html.indexOf("Jour 16");
    const idxRunEconomy = html.indexOf("Endurance Validation");
    expect(idxJour15).toBeGreaterThan(-1);
    expect(idxJour16).toBeGreaterThan(idxJour15);
    expect(idxRunEconomy).toBeGreaterThan(idxJour16);
    expect(html).toContain("Point de vigilance (calendrier compact)");
    expect(html).toContain("suit directement le test TTE vélo");
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
