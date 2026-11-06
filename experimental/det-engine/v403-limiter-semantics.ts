/**
 * DET V4.03 — typed limiter semantics: the ONLY place where an application
 * limiter label (`identifiedLimitersRaw[i]`) is translated to a DET engine key.
 *
 * Contract (QA engineering candidate; scientificReview:false):
 *  - Only LOSSLESS translations are allowed: exact key, letter case, accents /
 *    surrounding whitespace. Every translation is reported with its kind.
 *  - No fuzzy matching, no synonym that changes physiology. A typo stays
 *    unknown. "Durabilité" is NOT "TTE"; "Durabilité (découplage)" is NOT
 *    "Durabilité"; "VMA" is NOT "VO2max"; "FTP/kg" is NOT "FTP".
 *  - The raw label is never rewritten in the config: the native validators
 *    keep receiving the app's exact `identifiedLimitersRaw`.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import {verifyReviewedTteThresholdDose} from './v353-reviewed-tte-dose';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

export type DetLimiterKey='tte'|'vo2max'|'ftp'|'durability_race_relative'|'vma_velocity'|'vlamax_reduction'|'css_threshold'|'ftp_relative';
export type DetTranslationKind='exact'|'case'|'accent_or_whitespace';

export interface DetLimiterCapability {
  key:DetLimiterKey;
  /** Exact application metric label(s) (`UnifiedGapAnalysis.metric`). */
  appLabels:readonly string[];
  /** Exact meaning in the application, quoted from its own definition. */
  appMeaning:string;
  /** DET branches that read this key as PRIMARY (file:symbol). */
  primaryBranches:readonly string[];
  scientificReview:false;
}

/** Engine capability registry — derived from the engine branches, not UI labels. */
export const DET_LIMITER_CAPABILITIES:Readonly<Record<DetLimiterKey,DetLimiterCapability>>={
  ftp_relative:{key:'ftp_relative',appLabels:['FTP/kg'],appMeaning:'Puissance FTP rapportée à la masse (W/kg), signal conservé du diagnostic, distinct de la FTP absolue. Travail du versant puissance seulement ; aucune prescription de perte de poids ni gain mesuré.',primaryBranches:['v410-time-trial-contract.ts:exact bike source evidence, original weight and diagnostic gap required'],scientificReview:false},
  vma_velocity:{key:'vma_velocity',appLabels:['VMA'],appMeaning:'Vitesse maximale aérobie (km/h), signal distinct de VO2max. Prescription de plafond aérobie à partir de la vitesse individuelle, sans conversion en consommation d’oxygène.',primaryBranches:['engine.ts:V408 primary running exact source preference + full-key 30% coverage'],scientificReview:false},
  vlamax_reduction:{key:'vlamax_reduction',appLabels:['VLamax'],appMeaning:'VLamax supérieure à la cible ; sens de réduction exigé de la valeur et de la cible du diagnostic existant de l’app. Endurance prolongée et seuil long co-contributeur ; aucune baisse mesurée ou garantie.',primaryBranches:['engine.ts:V408 primary running exact source preference + full-key 30% coverage'],scientificReview:false},
  css_threshold:{key:'css_threshold',appLabels:['CSS'],appMeaning:'Allure CSS propre à la nage considérée (s/100 m), comparée à la cible de programme du coach ; pas un TTE ni une transposition aux autres nages.',primaryBranches:['engine.ts:runningQualityCache (swim, exact MLSS blocks)'],scientificReview:false},
  tte:{key:'tte',appLabels:['TTE'],
    appMeaning:'TTE effectif (min tenues au seuil) vs cible TTE par objectif/ambition/âge (unifiedLimiterDetection.ts, bloc TTE).',
    primaryBranches:[
      'engine.ts:ttePreferenceEnabled (V355 key-slot order, prioritizeSourceVerifiedTteOnKeySlots)',
      'engine.ts:runningQualityCache (endurance key quality: domain mlss)',
      'engine.ts:requireVerifiedRunningPhaseEvidence (V358 semi/10k horizon)',
    ],scientificReview:false},
  vo2max:{key:'vo2max',appLabels:['VO2max'],
    appMeaning:'VO2max (ml/kg/min) vs cible par objectif.',
    primaryBranches:['engine.ts:runningQualityCache (endurance key quality: domain vo2max)'],scientificReview:false},
  ftp:{key:'ftp',appLabels:['FTP'],
    appMeaning:'FTP absolue (W). « FTP/kg » est une autre grandeur et n\'est PAS traduite.',
    primaryBranches:['engine.ts:runningQualityCache (endurance key quality: mlss/sub_threshold/vo2max)'],scientificReview:false},
  durability_race_relative:{key:'durability_race_relative',appLabels:['Durabilité'],
    appMeaning:'F-24 : même mesure (TTE effectif, min au seuil) comparée à une cible RELATIVE À L\'ÉPREUVE '+
      'min(90, max(30, durée course × fraction d\'intensité)) — active seulement si TTE < cible TTE ; '+
      'catégorie « durability », levier app increase_tte (unifiedLimiterDetection.ts METRIC_TO_CATEGORY / CATEGORY_TO_LEVER).',
    primaryBranches:[
      'engine.ts:durabilityPreferenceEnabled (V403 key-slot order, prioritizeSourceVerifiedRaceDurabilityOnKeySlots)',
      'engine.ts:det_v403_race_durability_coverage (blocking audit on load weeks)',
    ],scientificReview:false},
};

