import { isKnownPhysiologicalObjective } from "../physiologicalTargets";
import { rankedFieldGaps, fieldUnits } from "./rankedFieldGaps";
import { compassDisplaySport } from "./sportPresentation";
import { objectiveDemands } from "./objectiveDemands";
import type { CoachingCompassInput, TFCLCoachingCompassResult } from "./types";

type Gap = NonNullable<CoachingCompassInput["limiterResult"]>["gapAnalysis"][number];
type Factor = { title: string; status: string; facts: string; metric: string; impact: number; hypothesis: boolean };
const names: Record<string, string> = {
  VLamax: "Profil glycolytique (VLamax)", VMA: "Vitesse maximale aérobie (VMA)",
  TTE: "Tenue au seuil (TTE)", "FTP/kg": "Puissance au seuil (FTP/kg)",
  VO2max: "Capacité aérobie (VO₂max)", FatMax: "Utilisation des graisses (FatMax)",
  "Durabilité (découplage)": "Tenue de l’effort après fatigue",
};
const number = (value: number) => value.toLocaleString("fr-BE", { maximumFractionDigits: 2 });
const day = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const valid = (v: number | null | undefined): v is number => v != null && Number.isFinite(v) && v > 0;

function evidence(metric?: Gap) {
  if (!metric || !valid(metric.value)) return "";
  if (metric.fieldEstimateNote && metric.metric === "TTE") return metric.fieldEstimateNote;
  const unit = fieldUnits[metric.metric] ?? "";
  const value = number(metric.value) + " " + unit;
  if (metric.coachingRange) return value + " · plage de coaching " + number(metric.coachingRange.min) + "–" + number(metric.coachingRange.max) + " " + unit;
  if (!valid(metric.target)) return value;
  const difference = metric.metric === "VMA" && Number.isFinite(metric.gapPercent) && metric.gapPercent < 0
    ? " (" + number(Math.round(metric.gapPercent)) + " %)" : "";
  return value + " · repère " + number(metric.target) + " " + unit + difference;
}

/** One read-only coach view. A model interval that straddles a reference has no ranking score. */
export function coachPriorities(input: CoachingCompassInput, presentation?: TFCLCoachingCompassResult["presentation"]) {
  const diagnosis = input.limiterResult;
  const factors: Factor[] = [];
  const unavailable = !isKnownPhysiologicalObjective(input.objectif) || objectiveDemands(input.objectif)?.kind === "beginner" ||
    (input.athleteAge != null && (!Number.isFinite(input.athleteAge) || input.athleteAge < 18 || input.athleteAge > 100)) ||
    diagnosis?.limiterLabel === "Comparaison physiologique non applicable";
  if (unavailable) return { factors, overlap: null, tied: false };
  const gaps = rankedFieldGaps(diagnosis);
  const modest = diagnosis?.primaryLimiter === "none";
  const tied = !!diagnosis?.limiterLabel?.includes("à départager");
  for (const group of diagnosis?.categoryRanking ?? []) {
    const usable = group.metrics.filter(m => m.weightedImpact > 0 && m.prescriptionApplicable !== false);
    const first = usable[0];
    if (!first) continue;
    const metric = diagnosis?.gapAnalysis.find(m => m.metric === first.metric);
    factors.push({
      metric: first.metric, title: usable.map(m => names[m.metric] ?? m.metric).join(" · "),
      status: tied ? "Ordre provisoire" : modest ? "Écart modeste" : metric?.fieldEstimateNote ? "Priorité estimée sur le terrain" : "Écart du bilan",
      facts: evidence(metric), hypothesis: false, impact: group.totalImpact ?? first.weightedImpact,
    });
  }
  const hasGlycolytic = gaps.some(row => row.metric.metric === "VLamax");
  for (const { metric, hypothesis, impact } of gaps) {
    if (!hypothesis || (metric.metric === "FatMax" && hasGlycolytic)) continue;
    factors.push({ metric: metric.metric, title: names[metric.metric] ?? metric.metric,
      status: "Hypothèse à vérifier", facts: evidence(metric), impact, hypothesis: true });
  }
  factors.sort((a, b) => b.impact - a.impact);
  if (!factors.length) {
    const sports = [{ name: "Vélo", diagnostic: presentation?.cyclingDiagnostic }, { name: "Course à pied", diagnostic: presentation?.runningDiagnostic }];
    for (const sport of sports) {
      for (const row of sport.diagnostic?.priorities ?? []) {
        factors.push({ title: row.label, metric: row.key, status: row.provisional ? "Écart à confirmer" : "Écart du bilan",
          facts: sport.name + " · " + number(row.gapPercent) + " % d’écart au repère interne", impact: row.gapPercent, hypothesis: false });
      }
    }
    factors.sort((a, b) => b.impact - a.impact);
  }

  const vla = diagnosis?.gapAnalysis.find(m => m.metric === "VLamax");
  const current = input.vlamaxEffectif;
  const range = current?.range;
  const ceiling = vla?.coachingRange?.max;
  const sport = compassDisplaySport(input) === "run" ? "run" : "bike";
  const previous = input.latestVlamaxTest;
  const model = current && (current.source === "estimated" || current.source === "test");
  const crosses = model && !(sport === "run" && input.sportFocus === "bike") && valid(ceiling) && valid(vla?.value) && current.value === vla.value &&
    range && valid(range.low) && valid(range.high) && range.low <= current.value &&
    vla.value >= vla.coachingRange.min && vla.value <= ceiling && ceiling < range.high;
  const overlap = crosses ? {
    facts: "Estimation " + (sport === "run" ? "course" : "vélo") + (current.date ? " du " + day(current.date) : "") +
      " · " + number(vla.value) + " mmol/L/s. Plage du modèle " + number(range.low) + "–" + number(range.high) +
      " mmol/L/s, pour un repère haut de " + number(ceiling) + ".",
    previous: previous?.sport === sport && previous.date !== current.date
      ? (previous.lactate ? "Test lactate enregistré le " : "Estimation de terrain enregistrée le ") + day(previous.date) + " · " + number(previous.value) + " mmol/L/s." : null,
    // A distinct dated observation can make the question worth resolving before choosing a block.
    contested: !!(previous?.sport === sport && previous.date !== current.date && previous.value > ceiling && modest),
  } : null;
  return { factors, overlap, tied };
}
