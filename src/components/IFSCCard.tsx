/**
 * Carte "Force Spécifique Cycliste" (IFSC™)
 * 
 * Affiche l'indice IFSC avec score, statut, message pédagogique
 * et lien avec les plages de cadence.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Info, Dumbbell, AlertTriangle } from 'lucide-react';
import {
  computeIFSC,
  IFSCInput,
  IFSCResult,
  getIFSCColor,
  getIFSCBgColor,
  formatIFSCScore,
  getCadenceForceInterpretation,
  getRiskColor,
  IFSC_SAFEGUARD,
  IFSC_SCALE
} from '@/lib/v2/ifsc';

interface IFSCCardProps {
  ftp: number | null;
  weightKg: number | null;
  tteMin: number | null;
  tteSource: string;
  vlamax: number | null;
  vlamaxConfidence: number;
  spontaneousCadenceRpm?: number | null;
  objectif: string;
  age?: number | null;
  className?: string;
}

export function IFSCCard({
  ftp,
  weightKg,
  tteMin,
  tteSource,
  vlamax,
  vlamaxConfidence,
  spontaneousCadenceRpm,
  objectif,
  age,
  className = ''
}: IFSCCardProps) {
  const ifsc = computeIFSC({
    ftp,
    weightKg,
    tteMin,
    tteSource,
    vlamax,
    vlamaxConfidence,
    spontaneousCadenceRpm,
    objectif,
    age
  });

  if (!ifsc) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Force Spécifique Cycliste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <p className="text-sm">Données insuffisantes pour calculer l'IFSC™</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Requis : FTP, Poids, TTE et VLamax
          </p>
        </CardContent>
      </Card>
    );
  }

  const matrixResult = getCadenceForceInterpretation(ifsc.level, spontaneousCadenceRpm);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Force Spécifique Cycliste
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs font-normal cursor-help">
                  {IFSC_SAFEGUARD.badge}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{IFSC_SAFEGUARD.text}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${getIFSCColor(ifsc.level)}`}>
                {ifsc.score}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <Badge className={`${getIFSCBgColor(ifsc.level)} border-0`}>
              {ifsc.label}
            </Badge>
          </div>
          
          {/* Jauge visuelle */}
          <div className="w-32">
            <Progress value={ifsc.score} className="h-3" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Message pédagogique */}
        <div className={`p-3 rounded-lg ${getIFSCBgColor(ifsc.level)}`}>
          <p className="text-sm font-medium">{ifsc.message}</p>
        </div>

        {/* Matrice Cadence × Force */}
        {matrixResult && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Lecture croisée cadence</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${getRiskColor(matrixResult.risk)}`}
              >
                Risque {matrixResult.risk === 'low' ? 'faible' : matrixResult.risk === 'medium' ? 'modéré' : 'élevé'}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground">
              {matrixResult.interpretation}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {matrixResult.recommendation}
            </p>
          </div>
        )}

        {/* Composants */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Composants de l'indice :</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-muted/30">
              <p className="text-lg font-semibold">{ifsc.components.ftpKgContribution}%</p>
              <p className="text-xs text-muted-foreground">FTP/kg</p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-lg font-semibold">{ifsc.components.tteContribution}%</p>
              <p className="text-xs text-muted-foreground">TTE</p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-lg font-semibold text-amber-600">-{ifsc.components.vlamaxPenalty}%</p>
              <p className="text-xs text-muted-foreground">VLamax</p>
            </div>
          </div>
        </div>

        {/* Note staff */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground italic">
            💡 {ifsc.staffNote}
          </p>
        </div>

        {/* Source */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Source TTE : {tteSource === "observed" ? "📋 Observé" : "📐 Estimé"}</span>
          <span>IFSC™</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default IFSCCard;
