// =============================================
// RaceChronoForm — Mini-formulaire chrono pour l'assistant
// Injecte un message structuré dans le chat
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Timer } from "lucide-react";
import { parseTimeToSec, formatTime } from "@/lib/raceAnalysis";

interface Props {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

const QUICK_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "20K", km: 20 },
  { label: "Semi", km: 21.1 },
  { label: "Marathon", km: 42.195 },
];

export function RaceChronoForm({ onSubmit, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [distance, setDistance] = useState<string>("20");
  const [timeInput, setTimeInput] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleQuickDistance = (km: number) => setDistance(String(km));

  const handleSubmit = () => {
    const distKm = parseFloat(distance);
    const sec = parseTimeToSec(timeInput);
    if (!distKm || !sec) return;
    const msg = `Analyse cette course de l'athlète sélectionné : ${distKm}km en ${formatTime(sec)} (${sec}s) le ${date}. Compare avec les prédictions TFCL et propose une calibration si pertinent.`;
    onSubmit(msg);
    setOpen(false);
    setTimeInput("");
  };

  const canSubmit = !!parseFloat(distance) && parseTimeToSec(timeInput) !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={disabled}
          title="Analyser une course"
        >
          <Timer className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-[300px] p-3 space-y-3">
        <div>
          <p className="text-sm font-medium mb-1">Analyser un chrono</p>
          <p className="text-xs text-muted-foreground">Compare avec les prédictions TFCL</p>
        </div>

        <div className="flex gap-1 flex-wrap">
          {QUICK_DISTANCES.map(d => (
            <Button
              key={d.label}
              type="button"
              variant={parseFloat(distance) === d.km ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => handleQuickDistance(d.km)}
            >
              {d.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <div>
            <Label htmlFor="dist" className="text-xs">Distance (km)</Label>
            <Input
              id="dist"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              type="number"
              step="0.1"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="time" className="text-xs">Temps (ex: 1h33, 1:33:00, 93:00)</Label>
            <Input
              id="time"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              placeholder="1h33"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input
              id="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-8"
          size="sm"
        >
          Analyser
        </Button>
      </PopoverContent>
    </Popover>
  );
}
