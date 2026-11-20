import { useEffect, useState } from "react";
import { readNolio } from "./LabPeriodComparison";
import { clock, coachingAction } from "@/lib/lab/coachReview";
import type { DetectionLap } from "@/lib/periodTestDetection";
import type { LabSport } from "@/lib/lab/loadCharacteristics";
import {
  parseStoredDurability,
  summarizeDurability,
  durabilityReading,
} from "@/lib/durability/longSessionDurability";

interface Session {
  id: string;
  date: string;
  name: string;
  sportBase: string;
}
interface Data {
  sessions: Session[];
  complete: boolean;
}
export function lapMeasures(lap: DetectionLap, sport: LabSport) {
  const seconds = lap.duration,
    distance = lap.distance;
  const valid = (v: unknown): v is number =>
    typeof v === "number" && v > 0 && Number.isFinite(v);
  const watts = lap.stats?.watts_avg?.value,
    hr = lap.stats?.heartrate_avg?.value;
  return {
    duration: valid(seconds) ? seconds : null,
    heart: valid(hr) ? hr : null,
    effort:
      sport === "bike"
        ? valid(watts)
          ? watts
          : null
        : valid(seconds) && valid(distance)
          ? (seconds * 1000) / distance
          : null,
  };
}

function SessionBlocks({
  session,
  athlete,
  from,
  to,
}: {
  session: Session;
  athlete: string;
  from: string;
  to: string;
}) {
  const [laps, setLaps] = useState<DetectionLap[] | null>(null);
  const [error, setError] = useState(false);
  const [first, setFirst] = useState(0),
    [last, setLast] = useState(0);
  useEffect(() => {
    let live = true;
    readNolio({
      action: "test_session",
      training: session.id,
      athlete,
      from,
      to,
    })
      .then((data) => {
        if (!live) return;
        const rows: DetectionLap[] = Array.isArray(data.laps)
          ? data.laps.filter((x: unknown) => x && typeof x === "object")
          : [];
        setLaps(rows);
        setLast(Math.max(0, rows.length - 1));
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [session.id, athlete, from, to]);
  const sport = session.sportBase === "cycling" ? "bike" : "run";
  const fmt = (v: number) =>
    sport === "bike" ? Math.round(v) + " W" : clock(v) + "/km";
  if (error)
    return (
      <p role="alert">Les intervalles de cette séance sont indisponibles.</p>
    );
  if (!laps) return <p role="status">Lecture des intervalles…</p>;
  if (!laps.length) return <p>Aucun tour enregistré pour cette séance.</p>;
  const points = laps.map((l) => lapMeasures(l, sport));
  const a = points[first],
    b = points[last];
  return (
    <div className="space-y-2">
      <strong>
        {session.name} · {session.date.slice(0, 10)}
      </strong>
      <div className="flex flex-wrap gap-3">
        {(["Premier bloc", "Bloc à comparer"] as const).map((label, i) => (
          <label key={label}>
            {label}{" "}
            <select
              className="bg-background border rounded p-1"
              value={i ? last : first}
              onChange={(e) => (i ? setLast : setFirst)(Number(e.target.value))}
            >
              {points.map((p, j) => (
                <option key={j} value={j}>
                  Tour {j + 1} ·{" "}
                  {p.duration ? clock(p.duration) : "durée inconnue"} ·{" "}
                  {p.effort ? fmt(p.effort) : "intensité inconnue"}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {b && a && (
        <p>
          {a.effort != null && b.effort != null
            ? fmt(a.effort) + " → " + fmt(b.effort) + ". "
            : "Intensité manquante. "}
          {a.heart != null && b.heart != null
            ? a.heart + " → " + b.heart + " bpm."
            : "FC moyenne manquante."}{" "}
          {first >= last
            ? "Choisir deux tours dans l’ordre chronologique pour lire une évolution."
            : "Interpréter l’écart cardiaque uniquement à effort, terrain et conditions comparables."}
        </p>
      )}
    </div>
  );
}

export function LabSessionReview({
  athlete,
  sport,
  goal,
  tri,
  raw,
  from,
  to,
}: {
  athlete: string;
  sport: LabSport;
  goal: string;
  tri: boolean;
  raw: unknown;
  from: string;
  to: string;
}) {
  const [list, setList] = useState<Session[] | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const [id, setId] = useState(""),
    [runId, setRunId] = useState("");
  const stored = parseStoredDurability(raw)[sport];
  const summary =
    stored &&
    summarizeDurability(
      sport,
      stored.sessions.filter((s) => s.date >= from && s.date <= to),
      from,
      to,
      stored.savedAt,
    );
  const selected = list?.find((s) => s.id === id);
  const runs =
    selected && tri && sport === "bike"
      ? (list?.filter(
          (s) =>
            s.sportBase === "running" &&
            s.date.slice(0, 10) === selected.date.slice(0, 10) &&
            (!s.date.includes("T") ||
              !selected.date.includes("T") ||
              Date.parse(s.date) > Date.parse(selected.date)),
        ) ?? [])
      : [];
  const linked = runs.find((s) => s.id === runId);
  async function load() {
    setBusy(true);
    setError(false);
    try {
      const data: Data = await readNolio({
        action: "test_sessions",
        athlete,
        from,
        to,
      });
      if (!data.complete || !Array.isArray(data.sessions)) throw Error();
      setList(
        data.sessions
          .filter(
            (s) => s.date.slice(0, 10) >= from && s.date.slice(0, 10) <= to,
          )
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t pt-4" id="lab-seances">
      <h3 className="text-xl font-semibold">
        Tenue de l’effort{tri ? " et enchaînement" : ""}
      </h3>
      {summary ? (
        <>
          <p>{durabilityReading(sport, summary)}</p>
          <details>
            <summary>Séances utilisées</summary>
            {summary.sessions.map((s) => (
              <p key={s.id}>
                {s.date} · {s.durationMin} min · variation {s.changePct} %
              </p>
            ))}
          </details>
        </>
      ) : (
        <p>
          La tendance sur sortie longue demande deux séances analysées dans la
          période. Tu peux examiner les tours d’une séance ci-dessous.
        </p>
      )}
      {!athlete ? (
        <p>Choisir le compte Nolio de l’athlète pour lire les tours.</p>
      ) : list === null ? (
        <button
          className="border rounded px-3 py-2"
          disabled={busy}
          onClick={load}
        >
          {busy ? "Lecture…" : "Examiner les séances de la période"}
        </button>
      ) : (
        <>
          <label>
            Séance {sport === "bike" ? "vélo" : "course"}{" "}
            <select
              className="max-w-full bg-background border rounded p-1"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setRunId("");
              }}
            >
              <option value="">Choisir une séance</option>
              {list
                .filter(
                  (s) =>
                    s.sportBase === (sport === "bike" ? "cycling" : "running"),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date.slice(0, 10)} · {s.name}
                  </option>
                ))}
            </select>
          </label>
          {selected && (
            <SessionBlocks
              key={id}
              session={selected}
              {...{ athlete, from, to }}
            />
          )}
          {selected &&
            tri &&
            sport === "bike" &&
            (runs.length ? (
              <label className="block">
                Course effectivement enchaînée, à confirmer par le coach{" "}
                <select
                  className="max-w-full bg-background border rounded p-1"
                  value={runId}
                  onChange={(e) => setRunId(e.target.value)}
                >
                  <option value="">Aucune sélection</option>
                  {runs.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name} · {s.date}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>
                Aucune course candidate enregistrée le même jour après ce vélo.
              </p>
            ))}
          {linked && (
            <>
              <SessionBlocks
                key={linked.id}
                session={linked}
                {...{ athlete, from, to }}
              />
              <p>
                Comparer le début de cette course à un effort à frais sur un
                terrain similaire. Vérifier l’intensité du vélo et le
                ravitaillement avant de retenir une cause.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert">
          Lecture Nolio incomplète. Réessayer pour cette période.
        </p>
      )}
      <p>
        <strong>Décision pour {goal}.</strong>{" "}
        {coachingAction(goal, sport, true)}
      </p>
    </section>
  );
}
