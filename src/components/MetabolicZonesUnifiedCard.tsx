/**
 * MetabolicZonesUnifiedCard — Carte Zones Métaboliques consolidée (Phase 1b UX)
 * Remplace: FatMaxTFCLCard, FatMaxRaceIntensityChart, LactateCorrespondenceCard
 * 
 * Architecture:
 * - Header: FatMax valeur principale + confiance
 * - Onglets: FatMax / Seuils Lactiques / Graphique Énergie
 * - Sections collapsibles: Détails techniques, Éducation
 */

import { useState, useMemo } from "react";
import { useIsRunningOnly } from "@/hooks/useRunningFocusMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Flame,
  Droplets,
  BarChart3,
  Info,
  ChevronDown,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import {
  computeFatMaxTFCL,
  type FatMaxTFCLInput,
  type FatMaxTFCLResult,
  type FatMaxObjectif,
  getFatMaxConfidenceBadgeClass,
  getMetabolicZoneColor,
  formatFatMaxRange,
  formatFatMaxWatts,
  FATMAX_DEFINITIONS,
  generateEnergyProfileData,
  isMetabolicConflict,
  getMetabolicConflictMessage,
} from "@/lib/v2/fatmaxTFCL";
import {
  computeLactateThresholdsTFCL,
  TFCL_LACTATE_TABLE,
  type LactateThresholdsTFCL,
} from "@/lib/thresholds/computeLactateThresholdsTFCL";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { UnitToggle } from "@/components/charts/FatCarbOxidationChart";

// =============================================
// TYPES
// =============================================

export interface MetabolicZonesUnifiedCardProps {
  // FatMax inputs
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  objectif: string;
  ftp: number | null;
  /** VMA en km/h — utilisée pour afficher l'allure (min/km) si ftp absent */
  vma?: number | null;
  fatigueIndex?: number | null;

