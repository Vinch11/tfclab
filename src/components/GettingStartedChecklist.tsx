// =============================================
// CHECKLIST DE DÉMARRAGE
// Guide les nouveaux coachs étape par étape
// =============================================

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  User,
  Target,
  Activity,
  FileUp,
  BookOpen,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import type { DbSnapshot, DbCheckin } from "@/hooks/useCloudData";

// =============================================
// TYPES
// =============================================

// Athlete simplifié pour ce composant (Cloud DB format)
interface AthleteData {
  id: string;
  name: string;
  goal?: string | null;
}

interface ExtraSignals {
  /** VLamax effective résolue (estimateur CAP / vélo / labo).
   *  Permet de valider l'étape "import test" même quand snapshot.vlamax brut est null. */
  vlamaxEffective?: number | null;
}

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isComplete: (
    athlete: AthleteData | null,
    snapshot: DbSnapshot | null,
    extra?: ExtraSignals
  ) => boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  tip?: string;
}

interface GettingStartedChecklistProps {
  athlete: AthleteData | null;
  snapshot: DbSnapshot | null;
  /** Signaux dérivés (ex: VLamax effective issue de l'estimateur). */
  extraSignals?: ExtraSignals;
  onNavigateToProfile: () => void;
  onNavigateToTests: () => void;
  onNavigateToAcademy: () => void;
  onDismiss?: () => void;
  className?: string;
}

// Hook pour gérer la visibilité du guide de manière persistante
export function useGettingStartedVisibility() {
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem("getting-started-hidden") === "true";
  });

  const hide = () => {
    localStorage.setItem("getting-started-hidden", "true");
    setIsHidden(true);
  };

  const show = () => {
    localStorage.removeItem("getting-started-hidden");
    localStorage.removeItem("getting-started-dismissed");
    setIsHidden(false);
  };

  return { isHidden, hide, show };
}

// =============================================
// MAIN COMPONENT
// =============================================

export function GettingStartedChecklist({
  athlete,
  snapshot,
  extraSignals,
  onNavigateToProfile,
  onNavigateToTests,
  onNavigateToAcademy,
  onDismiss,
  className = "",
}: GettingStartedChecklistProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    const dismissed = localStorage.getItem("getting-started-dismissed");
    const hidden = localStorage.getItem("getting-started-hidden");
    return dismissed === "true" || hidden === "true";
  });

  // Définir les étapes de la checklist
  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: "create-athlete",
        title: "Créer un athlète",
        description: "Ajoute ton premier athlète avec son nom et objectif",
        icon: <User className="w-4 h-4" />,
        isComplete: (a) => !!a,
        tip: "Commence par le nom et l'objectif principal (Ironman, Marathon...)",
      },
      {
        id: "set-objective",
        title: "Définir l'objectif",
        description: "Choisis la course cible et le niveau d'ambition",
        icon: <Target className="w-4 h-4" />,
        isComplete: (a) => !!(a as AthleteData)?.goal,
        action: {
          label: "Configurer",
          onClick: onNavigateToProfile,
        },
        tip: "L'ambition (Finisher, Age Group, Compétiteur) ajuste les cibles physiologiques",
      },
      {
        id: "add-ftp",
        title: "Renseigner les données de base",
        description: "Ajoute FTP/VMA/CSS et poids pour calibrer les zones",
        icon: <Activity className="w-4 h-4" />,
        isComplete: (_, s) => !!(s?.weight_kg && (s?.ftp || s?.vma || s?.css)),
        action: {
          label: "Compléter le profil",
          onClick: onNavigateToProfile,
        },
        tip: "Au moins une référence d'intensité (FTP, VMA ou CSS) + le poids",
      },
      {
        id: "import-test",
        title: "Importer un test ou fichier FIT",
        description: "Analyse un effort pour estimer VLamax et TTE",
        icon: <FileUp className="w-4 h-4" />,
        isComplete: (_, s, extra) =>
          !!(
            s?.vlamax ||
            (s as any)?.vlamax_run ||
            s?.tte_observed_min ||
            (s as any)?.tte_observed_min_run ||
            (s as any)?.sprint_15s_distance ||
            s?.vo2max ||
            (extra?.vlamaxEffective != null && extra.vlamaxEffective > 0)
          ),
        action: {
          label: "Aller aux tests",
          onClick: onNavigateToTests,
        },
        tip: "Un test de 20 min ou un effort long suffit pour démarrer",
      },
      {
        id: "read-academy",
        title: "Découvrir l'Academy",
        description: "Comprendre les métriques et leur interprétation",
        icon: <BookOpen className="w-4 h-4" />,
        isComplete: () => {
          const visited = localStorage.getItem("academy-visited");
          return visited === "true";
        },
        action: {
          label: "Ouvrir l'Academy",
          onClick: () => {
            localStorage.setItem("academy-visited", "true");
            onNavigateToAcademy();
          },
        },
        tip: "L'Academy explique comment interpréter chaque métrique",
      },
    ],
    [onNavigateToProfile, onNavigateToTests, onNavigateToAcademy]
  );

  // Calculer la progression
  const completedSteps = steps.filter((step) =>
    step.isComplete(athlete, snapshot, extraSignals)
  );
  const progress = Math.round((completedSteps.length / steps.length) * 100);
  const isAllComplete = progress === 100;

  // Gérer la fermeture définitive
  const handleDismiss = () => {
    localStorage.setItem("getting-started-hidden", "true");
    localStorage.setItem("getting-started-dismissed", "true");
    setIsDismissed(true);
    onDismiss?.();
  };

  // Reset pour debugging (exposé via le hook useGettingStartedVisibility)
  const handleReset = () => {
    localStorage.removeItem("getting-started-hidden");
    localStorage.removeItem("getting-started-dismissed");
    localStorage.removeItem("academy-visited");
    setIsDismissed(false);
  };

  // Ne pas afficher si déjà fermé
  if (isDismissed) {
    return null;
  }

  // Affichage "tout complet"
  if (isAllComplete) {
    return (
      <Card className={`border-green-500/30 bg-green-500/5 ${className}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  Configuration terminée !
                </p>
                <p className="text-sm text-muted-foreground">
                  Ton espace coaching est prêt à l'emploi
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Bien démarrer</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedSteps.length}/{steps.length} étapes complétées
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {progress}%
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 mt-3" />
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 pb-4">
            <div className="space-y-3">
              {steps.map((step) => {
                const isComplete = step.isComplete(athlete, snapshot);
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      isComplete
                        ? "bg-accent/50 border border-accent"
                        : "bg-muted/30 border border-transparent hover:border-muted"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`mt-0.5 ${
                        isComplete
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1 rounded ${
                            isComplete
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {step.icon}
                        </span>
                        <p
                          className={`font-medium text-sm ${
                            isComplete
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {step.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      {step.tip && !isComplete && (
                        <p className="text-xs text-primary/80 mt-1.5 italic">
                          💡 {step.tip}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {step.action && !isComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={step.action.onClick}
                        className="shrink-0 text-xs h-7"
                      >
                        {step.action.label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Tu peux fermer ce guide une fois familiarisé
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-muted-foreground"
              >
                Fermer le guide
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default GettingStartedChecklist;
