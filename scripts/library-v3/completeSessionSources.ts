/** Supplemental, unreviewed app-profile prescriptions. The original 800
 * and the qualified family pools remain unchanged. No source approval. */
import strengthRaw from './v3StrengthNext100.json';
import swimRaw from './v3SwimNext100.json';
import type {V3Workout,V3Block,V3Leaf,Bounds} from './catalogueRuntime';

export const BODYWEIGHT_POLICY='bodyweight_only_source_rpe_no_external_load';
export const SOURCE_RPE_LOAD_POLICY='source_prescribed_rpe_load_no_measured_weight';
export const TIMED_SWIM_POLICY='qualitative_timeboxed_no_pace_conversion';
const fixed=(base:number):Bounds=>({min:base,base,max:base});
const time=(seconds:number,label:string,role:'warmup'|'main'|'cooldown'='main',rpe?:[number,number],reps?:number):V3Leaf=>({kind:'time',seconds:fixed(seconds),domain:null,role,label,...(rpe?{rpeRange:{min:rpe[0],max:rpe[1]}}:{}),...(reps?{repsTarget:fixed(reps)}:{})});
function finish(base:V3Workout,id:string,title:string,phase:string[],blocks:V3Block[],hours:number,policy:string):V3Workout {
 const w=structuredClone(base);Object.assign(w,{id,title,version:'3.3.0-complete-candidate',phase,blocks,minimumLevel:'light',minimumRecoveryHours:hours,automaticSelection:false,status:'candidate'});
 w.prescription.physiologicalIntent.statement=w.focus;
 w.prescription.physiologicalIntent.domainIds=[];
 w.prescription.physiologicalIntent.primaryDomain=null;w.primaryDomain=null;
 w.prescription.individualization.anchors=[{domain:null,key:'source_effort_instruction',transform:'qualitative_instruction_no_measured_threshold_or_load',missing:'unresolved'}];
 if(w.sport==='strength')w.prescription.individualization.strengthLoadSelection=policy;
 else w.prescription.individualization.swimCssPolicy=policy;
 w.prescription.duration.classification=w.sport==='strength'?'timeboxed_executable':'exact_time';
 w.prescription.duration.requiredMeasurements=[];
 w.prescription.admissibility={...w.prescription.admissibility,minimumLevel:w.minimumLevel,phases:phase,minimumRecoveryHours:hours,prerequisites:[...w.prerequisites],contraindications:[...w.contraindications],stopRule:w.stopRule};
 const parameters:V3Workout['prescription']['parameters']=[];
 function walk(bs:V3Block[],prefix=''){for(const [i,b] of bs.entries()){const p=prefix?`${prefix}.${i}`:String(i);const add=(key:string,bounds:Bounds,unit:string)=>parameters.push({path:`${p}.${key}`,unit,...bounds,risk:'fixed_source_prescription'});if(b.kind==='repeat'){add('count',b.count,'count');walk(b.steps,p);}else{add('seconds',b.seconds!,'seconds');if(b.repsTarget)add('repsTarget',b.repsTarget,'reps');}}}
 walk(blocks);w.prescription.parameters=parameters;return w;
}
const strengthBase=strengthRaw.workouts[0] as unknown as V3Workout;
const movementSets=[
 ['Squat vers une chaise : descendre en contrôle, genoux dans l’axe','Pont fessier : pousser par les talons, bassin stable','Pompes au mur : corps aligné, coudes contrôlés','Bird-dog : alterner bras et jambe opposés sans tourner le bassin','Élévations de mollets avec appui : monter et descendre sans rebond','Planche latérale sur les genoux : bassin aligné, changer de côté à mi-créneau'],
 ['Fente arrière avec appui : amplitude confortable, alterner les jambes','Charnière de hanche sans charge : dos neutre, hanches vers l’arrière','W au mur : rapprocher les omoplates sans hausser les épaules','Dead bug : souffler en allongeant bras et jambe opposés','Mollets genoux légèrement fléchis avec appui : mouvement lent','Équilibre unipodal : alterner les côtés à mi-créneau, garder le bassin horizontal'],
];
export const completeStrengthSources:V3Workout[]=(['base','build','peak','taper'] as const).flatMap((phase,index)=>movementSets.map((moves,variant)=>{
 const taper=phase==='taper',rounds=taper?1:phase==='build'?3:2,station=taper?45:60;
 const warmup=time(taper?180:360,'Marche sur place 2 min puis mobilisations douces des chevilles, hanches et épaules ; gestes à vide, sans douleur','warmup');
 const steps=moves.map((move,i)=>time(station,`${move}. ${taper?'20 s de mouvement facile puis 25 s de repos/changement':'30 s maximum de mouvement puis 30 s de repos/changement'} ; arrêter avant perte de technique, ne pas chercher l’échec`, 'main',taper?[2,3]:[4,6],i===5?undefined:taper?4:8));
 const w=finish(strengthBase,`V3P_STRENGTH_${201+index*2+variant}`,`Renforcement complet ${variant?'B':'A'} — ${phase}`, [phase],[warmup,{kind:'repeat',label:'Circuit complet : six ateliers ; répétitions plafonnées, pas de travail continu pendant tout le créneau',count:fixed(rounds),betweenSec:0,steps},time(taper?90:180,'Marche lente et respiration, bilan des sensations','cooldown')],taper?0:phase==='peak'?12:24,BODYWEIGHT_POLICY);
 w.focus='Entretenir la force générale, le contrôle du bassin et du tronc et la tolérance musculaire sans épuisement';
 w.primaryIntent=taper?'mobility_prevention':'strength_endurance';w.prescription.physiologicalIntent.primaryIntent=w.primaryIntent;w.prescription.physiologicalIntent.statement=w.focus;
 w.prerequisites=['Mouvements déjà tolérés sans douleur ; version assistée disponible'];w.contraindications=['Douleur, instabilité ou technique non maîtrisée','Fatigue incompatible avec les gestes proposés'];
 w.prescription.admissibility.prerequisites=[...w.prerequisites];w.prescription.admissibility.contraindications=[...w.contraindications];
 Object.assign(w,{equipment:['chaise stable','mur','tapis']});
 w.methodology='Poids du corps uniquement, appui autorisé. Le RPE est une consigne de séance, pas une charge mesurée. Faire au plus les répétitions indiquées pendant la fenêtre de mouvement ; utiliser le temps restant pour récupérer. Les exercices unilatéraux alternent les côtés à mi-créneau. Aucun kilogramme ni 1RM présumé.';
 return w;
}));
/** Introductory support for athletes returning to regular training. These
 * distinct prescriptions are never used as evidence of maximal strength. */
