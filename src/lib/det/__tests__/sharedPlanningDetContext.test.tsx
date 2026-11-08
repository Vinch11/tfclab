import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AthleteDetSimplePanel } from '@/components/plan/AthleteDetSimplePanel';
import { planningDraftStorage } from '@/lib/plan/planningFormDraft';
import { sharedPlanningDetContext } from '../sharedPlanningDetContext';
import type { FrozenAppPlanningInput } from '../appPlanningInput';
import type { AthleteRecordView, CoachAnswers, PlanFormView } from '../athleteDetBridge';

export const record: AthleteRecordView = {
  athleteId: 'SYNTH_A', coachId: 'SYNTH_COACH', birthDate: '1990-01-01', sex: 'M',
  refs: { vma: 18, ftp: 300, css: 95, vo2max: 58, weightKg: 72, fcMax: 188,
    sources: { vma: 'snapshot', ftp: 'snapshot', css: 'snapshot', vo2max: 'snapshot', weightKg: 'snapshot', fcMax: 'snapshot' } },
  snapshot: { date: '2026-11-04', pace_threshold_sec_per_km: 240, fatigue_state: 'ok' }, diagnosticLimiters: ['VLamax'],
};
export const form: PlanFormView = { objective: '70.3', planStartDate: '2026-11-09', raceDate: '', weeksAvailable: 0, weeklyHours: 0, sessionsPerWeek: 0, strengthSessionsPerWeek: 2, maxSessionsPerDay: 3, ambition: 'competitor' };
export const empty = (): CoachAnswers => ({ provenance: {}, entered: {}, swimPaces: {}, athleteLevel: '', recentLoad: '', fatigue: '', injuryScreen: '', general: {}, prerequisitesAllMet: false, unmetPrerequisites: [], contraindicationsAllAbsent: false, presentContraindications: [], strengthLoadAndRpeConfirmed: false, clock: { timeZone: 'Europe/Brussels', bySport: {} }, bricksConfirmed: false, coachLimiterOrder: null });
export const app = (): FrozenAppPlanningInput => ({ source: 'app_planning_pipeline', athleteId: record.athleteId, fingerprint: 'a'.repeat(64), athlete: { ftp: 300, vma: 18, css: 95 },
  config: { objective: '70.3', planStartDate: '2026-11-09', raceDate: '2027-01-31', weeksAvailable: 12, weeklyHours: 10, sessionsPerWeek: 8, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: 'age_group',
    ambitionMeta: { saisie: 'competitor', effective: 'age_group', saisieLabel: 'Compétiteur', effectiveLabel: 'Confirmé', downgraded: true, trainingLevel: 'trained', trainingLevelSource: 'manual', diagnosticNote: null },
    constraints: 'Pas de vélo le mardi', identifiedLimitersRaw: ['VLamax'] },
  limiters: { appAutomatic: ['VLamax'], coachOverride: null, applied: ['VLamax'], origin: 'app_automatic' },
});

describe('reuse of the shared planning configuration for DET', () => {
  it('uses effective Auto values and adjusted ambition, without mutating the shared input', () => {
    const input = app(), before = JSON.stringify(input);
    const out = sharedPlanningDetContext(record, form, input, empty());
    expect(out.form).toMatchObject({ weeksAvailable: 12, weeklyHours: 10, sessionsPerWeek: 8, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: 'age_group', raceDate: '2027-01-31' });
    expect(out.answers.athleteLevel).toBe('trained');
    expect(out.inheritedLevel).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    expect(input.config.constraints).toBe('Pas de vélo le mardi');
  });
  it('preserves zero strength and other explicit effective settings', () => {
    const input = app(); const noStrength = { ...input, config: { ...input.config, strengthSessionsPerWeek: 0 } };
    expect(sharedPlanningDetContext(record, form, noStrength, empty()).form.strengthSessionsPerWeek).toBe(0);
  });
  it('does not turn a prudent fallback or an ambition into a known athlete level', () => {
    const input = app();
    const fallback = { ...input, config: { ...input.config, ambitionMeta: { ...input.config.ambitionMeta!, trainingLevelSource: 'fallback-prudent' as const } } };
    const out = sharedPlanningDetContext(record, form, fallback, empty());
    expect(out.inheritedLevel).toBe(false); expect(out.answers.athleteLevel).toBe('');
  });
  it('keeps qualitative load, fatigue, injury, provenance, clocks and all approvals unanswered', () => {
    const input = app(); const out = sharedPlanningDetContext(record, form, { ...input, config: { ...input.config, recentLoad: { source: 'SNAPSHOT', tss7d: 400, status: 'optimal', label: '7 days', recommendation: '', target: { min: 200, opt: 400, max: 600 } } } }, empty());
    expect(out.answers).toEqual({ ...empty(), athleteLevel: 'trained' });
    expect(out.answers.general).toEqual({}); expect(out.answers.clock.bySport).toEqual({});
  });
  it('does not reuse the profile of another athlete or a missing frozen context', () => {
    for (const input of [null, { ...app(), athleteId: 'SYNTH_B' }]) {
      const answers = empty(), out = sharedPlanningDetContext(record, form, input, answers);
      expect(out.shared).toBe(false); expect(out.form).toBe(form); expect(out.answers).toBe(answers);
    }
  });
  it('retains actual coach answers and all declared intermediate goals', () => {
    const input = app(), answers = { ...empty(), recentLoad: 'moderate' as const, fatigue: 'fatigued' as const };
    const goals = [{ objective: '10 km', raceDate: '2026-12-06', priority: 'C' as const }];
    const out = sharedPlanningDetContext(record, form, { ...input, config: { ...input.config, raceGoals: goals } }, answers);
    expect(out.answers).toEqual({ ...answers, athleteLevel: 'trained' });
    expect(out.form.raceGoals).toEqual(goals); expect(out.form.raceGoals).not.toBe(goals);
  });
});

