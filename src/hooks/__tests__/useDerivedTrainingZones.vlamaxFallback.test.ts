import { describe, it, expect } from "vitest";
import { resolveRunVlamaxInput } from "../useDerivedTrainingZones";
import { deriveTrainingZones } from "@/lib/zones/deriveTrainingZones";

/**
 * Audit scientifique P0 — F10 (AUDIT_SCIENTIFIQUE_P0.md) — CORRIGÉ.
 *
 * `vlamaxResolver.ts` documente explicitement : "Pas de fallback silencieux
 * vélo → run." `useDerivedTrainingZones.ts` l'enfreignait en utilisant
 * `snap.vlamax` (vélo) comme repli quand `snap.vlamax_run` est absent, pour
 * estimer l'allure seuil COURSE puis l'ancre FatMax COURSE — deux coureurs
 * identiques sauf pour leur VLamax vélo (donnée non pertinente pour la
 * course) obtenaient des zones course différentes.
 */
describe("resolveRunVlamaxInput — F10 (fallback vélo→course interdit)", () => {
  it("retourne vlamax_run quand il est renseigné (comportement correct, inchangé)", () => {
    expect(resolveRunVlamaxInput({ vlamax_run: 0.42, vlamax: 0.70 })).toBe(0.42);
  });

  it("ne doit PAS utiliser la VLamax vélo comme repli quand vlamax_run est absent", () => {
    const athleteA = resolveRunVlamaxInput({ vlamax_run: null, vlamax: 0.40 }); // VLamax vélo basse
    const athleteB = resolveRunVlamaxInput({ vlamax_run: null, vlamax: 0.90 }); // VLamax vélo haute
    // Les deux coureurs n'ont AUCUNE VLamax course mesurée/estimée — le
    // résultat doit être identique (null) pour les deux, indépendamment de
    // leur VLamax vélo respective.
    expect(athleteA).toBeNull();
    expect(athleteB).toBeNull();
  });

  it("retourne null quand ni vlamax_run ni vlamax ne sont disponibles", () => {
    expect(resolveRunVlamaxInput({ vlamax_run: null, vlamax: null })).toBeNull();
    expect(resolveRunVlamaxInput(null)).toBeNull();
  });
});

describe("deriveTrainingZones — comportement des zones course quand VLamax course est absente (F10)", () => {
  it("produit des zones dérivées (pas de crash, pas de repli grille standard) même sans VLamax course, dès qu'une allure seuil est connue", () => {
    const result = deriveTrainingZones({
      sport: "run",
      vlamax: null, // VLamax course absente — c'est le cas visé par F10
      paceThresholdSecPerKm: 240, // allure seuil mesurée (4min/km)
      vma: 18,
    });
    // L'allure seuil mesurée suffit à dériver des zones réelles — l'absence
    // de VLamax course ne doit PAS faire basculer sur la grille standard
    // générique, seulement sur l'ancre FatMax générique (85%) à l'intérieur
    // du calcul dérivé.
    expect(result.source).toBe("derived");
    expect(result.fallbackReason).toBeNull();
    expect(result.zones.length).toBeGreaterThan(0);
    // Aucune mention d'une modulation VLamax dans les ancrages affichés —
    // honnête sur ce qui a réellement servi au calcul.
    expect(result.anchors.some((a) => /VLamax/i.test(a))).toBe(false);
  });

  it("deux coureurs identiques sauf en VLamax vélo, tous deux sans VLamax course, obtiennent EXACTEMENT les mêmes zones", () => {
    const base = { sport: "run" as const, paceThresholdSecPerKm: 240, vma: 18 };
    const athleteA = deriveTrainingZones({ ...base, vlamax: resolveRunVlamaxInput({ vlamax_run: null, vlamax: 0.40 }) });
    const athleteB = deriveTrainingZones({ ...base, vlamax: resolveRunVlamaxInput({ vlamax_run: null, vlamax: 0.90 }) });
    expect(athleteA.zones).toEqual(athleteB.zones);
  });

  it("une VLamax course réellement renseignée continue de moduler l'ancre FatMax (non-régression)", () => {
    const result = deriveTrainingZones({
      sport: "run",
      vlamax: resolveRunVlamaxInput({ vlamax_run: 0.55, vlamax: 0.90 }),
      paceThresholdSecPerKm: 240,
      vma: 18,
    });
    expect(result.anchors.some((a) => /VLamax 0\.55/.test(a))).toBe(true);
  });
});
