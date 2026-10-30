import{defineConfig}from'vitest/config';import base from'../../vitest.config';
export default defineConfig({...base,test:{...base.test,include:['experimental/det-engine/coach-floor-*.test.ts'],maxWorkers:1,testTimeout:120000}});
