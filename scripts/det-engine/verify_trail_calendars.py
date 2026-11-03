"""Counter-calculate complete trail references from original JSON, without TS engine imports."""
import copy
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from verify_remaining_family_calendars import load_sources, raw_dose, check, ROOT

EXPECTED = {
    'trail-short-12w': (12, 'TrailShort', 7, .70, .80),
    'trail-mountain-16w': (16, 'TrailMountain', 9, .65, .80),
    'trail-ultra-20w': (20, 'TrailUltra', 12, .65, .75),
}
OVERRIDES = {
    'trail-short-12w': {},
    'trail-mountain-16w': {'V3P_RUN_136': {'1.count': 4}},
    'trail-ultra-20w': {'V3P_RUN_136': {'1.count': 4},
                       'V3P_RUN_085': {'1.seconds': 5400, '3.seconds': 4620}},
}
CLOCK = [720, 720, 420, 930, 420, 720, 420]


def fingerprint(value):
    text = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    encoded = text.encode('utf-16-le')
    h = 2166136261
    for i in range(0, len(encoded), 2):
        h = ((h ^ int.from_bytes(encoded[i:i+2], 'little')) * 16777619) & 0xffffffff
    return f'{h:08x}'


def source_fingerprint(w):
    names = ('id', 'title', 'primaryIntent', 'primaryDomain', 'phase', 'minimumLevel', 'focus',
             'contraindications', 'stopRule', 'minimumRecoveryHours', 'prerequisites', 'equipment',
             'blocks', 'prescription')
    return fingerprint({k: w.get(k) for k in names})


def configure(w, changes):
    w = copy.deepcopy(w)
    used = set()
    def blocks(items, prefix=''):
        for i, b in enumerate(items):
            path = f'{prefix}.{i}' if prefix else str(i)
            for field in ('seconds', 'count', 'betweenSec'):
                key = path + '.' + field
                if key not in changes:
                    continue
                bounds = b['betweenSecBounds'] if field == 'betweenSec' else b[field]
                value = changes[key]
                check(bounds['min'] <= value <= bounds['max'], ('unbounded override', key))
                if field in ('count', 'betweenSec'):
                    check(value == int(value), ('non-integral override', key))
                if field == 'betweenSec':
                    b[field] = value
                else:
                    bounds['base'] = value
                used.add(key)
            if b['kind'] == 'repeat':
                blocks(b['steps'], path)
    blocks(w['blocks'])
    check(used == set(changes), 'unknown override path')
    return w


