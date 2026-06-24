/**
 * NolioImportPeriodDialog
 * Sélecteur de période avant import des records Nolio.
 * Utilisé dans BikeTrackDayPage, TrackDayPage et ConfigurationPage.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarRange } from "lucide-react";

export type NolioImportPeriod = {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  /** Fenêtre en mois (6, 12, 24) ou null si "Tout" / personnalisé. */
  windowMonths: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: NolioImportPeriod) => void;
  defaultWindowMonths?: number | null;
  loading?: boolean;
  title?: string;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return fmt(d);
}
function formatFr(s: string): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export function NolioImportPeriodDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultWindowMonths = 12,
  loading = false,
  title = "Période des records à importer",
}: Props) {
  const today = useMemo(() => fmt(new Date()), []);
  const [dateFrom, setDateFrom] = useState(monthsAgo(defaultWindowMonths ?? 12));
  const [dateTo, setDateTo] = useState(today);
  const [windowMonths, setWindowMonths] = useState<number | null>(defaultWindowMonths ?? 12);

  useEffect(() => {
    if (!open) return;
    setDateTo(today);
    if (defaultWindowMonths == null) {
      setDateFrom("2000-01-01");
      setWindowMonths(null);
    } else {
      setDateFrom(monthsAgo(defaultWindowMonths));
      setWindowMonths(defaultWindowMonths);
    }
  }, [open, defaultWindowMonths, today]);

  const applyPreset = (months: number | null) => {
    setWindowMonths(months);
    setDateTo(today);
    setDateFrom(months == null ? "2000-01-01" : monthsAgo(months));
  };

  const handleConfirm = () => {
    onConfirm({ dateFrom, dateTo, windowMonths });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la fenêtre temporelle des records à importer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "6 mois", v: 6 },
              { label: "12 mois", v: 12 },
              { label: "24 mois", v: 24 },
              { label: "Tout", v: null as number | null },
            ].map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={windowMonths === p.v ? "default" : "outline"}
                onClick={() => applyPreset(p.v)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nolio-date-from">Du :</Label>
              <Input
                id="nolio-date-from"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setWindowMonths(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nolio-date-to">Au :</Label>
              <Input
                id="nolio-date-to"
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setWindowMonths(null);
                }}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Seuls les records réalisés dans cette période seront importés.
            Recommandé : 12 mois pour refléter le niveau actuel.
            {dateFrom && dateTo && (
              <span className="block mt-1">
                Période sélectionnée : <strong>{formatFr(dateFrom)}</strong> → <strong>{formatFr(dateTo)}</strong>
              </span>
            )}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !dateFrom || !dateTo}>
            {loading ? "Import..." : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
