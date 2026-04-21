/**
 * Threshold Pace Estimator
 * Estime l'allure seuil running (LT2/MLSS) à partir de :
 * - VMA (% VMA selon niveau)
 * - Temps sur 5K ou 10K (extrapolation Daniels/Riegel)
 *
 * Affiche 3 cibles d'allure : Conservative / Cible / Ambitieuse
 * pour guider le pacing du test seuil 20 min.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Gauge, Target, TrendingUp, Info, Activity } from "lucide-react";

type Level = "beginner" | "intermediate" | "advanced" | "elite";

interface PaceTargets {
  conservative: number; // sec/km
  target: number;
  ambitious: number;
}

const LEVEL_VMA_PERCENT: Record<Level, { conservative: number; target: number; ambitious: number }> = {
  beginner:     { conservative: 0.78, target: 0.81, ambitious: 0.84 },
  intermediate: { conservative: 0.82, target: 0.85, ambitious: 0.87 },
  advanced:     { conservative: 0.85, target: 0.88, ambitious: 0.90 },
  elite:        { conservative: 0.88, target: 0.90, ambitious: 0.92 },
};

const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Débutant (<6 mois CAP)",
  intermediate: "Intermédiaire (1-3 ans)",
  advanced: "Avancé (3+ ans, compétiteur)",
  elite: "Élite (régional/national)",
};

// Parse "mm:ss" or "m:ss" to seconds
function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);
      if (Number.isFinite(min) && Number.isFinite(sec) && min >= 0 && sec >= 0 && sec < 60) {
        return min * 60 + sec;
      }
    }
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);
      if ([h, m, s].every(Number.isFinite)) return h * 3600 + m * 60 + s;
    }
    return null;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) && n > 0 ? n * 60 : null; // assume minutes
}

function formatPace(secsPerKm: number): string {
  if (!Number.isFinite(secsPerKm) || secsPerKm <= 0) return "—";
  const min = Math.floor(secsPerKm / 60);
  const sec = Math.round(secsPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh <= 0) return "—";
  return `${kmh.toFixed(1)} km/h`;
}

// Method 1: From VMA
function estimateFromVMA(vmaKmh: number, level: Level): PaceTargets | null {
  if (!vmaKmh || vmaKmh <= 0) return null;
  const pcts = LEVEL_VMA_PERCENT[level];
  return {
    conservative: 3600 / (vmaKmh * pcts.conservative),
    target: 3600 / (vmaKmh * pcts.target),
    ambitious: 3600 / (vmaKmh * pcts.ambitious),
  };
}

// Method 2: From 5K time (Daniels-style)
// Threshold pace ≈ 5K pace + 15-20s/km
function estimateFrom5K(time5kSec: number): PaceTargets | null {
  if (!time5kSec || time5kSec <= 0) return null;
  const pace5k = time5kSec / 5; // sec/km
  return {
    conservative: pace5k + 22,
    target: pace5k + 17,
    ambitious: pace5k + 12,
  };
}

// Method 3: From 10K time
// Threshold pace ≈ 10K pace + 5-10s/km
function estimateFrom10K(time10kSec: number): PaceTargets | null {
  if (!time10kSec || time10kSec <= 0) return null;
  const pace10k = time10kSec / 10;
  return {
    conservative: pace10k + 10,
    target: pace10k + 7,
    ambitious: pace10k + 3,
  };
}

interface PaceTargetCardProps {
  label: string;
  description: string;
  paceSec: number;
  variant: "conservative" | "target" | "ambitious";
  icon: React.ReactNode;
}

function PaceTargetCard({ label, description, paceSec, variant, icon }: PaceTargetCardProps) {
  const colors = {
    conservative: "border-blue-500/30 bg-blue-500/5",
    target: "border-primary/40 bg-primary/10 ring-1 ring-primary/20",
    ambitious: "border-orange-500/30 bg-orange-500/5",
  };
  const textColors = {
    conservative: "text-blue-600 dark:text-blue-400",
    target: "text-primary",
    ambitious: "text-orange-600 dark:text-orange-400",
  };
  const speedKmh = paceSec > 0 ? 3600 / paceSec : 0;

  return (
    <div className={`p-3 rounded-lg border ${colors[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={textColors[variant]}>{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-xl font-bold font-mono ${textColors[variant]}`}>
        {formatPace(paceSec)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {formatSpeed(speedKmh)}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
        {description}
      </p>
    </div>
  );
}

interface ThresholdPaceEstimatorProps {
  defaultVma?: number | null;
}

export function ThresholdPaceEstimator({ defaultVma }: ThresholdPaceEstimatorProps) {
  const [vmaInput, setVmaInput] = useState(defaultVma ? String(defaultVma) : "");
  const [level, setLevel] = useState<Level>("intermediate");
  const [time5k, setTime5k] = useState("");
  const [time10k, setTime10k] = useState("");
  const [activeMethod, setActiveMethod] = useState<"vma" | "5k" | "10k">("vma");

  const targets = useMemo<PaceTargets | null>(() => {
    if (activeMethod === "vma") {
      const vma = parseFloat(vmaInput);
      return estimateFromVMA(vma, level);
    }
    if (activeMethod === "5k") {
      const t = parseTimeToSeconds(time5k);
      return t ? estimateFrom5K(t) : null;
    }
    if (activeMethod === "10k") {
      const t = parseTimeToSeconds(time10k);
      return t ? estimateFrom10K(t) : null;
    }
    return null;
  }, [activeMethod, vmaInput, level, time5k, time10k]);

  const splits = useMemo(() => {
    if (!targets) return null;
    // 20 min test = ~5 km à allure cible (à 4:00/km), variable selon allure
    const distanceKm = (20 * 60) / targets.target;
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      km1: targets.target + 5, // 1er km plus lent (échauffement complet)
      km2to18: targets.target,
      kmFinal: targets.target - 3, // possible légère accélération
    };
  }, [targets]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Calculateur d'allure seuil (CAP)
          <Badge variant="outline" className="ml-auto text-xs">Pré-test</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Estime ton allure cible avant le test seuil 20 min pour éviter de partir trop vite (erreur n°1).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as "vma" | "5k" | "10k")}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="vma" className="text-xs">Via VMA</TabsTrigger>
            <TabsTrigger value="5k" className="text-xs">Via 5K</TabsTrigger>
            <TabsTrigger value="10k" className="text-xs">Via 10K</TabsTrigger>
          </TabsList>

          <TabsContent value="vma" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">VMA</Label>
                <div className="flex gap-1 items-center mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 16.5"
                    value={vmaInput}
                    onChange={(e) => setVmaInput(e.target.value)}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground w-10">km/h</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Niveau athlète</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEVEL_LABELS) as Level[]).map((lv) => (
                      <SelectItem key={lv} value={lv} className="text-xs">
                        {LEVEL_LABELS[lv]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Méthode % VMA : Débutant 78-84% • Intermédiaire 82-87% • Avancé 85-90% • Élite 88-92%
            </p>
          </TabsContent>

          <TabsContent value="5k" className="mt-3 space-y-2">
            <Label className="text-xs">Temps sur 5 km (récent, &lt; 3 mois)</Label>
            <div className="flex gap-1 items-center">
              <Input
                type="text"
                placeholder="Ex: 22:30"
                value={time5k}
                onChange={(e) => setTime5k(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground w-12">mm:ss</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Méthode Daniels : allure seuil ≈ allure 5K + 12 à 22 s/km
            </p>
          </TabsContent>

          <TabsContent value="10k" className="mt-3 space-y-2">
            <Label className="text-xs">Temps sur 10 km (récent, &lt; 3 mois)</Label>
            <div className="flex gap-1 items-center">
              <Input
                type="text"
                placeholder="Ex: 47:00"
                value={time10k}
                onChange={(e) => setTime10k(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground w-12">mm:ss</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Méthode Daniels : allure seuil ≈ allure 10K + 3 à 10 s/km
            </p>
          </TabsContent>
        </Tabs>

        {targets && (
          <>
            <Separator />

            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                3 cibles d'allure pour ton test 20 min
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <PaceTargetCard
                  label="Conservative"
                  description="Sécurise le test, finis fort"
                  paceSec={targets.conservative}
                  variant="conservative"
                  icon={<Activity className="h-3.5 w-3.5" />}
                />
                <PaceTargetCard
                  label="Cible"
                  description="Allure recommandée"
                  paceSec={targets.target}
                  variant="target"
                  icon={<Target className="h-3.5 w-3.5" />}
                />
                <PaceTargetCard
                  label="Ambitieuse"
                  description="Si très en forme"
                  paceSec={targets.ambitious}
                  variant="ambitious"
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                />
              </div>
            </div>

            {splits && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  Stratégie de pacing recommandée (20 min ≈ {splits.distanceKm} km)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Km 1 :</span>{" "}
                    <span className="font-mono font-medium">{formatPace(splits.km1)}</span>
                    <p className="text-[10px] text-muted-foreground">Échauffement complet</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Km 2 → fin-1 :</span>{" "}
                    <span className="font-mono font-medium">{formatPace(splits.km2to18)}</span>
                    <p className="text-[10px] text-muted-foreground">Allure stable</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dernière min :</span>{" "}
                    <span className="font-mono font-medium">{formatPace(splits.kmFinal)}</span>
                    <p className="text-[10px] text-muted-foreground">Si forme OK</p>
                  </div>
                </div>
              </div>
            )}

            <Alert className="bg-orange-500/10 border-orange-500/30">
              <Info className="h-3.5 w-3.5 text-orange-500" />
              <AlertDescription className="text-xs">
                <strong>Signal d'alerte :</strong> si tu ralentis de plus de 5 sec/km après le km 10,
                tu es parti trop vite — réduis la cadence pour finir le test, et recommence dans 7 jours.
              </AlertDescription>
            </Alert>

            <p className="text-[10px] text-muted-foreground italic text-center">
              Allure seuil finale = moyenne réelle du test × 0.95 (correction Coggan pour extrapoler à 1h)
            </p>
          </>
        )}

        {!targets && (
          <Alert className="bg-muted/50">
            <Info className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
              Saisis ta VMA ou un temps de référence pour obtenir tes 3 cibles d'allure.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
