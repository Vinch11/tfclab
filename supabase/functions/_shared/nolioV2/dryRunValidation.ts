/** Ephemeral evidence for the authenticated owning coach. No raw JSON,
 * credentials, identity patterns, URLs, logging or persistence. */
export type ValidationIssue={field:string;reason:'pace_format'|'bounds'|'unit'|'number'|'invalid'};
export type ProviderValidationError={code:string|null;message:string|null;fields:Array<{field:string;messages:string[]}>};
/** Standard HTTP400 error projected ONLY to the authenticated owning coach.
 * Never logged/persisted. Keep technical messages, redact credential/identity
 * patterns and URLs; do not mistake absence of error.fields for no evidence. */
export function redactValidationText(value:unknown):string|null{
 if(typeof value!=='string')return null;
 return value.slice(0,4000).replace(/Bearer\s+\S+/gi,'[autorisation masquée]').replace(/(?:access_token|refresh_token|client_secret|api_key|password)\s*[:=]\s*["']?[^\s,"'}]+/gi,'[secret masqué]').replace(/https?:\/\/[^\s"'<>]+/gi,'[URL masquée]').replace(/\b(?:usr|spt|ptrn|pcmp|grp|exf)_[a-z0-9]+\b/gi,'[identifiant masqué]').replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,'[identifiant masqué]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[adresse masquée]').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,600);
}
export function providerValidationError(text:string|null):ProviderValidationError|null{
 let body:unknown;try{body=JSON.parse(text??'');}catch{return null;}
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const root=body as Record<string,unknown>,error=root.error&&typeof root.error==='object'&&!Array.isArray(root.error)?root.error as Record<string,unknown>:root;
 const code=typeof error.code==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(error.code)&&!(/^(?:usr|spt|ptrn|pcmp|grp|exf)_/.test(error.code))?error.code:null;
 const message=redactValidationText(error.message??root.detail??(typeof root.error==='string'?root.error:null));
 const fields:ProviderValidationError['fields']=[];
 if(error.fields&&typeof error.fields==='object'&&!Array.isArray(error.fields))for(const [key,messages] of Object.entries(error.fields).slice(0,12)){
  const field=key.replace(/\[(\d{1,4})\]/g,'.$1');if(!validationField(field)||!Array.isArray(messages))continue;
  fields.push({field,messages:messages.slice(0,2).map(redactValidationText).filter((m):m is string=>m!==null)});
 }
 return code||message||fields.length?{code,message,fields}:null;
}
export function formatPaceProbeReport(value:unknown):string{
 if(!Array.isArray(value))return '';
 const labels:Record<string,string>={original:'Requête actuelle',exact_numeric_mps:'Format numérique exact',pace_speed_order:'Bornes en ordre vitesse',single_integer_pace:'Allure entière isolée',single_fractional_pace:'Allure décimale isolée'};
 return value.slice(0,5).flatMap(p=>{
  if(!p||!Object.prototype.hasOwnProperty.call(labels,p.test)||!(p.httpStatus===null||Number.isInteger(p.httpStatus)&&p.httpStatus>=100&&p.httpStatus<=599))return [];
  const accepted=p.code==='dry_run_valid'&&p.httpStatus>=200&&p.httpStatus<300;
  const raw=p.providerError;
  const fieldsObject=raw&&Array.isArray(raw.fields)?Object.fromEntries(raw.fields.slice(0,12).filter((f:unknown)=>!!f&&typeof f==='object'&&validationField((f as {field?:unknown}).field)).map((f:{field:string;messages:unknown})=>[f.field,f.messages])):{};
  const e=p.httpStatus===400&&raw?providerValidationError(JSON.stringify({error:{code:raw.code,message:raw.message,fields:fieldsObject}})):null;
  const fields=e?.fields.map(f=>`${f.field} : ${f.messages.join(' ')}`).join(' ; ');
  return [`${labels[p.test]} : ${accepted?'accepté':p.httpStatus===null?'réponse non confirmée':'HTTP '+p.httpStatus}${e?.code?' — '+e.code:''}${e?.message?' — '+e.message:''}${fields?' — '+fields:''}`];
 }).join(' | ');
}
const keys=new Set(['workout','steps','targets','value','value_max','unit','type','kind','duration','distance','times','skip_last','intensity','name','description','date_start','sport','athletes','exercise','reps','rpe','rir','metric','percent','zone','stream']);
export const validationField=(field:unknown):field is string=>typeof field==='string'&&field.length>0&&field.length<=160&&keys.has(field.split('.')[0])&&field.split('.').every(s=>keys.has(s)||/^\d{1,4}$/.test(s));
export function formatValidationIssues(value:unknown):string{
 const reasons:Record<string,string>={pace_format:'format d’allure refusé',bounds:'bornes refusées',unit:'unité refusée',number:'valeur numérique refusée',invalid:'champ refusé'};
 if(!Array.isArray(value))return '';
 return value.slice(0,32).flatMap(x=>x&&validationField(x.field)&&typeof x.reason==='string'&&Object.prototype.hasOwnProperty.call(reasons,x.reason)?[`${x.field} : ${reasons[x.reason]}`]:[]).join(' ; ');
}
export function validationIssues(text:string|null):ValidationIssue[]{
  let body:unknown;try{body=JSON.parse(text??'');}catch{return [];}
  const error=(body as {error?:{code?:unknown;fields?:unknown}}|null)?.error;
  if(error?.code!=='validation_error'||!error.fields||typeof error.fields!=='object'||Array.isArray(error.fields))return [];
  const out:ValidationIssue[]=[];
  for(const [raw,messages] of Object.entries(error.fields).slice(0,32)){
    const field=raw.replace(/\[(\d{1,4})\]/g,'.$1');
    if(!validationField(field)||!Array.isArray(messages))continue;
    const message=messages.filter((x):x is string=>typeof x==='string'&&x.length<=500).join(' ').toLowerCase();
    const reason:ValidationIssue['reason']=/pace|m:ss|mm:ss/.test(message)?'pace_format':/bound|range|greater|lower|minimum|maximum/.test(message)?'bounds':/unit/.test(message)?'unit':/number|numeric|integer|decimal/.test(message)?'number':'invalid';
    out.push({field,reason});
  }
  return out;
}
