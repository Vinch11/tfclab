/** Source, editorial convention, arithmetic proof and scientific admission remain separate axes. */
import{assertEditorialIntegrity}from'./v19-editorial.mjs';import{doseLedger,compareRecoveryWitnesses}from'./v19-dose-ledger.mjs';import{flattenNodes}from'./v18-compiler.mjs';
export function classifyCandidate(record,candidate){assertEditorialIntegrity(record.originalCanonical,record.sourceV18Recipe,candidate);const headline=candidate.variant==='correct_declared_total',complete=candidate.classification==='complete_timeline_candidate';const ledger=complete?doseLedger(candidate,record.originalCanonical.prescription.discipline):null;return{
 legacyId:record.legacyId,candidateKey:candidate.candidateKey,variant:candidate.variant,sourceClassification:record.sourceV18Recipe.classification,candidateClassification:candidate.classification,
 integrity:'source_components_preserved_with_declared_editorial_changes',technicalTimelineAvailable:complete,sourceWorkRangesAndRepetitionRangesPreserved:true,
 technicalReviewWithoutChangingV19CandidateDose:complete,unmodifiedHistoricalTotalDoseProven:false,
 arithmeticHeadlineCorrectionWithoutComponentDoseChange:headline,
 commonArbitration:headline?'advertised_total_vs_written_components':'last_recovery_occurrence_and_whole_microcycle_context',
 recoveryDoseNewlySpecified:!headline,sourceRecoveryAmbiguityStillExists:!headline,
 sourceEnvelopeChanged:headline,sourceMinutes:candidate.sourceMinutes,candidateMinutes:candidate.candidateMinutes,
 witness:complete?candidate.witness:null,ledger,changes:candidate.changes,unresolved:candidate.unresolved,
 requiresSportingArbitration:!headline,requiresIndividualAdmissibilityReview:true,scientificValidation:false,expertReviewed:false,automaticPrescription:false};}
export function scientificReview(record,candidate,classification){if(!classification.technicalTimelineAvailable)return null;const c=record.originalCanonical,q=record.scientificQualificationV17,leaves=flattenNodes(candidate.nodes).filter(n=>['time','envelope'].includes(n.kind)),rest=leaves.filter(n=>n.role==='rest');return{
 version:'det-v20-scientific-review-1',legacyId:record.legacyId,candidateKey:candidate.candidateKey,
 sourceClaim:q.sourceClaim,explicitPhysiology:q.explicitPhysiology,sourceScientificQualification:q,
 mechanism:{assessment:'not_independently_established_for_exact_dose_and_population',titleOrZoneAloneIsNotEvidence:true},
 sourceContext:{goals:c.prescription.goals,phases:c.prescription.phases,restrictions:c.prescription.restrictions,parameters:c.prescription.parameters,terrain:c.prescription.terrain,muscular:c.prescription.muscular},
 exactCandidateDose:{seconds:candidate.witness.seconds,assignment:candidate.witness.assignment,descriptiveLedger:classification.ledger},
 conventions:candidate.changes.map(x=>({rule:x.rule,origin:x.origin,justification:x.justification,uncertainty:x.uncertainty,directDoseEvidence:x.directDoseEvidence})),
 intensityUnknowns:{unlabelledOrMultiZoneLeaves:leaves.filter(n=>n.zones.length!==1).length,recoveryNodesWithoutExplicitOwnZone:rest.filter(n=>n.zones.length!==1).length,inheritedPartZoneIsNotAValidatedRecoveryTarget:true,sourcePercentagesNotAutomaticallyCalibrated:true},
 literature:{exactSourceMentions:q.references.individualSourceMentions,verifiedMetadataLinks:q.references.exactVerifiedMetadataLinks,moduleReferencesNotAssignedToWorkout:true,sharedMethodologicalContextOnly:['docs/det-engine/v8/SCIENTIFIC_EVIDENCE_MATRIX.md','docs/det-engine/v8/LORANG_METHODOLOGY.md','docs/det-engine/v19/cycle-1/SCIENCE_REVIEW.md'],doseOptimalityDemonstrated:false},
 reviewQuestions:['Which adaptation is a justified priority for this individual and preparation phase?','Are source intensities, effort and recovery doses admissible given the effective references and documented history?','Does the final recovery convention fit the cooldown and the whole microcycle, without changing earlier effort recovery?','Which observations and reassessment stop or maintain this trial before progression?'],
 requiredEvidence:{individualHistory:null,capacityAtDose:null,observedRecovery:null,coachApproval:null,missingEvidenceIsNotZero:true,noNewUniversalQuantitativeQuestionnaire:true},
 reevaluation:{noCapacityAcquiredFromElapsedWeeks:true,painOrNonRecoveryRequiresReview:true,syntheticToleranceIsNotScientificValidation:true},
 scientificStatus:'review_dossier_prepared_not_qualified',humanExpertReview:false,individualPrescriptionApproved:false};}
export function reviewRecord(record){const candidates=record.candidates.map(c=>classifyCandidate(record,c));return{legacyId:record.legacyId,sourceCanonicalHash:record.sourceCanonicalHash,sourceRecipeHash:record.sourceRecipeHash,sourceScientificQualificationUnchanged:record.scientificQualificationV17,candidates,recoveryComparison:compareRecoveryWitnesses(record.candidates,record.originalCanonical.prescription.discipline),science:candidates.map((c,i)=>scientificReview(record,record.candidates[i],c)).filter(Boolean)};}
