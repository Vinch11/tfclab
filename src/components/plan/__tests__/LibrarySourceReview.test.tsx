import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LibrarySourceReview } from '../LibrarySourceReview';
import type { CoachAnswers } from '@/lib/det/athleteDetBridge';
import { familySourcePool } from '@/lib/det/familySourcePools';
const mocks = vi.hoisted(() => ({ result: { data: null, error: null } as { data: null; error: { message: string } | null }, insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const q = { select: () => q, returns: () => q, eq: () => q, order: () => q, limit: () => q,
    maybeSingle: async () => mocks.result, insert: mocks.insert };
  return q;
} } }));
const props = () => ({ pool: familySourcePool('marathon'), coachId: 'synthetic-coach', athleteId: 'synthetic-athlete',
  fingerprint: 'f'.repeat(64), answers: {} as CoachAnswers, guard: vi.fn(async () => null), onResolved: vi.fn() });
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.result = { data: null, error: null }; });
describe('human source review UI', () => {
  it('never records a review just by rendering or opening the reading sheet', async () => {
    render(<LibrarySourceReview {...props()} />);
    await screen.findByText(/Lire les .* séances et doses/);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('button', { name: 'Enregistrer ma revue' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByText(/Lire les .* séances et doses/));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('fails closed when the candidate database table is absent', async () => {
    mocks.result.error = { message: 'table absent' };
    render(<LibrarySourceReview {...props()} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('schéma candidat'));
    expect(screen.getByRole('button', { name: 'Enregistrer ma revue' }).hasAttribute('disabled')).toBe(true);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
