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
import { Zap, Ban, Info, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TrainingPrescription } from "@/engines/decision";
import type { AthleteDiagnostic } from "@/engines/diagnostic";


interface LeviersSectionProps {
  diagnostic: AthleteDiagnostic;
  prescription: TrainingPrescription;
  className?: string;
}

// Explications pédagogiques par levier (clés = LorangLever IDs)
const LEVER_PEDAGOGY: Record<string, {
  description: string;
  howItWorks: string;
  typicalSessions: string;
}> = {
  // Lorang lever keys
  z2_volume: {
    description: "Augmenter le volume d'entraînement en zone 2 (endurance fondamentale) pour développer la base aérobie, abaisser la VLamax et renforcer le TTE.",
    howItWorks: "Le travail prolongé à basse intensité stimule les mitochondries, améliore l'oxydation des graisses et réduit progressivement la dépendance au glycogène.",
    typicalSessions: "Sorties longues Z2 (2-4h vélo, 1h30-2h30 CAP), semaines à haut volume.",
  },
  threshold_work: {
    description: "Travail au seuil (FTP/seuil lactique) pour repousser la puissance/allure soutenable sur longue durée et améliorer le FTP/kg.",
    howItWorks: "Les intervalles au seuil augmentent la capacité à recycler le lactate et améliorent le TTE (Time To Exhaustion). C'est le levier principal pour augmenter le FTP/kg.",
    typicalSessions: "Intervalles tempo 10-20min, sweet spot 2x20min, SST continu.",
  },
  vo2_intervals: {
    description: "Intervalles à haute intensité (VO2max) pour développer la puissance maximale aérobie.",
    howItWorks: "Des efforts de 3-5min à 90-105% de la PMA/VMA forcent les adaptations cardiovasculaires et améliorent le transport d'oxygène.",
    typicalSessions: "5x4min à 100-105% PMA, 6x3min à 105-110% VMA, billat 30/30.",
  },
  force_max: {
    description: "Renforcement neuromusculaire en salle pour développer la force maximale et l'économie de mouvement.",
    howItWorks: "Le travail de force lourde recrute les fibres rapides, améliore la coordination intermusculaire et augmente l'économie de mouvement à intensité sous-maximale.",
    typicalSessions: "Gym lourde 85-95% 1RM, 3-5 reps, 2-3 séries, 1-2x/semaine.",
  },
  sfr_force_endurance: {
    description: "Travail à basse cadence (SFR) pour développer la force endurance et réduire la sollicitation glycolytique.",
    howItWorks: "Le pédalage à basse cadence (40-60 rpm) en zone Sweet Spot/Tempo force le recrutement musculaire sans solliciter excessivement la glycolyse rapide.",
    typicalSessions: "Blocs 10-20min à 40-60 rpm en Sweet Spot, 2-3x/semaine.",
  },
  train_low: {
    description: "Entraînement à jeun ou en glycogène bas pour maximiser les adaptations métaboliques aux graisses.",
    howItWorks: "Entraîner le corps en état de déplétion glycogénique force l'organisme à optimiser l'utilisation des graisses comme carburant principal.",
    typicalSessions: "Sorties Z2 à jeun le matin, séances « sleep low / train low ».",
  },
  gut_training: {
    description: "Entraînement de la tolérance digestive pour augmenter l'apport glucidique en course.",
    howItWorks: "La progression contrôlée de l'apport en glucides pendant l'entraînement adapte le système digestif et permet d'absorber plus d'énergie en compétition.",
    typicalSessions: "Progression 60 → 90 → 110 g/h sur sorties longues, simulation nutrition course.",
  },
  heat_training: {
    description: "Acclimatation à la chaleur pour améliorer la thermorégulation et les performances en conditions chaudes.",
    howItWorks: "Le stress thermique modéré provoque des adaptations (volume plasmatique, sudation) qui améliorent la performance même en conditions tempérées.",
    typicalSessions: "30-45 min en stress thermique modéré, 10-14 jours de protocole.",
  },
  hrv_adaptation: {
    description: "Adaptation automatique du plan basée sur la variabilité cardiaque (HRV) pour éviter le surmenage.",
    howItWorks: "Quand la HRV est hors plage 2 jours consécutifs, la séance clé est remplacée par du Z2 pour laisser le système nerveux récupérer.",
    typicalSessions: "Remplacement séance clé par Z2 60-90min, réévaluation après 24-48h.",
  },
  // Legacy keys (fallback)
  volume_z2: {
    description: "Augmenter le volume d'entraînement en zone 2 pour développer la base aérobie.",
    howItWorks: "Le travail prolongé à basse intensité stimule les mitochondries et améliore l'oxydation des graisses.",
    typicalSessions: "Sorties longues Z2 (2-4h vélo, 1h30-2h30 CAP).",
  },
  vo2max_intervals: {
    description: "Intervalles à haute intensité (VO2max) pour développer la puissance maximale aérobie.",
    howItWorks: "Des efforts de 3-5min à 90-105% de la PMA/VMA forcent les adaptations cardiovasculaires.",
    typicalSessions: "5x4min à 100-105% PMA, billat 30/30.",
  },
};

export function LeviersSection({ diagnostic, prescription, className }: LeviersSectionProps) {
  const navigate = useNavigate();
  const { strategy, executiveSummary, roadmap } = prescription;
  const levers = strategy.levers;
  const prohibitions = strategy.prohibitions;
  

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
