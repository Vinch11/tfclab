/**
 * ExpressDashboard — Affichage simplifié pour les athlètes "finisher-express"
 *
 * Affiche uniquement les métriques disponibles à partir de FC + poids :
 * - Zones FC (Z1-Z6 en bpm)
 * - VO2max estimé (badge "estimé 70%")
 * - FTP estimé (badge "estimé 60%")
 * - VMA estimée (badge "estimé 60%")
 * - Poids / FTP/kg
 *
 * Masque VLamax, TTE, FatMax, W'/CP, CSS — remplacés par une carte
 * "Données non disponibles en mode Express".
 */

import { EXPRESS_HR_ZONES } from "@/lib/expressHeartRateZones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Zap, Gauge, Scale, FlaskConical } from "lucide-react";

export interface ExpressSnapshotLike {
  fc_max?: number | null;
  weight_kg?: number | null;
  vo2max?: number | null;
  ftp?: number | null;
  vma?: number | null;
}

interface ExpressDashboardProps {
  athleteName?: string;
  objectif?: string | null;
  snapshot: ExpressSnapshotLike;
}

// Zones FC standardisées (% FCmax) — Karvonen simplifié.


export function ExpressDashboard({ athleteName, objectif, snapshot }: ExpressDashboardProps) {
  const fcMax = snapshot.fc_max ?? null;
  const weight = snapshot.weight_kg ?? null;
  const vo2 = snapshot.vo2max ?? null;
  const ftp = snapshot.ftp ?? null;
  const vma = snapshot.vma ?? null;
  const ftpKg = ftp && weight ? ftp / weight : null;

  return (
    <div className="space-y-4">
      {/* Bandeau Express */}
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-900 dark:text-teal-100">
        🚀 <strong>Profil Express</strong> — basé sur FC + poids uniquement.{" "}
        <span className="opacity-80">Faire les Test Days pour affiner.</span>
      </div>

      {/* En-tête athlète */}
      {(athleteName || objectif) && (
        <div className="text-sm text-muted-foreground">
          {athleteName && <span className="font-medium text-foreground">{athleteName}</span>}
          {athleteName && objectif && " • "}
          {objectif && <span>Objectif : {objectif}</span>}
        </div>
      )}

      {/* Zones FC */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-red-500" />
            Zones de fréquence cardiaque
            {fcMax ? (
              <Badge variant="outline" className="ml-2 text-xs">FC max : {fcMax} bpm</Badge>
            ) : (
              <Badge variant="destructive" className="ml-2 text-xs">FC max manquante</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fcMax ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {EXPRESS_HR_ZONES.map((z) => {
                const lo = Math.round(z.min * fcMax);
                const hi = Math.round(z.max * fcMax);
                return (
                  <div key={z.id} className={`rounded-lg px-3 py-2 ${z.color}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{z.id}</span>
                      <span className="text-sm font-mono">{lo}–{hi} bpm</span>
                    </div>
                    <div className="text-xs opacity-80">{z.label}</div>
                    <div className="text-[10px] opacity-60">{Math.round(z.min * 100)}–{Math.round(z.max * 100)}% FCmax</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Renseigne ta FC max pour débloquer les zones cardio.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estimations physio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <EstimateCard
          icon={<Activity className="h-4 w-4" />}
          label="VO2max"
          value={vo2 != null ? `${vo2.toFixed(1)} ml/kg/min` : "—"}
          confidence="estimé 70%"
        />
        <EstimateCard
          icon={<Zap className="h-4 w-4" />}
          label="FTP"
          value={ftp != null ? `${Math.round(ftp)} W` : "—"}
          confidence="estimé 60%"
        />
        <EstimateCard
          icon={<Gauge className="h-4 w-4" />}
          label="VMA"
          value={vma != null ? `${vma.toFixed(1)} km/h` : "—"}
          confidence="estimé 60%"
        />
        <EstimateCard
          icon={<Scale className="h-4 w-4" />}
          label="Poids · FTP/kg"
          value={
            weight != null
              ? `${weight.toFixed(1)} kg${ftpKg != null ? ` · ${ftpKg.toFixed(2)} W/kg` : ""}`
              : "—"
          }
          confidence={ftpKg != null ? "estimé 60%" : "mesuré"}
        />
      </div>

      {/* Carte "données non disponibles" */}
      <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">
                🔬 Données non disponibles en mode Express
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>VLamax</strong>, <strong>TTE</strong>, <strong>FatMax</strong>,{" "}
                <strong>W'/CP</strong> et <strong>CSS</strong> nécessitent des protocoles de test.
              </p>
              <p className="text-sm text-muted-foreground">
                Faire <strong>Track Day™</strong> et <strong>Bike Day™</strong> pour débloquer
                ces métriques.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EstimateCard({
  icon,
  label,
  value,
  confidence,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  confidence: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
        <Badge variant="secondary" className="mt-2 text-[10px] font-normal">
          {confidence}
        </Badge>
      </CardContent>
    </Card>
  );
}
