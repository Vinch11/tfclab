// =============================================
// LACTATE CORRESPONDENCE CARD — TFCL Method™
// Affiche LT1/LT2 estimés + table de correspondance
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Droplets, AlertTriangle, ChevronDown, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeLactateThresholdsTFCL,
  TFCL_LACTATE_TABLE,
  type LactateThresholdsTFCL,
} from "@/lib/thresholds/computeLactateThresholdsTFCL";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";

interface LactateCorrespondenceCardProps {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  sport: string;
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

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

export function LactateCorrespondenceCard({
  vlamaxEffectif,
  tteEffectif,
  ftp,
  sport,
  staffMode = false,
  compact = false,
  className,
}: LactateCorrespondenceCardProps) {
  const thresholds: LactateThresholdsTFCL = useMemo(() =>
    computeLactateThresholdsTFCL({
      ftp,
      sport,
      tteValue: tteEffectif.tte_min,
      tteSource: tteEffectif.source as any,
      vlamaxValue: vlamaxEffectif.value,
      vlamaxSource: vlamaxEffectif.source as any,
    }),
    [ftp, sport, tteEffectif, vlamaxEffectif]
  );

  const isInsufficient = thresholds.lt1.confidence === 0 && thresholds.lt2.confidence === 0;

  return (
    <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Correspondances lactiques TFCL
        </CardTitle>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Lecture métabolique (estimations) — utile pour coacher, pas un test labo
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insufficient data guard */}
        {isInsufficient ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-dashed">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Données insuffisantes pour LT1 / LT2</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                {!ftp && <li>FTP manquant — ajoutez un snapshot avec la puissance au seuil</li>}
                {thresholds.sport === "unknown" && <li>Sport non identifié — renseignez l'objectif de l'athlète</li>}
              </ul>
              {thresholds.notes.length > 0 && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  {thresholds.notes.join(" ")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* LT1 / LT2 Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ThresholdBadge
                label="LT1 estimé"
                threshold={thresholds.lt1}
                color="bg-sky-500/10 border-sky-500/30"
                textColor="text-sky-600 dark:text-sky-400"
              />
              <ThresholdBadge
                label="LT2 estimé"
                threshold={thresholds.lt2}
                color="bg-rose-500/10 border-rose-500/30"
                textColor="text-rose-600 dark:text-rose-400"
              />
            </div>

            {/* Fixed TFCL ↔ Lactate Table */}
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Élément TFCL</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Correspondance lactique</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Source données</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TFCL_LACTATE_TABLE.map((row) => (
                    <TableRow key={row.element}>
                      <TableCell className="text-sm font-medium py-2.5 whitespace-nowrap">{row.element}</TableCell>
                      <TableCell className="text-sm text-muted-foreground py-2.5 whitespace-nowrap">{row.correspondence}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                          {row.dataSource}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Staff Mode: Notes + Why */}
            {staffMode && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium flex-1">Mode Staff — Détails & Pourquoi</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  {/* Why explanations */}
                  <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" /> Pourquoi ces valeurs ?
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                      <li>LT2 dépend de TTE : plus TTE est élevé, plus LT2 se rapproche de FTP</li>
                      <li>LT1 s'éloigne si VLamax est élevé (profil glycolytique)</li>
                    </ul>
                  </div>

                  {/* Staff table with Why column */}
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs whitespace-nowrap">Élément</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Justification scientifique</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TFCL_LACTATE_TABLE.map((row) => (
                          <TableRow key={row.element}>
                            <TableCell className="text-xs font-medium py-2 whitespace-nowrap">{row.element}</TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2">{row.staffWhy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Computation notes */}
                  {thresholds.notes.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5 p-2 bg-muted/20 rounded">
                      {thresholds.notes.map((n, i) => (
                        <p key={i}>• {n}</p>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic">
          Estimations TFCL — précision accrue si test labo / test terrain complet.
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// THRESHOLD BADGE SUB-COMPONENT
// ═══════════════════════════════════════════

function ThresholdBadge({
  label,
  threshold,
  color,
  textColor,
}: {
  label: string;
  threshold: { label: string; confidence: number; pct_of_ftp?: number; watts?: number };
  color: string;
  textColor: string;
}) {
  return (
    <div className={cn("rounded-lg border p-3 space-y-1", color)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", textColor)}>
          {label}
        </span>
        <Badge variant={confidenceBadgeVariant(threshold.confidence)} className="text-[10px] h-5">
          {Math.round(threshold.confidence * 100)}%
        </Badge>
      </div>
      <p className="font-mono font-bold text-sm">{threshold.label}</p>
    </div>
  );
}
