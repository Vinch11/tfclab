import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mountain, Info, AlertTriangle } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData } from "@/hooks/useCloudData";
import { getEffectiveSnapshot, getEffectiveRefs } from "@/lib/effectiveRefs";
import {
  simulateTrail,
  formatHM,
  formatPace,
  type TrailTechnicite,
  type TrailAmbition,
  type TrailAthleteProfile,
} from "@/lib/v2/trailSimulation";

const TECHS: { id: TrailTechnicite; label: string }[] = [
  { id: "facile", label: "Facile" },
  { id: "moyen", label: "Moyen" },
  { id: "difficile", label: "Difficile" },
  { id: "extreme", label: "Extrême" },
];

const AMBITIONS: { id: TrailAmbition; label: string }[] = [
  { id: "finisher", label: "Finisher" },
  { id: "perf", label: "Performance" },
  { id: "podium", label: "Podium" },
];

export default function TrailSimulationPage() {
  const { currentAthlete } = useAthletes();
  const { snapshots } = useCloudData();

  const activeSnapshot = useMemo(
    () => getEffectiveSnapshot(currentAthlete as any, snapshots ?? []),
    [currentAthlete, snapshots],
  );
  const effective = useMemo(
    () => getEffectiveRefs(currentAthlete as any, snapshots ?? []),
    [currentAthlete, snapshots],
  );

  const athleteProfile: TrailAthleteProfile = useMemo(() => ({
    vma: effective.vma,
    fatmaxCenterPct: (activeSnapshot as any)?.fatmax_center_pct ?? null,
    tteMin: (activeSnapshot as any)?.tte_observed_min_run ?? (activeSnapshot as any)?.tte_observed_min ?? null,
    vlamaxEffectif: (activeSnapshot as any)?.vlamax_run ?? (activeSnapshot as any)?.vlamax ?? null,
    weightKg: effective.weightKg,
    ftp: effective.ftp,
  }), [effective, activeSnapshot]);

  const [distanceKm, setDistanceKm] = useState(42);
  const [dPlusM, setDPlusM] = useState(2000);
  const [dMinusM, setDMinusM] = useState<number | null>(null);
  const [technicite, setTechnicite] = useState<TrailTechnicite>("moyen");
  const [ambition, setAmbition] = useState<TrailAmbition>("perf");
  const [tempC, setTempC] = useState(18);
  const [plannedCarbsGH, setPlannedCarbsGH] = useState(70);

  const result = useMemo(() => {
    return simulateTrail({
      distanceKm,
      dPlusM,
      dMinusM: dMinusM ?? dPlusM,
      technicite,
      ambition,
      tempC,
      plannedCarbsGH,
      athlete: athleteProfile,
    });
  }, [distanceKm, dPlusM, dMinusM, technicite, ambition, tempC, plannedCarbsGH, athleteProfile]);

  if (!currentAthlete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Sélectionne un athlète depuis le dashboard pour lancer la simulation trail.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const maxSegMin = Math.max(...result.segments.map(s => s.durationMin), 1);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/race">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mountain className="h-6 w-6" /> Simulation Trail TFCL™
          </h1>
        </div>
        <Badge variant="outline">{currentAthlete.name ?? currentAthlete.nom ?? "Athlète"}</Badge>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profil physiologique</CardTitle>
          <CardDescription>Récupéré depuis le snapshot actif</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="VMA" value={athleteProfile.vma != null ? `${athleteProfile.vma.toFixed(1)} km/h` : "—"} />
          <Stat label="VLamax" value={athleteProfile.vlamaxEffectif != null ? athleteProfile.vlamaxEffectif.toFixed(2) : "—"} />
          <Stat label="Poids" value={athleteProfile.weightKg != null ? `${athleteProfile.weightKg} kg` : "—"} />
          <Stat label="TTE" value={athleteProfile.tteMin != null ? `${athleteProfile.tteMin} min` : "—"} />
        </CardContent>
      </Card>

      {/* Paramètres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres de course</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderRow label={`Distance : ${distanceKm} km`} min={10} max={170} step={1} value={distanceKm} onChange={setDistanceKm} />
          <SliderRow label={`D+ : ${dPlusM} m`} min={0} max={10000} step={50} value={dPlusM} onChange={setDPlusM} />
          <SliderRow
            label={`D- : ${dMinusM ?? dPlusM} m ${dMinusM == null ? "(= D+)" : ""}`}
            min={0} max={10000} step={50}
            value={dMinusM ?? dPlusM}
            onChange={setDMinusM}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Technicité du terrain</div>
            <div className="flex flex-wrap gap-2">
              {TECHS.map(t => (
                <Button key={t.id} size="sm" variant={technicite === t.id ? "default" : "outline"} onClick={() => setTechnicite(t.id)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Ambition</div>
            <div className="flex flex-wrap gap-2">
              {AMBITIONS.map(a => (
                <Button key={a.id} size="sm" variant={ambition === a.id ? "default" : "outline"} onClick={() => setAmbition(a.id)}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <SliderRow label={`Température : ${tempC}°C`} min={0} max={35} step={1} value={tempC} onChange={setTempC} />
          <SliderRow label={`Nutrition planifiée : ${plannedCarbsGH} g/h`} min={30} max={120} step={5} value={plannedCarbsGH} onChange={setPlannedCarbsGH} />
        </CardContent>
      </Card>

      {/* Résultats */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Résultats <Badge variant="secondary">{result.terrainLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <BigStat label="Temps estimé" value={formatHM(result.estimatedTimeMin)} />
            <BigStat label="Allure moyenne" value={formatPace(result.averagePaceSecPerKm)} />
            <BigStat label="GAP (équiv. plat)" value={formatPace(result.averageGAPSecPerKm)} />
          </div>

          {/* Segments */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Répartition par segment</div>
            {result.segments.map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.label} — {s.distanceKm} km @ {s.gradePct > 0 ? "+" : ""}{s.gradePct}%</span>
                  <span>{formatHM(s.durationMin)} · {s.speedKmh} km/h</span>
                </div>
                <div className="h-3 bg-muted rounded overflow-hidden">
                  <div
                    className={
                      s.type === "climb" ? "h-full bg-red-500" :
                      s.type === "descent" ? "h-full bg-emerald-500" :
                      "h-full bg-sky-500"
                    }
                    style={{ width: `${(s.durationMin / maxSegMin) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Glycogène */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Glycogène</span>
              <Badge variant={
                result.glycogenDepletionRisk === "CRITICAL" ? "destructive" :
                result.glycogenDepletionRisk === "HIGH" ? "destructive" :
                result.glycogenDepletionRisk === "MEDIUM" ? "secondary" : "outline"
              }>Risque : {result.glycogenDepletionRisk}</Badge>
            </div>
            <div className="flex gap-1 h-6 rounded overflow-hidden border">
              {result.segments.map((s, i) => {
                const pct = s.glycogenRemainingG / result.glycogenInitialG;
                const color = pct < 0.05 ? "bg-red-600" : pct < 0.2 ? "bg-orange-500" : pct < 0.4 ? "bg-yellow-400" : "bg-emerald-500";
                return (
                  <div key={i} className={`${color} flex-1 flex items-center justify-center text-[10px] text-white font-medium`}>
                    {Math.round(pct * 100)}%
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              Initial : {result.glycogenInitialG}g · Final : {result.glycogenFinalG}g
            </div>
          </div>

          {/* Nutrition */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Plan nutritionnel par phase</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {result.nutritionPlanGH.map((p, i) => (
                <div key={i} className="border rounded p-3 text-xs space-y-1">
                  <div className="font-semibold">{p.phase}</div>
                  <div>CHO : {p.carbsGH} g/h</div>
                  <div>Eau : {p.fluidsMlH} ml/h</div>
                  <div>Sodium : {p.sodiumMgH} mg/h</div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <Alert key={i} variant="default" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{w}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t pt-3">
        Estimation basée sur le modèle Minetti 2002 et le profil TFCL de l'athlète. Les conditions réelles
        (météo, terrain exact, fatigue accumulée) peuvent varier significativement.
        Réf : Minetti et al. 2002, Vernillo et al. 2017, Ehrström et al. 2018.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function SliderRow({
  label, min, max, step, value, onChange,
}: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={v => onChange(v[0])} />
    </div>
  );
}
