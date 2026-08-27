import { describe, it, expect } from "vitest";
import { getContextTargets, buildTTEEnvelope } from "../scoreEnvelope";

/**
 * Batch 3 — audit méthodologique. getContextTargets("tte", ...) avait sa
 * propre table figée (IM 55-70, 703 48-60, Marathon 45-60...) divergente de
 * la cible canonique réellement utilisée pour le verdict TTE ailleurs dans
 * l'app (tteEffectif.ts) — la branche VLamax de la même fonction déléguait
 * déjà correctement à physiologicalTargets.ts, seule la branche TTE avait
 * été laissée en table locale. Conséquence concrète : verdict et note de
 * contexte pouvaient se contredire sur la même carte pour le même athlète.
 */

describe("getContextTargets('tte', ...) — délègue à la source unique", () => {
  it("IM (age_group implicite) : cible canonique 50 min, pas l'ancienne table (55-70)", () => {
    const targets = getContextTargets("tte", "IM");
    expect(targets?.ideal).toBe(50);
    expect(targets?.min).toBe(50);
  });

  it("703 (age_group implicite) : cible canonique 45 min, pas l'ancienne table (48-60)", () => {
    const targets = getContextTargets("tte", "703");
    expect(targets?.ideal).toBe(45);
  });

  it("respecte l'ambition passée explicitement (703 competitor = 50 min)", () => {
    const targets = getContextTargets("tte", "703", null, undefined, "competitor");
    expect(targets?.ideal).toBe(50);
  });
});

describe("buildTTEEnvelope — contextNote et verdict ne peuvent plus se contredire", () => {
  it("utilise le `target` externe (déjà résolu ambition/âge) pour les DEUX textes, pas un second calcul séparé", () => {
    // `target` externe = 55 (ex: résolu pour une ambition "competitor" en amont,
    // non transmise à getContextTargets ici) — doit piloter à la fois le
    // verdict ET la note de contexte, même si getContextTargets("tte", "IM")
    // résoudrait 50 (age_group) en interne par défaut.
    const envelope = buildTTEEnvelope(52, "MEASURED", 0.9, "IM", 55);

    // Le verdict (52 < 55) doit dire "insuffisant"
    expect(envelope.why.some(w => /insuffisant/i.test(w))).toBe(true);
    // La note de contexte doit citer le MÊME chiffre (55), pas 50
    expect(envelope.contextNote).toContain("55");
    expect(envelope.contextNote).not.toContain("50 min");
  });

  it("sans `target` externe, retombe sur la cible canonique interne (cohérent avec elle-même)", () => {
    const envelope = buildTTEEnvelope(52, "ESTIMATED", 0.7, "IM");
    // 52 >= 50 (cible canonique IM age_group) → verdict "satisfaisant"
    expect(envelope.why.some(w => /satisfaisant/i.test(w))).toBe(true);
    expect(envelope.contextNote).toContain("50");
  });
});
