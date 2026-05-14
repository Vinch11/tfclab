import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { resolveBadgeSport } from "@/lib/sportMainDeduction";
import { getAgeAdjustedVLamaxThresholds, type VLamaxProfil } from "@/lib/ageAdjustment";

interface VLamaxProfileScaleProps {
  vlamax: number | null;
  objectif?: string | null;
  sportMain?: string | null;
  /** Âge de l'athlète — utilisé pour l'ajustement des seuils (>40 ans = seuils abaissés) */
  age?: number | null;
}

interface ProfileBand {
  key: VLamaxProfil;
  min: number;
  max: number;
  label: string;
  shortLabel: string;
  sports: string;
  characteristics: string;
  color: string; // tailwind class for filled bar
  text: string;
}

const SCALE_MIN = 0;
const SCALE_MAX = 1.0; // affichage borné à 1.0 mmol/L/s

/**
 * Construit les bandes du profil VLamax à partir des seuils canoniques
 * (`getAgeAdjustedVLamaxThresholds`) pour rester aligné avec VLamaxUnifiedCard
 * et `getAgeAdjustedVLamaxProfil`.
 */
function buildBands(age: number | null | undefined): ProfileBand[] {
  const t = getAgeAdjustedVLamaxThresholds(age ?? null);
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");
  return [
    {
      key: "diesel",
      min: 0,
      max: t.diesel,
      label: "Diesel Ultra-Endurant",
      shortLabel: `< ${fmt(t.diesel)}`,
      sports: "Ironman, ultra-trail, ultra-cyclisme, marche athlétique",
      characteristics: "Combustion graisses excellente, seuil anaérobie ~VO2max, accélération quasi nulle.",
      color: "bg-blue-500/70",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      key: "endurant",
      min: t.diesel,
      max: t.endurant,
      label: "Endurant",
      shortLabel: `${fmt(t.diesel)} – ${fmt(t.endurant)}`,
      sports: "Marathon, trail long/montagne, cyclisme route (grimpeur)",
      characteristics: "Tient longtemps à haute intensité, économie aérobie dominante.",
      color: "bg-green-500/70",
      text: "text-green-700 dark:text-green-300",
    },
    {
      key: "equilibre",
      min: t.endurant,
      max: t.equilibre,
      label: "Équilibré",
      shortLabel: `${fmt(t.endurant)} – ${fmt(t.equilibre)}`,
      sports: "70.3, semi, trail court, cyclisme polyvalent",
      characteristics: "Bon compromis aérobie/anaérobie, capacité à varier les rythmes.",
      color: "bg-emerald-500/70",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "explosif",
      min: t.equilibre,
      max: t.explosif,
      label: "Explosif",
      shortLabel: `${fmt(t.equilibre)} – ${fmt(t.explosif)}`,
      sports: "Demi-fond (1500–5000 m), VTT XCO, classiques, foot/rugby",
      characteristics: "Répète des efforts > seuil et récupère vite — au prix d'une grosse conso de glycogène.",
      color: "bg-orange-500/70",
      text: "text-orange-700 dark:text-orange-300",
    },
    {
      key: "sprinter",
      min: t.explosif,
      max: 1.20,
      label: "Sprinter",
      shortLabel: `≥ ${fmt(t.explosif)}`,
      sports: "Sprint piste (100/200 m), BMX, natation 50/100 m",
      characteristics: "Puissance maximale phénoménale, glycolyse fulgurante.",
      color: "bg-red-500/70",
      text: "text-red-700 dark:text-red-300",
    },
  ];
}

function findBand(value: number, bands: ProfileBand[]): ProfileBand {
  return bands.find((b) => value >= b.min && value < b.max) ?? bands[bands.length - 1];
}

