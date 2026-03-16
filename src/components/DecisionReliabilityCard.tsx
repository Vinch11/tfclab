/**
 * Decision Reliability Card
 * Carte détaillée affichant le Decision Reliability Engine™
 */

import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  DecisionReliabilityResult,
  Scenario,
  ConsistencyFlag
} from "@/engines/diagnostic";
import { DecisionReliabilityBadge, DecisionReliabilityProgress } from "./DecisionReliabilityBadge";
import { cn } from "@/lib/utils";

interface DecisionReliabilityCardProps {
  result: DecisionReliabilityResult;
  onMarkAsReference?: () => void;
  onOpenTests?: () => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function DecisionReliabilityCard({
  result,
  onMarkAsReference,
  onOpenTests,
  defaultExpanded = false,
  className
}: DecisionReliabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasWarnings = result.warnings.length > 0;
  const hasRecommendations = result.recommendations.length > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Decision Reliability Engine™
          </CardTitle>
          <DecisionReliabilityBadge
            score={result.decisionConfidenceScore}
            level={result.decisionLevel}
          />
        </div>
        <p className="text-xs text-muted-foreground italic">
          "La meilleure décision possible, avec transparence sur l'incertitude"
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="space-y-3">
          <DecisionReliabilityProgress
            score={result.decisionConfidenceScore}
            level={result.decisionLevel}
          />
          <p className="text-sm text-center">{result.mainMessage}</p>
        </div>

        {/* Alertes si incohérences */}
        {result.physioConsistency.incoherenceDetected && (
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Incohérences physiologiques détectées. Les recommandations sont limitées.
            </AlertDescription>
          </Alert>
        )}

        {/* Semaine de référence */}
        {result.isReferenceWeek ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Semaine de Référence TFCL ✓</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              +{(result.referenceWeekBoost * 100).toFixed(0)}% confiance
            </Badge>
          </div>
        ) : (
          onMarkAsReference && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAsReference}
              className="w-full"
            >
              <Target className="w-4 h-4 mr-2" />
              Marquer comme Semaine de Référence TFCL
            </Button>
          )
        )}

        {/* Scénarios */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Scénarios de course
          </h4>
          <div className="grid gap-2">
            {result.scenarios.map((scenario) => (
              <ScenarioCard key={scenario.type} scenario={scenario} />
            ))}
          </div>
        </div>

        {/* Collapsible détails */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Voir les détails ({result.warnings.length} alertes)
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-4">
            <Separator />

            {/* Composantes du score */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Composantes du score</h4>
              
              <ComponentScore
                label="Qualité du protocole"
                score={result.protocolQuality.score}
                icon={FlaskConical}
              />
              
              {result.multiIndexVlamax && (
                <ComponentScore
                  label="VLamax Multi-indices"
                  score={result.multiIndexVlamax.confidence}
                  icon={Target}
                  extra={`σ=${result.multiIndexVlamax.dispersion.toFixed(3)}`}
                />
              )}
              
              {result.durability && (
                <ComponentScore
                  label="Validation durabilité"
                  score={result.durability.consistencyScore}
                  icon={TrendingUp}
                />
              )}
              
              <ComponentScore
                label="Cohérence physiologique"
                score={result.physioConsistency.score}
                icon={result.physioConsistency.incoherenceDetected ? AlertTriangle : CheckCircle2}
                variant={result.physioConsistency.incoherenceDetected ? "warning" : "default"}
              />
              
              {result.economy && (
                <ComponentScore
                  label="Économie de mouvement"
                  score={result.economy.score}
                  icon={Minus}
                />
              )}
            </div>

            {/* Warnings */}
            {hasWarnings && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  Alertes ({result.warnings.length})
                </h4>
                <ul className="space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommandations */}
            {hasRecommendations && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-blue-600">
                  <Lightbulb className="w-4 h-4" />
                  Recommandations
                </h4>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-1">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Flags de cohérence détaillés */}
            {result.physioConsistency.flags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Incohérences détectées</h4>
                {result.physioConsistency.flags.map((flag, i) => (
                  <ConsistencyFlagCard key={i} flag={flag} />
                ))}
              </div>
            )}

            {/* VLamax Multi-index détail */}
            {result.multiIndexVlamax && result.multiIndexVlamax.indices.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">VLamax Multi-indices</h4>
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Médiane</span>
                    <span className="font-bold">{result.multiIndexVlamax.median.toFixed(3)} mmol/L/s</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Plage (P25-P75)</span>
                    <span>{result.multiIndexVlamax.rangeLow.toFixed(3)} - {result.multiIndexVlamax.rangeHigh.toFixed(3)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    {result.multiIndexVlamax.indices.map((idx, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{idx.name}</span>
                        <span>{idx.value.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Call to action */}
            {onOpenTests && result.decisionLevel === 'insufficient' && (
              <Button onClick={onOpenTests} className="w-full">
                <FlaskConical className="w-4 h-4 mr-2" />
                Compléter les tests pour améliorer la fiabilité
              </Button>
            )}

            {/* Metadata */}
            <div className="text-[10px] text-muted-foreground/50 text-right">
              {result.version} • Calculé le {new Date(result.calculatedAt).toLocaleDateString('fr-FR')}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Sub-components

interface ScenarioCardProps {
  scenario: Scenario;
}

function ScenarioCard({ scenario }: ScenarioCardProps) {
  const config = {
    conservative: {
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      icon: Shield
    },
    optimal: {
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      icon: Target
    },
    aggressive: {
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      icon: TrendingUp
    }
  };

  const c = config[scenario.type];
  const Icon = c.icon;

  const riskIcon = (level: 'low' | 'medium' | 'high') => {
    if (level === 'low') return <TrendingDown className="w-3 h-3 text-green-500" />;
    if (level === 'medium') return <Minus className="w-3 h-3 text-yellow-500" />;
    return <TrendingUp className="w-3 h-3 text-red-500" />;
  };

  return (
    <div className={cn("p-3 rounded-lg border", c.bgColor, c.borderColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", c.color)} />
        <span className={cn("font-medium text-sm", c.color)}>{scenario.label}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{scenario.recommendation}</p>
      <div className="flex gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          {riskIcon(scenario.risks.fatigue)} Fatigue
        </span>
        <span className="flex items-center gap-1">
          {riskIcon(scenario.risks.injury)} Blessure
        </span>
        <span className="flex items-center gap-1">
          {riskIcon(scenario.risks.glycogenDepletion)} Glycogène
        </span>
      </div>
    </div>
  );
}

interface ComponentScoreProps {
  label: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning";
  extra?: string;
}

function ComponentScore({ label, score, icon: Icon, variant = "default", extra }: ComponentScoreProps) {
  const percentage = Math.round(score * 100);
  const color = percentage >= 75 ? "text-green-500" : percentage >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4 shrink-0", variant === "warning" ? "text-yellow-500" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="truncate">{label}</span>
          <span className={cn("font-medium", color)}>{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>
      {extra && <span className="text-[10px] text-muted-foreground">{extra}</span>}
    </div>
  );
}

interface ConsistencyFlagCardProps {
  flag: ConsistencyFlag;
}

function ConsistencyFlagCard({ flag }: ConsistencyFlagCardProps) {
  const severityConfig = {
    info: { color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
    warning: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
    critical: { color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" }
  };

  const c = severityConfig[flag.severity];

  return (
    <div className={cn("p-2 rounded-lg border text-xs", c.bgColor, c.borderColor)}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className={cn("w-3 h-3", c.color)} />
        <span className="font-medium">{flag.flag}</span>
        <Badge variant="outline" className={cn("text-[10px] ml-auto", c.color)}>
          {flag.severity}
        </Badge>
      </div>
      <p className="text-muted-foreground">{flag.hypothesis}</p>
      <div className="flex gap-1 mt-1">
        {flag.affectedMetrics.map((m, i) => (
          <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
        ))}
      </div>
    </div>
  );
}
