// =============================================
// GUIDE INTERACTIF - Complétion des données manquantes
// Navigation directe vers les formulaires appropriés
// =============================================

import { useState } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Zap, 
  Timer, 
  Weight, 
  Activity,
  Target,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DataField {
  key: string;
  label: string;
  description: string;
  priority: "critical" | "important" | "recommended";
  icon: React.ReactNode;
  value: number | string | null | undefined;
  unit?: string;
  section: "power" | "metabolic" | "running" | "body";
  testProtocol?: string;
}

interface DataCompletionGuideProps {
  snapshot: {
    ftp?: number | null;
    weight_kg?: number | null;
    vlamax?: number | null;
    vlamax_run?: number | null;
    tte_observed_min?: number | null;
    tss_7d?: number | null;
    vo2max?: number | null;
    pmax_5s?: number | null;
    p30s_w?: number | null;
    p60s_w?: number | null;
    map5min_w?: number | null;
    vma?: number | null;
    css?: number | null;
    fc_max?: number | null;
  } | null;
  athleteGoal: string;
  onNavigateToProfile: () => void;
  onNavigateToCAPTest?: () => void;
  onNavigateToTFCLTest?: () => void;
  className?: string;
}

const PRIORITY_CONFIG = {
  critical: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    label: "Critique",
    badgeVariant: "destructive" as const,
  },
  important: {
    color: "text-warning-foreground",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    label: "Important",
    badgeVariant: "outline" as const,
  },
  recommended: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    label: "Recommandé",
    badgeVariant: "secondary" as const,
  },
};

function getDataFields(snapshot: DataCompletionGuideProps["snapshot"], goal: string): DataField[] {
  const isTriathlon = ["IM", "Ironman", "70.3", "703", "TriathlonLD"].includes(goal);
  const isRunning = ["Marathon", "Semi", "Course", "Trail"].includes(goal);
  
  const fields: DataField[] = [
    // CRITICAL - Core metabolic data
    {
      key: "vlamax",
      label: "VLamax Vélo",
      description: "Capacité glycolytique - détermine le profil métabolique et les zones d'entraînement",
      priority: isTriathlon ? "critical" : isRunning ? "recommended" : "critical",
      icon: <Zap className="h-4 w-4" />,
      value: snapshot?.vlamax,
      unit: "mmol/L/s",
      section: "metabolic",
      testProtocol: "TFCL Testing Week",
    },
    {
      key: "tte",
      label: "TTE (Time To Exhaustion)",
      description: "Durabilité au seuil - clé pour la planification des blocs d'intensité",
      priority: "critical",
      icon: <Timer className="h-4 w-4" />,
      value: snapshot?.tte_observed_min,
      unit: "min",
      section: "metabolic",
      testProtocol: "Test TTE 20-40min",
    },
    {
      key: "ftp",
      label: "FTP (Functional Threshold Power)",
      description: "Puissance au seuil fonctionnel - base de calcul des zones vélo",
      priority: isRunning ? "recommended" : "critical",
      icon: <Activity className="h-4 w-4" />,
      value: snapshot?.ftp,
      unit: "W",
      section: "power",
      testProtocol: "Test FTP 20min ou Ramp",
    },
    {
      key: "weight_kg",
      label: "Poids",
      description: "Nécessaire pour calculer le rapport W/kg et les cibles de nutrition",
      priority: "important",
      icon: <Weight className="h-4 w-4" />,
      value: snapshot?.weight_kg,
      unit: "kg",
      section: "body",
    },
    
    // IMPORTANT - Power profile
    {
      key: "pmax_5s",
      label: "Pmax 5s",
      description: "Puissance maximale sprint - utilisée pour l'estimation VLamax",
      priority: "important",
      icon: <Zap className="h-4 w-4" />,
      value: snapshot?.pmax_5s,
      unit: "W",
      section: "power",
      testProtocol: "Sprint 5s all-out",
    },
    {
      key: "p30s_w",
      label: "P30s",
      description: "Puissance moyenne sur 30s - indice glycolytique",
      priority: "important",
      icon: <Activity className="h-4 w-4" />,
      value: snapshot?.p30s_w,
      unit: "W",
      section: "power",
      testProtocol: "Test Wingate 30s",
    },
    
    // Running specific
    ...(isTriathlon || isRunning ? [
      {
        key: "vlamax_run",
        label: "VLamax CAP",
        description: "Capacité glycolytique spécifique course à pied",
        priority: "critical" as const,
        icon: <Zap className="h-4 w-4" />,
        value: snapshot?.vlamax_run,
        unit: "mmol/L/s",
        section: "running" as const,
        testProtocol: "CAP Testing Week",
      },
      {
        key: "vma",
        label: "VMA",
        description: "Vitesse Maximale Aérobie - référence pour les allures d'entraînement",
        priority: "important" as const,
        icon: <Target className="h-4 w-4" />,
        value: snapshot?.vma,
        unit: "km/h",
        section: "running" as const,
        testProtocol: "Test VMA terrain",
      },
    ] : []),
    
    // RECOMMENDED - Additional data
    {
      key: "vo2max",
      label: "VO₂max",
      description: "Consommation maximale d'oxygène - indicateur de capacité aérobie",
      priority: "recommended",
      icon: <Activity className="h-4 w-4" />,
      value: snapshot?.vo2max,
      unit: "ml/kg/min",
      section: "metabolic",
      testProtocol: "Test labo ou estimation",
    },
    {
      key: "fc_max",
      label: "FC Max",
      description: "Fréquence cardiaque maximale - utilisée pour les zones cardio",
      priority: "recommended",
      icon: <Activity className="h-4 w-4" />,
      value: snapshot?.fc_max,
      unit: "bpm",
      section: "body",
      testProtocol: "Test terrain ou formule",
    },
  ];
  
  return fields;
}

