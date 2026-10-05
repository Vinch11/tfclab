/**
 * ProfilExpressDialog — Profil physiologique rapide (1 séance par discipline)
 * ────────────────────────────────────────────────────────────────────────
 * Alternative au protocole complet multi-jours (TFCL/CAP) pour un athlète
 * qui veut démarrer vite : 2 efforts courts de terrain par discipline
 * (sprint + 1500m piste côté course, sprint + 5min MAP côté vélo — mêmes
 * tests que la fiche TFCL Track/Bike Day™, variante "profil rapide"),
 * traités par le même modèle Mader/Critical Power que le reste de l'app
 * (computeMLSS, analyzeCriticalPower).
 *
 * Toute valeur produite est une ESTIMATION — jamais affichée ni enregistrée
 * comme une mesure directe. Le snapshot créé porte source="profil_express"
 * et une confiance réduite, pour rester traçable (cf. principe "zéro valeur
 * par défaut inventée", src/lib/effectiveRefs.ts).
 */
import { useState } from "react";
import { AlertTriangle, Bike, CheckCircle2, Footprints, Info, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  computeProfilExpressRun,
  computeProfilExpressBike,
  type ProfilExpressRunResult,
  type ProfilExpressBikeResult,
} from "@/lib/v2/profilExpress";

export interface ProfilExpressSubmitPayload {
  sport: "run" | "bike";
  weightKg: number;
  vo2max: number;
  vlamax: number | null;
  vma?: number | null;
  ftp?: number | null;
  paceThresholdSecPerKm?: number | null;
  confidence: number;
  warnings: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName?: string;
  defaultWeightKg?: number | null;
  onSubmit: (payload: ProfilExpressSubmitPayload) => void | Promise<void>;
}

function fmtPace(secPerKm: number | null): string {
  if (secPerKm == null) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - m * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.6) return { label: "Confiance correcte", cls: "bg-success/10 text-success border-success/30" };
  if (confidence >= 0.4) return { label: "Confiance modérée", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  return { label: "Confiance faible", cls: "bg-destructive/10 text-destructive border-destructive/30" };
}

