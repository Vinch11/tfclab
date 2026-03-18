/**
 * CompactMetricsGrid - Grille de mini-jauges pour aperçu rapide
 * Style inspiré INSCYD
 * 
 * ✅ RUNNING FOCUS MODE: Adapte les métriques affichées selon le mode
 * - Mode Running: VMA, Allure Seuil, Économie CAP → PAS de FTP/kg
 * - Mode Triathlon/Vélo: FTP/kg, FatMax, etc.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniGauge } from "./MiniGauge";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";

interface CompactMetricsGridProps {
  // Données physiologiques communes
  vo2max?: number | null;
  vlamax?: number | null;
  tteMin?: number | null;
  fcMax?: number | null;
  potentielScore?: number | null;
  objectif?: string;
  
  // Données vélo/triathlon (masquées en Running Focus Mode)
  ftp?: number | null;
  weight?: number | null;
  fatmax?: number | null;
  fatPct?: number | null;
  tss7d?: number | null;
  
  // Données running (prioritaires en Running Focus Mode)
  vma?: number | null;
  paceThreshold?: number | null;  // Allure seuil en sec/km
  runEconomyScore?: number | null; // Score économie 0-100
  durabilityScore?: number | null; // Score durabilité 0-100
}

export function CompactMetricsGrid({
  vo2max,
  vlamax,
  ftp,
  weight,
  tteMin,
  fatmax,
  fatPct,
  fcMax,
  vma,
  tss7d,
  potentielScore,
  objectif,
  paceThreshold,
  runEconomyScore,
  durabilityScore,
}: CompactMetricsGridProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isRunningOnly, raceLabel } = useRunningFocusMode();
  
  // FTP/kg calculé (uniquement si pas en Running Focus Mode)
  const ftpKg = !isRunningOnly && ftp && weight ? ftp / weight : null;
  
  // Convertir allure seuil en format min:sec/km pour affichage
  const formatPace = (secPerKm: number | null | undefined): string | null => {
    if (!secPerKm) return null;
    const min = Math.floor(secPerKm / 60);
    const sec = Math.round(secPerKm % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };
  
  // Définir les zones optimales selon l'objectif
  const getVlamaxOptimal = () => {
    // En Running Focus Mode, utiliser les cibles CAP
    if (isRunningOnly) {
      switch (objectif) {
        case "5K": return { min: 0.40, max: 0.55 };
        case "10K": return { min: 0.35, max: 0.45 };
        case "Semi": return { min: 0.30, max: 0.40 };
        case "Marathon": return { min: 0.25, max: 0.35 };
        case "Trail":
        case "TrailShort":
        case "TrailMountain":
        case "TrailUltra":
          return { min: 0.25, max: 0.40 };
        default: return { min: 0.30, max: 0.45 };
      }
    }
    // Mode Triathlon/Vélo
    switch (objectif) {
      case "Ironman Kona": return { min: 0.25, max: 0.35 };
      case "Ironman 70.3": return { min: 0.30, max: 0.40 };
      case "Marathon": return { min: 0.30, max: 0.40 };
      case "Semi-Marathon": return { min: 0.35, max: 0.50 };
      default: return { min: 0.30, max: 0.45 };
    }
  };
  
  const getTTEOptimal = () => {
    // En Running Focus Mode, TTE = durabilité d'allure
    if (isRunningOnly) {
      switch (objectif) {
        case "5K": return { min: 20, max: 30 };
        case "10K": return { min: 35, max: 50 };
        case "Semi": return { min: 50, max: 70 };
        case "Marathon": return { min: 60, max: 90 };
        default: return { min: 40, max: 60 };
      }
    }
    switch (objectif) {
      case "Ironman Kona": return { min: 55, max: 75 };
      case "Ironman 70.3": return { min: 45, max: 60 };
      case "Marathon": return { min: 50, max: 70 };
      default: return { min: 40, max: 60 };
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              <span className="hidden xs:inline">Aperçu Rapide – Métriques Clés</span>
              <span className="xs:hidden">Métriques</span>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-2 px-2 sm:px-3">
            {/* Grille ultra-compacte: 3 cols mobile, 4 tablet, 6 desktop */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
              {/* VO2max - Toujours affiché mais label adapté */}
              <MiniGauge
                label={isRunningOnly ? "VO2max CAP" : "VO2max"}
                value={vo2max}
                unit="ml/kg"
                min={30}
                max={85}
                optimal={{ min: 55, max: 75 }}
                className="compact-gauge"
              />
              
              {/* VLamax - Label adapté en Running Focus Mode */}
              <MiniGauge
                label={isRunningOnly ? "VLamax CAP" : "VLamax"}
                value={vlamax}
                unit="mmol/l/s"
                min={0.15}
                max={1.0}
                optimal={getVlamaxOptimal()}
                className="compact-gauge"
              />
              
              {/* ═══ RUNNING FOCUS MODE: Métriques spécifiques CAP ═══ */}
              
              {/* VMA - Prioritaire en Running Focus Mode */}
              {isRunningOnly && vma !== undefined && vma !== null && (
                <MiniGauge
                  label="VMA"
                  value={vma}
                  unit="km/h"
                  min={12}
                  max={24}
                  optimal={{ min: 16, max: 21 }}
                  className="compact-gauge"
                />
              )}
              
              {/* Économie de course - Running Focus Mode uniquement */}
              {isRunningOnly && runEconomyScore !== undefined && runEconomyScore !== null && (
                <MiniGauge
                  label="Économie"
                  value={runEconomyScore}
                  unit="score"
                  min={0}
                  max={100}
                  optimal={{ min: 70, max: 95 }}
                  className="compact-gauge"
                />
              )}
              
              {/* Durabilité d'allure - Running Focus Mode */}
              {isRunningOnly && durabilityScore !== undefined && durabilityScore !== null && (
                <MiniGauge
                  label="Durabilité"
                  value={durabilityScore}
                  unit="score"
                  min={0}
                  max={100}
                  optimal={{ min: 70, max: 95 }}
                  className="compact-gauge"
                />
              )}
              
              {/* ═══ MODE VÉLO/TRIATHLON: Métriques spécifiques ═══ */}
              
              {/* FTP/kg - MASQUÉ en Running Focus Mode */}
              {!isRunningOnly && ftpKg !== null && (
                <MiniGauge
                  label="FTP/kg"
                  value={ftpKg}
                  unit="W/kg"
                  min={1.5}
                  max={6.5}
                  optimal={{ min: 3.5, max: 5.0 }}
                  className="compact-gauge"
                />
              )}
              
              {/* TTE - Toujours affiché, label adapté */}
              <MiniGauge
                label={isRunningOnly ? "Durée seuil" : "TTE"}
                value={tteMin}
                unit="min"
                min={20}
                max={90}
                optimal={getTTEOptimal()}
                className="compact-gauge"
              />
              
              {/* FatMax - MASQUÉ en Running Focus Mode */}
              {!isRunningOnly && fatmax !== undefined && fatmax !== null && (
                <MiniGauge
                  label="FatMax"
                  value={fatmax}
                  unit="W"
                  min={100}
                  max={350}
                  optimal={{ min: 180, max: 280 }}
                  className="compact-gauge"
                />
              )}
              
              {/* FC Max - Toujours visible */}
              {fcMax !== undefined && fcMax !== null && (
                <MiniGauge
                  label="FC Max"
                  value={fcMax}
                  unit="bpm"
                  min={140}
                  max={220}
                  className="compact-gauge"
                />
              )}
              
              {/* VMA en mode non-running (si disponible) */}
              {!isRunningOnly && vma !== undefined && vma !== null && (
                <MiniGauge
                  label="VMA"
                  value={vma}
                  unit="km/h"
                  min={12}
                  max={24}
                  optimal={{ min: 16, max: 21 }}
                  className="compact-gauge"
                />
              )}
              
              {/* Masse grasse - MASQUÉ en Running Focus Mode */}
              {!isRunningOnly && fatPct !== undefined && fatPct !== null && (
                <MiniGauge
                  label="Fat %"
                  value={fatPct}
                  unit="%"
                  min={5}
                  max={30}
                  optimal={{ min: 8, max: 15 }}
                  className="compact-gauge"
                />
              )}
              
              {/* TSS 7j - MASQUÉ en Running Focus Mode */}
              {!isRunningOnly && tss7d !== undefined && tss7d !== null && (
                <MiniGauge
                  label="TSS 7j"
                  value={tss7d}
                  unit="TSS"
                  min={0}
                  max={1200}
                  optimal={{ min: 400, max: 800 }}
                  className="compact-gauge"
                />
              )}
              
              {/* Readiness - Toujours visible */}
              {potentielScore !== undefined && potentielScore !== null && (
                <MiniGauge
                  label="Ready"
                  value={potentielScore}
                  unit="%"
                  min={0}
                  max={100}
                  optimal={{ min: 70, max: 100 }}
                  className="compact-gauge"
                />
              )}
            </div>
            
            <div className="mt-1.5 pt-1.5 border-t border-border/30">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
                {isRunningOnly ? "🏃" : "🎯"} <span className="font-medium">{raceLabel || objectif || "Non défini"}</span>
                <span className="hidden sm:inline">
                  {" • "}{isRunningOnly ? "Running Focus Mode™ actif" : "Zones optimales adaptées"}
                </span>
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
