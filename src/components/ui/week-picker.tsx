/**
 * WeekPicker — calendrier visuel mensuel où le coach sélectionne une SEMAINE
 * (et non un jour). Cliquer n'importe quel jour d'une ligne sélectionne le
 * lundi de cette semaine ; la ligne entière est surlignée.
 *
 * - Navigation mois précédent / suivant
 * - Lundi de la semaine en cours pré-sélectionné par défaut (si non fourni)
 * - Mobile-first : grands carrés tactiles, lignes espacées
 *
 * Sous le calendrier, le composant affiche 2 lignes de confirmation
 * configurables (anchorLabel / planStartLabel). planStartLabel est masquée
 * quand `planStartDate` égale `selectedMonday`.
 */
import * as React from "react";
import {
  addDays, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, isSameDay, isSameMonth, format,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  /** Lundi sélectionné (00:00 local). */
  selectedMonday: Date;
  onChange: (monday: Date) => void;
  /** Lundi de la semaine 1 du plan (pour affichage de la 2e ligne). */
  planStartDate?: Date | null;
  /** Texte de la 1ère ligne (devant la date). Défaut adapté envoi Nolio. */
  anchorLabel?: string;
  /** Texte de la 2e ligne (devant la date plan). */
  planStartLabel?: string;
  /** Masque le bloc de confirmation bas (l'appelant gère son propre résumé). */
  hideSummary?: boolean;
  className?: string;
}

const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfMon(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function WeekPicker({
  selectedMonday,
  onChange,
  planStartDate = null,
  anchorLabel = "📅 Cette semaine du plan commence le :",
  planStartLabel = "→ Le plan complet débute donc le :",
  hideSummary = false,
  className,
}: WeekPickerProps) {
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(selectedMonday));

  React.useEffect(() => {
    setViewMonth(startOfMonth(selectedMonday));
  }, [selectedMonday]);

  const weeks = React.useMemo(() => {
    const firstDay = startOfMon(startOfMonth(viewMonth));
    const lastDay = endOfMonth(viewMonth);
    const rows: Date[][] = [];
    let cursor = firstDay;
    while (cursor <= lastDay || rows.length < 6) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) row.push(addDays(cursor, i));
      rows.push(row);
      cursor = addDays(cursor, 7);
      if (rows.length >= 6 && cursor > lastDay) break;
    }
    return rows;
  }, [viewMonth]);

  const selectedKey = format(selectedMonday, "yyyy-MM-dd");
  const showPlanStart =
    planStartDate != null && !isSameDay(planStartDate, selectedMonday);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Mois précédent"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize">
          {format(viewMonth, "LLLL yyyy", { locale: fr })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Mois suivant"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-muted-foreground text-center">
        {DOW.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="space-y-1.5">
        {weeks.map((row) => {
          const rowMonday = row[0];
          const isSelectedRow = format(rowMonday, "yyyy-MM-dd") === selectedKey;
          return (
            <button
              type="button"
              key={rowMonday.toISOString()}
              onClick={() => onChange(rowMonday)}
              className={cn(
                "grid grid-cols-7 gap-1 w-full rounded-md p-1 transition-colors",
                "hover:bg-teal-50 dark:hover:bg-teal-950/30",
                isSelectedRow && "bg-teal-100 dark:bg-teal-900/30 ring-1 ring-teal-400/60",
              )}
              aria-pressed={isSelectedRow}
              aria-label={`Semaine du ${format(rowMonday, "EEEE d MMMM yyyy", { locale: fr })}`}
            >
              {row.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isMonday = isSelectedRow && isSameDay(day, rowMonday);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "h-10 sm:h-9 flex items-center justify-center text-sm rounded-md",
                      !inMonth && "text-muted-foreground/40",
                      isMonday && "bg-teal-500 text-white font-semibold shadow-sm",
                    )}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>

      <div className="space-y-1 text-xs sm:text-sm rounded-md bg-muted/40 px-3 py-2 border border-border/60">
        <div className="flex items-start gap-2">
          <span className="text-foreground">{anchorLabel}</span>
          <span className="font-semibold text-teal-700 dark:text-teal-300">
            {format(selectedMonday, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
        </div>
        {showPlanStart && planStartDate && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <span>{planStartLabel}</span>
            <span className="font-medium text-foreground">
              {format(planStartDate, "EEEE d MMMM yyyy", { locale: fr })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Helper : lundi de la semaine contenant `d`. */
export function mondayOf(d: Date): Date {
  return startOfMon(d);
}

/** Helper : lundi de la semaine en cours. */
export function thisWeekMonday(): Date {
  return startOfMon(new Date());
}

/** Icone à exposer pour un trigger éventuel. */
export const WeekPickerIcon = CalendarDays;
