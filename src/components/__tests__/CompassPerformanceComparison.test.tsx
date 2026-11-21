import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompassPerformanceComparison } from '../CompassPerformanceComparison';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
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
    const rows = screen.getByRole('list', { name: 'Écarts classés pour le coach' }).querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('VLamax · écart au repère +40 %');
    expect(rows[0]).toHaveTextContent('Hypothèse');
    expect(rows[1]).toHaveTextContent('VMA · écart au repère -12 %');
  });
  it('saves an explicit target, and never prefills the predicted race time', async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<CompassPerformanceComparison input={{ ...input, targetRacePrediction: { targetRaceDurationMin: 190, source: 'daniels_scenario', confidence: .8, reference: '' } }} onSave={save} />);
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
  const chart = screen.getByRole('figure', { name: 'Temps tenu au seuil' });
  expect(chart).toHaveTextContent('Au moins 25 min');
  expect(chart).toHaveTextContent('Repère de coaching40 min');
  view.rerender(<CompassPerformanceComparison input={{ ...input, limiterResult: { ...limiter, gapAnalysis: [{ ...duration, fieldBoundsConflict: true, fieldEstimateNote: 'Observations contradictoires.' }] } }} />);
  expect(screen.queryByRole('figure', { name: 'Temps tenu au seuil' })).toBeNull();
  expect(screen.getByText('Observations contradictoires.')).toBeInTheDocument();
});

it('shows a triathlete’s actual markers before the detailed form even without a ranked limiter', () => {
  render(<CompassPerformanceComparison input={{ ...input, objectif:'IM', sportFocus:'triathlon', ftp:230, css:100, limiterResult:{primaryLimiter:'none', confidence:0, gapAnalysis:[], limiterLabel:'Aucun écart prioritaire établi sur les valeurs disponibles'} }} />);
  expect(screen.getByRole('figure',{name:'Vélo'})).toHaveTextContent('230');
  expect(screen.getByRole('figure',{name:'Natation'})).toHaveTextContent('1:40');
  expect(screen.queryByText(/Aucun écart prioritaire/)).toBeNull();
  const details=screen.getByText('Objectif chrono et comparaison détaillée').closest('details');
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button',{name:'Préciser l’objectif'}));
  expect(details).toHaveAttribute('open');
});
