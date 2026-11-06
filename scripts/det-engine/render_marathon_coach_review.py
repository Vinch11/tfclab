"""Render the frozen four-calendar CI artifact for human review, without network.

This is a presentation of synthetic evidence, never a prescription approval.
"""
import argparse
import hashlib
import html
import json
import math
from pathlib import Path

SOURCE = "d2d7d2f8ac6a3cdccd09a3b1a741d484ea01289a"
RUN = "https://github.com/Vinch11/tfclab/actions/runs/41460441508"
CALENDAR_SHA256 = "8be20d654bbbc46c447846634706077dea3d49b450ebc1423022066140653c23"
EVIDENCE_SHA256 = "02d7bda91120f6d68468da37fa766e3a8fa2c80c523f65f017fd2ec408715ad8"
DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def esc(value):
    return html.escape(str(value), quote=True)


def clock(start):
    if start is None:
        return "—"
    minute = start["minuteOfDay"]
    offset = start["utcOffsetMinutes"]
    assert type(minute) is int and 0 <= minute < 1440
    assert type(offset) is int and abs(offset) <= 14 * 60
    sign = "+" if offset >= 0 else "−"
    return f"{minute // 60:02}:{minute % 60:02} UTC{sign}{abs(offset) // 60:02}:{abs(offset) % 60:02}"


