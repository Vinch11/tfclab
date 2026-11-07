/** Bounded diagnostic: structural paths, types and closed public enum values.
 * Never include workout comments, athlete identifiers or arbitrary provider text. */
export type ReadbackDifference={path:string;sent:string;read:string;equivalentNumeric?:boolean};
const KEYS=new Set(['kind','type','unit','value','value_max','duration','distance','targets','steps','sets','times','skip_last','lap_advance','intensity','comment','exercise','reps','rpe','rpe_max','rir','rir_max','zone','metric','percent','percent_max','count','rest','load','side','length']);
const ENUMS=new Set(['W','w','watt','watts','kW','m/s','km/h','mph','bpm','rpm','ppm','kg','s','min','h','m','km','mi','/km','/100m','/500m','/mi','/100yd','raw','no_target','zone','metric','rpe','rir','step','repeat','exercise','superset','emom','for_time','amrap','warmup','work','rest','cooldown','ramp_up','ramp_down','max_effort','freeride']);
const TYPES=new Set(['absent','nul','nombre','texte numérique','texte','vrai','faux','liste','objet']);
export function isNumericString(v:unknown):v is string{return typeof v==='string'&&v.length<=40&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v)&&Number.isFinite(Number(v));}
function shape(v:unknown,key:string){if(v===undefined)return 'absent';if(v===null)return 'nul';if(typeof v==='number')return 'nombre';if(typeof v==='boolean')return v?'vrai':'faux';if(typeof v==='string')return ['kind','type','unit','intensity'].includes(key)&&ENUMS.has(v)?v:isNumericString(v)?'texte numérique':'texte';return Array.isArray(v)?'liste':'objet';}
export function workoutReadbackDifferences(read:unknown,sent:unknown,equal:(a:unknown,b:unknown)=>boolean):ReadbackDifference[]{
 const differences:ReadbackDifference[]=[];let visited=0;
 function walk(a:unknown,b:unknown,path:string,key:string,depth:number){
  if(differences.length>=5||equal(a,b))return;
  const add=()=>{const numeric=(isNumericString(a)&&typeof b==='number'&&Number(a)===b)||(isNumericString(b)&&typeof a==='number'&&Number(b)===a);differences.push({path,sent:shape(b,key),read:shape(a,key),...(numeric?{equivalentNumeric:true}:{})});};
  if(++visited>2000||depth>18){add();return;}
  if(Array.isArray(a)&&Array.isArray(b)){if(a.length!==b.length)differences.push({path:path+'.length',sent:'nombre',read:'nombre'});for(let i=0;i<Math.min(a.length,b.length)&&differences.length<5;i++)walk(a[i],b[i],`${path}[${i}]`,key,depth+1);return;}
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){const ar=a as Record<string,unknown>,br=b as Record<string,unknown>;for(const k of [...new Set([...Object.keys(br),...Object.keys(ar)])]){if(differences.length>=5)break;walk(ar[k],br[k],path+'.'+(KEYS.has(k)?k:'other_field'),k,depth+1);}return;}
  add();
 }
 walk(read,sent,'workout','workout',0);return differences;
}
/** Defensive formatting of an authenticated endpoint result. */
export function formatWorkoutReadbackDifferences(value:unknown):string{
 if(!Array.isArray(value))return '';
 return value.slice(0,5).filter((d):d is ReadbackDifference=>!!d&&typeof d==='object'&&typeof d.path==='string'&&d.path.length<=200&&/^workout(?:\[\d+\]|\.[a-z_]+)*$/.test(d.path)&&(TYPES.has(d.sent)||ENUMS.has(d.sent))&&(TYPES.has(d.read)||ENUMS.has(d.read))).map(d=>`${d.path} : envoyé ${d.sent}, lu ${d.read}${d.equivalentNumeric===true?' (valeur numérique identique)':''}`).join(' ; ');
}

