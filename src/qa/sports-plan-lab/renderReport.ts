import type { PlanFinding, SportsPlanQaReport } from "./types";

function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

function findingRows(findings: readonly PlanFinding[]): string {
  if (!findings.length) return "Aucune.\n";
  return findings.map(finding => `- **${finding.code}**${finding.weekNumber ? ` · S${finding.weekNumber}` : ""}${finding.sessionRef ? ` · ${finding.sessionRef}` : ""} — ${finding.message}${finding.evidence ? ` _Preuve : ${finding.evidence}_` : ""}`).join("\n") + "\n";
}

export function renderMarkdownReport(report: SportsPlanQaReport): string {
  const disciplineRows = report.disciplines.map(item => `| ${item.sport} | ${item.sessions} | ${duration(item.knownDurationMin)} | ${item.unknownDurationSessions} | ${item.cardioShare === null ? "n/a" : `${(item.cardioShare * 100).toFixed(1)} %`} |`).join("\n");
  const weekRows = report.weeks.map(week => {
    const sports = Object.entries(week.bySportMin).map(([sport, min]) => `${sport}:${min}`).join(", ") || "—";
    const zones = Object.entries(week.rawZoneMinutes).map(([zone, min]) => `${zone}:${min}`).join(", ") || "—";
    return `| ${week.weekNumber} | ${week.phase} | ${week.theme || "—"} | ${duration(week.knownDurationMin)} | ${week.unknownDurationSessions} | ${week.keySessions ?? "?"} | ${sports} | ${zones} | ${week.deloadEvidence} |`;
  }).join("\n");
  const coverageRows = report.coverage.map(item => `| ${item.control} | ${item.status} | ${item.detail} |`).join("\n");
  return `# Diagnostic sportif indépendant

- Scénario : **${report.scenario.label}** (${report.scenario.id})
- Objectif attendu : **${report.scenario.objective}**
- Plan : **${report.plan.title}**, ${report.plan.totalWeeks} semaine(s)
- Forme détectée : ${report.plan.sourceShape}
- Critiques : **${report.critical.length}** · avertissements : **${report.warnings.length}** · non vérifiables : **${report.notVerifiable.length}**

## Synthèse par discipline

| Discipline | Séances | Durée connue | Durées inconnues | Part cardio |
|---|---:|---:|---:|---:|
${disciplineRows || "| — | 0 | 0h00 | 0 | n/a |"}

## Tableau hebdomadaire

| S | Phase | Thème | Durée connue | Durées ? | Qualité | Minutes/sport | Zones brutes | Décharge |
|---:|---|---|---:|---:|---:|---|---|---|
${weekRows}

## Anomalies critiques

${findingRows(report.critical)}
## Avertissements

${findingRows(report.warnings)}
## Points non vérifiables

${findingRows(report.notVerifiable)}
## Couverture réelle

| Contrôle | Statut | Détail |
|---|---|---|
${coverageRows}

## Limites

${report.limitations.map(item => `- ${item}`).join("\n")}
`;
}

