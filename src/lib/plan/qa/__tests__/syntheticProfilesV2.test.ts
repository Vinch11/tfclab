import { describe, it, expect } from "vitest";
import { QA_PROFILES } from "../syntheticProfiles";
import { QA_PROFILES_V2 } from "../syntheticProfilesV2";
import { checkB4For } from "../checks";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";

/**
 * Priorité 2 (Performance Validation Lab V1) — vérifie les propriétés
 * revendiquées par la matrice de la batterie de 20 scénarios (docstring de
 * syntheticProfilesV2.ts) : indépendance des dimensions, IDs uniques, et
 * absence de crash dans checkB4For (le garde-fou de compilation
 * `assertNeverProfileId` ne fonctionne PAS réellement sur ce dépôt —
 * `tsconfig.app.json` a `strict: false` — donc seul un test d'exécution
 * peut confirmer que les nouveaux profils sont bien câblés).
 */
function emptyMergedPlan(): MergedPlan {
  return { title: "T", phases: [], totalWeeks: 1, weeks: [{ weekNumber: 1, theme: "T", phase: "base", sessions: [] }] };
}

describe("QA_PROFILES_V2 — indépendance des 5 dimensions (matrice des 20 scénarios)", () => {
  it("20 scénarios numérotés + 3 scénarios ciblés = 23 profils V2", () => {
    const numbered = QA_PROFILES_V2.filter((p) => /^V2-\d\d$/.test(p.id));
    const extras = QA_PROFILES_V2.filter((p) => p.id.startsWith("V2-EXTRA-"));
    expect(numbered).toHaveLength(20);
    expect(extras).toHaveLength(3);
  });

  it("chaque archétype physiologique apparaît exactement 4× parmi les 20 scénarios numérotés", () => {
    const numbered = QA_PROFILES_V2.filter((p) => /^V2-\d\d$/.test(p.id));
    const counts = new Map<string, number>();
    for (const p of numbered) {
      const k = p.physiologyArchetype!;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    for (const count of counts.values()) expect(count).toBe(4);
  });

  it("chaque niveau de qualité de données apparaît exactement 5× parmi les 20 scénarios numérotés", () => {
    const numbered = QA_PROFILES_V2.filter((p) => /^V2-\d\d$/.test(p.id));
    const counts = new Map<string, number>();
    for (const p of numbered) {
      const k = p.dataQuality!;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const count of counts.values()) expect(count).toBe(5);
  });

  it("chaque profil de contraintes apparaît exactement 5× parmi les 20 scénarios numérotés", () => {
    const numbered = QA_PROFILES_V2.filter((p) => /^V2-\d\d$/.test(p.id));
    const counts = new Map<string, number>();
    for (const p of numbered) {
      const k = p.constraintsProfile!;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    for (const count of counts.values()) expect(count).toBe(5);
  });

  it("indépendance : aucun archétype physio n'est figé avec un seul niveau d'ambition", () => {
    const numbered = QA_PROFILES_V2.filter((p) => /^V2-\d\d$/.test(p.id));
    const byArchetype = new Map<string, Set<string>>();
    for (const p of numbered) {
      const key = p.physiologyArchetype!;
      const set = byArchetype.get(key) ?? new Set<string>();
      set.add(p.planConfig.ambition ?? "?");
      byArchetype.set(key, set);
    }
    for (const [archetype, ambitions] of byArchetype) {
      expect(ambitions.size, `${archetype} ne devrait pas être figé à une seule ambition`).toBeGreaterThan(1);
    }
  });

  it("tous les IDs de QA_PROFILES (12 + 20 + 3) sont uniques", () => {
    const ids = QA_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(12 + 20 + 3);
  });

  it("checkB4For ne lève jamais pour un profil V2 (câblage réel vérifié à l'exécution)", () => {
    const plan = emptyMergedPlan();
    for (const p of QA_PROFILES_V2) {
      expect(() => checkB4For(p.id, plan), `checkB4For(${p.id}) ne doit pas lever`).not.toThrow();
    }
  });

  it("le scénario cyclisme pur retourne 'info' (pas un faux pass/fail) — probe de gap connu", () => {
    const plan = emptyMergedPlan();
    const r = checkB4For("V2-EXTRA-CYCLING", plan);
    expect(r.level).toBe("info");
  });
});
