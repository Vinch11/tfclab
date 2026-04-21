/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — Label FatMax dans le PDF Export
 * 
 * Vérifie que la section FatMax du rapport PDF Staff affiche :
 *   - "% Allure Seuil" / "% Seuil" quand l'athlète est en Running Focus Mode
 *   - "% FTP" en mode cycling, triathlon ou objectif non-running
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import { buildFatMaxTFCLHTML } from "../ExportTools";

// ── Payload minimal compatible avec buildFatMaxTFCLHTML ────────────────────────
function makePayload(opts: { goal: string; ftp?: number | null }) {
  return {
    athlete: {
      id: "test-athlete",
      name: "Test Athlete",
      goal: opts.goal,
    },
    effectiveRefs: {
      ftp: opts.ftp ?? 250,
    },
    fatmaxTFCL: {
      minPctFTP: 60,
      maxPctFTP: 70,
      centerPctFTP: 65,
      confidence: 0.75,
      confidenceLevel: "MEDIUM" as const,
      confidenceLabel: "Modérée",
      metabolicZone: "balanced" as const,
      zoneLabel: "Profil équilibré",
      objectifLabel: "Marathon",
      adjustments: [
        { id: "base", label: "Base VLamax", value: 65, direction: "neutral" as const, explanation: "Calcul Mader-Heck" },
        { id: "tte", label: "Ajustement TTE", value: 2, direction: "up" as const, explanation: "TTE élevé" },
      ],
    },
  } as any;
}

describe("buildFatMaxTFCLHTML — label de référence selon le sport", () => {
  describe("Running Focus Mode (objectifs running purs)", () => {
    const runningGoals = ["Marathon", "Semi", "10K", "5K", "Trail", "TrailUltra"];

    runningGoals.forEach((goal) => {
      it(`affiche "Seuil" et JAMAIS "% FTP" pour l'objectif "${goal}"`, () => {
        const html = buildFatMaxTFCLHTML(makePayload({ goal }));
        
        // Doit contenir le label running
        expect(html).toContain("% Seuil");
        
        // Ne doit JAMAIS contenir "% FTP" en mode running
        expect(html).not.toContain("% FTP");
        expect(html).not.toContain("%FTP");
      });
    });
  });

  describe("Mode cycling / triathlon (objectifs non-running)", () => {
    const nonRunningGoals = ["IM", "Ironman", "70.3", "Half"];

    nonRunningGoals.forEach((goal) => {
      it(`affiche "% FTP" et JAMAIS "% Seuil" pour l'objectif "${goal}"`, () => {
        const html = buildFatMaxTFCLHTML(makePayload({ goal }));
        
        // Doit contenir le label FTP classique
        expect(html).toContain("% FTP");
        
        // Ne doit pas afficher "Seuil" comme unité dans ce contexte
        expect(html).not.toContain("% Seuil");
      });
    });
  });

  describe("Cohérence du libellé centre", () => {
    it("affiche 'Centre : 65% Seuil' en mode Marathon", () => {
      const html = buildFatMaxTFCLHTML(makePayload({ goal: "Marathon" }));
      expect(html).toContain("65% Seuil");
    });

    it("affiche 'Centre : 65% FTP' en mode Ironman", () => {
      const html = buildFatMaxTFCLHTML(makePayload({ goal: "Ironman" }));
      expect(html).toContain("65% FTP");
    });
  });

  describe("Tableau des ajustements", () => {
    it("la ligne 'base' utilise '% Seuil' en mode running", () => {
      const html = buildFatMaxTFCLHTML(makePayload({ goal: "Semi" }));
      // L'ajustement base affiche "65% Seuil" (valeur + unité)
      expect(html).toContain("65% Seuil");
    });

    it("la ligne 'base' utilise '% FTP' en mode vélo", () => {
      const html = buildFatMaxTFCLHTML(makePayload({ goal: "70.3" }));
      expect(html).toContain("65% FTP");
    });
  });

  describe("Cas dégénéré (fatmaxTFCL absent)", () => {
    it("retourne un message d'avertissement sans crasher", () => {
      const payload = { athlete: { goal: "Marathon" }, effectiveRefs: { ftp: null }, fatmaxTFCL: null } as any;
      const html = buildFatMaxTFCLHTML(payload);
      expect(html).toContain("Données insuffisantes");
    });
  });
});
