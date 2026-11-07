/** Old archives stay immutable. Never reinterpret their zero-based targets
 * during export, or create a new remote workout as an implicit repair. */
export function hasRetiredRecoveryGuidance(value:unknown):boolean{
 const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const scan=(w:unknown):boolean=>{
  if(!obj(w)||!Array.isArray(w.nodes))return false;
  const walk=(nodes:unknown[]):boolean=>nodes.some(n=>{
   if(!obj(n))return false;
   if(n.kind==='repeat')return Array.isArray(n.steps)&&walk(n.steps);
   const t=n.target;
   return n.domain==='recovery'&&obj(t)&&t.confidence==='model'&&['athlete_measurement_with_doctrine_model','athlete_reference_with_doctrine_model'].includes(String(t.source))&&(
    t.metric==='watts'&&t.min===0&&typeof t.max==='number'&&t.max>0||t.metric==='sec_per_km'&&typeof t.min==='number'&&t.min>0&&t.max===null);
  });
  return walk(w.nodes);
 };
 if(!obj(value)||!Array.isArray(value.weeks))return false;
 return value.weeks.some(w=>obj(w)&&Array.isArray(w.sessions)&&w.sessions.some(s=>obj(s)&&(scan(s.detStructuredWorkout)||obj(s.detStructuredComponents)&&(scan(s.detStructuredComponents.bike)||scan(s.detStructuredComponents.run)))));
}
