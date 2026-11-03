"""Independent calendar arithmetic. No engine imports or scientific approval."""
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
EXPECTED = {
    "sprint-8w-reference": (10, 8), "olympic-12w-reference": (10, 12),
    "cycling-ftp-8w-reference": (11, 8), "swim-css-8w-reference": (12, 8),
    "10k-B-to-semi-A-16w-reference": (13, 16),
    "availability-10k-12w-four-days": (14, 12),
    "individual-recovery-10k-12w-2to1-sprint-ban": (15, 12),
}
# Exact approved compositions, checked against their ORIGINAL components.
BRICKS = {
    "V3B_SPRINT_EASY_001": ("V3P_BIKE_001", "V3P_RUN_001", 3),
    "V3B_OLYMPIC_EASY_001": ("V3P_BIKE_002", "V3P_RUN_001", 3),
    "V3B_OLYMPIC_PEAK_001": ("V3P_BIKE_119", "V3P_RUN_001", 3),
}
PACES = dict(recovery=120, moderate_lt1=110, tempo=103, im_pace=108,
             marathon_pace=103, sub_threshold=98, semi_pace=98,
             mlss=95, vo2max=88, neuromuscular=80, **{"703_pace": 102})


def check(value, context):
    if not value:
        raise AssertionError(context)


def load_sources():
    sources = {}
    names = ["v3PilotCatalogue.json", "v3RunSupplement20261103.json"] + [
        "v3" + sport + suffix + ".json" for sport in ("Bike", "Run", "Swim", "Strength")
        for suffix in ("Expansion", "Next100")]
    for name in names:
        for w in json.loads((ROOT / "scripts/library-v3" / name).read_text())["workouts"]:
            check(w["id"] not in sources, "duplicate source")
            sources[w["id"]] = w
    return sources


def raw_dose(blocks, zones):
    """Recalculate source BLOCKS, including explicitly unknown repetition gaps."""
    total = dict(low=0., mid=0., high=0., unknown=0.)
    for b in blocks:
        if b["kind"] == "repeat":
            part = raw_dose(b["steps"], zones)
            n = b["count"]["base"]
            for k in total:
                total[k] += part[k] * n
            total["unknown"] += (n - 1) * b["betweenSec"] / 60
        else:
            check(b["kind"] != "reps", "counted repetitions cannot prove duration")
            minutes = (b["seconds"]["base"] / 60 if b["kind"] == "time"
                       else b["meters"]["base"] * PACES[b["domain"]] / 6000)
            z = zones.get(b.get("domain"))
            kind = "low" if z in ("Z1", "Z2") else "mid" if z == "Z3" else "high" if z else "unknown"
            total[kind] += minutes
    return total


