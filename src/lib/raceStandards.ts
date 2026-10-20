/**
 * Standards populationnels par objectif × ambition (temps de référence).
 *
 * ⚠️ MIROIR de `src/components/GapAmbitionPanel.tsx::REFERENCE_STANDARDS_FRONT`
 * — copie littérale, pas un import (ce composant entraînerait des
 * dépendances React/UI dans ce module de logique pure). Toute modif doit
 * être appliquée aux deux ; `raceStandards.mirrorConsistency.test.ts`
 * vérifie la parité à chaque run pour empêcher toute dérive silencieuse.
 *
 * Usage EXCLUSIF : alimenter `literatureHintText` pour `deriveRaceTargets()`
 * dans un contexte de CONTRÔLE (GapAmbitionPanel pré-génération,
 * checkB15 post-génération — cf. src/lib/plan/qa/checkB15.ts). Ne jamais
 * consommer pour prescrire une allure ou un volume dans le plan lui-même.
 */
import { normalizeObj, normalizeAmb } from "./deriveRaceTargets";

export const REFERENCE_STANDARDS: Record<string, Record<string, string>> = {
  "5K":       { finish: "28-35", perf: "22-26", sub: "18-21", elite: "16-18", world_class: "sub15" },
  "10K":      { finish: "55-1h10", perf: "45-52", sub: "38-44", elite: "33-37", world_class: "sub31" },
  "Semi":     { finish: "2h00-2h30", perf: "1h35-1h55", sub: "1h20-1h35", elite: "1h12-1h20", world_class: "sub1h08" },
  "Marathon": { finish: "4h30-5h00", perf: "3h30-4h15", sub: "3h00-3h30", elite: "2h45-3h00", world_class: "sub2h35" },
};

/**
 * Hint littérature pour `deriveRaceTargets({ literatureHintText })`, au
 * format attendu par `parseLiteratureHint` ("3h30-4h15", "sub15", ...).
 * `null` si l'objectif est hors périmètre de cette table (seuls 5K/10K/
 * Semi/Marathon ont un standard "ambition chronométrique" ici — IM/70.3
 * sont gérés séparément via VOLUME_CAP_MATRIX, pas un temps de référence).
 */
export function getLiteratureHintText(objective: string, ambition: string): string | null {
  const objKey = normalizeObj(objective);
  if (!objKey) return null;
  const ambKey = normalizeAmb(ambition);
  return REFERENCE_STANDARDS[objKey]?.[ambKey] ?? null;
}
