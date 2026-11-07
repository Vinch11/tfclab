import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
if (!process.env.PHYSIOLOGY_BASELINE_ROOT) throw Error('Explicit immutable baseline checkout required');
export default defineConfig({plugins:[react()],test:{environment:'happy-dom',globals:true,setupFiles:['./src/test/setup.ts'],include:['src/engines/diagnostic/__tests__/physiologyValidationV2.qa.test.ts'],retry:0},resolve:{alias:{'@':path.join(process.env.PHYSIOLOGY_BASELINE_ROOT,'src')}}});
