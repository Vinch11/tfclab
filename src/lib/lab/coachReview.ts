import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import type { EnvelopePoint } from "./nolioCalibration";
import type { LabSport } from "./loadCharacteristics";
import {
  compareSnapshotsNewestFirst,
  type ReferenceSnapshotLike,
} from "@/lib/referenceSnapshot";

export function earlierBilans<T extends ReferenceSnapshotLike>(
  rows: T[],
  ref: T,
) {
  return rows
    .filter((s) => s.athlete_id === ref.athlete_id && s.date < ref.date)
    .sort(compareSnapshotsNewestFirst);
}

export function previousPeriod(from: string, to: string) {
  const start = Date.parse(from),
    end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null;
  const day = 86_400_000,
    iso = (n: number) => new Date(n).toISOString().slice(0, 10);
  return { from: iso(start - (end - start + day)), to: iso(start - day) };
}

export function clock(seconds: number) {
  const rounded = Math.round(seconds);
  return Math.floor(rounded / 60) + ":" + String(rounded % 60).padStart(2, "0");
}

export function compareRecords(
  before: EnvelopePoint[],
  after: EnvelopePoint[],
  sport: LabSport,
) {
  const a = new Map(before.map((p) => [p.durationSec, p])),
    b = new Map(after.map((p) => [p.durationSec, p]));
  const value = (p?: EnvelopePoint) =>
    p && Number.isFinite(p.value) && p.value > 0
      ? sport === "bike"
        ? p.value
        : 1000 / p.value
      : null;
  return [...new Set([...a.keys(), ...b.keys()])]
    .sort((x, y) => x - y)
    .map((seconds) => {
      const prior = value(a.get(seconds)),
        recent = value(b.get(seconds));
      return {
        seconds,
        prior,
        recent,
        priorDate: a.get(seconds)?.date,
        recentDate: b.get(seconds)?.date,
        delta:
          prior != null && recent != null ? Math.round(recent - prior) : null,
      };
    });
}

export function coachingAction(goal: string, sport: LabSport, long: boolean) {
  const kind = objectiveDemands(goal)?.kind;
  if (kind === "beginner")
    return "Suivre la durée courue en continu et la récupération au lendemain avant de faire évoluer la séance.";
  if (kind === "trail")
    return "Reprendre un segment de pente et de technicité proches. Comparer séparément la montée et la descente, à fatigue comparable.";
  if (kind === "tri") {
    if (goal === "IM" || goal === "703")
      return sport === "bike"
        ? "Examiner la puissance sur le dernier bloc vélo et l’allure au début de la course enchaînée. Si la baisse se répète à ravitaillement comparable, travailler la tenue de la puissance cible."
        : "Comparer un bloc à allure cible couru à frais et après vélo. Si seul le second se dégrade, revoir le pacing vélo et tester à nouveau l’enchaînement.";
    return sport === "bike"
      ? "Comparer une répétition à puissance de course et le premier kilomètre après la transition."
      : "Vérifier la capacité à rejoindre puis tenir l’allure cible après la transition.";
  }
  if (goal === "Marathon" || goal === "Semi")
    return "Comparer un bloc à allure visée en début et en fin de sortie longue. Si l’écart se répète, orienter le prochain bloc vers la tenue de cette allure.";
  if (kind === "road")
    return long
      ? "Comparer le dernier tiers d’un effort spécifique à l’allure visée et vérifier la régularité des fractions."
      : "Vérifier sur des fractions à l’allure visée que le gain sur effort court se transfère à la distance.";
  return "Répéter un effort de même durée, dans la discipline et les conditions de l’objectif.";
}

export function recordReading(
  rows: ReturnType<typeof compareRecords>,
  sport: LabSport,
  goal: string,
) {
  const common = rows.filter((row) => row.delta != null);
  const short =
    common.find((row) => row.seconds === 300) ??
    common.find((row) => row.seconds >= 60 && row.seconds <= 300);
  const long = [...common].reverse().find((row) => row.seconds >= 1200);
  const improving = (value: number) =>
    sport === "bike" ? value > 0 : value < 0;
  if (!short || !long)
    return common.length
      ? "Les données décrivent les durées communes. Il manque un effort court ou prolongé comparable pour interpréter le transfert."
      : "Aucun écart longitudinal calculable.";
  if (improving(short.delta!) && !improving(long.delta!)) {
    return (
      "Le meilleur effort court progresse tandis que le record prolongé ne montre pas encore ce gain. " +
      (objectiveDemands(goal)?.kind === "beginner"
        ? "Vérifier en priorité la durée continue tolérée."
        : "Si les deux périodes comportent de vrais efforts prolongés comparables, examiner la tenue spécifique avant d’ajouter du travail court.")
    );
  }
  if (improving(long.delta!))
    return "Le record prolongé progresse. Vérifier que cette évolution se retrouve à l’intensité et dans les conditions de l’épreuve.";
  return "Les records courts et prolongés ne montrent pas de gain à la précision affichée. Vérifier les occasions de test, le terrain et la fatigue avant de réorienter le travail.";
}
