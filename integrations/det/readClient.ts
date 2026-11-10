import {createClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
import {hostConfig} from './host-config';
const config=hostConfig();
const project=new URL(config.url);
const sourceKey='sb-'+project.hostname.split('.')[0]+'-auth-token';
const sessionAtOpen=window.localStorage.getItem(sourceKey);
const pilotKey='tfcl-det-pilot-session';
const privateSession=new Map<string,string>();
if(sessionAtOpen)privateSession.set(pilotKey,sessionAtOpen);
const safeRead:typeof fetch=(request,init)=>{
  const r=new Request(request,init),url=new URL(r.url);
  if(url.origin!==project.origin || !['GET','HEAD'].includes(r.method) ||
      !(url.pathname.startsWith('/rest/v1/') || url.pathname==='/auth/v1/user'))
    return Promise.reject(new Error('Cette vue DET dispose uniquement de la lecture du profil.'));
  return fetch(r);
};
export const supabase=createClient<Database>(project.origin,config.key,{
  global:{fetch:safeRead},auth:{storageKey:pilotKey,storage:{getItem:key=>privateSession.get(key)??null,setItem:(key,value)=>{privateSession.set(key,value);},removeItem:key=>{privateSession.delete(key);}},autoRefreshToken:false,persistSession:true,detectSessionInUrl:false},
});
