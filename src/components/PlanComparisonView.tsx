/**
 * Plan Comparison View Component
 * Displays side-by-side comparison of raw plan vs advised plan
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeftRight, 
  Copy, 
  FileText, 
  X, 
  RefreshCw, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Shield,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import type { AnnotationV2 } from "@/lib/annotationEngineV2";
import { 
  simulateAdvisedPlan, 
  generateComparisonText,
  type SessionDiff, 
  type ImpactSummary 
} from "@/lib/templates/planSuggestionSimulator";

// ============= SUB-COMPONENTS =============

function getSportBadgeColor(sport: string | undefined): string {
  if (!sport) return "bg-muted text-muted-foreground";
  const lower = sport.toLowerCase();
  if (lower.includes("natation") || lower.includes("swim")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (lower.includes("vélo") || lower.includes("bike")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run")) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (lower.includes("brick")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }
  return "bg-muted text-muted-foreground";
}

function SessionCardCompact({ 
  session, 
  isModified = false,
  diff,
  showDiffReason,
}: { 
  session: TemplateSession; 
  isModified?: boolean;
  diff?: SessionDiff;
  showDiffReason?: () => void;
}) {
  return (
    <div className={`border rounded-lg p-2 text-xs ${isModified ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card"}`}>
      <div className="flex items-start gap-2">
        <Badge className={`shrink-0 text-[10px] ${getSportBadgeColor(session.discipline || session.sport)}`}>
          {session.discipline || session.sport || "—"}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-medium text-foreground">{session.day}</span>
            {isModified && (
              <Badge variant="default" className="text-[9px] h-4 px-1">
                <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                Modifié
              </Badge>
            )}
          </div>
          {session.title && (
            <p className="text-muted-foreground truncate">{session.title}</p>
          )}
          {session.details && (
            <p className="text-muted-foreground/70 truncate text-[10px]">
              {session.details.slice(0, 60)}{session.details.length > 60 ? "..." : ""}
            </p>
          )}
          {isModified && diff && showDiffReason && (
            <button 
              onClick={showDiffReason}
              className="text-primary hover:underline flex items-center gap-0.5 mt-1"
            >
              <Info className="h-3 w-3" />
              Voir pourquoi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekComparisonRow({
  weekNumber,
  originalSessions,
  advisedSessions,
  diffs,
  onShowReason,
}: {
  weekNumber: number;
  originalSessions: TemplateSession[];
  advisedSessions: TemplateSession[];
  diffs: SessionDiff[];
  onShowReason: (diff: SessionDiff) => void;
}) {
  const hasChanges = diffs.length > 0;
  
  return (
    <div className={`border rounded-lg overflow-hidden ${hasChanges ? "border-primary/50" : ""}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${hasChanges ? "bg-primary/5" : "bg-muted/30"}`}>
        <span className="font-semibold text-sm">Semaine {weekNumber}</span>
        {hasChanges && (
          <Badge variant="secondary" className="text-xs">
            {diffs.length} modification{diffs.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 gap-0 divide-x divide-border">
        {/* Original */}
        <div className="p-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium mb-2">PLAN BRUT</p>
          {originalSessions.map((session, idx) => (
            <SessionCardCompact key={idx} session={session} />
          ))}
        </div>
        
        {/* Advised */}
        <div className="p-2 space-y-1.5 bg-muted/10">
          <p className="text-[10px] text-muted-foreground font-medium mb-2">PLAN CONSEILLÉ</p>
          {advisedSessions.map((session, idx) => {
            const diff = diffs.find(d => d.sessionIndex === idx);
            return (
              <SessionCardCompact 
                key={idx} 
                session={session} 
                isModified={!!diff}
                diff={diff}
                showDiffReason={diff ? () => onShowReason(diff) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ImpactSummaryCard({ impact }: { impact: ImpactSummary }) {
  const impacts = [
    { label: impact.glycolyticRiskReduction, icon: TrendingDown, color: "text-green-600" },
    { label: impact.durabilityImprovement, icon: Zap, color: "text-blue-600" },
    { label: impact.injuryRiskReduction, icon: Shield, color: "text-amber-600" },
    { label: impact.coherenceImprovement, icon: Target, color: "text-purple-600" },
    { label: impact.nutritionRiskReduction, icon: CheckCircle2, color: "text-emerald-600" },
  ].filter(i => i.label);
  
  if (impacts.length === 0) return null;
  
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Impact attendu si appliqué
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {impacts.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Fiabilité:</span>
          <Badge variant={impact.overallConfidence >= 70 ? "default" : "secondary"}>
            {impact.overallConfidence >= 70 ? "Élevée" : impact.overallConfidence >= 50 ? "Modérée" : "Limitée"}
          </Badge>
          {impact.overallConfidence < 60 && (
            <span className="text-[10px] text-amber-600">
              ⚠️ Suggestion à interpréter avec prudence
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DiffReasonDialog({ 
  diff, 
  open, 
  onClose 
}: { 
  diff: SessionDiff | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!diff) return null;
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Pourquoi cette modification ?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">S{diff.weekNumber}</Badge>
            <Badge variant="outline">{diff.sessionDay}</Badge>
          </div>
          
          {/* Before/After */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1">AVANT</p>
              <p className="text-sm font-medium">{diff.from.title || diff.from.type}</p>
              <p className="text-xs text-muted-foreground">{diff.from.duration.slice(0, 40)}</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
              <p className="text-[10px] text-primary mb-1">APRÈS</p>
              <p className="text-sm font-medium">{diff.to.title || diff.to.type}</p>
              <p className="text-xs text-muted-foreground">{diff.to.duration.slice(0, 40)}</p>
            </div>
          </div>
          
          {/* Reason */}
          <div className="bg-muted/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="font-medium text-sm">{diff.reason.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">{diff.reason.why}</p>
          </div>
          
          {/* Confidence */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Fiabilité:</span>
            <Badge variant="secondary">{diff.confidence >= 0.7 ? "Élevée" : diff.confidence >= 0.5 ? "Modérée" : "Limitée"}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============= MAIN COMPONENT =============

interface PlanComparisonViewProps {
  originalWeeks: TemplateWeek[];
  annotations: AnnotationV2[];
  onClose: () => void;
}

export function PlanComparisonView({ 
  originalWeeks, 
  annotations,
  onClose,
}: PlanComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<"brut" | "conseille" | "compare">("compare");
  const [selectedDiff, setSelectedDiff] = useState<SessionDiff | null>(null);
  
  // Generate simulated plan
  const simulation = useMemo(() => {
    return simulateAdvisedPlan(originalWeeks, annotations);
  }, [originalWeeks, annotations]);
  
  const { advisedWeeks, diffMap, impactSummary } = simulation;
  
  // Handle copy
  const handleCopyAdvised = () => {
    const text = generateComparisonText(originalWeeks, advisedWeeks, diffMap, impactSummary);
    navigator.clipboard.writeText(text);
    toast.success("Plan conseillé copié !");
  };
  
  const handleExportComparison = () => {
    const text = generateComparisonText(originalWeeks, advisedWeeks, diffMap, impactSummary);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparaison-plan-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comparaison exportée !");
  };
  
  if (diffMap.length === 0) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div className="flex-1">
            <p className="font-semibold">Aucune modification suggérée</p>
            <p className="text-sm text-muted-foreground">
              Le plan brut est cohérent avec le profil de l'athlète.
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              Comparaison Plan Brut / Plan Conseillé
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {diffMap.length} modification{diffMap.length > 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline">
              Fiabilité: {impactSummary.overallConfidence >= 70 ? "Élevée" : impactSummary.overallConfidence >= 50 ? "Modérée" : "Limitée"}
            </Badge>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              ⚠️ Simulation uniquement
            </Badge>
          </div>
          
          {/* Tabs for mobile */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="md:hidden">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="brut">Plan Brut</TabsTrigger>
              <TabsTrigger value="conseille">Conseillé</TabsTrigger>
              <TabsTrigger value="compare">Comparer</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Impact Summary */}
      <ImpactSummaryCard impact={impactSummary} />
      
      {/* Comparison View */}
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {originalWeeks.map((week, idx) => {
                const weekDiffs = diffMap.filter(d => d.weekNumber === week.weekNumber);
                const advisedWeek = advisedWeeks[idx];
                
                // Mobile: show based on tab
                if (activeTab === "brut") {
                  return (
                    <div key={week.weekNumber} className="md:hidden border rounded-lg p-3">
                      <p className="font-semibold text-sm mb-2">Semaine {week.weekNumber}</p>
                      <div className="space-y-1.5">
                        {week.sessions.map((s, i) => (
                          <SessionCardCompact key={i} session={s} />
                        ))}
                      </div>
                    </div>
                  );
                }
                
                if (activeTab === "conseille") {
                  return (
                    <div key={week.weekNumber} className="md:hidden border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">Semaine {week.weekNumber}</p>
                        {weekDiffs.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{weekDiffs.length} modif.</Badge>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {advisedWeek?.sessions.map((s, i) => {
                          const diff = weekDiffs.find(d => d.sessionIndex === i);
                          return (
                            <SessionCardCompact 
                              key={i} 
                              session={s} 
                              isModified={!!diff}
                              diff={diff}
                              showDiffReason={diff ? () => setSelectedDiff(diff) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Compare mode (default) or desktop
                return (
                  <WeekComparisonRow
                    key={week.weekNumber}
                    weekNumber={week.weekNumber}
                    originalSessions={week.sessions}
                    advisedSessions={advisedWeek?.sessions || []}
                    diffs={weekDiffs}
                    onShowReason={setSelectedDiff}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCopyAdvised}>
              <Copy className="h-4 w-4 mr-2" />
              Copier plan conseillé
            </Button>
            <Button variant="outline" onClick={handleExportComparison}>
              <FileText className="h-4 w-4 mr-2" />
              Exporter comparaison
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Ne rien appliquer
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3">
            ⚠️ Ce module est une simulation. Aucune modification n'est appliquée automatiquement. 
            Le coach décide de l'utilisation des suggestions.
          </p>
        </CardContent>
      </Card>
      
      {/* Diff Reason Dialog */}
      <DiffReasonDialog 
        diff={selectedDiff} 
        open={!!selectedDiff} 
        onClose={() => setSelectedDiff(null)} 
      />
    </div>
  );
}
