/**
 * Déduit `sport_main` depuis l'objectif athlète.
 * Évite que des coureurs purs aient sport_main='bike' (défaut DB).
 */
export function deduceSportMainFromGoal(goal?: string | null): "run" | "bike" | "tri" | null {
  if (!goal) return null;
  const g = goal.toLowerCase();
  if (
    g === "semi" ||
    g === "marathon" ||
    g === "starttorun" ||
    g === "5k" ||
    g === "10k" ||
    g.startsWith("trail") ||
    g.includes("ultra")
  ) {
    return "run";
  }
  if (g === "im" || g === "703") return "tri";
  return "bike";
}

const RUN_GOALS = new Set(["semi", "marathon", "starttorun", "5k", "10k"]);
const TRI_GOALS = new Set(["im", "703"]);

/**
 * Vérifie si sport_main est incohérent avec l'objectif.
 * Retourne null si cohérent, sinon { expected, actual }.
 */
export function checkSportGoalCoherence(
  sportMain?: string | null,
  goal?: string | null
): { expected: "run" | "bike" | "tri"; actual: string } | null {
  if (!goal || !sportMain) return null;
  const expected = deduceSportMainFromGoal(goal);
  if (!expected) return null;
  const actual = sportMain.toLowerCase();
  // Normalise "velo" → "bike", "triathlon" → "tri", "cap"/"running" → "run"
  const actualNorm =
    actual === "velo" ? "bike" :
    actual === "triathlon" ? "tri" :
    (actual === "cap" || actual === "running") ? "run" :
    actual;
  if (expected === actualNorm) return null;
  return { expected, actual: sportMain };
}

// =====================================================================
// CENTRAL SPORT RESOLVER — unique source of truth pour Compass /
// Dashboard badges / StaffDashboard / Export. Évite les divergences
// (ex: ExportTools tombait sur "bike" si sport_main null pour un Trail).
// =====================================================================

export type CanonicalSport = "run" | "bike" | "tri";
export type CompassSportFocus = "run" | "bike" | "triathlon";
export type BadgeSport = "cap" | "bike" | "tri";

interface SnapshotLike {
  sport_main?: string | null;
}
interface AthleteLike {
  goal?: string | null;
  objectif?: string | null;
}

/**
 * Normalise n'importe quelle valeur de sport_main vers la forme canonique.
 */
export function normalizeSportMain(raw?: string | null): CanonicalSport | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "run" || s === "cap" || s === "running") return "run";
  if (s === "bike" || s === "velo" || s === "vélo" || s === "cyclisme" || s === "cycling") return "bike";
  if (s === "tri" || s === "triathlon") return "tri";
  return null;
}

/**
 * Résout le sport principal en combinant snapshot + objectif athlète.
 * Priorité : snapshot.sport_main explicite → déduction depuis goal → null.
 * Émet un warn console en dev si la valeur explicite est incohérente avec le goal.
 */
export function resolveSportMain(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null
): CanonicalSport | null {
  const explicit = normalizeSportMain(snapshot?.sport_main);
  const goal = athlete?.goal ?? athlete?.objectif ?? null;
  const deduced = deduceSportMainFromGoal(goal);

  if (explicit) {
    if (deduced && deduced !== explicit && typeof console !== "undefined") {
      // Cas légitime (ex: athlète triathlète avec plan running pur) — info, pas warning.
      // eslint-disable-next-line no-console
      console.log(
        `[sport_main] snapshot goal=${goal}, plan sport=${explicit} → utilisation ${explicit}`
      );
    }
    return explicit;
  }
  return deduced;
}

/**
 * Convertit le sport canonique vers le format attendu par le Coaching Compass.
 * `tri` → `triathlon`. Default fallback `bike` (compatible avec la signature historique).
 */
export function resolveCompassSportFocus(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null,
  fallback: CompassSportFocus = "bike"
): CompassSportFocus {
  const sport = resolveSportMain(snapshot, athlete);
  if (sport === "run") return "run";
  if (sport === "tri") return "triathlon";
  if (sport === "bike") return "bike";
  return fallback;
}

/**
 * Convertit le sport canonique vers le format attendu par les badges VLamax
 * (`getVlamaxStatusWithLabel`, `getVLamaxRange`) : `run` → `cap`.
 * Retourne `null` si aucun sport résolu (le badge utilisera alors les targets vélo par défaut).
 */
export function resolveBadgeSport(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null
): BadgeSport | null {
  const sport = resolveSportMain(snapshot, athlete);
  if (sport === "run") return "cap";
  if (sport === "bike") return "bike";
  if (sport === "tri") return "tri";
  return null;
}