export function ProfilExpressDialog({ open, onOpenChange, athleteName, defaultWeightKg, onSubmit }: Props) {
  // --- Course à pied ---
  const [distSprint1, setDistSprint1] = useState("");
  const [distSprint2, setDistSprint2] = useState("");
  const [time1500m, setTime1500m] = useState("");
  const [weightRun, setWeightRun] = useState(defaultWeightKg ? String(defaultWeightKg) : "");
  const [runResult, setRunResult] = useState<ProfilExpressRunResult | null>(null);
  const [runSaving, setRunSaving] = useState(false);

  // --- Vélo ---
  const [p30s, setP30s] = useState("");
  const [map5min, setMap5min] = useState("");
  const [weightBike, setWeightBike] = useState(defaultWeightKg ? String(defaultWeightKg) : "");
  const [bikeResult, setBikeResult] = useState<ProfilExpressBikeResult | null>(null);
  const [bikeSaving, setBikeSaving] = useState(false);

  const handleComputeRun = () => {
    const result = computeProfilExpressRun({
      distSprint1M: Number(distSprint1),
      distSprint2M: Number(distSprint2),
      time1500mSec: Number(time1500m),
      weightKg: Number(weightRun),
    });
    setRunResult(result);
  };

  const handleSaveRun = async () => {
    if (!runResult) return;
    setRunSaving(true);
    try {
      await onSubmit({
        sport: "run",
        weightKg: Number(weightRun),
        vo2max: runResult.vo2max,
        vlamax: runResult.vlamax,
        vma: runResult.vma,
        paceThresholdSecPerKm: runResult.thresholdPaceSecPerKm,
        confidence: runResult.confidence,
        warnings: runResult.warnings,
      });
    } finally {
      setRunSaving(false);
    }
  };

  const handleComputeBike = () => {
    const result = computeProfilExpressBike({
      map5MinW: Number(map5min),
      p30sW: p30s ? Number(p30s) : null,
      weightKg: Number(weightBike),
    });
    setBikeResult(result);
  };

  const handleSaveBike = async () => {
    if (!bikeResult) return;
    setBikeSaving(true);
    try {
      await onSubmit({
        sport: "bike",
        weightKg: Number(weightBike),
        vo2max: bikeResult.vo2max,
        vlamax: bikeResult.vlamax,
        ftp: bikeResult.ftpEstimatedW,
        confidence: bikeResult.confidence,
        warnings: bikeResult.warnings,
      });
    } finally {
      setBikeSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Profil Rapide{athleteName ? ` — ${athleteName}` : ""}
          </DialogTitle>
          <DialogDescription>
            1 séance par discipline (sprint + 1500m piste ou sprint + 5min MAP) pour identifier
            le limiteur principal sans le protocole complet. Résultat marqué comme{" "}
            <strong>estimé</strong>, à affiner ensuite si besoin.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="run">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="run" className="gap-2"><Footprints className="h-4 w-4" />Course à pied</TabsTrigger>
            <TabsTrigger value="bike" className="gap-2"><Bike className="h-4 w-4" />Vélo</TabsTrigger>
          </TabsList>

          <TabsContent value="run" className="space-y-4 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Protocole</AlertTitle>
              <AlertDescription>
                Échauffement 15-20min + 2×15s sprint lancé all-out (récup marche entre les 2, 8min
                récup complète après) + 1500m piste à allure maximale stable. Mesurer les 2 distances
                sprint et le temps du 1500m (protocole TFCL Track Day™).
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sprint 1 lancé (m)</Label>
                <Input type="number" value={distSprint1} onChange={e => setDistSprint1(e.target.value)} placeholder="90" />
              </div>
              <div className="space-y-1.5">
                <Label>Sprint 2 lancé (m)</Label>
                <Input type="number" value={distSprint2} onChange={e => setDistSprint2(e.target.value)} placeholder="92" />
              </div>
              <div className="space-y-1.5">
                <Label>Temps 1500m piste (sec)</Label>
                <Input type="number" value={time1500m} onChange={e => setTime1500m(e.target.value)} placeholder="330" />
              </div>
              <div className="space-y-1.5">
                <Label>Poids (kg)</Label>
                <Input type="number" value={weightRun} onChange={e => setWeightRun(e.target.value)} placeholder="70" />
              </div>
            </div>
            <Button onClick={handleComputeRun} variant="secondary" className="w-full">Calculer</Button>

            {runResult && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Résultat estimé</span>
                    <Badge variant="outline" className={confidenceBadge(runResult.confidence).cls}>
                      {confidenceBadge(runResult.confidence).label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">VO2max</span><p className="font-semibold">{runResult.vo2max} ml/kg/min</p></div>
                    <div><span className="text-muted-foreground">VLamax</span><p className="font-semibold">{runResult.vlamax.toFixed(2)} mmol/L/s</p></div>
                    <div><span className="text-muted-foreground">VMA estimée</span><p className="font-semibold">{runResult.vma} km/h</p></div>
                    <div><span className="text-muted-foreground">Allure seuil estimée</span><p className="font-semibold">{fmtPace(runResult.thresholdPaceSecPerKm)}</p></div>
                  </div>
                  {runResult.warnings.map((w, i) => (
                    <Alert key={i} variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{w}</AlertDescription>
                    </Alert>
                  ))}
                  <Button onClick={handleSaveRun} disabled={runSaving} className="w-full gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Enregistrer le profil estimé
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bike" className="space-y-4 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Protocole</AlertTitle>
              <AlertDescription>
                Échauffement 20min + 1 sprint 30s all-out (récup complète) + 1 effort 5min all-out.
                Mesurer la puissance moyenne de chaque effort (capteur de puissance ou home-trainer connecté).
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Puissance moy. 30s (W)</Label>
                <Input type="number" value={p30s} onChange={e => setP30s(e.target.value)} placeholder="450" />
              </div>
              <div className="space-y-1.5">
                <Label>Puissance moy. 5min (W)</Label>
                <Input type="number" value={map5min} onChange={e => setMap5min(e.target.value)} placeholder="280" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Poids (kg)</Label>
                <Input type="number" value={weightBike} onChange={e => setWeightBike(e.target.value)} placeholder="70" />
              </div>
            </div>
            <Button onClick={handleComputeBike} variant="secondary" className="w-full">Calculer</Button>

            {bikeResult && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Résultat estimé</span>
                    <Badge variant="outline" className={confidenceBadge(bikeResult.confidence).cls}>
                      {confidenceBadge(bikeResult.confidence).label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">VO2max</span><p className="font-semibold">{bikeResult.vo2max} ml/kg/min</p></div>
                    <div><span className="text-muted-foreground">VLamax</span><p className="font-semibold">{bikeResult.vlamax != null ? bikeResult.vlamax.toFixed(2) : "—"} mmol/L/s</p></div>
                    <div><span className="text-muted-foreground">FTP estimé</span><p className="font-semibold">{bikeResult.ftpEstimatedW != null ? `${bikeResult.ftpEstimatedW} W` : "—"}</p></div>
                    <div><span className="text-muted-foreground">W'</span><p className="font-semibold">{bikeResult.wprimeKJ != null ? `${bikeResult.wprimeKJ} kJ` : "—"}</p></div>
                  </div>
                  {bikeResult.warnings.map((w, i) => (
                    <Alert key={i} variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{w}</AlertDescription>
                    </Alert>
                  ))}
                  <Button
                    onClick={handleSaveBike}
                    disabled={bikeSaving || bikeResult.ftpEstimatedW == null}
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Enregistrer le profil estimé
                  </Button>
                  {bikeResult.ftpEstimatedW == null && (
                    <p className="text-xs text-muted-foreground text-center">
                      Seuil non calculable — ajoutez la puissance 30s pour affiner CP/W'.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