export function DataCompletionGuide({
  snapshot,
  athleteGoal,
  onNavigateToProfile,
  onNavigateToCAPTest,
  onNavigateToTFCLTest,
  className,
}: DataCompletionGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const fields = getDataFields(snapshot, athleteGoal);
  const missingFields = fields.filter(f => f.value == null);
  const completedFields = fields.filter(f => f.value != null);
  
  const completionPercentage = Math.round((completedFields.length / fields.length) * 100);
  
  const criticalMissing = missingFields.filter(f => f.priority === "critical");
  const importantMissing = missingFields.filter(f => f.priority === "important");
  const recommendedMissing = missingFields.filter(f => f.priority === "recommended");
  
  const isComplete = missingFields.length === 0;
  const hasCriticalMissing = criticalMissing.length > 0;
  
  if (isComplete) {
    return (
      <Card className={cn("border-primary/30 bg-primary/5", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-primary">Profil complet</p>
              <p className="text-sm text-muted-foreground">
                Toutes les données essentielles sont renseignées
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary ml-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const renderFieldGroup = (title: string, fields: DataField[], priority: "critical" | "important" | "recommended") => {
    if (fields.length === 0) return null;
    
    const config = PRIORITY_CONFIG[priority];
    
    return (
      <Collapsible
        open={expandedSection === priority}
        onOpenChange={() => setExpandedSection(expandedSection === priority ? null : priority)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between p-3 h-auto",
              config.bgColor,
              config.borderColor,
              "border rounded-lg hover:opacity-90"
            )}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className={cn("h-4 w-4", config.color)} />
              <div className="text-left">
                <span className={cn("font-medium", config.color)}>{title}</span>
                <span className="text-muted-foreground ml-2">
                  ({fields.length} champ{fields.length > 1 ? "s" : ""})
                </span>
              </div>
            </div>
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              expandedSection === priority && "rotate-90"
            )} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2 space-y-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                {field.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{field.label}</span>
                  {field.unit && (
                    <Badge variant="outline" className="text-xs">
                      {field.unit}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {field.description}
                </p>
                {field.testProtocol && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {field.testProtocol}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };
  
  return (
    <Card className={cn(
      hasCriticalMissing ? "border-destructive/30" : "border-warning/30",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className={cn(
                "h-5 w-5",
                hasCriticalMissing ? "text-destructive" : "text-warning-foreground"
              )} />
              Données manquantes
            </CardTitle>
            <CardDescription className="mt-1">
              Complétez le profil pour débloquer les analyses avancées
            </CardDescription>
          </div>
          <Badge variant={hasCriticalMissing ? "destructive" : "secondary"}>
            {completionPercentage}%
          </Badge>
        </div>
        
        <Progress 
          value={completionPercentage} 
          className={cn(
            "h-2 mt-3",
            hasCriticalMissing && "[&>div]:bg-destructive"
          )}
        />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {renderFieldGroup("Données critiques", criticalMissing, "critical")}
        {renderFieldGroup("Données importantes", importantMissing, "important")}
        {renderFieldGroup("Données recommandées", recommendedMissing, "recommended")}
        
        {/* Quick Actions */}
        <div className="pt-3 border-t border-border/50 space-y-2">
          <Button 
            onClick={onNavigateToProfile}
            className="w-full"
            variant={hasCriticalMissing ? "default" : "secondary"}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Compléter le profil
          </Button>
          
          <div className="flex gap-2">
            {onNavigateToTFCLTest && (
              <Button 
                onClick={onNavigateToTFCLTest}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Tests TFCL
              </Button>
            )}
            {onNavigateToCAPTest && (
              <Button 
                onClick={onNavigateToCAPTest}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Tests CAP
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
