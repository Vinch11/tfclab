/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZONE MAPPING — Table figée Z1..Z7 (héritage) ↔ Z1..Z6 (modèle physiologique)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Source unique de correspondance, utilisée par l'UI, les exports PDF,
 * les plans IA et l'envoi Nolio. Les plans déjà enregistrés en Z1..Z7 restent
 * lisibles : ils sont convertis à l'affichage, jamais réécrits.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type LegacyZoneId = "Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5" | "Z6" | "Z7";
export type ZoneId6 = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

export const ZONE6_IDS: ZoneId6[] = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"];

export const ZONE6_LABELS: Record<ZoneId6, string> = {
  Z1: "Récupération",
  Z2: "Endurance / FatMax",
  Z3: "Tempo",
  Z4: "Seuil (MLSS)",
  Z5: "VO2max",
  Z6: "Neuromusculaire",
};

/** Condition physiologique de chaque zone (pédagogie staff-grade). */
export const ZONE6_CONDITIONS: Record<ZoneId6, string> = {
  Z1: "En dessous de LT1 — aucun stress métabolique",
  Z2: "De LT1 au haut de la fenêtre FatMax — oxydation lipidique maximale",
  Z3: "Entre FatMax et le seuil — lactate stable mais en hausse",
  Z4: "De l'allure marathon au MLSS (± 3 %) — regroupe allure marathon, allure semi et seuil (détail dans les repères ci-dessous)",
  Z5: "Au-dessus du MLSS jusqu'à vVO2max — sollicitation aérobie maximale",
  Z6: "Au-dessus de vVO2max — anaérobie alactique / neuromusculaire",
};

/** Héritage → modèle 6 zones. Z4a + Z4b + Z5 fusionnent dans le seuil Z4. */
const LEGACY_TO_6: Record<LegacyZoneId, ZoneId6> = {
  Z1: "Z1",
  Z2: "Z2",
  Z3: "Z3",
  Z4a: "Z4",
  Z4b: "Z4",
  Z5: "Z4",
  Z6: "Z5",
  Z7: "Z6",
};

/** Modèle 6 zones → zone héritée représentative (réversibilité contrôlée). */
const SIX_TO_LEGACY: Record<ZoneId6, LegacyZoneId> = {
  Z1: "Z1",
  Z2: "Z2",
  Z3: "Z3",
  Z4: "Z5",
  Z5: "Z6",
  Z6: "Z7",
};

export function legacyToZone6(id: LegacyZoneId): ZoneId6 {
  return LEGACY_TO_6[id];
}

export function zone6ToLegacy(id: ZoneId6): LegacyZoneId {
  return SIX_TO_LEGACY[id];
}

/** Toutes les zones héritées couvertes par une zone du modèle 6. */
export function legacyZonesFor(id: ZoneId6): LegacyZoneId[] {
  return (Object.keys(LEGACY_TO_6) as LegacyZoneId[]).filter((k) => LEGACY_TO_6[k] === id);
}

/**
 * Canonicalise un libellé texte ("z4a", "Z4B", "Z4", "zone 5") vers le modèle 6.
 * Retourne null si non reconnu.
 */
export function canonicalizeToZone6(raw: string): ZoneId6 | null {
  const s = raw.trim().toUpperCase().replace(/^ZONE\s*/, "Z").replace(/\s+/g, "");
  const m = s.match(/^Z(1|2|3|4A|4B|4|5|6|7)$/);
  if (!m) return null;
  const rest = m[1];
  if (rest === "4A") return LEGACY_TO_6.Z4a;
  if (rest === "4B") return LEGACY_TO_6.Z4b;
  return LEGACY_TO_6[("Z" + rest) as LegacyZoneId];
}
