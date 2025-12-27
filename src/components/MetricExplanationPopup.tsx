import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, Zap, Timer, Wind, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricType = "VLamax" | "TTE" | "VO2max" | "Seuil" | "FTP" | "Confiance";

interface MetricExplanationPopupProps {
  metric: MetricType;
  children?: React.ReactNode;
  className?: string;
}

const explanations: Record<MetricType, { icon: React.ElementType; title: string; description: string; impact: string }> = {
  VLamax: {
    icon: Zap,
    title: "VLamax",
    description: "Vitesse maximale de production de lactate. Mesure la puissance anaérobie glycolytique.",
    impact: "Une VLamax élevée favorise les efforts courts et explosifs. Pour l'endurance longue (Ironman), une VLamax basse (< 0.35) est préférable."
  },
  TTE: {
    icon: Timer,
    title: "Time To Exhaustion",
    description: "Durée maximale à une intensité donnée (généralement au seuil). Indicateur clé de l'endurance.",
    impact: "Un TTE > 60 min indique une excellente capacité d'endurance. Utile pour planifier les séances longues."
  },
  VO2max: {
    icon: Wind,
    title: "VO2max",
    description: "Capacité maximale d'absorption d'oxygène. Détermine le plafond aérobie de performance.",
    impact: "Plus la VO2max est élevée, plus le potentiel d'endurance est grand. Se travaille par intervalles à haute intensité."
  },
  Seuil: {
    icon: Flame,
    title: "Seuil Lactique",
    description: "Intensité où le lactate s'accumule rapidement dans le sang (environ 4 mmol/L).",
    impact: "Au-dessus du seuil, la fatigue s'accumule rapidement. L'objectif est de repousser ce seuil le plus haut possible."
  },
  FTP: {
    icon: Flame,
    title: "Functional Threshold Power",
    description: "Puissance maximale soutenable pendant 1 heure. Référence pour les zones d'entraînement vélo.",
    impact: "Le FTP en W/kg est un indicateur clé de performance. Se travaille par des intervalles tempo et seuil."
  },
  Confiance: {
    icon: Info,
    title: "Score de Confiance",
    description: "Fiabilité des données basée sur la complétude et l'ancienneté des informations.",
    impact: "Un score > 80% indique des données fiables. La confiance diminue de 1% par semaine depuis le dernier test."
  }
};

export function MetricExplanationPopup({ metric, children, className }: MetricExplanationPopupProps) {
  const data = explanations[metric];
  const Icon = data.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <button className={cn("p-1 rounded-full hover:bg-secondary/50 transition-colors", className)}>
            <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-card border-border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">{data.title}</h4>
            <p className="text-sm text-muted-foreground mb-3">{data.description}</p>
            <div className="p-2 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-accent">Impact :</span> {data.impact}
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
