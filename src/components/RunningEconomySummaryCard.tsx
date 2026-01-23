/**
 * Carte de synthèse Économie de Course pour le Dashboard
 * Affiche le dernier score et la tendance
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Footprints, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Heart,
  Timer,
  AlertTriangle,
  CheckCircle,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface RunningEconomySummaryCardProps {
  snapshots: DbSnapshot[];
  staffMode?: boolean;
  className?: string;
}

interface EconomyTrend {
  direction: "up" | "down" | "stable";
  delta: number;
  previousScore: number | null;
}

// Format sec → min:ss/km
function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || secPerKm <= 0) return "—";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

// Get color class based on economy label
function getEconomyBadgeClass(label: string): string {
  switch (label) {
    case "excellent":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    case "good":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    case "average":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "fragile":
    case "weak":
    case "very_weak":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getLevelIcon(label: string) {
  switch (label) {
    case "excellent":
    case "good":
      return <CheckCircle className="h-4 w-4" />;
    case "average":
      return <Activity className="h-4 w-4" />;
    case "fragile":
    case "weak":
    case "very_weak":
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return null;
  }
}

function getLevelLabel(label: string): string {
  switch (label) {
    case "excellent": return "Excellente";
    case "good": return "Bonne";
    case "average": return "Moyenne";
    case "fragile": return "Fragile";
    case "weak": return "Faible";
    case "very_weak": return "Très faible";
    default: return label;
  }
}

export function RunningEconomySummaryCard({
  snapshots,
  staffMode = false,
  className,
}: RunningEconomySummaryCardProps) {
  // Filter snapshots with economy data, sorted by date
  const economySnapshots = useMemo(() => {
    return snapshots
      .filter(s => s.run_economy_score != null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [snapshots]);

  // Get latest data
  const latestSnapshot = economySnapshots[0];
  const previousSnapshot = economySnapshots[1];

  // Calculate trend
  const trend = useMemo((): EconomyTrend | null => {
    if (!latestSnapshot?.run_economy_score) return null;
    if (!previousSnapshot?.run_economy_score) {
      return { direction: "stable", delta: 0, previousScore: null };
    }
    
    const delta = latestSnapshot.run_economy_score - previousSnapshot.run_economy_score;
    const threshold = 3; // Minimum delta to consider a trend
    
    if (delta > threshold) {
      return { direction: "up", delta, previousScore: previousSnapshot.run_economy_score };
    } else if (delta < -threshold) {
      return { direction: "down", delta: Math.abs(delta), previousScore: previousSnapshot.run_economy_score };
    }
    return { direction: "stable", delta: 0, previousScore: previousSnapshot.run_economy_score };
  }, [latestSnapshot, previousSnapshot]);

  // No data state
  if (!latestSnapshot || latestSnapshot.run_economy_score == null) {
    return (
      <Card className={cn("border-dashed border-muted-foreground/30", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Footprints className="h-4 w-4" />
            Économie de Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Aucune donnée d'économie de course disponible.
            Importez un fichier FIT d'une course de ~60 min pour analyser l'économie.
          </p>
        </CardContent>
      </Card>
    );
  }

  const score = latestSnapshot.run_economy_score;
  const label = latestSnapshot.run_economy_label || "unknown";
  const pace = latestSnapshot.run_pace_ref_sec_per_km;
  const drift = latestSnapshot.run_hr_drift_pct;
  const duration = latestSnapshot.run_duration_min;
  const date = latestSnapshot.date;

  // Score color ring
  const getScoreColor = (score: number): string => {
    if (score >= 75) return "text-green-500";
    if (score >= 55) return "text-emerald-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (): string => {
    if (!trend) return "";
    switch (trend.direction) {
      case "up":
        return `+${trend.delta} pts`;
      case "down":
        return `-${trend.delta} pts`;
      default:
        return "Stable";
    }
  };

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Footprints className="h-4 w-4 text-blue-500" />
            </div>
            Économie de Course
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn("text-xs flex items-center gap-1", getEconomyBadgeClass(label))}
          >
            {getLevelIcon(label)}
            {getLevelLabel(label)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Score principal + tendance */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-3xl font-bold font-mono", getScoreColor(score))}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          
          {trend && (
            <div className="flex items-center gap-1.5">
              {getTrendIcon()}
              <span className={cn(
                "text-sm font-medium",
                trend.direction === "up" ? "text-green-600" : 
                trend.direction === "down" ? "text-red-600" : "text-muted-foreground"
              )}>
                {getTrendLabel()}
              </span>
            </div>
          )}
        </div>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Timer className="h-3 w-3" />
              <span>Allure</span>
            </div>
            <div className="font-mono font-medium text-foreground">
              {formatPace(pace)}
            </div>
          </div>
          
          <div className="p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Heart className="h-3 w-3" />
              <span>Dérive</span>
            </div>
            <div className={cn(
              "font-mono font-medium",
              drift != null && drift > 10 ? "text-red-500" : 
              drift != null && drift > 6 ? "text-amber-500" : "text-foreground"
            )}>
              {drift != null ? `${drift.toFixed(1)}%` : "—"}
            </div>
          </div>
          
          <div className="p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Timer className="h-3 w-3" />
              <span>Durée</span>
            </div>
            <div className="font-mono font-medium text-foreground">
              {duration != null ? `${duration} min` : "—"}
            </div>
          </div>
        </div>

        {/* Historique mini (staff mode) */}
        {staffMode && economySnapshots.length > 1 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Historique récent</p>
            <div className="flex gap-1">
              {economySnapshots.slice(0, 5).map((s, i) => (
                <div 
                  key={s.id} 
                  className={cn(
                    "flex-1 h-2 rounded-full",
                    i === 0 ? "bg-primary" : "bg-muted"
                  )}
                  style={{
                    opacity: i === 0 ? 1 : 0.3 + (1 - i / 5) * 0.7
                  }}
                  title={`${s.date}: ${s.run_economy_score}/100`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Récent</span>
              <span>{economySnapshots.length} mesures</span>
            </div>
          </div>
        )}

        {/* Date du dernier test */}
        <p className="text-xs text-muted-foreground text-right">
          Dernière mesure: {new Date(date).toLocaleDateString("fr-FR")}
        </p>
      </CardContent>
    </Card>
  );
}
