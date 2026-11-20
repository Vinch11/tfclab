import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompassPerformanceComparison } from '../CompassPerformanceComparison';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
const input = { athleteId: 'A', objectif: 'Marathon', ambition: 'competitor', athleteAge: 42, athleteSex: 'F', vma: 14, vo2max: 47, paceThresholdSecPerKm: 290 } as CoachingCompassInput;
afterEach(cleanup);
describe('Compass goal interaction', () => {
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
