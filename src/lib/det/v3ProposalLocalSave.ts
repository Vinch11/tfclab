import { z } from 'zod';
import { canonicalJson,sha256Hex } from '@/lib/plan/appendOnlyPlanVersionSave';
import type { V3PlanProposal } from './appPlanningV3Proposal';
import type { V3Block } from '../../../scripts/library-v3/catalogueRuntime';
import { getDoctrineDomain } from '@/lib/zones/tfclDoctrine';
const n=z.number().finite().nonnegative(),strings=z.array(z.string());
const domain=z.string().nullable().refine(d=>{try{return d===null||!!getDoctrineDomain(d as never);}catch{return false;}});
const bound=z.object({min:n,base:n,max:n}).strict();
const block:z.ZodType<V3Block>=z.lazy(()=>z.union([
 z.object({kind:z.literal('repeat'),label:z.string(),count:bound,betweenSec:n,betweenSecBounds:bound.optional(),steps:z.array(block).min(1).max(100)}).strict(),
 z.object({kind:z.enum(['time','distance','reps']),label:z.string(),role:z.enum(['warmup','main','cooldown']),domain,seconds:bound.optional(),meters:bound.optional(),reps:bound.optional(),secPerRep:n.optional(),sides:n.optional(),estimated:z.boolean().optional(),repsTarget:bound.optional(),rpeRange:z.object({min:n,max:n}).strict().optional()}).strict(),
])) as z.ZodType<V3Block>;
const target=z.object({domain,metric:z.enum(['watts','sec_per_km','sec_per_100m','m_per_sec','coach_rpe_load','coach_field_effort']),min:n.nullable(),max:n.nullable(),source:z.enum(['athlete_measurement_with_doctrine_model','athlete_reference_with_doctrine_model','direct_athlete_pace','coach_approved_css_proxy','coach_confirmed_load','direct_athlete_range','coach_reviewed_terrain_effort','coach_race_target']),confidence:z.enum(['model','measured','proxy','coach_confirmed']),note:z.string()}).strict();
const component=z.object({sourceId:z.string(),sourceFingerprint:z.string(),title:z.string(),sport:z.enum(['run','bike','swim','strength']),blocks:z.array(block).min(1).max(100),durationMinutes:n.nullable(),distanceM:n,sourceDomain:domain,limiterMatches:strings,zoneMinutes:z.object({low:n,mid:n,high:n,unknown:n}).strict().nullable(),targets:z.object({status:z.enum(['resolved','unresolved']),missing:strings,targets:z.array(target),candidateOnly:z.literal(true),notScientificValidation:z.literal(true)}).strict(),review:z.object({minimumRecoveryHours:n,prerequisites:strings,contraindications:strings,stopRule:z.string(),minimumLevel:z.enum(['untrained','light','trained','highly_trained'])}).strict()}).strict();
const schema=z.object({kind:z.literal('v3_plan_proposal'),status:z.literal('assembled_for_review'),athleteId:z.string(),planningInputFingerprint:z.string(),objective:z.string(),trailLongRunLimits:z.object({recentMinutes:n.positive(),peakMinutes:n.positive()}).strict().refine(v=>v.peakMinutes>=v.recentMinutes).optional(),limiterOrder:strings,prescriptionAllowed:z.literal(false),sourceReview:z.literal('pending'),eventCalendar:z.array(z.object({objective:z.string(),priority:z.enum(['A','B','C']),raceDate:z.string().nullish(),raceName:z.string().nullish()}).passthrough()),weeks:z.array(z.object({week:n.int().positive(),phase:z.string().nullable(),weekType:z.string(),focus:z.string().nullable(),knownMinutes:n,durationMinutes:n.nullable(),days:z.array(z.object({day:z.string(),rest:z.boolean(),sessions:z.array(z.object({sport:z.string(),role:z.enum(['race','long','key','support']),components:z.array(component).max(2),transitionMinutes:z.null(),knownMinutes:n,durationMinutes:n.nullable()}).strict()).max(8)}).strict()).max(7)}).strict()).min(1).max(104),checks:z.array(z.object({code:z.string(),week:n.optional(),status:z.enum(['pending','passed','blocked']),message:z.string()}).strict())}).strict();
const envelope=z.object({version:z.literal(1),context:z.string(),coachId:z.string(),athleteId:z.string(),savedAt:z.string().datetime(),hash:z.string(),plan:schema}).strict();
export interface ProposalStore {getItem(key:string):string|null;setItem(key:string,value:string):void}
const key=(coach:string,athlete:string)=>'tfcl.v3.proposal.local.v1:'+encodeURIComponent(coach)+':'+encodeURIComponent(athlete);
export async function saveLocalV3Proposal(store:ProposalStore,coachId:string,athleteId:string,plan:V3PlanProposal,context:string){
 if(!coachId||!athleteId||plan.athleteId!==athleteId)throw Error('Coach ou athlète incompatible.');
 const checked=schema.parse(plan),hash=await sha256Hex(canonicalJson(checked));
 const record={version:1 as const,context,coachId,athleteId,savedAt:new Date().toISOString(),hash,plan:checked};
 store.setItem(key(coachId,athleteId),JSON.stringify(record));
 const read=await loadLocalV3Proposal(store,coachId,athleteId);
 if(!read||read.hash!==hash)throw Error('Sauvegarde locale non confirmée après relecture.');
 return read;
}
export async function loadLocalV3Proposal(store:ProposalStore,coachId:string,athleteId:string){
 const raw=store.getItem(key(coachId,athleteId));if(raw===null)return null;
 if(raw.length>8_000_000)throw Error('Proposition locale trop volumineuse.');
 const record=envelope.parse(JSON.parse(raw));
 if(record.coachId!==coachId||record.athleteId!==athleteId||record.plan.athleteId!==athleteId||await sha256Hex(canonicalJson(record.plan))!==record.hash)throw Error('Proposition locale incohérente : chargement refusé.');
 return {...record,plan:record.plan as unknown as V3PlanProposal};
}

/** Structural validation for the common review archive; no device write or approval. */
export function parseV3PlanProposal(value:unknown):V3PlanProposal { return schema.parse(value) as unknown as V3PlanProposal; }
