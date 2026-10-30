import {describe,it,expect} from "vitest";
import {proposeV2SourceFamilies,v2SourceMappingSummary} from "../../../../experimental/workout-v2/v2SourceMapping";
describe("V1->V2 source mapping with proof, never assumed equivalence",()=>{
 it("classifies 920 sources explicitly and prevents implicit approval",()=>{
  const rows=proposeV2SourceFamilies(),summary=v2SourceMappingSummary();
  expect(rows).toHaveLength(920);
  expect(new Set(rows.map(r=>r.sourceId)).size).toBe(920);
  expect(summary.total).toBe(summary.needsMetadata+summary.needsSportReview+summary.missingFamily+summary.candidateForReview);
  expect(rows.every(r=>r.migrated===false&&r.coachApproved===false)).toBe(true);
  for(const row of rows){
   if(row.candidateFamilyIds.length){
    expect(row.sourceRationale?.length).toBeGreaterThan(0);
    expect(row.sourceIntent).not.toBeNull();
   }
  }
  console.log("V2_SOURCE_MAPPING_SUMMARY="+JSON.stringify(summary));
 });
});
