import{computeVLamaxEffectif}from'@/lib/vlamaxEffectif';import{computeTTEEffectif}from'@/lib/tteEffectif';
/** Explicit transport fix only: preserve input values and classify field estimates as field estimates. */
export function normalizeV22Evidence(input:any){const r=input.raw;
 const vlamax=computeVLamaxEffectif({athleteId:r.athleteId,objectif:r.objectif,tests:r.vlamax==null?[]:[{athlete_id:r.athleteId,vlamax:r.vlamax,date:input.evidence.date,type:'sprint',name:'Synthetic V22 field estimate; no blood lactate measurement'}],snapshots:[]});
 const tte=computeTTEEffectif({ftp:r.ftp,tss_7d:r.tss7d,tte_mode:r.tteMode==='observed'?'OBSERVED':r.tteMode,tte_observed_min:r.tteObservedMin,tte_observed_min_run:r.tteObservedMinRun,sport:'bike',objectif:r.objectif,age:r.age});
 return{...input,raw:{...r,vlamaxEffectifPrecomputed:vlamax,tteEffectifPrecomputed:tte},transport:{tteModeTranslation:r.tteMode==='observed'?'declared observed -> existing OBSERVED enum':'unchanged',vlamax:'existing computeVLamaxEffectif on explicit synthetic field-test record; never lab',noInputPhysiologicalValueChanged:true}};
}
