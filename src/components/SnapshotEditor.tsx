import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Save, Calculator, Sparkles, HelpCircle, BookOpen, Bike, PersonStanding, Settings } from "lucide-react";
import { useCloudData, DbSnapshot } from "@/contexts/CloudDataContext";
import { PROFILE_TERMINOLOGY } from "@/lib/v2/profileTerminology";
import { estimateVLamaxCap, canEstimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";
import { RMSEExplainer } from "@/components/RMSEExplainer";
import { RunningTestProtocolsGuide } from "@/components/RunningTestProtocolsGuide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ✅ Composant Label avec aide contextuelle
interface LabelWithHelpProps {
  label: string;
  help: string;
  example?: string;
}

function LabelWithHelp({ label, help, example }: LabelWithHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Label className="text-right flex items-center justify-end gap-1 cursor-help">
            {label}
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </Label>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[280px]">
          <p className="text-sm">{help}</p>
          {example && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Ex: {example}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
interface SnapshotEditorProps {
  snapshot: DbSnapshot;
  trigger?: React.ReactNode;
  staffMode?: boolean; // ✅ Mode Staff pour VLamax mesurée
}

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ✅ Convertit mm:ss ou secondes vers secondes
const parsePaceToSeconds = (v: string): number | null => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  
  // Format mm:ss (ex: 4:30)
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);
      if (Number.isFinite(min) && Number.isFinite(sec) && min >= 0 && sec >= 0 && sec < 60) {
        return min * 60 + sec;
      }
    }
    return null;
  }
  
  // Format secondes (ex: 270)
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// ✅ Convertit secondes vers mm:ss
const secondsToMmSs = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

// ✅ Composant pour le champ VLamax CAP avec calcul automatique
interface VLamaxCapFieldProps {
  vlamaxRun: string;
  setVlamaxRun: (v: string) => void;
  staffMode: boolean;
  vma: number | null;
  paceThresholdSecPerKm: number | null;
  tteMin: number | null;
  sprint15sDistance: number | null;
  runningPowerMax: number | null;
}

