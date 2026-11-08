import {describe,it,expect} from 'vitest';
import {catalogueGenerationFeedback,CATALOGUE_GENERATION_IDENTITY_RULES} from '../../../../supabase/functions/_shared/catalogueGenerationFeedback';
import {checkSessionCatalogue,type CatalogueContract} from '../../../../supabase/functions/_shared/sessionCatalogueContract';
import type {RepairWorkoutMetadata} from '../../../../supabase/functions/_shared/repairSportingEquivalence';
const card:RepairWorkoutMetadata={metadataVersion:1,complete:true,id:'SYNTHETIC_THRESHOLD',sport:'run',title:'Seuil contrôlé',objective:'Marathon',intentFamily:'seuil',goals:['marathon'],objectiveSpecific:false,phases:['base','build'],durationMin:[51,51],mainZoneMax:4,specialContext:null,prerequisiteKeys:[],necessity:'Recommandé',when:'Base',avoid:'',tags:[],structure:'10 min Z1 ; 4×6 min Z4 ; 3×3 min récupération ; 8 min Z1',zones:['Z1','Z4']};
const contract:CatalogueContract={phase:'base',objective:'Marathon',catalog:[card]};
describe('actionable catalogue feedback without relaxed acceptance',()=>{
 it('gives the exact selected source to repair only the observed failing session',()=>{
  const bad={catalogId:card.id,custom:false,sport:'run',title:'VO2max fractions courtes',durationMin:51,zones:['Z1','Z4'],details:'4×6 min Z4 ; récupération entre fractions'};
  expect(checkSessionCatalogue(bad,contract).errors).toContain('catalogue_physiological_intent');
  const source={weeks:[{weekNumber:13,sessions:[bad,{...bad,catalogId:'MISSING'}]}]},before=JSON.stringify(source);
  const feedback=catalogueGenerationFeedback(source,{13:contract},[{path:'weeks.0.sessions.0.catalogId'}]);
  expect(feedback).toContain('"weekNumber":13');expect(feedback).toContain('"exactTitle":"Seuil contrôlé"');expect(feedback).toContain('"durationMin":[51,51]');expect(feedback).toContain(card.structure);expect(feedback).not.toContain('MISSING');
  expect(JSON.stringify(source)).toBe(before);expect(checkSessionCatalogue(bad,contract).errors).toContain('catalogue_physiological_intent');
  expect(CATALOGUE_GENERATION_IDENTITY_RULES).toContain('autre fiche admissible');
 });
 it('does not invent a source/protocol or list unrelated fields',()=>{
  expect(catalogueGenerationFeedback({weeks:[{weekNumber:1,sessions:[{catalogId:'UNKNOWN'}]}]},{1:contract})).toBe('');
  expect(catalogueGenerationFeedback({weeks:[{weekNumber:1,sessions:[{catalogId:card.id,title:'Other'}]}]},{1:contract},[{path:'weeks.0.theme'}])).toBe('');
 });
});
