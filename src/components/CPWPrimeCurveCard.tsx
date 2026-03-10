// =============================================
// CP/W' Power-Duration Curve — Courbe hyperbolique individualisée
// Two For Coaching Lab — Skiba 2012 / Monod & Scherrer 1965
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Battery, RotateCcw, Info, AlertTriangle, TrendingDown, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Area, AreaChart, Dot, ScatterChart, Scatter, ComposedChart,
} from "recharts";
import {
  analyzeCriticalPower,
  generateRecoveryTable,
  type CriticalPowerResult,
  type CPDiagnostic,
} from "@/lib/v2/criticalPowerModel";

interface CPWPrimeCurveCardProps {
  ftp?: number | null;
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  weightKg?: number | null;
}

// Duration points for hyperbolic curve (log scale)
const CURVE_DURATIONS = [
  3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300,
  420, 600, 900, 1200, 1800, 2700, 3600
];

function getDurationLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}'`;
  return `${(sec / 3600).toFixed(1)}h`;
}

interface CurvePoint {
  durationSec: number;
  durationLabel: string;
  predictedPower: number;
  isDataPoint: boolean;
  actualPower?: number;
  label?: string;
}

export function CPWPrimeCurveCard({
  ftp,
  pmax5s,
  p30s,
  p60s,
  map5min,
  weightKg,
}: CPWPrimeCurveCardProps) {
  const cpResult = useMemo(() => {
    return analyzeCriticalPower({
      pmax_5s: pmax5s,
      p30s_w: p30s,
      p60s_w: p60s,
      map5min_w: map5min,
      ftp,
      weight_kg: weightKg,
    });
  }, [pmax5s, p30s, p60s, map5min, ftp, weightKg]);

  const recoveryTable = useMemo(() => {
    if (!cpResult) return null;
    // Use effectiveCP (bounded by FTP) for recovery calculations
    return generateRecoveryTable(cpResult.effectiveCP, cpResult.wprime, weightKg ?? undefined);
  }, [cpResult, weightKg]);

  // Build curve data: P(t) = CP + W'/t
  const curveData = useMemo(() => {
    if (!cpResult) return [];
    const { cp, wprime, points: dataPoints } = cpResult;

    return CURVE_DURATIONS.map(t => {
      const predictedPower = Math.round(cp + wprime / t);
      const matchingPoint = dataPoints.find(dp => dp.durationSec === t);

      return {
        durationSec: t,
        durationLabel: getDurationLabel(t),
        predictedPower,
        isDataPoint: !!matchingPoint,
        actualPower: matchingPoint?.powerWatts,
        label: matchingPoint?.label,
      } as CurvePoint;
    });
  }, [cpResult]);

  // Enrich with W/kg
  const cpWkg = cpResult && weightKg ? (cpResult.cp / weightKg).toFixed(2) : null;
  const wprimeJkg = cpResult && weightKg ? Math.round(cpResult.wprime / weightKg) : null;
  const hasDiagnostics = cpResult && cpResult.diagnostics.length > 0;
  const hasCritical = cpResult && cpResult.diagnostics.some(d => d.severity === "critical");

  if (!cpResult) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Modèle CP/W' — Courbe Puissance-Durée
          </CardTitle>
          <CardDescription className="text-xs">
            Données insuffisantes — renseignez au moins 2 puissances (P5s, P30s, P60s, MAP5', FTP) dans le snapshot.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as CurvePoint;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-semibold mb-1 text-foreground">{point.durationLabel}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Modèle:</span>
            <span className="font-mono font-bold">{point.predictedPower}W</span>
          </div>
          {point.actualPower && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Mesuré ({point.label}):</span>
              <span className="font-mono font-bold">{point.actualPower}W</span>
              <span className="text-muted-foreground text-xs">
                ({point.actualPower > point.predictedPower ? "+" : ""}
                {point.actualPower - point.predictedPower}W)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={hasCritical ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Modèle CP/W'
            </CardTitle>
            <CardDescription className="text-xs">
              Courbe puissance-durée hyperbolique — Monod & Scherrer (1965), Skiba (2012)
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {cpResult.dataQuality !== "good" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="destructive"
                      className="text-[10px] cursor-help"
                    >
                      {cpResult.dataQuality === "implausible" ? (
                        <><ShieldAlert className="h-3 w-3 mr-1" />Données suspectes</>
                      ) : (
                        <><ShieldQuestion className="h-3 w-3 mr-1" />À vérifier</>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{cpResult.diagnostics.length} anomalie(s) détectée(s). Le modèle mathématique est correct (R² élevé) mais les données d'entrée semblent incohérentes physiologiquement.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Badge
              variant={cpResult.r2 > 0.95 ? "default" : cpResult.r2 > 0.9 ? "secondary" : "destructive"}
              className="font-mono text-xs"
            >
              R²={cpResult.r2.toFixed(3)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Diagnostic warnings */}
        {hasDiagnostics && (
          <div className={`rounded-lg border p-3 space-y-2 ${hasCritical ? "border-destructive/50 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              {hasCritical ? (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span>{hasCritical ? "Incohérence physiologique détectée" : "Points d'attention"}</span>
            </div>
            <div className="space-y-1.5">
              {cpResult.diagnostics.map((d, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-start gap-2 text-xs cursor-help rounded px-2 py-1 ${
                        d.severity === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}>
                        <span className="shrink-0 mt-0.5">{d.severity === "critical" ? "🔴" : "🟡"}</span>
                        <span>{d.message}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-xs leading-relaxed">{d.detail}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              ℹ️ R² élevé ≠ modèle fiable. R² mesure l'ajustement mathématique, pas la validité physiologique des données d'entrée. Réalisez des tests all-out sur 30s, 1min et 5min.
            </p>
          </div>
        )}

        <Tabs defaultValue="curve" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="curve" className="text-xs">Courbe P-D</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">CP vs FTP</TabsTrigger>
            <TabsTrigger value="recovery" className="text-xs">Repos W'bal</TabsTrigger>
          </TabsList>

          {/* Tab 1: Power-Duration Curve */}
          <TabsContent value="curve" className="mt-3 space-y-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curveData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted-foreground))"
                    opacity={0.15}
                  />

                  {/* CP reference */}
                  <ReferenceLine
                    y={cpResult.cp}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="8 4"
                    strokeWidth={1.5}
                    label={{
                      value: `CP ${cpResult.cp}W`,
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--primary))"
                    }}
                  />

                  {/* FTP reference */}
                  {ftp && ftp !== cpResult.cp && (
                    <ReferenceLine
                      y={ftp}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: `FTP ${ftp}W`,
                        position: "left",
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))"
                      }}
                    />
                  )}

                  <XAxis
                    dataKey="durationLabel"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}W`}
                    domain={["dataMin - 30", "dataMax + 30"]}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />

                  {/* Predicted curve */}
                  <Line
                    type="monotone"
                    dataKey="predictedPower"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Modèle"
                  />

                  {/* Actual data points */}
                  <Line
                    type="monotone"
                    dataKey="actualPower"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={0}
                    dot={{ r: 5, fill: "hsl(var(--destructive))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    connectNulls={false}
                    name="Mesuré"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Data points badges */}
            <div className="flex flex-wrap gap-1.5">
              {cpResult.points.map((pt, i) => {
                const isRegression = 'regressionPoint' in pt ? (pt as any).regressionPoint : true;
                return (
                  <Badge key={i} variant={isRegression ? "outline" : "secondary"} className="text-[10px] font-mono">
                    {pt.label || `${pt.durationSec}s`}: {pt.powerWatts}W
                    {!isRegression && <span className="ml-1 opacity-60">(overlay)</span>}
                  </Badge>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 2: CP vs FTP Model Details */}
          <TabsContent value="model" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg border p-3 text-center space-y-1 ${cpResult.cpBounded ? "bg-amber-500/5 border-amber-500/30" : "bg-primary/5"}`}>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3" /> Critical Power
                </div>
                {cpResult.cpBounded ? (
                  <>
                    <div className="text-lg font-bold font-mono line-through text-muted-foreground">{cpResult.cp}W</div>
                    <div className="text-2xl font-bold font-mono text-amber-600">{cpResult.effectiveCP}W</div>
                    <div className="text-[10px] text-amber-600 font-medium">CP effectif (borné FTP+10)</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono text-primary">{cpResult.cp}W</div>
                    {cpWkg && <div className="text-xs text-muted-foreground font-mono">{cpWkg} W/kg</div>}
                    <div className="text-[10px] text-muted-foreground">Seuil de steady-state</div>
                  </>
                )}
              </div>
              <div className="rounded-lg border bg-destructive/5 p-3 text-center space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Battery className="h-3 w-3" /> W' (Capacité Ana.)
                </div>
                <div className="text-2xl font-bold font-mono text-destructive">{cpResult.wprimeKJ} kJ</div>
                {wprimeJkg && <div className="text-xs text-muted-foreground font-mono">{wprimeJkg} J/kg</div>}
                <div className="text-[10px] text-muted-foreground">Réservoir anaérobie</div>
              </div>
            </div>

            {/* CP bounded explanation */}
            {cpResult.cpBounded && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  CP borné par le FTP
                </div>
                <p className="text-muted-foreground">
                  Le CP brut ({cpResult.cp}W) dépasse le FTP ({ftp}W) de <strong>{cpResult.cp - (ftp || 0)}W</strong>. 
                  Physiologiquement, CP ≈ FTP + 5-15W. Un écart &gt;20W indique que les efforts courts 
                  (P30s, P60s, MAP5') ne sont pas des all-out maximaux.
                </p>
                <p className="text-muted-foreground">
                  → <strong>CP effectif = {cpResult.effectiveCP}W</strong> (FTP + 10W) est utilisé pour 
                  calculer les repos W'bal. Le FTP ({ftp}W) reste la référence pour les zones d'intensité.
                </p>
              </div>
            )}

            {/* FTP vs CP comparison */}
            {ftp && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  FTP ≠ CP — Distinction essentielle
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 rounded p-2">
                    <div className="text-muted-foreground">FTP (terrain)</div>
                    <div className="font-mono font-bold text-lg">{ftp}W</div>
                    <div className="text-muted-foreground text-[10px]">Tenable 40-70 min</div>
                  </div>
                  <div className="bg-primary/5 rounded p-2">
                    <div className="text-muted-foreground">CP (modèle)</div>
                    <div className="font-mono font-bold text-lg text-primary">{cpResult.cp}W</div>
                    <div className="text-muted-foreground text-[10px]">Vrai seuil ∞</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ratio FTP/CP = <strong className="font-mono">{cpResult.ftpCpRatio?.toFixed(3) || "—"}</strong>
                  {cpResult.ftpCpRatio && cpResult.ftpCpRatio > 1 && (
                    <span> — FTP surpasse CP de <strong>{ftp - cpResult.cp}W</strong>, 
                    ce qui signifie que le FTP n'est PAS tenable indéfiniment.</span>
                  )}
                  {cpResult.ftpCpRatio && cpResult.ftpCpRatio <= 1 && (
                    <span> — FTP sous CP : athlète très endurant ou FTP sous-estimé.</span>
                  )}
                </div>
              </div>
            )}

            {/* Model quality */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">R²</div>
                <div className={`text-sm font-bold font-mono ${
                  cpResult.r2 > 0.95 ? "text-green-500" : cpResult.r2 > 0.9 ? "text-amber-500" : "text-red-500"
                }`}>
                  {cpResult.r2.toFixed(3)}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {cpResult.r2 > 0.95 ? "Excellent" : cpResult.r2 > 0.9 ? "Bon" : "Acceptable"}
                </div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Pts régression</div>
                <div className="text-sm font-bold font-mono">{cpResult.points.filter((p: any) => p.regressionPoint !== false).length}</div>
                <div className="text-[9px] text-muted-foreground">
                  {cpResult.points.filter((p: any) => p.regressionPoint !== false).length >= 3 ? "Robuste" : "Minimum"}
                </div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Équation</div>
                <div className="text-[10px] font-mono font-bold text-primary">P(t) = {cpResult.cp} + {cpResult.wprimeKJ}k/t</div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Recovery Table */}
          <TabsContent value="recovery" className="mt-3 space-y-3">
            {recoveryTable && (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Repos optimaux individualisés (W'bal Skiba 2012)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Format</th>
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Puissance</th>
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Repos</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recoveryTable.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-2 font-medium">{row.format}</td>
                          <td className="py-2 px-2 font-mono text-primary">{row.intervalPower}</td>
                          <td className="py-2 px-2 font-mono">{row.optimalRest}</td>
                          <td className="py-2 px-2 font-mono text-right">
                            <Badge
                              variant={row.maxReps >= 8 ? "default" : row.maxReps >= 4 ? "secondary" : "destructive"}
                              className="text-[10px]"
                            >
                              ×{row.maxReps}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2 rounded-lg border bg-muted/30 text-xs space-y-1">
                  <p className="text-muted-foreground">
                    <strong>⚠️ Repos trop court</strong> → W' non reconstitué → qualité dégradée dès rep 3
                  </p>
                  <p className="text-muted-foreground">
                    <strong>⏳ Repos trop long</strong> → stimulus insuffisant → pas de surcompensation
                  </p>
                  <p className="text-muted-foreground">
                    Durées calibrées sur le W' individuel : <strong className="font-mono">{cpResult.wprimeKJ} kJ</strong>
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
