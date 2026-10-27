import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {CoachProfileForm,type CoachProfileFormPayload} from '../CoachProfileForm';
import {PlanPrevalidationPanel} from '../PlanPrevalidationPanel';
it('coach preview sends the same current form payload without calling save or generation',async()=>{
 const athleteName='OFFLINE_PREFLIGHT';const key=`tfcl:coachProfileForm:${athleteName}`;
 localStorage.setItem(key,JSON.stringify({metabolic:'balanced',primary:'glycolytic',secondary:'unknown',freeWeeks:'12',durationMode:'free',prohibitions:[]}));
 const onPrevalidate=vi.fn(async(_payload:CoachProfileFormPayload)=>{}),onGenerate=vi.fn(),onSubmit=vi.fn();
 try{
  render(<CoachProfileForm open onOpenChange={()=>{}} athleteName={athleteName} onPrevalidate={onPrevalidate} onGenerate={onGenerate} onSubmit={onSubmit}/>);
  fireEvent.click(screen.getByRole('button',{name:'Prévalider sans IA'}));
  await waitFor(()=>expect(onPrevalidate).toHaveBeenCalledOnce());
  expect(onPrevalidate.mock.calls[0][0]).toMatchObject({weeksAvailable:12,durationMode:'free',primaryLimiterMetric:'VLamax'});
  expect(onGenerate).not.toHaveBeenCalled();expect(onSubmit).not.toHaveBeenCalled();
 }finally{localStorage.removeItem(key);}
});
it('shows a blocking mechanical result without presenting a generated plan',()=>{
 render(<PlanPrevalidationPanel report={{status:'blocked',issues:[{week:12,code:'window_phase_contract_conflict',severity:'blocking'}],weeks:[]}}/>);
 expect(screen.getByText(/Contradiction bloquante — aucune génération lancée/)).toBeInTheDocument();
 expect(screen.getByText(/La phase de la fenêtre contredit/)).toBeInTheDocument();
});
it('explains missing parameters and calculation failures without exposing raw technical codes',()=>{
 const report={status:'blocked' as const,issues:[{week:0,code:'prevalidation_input_invalid',severity:'blocking' as const},{week:0,code:'decision_matrix_failed',severity:'blocking' as const},{week:0,code:'future_private_code',severity:'blocking' as const}],weeks:[]};
 render(<PlanPrevalidationPanel report={report}/>);
 expect(screen.getByText(/Paramètres incomplets ou invalides/)).toBeInTheDocument();
 expect(screen.getByText(/calcul physiologique a échoué/)).toBeInTheDocument();
 expect(screen.queryByText(/prevalidation_input_invalid|decision_matrix_failed|future_private_code/)).toBeNull();
 expect(JSON.stringify(report)).toContain('decision_matrix_failed');
});
