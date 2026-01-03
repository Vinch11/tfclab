import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Flame, Target, Beaker, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlycolyticRiskExplanationProps {
  variant?: "tooltip" | "modal" | "inline";
  triggerClassName?: string;
  children?: React.ReactNode;
}

const RISK_SCALE = [
  { range: "0–25", level: "Faible", description: "Profil endurant, faible dépendance glucidique", color: "bg-success/20 text-success border-success/30" },
  { range: "26–50", level: "Modéré", description: "Équilibre correct, nutrition stratégique", color: "bg-warning/20 text-warning border-warning/30" },
  { range: "51–75", level: "Élevé", description: "Dépendance glucidique importante", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" },
  { range: "76–100", level: "Critique", description: "Risque de défaillance énergétique", color: "bg-destructive/20 text-destructive border-destructive/30" },
];

const SCIENTIFIC_SOURCES = [
  "Modèles énergétiques (Mader, INSCYD-like)",
  "Relations VLamax ↔ oxydation glucidique",
  "Concepts utilisés par Dan Lorang, WKO, INSCYD",
  "Données terrain + logique staff (pas boîte noire)",
];

function ExplanationContent() {
  return (
    <div className="space-y-5">
      {/* Introduction */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Flame className="w-6 h-6 text-primary mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-foreground mb-2">
            Qu'est-ce que le risque glycolytique ?
          </h4>
          <p className="text-sm text-muted-foreground">
            Le risque glycolytique est un indicateur de la <strong className="text-foreground">dépendance de l'athlète aux glucides</strong> à l'intensité cible de son objectif.
          </p>
        </div>
      </div>

      {/* Composantes */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Il combine :
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>Le <strong className="text-foreground">VLamax</strong> (vitesse de production du lactate)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>Le <strong className="text-foreground">TTE</strong> (capacité à maintenir une intensité élevée)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>La <strong className="text-foreground">durée et l'intensité</strong> de l'épreuve visée</span>
          </li>
        </ul>
      </div>

      {/* Signification */}
      <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
        <p className="text-sm text-foreground">
          <strong>Un risque élevé</strong> signifie que l'athlète utilise rapidement ses réserves de glucides et peut rencontrer une baisse de performance si la nutrition et l'endurance ne sont pas adaptées.
        </p>
      </div>

      {/* Utilité */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">
            Cet indicateur n'est pas un jugement de performance
          </h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          C'est un outil d'aide à la décision pour :
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">✓</span>
            <span>Orienter l'entraînement (endurance vs glycolytique)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">✓</span>
            <span>Ajuster la stratégie nutritionnelle</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success font-bold">✓</span>
            <span>Sécuriser la performance le jour de course</span>
          </li>
        </ul>
      </div>

      {/* Échelle */}
      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          📊 Échelle du risque glycolytique
        </h4>
        <div className="grid gap-2">
          {RISK_SCALE.map((item) => (
            <div
              key={item.range}
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                item.color
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm">{item.range}</span>
                <span className="font-semibold">{item.level}</span>
              </div>
              <span className="text-xs opacity-80">{item.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fondements scientifiques */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Beaker className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">
            🔒 Pourquoi cette échelle est solide scientifiquement
          </h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Elle s'appuie sur :</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {SCIENTIFIC_SOURCES.map((source, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>{source}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function GlycolyticRiskExplanation({
  variant = "modal",
  triggerClassName,
  children,
}: GlycolyticRiskExplanationProps) {
  const defaultTrigger = (
    <button
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors",
        triggerClassName
      )}
    >
      <Info className="w-3.5 h-3.5" />
      <span>Comprendre ce score</span>
    </button>
  );

  if (variant === "tooltip") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {children || defaultTrigger}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Risque glycolytique</p>
            <p className="text-xs text-muted-foreground">
              Indicateur de dépendance aux glucides combinant VLamax, TTE et durée de l'épreuve.
            </p>
            <p className="text-xs text-muted-foreground">
              Un risque élevé = utilisation rapide des réserves glucidiques.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "inline") {
    return (
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">
            Comprendre le risque glycolytique
          </h3>
        </div>
        <ExplanationContent />
      </div>
    );
  }

  // Modal variant (default)
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Risque glycolytique — Explication
          </DialogTitle>
        </DialogHeader>
        <ExplanationContent />
      </DialogContent>
    </Dialog>
  );
}