function VLamaxCapField({ 
  vlamaxRun, 
  setVlamaxRun, 
  staffMode, 
  vma, 
  paceThresholdSecPerKm, 
  tteMin,
  sprint15sDistance,
  runningPowerMax
}: VLamaxCapFieldProps) {
  const canEstimate = useMemo(() => 
    canEstimateVLamaxCap({ 
      vma, 
      paceThresholdSecPerKm, 
      tteMin,
      sprint15sDistance,
      runningPowerMax
    }),
    [vma, paceThresholdSecPerKm, tteMin, sprint15sDistance, runningPowerMax]
  );

  const estimatedValue = useMemo(() => {
    if (!canEstimate) return null;
    return estimateVLamaxCap({ 
      vma, 
      paceThresholdSecPerKm, 
      tteMin,
      sprint15sDistance,
      runningPowerMax
    });
  }, [vma, paceThresholdSecPerKm, tteMin, sprint15sDistance, runningPowerMax, canEstimate]);

  const handleAutoCalculate = () => {
    if (estimatedValue) {
      setVlamaxRun(estimatedValue.value.toFixed(2));
    }
  };

  if (staffMode) {
    return (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">VLamax CAP</Label>
        <div className="col-span-3 flex gap-2">
          <Input 
            className="flex-1 border-accent/50" 
            type="number" 
            step="0.01" 
            placeholder="0.35 (course)" 
            value={vlamaxRun} 
            onChange={(e) => setVlamaxRun(e.target.value)} 
          />
          {canEstimate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAutoCalculate}
              title={estimatedValue 
                ? `Calculer: ${estimatedValue.value.toFixed(2)} (${estimatedValue.sources.join(", ")})` 
                : "Calculer VLamax CAP"
              }
              className="shrink-0 border-accent/50 hover:bg-accent/10"
            >
              <Sparkles className="w-4 h-4 text-accent" />
            </Button>
          )}
        </div>
        {estimatedValue && canEstimate && (
          <div className="col-span-4 flex items-center justify-end gap-2 text-xs text-muted-foreground pr-2">
            <span>
              Estimation: <span className="font-medium text-accent">{estimatedValue.value.toFixed(2)}</span>
              <span className="ml-1">({estimatedValue.sources.join(" + ")})</span>
            </span>
            <RMSEExplainer
              compact
              value={0.053}
              unit="mmol/L/s"
              tolerance={0.08}
              context="Précision validée sur cohorte Billat N=9 (coureurs élites/sub-élites)"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right text-muted-foreground">VLamax CAP</Label>
      <div className="col-span-3 h-10 px-3 py-2 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground flex items-center justify-between">
        <span>
          {estimatedValue 
            ? `Estimée: ${estimatedValue.value.toFixed(2)}` 
            : "Calculée automatiquement"
          }
        </span>
        {estimatedValue && (
          <span className="text-xs opacity-70">
            ({estimatedValue.sources?.join(", ") || "estimée"})
          </span>
        )}
      </div>
    </div>
  );
}


export function SnapshotEditor({ snapshot, trigger, staffMode = false }: SnapshotEditorProps) {
  const { updateSnapshot } = useCloudData();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(snapshot.date);
  const [sportMain, setSportMain] = useState<string>(snapshot.sport_main ?? "");
  const [ftp, setFtp] = useState(snapshot.ftp != null ? String(snapshot.ftp) : "");
  const [pmax5s, setPmax5s] = useState(snapshot.pmax_5s != null ? String(snapshot.pmax_5s) : "");
  const [weight, setWeight] = useState(snapshot.weight_kg != null ? String(snapshot.weight_kg) : "");
  const [vo2, setVo2] = useState(snapshot.vo2max != null ? String(snapshot.vo2max) : "");
  const [vlamax, setVlamax] = useState(snapshot.vlamax != null ? String(snapshot.vlamax) : "");
  const [vlamaxRun, setVlamaxRun] = useState(snapshot.vlamax_run != null ? String(snapshot.vlamax_run) : "");
  const [vma, setVma] = useState(snapshot.vma != null ? String(snapshot.vma) : "");
  const [fcmax, setFcmax] = useState(snapshot.fc_max != null ? String(snapshot.fc_max) : "");
  const [css, setCss] = useState(snapshot.css != null ? String(snapshot.css) : "");
  const [fat, setFat] = useState(snapshot.fat_pct != null ? String(snapshot.fat_pct) : "");
  const [confidence, setConfidence] = useState(snapshot.confidence != null ? String(snapshot.confidence) : "");
  // Nouveaux champs pour Fatigue
  const [tss7d, setTss7d] = useState(snapshot.tss_7d != null ? String(snapshot.tss_7d) : "");
  const [tteObserved, setTteObserved] = useState(snapshot.tte_observed_min != null ? String(snapshot.tte_observed_min) : "");
  
  // ✅ Champs pour calcul VLamax CAP
  const [paceThreshold, setPaceThreshold] = useState(snapshot.pace_threshold_sec_per_km != null ? String(snapshot.pace_threshold_sec_per_km) : "");
  const [sprint15s, setSprint15s] = useState(snapshot.sprint_15s_distance != null ? String(snapshot.sprint_15s_distance) : "");
  const [runPowerMax, setRunPowerMax] = useState(snapshot.running_power_max != null ? String(snapshot.running_power_max) : "");
  const [runPowerThreshold, setRunPowerThreshold] = useState(snapshot.running_power_threshold != null ? String(snapshot.running_power_threshold) : "");

  // ✅ Chronos course (RAW pour estimateur CE / durabilité)
  const [time5k, setTime5k] = useState((snapshot as any).time_5k_sec != null ? secondsToMmSs((snapshot as any).time_5k_sec) : "");
  const [time10k, setTime10k] = useState((snapshot as any).time_10k_sec != null ? secondsToMmSs((snapshot as any).time_10k_sec) : "");
  const [time20k, setTime20k] = useState((snapshot as any).time_20k_sec != null ? secondsToMmSs((snapshot as any).time_20k_sec) : "");
  const [timeHalf, setTimeHalf] = useState((snapshot as any).time_half_sec != null ? secondsToMmSs((snapshot as any).time_half_sec) : "");
  const [timeMarathon, setTimeMarathon] = useState((snapshot as any).time_marathon_sec != null ? secondsToMmSs((snapshot as any).time_marathon_sec) : "");

  const parseRaceTime = (s: string): number | null => {
    if (!s) return null;
    const t = s.trim();
    // hh:mm:ss or mm:ss or seconds
    const parts = t.split(":").map(p => p.trim());
    if (parts.length === 3) {
      const [h, m, sec] = parts.map(Number);
      if ([h, m, sec].some(isNaN)) return null;
      return h * 3600 + m * 60 + sec;
    }
    if (parts.length === 2) {
      const [m, sec] = parts.map(Number);
      if ([m, sec].some(isNaN)) return null;
      return m * 60 + sec;
    }
    const n = Number(t);
    return isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    await updateSnapshot(snapshot.id, {
      date,
      sport_main: sportMain || null,
      ftp: numOrNull(ftp) != null ? Math.round(numOrNull(ftp)!) : null,
      pmax_5s: numOrNull(pmax5s) != null ? Math.round(numOrNull(pmax5s)!) : null,
      weight_kg: numOrNull(weight),
      vo2max: numOrNull(vo2),
      // ✅ VLamax uniquement sauvegardée en mode Staff
      vlamax: staffMode ? numOrNull(vlamax) : snapshot.vlamax,
      vlamax_run: staffMode ? numOrNull(vlamaxRun) : snapshot.vlamax_run,
      vma: numOrNull(vma),
      fc_max: numOrNull(fcmax) != null ? Math.round(numOrNull(fcmax)!) : null,
      css: numOrNull(css),
      fat_pct: numOrNull(fat),
      confidence: numOrNull(confidence),
      // ✅ Nouveaux champs Fatigue
      tss_7d: numOrNull(tss7d) != null ? Math.round(numOrNull(tss7d)!) : null,
      tte_observed_min: numOrNull(tteObserved) != null ? Math.round(numOrNull(tteObserved)!) : null,
      // ✅ Champs pour calcul VLamax CAP
      pace_threshold_sec_per_km: parsePaceToSeconds(paceThreshold),
      sprint_15s_distance: numOrNull(sprint15s),
      running_power_max: numOrNull(runPowerMax),
      running_power_threshold: numOrNull(runPowerThreshold),
    });
    setOpen(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDate(snapshot.date);
      setSportMain(snapshot.sport_main ?? "");
      setFtp(snapshot.ftp != null ? String(snapshot.ftp) : "");
      setPmax5s(snapshot.pmax_5s != null ? String(snapshot.pmax_5s) : "");
      setWeight(snapshot.weight_kg != null ? String(snapshot.weight_kg) : "");
      setVo2(snapshot.vo2max != null ? String(snapshot.vo2max) : "");
      setVlamax(snapshot.vlamax != null ? String(snapshot.vlamax) : "");
      setVlamaxRun(snapshot.vlamax_run != null ? String(snapshot.vlamax_run) : "");
      setVma(snapshot.vma != null ? String(snapshot.vma) : "");
      setFcmax(snapshot.fc_max != null ? String(snapshot.fc_max) : "");
      setCss(snapshot.css != null ? String(snapshot.css) : "");
      setFat(snapshot.fat_pct != null ? String(snapshot.fat_pct) : "");
      setConfidence(snapshot.confidence != null ? String(snapshot.confidence) : "");
      // Nouveaux champs
      setTss7d(snapshot.tss_7d != null ? String(snapshot.tss_7d) : "");
      setTteObserved(snapshot.tte_observed_min != null ? String(snapshot.tte_observed_min) : "");
      // VLamax CAP fields
      setPaceThreshold(snapshot.pace_threshold_sec_per_km != null ? String(snapshot.pace_threshold_sec_per_km) : "");
      setSprint15s(snapshot.sprint_15s_distance != null ? String(snapshot.sprint_15s_distance) : "");
      setRunPowerMax(snapshot.running_power_max != null ? String(snapshot.running_power_max) : "");
      setRunPowerThreshold(snapshot.running_power_threshold != null ? String(snapshot.running_power_threshold) : "");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Éditer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            {PROFILE_TERMINOLOGY.actions.edit} (manuel)
          </DialogTitle>
          <DialogDescription>
            Modifie les valeurs et sauvegarde dans le cloud.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="general" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Général
            </TabsTrigger>
            <TabsTrigger value="bike" className="gap-1.5">
              <Bike className="w-3.5 h-3.5" />
              Vélo
            </TabsTrigger>
            <TabsTrigger value="run" className="gap-1.5">
              <PersonStanding className="w-3.5 h-3.5" />
              Course
            </TabsTrigger>
          </TabsList>

          {/* ====== ONGLET GÉNÉRAL ====== */}
          <TabsContent value="general" className="mt-4 overflow-y-auto flex-1 pr-2 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Date</Label>
              <Input className="col-span-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Sport principal</Label>
              <Select value={sportMain || "auto"} onValueChange={(v) => setSportMain(v === "auto" ? "" : v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Auto (depuis l'objectif)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (depuis l'objectif)</SelectItem>
                  <SelectItem value="run">Course à pied (CAP / Trail / Marathon)</SelectItem>
                  <SelectItem value="bike">Vélo / Cyclisme</SelectItem>
                  <SelectItem value="swim">Natation</SelectItem>
                  <SelectItem value="triathlon">Triathlon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Poids (kg)</Label>
              <Input className="col-span-3" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">VO₂max</Label>
              <Input className="col-span-3" type="number" value={vo2} onChange={(e) => setVo2(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">FC max</Label>
              <Input className="col-span-3" type="number" value={fcmax} onChange={(e) => setFcmax(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Masse grasse (%)</Label>
              <Input className="col-span-3" type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>

            {/* Section Fatigue & Charge */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Charge & Fatigue
              </p>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">TSS 7 jours</Label>
              <Input 
                className="col-span-3" 
                type="number" 
                placeholder="Ex: 350"
                value={tss7d} 
                onChange={(e) => setTss7d(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">TTE observé (min)</Label>
              <Input 
                className="col-span-3" 
                type="number" 
                placeholder="Ex: 45"
                value={tteObserved} 
                onChange={(e) => setTteObserved(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fiabilité (0–1)</Label>
              <Input className="col-span-3" type="number" step="0.1" min="0" max="1" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
            </div>
          </TabsContent>

          {/* ====== ONGLET VÉLO ====== */}
          <TabsContent value="bike" className="mt-4 overflow-y-auto flex-1 pr-2 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">FTP (W)</Label>
              <Input className="col-span-3" type="number" value={ftp} onChange={(e) => setFtp(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Pmax 5s (W)</Label>
              <Input className="col-span-3" type="number" value={pmax5s} onChange={(e) => setPmax5s(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">CSS</Label>
              <Input className="col-span-3" type="number" step="0.01" value={css} onChange={(e) => setCss(e.target.value)} />
            </div>

            {/* VLamax Vélo */}
            {staffMode ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">VLamax Vélo</Label>
                <Input className="col-span-3 border-primary/50" type="number" step="0.01" placeholder="0.40 (lactate)" value={vlamax} onChange={(e) => setVlamax(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-muted-foreground">VLamax Vélo</Label>
                <div className="col-span-3 h-10 px-3 py-2 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground flex items-center">
                  Calculée automatiquement
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Conseil :</strong> Complétez FTP et Pmax 5s pour un calcul précis de la VLamax vélo.
              </p>
            </div>
          </TabsContent>

          {/* ====== ONGLET COURSE ====== */}
          <TabsContent value="run" className="mt-4 overflow-y-auto flex-1 pr-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Données pour VLamax CAP
              </p>
              <RunningTestProtocolsGuide 
                trigger={
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                    <BookOpen className="w-3 h-3" />
                    Guide des tests
                  </Button>
                }
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">VMA (km/h)</Label>
              <Input className="col-span-3" type="number" step="0.1" value={vma} onChange={(e) => setVma(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <LabelWithHelp 
                label="Allure Seuil" 
                help="Allure que vous pouvez tenir ~1h en course à pied. Correspond au seuil lactique 2 (SL2). Saisissez en mm:ss ou en secondes."
                example="4:30/km ou 270s pour un coureur avec VMA 17"
              />
              <div className="col-span-3 flex gap-2 items-center">
                <Input 
                  className="flex-1" 
                  type="text" 
                  placeholder="4:30 ou 270"
                  value={paceThreshold} 
                  onChange={(e) => setPaceThreshold(e.target.value)} 
                />
                {paceThreshold && parsePaceToSeconds(paceThreshold) && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    = {secondsToMmSs(parsePaceToSeconds(paceThreshold)!)}/km
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <LabelWithHelp 
                label="Sprint 15s (m)" 
                help="Distance parcourue lors d'un sprint maximal de 15 secondes sur piste ou terrain plat. Mesure la puissance anaérobie lactique."
                example="80-90m pour amateur, 95-105m pour élite"
              />
              <Input 
                className="col-span-3" 
                type="number" 
                step="0.1"
                placeholder="Ex: 85"
                value={sprint15s} 
                onChange={(e) => setSprint15s(e.target.value)} 
              />
            </div>

            {/* Section Running Power */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                ⚡ Running Power (optionnel)
              </p>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <LabelWithHelp 
                label="Puissance Max (W)" 
                help="Puissance maximale mesurée par un capteur de running power (Stryd, Garmin, etc.) lors d'un sprint ou effort très court (5-10s)."
                example="400-500W pour amateur, 600-800W pour élite"
              />
              <Input 
                className="col-span-3" 
                type="number" 
                placeholder="Ex: 450"
                value={runPowerMax} 
                onChange={(e) => setRunPowerMax(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <LabelWithHelp 
                label="Puissance Seuil (W)" 
                help="Puissance moyenne au seuil lactique (FTP course), mesurée par capteur de running power. Correspond à l'effort tenable ~1h."
                example="250-300W pour amateur, 320-400W pour élite"
              />
              <Input 
                className="col-span-3" 
                type="number" 
                placeholder="Ex: 280"
                value={runPowerThreshold} 
                onChange={(e) => setRunPowerThreshold(e.target.value)} 
              />
            </div>

            {/* VLamax CAP */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Résultat VLamax CAP
              </p>
            </div>

            <VLamaxCapField
              vlamaxRun={vlamaxRun}
              setVlamaxRun={setVlamaxRun}
              staffMode={staffMode}
              vma={numOrNull(vma)}
              paceThresholdSecPerKm={parsePaceToSeconds(paceThreshold)}
              tteMin={numOrNull(tteObserved)}
              sprint15sDistance={numOrNull(sprint15s)}
              runningPowerMax={numOrNull(runPowerMax)}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
