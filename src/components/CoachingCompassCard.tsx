import { useMemo, useState } from "react";
import { Compass, Target, AlertTriangle, Eye, EyeOff, Zap, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeCoachingCompass, type CoachingCompassInput, type TFCLCoachingCompassResult } from "@/lib/coachingCompass";
import { compassFlow } from "@/lib/coachingCompass/compassFlow";
import type { PerformanceGoal } from "@/lib/coachingCompass/performanceComparison";
import { CompassProfileComparison } from "./CompassProfileComparison";
import { CompassPerformanceComparison } from "./CompassPerformanceComparison";
import { FieldMetricComparison } from "./charts/FieldComparison";
import { ReferenceGauge } from "./charts/ReferenceGauge";
import { LimiterImpactCard } from "./LimiterImpactCard";

interface CoachingCompassCardProps {
  input: CoachingCompassInput;
  staffMode?: boolean;
  athleteName?: string;
  onSavePerformanceGoal?: (goal: PerformanceGoal) => Promise<boolean>;
  className?: string;
}

function FlowConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-3 bg-gradient-to-b from-primary/40 to-primary/15 rounded-full" />
      <ChevronDown className="w-3.5 h-3.5 text-primary/40 -mt-0.5" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW STEP — Bloc du flux décisionnel
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowStepProps {
  level: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentClass: string;
  children?: React.ReactNode;
}

function FlowStep({ level, icon, title, subtitle, accentClass, children }: FlowStepProps) {
  return (
    <div className="relative print:break-inside-avoid">
      {/* Level indicator */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {level}
        </span>

      </div>
      
      {/* Content */}
      <div className={cn(
        "compass-step relative p-3 rounded-xl border",
        "bg-gradient-to-r from-muted/40 to-muted/20",
        "border-border/40"
      )}>
        {/* Left accent bar */}
        <div className={cn("absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full", accentClass)} />
        
        <div className="pl-3 flex items-start gap-3">
          <div className={cn(
            "shrink-0 p-2 rounded-lg border",
            "bg-background/80 border-border/50",
            accentClass.replace("bg-", "text-").replace("/80", "")
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tracking-tight">{title}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function FatigueWarning({ warning }: { warning: NonNullable<TFCLCoachingCompassResult["fatigueWarning"]> }) {
  if (warning.level === "none") return null;
  
  const colors = {
    moderate: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
    high: "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.2)]",
    critical: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)]",
    none: "",
  };

  return (
    <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium", colors[warning.level])}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      {warning.message}
    </div>
  );
}

export function CoachingCompassCard({ input, athleteName, onSavePerformanceGoal, staffMode: initialStaffMode = false, className }: CoachingCompassCardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const compass = useMemo(() => computeCoachingCompass(input), [input]);
  const flow = compassFlow(input, compass);
  const scope = [input.athleteId, input.objectif, input.ambition].join(':');
  return (
    <Card className={cn("compass-sheet border-border/50 overflow-hidden print:shadow-none", className)}>
      {/* ─── Header ─── */}
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-black tracking-tight">
                TFCL Coaching Compass™
              </CardTitle>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium tracking-wide hidden sm:block">
                PROFIL → LIMITEUR → LEVIER → DÉCISION
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStaffMode(!staffMode)}
            className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground print:hidden"
          >
            {staffMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {staffMode ? "Athlète" : "Staff"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="compass-spread pt-0 px-3 sm:px-6">
        {/* ─── Fatigue Warning ─── */}
        {compass.fatigueWarning && compass.fatigueWarning.level !== "none" && (
          <div className="mb-3">
            <FatigueWarning warning={compass.fatigueWarning} />
          </div>
        )}

        <section className="compass-profile min-w-0 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Niveau 1 — Profil physiologique</h3>
          <CompassProfileComparison key={scope} input={input} compass={compass} athleteName={athleteName} />
          {onSavePerformanceGoal && <CompassPerformanceComparison key={'goal:' + scope} goalOnly input={input} onSave={onSavePerformanceGoal} />}
          {staffMode && <details><summary className="cursor-pointer py-2 text-sm font-medium">Mesures, repères et sources</summary>
            <CompassProfileComparison key={'details:' + scope} input={input} compass={compass} detailsOnly />
          </details>}
        </section>
        <div className="compass-decisions contents">
          <FlowConnector />
          <FlowStep level="Niveau 2 — Limiteur principal" icon={<AlertTriangle size={16} />}
            title={flow.title} subtitle={flow.detail} accentClass="bg-amber-500">
            {flow.gap && <FieldMetricComparison metric={flow.gap} hypothesis={flow.lead?.hypothesis} />}
            {flow.lead?.comparison && <ReferenceGauge {...flow.lead.comparison} name={flow.lead.title} label="Bilan" />}
            {!!flow.others.length && <details><summary className="cursor-pointer py-2 text-xs">Autres facteurs classés</summary>
              <ol className="space-y-1 text-xs">{flow.others.map(f => <li key={f.title}>{f.title} · {f.status} · {f.facts}</li>)}</ol>
            </details>}
            {staffMode && flow.useBlock && <LimiterImpactCard limiter={compass.limiter.type} />}
          </FlowStep>
          <FlowConnector />
          <FlowStep level="Niveau 3 — Levier prioritaire" icon={<Zap size={16} />} title={flow.lever}
            subtitle={flow.useBlock ? compass.leverage.description : flow.lead?.title ?? 'Observation spécifique à l’objectif'} accentClass="bg-primary/80" />
          <FlowConnector />
          <FlowStep level="Niveau 4 — Décision coaching" icon={<Target size={16} />} title={flow.decision}
            subtitle={flow.useBlock ? (staffMode ? compass.decision.coachRationale : compass.decision.athleteMessage) : flow.instruction} accentClass="bg-emerald-500">
            {flow.useBlock && <div className="mt-2 space-y-1 text-xs">
              <p>{compass.decision.durationWeeks} semaines · {compass.decision.primaryWorkouts.join(' · ')}</p>
              {compass.decision.prohibitions.map(p => <p key={p}>{p}</p>)}
            </div>}
            {!flow.useBlock && flow.link && <a className="inline-block py-2 text-xs underline" href={flow.link}>Voir le protocole</a>}
          </FlowStep>
        </div>
      </CardContent>
    </Card>
  );
}
