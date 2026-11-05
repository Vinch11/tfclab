import type { CoachAnswers } from './athleteDetBridge';
import { prefillFromRecord, type AthleteRecordView } from './athleteDetBridge';
import { canonicalJson } from '@/lib/plan/appendOnlyPlanVersionSave';

/** Saved typing is a draft, never a human approval or a source qualification. */
export function detInputDraft(a:CoachAnswers) {
  return structuredClone({provenance:a.provenance,entered:a.entered,swimPaces:a.swimPaces,recentLoad:a.recentLoad,clock:a.clock,
    unmetPrerequisites:a.unmetPrerequisites,presentContraindications:a.presentContraindications,
    injuryScreen:a.injuryScreen==='contraindication'?'contraindication' as const:'' as const});
}
export function detDraftSignature(record:AthleteRecordView,objective:string):string {
  return canonicalJson({objective,values:prefillFromRecord(record),snapshot:record.snapshot?.id,coachId:record.coachId,athleteId:record.athleteId});
}
export function restoreDetInputDraft(value:unknown,empty:CoachAnswers):CoachAnswers|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const o=value as ReturnType<typeof detInputDraft>;
  const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const kind=(x:unknown)=>x==='field_measurement'||x==='explicit_estimate';
  const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
  const stringList=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(v=>typeof v==='string');
  if(!object(o.provenance)||Object.values(o.provenance).some(v=>!object(v)||!kind(v.kind)||(v.uncertainty!==undefined&&typeof v.uncertainty!=='string')))return null;
  if(!object(o.entered)||Object.values(o.entered).some(v=>!object(v)||!kind(v.kind)||typeof v.method!=='string'||!(number(v.value)||(Array.isArray(v.value)&&v.value.length===2&&v.value.every(number)))||(v.uncertainty!==undefined&&typeof v.uncertainty!=='string')||(v.measuredOn!==undefined&&typeof v.measuredOn!=='string')))return null;
  if(!object(o.swimPaces)||Object.values(o.swimPaces).some(v=>!object(v)||!kind(v.kind)||typeof v.method!=='string'||!number(v.value)||(v.uncertainty!==undefined&&typeof v.uncertainty!=='string')))return null;
  if(!object(o.clock)||typeof o.clock.timeZone!=='string'||!object(o.clock.bySport)||Object.values(o.clock.bySport).some(v=>!object(v)||typeof v.time!=='string'||!Array.isArray(v.days)||v.days.length!==7||v.days.some(d=>typeof d!=='boolean')||(v.perDay!==undefined&&(!stringList(v.perDay)||v.perDay.length!==7))))return null;
  if(!['','low','moderate','high'].includes(o.recentLoad)||!['','contraindication'].includes(o.injuryScreen)||!stringList(o.unmetPrerequisites)||!stringList(o.presentContraindications))return null;
  return {...empty,...detInputDraft(o as CoachAnswers)};
}
