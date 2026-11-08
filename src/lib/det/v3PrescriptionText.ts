import type {ProposedV3Workout} from './appPlanningV3Proposal';
import {coachBlocks,coachTarget,coachMissingReference} from '@/lib/plan/coachPrescriptionText';
import {findSource} from './coachDetContext';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';

/** Render the saved configured dose, never substitute a catalogue default. */
export function renderV3Prescription(components:readonly ProposedV3Workout[],withSourceGuidance=false,legacyRepeatLabels=false,legacySpeedUnits=false):string {
 return components.map(c=>{const source=withSourceGuidance?findSource(c.sourceId):undefined;return `${c.title}${source?`\nIntention : ${source.prescription.physiologicalIntent.statement}\nConsigne : ${source.focus}\nMéthode : ${source.methodology}`:''}\n${coachBlocks(c.blocks,'',legacyRepeatLabels)}\n${c.targets.targets.map(t=>`${t.domain?getDoctrineDomain(t.domain).label:'Force'} : ${coachTarget(t,legacySpeedUnits)}`).join('\n')}${c.targets.missing.length?'\nRepères à préciser : '+[...new Set(c.targets.missing.map(coachMissingReference))].join(', '):''}\nArrêt : ${c.review.stopRule}`;}).join('\n\n');
}
