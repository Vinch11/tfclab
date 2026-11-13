/**
 * Scientific Dashboard – Vue consolidée des graphiques staff-grade
 */

import { useState } from "react";
import {
  EnergyProfileChart,
  TTETargetChart,
  PerformanceRiskMatrixChart,
  NutritionPredictiveChart,
  EnergyContributionChart,
  StaffModeToggle,
  SimulatedLactateCurveChart,
  FatCarbOxidationChart,
  PerformancePredictionChart,
} from "./index";
import { PowerDurationUnifiedChart } from "./PowerDurationUnifiedChart";
import { MetabolicZonesINSCYDChart } from "./MetabolicZonesINSCYDChart";
import { metabolicCurveReview } from '@/lib/coachingCompass/curveReview';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

interface ScientificChartsDashboardProps {
  vlamaxValue: number | null;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  potentielScore: number | null;
  readinessDetails?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
  objectif: string;
  tss7d?: number | null;
  sport?: "velo" | "cap" | "triathlon";
  initialStaffMode?: boolean;
  vo2max?: number | null;
  ftp?: number | null;
  weight?: number;
  vma?: number | null;
  css?: number | null;
  // Power data for PD chart
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
}

export function ScientificChartsDashboard({
  vlamaxValue,
  vlamaxSource,
  vlamaxConfidence,
  tteValue,
  tteSource,
  tteConfidence,
  potentielScore,
  readinessDetails,
  objectif,
  tss7d,
  sport = "velo",
  initialStaffMode = false,
  vo2max,
  ftp,
  weight,
  vma,
  css,
  pmax5s,
  p30s,
  p60s,
  map5min,
}: ScientificChartsDashboardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);

  const avgConfidence = (vlamaxConfidence + tteConfidence) / 2;
  const review = metabolicCurveReview({ vo2max, vlamax: vlamaxValue, weight, ftp, vma, sport });

  return (
    <div className="space-y-4">
      <section className="border-b border-border pb-5 space-y-3">
        <div className="flex justify-between gap-3 items-start"><div><h3 className="text-lg font-semibold">Courbes métaboliques · {review.sport}</h3><p className="text-sm text-muted-foreground">{review.validation}</p></div><Button asChild variant="ghost" size="icon" aria-label="Ouvrir les protocoles de tests"><Link to="/diagnostic/tests"><ArrowUpRight className="h-5 w-5" /></Link></Button></div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">{[['VO₂max', vo2max, 'ml/kg/min'], ['VLamax', vlamaxValue, 'mmol/L/s'], ['Poids', weight, 'kg'], [review.reference, sport === 'cap' ? vma : ftp, sport === 'cap' ? 'km/h' : 'W']].map(([label, value, unit]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums mt-1">{typeof value === 'number' && Number.isFinite(value) && value > 0 ? `${value} ${unit}` : 'Données insuffisantes'}</dd></div>)}</dl>
        <details className="text-sm"><summary className="cursor-pointer min-h-11 flex items-center font-medium">Hypothèses et validation</summary><div className="text-muted-foreground space-y-2 pb-3"><p>Contrôles logiciels des unités et des entrées, pas validation expérimentale des courbes. VLamax : {vlamaxSource}. La modalité du test VO₂max reste à documenter. Une valeur enregistrée ne certifie pas un test.</p><p>Oxydation des glucides ≠ apports alimentaires ≠ tolérance digestive. Le repère 90 g/h n’est pas une capacité digestive mesurée.</p><p>FTP, CP et MLSS sont distincts. Lactate simulé et rendement mécanique hypothétique ne remplacent pas les prélèvements et mesures d’oxygène.</p>{sport === 'cap' ? <p>Allures exploratoires liées à la VMA ; aucune transposition du lactate ou des watts vélo.</p> : sport === 'triathlon' ? <p>Ces courbes utilisent le profil vélo. Elles ne décrivent pas le métabolisme course ou natation.</p> : null}{review.missing.length > 0 && <p>Entrées manquantes : {review.missing.join(', ')}.</p>}</div></details>
      </section>
      {/* Toggle Mode */}
      <div className="flex justify-end">
        <StaffModeToggle staffMode={staffMode} onToggle={setStaffMode} />
      </div>

      {/* Grille principale */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Nutrition Predictive */}
        <NutritionPredictiveChart
          vlamaxValue={vlamaxValue}
          objectif={objectif}
          sport={sport}
          vo2max={vo2max}
          weightKg={weight}
          staffMode={staffMode}
        />

        {/* Simulated cycling model is not a running threshold. */}
        {review.cycling && <SimulatedLactateCurveChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={ftp ?? null}
          weight={weight}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        }
        {!review.cycling && <section className="md:col-span-2 border-b border-border py-5"><h4 className="font-medium">Lactate et puissance-durée vélo</h4><p className="text-sm text-muted-foreground mt-2">{sport === 'cap' ? 'Non transposables à la course. Un protocole course spécifique est nécessaire.' : 'Données insuffisantes : VO₂max, VLamax, poids et FTP vélo requis.'}</p></section>}
        {/* Fat/Carb Oxidation */}
        <FatCarbOxidationChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={sport === "cap" ? null : ftp ?? null}
          weight={weight}
          vma={sport === "cap" ? vma : null}
          paceMode={sport === "cap"}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        {/* Power-Duration Unified (Mader + Empirique) */}
        {review.cycling && <PowerDurationUnifiedChart
          vo2max={vo2max}
          vlamax={vlamaxValue}
          ftp={ftp}
          weight={weight}
          pmax5s={pmax5s}
          p30s={p30s}
          p60s={p60s}
          map5min={map5min}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        }
        {/* Metabolic Zones INSCYD-derived */}
        <MetabolicZonesINSCYDChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={sport === "cap" ? null : ftp ?? null}
          weight={weight}
          staffMode={staffMode}
          sport={sport}
          className="md:col-span-2 xl:col-span-3"
        />

        {/*
          Performance Prediction
          Bug réel corrigé (audit "dashboard/plan/export", passe 6) : vlamaxConfidence
          et tteConfidence sont déjà sur une échelle 0-1 (comme VLamaxEffectif.confidence
          et TTEEffectif.confidence partout ailleurs) — diviser par 200 au lieu de 2
          ramenait la confiance affichée à ~1% au lieu de ~80%.
        */}
        {sport !== "triathlon" && <PerformancePredictionChart
          sport={sport}
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={sport === "cap" ? null : ftp ?? null}
          weight={weight}
          vma={vma}
          css={css}
          confidence={(vlamaxConfidence + tteConfidence) / 2}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-3"
        />
        }
      </div>
    </div>
  );
}