const LABEL_TO_KEY=new Map<string,DetLimiterKey>(
  Object.values(DET_LIMITER_CAPABILITIES).flatMap(c=>c.appLabels.map(l=>[l,c.key] as const)));
/** Engine-native lowercase keys already used by CI benches ('tte'). */
const ENGINE_KEYS=new Set<string>(Object.keys(DET_LIMITER_CAPABILITIES));
const stripAccents=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export type DetLimiterResolution=
  | {raw:string;status:'supported';key:DetLimiterKey;translation:DetTranslationKind}
  | {raw:string;status:'unsupported';key:null;reason:string};

/** Lossless resolution only. Unknown or physiologically different ⇒ unsupported with reason. */
export function resolveDetLimiter(raw:unknown):DetLimiterResolution {
  const r=typeof raw==='string'?raw:String(raw??'');
  if(LABEL_TO_KEY.has(r))return {raw:r,status:'supported',key:LABEL_TO_KEY.get(r)!,translation:'exact'};
  if(ENGINE_KEYS.has(r))return {raw:r,status:'supported',key:r as DetLimiterKey,translation:'exact'};
  const lower=r.trim().toLowerCase();
  for(const [label,key] of LABEL_TO_KEY){
    if(label.toLowerCase()===lower)return {raw:r,status:'supported',key,translation:r.trim()===r?'case':'accent_or_whitespace'};
  }
  if(ENGINE_KEYS.has(lower))return {raw:r,status:'supported',key:lower as DetLimiterKey,translation:r.trim()===r?'case':'accent_or_whitespace'};
  const folded=stripAccents(lower);
  for(const [label,key] of LABEL_TO_KEY){
    if(stripAccents(label.toLowerCase())===folded)return {raw:r,status:'supported',key,translation:'accent_or_whitespace'};
  }
  const known:Record<string,string>={
    'durabilite (decouplage)':'signal différent (découplage aérobie % d\'un test Z2, entrée qualitative) : aucune définition DET',
    'vma':'VMA (vitesse) ≠ VO2max : aucune traduction ; aucune branche DET',
    'ftp/kg':'FTP/kg ≠ FTP absolue : aucune traduction ; aucune branche DET',
    'vlamax':'aucune branche DET primaire (validateurs natifs seulement)',
    'fatmax':'aucune branche DET primaire (validateurs natifs seulement)',
    'economie':'aucune branche DET primaire (validateurs natifs seulement)',
    'robustesse':'aucune branche DET primaire (validateurs natifs seulement)',
    "w'":'aucune branche DET primaire (validateurs natifs seulement)',
    "w' (kj)":'aucune branche DET primaire (validateurs natifs seulement)',
  };
  return {raw:r,status:'unsupported',key:null,reason:known[folded]??'libellé inconnu du moteur DET (aucune correspondance approximative)'};
}

export function detPrimaryLimiterKey(config:{identifiedLimitersRaw?:readonly unknown[]}):DetLimiterKey|null {
  const first=config.identifiedLimitersRaw?.[0];
  if(first===undefined)return null;
  const r=resolveDetLimiter(first);
  return r.status==='supported'?r.key:null;
}

/** Families whose CI-proven option set reads the PRIMARY limiter, and the keys they define. */
export const FAMILY_PRIMARY_REQUIREMENT:Readonly<Record<string,{keys:readonly DetLimiterKey[];why:string}|null>>={
  cycling_tt:{keys:['ftp','ftp_relative','tte','vo2max','vlamax_reduction'],why:'V410 exact bike source coverage plus declared race and posture evidence'},
  cycling_ftp:{keys:['ftp'],why:'V359 dedicated cycling + explicit programme FTP target'},
  swimming_css:{keys:['css_threshold','tte'],why:'V359 dedicated swimming + explicit CSS target / original bench TTE scope'},
  triathlon_sprint:{keys:['vo2max','tte','vma_velocity','vlamax_reduction'],why:'V359 short triathlon source-domain quality'},
  triathlon_olympic:{keys:['vo2max','tte','vma_velocity','vlamax_reduction'],why:'V359 short triathlon source-domain quality'},
  trail_short:{keys:['vo2max'],why:'V360 exact uphill VO2 dose + route/history trail audit'},
  trail_mountain:{keys:['tte','durability_race_relative'],why:'V360 exact threshold dose + route/history trail audit'},
  trail_ultra:{keys:['tte','durability_race_relative'],why:'V360 exact threshold dose + route/history trail audit'},
  '10k':{keys:['tte','durability_race_relative','vo2max','vma_velocity','vlamax_reduction'],why:'v358 strict exact threshold-dose horizon and 10 km phase preparation'},
  marathon:{keys:['tte','durability_race_relative','vo2max','vma_velocity','vlamax_reduction'],
    why:'option marathon prioritizeSourceVerifiedTteOnKeySlots / prioritizeSourceVerifiedRaceDurabilityOnKeySlots + audit V351'},
  semi_marathon:{keys:['tte','durability_race_relative','vo2max','vma_velocity','vlamax_reduction'],why:'V358 phase/source + V408 exact primary coverage'},triathlon_703:null,triathlon_ironman:null,
};

