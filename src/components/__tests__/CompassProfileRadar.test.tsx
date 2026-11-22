import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CompassProfileRadar } from '../CompassProfileRadar';
import { compareProfileAxis } from '@/lib/coachingCompass/profileComparison';
import type { CoachingCompassInput, RadarAxis } from '@/lib/coachingCompass/types';

const athlete = { objectif: 'IM', ambition: 'competitor' } as CoachingCompassInput;
const axis = (key: string, value: number | null, target: number) => compareProfileAxis({
  key, value, target, label: key, shortLabel: key, score: 0, icon: '', color: '', unit: '', source: 'observed',
} as RadarAxis, 'run', athlete);
it.each([[.18, 'Sous la plage'], [.32, 'Dans la plage'], [.7, 'Au-dessus de la plage'], [null, 'À mesurer']] as const)(
  'plots the VLamax band with its independent athlete value %s', (value, label) => {
    render(<CompassProfileRadar metrics={[axis('tte', 47, 50), axis('vma', 14, 16), axis('vlamax', value, .32)]} />);
    const plot = screen.getByRole('img');
    const vla = within(plot).getByText('VLamax').parentElement!;
    expect(vla.querySelector('line.compass-radar-band')).toBeTruthy();
    expect(vla).toHaveTextContent(label);
    expect(Boolean(vla.querySelector('circle.compass-radar-dot'))).toBe(value != null);
  });
