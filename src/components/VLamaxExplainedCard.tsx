/**
 * VLamaxExplainedCard — Version pédagogique détaillée pour coachs
 * Explique clairement le VLamax, le choix du cluster et les implications pratiques
 * 
 * IMPORTANT: Cette carte utilise vlamaxEffectif comme SOURCE UNIQUE DE VÉRITÉ
 * et intègre l'ajustement par âge via le composant unifié VLamaxInterpretationPanel
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Zap,
  Info,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

import {
  computeVLamaxBikeV2Enhanced,
  VLamaxBikeV2EnhancedInput,
} from "@/lib/v2/vlamaxBikeV2Enhanced";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";

// ✅ Utilisation du composant unifié pour l'interprétation
import { VLamaxInterpretationPanel } from "@/components/VLamaxInterpretationPanel";

interface VLamaxExplainedCardProps {
  // Source unique de vérité — si fourni, utiliser cette valeur
  vlamaxEffectif?: VLamaxEffectif | null;
  // Fallback: données pour calcul V2 Enhanced
  input?: VLamaxBikeV2EnhancedInput;
  // Âge de l'athlète (en années)
  age?: number | null;
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite";
  targetVLamax?: { min: number; max: number };
}

// Mapping ambition → objectifs VLamax recommandés (ajustables selon âge)
const AMBITION_TARGETS: Record<string, { min: number; max: number; label: string; description: string }> = {
  "finisher": {
    min: 0.40,
    max: 0.65,
    label: "Finisher",
    description: "Objectif terminer l'épreuve. VLamax modérée acceptable, priorité à l'endurance de base."
  },
  "performance": {
    min: 0.32,
    max: 0.50,
    label: "Performance",
    description: "Objectif temps personnel. VLamax équilibrée pour optimiser l'intensité soutenue."
  },
  "podium": {
    min: 0.28,
    max: 0.42,
    label: "Podium AG",
    description: "Objectif podium age-group. VLamax basse nécessaire pour maintenir haut % FTP."
  },
  "elite": {
    min: 0.22,
    max: 0.35,
    label: "Élite / Pro",
    description: "Niveau élite. VLamax très basse pour maximiser l'efficacité métabolique."
  },
};

// ✅ La logique d'interprétation est maintenant dans VLamaxInterpretationPanel

export function VLamaxExplainedCard({
  vlamaxEffectif,
  input,
  age,
  ambitionLevel,
  targetVLamax,
}: VLamaxExplainedCardProps) {
  // ============================================
  // SOURCE UNIQUE DE VÉRITÉ: vlamaxEffectif
  // Si fourni, on l'utilise. Sinon fallback sur calcul V2
  // ============================================
  const hasEffectif = vlamaxEffectif && vlamaxEffectif.value !== null;
  
  // Calcul V2 Enhanced (fallback)
  const v2Result = input ? computeVLamaxBikeV2Enhanced(input) : null;
  
  // Valeur VLamax à afficher (source unique)
  const displayValue = hasEffectif 
    ? vlamaxEffectif!.value! 
    : v2Result?.value ?? 0;
  
  // Déterminer la cible selon l'ambition (ajustée pour l'âge si master)
  let effectiveTarget = targetVLamax || (ambitionLevel ? AMBITION_TARGETS[ambitionLevel] : undefined);
  
  // Ajuster les cibles pour les masters (tolérance plus large)
  if (effectiveTarget && age !== null && age !== undefined && age >= 40) {
    const ageOffset = age >= 50 ? 0.08 : 0.04;
    effectiveTarget = {
      ...effectiveTarget,
      min: effectiveTarget.min + ageOffset / 2,
      max: effectiveTarget.max + ageOffset,
    };
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          VLamax Vélo — Analyse Détaillée
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ✅ Section 1+2: Utilisation du composant unifié VLamaxInterpretationPanel */}
        <VLamaxInterpretationPanel
          vlamax={displayValue}
          age={age}
          sport="bike"
          objectif={input?.objectif || "IM"}
          targetRange={effectiveTarget ? [effectiveTarget.min, effectiveTarget.max] : undefined}
          showAgeContext={true}
          showActions={true}
        />

        {/* Section Qu'est-ce que VLamax ? */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-3 w-3" />
                Qu'est-ce que le VLamax ?
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>VLamax</strong> (Vitesse maximale de production de lactate) mesure la capacité 
              du système glycolytique à produire de l'énergie rapidement.
            </p>
            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="p-2 bg-cyan-500/10 rounded">
                <p className="font-medium text-cyan-700 dark:text-cyan-300">VLamax basse (&lt;0.40)</p>
                <p className="mt-1">Profil endurant. Idéal pour Ironman, marathon, ultra.</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <p className="font-medium text-red-700 dark:text-red-300">VLamax élevée (&gt;0.60)</p>
                <p className="mt-1">Profil explosif. Adapté sprint, piste, efforts courts.</p>
              </div>
            </div>
            <p>
              <strong>Important:</strong> VLamax élevé n'est ni bon ni mauvais — c'est une caractéristique 
              du profil métabolique qui doit être adaptée à l'objectif.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Estimation Two For Coaching Lab™ — Ne remplace pas un test lactate. 
            Interprétation coach requise.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
