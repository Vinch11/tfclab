/** Exact prescription grammar for Nolio export. Unsupported/ambiguous doses are reported, never guessed. */
export type PrescriptionStep={kind:'step';unit:'duration'|'distance';value:number;text:string;recovery:boolean;open?:boolean};
export type PrescriptionNode=PrescriptionStep|{kind:'repeat';times:number;steps:PrescriptionNode[]};
export type PrescriptionPart={part:string;text:string;zones:string[]};
export type SportPrescription={sport:string;parts:PrescriptionPart[]};

const NORMALIZE_QUOTES = /[’′]/g;
function canonicalText(text: unknown): string {
  return String(text || "").replace(NORMALIZE_QUOTES, "'").replace(/[″“”]/g, '"').replace(/''/g, '"').replace(/\u00a0/g, " ").trim();
}
function measureAtStart(text: string): {unit: 'duration' | 'distance'; value: number; end: number} | null {
  const t = canonicalText(text);
  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*h(?:(\d{1,2})(?!\d))?(?:\s*(?:min))?(?![a-z])/i);
  if (m) return { unit: "duration", value: Number(m[1].replace(",", "."))*3600 + Number(m[2] || 0)*60, end: m[0].length };
  m = t.match(/^(\d+)\s*'\s*(\d{1,2})(?:"|s\b)?(?!\d)/i);
  if (m) {
    if (/^\s*\/\s*(?:km|100\s*m)\b/i.test(t.slice(m[0].length))) return null;
    return { unit: "duration", value: Number(m[1])*60 + Number(m[2]), end: m[0].length };
  }
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(minutes?\b|min\b|secondes?\b|secs?\b|s\b|h\b|km\b|m\b|'|")/i);
  if (!m) return null;
  if (/^\s*\/\s*(?:km|100\s*m)\b/i.test(t.slice(m[0].length))) return null;
  const n = Number(m[1].replace(",", "."));
  const unit = m[2].toLowerCase();
  return { unit: unit === "m" || unit === "km" ? "distance" : "duration",
    value: n * (unit === "km" ? 1000 : unit === "h" ? 3600 : /^(?:min|minute|')/.test(unit) ? 60 : 1), end: m[0].length };
}
export function firstDurationSeconds(text: string): number | null {
  const t = canonicalText(text);
  for (const m of t.matchAll(/(?:^|[^\p{L}\d/:.,-])(\d+(?:[.,]\d+)?)/gu)) {
    const at = (m.index || 0) + m[0].length - m[1].length;
    const q = measureAtStart(t.slice(at));
    if (q?.unit === "duration" && q.value > 0) return q.value;
  }
  return null;
}
function withoutCssOffset(text:string):string {
  return text.replace(/\bCSS\s*[+−-]\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:sec(?:ondes?)?|s)\b(?:\s*\/\s*100\s*m)?/gi,"CSS");
}
function uncertain(text: string): boolean {
  text=withoutCssOffset(text);
  // A dosage range or an alternative is not an instruction to pick its upper end.
  return /\d\s*[-–—à]\s*\d+(?:\s*[x×]|\s*(?:min\b|s\b|km\b|m\b|'|"))/i.test(text)
    || /\b(?:optionnel|au choix|si fatigue|si build|si peak)\b/i.test(text)
    || /\d\s*'\s*[→]\s*\d/.test(text);
}
function splitSequence(text: string): string[] {
  const parts = []; let depth = 0, begin = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")") depth--;
    if (depth < 0) throw new Error("Parenthèse non fermée dans la prescription.");
    if (text[i] === "+" && /\bCSS\s*$/i.test(text.slice(0,i))) continue;
    if (depth === 0 && (/[+;\n|]/.test(text[i]) || (text[i] === "." && /\s/.test(text[i+1] || "")))) {
      const after = text.slice(i + 1).trimStart();
      if (/^\d/.test(after)) { parts.push(text.slice(begin, i).trim()); begin = i + 1; }
    }
  }
  if (depth !== 0) throw new Error("Parenthèse non fermée dans la prescription.");
  parts.push(text.slice(begin).trim());
  return parts.filter(Boolean);
}
function recoverySplit(text: string): {work:string;rest:string|null;paired:boolean} {
  let depth = 0;
  const marker = /^(?:r\s*[=:]\s*|r[ée]cup(?:[ée]ration)?\s*[:=]?\s*|repos\s*[:=]?\s*|\/\s*)(?=\d)/i;
  for (let i=0; i<text.length; i++) {
    if(text[i]==="(")depth++;
    if(text[i]===")")depth--;
    if(depth!==0)continue;
    if(i>0 && text[i]!=="/" && !/\s/.test(text[i-1]))continue;
    const m=text.slice(i).match(marker);
    if(m) return { work:text.slice(0,i).trim(),rest:text.slice(i+m[0].length).trim(),paired:m[0].trim().startsWith("/") };
  }
  return { work:text.trim(),rest:null,paired:false };
}
function totalSeconds(nodes: PrescriptionNode[]): number | null {
  let n=0;
  for(const item of nodes) {
    if(item.kind==="repeat") { const inner=totalSeconds(item.steps); if(inner===null)return null; n+=item.times*inner; }
    else { if(item.unit!=="duration" || item.open)return null; n+=item.value; }
  }
  return n;
}
function repeatWithRecovery(times:number, steps:PrescriptionNode[], rest:PrescriptionNode[], afterLast:boolean): PrescriptionNode[] {
  if(!Number.isInteger(times)||times<1||times>200)throw new Error("Nombre de répétitions invalide.");
  if(!rest.length) return [{kind:"repeat",times,steps}];
  if(afterLast) return [{kind:"repeat",times,steps:[...steps,...rest]}];
  const repeated:PrescriptionNode[] = times>1 ? [{kind:"repeat",times:times-1,steps:[...steps,...rest]}] : [];
  return [...repeated,...steps];
}
function atom(text:string, recovery:boolean): PrescriptionStep {
  const source=canonicalText(text);
  const numeric=source.search(/\d/);
  const dosage=numeric>0?source.slice(numeric):source;
  const q=measureAtStart(dosage);
  if(!q || q.value<=0)throw new Error("Durée ou distance précise manquante : "+text);
  const tail=withoutCssOffset(dosage.slice(q.end));
  // More than one dose inside an atom must be separated explicitly.
  if(firstDurationSeconds(tail)!==null || /(?:\d+\s*[x×]\s*\d)|(?:\b(?:dont|puis|ensuite)\b)|(?:[→]\s*\d)/i.test(tail))
    throw new Error("Décomposer les étapes de la prescription : "+text);
  return {kind:"step",unit:q.unit,value:q.value,text,recovery};
}
function parsePart(text:string, recovery=false): PrescriptionNode[] {
  const t=canonicalText(text).replace(/^\s*(?:échauffement|echauffement|warm[\s-]*up|main|corps(?: de séance)?|cool[\s-]*down|retour au calme)\s*:\s*/i,"").trim();
  if(!t)return [];
  if(uncertain(t))throw new Error("Choisir une prescription précise avant l'export : "+t);
  const segments=splitSequence(t);
  if(segments.length>1)return segments.flatMap(s=>parsePart(s,recovery));
  const inclusive=t.match(/^(.+?)\s+(?:dont|incluant)\s+(.+)$/i);
  if(inclusive){
    const q=measureAtStart(inclusive[1]),inside=parsePart(inclusive[2],recovery),used=totalSeconds(inside);
    if(!q||q.unit!=="duration"||used===null||used>q.value)throw new Error("Durée du bloc inclus non vérifiable : "+t);
    return [...(q.value>used?[{...atom(inclusive[1],recovery),value:q.value-used,text:inclusive[1]+" (hors fractionné inclus)"}]:[]),...inside];
  }
  const repeat=t.match(/^(\d+)\s*[x×]\s*/i);
  if(repeat) {
    const times=Number(repeat[1]),body=t.slice(repeat[0].length).trim();
    if(body.startsWith("(")){
      let depth=0,end=-1;
      for(let i=0;i<body.length;i++){if(body[i]==="(")depth++;if(body[i]===")")depth--;if(depth===0){end=i;break;}}
      if(end<0)throw new Error("Série imbriquée non fermée.");
      const inside=parsePart(body.slice(1,end),recovery),suffix=body.slice(end+1).trim();
      if(!suffix || /^\.\s*$/.test(suffix))return repeatWithRecovery(times,inside,[],false);
      const sep=recoverySplit(" "+suffix);
      if(!sep.rest || sep.work)throw new Error("Récupération entre séries imprécise : "+suffix);
      return repeatWithRecovery(times,inside,parsePart(sep.rest,true),sep.paired||/après chaque|apres chaque/i.test(sep.rest));
    }
    // Conventional seconds-based short/short notation, e.g. 6x30/30.
    const short=body.match(/^(\d+)\s*\/\s*(\d+)(?=\s|$)(.*)$/);
    if(short)return repeatWithRecovery(times,[atom(short[1]+"s"+short[3],recovery)],[atom(short[2]+"s récupération",true)],true);
    const split=recoverySplit(body);
    const work=[atom(split.work,recovery)];
    if(!split.rest)throw new Error("Préciser la récupération entre répétitions : "+t);
    return repeatWithRecovery(times,work,parsePart(split.rest,true),split.paired||/après chaque|apres chaque/i.test(split.rest));
  }
  return [atom(t,recovery)];
}
export function parsePrescription(text:string): PrescriptionNode[] {
  const nodes=parsePart(text);
  if(!nodes.length)throw new Error("Prescription vide.");
  return nodes;
}
export function prescriptionSeconds(nodes:PrescriptionNode[]):number|null { return totalSeconds(nodes); }
export function splitSportParts(sport:string, parts:PrescriptionPart[]):SportPrescription[] {
  const normalize=(s:string)=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const sportOf=(s:string):string|null=>{const n=normalize(s);if(/natation|swim|piscine/.test(n))return "natation";if(/velo|bike|cyclisme/.test(n))return "cyclisme";if(/course|run|\bcap\b|trail/.test(n))return "course";return null;};
  const marker=/(?:^|\s*[+|;]\s*)(natation|swim|vélo|velo|bike|cyclisme|course(?: à pied)?|run|cap)\s*:\s*/gi;
  const labelled:Array<PrescriptionPart & {sport:string|null}>=[];
  for(const p of parts){
    const matches=[...p.text.matchAll(marker)];
    if(!matches.length){labelled.push({sport:sportOf(p.part),part:p.part,text:p.text,zones:p.zones});continue;}
    if(matches[0].index>0 && p.text.slice(0,matches[0].index).trim())
      labelled.push({sport:sportOf(p.part),part:p.part,text:p.text.slice(0,matches[0].index).trim(),zones:p.zones});
    matches.forEach((m,i)=>labelled.push({sport:sportOf(m[1]),part:p.part,text:p.text.slice(m.index+m[0].length,matches[i+1]?.index??p.text.length).trim(),zones:p.zones}));
  }
  const distinct=[...new Set(labelled.map(p=>p.sport).filter(Boolean))];
  const isMixed=/brick|brique|mixed|mixte|encha[iî]nement|combin[eé]/i.test(sport);
  if(!isMixed&&distinct.length<=1){
    if(distinct[0] && sportOf(sport) && distinct[0]!==sportOf(sport))
      throw new Error("Le sport de la séance contredit ses étapes explicites.");
    return [{sport,parts}];
  }
  if(distinct.length<2)throw new Error("Enchaînement : préciser les segments Natation:, Vélo: ou Course: avant l'export.");
  const segments:SportPrescription[]=[];let current=distinct[0];
  for(const p of labelled){
    current=p.sport||current;
    const last=segments[segments.length-1];
    const clean={part:p.part.replace(/^(?:natation|swim|vélo|velo|bike|cyclisme|course|run)\s*[-:]\s*/i,""),text:p.text,zones:p.zones};
    if(last?.sport===current)last.parts.push(clean);else segments.push({sport:current,parts:[clean]});
  }
  return segments;
}

export function prescriptionPartsFromText(details:string):PrescriptionPart[] {
  const text=String(details||"").replace(/\[ID:[^\]]*\]/gi,"").replace(/\*\*/g,"").trim();
  if(!text)return [];
  const headings=/(?:^|[|;\n]|\.\s+)\s*(warm[\s-]*up|échauffement|echauffement|main|corps(?: de séance)?|cool[\s-]*down|retour au calme)\s*:\s*/gi;
  const matches=[...text.matchAll(headings)]; const parts:PrescriptionPart[]=[];
  const add=(part:string,content:string)=>{const t=content.trim().replace(/[|;]\s*$/,"");if(t)parts.push({part,text:t,zones:[...new Set(t.match(/\bZ[1-7][abc]?\b/gi)||[])].map(z=>z.toUpperCase())});};
  if(!matches.length){add("Main",text);return parts;}
  if(matches[0].index>0)add("Main",text.slice(0,matches[0].index));
  matches.forEach((m,i)=>add(/warm|chauff/i.test(m[1])?"Warm-up":/cool|calme/i.test(m[1])?"Cool-down":"Main",text.slice(m.index+m[0].length,matches[i+1]?.index??text.length)));
  return parts;
}
