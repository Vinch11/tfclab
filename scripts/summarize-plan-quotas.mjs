/** Read-only, offline summary of supplied quota diagnostics. No requests, no model.
 * Usage: node scripts/summarize-plan-quotas.mjs exported-plan.json
 * Accepted: {weeklyQuotaIssues:[...]} or {quotaSources:[{source,issues:[...]}]}.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function summarizePlanQuotas(input) {
  const sources = input.quotaSources ?? (Array.isArray(input.weeklyQuotaIssues)
    ? [{ source: 'export.weeklyQuotaIssues', issues: input.weeklyQuotaIssues }] : null);
  if (!Array.isArray(sources)) throw new Error('Liste complète absente : fournir weeklyQuotaIssues ou quotaSources ; aucun total reconstruit depuis un compteur.');
  const result = { total: 0, byWeek: Object.create(null), byType: Object.create(null), byDiscipline: Object.create(null), bySource: Object.create(null), potentialExactDuplicates: [] };
  const occurrences = new Map();
  const increment = (map, key) => { map[key] = (map[key] ?? 0) + 1; };
  for (const group of sources) {
    if (typeof group.source !== 'string' || !Array.isArray(group.issues)) throw new Error('Source et liste requises.');
    group.issues.forEach((issue, ordinal) => {
      result.total++;
      increment(result.bySource, group.source);
      increment(result.byWeek, String(issue.weekNumber ?? 'inconnue'));
      increment(result.byType, issue.code ?? 'inconnu');
      // Existing export lacks a structured discipline: mark label inference explicitly.
      const reason = issue.reason ?? '';
      const match = /^(swim|bike|run|brick|strength)\b/.exec(reason);
      const sl = /^pas de SL vélo/.test(reason) ? 'bike' : /^pas de SL CAP/.test(reason) ? 'run' : null;
      const dailySports = [...new Set(`${issue.expected ?? ''} ${issue.observed ?? ''}`.match(/\b(?:swim|bike|run|brick|strength)\b/g) ?? [])].sort();
      const inferred = match?.[1] ?? sl ?? (dailySports.length ? dailySports.join('+') : null);
      increment(result.byDiscipline, issue.discipline ?? (inferred ? `${inferred} (libellé)` : /^total /.test(reason) ? 'total' : 'non déterminée'));
      const key = JSON.stringify([group.source, Object.keys(issue).sort().map(key => [key, issue[key]])]);
      const refs = occurrences.get(key) ?? [];
      refs.push({ source: group.source, ordinal }); occurrences.set(key, refs);
    });
  }
  // Preserve every occurrence in totals, even exact repetitions. Different checks,
  // weeks, expected/observed values or sources are never merged on their label.
  result.potentialExactDuplicates = [...occurrences.values()].filter(refs => refs.length > 1);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Fichier export JSON requis.');
  process.stdout.write(JSON.stringify(summarizePlanQuotas(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2) + '\n');
}
