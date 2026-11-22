import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeCoachingCompass } from '@/lib/coachingCompass';
import { CoachingCompassCard } from '../CoachingCompassCard';
import { CompassPerformanceComparison } from '../CompassPerformanceComparison';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
function DetailedComparison({ input }: { input: CoachingCompassInput }) {
  return <CompassPerformanceComparison input={input} presentation={computeCoachingCompass(input).presentation} />;
}
const input = { athleteId: 'A', objectif: 'Marathon', ambition: 'competitor', athleteAge: 42, athleteSex: 'F', vma: 14, vo2max: 47, paceThresholdSecPerKm: 290 } as CoachingCompassInput;
afterEach(cleanup);
describe('Compass goal interaction', () => {
  it('ranks all actionable and provisional field gaps by weighted impact', () => {
    const observed = { metric: 'VMA', gap: -2, gapPercent: -12, value: 14, weightedImpact: 10 };
    const estimated = { metric: 'VLamax', gap: .2, gapPercent: 40, value: .7, weightedImpact: 0, fieldHypothesisImpact: 15, prescriptionApplicable: false };
    const excluded = { metric: "W′ vélo", gap: -8, value: 12, weightedImpact: 30, prescriptionApplicable: false };
    render(<CompassPerformanceComparison input={{ ...input, limiterResult: {
      primaryLimiter: 'aerobic_engine', confidence: .7, categoryRanking: [{ category: 'aerobic', metrics: [observed] }],
      gapAnalysis: [observed, excluded, estimated],
    } }} />);
    const first = within(screen.getByRole('list', { name: 'Facteurs pour l’objectif' })).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('Profil glycolytique (VLamax)');
    expect(first).toHaveTextContent('Hypothèse à vérifier');
    fireEvent.click(screen.getByText('Voir les écarts chiffrés'));
    const rows = screen.getByRole('list', { name: 'Mesures qui expliquent les écarts' }).querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('VLamax · écart au repère +40 %');
    expect(rows[0]).toHaveTextContent('Hypothèse');
    expect(rows[1]).toHaveTextContent('VMA · écart au repère -12 %');
  });
  it('saves an explicit target, and never prefills the predicted race time', async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<CompassPerformanceComparison input={{ ...input, targetRacePrediction: { targetRaceDurationMin: 190, source: 'daniels_scenario', confidence: .8, reference: '' } }} onSave={save} />);
    expect(screen.getByLabelText('Projection de course')).toHaveTextContent('3 h 10');
    const field = screen.getByLabelText('Chrono total visé en minutes');
    expect(field).toHaveValue(null);
    fireEvent.change(field, { target: { value: '187' } });
    expect(screen.getByText(/Profil observé sur Marathon/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ minutes: 187 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Objectif enregistré');
  });
  it('requires a valid split and reports failed persistence honestly', async () => {
    const save = vi.fn().mockResolvedValue(false);
    render(<CompassPerformanceComparison input={{ ...input, objectif: 'IM' }} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Chrono total visé en minutes'), { target: { value: '600' } });
    fireEvent.change(screen.getByLabelText('Split course visé en minutes'), { target: { value: '650' } });
    expect(screen.getByRole('button', { name: 'Enregistrer l’objectif' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Split course visé en minutes'), { target: { value: '240' } });
    expect(screen.getByText(/Allure demandée : 5:41/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('non sauvegardé'));
  });
  it('resets drafts when the athlete scope changes', () => {
    const view = render(<CompassPerformanceComparison key="A:Marathon:competitor" input={input} />);
    fireEvent.change(screen.getByLabelText('Chrono total visé en minutes'), { target: { value: '187' } });
    view.rerender(<CompassPerformanceComparison key="B:IM:finisher" input={{ ...input, athleteId: 'B', objectif: 'IM', ambition: 'finisher' }} />);
    expect(screen.getByLabelText('Chrono total visé en minutes')).toHaveValue(null);
  });
});

it('shows a one-sided field duration and withholds the chart for conflicting efforts', () => {
  const duration = { metric: 'TTE', gap: -15, value: 25, target: 40, weightedImpact: 0, fieldBounds: { low: 25, high: null }, fieldEstimateNote: 'Effort continu sur home trainer.' };
  const limiter = { primaryLimiter: 'none', confidence: 0, gapAnalysis: [duration] };
  const view = render(<CompassPerformanceComparison input={{ ...input, limiterResult: limiter }} />);
  fireEvent.click(screen.getByText('Voir les écarts chiffrés'));
  const chart = screen.getByRole('figure', { name: 'Temps tenu au seuil' });
  expect(chart).toHaveTextContent('Au moins 25 min');
  expect(chart).toHaveTextContent('Repère de coaching40 min');
  view.rerender(<CompassPerformanceComparison input={{ ...input, limiterResult: { ...limiter, gapAnalysis: [{ ...duration, fieldBoundsConflict: true, fieldEstimateNote: 'Observations contradictoires.' }] } }} />);
  expect(screen.queryByRole('figure', { name: 'Temps tenu au seuil' })).toBeNull();
  expect(screen.getByText('Observations contradictoires.')).toBeInTheDocument();
});

it('shows a triathlete’s actual markers before the detailed form even without a ranked limiter', () => {
  render(<CompassPerformanceComparison input={{ ...input, objectif:'IM', sportFocus:'triathlon', ftp:230, css:100, limiterResult:{primaryLimiter:'none', confidence:0, gapAnalysis:[], limiterLabel:'Aucun écart prioritaire établi sur les valeurs disponibles'} }} />);
  expect(screen.getByText('Chrono et repères par discipline').closest('details')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('Chrono et repères par discipline'));
  expect(screen.getByRole('figure',{name:'Vélo'})).toHaveTextContent('230');
  expect(screen.getByRole('figure',{name:'Natation'})).toHaveTextContent('1:40');
  expect(screen.queryByText(/Aucun écart prioritaire/)).toBeNull();
  const details=screen.getByText('Comparer avec un objectif personnel (facultatif)').closest('details');
  expect(details).not.toHaveAttribute('open');
  expect(screen.queryByRole('button',{name:'Préciser l’objectif'})).toBeNull();
  expect(screen.getByLabelText('Projection de course')).toBeVisible();
  fireEvent.click(screen.getByText('Comparer avec un objectif personnel (facultatif)'));
  expect(details).toHaveAttribute('open');
});

it('distinguishes a general triathlon time from an individual forecast', () => {
  render(<CompassPerformanceComparison input={{ ...input, objectif:'IM', targetRacePrediction:{targetRaceDurationMin:660,source:'triathlon_baseline',confidence:.45} }} />);
  expect(screen.getByLabelText('Projection de course')).toHaveTextContent('Temps indicatif du format');
  expect(screen.getByLabelText('Projection de course')).toHaveTextContent('11 h 00');
  expect(screen.getByLabelText('Chrono total visé en minutes')).toHaveValue(null);
});

it('shows sport-specific rankings without a global limiter or goal time', () => {
  render(<DetailedComparison input={{ ...input, objectif: 'IM', sportFocus: 'triathlon',
    ftp: 180, poids: 78, vma: 11, limiterResult: null, vlamaxEffectif: {value: 0.35, source: "test", confidence: 0.8},
    tteEffectif: {tte_min: 15, source: 'test', confidence: 0.8},
    tteEffectifRun: {tte_min: 20, source: "test", confidence: 0.8},
  }} />);
  expect(screen.getByRole('heading', {name:'Hiérarchie des limiteurs'})).toBeVisible();
  const ranking = screen.getByRole('list', {name:'Facteurs pour l’objectif'});
  expect(ranking).toHaveTextContent('Vélo');
  expect(ranking).toHaveTextContent('Course à pied');
  const gaps = Array.from(ranking.querySelectorAll('li'), row =>
    Number(row.textContent?.match(/([\d,]+) %/)?.[1].replace(',', '.')));
  expect(gaps.length).toBeGreaterThan(1);
  expect(gaps).toEqual([...gaps].sort((a,b) => b-a));
  expect(screen.queryByText('Aucune priorité étayée disponible')).toBeNull();
});

it('retains ranked measured categories below the plan activation threshold', () => {
  const metric = { metric:'VMA', gap:-1, value:14, weightedImpact:4 };
  render(<CompassPerformanceComparison input={{ ...input, limiterResult: {
    primaryLimiter:'none', confidence:0.8, categoryRanking:[{category:'aerobic', metrics:[metric]}], gapAnalysis:[metric],
  } }} />);
  expect(screen.getByRole('list', {name:'Facteurs pour l’objectif'})).toHaveTextContent('VMA');
  expect(screen.getByText('Écarts modestes à suivre')).toBeVisible();
});

it('puts a borderline sprint profile and a modest aerobic gap side by side before opening any details', () => {
  const vma = { metric: 'VMA', gap: -0.7, value: 17, target: 17.7, weightedImpact: 3.6 };
  const vla = { metric: 'VLamax', gap: .14, value: .59, target: .45, coachingRange: { min: .35, max: .60 }, weightedImpact: 0, prescriptionApplicable: false };
  const runner: CoachingCompassInput = { ...input, objectif: '10K', sportFocus: 'run',
    tteEffectif: { tte_min: 0, confidence: 0, source: 'unknown' },
    vlamaxEffectif: { value: .59, range: { low: .54, high: .64 }, date: '2025-07-10', source: 'estimated', confidence: .4 },
    latestVlamaxTest: { sport: 'run', date: '2025-06-10', value: .69, lactate: false },
    limiterResult: { primaryLimiter: 'none', categoryRanking: [{ category: 'aerobic_power', metrics: [vma] }], gapAnalysis: [vma, vla], confidence: .5 },
  };
  const view = render(<DetailedComparison input={runner} />);
  expect(screen.getByRole('heading', { name: 'Deux facteurs à départager' })).toBeVisible();
  expect(screen.getByText('Profil glycolytique (VLamax)')).toBeVisible();
  expect(screen.getByText(/0,54–0,64/)).toBeVisible();
  expect(screen.getByText(/Estimation de terrain enregistrée le 10.06.2025/)).toBeVisible();
  expect(screen.getByText('Vitesse maximale aérobie (VMA)')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Voir le protocole' })).toHaveAttribute('href', expect.stringContaining('run_vlamax'));
  view.rerender(<DetailedComparison input={{ ...runner, latestVlamaxTest: { ...runner.latestVlamaxTest!, sport: 'bike' } }} />);
  expect(screen.queryByText('Deux facteurs à départager')).toBeNull();
  expect(screen.queryByText(/Estimation de terrain enregistrée le 10.06.2025/)).toBeNull();
});

it('keeps a strong measured glycolytic priority first with an isolated VMA gap below it', () => {
  const test = { metric: 'VLamax', value: .78, target: .45, coachingRange: { min: .35, max: .60 }, gap: .33, weightedImpact: 30 };
  const speed = { metric: 'VMA', value: 15, target: 17, gap: -2, weightedImpact: 10 };
  render(<CompassPerformanceComparison input={{ ...input, objectif: '10K', sportFocus: 'run', limiterResult: {
    primaryLimiter: 'glycolytic', confidence: .8,
    categoryRanking: [{ category: 'glycolytic', metrics: [test] }, { category: 'aerobic_power', metrics: [speed] }],
    gapAnalysis: [speed, test],
  } }} />);
  const rows = within(screen.getByRole('list', {name: 'Facteurs pour l’objectif'})).getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('Profil glycolytique (VLamax)');
  expect(rows[0]).toHaveTextContent('0,78 mmol/L/s');
  expect(rows[1]).toHaveTextContent('VMA');
  expect(screen.queryByText('Deux facteurs à départager')).toBeNull();
});

it('keeps a near-target FTP out of the Ironman hierarchy and links the running TTE to its own protocol', () => {
  render(<DetailedComparison input={{ ...input, objectif: 'IM', ambition: 'competitor', sportFocus: 'triathlon',
    athleteAge: 52, performanceGoal: { minutes: 750 }, ftp: 290, poids: 80, vo2max: 52,
    limiterResult: null, tteEffectifRun: { tte_min: 40, source: 'observed', confidence: .9 },
    tteEffectif: { tte_min: 0, source: 'unknown', confidence: 0 },
    vlamaxEffectif: { value: null, source: 'unknown', confidence: 0 },
  }} />);
  const ranking = screen.getByRole('list', { name: 'Facteurs pour l’objectif' });
  expect(within(ranking).getAllByRole('listitem')).toHaveLength(1);
  expect(within(ranking).getByRole('img', { name: /TTE.*40 min.*52 min/ })).toBeVisible();
  expect(ranking).toHaveTextContent('12 min sous le repère');
  expect(screen.getByText('Objectif · 12 h 30')).toBeVisible();
  expect(screen.getByRole('link', {name: 'Voir le protocole'})).toHaveAttribute('href', '/diagnostic/tests?module=hold-run');
});

it('opens the September Compass on its radar and four coaching levels', () => {
  render(<CoachingCompassCard input={{ ...input, sportFocus: 'run',
    vlamaxEffectif: { value: .5, confidence: .8, source: 'test' },
    tteEffectif: { tte_min: 45, confidence: .8, source: 'observed' },
  }} />);
  for (const level of ['Profil physiologique', 'Limiteur principal', 'Levier prioritaire', 'Décision coaching']) {
    expect(screen.getByText(new RegExp('Niveau [1-4] — ' + level))).toBeVisible();
  }
  expect(screen.queryByRole('tablist')).toBeNull();
});

it('shows the running TTE in the September flow when the unified label is inconclusive', () => {
  const tri: CoachingCompassInput = { ...input, objectif: 'IM', sportFocus: 'triathlon', vma: null, vo2max: null,
    vlamaxEffectif: { value: null, confidence: 0, source: 'unknown' },
    tteEffectif: { tte_min: 80, confidence: .5, source: 'estimated' },
    tteEffectifRun: { tte_min: 30, confidence: .9, source: 'observed' },
    limiterResult: { primaryLimiter: 'none', limiterLabel: 'Priorité à préciser sur le terrain', gapAnalysis: [], confidence: .5 },
  };
  render(<CoachingCompassCard input={tri} />);
  const run = screen.getByRole('region', { name: 'Profil course', hidden: true });
  expect(within(run).getByText('30 min')).toBeInTheDocument();
  expect(screen.queryByText('80 min')).toBeNull();
  expect(screen.queryByText('Priorité à préciser sur le terrain')).toBeNull();
  expect(screen.getByRole('link', {name: 'Voir le protocole'})).toHaveAttribute('href', '/diagnostic/tests?module=hold-run');
  expect(screen.getAllByText(/Endurance au seuil course/).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('img', { hidden:true })[0].textContent).not.toContain('W′');
});

it('changes the published marathon comparison with the saved time and the coaching TTE with ambition', () => {
  const runner = { ...input, sportFocus: 'run' as const, performanceGoal: {minutes:187},
    vlamaxEffectif: { value: .4, confidence: .7, source: 'estimated' }, tteEffectif: { tte_min: 40, source:'observed', confidence:.9 } };
  const view = render(<CoachingCompassCard input={runner} />);
  expect(screen.getByText(/Groupe 3 h–3 h 30/)).toBeVisible();
  const first = screen.getByRole('img', {name:/Profil physiologique/}).textContent;
  view.rerender(<CoachingCompassCard input={{ ...runner, ambition:'finisher', performanceGoal: {minutes:250} }} />);
  expect(screen.getByText(/Groupe 4 h–4 h 30/)).toBeVisible();
  expect(screen.getByRole('img', {name:/Profil physiologique/}).textContent).not.toEqual(first);
});

it('compares the observed run TTE with a small bike gap using the objective weight', () => {
  const power = {metric:'FTP/kg', value:3.7, target:3.75, weightedImpact:.4, gap:-.05};
  const result = {primaryLimiter:'none', confidence:.7, categoryRanking:[{category:'aerobic_power', metrics:[power]}],
    gapAnalysis:[power, { metric:'TTE', value:null, gap:0, weightedImpact:0, weight:.3 }]};
  render(<CoachingCompassCard input={{ ...input, objectif:'IM', sportFocus:'triathlon',
    vlamaxEffectif:{value:null,source:'unknown',confidence:0}, tteEffectif:{tte_min:0,source:'unknown',confidence:0},
    tteEffectifRun:{tte_min:30,confidence:.9,source:'observed'}, limiterResult:result }} />);
  expect(screen.getByRole('link',{name:'Voir le protocole'})).toHaveAttribute('href','/diagnostic/tests?module=hold-run');
  expect(screen.getByText('Autres facteurs classés')).toBeVisible();
});
