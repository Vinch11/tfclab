/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION LEVIERS — Dashboard Simplifié
 * 
 * Leviers d'action activés avec explications pédagogiques
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Ban, Info, ChevronRight, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TrainingPrescription } from "@/engines/decision";
import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { RoadmapPhase } from "@/lib/v2/strategicRoadmap";

interface LeviersSectionProps {
  diagnostic: AthleteDiagnostic;
  prescription: TrainingPrescription;
  className?: string;
}

// Explications pédagogiques par levier
const LEVER_PEDAGOGY: Record<string, {
  description: string;
  howItWorks: string;
  typicalSessions: string;
}> = {
  volume_z2: {
    description: "Augmenter le volume d'entraînement en zone 2 (endurance fondamentale) pour développer la base aérobie et abaisser la VLamax.",
    howItWorks: "Le travail prolongé à basse intensité stimule les mitochondries, améliore l'oxydation des graisses et réduit progressivement la dépendance au glycogène.",
    typicalSessions: "Sorties longues Z2 (2-4h vélo, 1h30-2h30 CAP), semaines à haut volume.",
  },
  threshold_work: {
    description: "Travail au seuil (FTP/seuil lactique) pour repousser la puissance/allure soutenable sur longue durée.",
    howItWorks: "Les intervalles au seuil augmentent la capacité à recycler le lactate et améliorent le TTE (Time To Exhaustion).",
    typicalSessions: "Intervalles tempo 10-20min, sweet spot 2x20min, SST continu.",
  },
  vo2max_intervals: {
    description: "Intervalles à haute intensité (VO2max) pour développer la puissance maximale aérobie.",
    howItWorks: "Des efforts de 3-5min à 90-105% de la PMA/VMA forcent les adaptations cardiovasculaires et améliorent le transport d'oxygène.",
    typicalSessions: "5x4min à 100-105% PMA, 6x3min à 105-110% VMA, billat 30/30.",
  },
  glycolytic_block: {
    description: "Bloc spécifique pour abaisser la VLamax : combinaison de volume Z2 élevé avec restriction des sprints et efforts explosifs.",
    howItWorks: "En supprimant les stimuli glycolytiques et en maximisant le volume aérobie, les fibres rapides se « reconvertissent » progressivement vers un métabolisme plus oxydatif.",
    typicalSessions: "Semaines à haut volume Z2 sans sprint, sorties longues avec effort stable.",
  },
  sprint_force: {
    description: "Travail de force et de sprint pour développer la puissance neuromusculaire et le W'.",
    howItWorks: "Les efforts maximaux courts recrutent les fibres rapides, améliorent la coordination intermusculaire et augmentent la réserve anaérobie (W').",
    typicalSessions: "Sprints 10-15s, départs arrêtés, musculation lourde, travail de force spécifique.",
  },
  norwegian_method: {
    description: "Méthode norvégienne : intervalles longs (4x8-16min) à intensité contrôlée au seuil 1 / seuil 2 pour développer le moteur aérobie.",
    howItWorks: "Ces longs intervalles à intensité sous-maximale produisent un stress métabolique élevé avec une fatigue neuromusculaire modérée, permettant une récupération rapide.",
    typicalSessions: "4x8min, 5x6min, 3x12min entre seuils 1 et 2.",
  },
  long_endurance: {
    description: "Endurance longue durée pour développer la durabilité et la résistance à la fatigue.",
    howItWorks: "Les sorties très longues (3h+) stimulent les adaptations musculaires profondes : densité capillaire, réserves de glycogène, résistance mécanique.",
    typicalSessions: "Sorties longues progressives, back-to-back weekends.",
  },
  economy_technique: {
    description: "Travail technique et d'économie de mouvement pour réduire le coût énergétique à une vitesse/puissance donnée.",
    howItWorks: "L'amélioration de la technique (foulée, pédalage, cadence) réduit la consommation d'oxygène. Chaque % d'économie gagné se traduit directement en endurance supplémentaire.",
    typicalSessions: "Gammes techniques, drills de foulée, travail de cadence, renforcement musculaire ciblé.",
  },
  train_low: {
    description: "Entraînement à jeun ou en glycogène bas pour maximiser les adaptations métaboliques aux graisses.",
    howItWorks: "Entraîner le corps en état de déplétion glycogénique force l'organisme à optimiser l'utilisation des graisses comme carburant principal.",
    typicalSessions: "Sorties Z2 à jeun le matin, séances « sleep low / train low ».",
  },
};

