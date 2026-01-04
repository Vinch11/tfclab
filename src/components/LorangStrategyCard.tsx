// =============================================
// LORANG STRATEGY CARD
// Affichage transparent et pédagogique du moteur
// Two 4 Coaching Strategy Engine – Age aware
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, 
  ChevronRight, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  TrendingDown,
  TrendingUp,
  Timer,
  Zap,
  Activity,
  Shield,
  HelpCircle,
  Database,
  Clock,
  Brain
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  StrategyResult, 
  getPriorityColor, 
  getPriorityBgColor,
  getConfidenceColor,
  SessionGuidance
} from "@/lib/lorangStrategyEngine";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LorangStrategyCardProps {
  strategy: StrategyResult;
  athleteName?: string;
  objectif?: string;
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "VLAMAX_DOWN": return TrendingDown;
    case "VLAMAX_UP": return TrendingUp;
    case "TTE_UP": return Timer;
    case "FTP_UTIL": return Zap;
    case "ENDURANCE_UP": return Activity;
    case "VITESSE_UP": return Zap;
    case "MAINTENANCE": return Shield;
    default: return Target;
  }
};

export function LorangStrategyCard({ strategy, athleteName, objectif }: LorangStrategyCardProps) {
  const [showExplanation, setShowExplanation] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [showDataSource, setShowDataSource] = useState(false);

  const PriorityIcon = getPriorityIcon(strategy.priority);

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn("pb-4", getPriorityBgColor(strategy.priority))}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl bg-background/50", getPriorityColor(strategy.priority))}>
              <PriorityIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-1">
                <Brain className="w-4 h-4 text-primary" />
                Two 4 Coaching Strategy Engine
              </CardTitle>
              <p className="text-xs text-muted-foreground">Age aware</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {athleteName && `${athleteName} • `}{objectif}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn("text-xs", getConfidenceColor(strategy.confidence))}>
              Confiance: {strategy.confidence}%
            </Badge>
            {strategy.ageContext.age !== null && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {strategy.ageContext.age} ans
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Priorité principale */}
        <div className={cn("p-4 rounded-xl border", getPriorityBgColor(strategy.priority))}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{strategy.priorityIcon}</span>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Priorité d'entraînement</p>
              <p className={cn("text-xl font-bold", getPriorityColor(strategy.priority))}>
                {strategy.priorityLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Contexte âge */}
        {strategy.ageContext.category && strategy.ageContext.category !== "young" && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">
                Adaptation âge — {strategy.ageContext.toleranceLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {strategy.ageContext.vlamaxRiskLabel}
              {strategy.ageContext.nutritionCritical && " • Nutrition critique"}
              {strategy.ageContext.freshnessEmphasis && " • Fraîcheur prioritaire"}
            </p>
          </div>
        )}

        {/* Confiance et avertissement */}
        {strategy.confidenceMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">Niveau de confiance: {strategy.confidenceLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">{strategy.confidenceMessage}</p>
            </div>
          </div>
        )}

        {/* Alertes */}
        {strategy.alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              Analyse des indicateurs
            </p>
            <div className="space-y-1.5">
              {strategy.alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30">
                  <span className="text-primary mt-0.5">→</span>
                  <span className="text-foreground">{alert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explication pédagogique */}
        <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{strategy.explanation.title}</span>
            </div>
            {showExplanation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <p className="text-sm text-foreground">{strategy.explanation.context}</p>
              <p className="text-sm text-muted-foreground">{strategy.explanation.whatItMeans}</p>
              <p className="text-sm text-primary font-medium">{strategy.explanation.benefit}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Recommandations de séances */}
        <Collapsible open={showSessions} onOpenChange={setShowSessions}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Orientations de séances</span>
            </div>
            {showSessions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            {/* Recommandées */}
            <SessionSection 
              title="Séances recommandées" 
              sessions={strategy.sessions.recommended}
              icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
              badgeColor="bg-emerald-400/10 text-emerald-400 border-emerald-400/30"
            />
            
            {/* À limiter */}
            {strategy.sessions.limited.length > 0 && (
              <SessionSection 
                title="À limiter" 
                sessions={strategy.sessions.limited}
                icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
                badgeColor="bg-amber-400/10 text-amber-400 border-amber-400/30"
              />
            )}
            
            {/* À éviter */}
            {strategy.sessions.avoid.length > 0 && (
              <SessionSection 
                title="À éviter" 
                sessions={strategy.sessions.avoid}
                icon={<XCircle className="w-4 h-4 text-red-400" />}
                badgeColor="bg-red-400/10 text-red-400 border-red-400/30"
              />
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Traçabilité des sources */}
        <Collapsible open={showDataSource} onOpenChange={setShowDataSource}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Traçabilité des sources</span>
            </div>
            {showDataSource ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-3 gap-3">
              <SourceBadge 
                label="VLamax" 
                source={strategy.dataSource.vlamax.source}
                confidence={strategy.dataSource.vlamax.confidence}
              />
              <SourceBadge 
                label="TTE" 
                source={strategy.dataSource.tte.source}
                confidence={strategy.dataSource.tte.confidence}
              />
              <SourceBadge 
                label="FTP" 
                source={strategy.dataSource.ftp.source}
                confidence={strategy.dataSource.ftp.confidence}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// =============================================
// COMPOSANTS INTERNES
// =============================================

function SessionSection({ 
  title, 
  sessions, 
  icon, 
  badgeColor 
}: { 
  title: string; 
  sessions: SessionGuidance[]; 
  icon: React.ReactNode;
  badgeColor: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-2 ml-6">
        {sessions.map((session, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm">{session.type}</span>
              <Badge variant="outline" className={cn("text-xs shrink-0", badgeColor)}>
                {session.recommendation === "recommended" ? "✓" : session.recommendation === "limited" ? "⚠" : "✗"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{session.description}</p>
            <p className="text-xs text-primary/80 italic">{session.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ 
  label, 
  source, 
  confidence 
}: { 
  label: string; 
  source: string; 
  confidence: number;
}) {
  const sourceLabel = source === "test" ? "Test" : source === "snapshot" ? "Snapshot" : source === "estimated" ? "Estimé" : source;
  
  return (
    <div className="p-2 rounded-lg bg-muted/30 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{sourceLabel}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        <Progress value={confidence} className="h-1 w-12" />
        <span className={cn("text-xs", getConfidenceColor(confidence))}>{confidence}%</span>
      </div>
    </div>
  );
}