def audit(row, sources, zones):
    label = row['id']
    horizon, objective, hours, low_share, high_share = EXPECTED[label]
    check(row['valid'] and row['constructed'] and not row['hard'], (label, 'positive acceptance'))
    check(row['syntheticOnly'] and not row['prescriptionAllowed'] and not row['productionAllowed']
          and not row['scientificSessionValidation'], (label, 'scope'))
    coach = row['coachReview']
    check(coach['objective'] == objective and coach['weeks'] == horizon and coach['weeklyHours'] == hours,
          (label, 'coach context'))
    history = coach['history']
    check(history['weeksHeld'] >= 8 and history['downhillExposureDocumented']
          and history['reviewReference'] and history['observedReadyAfterHours'] > 0,
          (label, 'documented exposure'))
    check(objective == 'TrailShort' or coach['backToBackApproved'], (label, 'back-to-back approval'))
    check(coach['futureReadinessCheckRequired'] and coach['terrainEffortReviewConfirmed'],
          (label, 'conditional future readiness'))
    check(row['configuredOverrides'] == OVERRIDES[label], (label, 'independently approved source variants'))
    configured = {sid: configure(w, OVERRIDES[label].get(sid, {})) for sid, w in sources.items()}
    routes = {r['sourceId']: r for r in row['routes']}
    check(len(routes) == len(row['routes']) and bool(routes), (label, 'route uniqueness'))
    for sid, route in routes.items():
        check(route['athleteId'] == coach['athleteId'] and route['objective'] == objective and
              route['routeId'].startswith(coach['athleteId'] + ':route:') and route['coachApproved'], (label, sid, 'route binding'))
        check(route['provenance'] == 'explicit_synthetic_route_observation', (label, sid, 'route provenance'))
        check(route['sourceFingerprint'] == source_fingerprint(sources[sid]), (label, sid, 'source fingerprint'))
        check(coach['routeFingerprints'][sid] == fingerprint(route), (label, sid, 'route fingerprint'))
        for k in ('durationMin', 'distanceKm', 'dPlusM', 'dMinusM', 'descentMinutes', 'minimumRecoveryHours'):
            x = route.get(k)
            check(isinstance(x, (int, float)) and math.isfinite(x) and x >= 0, (label, sid, k, 'unknown geometry'))
        dose = raw_dose(configured[sid]['blocks'], zones)
        check(abs(sum(dose.values()) - route['durationMin']) < 1e-7, (label, sid, 'configured duration'))
        check(route['dMinusM'] <= history['largestDescentM'] and route['descentMinutes'] <= route['durationMin'],
              (label, sid, 'descent exposure'))
        if route['role'] == 'long_terrain':
            check(route['durationMin'] <= history['longestRunMinutes'], (label, sid, 'long exposure'))
        if route['role'] in ('long_terrain', 'uphill_quality'):
            check(route['minimumRecoveryHours'] >= history['observedReadyAfterHours'], (label, sid, 'readiness interval'))
    plan = row['plan']
    check([w['weekNumber'] for w in plan['weeks']] == list(range(1, horizon+1)), (label, 'complete horizon'))
    runs = bikes = run_minutes = bike_minutes = keys = quality_keys = 0
    rows, records, peak, events = [], [], [], []
    last_load = dict(dPlusM=history['weeklyDPlusM'], dMinusM=history['weeklyDMinusM'], longMinutes=history['longestRunMinutes'])
    for week in plan['weeks']:
        n = week['weekNumber']
        entry = plan['weeklyQuotas'][str(n)]
        kind = entry['weekType']
        active = [s for s in week['sessions'] if not s['isRest']]
        training = [s for s in active if not s['title'].startswith('COURSE : ')]
        counts = Counter(s['sport'] for s in active)
        for sport in ('run', 'bike', 'strength', 'swim', 'brick'):
            q = entry['quota'][sport]
            check(q['min'] <= counts[sport] <= q['max'], (label, n, sport, 'actual frequency'))
        check(entry['quota']['totalSessions']['min'] <= len(active) <= entry['quota']['totalSessions']['max'], (label, n, 'total frequency'))
        days = Counter(s['dayIndex'] for s in active)
        check(max(days.values()) <= 2 and len(days) <= 6, (label, n, 'capacity and rest'))
        check(len({s['catalogId'] for s in training}) == len(training), (label, n, 'source reuse'))
        minutes = sum(s['durationMin'] for s in training)
        check(minutes <= hours*60 + 1e-7, (label, n, 'training hour ceiling'))
        w = dict(week=n, kind=kind, minutes=minutes, dPlusM=0, dMinusM=0, descentMinutes=0,
                 longMinutes=0, low=0, high=0, unknown=0, enduranceMinutes=0)
        qualities = []
        for s in active:
            absolute = ((n-1)*7+s['dayIndex'])*1440 + (1080 if s['sport'] == 'strength' else CLOCK[s['dayIndex']])
            records.append((absolute, s))
            if s['title'].startswith('COURSE : '):
                check(days[s['dayIndex']] == 1, (label, n, 'event owns day'))
                events.append((n, s['dayIndex'], s['sport'], s['durationMin']))
                continue
            sid = s['catalogId']
            source = configured[sid]
            check(source['sport'] == s['sport'] and week['phase'] in source['phase'], (label, n, sid, 'sport/phase'))
            dose = raw_dose(source['blocks'], zones)
            check(abs(sum(dose.values())-s['durationMin']) < 1e-7, (label, n, sid, 'source blocks'))
            if s['sport'] == 'strength':
                continue
            w['enduranceMinutes'] += s['durationMin']
            for k in ('low', 'high', 'unknown'):
                w[k] += dose[k]
            if kind == 'load':
                if s['sport'] == 'run':
                    runs += 1
                    run_minutes += s['durationMin']
                if s['sport'] == 'bike':
                    bikes += 1
                    bike_minutes += s['durationMin']
            if s['sport'] != 'run':
                continue
            route = routes[sid]
            check(s['durationMin'] == route['durationMin'], (label, n, sid, 'route dose'))
            check('coach_field_effort' in s['details'] and not re.search(r'\b(sec_per_km|m_per_sec)\b', s['details']),
                  (label, n, sid, 'no flat pace transposition'))
            for k in ('dPlusM', 'dMinusM', 'descentMinutes'):
                w[k] += route[k]
            if route['role'] == 'long_terrain':
                w['longMinutes'] = max(w['longMinutes'], s['durationMin'])
            if kind == 'load' and s.get('isKeySession'):
                keys += 1
                target = source['primaryDomain']
                if ((coach['primaryLimiter'] == 'tte' and target == 'mlss' and dose['high'] >= 20) or
                    (coach['primaryLimiter'] == 'vo2max' and target == 'vo2max' and dose['high'] >= 8)):
                    quality_keys += 1
                    qualities.append(sid)
            bounds = coach['bounds']
            if week['phase'] == 'peak' and kind == 'load' and s.get('isKeySession') and route['role'] == 'long_terrain' and route['fuelingPractice']:
                if (route['dPlusM'] >= bounds['peakDPlusM'] and route['dMinusM'] >= bounds['peakDMinusM'] and
                    s['durationMin'] >= bounds['peakLongMinutes'] and dose['low']/s['durationMin'] >= .75):
                    peak.append((n, sid))
        if kind == 'load':
            check(qualities and w['low'] >= .75*w['enduranceMinutes']-1e-7 and
                  w['unknown'] <= .30*w['enduranceMinutes']+1e-7, (label, n, 'quality and exact polarization'))
            check(any(s['sport'] == 'run' and s['dayIndex'] == 5 for s in training) and
                  any(s['sport'] == 'run' and s['dayIndex'] == 6 and s.get('isKeySession') for s in training), (label, n, 'actual weekend pair'))
            for field, cap in (('dPlusM', 'loadStepDPlusM'), ('dMinusM', 'loadStepDMinusM'), ('longMinutes', 'longRunStepMinutes')):
                check(w[field] <= last_load[field]+coach['bounds'][cap]+1e-7, (label, n, 'individual progression', field))
            last_load = w
        for field, cap in (('dPlusM', 'weeklyDPlusM'), ('dMinusM', 'weeklyDMinusM')):
            check(w[field] <= coach['bounds'][cap], (label, n, 'vertical cap', field))
        if kind == 'recovery':
            for k in ('minutes', 'dPlusM', 'dMinusM'):
                check(rows and w[k] <= rows[-1][k]*.7+1e-7, (label, n, 'measured recovery', k))
        exported = row['proof']['evidence']['rows'][n-1]
        check(all(abs(exported[k]-w[k]) < 1e-7 for k in w if isinstance(w[k], (float, int))), (label, n, 'independent arithmetic differs'))
        rows.append(w)
    records.sort(key=lambda r: r[0])
    for pos, (absolute, session) in enumerate(records):
        if session['title'].startswith('COURSE : '):
            continue
        sid = session['catalogId']
        required = max(sources[sid]['minimumRecoveryHours'], routes.get(sid, {}).get('minimumRecoveryHours', 0))
        following = [(t,s) for t,s in records[pos+1:] if s['sport'] == session['sport']]
        if following:
            check(following[0][0] - absolute - session['durationMin'] >= required*60-1e-7, (label, sid, 'end-to-start source/terrain recovery'))
        if pos+1 < len(records):
            check(absolute+session['durationMin'] <= records[pos+1][0], (label, sid, 'no overlap'))
    check(peak and quality_keys >= .3*keys, (label, 'source-specific peak and primary limiter coverage'))
    check(low_share-1e-7 <= runs/(runs+bikes) <= high_share+1e-7 and
          low_share-1e-7 <= run_minutes/(run_minutes+bike_minutes) <= high_share+1e-7,
          (label, 'dedicated count AND minute ratios'))
    check(events == [(horizon, 6, 'run', coach['race']['targetTimeMinutes'])], (label, 'explicit race estimate'))
    check(row['proof']['verified'] and not row['proof']['problems'], (label, 'TS certificate'))
    return dict(id=label, weeks=horizon, status='accepted_complete_synthetic_reference',
                exactSourceArithmetic=True, verticalArithmetic=True, recoveryArithmetic=True,
                peakSources=peak, primaryKeyCoverage=quality_keys/keys,
                prescriptionAllowed=False, productionAllowed=False, scientificSessionValidation=False)


