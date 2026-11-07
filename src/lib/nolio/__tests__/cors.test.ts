import {describe,it,expect} from 'vitest';
import {corsHeaders} from '../../../../supabase/functions/_shared/nolioV2/cors';
describe('Nolio browser preflight',()=>{
 it('accepts authentication and SDK environment headers for the two POST endpoints',()=>{const headers=new Set(corsHeaders['Access-Control-Allow-Headers'].split(',').map(s=>s.trim()));for(const h of ['authorization','apikey','content-type','x-client-info','x-supabase-client-platform','x-supabase-client-platform-version','x-supabase-client-runtime','x-supabase-client-runtime-version'])expect(headers.has(h)).toBe(true);expect(corsHeaders['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');});
});
