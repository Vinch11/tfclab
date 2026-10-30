/** Read-only failure localization; this test never labels a sporting candidate as valid. */
import{it,expect,vi,afterEach}from'vitest';import{writeFileSync}from'node:fs';import{gzipSync}from'node:zlib';
import{TRAIL_FIXTURES,prepareTrailFixture}from'./v4-trail-fixtures';import{generateTrailPlan}from'./v4-trail';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V4_PROBE_OUT)('records diagnostic outputs for the current twelve separated calendars, without asserting sports success',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const rows=TRAIL_FIXTURES.map(f=>{const{athlete,config}=prepareTrailFixture(f);return generateTrailPlan(athlete,config,f,'separated_exposure');});
 writeFileSync(process.env.TFCL_DET_V4_PROBE_OUT!,gzipSync(JSON.stringify(rows)));expect(rows).toHaveLength(12);
});
