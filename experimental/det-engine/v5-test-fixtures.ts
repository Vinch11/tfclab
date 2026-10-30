/** Explicit small unit-test calendar; not a prescription or part of either cohort. */
import type{WeekQuotaEntry}from'@/lib/plan/validateWeeklyQuotas';
export function entry(weekType:'load'|'taper'|'recovery'):WeekQuotaEntry{const zero={min:0,max:0};return{weekType,downgraded:false,floors:{minStrengthPerWeek:0},quota:{swim:zero,bike:zero,run:{min:1,max:1},brick:zero,strength:zero,totalSessions:{min:1,max:1},maxSessionsPerDay:1,minFullRestDays:6,source:{tier:'elite_practice',ref:'synthetic unit test; no sporting evidence'}}};}
