/**
 * V3.18 synthetic athlete-context perturbations.
 * Individual sporting admission MUST change when actual required evidence
 * changes; a catalogue source approval is not transferable to another athlete.
 * No production source, physiology equation, or plan validator is modified.
 */
import {describe,expect,it} from 'vitest';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

const fixtures=[
  {id:'V3P_BIKE_012',objective:'703'},
  {id:'V3P_BIKE_038',objective:'IM'},
] as const;
function approved(id:string,objective:'703'|'IM'):V3ReviewedSettings{
  const context=syntheticV3SportingContext(id);
  if(!('sportingReview' in context))throw Error('synthetic_source_missing');
  return {
    id,objective,athleteLevel:'trained',athleteLevelSource:'manual',
    allPrerequisitesChecked:true,individualCoachApproval:true,
    preferReviewedV3:true,athleteAnchors:syntheticV3ReviewAnchors(),...context,
  };
}
const variations=[
  {
    label:'unknown qualitative training load',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,recentLoad:'unknown'}}),
    reason:'qualitative_training_load_unknown',
  },
  {
    label:'unknown current fatigue',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,fatigue:'unknown'}}),
    reason:'current_fatigue_unknown',
  },
  {
    label:'unresolved injury screen',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,injuryScreen:'contraindication'}}),
    reason:'injury_screen_not_cleared',
  },
  {
    label:'load not individually compatible',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,trainingLoadCompatible:false as true}}),
    reason:'recent_load_not_compatible_with_workout',
  },
  {
    label:'review belongs to a different athlete',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,athleteId:'synthetic-other-athlete'}}),
    reason:'athlete_scoped_review_identity_missing_or_mismatched',
  },
  {
    label:'source changed since coach review',
    change:(r:V3ReviewedSettings):V3ReviewedSettings=>({...r,
      sportingReview:{...r.sportingReview!,sourceFingerprint:'stale-review'}}),
    reason:'coach_review_stale_source_fingerprint',
  },
] as const;

describe('DET V318 — athlete-specific evidence cannot be transferred or guessed',()=>{
  it.each(fixtures)('$objective positive control admits reviewed $id only for individual planning',({id,objective})=>{
    const result=buildDetV3ContractFromCatalogue([approved(id,objective)]);
    expect(result.report.accepted.map(card=>card.id)).toContain(id);
    expect(result.contract.reviewedRaceSpecificForId?.(id)).toEqual({sourceId:id,objective});
    expect(result.report.sourceCount).toBe(800);
    expect(result.report.accepted.length).toBe(1);
  });
  for(const fixture of fixtures){
    for(const variation of variations){
      it(`${fixture.objective} refuses ${variation.label}`,()=>{
        const invalid=variation.change(approved(fixture.id,fixture.objective));
        const result=buildDetV3ContractFromCatalogue([invalid]);
        expect(result.report.accepted.map(card=>card.id)).not.toContain(fixture.id);
        const rejection=result.report.rejected.find(card=>card.id===fixture.id);
        expect(rejection?.reason).toContain(variation.reason);
        expect(result.contract.reviewedRaceSpecificForId?.(fixture.id)).toBeNull();
        expect(result.contract.sourceStructuredZoneForId?.(fixture.id,60)).toBeNull();
      });
    }
  }
});
