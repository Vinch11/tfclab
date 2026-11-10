// Build-time projection of the ordinary v2.1 coach form. Match unique boundaries and
// keep the diagnostic/config callbacks, quota fields and limiter editor in their source module.
function bound(text,needle){
  const at=text.indexOf(needle);
  if(at<0||at!==text.lastIndexOf(needle))throw Error('Formulaire TFCLab incompatible : '+needle);
  return at;
}
export function coachView(source){
  const optionList='const OBJECTIVE_OPTIONS = [';
  bound(source,optionList);
  source=source.replace(optionList,optionList+'\n  {value:"Cyclisme contre-la-montre",label:"Contre-la-montre vélo"},');
  const begin=bound(source,'  return (\n    <AppLayout title="Plan IA TFCL™" showBack>');
  const end=source.indexOf('</AppLayout>',begin);
  if(end<0)throw Error('Fin du formulaire TFCLab introuvable.');
  const configStart=bound(source,'{/* Left: Configuration Form */}');
  const config=source.slice(source.indexOf('<CollapsibleCard',configStart),bound(source,'{/* Adaptation Projections Summary */}'));
  const view=`  return (<main className="mx-auto max-w-4xl p-4 space-y-4"><a href="/planning/ai-plan">Retour à TFCLab</a>
    <h1 className="text-2xl font-bold">Plan d’entraînement · DET-ENGINE</h1>
    <label>Athlète <select value={currentAthlete?.id ?? ''} onChange={e=>setSelectedAthleteId(e.target.value)}>
      {athletes.map(a=><option key={a.id} value={a.id}>{a.nom}</option>)}</select></label>
    {currentAthlete && <>`;
  // Render the form only when a profile is selected. Its regular JSX appears verbatim.
  const rendered=view+config+`
    {athleteContext && <DetCoachPanel key={currentAthlete.id} clm={objective==='Cyclisme contre-la-montre'} disabled={!hasData} revision={JSON.stringify([athleteContext.data,athleteContext.diagnostic,buildConfigWithCoachOverrides(athleteContext.diagnostic),coachLimiterOrder,lastCoachOverridesPayload])}
      readInput={()=>({athleteId:currentAthlete.id,athlete:athleteContext.data,diagnostic:athleteContext.diagnostic,config:buildConfigWithCoachOverrides(athleteContext.diagnostic),pageLimiterOrder:coachLimiterOrder,coachPayload:lastCoachOverridesPayload})}/>}
    </>}</main>`;
  return 'import {DetCoachPanel} from "/integrations/det/DetCoachPanel";\n'+source.slice(0,begin)+rendered+source.slice(end+'</AppLayout>'.length);
}