export type RawTargetEvidence={path:string;unit:'W'|'m/s';sent:{value:number;value_max?:number};read:{value?:number;value_max?:number};resolved:Record<string,number|boolean|null|string>};
const RESOLVED_KEYS=new Set(['type','kind','unit','min','max','minimum','maximum','value','value_min','value_max','min_value','max_value','lower','upper','low','high','from','to','start','end','absolute','relative','power','speed','heart_rate','cadence','target','range','bounds','percent','percent_min','percent_max','min_percent','max_percent','target_min','target_max','absolute_min','absolute_max','lower_bound','upper_bound','value_from','value_to','is_range','is_ceiling','ceiling']);
const PHYSICAL_ENUMS=new Set(['W','w','watt','watts','kW','m/s','km/h','bpm','power','speed','heart_rate','cadence','raw','range','ceiling','absolute','relative']);
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e12;
function numeric(v:unknown):number|undefined{const n=isNumericString(v)?Number(v):v;return finite(n)?n:undefined;}
function resolvedNumbers(value:unknown){
 const out:RawTargetEvidence['resolved']={};let visits=0;
 function walk(v:unknown,path:string,depth:number){if(++visits>100||depth>5||Object.keys(out).length>=16)return;if(path&&(finite(v)||typeof v==='boolean'||v===null||(typeof v==='string'&&PHYSICAL_ENUMS.has(v)))){out[path]=v as number|boolean|null|string;return;}if(v&&typeof v==='object'&&!Array.isArray(v))for(const [k,x]of Object.entries(v))if(RESOLVED_KEYS.has(k))walk(x,path?path+'.'+k:k,depth+1);}
 walk(value,'',0);return out;
}
/** Only raw power/speed quantities of the authenticated coach's own operation.
 * No identifiers, comments, arbitrary strings or provider body are returned. */
export function rawTargetEvidence(read:unknown,sent:unknown):RawTargetEvidence[]{
 const out:RawTargetEvidence[]=[];let visits=0;
 function walk(r:unknown,s:unknown,path:string,depth:number){
  if(++visits>1000||depth>18||out.length>=5)return;
  if(Array.isArray(r)&&Array.isArray(s)){for(let i=0;i<Math.min(r.length,s.length);i++)walk(r[i],s[i],`${path}[${i}]`,depth+1);return;}
  if(!r||!s||typeof r!=='object'||typeof s!=='object'||Array.isArray(r)||Array.isArray(s))return;
  const a=r as Record<string,unknown>,b=s as Record<string,unknown>;
  if(b.type==='raw'&&a.type==='raw'&&(b.unit==='W'||b.unit==='m/s')&&a.unit===b.unit&&finite(b.value)){
   const value=numeric(a.value),max=numeric(a.value_max);
   out.push({path,unit:b.unit,sent:{value:b.value,...(finite(b.value_max)?{value_max:b.value_max}:{})},read:{...(value!==undefined?{value}:{}),...(max!==undefined?{value_max:max}:{})},resolved:resolvedNumbers(a.resolved)});return;
  }
  for(const key of ['steps','sets','targets'])if(key in b)walk(a[key],b[key],path+'.'+key,depth+1);
 }
 walk(read,sent,'workout',0);return out;
}
export function formatRawTargetEvidence(value:unknown):string{
 if(!Array.isArray(value))return '';
 return value.slice(0,5).filter((e):e is RawTargetEvidence=>!!e&&typeof e==='object'&&typeof e.path==='string'&&e.path.length<=200&&/^workout(?:\[\d+\]|\.(?:steps|sets|targets))*$/.test(e.path)&&(e.unit==='W'||e.unit==='m/s')&&e.sent&&finite(e.sent.value)&&(!('value_max' in e.sent)||finite(e.sent.value_max))&&e.read&&(!('value' in e.read)||finite(e.read.value))&&(!('value_max' in e.read)||finite(e.read.value_max))).map(e=>{
  const sent=e.sent.value_max===undefined?String(e.sent.value):`${e.sent.value}–${e.sent.value_max}`;
  const read=e.read.value===undefined?'valeur absente':e.read.value_max===undefined?`${e.read.value}${e.sent.value_max!==undefined?' (borne max absente)':''}`:`${e.read.value}–${e.read.value_max}`;
  const resolved=e.resolved&&typeof e.resolved==='object'?Object.entries(e.resolved).slice(0,16).filter(([k,v])=>k.split('.').every(x=>RESOLVED_KEYS.has(x))&&(finite(v)||typeof v==='boolean'||v===null||(typeof v==='string'&&PHYSICAL_ENUMS.has(v)))).map(([k,v])=>`${k}=${v}`).join(', '):'';
  return `${e.path} : envoyé ${sent} ${e.unit} ; lu ${read} ${e.unit}${resolved?' ; résolu '+resolved:''}`;
 }).join(' ; ');
}
