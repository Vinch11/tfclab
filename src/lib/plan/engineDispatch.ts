export type CoachEngine='ai'|'det';
/** Explicit single dispatch: a DET refusal is never an AI retry. */
export async function dispatchCoachEngine<T>(engine:CoachEngine, paths:{ai:()=>Promise<T>;det:()=>Promise<T>}):Promise<T>{return engine==='det'?paths.det():paths.ai();}
export function qaEngineChoiceEnabled(dev:boolean,url:string|undefined):boolean{try{return dev && new URL(url??'').hostname.split('.')[0]==='lkjesdacgpolrwfxulbo';}catch{return false;}}
