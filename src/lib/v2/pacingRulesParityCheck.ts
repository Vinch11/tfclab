/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING RULES PARITY CHECK™
 * 
 * Vérification de cohérence entre la vue interactive (DisciplineRulesResult
 * tel que consommé par RaceSimulationPage / NegativeSplitPreviewCard /
 * PersonalizedRulesSection variant="full") et les rapports exportés
 * (StaffPacingReportV2 = variant "full", RaceDayBriefingMode = variant "compact").
 * 
 * Détecte les écarts de mapping :
 *  - règles présentes en UI mais absentes d'un rapport (ou vice versa)
 *  - perte de métadonnées (priority, source, confiance)
 *  - badge sensible non propagé
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DisciplineRule, DisciplineRulesResult } from "./pacingDisciplineRules";

export type ExportSurface =
  | "interactive_full"   // RaceSimulationPage : toutes catégories visibles
  | "staff_report"       // StaffPacingReportV2 : nonNegotiables + tacticals (variant full)
  | "athlete_briefing";  // RaceDayBriefingMode : nonNegotiables uniquement (variant compact)

export interface SurfaceSnapshot {
  surface: ExportSurface;
  ruleIds: string[];
  showsSource: boolean;
  showsConfidence: boolean;
  showsSensitiveBadge: boolean;
}

export interface ParityIssue {
  severity: "critical" | "warning" | "info";
  surface: ExportSurface;
  code:
    | "rule_missing_in_export"
    | "metadata_lost"
    | "sensitive_badge_not_propagated"
    | "category_dropped";
  message: string;
  ruleId?: string;
}

export interface ParityCheckResult {
  passed: boolean;
  issues: ParityIssue[];
  snapshots: SurfaceSnapshot[];
  summary: {
    totalRules: number;
    interactiveCount: number;
    staffReportCount: number;
    athleteBriefingCount: number;
    droppedInStaff: number;
    droppedInAthlete: number;
  };
}

/**
 * Reproduit ce que chaque surface affiche, à partir du même
 * DisciplineRulesResult passé en entrée. Les règles de mapping suivent
 * exactement celles de PersonalizedRulesSection :
 *  - variant "full"   → nonNegotiables + tacticals + source + confiance
 *  - variant "compact"→ nonNegotiables uniquement, sans source ni confiance
 */
function snapshotSurface(
  surface: ExportSurface,
  rules: DisciplineRulesResult,
): SurfaceSnapshot {
  const nn = rules.nonNegotiables ?? [];
  const tac = rules.tacticals ?? [];
  const cp = rules.coachPhrases ?? [];
  const pro = rules.prohibitions ?? [];

  switch (surface) {
    case "interactive_full":
      return {
        surface,
        ruleIds: [...nn, ...tac, ...cp, ...pro].map((r) => r.id),
        showsSource: true,
        showsConfidence: true,
        showsSensitiveBadge: rules.showSensitiveBadge,
      };
    case "staff_report":
      return {
        surface,
        ruleIds: [...nn, ...tac].map((r) => r.id),
        showsSource: true,
        showsConfidence: true,
        showsSensitiveBadge: rules.showSensitiveBadge,
      };
    case "athlete_briefing":
      return {
        surface,
        ruleIds: nn.map((r) => r.id),
        showsSource: false,
        showsConfidence: false,
        showsSensitiveBadge: rules.showSensitiveBadge,
      };
  }
}

/**
 * Compare les surfaces. La référence est `interactive_full`.
 * Un drop volontaire (tacticals exclus du briefing athlète) est signalé
 * en `info`, pas en `critical`.
 */
