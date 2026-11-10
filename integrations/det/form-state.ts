import {useMemo} from 'react';
function unavailable(){throw Error('Ce formulaire utilise le moteur DET.');}
// The base form reads these slots even when no model-generated plan is displayed.
export function useDetFormState(){
  return useMemo(()=>({
    response:'',prevalidation:null,parsedPlan:null,mergedPlan:null,isLoading:false,chunkProgress:null,
    sportObjectiveIssues:[],weeklyQuotaIssues:[],catalogIdIssues:[],
    lastAllowedCatalogIdsRef:{current:[]},lastWeeklyQuotasRef:{current:{}},lastResponseRef:{current:''},
    reset:()=>{},setResponse:()=>{},generatePlan:unavailable,generatePlanWindowed:unavailable,prevalidateTrainingPlan:unavailable,
  }),[]);
}
