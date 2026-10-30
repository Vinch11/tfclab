import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import D1BlockPanel from './D1BlockPanel';
import { d1Fixture, d1Profiles } from '@/lib/plan/d1/fixtures';
it('executes the real generator from the interface without model access', () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('NETWORK_FORBIDDEN'); });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    for (const profile of d1Profiles) {
      const fixture = d1Fixture(profile);
      const view = render(<D1BlockPanel {...fixture} />);
      fireEvent.click(screen.getByRole('button', { name: 'Générer le bloc sans IA' }));
      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sauvegarde indisponible/ })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Notes de revue coach'), { target: { value: 'Revue D1' } });
      expect(screen.getByLabelText('Notes de revue coach')).toHaveValue('Revue D1');
      view.unmount();
    }
    expect(fetch).not.toHaveBeenCalled();
  } finally { fetch.mockRestore(); log.mockRestore(); warn.mockRestore(); }
}, 120000);
