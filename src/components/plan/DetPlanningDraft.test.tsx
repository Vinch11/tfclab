import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DetPlanningDraft } from './DetPlanningDraft';
import type { FrozenAppPlanningInput } from '@/lib/det/appPlanningInput';
const boundary = vi.hoisted(() => ({ build: vi.fn() }));
vi.mock('@/lib/det/appPlanningDetDraft', () => ({ buildAppPlanningDetDraft: boundary.build }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const app = { athleteId:'SYNTH_A',fingerprint:'a'.repeat(64) } as FrozenAppPlanningInput;
const result = { kind:'planning_draft',objective:'70.3',weeks:[],limiterOrder:['VLamax'],limiterCandidates:[],pending:['À relire'],prescriptionAllowed:false,validation:'pending' };
describe('draft action without the pre-generation questionnaire', () => {
  it('opens a read-only draft with no measurement, clock or approval input', async () => {
    boundary.build.mockResolvedValue(result);
    const guard = vi.fn(async()=>({userId:'SYNTH_COACH',athleteId:'SYNTH_A'}));
    render(<DetPlanningDraft app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} restrictions={{}} />);
    fireEvent.click(screen.getByRole('button',{name:'Préparer le brouillon DET'}));
    await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(boundary.build).toHaveBeenCalledWith(app,'SYNTH_A',{});
    expect(screen.getByText(/Limiteurs :/)).toHaveTextContent('Capacité glycolytique');
    expect(screen.queryByRole('button',{name:/export|Nolio|sauvegarder/i})).toBeNull();
  });
  it('does not build if authentication or athlete binding fails', async () => {
    render(<DetPlanningDraft app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={async()=>null} restrictions={{}} />);
    fireEvent.click(screen.getByRole('button',{name:'Préparer le brouillon DET'}));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Connexion'));
    expect(boundary.build).not.toHaveBeenCalled();
  });
  it('discards a draft after the underlying app profile changes', async () => {
    boundary.build.mockResolvedValue(result);
    const guard=async()=>({userId:'SYNTH_COACH',athleteId:'SYNTH_A'});
    const view=render(<DetPlanningDraft app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} restrictions={{}} />);
    fireEvent.click(screen.getByRole('button',{name:'Préparer le brouillon DET'}));
    await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
    view.rerender(<DetPlanningDraft app={{...app,fingerprint:'b'.repeat(64)}} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} restrictions={{}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
