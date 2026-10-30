import{defineConfig}from'vitest/config';import base from'../../vitest.config';
export default defineConfig({...base,test:{...base.test,include:[
 'experimental/det-engine/v10-allocation.test.ts','experimental/det-engine/v10-contracts.test.ts',
 'experimental/det-engine/v11-mesocycle.test.ts','experimental/det-engine/v11-feedback.test.ts',
 'experimental/det-engine/v14-study.test.ts','experimental/det-engine/v14-reassessment.test.ts',
 'experimental/det-engine/v20-physio.test.ts','src/engines/diagnostic/__tests__/computeDiagnostic.test.ts',
 'src/lib/__tests__/objectiveCoverage.definitionOfDone.test.ts','src/lib/zones/__tests__/deriveTrainingZones.test.ts',
 'src/engines/plan/__tests__/sessionSizingMatrix.test.ts','src/engines/plan/__tests__/sessionSizingMatrix.taperIM.test.ts'
 ],maxWorkers:1,testTimeout:120000}});
