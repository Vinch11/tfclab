import type {PlanConfig} from '@/hooks/useAITrainingPlan';

export function marathonTimeLabel(minutes:number) {
  const seconds=Math.round(minutes*60);
  return [Math.floor(seconds/3600),String(Math.floor(seconds/60)%60).padStart(2,'0'),String(seconds%60).padStart(2,'0')].join(':');
}

/** Record the optional DET time goal on the existing event before the worker freezes the input. */
export function withMarathonTime(config:PlanConfig,text:string) {
  if(!text.trim())return config;
  const input=text.trim(), clock=/^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(input);
  const minutes=clock?Number(clock[1])*60+Number(clock[2])+Number(clock[3]??0)/60:
    /^\d+(?:[.,]\d+)?$/.test(input)?Number(input.replace(',','.')):NaN;
  if(!(Number.isFinite(minutes)&&minutes>0))throw Error('Renseignez le chrono marathon en h:mm, h:mm:ss ou en minutes.');
  const goals=config.raceGoals??[],a=goals.filter(g=>g.priority==='A' && /^marathon$/i.test(g.objective));
  if(a.length>1 && a.every(g=>g.targetTimeMinutes===minutes))return config;
  if(a.length!==1)throw Error('Sélectionnez une course A marathon datée pour lui associer ce chrono.');
  return {...config,raceGoals:goals.map(g=>g===a[0]?{...g,targetTimeMinutes:minutes}:g)};
}
