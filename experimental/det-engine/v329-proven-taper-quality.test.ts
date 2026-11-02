/** Strict V3.29 evidence refusals: no title, tag or invented dose can create quality. */
import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {verifyReviewedTaperKeyStimulus} from './v329-proven-taper-quality';

const session=(patch:Partial<ParsedSession>={}):ParsedSession=>({
  weekNumber:11,weekTheme:'taper',phase:'taper',
  dayIndex:2,dayName:'Mercredi',sport:'swim',
  title:'CSS blocs courts — rappel allégé',
  details:'20 min avec 2 x 2 min au MLSS',
  catalogId:'V3P_SWIM_160',custom:false,isRest:false,
  isKeySession:true,durationMin:20,zones:['Z4'],
  ...patch,
});
const card=(patch:Partial<RepairWorkoutMetadata>={}):RepairWorkoutMetadata=>({
  id:'V3P_SWIM_160',phases:['taper'],mainZoneMax:4,
  tags:['individual-coach-approval-recorded',
    'v3-sporting-source-individually-reviewed-candidate',
    'v3-intensity-anchors-individually-verified'],
  ...patch,
} as RepairWorkoutMetadata);
const dose=(patch:Partial<StructuredZoneDose>={}):StructuredZoneDose=>({
  sourceIds:['V3P_SWIM_160'],durationMin:20,low:14,mid:0,high:4,unknown:2,
  provenance:'v3_individually_configured_blocks_only',...patch,
});
const prove=(s=session(),c=card(),d:StructuredZoneDose|null=dose())=>
  verifyReviewedTaperKeyStimulus(s,c,()=>d);

describe('DET V329 — reviewed taper key must have true BLOCK-level Z4+ minutes',()=>{
  it('certifies the exact synthetic 20-minute CSS reminder without changing its dose',()=>{
    expect(prove()).toEqual({verified:true,evidence:{
      sourceId:'V3P_SWIM_160',durationMin:20,lowMin:14,midMin:0,
      highMin:4,unknownMin:2,reviewedSource:true,
      scientificAttestation:false,
    }});
  });
  it('is source-provenance-based, not a text-name loophole',()=>{
    expect(prove(session({title:'Seuil contrôlé'}))).toEqual(prove());
    // The separate native phase validator must still run and may forbid
    // this title. This helper cannot waive it.
  });
  it('refuses forged Z4-labelled easy dose or absent approved evidence',()=>{
    expect(prove(session({zones:['Z4']}),card(),dose({
      low:18,mid:0,high:0,unknown:2,
    }))).toEqual({verified:false,reason:'no_proven_z4_plus_minutes'});
    expect(prove(session(),card(),null))
      .toEqual({verified:false,reason:'source_provenance_unverified'});
    expect(verifyReviewedTaperKeyStimulus(session(),card(),undefined))
      .toEqual({verified:false,reason:'exact_source_evidence_unavailable'});
  });
  it('refuses unreviewed, out-of-phase, misidentified and non-key sources',()=>{
    expect(prove(session({isKeySession:false})).verified).toBe(false);
    expect(prove(session(),card({phases:['peak']})).verified).toBe(false);
    expect(prove(session(),card({tags:[]})).verified).toBe(false);
    expect(prove(session({catalogId:'V3P_SWIM_999'})).verified).toBe(false);
    expect(prove(session(),card({mainZoneMax:2})).verified).toBe(false);
  });
  it('refuses mismatched durations, source IDs and corrupted intensity ledgers',()=>{
    expect(prove(session({durationMin:25})).verified).toBe(false);
    expect(prove(session(),card(),dose({sourceIds:['V3P_SWIM_175']})).verified).toBe(false);
    expect(prove(session(),card(),dose({unknown:4})).verified).toBe(false);
    expect(prove(session(),card(),dose({high:NaN})).verified).toBe(false);
    expect(prove(session(),card(),dose({provenance:'unverified' as StructuredZoneDose['provenance']}))
      .verified).toBe(false);
  });
  it('refuses a largely intense or unmeasured pseudo-reminder',()=>{
    expect(prove(session(),card(),dose({low:3,high:15,unknown:2})).verified)
      .toBe(false);
    expect(prove(session(),card(),dose({low:5,high:3,unknown:12})).verified)
      .toBe(false);
    expect(verifyReviewedTaperKeyStimulus(session(),card(),()=>{
      throw Error('review store unavailable');
    })).toEqual({verified:false,reason:'source_evidence_provider_failed'});
  });
});
