// Offline authoring command: node scripts/library-v3/generateLibrary920Registry.mjs
// Vite resolves the same raw data imports as the app. No network or approvals.
import {createServer as httpServer} from 'node:http';
import {createServer} from 'vite';
const hmr=httpServer();
const server=await createServer({configFile:false,root:process.cwd(),
 server:{middlewareMode:true,watch:null,hmr:{server:hmr}},appType:'custom',logLevel:'error'});
try{await server.ssrLoadModule('/scripts/library-v3/generateLibrary920Registry.ts');}
finally{await server.close();}