const db = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: db }));
vi.mock('@/components/plan/LibrarySourceReview', () => ({ LibrarySourceReview: () => null }));
vi.mock('@/components/plan/AthleteSourceReview', () => ({ AthleteSourceReview: () => null }));
vi.mock('@/lib/det/familySourcePools', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/det/familySourcePools')>(), poolLibraryProblems: async () => [] }));

beforeEach(() => {
  localStorage.clear();
  const chain = { select: () => chain, eq: () => chain, is: () => chain, order: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }) };
  db.from.mockReturnValue(chain); db.insert.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('coach panel with inherited configuration', () => {
  const props = () => ({ record, form, appInput: app(), appInputStatus: 'ready' as const, engine: 'det' as const,
    guard: vi.fn(async () => null), sourcesVersion: 'a'.repeat(64), engineVersion: 'a'.repeat(64), releaseId: null, onOutcome: vi.fn(), onAIShared: vi.fn(async () => {}) });
  it('labels the inherited undefined frequency as Auto rather than missing input',()=>{
    const p=props();
    const input={...p.appInput,config:{...p.appInput.config,sessionsPerWeek:undefined}};
    render(<AthleteDetSimplePanel {...p} appInput={input}/>);
    expect(screen.getByTestId('det-shared-config')).toHaveTextContent('Auto (calendrier commun) séances');
  });
  it('shows effective settings once and asks no duplicate level or optional metric classification', () => {
    render(<AthleteDetSimplePanel {...props()} />);
    expect(screen.getByTestId('det-shared-config').textContent).toContain('12 semaines · 10 h/semaine · 8 séances · 1 renforcement · 2 maximum/jour');
    expect(screen.getByTestId('det-shared-level').textContent).toContain('choisi dans la configuration');
    expect(screen.queryByRole('combobox', { name: 'niveau' })).toBeNull();
    expect(screen.queryByLabelText('VO₂max (ml/kg/min) nature')).toBeNull();
    expect(screen.getByLabelText('FTP vélo (W) nature')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('reuses the real snapshot references without showing four provenance questions', () => {
    const p = props();
    render(<AthleteDetSimplePanel {...p} record={{ ...record, snapshot: { ...record.snapshot!, id: 'snap-synthetic', source: 'manual' } }} appInput={{ ...app(), athlete: { ...app().athlete, paceThresholdSecPerKm: 240 } }} />);
    for (const label of ['Allure seuil course (s/km)', 'Vitesse VO₂max course (m/s)', 'FTP vélo (W)', 'CSS natation (s/100 m)']) expect(screen.queryByLabelText(`${label} nature`)).toBeNull();
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('groups missing inputs separately from coach reviews and keeps limiter priorities visible', () => {
    const p = props();
    render(<AthleteDetSimplePanel {...p} record={{ ...record, snapshot: { ...record.snapshot!, id: 'snap-synthetic', source: 'manual' } }} appInput={{ ...app(), athlete: { ...app().athlete, paceThresholdSecPerKm: 240 } }} />);
    expect(screen.getByText('Limiteurs qui guident le plan')).toBeInTheDocument();
    expect(screen.getByTestId('det-readiness-data')).toHaveTextContent('4 point(s) à traiter');
    expect(screen.getByTestId('det-readiness-current')).toHaveTextContent('3 point(s) à traiter');
    expect(screen.getByTestId('det-readiness-clock')).toHaveTextContent('6 point(s) à traiter');
    expect(screen.getByTestId('det-readiness-review')).toHaveTextContent('13 point(s) à traiter');
    screen.getByTestId('det-final-review').setAttribute('open', '');
    fireEvent.click(screen.getByRole('button', { name: /4. Revue du coach/ }));
    expect(document.getElementById('det-step-review')).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('asks for a missing level instead of promoting the prudent fallback to known data', () => {
    const p = props(); p.appInput = { ...p.appInput, config: { ...p.appInput.config, ambitionMeta: { ...p.appInput.config.ambitionMeta!, trainingLevelSource: 'fallback-prudent' } } };
    render(<AthleteDetSimplePanel {...p} />);
    expect(screen.queryByRole('combobox', { name: 'niveau' })).toBeNull();
    screen.getByTestId('det-final-review').setAttribute('open', '');
    expect(screen.getByRole('link', { name: 'choisissez-le dans la configuration commune' })).toHaveAttribute('href', '#plan-training-level');
    expect(screen.queryByTestId('det-shared-level')).toBeNull();
  });
  it('does not display a stale inherited level while the app profile is pending', () => {
    render(<AthleteDetSimplePanel {...props()} appInputStatus="pending" />);
    expect(screen.queryByTestId('det-shared-level')).toBeNull();
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
  });
  it('retains descriptive typing but clears human checks when the shared planning profile changes', () => {
    const p = props(), view = render(<AthleteDetSimplePanel {...p} />);
    fireEvent.change(screen.getByLabelText('charge'), { target: { value: 'moderate' } });
    expect(screen.getByLabelText('charge')).toHaveValue('moderate');
    view.rerender(<AthleteDetSimplePanel {...p} appInput={{ ...p.appInput, fingerprint: 'b'.repeat(64) }} />);
    expect(screen.getByLabelText('charge')).toHaveValue('moderate');
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
  });
  it('reopens a DET input draft after navigation without restoring coach approvals', () => {
    const p = props(), view = render(<AthleteDetSimplePanel {...p} />);
    fireEvent.change(screen.getByLabelText('charge'), { target: { value: 'moderate' } });
    fireEvent.change(screen.getByLabelText('heure swim'), { target: { value: '06:00' } });
    fireEvent.change(screen.getByLabelText('natation recovery'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('natation recovery méthode'), { target: { value: 'SYNTHETIC observation' } });
    fireEvent.change(screen.getByLabelText('natation recovery incertitude'), { target: { value: '±5 s' } });
    const loadCheck = screen.getByLabelText('Volume demandé compatible avec la charge actuelle');
    fireEvent.click(loadCheck); expect(loadCheck).toBeChecked();
    view.unmount();
    render(<AthleteDetSimplePanel {...p} />);
    expect(screen.getByLabelText('charge')).toHaveValue('moderate');
    expect(screen.getByLabelText('heure swim')).toHaveValue('06:00');
    expect(screen.getByLabelText('natation recovery')).toHaveValue('120');
    expect(screen.getByLabelText('natation recovery méthode')).toHaveValue('SYNTHETIC observation');
    expect(screen.getByLabelText('Volume demandé compatible avec la charge actuelle')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Générer avec DET Engine', hidden: true })).toBeDisabled();
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('does not restore input from another coach or from changed profile values', () => {
    const p = props(), view = render(<AthleteDetSimplePanel {...p} />);
    fireEvent.change(screen.getByLabelText('charge'), { target: { value: 'high' } });
    view.rerender(<AthleteDetSimplePanel {...p} record={{ ...record, coachId: 'SYNTH_B' }} />);
    expect(screen.getByLabelText('charge')).toHaveValue('');
    view.rerender(<AthleteDetSimplePanel {...p} record={{ ...record, refs: { ...record.refs, ftp: 310 } }} />);
    expect(screen.getByLabelText('charge')).toHaveValue('');
  });
  it('reports failed local storage while keeping typed input on screen', () => {
    const failure = vi.spyOn(planningDraftStorage, 'setItem').mockImplementation(() => { throw Error('quota'); });
    render(<AthleteDetSimplePanel {...props()} />);
    fireEvent.change(screen.getByLabelText('charge'), { target: { value: 'moderate' } });
    expect(screen.getByLabelText('charge')).toHaveValue('moderate');
    expect(screen.getByRole('status').textContent).toContain('non conservées');
    failure.mockRestore();
  });

});
