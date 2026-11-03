"""Independent arithmetic audit of synthetic real-solver review calendars.

This checks emitted prescriptions against original source recovery metadata.
It does not attest sports science or authorize prescribing an athlete plan.
"""
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
    directory = ROOT / "scripts/library-v3"
    filenames = ["v3PilotCatalogue.json"] + [
        "v3" + sport + suffix + ".json"
        for sport in ("Bike", "Run", "Swim", "Strength")
        for suffix in ("Expansion", "Next100")
    ]
    for name in filenames:
        for workout in json.loads((directory / name).read_text())["workouts"]:
            check(workout["id"] not in sources, "duplicate source ID")
            sources[workout["id"]] = workout
    calendars = json.loads(Path(path).read_text())
    expected = {
        f"marathon-{weeks}w{suffix}-tte-source-preferred"
        for weeks in (16, 40)
        for suffix in ("-age_group", "-competitor-reviewed-placement")
    }
    check(len(calendars) == 4 and {c["scenario"] for c in calendars} == expected,
          "four distinct accepted synthetic calendars are required")
    for calendar in calendars:
        scenario = calendar["scenario"]
        competitor = "-competitor-reviewed-placement-" in scenario
        weekly_cap = 540 if competitor else 420
        horizon = 40 if "-40w-" in scenario else 16
        check(calendar["syntheticOnly"] and not calendar["prescriptionAllowed"], scenario)
        check([w["week"] for w in calendar["weeks"]] == list(range(1, horizon + 1)), scenario)
        keys = matches = deloads = load_weeks = 0
        previous_minutes = None
        minimum_low = 1.0
        records = []
        for week in calendar["weeks"]:
            label = (scenario, week["week"])
            sessions = [s for s in week["sessions"] if not s["isRest"]]
            minutes = sum(s["durationMin"] for s in sessions)
            check(math.isfinite(minutes) and minutes <= weekly_cap + 1e-7, (label, "weekly cap"))
            ids = [s["sourceId"] for s in sessions if s["sourceId"]]
            check(len(ids) == len(set(ids)), (label, "duplicate source"))
            if week["weekType"] == "recovery":
                check(previous_minutes and minutes <= previous_minutes * .7 + 1e-7,
                      (label, "measured 30% deload"))
                deloads += 1
            previous_minutes = minutes
            dose = dict(low=0.0, mid=0.0, high=0.0, unknown=0.0)
            quality = False
            for session in sessions:
                race = session["title"].startswith("COURSE : ")
                start = session["confirmedStart"]
                check(start["provenance"] == "coach_confirmed", (label, "missing clock"))
                check(isinstance(start["minuteOfDay"], int) and 0 <= start["minuteOfDay"] < 1440,
                      (label, "invalid clock"))
                absolute = ((week["week"] - 1) * 7 + DAYS.index(session["day"])) * 1440
                absolute += start["minuteOfDay"] - start["utcOffsetMinutes"]
                records.append((absolute, session, label))
                if race:
                    continue
                source = sources[session["sourceId"]]
                key = session["isKeySession"]
                keys += bool(key)
                ledger = session["exactDose"]
                if session["sport"] != "strength":
                    check(ledger and ledger["sourceIds"] == [session["sourceId"]],
                          (label, "missing exact source"))
                    check(abs(ledger["durationMin"] - session["durationMin"]) < 1e-7,
                          (label, "duration mismatch"))
                    check(all(math.isfinite(ledger[k]) and ledger[k] >= 0 for k in dose),
                          (label, "invalid domain time"))
                    check(abs(sum(ledger[k] for k in dose) - session["durationMin"]) < 1e-7,
                          (label, "domain sum mismatch"))
                    for field in dose:
                        dose[field] += ledger[field]
                    quality |= bool(key and session["sport"] == "run" and ledger["high"] > 0)
                    intent = source["prescription"]["physiologicalIntent"]
                    if (key and session["sport"] == "run" and source["primaryDomain"] == "mlss"
                            and {"threshold_tolerance", "fractional_utilization"}
                            <= set(intent["limiterKeys"]) and ledger["high"] >= 20):
                        matches += 1
            if week["weekType"] == "load":
                check(sum(s["sport"] == "run" for s in sessions) == (5 if competitor else 4),
                      (label, "cardio frequency changed"))
                check(sum(s["sport"] == "strength" for s in sessions) == (2 if competitor else 1),
                      (label, "strength frequency changed"))
                check(quality, (label, "missing exact running key quality"))
                total = sum(dose.values())
                check(total > 0 and dose["low"] / total >= .75 - 1e-7, (label, "polarization"))
                check(dose["unknown"] / total <= .30 + 1e-7, (label, "unknown dose"))
                minimum_low = min(minimum_low, dose["low"] / total)
                load_weeks += 1
        records.sort(key=lambda entry: entry[0])
        minimum_threshold_gap = float("inf")
        minimum_strength_gap = float("inf")
        for i, (start, session, label) in enumerate(records):
            if i + 1 < len(records):
                next_start, next_session, _ = records[i + 1]
                check(start + session["durationMin"] <= next_start + 1e-7,
                      (label, "confirmed appointments overlap"))
            if not session["sourceId"]:
                continue
            source = sources[session["sourceId"]]
            next_exposure = next((r for r in records[i + 1:]
                                  if r[1]["sport"] == session["sport"]
                                  or r[1]["sport"] == "brick"
                                  and session["sport"] in ("run", "bike")), None)
            if next_exposure:
                gap = (next_exposure[0] - start - session["durationMin"]) / 60
                check(gap + 1e-7 >= source["minimumRecoveryHours"],
                      (label, session["sourceId"], "source recovery", gap))
                if source["primaryDomain"] == "mlss":
                    minimum_threshold_gap = min(minimum_threshold_gap, gap)
                if session["sport"] == "strength":
                    minimum_strength_gap = min(minimum_strength_gap, gap)
        check(keys > 0 and matches / keys >= .30, (scenario, "exact TTE coverage"))
        check(any(s["title"].startswith("COURSE : ") for s in calendar["weeks"][-1]["sessions"]),
              (scenario, "missing final race"))
        print("INDEPENDENT_MARATHON_AUDIT " + json.dumps(dict(
            scenario=scenario, weeks=horizon, tteMatches=matches, allKeySessions=keys,
            ttePercentage=round(100 * matches / keys, 2), loadWeeks=load_weeks,
            measuredDeloads=deloads, minimumLowPercentage=round(100 * minimum_low, 2),
            minimumMlssRecoveryHours=round(minimum_threshold_gap, 2),
            minimumStrengthRecoveryHours=round(minimum_strength_gap, 2)),
            ensure_ascii=False))


if __name__ == "__main__":
    audit(sys.argv[1])
