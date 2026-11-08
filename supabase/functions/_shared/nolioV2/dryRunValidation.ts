/** Ephemeral allowlisted validation evidence. Never return provider messages,
 * values, athlete identifiers, arbitrary field names or raw JSON. */
export type ValidationIssue={field:string;reason:'pace_format'|'bounds'|'unit'|'number'|'invalid'};
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
