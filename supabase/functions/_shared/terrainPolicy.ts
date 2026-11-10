/** Enforce the existing flat-terrain weekday contract using explicit card metadata, not athlete estimates. */
export function terrainReasons(card: { id: string; title: string; structure: string; when: string; tags: string[]; dPlusTargetM?: { min: number; max: number } },
  terrain?: string, day?: string): string[] {
  if (terrain !== "plat") return [];
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const dayName = normalize(day ?? "");
  const weekend = /samedi|dimanche|saturday|sunday/.test(dayName);
  if (weekend) return [];
  // Catalogue eligibility can retain explicit weekend expeditions; the final day is checked separately.
  if (!day && /week.end|samedi|dimanche|hors.ville/i.test(card.when + " " + card.id)) return [];
  const text = normalize(`${card.title} ${card.structure} ${card.tags.join(" ")}`);
  const urban = /tapis|escaliers|urbain|herisson/.test(text + " " + normalize(card.id));
  if (!urban && (/\bmontagne\b|\bmassif\b/.test(text) || (card.dPlusTargetM?.min ?? 0) > 150)) return ["terrain_weekday_unavailable"];
  return [];
}