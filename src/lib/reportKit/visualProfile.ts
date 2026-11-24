import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import {
  profileCurveHistory,
  CURVE_STATUS_LABELS,
  type ProfileCurveMetric,
} from '../coachingCompass/profileCurves';
import { storedTestCurves, TEST_CHANNELS } from '../coachingCompass/testCurves';
import { metricSourceLabel } from '../coachingCompass/presentation';
import { fmt } from '../coachingCompass/factorStates';
import { criticalFigure, pairedFigure } from './fieldFigures';
import { latestPairs } from '../diagnostic/durabilityDay';
import { reportFieldEvidence } from './fieldEvidence';
import { esc } from './index';
import { dateLabel, sportName } from './editions';
import { chartFigure, pace, rangeGauge, tracePlot } from './visualFigures';
import type { ReportBrief } from './reportBrief';
import type { PerformanceReportInput } from '../performanceReport/types';

type Sport = 'bike' | 'run';
interface Dossier {
  athlete: { id: string };
  effectiveSnapshot: DbSnapshot | null;
  snapshotHistory: DbSnapshot[];
  tests: DbTest[];
  reportBrief?: ReportBrief;
}
export interface VisualProfile {
  illustratedCritical?: Sport[];
  portrait: string;
  terrain: string;
  evolution: string;
  metabolism: string;
}
const valid = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;
const figureDate = (v: number) => dateLabel(new Date(v).toISOString().slice(0, 10));

function historyFigures(d: Dossier, sport: Sport, coach: boolean, includeShared: boolean): string {
  const metrics: ProfileCurveMetric[] = [
    'threshold',
    'vlamax',
    ...(includeShared ? ['vo2max' as const] : []),
  ];
  const views: string[] = [];
  for (const metric of metrics) {
    const series = profileCurveHistory(
      d.snapshotHistory,
      d.athlete.id,
      sport,
      metric,
      d.effectiveSnapshot?.date ?? null,
    );
    const values = series.filter((p) => valid(p.value) && Number.isFinite(Date.parse(p.date)));
    if (new Set(values.map((p) => p.date)).size < 2) continue;
    const first = values[0],
      last = values[values.length - 1];
    const runningPace = metric === 'threshold' && sport === 'run';
    const format = runningPace ? pace : fmt;
    const shown = (v: number) => (runningPace ? 3600 / v : v);
    const label =
      metric === 'threshold'
        ? sport === 'bike'
          ? 'FTP vélo'
          : 'Allure au seuil en course'
        : metric === 'vlamax'
          ? 'VLamax · ' + sportName[sport]
          : 'VO₂max du bilan';
    const unit =
      metric === 'threshold'
        ? runningPace
          ? 'min/km'
          : 'W'
        : metric === 'vo2max'
          ? 'ml/kg/min'
          : 'mmol/L/s';
    views.push(
      tracePlot({
        title: label,
        xLabel: 'Date du bilan',
        yLabel: unit,
        xText: figureDate,
        yText: format,
        scatter: true,
        traces: [
          {
            label,
            points: series.map((p) => ({
              x: Date.parse(p.date),
              y: valid(p.value) ? shown(p.value) : null,
              status: CURVE_STATUS_LABELS[p.status],
            })),
          },
        ],
        source: 'Bilans enregistrés · ' + values.length + ' valeurs',
        reading: `${dateLabel(first.date)} · ${format(shown(first.value!))} ${unit} (${CURVE_STATUS_LABELS[first.status]}). ${dateLabel(last.date)} · ${format(shown(last.value!))} ${unit} (${CURVE_STATUS_LABELS[last.status]}). ${runningPace ? 'Une durée plus courte par kilomètre correspond à une allure plus rapide.' : 'Comparer aussi le protocole et les conditions des tests.'}`,
      }),
    );
    if (!coach) break;
  }
  return views.join('');
}

function runningLandmarks(s: DbSnapshot): string {
  const rows = [
    { label: 'VMA', speed: s.vma },
    {
      label: 'Allure au seuil',
      speed: valid(s.pace_threshold_sec_per_km) ? 3600 / s.pace_threshold_sec_per_km : null,
    },
  ].filter((r): r is { label: string; speed: number } => valid(r.speed));
  if (!rows.length) return '';
  const maximum = Math.max(...rows.map((r) => r.speed)) * 1.08;
  const diagram = rows
    .map(
      (r) =>
        `<div class="landmark"><div><b>${r.label}</b><strong>${pace(3600 / r.speed)} <small>min/km</small></strong></div><div class="landmark-rail"><i style="width:${(r.speed / maximum) * 100}%"></i></div><small>${fmt(r.speed)} km/h</small></div>`,
    )
    .join('');
  return chartFigure(
    'De la vitesse maximale à l’allure soutenue',
    diagram,
    'Les barres comparent des vitesses sur une même échelle, à partir de zéro. Le temps par kilomètre permet de retrouver ces repères sur la montre.',
    'Repères enregistrés · course à pied',
  );
}

