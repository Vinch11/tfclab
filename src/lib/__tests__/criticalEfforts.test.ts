import { describe, it, expect } from 'vitest';
import { fitCriticalEfforts, criticalEffortsFromRecords, previewCriticalInterval, type CriticalEffort } from '../criticalEfforts';

const today='2026-11-10';
function points(sport:'running'|'cycling'):CriticalEffort[]{return [180,420,720].map(t=>({id:String(t),sport,durationSec:t,value:sport==='running'?4*t+200:250+18000/t,date:today,session:'test-'+t,conditions:'piste',source:'manual',confirmed:true}));}
describe('repères critiques avec provenance',()=>{
  it('calcule vitesse 4 m/s et D′ 200 m',()=>{const f=fitCriticalEfforts(points('running'),'running',today);expect(f.critical).toBeCloseTo(4);expect(f.reserve).toBeCloseTo(200);expect(f.status).toBe('eligible');});
  it('calcule CP 250 W et W′ 18 kJ',()=>{const f=fitCriticalEfforts(points('cycling'),'cycling',today);expect(f.critical).toBeCloseTo(250);expect(f.reserve).toBeCloseTo(18000);});
  it('records non confirmés ne permettent pas de prescription',()=>{const f=fitCriticalEfforts(points('running').map(e=>({...e,confirmed:false})),'running',today);expect(f.status).toBe('estimate');expect(previewCriticalInterval(f,'running',180,4.5)).toBeNull();});
  it('deux points ne prouvent pas la qualité',()=>{const f=fitCriticalEfforts(points('running').filter((_,i)=>i!==1),'running',today);expect(f.r2).toBeNull();expect(f.status).toBe('review');});
  it('refuse le mélange sportif',()=>expect(fitCriticalEfforts([...points('running'),points('cycling')[0]],'running',today).status).toBe('insufficient'));
  it('refuse les sprints',()=>expect(fitCriticalEfforts(points('cycling').map((e,i)=>i===0?{...e,durationSec:30}:e),'cycling',today).status).toBe('insufficient'));
  it('refuse les doublons de durée',()=>expect(fitCriticalEfforts([points('running')[0],points('running')[0]],'running',today).status).toBe('insufficient'));
  it('exige des durées suffisamment distinctes',()=>expect(fitCriticalEfforts(points('running').map((e,i)=>({...e,durationSec:300+i*30})),'running',today).status).toBe('insufficient'));
  it('les tests anciens ne sont pas admissibles',()=>expect(fitCriticalEfforts(points('running').map(e=>({...e,date:'2026-08-01'})),'running',today).status).toBe('review'));
  it('conditions incompatibles restent sous revue',()=>expect(fitCriticalEfforts(points('running').map((e,i)=>({...e,conditions:i?'tapis':'piste'})),'running',today).status).toBe('review'));
  it('confirmation ne corrige pas un mauvais ajustement',()=>expect(fitCriticalEfforts(points('running').map((e,i)=>i===1?{...e,value:e.value+300}:e),'running',today).status).toBe('review'));
  it('un seul effort reste insuffisant sans valeur inventée',()=>{const f=fitCriticalEfforts(points('running').slice(0,1),'running',today);expect(f.critical).toBe(0);expect(f.status).toBe('insufficient');});
  it('convertit un record allure avec unités explicites et sans le confirmer',()=>{const p=criticalEffortsFromRecords([{value:4,unit:'min/km',inner_val:180,record_type:'time',cat:'par',date:today,sportBase:'running',training_id:'trn_1'}]);expect(p[0].value).toBe(750);expect(p[0].confirmed).toBe(false);});
  it('ignore les unités inconnues',()=>expect(criticalEffortsFromRecords([{value:4,unit:'pace',inner_val:180,record_type:'time',cat:'par',date:today,sportBase:'running'}])).toEqual([]));
  it('calcule la sollicitation continue sans récupération vélo transposée',()=>{const f=fitCriticalEfforts(points('running'),'running',today);expect(previewCriticalInterval(f,'running',180,4.5)?.used).toBeCloseTo(90);});
  it('date future interdit l’admissibilité',()=>expect(fitCriticalEfforts(points('running').map(e=>({...e,date:'2026-11-11'})),'running',today).status).toBe('review'));
  it('une date absente interdit l’admissibilité',()=>expect(fitCriticalEfforts(points('running').map(e=>({...e,date:''})),'running',today).status).toBe('review'));
  it('une séance non documentée interdit l’admissibilité',()=>expect(fitCriticalEfforts(points('running').map(e=>({...e,session:''})),'running',today).status).toBe('review'));
  it('ne prédit pas la récupération ni les répétitions',()=>{const f=fitCriticalEfforts(points('running'),'running',today);expect(previewCriticalInterval(f,'running',30,6)).toBeNull();expect(previewCriticalInterval(f,'running',180,3)).toBeNull();});
});