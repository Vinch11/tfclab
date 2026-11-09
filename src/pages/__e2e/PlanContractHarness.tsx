import {useState} from 'react';
import {PlanPrevalidationPanel} from '@/components/PlanPrevalidationPanel';
import {Button} from '@/components/ui/button';
import {mergeWindowEvidence, type DisplayPrevalidation} from '@/lib/plan/contractScope';
export default function PlanContractHarness() {
 const base:DisplayPrevalidation={status:'coach_review',issues:[{week:1,code:'coach_initial_load_unverified',severity:'warning'}],generationWindow:{from:1,to:15,objective:'Marathon · 28/02/2027'},weeks:Array.from({length:33},(_,i)=>({week:i+1,globalWeek:i+1,objective:i<16?'Marathon · 28/02/2027':'Ironman · 27/06/2027',phase:'base',weekType:'load',availability:[],requiredIntentions:[],eligible:[],excluded:[],limitedDiversitySports:[],missingSports:[],minimumStructuredMinutes:0,minimumCatalogueMinutes:0}))};
 const [report,setReport]=useState(base);
 return <main className="mx-auto max-w-5xl p-4 space-y-4"><h1 className="text-xl font-semibold">Contrat de recette fictif</h1><Button onClick={()=>setReport(current=>({...mergeWindowEvidence(current,{from:1,to:15,report:{status:'blocked',weeks:[],issues:[{week:2,code:'catalogue_slot_duration_unavailable',severity:'blocking'}]}}),generationWindow:base.generationWindow}))}>Simuler un refus du premier bloc</Button><PlanPrevalidationPanel report={report}/></main>;
}