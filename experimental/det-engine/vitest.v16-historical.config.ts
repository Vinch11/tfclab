import {defineConfig} from 'vitest/config';import base from '../../vitest.config';
// Explicit relevant production regression scope; the complete application suite is not claimed.
export default defineConfig({...base,test:{...base.test,setupFiles:[...base.test!.setupFiles as string[],'./experimental/det-engine/v16-offline-setup.ts'],maxWorkers:1,testTimeout:60000,include:[
 'src/lib/__tests__/workout*.test.ts','src/lib/__tests__/vlamaxEffectif.test.ts','src/lib/__tests__/tteEffectif.test.ts',
 'src/lib/zones/__tests__/*.test.ts','src/lib/plan/__tests__/workoutSafetyPrerequisites.test.ts',
 'src/lib/plan/__tests__/sessionCatalogueContract.test.ts'
]}});
