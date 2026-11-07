/** Additional candidate doses; the original 800-source snapshot stays intact. */
import raw from './v3RunSupplement20261103.json';
import {v3FullCatalogue,type V3Catalogue,type V3Workout} from './catalogueRuntime';
export const v3SupplementalCatalogue:V3Catalogue={
  ...v3FullCatalogue,schemaVersion:'3.2.0-candidate-supplement-2',
  count:2,counts:{bike:0,run:2,swim:0,strength:0},
  workouts:raw.workouts as unknown as V3Workout[],
};
export const v3ExtendedCatalogue:V3Catalogue={
  ...v3FullCatalogue,schemaVersion:'3.2.0-candidate-802',
  count:802,counts:{bike:200,run:202,swim:200,strength:200},
  workouts:[...v3FullCatalogue.workouts,...v3SupplementalCatalogue.workouts],
};
