import type { PlanGenerationStat } from "./planGenerationStats";
import { sanitizeSchemaFailure, safeFailureCode, sanitizeTechnicalTraces } from "../../../supabase/functions/_shared/planFailureDiagnostics";
import { technicalRelease, technicalGenerationEvent } from "../../../supabase/functions/_shared/planDiagnosticPrivacy";
export function sanitizePlanStat(input: PlanGenerationStat): PlanGenerationStat {
 const numeric = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
 const out: PlanGenerationStat = { ts: numeric(input.ts) ?? 0, format: ["json","markdown","markdown-fallback-from-json"].includes(input.format) ? input.format : "json",
  objective: typeof input.objective === "string" && /^(?:5k|10k|semi|semi-marathon|marathon|ironman|ironman 70\.3|703|70\.3|im|trail|starttorun|triathlon|sprint|olympique)$/i.test(input.objective) ? input.objective : null,
  totalWeeks: numeric(input.totalWeeks), totalChunks: numeric(input.totalChunks), durationMs: numeric(input.durationMs) ?? 0, ok: input.ok === true };
 for (const key of ["sportObjectiveCriticalIssues","customRatio","nonRestSessionCount","customSessionCount","catalogSubstitutions","diversityRatio","distinctCatalogIds","maxFicheRepeat"] as const) {
  const n = numeric(input[key]); if (n !== null) out[key] = n;
 }
 if (input.errorCode !== undefined || !out.ok) { out.errorCode = safeFailureCode(input.errorCode); out.errorMessage = `Échec technique : ${out.errorCode}`; }
 if (input.schemaFailDetails) out.schemaFailDetails = sanitizeSchemaFailure(input.schemaFailDetails);
 if (input.semanticRepairs) out.semanticRepairs = sanitizeTechnicalTraces(input.semanticRepairs);
 if (input.clientRelease) out.clientRelease = technicalRelease(input.clientRelease);
 if (input.generationContext) out.generationContext = technicalGenerationEvent(input.generationContext);
 return out;
}
export function exportPlanDiagnostics(stats: PlanGenerationStat[]): string {
 return JSON.stringify({ diagnosticVersion: 1, stats: stats.map(sanitizePlanStat) }, null, 2);
}