export const introductoryStrengthSources: V3Workout[] = [
  ['Assis-debout depuis une chaise stable', 'Pompes debout contre un mur', 'Montées sur les deux pointes avec appui'],
  ['Pont fessier au sol', 'Charnière de hanche sans charge face à un appui', 'Élévations de talons assis'],
].map((movements, index) => {
  const phase = ['base','build','peak','taper'];
  const blocks: V3Block[] = [
    time(180, 'Marche facile sur place puis répéter doucement les gestes à vide.', 'warmup'),
    {kind:'repeat', label:'Deux passages faciles avec récupération dans chaque atelier',
      count:fixed(2), betweenSec:60, steps:movements.map(movement =>
        time(60, movement + ' : jusqu’à 4 répétitions confortables pendant 20 secondes maximum, puis repos pendant le reste de la minute.', 'main', [2,3], 4))},
    time(120, 'Marche lente puis bilan du confort des gestes.', 'cooldown'),
  ];
  const workout = finish(strengthBase, 'V3P_STRENGTH_' + (217 + index),
    'Reprise · renforcement sans charge ' + (index ? 'B' : 'A'), phase, blocks, 24, BODYWEIGHT_POLICY);
  workout.minimumLevel = 'untrained';
  workout.primaryIntent = 'mobility_prevention';
  workout.focus = 'Reprendre des gestes simples et contrôlés au poids du corps.';
  workout.methodology = 'Séance de soutien TFCLab. Choisir une amplitude confortable, garder un appui stable et finir chaque série avec une marge. Le ressenti proposé est une consigne, sans estimation de charge maximale.';
  workout.prerequisites = ['Gestes proposés et position de départ tolérés, vérifiés avec le coach'];
  workout.contraindications = ['Douleur ou instabilité pendant un geste', 'Fatigue incompatible avec une exécution contrôlée'];
  workout.prescription.physiologicalIntent = {...workout.prescription.physiologicalIntent,
    primaryIntent:workout.primaryIntent, statement:workout.focus, limiterKeys:['strength_mechanics']};
  workout.prescription.admissibility = {...workout.prescription.admissibility, minimumLevel:workout.minimumLevel,
    prerequisites:[...workout.prerequisites], contraindications:[...workout.contraindications]};
  Object.assign(workout,{equipment:index ? ['tapis','chaise stable'] : ['chaise stable','mur']});
  return workout;
});