export function VLamaxProfileScale({ vlamax, objectif, sportMain, age = null }: VLamaxProfileScaleProps) {
  const sport = resolveBadgeSport({ sport_main: sportMain }, { goal: objectif }) ?? "bike";
  const sportLabel = sport === "cap" ? "Course à pied" : sport === "tri" ? "Triathlon" : "Vélo";

  if (vlamax === null || vlamax === undefined || isNaN(vlamax)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Profil VLamax — Échelle des spécialités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Données insuffisantes pour positionner l'athlète sur l'échelle.</p>
        </CardContent>
      </Card>
    );
  }

  const BANDS = buildBands(age);
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, vlamax));
  const positionPct = ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
  const currentBand = findBand(vlamax, BANDS);
  const ageAdjusted = age != null && age >= 30;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Profil VLamax — Échelle des spécialités
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[11px]">{sportLabel}</Badge>
          <span>VLamax mesurée : <strong className="text-foreground">{vlamax.toFixed(2)}</strong> mmol/L/s</span>
          {ageAdjusted && (
            <Badge variant="outline" className="text-[10px]">Seuils ajustés âge ({age} ans)</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre échelle segmentée */}
        <div className="space-y-2">
          <div className="relative h-9 w-full rounded-md overflow-hidden border border-border flex">
            {BANDS.map((b) => {
              const widthPct = ((Math.min(b.max, SCALE_MAX) - b.min) / (SCALE_MAX - SCALE_MIN)) * 100;
              const isCurrent = b.key === currentBand.key;
              return (
                <div
                  key={b.key}
                  className={`${b.color} ${isCurrent ? "opacity-100" : "opacity-60"} transition-opacity flex items-center justify-center text-[10px] font-medium text-white overflow-hidden`}
                  style={{ width: `${widthPct}%` }}
                  title={`${b.label} (${b.shortLabel})`}
                >
                  <span className="hidden sm:inline truncate px-1">{b.label}</span>
                </div>
              );
            })}
            {/* Curseur athlète */}
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground shadow-lg"
              style={{ left: `${positionPct}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background" />
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap text-foreground">
                {vlamax.toFixed(2)}
              </div>
            </div>
          </div>
          {/* Graduations */}
          <div className="flex justify-between text-[10px] text-muted-foreground pt-3 overflow-hidden">
            <span className="shrink-0">0,00</span>
            <span className="shrink-0">{BANDS[0].max.toFixed(2).replace(".", ",")}</span>
            <span className="shrink-0">{BANDS[2].min.toFixed(2).replace(".", ",")}</span>
            <span className="shrink-0">{BANDS[4].min.toFixed(2).replace(".", ",")}</span>
            <span className="shrink-0">1,00</span>
          </div>
        </div>

        {/* Carte du profil actuel */}
        <div className={`rounded-md border p-3 bg-muted/30`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className={`text-sm font-bold ${currentBand.text}`}>Profil détecté : {currentBand.label}</p>
              <p className="text-[11px] text-muted-foreground">VLamax {currentBand.shortLabel} mmol/L/s</p>
            </div>
          </div>
          <p className="text-xs"><strong>Sports types :</strong> {currentBand.sports}</p>
          <p className="text-xs mt-1"><strong>Caractéristiques :</strong> {currentBand.characteristics}</p>
        </div>

        {/* Légende complète repliée façon liste compacte */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
            Voir les 5 profils complets
          </summary>
          <ul className="mt-2 space-y-2">
            {BANDS.map((b) => (
              <li key={b.key} className={`pl-2 border-l-2 ${b.key === currentBand.key ? "border-foreground" : "border-border"}`}>
                <p className={`font-semibold ${b.text}`}>{b.shortLabel} mmol/L/s — {b.label}</p>
                <p className="text-muted-foreground"><strong>Sports :</strong> {b.sports}</p>
                <p className="text-muted-foreground">{b.characteristics}</p>
              </li>
            ))}
          </ul>
        </details>

        <p className="text-[10px] text-muted-foreground italic">
          Échelle alignée sur les seuils canoniques TFCL (Mader-Heck, ajustés par âge). Le positionnement optimal dépend du sport et de l'objectif (ex. Trail montagne → idéal "Endurant" à "Équilibré").
        </p>
      </CardContent>
    </Card>
  );
}
