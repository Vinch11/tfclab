import{predictRunMLSSPctFromVLaCE,crossValidateRunMLSS}from'@/lib/v2/runMLSSPredictor';
/** Reproduction of actual production calls; no replacement CE, formula or favourable reference. */
export function traceRunReferenceConflictV23(v:any){const raw=v.input.raw,actual=v.prepared.diagnostic.runMLSS;
 return{rawUnchanged:{paceThresholdSecPerKm:raw.paceThresholdSecPerKm,vma:raw.vma,vlamaxRun:raw.vlamaxRun,runEconomyScore:raw.runEconomyScore},
 source:'computeDiagnostic.computeRunMLSS passes input.runEconomyScore directly into predictRunMLSSPctFromVLaCE',
 predictorExpectedUnit:'ml O2/kg/km per src/lib/v2/runMLSSPredictor.ts',providedFieldMeaning:'runEconomyScore; unit not declared by DiagnosticInput and no conversion at this call',
 directPrediction:predictRunMLSSPctFromVLaCE(raw.vlamaxRun,raw.runEconomyScore),directCrossValidation:actual?.observedPct!=null?crossValidateRunMLSS(actual.observedPct,raw.vlamaxRun,raw.runEconomyScore):null,actualDiagnostic:actual,
 suspectedBoundaryProblem:'numeric score3 is below the predictor CE input clamp150; 3 is not established as an oxygen-cost measurement. Semantic/unit mismatch must be reviewed before interpreting a model/test disagreement.',
 rawReferenceChanged:false,productionFormulaChanged:false,favourableCEInvented:false,parallelPhysiologyReviewRequired:true,actualHumanApproval:false};}