/** Complete alternatives for trained athletes. RPE and repetition targets are
 * prescriptions, not measured loads or proof of maximal strength adaptation.
 * Principle support: https://pubmed.ncbi.nlm.nih.gov/38165636/ . The exact
 * original compositions below have no independent session validation.
 */
export const trainedStrengthSources:V3Workout[]=(['base','build','peak','taper'] as const).flatMap((phase,index)=>[0,1].map(variant=>{
 const taper=phase==='taper',maintenance=phase==='peak',rounds=taper||maintenance?1:phase==='build'?3:2;
 const moves=variant?['Fente arrière chargée ou split squat déjà maîtrisé : 5 répétitions de chaque côté','Hip thrust avec charge maîtrisée : 5 répétitions','Mollets genoux fléchis avec charge maîtrisée : 5 répétitions lentes']:['Squat avec charge maîtrisée ou presse déjà pratiquée : 5 répétitions','Soulevé de terre roumain avec charge maîtrisée : 5 répétitions','Mollets debout avec charge maîtrisée : 5 répétitions lentes'];
 const rpe:[number,number]=taper?[3,4]:maintenance?[6,7]:[7,8];
 const steps=moves.map(move=>time(taper?90:180,taper?`${move.replace(/chargée|avec charge maîtrisée|avec une charge maîtrisée/g,'sans charge externe')}. Mobilisation facile, sans fatigue ni série lourde ; utiliser le temps restant pour récupérer`:`${move}. Choisir la charge pour RPE ${rpe[0]}–${rpe[1]}/10, conserver au moins 2 répétitions en réserve ; terminer les répétitions puis se reposer le reste des 3 min, au moins 2 min. Si le geste n’est pas déjà maîtrisé, le coach doit adapter avant exécution`,'main',rpe,5));
 const w=finish(strengthBase,`V3P_STRENGTH_${209+index*2+variant}`,`${taper?'Mobilité et activation':maintenance?'Entretien de force':'Force avec charge'} ${variant?'B':'A'} — ${phase}`,[phase],[time(taper?180:360,'Échauffement général puis séries progressives légères des gestes déjà maîtrisés ; adapter avec le coach, ne pas tester de charge maximale','warmup'),{kind:'repeat',label:'Séries de force séparées par des récupérations complètes',count:fixed(rounds),betweenSec:0,steps},time(taper?180:240,'Gainage latéral complet ou Pallof press déjà maîtrisé : efforts brefs de 15 à 20 s, alterner les côtés, récupérer entre efforts','main',taper?[2,3]:[4,5]),time(taper?90:180,'Retour au calme et bilan des sensations','cooldown')],taper?0:maintenance?24:48,SOURCE_RPE_LOAD_POLICY);
 w.minimumLevel='trained';w.primaryIntent=taper?'mobility_prevention':'max_strength';
 w.focus=taper?'Conserver la mobilité et les gestes sans charge lourde ni fatigue résiduelle':'Développer ou entretenir la force avec une charge individualisée et des récupérations complètes ; aucune amélioration chiffrée d’économie n’est garantie';
 w.prerequisites=['Pratique des exercices de force déjà acquise ; technique, matériel et charge adaptés par le coach avant exécution'];
 w.contraindications=['Geste chargé non maîtrisé, douleur, matériel indisponible ou fatigue incompatible'];
 w.methodology='Composition originale TFCLab, inspirée des principes de force pour coureurs (Sports Medicine 2024, PMID 38165636). Les créneaux incluent répétitions, installation et repos ; ne pas travailler continuellement pendant 3 min. Le RPE est une consigne, pas une conversion en pourcentage de 1RM ni une charge mesurée. Aucune charge en kilogrammes inventée, aucun test maximal. Réduire ou adapter avec le coach si les prérequis ne sont pas réunis.';
 w.prescription.physiologicalIntent={...w.prescription.physiologicalIntent,primaryIntent:w.primaryIntent,statement:w.focus};
 w.prescription.admissibility={...w.prescription.admissibility,minimumLevel:w.minimumLevel,prerequisites:[...w.prerequisites],contraindications:[...w.contraindications]};
 Object.assign(w,{equipment:['charges et supports adaptés aux exercices déjà maîtrisés','tapis']});return w;
}));
const swimBase=swimRaw.workouts[0] as unknown as V3Workout;
const swimThemes=[
 ['Alignement','Alterner 30 s de crawl souple et 30 s en se concentrant sur tête stable et regard vers le fond'],
 ['Appuis','Alterner 30 s de nage complète et 30 s en sentant la poussée de l’eau vers l’arrière, sans forcer l’épaule'],
 ['Respiration','Crawl souple : expirer dans l’eau, inspirer au besoin ; aucune apnée ni fréquence respiratoire imposée'],
 ['Régularité','Nager à un effort facile reproductible, contrôler la longueur de nage et éviter d’accélérer en fin de bloc'],
 ['Rotation','Crawl souple : tourner épaules et bassin ensemble, sans croiser la main devant la tête'],
 ['Relâchement','Nage complète souple : épaules relâchées, bras sans crispation, garder une expiration régulière'],
];
export const timedSwimSources:V3Workout[]=swimThemes.flatMap(([theme,cue],i)=>[false,true].map(taper=>{
 const rounds=taper?2:3+i%3,work=taper?180:300,rest=30;
 const w=finish(swimBase,`V3P_SWIM_${201+i*2+Number(taper)}`,`Natation au temps — ${theme}${taper?' — rappel court':''}`,taper?['taper']:['base','build','peak'],[
  {...time(240,'Nager très facilement ; se relâcher et vérifier le confort respiratoire','warmup',[1,2]),domain:'recovery'},
  {kind:'repeat',label:'Blocs faciles de qualité technique',count:fixed(rounds),betweenSec:0,steps:[{...time(work,`${cue}. Effort facile, sans essoufflement marqué ; RPE indicatif 2 à 3/10, jamais une équivalence mesurée de LT1`,'main',[2,3]),domain:'moderate_lt1'}, {...time(rest,'Récupération au mur ou nage très douce, reprendre une respiration confortable','main',[1,2]),domain:'recovery'}]},
  {...time(180,'Nager doucement, terminer sans fatigue technique','cooldown',[1,2]),domain:'recovery'}
 ],12,TIMED_SWIM_POLICY);
 w.focus='Pratiquer une nage facile et techniquement stable, prescrite au temps sans allure chronométrique imposée';w.primaryIntent='technique_economy';w.primaryDomain='moderate_lt1';
 w.prescription.physiologicalIntent={...w.prescription.physiologicalIntent,statement:w.focus,primaryIntent:w.primaryIntent,primaryDomain:w.primaryDomain,domainIds:['recovery','moderate_lt1']};
 w.prescription.individualization.anchors=['recovery','moderate_lt1'].map(domain=>({domain:domain as 'recovery'|'moderate_lt1',key:'source_qualitative_effort',transform:'no_pace_conversion_or_measured_threshold_claim',missing:'unresolved'}));
 Object.assign(w,{equipment:['bassin surveillé','horloge visible depuis le bassin']});
 w.methodology='Le temps est imposé ; la distance dépend de l’athlète et reste non prédite. Consignes qualitatives de la source, aucune allure calculée depuis CSS. Les domaines indiquent une intention de planification, pas une mesure de LT1. Ralentir ou arrêter si respiration ou technique se dégradent. Bassin surveillé et nage déjà maîtrisée requis.';
 w.prerequisites=['Nage autonome et aisée en bassin surveillé'];w.contraindications=['Douleur ou gêne respiratoire à la nage','Nage non maîtrisée ou absence de surveillance'];w.prescription.admissibility.prerequisites=[...w.prerequisites];w.prescription.admissibility.contraindications=[...w.contraindications];
 return w;
}));

