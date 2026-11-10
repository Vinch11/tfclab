/** Additional candidate doses; the original 800-source snapshot stays intact. */
import {introductoryStrengthSources,completeStrengthSources,trainedStrengthSources,timedSwimSources} from './completeSessionSources';
import {trailReturnSources} from './trailReturnSources';
import raw from './v3RunSupplement20261103.json';
import {v3FullCatalogue,type V3Catalogue,type V3Workout} from './catalogueRuntime';
export const v3SupplementalCatalogue:V3Catalogue={
  ...v3FullCatalogue,schemaVersion:'3.2.0-candidate-supplement-2',
  count:2,counts:{bike:0,run:2,swim:0,strength:0},
  workouts:raw.workouts as unknown as V3Workout[],
};
export const v3ExtendedCatalogue:V3Catalogue={
  ...v3FullCatalogue,schemaVersion:'3.3.0-candidate-complete-sessions',
  count:802+trailReturnSources.length+introductoryStrengthSources.length+completeStrengthSources.length+trainedStrengthSources.length+timedSwimSources.length,counts:{bike:200,run:202+trailReturnSources.length,swim:200+timedSwimSources.length,strength:200+introductoryStrengthSources.length+completeStrengthSources.length+trainedStrengthSources.length},
  workouts:[...v3FullCatalogue.workouts,...v3SupplementalCatalogue.workouts,...trailReturnSources,...introductoryStrengthSources,...completeStrengthSources,...trainedStrengthSources,...timedSwimSources],
};
