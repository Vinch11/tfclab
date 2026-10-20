/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B15 — Validation finale post-mutations : cohérence ambition ↔ physiologie
 * ═══════════════════════════════════════════════════════════════════════════════
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #4.
 *
 * `deriveRaceTargets()` calcule déjà un écart ambition/physiologie
 * (`divergencePct`/`warning`, seuil 8%) quand on lui fournit un
 * `literatureHintText` — mais ce calcul ne tourne AUJOURD'HUI que dans
 * `GapAmbitionPanel.tsx` (prévisualisation PRÉ-génération, 100% frontend,
 * jamais rappelé après). Rien ne revérifie APRÈS génération que le plan
 * livré correspond toujours à une ambition physiologiquement cohérente —
 * si le coach n'a pas regardé ce panneau (ou génère directement depuis le
 * wizard/formulaire express), l'écart n'est jamais signalé.
 *
 * B15 réexécute le MÊME calcul (même seuil, même source `deriveRaceTargets`,
 * aucune nouvelle règle inventée — cf. consigne coach "n'introduis pas de
 * règle universelle rigide") au moment de la validation finale post-
 * mutations, pour qu'il atteigne le coach à CHAQUE génération, via le même
 * canal que B13/B14 (`finalValidationIssues`).
 *
 * Niveau AVERTISSEMENT (pas critique) : un écart ambition/physiologie
 * n'invalide pas le contenu du plan lui-même (séances, charge, progression
 * restent valides) — c'est un signal pour le coach de reconsidérer
 * l'ambition affichée ou de vérifier que la physiologie a progressé depuis
 * la dernière mesure, jamais un blocage automatique.
 *
 * Périmètre : objectifs "ambition chronométrique" couverts par
 * `raceStandards.ts` (5K/10K/Semi/Marathon). IM/70.3 n'ont pas de standard
 * de temps de référence ici (gérés séparément via VOLUME_CAP_MATRIX dans
 * deriveRaceTargets.ts) — `pass: true` avec un détail explicite plutôt
 * qu'un signal fabriqué.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { CheckResult } from "./checks";
import { deriveRaceTargets, mapObjectiveToSport, normalizeObj } from "@/lib/deriveRaceTargets";
import { getLiteratureHintText } from "@/lib/raceStandards";

export interface AmbitionPhysiologyInput {
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
  objective: string;
  /** Ambition EFFECTIVE (post-déclassement niveau d'entraînement) — même
   *  convention que `buildTargetTable`/GapAmbitionPanel : la physiologie
   *  commande, l'écart se calcule vers ce que le plan construit réellement. */
  ambition: string;
}

export function checkB15(input: AmbitionPhysiologyInput): CheckResult {
  const LABEL = "Cohérence ambition chronométrique ↔ physiologie (post-génération)";
  const details: string[] = [];

  const objKey = normalizeObj(input.objective || "");
  if (!objKey) {
    details.push(
      `Objectif "${input.objective}" hors périmètre de ce contrôle (couvre 5K/10K/Semi/Marathon — ` +
      `IM/70.3 gérés séparément via le plafond de volume sport×ambition, pas un temps de référence).`,
    );
    return { id: "B15", label: LABEL, level: "warning", pass: true, details };
  }
  if (!input.vmaKmh && !input.thresholdPaceSecPerKm) {
    details.push("VMA/seuil athlète indisponible — écart ambition/physiologie non calculable.");
    return { id: "B15", label: LABEL, level: "warning", pass: true, details };
  }

  const literatureHintText = getLiteratureHintText(input.objective, input.ambition);
  const derived = deriveRaceTargets({
    vmaKmh: input.vmaKmh ?? null,
    thresholdPaceSecPerKm: input.thresholdPaceSecPerKm ?? null,
    objective: input.objective,
    ambition: input.ambition,
    literatureHintText,
    sport: mapObjectiveToSport(input.objective),
  });

  if (derived.warning) {
    details.push(derived.warning);
    return { id: "B15", label: LABEL, level: "warning", pass: false, details };
  }

  details.push(
    derived.divergencePct != null
      ? `Écart ambition/physiologie : ${derived.divergencePct > 0 ? "+" : ""}${derived.divergencePct}% (sous le seuil de 8%).`
      : "Standard de référence indisponible pour cette combinaison objectif/ambition — écart non calculable.",
  );
  return { id: "B15", label: LABEL, level: "warning", pass: true, details };
}

/** Convertit l'échec de B15 en `ValidationIssue[]`-like (sévérité
 *  "warning", jamais bloquant) pour affichage coach. */
export function checkB15ToValidationIssues(result: CheckResult): Array<{
  rule: string; severity: "warning"; message: string; detail?: string;
}> {
  if (result.pass) return [];
  return [{
    rule: "ambition_physiology_gap",
    severity: "warning" as const,
    message: result.details[0],
    detail: "Écart entre l'ambition chronométrique affichée et la VMA/seuil actuel(le) de l'athlète (>8% vs standard populationnel) — ne bloque pas le plan : vérifie si l'ambition doit être revue ou si la physiologie a progressé depuis la dernière mesure.",
  }];
}
