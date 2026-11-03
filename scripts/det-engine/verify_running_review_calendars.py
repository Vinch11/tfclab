"""Independent arithmetic/source-recovery audit, never scientific approval."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def check(condition, context):
    if not condition:
        raise AssertionError(context)


def audit(path):
    sources = {}
    names = ["v3PilotCatalogue.json", "v3RunSupplement20261103.json"] + [
        "v3" + sport + suffix + ".json"
        for sport in ("Bike", "Run", "Swim", "Strength")
        for suffix in ("Expansion", "Next100")
    ]
    for name in names:
        for workout in json.loads((ROOT / "scripts/library-v3" / name).read_text())["workouts"]:
            check(workout["id"] not in sources, "duplicate original source")
            sources[workout["id"]] = workout
    rows = json.loads(Path(path).read_text())
    expected = {
        f"{goal}-{weeks}w-{ambition}-strict-acceptance"
        for goal, horizons in (("semi", (8, 30)), ("10k", (8, 10, 12)))
        for weeks in horizons for ambition in ("age_group", "competitor")
    }
    accepted = [r for r in rows if r["scenario"] in expected]
    check(len(accepted) == 10 and {r["scenario"] for r in accepted} == expected,
          "all ten explicit acceptance witnesses required")
    refused = [r for r in rows if r["scenario"].endswith("-without-supplement")]
    check(len(refused) == 1 and not refused[0]["nativeConstraintsSatisfied"],
          "original dense schedule refusal must be preserved")
    for row in accepted:
        label = row["scenario"]
        check(row["nativeConstraintsSatisfied"] and not row["blockingCodes"], label)
        calendar = row["reviewCalendar"]
        check(calendar["syntheticOnly"] and not calendar["prescriptionAllowed"], label)
        check(not row["clinicalAttestation"] and not row["backendPersistenceTested"], label)
        weeks = calendar["weeks"]
        check([w["week"] for w in weeks] == list(range(1, row["weeksRequested"] + 1)), label)
        keys = matches = deloads = specific = 0
        records = []
        previous = None
        min_low = 100
        for week in weeks:
            context = (label, week["week"])
            active = [s for s in week["sessions"] if not s["isRest"]]
            training = [s for s in active if not s["title"].startswith("COURSE : ")]
            check(all(isinstance(s["durationMin"], (int, float)) and
                      math.isfinite(s["durationMin"]) and s["durationMin"] > 0 for s in training), context)
            minutes = sum(s["durationMin"] for s in training)
            check(minutes <= row["weeklyHours"] * 60 + 1e-7, (context, "weekly cap"))
            ids = [s["sourceId"] for s in training]
            check(len(ids) == len(set(ids)), (context, "source reused in week"))
            if week["weekType"] == "recovery":
                check(previous is not None and minutes <= .7 * previous + 1e-7,
                      (context, "unmeasured deload"))
                deloads += 1
            previous = minutes
            dose = dict(low=0, mid=0, high=0, unknown=0)
            quality = False
            for session in active:
                start = session["confirmedStart"]
                check(start and start["provenance"] == "coach_confirmed", (context, "clock"))
                absolute = ((week["week"] - 1) * 7 + DAYS.index(session["day"])) * 1440
                absolute += start["minuteOfDay"] - start["utcOffsetMinutes"]
                records.append((absolute, session, context))
                if session["title"].startswith("COURSE : "):
                    check(week["week"] == row["weeksRequested"] and session["day"] == "dimanche",
                          (context, "official race placement"))
                    continue
                source = sources[session["sourceId"]]
                keys += bool(session["isKeySession"])
                if session["sport"] == "strength":
                    continue
                ledger = session["exactDose"]
                check(ledger and ledger["sourceIds"] == [source["id"]], (context, "source identity"))
                check(abs(ledger["durationMin"] - session["durationMin"]) < 1e-7, context)
                check(all(math.isfinite(ledger[k]) and ledger[k] >= 0 for k in dose), context)
                check(abs(sum(ledger[k] for k in dose) - session["durationMin"]) < 1e-7, context)
                for field in dose:
                    dose[field] += ledger[field]
                quality |= bool(session["isKeySession"] and session["sport"] == "run" and ledger["high"] > 0)
                intent = source["prescription"]["physiologicalIntent"]
                if (session["isKeySession"] and session["sport"] == "run" and source["primaryDomain"] == "mlss"
                        and {"threshold_tolerance", "fractional_utilization"} <= set(intent["limiterKeys"])
                        and ledger["high"] >= 20):
                    matches += 1
                if week["phase"] == "peak" and source["primaryIntent"] == "race_specific":
                    expected_domain = "semi_pace" if row["objective"] == "Semi" else "mlss"
                    specific += bool(source["primaryDomain"] == expected_domain and ledger["high"] > 0)
            if week["weekType"] == "load":
                competitor = row["declaredAmbition"] == "competitor"
                check(sum(s["sport"] == "run" for s in training) == (5 if competitor else 4), context)
                check(sum(s["sport"] == "strength" for s in training) == (2 if competitor else 1), context)
                check(quality, (context, "missing source-proven key quality"))
                check(sum(dose.values()) > 0 and dose["low"] / sum(dose.values()) >= .75 - 1e-7,
                      (context, "actual low-intensity minutes below 75%"))
                check(dose["unknown"] / sum(dose.values()) <= .30 + 1e-7, context)
                min_low = min(min_low, 100 * dose["low"] / sum(dose.values()))
        records.sort(key=lambda r: r[0])
        for i, (start, session, context) in enumerate(records):
            if i + 1 < len(records):
                check(start + (session["durationMin"] or 0) <= records[i + 1][0] + 1e-7,
                      (context, "appointments overlap"))
            if not session["sourceId"]:
                continue
            next_same = next((r for r in records[i + 1:] if r[1]["sport"] == session["sport"]), None)
            if next_same:
                gap = (next_same[0] - start - session["durationMin"]) / 60
                check(gap + 1e-7 >= sources[session["sourceId"]]["minimumRecoveryHours"],
                      (context, "original source recovery", gap))
        check(keys > 0 and matches / keys >= .30, (label, "exact TTE coverage"))
        check(specific > 0, (label, "no exact goal-specific peak work"))
        check(any(s["title"].startswith("COURSE : ") for s in weeks[-1]["sessions"]), label)
        print("INDEPENDENT_RUNNING_AUDIT " + json.dumps(dict(
            scenario=label, weeks=len(weeks), tteMatches=matches, allKeySessions=keys,
            ttePercentage=round(100 * matches / keys, 2), measuredDeloads=deloads,
            minimumLowPercentage=round(min_low, 2), exactPeakSpecificSessions=specific)))


if __name__ == "__main__":
    audit(sys.argv[1])
