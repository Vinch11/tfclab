/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS UNIFIED CARD — Phase 1c UX Consolidation
 * 
 * Fusionne:
 * - RaceReadinessSignatureChart (Matrice Potentiel × Disponibilité)
 * - RaceReadinessV2Module (Décision TFCL V2)
 * - RaceReadinessGauge (Jauge circulaire)
 * 
 * Architecture: Header synthèse + Tabs internes (Vue, Matrice, Décision, Détails)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Target,
  Zap,
  Battery,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  TrendingUp,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import { TFCLDecisionChart } from "./TFCLDecisionChart";
import {
  type RaceReadinessV2Result,
  type ComputeDecisionInput,
  computeDecisionTFCL,
  RACE_READINESS_V2_DEFINITIONS,
  getRaceReadinessV2BadgeClass,
} from "@/lib/v2/raceReadinessV2";
import {
  RaceReadinessSignatureChart,
  type RaceReadinessInput,
} from "@/components/RaceReadinessSignatureChart";
import type { CompassScores } from "@/lib/compassScoring";
import type { DisponibiliteTFCL, TFCLReadinessInput } from "@/lib/v2/disponibiliteTFCL";
import type { DbCheckin } from "@/hooks/useCloudData";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RaceReadinessUnifiedCardProps {
  // V2 Decision data
  compass: CompassScores;
  disponibilite?: DisponibiliteTFCL;
  latestCheckin?: DbCheckin | null;
  readinessInput?: TFCLReadinessInput;
  objectiveData?: TFCLReadinessInput['objective'];
  guardrails?: {
    healthAlert?: boolean;
    injuryRiskLevel?: 'low' | 'moderate' | 'high' | 'critical';
    fatigueIndex?: number;
  };
  
  // Signature Chart data
  signatureInput?: RaceReadinessInput;
  
  // Common
  athleteName?: string;
  objectif?: string;
  compact?: boolean;
  staffMode?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function RaceReadinessUnifiedCard({
  compass,
  disponibilite,
  latestCheckin,
  readinessInput,
  objectiveData,
  guardrails,
  signatureInput,
  athleteName = "Athlète",
  objectif = "IM",
  compact = false,
  staffMode = false,
  className,
}: RaceReadinessUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState<string>("vue");
  const [isOpen, setIsOpen] = useState(!compact);

  // ── V2 Decision computation ──
  const result = useMemo(() => {
    let readinessInputFinal: TFCLReadinessInput | undefined = readinessInput;

    if (!disponibilite && !readinessInput && latestCheckin) {
      readinessInputFinal = {
        sleep: latestCheckin.sleep ?? null,
        fatigue: latestCheckin.fatigue ?? null,
        soreness: latestCheckin.soreness ?? null,
        stress: latestCheckin.stress ?? null,
        motivation: latestCheckin.motivation ?? null,
        alerts: latestCheckin.pain_flag ? { asymmetric_pain: true } : undefined,
        objective: objectiveData,
      };
    }

    const input: ComputeDecisionInput = {
      compass,
      disponibilite,
      readinessInput: readinessInputFinal,
      guardrails,
    };

    return computeDecisionTFCL(input);
  }, [compass, disponibilite, latestCheckin, readinessInput, objectiveData, guardrails]);

  // ── Gauge data ──
  const gaugeData = useMemo(() => {
    const score = result.readiness.score;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    const color =
      score >= 80 ? "hsl(var(--success))" :
      score >= 60 ? "hsl(var(--warning))" :
      "hsl(var(--destructive))";

    return { circumference, offset, color, score };
  }, [result]);

  return (
    <Card className={cn("border-primary/20 overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ═══ HEADER ═══ */}
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Race Readiness
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.readiness.categoryLabel} — {result.readiness.confidenceLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mini flow when collapsed */}
                {!isOpen && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Potentiel {result.potential.score}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}

                {/* Score badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-lg px-3 py-1 font-bold",
                    getRaceReadinessV2BadgeClass(result.readiness.category)
                  )}
                >
                  {result.readiness.categoryEmoji} {result.readiness.score}
                </Badge>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        {/* ═══ EXPANDED CONTENT ═══ */}
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* ── Header synthèse : Jauge + Statut + Flow ── */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-secondary/20 border border-border">
              {/* Jauge circulaire */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%" cy="50%" r="45%"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50%" cy="50%" r="45%"
                    fill="none"
                    stroke={gaugeData.color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={gaugeData.circumference}
                    strokeDashoffset={gaugeData.offset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-mono" style={{ color: gaugeData.color }}>
                    {gaugeData.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Flow Potentiel → Score */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FlowStep
                    icon={<Zap className="w-3.5 h-3.5" />}
                    label="Potentiel"
                    value={result.potential.score}
                  />
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <FlowStep
                    icon={<Target className="w-3.5 h-3.5" />}
                    label="Décision"
                    value={result.readiness.score}
                    highlight
                  />
                </div>

                {result.penalties.total > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Pénalités appliquées: -{result.penalties.total}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {result.explanation.why}
                </p>
              </div>
            </div>

            {/* ── TABS ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={cn("grid w-full", signatureInput ? "grid-cols-4" : "grid-cols-3")}>
                <TabsTrigger value="vue" className="text-xs sm:text-sm min-h-[44px]">Vue d'ensemble</TabsTrigger>
                {signatureInput && (
                  <TabsTrigger value="matrice" className="text-xs sm:text-sm min-h-[44px]">Matrice</TabsTrigger>
                )}
                <TabsTrigger value="decision" className="text-xs sm:text-sm min-h-[44px]">Décision</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm min-h-[44px]">Détails</TabsTrigger>
              </TabsList>

              <SwipeableTabsContent 
                tabs={signatureInput ? ["vue", "matrice", "decision", "details"] : ["vue", "decision", "details"]} 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
              >

              {/* ── Tab: Vue d'ensemble (TFCL Decision Chart) ── */}
              <AnimatedTabsContent value="vue" activeValue={activeTab} className="pt-4">
                <TFCLDecisionChart
                  result={result}
                  athleteName={athleteName}
                  objectif={objectif}
                />
              </AnimatedTabsContent>

              {/* ── Tab: Matrice — deferred ── */}
              {signatureInput && (
                <LazyTabsContent value="matrice" activeValue={activeTab} showLoader className="pt-4">
                  <RaceReadinessSignatureChart
                    input={signatureInput}
                    compact={!staffMode}
                  />
                </LazyTabsContent>
              )}

              {/* ── Tab: Décision TFCL ── */}
              <LazyTabsContent value="decision" activeValue={activeTab} className="pt-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Décision (Race Readiness TFCL™)</h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {RACE_READINESS_V2_DEFINITIONS.decision.definition}
                  </p>

                  <div className={cn(
                    "p-4 rounded-lg border mb-4",
                    getRaceReadinessV2BadgeClass(result.readiness.category)
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold">{result.readiness.score}</p>
                        <p className="text-sm font-medium">{result.readiness.categoryLabel}</p>
                      </div>
                      <div className="text-4xl">{result.readiness.categoryEmoji}</div>
                    </div>
                  </div>

                  {/* Formule */}
                  {staffMode && (
                    <div className="p-3 rounded bg-muted/50 text-xs font-mono mb-4">
                      <p>RR = Potentiel − Pénalités</p>
                      <p className="text-muted-foreground">
                        = {result.potential.score} − {result.penalties.total} = {result.readiness.score}
                      </p>
                    </div>
                  )}

                  {result.explanation.suggestedFocus.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">Focus suggéré :</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {result.explanation.suggestedFocus.map((f, i) => (
                          <li key={i}>→ {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </LazyTabsContent>

              {/* ── Tab: Détails Potentiel + Disponibilité ── */}
              <LazyTabsContent value="details" activeValue={activeTab} className="pt-4 space-y-4">
                {/* Potentiel */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Potentiel</h3>
                    <Badge variant="outline" className="text-xs ml-auto font-mono">{result.potential.score}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <ScoreCard label="Capacité Aérobie" value={result.potential.sources.aerobic.value} type={result.potential.sources.aerobic.type} />
                    <ScoreCard label="Tolérance Effort" value={result.potential.sources.tolerance.value} type={result.potential.sources.tolerance.type} />
                    <ScoreCard label="Profil Métabolique" value={result.potential.sources.metabolic.value} type={result.potential.sources.metabolic.type} />
                    <ScoreCard label="Robustesse" value={result.potential.sources.robustness.value} type={result.potential.sources.robustness.type} />
                  </div>

                  {(result.potential.mainStrength || result.potential.mainLimitation) && (
                    <div className="mt-3 text-xs space-y-1">
                      {result.potential.mainStrength && (
                        <p className="text-success">+ {result.potential.mainStrength}</p>
                      )}
                      {result.potential.mainLimitation && (
                        <p className="text-warning">⚠ {result.potential.mainLimitation}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Disponibilité */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Battery className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Disponibilité</h3>
                    <Badge variant="outline" className="text-xs ml-auto font-mono">{result.availability.score}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {result.availability.recommendation}
                  </p>

                  {result.availability.factors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {result.availability.factors.map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  )}

                  {result.availability.alerts.length > 0 && (
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                      <p className="text-xs text-destructive">
                        {result.availability.alerts.join(' | ')}
                      </p>
                    </div>
                  )}
                </div>
              </LazyTabsContent>
              </SwipeableTabsContent>
            </Tabs>

            {/* ── Disclaimer ── */}
            <div className="flex items-center gap-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>{result.disclaimer}</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FlowStep({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs",
      highlight
        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
        : "bg-muted/50 border-border text-muted-foreground"
    )}>
      {icon}
      <span>{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: 'measured' | 'estimated' | 'modeled';
}) {
  const typeLabel = type === 'measured' ? '📏' : type === 'estimated' ? '📊' : '🧮';
  const typeTooltip = type === 'measured' ? 'Mesuré' : type === 'estimated' ? 'Estimé' : 'Modélisé';

  return (
    <div className="p-3 rounded bg-background/50 border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs" title={typeTooltip}>{typeLabel}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default RaceReadinessUnifiedCard;
