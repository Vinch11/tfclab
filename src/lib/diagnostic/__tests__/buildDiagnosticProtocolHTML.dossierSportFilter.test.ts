import { describe, it, expect } from "vitest";
import { buildFullDiagnosticDossierHTML } from "../buildDiagnosticProtocolHTML";

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
