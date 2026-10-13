/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B14 — Validation finale post-mutations : cohérence phase/fiche
 * ═══════════════════════════════════════════════════════════════════════════════
 * Audit scientifique P0 — F12 (AUDIT_SCIENTIFIQUE_P0.md).
 *
 * Vérifie que chaque séance non-custom a une fiche dont les phases
 * autorisées (`ficheAllowedPhases`) couvrent la phase ACTUELLE (post-
 * mutations) de sa semaine — détecte le cas `enforceTaperWeeks` identifié
 * par l'audit : un remplaçant choisi et scoré pour une phase "build" qui se
 * retrouve dans une semaine reclassée "taper" plus tard dans le pipeline.
 *
 * Niveau AVERTISSEMENT (pas critique, contrairement à B13) : c'est un
 * problème de classement/étiquetage de la périodisation affichée au coach,
 * pas un risque d'entraînement direct comme un doublon ou un cumul "à
 * jeun" — la séance elle-même reste un contenu d'entraînement valide, juste
 * potentiellement mal positionné dans le narratif de phase.
 *
 * Lecture seule, même convention structurelle que B13
 * (`FinalValidationPlanLike`) — fonctionne sur `MergedPlan` ET `ParsedPlan`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { CheckResult } from "./checks";
import type { FinalValidationPlanLike } from "./checkB13";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheAllowedPhases, type PlanPhase } from "@/lib/plan/phaseNormalization";

const FICHES_BY_ID: Map<string, (typeof WorkoutLibrary)[number]> = (() => {
  const m = new Map<string, (typeof WorkoutLibrary)[number]>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();

const VALID_PHASES: ReadonlySet<string> = new Set(["base", "build", "peak", "taper"]);

export function checkB14(plan: FinalValidationPlanLike): CheckResult {
  const LABEL = "Cohérence phase/fiche post-mutations";
  const details: string[] = [];
  let pass = true;

  for (const week of plan.weeks) {
    const weekPhase = week.phase;
    if (!VALID_PHASES.has(weekPhase)) continue;
    const sessions = week.sessions.filter((s) => !s.isRest);

    for (const s of sessions) {
      if (s.custom || !s.catalogId) continue;
      const fiche = FICHES_BY_ID.get(s.catalogId.toUpperCase());
      if (!fiche) continue;
      const allowed = ficheAllowedPhases(fiche);
      if (allowed.size > 0 && !allowed.has(weekPhase as PlanPhase)) {
        pass = false;
        details.push(
          `S${week.weekNumber} (phase actuelle: ${weekPhase}) : "${s.catalogId}"${s.dayName ? ` (${s.dayName})` : ""} n'est valide que pour [${[...allowed].join(", ")}] — probablement choisi avant un reclassement tardif de la semaine (ex. enforceTaperWeeks).`,
        );
      }
    }
  }

  if (pass) details.push("Aucune incohérence phase/fiche post-mutations détectée.");

  return { id: "B14", label: LABEL, level: "warning", pass, details };
}

/** Convertit les lignes d'échec de B14 en `ValidationIssue[]`-like (sévérité
 *  "warning") pour affichage coach. */
export function checkB14ToValidationIssues(result: CheckResult): Array<{
  rule: string; severity: "warning"; message: string; detail?: string;
}> {
  if (result.pass) return [];
  return result.details
    .filter((d) => d.startsWith("S") && /:/.test(d))
    .map((d) => ({
      rule: "final_validation_phase_mismatch",
      severity: "warning" as const,
      message: d,
      detail: "Séance choisie pour une autre phase avant qu'un reclassement tardif de la semaine (ex. affûtage ajouté automatiquement) ne change sa phase affichée — le contenu reste valide, seul l'étiquetage de phase est à vérifier.",
    }));
}
