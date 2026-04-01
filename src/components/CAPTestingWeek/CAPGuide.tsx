/**
 * CAPGuide — Interactive step-by-step guide for Nolio import + CAP Testing Week
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Upload,
  FlaskConical,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Timer,
  Footprints,
  Zap,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface GuideStep {
  id: string;
  number: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  action?: { label: string; route: string };
}

interface GuidePhase {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline";
  description: string;
  steps: GuideStep[];
  tip?: string;
}

const PHASES: GuidePhase[] = [
  {
    id: "import",
    title: "Importer les données Nolio",
    icon: <Upload className="h-5 w-5" />,
    badge: "Phase 1",
    badgeVariant: "secondary",
    description: "Récupérez vos données physiologiques depuis Nolio pour alimenter le moteur V2.",
    steps: [
      {
        id: "s1",
        number: 1,
        label: "Aller dans l'onglet Profil",
        description: "Dashboard → sélectionner votre athlète → onglet Profil",
        icon: <ExternalLink className="h-4 w-4" />,
        action: { label: "Ouvrir Profil", route: "/" },
      },
      {
        id: "s2",
        number: 2,
        label: "Ouvrir l'importateur CSV Nolio",
        description: "Cliquer sur le bouton « Importer CSV Nolio » dans la section haute du profil.",
        icon: <Upload className="h-4 w-4" />,
      },
      {
        id: "s3",
        number: 3,
        label: "Sélectionner le fichier CSV",
        description: "Choisir le fichier exporté depuis Nolio (vélo et/ou course à pied).",
        icon: <BookOpen className="h-4 w-4" />,
      },
      {
        id: "s4",
        number: 4,
        label: "Vérifier les données parsées",
        description: "Graphiques de puissance, VMA, allures — tout s'affiche dans la carte d'analyse.",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        id: "s5",
        number: 5,
        label: "Préremplir le Snapshot",
        description: "Cliquer « Préremplir Snapshot » pour injecter les données dans le profil actif.",
        icon: <Zap className="h-4 w-4" />,
      },
      {
        id: "s6",
        number: 6,
        label: "Modifier si nécessaire",
        description:
          "Les données restent accessibles dans la carte Analyse Nolio — modifiez et cliquez « Appliquer au snapshot » à tout moment.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
    tip: "L'importation Nolio capture 11 champs dont les puissances granulaires (P1s→P5min), la VMA et la qualité du protocole.",
  },
  {
    id: "tests",
    title: "Semaine Test CAP",
    icon: <FlaskConical className="h-5 w-5" />,
    badge: "Phase 2",
    badgeVariant: "default",
    description: "Réalisez les 3 tests terrain dans l'ordre recommandé, avec 1 jour de repos entre chaque.",
    steps: [
      {
        id: "t1",
        number: 1,
        label: "D1 — Sprint 15s (×3 tentatives)",
        description:
          "Capacité anaérobie : courir la distance maximale en 15 secondes. Garder le meilleur des 3 essais → alimente l'estimation VLamax.",
        icon: <Zap className="h-4 w-4" />,
      },
      {
        id: "t2",
        number: 2,
        label: "D2 — Repos",
        description: "Récupération complète entre les tests. Hydratation et nutrition optimales.",
        icon: <Timer className="h-4 w-4" />,
      },
      {
        id: "t3",
        number: 3,
        label: "D3 — VMA 6 minutes",
        description:
          "Puissance aérobie maximale : courir à vitesse maximale soutenable sur 6 minutes. Distance ÷ 0.1 = VMA.",
        icon: <Footprints className="h-4 w-4" />,
      },
      {
        id: "t4",
        number: 4,
        label: "D4 — Repos",
        description: "Récupération complète. Préparer la séance seuil du lendemain.",
        icon: <Timer className="h-4 w-4" />,
      },
      {
        id: "t5",
        number: 5,
        label: "D5 — Seuil 20-30 minutes",
        description:
          "Allure critique : maintenir l'allure la plus rapide tenable 20 à 30 min. Donne le pace seuil /km.",
        icon: <Footprints className="h-4 w-4" />,
      },
    ],
    tip: "Cliquez sur chaque jour dans le programme ci-dessous pour ouvrir le formulaire de saisie. Les résultats alimentent directement le snapshot et le moteur V2.",
  },
  {
    id: "verify",
    title: "Vérification",
    icon: <CheckCircle2 className="h-5 w-5" />,
    badge: "Phase 3",
    badgeVariant: "outline",
    description: "Confirmez que le moteur V2 utilise le Score G complet et non l'estimation dégradée.",
    steps: [
      {
        id: "v1",
        number: 1,
        label: "Vérifier la source VLamax",
        description:
          "Retourner au Dashboard → la VLamax doit afficher « Score G CAP » comme source (pas « estimation dégradée »).",
        icon: <BarChart3 className="h-4 w-4" />,
        action: { label: "Ouvrir Dashboard", route: "/" },
      },
      {
        id: "v2",
        number: 2,
        label: "Contrôler la progression",
        description:
          "La carte « Profil CAP — Données Actuelles » en haut de cette page affiche votre % de complétion.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
    tip: "Combiner les données Nolio vélo + semaine test CAP donne la meilleure précision possible grâce à la fusion duale vélo/course du moteur V2.",
  },
];

export function CAPGuide() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const togglePhase = (phaseId: string) => {
    setExpandedPhase((prev) => (prev === phaseId ? null : phaseId));
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const totalSteps = PHASES.reduce((sum, p) => sum + p.steps.length, 0);
  const doneSteps = completedSteps.size;
  const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      {/* Collapsed header */}
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Guide pas à pas
          </CardTitle>
          <div className="flex items-center gap-2">
            {doneSteps > 0 && (
              <Badge variant="secondary" className="text-xs">
                {doneSteps}/{totalSteps} étapes
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {!isOpen && (
          <p className="text-xs text-muted-foreground mt-1">
            Import Nolio → Tests terrain → Vérification — {progressPct}% complété
          </p>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 pt-0">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progression globale</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Phases */}
          {PHASES.map((phase) => {
            const phaseStepsDone = phase.steps.filter((s) =>
              completedSteps.has(s.id)
            ).length;
            const phaseComplete = phaseStepsDone === phase.steps.length;
            const isExpanded = expandedPhase === phase.id;

            return (
              <div
                key={phase.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  phaseComplete
                    ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                    : "border-border bg-card"
                )}
              >
                {/* Phase header */}
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => togglePhase(phase.id)}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      phaseComplete
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {phaseComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      phase.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={phase.badgeVariant} className="text-[10px] px-1.5 py-0">
                        {phase.badge}
                      </Badge>
                      <span className="font-medium text-sm truncate">
                        {phase.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {phase.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {phaseStepsDone}/{phase.steps.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Steps */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    <Separator className="mb-2" />
                    {phase.steps.map((step) => {
                      const done = completedSteps.has(step.id);
                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-start gap-3 p-2.5 rounded-md transition-colors cursor-pointer hover:bg-muted/50",
                            done && "opacity-60"
                          )}
                          onClick={() => toggleStep(step.id)}
                        >
                          {/* Checkbox circle */}
                          <div
                            className={cn(
                              "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                              done
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-muted-foreground/40"
                            )}
                          >
                            {done && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {step.icon}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  done && "line-through"
                                )}
                              >
                                {step.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {step.description}
                            </p>
                          </div>
                          {step.action && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-xs h-7 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(step.action!.route);
                              }}
                            >
                              {step.action.label}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {/* Tip */}
                    {phase.tip && (
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30 mt-2">
                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {phase.tip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
