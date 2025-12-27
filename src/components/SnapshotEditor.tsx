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
import { Edit, Save, Zap, Timer, Wind, Activity, Scale, Gauge } from "lucide-react";
import { SnapshotNolio } from "@/types/snapshotNolio";
import { MetricExplanationPopup } from "./MetricExplanationPopup";

interface SnapshotEditorProps {
  snapshot: SnapshotNolio;
  onSave: (updatedSnapshot: SnapshotNolio) => void;
  trigger?: React.ReactNode;
}

export function SnapshotEditor({ snapshot, onSave, trigger }: SnapshotEditorProps) {
  const [open, setOpen] = useState(false);
  const [editedSnapshot, setEditedSnapshot] = useState<SnapshotNolio>(snapshot);

  const handleChange = (field: keyof SnapshotNolio, value: string | number) => {
    setEditedSnapshot(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (parseFloat(value) || 0) : value
    }));
  };

  const handleSave = () => {
    onSave(editedSnapshot);
    setOpen(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditedSnapshot(snapshot);
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
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Édition Manuelle du Snapshot
          </DialogTitle>
          <DialogDescription>
            Modifiez les valeurs manuellement. Les changements seront sauvegardés immédiatement.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right text-muted-foreground">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={editedSnapshot.date}
              onChange={(e) => setEditedSnapshot(prev => ({ ...prev, date: e.target.value }))}
              className="col-span-3 bg-secondary/50 border-border"
            />
          </div>

          {/* FTP */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ftp" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Activity className="w-4 h-4" />
              FTP (W)
              <MetricExplanationPopup metric="FTP" />
            </Label>
            <Input
              id="ftp"
              type="number"
              value={editedSnapshot.ftp || ""}
              onChange={(e) => handleChange("ftp", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="280"
            />
          </div>

          {/* Pmax 5s */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pmax_5s" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Zap className="w-4 h-4" />
              Pmax 5s (W)
            </Label>
            <Input
              id="pmax_5s"
              type="number"
              value={editedSnapshot.pmax_5s || ""}
              onChange={(e) => handleChange("pmax_5s", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="1200"
            />
          </div>

          {/* Poids */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="poids" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Scale className="w-4 h-4" />
              Poids (kg)
            </Label>
            <Input
              id="poids"
              type="number"
              value={editedSnapshot.poids || ""}
              onChange={(e) => handleChange("poids", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="70"
            />
          </div>

          {/* VO2max */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vo2max" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Wind className="w-4 h-4" />
              VO2max
              <MetricExplanationPopup metric="VO2max" />
            </Label>
            <Input
              id="vo2max"
              type="number"
              value={editedSnapshot.vo2max || ""}
              onChange={(e) => handleChange("vo2max", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="55"
            />
          </div>

          {/* TSS 7j */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tss_7j" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Gauge className="w-4 h-4" />
              TSS 7j
            </Label>
            <Input
              id="tss_7j"
              type="number"
              value={editedSnapshot.tss_7j || ""}
              onChange={(e) => handleChange("tss_7j", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="450"
            />
          </div>

          {/* HRV */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hrv" className="text-right flex items-center justify-end gap-1 text-muted-foreground">
              <Timer className="w-4 h-4" />
              HRV (ms)
            </Label>
            <Input
              id="hrv"
              type="number"
              value={editedSnapshot.hrv || ""}
              onChange={(e) => handleChange("hrv", e.target.value)}
              className="col-span-3 bg-secondary/50 border-border"
              placeholder="55"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button variant="glow" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
