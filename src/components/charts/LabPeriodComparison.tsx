import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  clock,
  coachingAction,
  compareRecords,
  previousPeriod,
  recordReading,
} from "@/lib/lab/coachReview";
import { readLabPeriodRecords } from "@/lib/lab/periodRecords";
import {
  nolioEnvelope,
  NOLIO_BIKE_SPORTS,
  NOLIO_RUN_SPORTS,
  type EnvelopePoint,
} from "@/lib/lab/nolioCalibration";
import type { LabSport } from "@/lib/lab/loadCharacteristics";
import { supabase } from "@/integrations/supabase/client";

export async function readNolio(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("nolio-v2-oauth", {
    body,
  });
  if (error || data?.error || !data)
    throw new Error("Lecture Nolio indisponible.");
  return data;
}

interface Props {
  athlete: string;
  sport: LabSport;
  from: string;
  to: string;
  latest: EnvelopePoint[];
  goal: string;
}
export function LabPeriodComparison({
  athlete,
  sport,
  from,
  to,
  latest,
  goal,
}: Props) {
  const [open, setOpen] = useState(false);
  const [previous, setPrevious] = useState<EnvelopePoint[] | null>(null);
  const [error, setError] = useState(false);
  const period = previousPeriod(from, to);
  const start = period?.from,
    end = period?.to;
  useEffect(() => {
    let active = true;
    if (!open || !start || !end) return;
    readLabPeriodRecords(athlete, sport, start, end, readNolio)
      .then((rows) => {
        if (active)
          setPrevious(
            nolioEnvelope(
              rows,
              sport === "bike" ? "ppr" : "par",
              sport === "bike" ? NOLIO_BIKE_SPORTS : NOLIO_RUN_SPORTS,
              end,
              24,
              start,
            ),
          );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [open, athlete, sport, start, end]);
  const rows = compareRecords(previous ?? [], latest, sport);
  const number = (v: number) =>
    sport === "bike" ? Math.round(v) + " W" : clock(v) + "/km";
  const common = rows.filter((row) => row.delta != null);
  const sustained = common[common.length - 1];
  return (
    <section id="lab-records" className="space-y-3">
      <h3 className="text-xl font-semibold">
        Évolution des records de terrain
      </h3>
      <p>
        Comparer la période du {from} au {to} à celle du {start} au {end}, de
        même durée. Les dates se règlent au-dessus.
      </p>
      {!open && (
        <button
          className="rounded border px-3 py-2"
          onClick={() => setOpen(true)}
        >
          Comparer les deux périodes
        </button>
      )}
      {open &&
        (error ? (
          <p role="alert">
            Lecture de la période précédente incomplète.{" "}
            <button
              onClick={() => {
                setError(false);
                setOpen(false);
              }}
            >
              Reprendre la comparaison
            </button>
          </p>
        ) : !previous ? (
          <p role="status">Lecture des records précédents…</p>
        ) : (
          <>
            <p>
              Précédent en pointillés · récent en trait plein.{" "}
              {sport === "bike" ? "Puissance en watts." : "Allure en min/km."}
            </p>
            {rows.length > 0 && (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="seconds" tickFormatter={(v) => clock(v)} />
                    <YAxis
                      reversed={sport === "run"}
                      width={65}
                      tickFormatter={number}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      formatter={(v) => number(Number(v))}
                      labelFormatter={(v) => "Durée " + clock(Number(v))}
                    />
                    <Line
                      dataKey="prior"
                      name="Précédent"
                      stroke="#64748b"
                      strokeDasharray="5 4"
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="recent"
                      name="Récent"
                      stroke="#15867e"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Effort (min:s)", "Précédent", "Récent", "Écart"].map(
                      (x) => (
                        <th key={x} className="text-left">
                          {x}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.seconds} className="border-t">
                      <th className="text-left">{clock(r.seconds)}</th>
                      {[
                        [r.prior, r.priorDate],
                        [r.recent, r.recentDate],
                      ].map(([v, d], i) => (
                        <td key={i}>
                          {typeof v === "number" ? (
                            <>
                              {number(v)}
                              <small className="block">{d}</small>
                            </>
                          ) : (
                            "Absent"
                          )}
                        </td>
                      ))}
                      <td>
                        {r.delta == null
                          ? "Incomparable"
                          : (r.delta > 0 ? "+" : "") +
                            r.delta +
                            (sport === "bike" ? " W" : " s/km")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              {sustained
                ? "Sur la plus longue durée documentée des deux côtés (" +
                  clock(sustained.seconds) +
                  "), le record passe de " +
                  number(sustained.prior!) +
                  " à " +
                  number(sustained.recent!) +
                  ". Vérifier le caractère maximal, le terrain et le matériel avant de conclure à une évolution."
                : "Aucune durée commune documentée. Une période moins fournie ne permet pas de conclure à une baisse."}
            </p>
            <p>{recordReading(rows, sport, goal)}</p>
            <p>
              <strong>Pour {goal}.</strong>{" "}
              {coachingAction(goal, sport, (sustained?.seconds ?? 0) >= 1200)}
            </p>
          </>
        ))}
    </section>
  );
}
