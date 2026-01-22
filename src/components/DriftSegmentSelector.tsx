/**
 * Drift Segment Selector
 * Permet de sélectionner manuellement le segment pour l'analyse de drift Pa:HR
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Heart, Timer, ArrowRight, RotateCcw, TrendingUp } from "lucide-react";
import { DriftRatioChart } from "@/components/DriftRatioChart";
import type { FitSession, DriftAnalysis } from "@/lib/fitImport/types";

interface DriftSegmentSelectorProps {
  session: FitSession;
  initialDrift?: DriftAnalysis;
  onDriftCalculated: (drift: DriftAnalysis | undefined) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function calculateManualDrift(
  session: FitSession,
  startPct: number,
  endPct: number
): DriftAnalysis | undefined {
  const records = session.records.filter(
    (r) => r.powerW !== undefined && r.heartRate !== undefined
  );

  if (records.length < 60) {
    return {
      driftPercent: 0,
      powerAvg1stHalf: 0,
      hrAvg1stHalf: 0,
      powerAvg2ndHalf: 0,
      hrAvg2ndHalf: 0,
      ratio1stHalf: 0,
      ratio2ndHalf: 0,
      driftLevel: "low",
      segmentDurationMin: 0,
      isValid: false,
      invalidReason: "Pas assez de données avec puissance et FC",
    };
  }

  const startIdx = Math.floor(records.length * (startPct / 100));
  const endIdx = Math.floor(records.length * (endPct / 100));
  const segment = records.slice(startIdx, endIdx);

  if (segment.length < 30) {
    return {
      driftPercent: 0,
      powerAvg1stHalf: 0,
      hrAvg1stHalf: 0,
      powerAvg2ndHalf: 0,
      hrAvg2ndHalf: 0,
      ratio1stHalf: 0,
      ratio2ndHalf: 0,
      driftLevel: "low",
      segmentDurationMin: 0,
      isValid: false,
      invalidReason: "Segment sélectionné trop court",
    };
  }

  const midPoint = Math.floor(segment.length / 2);
  const firstHalf = segment.slice(0, midPoint);
  const secondHalf = segment.slice(midPoint);

  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const powerAvg1stHalf = avg(firstHalf.map((r) => r.powerW!));
  const hrAvg1stHalf = avg(firstHalf.map((r) => r.heartRate!));
  const powerAvg2ndHalf = avg(secondHalf.map((r) => r.powerW!));
  const hrAvg2ndHalf = avg(secondHalf.map((r) => r.heartRate!));

  if (hrAvg1stHalf === 0 || hrAvg2ndHalf === 0) {
    return {
      driftPercent: 0,
      powerAvg1stHalf,
      hrAvg1stHalf,
      powerAvg2ndHalf,
      hrAvg2ndHalf,
      ratio1stHalf: 0,
      ratio2ndHalf: 0,
      driftLevel: "low",
      segmentDurationMin: 0,
      isValid: false,
      invalidReason: "Données FC manquantes dans le segment",
    };
  }

  const ratio1stHalf = powerAvg1stHalf / hrAvg1stHalf;
  const ratio2ndHalf = powerAvg2ndHalf / hrAvg2ndHalf;
  const driftPercent = ((ratio1stHalf - ratio2ndHalf) / ratio1stHalf) * 100;

  let driftLevel: "low" | "moderate" | "high" = "low";
  if (Math.abs(driftPercent) > 5) driftLevel = "high";
  else if (Math.abs(driftPercent) > 2.5) driftLevel = "moderate";

  // Calculate segment duration
  const startTime = segment[0]?.timestamp.getTime() ?? 0;
  const endTime = segment[segment.length - 1]?.timestamp.getTime() ?? 0;
  const segmentDurationMin = (endTime - startTime) / 1000 / 60;

  return {
    driftPercent: Math.round(driftPercent * 100) / 100,
    powerAvg1stHalf: Math.round(powerAvg1stHalf),
    hrAvg1stHalf: Math.round(hrAvg1stHalf),
    powerAvg2ndHalf: Math.round(powerAvg2ndHalf),
    hrAvg2ndHalf: Math.round(hrAvg2ndHalf),
    ratio1stHalf: Math.round(ratio1stHalf * 100) / 100,
    ratio2ndHalf: Math.round(ratio2ndHalf * 100) / 100,
    driftLevel,
    segmentDurationMin: Math.round(segmentDurationMin * 10) / 10,
    isValid: true,
  };
}

export function DriftSegmentSelector({
  session,
  initialDrift,
  onDriftCalculated,
}: DriftSegmentSelectorProps) {
  const [manualMode, setManualMode] = useState(false);
  const [range, setRange] = useState<[number, number]>([10, 95]);

  const totalDurationSec = session.movingTimeSec;
  const hasHrData = session.records.some((r) => r.heartRate !== undefined);
  const hasPowerData = session.records.some((r) => r.powerW !== undefined);

  // Calculate segment times based on percentage
  const startTimeSec = useMemo(
    () => (totalDurationSec * range[0]) / 100,
    [totalDurationSec, range]
  );
  const endTimeSec = useMemo(
    () => (totalDurationSec * range[1]) / 100,
    [totalDurationSec, range]
  );
  const segmentDurationSec = endTimeSec - startTimeSec;

  // Calculate drift when range changes in manual mode
  const manualDrift = useMemo(() => {
    if (!manualMode) return undefined;
    return calculateManualDrift(session, range[0], range[1]);
  }, [session, range, manualMode]);

  // Update parent when drift changes
  useEffect(() => {
    if (manualMode) {
      onDriftCalculated(manualDrift);
    } else {
      onDriftCalculated(initialDrift);
    }
  }, [manualMode, manualDrift, initialDrift, onDriftCalculated]);

  const handleReset = useCallback(() => {
    setRange([10, 95]);
  }, []);

  const activeDrift = manualMode ? manualDrift : initialDrift;

  if (!hasHrData || !hasPowerData) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            Analyse Drift Pa:HR
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="manual-mode" className="text-xs font-normal text-muted-foreground">
              Sélection manuelle
            </Label>
            <Switch
              id="manual-mode"
              checked={manualMode}
              onCheckedChange={setManualMode}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Manual Segment Selection */}
        {manualMode && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Segment d'analyse</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-6 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>

            {/* Range Slider */}
            <Slider
              value={range}
              onValueChange={(v) => setRange(v as [number, number])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />

            {/* Time Labels */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono">{formatTime(startTimeSec)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>Durée:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatTime(segmentDurationSec)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono">{formatTime(endTimeSec)}</span>
              </div>
            </div>

            {/* Segment Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-background rounded">
                <span className="text-muted-foreground">Début: </span>
                <span className="font-medium">{range[0]}%</span>
              </div>
              <div className="p-2 bg-background rounded">
                <span className="text-muted-foreground">Fin: </span>
                <span className="font-medium">{range[1]}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Visual Drift Chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Évolution du ratio Pa:HR (W/bpm)</span>
          </div>
          <DriftRatioChart
            session={session}
            segmentRange={manualMode ? range : [10, 95]}
            showSegmentHighlight={manualMode}
          />
        </div>

        {/* Drift Result */}
        {activeDrift?.isValid ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Drift Pa:HR</span>
              <Badge
                variant={
                  activeDrift.driftLevel === "low"
                    ? "default"
                    : activeDrift.driftLevel === "moderate"
                    ? "secondary"
                    : "destructive"
                }
              >
                {activeDrift.driftPercent.toFixed(1)}% (
                {activeDrift.driftLevel === "low"
                  ? "Faible"
                  : activeDrift.driftLevel === "moderate"
                  ? "Modéré"
                  : "Élevé"}
                )
              </Badge>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground font-medium">1ère moitié</p>
                <p>Power: <span className="font-mono">{activeDrift.powerAvg1stHalf}W</span></p>
                <p>FC: <span className="font-mono">{activeDrift.hrAvg1stHalf}bpm</span></p>
                <p>Ratio: <span className="font-mono">{activeDrift.ratio1stHalf}</span></p>
              </div>
              <div className="space-y-1 p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground font-medium">2ème moitié</p>
                <p>Power: <span className="font-mono">{activeDrift.powerAvg2ndHalf}W</span></p>
                <p>FC: <span className="font-mono">{activeDrift.hrAvg2ndHalf}bpm</span></p>
                <p>Ratio: <span className="font-mono">{activeDrift.ratio2ndHalf}</span></p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Segment analysé: {activeDrift.segmentDurationMin} min
              {manualMode && " (sélection manuelle)"}
            </p>
          </div>
        ) : activeDrift ? (
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
            {activeDrift.invalidReason ?? "Données insuffisantes pour l'analyse"}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
            Durée insuffisante pour calculer la dérive cardiaque
          </div>
        )}
      </CardContent>
    </Card>
  );
}