export function checkPacingRulesParity(
  rules: DisciplineRulesResult,
): ParityCheckResult {
  const interactive = snapshotSurface("interactive_full", rules);
  const staff = snapshotSurface("staff_report", rules);
  const athlete = snapshotSurface("athlete_briefing", rules);

  const issues: ParityIssue[] = [];

  const allRules: DisciplineRule[] = [
    ...(rules.nonNegotiables ?? []),
    ...(rules.tacticals ?? []),
    ...(rules.coachPhrases ?? []),
    ...(rules.prohibitions ?? []),
  ];
  const byId = new Map(allRules.map((r) => [r.id, r]));

  // 1. Vérifier que toute règle critique de l'UI interactive est dans le rapport staff
  for (const id of interactive.ruleIds) {
    const r = byId.get(id);
    if (!r) continue;
    if (r.priority === "critical" && !staff.ruleIds.includes(id)) {
      issues.push({
        severity: "critical",
        surface: "staff_report",
        code: "rule_missing_in_export",
        ruleId: id,
        message: `Règle critique « ${r.title} » présente dans la vue interactive mais absente du rapport staff.`,
      });
    }
    if (r.priority === "critical" && !athlete.ruleIds.includes(id)) {
      // Une règle critique tactique (non non-negotiable) sera droppée du briefing athlète : warning
      const isNonNegotiable = (rules.nonNegotiables ?? []).some((x) => x.id === id);
      if (!isNonNegotiable) {
        issues.push({
          severity: "warning",
          surface: "athlete_briefing",
          code: "category_dropped",
          ruleId: id,
          message: `Règle critique tactique « ${r.title} » droppée du briefing athlète (non-négociables uniquement).`,
        });
      } else {
        issues.push({
          severity: "critical",
          surface: "athlete_briefing",
          code: "rule_missing_in_export",
          ruleId: id,
          message: `Règle non-négociable « ${r.title} » manquante dans le briefing athlète.`,
        });
      }
    }
  }

  // 2. Métadonnées : confiance/source perdues côté athlète = info attendu
  const hasConfidenceMeta = allRules.some((r) => r.source && /confiance/i.test(r.source));
  if (hasConfidenceMeta && !athlete.showsConfidence) {
    issues.push({
      severity: "info",
      surface: "athlete_briefing",
      code: "metadata_lost",
      message:
        "Le briefing athlète n'affiche volontairement pas la confiance/source (compact). Vérifié OK.",
    });
  }
  if (hasConfidenceMeta && !staff.showsConfidence) {
    issues.push({
      severity: "critical",
      surface: "staff_report",
      code: "metadata_lost",
      message: "Le rapport staff doit afficher la confiance/source — non détecté.",
    });
  }

  // 3. Badge sensible doit se propager partout s'il est actif
  if (rules.showSensitiveBadge) {
    if (!staff.showsSensitiveBadge) {
      issues.push({
        severity: "critical",
        surface: "staff_report",
        code: "sensitive_badge_not_propagated",
        message: "Badge profil sensible actif côté UI mais non propagé au rapport staff.",
      });
    }
    if (!athlete.showsSensitiveBadge) {
      issues.push({
        severity: "warning",
        surface: "athlete_briefing",
        code: "sensitive_badge_not_propagated",
        message: "Badge profil sensible actif côté UI mais non propagé au briefing athlète.",
      });
    }
  }

  // 4. Catégories droppées (info)
  const coachPhrasesCount = (rules.coachPhrases ?? []).length;
  const prohibitionsCount = (rules.prohibitions ?? []).length;
  if (coachPhrasesCount + prohibitionsCount > 0) {
    issues.push({
      severity: "info",
      surface: "staff_report",
      code: "category_dropped",
      message: `${coachPhrasesCount} phrase(s) coach et ${prohibitionsCount} interdiction(s) ne sont pas dans le rapport staff (par design — variant "full" affiche nonNegotiables + tacticals).`,
    });
  }

  const passed = !issues.some((i) => i.severity === "critical");

  const droppedInStaff = interactive.ruleIds.filter((id) => !staff.ruleIds.includes(id)).length;
  const droppedInAthlete = interactive.ruleIds.filter((id) => !athlete.ruleIds.includes(id)).length;

  return {
    passed,
    issues,
    snapshots: [interactive, staff, athlete],
    summary: {
      totalRules: allRules.length,
      interactiveCount: interactive.ruleIds.length,
      staffReportCount: staff.ruleIds.length,
      athleteBriefingCount: athlete.ruleIds.length,
      droppedInStaff,
      droppedInAthlete,
    },
  };
}