// Dedicated swimming still needs a genuine sustained-work prescription;
// technical/easy fallback must not replace every quality slot.
const sustainedBase=swimRaw.workouts.find(w=>w.id==='V3P_SWIM_156') as unknown as V3Workout;
for(let i=0;i<2;i++){
 const w=finish(sustainedBase,`V3P_SWIM_${213+i}`,`Natation au temps — efforts soutenus réguliers ${i?'B':'A'}`,['base','build','peak'],[
  {...time(600,'Nager facilement, puis augmenter progressivement le rythme sans essoufflement marqué','warmup',[1,3]),domain:'recovery'},
  {kind:'repeat',label:'Efforts soutenus de qualité technique',count:fixed(4+i),betweenSec:0,steps:[{...time(120,'Nage soutenue régulière, RPE indicatif 6 à 7/10 ; conserver la technique, sans sprint ni recherche d’épuisement','main',[6,7]),domain:'mlss'},{...time(90,'Nage très facile ou récupération au mur ; reprendre une respiration confortable','main',[1,2]),domain:'recovery'}]},
  {...time(480,'Nager très facilement, relâcher les épaules et terminer confortablement','cooldown',[1,2]),domain:'recovery'}
 ],24,TIMED_SWIM_POLICY);
 w.focus='Soutenir un effort régulier en conservant la technique ; domaine de travail prévu, sans seuil biologique déclaré mesuré';w.primaryIntent='mlss';w.primaryDomain='mlss';
 w.prescription.physiologicalIntent={...w.prescription.physiologicalIntent,statement:w.focus,primaryIntent:w.primaryIntent,primaryDomain:w.primaryDomain,domainIds:['recovery','mlss']};
 w.minimumLevel='trained';w.prerequisites=['Nage autonome et efforts soutenus déjà pratiqués en bassin surveillé'];w.contraindications=['Douleur ou gêne respiratoire à la nage','Fatigue ou technique incompatibles avec un effort soutenu'];
 Object.assign(w,{equipment:['bassin surveillé','horloge visible depuis le bassin']});
 w.prescription.admissibility={...w.prescription.admissibility,minimumLevel:w.minimumLevel,prerequisites:[...w.prerequisites],contraindications:[...w.contraindications]};
 w.prescription.individualization.anchors=['recovery','mlss'].map(domain=>({domain:domain as 'recovery'|'mlss',key:'source_qualitative_effort',transform:'no_pace_conversion_or_measured_threshold_claim',missing:'unresolved'}));
 w.evidence.referenceIds=['SWIM2021'];
 w.methodology='Séance originale TFCLab au temps, avec effort prescrit par ressenti et récupération explicite ; aucune allure calculée depuis CSS. Le domaine est une intention de planification, pas une mesure du MLSS ; le RPE ne démontre pas que ce seuil est atteint. Réduire le rythme ou interrompre si la technique ou la respiration se dégradent. Cette dose exacte reste candidate et non validée scientifiquement.';
 timedSwimSources.push(w);
}

