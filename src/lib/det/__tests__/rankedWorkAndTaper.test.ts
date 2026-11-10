import {resolveLibrary920Targets} from '../library920Selection';
import {detObjectiveGoal} from '../ordinaryObjective';
import {v3ExtendedCatalogue} from '../../../../scripts/library-v3/supplementalCatalogue';
import {library920Catalogue} from '../../../../scripts/library-v3/library920Catalogue';
import {TRAIL_THRESHOLD_ID,SHORT_AEROBIC_INTERVALS_ID,AEROBIC_MAINTENANCE_ID} from '../rankedRunSources';
import {SUBMAXIMAL_STRENGTH_IDS} from '../submaximalStrength';
import {describe,expect,it,vi} from 'vitest';
import {allowsControlledRunIntervals,controlledRunDose} from '../controlledRunIntervals';
import {filterDraftV3Sources} from '../appPlanningDetDraft';
import {findSource} from '../coachDetContext';
import {hasRankedWork,rankedSourceIntent,rankedWorkDose} from '../rankedLimiterPrescription';
import {triathlonTaperTargets} from '../triathlonTaper';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));

describe('DET ranked work and progressive taper',()=>{
  it('keeps the French Olympic triathlon distinct from a 70.3 in the plan and the audit',()=>{
    expect(detObjectiveGoal('Triathlon olympique')).toBe('olympic');
    expect(detObjectiveGoal('Olympic')).toBe('olympic');
    expect(detObjectiveGoal('Triathlon 70.3')).toBe('half');
  });
  it('assigns unique IDs across the original, supplemental and imported catalogues',()=>{
    const existing=new Set([...v3ExtendedCatalogue.workouts,...library920Catalogue.workouts].map(w=>w.id));
    const ids=[TRAIL_THRESHOLD_ID,SHORT_AEROBIC_INTERVALS_ID,AEROBIC_MAINTENANCE_ID,...SUBMAXIMAL_STRENGTH_IDS];
    expect(new Set(ids).size).toBe(ids.length);
    for(const id of ids){
      expect(existing.has(id),id).toBe(false);
      expect(findSource(id)?.id).toBe(id);
    }
  });
  it('keeps tested interval bounds and refuses absolute bans, fatigue and missing prerequisites',()=>{
    const source=findSource('V3P_RUN_167')!;
    const prohibition='🚫 Pas de blocs VO2max longs ≥5min (jugement coach).';
    expect(allowsControlledRunIntervals([prohibition])).toBe(true);
    const dose=controlledRunDose(source)!;
    expect(dose.overrides['1.0.seconds']).toBe(180);
    expect(dose.overrides['1.count']).toBeGreaterThanOrEqual(3);
    expect(dose.overrides['1.count']).toBeLessThanOrEqual(4);
    expect(dose.overrides['1.betweenSec']).toBeGreaterThanOrEqual(240);
    expect(controlledRunDose(findSource('V3P_RUN_137')!)).toBeNull();
    for(const ban of ['🚫 Aucun VO₂max en course.','🚫 Toute VMA interdite.','🚫 Pas de zone 5.']){
      expect(allowsControlledRunIntervals([prohibition,ban])).toBe(false);
      expect(filterDraftV3Sources([source],{prohibitions:[ban]}, {},()=>true)).toEqual([]);
    }
    for(const reasons of [{currentFatigue:'fatigued' as const},{unmetPrerequisites:[source.prerequisites[0]]}]){
      expect(filterDraftV3Sources([source],{prohibitions:[prohibition]},reasons,()=>true)).toEqual([]);
    }
  });
  it('distinguishes an instruction excluding sprints from an instruction prescribing them',()=>{
    const source=findSource('V3P_SWIM_213')!;
    const config={prohibitions:['🚫 SPRINT BAN STRICT']};
    expect(filterDraftV3Sources([source],config,{})).toHaveLength(1);
    expect(filterDraftV3Sources([{...source,title:'Sprint maximal'}],config,{})).toEqual([]);
  });
  it.each(['TTE','VO2max','VMA','VLamax','FTP','FTP/kg','CSS','Durabilité','FatMax','Économie','Robustesse','Durabilité (découplage)',"W' (kJ)"])(
    'finds an identified %s stimulus in actual catalogue work',label=>{
      const sources=[...v3ExtendedCatalogue.workouts,...library920Catalogue.workouts];
      expect(sources.some(w=>rankedSourceIntent(w,label)&&hasRankedWork(w.blocks,w.primaryDomain))).toBe(true);
    });
  it('reports work minutes from the selected repetitions, excluding recovery and warm-up',()=>{
    const threshold=findSource('V3P_RUN_206')!,velocity=findSource('V3P_RUN_207')!;
    expect(rankedSourceIntent(threshold,'TTE')).toBe(true);
    expect(rankedWorkDose(threshold.blocks,threshold.primaryDomain)).toBe('10 min');
    expect(rankedSourceIntent(velocity,'VMA')).toBe(true);
    expect(rankedWorkDose(velocity.blocks,velocity.primaryDomain)).toBe('6 min');
    expect(hasRankedWork(velocity.blocks,'mlss')).toBe(false);
    expect(velocity.phase).toEqual(['build']);
  });
  it('uses a 210 W athlete FTP for threshold work and requests a separate anchor for severe cycling',()=>{
    const anchors={bikeFtpWatts:210,anchorReferenceKinds:{bikeFtpWatts:'app_reference' as const}};
    const threshold=resolveLibrary920Targets(findSource('V3P_BIKE_147')!,anchors);
    const target=threshold.targets.find(t=>t.domain==='mlss'&&t.metric==='watts')!;
    expect(threshold.status).toBe('resolved');
    expect(target.min).toBeGreaterThan(0);
    expect(target.min).toBeLessThanOrEqual(210);
    expect(target.max).toBeGreaterThanOrEqual(210);
    expect(target.max).toBeLessThan(265);
    const severe=library920Catalogue.workouts.find(w=>w.sport==='bike'&&w.primaryDomain==='vo2max')!;
    expect(resolveLibrary920Targets(severe,anchors).missing).toContain('bike_pma_w_validated_above_vo2_floor');
  });
  it('bases the taper on known planned exercise and does not fill an unknown duration',()=>{
    type Week=V3PlanProposal['weeks'][number];
    const weeks=(minutes:number|null):Week[]=>[{weekType:'load',days:[{sessions:[{sport:'bike',role:'long',components:[{sport:'bike',durationMinutes:minutes}]}]}]} as Week];
    const slots=[{sport:'bike',role:'support'},{sport:'brick',role:'key'},{sport:'bike',role:'race'}];
    expect(triathlonTaperTargets([],slots,1,3,false,200)).toBeNull();
    expect(triathlonTaperTargets(weeks(null),slots,1,3,false,200)).toBeNull();
    const first=triathlonTaperTargets(weeks(100),slots,1,3,false,200)!;
    expect(first.preferred).toBeCloseTo(70);
    expect(first.bySlot.map(s=>s.bike)).toEqual([35,35,0]);
    expect(triathlonTaperTargets(weeks(100),slots,3,3,false,200)!.preferred).toBeCloseTo(50);
    expect(triathlonTaperTargets(weeks(100),slots,3,3,true,24)!.preferred).toBe(24);
  });
});
