import { Timer } from "lucide-react";
import { FieldReviewPanel } from "./FieldReviewPanel";
import { FieldComparison } from "./charts/FieldComparison";
import { Button } from "./ui/button";
import { useState } from "react";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import {
  HOLD_PROTOCOL,
  fieldIntensity,
  validHold,
  type HoldSport,
} from "@/lib/diagnostic/fieldHold";
import { format } from "date-fns";

export function FieldHoldForm({
  athleteId,
  ftp,
  pace,
  initialSport,
}: {
  athleteId: string;
  ftp?: number | null;
  pace?: number | null;
  initialSport: HoldSport;
}) {
  const { addTest } = useCloudDataContext();
  const today = format(new Date(), "yyyy-MM-dd");
  const [sport, setSport] = useState<HoldSport>(initialSport);
  const [day, setDay] = useState(today);
  const [value, setValue] = useState("");
  const [minutes, setMinutes] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const reference = sport === "bike" ? ftp : pace;
  const [conditions, setConditions] = useState("");
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const paceMatch = /^(\d+):([0-5]\d)$/.exec(value);
  const intensity =
    sport === "bike"
      ? Number(value)
      : paceMatch
        ? Number(paceMatch[1]) * 60 + Number(paceMatch[2])
        : 0;
  const raw = {
    protocol: HOLD_PROTOCOL,
    sport,
    day,
    intensity,
    reference: reference ?? 0,
    referenceDate,
    minutes: Number(minutes),
    conditions,
    exhausted: reason === "exhausted",
    comparable: checked,
  };
  const ok = validHold(raw, today) && !!reason;
  return (
    <FieldReviewPanel icon={Timer} title="Documenter un effort continu déjà réalisé">
      <p className="text-sm leading-relaxed text-foreground/80">
        Choisis un tour stable et continu à une intensité proche du seuil de
        référence. Reprends le même libellé de conditions pour les efforts
        comparables.
      </p>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ok || busy) return;
          setBusy(true);
          setMessage("");
          try {
            const saved = await addTest(
              athleteId,
              HOLD_PROTOCOL,
              "Tenue à intensité constante",
              sport,
              null,
              null,
              raw,
            );
            if (!saved) throw new Error();
            setMessage("Effort enregistré.");
            setValue("");
            setMinutes("");
            setReason("");
            setChecked(false);
          } catch {
            setMessage(
              "Enregistrement impossible. Les valeurs restent disponibles.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Discipline{" "}
          <select
            value={sport}
            onChange={(e) => {
              setSport(e.target.value as HoldSport);
              setValue("");
              setConditions("");
              setReferenceDate("");
              setChecked(false);
            }}
          >
            <option value="bike">Vélo</option>
            <option value="run">Course</option>
          </select>
        </label>
        <p className="self-end rounded-xl bg-muted/60 px-4 py-3 text-sm font-medium">
          {reference
            ? "Seuil de référence du bilan · " +
              fieldIntensity(sport, reference)
            : "Renseigner d’abord le seuil de cette discipline dans le bilan."}
        </p>
        <label>
          Date de la séance distincte ayant confirmé ce seuil{" "}
          <input
            type="date"
            value={referenceDate}
            max={day}
            onChange={(e) => setReferenceDate(e.target.value)}
          />
        </label>
        <label>
          Date de l’effort{" "}
          <input
            type="date"
            value={day}
            max={today}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          {sport === "bike"
            ? "Puissance tenue (W)"
            : "Allure tenue (min/km, ex. 4:35)"}{" "}
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label>
          Durée continue (min){" "}
          <input
            type="number"
            step="any"
            min="0"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        {reference != null && reference > 0 && Number.isFinite(intensity) && intensity > 0 && (
          <div className="sm:col-span-2">
            <FieldComparison title={sport === "run" ? "Allure tenue et allure au seuil" : "Puissance tenue et FTP"}
              athlete={{ label: "Effort saisi", bounds: { low: intensity, high: intensity } }}
              reference={{ label: "Seuil du bilan", bounds: { low: reference, high: reference } }}
              format={v => fieldIntensity(sport, v)} />
            <p className="mt-2 text-sm">
              {intensity === reference ? "L’effort correspond au seuil du bilan."
                : sport === "run" ? `L’effort a été couru ${Math.abs(intensity - reference)} s/km plus ${intensity < reference ? "vite" : "lentement"} que le seuil.`
                : `L’effort se situe ${Math.abs(intensity - reference)} W ${intensity > reference ? "au-dessus" : "en dessous"} de la FTP.`}
            </p>
          </div>
        )}
        <label>
          Conditions (parcours, matériel, fatigue préalable){" "}
          <input
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </label>
        <label>
          Fin du bloc{" "}
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Préciser</option>
            <option value="cap">
              Arrêt volontaire ou durée prévue atteinte
            </option>
            <option value="exhausted">
              Impossible de maintenir la cible malgré l’effort
            </option>
          </select>
        </label>
        <label className="field-checkbox flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <input
            className="h-5 w-5 shrink-0 accent-primary"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />{" "}
          J’ai vérifié la trace, la continuité, la stabilité et les conditions.
        </label>
        <Button
          type="submit"
          className="min-h-11 sm:justify-self-start"
          disabled={!ok || busy}
        >
          Enregistrer l’effort
        </Button>
        <p role="status" className="self-center text-sm empty:hidden">{message}</p>
      </form>
    </FieldReviewPanel>
  );
}
