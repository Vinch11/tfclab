import { describe, it, expect } from "vitest";
import { buildFullDiagnosticDossierHTML, buildDiagnosticProtocolHTML } from "../buildDiagnosticProtocolHTML";
import { EMBEDDED_PRINT_ONCLICK } from "@/lib/openPrintableHTML";

/**
 * Bug réel corrigé : le dossier complet incluait systématiquement la fiche
 * "TFCL Track Day™" (course) ET "TFCL Bike Day™" (vélo) quel que soit le
 * sport sélectionné par le coach — un cycliste pur se retrouvait avec une
 * fiche de test de course à pied, et inversement.
 */
describe("buildFullDiagnosticDossierHTML — sélection des fiches par sport", () => {
  it("cyclisme : inclut uniquement la fiche vélo", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "cyclisme");
    expect(html).toContain("TFCL Bike Day™");
    expect(html).not.toContain("TFCL Track Day™");
    expect(html).not.toContain("TFCL Pool Day™");
  });

  it("course à pied : inclut uniquement la fiche piste", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "course");
    expect(html).toContain("TFCL Track Day™");
    expect(html).not.toContain("TFCL Bike Day™");
    expect(html).not.toContain("TFCL Pool Day™");
  });

  it("triathlon : inclut les 3 fiches (piste, vélo, piscine)", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "triathlon");
    expect(html).toContain("TFCL Track Day™");
    expect(html).toContain("TFCL Bike Day™");
    expect(html).toContain("TFCL Pool Day™");
  });
});

describe("buildFullDiagnosticDossierHTML — synthèse finale filtrée par sport", () => {
  it("cyclisme : pas de VMA/CSS/VLamax course à remplir", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "cyclisme");
    expect(html).toContain("FTP</td>");
    expect(html).not.toContain(">VMA<");
    expect(html).not.toContain(">CSS<");
    expect(html).not.toContain("VLamax course");
  });

  it("course à pied : pas de FTP/CSS/VLamax vélo à remplir", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "course");
    expect(html).toContain(">VMA<");
    expect(html).not.toContain(">FTP<");
    expect(html).not.toContain(">CSS<");
    expect(html).not.toContain("VLamax vélo");
  });

  it("triathlon : toutes les métriques sont présentes, y compris CSS", () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "triathlon");
    expect(html).toContain(">FTP<");
    expect(html).toContain(">VMA<");
    expect(html).toContain(">CSS<");
  });
});

/**
 * Bug réel (retour coach, persistant après avoir corrigé le bouton générique
 * de la surcouche iOS) : le bouton "🖨️ Imprimer / PDF" embarqué DANS ces
 * documents générés appelait encore `window.print()` en dur — qui, une fois
 * ce HTML injecté dans l'iframe de la surcouche iOS, imprime la fenêtre de
 * l'IFRAME (transformée pour l'aperçu écran) plutôt que la page hôte,
 * reproduisant la pagination délirante déjà vue une fois (457 pages).
 */
describe("buildDiagnosticProtocolHTML / buildFullDiagnosticDossierHTML — bouton Imprimer embarqué", () => {
  it('buildDiagnosticProtocolHTML : le bouton embarqué utilise EMBEDDED_PRINT_ONCLICK, pas window.print() en dur', () => {
    const html = buildDiagnosticProtocolHTML("bike-day", "Athlète Test");
    expect(html).toContain(EMBEDDED_PRINT_ONCLICK);
    expect(html).not.toContain('onclick="window.print()"');
  });

  it('buildFullDiagnosticDossierHTML : le bouton embarqué utilise EMBEDDED_PRINT_ONCLICK, pas window.print() en dur', () => {
    const html = buildFullDiagnosticDossierHTML("Athlète Test", "triathlon");
    expect(html).toContain(EMBEDDED_PRINT_ONCLICK);
    expect(html).not.toContain('onclick="window.print()"');
  });
});

/**
 * Bug réel (retour coach, capture d'écran) : le "Bloc 1 — Neuromusculaire" de
 * TFCL Track Day™ listait, dans le tableau "mesures à reporter", des mesures
 * (Sprint 100m, Sprint 200m, CMJ hauteur, P1s estimée, 5 bonds horizontaux)
 * qu'aucune étape des `instructions` ne produit — le protocole décrit
 * uniquement un échauffement + sprint 30m ×2. Contrairement à TFCL Bike
 * Day™ (Sprint 10s → Pmax/P moy/FC max, exactement ce que décrivent les
 * instructions), ce bloc listait des mesures orphelines. Elles sont
 * déplacées en mesures optionnelles (alternatives.extended), jamais dans le
 * tableau obligatoire.
 */
describe("buildDiagnosticProtocolHTML (track-day, Bloc 1) — le tableau de mesures ne liste que ce que le protocole décrit", () => {
  const html = buildDiagnosticProtocolHTML("track-day", "Athlète Test");

  it("ne liste plus Sprint 100m/200m, CMJ, P1s ou 5 bonds horizontaux comme LIGNES du tableau de mesures obligatoires", () => {
    expect(html).not.toContain("<td>Sprint 100m</td>");
    expect(html).not.toContain("<td>Sprint 200m</td>");
    expect(html).not.toContain("<td>CMJ hauteur (My Jump 2)</td>");
    expect(html).not.toContain("<td>P1s estimée</td>");
    expect(html).not.toContain("<td>5 bonds horizontaux</td>");
  });

  it("garde uniquement les mesures produites par les instructions (Sprint 30m ×2 + FC max) comme lignes du tableau", () => {
    expect(html).toContain("<td>Sprint 30m (essai 1)</td>");
    expect(html).toContain("<td>Sprint 30m (essai 2)</td>");
    expect(html).toContain("<td>FC max atteinte</td>");
  });

  it("propose les mesures retirées comme optionnelles dans les alternatives, pas comme obligatoires", () => {
    expect(html).toContain("Mesures additionnelles");
    expect(html).toContain("My Jump 2");
  });
});
