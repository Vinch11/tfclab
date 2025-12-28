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

interface PhysiologicalAnalysisProps {
  athlete: Athlete;
}

export function PhysiologicalAnalysis({ athlete }: PhysiologicalAnalysisProps) {
  const snapshot = getDernierSnapshot(athlete);
  
  // OPTION A: Seuls les tests VLAMAX alimentent le modèle
  const tests: TestVLamaxResult[] = useMemo(() => {
    const testsList: TestVLamaxResult[] = [];
    
    // 1. Ajouter UNIQUEMENT les tests VLAMAX (pas REF)
    if (athlete.tests && athlete.tests.length > 0) {
      athlete.tests.forEach(t => {
        // Filtrer: type VLAMAX uniquement
        if (t.type === "VLAMAX" && t.vlamax !== null && !isNaN(t.vlamax)) {
          testsList.push({
            nom: t.nom,
            vlamax: t.vlamax,
            fiabilite: t.fiabilite ?? 0.5,
            date: t.date
          });
        }
      });
    }
    
    // 2. Si pas de tests VLAMAX stockés, fallback sur estimations snapshot
    if (testsList.length === 0 && snapshot) {
      if (snapshot.pmax_5s && snapshot.ftp) {
        const vlamaxEstimee = (snapshot.pmax_5s / snapshot.ftp) * 0.15;
        testsList.push({
          nom: "Sprint + FTP (estimé)",
          vlamax: Math.min(1.2, Math.max(0.2, vlamaxEstimee)),
          fiabilite: 0.4,
          date: snapshot.date
        });
      }
      
      if (snapshot.pmax_5s) {
        testsList.push({
          nom: "Sprint 5-10s Vélo (estimé)",
          vlamax: Math.min(1.0, snapshot.pmax_5s / 1500),
          fiabilite: 0.5,
          date: snapshot.date
        });
      }
    }

    return testsList;
  }, [athlete.tests, snapshot]);

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
