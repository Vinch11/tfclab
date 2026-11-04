import{v10Profiles}from'./v10-profiles';import{reconcileExperimentalBudget}from'./v13-budget';
/** Existing V10 synthetic cases, unchanged evidence; V13 budget reconciliation reused. */
export function v14Profiles(){return v10Profiles().filter(p=>p.family==='ironman').filter(p=>p.id==='IM_aerobic_history'||p.id==='IM_balanced_history').map(p=>reconcileExperimentalBudget(p).candidate);}
