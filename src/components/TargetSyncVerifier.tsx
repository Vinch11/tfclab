/**
 * TargetSyncVerifier - Vérifie la synchronisation des cibles entre Compass et Race Readiness
 * Composant de test visuel pour valider l'uniformisation des cibles
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Target, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgeAdjustedTargets } from "@/lib/ageAdjustment";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { getRaceReadinessTargets } from "@/lib/raceReadinessEffectif";

interface TargetSyncVerifierProps {
  objectif: string;
  athleteAge: number | null;
  ambition?: AmbitionLevel;
  className?: string;
}

export function TargetSyncVerifier({ 
  objectif, 
  athleteAge, 
  ambition = DEFAULT_AMBITION,
  className 
}: TargetSyncVerifierProps) {
  const comparison = useMemo(() => {
    // Cibles du Compass (source: ageAdjustment.ts)
    const compassTargets = getAgeAdjustedTargets(objectif, athleteAge, ambition);
    
    const rrTargets = getRaceReadinessTargets(objectif, athleteAge, ambition);
    
    // Vérifier la synchronisation
    const tteSynced = compassTargets.tteTarget === rrTargets.tteTarget;
    const vlamaxSynced = Math.abs(compassTargets.vlamaxOptimal - rrTargets.vlamaxIdeal) < 0.01;
    const ftpKgSynced = Math.abs(compassTargets.ftpKgTarget - rrTargets.ftpKgTarget) < 0.1;
    
    const allSynced = tteSynced && vlamaxSynced && ftpKgSynced;
    
    return {
      compassTargets,
      rrTargets,
      tteSynced,
      vlamaxSynced,
      ftpKgSynced,
      allSynced,
    };
  }, [objectif, athleteAge, ambition]);
  
  const ambDef = getAmbitionDefinition(ambition);
  
  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Test de synchronisation des cibles
          </CardTitle>
          <Badge 
            variant={comparison.allSynced ? "default" : "destructive"}
            className={cn(
              "text-xs",
              comparison.allSynced && "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
            )}
          >
            {comparison.allSynced ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Synchronisé
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Désynchronisé
              </>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Objectif: {objectif} • {ambDef.label} • {athleteAge !== null ? `${athleteAge} ans` : "Âge non renseigné"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Table de comparaison */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="font-medium text-muted-foreground">Métrique</div>
          <div className="font-medium text-muted-foreground flex items-center gap-1">
            <Compass className="h-3 w-3" /> Compass
          </div>
          <div className="font-medium text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" /> Race Readiness
          </div>
          <div className="font-medium text-muted-foreground text-center">Sync</div>
          
          {/* TTE */}
          <div className="font-medium">TTE cible</div>
          <div className="font-mono">{comparison.compassTargets.tteTarget} min</div>
          <div className="font-mono">{comparison.rrTargets.tteTarget} min</div>
          <div className="text-center">
            {comparison.tteSynced ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive inline" />
            )}
          </div>
          
          {/* VLamax */}
          <div className="font-medium">VLamax optimal</div>
          <div className="font-mono">{comparison.compassTargets.vlamaxOptimal.toFixed(2)}</div>
          <div className="font-mono">{comparison.rrTargets.vlamaxIdeal.toFixed(2)}</div>
          <div className="text-center">
            {comparison.vlamaxSynced ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive inline" />
            )}
          </div>
          
          {/* FTP/kg */}
          <div className="font-medium">FTP/kg cible</div>
          <div className="font-mono">{comparison.compassTargets.ftpKgTarget.toFixed(1)}</div>
          <div className="font-mono">{comparison.rrTargets.ftpKgTarget.toFixed(1)}</div>
          <div className="text-center">
            {comparison.ftpKgSynced ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive inline" />
            )}
          </div>
        </div>
        
        {/* Note explicative */}
        <p className="text-[10px] text-muted-foreground pt-2 border-t">
          Les cibles doivent être identiques entre le Metabolic Performance Compass™ et Race Readiness
          pour garantir la cohérence des évaluations physiologiques.
        </p>
      </CardContent>
    </Card>
  );
}
