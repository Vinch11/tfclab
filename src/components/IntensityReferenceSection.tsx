/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTENSITY REFERENCE SECTION — Staff Report Component
 * Two For Coaching Lab Method™
 * 
 * Section officielle du rapport staff: "Références d'intensité utilisées"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Info, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type IntensityReferenceType,
  type IntensityReferenceSummary,
  INTENSITY_REFERENCES,
  generateIntensityReferenceSummary,
} from "@/lib/v2/intensityReferenceEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityReferenceSectionProps {
  usedReferences: IntensityReferenceType[];
  hasFatmaxData: boolean;
  hasFTPData: boolean;
  hasVMAData: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function IntensityReferenceSection({
  usedReferences,
  hasFatmaxData,
  hasFTPData,
  hasVMAData,
  className,
}: IntensityReferenceSectionProps) {
  const summary = generateIntensityReferenceSummary(
    usedReferences,
    hasFatmaxData,
    hasFTPData,
    hasVMAData
  );

  return (
    <Card className={cn("print:break-inside-avoid", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Références d'intensité utilisées — Lecture physiologique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* References table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Référence</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Justification</th>
              </tr>
            </thead>
            <tbody>
              {summary.referencesUsed.map((ref, i) => (
                <tr key={ref.type} className={cn(i % 2 === 0 && "bg-muted/20")}>
                  <td className="px-3 py-2 font-medium">
                    {ref.label}
                  </td>
                  <td className="px-3 py-2">
                    {ref.isFallback ? (
                      <Badge variant="outline" className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300">
                        <AlertTriangle className="h-2 w-2 mr-1" />
                        Fallback
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300">
                        <CheckCircle2 className="h-2 w-2 mr-1" />
                        Métabolique
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {ref.justification}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Limitations */}
        {summary.limitations.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1 mb-2">
              <AlertTriangle className="h-3 w-3" />
              Limites éventuelles
            </h4>
            <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
              {summary.limitations.map((lim, i) => (
                <li key={i}>• {lim}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {summary.disclaimer}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT-OPTIMIZED VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export function IntensityReferenceSectionPrint({
  usedReferences,
  hasFatmaxData,
  hasFTPData,
  hasVMAData,
}: IntensityReferenceSectionProps) {
  const summary = generateIntensityReferenceSummary(
    usedReferences,
    hasFatmaxData,
    hasFTPData,
    hasVMAData
  );

  return (
    <div className="mb-6 print:break-inside-avoid">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-primary">
        <Gauge className="h-4 w-4" />
        Références d'intensité utilisées
      </h3>

      <table className="w-full text-sm border-collapse mb-3">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="py-1 text-left font-medium">Référence</th>
            <th className="py-1 text-left font-medium">Type</th>
            <th className="py-1 text-left font-medium">Justification</th>
          </tr>
        </thead>
        <tbody>
          {summary.referencesUsed.map((ref) => (
            <tr key={ref.type} className="border-b border-border/50">
              <td className="py-1 font-medium">{ref.label}</td>
              <td className="py-1">
                {ref.isFallback ? "⚠️ Fallback" : "✓ Métabolique"}
              </td>
              <td className="py-1 text-xs text-muted-foreground">
                {ref.justification}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {summary.limitations.length > 0 && (
        <div className="text-xs mb-2">
          <strong>Limites:</strong> {summary.limitations.join(" ")}
        </div>
      )}

      <p className="text-[10px] italic text-muted-foreground">
        {summary.disclaimer}
      </p>
    </div>
  );
}
