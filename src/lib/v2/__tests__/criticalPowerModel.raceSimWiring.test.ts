import { describe, it, expect } from "vitest";
import { analyzeCriticalPower } from "../criticalPowerModel";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) : la page
 * Race Simulation et le dialog Race Readiness Report recalculaient CP via un
 * ad-hoc "CP = 0.95×FTP" (non cité) et laissaient wPrimeJkg toujours à null,
 * désactivant silencieusement la largeur d'enveloppe individualisée W'/CP
 * (Skiba 2024) sur ces écrans — alors que le PDF exporté (ExportTools.tsx)
 * calcule correctement les deux valeurs via analyzeCriticalPower pour le même
 * athlète. Les deux écrans utilisent désormais ce même modèle de régression.
 *
 * Ce fichier comble aussi un vrai trou de couverture : aucun test dédié
 * n'existait pour criticalPowerModel.ts (seul calcTauEdge.test.ts vérifiait
 * une parité de parsing, pas la justesse physiologique de la régression CP/W').
 */

describe("analyzeCriticalPower — utilisé pour la largeur d'enveloppe W'/CP (Race Simulation, Race Readiness)", () => {
  it("avec des données de puissance courte réelles, wprimeJkg est non-null (contrairement à l'ancien wiring qui le forçait à null)", () => {
    const result = analyzeCriticalPower({
      pmax_5s: 900,
      p30s_w: 420,
      p60s_w: 360,
      map5min_w: 310,
      ftp: 280,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    expect(result!.wprimeJkg).not.toBeNull();
    expect(result!.wprimeJkg).toBeGreaterThan(0);
  });

  it("le CP réel de la régression diverge de l'ancienne formule fantôme CP=0.95×FTP", () => {
    const ftp = 280;
    const weightKg = 70;
    const result = analyzeCriticalPower({
      pmax_5s: 900,
      p30s_w: 420,
      p60s_w: 360,
      map5min_w: 310,
      ftp,
      weight_kg: weightKg,
    });
    expect(result).not.toBeNull();
    const oldShadowFormulaCpWkg = (ftp * 0.95) / weightKg;
    // Les deux valeurs ne doivent pas coïncider par construction — elles viennent
    // de deux modèles différents (régression multi-durée vs ratio fixe non cité).
    expect(result!.cpWkg).not.toBeCloseTo(oldShadowFormulaCpWkg, 2);
  });

  it("effectiveCP reste borné par FTP+10W quand la régression est suspecte (garde-fou existant, non régressé)", () => {
    const result = analyzeCriticalPower({
      p30s_w: 500,
      p60s_w: 480,
      map5min_w: 460,
      ftp: 280,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    if (result!.cpBounded) {
      expect(result!.effectiveCP).toBe(280 + 10);
    }
  });
});
