import {expect} from 'vitest';
import type {runScenario} from './v332-running-long-horizon-fixture';
import {strictMarathonCaseSettings,assertAcceptedCore} from './v356-marathon-acceptance-core';
export {strictMarathonCaseSettings};
/** Acceptance obligations: these cases may NEVER pass through a permitted NO-GO. */
export function assertAccepted(out:ReturnType<typeof runScenario>,weeks:16|40){
  assertAcceptedCore(out,weeks,expect);
}
