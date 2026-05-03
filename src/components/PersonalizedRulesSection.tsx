import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Shield, Target } from "lucide-react";
import type { DisciplineRule, DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";

interface Props {
  rules: DisciplineRulesResult;
  /** Compact = pour briefing athlète (sans pédagogie). Full = pour rapport staff. */
  variant?: "compact" | "full";
  className?: string;
}

const PRIORITY_STYLE: Record<DisciplineRule["priority"], string> = {
  critical: "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800",
  important: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800",
  optional: "bg-muted/30 border-border",
};

function extractConfidence(source?: string): "low" | "medium" | "high" | null {
  if (!source) return null;
  const m = source.match(/confiance\s+(low|medium|high)/i);
  return m ? (m[1].toLowerCase() as "low" | "medium" | "high") : null;
}

function extractSourceTag(source?: string): string | null {
  if (!source) return null;
  // Format: "Marathon — VLamax mesurée + TTE défaut [confiance high]"
  const m = source.match(/—\s*(.+?)\s*\[/);
  return m ? m[1] : source;
}

const CONF_BADGE: Record<"low" | "medium" | "high", { label: string; variant: "outline" | "secondary" | "default" }> = {
  low: { label: "Confiance faible", variant: "outline" },
  medium: { label: "Confiance moyenne", variant: "secondary" },
  high: { label: "Confiance élevée", variant: "default" },
};

function RuleCard({ rule, variant }: { rule: DisciplineRule; variant: "compact" | "full" }) {
  const conf = extractConfidence(rule.source);
  const tag = extractSourceTag(rule.source);
  return (
    <div className={`rounded-lg border p-3 space-y-1.5 ${PRIORITY_STYLE[rule.priority]}`}>
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">{rule.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{rule.title}</p>
            {conf && variant === "full" && (
              <Badge variant={CONF_BADGE[conf].variant} className="text-[10px] shrink-0">
                {CONF_BADGE[conf].label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{rule.message}</p>
          {variant === "full" && tag && (
            <p className="text-[10px] text-muted-foreground/80 italic mt-1.5">
              📚 Source : {tag}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersonalizedRulesSection({ rules, variant = "full", className }: Props) {
  const nonNegotiables = rules.nonNegotiables ?? [];
  const tacticals = rules.tacticals ?? [];

  if (nonNegotiables.length === 0 && tacticals.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Règles personnalisées
          <Badge variant="secondary" className="text-[10px] ml-1">
            Calibration VLamax + TTE
          </Badge>
        </CardTitle>
        {variant === "full" && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ces règles sont calibrées sur ta physiologie (VLamax, TTE, fatigue) et non plus sur
            des bornes fixes. Chaque règle indique son niveau de confiance et la source des
            données utilisées (mesurée vs défaut littérature).
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {nonNegotiables.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-red-500" />
              Non-négociables ({nonNegotiables.length})
            </h4>
            <div className="space-y-2">
              {nonNegotiables.map((r) => (
                <RuleCard key={r.id} rule={r} variant={variant} />
              ))}
            </div>
          </div>
        )}

        {tacticals.length > 0 && variant === "full" && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              Tactiques ({tacticals.length})
            </h4>
            <div className="space-y-2">
              {tacticals.map((r) => (
                <RuleCard key={r.id} rule={r} variant={variant} />
              ))}
            </div>
          </div>
        )}

        {variant === "full" && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5">
            <p className="text-[11px] text-foreground leading-relaxed">
              <strong>📖 Comment lire :</strong> les règles marquées « confiance élevée »
              utilisent VLamax et TTE mesurés sur l'athlète. « Confiance moyenne » = un seul
              paramètre observé. « Confiance faible » = valeurs littérature par défaut
              (Mader-Heck VLamax 0.45, Skiba TTE = 0.85 × durée course).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
