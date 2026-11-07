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