// Gap observed in the ordinary-form matrix: all timed pool cards required
// at least "light". These short, distinct recipes are for returning swimmers,
// not lessons for people unable to swim independently.
for(const [i,cue] of ['Chercher un alignement confortable sans accélérer.',
  'Expirer librement et garder une respiration confortable.'].entries()){
 const count={min:3,base:4+i,max:6};
 const blocks:V3Block[]=[
  {...time(180,'Nage très facile, pauses au mur si besoin.','warmup',[1,2]),domain:'recovery'},
  {kind:'repeat',label:'Courtes fractions faciles entrecoupées de repos',count,betweenSec:0,steps:[
   {...time(60,'Nager facilement sur une minute. '+cue,'main',[2,3]),domain:'moderate_lt1'},
   {...time(60,'Récupérer au mur ; ne reprendre que si la respiration est confortable.','main',[1,2]),domain:'recovery'}]},
  {...time(120,'Terminer par une nage très souple ou rester au mur.','cooldown',[1,2]),domain:'recovery'}];
 const parent=timedSwimSources[i*2];
 const w=finish(parent,'V3P_SWIM_'+(215+i),'Reprise en bassin · '+(i?'respiration':'alignement'),['base','build','peak','taper'],blocks,24,TIMED_SWIM_POLICY);
 w.minimumLevel='untrained';w.primaryDomain='moderate_lt1';w.origin='TFCLab : variante originale de reprise en bassin, sans allure extrapolée.';
 w.focus='Retrouver une nage autonome confortable par fractions courtes ; aucune évaluation de seuil.';
 w.prescription.physiologicalIntent={...parent.prescription.physiologicalIntent,statement:w.focus,limiterKeys:['technical_efficiency']};
 w.prescription.individualization=structuredClone(parent.prescription.individualization);
 w.prerequisites=['Savoir déjà nager seul en bassin surveillé et avoir toléré la nage facile ; à confirmer par le coach'];
 w.contraindications=[...parent.contraindications];
 w.stopRule='Arrêter en cas de gêne respiratoire, de douleur ou de technique dégradée.';
 w.prescription.admissibility={...w.prescription.admissibility,minimumLevel:w.minimumLevel,prerequisites:[...w.prerequisites],contraindications:[...w.contraindications],stopRule:w.stopRule};
 const parameter=w.prescription.parameters.find(p=>p.path==='1.count')!;parameter.risk='bounded_easy_repeat_count';
 w.methodology='Un cycle comprend la nage et le repos au mur. Durée totale 11 à 17 minutes. Ne pas déduire une allure de CSS, ni une capacité à nager de la seule catégorie de niveau.';
 timedSwimSources.push(w);
}

