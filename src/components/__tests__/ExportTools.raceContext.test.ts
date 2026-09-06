import { describe, it, expect } from "vitest";
import { computeExportRaceContext } from "../ExportTools";

/**
 * Bug réel corrigé (audit "dashboard/plan/export", passe 6). Le contexte
 * envoyé au moteur de stratégie Lorang dans l'export avait `daysToRace` codé
 * en dur à `null`, ce qui se résout en interne à "999 jours avant la course"
 * (lorangStrategyEngine.ts) — désactivant de fait le garde-fou qui interdit
 * de recommander le "Train Low" (jeûne glycogénique) dans les 14 jours avant
 * course, et empêchant `isRaceWeek` de bloquer VO2max/seuil/Z2 volume pendant
 * la semaine de course elle-même.
 */

const NOW = new Date("2026-09-06T12:00:00Z");

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 86400000).toISOString();
}

describe("computeExportRaceContext — daysToRace/isRaceWeek dérivés de la vraie prochaine course", () => {
  it("aucune course future : daysToRace=null, isRaceWeek=false (comportement historique conservé)", () => {
    expect(computeExportRaceContext([], NOW)).toEqual({ daysToRace: null, isRaceWeek: false });
    expect(computeExportRaceContext(null, NOW)).toEqual({ daysToRace: null, isRaceWeek: false });
  });

  it("course dans 3 jours : daysToRace=3, isRaceWeek=true — le garde-fou Train Low doit se déclencher", () => {
    const result = computeExportRaceContext([{ race_date: daysFromNow(3) }], NOW);
    expect(result.daysToRace).toBe(3);
    expect(result.isRaceWeek).toBe(true);
  });

  it("course dans 10 jours (hors semaine de course, mais dans la fenêtre Train Low <14j) : isRaceWeek=false", () => {
    const result = computeExportRaceContext([{ race_date: daysFromNow(10) }], NOW);
    expect(result.daysToRace).toBe(10);
    expect(result.isRaceWeek).toBe(false);
  });

  it("course dans 60 jours (loin, Train Low autorisé) : daysToRace=60, isRaceWeek=false", () => {
    const result = computeExportRaceContext([{ race_date: daysFromNow(60) }], NOW);
    expect(result.daysToRace).toBe(60);
    expect(result.isRaceWeek).toBe(false);
  });

  it("plusieurs courses : prend la plus proche dans le futur, ignore les courses passées", () => {
    const result = computeExportRaceContext(
      [
        { race_date: daysFromNow(-30) }, // passée
        { race_date: daysFromNow(45) },
        { race_date: daysFromNow(5) }, // la plus proche future
      ],
      NOW
    );
    expect(result.daysToRace).toBe(5);
    expect(result.isRaceWeek).toBe(true);
  });

  it("course exactement à J-7 : isRaceWeek=true (borne incluse)", () => {
    const result = computeExportRaceContext([{ race_date: daysFromNow(7) }], NOW);
    expect(result.isRaceWeek).toBe(true);
  });
});