function bikeLandmarks(s: DbSnapshot): string {
  const efforts = [
    [5, s.pmax_5s],
    [30, s.p30s_w],
    [60, s.p60s_w],
    [300, s.map5min_w],
  ] as const;
  const points = efforts.flatMap(([x, y]) => (valid(y) ? [{ x, y }] : []));
  return tracePlot({
    title: 'Des accélérations aux efforts soutenus',
    xLabel: 'Durée (min:s)',
    xText: pace,
    yLabel: 'Puissance (W)',
    scatter: true,
    traces: [{ label: 'Puissance par durée', points }],
    source: 'Valeurs enregistrées · vélo',
    guides: valid(s.ftp) ? [{ value: s.ftp, label: 'FTP du bilan' }] : [],
    reading: points.length
      ? 'De ' +
        pace(points[0].x) +
        ' à ' +
        pace(points[points.length - 1].x) +
        ', chaque point correspond à la puissance consignée pour cette durée. La FTP donne un autre repère pour les efforts prolongés.'
      : '',
  });
}

function bodyComposition(s: DbSnapshot): string {
  if (!valid(s.weight_kg) || !valid(s.fat_pct) || s.fat_pct >= 100) return '';
  const fat = (s.weight_kg * s.fat_pct) / 100;
  const body = `<div class="body-rail"><i style="width:${s.fat_pct}%"></i></div><div class="plot-key"><span><i style="background:#147e76"></i>Masse grasse · ${fmt(fat)} kg</span><span><i style="background:#1669a8"></i>Masse non grasse · ${fmt(s.weight_kg - fat)} kg</span></div>`;
  return chartFigure(
    'Composition corporelle du bilan',
    body,
    `Masse totale ${fmt(s.weight_kg)} kg, dont ${fmt(s.fat_pct)} % de masse grasse enregistrée. Les masses en kilogrammes sont calculées à partir de ces deux entrées.`,
    'Bilan du ' + dateLabel(s.date),
  );
}

function testFigure(d: Dossier, sport: Sport, coach: boolean): string {
  const tests = storedTestCurves(d.tests, d.athlete.id).filter(
    (t) => t.sport === sport && (!d.effectiveSnapshot || t.date <= d.effectiveSnapshot.date),
  );
  for (const t of tests) {
    const figures: string[] = [];
    for (const ch of t.channels) {
      const convert = (n: number | null) => (ch === 'speed' ? (valid(n) ? 3600 / n : null) : n);
      const points = t.points.map((p) => ({ x: p.x, y: convert(p[ch]) }));
      const vals = points.filter((p) => p.y != null);
      if (vals.length < 2) continue;
      const label = TEST_CHANNELS[ch];
      const display = ch === 'speed' ? pace : fmt;
      const unit = ch === 'speed' ? 'min/km' : label.unit;
      const low = vals.reduce((a, b) => (a.y! < b.y! ? a : b)).y!,
        high = vals.reduce((a, b) => (a.y! > b.y! ? a : b)).y!;
      const figure = tracePlot({
        title: label.label + ' pendant le test',
        xLabel: t.axis === 'time' ? 'Temps écoulé (min:s)' : 'Numéro de tentative',
        xText: t.axis === 'time' ? pace : fmt,
        yLabel: unit,
        yText: display,
        traces: [{ label: label.label, points }],
        guides: t.thresholds
          .filter((g) => g.channel === ch && valid(g.value))
          .map((g) => ({ ...g, value: convert(g.value)! })),
        source: sportName[sport] + ' · ' + dateLabel(t.date) + (coach && t.sensor ? ' · ' + t.sensor : ''),
        reading:
          'Plage observée sur ce test · ' +
          display(low) +
          ' à ' +
          display(high) +
          ' ' +
          unit +
          '.' +
          (coach && t.protocol ? ' Protocole enregistré · ' + t.protocol + '.' : ''),
      });
      if (figure) figures.push(figure);
      if (!coach && figures.length) break;
    }
    if (figures.length) return figures.join('');
  }
  return '';
}

/** Intensité spécifique de l'épreuve (moteur de zones), lue sur la grille vélo du rapport. */
function raceBand(p: PerformanceReportInput): { low: number; high: number } | null {
  const bike = p.zoneSets?.find((set) => /v[ée]lo/i.test(set.sportLabel));
  const marker = bike?.markers?.find((m) => m.id === 'race_specific')?.absolute;
  const m = marker?.match(/^(\d+)\s*[–-]\s*(\d+)\s*W$/);
  return m ? { low: Number(m[1]), high: Number(m[2]) } : null;
}

