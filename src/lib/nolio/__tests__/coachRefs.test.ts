import {describe,it,expect} from 'vitest';
import {withCoachCompetitionSport} from '../../../../supabase/functions/_shared/nolioV2/coachRefs';
import type {NolioV2Refs} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const now=Date.parse('2026-11-06T20:00:00Z'),at=new Date(now).toISOString();
const refs:NolioV2Refs={synthetic:true,athleteId:'usr_SYNTH',sportIds:{bike:'spt_SYNTHBIKE'},exerciseIds:{},competition:null};
const remote={athleteRef:'usr_SYNTH',sports:[{sport:'spt_SYNTHTRI',name:'Triathlon',isActive:true,structuredEnabled:false}]};
describe('exact official competition sport resolution',()=>{
 it('uses only a unique active official ID from the selected athlete without modifying the stored mapping',()=>{expect(withCoachCompetitionSport(refs,remote,at,now).sportIds.brick).toBe('spt_SYNTHTRI');expect(refs.sportIds.brick).toBeUndefined();});
 it.each([{...remote,athleteRef:'usr_OTHER'},{...remote,sports:[{...remote.sports[0],isActive:false}]},{...remote,sports:[{...remote.sports[0],name:'Triathlon personnalisé'}]},{...remote,sports:[{...remote.sports[0],sport:'123'}]},{...remote,sports:[...remote.sports,{...remote.sports[0],sport:'spt_OTHER'}]}])('refuses ambiguous, inactive or unrelated references: %j',r=>{expect(withCoachCompetitionSport(refs,r,at,now)).toBe(refs);});
 it('refuses stale/future/unreadable metadata and preserves explicit existing associations',()=>{for(const t of [new Date(now-3600001).toISOString(),new Date(now+60001).toISOString(),'invalid'])expect(withCoachCompetitionSport(refs,remote,t,now)).toBe(refs);const explicit={...refs,sportIds:{...refs.sportIds,brick:'spt_EXPLICIT'}};expect(withCoachCompetitionSport(explicit,remote,at,now)).toBe(explicit);});
});
