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
