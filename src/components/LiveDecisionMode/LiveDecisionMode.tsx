/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL LIVE DECISION MODE™ — Coach Only Real-Time Dashboard
 * Two For Coaching Lab Method™
 * 
 * "Observe. Interpret. Decide."
 * 
 * 3 Panels:
 * 1. CONFORMITÉ - Pacing envelope compliance
 * 2. RISQUES - Physiological risk flags
 * 3. DÉCISION - Coach decision support
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from "react";
import { X, Radio, Clock, Activity, AlertTriangle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ConformityPanel } from "./panels/ConformityPanel";
import { RisksPanel } from "./panels/RisksPanel";
import { DecisionPanel } from "./panels/DecisionPanel";

import {
  computeLiveDecision,
  getPhaseLabel,
  type LiveSessionInput,
  type LiveDataPoint,
  type LiveDecisionResult,
} from "@/lib/v2/liveDecisionEngine";

import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveDecisionModeProps {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  raceObjective: RaceObjective;
  raceReadinessScore: number | null;
  vlamaxValue: number | null;
  tteMin: number | null;
  targetPowerOrPace: number;
  targetHR: number | null;
  totalExpectedDurationMin: number;
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION DATA (Demo mode)
// ═══════════════════════════════════════════════════════════════════════════════

function generateSimulatedData(
  currentTimeSec: number,
  targetPower: number,
  envelopeHigh: number
): LiveDataPoint[] {
  const points: LiveDataPoint[] = [];
  const interval = 30; // Every 30 seconds
  
  for (let t = 0; t <= currentTimeSec; t += interval) {
    // Simulate realistic pacing with some variance
    const phase = t / currentTimeSec;
    let intensityFactor = 1.0;
    
    // Early over-pacing simulation
    if (phase < 0.2) {
      intensityFactor = 1.02 + Math.random() * 0.05; // Slightly high
    } else if (phase < 0.5) {
      intensityFactor = 0.98 + Math.random() * 0.04; // Settling
    } else {
      intensityFactor = 0.95 + Math.random() * 0.03; // Fatigue
    }
    
    const power = targetPower * intensityFactor;
    const hr = 140 + phase * 15 + Math.random() * 5; // HR drift simulation
    
    points.push({
      timestamp: t,
      powerOrPace: power,
      heartRate: hr,
      cadence: 85 + Math.random() * 10,
      segmentIndex: Math.floor(t / 300),
    });
  }
  
  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function LiveDecisionMode({
  athleteName,
  envelope,
  raceObjective,
  raceReadinessScore,
  vlamaxValue,
  tteMin,
  targetPowerOrPace,
  targetHR,
  totalExpectedDurationMin,
  onClose,
}: LiveDecisionModeProps) {
  // Demo mode: Simulate elapsed time
  const [elapsedSec, setElapsedSec] = useState(1800); // Start at 30min for demo
  const [isLive, setIsLive] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  // Simulate time progression when live
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setElapsedSec(prev => Math.min(prev + 30, totalExpectedDurationMin * 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, totalExpectedDurationMin]);

  // Generate simulated data
  const dataPoints = useMemo(() => {
    return generateSimulatedData(elapsedSec, targetPowerOrPace, envelope.boundary.highPct);
  }, [elapsedSec, targetPowerOrPace, envelope.boundary.highPct]);

  // Compute decision
  const result = useMemo<LiveDecisionResult>(() => {
    return computeLiveDecision({
      dataPoints,
      currentTimeSec: elapsedSec,
      totalExpectedDurationSec: totalExpectedDurationMin * 60,
      envelope,
      raceObjective,
      raceReadinessScore,
      vlamaxValue,
      tteMin,
      targetPowerOrPace,
      targetHR,
    });
  }, [dataPoints, elapsedSec, totalExpectedDurationMin, envelope, raceObjective, raceReadinessScore, vlamaxValue, tteMin, targetPowerOrPace, targetHR]);

  // Format time
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            isLive ? "bg-red-500" : "bg-gray-400"
          )} />
          <div>
            <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
              TFCL Live Decision Mode™
              <Badge variant="destructive" className="text-[9px]">COACH ONLY</Badge>
            </h1>
            <p className="text-[10px] text-muted-foreground italic">Observe. Interpret. Decide.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{formatTime(elapsedSec)}</span>
            <span className="text-[10px] text-muted-foreground">
              / {formatTime(totalExpectedDurationMin * 60)}
            </span>
          </div>
          
          {/* Phase badge */}
          <Badge variant="secondary" className="text-xs">
            {getPhaseLabel(result.racePhase)}
          </Badge>
          
          {/* Live toggle */}
          <Button
            variant={isLive ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="gap-1"
          >
            <Radio className="h-3 w-3" />
            {isLive ? "LIVE" : "Démarrer"}
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Athlete name bar */}
      <div className="px-4 py-2 bg-primary/5 border-b">
        <p className="text-sm font-medium">{athleteName} — {raceObjective}</p>
      </div>

      {/* Main 3-panel layout */}
      <main className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Panel 1: Conformité */}
        <ConformityPanel
          conformity={result.conformity}
          envelope={envelope}
          elapsedPct={result.elapsedPct}
        />

        {/* Panel 2: Risques */}
        <RisksPanel risks={result.risks} />

        {/* Panel 3: Décision */}
        <DecisionPanel
          decision={result.decision}
          suggestedMessages={result.suggestedMessages}
          selectedMessage={selectedMessage}
          onSelectMessage={setSelectedMessage}
        />
      </main>

      {/* Message bar */}
      {selectedMessage && (
        <div className="px-4 py-3 bg-primary/10 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium text-sm">Message préparé:</span>
            <span className="text-sm">"{selectedMessage}"</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
              Annuler
            </Button>
            <Button size="sm" className="gap-1">
              <Send className="h-3 w-3" />
              Envoyer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveDecisionMode;
