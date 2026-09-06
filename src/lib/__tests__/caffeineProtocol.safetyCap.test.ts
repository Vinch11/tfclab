import { describe, it, expect } from "vitest";
import { computeCaffeineProtocol } from "../caffeineProtocol";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 4). La
 * boucle de relances intra-effort générait des doses tant qu'il restait du
 * temps, sans jamais regarder le cumul déjà atteint. Avec les valeurs PAR
 * DÉFAUT de l'app (sensibilité "unknown", habitualUser=true — jamais
 * renseignées ailleurs dans l'UI faute de champ dédié), un Ironman (600min)
 * générait 6 relances → 784mg / 70kg = 11.2 mg/kg, 25% AU-DESSUS du plafond
 * de sécurité de 9 mg/kg cité par le module lui-même (Guest 2021). Un Ultra
 * (720min) dépassait de 40%. Le seul garde-fou existant ajoutait une note
 * APRÈS coup sans jamais empêcher le dépassement.
 */

describe("computeCaffeineProtocol — le plafond de sécurité (9 mg/kg) n'est plus dépassable par construction", () => {
  it("Ironman (600min), profil par défaut (sensibilité inconnue, utilisateur habituel) : totalMgKg ne dépasse plus 9 mg/kg", () => {
    const result = computeCaffeineProtocol({ weightKg: 70, durationMin: 600 });
    expect(result.totalMgKg).toBeLessThanOrEqual(9);
    expect(result.safetyFlag).not.toBe("exceeded");
  });

  it("Ultra (720min), profil par défaut : totalMgKg ne dépasse plus 9 mg/kg", () => {
    const result = computeCaffeineProtocol({ weightKg: 70, durationMin: 720 });
    expect(result.totalMgKg).toBeLessThanOrEqual(9);
    expect(result.safetyFlag).not.toBe("exceeded");
  });

  it("métaboliseur rapide + utilisateur habituel (dose pré-effort la plus haute possible, 5.5 mg/kg) sur un ultra long : reste sous 9 mg/kg", () => {
    const result = computeCaffeineProtocol({ weightKg: 55, durationMin: 900, sensitivity: "fast", habitualUser: true });
    expect(result.totalMgKg).toBeLessThanOrEqual(9);
  });

  it("une note explique que les relances ont été arrêtées avant la fin de course quand le plafonnement s'applique", () => {
    const result = computeCaffeineProtocol({ weightKg: 70, durationMin: 600 });
    expect(result.notes.some((n) => n.toLowerCase().includes("plafond de sécurité"))).toBe(true);
  });

  it("non-régression : effort court (90-180min) ne déclenche jamais le plafonnement, comportement historique inchangé", () => {
    const result = computeCaffeineProtocol({ weightKg: 70, durationMin: 150 });
    expect(result.totalMgKg).toBeLessThan(6);
    expect(result.notes.some((n) => n.toLowerCase().includes("plafond de sécurité"))).toBe(false);
  });
});
