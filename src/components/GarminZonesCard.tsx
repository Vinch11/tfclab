/**
 * Zones Garmin (5 zones) à recopier dans la montre, calculées sur la grille corrigée TFCL.
 * Une table par sport : FC (zones Garmin par sport), et allure ou puissance pour les intervalles.
 */
import { useMemo } from "react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs, getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { anchoredBikeGrid, anchoredRunGrid } from "@/lib/zones/anchoredZoneGrid";
import { garminFiveZones, type GarminZone } from "@/lib/zones/garminZones";
import { ZONE_GRID_MODE } from "@/lib/zones/zoneGridConfig";

const COLORS: Record<GarminZone["color"], string> = {
  gris: "bg-zinc-300", bleu: "bg-sky-500", vert: "bg-emerald-500", orange: "bg-orange-500", rouge: "bg-red-600",
};
const LABEL: Record<GarminZone["color"], string> = { gris: "Gris", bleu: "Bleu", vert: "Vert", orange: "Orange", rouge: "Rouge" };
const pace = (kmh: number) => { const s = Math.round(3600 / kmh); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function intensity(sport: "bike" | "run", z: GarminZone): string {
  if (sport === "bike") return z.max == null ? `> ${Math.round(z.min)} W` : z.min <= 0 ? `< ${Math.round(z.max)} W` : `${Math.round(z.min)}–${Math.round(z.max)} W`;
  return z.max == null ? `plus vite que ${pace(z.min)}/km` : z.min <= 0 ? `plus lent que ${pace(z.max)}/km` : `${pace(z.max)}–${pace(z.min)}/km`;
}

function Table({ title, sport, zones }: { title: string; sport: "bike" | "run"; zones: GarminZone[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-muted-foreground"><th className="py-1">Zone Garmin</th><th>FC (bpm)</th><th>{sport === "bike" ? "Puissance" : "Allure"}</th><th>Zones TFCL</th></tr></thead>
        <tbody>
          {zones.map(z => (
            <tr key={z.n} className="border-t border-border/50">
              <td className="py-1.5"><span className={`mr-2 inline-block h-3 w-3 rounded-full align-middle ${COLORS[z.color]}`} />{z.n} · {LABEL[z.color]}</td>
              <td className="tabular-nums">{z.hr ? (z.n === 1 ? `< ${z.hr[1]}` : `${z.hr[0]}–${z.hr[1]}`) : "—"}</td>
              <td className="tabular-nums">{intensity(sport, z)}</td>
              <td className="text-muted-foreground">{z.tfcl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GarminZonesCard() {
  const { currentAthlete } = useAthletes();
  const { athletes, snapshots } = useCloudDataContext();
  const data = useMemo(() => {
    const db = athletes.find(a => a.id === currentAthlete?.id) ?? null;
    const snap = getEffectiveSnapshot(db, snapshots);
    if (!snap) return null;
    const refs = getEffectiveRefs(db, snapshots);
    const fcMax = refs.fcMax ?? null;
    const input = { ...snap, ftp: refs.ftp ?? snap.ftp, vma: refs.vma ?? snap.vma, fc_max: fcMax, weight_kg: refs.weightKg ?? snap.weight_kg };
    const opts = { ambition: currentAthlete?.ambition ?? null, fcMax };
    const run = anchoredRunGrid(input, opts), bike = anchoredBikeGrid(input, opts);
    return { fcMax, run: run && garminFiveZones(run, fcMax), bike: bike && garminFiveZones(bike, fcMax) };
  }, [athletes, snapshots, currentAthlete?.id, currentAthlete?.ambition]);
  if (!currentAthlete || !data || (!data.run && !data.bike)) return null;
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm" aria-label="Zones Garmin">
      <div>
        <h3 className="text-base font-semibold">Zones Garmin (5 zones) · à recopier dans la montre</h3>
        <p className="text-xs text-muted-foreground">
          Bleu → vert = premier seuil ; orange → rouge = seuil critique (CP / vitesse critique). Encoder des zones séparées pour la course et le vélo.
          {ZONE_GRID_MODE === "current" ? " Calculées sur la grille corrigée, qui sera celle des plans une fois activée." : ""}
        </p>
      </div>
      {!data.fcMax && <p className="text-xs text-amber-700 dark:text-amber-400">FC max absente du bilan : seules les allures et puissances sont calculées.</p>}
      {data.run && <Table title="Course à pied" sport="run" zones={data.run} />}
      {data.bike && <Table title="Vélo" sport="bike" zones={data.bike} />}
      <p className="text-xs text-muted-foreground">Intervalles courts (zones orange et rouge) : suivre l’allure ou la puissance, pas la FC, qui met 1 à 2 minutes à monter.</p>
    </section>
  );
}
