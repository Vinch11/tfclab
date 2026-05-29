/**
 * ThresholdVmaCoherenceHint
 *
 * Affiche un avis temps réel sur la cohérence entre l'allure seuil saisie
 * et la VMA, en se basant sur le ratio vSeuil/VMA de référence Billat (0.85–0.92).
 *
 * - Ratio < 0.82  → 🟡 info : seuil probablement sous-estimé (cas typique Garmin)
 * - Ratio 0.82–0.95 → ✅ cohérent (rien d'affiché pour éviter le bruit)
 * - Ratio > 0.95 → 🔴 critique : seuil surestimé, risque réel en course
 *
 * Volontairement non bloquant : on ne modifie jamais la valeur saisie.
 * Cohérent avec mem://philosophy/transparency-vs-false-precision.
 */
import { AlertTriangle, Info } from "lucide-react";

interface Props {
  paceThresholdSecPerKm: number | null;
  vmaKmh: number | null;
  /** Source du seuil pour calibrer la sévérité (garmin / test_terrain / lactate_lab / manual) */
  source?: string | null;
}

const BILLAT_LOW = 0.85;
const BILLAT_HIGH = 0.92;
const WARN_LOW = 0.82;
const WARN_HIGH = 0.95;

function fmtPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ThresholdVmaCoherenceHint({
  paceThresholdSecPerKm,
  vmaKmh,
  source,
}: Props) {
  if (!paceThresholdSecPerKm || !vmaKmh || paceThresholdSecPerKm <= 0 || vmaKmh <= 0) {
    return null;
  }

  const vSeuilKmh = 3600 / paceThresholdSecPerKm;
  const ratio = vSeuilKmh / vmaKmh;

  // Fenêtre probable selon Billat
  const paceLowSec = 3600 / (vmaKmh * BILLAT_HIGH); // ratio haut = allure rapide
  const paceHighSec = 3600 / (vmaKmh * BILLAT_LOW);

  // Cohérent → discret OK
  if (ratio >= WARN_LOW && ratio <= WARN_HIGH) {
    return (
      <div className="col-span-4 -mt-2 ml-[25%] text-[10px] text-muted-foreground">
        ✓ Ratio seuil/VMA = {ratio.toFixed(2)} · cohérent Billat ({BILLAT_LOW}–{BILLAT_HIGH})
      </div>
    );
  }

  const underEstimated = ratio < WARN_LOW;
  const overEstimated = ratio > WARN_HIGH;

  const isLowReliability =
    source === "garmin" || source === "watch" || source == null || source === "manual";

  return (
    <div
      className={`col-span-4 -mt-2 ml-[25%] rounded-md border px-2.5 py-1.5 text-[11px] leading-tight ${
        overEstimated
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
      }`}
    >
      <div className="flex items-start gap-1.5">
        {overEstimated ? (
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        ) : (
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        )}
        <div className="space-y-0.5">
          <div className="font-semibold">
            {overEstimated
              ? `⚠️ Seuil probablement surestimé (ratio ${ratio.toFixed(2)})`
              : `Seuil probablement sous-estimé (ratio ${ratio.toFixed(2)})`}
          </div>
          <div className="text-muted-foreground">
            Référence Billat : ratio seuil/VMA attendu entre {BILLAT_LOW} et {BILLAT_HIGH}.
            {" "}Plage probable pour VMA {vmaKmh.toFixed(1)} km/h :{" "}
            <span className="font-medium text-foreground">
              {fmtPace(paceLowSec)}–{fmtPace(paceHighSec)}/km
            </span>
            .
          </div>
          {underEstimated && isLowReliability && (
            <div className="text-muted-foreground">
              💡 Source saisie peu fiable (Garmin/manuel souvent conservateur de 5–10 %).
              Un test 30 min « all-out » permettrait de trancher.
            </div>
          )}
          {overEstimated && (
            <div className="text-muted-foreground">
              🔴 Risque réel de blow-up en course. Re-tester avant la prochaine échéance.
            </div>
          )}
          {underEstimated && !isLowReliability && (
            <div className="text-muted-foreground">
              Profil légitimement endurance-dominant possible (trailer, master). À confirmer si écart persistant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
