import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { qaEngineChoiceEnabled, QA_PLANNING_ORIGIN } from '../engineDispatch';
import { verifyQaCoach } from '@/pages/__qa/DetLabPage';
import { QA_COACHES } from '@/pages/__qa/ReadOnlyRlsAuditPage';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth } }));
const BACKEND = 'https://lkjesdacgpolrwfxulbo.supabase.co';

describe('compiled QA planning access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', BACKEND);
    vi.stubGlobal('location', new URL(QA_PLANNING_ORIGIN));
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: QA_COACHES.A.uid } } } });
    auth.getUser.mockResolvedValue({ data: { user: { id: QA_COACHES.A.uid, role: 'authenticated' } }, error: null });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('exposes DET in the exact compiled QA preview and preserves local development', () => {
    expect(qaEngineChoiceEnabled(false, BACKEND, QA_PLANNING_ORIGIN)).toBe(true);
    expect(qaEngineChoiceEnabled(true, BACKEND, 'http://localhost:8080')).toBe(true);
    expect(qaEngineChoiceEnabled(false, BACKEND)).toBe(false);
  });
  it.each([
    'https://tfclab.lovable.app', 'https://tfcl.twoforcoaching.be',
    'https://id-preview--c3941303-40d2-447e-9b87-867d82727fd1.lovable.app.evil.invalid',
    'http://id-preview--c3941303-40d2-447e-9b87-867d82727fd1.lovable.app',
    QA_PLANNING_ORIGIN + ':444',
  ])('refuses compiled planning at another origin: %s', async origin => {
    expect(qaEngineChoiceEnabled(false, BACKEND, origin)).toBe(false);
    vi.stubGlobal('location', new URL(origin));
    expect(await verifyQaCoach({ surface: 'planning' })).toHaveProperty('blocked');
    expect(auth.getSession).not.toHaveBeenCalled();
  });
  it.each([
    undefined, '', 'https://wtwjkmawntybyehatkjo.supabase.co',
    BACKEND + '.evil.invalid', 'https://lkjesdacgpolrwfxulbo.evil.invalid',
    'http://lkjesdacgpolrwfxulbo.supabase.co', BACKEND + '/other',
    BACKEND + '?project=qa', 'https://user@lkjesdacgpolrwfxulbo.supabase.co',
  ])('refuses a missing, production or lookalike backend: %s', backend => {
    expect(qaEngineChoiceEnabled(false, backend, QA_PLANNING_ORIGIN)).toBe(false);
    expect(qaEngineChoiceEnabled(true, backend, QA_PLANNING_ORIGIN)).toBe(false);
  });
  it('keeps the laboratory DEV-only, even in the compiled QA preview', async () => {
    expect(await verifyQaCoach()).toEqual({ blocked: 'Build non DEV.' });
    expect(auth.getSession).not.toHaveBeenCalled();
  });
  it.each(['A', 'B'] as const)('verifies Coach %s and returns only their fixed QA athlete', async key => {
    const { uid, athleteId } = QA_COACHES[key];
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: uid } } } });
    auth.getUser.mockResolvedValue({ data: { user: { id: uid, role: 'authenticated' } }, error: null });
    expect(await verifyQaCoach({ surface: 'planning' })).toEqual({ coach: key, userId: uid, athleteId });
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });
  it('refuses a missing session before querying the user', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await verifyQaCoach({ surface: 'planning' })).toHaveProperty('blocked');
    expect(auth.getUser).not.toHaveBeenCalled();
  });
  it.each([
    { data: { user: null }, error: new Error('denied') },
    { data: { user: { id: QA_COACHES.B.uid, role: 'authenticated' } }, error: null },
    { data: { user: { id: QA_COACHES.A.uid, role: 'anon' } }, error: null },
  ])('refuses an unverified, mismatched or non-authenticated user', async response => {
    auth.getUser.mockResolvedValue(response);
    expect(await verifyQaCoach({ surface: 'planning' })).toHaveProperty('blocked');
  });
  it('refuses another authenticated coach', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'other-coach' } } } });
    auth.getUser.mockResolvedValue({ data: { user: { id: 'other-coach', role: 'authenticated' } }, error: null });
    expect(await verifyQaCoach({ surface: 'planning' })).toEqual({ blocked: 'Compte hors Coach A/B QA.' });
  });
});