export interface LimiterSemanticsTrace {
  rawPriorities:string[];
  resolutions:Array<DetLimiterResolution&{rank:number;role:'primary'|'secondary';
    policy:'det_primary_branch'|'native_validators_only'|'blocked_unsupported_primary'|'retained_unsupported_secondary'}>;
  blocking:null|{code:'blocked_unsupported_limiter';raw:string;reason:string;missingItems:string[]};
  scientificReview:false;
}

/** Applies the family's explicit primary/secondary policy. Never drops or reorders a raw priority. */
export function traceLimiterSemantics(raw:readonly string[],familyKey:string):LimiterSemanticsTrace {
  const req=FAMILY_PRIMARY_REQUIREMENT[familyKey]??null;
  let blocking:LimiterSemanticsTrace['blocking']=null;
  const resolutions=raw.map((label,i)=>{
    const r=resolveDetLimiter(label);
    const role=i===0?'primary' as const:'secondary' as const;
    let policy:LimiterSemanticsTrace['resolutions'][number]['policy'];
    if(role==='primary'){
      if(!req)policy='native_validators_only';
      else if(r.status==='supported'&&req.keys.includes(r.key))policy='det_primary_branch';
      else{
        policy='blocked_unsupported_primary';
        blocking={code:'blocked_unsupported_limiter',raw:label,
          reason:r.status==='unsupported'?r.reason:`clé DET « ${r.key} » sans branche primaire pour cette famille`,
          missingItems:[
            `définition DET typée pour « ${label} » (signal, unités, cible, incertitude) issue du diagnostic de l'app`,
            `preuve source V3 (domaine + clés limiteur + dose exacte) pour ce limiteur dans la famille ${familyKey}`,
            `banc CI d'acceptation stricte ${familyKey} avec ce limiteur primaire`,
          ]};
      }
    }else policy=r.status==='supported'?'native_validators_only':'retained_unsupported_secondary';
    return {...r,rank:i+1,role,policy};
  });
  return {rawPriorities:[...raw],resolutions,blocking,scientificReview:false};
}

export interface RaceDurabilityProof {
  exactDose:(id:string,durationMin:number)=>StructuredZoneDose|null|undefined;
  limiterKeys:(id:string)=>readonly string[]|null|undefined;
  primaryDomain:(id:string)=>string|null|undefined;
}
export type RaceDurabilityDecision={verified:boolean;basis:'app_lever_increase_tte_threshold_sustain'|null;
  reason:string|null;scientificAttestation:false};
/**
 * Load-week key-session proof for primary « Durabilité » (race-relative).
 * The app's OWN lever for this category is increase_tte
 * (unifiedLimiterDetection.ts CATEGORY_TO_LEVER.durability), and its measured
 * signal is TTE minutes at threshold: the only existing source proof at that
 * scope is the V353 exact MLSS threshold-tolerance block (>=20 exact Z4 min),
 * reused unchanged. What stays DISTINCT from primary TTE:
 *  - the config keeps the raw label « Durabilité » ⇒ the native final limiter
 *    coherence validator checks the « durabilit » session pattern (long run,
 *    simulation, negative split…), not the « tte » pattern;
 *  - the race-relative part is proven only by the existing marathon V351 peak
 *    race-specific evidence (no new pace/dose rule);
 *  - V358 (semi/10k TTE horizon) is NOT enabled for it;
 *  - its own blocking coverage audit and provenance key.
 * V3 key "durability" (LT1 easy endurance) and marathon-pace blocks are NOT
 * accepted as load-week key proof: different domain / not the app's lever.
 * Progression toward the race-relative minutes target is NOT measured.
 */
export function verifyReviewedRaceDurabilityKey(session:ParsedSession,proof:RaceDurabilityProof):RaceDurabilityDecision {
  const no=(reason:string):RaceDurabilityDecision=>({verified:false,basis:null,reason,scientificAttestation:false});
  if(!session.isKeySession||session.sport!=='run'||session.isRest||typeof session.catalogId!=='string'||
     typeof session.durationMin!=='number'||!Number.isFinite(session.durationMin)||session.durationMin<=0)
    return no('not_a_key_run_with_source_and_duration');
  const id=session.catalogId,min=session.durationMin;
  try{
    const d=verifyReviewedTteThresholdDose({sourceId:id,durationMin:min,dose:proof.exactDose(id,min),
      sourceLimiterKeys:proof.limiterKeys(id),sourcePrimaryDomain:proof.primaryDomain(id)});
    return d.verified?{verified:true,basis:'app_lever_increase_tte_threshold_sustain',reason:null,scientificAttestation:false}:no(d.reason??'unverified');
  }catch{return no('source_proof_provider_failed');}
}
