import { useState } from "react";
import { format } from "date-fns";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { validTestDate } from "@/lib/testMeasurementReview";
import { rankedFieldGaps } from "@/lib/coachingCompass/rankedFieldGaps";
import { fieldIntensity } from "@/lib/diagnostic/fieldHold";

const BASE = "tfcl-priority-review-v1";
const OUTCOME = "tfcl-priority-followup-v1";

export function FieldDecisionReview({
  input,
  snapshotId,
}: {
  input: CoachingCompassInput;
  snapshotId: string;
}) {
  const { tests, addTest } = useCloudDataContext();
  const [selected, setSelected] = useState("");
  const [criterion, setCriterion] = useState("");
  const [evidence, setEvidence] = useState("");
  const [date, setDate] = useState("");
  const [decision, setDecision] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const history = tests.filter((t) => t.athlete_id === input.athleteId);
  const frozen = history.filter((t) => t.type === BASE);
  const outcomes = history.filter((t) => t.type === OUTCOME);
  const record = frozen.find((t) => t.id === selected);
  const data =
    record?.raw && typeof record.raw === "object" && !Array.isArray(record.raw)
      ? record.raw
      : null;
  const previous = outcomes.find(
    (t) =>
      t.raw &&
      typeof t.raw === "object" &&
      !Array.isArray(t.raw) &&
      t.raw.baselineId === selected,
  );
  const sport = input.sportFocus === "run" ? "run" : "bike";
  const ref = sport === "run" ? input.paceThresholdSecPerKm : input.ftp;
  const ranks = rankedFieldGaps(input.limiterResult);
  const canSave = record
    ? !previous &&
      validTestDate(date) &&
      date > record.date.slice(0, 10) &&
      date <= today &&
      !!decision &&
      !!evidence.trim()
    : !!criterion.trim() && !!input.limiterResult;
  async function save() {
    if (busy || !canSave) return;
    setBusy(true);
    try {
      const saved = record
        ? await addTest(
            input.athleteId,
            OUTCOME,
            "Relecture de la priorité terrain",
            record.sport,
            null,
            null,
            {
              baselineId: record.id,
              performedOn: date,
              verdict: decision,
              evidence: evidence.trim(),
            },
          )
        : await addTest(
            input.athleteId,
            BASE,
            "Priorité avant observation",
            sport,
            null,
            null,
            {
              snapshotId,
              snapshotDate: input.snapshotDate ?? null,
              objective: input.objectif,
              ambition: input.ambition ?? null,
              targetMinutes: input.performanceGoal?.minutes ?? null,
              threshold: ref ? fieldIntensity(sport, ref) : null,
              headline: input.limiterResult!.limiterLabel ?? "",
              criterion: criterion.trim(),
              ranking: ranks.map(({ metric, hypothesis }) => ({
                metric: metric.metric,
                value: metric.value ?? null,
                target: metric.target ?? null,
                hypothesis,
                provenance:
                  metric.fieldEstimateNote ?? metric.prescriptionNote ?? null,
              })),
            },
          );
      if (!saved) throw new Error();
      setStatus(
        record
          ? "Observation de suivi enregistrée."
          : "Priorité et critère enregistrés avant observation.",
      );
      if (!record) {
        setCriterion("");
        setSelected(saved.id);
      }
    } catch {
      setStatus(
        "Enregistrement non confirmé. Les informations saisies restent disponibles.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="space-y-3 rounded border p-4">
      <summary>Vérifier une priorité sur une prochaine séance</summary>
      <label className="block">
        Décision à vérifier{" "}
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setDate("");
            setEvidence("");
            setDecision("");
            setStatus("");
          }}
        >
          <option value="">Enregistrer la décision du jour</option>
          {frozen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.date.slice(0, 10)} · {r.sport} ·{" "}
              {r.raw && typeof r.raw === "object" && !Array.isArray(r.raw)
                ? String(r.raw.objective ?? "")
                : ""}
            </option>
          ))}
        </select>
      </label>
      {record && data ? (
        <>
          <p>
            Priorité enregistrée · {String(data.headline ?? "")}. Critère prévu
            · {String(data.criterion ?? "")}.
          </p>
          {previous ? (
            <p>
              Observation enregistrée ·{" "}
              {previous.raw &&
              typeof previous.raw === "object" &&
              !Array.isArray(previous.raw)
                ? [
                    previous.raw.performedOn,
                    previous.raw.verdict,
                    previous.raw.evidence,
                  ].join(" · ")
                : ""}
            </p>
          ) : (
            <>
              <label className="block">
                Date de la séance suivante{" "}
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="block">
                Référence de la séance, résultat avec unité et conditions{" "}
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </label>
              <label className="block">
                Lecture par rapport au critère{" "}
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="">Choisir</option>
                  <option>Concordant</option>
                  <option>Contradictoire</option>
                  <option>Non concluant</option>
                </select>
              </label>
            </>
          )}
        </>
      ) : (
        <label className="block">
          Sur quelle séance et quel résultat observable jugeras-tu cette
          priorité ?{" "}
          <textarea
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
            placeholder="Ex. sur le prochain bloc continu à 250 W, documenter si la cible est tenue 30 min et le motif de l’arrêt."
          />
        </label>
      )}
      {!previous && (
        <button
          type="button"
          className="rounded border p-2 disabled:opacity-50"
          disabled={!canSave || busy}
          onClick={save}
        >
          {record
            ? "Enregistrer l’observation"
            : "Figer la décision et le critère"}
        </button>
      )}
      <p role="status">{status}</p>
    </details>
  );
}
