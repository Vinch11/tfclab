export const V7_UNITS=['audit','registry','ratios','trail','ironman','comparison','reviews','reference','validation','publication'];
export function validateV7Budget(state,id,now=Date.now()){
 if(!V7_UNITS.includes(id))throw Error('UNKNOWN_UNIT');
 if(state.status==='completed_no_go'||state.status==='stopped')throw Error('MISSION_CLOSED');
 if(!Number.isFinite(state.startedAt)||!Number.isFinite(state.deadline)||state.deadline<=state.startedAt||state.deadline-state.startedAt>3600||state.maxUnits!==10||state.maxAttemptsPerUnit!==3)throw Error('INVALID_BUDGET');
 if(now>=state.deadline*1000)throw Error('DEADLINE');
 if(state.activeUnit)throw Error('ACTIVE_OR_INTERRUPTED_UNIT_REQUIRES_PROCESS_CHECK');
 if(new Set(state.units.map(u=>u.id)).size!==state.units.length)throw Error('DUPLICATE_UNIT');
 if(state.units.length>10||!state.units.some(u=>u.id===id)&&state.units.length>=10)throw Error('UNIT_LIMIT');
 return state.units.find(u=>u.id===id);
}
