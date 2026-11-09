/** Presentation only: keep the archived prescription intact. No target,
 * block, recovery, qualification or physiological model is recomputed. */
export function readableV3Prescription(session: {catalogId?:string|null;details?:string}):string {
  const text=session.details??'';
  if(!/^V3[PB]_/.test(session.catalogId??'')||!text.includes('DURÉE CALCULÉE :'))return text;
  const number=(n:number)=>String(Number(n.toFixed(6))).replace('.',',');
  const duration=(seconds:number)=>{
    if(!Number.isFinite(seconds)||seconds<0)return String(seconds)+' s';
    const h=Math.floor(seconds/3600),m=Math.floor((seconds-h*3600)/60),s=seconds-h*3600-m*60;
    return [h?`${h} h`:'',m?`${m} min`:'',s||(!h&&!m)?`${number(s)} s`:''].filter(Boolean).join(' ');
  };
  return text
    .replace(/\b(\d+(?:\.\d+)?)s\b/g,(_,n)=>duration(Number(n)))
    .replace(/\b(\d+(?:\.\d+)?) secondes\b/g,(_,n)=>duration(Number(n)))
    .replace(/\s*\|\s*/g,'\n');
}
