// Manual-only synthetic fixtures. No service credentials, model or persistence.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const args=process.argv.slice(2);const value=flag=>args[args.indexOf(flag)+1];
const all=args.includes('--all');
const out=resolve(args.includes('--out')?value('--out'):'/tmp/tfcl-prevalidation');
const env={...process.env,TFCL_PREFLIGHT_OUTPUT:out,TFCL_PREFLIGHT_FIXTURE:args.includes('--fixture')?value('--fixture'):'B-10K'};
if(args.includes('--overrides'))env.TFCL_PREFLIGHT_OVERRIDES=resolve(value('--overrides'));
if(all)env.TFCL_PREVALIDATION_MATRIX=out;
execFileSync(process.execPath,['node_modules/vitest/vitest.mjs','run','src/lib/plan/__tests__/prevalidation.test.ts',...(all?['src/qa/sports-plan-lab/__tests__/prevalidationMatrix.test.ts']:[])],{stdio:'inherit',env});
