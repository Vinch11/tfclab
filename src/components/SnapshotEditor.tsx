import { useState } from "react";
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
import { Edit, Save } from "lucide-react";
import { useCloudData, DbSnapshot } from "@/hooks/useCloudData";

interface SnapshotEditorProps {
  snapshot: DbSnapshot;
  trigger?: React.ReactNode;
}

const numOrNull = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function SnapshotEditor({ snapshot, trigger }: SnapshotEditorProps) {
  const { updateSnapshot } = useCloudData();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(snapshot.date);
  const [ftp, setFtp] = useState(snapshot.ftp != null ? String(snapshot.ftp) : "");
  const [pmax5s, setPmax5s] = useState(snapshot.pmax_5s != null ? String(snapshot.pmax_5s) : "");
  const [weight, setWeight] = useState(snapshot.weight_kg != null ? String(snapshot.weight_kg) : "");
  const [vo2, setVo2] = useState(snapshot.vo2max != null ? String(snapshot.vo2max) : "");
  const [vlamax, setVlamax] = useState(snapshot.vlamax != null ? String(snapshot.vlamax) : "");
  const [vma, setVma] = useState(snapshot.vma != null ? String(snapshot.vma) : "");
  const [fcmax, setFcmax] = useState(snapshot.fc_max != null ? String(snapshot.fc_max) : "");
  const [css, setCss] = useState(snapshot.css != null ? String(snapshot.css) : "");
  const [fat, setFat] = useState(snapshot.fat_pct != null ? String(snapshot.fat_pct) : "");
  const [confidence, setConfidence] = useState(snapshot.confidence != null ? String(snapshot.confidence) : "");

  const handleSave = async () => {
    await updateSnapshot(snapshot.id, {
      date,
      ftp: numOrNull(ftp) != null ? Math.round(numOrNull(ftp)!) : null,
      pmax_5s: numOrNull(pmax5s) != null ? Math.round(numOrNull(pmax5s)!) : null,
      weight_kg: numOrNull(weight),
      vo2max: numOrNull(vo2),
      vlamax: numOrNull(vlamax),
      vma: numOrNull(vma),
      fc_max: numOrNull(fcmax) != null ? Math.round(numOrNull(fcmax)!) : null,
      css: numOrNull(css),
      fat_pct: numOrNull(fat),
      confidence: numOrNull(confidence),
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
      setVma(snapshot.vma != null ? String(snapshot.vma) : "");
      setFcmax(snapshot.fc_max != null ? String(snapshot.fc_max) : "");
      setCss(snapshot.css != null ? String(snapshot.css) : "");
      setFat(snapshot.fat_pct != null ? String(snapshot.fat_pct) : "");
      setConfidence(snapshot.confidence != null ? String(snapshot.confidence) : "");
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
            Édition du snapshot (manuel)
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">VLamax</Label>
            <Input className="col-span-3" type="number" step="0.01" value={vlamax} onChange={(e) => setVlamax(e.target.value)} />
          </div>

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
