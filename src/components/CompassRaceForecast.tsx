import { Timer } from "lucide-react";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";

export function CompassRaceForecast({input}: {input: CoachingCompassInput}) {
  const prediction = input.targetRacePrediction;
  const minutes = Math.round(prediction?.targetRaceDurationMin ?? 0);
  const hasTime = Number.isFinite(minutes) && minutes > 0;
  const general = prediction?.source === "triathlon_baseline";
  const sourceText = {
    riegel_chrono: "Calculé à partir d’un chrono de course enregistré.",
    daniels_scenario: "Calculé à partir de la VMA ou de l’allure au seuil et de l’ambition.",
    triathlon_physio_split: "Vélo et course estimés à partir du profil. Natation et transitions forfaitaires.",
    triathlon_baseline: "Repère général du format et de l’ambition. La projection individuelle reste à établir.",
  };
  return <section aria-label="Projection de course" className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card px-5 py-5 shadow-sm sm:px-7">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Timer aria-hidden="true" size={18}/>{general ? "Temps indicatif du format" : "Chrono estimé par TFCLab"}</h4>
    {hasTime && prediction ? <>
      <p className="my-3 text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums">{minutes >= 60 ? Math.floor(minutes/60) + " h " + String(minutes%60).padStart(2,"0") : minutes+" min"}</p>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{sourceText[prediction.source]}</p>
    </> : <p className="mt-2 text-sm">Projection individuelle indisponible pour ce bilan et cette épreuve.</p>}
  </section>;
}
