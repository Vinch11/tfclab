import { describe, it, expect } from "vitest";
import { analyzeCriticalPower } from "../criticalPowerModel";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) : le
 * garde-fou effectiveCP ne corrigeait qu'un CP trop élevé par rapport au
 * FTP (régression > FTP + 20W). Un CP qui atterrit très EN DESSOUS du FTP
 * (données de puissance courte non-maximales) n'était jamais corrigé — un
 * CP de ~166W avec un FTP réel de 280W passait tel quel dans
 * wbalPostProcessor/wbalLibraryRecalc, faisant passer presque tout
 * intervalle tempo/seuil pour "supra-CP". Le garde-fou est désormais
 * symétrique et un diagnostic critique "CP_FTP_GAP_LOW" est levé.
 *
 * Fixture reprise du fixture "implausibleInput" déjà utilisé dans
 * cpVlamaxContamination.test.ts (ftp=280, p30s=1500, p60s=1200, map5min=330).
 */

describe("analyzeCriticalPower — garde-fou effectiveCP symétrique (CP << FTP)", () => {
  it("un CP très en dessous du FTP est borné à FTP+10W, pas laissé tel quel", () => {
    const result = analyzeCriticalPower({
      ftp: 280,
      p30s_w: 1500,
      p60s_w: 1200,
      map5min_w: 330,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    // La régression brute doit être nettement sous le FTP (reproduit la trace de l'audit).
    expect(result!.cp).toBeLessThan(280 - 25);
    expect(result!.cpBounded).toBe(true);
    expect(result!.effectiveCP).toBe(280 + 10);
  });

  it("un CP très en dessous du FTP lève un diagnostic critique CP_FTP_GAP_LOW → dataQuality implausible", () => {
    const result = analyzeCriticalPower({
      ftp: 280,
      p30s_w: 1500,
      p60s_w: 1200,
      map5min_w: 330,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    expect(result!.diagnostics.some((d) => d.code === "CP_FTP_GAP_LOW" && d.severity === "critical")).toBe(true);
    expect(result!.dataQuality).toBe("implausible");
  });

  it("un CP cohérent avec le FTP (dans la fenêtre 5-15W) n'est pas borné (comportement non régressé)", () => {
    const result = analyzeCriticalPower({
      ftp: 280,
      p30s_w: 420,
      p60s_w: 360,
      map5min_w: 310,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    expect(result!.cpBounded).toBe(false);
    expect(result!.effectiveCP).toBe(result!.cp);
  });

  it("le garde-fou haut (CP >> FTP) reste inchangé (non régressé)", () => {
    const result = analyzeCriticalPower({
      ftp: 300,
      p30s_w: 400,
      p60s_w: 390,
      map5min_w: 380,
      weight_kg: 70,
    });
    expect(result).not.toBeNull();
    expect(result!.cp).toBeGreaterThan(300 + 25);
    expect(result!.cpBounded).toBe(true);
    expect(result!.effectiveCP).toBe(300 + 10);
  });
});
