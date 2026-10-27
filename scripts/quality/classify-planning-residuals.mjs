// Explains existing offline results only: no service/API, athlete data or prescribing.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const directory=resolve(process.argv[2]??'/tmp/tfcl-global-offline');
const matrix=JSON.parse(readFileSync(resolve(directory,'matrix.json'),'utf8'));
const counts=items=>Object.fromEntries([...new Set(items)].sort().map(key=>[key,items.filter(item=>item===key).length]));
const blocked=matrix.rows.filter(row=>Object.keys(row.preparationIssues).some(key=>key.startsWith('preflight_'))).map(row=>{
 const weeks=(row.residuals??[]).filter(r=>r.mechanical).map(r=>({week:r.week,phase:r.phase,weekType:r.weekType,proof:r.mechanical}));
 const proven=weeks.length>0&&weeks.every(w=>!w.proof.admissibleByNecessaryBound&&w.proof.branches.length>0&&w.proof.branches.every(b=>b.reasons.length>0&&!b.reasons.includes('minimum_above_total_max')));
 const reasons=[...new Set(weeks.flatMap(w=>w.proof.branches.flatMap(b=>b.reasons)))].sort();
 return {id:row.id,objective:row.objective,format:row.format??'continuous',level:row.level,ambition:row.ambition,effectiveAmbition:row.effectiveAmbition,
  constraints:row.constraints,classification:proven?'justified_capacity_refusal':'unresolved_internal_or_unexplained',reasons,weeks};
});
const catalogue=matrix.rows.flatMap(row=>(row.residuals??[]).flatMap(r=>(r.catalogue??[]).map(c=>({
 id:row.id,objective:row.objective,format:row.format??'continuous',ambition:row.ambition,effectiveAmbition:row.effectiveAmbition,
 week:r.week,phase:r.phase,weekType:r.weekType,...c,
 classification:c.limitedDiversity?'limited_diversity_existing_repetition_rules':c.selectedEligibleIds.length>=c.required?'internal_counter_conflict':c.uncappedEligibleIds.length>=c.required?'internal_selection_gap':c.uncappedEligibleIds.length===0?'no_admissible_training_card':'diversity_shortfall_not_proven_prescription_impossible',
}))));
const internal=blocked.filter(c=>c.classification!=='justified_capacity_refusal').length+catalogue.filter(c=>c.classification.startsWith('internal_')).length;
const evidence={inputCases:matrix.rows.length,blockedCases:blocked.length,blockedByObjective:counts(blocked.map(c=>c.objective)),blockedByReasonSignature:counts(blocked.map(c=>c.reasons.join('+'))),
 catalogueSportWeekOccurrences:catalogue.length,catalogueByClassification:counts(catalogue.map(c=>c.classification)),internalContradictions:internal,blocked,catalogue,
 limitations:['Necessary capacity proofs do not certify a full plan or physiological safety.','Catalogue cards are not interchangeable prescriptions; distinct-card scarcity is not proof that all repetitions/custom sessions are impossible.','No missing real model response was fabricated.']};
writeFileSync(resolve(directory,'residual-classification.json'),JSON.stringify(evidence,null,2)+'\n');
let md='# #418 — classement ciblé des refus résiduels\n\nLes preuves ci-dessous sont calculées sur les mêmes entrées synthétiques, sans appel modèle. Une cause peut concerner plusieurs semaines ; les codes secondaires de layout ne sont pas additionnés comme des incidents distincts.\n\n';
md+=`Configurations bloquées : **${blocked.length}** ; contradictions internes reproductibles dans ce classement : **${internal}**.\n\n| Objectif | Configurations bloquées |\n|---|---:|\n`;
for(const [objective,n] of Object.entries(evidence.blockedByObjective))md+=`| ${objective} | ${n} |\n`;
md+='\nLes nombres complets, bornes et alternatives de nombre de bricks sont dans `residual-classification.json`. Les motifs sont des conditions nécessaires des règles existantes, pas de nouvelles prescriptions.\n\n| Configuration exacte | Ambition effective | Semaines refusées | Causes prouvées (union) | État |\n|---|---|---|---|---|\n';
for(const c of blocked)md+=`| ${c.id} | ${c.effectiveAmbition} | ${c.weeks.map(w=>w.week).join(', ')} | ${c.reasons.join(', ')} | ${c.classification} |\n`;
md+='\n## Couverture catalogue restante\n\nLe pool non plafonné conserve les mêmes filtres et le même score d’admissibilité ; aucune phase, intensité, variante ou prohibition n’est élargie. Les fiches de chaque sport, durées, phases, intentions, zones, plafonds hebdomadaires explicites (null = absent), étapes d’exclusion et motifs hebdomadaires sont fournis dans le JSON.\n\n| Configuration | Semaine / type | Sport | Minima | Fiches sélectionnées admissibles | Pool non plafonné admissible | Classement |\n|---|---|---|---:|---|---|---|\n';
for(const c of catalogue)md+=`| ${c.id} | S${c.week} / ${c.phase} / ${c.weekType} | ${c.sport} | ${c.required} | ${c.selectedEligibleIds.join(', ')||'aucune'} | ${c.uncappedEligibleIds.join(', ')||'aucune'} | ${c.classification} |\n`;
md+='\n**Limites et arbitrages** : refus d’agenda = choix coach sur les contraintes ou l’ambition, jamais hausse automatique de charge. Zéro fiche admissible = aucun protocole catalogue démontré pour ce rôle ; une variante/custom doit être explicitement autorisé et revu. Une insuffisance de diversité n’est pas une impossibilité de prescription démontrée. Les plans complets correspondants, l’enchaînement physiologique réel et la revue coach restent nécessaires ; les voies trail/S2R ne sont pas certifiées par leurs zéros de précontrôle.\n';
writeFileSync(resolve(directory,'RESIDUAL_CLASSIFICATION.md'),md);
console.log(JSON.stringify({inputCases:evidence.inputCases,blockedCases:evidence.blockedCases,blockedByObjective:evidence.blockedByObjective,blockedByReasonSignature:evidence.blockedByReasonSignature,catalogueByClassification:evidence.catalogueByClassification,internalContradictions:internal},null,2));
if(internal)process.exitCode=1;
