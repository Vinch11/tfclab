import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
// =============================================
// COMPOSANT ANALYSE PHYSIOLOGIQUE ÉLITE
// + Section Économie de Course (CAP)
// + Section Nutrition Prédictive (g/h)
// =============================================

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { AmbitionLevel } from "@/types/ambitionLevel";
import {
  analysePhysiologiqueComplete,
  getLegacyStatusColor as getStatusColor,
  getLegacyStatusBgColor as getStatusBgColor,
} from "@/engines/diagnostic";
import type { TestVLamaxResult } from "@/engines/diagnostic";
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  Heart,
  AlertTriangle,
  CheckCircle,
  Info,
  Footprints,
  Apple,
  Flame
} from "lucide-react";
import { type VLamaxEffectif, toVLamaxEnvelope, type TTEEffectif, getTTESourceColor, getSourceLabel, toTTEEnvelope } from "@/engines/diagnostic";
import { VLamaxMetricRow } from "@/components/VLamaxStatusBadge";
import { cn } from "@/lib/utils";
import { getConfidenceLabelFromPercent, getConfidenceColorClassFromPercent } from "@/lib/confidenceDisplay";
import { getEconomyLabelStyle, getEconomyPotentielBonus } from "@/lib/runningEconomySnapshot";
import { computeNutritionEstimate, type NutritionEstimate, type Sport } from "@/lib/nutritionPredictive";
import { ScientificChartsDashboard, MetabolicPerformanceCompass, ScoreEnvelopeInlineCard } from "@/components/charts";

interface PhysiologicalAnalysisProps {
  athlete: Athlete;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  readiness?: PotentielPhysiologiqueEffectif;
  onGoToSnapshots?: () => void;
  ambition?: AmbitionLevel;
  athleteAge?: number | null;
}

