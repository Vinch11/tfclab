import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, Activity, Gauge, Timer } from "lucide-react";
import { estimateFromRaceChronos, type RaceChronos } from "@/engines/diagnostic/raceTimeEstimator";

const fmtPace = (sec?: number) => {
  if (!sec || !isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}/km`;
};

const fmtTime = (sec?: number | null) => {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
};

interface Props {
  chronos: RaceChronos;
  className?: string;
}

export function RaceTimeEstimateCard({ chronos, className }: Props) {
  const est = estimateFromRaceChronos(chronos);

  if (!est) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="w-4 h-4" /> Estimation depuis chronos course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun chrono renseigné. Saisis un temps 5K, 10K, 20K, semi ou marathon dans l'éditeur de snapshot
            (onglet « Course ») pour obtenir une estimation Raw de vVO2max, allure seuil, CE et durabilité.
          </p>
        </CardContent>
      </Card>
    );
  }

  const reliabilityColor =
    est.reliability === "raw_high" ? "default" : est.reliability === "raw_medium" ? "secondary" : "outline";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="w-4 h-4" /> Estimation depuis chronos course
          </CardTitle>
          <Badge variant={reliabilityColor as any} className="text-[10px]">
            {est.reliability === "raw_high" ? "Fiabilité haute" : est.reliability === "raw_medium" ? "Fiabilité moyenne" : "Fiabilité basse"} · {(est.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Référence : <strong>{(est.reference.distance_m / 1000).toFixed(est.reference.distance_m % 1000 === 0 ? 0 : 1)} km</strong> en{" "}
          <strong>{fmtTime(est.reference.time_sec)}</strong> (allure {fmtPace(est.reference.pace_sec_km)})
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Gauge className="w-3 h-3" /> vVO2max
            </div>
            <div className="text-sm font-semibold">
              {est.vVO2max_kmh?.toFixed(1)} km/h
            </div>
            <div className="text-[10px] text-muted-foreground">VO2max ≈ {est.vo2max_estimated} ml/kg/min</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Activity className="w-3 h-3" /> Allure seuil
            </div>
            <div className="text-sm font-semibold">{fmtPace(est.paceThreshold_sec_km)}</div>
            <div className="text-[10px] text-muted-foreground">≈ 88% vVO2max (Daniels T)</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Timer className="w-3 h-3" /> Économie (CE)
            </div>
            <div className="text-sm font-semibold">{est.CE_mlO2_kg_km} mlO₂/kg/km</div>
            <div className="text-[10px] text-muted-foreground">Cross-check ACSM</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Flag className="w-3 h-3" /> Durabilité
            </div>
            <div className="text-sm font-semibold capitalize">
              {est.durabilityLabel ?? "—"}
              {est.durabilityIndex != null && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  ({est.durabilityIndex.toFixed(2)})
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {est.durabilityIndex != null ? "Ratio observé/Riegel" : "Besoin semi + marathon"}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground italic border-l-2 border-muted pl-2">
          {est.notes.join(" ")}
        </div>
      </CardContent>
    </Card>
  );
}
