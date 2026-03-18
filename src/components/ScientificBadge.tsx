/**
 * ScientificBadge - Badge de transparence scientifique
 * Affiche l'origine des données (Mesurée, Estimée, Modélisée)
 * avec un tooltip explicatif standardisé
 */

import { useState } from "react";
import { BookOpen, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { ScoreSource, ConfidenceLabel } from "@/lib/scoreEnvelope";

// =============================================
// TYPES
// =============================================

export type DataOrigin = "MEASURED" | "ESTIMATED" | "MODELLED" | "DERIVED" | "UNKNOWN";

export interface ScientificMetadata {
  origin: DataOrigin;
  method: string;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  limitations: string;
  academySection?: string;
}

interface ScientificBadgeProps {
  metadata: ScientificMetadata;
  metricName: string;
  compact?: boolean;
  showWarning?: boolean;
  className?: string;
}

// =============================================
// CONFIGURATION - Labels et couleurs
// =============================================

const ORIGIN_CONFIG: Record<DataOrigin, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  MEASURED: {
    label: "Mesurée",
    emoji: "🧪",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    description: "Donnée issue d'une mesure directe (test labo, protocole standardisé)"
  },
  ESTIMATED: {
    label: "Estimée",
    emoji: "📐",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    description: "Donnée issue d'un test terrain ou d'une estimation fiable"
  },
  MODELLED: {
    label: "Modélisée",
    emoji: "🧠",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100/70 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    description: "Donnée calculée à partir de modèles physiologiques"
  },
  DERIVED: {
    label: "Dérivée",
    emoji: "📊",
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700",
    description: "Donnée calculée à partir d'autres métriques"
  },
  UNKNOWN: {
    label: "Inconnue",
    emoji: "❓",
    color: "text-muted-foreground",
    bgColor: "bg-muted border-muted",
    description: "Origine des données non déterminée"
  }
};

// =============================================
// TEXTES PÉDAGOGIQUES OFFICIELS
// =============================================

export const PEDAGOGICAL_TEXTS: Record<string, {
  short: string;
  academySection: string;
}> = {
  vlamax: {
    short: "La VLamax représente la vitesse maximale de production du lactate. Dans Two For Coaching Lab, elle est estimée à partir de tests terrain et de modèles physiologiques reconnus lorsque la mesure directe n'est pas disponible.",
    academySection: "vlamax"
  },
  tte: {
    short: "Le TTE (Time To Exhaustion) représente la capacité à maintenir une intensité proche du seuil. Il est rarement mesuré directement ; il est donc modélisé à partir de données d'entraînement et de performance.",
    academySection: "tte"
  },
  fatigue: {
    short: "La fatigue est une estimation multifactorielle intégrant charge récente, durabilité et récupération. Elle ne correspond pas à un diagnostic médical.",
    academySection: "fatigue"
  },
  race_readiness: {
    short: "Le Potentiel Physiologique évalue la cohérence entre le profil physiologique et l'objectif de course. C'est un indicateur de préparation, pas une garantie de performance.",
    academySection: "race_readiness"
  },
  ftp: {
    short: "Le FTP (Functional Threshold Power) représente la puissance maximale soutenable sur une heure. Il peut être mesuré via test ou estimé à partir de données récentes.",
    academySection: "ftp"
  },
  vo2max: {
    short: "La VO2max représente la consommation maximale d'oxygène. Sa mesure précise nécessite un test en laboratoire ; les estimations terrain restent approximatives.",
    academySection: "vo2max"
  }
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function ScientificBadge({
  metadata,
  metricName,
  compact = false,
  showWarning = true,
  className
}: ScientificBadgeProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  const config = ORIGIN_CONFIG[metadata.origin] || ORIGIN_CONFIG.UNKNOWN;
  const pedagogicalText = PEDAGOGICAL_TEXTS[metricName.toLowerCase()];
  const needsCaution = showWarning && metadata.confidence < 0.6;

  const handleOpenAcademy = () => {
    setIsDialogOpen(false);
    const section = pedagogicalText?.academySection || metadata.academySection || metricName.toLowerCase();
    navigate(`/academy?section=${section}`);
  };

  // Mode compact : juste l'emoji + label court
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer text-xs font-normal gap-1 border",
                config.bgColor,
                config.color,
                className
              )}
              onClick={() => setIsDialogOpen(true)}
            >
              <span>{config.emoji}</span>
              <span>{config.label}</span>
              {needsCaution && <AlertTriangle className="w-3 h-3 ml-0.5 text-amber-500" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquer pour plus de détails</p>
          </TooltipContent>
        </Tooltip>

        <ScientificDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          metadata={metadata}
          metricName={metricName}
          config={config}
          pedagogicalText={pedagogicalText}
          needsCaution={needsCaution}
          onOpenAcademy={handleOpenAcademy}
        />
      </TooltipProvider>
    );
  }

  // Mode normal : badge cliquable avec warning si nécessaire
  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant="outline" 
          className={cn(
            "cursor-pointer text-xs font-normal gap-1.5 border px-2.5 py-1",
            config.bgColor,
            config.color
          )}
          onClick={() => setIsDialogOpen(true)}
        >
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </Badge>
        
        {needsCaution && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Interprétation prudente</span>
          </span>
        )}
      </div>

      <ScientificDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        metadata={metadata}
        metricName={metricName}
        config={config}
        pedagogicalText={pedagogicalText}
        needsCaution={needsCaution}
        onOpenAcademy={handleOpenAcademy}
      />
    </>
  );
}

