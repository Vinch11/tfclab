// =============================================
// COMPOSANT ANALYSE PHYSIOLOGIQUE ÉLITE
// =============================================

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import {
  analysePhysiologiqueComplete,
  TestVLamaxResult,
  getStatusColor,
  getStatusBgColor
} from "@/lib/physiologicalModel";
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  Heart,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { VLamaxEffectif, getSourceColor as getVLamaxSourceColor, getConfidenceLabel } from "@/lib/vlamaxEffectif";
import { TTEEffectif, getSourceColor as getTTESourceColor, getSourceLabel } from "@/lib/tteEffectif";
import { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { cn } from "@/lib/utils";

interface PhysiologicalAnalysisProps {
  athlete: Athlete;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  readiness?: RaceReadinessEffectif;
  onGoToSnapshots?: () => void;
}

export function PhysiologicalAnalysis({ athlete, vlamaxEffectif: vlamaxEffectifProp, tteEffectif: tteEffectifProp, readiness: readinessProp, onGoToSnapshots }: PhysiologicalAnalysisProps) {
  const snapshot = getDernierSnapshot(athlete);
  
  // ✅ VLamax EFFECTIF - Utilise la prop si fournie, sinon fallback
  const vlamaxEffectif = vlamaxEffectifProp ?? { 
    value: null, 
    source: "unknown" as const, 
    confidence: 0, 
    label: "VLamax (non disponible)" 
  };
  
  // Construire les tests pour l'analyse (compatibilité avec le modèle existant)
  const tests: TestVLamaxResult[] = useMemo(() => {
    // Si VLamax effectif a une valeur, on l'utilise
    if (vlamaxEffectif.value !== null) {
      return [{
        nom: vlamaxEffectif.label,
        vlamax: vlamaxEffectif.value,
        fiabilite: vlamaxEffectif.confidence,
        date: new Date().toISOString()
      }];
    }
    
    // Sinon pas de test
    return [];
  }, [vlamaxEffectif]);

  const vo2max = athlete.vo2max || snapshot?.vo2max || 50;
  
  const analyse = useMemo(() => 
    analysePhysiologiqueComplete(tests, vo2max, athlete.objectif),
    [tests, vo2max, athlete.objectif]
  );

  const getInterpretationIcon = () => {
    switch (analyse.interpretation.status) {
      case "optimal": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "low": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "high": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeanceIcon = (status: string) => {
    if (status === "prioritaire") return <Zap className="h-4 w-4 text-green-500" />;
    if (status === "limitée") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  if (!snapshot) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun snapshot disponible pour l'analyse physiologique.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Debug VLamax + TTE source */}
      <div className="flex flex-wrap gap-4">
        {vlamaxEffectif.value !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">VLamax:</span>
            <span className="font-mono font-bold">{vlamaxEffectif.value.toFixed(2)}</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getVLamaxSourceColor(vlamaxEffectif.source))}>
              {vlamaxEffectif.source}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(vlamaxEffectif.confidence * 100)}%
            </span>
          </div>
        )}
        
        {tteEffectifProp && tteEffectifProp.tte_min !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">TTE:</span>
            <span className="font-mono font-bold">{tteEffectifProp.tte_min} min</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getTTESourceColor(tteEffectifProp.source))}>
              {getSourceLabel(tteEffectifProp.source)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(tteEffectifProp.confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Header avec SPM */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Score Performance Métabolique
              </CardTitle>
              <CardDescription>Analyse VLamax pondérée avec indice de confiance</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {analyse.spm}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={analyse.spm} className="h-3 mb-4" />
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* VLamax pondérée */}
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">VLamax pondérée</div>
              <div className="text-2xl font-bold text-primary">
                {analyse.vlamaxPonderee?.toFixed(2) || "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                Cible: {analyse.cible.min}-{analyse.cible.max}
              </div>
            </div>
            
            {/* Indice de confiance */}
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Confiance</div>
              <div className={`text-2xl font-bold ${analyse.confiance >= 70 ? 'text-green-500' : analyse.confiance >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {analyse.confiance}%
              </div>
              <div className="text-xs text-muted-foreground">
                {tests.length} test{tests.length > 1 ? 's' : ''}
              </div>
            </div>
            
            {/* VO2max */}
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">VO2max</div>
              <div className="text-2xl font-bold text-blue-500">
                {vo2max}
              </div>
              <div className="text-xs text-muted-foreground">ml/kg/min</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interprétation */}
      <Card className={getStatusBgColor(analyse.interpretation.status)}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            {getInterpretationIcon()}
            <div>
              <div className={`font-semibold ${getStatusColor(analyse.interpretation.status)}`}>
                {analyse.interpretation.message}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {analyse.interpretation.conseil}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition des séances */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Répartition Séances A/B/C/D
          </CardTitle>
          <CardDescription>{analyse.repartition.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {/* Séance A */}
            <div className="flex items-center gap-2 p-2 rounded-lg border">
              {getSeanceIcon(analyse.repartition.A.status)}
              <div>
                <div className="font-medium text-sm">A - Fondamentales</div>
                <div className="text-xs text-muted-foreground">
                  {analyse.repartition.A.icon} {analyse.repartition.A.label}
                </div>
              </div>
            </div>
            
            {/* Séance B */}
            <div className="flex items-center gap-2 p-2 rounded-lg border">
              {getSeanceIcon(analyse.repartition.B.status)}
              <div>
                <div className="font-medium text-sm">B - Développement</div>
                <div className="text-xs text-muted-foreground">
                  {analyse.repartition.B.icon} {analyse.repartition.B.label}
                </div>
              </div>
            </div>
            
            {/* Séance C */}
            <div className="flex items-center gap-2 p-2 rounded-lg border">
              {getSeanceIcon(analyse.repartition.C.status)}
              <div>
                <div className="font-medium text-sm">C - Spécifiques</div>
                <div className="text-xs text-muted-foreground">
                  {analyse.repartition.C.icon} {analyse.repartition.C.label}
                </div>
              </div>
            </div>
            
            {/* Séance D */}
            <div className="flex items-center gap-2 p-2 rounded-lg border">
              {getSeanceIcon(analyse.repartition.D.status)}
              <div>
                <div className="font-medium text-sm">D - Récupération</div>
                <div className="text-xs text-muted-foreground">
                  {analyse.repartition.D.icon} {analyse.repartition.D.label}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Stratégie :</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {analyse.repartition.strategie}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
