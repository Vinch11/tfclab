/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRAPHIQUE SIGNATURE TFCL™ — Symptômes × Physiologie → Décision
 * Two For Coaching Lab Method™
 * 
 * Visualisation interactive de la correspondance entre symptômes terrain
 * et leviers physiologiques prioritaires.
 * 
 * Un seul point vert maximum par athlète (principe Dan Lorang).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, Target } from "lucide-react";
import {
  type TFCLSymptomId,
  TFCL_SYMPTOMS,
  ALL_SYMPTOMS,
  TFCL_SYMPTOM_PHILOSOPHY,
} from "@/lib/v2/tfclSymptoms";
import type { TrainingLever } from "@/lib/v2/tfclDecisionMatrix";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChartDataPoint {
  symptomX: number;
  leverY: number;
  symptom: TFCLSymptomId;
  symptomLabel: string;
  lever: TrainingLever;
  leverLabel: string;
  status: "primary" | "secondary" | "neutral";
  size: number;
}

interface TFCLSymptomSignatureChartProps {
  selectedSymptoms: TFCLSymptomId[];
  primaryLever: TrainingLever;
  secondaryLevers?: TrainingLever[];
  className?: string;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const LEVER_POSITIONS: Record<TrainingLever, { y: number; label: string }> = {
  decrease_vlamax: { y: 5, label: "↓ VLamax" },
  increase_vo2max: { y: 4, label: "↑ VO2max" },
  increase_tte: { y: 3, label: "↑ TTE" },
  increase_fat_oxidation: { y: 2, label: "↑ FatMax" },
  recovery: { y: 1, label: "Récupération" },
};

const SYMPTOM_POSITIONS: Record<TFCLSymptomId, number> = {
  early_burn: 1,
  late_explosion: 2,
  overgeared_feeling: 3,
  no_pace_change: 4,
  hill_weakness: 5,
  good_endurance_low_ceiling: 6,
  cardio_ok_legs_heavy: 7,
  cant_hold_pace: 8,
  high_hr_drift: 9,
  gi_issues: 10,
};

const STATUS_COLORS = {
  primary: "#22c55e",     // Vert - levier prioritaire
  secondary: "#eab308",   // Jaune - levier secondaire
  neutral: "#9ca3af",     // Gris - neutre
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as ChartDataPoint;
  
  const statusLabel = 
    data.status === "primary" ? "Levier prioritaire" :
    data.status === "secondary" ? "Levier secondaire" : "Neutre";
  
  const statusColor = 
    data.status === "primary" ? "text-green-600" :
    data.status === "secondary" ? "text-yellow-600" : "text-muted-foreground";
  
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{TFCL_SYMPTOMS[data.symptom].emoji}</span>
        <span className="font-medium text-sm">{data.symptomLabel}</span>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          → {data.leverLabel}
        </p>
        <Badge 
          variant="outline" 
          className={cn("text-[10px]", statusColor)}
        >
          {statusLabel}
        </Badge>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function TFCLSymptomSignatureChart({
  selectedSymptoms,
  primaryLever,
  secondaryLevers = [],
  className,
  compact = false,
}: TFCLSymptomSignatureChartProps) {
  
  // Générer les données du graphique
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    
    for (const symptom of ALL_SYMPTOMS) {
      if (!selectedSymptoms.includes(symptom.id)) continue;
      
      for (const lever of symptom.associatedLevers) {
        const leverInfo = LEVER_POSITIONS[lever];
        
        const status: ChartDataPoint["status"] = 
          lever === primaryLever ? "primary" :
          secondaryLevers.includes(lever) ? "secondary" : "neutral";
        
        data.push({
          symptomX: SYMPTOM_POSITIONS[symptom.id],
          leverY: leverInfo.y,
          symptom: symptom.id,
          symptomLabel: symptom.label,
          lever,
          leverLabel: leverInfo.label,
          status,
          size: status === "primary" ? 180 : status === "secondary" ? 120 : 80,
        });
      }
    }
    
    return data;
  }, [selectedSymptoms, primaryLever, secondaryLevers]);
  
  // Compter les points par status
  const primaryCount = chartData.filter(d => d.status === "primary").length;
  
  if (compact) {
    return (
      <div className={cn("p-3 rounded-lg border bg-muted/30", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Signature TFCL</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs">Prioritaire</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs">Secondaire</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {primaryCount} lien{primaryCount > 1 ? "s" : ""} prioritaire{primaryCount > 1 ? "s" : ""}
          </Badge>
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Symptômes × Physiologie → Décision TFCL
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Un seul levier prioritaire (vert) par athlète — Principe Dan Lorang
        </p>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Légende */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs">Levier prioritaire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-xs">Secondaire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs">Neutre</span>
          </div>
        </div>
        
        {/* Graphique */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 40, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              
              <XAxis 
                type="number" 
                dataKey="symptomX" 
                domain={[0, 11]}
                tickCount={11}
                tick={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              >
                <Label 
                  value="Symptômes observés" 
                  position="bottom" 
                  offset={15}
                  className="fill-muted-foreground text-xs"
                />
              </XAxis>
              
              <YAxis 
                type="number" 
                dataKey="leverY" 
                domain={[0.5, 5.5]}
                tickCount={5}
                tickFormatter={(value) => {
                  const lever = Object.entries(LEVER_POSITIONS).find(([, v]) => v.y === value);
                  return lever ? lever[1].label : "";
                }}
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={90}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Points du graphique */}
              <Scatter data={chartData} fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status]}
                    r={entry.status === "primary" ? 10 : entry.status === "secondary" ? 7 : 5}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Symptômes sélectionnés - légende en bas */}
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedSymptoms.map((symptomId) => {
            const symptom = TFCL_SYMPTOMS[symptomId];
            return (
              <Badge 
                key={symptomId}
                variant="outline" 
                className="text-[10px] gap-1"
              >
                <span>{symptom.emoji}</span>
                <span className="truncate max-w-[120px]">{symptom.label}</span>
              </Badge>
            );
          })}
        </div>
        
        {/* Philosophie TFCL */}
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground italic whitespace-pre-line">
            {TFCL_SYMPTOM_PHILOSOPHY}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION INLINE POUR RAPPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function TFCLSymptomSignatureInline({
  selectedSymptoms,
  primaryLever,
}: {
  selectedSymptoms: TFCLSymptomId[];
  primaryLever: TrainingLever;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selectedSymptoms.slice(0, 3).map((symptomId) => {
        const symptom = TFCL_SYMPTOMS[symptomId];
        const isAssociated = symptom.associatedLevers.includes(primaryLever);
        
        return (
          <div 
            key={symptomId}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px]",
              isAssociated 
                ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span>{symptom.emoji}</span>
            <span className="truncate max-w-[80px]">{symptom.label}</span>
            {isAssociated && <span className="text-green-500">●</span>}
          </div>
        );
      })}
      {selectedSymptoms.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{selectedSymptoms.length - 3}
        </span>
      )}
    </div>
  );
}
