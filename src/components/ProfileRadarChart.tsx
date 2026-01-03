import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, User } from "lucide-react";

interface ProfileRadarChartProps {
  // Valeurs actuelles (0-100 normalisées)
  currentVlamax: number;
  currentTTE: number;
  currentFtpKg: number;
  // Valeurs cibles idéales (0-100 normalisées)
  targetVlamax: number;
  targetTTE: number;
  targetFtpKg: number;
  // Labels
  objectif: string;
  sport: "velo" | "course" | "triathlon";
}

/**
 * Graphique radar comparant le profil actuel de l'athlète
 * vs la cible idéale pour son objectif
 */
export function ProfileRadarChart({
  currentVlamax,
  currentTTE,
  currentFtpKg,
  targetVlamax,
  targetTTE,
  targetFtpKg,
  objectif,
  sport,
}: ProfileRadarChartProps) {
  // Données pour le radar chart
  const data = [
    {
      metric: "VLamax",
      current: Math.round(currentVlamax),
      target: Math.round(targetVlamax),
      fullMark: 100,
    },
    {
      metric: "TTE",
      current: Math.round(currentTTE),
      target: Math.round(targetTTE),
      fullMark: 100,
    },
    {
      metric: "FTP/kg",
      current: Math.round(currentFtpKg),
      target: Math.round(targetFtpKg),
      fullMark: 100,
    },
  ];

  // Calculer l'écart global
  const avgCurrent = (currentVlamax + currentTTE + currentFtpKg) / 3;
  const avgTarget = (targetVlamax + targetTTE + targetFtpKg) / 3;
  const gapPercent = Math.round(((avgTarget - avgCurrent) / avgTarget) * 100);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Profil vs Cible — {objectif}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparaison du profil actuel avec la cible idéale pour votre objectif
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
              />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ 
                  fill: "hsl(var(--foreground))", 
                  fontSize: 12,
                  fontWeight: 500
                }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ 
                  fill: "hsl(var(--muted-foreground))", 
                  fontSize: 10 
                }}
                tickCount={5}
              />
              
              {/* Zone cible (idéal) - en arrière-plan */}
              <Radar
                name="Cible idéale"
                dataKey="target"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              
              {/* Profil actuel - en avant-plan */}
              <Radar
                name="Profil actuel"
                dataKey="current"
                stroke="hsl(var(--accent-foreground))"
                fill="hsl(var(--accent-foreground))"
                fillOpacity={0.35}
                strokeWidth={2.5}
              />
              
              <Legend 
                wrapperStyle={{ 
                  paddingTop: "10px",
                  fontSize: "12px"
                }}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name,
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Légende et gap */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: "hsl(var(--accent-foreground))" }} 
              />
              <span className="text-muted-foreground">Profil actuel</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-0.5" 
                style={{ 
                  backgroundColor: "hsl(var(--primary))",
                  borderStyle: "dashed",
                  borderWidth: "1px",
                  borderColor: "hsl(var(--primary))"
                }} 
              />
              <span className="text-muted-foreground">Cible idéale</span>
            </div>
          </div>

          {gapPercent > 0 && (
            <div className="text-xs text-center p-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">
                Écart moyen à combler : 
              </span>
              <span className={`font-medium ml-1 ${
                gapPercent <= 10 ? "text-green-600" :
                gapPercent <= 25 ? "text-yellow-600" :
                "text-red-600"
              }`}>
                {gapPercent}%
              </span>
            </div>
          )}
          
          {gapPercent <= 0 && (
            <div className="text-xs text-center p-2 rounded-md bg-green-500/10 text-green-600">
              ✓ Profil aligné avec la cible
            </div>
          )}
        </div>

        {/* Détail par métrique */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          {data.map((item) => {
            const gap = item.target - item.current;
            const isGood = gap <= 5;
            const isClose = gap > 5 && gap <= 15;
            
            return (
              <div 
                key={item.metric}
                className={`p-2 rounded-md text-center ${
                  isGood ? "bg-green-500/10" :
                  isClose ? "bg-yellow-500/10" :
                  "bg-red-500/10"
                }`}
              >
                <div className="font-medium text-foreground">{item.metric}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span>{item.current}%</span>
                </div>
                <div className={`mt-0.5 ${
                  isGood ? "text-green-600" :
                  isClose ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {gap > 0 ? `−${gap}%` : gap < 0 ? `+${Math.abs(gap)}%` : "✓"}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
