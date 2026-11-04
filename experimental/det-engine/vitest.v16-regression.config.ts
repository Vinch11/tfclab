import {defineConfig} from 'vitest/config';import base from '../../vitest.config';
// Previously validated research campaigns are not rerun as fresh permutation searches.
// This focused regression retains the relevant source, refusal, feedback and complete-plan guards.
export default defineConfig({...base,test:{...base.test,maxWorkers:1,testTimeout:60000,include:[
 'experimental/det-engine/v9-source-gate.test.ts','experimental/det-engine/v10-contracts.test.ts',
 'experimental/det-engine/v11-guards.test.ts','experimental/det-engine/v11-trail-evidence.test.ts',
 'experimental/det-engine/v13-study.test.ts','experimental/det-engine/v14-guards.test.ts',
 'experimental/det-engine/v14-reassessment.test.ts','experimental/det-engine/v15-schema-review.test.ts'
]}});
