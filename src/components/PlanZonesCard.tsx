/**
 * Zones d'entraînement du tableau de bord = celles des plans et des rapports (grille ancrée Z1–Z7),
 * avec les repères physiologiques posés dessus. Remplace l'ancien modèle à 6 zones quand la grille
 * ancrée est active, pour qu'un seul jeu de chiffres circule dans l'app.
 */
import { useMemo } from "react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs, getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { reportSportZoneSets } from "@/lib/reportKit/sportDiagramData";
import { resolveCurrentAthleteObjective } from "@/lib/currentAthleteObjective";

export function PlanZonesCard() {
  const { currentAthlete } = useAthletes();
  const { athletes, snapshots } = useCloudDataContext();
  const sets = useMemo(() => {
    const db = athletes.find(a => a.id === currentAthlete?.id) ?? null;
    const snap = getEffectiveSnapshot(db, snapshots);
    if (!db || !snap) return [];
    const refs = getEffectiveRefs(db, snapshots);
    const goal = resolveCurrentAthleteObjective(db.goal, currentAthlete?.objectif, snap.objectif);
    return reportSportZoneSets({
      athlete: { id: db.id, goal }, ambition: { current: currentAthlete?.ambition ?? null },
      effectiveRefs: { ftp: refs.ftp, vma: refs.vma, css: refs.css, fcMax: refs.fcMax, vo2max: refs.vo2max, weightKg: refs.weightKg },
      effectiveSnapshot: snap,
    });
  }, [athletes, snapshots, currentAthlete?.id, currentAthlete?.objectif, currentAthlete?.ambition]);
  if (!sets.length) return null;
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm" aria-label="Zones d'entraînement">
      <div>
        <h3 className="text-base font-semibold">Zones d’entraînement · mêmes chiffres que les plans et les rapports</h3>
        <p className="text-xs text-muted-foreground">Grille Z1–Z7 ancrée sur le seuil critique (CP vélo, vitesse critique course).</p>
      </div>
      {sets.map(set => (
        <div key={set.sportLabel} className="space-y-2">
          <h4 className="text-sm font-semibold">{set.sportLabel}</h4>
          <ul className="space-y-0.5 text-xs text-muted-foreground">{set.anchors.map(a => <li key={a}>{a}</li>)}</ul>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">Zone</th><th>Intention</th><th>Plage</th><th>FC</th></tr></thead>
            <tbody>
              {set.zones.map(z => (
                <tr key={z.id} className="border-t border-border/50">
                  <td className="py-1.5 font-medium">{z.id}</td><td>{z.label}</td>
                  <td className="tabular-nums">{z.absolute ?? "—"}</td><td className="tabular-nums">{z.heartRate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!!set.landmarks?.length && (
            <p className="text-xs text-muted-foreground">Repères : {set.landmarks.map(l => `${l.label} ${l.value}${l.zone ? ` (${l.zone})` : ""}`).join(" · ")}</p>
          )}
        </div>
      ))}
    </section>
  );
}
