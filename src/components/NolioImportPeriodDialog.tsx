/**
 * NolioImportPeriodDialog
 * Sélecteur de période + (optionnel) liste d'athlètes à inclure avant import des records Nolio.
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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarRange, Users } from "lucide-react";

export type NolioImportPeriod = {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  /** Fenêtre en mois (6, 12, 24) ou null si "Tout" / personnalisé. */
  windowMonths: number | null;
  /** Liste d'athlete_id sélectionnés (uniquement si selectableAthletes est fourni). */
  athleteIds?: string[];
  /** Si true, écrase les valeurs du snapshot même si la nouvelle valeur Nolio est inférieure. */
  forceOverwrite?: boolean;
};

export type SelectableAthlete = { id: string; name: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: NolioImportPeriod) => void;
  defaultWindowMonths?: number | null;
  loading?: boolean;
  title?: string;
  /** Si fourni, affiche la liste d'athlètes à cocher. Tous décochés par défaut. */
  selectableAthletes?: SelectableAthlete[];
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
  selectableAthletes,
}: Props) {
  const today = useMemo(() => fmt(new Date()), []);
  const [dateFrom, setDateFrom] = useState(monthsAgo(defaultWindowMonths ?? 12));
  const [dateTo, setDateTo] = useState(today);
  const [windowMonths, setWindowMonths] = useState<number | null>(defaultWindowMonths ?? 12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forceOverwrite, setForceOverwrite] = useState(false);

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
    // Par défaut : aucun athlète coché — le coach choisit explicitement.
    setSelectedIds(new Set());
  }, [open, defaultWindowMonths, today]);

  const applyPreset = (months: number | null) => {
    setWindowMonths(months);
    setDateTo(today);
    setDateFrom(months == null ? "2000-01-01" : monthsAgo(months));
  };

  const toggleAthlete = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set((selectableAthletes ?? []).map((a) => a.id)));
  };
  const deselectAll = () => setSelectedIds(new Set());

  const hasAthleteSelector = Array.isArray(selectableAthletes);
  const canConfirm = !loading && !!dateFrom && !!dateTo
    && (!hasAthleteSelector || selectedIds.size > 0);

  const handleConfirm = () => {
    onConfirm({
      dateFrom,
      dateTo,
      windowMonths,
      ...(hasAthleteSelector ? { athleteIds: Array.from(selectedIds) } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la fenêtre temporelle{hasAthleteSelector ? " et les athlètes à importer" : " des records à importer"}.
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

          {hasAthleteSelector && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Users className="w-4 h-4" />
                  Athlètes à importer
                  <span className="text-xs text-muted-foreground font-normal">
                    ({selectedIds.size}/{selectableAthletes!.length})
                  </span>
                </Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>
                    Tout sélectionner
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={deselectAll}>
                    Tout déselectionner
                  </Button>
                </div>
              </div>
              {selectableAthletes!.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucun athlète lié à Nolio. Liez d'abord vos athlètes depuis la section "Lier les athlètes Nolio".
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {selectableAthletes!.map((a) => {
                    const checked = selectedIds.has(a.id);
                    return (
                      <label
                        key={a.id}
                        htmlFor={`nolio-ath-${a.id}`}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`nolio-ath-${a.id}`}
                          checked={checked}
                          onCheckedChange={() => toggleAthlete(a.id)}
                        />
                        <span className="text-sm">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedIds.size === 0 && selectableAthletes!.length > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Cochez au moins un athlète pour lancer l'import.
                </p>
              )}
            </div>
          )}

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
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {loading
              ? "Import..."
              : hasAthleteSelector
                ? `Importer (${selectedIds.size})`
                : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