function interpolate(curve: PerformanceReportInput['curve'], power: number, key: 'carbGh' | 'fatGh'): number | null {
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    if (power >= a.power && power <= b.power) {
      const t = b.power === a.power ? 0 : (power - a.power) / (b.power - a.power);
      return a[key] + t * (b[key] - a[key]);
    }
  }
  return null;
}

function metabolicFigures(p: PerformanceReportInput, coach: boolean): string {
  if (!p.sports?.includes('bike') || !valid(p.physio.ftp) || !p.curve || p.curve.length < 3) return '';
  const curve = p.curve.filter((pt) => valid(pt.power));
  if (curve.length < 3) return '';
  const source =
    'Modèle TFCL · vélo · VO₂max ' +
    fmt(p.physio.vo2max!) +
    ' ml/kg/min · VLamax ' +
    fmt(p.physio.vlamax!) +
    ' mmol/L/s · rendement 23 %';
  const fields = (key: 'fatGh' | 'carbGh' | 'lactate' | 'production' | 'clearance') =>
    curve.map((pt) => ({ x: pt.power, y: pt[key] }));
  const peak = curve.reduce((a, b) => (a.fatGh > b.fatGh ? a : b));
  // Plateau lipidique : puissances où l'oxydation reste à ≥ 90 % du maximum tracé. Le repère
  // FatMax du profil (jauge et zones) se lit dans cette fenêtre au lieu d'un second « pic ».
  const plateau = curve.filter((pt) => pt.fatGh >= peak.fatGh * 0.9).map((pt) => pt.power);
  const fatMaxW = valid(p.physio.fatMaxW) ? p.physio.fatMaxW : null;
  const race = raceBand(p);
  const carbAt = (w: number) => interpolate(curve, w, 'carbGh');
  const raceCarbs = race ? [carbAt(race.low), carbAt(race.high)] : null;
  // Édition coach : on parle de l'athlète ; édition athlète : tutoiement.
  const w = coach
    ? { fatMax: 'Repère FatMax', fatMaxText: 'Le repère FatMax', race: 'À la puissance de course visée', tolerance: 'sa tolérance digestive' }
    : { fatMax: 'Ton repère FatMax', fatMaxText: 'Ton repère FatMax', race: 'À ta puissance de course visée', tolerance: 'ta tolérance digestive' };
  const fuel = tracePlot({
    title: 'À quelle puissance changent les carburants utilisés ?',
    xLabel: 'Puissance (W)',
    yLabel: 'Oxydation (g/h)',
    xGuides: [
      fatMaxW ? { value: fatMaxW, label: w.fatMax, unit: 'W' } : { value: peak.power, label: 'Pic lipidique tracé', unit: 'W' },
      ...(race ? [{ value: Math.round((race.low + race.high) / 2), label: 'Puissance de course visée', unit: 'W' }] : []),
      { value: p.physio.ftp, label: 'FTP du bilan', unit: 'W' },
    ],
    traces: [
      { label: 'Lipides', points: fields('fatGh') },
      { label: 'Glucides', points: fields('carbGh') },
    ],
    source,
    reading: (fatMaxW
      ? `${w.fatMaxText} est de ${fmt(fatMaxW)} W. Sur la courbe du modèle, l’oxydation des graisses reste proche de son maximum (≈ ${fmt(peak.fatGh)} g/h) entre ${fmt(Math.min(...plateau))} et ${fmt(Math.max(...plateau))} W. `
      : `Parmi les intensités tracées, le maximum d’oxydation lipidique est de ${fmt(peak.fatGh)} g/h à ${fmt(peak.power)} W. `)
      + (race && raceCarbs && raceCarbs.every((v) => v != null)
        ? `${w.race} (${fmt(race.low)}–${fmt(race.high)} W), le modèle estime une consommation de glucides d’environ ${fmt(Math.round(raceCarbs[0]!))}–${fmt(Math.round(raceCarbs[1]!))} g/h. C’est la dépense, pas la quantité à avaler : le ravitaillement se construit à l’entraînement selon ${w.tolerance}.`
        : 'La courbe glucides décrit la consommation estimée pendant l’effort. Le ravitaillement dépend aussi de la durée et de la tolérance digestive.'),
  });
  if (!coach) return fuel;
  const lac = tracePlot({
    title: 'Lactatémie selon la puissance',
    xLabel: 'Puissance (W)',
    yLabel: 'Lactate (mmol/L)',
    source,
    xGuides: valid(p.physio.mlssW) ? [{ value: p.physio.mlssW, label: 'MLSS modélisé', unit: 'W' }] : [],
    traces: [{ label: 'Lactatémie modélisée', points: fields('lactate') }],
    reading: `Chaque point vient du modèle. ${valid(p.physio.mlssW) ? 'Le MLSS vélo estimé est de ' + fmt(p.physio.mlssW) + ' W. ' : ''}Un test par paliers avec prélèvements permet de confronter la forme de cette courbe aux réponses de l’athlète.`,
  });
  const kinetics = tracePlot({
    title: 'Production et élimination du lactate',
    xLabel: 'Puissance (W)',
    yLabel: 'Débit (mmol/L/min)',
    source,
    xGuides: valid(p.physio.mlssW) ? [{ value: p.physio.mlssW, label: 'MLSS modélisé', unit: 'W' }] : [],
    traces: [
      { label: 'Production estimée', points: fields('production') },
      { label: 'Élimination à 4 mmol/L', points: fields('clearance') },
    ],
    reading:
      'L’élimination est simulée pour une lactatémie fixée à 4 mmol/L. L’écart entre les lignes dépend de cette hypothèse et du profil utilisé.',
  });
  const anchors = curve.filter((_, i) => i === 0 || i === curve.length - 1 || i % 5 === 0);
  return (
    fuel +
    lac +
    kinetics +
    `<table class="lab-data"><caption>Paliers du modèle vélo</caption><thead><tr><th>Puissance</th><th>Lactate</th><th>Lipides</th><th>Glucides</th></tr></thead><tbody>${anchors.map((pt) => `<tr><td>${fmt(pt.power)} W</td><td>${fmt(pt.lactate)} mmol/L</td><td>${fmt(pt.fatGh)} g/h</td><td>${fmt(pt.carbGh)} g/h</td></tr>`).join('')}</tbody></table>`
  );
}

