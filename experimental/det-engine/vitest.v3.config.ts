import {defineConfig} from 'vitest/config';
import base from '../../vitest.config';
// An explicit file list avoids mergeConfig concatenating the entire historical suite per experiment.
// The historical suite remains a separate required check, without modified tests or exclusions.
export default defineConfig({...base,test:{...base.test,include:['experimental/det-engine/**/*.test.ts'],maxWorkers:2}});
