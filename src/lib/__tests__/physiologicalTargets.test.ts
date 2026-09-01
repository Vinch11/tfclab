import { describe, it, expect } from "vitest";
import { UNIFIED_TARGETS, AMBITION_TARGETS, getVLamaxRange } from "../physiologicalTargets";

/**
 * Audit fix — UNIFIED_TARGETS (consommé directement par AcademyPage) dérivait
 * sa VLamax de AMBITION_TARGETS, une ex-table remplacée depuis par la source
 * unique getVLamaxRange (délègue à v2/vlamaxTargets.ts). Écart mesuré jusqu'à
 * 54% avec la cible réelle affichée ailleurs (Dashboard) pour le même
 * objectif — ex. IM/age_group : ancien optimal 0.40 vs cible canonique 0.26.
 */

const TRIATHLON_KEYS = new Set(["IM", "703", "Sprint", "Olympic"]);

describe("UNIFIED_TARGETS.vlamax — aligné sur la source unique getVLamaxRange", () => {
  it("performance et intermediaire portent tous deux la cible canonique, identique aux deux paliers (VLamax n'est pas ambition-dépendante)", () => {
    for (const [key, levels] of Object.entries(UNIFIED_TARGETS)) {
      const sport = TRIATHLON_KEYS.has(key) ? "bike" : "run";
      const canonical = getVLamaxRange(key, undefined, sport);
      expect(levels.performance.vlamax, key).toEqual(canonical);
      expect(levels.intermediaire.vlamax, key).toEqual(canonical);
    }
  });

  it("IM : l'écart avec l'ancienne ex-table AMBITION_TARGETS.IM.age_group (0.40) confirme le fix (cible canonique bike attendue 0.26)", () => {
    const canonical = getVLamaxRange("IM", undefined, "bike");
    expect(canonical.optimal).toBeCloseTo(0.26, 2);
    // L'écart avec l'ancienne valeur affichée (0.40) doit rester significatif —
    // sinon ce test ne couvre plus la régression.
    const oldStaleOptimal = AMBITION_TARGETS.IM.age_group.vlamax.optimal;
    expect(oldStaleOptimal).toBeCloseTo(0.40, 2);
    const gapPct = Math.abs(oldStaleOptimal - canonical.optimal) / canonical.optimal;
    expect(gapPct).toBeGreaterThan(0.5); // ≈54%
  });

  it("ne mute pas AMBITION_TARGETS (les ex-tables restent lisibles ailleurs, ex. TTE/FTP par ambition)", () => {
    // Si la construction de UNIFIED_TARGETS avait muté l'objet partagé au lieu
    // d'en faire une copie, AMBITION_TARGETS.IM.age_group.vlamax porterait
    // désormais la valeur canonique — ce test l'empêche de régresser en silence.
    expect(AMBITION_TARGETS.IM.age_group.vlamax).toEqual({ min: 0.30, max: 0.50, optimal: 0.40 });
    expect(AMBITION_TARGETS.IM.age_group.tte_min).toBe(50);
  });

  it("les autres champs (tte_min, ftp_kg_min, nutrition) restent ceux d'AMBITION_TARGETS — seule la VLamax est remplacée", () => {
    for (const [key, levels] of Object.entries(UNIFIED_TARGETS)) {
      const src = AMBITION_TARGETS[key];
      expect(levels.performance.tte_min, key).toBe(src.elite.tte_min);
      expect(levels.performance.ftp_kg_min, key).toBe(src.elite.ftp_kg_min);
      expect(levels.intermediaire.tte_min, key).toBe(src.age_group.tte_min);
      expect(levels.intermediaire.ftp_kg_min, key).toBe(src.age_group.ftp_kg_min);
    }
  });
});

/**
 * Audit "cohérence cross-engine" — même pattern que le bug risque blessure
 * (PR #70) et nutrition (PR #79), une 3e fois : `getVLamaxRange` retombait
 * TOUJOURS sur la discipline 'bike' quand `sport` était omis — y compris
 * pour un Marathon/Semi/10K/5K/Trail, où la discipline n'est pourtant pas
 * ambiguë (pas de vélo dans la course). Une dizaine d'appelants à travers
 * l'app (ExportTools.tsx, TemplatesPage.tsx wahooContext, workoutRecommen-
 * dationEngine.ts, wahooSuggestionEngine.ts...) omettent `sport` pour ces
 * objectifs et recevaient donc une cible VLamax vélo (~0.06 mmol/L/s plus
 * basse) au lieu de la cible course — alertes "VLamax trop haute" faussées,
 * chiffre divergent entre pages pour le même athlète (même rapport PDF que
 * le bug nutrition dans certains cas).
 */
describe("getVLamaxRange — discipline par défaut quand `sport` est omis", () => {
  it("un objectif course pure (Marathon/Semi/10K/5K/Trail) reçoit la cible RUN par défaut, pas vélo", () => {
    for (const objectif of ["Marathon", "Semi-Marathon", "10K", "5K", "Trail"]) {
      const withoutSport = getVLamaxRange(objectif);
      const explicitRun = getVLamaxRange(objectif, undefined, "run");
      const explicitBike = getVLamaxRange(objectif, undefined, "bike");
      expect(withoutSport, objectif).toEqual(explicitRun);
      expect(withoutSport, objectif).not.toEqual(explicitBike);
    }
  });

  it("un objectif triathlon ambigu (IM/70.3/Sprint/Olympique) reste sur le défaut historique vélo quand `sport` est omis (comportement inchangé)", () => {
    for (const objectif of ["IM", "703", "Sprint", "Olympic"]) {
      const withoutSport = getVLamaxRange(objectif);
      const explicitBike = getVLamaxRange(objectif, undefined, "bike");
      expect(withoutSport, objectif).toEqual(explicitBike);
    }
  });

  it("un `sport` explicite prime toujours sur la détection automatique, y compris pour un objectif course pure", () => {
    // Un appelant qui demande explicitement 'bike' pour un marathonien
    // (ex. carte FTP/puissance) doit continuer à recevoir la cible vélo.
    const explicitBikeForRunner = getVLamaxRange("Marathon", undefined, "bike");
    const runDefault = getVLamaxRange("Marathon");
    expect(explicitBikeForRunner).not.toEqual(runDefault);
  });
});
