import {defineConfig} from 'vitest/config';import base from '../../vitest.config';
export default defineConfig({...base,test:{...base.test,include:['experimental/det-engine/v27-*.test.ts'],maxWorkers:1,testTimeout:120000}});
