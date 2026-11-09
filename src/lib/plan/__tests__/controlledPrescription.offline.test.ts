import { describe, it, expect } from 'vitest';
import { prescribeSlots, hydrateExplanations, assertCompleteWeeks, type PrescriptionSlot } from '../../../../scripts/preproduction/controlled-prescription/prescription';
import type { CatalogueContract } from '../../../../supabase/functions/_shared/sessionCatalogueContract';
import type { RepairWorkoutMetadata } from '../../../../supabase/functions/_shared/repairSportingEquivalence';

const card:RepairWorkoutMetadata={metadataVersion:1,complete:true,id:'ENDURANCE',sport:'run',title:'Endurance fondamentale',objective:'Endurance',intentFamily:'endurance_fondamentale',goals:[],objectiveSpecific:false,phases:['base'],durationMin:[30,60],mainZoneMax:2,specialContext:null,prerequisiteKeys:[],necessity:'Optionnel',when:'1x/semaine max',avoid:'',tags:[],structure:'Main: 30–60 min Z2',zones:['Z2'],variants:{'10km':'Z2 40–50 min',Marathon:'Adapter selon fatigue'}};
const contract:CatalogueContract={phase:'base',weekType:'load',objective:'10km',catalog:[card]};
const slot:PrescriptionSlot={reference:'S1:mardi:0',week:1,day:'mardi',sport:'run',intent:'endurance_fondamentale',domain:'moderate',minMinutes:30,maxMinutes:45,allowedCatalogIds:['ENDURANCE'],approvedPrerequisites:[],approvedSpecialContexts:[],isKeySession:false};
const run=(slots:PrescriptionSlot[]=[slot],c=contract,budget=90,known=true)=>prescribeSlots(slots,{1:c},{1:budget},{initialLoadKnown:known});
describe('offline controlled prescription — not connected to real generation',()=>{
 it('selects the minimum compatible dose instead of filling the ceiling',()=>{const r=run();expect(r.status).toBe('ready');expect(r.sessions[0]?.durationMin).toBe(30);});
 it('unknown load always requires coach review',()=>{expect(run([slot],contract,90,false)).toMatchObject({status:'ready',coachReviewRequired:true});});
 it('only the numeric 10 km variant authorizes a 40 minute dose',()=>{expect(run([{...slot,variantKey:'10km'}]).sessions[0]?.durationMin).toBe(40);});
 it('prose Marathon variants authorize no adaptation',()=>{expect(run([{...slot,variantKey:'Marathon'}],{...contract,objective:'Marathon'}).status).toBe('blocked');});
 it('cannot dilute an intended threshold into endurance through a variant',()=>{expect(run([{...slot,intent:'seuil',variantKey:'10km'}],{...contract,catalog:[{...card,title:'Seuil',intentFamily:'seuil',mainZoneMax:4,zones:['Z4']}]}).status).toBe('blocked');});
 it('requires an explicit physiological stimulus, not a generic quality role',()=>{expect(run([{...slot,intent:'other'}]).status).toBe('blocked');});
 it('does not substitute a VO2 fiche for endurance',()=>{expect(run([slot],{...contract,catalog:[{...card,intentFamily:'vo2'}]}).status).toBe('blocked');});
 it('refuses duration outside the catalogue range',()=>{expect(run([{...slot,minMinutes:70,maxMinutes:90}]).status).toBe('blocked');});
 it('refuses a minimum dose exceeding a weekly budget of 29 minutes',()=>{expect(run([slot],contract,29).status).toBe('blocked');});
 it('honours the explicit once per week frequency cap',()=>{expect(run([slot,{...slot,reference:'S1:jeudi:0',day:'jeudi'}]).status).toBe('blocked');});
 it('requires prerequisite approval',()=>{expect(run([slot],{...contract,catalog:[{...card,prerequisiteKeys:['lactatemetre']}]}).status).toBe('blocked');});
 it('does not select special heat or fasting contexts implicitly',()=>{expect(run([slot],{...contract,catalog:[{...card,specialContext:'heat'}]}).status).toBe('blocked');});
 it('rejects missing contracts instead of using a neutral default',()=>{expect(prescribeSlots([slot],{},{1:90},{initialLoadKnown:true}).status).toBe('blocked');});
 it.each(['5km','10km','Semi','Marathon','Trail','703','Ironman'])('preserves %s context and sport in compatible base fixtures',objective=>{
   const r=run([slot],{...contract,objective});expect(r.status).toBe('ready');expect(r.sessions[0]?.sport).toBe('run');expect(r.sessions[0]?.intent).toBe('endurance_fondamentale');
 });
 it.each(['run','bike','swim','brick','strength'])('never switches prescribed %s discipline',sport=>{
   const r=run([{...slot,sport}],{...contract,objective:'Ironman',catalog:[{...card,sport}]});expect(r.status).toBe('ready');expect(r.sessions[0]?.sport).toBe(sport);
 });
 it('preserves prescriptions when commentary arrives without provider schema enforcement',()=>{
   const r=run();const result=hydrateExplanations(r.sessions,[{reference:slot.reference,week:1,explanation:'Explication du choix'}]);
   expect(result[0]).toMatchObject({catalogId:'ENDURANCE',durationMin:30,zones:['Z2'],domain:'moderate'});
 });
 it.each(['durationMin','zones','title','details','variantKey','catalogId','custom','day'])('rejects IA authored %s even in valid JSON',field=>{
   expect(()=>hydrateExplanations(run().sessions,[{reference:slot.reference,week:1,explanation:'', [field]:'forged'}])).toThrow('PRESCRIPTION_FIELD_FORBIDDEN');
 });
 it('rejects a forged reference',()=>{expect(()=>hydrateExplanations(run().sessions,[{reference:'forged',week:1,explanation:''}])).toThrow();});
 it('rejects a moved week',()=>{expect(()=>hydrateExplanations(run().sessions,[{reference:slot.reference,week:2,explanation:''}])).toThrow();});
 it('rejects missing commentary references',()=>{expect(()=>hydrateExplanations(run().sessions,[])).toThrow();});
 it('rejects duplicate references',()=>{const sessions=run().sessions;expect(()=>hydrateExplanations([...sessions,{...sessions[0],reference:'S2:0',week:2}],[{reference:slot.reference,week:1,explanation:''},{reference:slot.reference,week:1,explanation:''}])).toThrow();});
 it('requires all 33 weeks, not only the first 15',()=>{expect(()=>assertCompleteWeeks(Array.from({length:15},(_,i)=>({weekNumber:i+1})),33)).toThrow('PLAN_WEEK_COVERAGE');});
 it('accepts exactly 33 ordered weeks',()=>{expect(()=>assertCompleteWeeks(Array.from({length:33},(_,i)=>({weekNumber:i+1})),33)).not.toThrow();});
 it('rejects a duplicated or reordered week in a 33 week result',()=>{const weeks=Array.from({length:33},(_,i)=>({weekNumber:i+1}));weeks[16]={weekNumber:16};expect(()=>assertCompleteWeeks(weeks,33)).toThrow();});
});