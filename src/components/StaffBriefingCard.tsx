/**
 * Staff Briefing Card - Two For Coaching Lab
 * Module C: Composant UI pour le briefing staff automatique
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  ClipboardCopy, 
  ChevronDown, 
  ChevronUp,
  Target,
  Bike,
  PersonStanding,
  Apple,
  AlertTriangle,
  Calendar,
  CheckSquare,
  FileText,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

import { 
  computeStaffBriefing, 
  formatBriefingForClipboard, 
  type StaffBriefing,
  type ComputeStaffBriefingParams 
} from "@/lib/staffBriefing";

// =============================================
// TYPES
// =============================================

interface StaffBriefingCardProps {
  params: ComputeStaffBriefingParams;
  mode?: "compact" | "full";
}

// =============================================
// COMPOSANT
// =============================================

export function StaffBriefingCard({ params, mode = "compact" }: StaffBriefingCardProps) {
  const [isExpanded, setIsExpanded] = useState(mode === "full");
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    pacing: mode === "full",
    nutrition: mode === "full",
    alerts: true,
    weekPlan: mode === "full",
    checklist: mode === "full",
  });

  const briefing = useMemo(() => computeStaffBriefing(params), [params]);

  const toggleSection = (section: string) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopyBriefing = async () => {
    const text = formatBriefingForClipboard(briefing);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Briefing copié dans le presse-papier");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  // Données insuffisantes
  if (briefing.isDataInsufficient) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Briefing Staff – 2FC Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-warning">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Données insuffisantes</p>
              <ul className="text-sm mt-1 text-muted-foreground">
                {briefing.missingFields.map((field, i) => (
                  <li key={i}>• {field}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Warning sport
  if (briefing.sportWarning) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Briefing Staff – 2FC Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-warning">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="font-medium">{briefing.sportWarning}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode compact
  if (mode === "compact" && !isExpanded) {
    return (
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Briefing Staff
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopyBriefing}>
                <ClipboardCopy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Résumé ultra-compact */}
          <div className="text-sm">
            <span className="font-medium">Priorité:</span>{" "}
            <Badge variant="outline" className="ml-1">{briefing.executiveSummary.priority}</Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/30">
              <div className="text-muted-foreground">Nutrition</div>
              <div className="font-medium">{briefing.nutrition.riskBadge}</div>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="text-muted-foreground">Économie</div>
              <div className="font-medium">{briefing.executiveSummary.economyLabel}</div>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="text-muted-foreground">Alertes</div>
              <div className="font-medium">{briefing.alerts.length}</div>
            </div>
          </div>

          {/* Alertes critiques uniquement */}
          {briefing.alerts.filter(a => a.severity === "critical").length > 0 && (
            <div className="mt-2">
              {briefing.alerts.filter(a => a.severity === "critical").map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <span>{alert.icon}</span>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Mode complet / expandé
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Briefing Staff – 2FC Lab
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyBriefing}>
              <ClipboardCopy className="h-4 w-4 mr-1" />
              Copier
            </Button>
            {mode === "compact" && (
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {briefing.objectif} | {briefing.sport === "triathlon" ? "Triathlon" : briefing.sport === "cap" ? "Course à pied" : "Vélo"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 1) Résumé exécutif */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Résumé exécutif (30 sec)</span>
          </div>
          <p className="text-sm whitespace-pre-line">{briefing.executiveSummary.template}</p>
        </div>

        {/* 2) Pacing Vélo */}
        {briefing.pacingVelo && (
          <Collapsible open={sectionsOpen.pacing} onOpenChange={() => toggleSection("pacing")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Pacing Vélo</span>
                <Badge variant="secondary" className="text-xs">{briefing.pacingVelo.ifRange} FTP</Badge>
              </div>
              {sectionsOpen.pacing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6">
              <ul className="text-sm space-y-1">
                {briefing.pacingVelo.consignes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 3) Pacing CAP */}
        {briefing.pacingCAP && (
          <Collapsible open={sectionsOpen.pacing} onOpenChange={() => toggleSection("pacing")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
              <div className="flex items-center gap-2">
                <PersonStanding className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Pacing Course</span>
              </div>
              {sectionsOpen.pacing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6">
              <p className="text-sm font-medium mb-2">{briefing.pacingCAP.strategie}</p>
              {briefing.pacingCAP.limites.length > 0 && (
                <ul className="text-sm space-y-1">
                  {briefing.pacingCAP.limites.map((l, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* 4) Nutrition */}
        <Collapsible open={sectionsOpen.nutrition} onOpenChange={() => toggleSection("nutrition")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
            <div className="flex items-center gap-2">
              <Apple className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-sm">Nutrition</span>
              <Badge 
                variant={briefing.nutrition.riskBadge === "OK" ? "secondary" : briefing.nutrition.riskBadge === "Élevé" || briefing.nutrition.riskBadge === "HIGH" ? "destructive" : "default"}
                className="text-xs"
              >
                {briefing.nutrition.riskBadge}
              </Badge>
            </div>
            {sectionsOpen.nutrition ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Glucides:</span>{" "}
              <span className="font-medium">{briefing.nutrition.carbsRange}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Timing:</span>{" "}
              {briefing.nutrition.phases.map((p, i) => (
                <span key={i}>
                  {i > 0 && " | "}
                  <span className="font-medium">{p.name}:</span> {p.value}
                </span>
              ))}
            </div>
            {briefing.nutrition.warning && (
              <p className="text-sm text-warning">{briefing.nutrition.warning}</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* 5) Alertes */}
        {briefing.alerts.length > 0 && (
          <Collapsible open={sectionsOpen.alerts} onOpenChange={() => toggleSection("alerts")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-medium text-sm">Alertes prioritaires</span>
                <Badge variant="outline" className="text-xs">{briefing.alerts.length}</Badge>
              </div>
              {sectionsOpen.alerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {briefing.alerts.map((alert, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded border ${
                    alert.severity === "critical" 
                      ? "bg-destructive/10 border-destructive/30" 
                      : "bg-warning/10 border-warning/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{alert.icon}</span>
                    <span>{alert.message}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">→ {alert.action}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* 6) Plan mini-semaine */}
        <Collapsible open={sectionsOpen.weekPlan} onOpenChange={() => toggleSection("weekPlan")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">Plan mini-semaine</span>
            </div>
            {sectionsOpen.weekPlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6">
            <ol className="text-sm space-y-2">
              {briefing.weekPlan.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-medium text-primary">{i + 1}.</span>
                  <div>
                    <span className="font-medium">{item.seance}</span>
                    {item.description && (
                      <span className="text-muted-foreground"> – {item.description}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* 7) Checklist course */}
        <Collapsible open={sectionsOpen.checklist} onOpenChange={() => toggleSection("checklist")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded px-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Checklist course</span>
            </div>
            {sectionsOpen.checklist ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6">
            <ol className="text-sm space-y-1">
              {briefing.checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer */}
        <div className="pt-2 text-xs text-muted-foreground text-center">
          Généré le {new Date(briefing.generatedAt).toLocaleDateString("fr-FR", { 
            day: "numeric", 
            month: "long", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </CardContent>
    </Card>
  );
}