def audit(rows):
    sources = load_sources()
    # Intensity classification comes only from the repository's TFCL doctrine.
    doctrine = (ROOT / "src/lib/zones/tfclDoctrine.ts").read_text()
    zones = dict(re.findall(r'id: "([^"]+)"[^\n]*zone: "(Z[1-6])"', doctrine))
    check(len(zones) == 11, "doctrine extraction must be complete")
    accepted = [r for r in rows if r.get("scenario") in EXPECTED and r.get("reviewCalendar")]
    check(len(accepted) == 7 and {r["scenario"] for r in accepted} == set(EXPECTED),
          "all seven complete positive witnesses required")
    summaries = []
    for row in accepted:
        label = row["scenario"]
        family, horizon = EXPECTED[label]
        check(row.get("constraintsSatisfied", row.get("nativeConstraintsSatisfied")), label)
        check(not row["blockingCodes"], label)
        calendar = row["reviewCalendar"]
        check(calendar["syntheticOnly"] and not calendar["prescriptionAllowed"], label)
        weeks = calendar["weeks"]
        check([w["week"] for w in weeks] == list(range(1, horizon + 1)), label)
        records, events, deloads = [], [], []
        ratio = dict(swim=0., bike=0., run=0.)
        min_low, previous, keys, tte, specific = 100., None, 0, 0, 0
        for week in weeks:
            context = (label, week["week"])
            active = [s for s in week["sessions"] if not s["isRest"]]
            training = [s for s in active if not s["title"].startswith("COURSE : ")]
            check(all(isinstance(s["durationMin"], (int, float)) and
                      math.isfinite(s["durationMin"]) and s["durationMin"] > 0 for s in training), context)
            minutes = sum(s["durationMin"] for s in training)
            check(minutes <= row["weeklyHours"] * 60 + 1e-7, (context, "weekly hours"))
            all_minutes = sum(s["durationMin"] for s in active)
            if week["weekType"] == "recovery":
                check(previous and all_minutes <= .7 * previous + 1e-7, (context, "recovery reduction"))
                deloads.append(week["week"])
            previous = all_minutes
            if family <= 12:
                q = week["quota"]
                counted = [s for s in active if not (s["title"].startswith("COURSE : ") and
                           s["sport"] == "brick" and q["brick"]["max"] == 0)]
                counts = Counter(s["sport"] for s in counted)
                for sport in ("swim", "bike", "run", "brick", "strength"):
                    shift = counts["brick"] if sport == "bike" else 0
                    lo, hi = (max(0, q[sport][k] - shift) for k in ("min", "max"))
                    check(lo <= counts[sport] <= hi, (context, "source frequency", sport, counts[sport], lo, hi))
                lo, hi = (max(0, q["totalSessions"][k] - counts["brick"]) for k in ("min", "max"))
                check(lo <= len(counted) <= hi, (context, "total frequency"))
            if family == 12:
                check(not set(s["day"] for s in active) & {"mercredi", "samedi"},
                      (context, "declared swimming availability"))
            spent = []
            dose = dict(low=0., mid=0., high=0., unknown=0.)
            quality = False
            by_day = Counter(s["day"] for s in active)
            check(max(by_day.values()) <= 2 and len(by_day) <= 6, (context, "daily capacity/rest"))
            for s in active:
                clock = s["confirmedStart"]
                check(clock and clock["provenance"] == "coach_confirmed", (context, "missing clock"))
                absolute = ((week["week"] - 1) * 7 + DAYS.index(s["day"])) * 1440
                absolute += clock["minuteOfDay"] - clock["utcOffsetMinutes"]
                records.append((absolute, s, context))
                if s["title"].startswith("COURSE : "):
                    check(by_day[s["day"]] == 1, (context, "competition must own its calendar day"))
                    events.append((week["week"], DAYS.index(s["day"]), s["title"], s["durationMin"]))
                    continue
                sid = s["sourceId"]
                ids = list(BRICKS[sid][:2]) if sid in BRICKS else [sid]
                check(all(i in sources for i in ids), (context, "unknown source"))
                spent += ids
                check(all(week["phase"] in sources[i]["phase"] for i in ids), (context, "source phase"))
                if family == 15:
                    check(all(sources[i]["primaryDomain"] != "neuromuscular" for i in ids),
                          (context, "sprint ban"))
                if s["sport"] == "strength":
                    if family <= 12:
                        check(abs(sum(raw_dose(sources[sid]["blocks"], zones).values()) - s["durationMin"]) < 1e-7,
                              (context, "strength timebox duration"))
                    continue
                ledger = s["exactDose"]
                check(ledger and set(ledger["sourceIds"]) == set(ids), (context, "source dose identity"))
                check(all(math.isfinite(ledger[k]) and ledger[k] >= 0 for k in dose), context)
                check(abs(sum(ledger[k] for k in dose) - s["durationMin"]) < 1e-7, context)
                # These four families use default source prescriptions. Recompute
                # all durations/zones from JSON; no solver-exported arithmetic.
                if family <= 12:
                    exact = dict(low=0., mid=0., high=0., unknown=0.)
                    for i in ids:
                        part = raw_dose(sources[i]["blocks"], zones)
                        for k in dose:
                            exact[k] += part[k]
                        if week["weekType"] == "load":
                            ratio[sources[i]["sport"]] += sum(part.values())
                    if sid in BRICKS:
                        exact["unknown"] += BRICKS[sid][2]
                    check(all(abs(exact[k] - ledger[k]) < 1e-7 for k in dose),
                          (context, "original source block arithmetic", sid))
                for k in dose:
                    dose[k] += ledger[k]
                domain = sources[ids[0]]["primaryDomain"]
                compatible = (domain == "vo2max" if row.get("primaryLimiter") == "vo2max" else
                              domain in ("mlss", "sub_threshold", "vo2max") if row.get("primaryLimiter") == "ftp" else
                              domain == "mlss") if family <= 12 else True
                quality |= bool(s["isKeySession"] and ledger["high"] > 0 and compatible)
                keys += bool(s["isKeySession"])
                original = sources[ids[0]]
                if s["isKeySession"] and original["primaryDomain"] == "mlss" and ledger["high"] >= 20:
                    tte += 1
                if week["phase"] == "peak":
                    if family in (11, 12):
                        specific += original["primaryDomain"] == "mlss" and ledger["high"] > 0
                    elif family == 10:
                        specific += original["primaryIntent"] == "race_specific" and original["primaryDomain"] == "tempo"
                    else:
                        target = "semi_pace" if family == 13 else "mlss"
                        specific += original["primaryIntent"] == "race_specific" and original["primaryDomain"] == target and ledger["high"] > 0
            check(len(spent) == len(set(spent)), (context, "source reused, including brick components"))
            if week["weekType"] == "load":
                check(quality, (context, "no exact key quality"))
                total = sum(dose.values())
                check(total > 0 and dose["low"] / total >= .75 - 1e-7, (context, "75% whole-duration easy share"))
                check(dose["unknown"] / total <= .30 + 1e-7, (context, "unknown time"))
                min_low = min(min_low, 100 * dose["low"] / total)
            if family == 14:
                check(not set(by_day) & {"lundi", "jeudi", "samedi"}, (context, "unavailable day"))
        records.sort(key=lambda r: r[0])

        def serves(s, sport):
            return s["sport"] == sport or s["sport"] == "brick" and (
                sport in ("bike", "run") or s["title"].startswith("COURSE : ") and sport == "swim")

        for i, (start, s, context) in enumerate(records):
            if i + 1 < len(records):
                check(start + s["durationMin"] <= records[i + 1][0] + 1e-7, (context, "overlap"))
            if not s["sourceId"]:
                if family == 13 and context[1] == 8:
                    nxt = next(r for r in records[i + 1:] if serves(r[1], "run"))
                    check(nxt[0] - start - s["durationMin"] >= 48 * 60, (context, "post-B-race recovery"))
                continue
            ids = list(BRICKS[s["sourceId"]][:2]) if s["sourceId"] in BRICKS else [s["sourceId"]]
            for sid in ids:
                original = sources[sid]
                nxt = next((r for r in records[i + 1:] if serves(r[1], original["sport"])), None)
                if nxt:
                    gap = (nxt[0] - start - s["durationMin"]) / 60
                    check(gap + 1e-7 >= original["minimumRecoveryHours"], (context, "source recovery", sid, gap))
        check(specific > 0, (label, "no source-specific peak dose"))
        if family == 13:
            check(events == [(8, 5, "COURSE : 10K", 40), (16, 6, "COURSE : Semi", 95)], (label, "two exact events"))
            check(9 in deloads, (label, "post-milestone volume reduction"))
        else:
            check(len(events) == 1 and events[0][:2] == (horizon, 6), (label, "final event"))
        if family >= 13:
            check(keys and tte / keys >= .30, (label, "exact TTE coverage"))
        if family == 15:
            check({3, 6, 9} <= set(deloads), (label, "individual 2:1 cadence"))
        ratios = {k: 100 * v / sum(ratio.values()) for k, v in ratio.items()} if sum(ratio.values()) else {}
        if family == 10:
            ranges = ({"swim": (18, 28), "bike": (40, 50), "run": (28, 34)} if horizon == 8
                      else {"swim": (15, 24), "bike": (45, 52), "run": (28, 34)})
            check(all(lo <= ratios[sport] <= hi for sport, (lo, hi) in ranges.items()), (label, "sport-minute ratios", ratios))
        summaries.append(dict(scenario=label, family=family, weeks=horizon,
                              minimumLowPercentage=round(min_low, 2), deloads=deloads,
                              ratios=ratios, allKeySessions=keys, exactTteMatches=tte if family >= 13 else None,
                              exactPeakSpecificSessions=specific))
    for summary in summaries:
        print("INDEPENDENT_FAMILY_AUDIT " + json.dumps(summary))
    return summaries


if __name__ == "__main__":
    audit(json.loads(Path(sys.argv[1]).read_text()))