export function PhysiologicalAnalysis({ athlete, vlamaxEffectif, tteEffectif: tteEffectifProp, readiness: readinessProp, onGoToSnapshots, ambition, athleteAge }: PhysiologicalAnalysisProps) {
  const snapshot = getDernierSnapshot(athlete);
  
  // ✅ FIX 8: VLamax STRICTEMENT depuis vlamaxEffectif - AUCUN RECALCUL
  // La valeur VLamax vient UNIQUEMENT du parent (Index.tsx) via computeVLamaxEffectif
  const vlamax = vlamaxEffectif?.value ?? null;
  const vlamaxSource = vlamaxEffectif?.source ?? "unknown";
  const vlamaxConfidence = vlamaxEffectif?.confidence ?? 0;
  const vlamaxLabel = vlamaxEffectif?.label ?? "VLamax (non disponible)";

  const vo2max = athlete.vo2max || snapshot?.vo2max || 50;
  
  // Construire un test virtuel pour compatibilité avec analysePhysiologiqueComplete
  // MAIS on passe DIRECTEMENT la valeur vlamaxEffectif (pas de recalcul)
  const tests: TestVLamaxResult[] = useMemo(() => {
    if (vlamax !== null) {
      return [{
        nom: vlamaxLabel,
        vlamax: vlamax,
        fiabilite: vlamaxConfidence,
        date: new Date().toISOString()
      }];
    }
    return [];
  }, [vlamax, vlamaxLabel, vlamaxConfidence]);
  
  const analyse = useMemo(() => 
    analysePhysiologiqueComplete(tests, vo2max, athlete.objectif),
    [tests, vo2max, athlete.objectif]
  );

  // =============================================
  // NUTRITION PRÉDICTIVE
  // =============================================
  const nutritionEstimate = useMemo(() => {
    return computeNutritionEstimate({
      vlamax,
      objectif: athlete.objectif || "IM",
      tteMin: tteEffectifProp?.tte_min ?? null,
      tteTarget: tteEffectifProp?.target ?? null,
    });
  }, [vlamax, athlete.objectif, tteEffectifProp?.tte_min, tteEffectifProp?.target]);

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

  // Générer les enveloppes pour affichage unifié
  const vlamaxEnvelope = vlamaxEffectif ? toVLamaxEnvelope(vlamaxEffectif, athlete.objectif || "IM") : null;
  const tteEnvelope = tteEffectifProp ? toTTEEnvelope(tteEffectifProp, athlete.objectif || "IM") : null;
  
  return (
    <div className="space-y-4">
      {/* Source VLamax + TTE - Utilise ScoreEnvelopeInlineCard unifié */}
      <div className="flex flex-wrap gap-4">
        {vlamaxEnvelope && vlamaxEnvelope.value !== null && (
          <ScoreEnvelopeInlineCard envelope={vlamaxEnvelope} showHelp={true} />
        )}
        
        {tteEnvelope && tteEnvelope.value !== null && (
          <ScoreEnvelopeInlineCard envelope={tteEnvelope} showHelp={true} />
        )}
      </div>

      {/* 🧭 METABOLIC PERFORMANCE COMPASS - Graphique signature */}
      {vlamaxEffectif && tteEffectifProp && (
        <MetabolicPerformanceCompass
          data={{
            vlamaxEffectif: vlamaxEffectif,
            tteEffectif: tteEffectifProp,
            ftp: snapshot?.ftp ?? null,
            poids: snapshot?.poids ?? null,
            tss7d: snapshot?.tss_7j ?? null,
            snapshotDate: snapshot?.date ?? null,
            objectif: athlete.objectif || "IM",
            ambition: ambition,
            athleteAge: athleteAge,
            vma: snapshot?.vma ?? null,
            sportFocus: snapshot?.sport === "course" ? "run" : "bike",
          }}
          staffMode={true}
        />
      )}
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
            
            {/* Indice de fiabilité */}
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Fiabilité</div>
              <div className={cn("text-2xl font-bold", getConfidenceColorClassFromPercent(analyse.confiance))}>
                {getConfidenceLabelFromPercent(analyse.confiance)}
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

      {/* 🏃 Économie de Course (CAP) - Affiché uniquement si données disponibles */}
      {readinessProp?.runningEconomy?.isApplicable && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Footprints className="h-4 w-4 text-blue-600" />
              Économie de course (CAP)
            </CardTitle>
            <CardDescription>
              Facteur clé de performance en semi-marathon, marathon et trail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score et niveau */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "px-4 py-2 rounded-xl text-center",
                readinessProp.runningEconomy.color === 'success' ? 'bg-green-500/10' :
                readinessProp.runningEconomy.color === 'warning' ? 'bg-yellow-500/10' :
                readinessProp.runningEconomy.color === 'orange' ? 'bg-orange-500/10' :
                'bg-red-500/10'
              )}>
                <span className={cn(
                  "text-2xl font-bold",
                  readinessProp.runningEconomy.color === 'success' ? 'text-green-600' :
                  readinessProp.runningEconomy.color === 'warning' ? 'text-yellow-600' :
                  readinessProp.runningEconomy.color === 'orange' ? 'text-orange-600' :
                  'text-red-600'
                )}>
                  {readinessProp.runningEconomy.levelIcon}
                </span>
                <p className={cn(
                  "text-sm font-medium",
                  readinessProp.runningEconomy.color === 'success' ? 'text-green-600' :
                  readinessProp.runningEconomy.color === 'warning' ? 'text-yellow-600' :
                  readinessProp.runningEconomy.color === 'orange' ? 'text-orange-600' :
                  'text-red-600'
                )}>
                  {readinessProp.runningEconomy.levelLabel}
                </p>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {readinessProp.runningEconomy.analysisMessage}
                </p>
              </div>
            </div>
            
            {/* Dérive cardiaque */}
            {readinessProp.runningEconomy.deriveEstimee !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Dérive cardiaque:</span>
                <span className="font-medium">{readinessProp.runningEconomy.deriveLabel}</span>
              </div>
            )}
            
            {/* Lien métabolique */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Lien avec VLamax / TTE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">VLamax</strong> → production d'énergie |{" "}
                <strong className="text-foreground">TTE</strong> → capacité à tenir l'intensité |{" "}
                <strong className="text-foreground">Économie</strong> → coût physiologique réel
              </p>
              <p className="text-xs text-primary mt-2 font-medium">
                À VLamax et TTE identiques, l'athlète le plus économique gagne.
              </p>
            </div>
            
            {/* Leviers d'optimisation */}
            {readinessProp.runningEconomy.optimisationLevier.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Leviers d'optimisation:</p>
                <div className="flex flex-wrap gap-2">
                  {readinessProp.runningEconomy.optimisationLevier.slice(0, 3).map((levier, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded bg-muted border border-border">
                      {levier}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Impact Potentiel Physiologique */}
            {readinessProp.wasCappedByEconomy && (
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-600">
                  🏃 Potentiel Physiologique plafonné: {readinessProp.economyCapReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 🍝 Nutrition Prédictive (g/h) */}
      {nutritionEstimate && (
        <Card className={cn(
          "border-2",
          nutritionEstimate.nutritionalRiskIndex.level === 'low' ? 'border-success/30 bg-success/5' :
          nutritionEstimate.nutritionalRiskIndex.level === 'moderate' ? 'border-warning/30 bg-warning/5' :
          'border-destructive/30 bg-destructive/5'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-4 w-4 text-primary" />
              Nutrition prédictive (g/h)
              <Badge variant="outline" className="ml-2 text-xs">Staff</Badge>
            </CardTitle>
            <CardDescription>
              Estimation de l'apport glucidique horaire nécessaire pour maintenir la performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommandation principale */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommandé</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    {nutritionEstimate.carbsMin}–{nutritionEstimate.carbsMax} g/h
                  </p>
                </div>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-xl text-center",
                nutritionEstimate.nutritionalRiskIndex.level === 'low' ? 'bg-success/10' :
                nutritionEstimate.nutritionalRiskIndex.level === 'moderate' ? 'bg-warning/10' :
                'bg-destructive/10'
              )}>
                <span className="text-xl mr-1">{nutritionEstimate.nutritionalRiskIndex.icon}</span>
                <span className={cn(
                  "font-semibold text-sm",
                  nutritionEstimate.nutritionalRiskIndex.level === 'low' ? 'text-success' :
                  nutritionEstimate.nutritionalRiskIndex.level === 'moderate' ? 'text-warning' :
                  'text-destructive'
                )}>
                  Risque {nutritionEstimate.nutritionalRiskIndex.label}
                </span>
              </div>
            </div>

            {/* Pourquoi ce calcul */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Pourquoi ce calcul ?</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong className="text-foreground">VLamax</strong> détermine la part de glucides utilisée</li>
                <li>• <strong className="text-foreground">TTE</strong> reflète la capacité à tenir l'intensité</li>
                <li>• <strong className="text-foreground">Économie de course</strong> indique le coût énergétique réel</li>
              </ul>
            </div>

            {/* Message staff */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">📊 Staff:</span> {nutritionEstimate.messageStaff}
              </p>
            </div>

            {/* Warnings */}
            {nutritionEstimate.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nutritionEstimate.warnings.map((warning, idx) => (
                  <Badge key={idx} variant="outline" className="bg-warning/10 border-warning/30 text-warning-foreground text-xs">
                    ⚠️ {warning}
                  </Badge>
                ))}
              </div>
            )}

            {/* Limites */}
            <div className="p-2 rounded-lg bg-muted/30 border border-border">
              <p className="text-[10px] text-muted-foreground">
                ⚠️ Cette estimation ne remplace pas un test de tolérance digestive. 
                Adapter selon l'expérience terrain, la chaleur et l'intensité réelle.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
