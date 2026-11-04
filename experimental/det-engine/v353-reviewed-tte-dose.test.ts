import {describe,expect,it} from 'vitest';
import {verifyReviewedTteThresholdDose} from './v353-reviewed-tte-dose';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

const id='V3P_RUN_137';
const dose:StructuredZoneDose={
  low:18,mid:0,high:32,unknown:3,durationMin:53,sourceIds:[id],
  provenance:'v3_individually_configured_blocks_only',
};
const args={
  sourceId:id,durationMin:53,dose,
  sourceLimiterKeys:['fractional_utilization','threshold_tolerance','running_impact_tolerance'],
  sourcePrimaryDomain:'mlss',
};
describe('V3.53 TTE source ontology — strict independent evidence',()=>{
  it('certifies only a source-reviewed MLSS threshold dose >=20min',()=>{
    const report=verifyReviewedTteThresholdDose(args);
    expect(report.verified).toBe(true);
    expect(report.verifiedThresholdMin).toBe(32);
    expect(report.scientificAttestation).toBe(false);
  });
  it('does not count marathon race pace as threshold TTE',()=>{
    expect(verifyReviewedTteThresholdDose({...args,
      sourcePrimaryDomain:'marathon_pace',
      sourceLimiterKeys:['race_pace_durability','fueling_tolerance'],
    }).verified).toBe(false);
  });
  it('does not count running Z2 durability despite high total duration',()=>{
    expect(verifyReviewedTteThresholdDose({...args,
      sourcePrimaryDomain:'moderate_lt1',
      sourceLimiterKeys:['durability','aerobic_capacity'],
      dose:{...dose,low:50,high:0},
    }).verified).toBe(false);
  });
  it('does not count brief MLSS activation as time-to-exhaustion session',()=>{
    expect(verifyReviewedTteThresholdDose({...args,
      dose:{...dose,low:40,high:10},
    }).reason).toBe('less_than_20_minutes_exact_threshold_work');
  });
  it('does not count mismatched ID, duration or source evidence',()=>{
    expect(verifyReviewedTteThresholdDose({...args,dose:{...dose,sourceIds:['V3P_RUN_155']}}).verified).toBe(false);
    expect(verifyReviewedTteThresholdDose({...args,durationMin:54}).verified).toBe(false);
    expect(verifyReviewedTteThresholdDose({...args,sourceLimiterKeys:[]}).verified).toBe(false);
  });
});
