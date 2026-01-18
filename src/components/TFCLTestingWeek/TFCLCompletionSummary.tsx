/**
 * TFCL Completion Summary Component
 * Shows profile completeness status and missing data
 */

import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { TFCLCompletionStatus } from "@/data/tfclTestingWeek";
import { getProtocolQualityLabel, getProtocolQualityColor } from "@/data/tfclTestingWeek";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface TFCLCompletionSummaryProps {
  status: TFCLCompletionStatus;
  snapshot: DbSnapshot | null;
}

export function TFCLCompletionSummary({ status, snapshot }: TFCLCompletionSummaryProps) {
  const totalRequired = 5; // p30s, p60s, map5min, ftp, tte
  const completedCount = totalRequired - status.missingData.length;
  const progressPercent = (completedCount / totalRequired) * 100;

  const protocolQuality = snapshot 
    ? ((snapshot as unknown as Record<string, unknown>).protocol_quality as number) ?? 3
    : 3;

  return (
    <Card className={status.isComplete ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {status.isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Profil Référence complet
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Profil partiel
              </>
            )}
          </CardTitle>
          <Badge variant={status.isComplete ? "default" : "secondary"}>
            {completedCount}/{totalRequired} données
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={progressPercent} 
            className={`h-2 ${status.isComplete ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500'}`}
          />
          <p className="text-xs text-muted-foreground">
            {status.message}
          </p>
        </div>

        {/* Completed tests */}
        {status.completedTests.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Tests complétés
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {status.completedTests.map((test, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  {test}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing data */}
        {status.missingData.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <XCircle className="h-3 w-3 text-orange-500" />
              Données manquantes
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {status.missingData.map((data, i) => (
                <li key={i} className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-orange-500 shrink-0" />
                  {data}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Protocol quality & confidence */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Qualité protocole (coach)</span>
          <Badge variant="outline" className={getProtocolQualityColor(protocolQuality)}>
            {protocolQuality}/5 — {getProtocolQualityLabel(protocolQuality)}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ajustement confiance</span>
          <Badge 
            variant="outline" 
            className={
              status.confidenceAdjustment > 0 
                ? "text-green-500" 
                : status.confidenceAdjustment < 0 
                  ? "text-red-500" 
                  : "text-muted-foreground"
            }
          >
            {status.confidenceAdjustment > 0 ? "+" : ""}{status.confidenceAdjustment.toFixed(2)}
          </Badge>
        </div>

        {/* Impact message */}
        <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <p>
            {status.isComplete 
              ? "VLamax V2 Enhanced activée avec précision maximale."
              : "VLamax V2 utilise le fallback V1 — précision limitée. Complétez les tests manquants."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