def main(path):
    rows = json.loads(Path(path).read_text())
    accepted = {r['id']:r for r in rows if r['valid']}
    check(set(accepted) == set(EXPECTED), 'three complete positive witnesses required')
    sources = load_sources()
    doctrine = (ROOT/'src/lib/zones/tfclDoctrine.ts').read_text()
    zones = dict(re.findall(r'id: "([^"]+)"[^\n]*zone: "(Z[1-6])"', doctrine))
    check(len(zones) == 11, 'complete doctrine extraction')
    results = [audit(r, sources, zones) for r in accepted.values()]
    negative_checks = 0
    for kind in ('unknown_descent', 'wrong_source_duration', 'flat_pace', 'missing_back_to_back'):
        row = copy.deepcopy(accepted['trail-mountain-16w'])
        target = next(s for s in row['plan']['weeks'][0]['sessions'] if s.get('catalogId'))
        if kind == 'unknown_descent':
            row['routes'][0]['dMinusM'] = None
        if kind == 'wrong_source_duration':
            target['durationMin'] += 1
        if kind == 'flat_pace':
            target['details'] += ' 300 sec_per_km'
        if kind == 'missing_back_to_back':
            row['coachReview']['backToBackApproved'] = False
        refused = False
        try:
            audit(row, sources, zones)
        except AssertionError:
            refused = True
        check(refused, ('independent negative must fail', kind))
        negative_checks += 1
    print(json.dumps(dict(referenceFamilies=3, completePlans=3, weeks=48, independentNegativeChecks=negative_checks,
                         results=results, syntheticOnly=True, scientificSessionValidation=False), ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
