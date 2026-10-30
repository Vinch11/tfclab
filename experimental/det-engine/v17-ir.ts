/** V17 intermediate representation. Technical compilation is independent of sports admission. */
export type RecipeClass='complete'|'partial'|'ambiguous'|'contradictory'|'descriptive_non_metabolic';
export interface SourceSpan{partIndex:number;start:number;end:number;literal:string;}
export interface QuantityRange{min:number;max:number;unit:'second'|'meter'|'count';source:SourceSpan;}
export interface RecipeNode{
 kind:'time'|'distance'|'sequence'|'repeat'|'optional'|'unknown'|'integrated'|'exercise'|'transition';
 text:string;partIndex:number;role:string;sport:string|null;zones:string[];
 quantity?:QuantityRange;count?:QuantityRange;children?:RecipeNode[];
 declaredPartZones?:string[];intensityStatus?:'source_verbatim_not_individually_resolved';
 exerciseEvidence?:{setsAndReps:{literal:string;sets:[number,number];reps:[number,number];sourceOffset:number}[];timedLiterals:QuantityRange[];loadAndTempoInstructions:string;individualLoad:null;fullCircuitElapsedSeconds:null};
 restPolicy?:'explicit_inside_repeat'|'between_only'|'after_each'|'unknown';
 reason?:string;sourceSpans:SourceSpan[];individualDoseApproved:false;
}
export interface CompiledRecipe{
 irVersion:'tfcl-recipe-ir-1.0.0';legacyId:string;canonicalHash:string;classification:RecipeClass;
 nodes:RecipeNode[];annotations:unknown[];unknowns:string[];
 advertisedMinutes:[number,number]|null;elapsedSeconds:{min:number|null;max:number|null};
 witness:{seconds:number;assignment:unknown[];sourceRangeOnly:true}|null;
 sourceUnchanged:true;scientificValidation:false;automaticPrescription:false;
}