// =============================================
// DIALOG EXPLICATIF STANDARDISÉ
// =============================================

interface ScientificDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: ScientificMetadata;
  metricName: string;
  config: typeof ORIGIN_CONFIG.MEASURED;
  pedagogicalText?: { short: string; academySection: string };
  needsCaution: boolean;
  onOpenAcademy: () => void;
}

function ScientificDialog({
  isOpen,
  onOpenChange,
  metadata,
  metricName,
  config,
  pedagogicalText,
  needsCaution,
  onOpenAcademy
}: ScientificDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{config.emoji}</span>
            Comment cette valeur est obtenue
          </DialogTitle>
          <DialogDescription>
            Transparence scientifique pour {metricName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Texte pédagogique si disponible */}
          {pedagogicalText && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-sm text-foreground">
                  {pedagogicalText.short}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Informations structurées */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Origine</span>
              <Badge 
                variant="outline" 
                className={cn("gap-1", config.bgColor, config.color)}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </Badge>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Méthode</span>
              <span className="text-sm text-right max-w-[60%]">{metadata.method}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fiabilité</span>
              <span className="text-sm font-medium">{metadata.confidenceLabel}</span>
            </div>

            <div>
              <span className="text-sm text-muted-foreground block mb-1">Limites principales</span>
              <p className="text-sm text-foreground/80">{metadata.limitations}</p>
            </div>
          </div>

          {/* Warning si confiance faible */}
          {needsCaution && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Interprétation prudente recommandée.</strong> La confiance dans cette donnée est limitée. 
                  Utilisez-la comme indicateur directionnel, pas comme valeur absolue.
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Message de clôture */}
          <p className="text-xs text-muted-foreground italic text-center">
            Cette donnée est une aide à la décision, pas une vérité physiologique absolue.
          </p>

          {/* Bouton Academy */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onOpenAcademy}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Comprendre cette métrique
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// BADGE WARNING DISCRET (pour confidence < 0.6)
// =============================================

export function LowConfidenceWarning({ 
  confidence,
  className 
}: { 
  confidence: number;
  className?: string;
}) {
  if (confidence >= 0.6) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400",
            className
          )}>
            <AlertTriangle className="w-3 h-3" />
            <span>Prudence</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">
            ⚠️ Interprétation prudente recommandée. 
            La confiance dans cette donnée est inférieure à 60%.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================
// HELPERS - Création de métadonnées depuis ScoreSource
// =============================================

export function createScientificMetadata(
  source: ScoreSource,
  confidence: number,
  confidenceLabel: ConfidenceLabel,
  options?: {
    method?: string;
    limitations?: string;
    academySection?: string;
  }
): ScientificMetadata {
  const defaults: Record<ScoreSource, { method: string; limitations: string }> = {
    MEASURED: {
      method: "Mesure directe en laboratoire ou test standardisé",
      limitations: "Dépend du protocole et de l'état du jour"
    },
    ESTIMATED: {
      method: "Test terrain ou estimation via algorithme validé",
      limitations: "Précision moindre qu'une mesure directe"
    },
    MODELLED: {
      method: "Calcul basé sur modèles physiologiques",
      limitations: "Approximation basée sur des hypothèses moyennes"
    },
    DERIVED: {
      method: "Calcul à partir d'autres métriques",
      limitations: "Dépend de la fiabilité des données sources"
    },
    UNKNOWN: {
      method: "Méthode non spécifiée",
      limitations: "Origine des données inconnue"
    }
  };

  const origin = source as DataOrigin;
  const sourceDefaults = defaults[source] || defaults.UNKNOWN;

  return {
    origin,
    method: options?.method || sourceDefaults.method,
    confidence,
    confidenceLabel,
    limitations: options?.limitations || sourceDefaults.limitations,
    academySection: options?.academySection
  };
}

export default ScientificBadge;
