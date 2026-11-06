export type CoachEngine='ai'|'det';
/** Explicit single dispatch: a DET refusal is never an AI retry. */
export async function dispatchCoachEngine<T>(engine:CoachEngine, paths:{ai:()=>Promise<T>;det:()=>Promise<T>}):Promise<T>{return engine==='det'?paths.det():paths.ai();}

export const QA_PLANNING_ORIGIN = 'https://id-preview--c3941303-40d2-447e-9b87-867d82727fd1.lovable.app';
const QA_BACKEND_ORIGIN = 'https://lkjesdacgpolrwfxulbo.supabase.co';

/** Development or this one compiled QA preview; never a production deployment.
 * This exposes the planning choice only. Every DET action still verifies the
 * authenticated QA coach and their fixed owned athlete with verifyQaCoach.
 */
export function qaEngineChoiceEnabled(dev:boolean,url:string|undefined,appOrigin?:string):boolean {
  try {
    const backend = new URL(url ?? '');
    if (backend.origin !== QA_BACKEND_ORIGIN || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) return false;
    return dev || appOrigin === QA_PLANNING_ORIGIN;
  } catch { return false; }
}
