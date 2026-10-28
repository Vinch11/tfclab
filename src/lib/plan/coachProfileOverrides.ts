import {
  canGuidePrescription,
  resolveCoachLimiterOrder,
} from "@/lib/limiterPrescription";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { CoachProfileFormPayload } from "@/components/CoachProfileForm";
import { computeChantierDurationWeeks } from "@/engines/plan/planConfigBuilder";
/** Pure adapter shared by generation, prevalidation and regeneration. No persistence or model call. */
export function applyCoachProfileOverrides(
  payload: Partial<CoachProfileFormPayload>,
  baseConfig: PlanConfig,
  diagnostic?: AthleteDiagnostic,
): PlanConfig {
  const cfg: PlanConfig = { ...baseConfig };

  const automatic = baseConfig.identifiedLimitersRaw ?? [];
  const inapplicable =
    diagnostic?.limiter.gapAnalysis.filter((g) =>
      !canGuidePrescription(g, baseConfig.objective)
    ).map((g) => g.metric) ?? [];
  const rawList = resolveCoachLimiterOrder(automatic, {
    order: payload.limiterOrder,
    excluded: payload.excludedLimiterMetrics,
    inapplicable,
    primary: payload.primaryLimiterMetric,
    secondary: payload.secondaryLimiterMetric,
    overridePrimary: payload.limiterOrder === undefined &&
      payload.overriddenByCoach?.primary,
    overrideSecondary: payload.limiterOrder === undefined &&
      payload.overriddenByCoach?.secondary,
  }).filter((metric) => canGuidePrescription({ metric }, baseConfig.objective));
  const primaryMetric = rawList[0];
  cfg.identifiedLimitersRaw = rawList;

  // Durée du bloc Chantier — calculée depuis l'ampleur réelle du gap sur le
  // limiteur #1 (status "limiting"/"acceptable"/"optimal" du diagnostic),
  // plutôt que la valeur fixe "3-4 sem" jusqu'ici codée en dur dans le
  // prompt. Le coach peut avoir choisi un limiteur différent de celui
  // ressorti en tête du diagnostic auto — on relit le statut du bon
  // limiteur (primaryMetric), pas juste gapAnalysis[0].
  const primaryGap = diagnostic?.limiter.gapAnalysis.find(
    (g) => g.metric === primaryMetric,
  );
  cfg.chantierDurationWeeks = computeChantierDurationWeeks(
    primaryGap?.status,
    payload.weeksAvailable ?? baseConfig.weeksAvailable,
  );

  // Preserve automatic evidence by default. An explicit order/exclusion must retain the rest.
  const changed = JSON.stringify(rawList) !== JSON.stringify(automatic);
  if (changed) {
    const md = [
      "## CLASSEMENT COMPLET DES LIMITEURS — priorités et exclusions explicites du coach",
    ];
    rawList.forEach((metric, index) => {
      md.push(
        `### Limiteur #${index + 1} — ${metric} (${
          automatic.includes(metric)
            ? "diagnostic conservé, ordre coach"
            : "jugement explicite du coach, pas une mesure"
        })`,
      );
      const observed = diagnostic?.limiter.gapAnalysis.find((g) =>
        g.metric === metric
      );
      if (observed) {
        md.push(
          `- Bilan conservé : valeur ${
            observed.value ?? "inconnue"
          }, cible ${observed.target}, statut ${observed.status}, impact ${observed.weightedImpact}. Incertitudes et provenance restent celles du diagnostic.`,
        );
      }
    });
    if (payload.excludedLimiterMetrics?.length) {
      md.push(
        `Exclusions explicites pour la prescription : ${
          payload.excludedLimiterMetrics.join(", ")
        }. Ne pas réintroduire ces priorités ; conserver les protections de sécurité.`,
      );
    }
    md.push(
      "Phase Base : priorité #1, #2 en maintien ; Build : progression du #2 ; Spécifique : intégration selon l’objectif et les règles TFCL existantes.",
    );
    cfg.identifiedLimiters = md;
  }

  if (payload.metabolicProfile) {
    cfg.identifiedLimiters = [
      ...(cfg.identifiedLimiters ?? []),
      `Profil de travail renseigné dans le formulaire : ${payload.metabolicProfile}. Indication qualitative ; ne remplace aucune mesure ni son incertitude.`,
    ];
  }

  // Prohibitions — traduction texte pour le prompt
  const prohibitionLabels: Record<string, string> = {
    sprints: "🚫 Pas de sprints all-out (jugement coach).",
    micro_intervals:
      "🚫 Pas de micro-intervalles explosifs <20s (jugement coach).",
    vo2_heavy_blocks: "🚫 Pas de blocs VO2max longs ≥5min (jugement coach).",
    erratic_pacing: "🚫 Pas de pacing erratique (jugement coach).",
    train_low: "🚫 Pas de train-low / sleep-low (jugement coach).",
  };
  const prohibText = (payload.prohibitions ?? []).map((p) =>
    prohibitionLabels[p] || p
  );
  if (prohibText.length > 0) {
    // Merge sans dupliquer les prohibitions objectif-driven déjà présentes.
    cfg.prohibitions = [...(cfg.prohibitions || []), ...prohibText];
  }

  // Start to Run — dose de renforcement choisie (prompt edge function)
  // + application DÉTERMINISTE : quota hebdo + contrainte dure si "none".
  if (payload.s2rStrength) {
    (cfg as PlanConfig & { _s2rStrength?: "full" | "light" | "none" })
      ._s2rStrength = payload.s2rStrength;
    const strengthQuota = payload.s2rStrength === "none"
      ? 0
      : payload.s2rStrength === "light"
      ? 1
      : 2;
    cfg.strengthSessionsPerWeek = strengthQuota;
    if (payload.s2rStrength === "none") {
      const banText = "Pas de renforcement musculaire (choix athlète)";
      cfg.constraints = [cfg.constraints || "", banText].filter(Boolean).join(
        "\n",
      );
      cfg.prohibitions = [
        ...(cfg.prohibitions || []),
        "🚫 Aucune séance de renforcement / PPG / gainage dans le plan (choix explicite de l'athlète).",
      ];
    }
  }

  if (payload.sessionsPerWeek && payload.sessionsPerWeek > 0) {
    cfg.sessionsPerWeek = payload.sessionsPerWeek;
  }

  // La trace conserve le diagnostic automatique, mais identifie sans
  // ambiguïté l'ordre et les interdictions que le coach a effectivement
  // substitués avant génération.
  if (cfg.physiologicalTrace) {
    cfg.physiologicalTrace = {
      ...cfg.physiologicalTrace,
      transmission: {
        ...cfg.physiologicalTrace.transmission,
        identifiedLimitersRaw: {
          ...cfg.physiologicalTrace.transmission.identifiedLimitersRaw,
          status: "consumed",
          origin: changed
            ? "coach override"
            : cfg.physiologicalTrace.transmission.identifiedLimitersRaw.origin,
          detail: `Ordre transmis: ${rawList.join(" > ")}${
            payload.excludedLimiterMetrics?.length
              ? ` ; exclusions explicites: ${
                payload.excludedLimiterMetrics.join(", ")
              }`
              : ""
          }`,
        },
        prohibitions: {
          ...cfg.physiologicalTrace.transmission.prohibitions,
          status: (cfg.prohibitions?.length ?? 0) > 0 ? "consumed" : "missing",
          origin:
            "planConfigBuilder + decision.strategy.prohibitions + coach override",
        },
      },
    };
  }

  return cfg;
}
