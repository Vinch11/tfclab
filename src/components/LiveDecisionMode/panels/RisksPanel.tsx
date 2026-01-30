/**
 * RISKS PANEL — Physiological risk flags
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskAnalysis, RiskFlag } from "@/lib/v2/liveDecisionEngine";

interface RisksPanelProps {
  risks: RiskAnalysis;
}

export function RisksPanel({ risks }: RisksPanelProps) {
  const { flags, activeCount, criticalCount, overallRisk } = risks;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risques physiologiques
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              overallRisk === "low" && "bg-green-100 text-green-700 border-green-300",
              overallRisk === "moderate" && "bg-yellow-100 text-yellow-700 border-yellow-300",
              overallRisk === "high" && "bg-orange-100 text-orange-700 border-orange-300",
              overallRisk === "critical" && "bg-red-100 text-red-700 border-red-300"
            )}
          >
            {overallRisk === "low" && "Bas"}
            {overallRisk === "moderate" && "Modéré"}
            {overallRisk === "high" && "Élevé"}
            {overallRisk === "critical" && "Critique"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {activeCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="font-medium text-green-600 dark:text-green-400">
              Aucun signal d'alerte
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Paramètres physiologiques conformes
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-auto">
            {flags.map((flag) => (
              <RiskFlagCard key={flag.id} flag={flag} />
            ))}
          </div>
        )}
        
        {/* Summary footer */}
        {activeCount > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {activeCount} signal(s) actif(s)
            </span>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[9px]">
                {criticalCount} critique(s)
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      flag.severity === "danger" 
        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
    )}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{flag.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-medium text-sm",
              flag.severity === "danger" ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"
            )}>
              {flag.title}
            </p>
            {flag.severity === "danger" && (
              <Badge variant="destructive" className="text-[8px] px-1">!</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {flag.cause}
          </p>
          {flag.estimatedImpactMin != null && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Impact estimé dans ~{flag.estimatedImpactMin} min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
