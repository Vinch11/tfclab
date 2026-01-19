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
import { Edit, Save, Calculator, Sparkles } from "lucide-react";
import { useCloudData, DbSnapshot } from "@/hooks/useCloudData";
import { PROFILE_TERMINOLOGY } from "@/lib/v2/profileTerminology";
import { estimateVLamaxCap, canEstimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";
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

// ✅ Composant pour le champ VLamax CAP avec calcul automatique
interface VLamaxCapFieldProps {
  vlamaxRun: string;
  setVlamaxRun: (v: string) => void;
  staffMode: boolean;
  vma: number | null;
  css: number | null;
  tteMin: number | null;
}

function VLamaxCapField({ vlamaxRun, setVlamaxRun, staffMode, vma, css, tteMin }: VLamaxCapFieldProps) {
  const canEstimate = useMemo(() => 
    canEstimateVLamaxCap({ vma, css, paceThreshold: null, tteMin }),
    [vma, css, tteMin]
  );

  const estimatedValue = useMemo(() => {
    if (!canEstimate) return null;
    return estimateVLamaxCap({ vma, css, paceThreshold: null, tteMin });
  }, [vma, css, tteMin, canEstimate]);

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
          <div className="col-span-4 text-xs text-muted-foreground ml-auto pr-2">
            Estimation: <span className="font-medium text-accent">{estimatedValue.value.toFixed(2)}</span>
            <span className="ml-1">({estimatedValue.sources.join(" + ")})</span>
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
            ({Math.round(estimatedValue.confidence * 100)}% confiance)
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

  const handleSave = async () => {
    await updateSnapshot(snapshot.id, {
      date,
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
    });
    setOpen(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDate(snapshot.date);
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

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            {PROFILE_TERMINOLOGY.actions.edit} (manuel)
          </DialogTitle>
          <DialogDescription>
            Modifie les valeurs et sauvegarde dans le cloud.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <Input className="col-span-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">FTP (W)</Label>
            <Input className="col-span-3" type="number" value={ftp} onChange={(e) => setFtp(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Pmax 5s (W)</Label>
            <Input className="col-span-3" type="number" value={pmax5s} onChange={(e) => setPmax5s(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Poids (kg)</Label>
            <Input className="col-span-3" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">VO₂max</Label>
            <Input className="col-span-3" type="number" value={vo2} onChange={(e) => setVo2(e.target.value)} />
          </div>

          {/* ✅ VLamax Vélo - Uniquement visible en mode Staff */}
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

          {/* ✅ VLamax CAP - Avec calcul automatique */}
          <VLamaxCapField
            vlamaxRun={vlamaxRun}
            setVlamaxRun={setVlamaxRun}
            staffMode={staffMode}
            vma={numOrNull(vma)}
            css={numOrNull(css)}
            tteMin={numOrNull(tteObserved)}
          />

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">VMA (km/h)</Label>
            <Input className="col-span-3" type="number" step="0.1" value={vma} onChange={(e) => setVma(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">FC max</Label>
            <Input className="col-span-3" type="number" value={fcmax} onChange={(e) => setFcmax(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">CSS</Label>
            <Input className="col-span-3" type="number" step="0.01" value={css} onChange={(e) => setCss(e.target.value)} />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Masse grasse (%)</Label>
            <Input className="col-span-3" type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>

          {/* ====== SECTION FATIGUE & CHARGE ====== */}
          <div className="col-span-4 pt-3 border-t border-border">
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
            <Label className="text-right">Confiance (0–1)</Label>
            <Input className="col-span-3" type="number" step="0.1" min="0" max="1" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
          </div>
        </div>

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
