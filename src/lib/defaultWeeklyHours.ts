// Fallback weeklyHours quand le formulaire IA est vide.
// Basé sur les standards populationnels (miroir de REFERENCE_VOLUMES_FRONT / GapAmbitionPanel).
// Objectif : garantir que volumeCible + GapAmbitionPanel + taperOverride disposent d'une valeur cohérente.

const REFERENCE_VOLUMES: Record<string, Partial<Record<string, [number, number]>>> = {
  "5K":       { finish: [3, 5],  perf: [5, 7],  sub: [6, 9],   elite: [8, 12],  world_class: [10, 14] },
  "10K":      { finish: [3, 5],  perf: [5, 7],  sub: [7, 10],  elite: [9, 13],  world_class: [11, 15] },
  "Semi":     { finish: [4, 6],  perf: [6, 8],  sub: [8, 11],  elite: [10, 14], world_class: [12, 16] },
  "Marathon": { finish: [5, 7],  perf: [7, 9],  sub: [9, 12],  elite: [11, 15], world_class: [13, 17] },
  "Trail":    { finish: [5, 7],  perf: [7, 10], sub: [10, 13], elite: [13, 17], world_class: [15, 20] },
  "70.3":     { finish: [6, 9],  perf: [9, 12], sub: [12, 15], elite: [14, 18], world_class: [16, 22] },
  "IM":       { finish: [8, 11], perf: [11, 14],sub: [14, 18], elite: [16, 22], world_class: [20, 28] },
};

function normObjective(o: string | null | undefined): string | null {
  if (!o) return null;
  const s = o.trim().toLowerCase();
  if (/^5\s*k/.test(s)) return "5K";
  if (/^10\s*k/.test(s)) return "10K";
  if (/semi|half/.test(s)) return "Semi";
  if (/marathon/.test(s) && !/semi/.test(s)) return "Marathon";
  if (/trail|ultra/.test(s)) return "Trail";
  if (/70\.3|half\s*iron/.test(s)) return "70.3";
  if (/ironman|\bim\b/.test(s)) return "IM";
  return null;
}

function normAmbition(a: string | null | undefined): "finish" | "perf" | "sub" | "elite" | "world_class" {
  const s = (a || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("world") || s.includes("mond")) return "world_class";
  if (s.includes("elite") || s.includes("pro")) return "elite";
  if (s.includes("compet") || s.includes("sub")) return "sub";
  if (s.includes("age") || s.includes("perf") || s.includes("confirm")) return "perf";
  return "finish";
}

/**
 * Renvoie un weeklyHours par défaut (milieu de fourchette standard populationnel)
 * si aucune valeur explicite n'a été saisie par l'utilisateur.
 */
export function resolveEffectiveWeeklyHours(
  rawInput: string | number | null | undefined,
  objective: string | null | undefined,
  ambition: string | null | undefined,
): number | null {
  const parsed = typeof rawInput === "number" ? rawInput : parseFloat(String(rawInput ?? ""));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const objKey = normObjective(objective);
  const ambKey = normAmbition(ambition);
  const range = objKey ? REFERENCE_VOLUMES[objKey]?.[ambKey] : null;
  if (!range) {
    // eslint-disable-next-line no-console
    console.warn("📦 weeklyHours FALLBACK impossible (objectif/ambition non mappés)", { objective, ambition });
    return null;
  }
  const mid = (range[0] + range[1]) / 2;
  // eslint-disable-next-line no-console
  console.log(`📦 weeklyHours FALLBACK défaut : ${mid}h (référence ${objKey}/${ambKey} ${range[0]}-${range[1]}h)`);
  return mid;
}
