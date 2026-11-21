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
    <details className="rounded border p-3">
      <summary>Documenter un effort continu déjà réalisé</summary>
      <p>
        Choisis un tour stable et continu à une intensité proche du seuil de
        référence. Reprends le même libellé de conditions pour les efforts
        comparables.
      </p>
      <form
        className="grid gap-2 sm:grid-cols-2"
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
        <p>
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
        <label>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />{" "}
          J’ai vérifié la trace, la continuité, la stabilité et les conditions.
        </label>
        <button
          type="submit"
          className="border rounded p-2 disabled:opacity-50"
          disabled={!ok || busy}
        >
          Enregistrer l’effort
        </button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