def render(calendar_path, evidence_path, output):
    calendar_bytes = calendar_path.read_bytes()
    evidence_bytes = evidence_path.read_bytes()
    if hashlib.sha256(calendar_bytes).hexdigest() != CALENDAR_SHA256:
        raise ValueError("Calendar bytes differ from the pinned CI artifact")
    if hashlib.sha256(evidence_bytes).hexdigest() != EVIDENCE_SHA256:
        raise ValueError("Evidence bytes differ from the pinned CI artifact")
    calendars = json.loads(calendar_bytes)
    evidence = json.loads(evidence_bytes)
    expected = {
        f"marathon-{weeks}w{suffix}-tte-source-preferred"
        for weeks in (16, 40)
        for suffix in ("-age_group", "-competitor-reviewed-placement")
    }
    assert len(calendars) == 4 and {c["scenario"] for c in calendars} == expected
    assert len(evidence) == 8 and len({e["scenario"] for e in evidence}) == 8
    accepted = {e["scenario"]: e for e in evidence if e["nativeConstraintsSatisfied"]}
    assert set(accepted) == expected
    sections = []
    index = []
    session_count = 0
    for number, calendar in enumerate(sorted(calendars, key=lambda c: c["scenario"]), 1):
        assert calendar["syntheticOnly"] is True and calendar["prescriptionAllowed"] is False
        scenario = calendar["scenario"]
        competitor = "-competitor-reviewed-placement-" in scenario
        horizon = 40 if "-40w-" in scenario else 16
        assert [w["week"] for w in calendar["weeks"]] == list(range(1, horizon + 1))
        label = f"Marathon {horizon} semaines — {'compétiteur, 9 h' if competitor else 'age group, 7 h'}"
        row = accepted[scenario]
        tte = row["marathonExactSourceAudit"][0]["verdict"]["tte"]
        assert tte["verified"] and tte["percentage"] >= tte["minimumPercentage"]
        index.append(f'<li><a href="#plan{number}">{esc(label)}</a></li>')
        week_blocks = []
        for week in calendar["weeks"]:
            total = sum(s["durationMin"] for s in week["sessions"])
            rows = []
            for session in week["sessions"]:
                session_count += 1
                assert session["day"] in DAYS
                duration = session["durationMin"]
                assert isinstance(duration, (int, float)) and math.isfinite(duration) and duration >= 0
                dose = session["exactDose"]
                dose_text = " / ".join(f"{dose[k]:g}" for k in ("low", "mid", "high", "unknown")) if dose else "—"
                recoveries = "; ".join(f'{r["sport"]} : {r["hours"]:g} h' for r in session["sourceRecoveryRequirements"])
                details = f'<details><summary>Prescription exacte</summary><p>{esc(session["details"])}</p></details>' if session["details"] else ""
                rows.append(
                    f'<tr><td>{esc(session["day"])}</td><td>{esc(clock(session["confirmedStart"]))}</td>'
                    f'<td>{esc(session["sport"])}</td><td>{esc(session["title"])}{details}</td>'
                    f'<td>{duration:g}</td><td>{esc(session["sourceId"] or "—")}</td>'
                    f'<td>{"oui" if session["isKeySession"] else "non"}</td><td>{esc(dose_text)}</td><td>{esc(recoveries or "—")}</td></tr>'
                )
            week_blocks.append(
                f'<section class="week"><h3>S{week["week"]} · {esc(week["phase"])} · {esc(week["weekType"])} · {total:g} min</h3>'
                '<div class="scroll"><table><thead><tr><th>Jour</th><th>Horaire de fixture</th><th>Sport</th><th>Séance</th>'
                '<th>Min</th><th>Source</th><th>Clé</th><th>Dose bas / moyen / haut / inconnu (min)</th><th>Repos source</th></tr></thead>'
                f'<tbody>{"".join(rows)}</tbody></table></div></section>'
            )
        sections.append(
            f'<article id="plan{number}"><h2>{esc(label)}</h2><p><code>{esc(scenario)}</code></p>'
            f'<p>Couverture TTE stricte publiée : {tte["verifiedMatches"]}/{tte["allKeySessions"]} séances clés '
            f'({tte["percentage"]:.2f} %). Fréquence en charge : {"5 courses + 2 forces" if competitor else "4 courses + 1 force"}. '
            'Les horaires et confirmations ci-dessous appartiennent à la fixture synthétique.</p>'
            '<p class="review">Revue humaine : À FAIRE. Examiner la cohérence sportive, les doses, la fatigue, la progression, '
            'les allègements, les horaires et les possibilités réelles de l’athlète. Toute adaptation exige une nouvelle validation.</p>'
            + "".join(week_blocks) + '<p><a href="#top">Retour aux quatre calendriers</a></p></article>'
        )
    digests = f"calendriers {hashlib.sha256(calendar_bytes).hexdigest()} ; preuves {hashlib.sha256(evidence_bytes).hexdigest()}"
    page = '''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TFCLab — quatre calendriers synthétiques à revoir</title><style>
body{font:16px/1.5 system-ui,sans-serif;color:#142532;background:#f5f7fa;margin:0}main{max-width:1500px;margin:auto;padding:24px}
h1{font-size:2rem}h2{border-top:3px solid #257d78;padding-top:24px;margin-top:48px}h3{margin:0 0 12px}
.notice,.review{padding:16px;background:#fff1cc;border-left:5px solid #aa6900}.week{background:white;padding:18px;margin:18px 0;border:1px solid #d2dae2;border-radius:8px}
.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border-bottom:1px solid #d9e0e6;padding:9px;vertical-align:top;text-align:left}
th{background:#eef4f5}td:nth-child(4){min-width:240px}details p{white-space:pre-wrap;overflow-wrap:anywhere}code,.hash{overflow-wrap:anywhere;font-size:12px}a{color:#056d66}
@media print{body{background:white}main{padding:0}.week{break-inside:avoid}.scroll{overflow:visible}details{display:block}details p{display:block}table{font-size:10px}}
</style><main id="top"><h1>Quatre calendriers à examiner</h1>
<p class="notice"><strong>LABORATOIRE SYNTHÉTIQUE — NON PRESCRIPTIF.</strong> Les contrôles techniques passent dans ces scénarios. Aucune pertinence sportive individuelle, revue humaine indépendante ou autorisation de mise en production n’est attestée.</p>
<p>Les jours, horaires, doses et instructions sont repris de l’artefact CI, sans recalculer de prescription. « coach_confirmed » désigne les confirmations artificielles de la fixture, jamais une validation effectuée par Vincent.</p>
'''
    page += f'<p>Source DET : <code>{SOURCE}</code>. <a href="{RUN}">Exécution CI et artefact 13149380218</a>.</p><ul>{"".join(index)}</ul>'
    page += "".join(sections)
    page += f'<p class="hash">SHA-256 des entrées : {digests}</p><p>{session_count} lignes de calendrier, repos et course compris. Aucun export Nolio exécuté.</p></main></html>'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")
    print(json.dumps({"calendars": 4, "weeks": 112, "rows": session_count, "htmlSha256": hashlib.sha256(page.encode()).hexdigest(), "sourceSha": SOURCE}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("calendars", type=Path)
    parser.add_argument("evidence", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    render(args.calendars, args.evidence, args.output)
