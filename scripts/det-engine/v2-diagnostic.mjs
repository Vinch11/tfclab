/** Read-only experimental evidence diagnosis. No model, network, athlete records or sporting rule mutation. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const DIAGNOSTIC_VERSION='det-diagnostic-v2.2';
const BLOCKING=new Set(['blocking','critical','error']);
export const CATEGORIES={
 input_invalid_or_insufficient:'Données invalides ou insuffisantes',
 objective_constraint_incompatibility:'Objectif/ambition incompatibles avec les contrats courants',
 catalogue_insufficiency:'Catalogue ou domaine de prescription insuffisant',
 technical_assembly_failure:'Assemblage technique non abouti',
 physiological_incoherence:'Incohérence physiologique signalée',
 progression_periodization:'Progression ou périodisation signalée',
 sport_specificity:'Spécificité sportive signalée',
 repair_controller_failure:'Contrôleur ou réparation en échec',
 software_or_nondeterminism:'Défaut logiciel ou reproductibilité non démontrée',
};
const INPUT=/invalid|unsupported_horizon|initial_load_unverified|physiology_gap|data_quality|input_|missing_input/;
const PROGRESSION=/progression|periodization|phase_|load_pattern|coach_load|taper|mesocycle|recovery/;
const SPORT=/sport_ratio|sport_objective|objective_sport|race_day|race_calendar|lcw_|trail_|key_sessions_per_sport|continuity|milestone|banned_sport/;
const PHYSIO=/polarization|lorang|limiter_|wbal_|demanding_|intensity|key_session|injury/;
const TECHNICAL=/title_format|duration_coverage|layout_|quota_|duplicate_|rest_day|session_density|strategic_recap/;
function issueCategory(code){
 if(INPUT.test(code))return 'input_invalid_or_insufficient';
 if(/minimum_sessions_exceed|available_capacity|structured_floors_exceed|layout_below/.test(code))return 'objective_constraint_incompatibility';
 if(PROGRESSION.test(code))return 'progression_periodization';
 if(SPORT.test(code))return 'sport_specificity';
 if(PHYSIO.test(code))return 'physiological_incoherence';
 if(/catalogue/.test(code))return 'catalogue_insufficiency';
 if(TECHNICAL.test(code))return 'technical_assembly_failure';
 if(/controller|repair_/.test(code))return 'repair_controller_failure';
 return 'software_or_nondeterminism';
}
const countBy=(values)=>Object.fromEntries([...new Set(values)].sort().map(v=>[v,values.filter(x=>x===v).length]));
function causeFor(row){
 const reason=row.reason??'';
 if(row.technicallyConstructed)return {id:row.constraintsSatisfied?'constructed_without_executed_blocker':'constructed_with_executed_blocker',
  evidence:row.constraintsSatisfied?'Aucun blocage des contrôles exécutés ; avertissements et contrôles non exécutés restent distincts.':'Le plan existe ; les validateurs exécutés signalent des erreurs. Les codes sont des symptômes, pas des causes établies.',
  scope:'executed_controls_only',hypothesis:null,dependencies:['validation_context','selected_catalogue','placement']};
 if(reason==='dedicated_route_without_deterministic_quota')return {id:'dedicated_quota_contract_missing',evidence:'Le moteur refuse la route sans quota/layout déterministe dédié.',scope:'unsupported_route',hypothesis:'Contrat de prescription dédié à définir/retrouver, sans transposer les quotas route.',dependencies:['dedicated_sport_contract']};
 if(reason==='static_template_configuration_requires_review')return {id:'static_template_adapter_missing',evidence:'La garde V1 refuse un template si la durée, le texte de contraintes ou les courses déclarées diffèrent du cas pris en charge.',scope:'unsupported_adapter',hypothesis:'Le refus de tout texte de contrainte peut être plus large que les contraintes réellement incompatibles ; examiner le parseur existant.',dependencies:['static_template','constraint_parser']};
 if(reason==='existing_prevalidation_blocked')return {id:'fixed_contract_prevalidation_conflict',evidence:'Les contrats courants déclenchent au moins un contrôle bloquant de capacité, layout ou calendrier.',scope:'fixed_contract_only',hypothesis:'Distinguer une contradiction de saisie d’un placement/quota expérimental réparable.',dependencies:['prepared_quotas','weekly_layout','declared_calendar']};
 if(/^empty_catalogue_domain_week_/.test(reason))return {id:'empty_filtered_slot_domain',evidence:'Au moins un créneau n’a aucun candidat après filtres, durée et contrôle de compatibilité.',scope:'fixed_pool_and_layout_only',hypothesis:'Identifier séparément la sport/phase, les prérequis et les bornes de durée qui ont vidé le domaine ; l’insuffisance du catalogue entier n’est pas prouvée.',dependencies:['catalogue_scope','insertion_compatibility','slot_duration']};
 if(/^minimum_catalogue_dose_exceeds_budget_week_/.test(reason))return {id:'fixed_slot_minimum_dose_exceeds_ceiling',evidence:'La somme des doses minimales des domaines retenus dépasse le plafond de cette semaine.',scope:'fixed_pool_and_layout_only',hypothesis:'Vérifier si le placement, une variante exécutable ou les décisions antérieures rendent le plafond inutilement restrictif, sans changer ses seuils.',dependencies:['dose_ranges','volume_budget','previous_prescribed_load']};
 if(/^no_catalogue_assignment_week_/.test(reason))return {id:'no_assignment_in_current_search_space',evidence:'La recherche n’a pas trouvé d’affectation des domaines/placements courants sous ses contraintes.',scope:'fixed_pool_and_layout_only',hypothesis:'Examiner les couplages de doublons, récupération et capacité ; ne pas conclure à une impossibilité sportive globale.',dependencies:['catalogue_domains','placement','cross_session_constraints']};
 if(reason==='search_budget_exhausted')return {id:'bounded_search_inconclusive',evidence:'Budget de recherche épuisé ; ni solution ni impossibilité prouvée.',scope:'unknown',hypothesis:'Améliorer propagation/ordre de recherche ou allouer un budget explicitement borné.',dependencies:['search_node_limit','search_time_limit','domain_order']};
 if(/invalid|unsupported_horizon/.test(reason))return {id:'input_or_execution_budget_rejected',evidence:'Garde de saisie ou de budget déclenchée.',scope:'input_validation_only',hypothesis:null,dependencies:['input_contract','resource_policy']};
 return {id:'unclassified_refusal',evidence:reason||'Refus sans motif enregistré.',scope:'unknown',hypothesis:'Diagnostic incomplet : préserver le cas pour examen.',dependencies:['diagnostic_instrumentation']};
}
export function classifyCase(row){
 if(!row||typeof row.id!=='string'||!Array.isArray(row.issues))throw Error('INVALID_EVIDENCE_ROW');
 const issues=row.issues.map(i=>({...i,category:issueCategory(i.code??'unknown')}));
 const blocking=issues.filter(i=>BLOCKING.has(i.severity));
 const cause=causeFor(row);
 let category;
 if(row.technicallyConstructed)category=blocking[0]?.category??null;
 else if(cause.id==='dedicated_quota_contract_missing'||cause.id==='static_template_adapter_missing')category='sport_specificity';
 else if(cause.id==='fixed_contract_prevalidation_conflict')category='objective_constraint_incompatibility';
 else if(cause.id==='input_or_execution_budget_rejected')category='input_invalid_or_insufficient';
 else if(cause.id==='bounded_search_inconclusive')category='technical_assembly_failure';
 else if(cause.id==='unclassified_refusal')category='software_or_nondeterminism';
 else category='catalogue_insufficiency';
 const disposition=row.technicallyConstructed?(blocking.length?'constructed_nonconformant':'passes_executed_controls'):
  cause.scope.startsWith('unsupported')?'unsupported':cause.scope==='unknown'?'inconclusive':'rejected_current_contract';
 return {id:row.id,objective:row.objective??'unknown',sportFamily:/trail/i.test(row.objective??'')?'trail':['703','IM','Sprint','Olympic'].includes(row.objective)?'triathlon':'running',
  ambition:row.ambition??'unknown',level:row.level??'unknown',format:row.format??'continuous',disposition,category,
  rootCause:cause,issueCounts:countBy(issues.map(i=>i.severity)),blockingIssues:blocking.map(i=>({code:i.code,week:i.week,severity:i.severity,category:i.category})),
  warningCount:issues.filter(i=>i.severity==='warning').length,
  effectiveAmbition:row.effectiveAmbition??null,physiologicalContextRecorded:row.physiologicalContext!==undefined&&row.physiologicalContext!==null,
  controlEvidence:row.coverage?{executedControls:row.executedControls??row.coverage.executedControls,conditional:row.coverage.conditional,sportsAudit:row.coverage.sportsAudit?.controls?.map(c=>({id:c.id,execution:c.execution,result:c.result,classification:c.classification}))}:row.controls??null,
  globalInfeasibilityProven:row.infeasibilityProof?.scope==='global'&&row.infeasibilityProof?.verified===true,
  humanReviewRequired:row.humanReviewRequired!==false};
}
export const BASELINE_CONTROLS=[
 {id:'prepareGenerationContracts+assessPreparedGeneration',version:'main-3a2ba77',status:'executed_before_nonstatic_refusal',scope:'objective/phase/catalogue/quota/calendar/volume preconditions'},
 {id:'checkSessionCatalogue+evaluateRepairSportingEquivalence',version:'main-3a2ba77',status:'executed_per_examined_candidate',scope:'candidate metadata, goal, phase, duration, insertion prerequisites; exact invocation counts unavailable'},
 {id:'validateWeeklyQuotas',version:'main-3a2ba77',status:'constructed_candidates_only',scope:'quota floors/layout/coach volume'},
 {id:'validatePlan',version:'main-3a2ba77',status:'constructed_candidates_only_conditional_rules',scope:'polarization, load/recovery/progression, sports, catalogue, phase, races, limiter labels, Wbal, constraints, LCW/trail and metadata'},
 {id:'B13',version:'main-3a2ba77',status:'constructed_candidates_only',scope:'within-week duplicate IDs and fasted accumulation'},
 {id:'B14',version:'main-3a2ba77',status:'constructed_candidates_only_conditional',scope:'phase/fiche coherence'},
 {id:'B15',version:'main-3a2ba77',status:'constructed_candidates_only_conditional',scope:'ambition/physiology; quantitative standards only road objectives, requires physiology'},
 {id:'validateSessionCataloguePlan+validateCoachLoadIssues',version:'main-3a2ba77',status:'constructed_candidates_only_conditional',scope:'final catalogue prescription, volume ceilings, initial load warning'},
 {id:'limiter_keys+coach_order+ambition_audit+load_history',version:'v1-caller',status:'not_transmitted',scope:'V1 passes undefined for these arguments; no attestation for their dependent checks'},
 {id:'full_trail_progression+continuous_ironman+global_physiological_optimality',version:'v1-caller',status:'not_demonstrated',scope:'No complete continuous Ironman/trail candidate in baseline; no general scientific certification'},
];
function sumCritical(counts){
 return counts&&typeof counts==='object'?Object.values(counts).filter(Number.isFinite).reduce((sum,n)=>sum+n,0):null;
}
function repairMetrics(rows){
 const recorded=rows.filter(r=>Array.isArray(r.repairs));
 if(!recorded.length)return {attempts:null,corrected:null,accepted:null,rejected:null,status:'not_recorded_in_legacy_evidence'};
 const attempts=recorded.flatMap(r=>r.repairs);
 const accepted=attempts.filter(r=>r.accepted===true),rejected=attempts.filter(r=>r.accepted===false);
 const reductions=accepted.map(r=>{
  const before=sumCritical(r.beforeCritical),after=sumCritical(r.afterCritical);
  return before!==null&&after!==null?Math.max(0,before-after):null;
 });
 return {attempts:attempts.length,accepted:accepted.length,rejected:rejected.length,unresolvedDecision:attempts.length-accepted.length-rejected.length,
  corrected:reductions.some(n=>n===null)?null:reductions.reduce((sum,n)=>sum+n,0),
  correctedScope:'Critical occurrence reductions on accepted transitions, not distinct physiological defects or a scientific effectiveness rate.',
  recordedCases:recorded.length,unrecordedCases:rows.length-recorded.length,status:recorded.length===rows.length?'recorded':'partially_recorded',
  byRule:countBy(attempts.map(r=>r.rule??'unknown')),byDefect:countBy(attempts.flatMap(r=>Array.isArray(r.defect)?r.defect:[r.defect??'unknown']))};
}
function coverageMetrics(rows,manifest=[]){
 const controls=new Map();
 const add=(namespace,id,status,result)=>{
  const key=`${namespace}:${id}`;
  if(!controls.has(key))controls.set(key,{id,namespace,statuses:{},results:{}});
  const entry=controls.get(key);entry.statuses[status]=(entry.statuses[status]??0)+1;
  if(result)entry.results[result]=(entry.results[result]??0)+1;
 };
 const declaredIds=new Set(manifest.filter(c=>c&&typeof c.id==='string').map(c=>c.id));
 for(const row of rows){
  const executed=row.executedControls??row.coverage?.executedControls;
  if(Array.isArray(executed))for(const id of executed)declaredIds.add(id);
 }
 for(const row of rows){
  const executed=row.executedControls??row.coverage?.executedControls;
  for(const id of declaredIds)add('aggregate_validator',id,Array.isArray(executed)?executed.includes(id)?'executed':'not_executed':'unknown');
  for(const [id,status] of Object.entries(row.coverage?.conditional??{}))add('conditional_context',id,status);
  for(const control of row.coverage?.sportsAudit?.controls??[])add('sports_audit',control.id,control.execution??'unknown',control.result??'unknown');
 }
 const sportsRows=rows.filter(row=>Array.isArray(row.coverage?.sportsAudit?.controls));
 const physical=rows.filter(row=>row.technicallyConstructed&&Array.isArray(row.coverage?.sportsAudit?.controls)).map(row=>{
  const controls=row.coverage.sportsAudit.controls.filter(c=>c.classification==='contract'&&c.execution==='executed');
  return {id:row.id,result:!controls.length?'unknown':controls.some(c=>c.result==='fail')?'fail':controls.every(c=>c.result==='pass')?'pass':'unknown'};
 });
 return {recordedCases:rows.filter(r=>r.coverage||Array.isArray(r.executedControls)).length,
  unrecordedCases:rows.filter(r=>!r.coverage&&!Array.isArray(r.executedControls)).length,
  controlFrequencies:[...controls.values()].sort((a,b)=>`${a.namespace}:${a.id}`.localeCompare(`${b.namespace}:${b.id}`)),
  applicabilityScope:'aggregate_validator lists record invocation; conditional_context statuses record provided context and do not independently prove that the nested rule executed. sports_audit preserves both execution and pass/fail/unknown.',
  physicalContractAudit:{recordedCases:sportsRows.length,constructedAuditedCases:physical.length,results:countBy(physical.map(r=>r.result)),scope:'Executed descriptive/calendar/quota contracts only. Discipline presence and duration observations are distinct from physiological progression and general sporting relevance.'},
  technicalSchema:{execution:'not_implemented',result:'unknown',scope:'No complete plan-schema validation result is recorded by this evidence format; structural-code absence is not schema validity.'},
  generalSportingRelevance:{execution:'not_implemented',result:'expert_review_required'}};
}
function metrics(rows,diagnostics,manifest=[]){
 const constructed=rows.filter(r=>r.technicallyConstructed);
 const technicalCodes=new Set(['title_format','duration_coverage','layout_drift','quota_floor_violation','quota_range_drift','duplicate_catalog_id_unresolved','rest_day_coherence','strategic_recap_uniqueness']);
 const technicalPassing=constructed.filter(r=>!r.issues.some(i=>BLOCKING.has(i.severity)&&technicalCodes.has(i.code))).length;
 return {configurations:rows.length,assembled:constructed.length,withoutRecordedBlockingError:constructed.filter(r=>!r.issues.some(i=>BLOCKING.has(i.severity))).length,
 technicalWithoutRecordedStructuralBlocker:technicalPassing,technicalValidityScope:'Only enumerated structural issue codes; not a replacement for full schema validation.',
 sportingWithoutRecordedBlockingError:constructed.filter(r=>!r.issues.some(i=>BLOCKING.has(i.severity)&&!technicalCodes.has(i.code))).length,
 sportingValidityScope:'Passing executed rules only, never general scientific relevance; conditional applicability unavailable in legacy evidence.',
 constructedNonconformant:diagnostics.filter(d=>d.disposition==='constructed_nonconformant').length,
 refused:rows.filter(r=>!r.technicallyConstructed).length,inconclusive:diagnostics.filter(d=>d.disposition==='inconclusive').length,
 unsupported:diagnostics.filter(d=>d.disposition==='unsupported').length,
 globalInfeasibilityProven:diagnostics.filter(d=>d.globalInfeasibilityProven).length,
 warnings:countBy(rows.flatMap(r=>r.issues.filter(i=>i.severity==='warning').map(i=>i.code))),
 severities:countBy(rows.flatMap(r=>r.issues.map(i=>i.severity))),
 repairs:repairMetrics(rows),
 controls:coverageMetrics(rows,manifest),
 context:{effectiveAmbitionRecorded:rows.filter(r=>typeof r.effectiveAmbition==='string').length,physiologicalContextRecorded:rows.filter(r=>r.physiologicalContext!==undefined&&r.physiologicalContext!==null).length},
 reproducibility:{status:'requires_comparable_replay',identicalCases:null},
 scientificRelevance:'not_attested'};
}
export function analyzeRows(rows,metadata={}){
 if(!Array.isArray(rows)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('INVALID_OR_DUPLICATE_EVIDENCE');
 const caseDiagnostics=rows.map(classifyCase);
 const legacyV1=metadata.legacyV1===true||String(metadata.version??'').startsWith('f933ced');
 const manifest=metadata.controls??(legacyV1?BASELINE_CONTROLS:[]);
 const causes=[...new Set(caseDiagnostics.map(d=>d.rootCause.id))].sort().map(id=>{
  const group=caseDiagnostics.filter(d=>d.rootCause.id===id);
  return {id,count:group.length,...group[0].rootCause,examples:group.slice(0,3).map(d=>d.id)};
 });
 const records=rows.map(r=>({...r,sportFamily:/trail/i.test(r.objective??'')?'trail':['703','IM','Sprint','Olympic'].includes(r.objective)?'triathlon':'running'}));
 const subdivision=(keys)=>[...new Set(records.map(r=>keys.map(k=>r[k]??'unknown').join(':')))].sort().map(key=>{
  const matching=records.filter(r=>keys.map(k=>r[k]??'unknown').join(':')===key);
  return {key,...metrics(matching,caseDiagnostics.filter(d=>matching.some(r=>r.id===d.id)),manifest)};
 });
 return {diagnosticVersion:DIAGNOSTIC_VERSION,...metadata,sourceEvidenceSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  counts:{...metrics(rows,caseDiagnostics,manifest),...(metadata.reproducibility?{reproducibility:metadata.reproducibility}:{})},rootCauseCounts:countBy(caseDiagnostics.map(d=>d.rootCause.id)),causes,
  categories:Object.entries(CATEGORIES).map(([id,label])=>({id,label,cases:caseDiagnostics.filter(d=>d.category===id).length,issues:caseDiagnostics.flatMap(d=>d.blockingIssues).filter(i=>i.category===id).length})),
  dispositionCounts:countBy(caseDiagnostics.map(d=>d.disposition)),
  controls:manifest,
  controlExecutionEvidence:metadata.controlExecutionEvidence??(legacyV1?{source:'audited_v1_caller',preflight:rows.filter(r=>r.reason!=='static_template_configuration_requires_review'&&r.objective!=='StartToRun').length,constructedValidators:rows.filter(r=>r.technicallyConstructed).length}:{source:'not_recorded',note:'Pass an explicit versioned control manifest; invocation cannot be inferred from missing issues.'}),
  controlApplicability:rows.some(r=>r.coverage)?'Recorded aggregate invocations, declared conditional context and sports-audit statuses remain distinct; no execution is inferred from an absent issue.':'Legacy rows do not contain per-rule passed/not-applicable/not-executed records. Never infer execution from an absent issue.',
  safetyAndMethodology:'Original validator severities are preserved. Taxonomy labels are diagnostic grouping, not new universal sporting safety rules.',
  dimensions:{sportFamily:subdivision(['sportFamily']),objectiveFormat:subdivision(['objective','format']),objective:subdivision(['objective']),objectiveAmbition:subdivision(['objective','ambition','format']),level:subdivision(['level']),effectiveAmbition:subdivision(['effectiveAmbition']),physiology:subdivision(['physiology']),objectiveLevel:subdivision(['objective','level','format'])},
  caseDiagnostics};
}
export function renderDashboard(report){
 const c=report.counts;
 const lines=['# DET-ENGINE — diagnostic et tableau de bord', '',`Version : ${report.version??'non renseignée'} ; diagnostic ${report.diagnosticVersion}.`, '',
 `Sur ${c.configurations} configurations : **${c.assembled} plans assemblés**, **${c.withoutRecordedBlockingError} sans erreur bloquante enregistrée**, **${c.constructedNonconformant} plans assemblés non conformes**.`,
 `${c.refused} refus ne sont pas assimilés à des erreurs moteur : ${c.unsupported} routes/adaptateurs non couverts, ${c.inconclusive} recherches non concluantes. **${c.globalInfeasibilityProven} impossibilité globale prouvée**.`, '',
 'Les résultats sans erreur portent exclusivement sur les contrôles exécutés. Aucun résultat ne certifie la pertinence sportive générale. Les avertissements restent comptés ; les seuils et sévérités ne sont pas modifiés.', '',
 '## Indicateurs et portée', '', '| Indicateur | Mesure vérifiée |','|---|---|',
 `| Structure sans code bloquant enregistré | ${c.technicalWithoutRecordedStructuralBlocker} / ${c.assembled} construits ; validation complète de schéma non implémentée |`,
 `| Règles sportives exécutées sans erreur | ${c.sportingWithoutRecordedBlockingError} / ${c.assembled} construits ; pas de certification générale |`,
 `| Réparations | ${c.repairs.attempts??'non mesuré'} tentatives ; ${c.repairs.accepted??'non mesuré'} acceptées ; ${c.repairs.rejected??'non mesuré'} rejetées |`,
 `| Occurrences critiques réduites par transitions acceptées | ${c.repairs.corrected??'non mesuré'} ; pas un décompte de défauts physiologiques indépendants |`,
 `| Pertinence sportive générale | Non attestée ; revue experte requise |`,
 `| Reproductibilité | ${c.reproducibility.status} ; cas identiques : ${c.reproducibility.identicalCases??'non mesuré ici'} |`, '',
 '## Causes observées et hypothèses', '', '| Cause observée | Cas | Portée de la preuve | Exemple reproductible |','|---|---:|---|---|'];
 for(const cause of report.causes)lines.push(`| ${cause.id} | ${cause.count} | ${cause.scope} | ${cause.examples[0]} |`);
 lines.push('', 'Les codes des validateurs décrivent des symptômes. Les hypothèses de cause racine et leurs dépendances sont explicitées séparément dans diagnostic.json ; elles exigent des expériences ciblées.', '',
 '## Résultats par objectif et format', '', '| Objectif / format | Cas | Construits | Sans erreur exécutée | Refus |','|---|---:|---:|---:|---:|');
 for(const group of report.dimensions.objectiveFormat)lines.push(`| ${group.key} | ${group.configurations} | ${group.assembled} | ${group.withoutRecordedBlockingError} | ${group.refused} |`);
 lines.push('', '## Résultats par objectif, ambition demandée et format', '', '| Objectif / ambition / format | Cas | Construits | Sans erreur exécutée |','|---|---:|---:|---:|');
 for(const group of report.dimensions.objectiveAmbition)lines.push(`| ${group.key} | ${group.configurations} | ${group.assembled} | ${group.withoutRecordedBlockingError} |`);
 lines.push('', '## Niveau déclaré', '', '| Niveau | Cas | Construits | Sans erreur exécutée |','|---|---:|---:|---:|');
 for(const group of report.dimensions.level)lines.push(`| ${group.key} | ${group.configurations} | ${group.assembled} | ${group.withoutRecordedBlockingError} |`);
 if(c.context.effectiveAmbitionRecorded){
  lines.push('', '## Ambition effective et contexte physiologique', '', `Ambition effective enregistrée pour ${c.context.effectiveAmbitionRecorded} cas ; contexte physiologique pour ${c.context.physiologicalContextRecorded} cas. L’export du contexte ne prouve pas une réponse physiologique mesurée.`, '', '| Ambition effective | Cas | Construits | Sans erreur exécutée |','|---|---:|---:|---:|');
  for(const group of report.dimensions.effectiveAmbition)lines.push(`| ${group.key} | ${group.configurations} | ${group.assembled} | ${group.withoutRecordedBlockingError} |`);
 }
 if(report.dimensions.physiology.some(g=>g.key!=='unknown')){
  lines.push('', '| Profil physiologique synthétique | Cas | Construits | Sans erreur exécutée |','|---|---:|---:|---:|');
  for(const group of report.dimensions.physiology)lines.push(`| ${group.key} | ${group.configurations} | ${group.assembled} | ${group.withoutRecordedBlockingError} |`);
 }
 lines.push('', '## Fréquences des contrôles enregistrés', '', '| Contrôle / espace | Exécuté | Non applicable | Non implémenté | Non exécuté | Inconnu / revue | Résultats |','|---|---:|---:|---:|---:|---:|---|');
 for(const control of c.controls.controlFrequencies){
  const statuses=control.statuses;
  lines.push(`| ${control.namespace}:${control.id} | ${statuses.executed??0} | ${statuses.not_applicable??0} | ${statuses.not_implemented??0} | ${statuses.not_executed??0} | ${(statuses.unknown??0)+(statuses.expert_review_required??0)} | ${Object.entries(control.results).map(([k,v])=>`${k}: ${v}`).join(', ')||'non enregistré'} |`);
 }
 lines.push('', 'Les contrôles agrégés mesurent l’invocation enregistrée. Les statuts conditional_context décrivent le contexte fourni et ne prouvent pas une exécution de règle interne sur un plan refusé. Les résultats pass/fail/unknown des audits restent séparés des statuts d’exécution.',
 `Audit de contrats physiques/calendar/quota : ${c.controls.physicalContractAudit.constructedAuditedCases} plans construits audités ; ${JSON.stringify(c.controls.physicalContractAudit.results)}. Ces observations ne valident ni la progression physiologique ni la pertinence sportive générale.`,
 'Validation technique de schéma complet : non implémentée ; la présence de toutes les semaines et l’absence de codes structuraux ne remplacent pas ce contrôle.', '', '## Couverture réellement acquise', '',
 report.controlExecutionEvidence.source==='audited_v1_caller'?`Baseline V1 auditée : prévalidation sur ${report.controlExecutionEvidence.preflight} cas non statiques ; validation complète, quotas et B13/B14/B15 après construction des ${report.controlExecutionEvidence.constructedValidators} candidats. Les ${c.refused} refus n’ont pas passé la validation sportive finale. Les règles internes restent conditionnelles.`:'Les invocations et leur applicabilité doivent être fournies par un manifeste de contrôles versionné. Le diagnostic n’infère jamais qu’une règle a été exécutée de l’absence d’un message.',
 report.controlExecutionEvidence.source==='audited_v1_caller'?'V1 ne transmet pas les clés structurées de limiteurs, l’ordre manuel du coach, l’audit d’ambition ou l’historique détaillé de charge. L’export ne distingue pas chaque règle passée, non applicable ou non exécutée. Les durées de compétition restent non estimées ; aucune couverture de ces points ne doit être déduite des métriques.':'Les contrôles non exécutés, non applicables et non encore implémentés restent distincts. L’absence de code d’erreur ne constitue pas à elle seule une preuve de validation.',
 'La preuve historique de reproductibilité est un rejeu identique des 600 sorties. Ce diagnostic conserve cette preuve séparément ; un candidat nouveau doit être rejoué à son tour.', '',
 '## Limites de la baseline', '',
 c.repairs.status==='not_recorded_in_legacy_evidence'?'Les contrôles V1 de structure sont un sous-ensemble explicite des codes de validation ; le tableau de bord ne remplace pas une validation de schéma complète. Aucune tentative de réparation n’est enregistrée dans les anciennes lignes : taux de réparation non mesuré. Aucun refus ne prouve à lui seul une impossibilité sportive globale.':'Les réparations sont comptées uniquement à partir des tentatives enregistrées. Une transition acceptée ne certifie pas la pertinence sportive générale du plan. Les audits de présence, de calendrier et de quotas ne remplacent pas une réponse physiologique mesurée. Aucun refus ne prouve à lui seul une impossibilité sportive globale.', '',
 'Diagnostic exclusivement sur des profils synthétiques ; aucune donnée personnelle ni écriture vers un service externe.', '');
 return lines.join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [, , input, out, versionArgument]=process.argv;
 if(!input||!out)throw Error('Usage: node scripts/det-engine/v2-diagnostic.mjs evidence.json[.gz] output-directory [version]');
 const bytes=readFileSync(input),evidence=JSON.parse((input.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8'));
 const version=versionArgument??(!Array.isArray(evidence)?evidence.version:undefined)??'unversioned_legacy_evidence';
 const report=analyzeRows(Array.isArray(evidence)?evidence:evidence.rows,{version,...(!Array.isArray(evidence)?{controls:evidence.controls,controlExecutionEvidence:evidence.controlExecutionEvidence}:{} )});
 mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/diagnostic.json`,JSON.stringify(report,null,2)+'\n');
 writeFileSync(`${out}/dashboard.md`,renderDashboard(report));
 const {caseDiagnostics,...dashboard}=report;
 writeFileSync(`${out}/dashboard.json`,JSON.stringify(dashboard,null,2)+'\n');
 process.stdout.write(JSON.stringify({configurations:report.counts.configurations,assembled:report.counts.assembled,withoutRecordedBlockingError:report.counts.withoutRecordedBlockingError,refused:report.counts.refused})+'\n');
}