export function buildVisualProfile(d: Dossier, p: PerformanceReportInput, coach: boolean): VisualProfile {
  const sports = p.sports ?? [];
  const gauges = (d.reportBrief?.sections ?? [])
    .map(({ sport, rows }) => {
      const axes = p.sportComparisons?.[sport] ?? [];
      // Édition athlète en triathlon : la VO₂max commune n'apparaît qu'une fois (cadran vélo).
      const sharedVo2 = !coach && sport === 'run' && sports.includes('bike');
      const cards = rows
        .filter((r) => r.key !== 'demand' && !(sharedVo2 && r.key === 'vo2max'))
        .map((r) => {
          const axis =
            axes.find((a) => a.key === r.key) ??
            (r.key === 'tte' ? p.sportTte?.find((t) => t.sport === sport) : undefined);
          return rangeGauge(
            r,
            axis?.value === r.value && axis.source ? metricSourceLabel(axis.source) : undefined,
            !coach,
          );
        })
        .filter(Boolean);
      return cards.length
        ? `<div class="gauge-sport"><h3>${sportName[sport]}</h3><div class="lab-gauges">${cards.join('')}</div></div>`
        : '';
    })
    .join('');
  const snapshot = d.effectiveSnapshot?.athlete_id === d.athlete.id ? d.effectiveSnapshot : null;
  const { critical } = reportFieldEvidence(snapshot);
  const pairs = snapshot ? latestPairs(d.tests, d.athlete.id, snapshot.date) : [];
  const terrain = sports
    .map(
      (sport) =>
        (snapshot ? (sport === 'run' ? runningLandmarks(snapshot) : bikeLandmarks(snapshot)) : '') +
        (snapshot ? criticalFigure(sport === 'bike' ? critical.cycling : critical.running, sport,
          d.reportBrief?.sections.find(s => s.sport === sport)?.rows ?? [], coach) : '') +
        pairedFigure(pairs.find(pair => pair.sport === sport), coach) +
        testFigure(d, sport, coach),
    )
    .join('');
  return {
    illustratedCritical: sports.filter(sport => {
      const metric = sport === 'bike' ? critical.cycling : critical.running;
      return metric && metric.coachReview?.verdict !== 'reject';
    }),
    portrait: gauges + (coach && snapshot ? bodyComposition(snapshot) : ''),
    terrain,
    evolution: sports.map((sp, i) => historyFigures(d, sp, coach, i === 0)).join(''),
    metabolism: metabolicFigures(p, coach),
  };
}

export function visualChapter(id: string, title: string, deck: string, content: string): string {
  return content
    ? `<section class="edition-section visual-chapter" id="${esc(id)}"><h2>${esc(title)}</h2><p class="edition-deck">${esc(deck)}</p>${content}</section>`
    : '';
}
