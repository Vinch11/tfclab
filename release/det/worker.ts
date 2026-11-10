import { generateDetPlanFromPageInput, type DetRunInput } from '../../src/lib/plan/detEngineRun';
import { preparePlan } from '../../supabase/functions/_shared/nolioV2/planDryRun';
import { detReleaseVersion } from '../../src/lib/det/independentVersion';

type Job =
  | {action:'generate'; input:DetRunInput}
  | {action:'verify'; args:Parameters<typeof preparePlan>};

self.onmessage = async ({data}: MessageEvent<Job>) => {
  try {
    if (data.action === 'generate') {
      const plan = await generateDetPlanFromPageInput(data.input);
      self.postMessage({ok:true, version:detReleaseVersion, value:plan});
    } else if (data.action === 'verify') {
      const prepared = await preparePlan(...data.args);
      self.postMessage({ok:true, version:detReleaseVersion, value:prepared});
    } else throw Error('Commande DET inconnue.');
  } catch (error) {
    self.postMessage({ok:false, error:error instanceof Error ? error.message : String(error)});
  }
};