  // Display options
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

// Fraction de VMA correspondant à la vitesse au seuil
const V_SEUIL_FRACTION = 0.88;

function pctSeuilToPaceStr(pct: number, vma: number, fraction = V_SEUIL_FRACTION): string {
  const vSeuil = vma * fraction;
  const v = vSeuil * (pct / 100);
  if (!v || v <= 0) return "—";
  const min = 60 / v;
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function MetabolicZonesUnifiedCard({
  vlamaxEffectif,
  tteEffectif,
  objectif,
  ftp,
  vma = null,
  fatigueIndex = null,
  staffMode = false,
  compact = false,
  className,
}: MetabolicZonesUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState("fatmax");
  const [showEducation, setShowEducation] = useState(false);
  const isRunning = useIsRunningOnly();
  const ftpAvailable = !!(ftp && ftp > 0);
  const vmaAvailable = !!(vma && vma > 0);
  const canToggle = ftpAvailable && vmaAvailable;
  const [paceMode, setPaceMode] = useState<boolean>(
    isRunning && vmaAvailable ? true : (!ftpAvailable && vmaAvailable)
  );
  const refLabel = paceMode ? "Seuil" : (isRunning ? "Seuil" : "FTP");

  const normalizedObjectif = (objectif === "IM" ? "Ironman" : objectif) as FatMaxObjectif;

  // Compute FatMax
  const fatmax = useMemo(() => {
    const input: FatMaxTFCLInput = {
      vlamaxEffectif: vlamaxEffectif.value,
      vlamaxConfidence: vlamaxEffectif.confidence,
      vo2maxEffectif: null,
      tteEffectif: tteEffectif.tte_min,
      tteConfidence: tteEffectif.confidence,
      fatigueIndex,
      objectif: normalizedObjectif,
      ftp,
    };
    return computeFatMaxTFCL(input);
  }, [vlamaxEffectif, tteEffectif, fatigueIndex, normalizedObjectif, ftp]);

  // Compute Lactate thresholds
  const thresholds = useMemo(() =>
    computeLactateThresholdsTFCL({
      ftp,
      sport: objectif,
      tteValue: tteEffectif.tte_min,
      tteSource: tteEffectif.source as any,
      vlamaxValue: vlamaxEffectif.value,
      vlamaxSource: vlamaxEffectif.source as any,
    }),
    [ftp, objectif, tteEffectif, vlamaxEffectif]
  );

  // Unavailable state
  if (!fatmax && thresholds.lt1.confidence === 0 && thresholds.lt2.confidence === 0) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Zones Métaboliques TFCL™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Données insuffisantes</p>
            <p className="text-xs mt-1">VLamax et {refLabel} requis pour le calcul</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wattsRange = fatmax && !paceMode ? formatFatMaxWatts(fatmax, ftp) : null;
  const paceRange = fatmax && paceMode && vma
    ? `${pctSeuilToPaceStr(fatmax.physioMaxPctFTP, vma)}–${pctSeuilToPaceStr(fatmax.physioMinPctFTP, vma)}`
    : null;
  const hasLactateData = thresholds.lt1.confidence > 0 || thresholds.lt2.confidence > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* ═══ HEADER ═══ */}
      <CardHeader className="pb-4 p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Zones Métaboliques TFCL™
          </CardTitle>
          <div className="flex items-center gap-2">
            {canToggle && (
              <UnitToggle paceMode={paceMode} onChange={setPaceMode} />
            )}
            {fatmax && (
              <Badge
                variant="outline"
                className={cn("text-[11px]", getFatMaxConfidenceBadgeClass(fatmax.confidenceLevel))}
              >
                {fatmax.confidenceLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* FatMax — valeur dominante */}
        {fatmax && (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">FatMax</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display font-semibold text-3xl sm:text-4xl tracking-tight tabular-nums text-foreground">
                {formatFatMaxRange(fatmax)}
              </span>
              {wattsRange && (
                <span className="text-sm text-muted-foreground tabular-nums">{wattsRange}</span>
              )}
              {paceRange && (
                <span className="text-sm text-muted-foreground tabular-nums">{paceRange}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className={cn("w-3.5 h-3.5", getMetabolicZoneColor(fatmax.metabolicZone))} />
              <span className={cn("text-xs", getMetabolicZoneColor(fatmax.metabolicZone))}>
                {fatmax.zoneLabel}
              </span>
            </div>
          </div>
        )}

        {/* LT1/LT2 — secondaires, en retrait */}
        {hasLactateData && (
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border/50">
            {thresholds.lt1.confidence > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">LT1</span>
                <span className="text-sm text-foreground tabular-nums">{thresholds.lt1.label}</span>
              </div>
            )}
            {thresholds.lt2.confidence > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">LT2</span>
                <span className="text-sm text-foreground tabular-nums">{thresholds.lt2.label}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5 pt-0 p-4 sm:p-6">

        {/* ═══ TABS ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${hasLactateData ? 3 : 2}, 1fr)` }}>
            <TabsTrigger value="fatmax" className="text-xs sm:text-sm gap-1 min-h-[44px]">
              <Flame className="h-3 w-3" /> FatMax
            </TabsTrigger>
            {hasLactateData && (
              <TabsTrigger value="lactate" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                <Droplets className="h-3 w-3" /> Seuils
              </TabsTrigger>
            )}
            <TabsTrigger value="crossover" className="text-xs sm:text-sm gap-1 min-h-[44px]">
              <BarChart3 className="h-3 w-3" /> Crossover
            </TabsTrigger>
          </TabsList>

          <SwipeableTabsContent 
            tabs={hasLactateData ? ["fatmax", "lactate", "crossover"] : ["fatmax", "crossover"]} 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          >

          {/* FatMax Tab */}
          <AnimatedTabsContent value="fatmax" activeValue={activeTab} className="mt-3 space-y-3">
            <FatMaxTabContent fatmax={fatmax} ftp={ftp} vma={vma} paceMode={paceMode} compact={compact} staffMode={staffMode} refLabel={refLabel} />
          </AnimatedTabsContent>

          {/* Lactate Thresholds Tab — deferred */}
          {hasLactateData && (
            <LazyTabsContent value="lactate" activeValue={activeTab} className="mt-3 space-y-3">
              <LactateTabContent thresholds={thresholds} staffMode={staffMode} ftp={ftp} />
            </LazyTabsContent>
          )}

          {/* Crossover Tab — deferred */}
          <LazyTabsContent value="crossover" activeValue={activeTab} showLoader className="mt-3 space-y-3">
            <CrossoverTabContent fatmax={fatmax} objectif={normalizedObjectif} />
          </LazyTabsContent>
          </SwipeableTabsContent>
        </Tabs>

        {/* ═══ ÉDUCATION ═══ */}
        <Collapsible open={showEducation} onOpenChange={setShowEducation}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-3 w-3" />
                Comprendre les zones métaboliques
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showEducation && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>FatMax</strong> = intensité où l'oxydation des lipides est maximale.
              Au-delà, les glucides prennent le relais (zone de <strong>Crossover</strong>).
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-emerald-500/10 rounded">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">Sous FatMax</p>
                <p className="mt-1">Économie glucidique maximale. Idéal longue distance.</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded">
                <p className="font-medium text-amber-700 dark:text-amber-300">Au-dessus Crossover</p>
                <p className="mt-1">Dépendance glucidique forte. Risque de mur glycogénique.</p>
              </div>
            </div>
            <p className="italic">
              LT1/LT2 (seuils lactiques) marquent les transitions métaboliques clés pour doser l'effort.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Estimations TFCL™ — précision accrue avec test labo / calorimétrie.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// SUB: FatMax Tab
// =============================================

function FatMaxTabContent({
  fatmax,
  ftp,
  vma = null,
  paceMode = false,
  compact,
  staffMode,
  refLabel = "FTP",
}: {
  fatmax: FatMaxTFCLResult | null;
  ftp: number | null;
  vma?: number | null;
  paceMode?: boolean;
  compact: boolean;
  staffMode: boolean;
  refLabel?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!fatmax) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>VLamax requise pour estimer la FatMax</span>
      </div>
    );
  }

  const fatMaxPaceRange = paceMode && vma
    ? `${pctSeuilToPaceStr(fatmax.physioMaxPctFTP, vma)}–${pctSeuilToPaceStr(fatmax.physioMinPctFTP, vma)}`
    : null;
  const centerPace = paceMode && vma ? pctSeuilToPaceStr(fatmax.centerPctFTP, vma) : null;
  const crossoverPaceRange = paceMode && vma
    ? `${pctSeuilToPaceStr(fatmax.crossoverZone[1], vma)}–${pctSeuilToPaceStr(fatmax.crossoverZone[0], vma)}`
    : null;

  return (
    <div className="space-y-3">
      {/* Plage FatMax */}
      <div className="text-center p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Plage FatMax</p>
        <p className="font-display font-semibold text-3xl sm:text-4xl tracking-tight tabular-nums">{formatFatMaxRange(fatmax)}</p>
        {fatMaxPaceRange && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 tabular-nums">{fatMaxPaceRange}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Centre : <span className="text-foreground tabular-nums">{fatmax.centerPctFTP}% {refLabel}</span>
          {centerPace && <span className="ml-2 tabular-nums">({centerPace})</span>}
        </p>
      </div>

      {/* Crossover Zone */}
      <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium">Crossover Zone</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
              {fatmax.crossoverZone[0]}–{fatmax.crossoverZone[1]}% {refLabel}
            </span>
            {crossoverPaceRange && (
              <div className="font-mono text-[10px] text-amber-600/80 dark:text-amber-400/80">{crossoverPaceRange}</div>
            )}
          </div>
        </div>
      </div>

      {/* Interprétation */}
      {!compact && (
        <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground">{fatmax.interpretation}</p>
        </div>
      )}

      {/* Pourquoi ce résultat */}
      <Collapsible open={showWhy} onOpenChange={setShowWhy}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-3 w-3" /> Pourquoi ce résultat ?
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", showWhy && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-1.5 p-2.5 bg-muted/30 rounded-lg">
            {fatmax.adjustments.map((adj) => (
              <div key={adj.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{adj.label}</span>
                <span className="flex items-center gap-1 font-mono">
                  {adj.direction === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {adj.direction === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {adj.id === "base"
                    ? `${adj.value.toFixed(0)}%`
                    : `${adj.value > 0 ? "+" : ""}${adj.value}%`}
                </span>
              </div>
            ))}
            <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between text-xs font-medium">
              <span>Résultat final</span>
              <span className="font-mono">{fatmax.centerPctFTP}% {refLabel}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Staff details */}
      {staffMode && !compact && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              <span>Détails techniques</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showDetails && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-2.5 bg-muted/50 rounded-lg text-xs space-y-2">
              <p>{fatmax.staffNote}</p>
              <p className="text-muted-foreground italic">{FATMAX_DEFINITIONS.scientificWarning}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// =============================================
// SUB: Lactate Thresholds Tab
// =============================================

function LactateTabContent({
  thresholds,
  staffMode,
  ftp,
}: {
  thresholds: LactateThresholdsTFCL;
  staffMode: boolean;
  ftp: number | null;
}) {
  function confidenceColor(c: number): string {
    if (c >= 0.75) return "text-emerald-500";
    if (c >= 0.55) return "text-amber-500";
    return "text-destructive";
  }

  function confidenceBadgeVariant(c: number): "default" | "secondary" | "destructive" {
    if (c >= 0.75) return "default";
    if (c >= 0.55) return "secondary";
    return "destructive";
  }

  return (
    <div className="space-y-3">
      {/* LT1 / LT2 badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-2.5 bg-sky-500/10 border-sky-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              LT1 estimé
            </span>
            <Badge variant={confidenceBadgeVariant(thresholds.lt1.confidence)} className="text-[10px] h-4">
              {Math.round(thresholds.lt1.confidence * 100)}%
            </Badge>
          </div>
          <p className="font-mono font-bold text-sm">{thresholds.lt1.label}</p>
        </div>
        <div className="rounded-lg border p-2.5 bg-rose-500/10 border-rose-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              LT2 estimé
            </span>
            <Badge variant={confidenceBadgeVariant(thresholds.lt2.confidence)} className="text-[10px] h-4">
              {Math.round(thresholds.lt2.confidence * 100)}%
            </Badge>
          </div>
          <p className="font-mono font-bold text-sm">{thresholds.lt2.label}</p>
        </div>
      </div>

      {/* TFCL ↔ Lactate Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[10px] font-semibold whitespace-nowrap">Élément TFCL</TableHead>
              <TableHead className="text-[10px] font-semibold whitespace-nowrap">Correspondance</TableHead>
              <TableHead className="text-[10px] font-semibold whitespace-nowrap">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TFCL_LACTATE_TABLE.map((row) => (
              <TableRow key={row.element}>
                <TableCell className="text-xs font-medium py-2 whitespace-nowrap">{row.element}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-2 whitespace-nowrap">{row.correspondence}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-[9px] font-normal whitespace-nowrap">
                    {row.dataSource}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Staff Mode */}
      {staffMode && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-medium flex-1">Mode Staff — Justifications</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="space-y-1.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-medium flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Pourquoi ces valeurs ?
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>LT2 dépend de TTE : plus TTE est élevé, plus LT2 se rapproche du seuil</li>
                <li>LT1 s'éloigne si VLamax est élevé (profil glycolytique)</li>
              </ul>
            </div>
            {thresholds.notes.length > 0 && (
              <div className="text-[10px] text-muted-foreground space-y-0.5 p-2 bg-muted/20 rounded">
                {thresholds.notes.map((n, i) => (
                  <p key={i}>• {n}</p>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// =============================================
// SUB: Crossover Tab (simplified energy profile)
// =============================================

function CrossoverTabContent({
  fatmax,
  objectif,
}: {
  fatmax: FatMaxTFCLResult | null;
  objectif: string;
}) {
  if (!fatmax) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>FatMax requise pour afficher le profil énergétique</span>
      </div>
    );
  }

  // Race intensity mapping
  const raceIntensityMap: Record<string, number> = {
    Ironman: 70, "70.3": 78, Marathon: 82, Semi: 86, "10km": 92,
  };
  const raceIntensity = raceIntensityMap[objectif] ?? 75;
  const conflict = isMetabolicConflict(fatmax, raceIntensity);

  // Libellés alignés sur le modèle canonique Z1–Z6 (cf. carte « Zones d'entraînement »)
  const zones = [
    { label: "Z1 Récup.", range: "< 55%", pctLipid: 85, color: "bg-emerald-500" },
    { label: "Z2 FatMax", range: `${fatmax.minPctFTP}–${fatmax.maxPctFTP}%`, pctLipid: 65, color: "bg-emerald-400" },
    { label: "Z3 Crossover", range: `${fatmax.crossoverZone[0]}–${fatmax.crossoverZone[1]}%`, pctLipid: 40, color: "bg-amber-400" },
    { label: "Z4+ Supra-seuil", range: `> ${fatmax.crossoverZone[1]}%`, pctLipid: 15, color: "bg-red-400" },
  ];

  return (
    <div className="space-y-3">
      {/* Visual bars */}
      <div className="space-y-2">
        {zones.map((zone) => (
          <div key={zone.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24 text-right">{zone.label}</span>
            <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden relative">
              <div
                className={cn("h-full rounded-full", zone.color)}
                style={{ width: `${zone.pctLipid}%` }}
              />
              <span className="absolute right-1.5 top-0 bottom-0 flex items-center text-[9px] font-mono">
                {zone.pctLipid}% lip.
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground w-20">{zone.range} Seuil</span>
          </div>
        ))}
      </div>

      {/* Race intensity marker */}
      <div className={cn(
        "p-2.5 rounded-lg border",
        conflict
          ? "bg-red-500/10 border-red-500/30"
          : "bg-emerald-500/10 border-emerald-500/30"
      )}>
        <div className="flex items-center gap-2">
          {conflict ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span className="text-xs font-medium">
            Intensité course ({objectif}): ~{raceIntensity}% Seuil
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {conflict
            ? getMetabolicConflictMessage(fatmax, raceIntensity)
            : "Intensité compatible avec une bonne économie lipidique. Stratégie nutrition optimisable."}
        </p>
      </div>
    </div>
  );
}
