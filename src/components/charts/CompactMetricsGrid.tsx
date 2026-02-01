/**
 * CompactMetricsGrid - Grille de mini-jauges pour aperçu rapide
 * Style inspiré INSCYD
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniGauge } from "./MiniGauge";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CompactMetricsGridProps {
  // Données physiologiques
  vo2max?: number | null;
  vlamax?: number | null;
  ftp?: number | null;
  weight?: number | null;
  tteMin?: number | null;
  fatmax?: number | null;
  fatPct?: number | null;
  fcMax?: number | null;
  vma?: number | null;
  tss7d?: number | null;
  readinessScore?: number | null;
  objectif?: string;
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
  readinessScore,
  objectif,
}: CompactMetricsGridProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // FTP/kg calculé
  const ftpKg = ftp && weight ? ftp / weight : null;
  
  // Définir les zones optimales selon l'objectif
  const getVlamaxOptimal = () => {
    switch (objectif) {
      case "Ironman Kona": return { min: 0.25, max: 0.35 };
      case "Ironman 70.3": return { min: 0.30, max: 0.40 };
      case "Marathon": return { min: 0.30, max: 0.40 };
      case "Semi-Marathon": return { min: 0.35, max: 0.50 };
      default: return { min: 0.30, max: 0.45 };
    }
  };
  
  const getTTEOptimal = () => {
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
              {/* VO2max */}
              <MiniGauge
                label="VO2max"
                value={vo2max}
                unit="ml/kg"
                min={30}
                max={85}
                optimal={{ min: 55, max: 75 }}
                className="compact-gauge"
              />
              
              {/* VLamax */}
              <MiniGauge
                label="VLamax"
                value={vlamax}
                unit="mmol/l/s"
                min={0.15}
                max={1.0}
                optimal={getVlamaxOptimal()}
                className="compact-gauge"
              />
              
              {/* FTP/kg */}
              <MiniGauge
                label="FTP/kg"
                value={ftpKg}
                unit="W/kg"
                min={1.5}
                max={6.5}
                optimal={{ min: 3.5, max: 5.0 }}
                className="compact-gauge"
              />
              
              {/* TTE */}
              <MiniGauge
                label="TTE"
                value={tteMin}
                unit="min"
                min={20}
                max={90}
                optimal={getTTEOptimal()}
                className="compact-gauge"
              />
              
              {/* FatMax */}
              {fatmax !== undefined && fatmax !== null && (
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
              
              {/* FC Max */}
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
              
              {/* VMA */}
              {vma !== undefined && vma !== null && (
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
              
              {/* Masse grasse */}
              {fatPct !== undefined && fatPct !== null && (
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
              
              {/* TSS 7j */}
              {tss7d !== undefined && tss7d !== null && (
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
              
              {/* Readiness */}
              {readinessScore !== undefined && readinessScore !== null && (
                <MiniGauge
                  label="Ready"
                  value={readinessScore}
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
                🎯 <span className="font-medium">{objectif || "Non défini"}</span>
                <span className="hidden sm:inline">{" • "}Zones optimales adaptées</span>
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