// Two short pool appointments topped out at 34 minutes combined on the
// 24-week half-distance return. Progress an established short swim without
// converting CSS to an unmeasured easy pace or assuming open-water competence.
export const returnSwimProgressionId='V3P_SWIM_217';
const shortSwim=timedSwimSources.find(source=>source.id==='V3P_SWIM_216')!;
const returnSwim=structuredClone(shortSwim);
returnSwim.id=returnSwimProgressionId;
returnSwim.version='3.6-return-pool-candidate';
returnSwim.title='Reprise en bassin · maintenir la nage facile';
returnSwim.focus='Enchaîner des fractions faciles en gardant une respiration confortable et une technique stable.';
returnSwim.methodology='Après des séances courtes bien tolérées en bassin surveillé, nager deux minutes à allure libre puis récupérer une minute au mur. Réduire le nombre de fractions si la technique se dégrade.';
returnSwim.prerequisites=[...shortSwim.prerequisites,'Les premières séances de 15 minutes en bassin ont été tolérées ; vérifier le ressenti avant de prolonger.'];
returnSwim.prescription.admissibility.prerequisites=[...returnSwim.prerequisites];
returnSwim.prescription.physiologicalIntent.statement=returnSwim.focus;
const swimRepeat=returnSwim.blocks[1];
if(swimRepeat.kind!=='repeat'||swimRepeat.steps[0].kind!=='time')throw Error('return_swim_parent_shape');
swimRepeat.count={min:4,base:5,max:7};
swimRepeat.steps[0].seconds=fixed(120);
swimRepeat.steps[0].label='Nager facilement pendant deux minutes avec une respiration confortable.';
returnSwim.prescription.parameters=returnSwim.prescription.parameters.map(parameter=>{
  if(parameter.path==='1.count')return {...parameter,...swimRepeat.count};
  if(parameter.path==='1.0.seconds')return {...parameter,...fixed(120)};
  return parameter;
});
timedSwimSources.push(returnSwim);
