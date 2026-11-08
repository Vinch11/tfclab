import type {CatalogueContract} from './sessionCatalogueContract.ts';
/** Make the existing source contract actionable for the model, including when
 * the gateway falls back to unconstrained json_object. No acceptance/repair. */
export const CATALOGUE_GENERATION_IDENTITY_RULES=`IDENTITÉ DES FICHES : pour custom=false, catalogId désigne une prescription, pas une étiquette. Recopie le titre exact de cette fiche. Conserve son sport, son intention physiologique, ses zones et son protocole ; choisis une durée dans ses bornes ou une variante numérique explicitement autorisée. Si le créneau appelle une autre intention, choisis une autre fiche admissible ; ne renomme pas une séance facile en seuil, ni l'inverse. Ne corrige jamais un conflit uniquement en cachant le mot qui le révèle.`;
export function catalogueGenerationFeedback(value:unknown,contracts:Record<number,CatalogueContract>|undefined,issues?:readonly {path:string}[]):string{
 if(!contracts||!value||typeof value!=='object')return '';
 const weeks=(value as {weeks?:unknown}).weeks;if(!Array.isArray(weeks))return '';
 const rows:Array<Record<string,unknown>>=[];
 for(const [weekIndex,week] of weeks.entries()){
  if(!week||typeof week!=='object'||!Number.isInteger(week.weekNumber)||!Array.isArray(week.sessions))continue;
  const contract=contracts[week.weekNumber];if(!contract)continue;
  for(const [index,session] of week.sessions.entries()){
   const path=`weeks.${weekIndex}.sessions.${index}.catalogId`;
   if(issues&&!issues.some(i=>i.path===path))continue;
   if(!session||typeof session!=='object'||typeof session.catalogId!=='string')continue;
   const card=contract.catalog.find(c=>c.id===session.catalogId);if(!card)continue;
   // Include source facts only for visible identity/dose drift. The full
   // unchanged contract still validates the regenerated response afterward.
   if(session.title===card.title&&typeof session.durationMin==='number'&&session.durationMin>=card.durationMin[0]&&session.durationMin<=card.durationMin[1])continue;
   rows.push({path,weekNumber:week.weekNumber,catalogId:card.id,exactTitle:card.title,sport:card.sport,intent:card.intentFamily,durationMin:card.durationMin,zones:card.zones,sourceProtocol:card.structure,variants:card.variants??{}});
   if(rows.length>=24)break;
  }
  if(rows.length>=24)break;
 }
 return rows.length?`CONTRATS DES FICHES À RESPECTER DANS LA CORRECTION (ces faits ne sont pas des séances de remplacement automatiques) :\n${JSON.stringify(rows)}`:'';
}
