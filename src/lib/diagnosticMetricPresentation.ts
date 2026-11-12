import type { AthleteDiagnostic } from '@/engines/diagnostic';

/** Read-only classification; never changes the diagnostic or plan priorities. */
export function diagnosticMetricPresentation(diagnostic: AthleteDiagnostic) {
  const informational = (metric: string) => /^(W['′](?:\s*\(kJ\))?|TTE|Durability|Durabilité|FatMax)$/i.test(metric);
  return {
    scored: diagnostic.limiter.gapAnalysis.filter(g => !informational(g.metric)),
    references: diagnostic.limiter.gapAnalysis.filter(g => informational(g.metric)),
    tte: diagnostic.effectifs.tte?.tte_min && diagnostic.effectifs.tte.tte_min > 0 ? diagnostic.effectifs.tte : null,
  };
}