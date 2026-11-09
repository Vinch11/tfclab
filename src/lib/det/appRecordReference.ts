import type { FrozenAppPlanningInput } from './appPlanningInput';
import type { AthleteRecordView, PrefilledField } from './athleteDetBridge';
import type { AnchorEntry, CoachDetInputSnapshot } from './coachDetContext';

/** An existing app reference is neither an attested measurement nor a newly
 * invented estimate. Unknown nature/error remain unknown in the saved audit. */
export function appRecordReference(record:AthleteRecordView,field:PrefilledField,fp:string|null):AnchorEntry|null {
  if(!fp || !/^[a-f0-9]{64}$/.test(fp))return null;
  const recordId=field.origin==='snapshot'?record.snapshot?.id:record.athleteId;
  if(!recordId)return null;
  return {value:field.value,kind:'app_reference',method:field.method,
    measuredOn:null,uncertainty:'Nature et marge d’erreur non documentées dans la référence ; aucune précision de mesure présumée.',
    recordReference:{athleteId:record.athleteId,coachId:record.coachId,field:field.key,origin:field.origin,recordId,
      recordedOn:field.recordedOn,source:field.origin==='snapshot'?record.snapshot?.source??null:'athlete_profile',planningInputFingerprint:fp,
      declaredNature:field.typedKind??'undocumented'}};
}

export function appRecordReferenceProblems(snapshot:CoachDetInputSnapshot,app:FrozenAppPlanningInput|null|undefined):string[] {
  if([...Object.values(snapshot.physiology??{}),...Object.values(snapshot.swimDomainPaces??{})].some(v=>v?.kind==='app_reference'))return ['Une référence de l’app doit être une ancre numérique liée au profil partagé.'];
  const entries=Object.entries(snapshot.anchors).filter(([,v])=>v?.kind==='app_reference');
  if(!entries.length)return [];
  if(!app)return ['Les références du snapshot exigent le profil partagé de l’app ; la saisie manuelle ne peut pas leur attribuer cette provenance.'];
  const pairs:Record<string,unknown>={runThresholdPaceSecPerKm:app.athlete.paceThresholdSecPerKm,runVvo2SpeedMps:typeof app.athlete.vma==='number'?app.athlete.vma/3.6:null,bikeFtpWatts:app.athlete.ftp,cssSecPer100m:app.athlete.css};
  const out:string[]=[];
  for(const [key,value] of entries){const r=value!.recordReference;
    if(!r || r.field!==key || r.athleteId!==snapshot.athleteId || r.coachId!==snapshot.coachId || app.athleteId!==snapshot.athleteId || snapshot.planningInputFingerprint!==app.fingerprint || r.planningInputFingerprint!==app.fingerprint)out.push(`Référence ${key} : origine différente du profil partagé.`);
    const expected=pairs[key];
    if(typeof expected!=='number'||typeof value!.value!=='number'||!Number.isFinite(expected)||Math.abs(expected-value!.value)>1e-9)out.push(`Référence ${key} : valeur différente ou absente du profil partagé ; aucune substitution.`);
  }
  return out;
}
