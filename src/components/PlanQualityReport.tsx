/**
 * PlanQualityReport — Displays the 10-rule quality validation result
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, XCircle, Info } from "lucide-react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { validatePlan, type PlanValidationResult, type ValidationIssue } from "@/engines/plan/planValidator";

interface PlanQualityReportProps {
  plan: ParsedPlan;
  objective?: string;
  identifiedLimiters?: string[];
}

const RULE_LABELS: Record<string, string> = {
  polarizationScore: "Polarisation 80/20",
  loadPatternScore: "Décharge 3:1 / 2:1",
  keySessionsScore: "Séances clés",
  progressionScore: "Progression volume",
  sportRatioScore: "Ratio sportif",
  catalogRatioScore: "Catalogue TFCL™",
  structureScore: "Structure (Race/Jours/Repos)",
  limiterAlignmentScore: "Cohérence Limiteurs (Lorang)",
};

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-600 dark:text-green-400";
    case "B": return "text-blue-600 dark:text-blue-400";
    case "C": return "text-yellow-600 dark:text-yellow-400";
    case "D": return "text-orange-600 dark:text-orange-400";
    default: return "text-red-600 dark:text-red-400";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
}

export function PlanQualityReport({ plan, objective, identifiedLimiters }: PlanQualityReportProps) {
  const [open, setOpen] = useState(false);

  const result = useMemo<PlanValidationResult>(
    () => validatePlan(plan, objective, identifiedLimiters),
    [plan, objective, identifiedLimiters]
  );

  const scores = [
    { key: "polarizationScore", score: result.summary.polarizationScore },
    { key: "loadPatternScore", score: result.summary.loadPatternScore },
    { key: "keySessionsScore", score: result.summary.keySessionsScore },
    { key: "progressionScore", score: result.summary.progressionScore },
    { key: "sportRatioScore", score: result.summary.sportRatioScore },
    { key: "catalogRatioScore", score: result.summary.catalogRatioScore },
    { key: "structureScore", score: result.summary.structureScore },
    ...(result.summary.limiterAlignmentScore > 0 || (identifiedLimiters && identifiedLimiters.length > 0)
      ? [{ key: "limiterAlignmentScore", score: result.summary.limiterAlignmentScore }]
      : []),
  ];

  const errors = result.issues.filter(i => i.severity === "error");
  const warnings = result.issues.filter(i => i.severity === "warning");

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Qualité du Plan</CardTitle>
                <Badge variant="outline" className={`text-lg font-bold ${gradeColor(result.grade)}`}>
                  {result.grade}
                </Badge>
                <span className="text-sm text-muted-foreground">{result.score}/100</span>
              </div>
              <div className="flex items-center gap-2">
                {errors.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{errors.length} erreur(s)</Badge>
                )}
                {warnings.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{warnings.length} avert.</Badge>
                )}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Score bars */}
            <div className="grid gap-2">
              {scores.map(({ key, score }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-48 shrink-0">
                    {RULE_LABELS[key] || key}
                  </span>
                  <Progress value={score} className="h-2 flex-1" />
                  <span className="text-xs font-mono w-10 text-right">
                    {score}
                  </span>
                </div>
              ))}
            </div>

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="space-y-1 mt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détails</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {[...errors, ...warnings].slice(0, 15).map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <SeverityIcon severity={issue.severity} />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                  {result.issues.length > 15 && (
                    <p className="text-xs text-muted-foreground">
                      ... et {result.issues.length - 15} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.issues.length === 0 && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ Plan conforme aux standards élite TFCL™
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
