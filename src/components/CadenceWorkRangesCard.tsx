/**
 * Carte "Plages de travail recommandées"
 * 
 * Affiche les plages de cadence contextuelles selon le profil.
 * Badge "Outil de travail — pas une consigne" toujours visible.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Target, AlertTriangle, Eye } from 'lucide-react';
import {
  computeCadenceWorkRanges,
  CadenceWorkRangesInput,
  CadenceRangeResult,
  CadenceWorkRange,
  getRangeColorClass,
  getRangeIconClass,
  formatRpmRange,
  formatZones,
  CAP_OBSERVATION
} from '@/lib/v2/cadenceWorkRanges';
import type { VLamaxEffectif } from '@/lib/vlamaxEffectif';
import type { TTEEffectif } from '@/lib/tteEffectif';

interface CadenceWorkRangesCardProps {
  sport: 'bike' | 'run';
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  objectif: string;
  spontaneousCadenceRpm?: number | null;
  age?: number | null;
  className?: string;
}

export function CadenceWorkRangesCard({
  sport,
  vlamaxEffectif,
  tteEffectif,
  objectif,
  spontaneousCadenceRpm,
  age,
  className = ''
}: CadenceWorkRangesCardProps) {
  const result = computeCadenceWorkRanges({
    sport,
    vlamaxEffectif,
    tteEffectif,
    objectif,
    spontaneousCadenceRpm,
    age
  });

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Plages de travail recommandées
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {result.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.isObservationOnly ? (
          <CAPObservationView />
        ) : (
          <BikeRangesView result={result} />
        )}
        
        {/* Context info */}
        <ContextInfo result={result} />
      </CardContent>
    </Card>
  );
}

// ============================================
// CAP OBSERVATION VIEW
// ============================================

function CAPObservationView() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted">
        <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {CAP_OBSERVATION.safeguard}
          </p>
          <p className="text-xs text-muted-foreground">
            En course à pied, nous observons la cadence pour identifier des risques potentiels, 
            mais nous ne proposons pas de plages de travail spécifiques.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            Cadence élevée + VLamax élevé
          </p>
          <p className="text-amber-600 dark:text-amber-400">
            → Coût musculaire potentiel
          </p>
        </div>
        <div className="p-2 rounded border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <p className="font-medium text-red-700 dark:text-red-300">
            Cadence basse + TTE faible
          </p>
          <p className="text-red-600 dark:text-red-400">
            → Risque mécanique
          </p>
        </div>
      </div>
      
      <p className="text-center text-xs text-muted-foreground font-medium">
        {CAP_OBSERVATION.displayLabel}
      </p>
    </div>
  );
}

// ============================================
// BIKE RANGES VIEW
// ============================================

function BikeRangesView({ result }: { result: CadenceRangeResult }) {
  if (result.ranges.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
        <Info className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Données insuffisantes pour déterminer les plages de travail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {result.ranges.map((range) => (
        <RangeCard key={range.id} range={range} />
      ))}
    </div>
  );
}

function RangeCard({ range }: { range: CadenceWorkRange }) {
  const colorClass = getRangeColorClass(range.id);
  const icon = getRangeIconClass(range.id);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-3 rounded-lg border-l-4 ${colorClass} cursor-help`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="font-medium text-sm">{range.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formatRpmRange(range)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {formatZones(range)}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground italic">
              "{range.message}"
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Objectif :</p>
            <p className="text-sm">{range.objective}</p>
            {range.staffNote && (
              <>
                <p className="font-medium mt-2">Note staff :</p>
                <p className="text-sm text-muted-foreground">{range.staffNote}</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// CONTEXT INFO
// ============================================

function ContextInfo({ result }: { result: CadenceRangeResult }) {
  const { context } = result;
  
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'high': return 'Élevé';
      case 'moderate': return 'Modéré';
      case 'low': return 'Bas';
      case 'insufficient': return 'Insuffisant';
      case 'correct': return 'Correct';
      case 'good': return 'Bon';
      default: return '—';
    }
  };

  const getStatusColor = (type: string, status: string): string => {
    if (status === 'unknown') return 'text-muted-foreground';
    
    if (type === 'vlamax') {
      if (status === 'high') return 'text-amber-600 dark:text-amber-400';
      if (status === 'low') return 'text-green-600 dark:text-green-400';
      return 'text-blue-600 dark:text-blue-400';
    }
    
    if (type === 'tte') {
      if (status === 'insufficient') return 'text-red-600 dark:text-red-400';
      if (status === 'good') return 'text-green-600 dark:text-green-400';
      return 'text-amber-600 dark:text-amber-400';
    }
    
    return 'text-muted-foreground';
  };

  return (
    <div className="pt-3 border-t">
      <p className="text-xs text-muted-foreground mb-2">Contexte analysé :</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          VLamax : <span className={getStatusColor('vlamax', context.vlamaxStatus)}>
            {getStatusLabel(context.vlamaxStatus)}
          </span>
        </Badge>
        <Badge variant="outline" className="text-xs">
          TTE : <span className={getStatusColor('tte', context.tteStatus)}>
            {getStatusLabel(context.tteStatus)}
          </span>
        </Badge>
        {context.spontaneousCadence && context.spontaneousCadence !== 'unknown' && (
          <Badge variant="outline" className="text-xs">
            Cadence : {getStatusLabel(context.spontaneousCadence)}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default CadenceWorkRangesCard;
