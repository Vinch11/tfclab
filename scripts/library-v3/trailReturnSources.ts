import raw from './v3RunExpansion.json';
import type {V3Workout, V3Leaf, Bounds} from './catalogueRuntime';

const parent = raw.workouts.find(w => w.id === 'V3P_RUN_092') as unknown as V3Workout;
const fixed = (value:number):Bounds => ({min:value,base:value,max:value});
function timed(seconds:number, label:string, role:V3Leaf['role'], domain:V3Leaf['domain']):V3Leaf {
  return {kind:'time',seconds:fixed(seconds),label,role,domain};
}

/** Original short-trail walk/run proposals. Kept outside all reviewed pools. */
export const trailReturnSources:V3Workout[] = [
  {id:'V3P_RUN_203', title:'Reprise sur sentier roulant', run:60, walk:120, count:{min:3,base:5,max:7}},
  {id:'V3P_RUN_204', title:'Reprise · marche en montée douce', run:120, walk:120, count:{min:3,base:5,max:8}},
  {id:'V3P_RUN_205', title:'Sortie longue de reprise · sentier facile', run:180, walk:120, count:{min:3,base:6,max:10}},
].map(recipe => {
  const w = structuredClone(parent);
  w.id = recipe.id;
  w.title = recipe.title;
  w.version = '3.3.0-short-trail-return-candidate';
  w.minimumLevel = 'untrained';
  w.origin = 'TFCLab · composition pour la reprise sur trail court, à partir de la marche-course et du travail de régulation en pente de la fiche V3P_RUN_092.';
  w.focus = 'Alterner course facile sur sentier roulant et marche, avec un effort régulier sur terrain non technique.';
  w.methodology = 'Séance au temps pour un parcours connu. Courir uniquement sur les portions roulantes faciles, marcher dans les montées et descentes selon le confort. Le coach vérifie le terrain et le temps total toléré. Le ressenti reste qualitatif.';
  w.prerequisites = ['Marche et courts intervalles de course déjà tolérés. Terrain simple et accessible vérifié par le coach.'];
  w.blocks = [timed(300,'Commencer en marchant sur terrain facile.','warmup','recovery'),
    {kind:'repeat',count:recipe.count,betweenSec:0,betweenSecBounds:fixed(0),label:'Alterner course facile et marche',steps:[
      timed(recipe.run,'Courir à effort facile sur sentier roulant. Rester en aisance respiratoire.','main','moderate_lt1'),
      timed(recipe.walk,'Marcher en terrain facile ou dans la pente douce. Reprendre son souffle.','main','recovery')]},
    timed(300,'Terminer en marchant tranquillement.','cooldown','recovery')];
  // A one-minute longer easy walk can bridge two discrete repeat counts
  // while staying inside a small individual week-to-week progression limit.
  const easyWalk = {min:240,base:300,max:420};
  const warmup = w.blocks[0];
  if(warmup.kind === 'time') warmup.seconds = easyWalk;
  w.prescription.physiologicalIntent.statement = w.focus;
  w.prescription.individualization.anchors = w.prescription.individualization.anchors.map(a=>({...a,
    key:'coach_reviewed_terrain_effort',transform:'no_flat_pace_on_slopes'}));
  w.prescription.admissibility = {...w.prescription.admissibility,minimumLevel:w.minimumLevel,prerequisites:[...w.prerequisites]};
  const bounds = [easyWalk,recipe.count,fixed(0),fixed(recipe.run),fixed(recipe.walk),fixed(300)];
  w.prescription.parameters = w.prescription.parameters.map((p,i)=>({...p,...bounds[i]}));
  return w;
});
