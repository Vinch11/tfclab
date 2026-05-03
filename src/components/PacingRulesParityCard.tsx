/**
 * PacingRulesParityCard — Affiche un audit de cohérence entre la vue
 * interactive (DisciplineRulesResult) et les rapports exportés (rapport staff
 * + briefing athlète). Détecte les écarts de mapping et les pertes de
 * métadonnées (source / confiance / badge sensible).
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import {
  checkPacingRulesParity,
  type ParityCheckResult,
  type ParityIssue,
  type ExportSurface,
} from "@/lib/v2/pacingRulesParityCheck";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";

interface Props {
  rules: DisciplineRulesResult | null | undefined;
  className?: string;
}

const SURFACE_LABEL: Record<ExportSurface, string> = {
  interactive_full: "Vue interactive",
  staff_report: "Rapport staff (PDF)",
  athlete_briefing: "Briefing athlète",
};

const SEVERITY_STYLE: Record<
  ParityIssue["severity"],
  { color: string; icon: React.ReactNode; label: string }
> = {
  critical: {
    color: "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
    label: "Critique",
  },
  warning: {
    color: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
    label: "Avertissement",
  },
  info: {
    color: "border-border bg-muted/30",
    icon: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
    label: "Info",
  },
};

export function PacingRulesParityCard({ rules, className }: Props) {
  const result: ParityCheckResult | null = useMemo(
    () => (rules ? checkPacingRulesParity(rules) : null),
    [rules],
  );

  if (!result) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Audit de cohérence UI ↔ Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">
            Lance une simulation pour générer un set de règles à auditer.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { passed, issues, summary, snapshots } = result;
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Audit de cohérence UI ↔ Exports
          </CardTitle>
          <Badge
            variant={passed ? "default" : "destructive"}
            className="text-[10px]"
          >
            {passed ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Cohérent
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" /> {criticalCount} écart(s) critique(s)
              </>
            )}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Compare le contenu de la vue interactive avec ce qu'affichent réellement le rapport
          staff et le briefing athlète. Permet de détecter toute règle perdue, toute métadonnée
          (source, confiance) non propagée et tout drop de catégorie.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Snapshot par surface */}
        <div className="grid grid-cols-3 gap-2">
          {snapshots.map((s) => (
            <div
              key={s.surface}
              className="rounded-md border bg-muted/30 p-2 text-center space-y-1"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {SURFACE_LABEL[s.surface]}
              </p>
              <p className="text-lg font-bold text-foreground">{s.ruleIds.length}</p>
              <p className="text-[10px] text-muted-foreground">règles affichées</p>
              <div className="flex flex-wrap justify-center gap-1 pt-1">
                {s.showsSource && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">📚 source</Badge>
                )}
                {s.showsConfidence && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">🎯 confiance</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Résumé */}
        <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5">
          <p className="text-[11px] text-foreground leading-relaxed">
            <strong>{summary.totalRules}</strong> règles générées —{" "}
            <strong>{summary.droppedInStaff}</strong> drop(s) côté rapport staff,{" "}
            <strong>{summary.droppedInAthlete}</strong> drop(s) côté briefing athlète.
            {passed ? " Aucun écart bloquant détecté." : " ⚠ Écart bloquant à corriger."}
          </p>
        </div>

        {/* Issues */}
        {issues.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Tous les mappings sont cohérents : la vue interactive et les exports affichent
              les mêmes règles avec les bonnes métadonnées.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">
              Détails ({issues.length} entrée{issues.length > 1 ? "s" : ""})
            </p>
            {issues.map((issue, idx) => {
              const style = SEVERITY_STYLE[issue.severity];
              return (
                <div
                  key={idx}
                  className={`rounded-md border p-2 flex items-start gap-2 ${style.color}`}
                >
                  <div className="mt-0.5">{style.icon}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {style.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {SURFACE_LABEL[issue.surface]}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {issue.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      {issue.message}
                    </p>
                    {issue.ruleId && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        ID : {issue.ruleId}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic pt-1 border-t">
          Référence : <code>src/lib/v2/pacingRulesParityCheck.ts</code> — exécuté à chaque
          rendu sur le même <code>DisciplineRulesResult</code> consommé par l'UI et les exports.
        </p>
      </CardContent>
    </Card>
  );
}

export default PacingRulesParityCard;
