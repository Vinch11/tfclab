/**
 * Carte Risque Blessure Course à Pied (CAP)
 * Affiche le score, les facteurs contributifs et les recommandations
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Activity, ShieldAlert, Lightbulb, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  InjuryRiskEnvelope, 
  getInjuryRiskIcon, 
  getInjuryRiskColorClass,
  getInjuryRiskBadgeClass,
  INJURY_RISK_PHILOSOPHY
} from "@/lib/v2/injuryRiskUnified";
import { V2ConfidenceBadge } from "./V2ConfidenceBadge";

interface InjuryRiskCAPCardProps {
  riskEnvelope: InjuryRiskEnvelope;
  isStaffMode?: boolean;
  className?: string;
}

export function InjuryRiskCAPCard({ riskEnvelope, isStaffMode = false, className }: InjuryRiskCAPCardProps) {
  const { score, level, levelLabel, levelColor, confidence, drivers, why, guardrails, coachRecommendations, disclaimer } = riskEnvelope;
  
  // Couleur de la barre de progression
  const getProgressColor = () => {
    switch (levelColor) {
      case 'success': return 'bg-green-500';
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-amber-500';
      case 'destructive': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };
  
  // Filtrer les drivers par impact
  const highImpactDrivers = drivers.filter(d => d.impact === 'high' || d.impact === 'critical');
  const otherDrivers = drivers.filter(d => d.impact === 'low' || d.impact === 'medium');
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <span>Risque Blessure CAP</span>
          </CardTitle>
          <V2ConfidenceBadge confidence={confidence} size="sm" />
        </div>
        <CardDescription className="text-xs">
          Indice composite • Course à pied
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1">
              <span className={cn("text-3xl font-bold", getInjuryRiskColorClass(level))}>
                {score}
              </span>
              <Badge variant="outline" className={cn("text-xs", getInjuryRiskBadgeClass(level))}>
                {getInjuryRiskIcon(level)} {levelLabel}
              </Badge>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", getProgressColor())}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Explication principale */}
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-foreground/90">{why}</p>
        </div>
        
        {/* Facteurs critiques */}
        {highImpactDrivers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5" />
              Facteurs critiques
            </div>
            <div className="space-y-1.5">
              {highImpactDrivers.map(driver => (
                <div key={driver.id} className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                  <span className="text-sm font-medium">{driver.label}</span>
                  <span className="text-sm text-muted-foreground">{driver.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Guardrails */}
        {guardrails.length > 0 && (level === 'ELEVE' || level === 'CRITIQUE') && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5" />
              Points de vigilance
            </div>
            <ul className="space-y-1 text-sm text-foreground/80">
              {guardrails.slice(0, 4).map((g, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Options coach */}
        {coachRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5" />
              Options coach
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coachRecommendations.map((rec, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {rec}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Mode staff : détails complets */}
        {isStaffMode && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="drivers" className="border-none">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Info className="w-3 h-3" />
                  Détail des facteurs
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {drivers.map(driver => (
                    <div key={driver.id} className="text-xs space-y-1 p-2 rounded bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{driver.label}</span>
                        <span className="text-muted-foreground">{driver.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Contribution: {driver.component}%</span>
                        <span>Poids: {(driver.weight * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={driver.component} className="h-1" />
                      <p className="text-muted-foreground italic">{driver.explanation}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* Disclaimer */}
        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground/70 italic">
            {disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
