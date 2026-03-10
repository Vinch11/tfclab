// =============================================
// W'bal Recovery Card — Repos Optimaux Individualisés (Skiba 2012)
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Zap, Battery, Info, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analyzeCriticalPower,
  generateRecoveryTable,
  prescribeIntervalRecovery,
  type CriticalPowerResult,
} from "@/lib/v2/criticalPowerModel";

interface WbalRecoveryCardProps {
  ftp?: number | null;
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  weightKg?: number | null;
}

export function WbalRecoveryCard({
  ftp,
  pmax5s,
  p30s,
  p60s,
  map5min,
  weightKg,
}: WbalRecoveryCardProps) {
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
    return generateRecoveryTable(cpResult.cp, cpResult.wprime, weightKg ?? undefined);
  }, [cpResult, weightKg]);

  // If not enough data, show placeholder
  if (!cpResult || !recoveryTable) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Repos Optimaux W'bal
          </CardTitle>
          <CardDescription className="text-xs">
            Données insuffisantes — renseignez au moins 2 puissances parmi P5s, P30s, P60s, MAP5', FTP dans le snapshot.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Repos Optimaux W'bal
            </CardTitle>
            <CardDescription className="text-xs">
              Durées de récupération individualisées — Skiba 2012
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                <p className="font-semibold mb-1">Modèle W'bal (Skiba et al., 2012)</p>
                <p className="text-muted-foreground">
                  Les durées de repos sont calculées à partir du W' individuel de l'athlète 
                  et du modèle de reconstitution exponentielle. Elles garantissent une reconstitution 
                  de 50-75% du W' entre les répétitions.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="summary" className="text-xs">Résumé CP/W'</TabsTrigger>
            <TabsTrigger value="recovery" className="text-xs">Tableau de repos</TabsTrigger>
          </TabsList>

          {/* Tab 1: CP/W' Summary */}
          <TabsContent value="summary" className="mt-3 space-y-3">
            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-primary/5 p-3 text-center space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3" />
                  Critical Power
                </div>
                <div className="text-2xl font-bold font-mono text-primary">{cpResult.cp}W</div>
                {cpResult.cpWkg && (
                  <div className="text-xs text-muted-foreground font-mono">{cpResult.cpWkg} W/kg</div>
                )}
              </div>
              <div className="rounded-lg border bg-destructive/5 p-3 text-center space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Battery className="h-3 w-3" />
                  W' (Capacité Ana.)
                </div>
                <div className="text-2xl font-bold font-mono text-destructive">{cpResult.wprimeKJ} kJ</div>
                {cpResult.wprimeJkg && (
                  <div className="text-xs text-muted-foreground font-mono">{cpResult.wprimeJkg} J/kg</div>
                )}
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">R² Modèle</div>
                <div className={`text-sm font-bold font-mono ${
                  cpResult.r2 > 0.95 ? "text-green-500" : cpResult.r2 > 0.9 ? "text-amber-500" : "text-red-500"
                }`}>
                  {cpResult.r2.toFixed(3)}
                </div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Points</div>
                <div className="text-sm font-bold font-mono">{cpResult.points.length}</div>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="text-[10px] text-muted-foreground">FTP/CP</div>
                <div className="text-sm font-bold font-mono">
                  {cpResult.ftpCpRatio ? cpResult.ftpCpRatio.toFixed(2) : "—"}
                </div>
              </div>
            </div>

            {/* FTP vs CP interpretation */}
            {ftp && cpResult.ftpCpRatio && (
              <div className="p-2 rounded-lg border bg-muted/30 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>FTP ({ftp}W) ≠ CP ({cpResult.cp}W)</strong> — 
                    {ftp > cpResult.cp 
                      ? ` écart +${ftp - cpResult.cp}W. FTP tenable ~40-70min, CP est le vrai seuil de steady-state.`
                      : ` FTP < CP : possible sous-estimation du FTP ou athlète très endurant.`}
                  </p>
                </div>
              </div>
            )}

            {/* Data points used */}
            <div className="flex flex-wrap gap-1.5">
              {cpResult.points.map((pt, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                  {pt.label || `${pt.durationSec}s`}: {pt.powerWatts}W
                </Badge>
              ))}
            </div>
          </TabsContent>

          {/* Tab 2: Recovery Table */}
          <TabsContent value="recovery" className="mt-3 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Format</th>
                    <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Puissance</th>
                    <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Repos optimal</th>
                    <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Reps max</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryTable.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-2 font-medium">{row.format}</td>
                      <td className="py-2 px-2 font-mono text-primary">{row.intervalPower}</td>
                      <td className="py-2 px-2 font-mono">{row.optimalRest}</td>
                      <td className="py-2 px-2 font-mono text-right">
                        <Badge variant={row.maxReps >= 8 ? "default" : row.maxReps >= 4 ? "secondary" : "destructive"} className="text-[10px]">
                          ×{row.maxReps}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Usage guidance */}
            <div className="p-2 rounded-lg border bg-muted/30 text-xs space-y-1">
              <p className="text-muted-foreground">
                <strong>⚠️ Repos trop court</strong> → W' non reconstitué → qualité dégradée dès la 3ème rep
              </p>
              <p className="text-muted-foreground">
                <strong>⏳ Repos trop long</strong> → stimulus insuffisant → pas de surcompensation optimale
              </p>
              <p className="text-muted-foreground">
                Ces durées sont <strong>individualisées</strong> à partir du W' de l'athlète ({cpResult.wprimeKJ} kJ).
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
