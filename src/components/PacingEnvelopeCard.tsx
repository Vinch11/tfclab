/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE™ CARD — Affichage Complet du Système de Pacing
 * Two For Coaching Lab Method™
 * 
 * Composant principal affichant:
 * - Le couloir de pacing (Envelope)
 * - Les règles de discipline
 * - Le profil de sensibilité
 * - Les scénarios de risque
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, 
  AlertTriangle, 
  Shield, 
  Lightbulb,
  TrendingUp,
  Activity,
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeRaceTypeForDisplay } from "@/lib/raceTypeNormalization";

import {
  computePacingEnvelope,
  type PacingEnvelopeInput,
  type PacingEnvelopeResult,
  PACING_ENVELOPE_DEFINITIONS,
} from "@/lib/v2/pacingEnvelopeEngine";

import {
  generateDisciplineRules,
  type DisciplineRulesResult,
} from "@/lib/v2/pacingDisciplineRules";

import {
  simulatePacingScenarios,
  type ScenarioSimulationResult,
} from "@/lib/v2/pacingScenarioSimulator";

import { PacingDisciplineChart } from "@/components/charts/PacingDisciplineChart";
import {
  PacingConceptCard,
  PacingWhyBox,
  PacingRacePlanBox,
  PacingVisualBar,
  PacingGlossaryHint,
  buildDriversFromEnvelope,
  type RacePhase,
} from "@/components/pacing/PacingPedagogy";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PacingEnvelopeCardProps {
  input: PacingEnvelopeInput;
  
  // Options d'affichage
  showChart?: boolean;
  showRules?: boolean;
  showScenarios?: boolean;
  staffMode?: boolean;
  compact?: boolean;
  
  // Données de course (pour simulation)
  raceDistanceKm?: number;
  raceDurationMin?: number;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit un plan de course en 3 phases à partir de l'enveloppe.
 * Approche "negative split" : conservateur au départ, cible au milieu, courage au finish.
 */
function buildPhasesFromEnvelope(envelope: PacingEnvelopeResult): [RacePhase, RacePhase, RacePhase] {
  const { lowPct, centerPct, highPct } = envelope.boundary;
  // Départ : bas du couloir (protection W')
  const startLow = lowPct;
  const startHigh = Math.max(lowPct + 1, centerPct - 2);
  // Milieu : autour du centre
  const midLow = Math.max(lowPct, centerPct - 1);
  const midHigh = Math.min(highPct, centerPct + 1);
  // Finish : centre → haut du couloir (voire toléré si tout va bien)
  const endLow = centerPct;
  const endHigh = highPct;

  return [
    {
      label: "Départ",
      window: "0 → 33% de la course",
      targetPct: `${startLow}–${startHigh}% ${envelope.boundary.referenceShortLabel}`,
      targetPace: null,
      do: "Rester conservateur, laisser les autres partir vite. Ton W′ se protège ici.",
      dont: "Attaquer parce que tu te sens bien : c'est le piège classique.",
    },
    {
      label: "Milieu",
      window: "33 → 66%",
      targetPct: `${midLow}–${midHigh}% ${envelope.boundary.referenceShortLabel}`,
      targetPace: null,
      do: "Installer la cible, verrouiller la respiration, boire/manger comme prévu.",
      dont: "Suivre une accélération d'un concurrent — c'est SA course, pas la tienne.",
    },
    {
      label: "Finish",
      window: "66 → 100%",
      targetPct: `${endLow}–${endHigh}% ${envelope.boundary.referenceShortLabel}`,
      targetPace: null,
      do: "Puiser dans la réserve : si tu as tenu la discipline, tu peux monter.",
      dont: "Attendre les 200 derniers mètres pour tout donner.",
    },
  ];
}



// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

function EnvelopeSummary({ envelope }: { envelope: PacingEnvelopeResult }) {
  const { boundary, envelopeWidth, envelopeWidthLabel, confidenceLabel } = envelope;

  return (
    <div className="space-y-3">
      {/* Référence d'intensité */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border",
        boundary.isFallbackReference
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      )}>
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Intensités exprimées en <strong>% de {boundary.referenceShortLabel}</strong>
          {boundary.isFallbackReference && (
            <span className="ml-1 opacity-80">(estimation indirecte)</span>
          )}
        </span>
      </div>

      {/* Mini-bandeau visuel du couloir */}
      <div className="rounded-lg border bg-card/50 p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          <span>Couloir cible</span>
          <span>± {envelopeWidth}% · {confidenceLabel}</span>
        </div>
        <div className="relative h-7 rounded-md overflow-hidden bg-muted">
          {/* Bande optimale */}
          <div
            className="absolute inset-y-0 bg-emerald-500/35"
            style={{
              left: `${((boundary.lowPct - 50) / 50) * 100}%`,
              width: `${((boundary.highPct - boundary.lowPct) / 50) * 100}%`,
            }}
          />
          {/* Marqueur centre */}
          <div
            className="absolute inset-y-0 w-0.5 bg-emerald-700 dark:bg-emerald-400"
            style={{ left: `${((boundary.centerPct - 50) / 50) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-emerald-700 dark:bg-emerald-400" />
          </div>
          {/* Bande tolérée */}
          <div
            className="absolute inset-y-0 bg-amber-500/30"
            style={{
              left: `${((boundary.highPct - 50) / 50) * 100}%`,
              width: `${((boundary.toleratedPct - boundary.highPct) / 50) * 100}%`,
            }}
          />
          {/* Bande interdite */}
          <div
            className="absolute inset-y-0 bg-red-500/35"
            style={{
              left: `${((boundary.toleratedPct - 50) / 50) * 100}%`,
              right: 0,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>50%</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {boundary.lowPct}–{boundary.highPct}% · cible {boundary.centerPct}%
          </span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

const RULE_ACCENTS = {
  non_negotiable: {
    icon: Shield,
    title: "Non négociables",
    accent: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    bg: "bg-red-500/5 border-red-500/20",
  },
  prohibition: {
    icon: AlertTriangle,
    title: "Interdictions",
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    bg: "bg-amber-500/5 border-amber-500/20",
  },
  coach_phrase: {
    icon: Lightbulb,
    title: "Phrases coach",
    accent: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    bg: "bg-blue-500/5 border-blue-500/20",
  },
} as const;

function RuleGroup({
  kind,
  rules,
  italic = false,
  limit,
}: {
  kind: keyof typeof RULE_ACCENTS;
  rules: any[];
  italic?: boolean;
  limit?: number;
}) {
  if (!rules.length) return null;
  const meta = RULE_ACCENTS[kind];
  const Icon = meta.icon;
  const items = limit ? rules.slice(0, limit) : rules;

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h4 className={cn("text-xs font-semibold flex items-center gap-1.5", meta.accent)}>
          <Icon className="h-3.5 w-3.5" />
          {meta.title}
        </h4>
        <Badge variant="outline" className="text-[9px] font-mono px-1.5 h-4">
          {rules.length}
        </Badge>
      </header>
      <div className="space-y-1.5">
        {items.map((rule) => (
          <div
            key={rule.id}
            className={cn("relative pl-3 pr-3 py-2 rounded-md border overflow-hidden", meta.bg)}
          >
            <div className={cn("absolute inset-y-0 left-0 w-1", meta.bar)} />
            <div className="flex items-start gap-2 ml-1">
              <span className="text-sm leading-none mt-0.5">{rule.icon}</span>
              <div className="min-w-0 flex-1">
                {!italic && rule.title && (
                  <div className="text-xs font-medium leading-tight">{rule.title}</div>
                )}
                <div
                  className={cn(
                    "text-[11px] leading-snug",
                    italic ? "text-muted-foreground italic" : "text-muted-foreground mt-0.5",
                  )}
                >
                  {italic ? `"${rule.message}"` : rule.message}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RulesSection({ rules }: { rules: DisciplineRulesResult }) {
  return (
    <div className="space-y-4">
      {/* Badge profil sensible */}
      {rules.showSensitiveBadge && rules.sensitiveMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <p className="text-xs text-purple-700 dark:text-purple-300 leading-snug">
            {rules.sensitiveMessage}
          </p>
        </div>
      )}

      <RuleGroup kind="non_negotiable" rules={rules.nonNegotiables} limit={4} />
      <RuleGroup kind="prohibition" rules={rules.prohibitions} limit={3} />
      <RuleGroup kind="coach_phrase" rules={rules.coachPhrases} italic limit={3} />
    </div>
  );
}

const SEVERITY_META = {
  critical: { label: "Critique", bar: "bg-red-500", text: "text-red-700 dark:text-red-300", bg: "bg-red-500/5 border-red-500/30", dot: "bg-red-500", badge: "destructive" as const },
  major:    { label: "Majeur",   bar: "bg-orange-500", text: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/5 border-orange-500/30", dot: "bg-orange-500", badge: "outline" as const },
  moderate: { label: "Modéré",   bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/5 border-amber-500/25", dot: "bg-amber-500", badge: "outline" as const },
  minor:    { label: "Mineur",   bar: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/5 border-blue-500/25", dot: "bg-blue-500", badge: "outline" as const },
};

function ScenarioRow({ scenario }: { scenario: any }) {
  const meta = SEVERITY_META[scenario.consequence.severity as keyof typeof SEVERITY_META] ?? SEVERITY_META.minor;
  return (
    <div className={cn("relative rounded-lg border overflow-hidden", meta.bg)}>
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.bar)} />
      <div className="p-3 pl-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base leading-none">{scenario.icon}</span>
          <span className="font-semibold text-sm">{scenario.title}</span>
          <Badge variant={meta.badge} className={cn("text-[9px] px-1.5 h-4", meta.badge === "outline" && meta.text)}>
            {meta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-[11px]">
          <span className="font-mono font-semibold text-muted-foreground">SI</span>
          <span className="text-foreground/90 leading-snug">{scenario.condition.description}</span>

          <span className={cn("font-mono font-semibold", meta.text)}>ALORS</span>
          <span className={cn("leading-snug", meta.text)}>{scenario.consequence.description}</span>
        </div>

        {/* Impact metrics */}
        {(scenario.consequence.glycogenImpactPct || scenario.consequence.performanceLossPct) && (
          <div className="flex gap-2 pt-1">
            {scenario.consequence.glycogenImpactPct > 0 && (
              <div className="flex-1 rounded-md border bg-card/50 px-2 py-1">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Glycogène</div>
                <div className="text-xs font-bold font-mono text-orange-600 dark:text-orange-400">
                  −{scenario.consequence.glycogenImpactPct}%
                </div>
              </div>
            )}
            {scenario.consequence.performanceLossPct > 0 && (
              <div className="flex-1 rounded-md border bg-card/50 px-2 py-1">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Perf</div>
                <div className="text-xs font-bold font-mono text-red-600 dark:text-red-400">
                  −{scenario.consequence.performanceLossPct}%
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground italic border-t pt-1.5 mt-1 leading-snug">
          💡 {scenario.pedagogicalMessage}
        </div>
      </div>
    </div>
  );
}

function ScenariosSection({ scenarios }: { scenarios: ScenarioSimulationResult }) {
  const riskLevel = Math.max(0, Math.min(100, scenarios.totalRiskLevel ?? 0));
  const riskColor =
    riskLevel >= 70 ? "bg-red-500" : riskLevel >= 40 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-3">
      {/* Risk meter */}
      <div className="rounded-lg border bg-card/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Niveau de risque global</span>
          </div>
          <span className="text-sm font-bold font-mono">{riskLevel}/100</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full transition-all", riskColor)} style={{ width: `${riskLevel}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug pt-1">
          {scenarios.primaryWarning}
        </p>
      </div>

      {/* Scénarios critiques en premier */}
      {scenarios.criticalScenarios.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Scénarios critiques · {scenarios.criticalScenarios.length}
          </h4>
          {scenarios.criticalScenarios.map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}

      {/* Autres scénarios */}
      {scenarios.scenarios.filter((s) => s.consequence.severity !== "critical").length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            Autres scénarios à surveiller
          </h4>
          {scenarios.scenarios
            .filter((s) => s.consequence.severity !== "critical")
            .slice(0, 3)
            .map((scenario) => (
              <ScenarioRow key={scenario.id} scenario={scenario} />
            ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic text-center pt-1">
        {scenarios.disclaimer}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function PacingEnvelopeCard({
  input,
  showChart = true,
  showRules = true,
  showScenarios = true,
  staffMode = false,
  compact = false,
  raceDistanceKm,
  raceDurationMin = 180,
  className,
}: PacingEnvelopeCardProps) {
  // Calculer l'enveloppe
  const envelope = useMemo(() => computePacingEnvelope(input), [input]);
  
  // Générer les règles
  const rules = useMemo(() => {
    if (!envelope) return null;
    return generateDisciplineRules({
      envelope,
      vlamaxEffectif: input.vlamaxEffectif,
      raceObjective: input.raceObjective,
      sport: input.sport,
      potentielPhysiologiqueScore: input.potentielPhysiologiqueScore,
      ambition: (input as any).ambition ?? null,
      tteMin: (input as any).tteEffectif?.tte_min ?? null,
    });
  }, [envelope, input]);
  
  // Générer les scénarios
  const scenarios = useMemo(() => {
    if (!envelope) return null;
    return simulatePacingScenarios({
      envelope,
      raceObjective: input.raceObjective,
      vlamaxValue: input.vlamaxEffectif?.value ?? null,
      tteMin: input.tteEffectif?.tte_min ?? null,
      raceDistanceKm: raceDistanceKm ?? 90,
      raceDurationMin,
    });
  }, [envelope, input, raceDistanceKm, raceDurationMin]);
  
  // Guard: données insuffisantes si aucune donnée métabolique
  const isInsufficient = !envelope || (
    input.vlamaxEffectif?.value === null && 
    input.tteEffectif?.tte_min === 0 && 
    input.ftp === null
  );

  if (isInsufficient) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pacing Envelope™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Renseignez au minimum FTP, VLamax ou TTE dans un snapshot pour calculer l'enveloppe de pacing.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Version compacte
  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Pacing Envelope™</CardTitle>
            </div>
            <Badge variant="outline">{normalizeRaceTypeForDisplay(input.raceObjective)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <EnvelopeSummary envelope={envelope} />
          {envelope.readinessMessage && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{envelope.readinessMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Version complète avec onglets
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pacing Envelope™ TFCL</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {envelope.pacingProfile.badge && (
              <Badge className="bg-purple-600 text-white text-[10px]">
                {envelope.pacingProfile.badge}
              </Badge>
            )}
            <Badge variant="outline">{normalizeRaceTypeForDisplay(input.raceObjective)}</Badge>
            {staffMode && (
              <Badge variant="secondary" className="text-[10px]">STAFF</Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          {PACING_ENVELOPE_DEFINITIONS.official.slice(0, 100)}...
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé de l'enveloppe */}
        <EnvelopeSummary envelope={envelope} />
        
        {/* Alerte Readiness */}
        {envelope.readinessMessage && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">{envelope.readinessMessage}</AlertDescription>
          </Alert>
        )}

        {/* Onglets — "Comprendre" en premier (pédagogie) */}
        <Tabs defaultValue="understand" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="understand" className="text-xs">Comprendre</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs">Graphique</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Règles</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Scénarios</TabsTrigger>
          </TabsList>

          {/* --- Onglet "Comprendre" : pédagogie complète --- */}
          <TabsContent value="understand" className="mt-3 space-y-4">
            <PacingConceptCard />
            <PacingVisualBar
              lowPct={envelope.boundary.lowPct}
              centerPct={envelope.boundary.centerPct}
              highPct={envelope.boundary.highPct}
              toleratedPct={envelope.boundary.toleratedPct}
              referenceLabel={envelope.boundary.referenceShortLabel}
            />
            <PacingWhyBox
              drivers={buildDriversFromEnvelope({
                vlamaxValue: input.vlamaxEffectif?.value ?? null,
                tteMin: input.tteEffectif?.tte_min ?? null,
                ambition: (input as any).ambition ?? null,
                raceObjective: input.raceObjective,
              })}
              centerPct={envelope.boundary.centerPct}
              referenceLabel={envelope.boundary.referenceShortLabel}
              confidenceLabel={envelope.confidenceLabel}
            />
            <PacingRacePlanBox
              phases={buildPhasesFromEnvelope(envelope)}
              keyPhrase={
                envelope.readinessMessage ??
                "Discipline au départ, patience au milieu, courage au finish."
              }
            />
          </TabsContent>

          {showChart && (
            <TabsContent value="chart" className="mt-3">
              <PacingDisciplineChart
                envelope={envelope}
                xAxisMode="time"
                totalDuration={raceDurationMin}
                totalDistance={raceDistanceKm}
                staffMode={staffMode}
              />
            </TabsContent>
          )}

          {showRules && rules && (
            <TabsContent value="rules" className="mt-3">
              <RulesSection rules={rules} />
            </TabsContent>
          )}

          {showScenarios && scenarios && (
            <TabsContent value="scenarios" className="mt-3">
              <ScenariosSection scenarios={scenarios} />
            </TabsContent>
          )}
        </Tabs>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic pt-2 border-t">
          {PACING_ENVELOPE_DEFINITIONS.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default PacingEnvelopeCard;
