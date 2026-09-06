import { describe, it, expect } from "vitest";
import { calibrateVLamaxFromRaceRecords, computeVLamaxRunV2Enhanced } from "../vlamaxRunV2Enhanced";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) :
 * calibrateVLamaxFromRaceRecords citait 3 papiers (Ward-Smith 1999, Weyand
 * 2010, Bundle 2003) qui ne contiennent ni cette formule ni ces seuils
 * numériques — biomécanique/énergétique du sprint, aucune régression
 * VLamax-depuis-chrono. Le Score G (M2) affichait aussi une fausse précision
 * ("synthetic cohort N=40, RMSE 0.024" — "synthetic" signifiant que ces
 * données n'ont jamais été des athlètes réels). Aucune des deux méthodes
 * n'est calibrée sur cohorte réelle (contrairement au MLSS α=1.98, N=44
 * profils labo) : leur poids/confiance en fusion sont désormais réduits en
 * conséquence, et les fausses citations retirées.
 */

describe("calibrateVLamaxFromRaceRecords — ne cite plus de littérature fabriquée", () => {
  it("les sources ne contiennent plus les noms d'auteurs incorrects", () => {
    const result = calibrateVLamaxFromRaceRecords({ vma: 18, pace400m_sec: 62 });
    expect(result.sources).not.toContain("Ward-Smith 1999");
    expect(result.sources).not.toContain("Weyand 2010");
    expect(result.sources).not.toContain("Bundle 2003");
  });

  it("le calcul lui-même reste inchangé (seule l'attribution est corrigée)", () => {
    const result = calibrateVLamaxFromRaceRecords({ vma: 18, pace400m_sec: 62 });
    expect(result.method).toBe("400m_only");
    expect(result.vlamax).not.toBeNull();
  });
});

describe("computeVLamaxRunV2Enhanced — poids des Records (M3) réduit en fusion (méthode non calibrée)", () => {
  it("triple validation : M3 pèse 15% (pas 25%) — la valeur finale est plus proche de la moyenne Pace/ScoreG", () => {
    const withoutRecords = computeVLamaxRunV2Enhanced({
      runPowerThreshold: 300,
      runPower5s: 550,
      runPower30s: 420,
      vma: 18,
      paceThresholdSecPerKm: 220,
    });
    const withRecords = computeVLamaxRunV2Enhanced({
      runPowerThreshold: 300,
      runPower5s: 550,
      runPower30s: 420,
      vma: 18,
      paceThresholdSecPerKm: 220,
      raceRecords: { vma: 18, pace400m_sec: 58 }, // sur-vitesse forte → VLamax records élevée
    });
    expect(withRecords.formula).toBe("tfcl_run_v2_enhanced");
    // Le poids réduit (15% au lieu de 25%) doit tirer la valeur finale
    // MOINS loin vers la composante records que l'ancienne pondération ne
    // l'aurait fait — on vérifie juste que Records reste minoritaire.
    const pullTowardRecords = Math.abs(withRecords.value - withoutRecords.value);
    expect(pullTowardRecords).toBeLessThan(0.15);
  });

  it("records seuls : confiance abaissée à 0.35 (dernier recours non calibré, pas 0.50)", () => {
    const result = computeVLamaxRunV2Enhanced({
      runPowerThreshold: 0,
      vma: 18, // requis pour activer M3, mais pas paceThresholdSecPerKm → M1 reste null
      raceRecords: { vma: 18, pace400m_sec: 62 },
    });
    expect(result.formula).toBe("tfcl_run_v1_fallback");
    expect(result.confidence).toBeCloseTo(0.35, 2);
  });
});
