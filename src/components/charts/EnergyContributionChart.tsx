/**
 * Energy Contribution Chart – Lipides vs Glucides
 * Barres empilées pédagogiques
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Flame, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnergyContributionChartProps {
  vlamaxValue: number | null;
  staffMode?: boolean;
  className?: string;
}

// Calcul des contributions énergétiques par intensité
const computeEnergyContribution = (vlamax: number | null) => {
  const baseVlamax = vlamax !== null ? vlamax : 0.45;
  
  // Facteur VLamax : plus élevé = plus de glucides à toute intensité
  const vlamaxShift = (baseVlamax - 0.35) * 50; // -5 à +15% de shift
  
  const data = [];
  const intensities = [
    { value: 50, label: "Z1 (Récup)" },
    { value: 60, label: "Z2 (Endurance)" },
    { value: 70, label: "Z3 (Tempo)" },
    { value: 80, label: "Z4 (Seuil)" },
    { value: 90, label: "Z5 (VO2max)" },
    { value: 100, label: "Z6+ (Anaérobie)" },
  ];
  
  for (const { value: intensity, label } of intensities) {
    // Modèle simplifié: contribution glucides augmente avec intensité
    // Crossover point autour de 65-75% selon VLamax
    let glucides = Math.min(100, Math.max(10, 
      (intensity - 40) * 1.8 + vlamaxShift
    ));
    
    let lipides = 100 - glucides;
    
    data.push({
      intensity,
      label,
      glucides: Math.round(glucides),
      lipides: Math.round(lipides),
    });
  }
  
  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <p className="font-semibold text-foreground mb-2">{data.label}</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--warning))" }} />
          <span className="text-muted-foreground">Glucides:</span>
          <span className="font-mono font-semibold">{data.glucides}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--success))" }} />
          <span className="text-muted-foreground">Lipides:</span>
          <span className="font-mono font-semibold">{data.lipides}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
        {data.glucides > 70 
          ? "Dominance glucidique – Apport glucidique critique"
          : data.glucides > 50
            ? "Zone mixte – Glycogène sollicité"
            : "Dominance lipidique – Économie maximale"
        }
      </p>
    </div>
  );
};

export function EnergyContributionChart({
  vlamaxValue,
  staffMode = false,
  className
}: EnergyContributionChartProps) {
  const isDataMissing = vlamaxValue === null;
  
  const data = useMemo(() => {
    return computeEnergyContribution(vlamaxValue);
  }, [vlamaxValue]);
  
  // Trouver le crossover point
  const crossoverPoint = data.find(d => d.glucides >= 50);

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-4 h-4" />
          <span>Contribution Énergétique</span>
          {crossoverPoint && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
              Crossover: {crossoverPoint.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing && (
          <div className="mb-2 p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning">
              VLamax non disponible – estimation basée sur profil moyen
            </p>
          </div>
        )}
        
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="horizontal"
              margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `${val}%`}
                label={{ value: 'Contribution (%)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => (
                  <span className="text-xs">{value === "lipides" ? "Lipides" : "Glucides"}</span>
                )}
              />
              
              <Bar 
                dataKey="lipides" 
                stackId="energy" 
                fill="hsl(var(--success))"
                name="lipides"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="glucides" 
                stackId="energy" 
                fill="hsl(var(--warning))"
                name="glucides"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Explication pédagogique */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Interprétation:</strong> Plus l'intensité augmente, plus la contribution glucidique domine.
          </p>
          {vlamaxValue !== null && (
            <p>
              Avec une VLamax de <strong>{vlamaxValue.toFixed(2)}</strong>, 
              {vlamaxValue > 0.45 
                ? " le profil glycolytique décale le crossover vers les basses intensités."
                : vlamaxValue < 0.35 
                  ? " le profil oxydatif favorise l'utilisation des lipides."
                  : " le profil est équilibré."
              }
            </p>
          )}
          {staffMode && (
            <p className="border-t border-border pt-2 mt-2">
              ⚠️ Graphique pédagogique – Les valeurs exactes dépendent de nombreux facteurs individuels.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}