import { FieldMetricComparison } from "./FieldComparison";
import { fieldCheckLink, nextFieldCheck } from "@/lib/diagnostic/compactFieldAssessment";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
import { staffEvidenceRows } from "@/lib/coachingCompass/staffEvidence";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  followupEvidence,
  raceForecastReview,
  roadForecastCohort,
  replayPriorities,
} from "@/lib/lab/replay";
import {
  AMBITION_DEFINITIONS,
  type AmbitionLevel,
} from "@/types/ambitionLevel";
import { OBJECTIVE_DEMANDS } from "@/lib/coachingCompass/objectiveDemands";
import { useState } from "react";
import type { DbSnapshot, DbTest } from "@/hooks/useCloudData";
import {
  describeFieldGap,
  rankedFieldGaps,
} from "@/lib/coachingCompass/rankedFieldGaps";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import { coachingAction, clock, earlierBilans } from "@/lib/lab/coachReview";
import type { LabSport } from "@/lib/lab/loadCharacteristics";

export function LabPriorities({
  input,
  snapshot,
  tests,
}: {
  input: CoachingCompassInput;
  snapshot: DbSnapshot;
  tests: DbTest[];
}) {
  const ranks = rankedFieldGaps(input.limiterResult);
  const check = nextFieldCheck(input);
  const checkUrl = fieldCheckLink(check);
  const goal = input.performanceGoal;
  const evidence = staffEvidenceRows(
    snapshot.athlete_id,
    snapshot,
    tests,
  ).filter((row) => row.date && row.date.slice(0, 10) <= snapshot.date);
  const longSessions = parseStoredDurability(snapshot.critical_metrics);
  const demands = objectiveDemands(input.objectif);
  return (
    <section id="priorites" className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="text-xl font-semibold">
        {input.objectif}{input.ambition && ` · ${AMBITION_DEFINITIONS[input.ambition as AmbitionLevel]?.label ?? input.ambition}`}
      </h3>
      <p>
        {goal
          ? "Objectif choisi · " + goal.minutes + " min"
          : "Chrono cible à préciser dans le Compass."}{" "}
        · Bilan du {input.snapshotDate}
      </p>
      <h4 className="font-semibold">Priorités du Compass</h4>
      <p>{input.limiterResult?.limiterLabel}</p>
      {input.limiterResult?.gapAnalysis.filter(g => g.fieldEstimateNote && !ranks.some(r => r.metric === g)).map(g => <div key={g.metric} className="space-y-2"><FieldMetricComparison metric={g} /><p className="text-sm">{g.fieldEstimateNote}</p></div>)}
      <div className="rounded-xl bg-primary/10 p-4 text-sm"><h4 className="font-semibold">Prochaine vérification</h4><p className="mt-1 leading-relaxed">{check.text}</p>{checkUrl && <a className="inline-flex min-h-11 items-center font-medium underline underline-offset-4" href={checkUrl}>Voir le protocole</a>}</div>
      {!ranks.length && (
        <p>
          Aucun écart suffisamment documenté pour être classé.{" "}
          {demands?.kind === "beginner"
            ? "Noter la durée courue confortablement et la récupération le lendemain lors de la prochaine sortie."
            : `Commencer par une séance existante en lien avec l’objectif. Point à vérifier · ${demands?.checks[0] ?? "effort récent comparable"}.`}
        </p>
      )}
      <ol className="space-y-3">
        {ranks.map((row) => {
          const { metric, hypothesis } = row;
          const reading = describeFieldGap(row);
          const sport =
            metric.metric === "VMA" || input.sportFocus === "run"
              ? "run"
              : "bike";
          const labels: Record<string, string[]> = {
            VMA: ["VMA", "Allure seuil"],
            "FTP/kg": ["FTP", "Poids"],
            VO2max: ["VO₂max"],
            TTE: ["Durée déclarée au seuil"],
            VLamax: [
              "VLamax",
              sport === "run" ? "Distance sprint 15 s" : "Puissance 30 s",
            ],
            FatMax: ["FTP", "VLamax"],
            "Durabilité (découplage)": ["Dérive cardiaque de séance"],
          };
          const sessions = /TTE|durabilité|VLamax|FatMax/i.test(metric.metric)
            ? (longSessions[sport]?.sessions.filter(
                (s) => s.date?.slice(0, 10) <= snapshot.date,
              ) ?? [])
            : [];
          const matching = evidence.filter(
            (e) =>
              labels[metric.metric]?.includes(e.label) &&
              [
                sport === "run" ? "Course" : "Vélo",
                "Contexte",
                "Non précisé",
              ].includes(e.sport),
          );
          return (
            <li key={metric.metric} className="min-w-0 space-y-3 rounded-xl border p-3">
              <FieldMetricComparison metric={metric} hypothesis={hypothesis} />
              <details>
                <summary className="cursor-pointer py-2 text-sm font-medium">
                  {metric.metric} ·{" "}
                  {metric.gapPercent == null || metric.coachingRange || metric.fieldBounds
                    ? ""
                    : "écart au repère " +
                      (metric.gapPercent > 0 ? "+" : "") +
                      Math.round(metric.gapPercent) +
                      " % · "}
                  {hypothesis ? "Hypothèse du modèle" : metric.fieldEstimateNote ? "Priorité estimée sur le terrain" : "Priorité du bilan"}
                </summary>
                <p>
                  {reading.comparison || `Valeur du bilan ${metric.value}`}.{" "}
                  {reading.confidence}.{" "}
                  {metric.prescriptionNote ||
                    "Comparer ce repère avec une performance datée dans la même discipline."}
                </p>
                {matching.length > 0 && (
                  <ul className="list-disc pl-5 text-sm">
                    {matching.map((e) => (
                      <li key={e.label + e.sport}>
                        {e.label} · {e.result} · bilan du {e.date} · {e.source}
                      </li>
                    ))}
                  </ul>
                )}
                {sessions.length > 0 && (
                  <details>
                    <summary>
                      Sorties longues à confronter à cette hypothèse
                    </summary>
                    <ul>
                      {sessions.map((s) => (
                        <li key={s.id}>
                          {s.date.slice(0, 10)} · {s.name} · {s.durationMin} min
                          · variation de {s.changePct} % entre le début et la
                          fin.
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <p>
                  {coachingAction(
                    input.objectif,
                    sport,
                    /TTE|durab|FatMax/i.test(metric.metric),
                  )}
                </p>
                <a
                  className="underline"
                  href={
                    /FatMax|VLamax/i.test(metric.metric)
                      ? "#lab-metabolisme"
                      : /TTE|durabil/i.test(metric.metric)
                        ? "#lab-seances"
                        : "#lab-evolution"
                  }
                >
                  Examiner les données de terrain
                </a>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted-foreground">
        {objectiveDemands(input.objectif)?.checks.join(" · ")}
      </p>
    </section>
  );
}

function poolData(snapshot: DbSnapshot) {
  const raw = snapshot.critical_metrics;
  const pool =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw.poolDay : null;
  return pool && typeof pool === "object" && !Array.isArray(pool) ? pool : null;
}

export function SnapshotReview({
  snapshots,
  reference,
  sport,
  input,
  baseline,
  onBaseline,
}: {
  snapshots: DbSnapshot[];
  reference: DbSnapshot;
  sport: LabSport;
  input: CoachingCompassInput;
  baseline?: DbSnapshot;
  onBaseline: (id: string) => void;
}) {
  const prior = earlierBilans(snapshots, reference);
  const fields =
    sport === "bike"
      ? ([
          ["ftp", "FTP", "W"],
          ["map5min_w", "Puissance 5 min", "W"],
          ["tte_observed_min", "Durée observée au seuil", "min"],
        ] as const)
      : ([
          ["vma", "VMA", "km/h"],
          ["pace_threshold_sec_per_km", "Allure au seuil", "s/km"],
          ["tte_observed_min_run", "Durée observée au seuil", "min"],
          ["run_hr_drift_pct", "Dérive cardiaque", "%"],
        ] as const);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const options = [
    ...fields,
    ...(input.sportFocus === "triathlon"
      ? [["css", "CSS", "s/100 m"] as const]
      : []),
  ];
  const active =
    options.find(([key]) => key === selectedMetric) ??
    options.find(([key]) => reference[key] != null) ??
    options[0];
  const observations = [...prior, reference]
    .filter((row) => baseline && row.date >= baseline.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const history = observations.map((row) => ({
    date: row.date,
    value: row[active[0]] ?? null,
  }));
  const show = (v: number, unit: string) =>
    unit === "s/km" ? clock(v) + "/km" : v.toLocaleString("fr-FR") + " " + unit;
  const swim = input.sportFocus === "triathlon";
  const poolA = baseline && poolData(baseline),
    poolB = poolData(reference);
  return (
    <section id="lab-evolution" className="space-y-3">
      <h3 className="text-xl font-semibold">
        Ce qui a changé entre deux bilans
      </h3>
      {!baseline ? (
        <p>
          Premier bilan daté disponible. Il servira de point de comparaison.
        </p>
      ) : (
        <>
          <label>
            Bilan précédent{" "}
            <select
              className="border rounded p-2 bg-background"
              value={baseline.id}
              onChange={(e) => onBaseline(e.target.value)}
            >
              {prior.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.source}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Tracer un repère{" "}
            <select
              className="border rounded p-1 bg-background"
              value={active[0]}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              {options.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {history.filter((p) => p.value != null).length >= 2 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    width={70}
                    domain={["auto", "auto"]}
                    reversed={active[2].startsWith("s/")}
                    tickFormatter={(n) => show(n, active[2])}
                  />
                  <Tooltip
                    formatter={(n) => [show(Number(n), active[2]), active[1]]}
                  />
                  <Line
                    dataKey="value"
                    stroke="#15867e"
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>
              Il faut deux observations de ce repère pour tracer une évolution.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Repère", baseline.date, reference.date, "Écart"].map(
                    (x) => (
                      <th key={x} className="text-left">
                        {x}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {fields.map(([key, label, unit]) => {
                  const a = baseline[key],
                    b = reference[key];
                  return (
                    <tr className="border-t" key={key}>
                      <th className="text-left">{label}</th>
                      <td>{a == null ? "—" : show(a, unit)}</td>
                      <td>{b == null ? "—" : show(b, unit)}</td>
                      <td>
                        {a == null || b == null
                          ? "Incomparable"
                          : (b > a ? "+" : "") +
                            Number((b - a).toFixed(2)) +
                            " " +
                            unit}
                      </td>
                    </tr>
                  );
                })}
                {swim && (
                  <tr>
                    <th className="text-left">CSS (s/100 m)</th>
                    <td>{baseline.css ?? "—"}</td>
                    <td>{reference.css ?? "—"}</td>
                    <td>
                      {baseline.css && reference.css
                        ? Number((reference.css - baseline.css).toFixed(1)) +
                          " s/100 m"
                        : "Incomparable"}
                    </td>
                  </tr>
                )}
                {swim &&
                  poolA &&
                  poolB &&
                  poolA.poolMetres === poolB.poolMetres &&
                  [200, 400].map((m) => {
                    const a = poolA["t" + m],
                      b = poolB["t" + m];
                    return typeof a === "number" &&
                      typeof b === "number" &&
                      a > 0 &&
                      b > 0 ? (
                      <tr key={m}>
                        <th className="text-left">
                          {m} m · bassin {String(poolA.poolMetres)} m
                        </th>
                        <td>{clock(a)}</td>
                        <td>{clock(b)}</td>
                        <td>{Number((b - a).toFixed(1))} s</td>
                      </tr>
                    ) : null;
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            La comparaison porte sur les valeurs enregistrées. Vérifier le
            protocole, le matériel et la date du test avant d’attribuer l’écart
            à l’entraînement.
          </p>
          <p>
            <strong>Pour {input.objectif}.</strong>{" "}
            {coachingAction(input.objectif, sport, true)}
          </p>
        </>
      )}
    </section>
  );
}

function datedRaces(row: DbSnapshot, after: string) {
  const columns = row as DbSnapshot &
    Partial<import("@/integrations/supabase/types").Tables<"snapshots">>;
  return (["5k", "10k", "20k", "half", "marathon"] as const).flatMap(
    (distance) => {
      const date = columns[`time_${distance}_date`],
        seconds = columns[`time_${distance}_sec`];
      if (!date || date <= after || date > row.date || !(seconds > 0))
        return [];
      return [
        {
          label:
            distance === "half"
              ? "Semi-marathon"
              : distance.replace("k", " km"),
          date,
          seconds,
        },
      ];
    },
  );
}

export function BlindReview({
  snapshots,
  reference,
  birth,
  tests = [],
  athletes = [],
}: {
  snapshots: DbSnapshot[];
  reference: DbSnapshot;
  birth?: string | null;
  tests?: DbTest[];
  athletes?: { id: string; dateNaissance?: string | null }[];
}) {
  const earlier = earlierBilans(snapshots, reference);
  const [id, setId] = useState(earlier[0]?.id ?? "");
  const [goal, setGoal] = useState("");
  const [ambition, setAmbition] = useState<AmbitionLevel | "">("");
  const [opinion, setOpinion] = useState("");
  const [minTime, setMinTime] = useState(""),
    [maxTime, setMaxTime] = useState("");
  const [showCohort, setShowCohort] = useState(false);
  const [reveal, setReveal] = useState(false);
  const first = earlier.find((s) => s.id === id);
  if (!first)
    return (
      <p>
        Deux bilans à des dates distinctes sont nécessaires pour la relecture.
      </p>
    );
  const next = [...earlier, reference]
    .filter((s) => s.date > first.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const results = datedRaces(next, first.date);
  const scenarioGoal =
    goal ||
    (objectiveDemands(first.objectif || "") ? first.objectif || "" : "");
  const age = birth
    ? Number(first.date.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      Number(first.date.slice(5, 10) < birth.slice(5, 10))
    : null;
  const ranks =
    reveal && ambition
      ? replayPriorities(first, scenarioGoal, ambition, age, tests)
      : [];
  const race =
    reveal && ambition
      ? raceForecastReview(first, next, scenarioGoal, ambition)
      : null;
  const cohort =
    reveal && showCohort && ambition
      ? roadForecastCohort(
          snapshots,
          athletes,
          first.coach_id,
          next.date,
          scenarioGoal,
          ambition,
          Number(minTime),
          maxTime ? Number(maxTime) : Infinity,
        )
      : null;
  const fields = [
    ["ftp", "FTP (W)"],
    ["map5min_w", "5 min vélo (W)"],
    ["vma", "VMA (km/h)"],
    ["css", "CSS (s/100 m)"],
    ["tte_observed_min", "Tenue au seuil vélo (min)"],
    ["tte_observed_min_run", "Tenue au seuil course (min)"],
  ] as const;
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold">
        Relecture historique à l’aveugle
      </h3>
      <label>
        Bilan de départ{" "}
        <select
          className="rounded border bg-background p-2"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setReveal(false);
            setOpinion("");
            setGoal("");
            setAmbition("");
          }}
        >
          {earlier.map((s) => (
            <option key={s.id} value={s.id}>
              {s.date}
            </option>
          ))}
        </select>
      </label>
      <p>Objectif enregistré à cette date · {first.objectif || "inconnu"}</p>
      <div className="flex flex-wrap gap-2">
        <label>
          Objectif du scénario{" "}
          <select
            value={scenarioGoal}
            disabled={reveal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option value="">Choisir</option>
            {Object.keys(OBJECTIVE_DEMANDS).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Ambition à cette date{" "}
          <select
            value={ambition}
            disabled={reveal}
            onChange={(e) => setAmbition(e.target.value as AmbitionLevel)}
          >
            <option value="">Choisir</option>
            {Object.values(AMBITION_DEFINITIONS).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul>
        {fields.map(
          ([k, label]) =>
            first[k] != null && (
              <li key={k}>
                {label} · {first[k]}
              </li>
            ),
        )}
      </ul>
      <label className="block">
        Quel facteur attends-tu de retrouver sur le terrain ?
        <textarea
          className="block w-full rounded border bg-background p-2"
          value={opinion}
          readOnly={reveal}
          onChange={(e) => setOpinion(e.target.value)}
        />
      </label>
      {!reveal && (
        <button
          className="rounded border p-2"
          disabled={!opinion.trim() || !ambition || !scenarioGoal}
          onClick={() => setReveal(true)}
        >
          Révéler le bilan suivant
        </button>
      )}
      {reveal && (
        <>
          <h4 className="font-semibold">
            Classement reconstitué avec les champs du bilan initial
          </h4>
          {ranks.length ? (
            <ol className="list-decimal pl-5">
              {ranks.map((r) => {
                const evidence = followupEvidence(
                  r,
                  first,
                  next,
                  scenarioGoal,
                  tests,
                );
                return (
                  <li key={r.metric.metric}>
                    {r.metric.metric}
                    {r.hypothesis ? " · hypothèse" : ""}
                    {evidence.length ? (
                      <ul>
                        {evidence.map((e) => (
                          <li key={e.id}>
                            {e.date} · {e.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">
                        Vérification ouverte · aucun effort daté directement
                        comparable identifié pour ce facteur.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p>Données insuffisantes pour classer un écart.</p>
          )}
          <h4 className="font-semibold">Observations du {next.date}</h4>
          <ul>
            {fields
              .filter(([k]) => next[k] != null)
              .map(([k, label]) => (
                <li key={k}>
                  {label} · {next[k]}
                  {first[k] != null ? " (précédent " + first[k] + ")" : ""}
                </li>
              ))}
          </ul>
          <h4 className="font-semibold">
            Résultats de course datés entre les bilans
          </h4>
          {results.length ? (
            <ul>
              {results.map((r) => (
                <li key={r.label}>
                  {r.label} · {r.date} · {clock(r.seconds)} (min:s)
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun chrono de course daté disponible sur cet intervalle.</p>
          )}
          {objectiveDemands(scenarioGoal)?.kind === "road" &&
            athletes.length > 0 && (
              <details onToggle={(e) => setShowCohort(e.currentTarget.open)}>
                <summary className="cursor-pointer font-semibold">
                  Erreur des prévisions chez les adultes suivis sur cette
                  distance
                </summary>
                <p>
                  Objectif {scenarioGoal} · scénario {ambition}. Filtrer le
                  niveau de performance par le dernier chrono connu avant la
                  course (minutes).
                </p>
                <div className="flex flex-wrap gap-3">
                  <label>
                    De{" "}
                    <input
                      type="number"
                      min="0"
                      aria-label="Chrono antérieur minimum"
                      value={minTime}
                      onChange={(e) => setMinTime(e.target.value)}
                      className="w-20 rounded border bg-background p-1"
                    />{" "}
                    min
                  </label>
                  <label>
                    À{" "}
                    <input
                      type="number"
                      min="0"
                      aria-label="Chrono antérieur maximum"
                      value={maxTime}
                      onChange={(e) => setMaxTime(e.target.value)}
                      className="w-20 rounded border bg-background p-1"
                    />{" "}
                    min
                  </label>
                </div>
                {maxTime && Number(maxTime) < Number(minTime) ? (
                  <p>Le maximum doit atteindre au moins le minimum.</p>
                ) : cohort ? (
                  <p>
                    {cohort.races} course(s) · {cohort.athletes} athlète(s).
                    Erreur absolue moyenne · TFCLab {clock(cohort.modelError)} ·
                    ancien chrono {clock(cohort.baselineError)} (min:s).
                  </p>
                ) : (
                  <p>
                    Aucune paire datée avec un ancien chrono comparable pour ce
                    groupe.
                  </p>
                )}
              </details>
            )}
          {race && (
            <div>
              <h4 className="font-semibold">
                Prévision du bilan initial face à la course du {race.date}
              </h4>
              <p>
                Prévu {clock(race.predictedSeconds)} · réalisé{" "}
                {clock(race.observed)} · erreur {clock(race.error)} (min:s).
              </p>
              <p>
                {race.baselineError == null
                  ? "Aucun ancien chrono daté sur cette distance pour la comparaison."
                  : `Dernier chrono sur cette distance ${clock(race.baseline!)} · erreur en le reconduisant ${clock(race.baselineError)} (min:s).`}
              </p>
            </div>
          )}
          <p>
            Comparer avec ton observation initiale. Un changement de valeur seul
            ne démontre pas que ce facteur expliquait le résultat en course.
          </p>
        </>
      )}
    </section>
  );
}
