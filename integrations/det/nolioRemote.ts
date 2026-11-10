import {supabase} from '@/integrations/supabase/client';
import type {CallNolio} from './nolioDelivery';
async function callService(name:'det-nolio-connect'|'det-nolio-export',body:Record<string,unknown>,signal:AbortSignal){
  const {data,error}=await supabase.functions.invoke(name,{body,signal});
  if(error){
    const response=(error as {context?:Response}).context;
    if(response?.status===404)throw Error('Le service d’export DET vers Nolio n’est pas déployé sur ce site.');
    const details=await response?.json().catch(()=>null);
    throw Error(details?.reason??'Le service d’export Nolio est inaccessible.');
  }
  if(!data || typeof data.status!=='string')throw Error('Réponse Nolio illisible.');
  return data;
}

export const callNolio:CallNolio=(body,signal)=>callService('det-nolio-export',body,signal);
export const callNolioConnection=(body:Record<string,unknown>,signal:AbortSignal)=>callService('det-nolio-connect',body,signal);
