import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import { AthleteEvidenceCharts } from './AthleteEvidenceCharts';

interface ScientificChartsDashboardProps {
  profileInput?: CoachingCompassInput | null;
  snapshots?: DbSnapshot[];
  snapshot?: DbSnapshot | null;
  tests?: DbTest[];
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

export function ScientificChartsDashboard({ profileInput, snapshot = null, snapshots = [], tests = [] }: ScientificChartsDashboardProps) {
  if (!profileInput || !snapshot) return <p className="text-sm text-muted-foreground">Données insuffisantes : un bilan personnel daté est nécessaire.</p>;
  return <AthleteEvidenceCharts key={snapshot.athlete_id} input={profileInput} snapshot={snapshot} snapshots={snapshots} tests={tests} />;
}