export function LeviersSection({ diagnostic, prescription, className }: LeviersSectionProps) {
  const navigate = useNavigate();
  const { strategy, executiveSummary, roadmap } = prescription;
  const levers = strategy.levers;
  const prohibitions = strategy.prohibitions;
  const phases: RoadmapPhase[] = roadmap?.phases ?? [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/5 to-green-600/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Leviers d'Action</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Les actions concrètes pour progresser
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              strategy.isRobust
                ? "border-green-500 text-green-700 dark:text-green-400"
                : "border-amber-500 text-amber-700 dark:text-amber-400"
            )}
          >
            {strategy.isRobust ? "Robuste" : "Marginal"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Action principale */}
        <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold">Action Principale</span>
          </div>
          <p className="text-sm font-medium">{strategy.primaryAction}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{strategy.whyThis}</p>
        </div>

        {/* Leviers activés */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Leviers activés ({levers.length})
          </p>
          
          {levers.map((lever, index) => {
            const pedagogy = LEVER_PEDAGOGY[lever.lever] || {
              description: lever.reason,
              howItWorks: "",
              typicalSessions: lever.prescription?.join(", ") || "",
            };

            return (
              <div
                key={lever.lever}
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5",
                        lever.priority === 1 ? "bg-primary text-primary-foreground" :
                        lever.priority === 2 ? "bg-secondary text-secondary-foreground" :
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      P{lever.priority}
                    </Badge>
                    <span className="text-sm font-semibold">{lever.label}</span>
                  </div>
                </div>

                {/* Explication */}
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {pedagogy.description}
                </p>

                {/* Comment ça marche */}
                {pedagogy.howItWorks && (
                  <div className="p-2.5 rounded-md bg-muted/50 mb-2">
                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">🔬 Mécanisme :</strong> {pedagogy.howItWorks}
                    </p>
                  </div>
                )}

                {/* Séances types */}
                {pedagogy.typicalSessions && (
                  <div className="p-2.5 rounded-md bg-primary/5">
                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">📋 Exemples :</strong> {pedagogy.typicalSessions}
                    </p>
                  </div>
                )}

                {/* Prescriptions spécifiques si disponibles */}
                {lever.prescription && lever.prescription.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lever.prescription.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Interdictions */}
        {prohibitions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              À éviter
            </p>
            {prohibitions.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <p className="text-xs font-medium text-destructive">{p.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sprint Ban */}
        {strategy.hasSprintBan && (
          <div className="p-3 rounded-lg border-2 border-destructive/30 bg-destructive/5 flex items-center gap-3">
            <Ban className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive">Sprint Ban Actif</p>
              <p className="text-xs text-muted-foreground">
                Les sprints et efforts explosifs (&lt; 30s) sont déconseillés car ils stimulent la glycolyse et augmentent la VLamax — l'inverse de ton objectif.
              </p>
            </div>
          </div>
        )}

        {/* Message athlète */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs font-semibold text-primary mb-1">💬 Message pour l'athlète</p>
          <p className="text-sm text-foreground leading-relaxed">
            {executiveSummary.athleteMessage}
          </p>
        </div>

        {/* CTA — Générer le plan IA */}
        <Button
          onClick={() => navigate("/planning")}
          className="w-full gap-2"
          size="lg"
        >
          <Sparkles className="h-4 w-4" />
          Générer le Plan d'Entraînement IA
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-muted">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {prescription.meta.disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
