import {ordinarySourceFamily} from './ordinaryObjective';
import {allowsControlledRunIntervals} from './controlledRunIntervals';
import {hasAdditionalPrimaryRule} from './rankedLimiterPrescription';
import { limiterSourceAffinity } from "../../../experimental/det-engine/v411-limiter-source-affinity";
import type { LimiterMesocycleSchedule, LimiterWeekFocus } from "@/lib/plan/limiterMesocycles";
import {prepareDetGeneration,trailFamily} from './trailPreparation';
import { planningFingerprint, planningInputFor, type FrozenAppPlanningInput } from './appPlanningInput';
import { coachFamilyFor } from '../../../experimental/det-engine/v401-coach-inputs-core';
import { traceLimiterSemantics, type DetLimiterKey } from '../../../experimental/det-engine/v403-limiter-semantics';
import { familySourcePool, poolLibraryProblems } from './familySourcePools';
import { PROHIBITION_SESSION_PATTERNS, resolveProhibitionKeys } from '@/lib/limiterSessionPatterns';
import { findSource } from './coachDetContext';
import type { V3Workout } from '../../../scripts/library-v3/catalogueRuntime';

/** A pre-review study, deliberately NOT ParsedPlan / CoachDetOutcome. No
 * admission, source review, numerical prescription or send authority is created. */
export interface AppPlanningDetDraft {
  kind: 'planning_draft';
  athleteId: string;
  planningInputFingerprint: string;
  limiterOrder: string[];
  objective: string;
  limiterMesocycles: LimiterMesocycleSchedule;
  limiterCandidates: Array<{ limiter: string; sources: Array<{ id: string; title: string; primaryDomain: string | null }> }>;
  prescriptionAllowed: false;
  validation: 'pending';
  weeks: Array<{
    limiterFocus: LimiterWeekFocus;
    week: number; phase: string | null; weekType: string;
    days: Array<{ day: string; rest: boolean; slots: Array<{
      sport: string; role: 'race' | 'long' | 'key' | 'support';
      minimumMinutes: number | null;
      maximumMinutes?: number | null;
      candidates: Array<{ id: string; title: string; intent: string; primaryDomain: string | null; limiterAffinity: boolean; limiterMatches: string[] }>;
    }> }>;
  }>;
  pending: string[];
}

/** Preview affinity from the engine's existing domain/key definitions (V403,
 * V408). A match is a search lead, never exact-dose/coverage evidence. */
function affinity(source: V3Workout, key: DetLimiterKey | null): boolean {
  return limiterSourceAffinity({primaryDomain:source.primaryDomain,limiterKeys:source.prescription.physiologicalIntent.limiterKeys},key);
}

export interface DraftRestrictions { presentContraindications?: readonly string[]; unmetPrerequisites?: readonly string[]; injuryScreen?: string; currentFatigue?: 'ready'|'fatigued'|'unknown'; recentLoad?: 'low'|'moderate'|'high'|'unknown' }
/** Shared negative restrictions for the study and the proposed V3 assembly.
 * Absence of a restriction never creates a positive athlete clearance. */
export function filterDraftV3Sources(sources: V3Workout[], config: Pick<FrozenAppPlanningInput['config'],'prohibitions'|'injuryRisk'>, restrictions: DraftRestrictions, controlledRun?: (source:V3Workout)=>boolean): V3Workout[] {
  const banned = resolveProhibitionKeys(config.prohibitions).map(key => ({key,pattern:PROHIBITION_SESSION_PATTERNS[key]})).filter(row=>!!row.pattern);
  const explicitRunCeilingVeto=!allowsControlledRunIntervals(config.prohibitions);
  return sources.filter(source => {
    if(explicitRunCeilingVeto && source.sport==='run' && source.prescription.physiologicalIntent.domainIds.includes('vo2max'))return false;
    if (restrictions.injuryScreen === 'contraindication') return false;
    if(restrictions.currentFatigue==='fatigued'&&source.sport!=='strength'&&source.prescription.physiologicalIntent.domainIds.some(d=>!['recovery','moderate_lt1'].includes(d)))return false;
    if (source.prerequisites.some(key => restrictions.unmetPrerequisites?.includes(key)) || source.contraindications.some(key => restrictions.presentContraindications?.includes(key))) return false;
    const risk = source.sport === 'run' ? config.injuryRisk?.run?.level : source.sport === 'bike' ? config.injuryRisk?.bike?.level : null;
    if (risk === 'ELEVE' || risk === 'CRITIQUE') return false;
    return !banned.some(({key,pattern}) => {
      // The historical VO2 regex also matches the ordinary word "répétitions".
      // V3 has explicit domains: strength repetitions are not a VO2 block.
      if(key==='vo2_heavy_blocks'&&(!source.prescription.physiologicalIntent.domainIds.includes('vo2max')||controlledRun?.(source)))return false;
      if(key==='sprints'){
        const cues=[source.id,source.title,source.focus,source.methodology,JSON.stringify(source.blocks)].join(' ');
        return pattern.test(cues.replace(/\bsans sprints?\b/gi,''));
      }
      return pattern.test(`${source.id} ${source.title} ${source.focus} ${source.methodology} ${JSON.stringify(source.blocks)}`);
    });
  });
}
export async function buildAppPlanningDetDraft(app: FrozenAppPlanningInput, expectedAthleteId: string, restrictions: DraftRestrictions = {}, ordinaryProposal=false): Promise<AppPlanningDetDraft> {
  if (app.athleteId !== expectedAthleteId || app.source !== 'app_planning_pipeline') throw Error('Profil partagé absent ou différent de cet athlète.');
  if (await planningFingerprint(app.athlete, app.config) !== app.fingerprint) throw Error('Profil partagé modifié : rechargez avant de préparer le brouillon.');
  if (JSON.stringify(app.limiters.applied) !== JSON.stringify(app.config.identifiedLimitersRaw ?? [])) throw Error('Ordre des limiteurs incohérent avec la configuration.');
  const { athlete, config } = planningInputFor(app, 'det');
  // Undefined frequency is the existing IA "Auto" setting. Its actual weekly
  // counts come from prepareGenerationContracts, including recovery/race
  // adjustments; inventing a fixed count here would override that calendar.
  const invalidFrequency=config.sessionsPerWeek!==undefined&&(!Number.isInteger(config.sessionsPerWeek)||config.sessionsPerWeek<1);
  if (!config.objective || !/^\d{4}-\d{2}-\d{2}$/.test(config.planStartDate ?? '') || !Number.isInteger(config.weeksAvailable) || config.weeksAvailable! < 1 || config.weeksAvailable! > 104 || !Number.isFinite(config.weeklyHours) || config.weeklyHours! <= 0 || invalidFrequency) throw Error('Complétez l’objectif, le début, la durée, les heures et les séances dans la configuration commune.');
  const family = ordinaryProposal?ordinarySourceFamily(config.objective):coachFamilyFor(config.objective);
  if (!family) throw Error('Cette famille ne dispose pas encore de sources DET pour un brouillon.');
  const semantics = traceLimiterSemantics(app.limiters.applied, family.key);
  // The ordinary proposal has its own block-dose check for running limiters.
  // The route-reviewed runner retains its separate admission contract.
  const trailDraft = trailFamily(config) && semantics.resolutions[0]?.status==='supported' &&
    ['tte','durability_race_relative','vo2max','vlamax_reduction','vma_velocity'].includes(semantics.resolutions[0].key ?? '');
  const primary=semantics.resolutions[0];
  const gap=config.physiologicalTrace?.diagnostic.limiters.find(row=>row.metric==='FTP/kg');
  const documentedBikePower=family.sportFocus==='tri' && primary?.key==='ftp_relative' &&
    typeof athlete.weightKg==='number'&&athlete.weightKg>0&&typeof athlete.ftp==='number'&&athlete.ftp>0&&
    typeof gap?.value==='number'&&typeof gap.target==='number'&&gap.value<gap.target&&Math.abs(gap.value-athlete.ftp/athlete.weightKg)<.005;
  const ordinaryPrimary=ordinaryProposal && (hasAdditionalPrimaryRule(app.limiters.applied[0])||documentedBikePower);
  if (semantics.blocking && !trailDraft && !ordinaryPrimary) throw Error(`Limiteur principal non raccordé : ${semantics.blocking.raw}. Aucune autre priorité n’est substituée.`);
  if (!semantics.resolutions.length) throw Error('Le profil partagé ne contient pas de limiteur prioritaire.');
  const priorities = semantics.resolutions.map(resolution => ({ raw: resolution.raw, key: resolution.status === 'supported' ? resolution.key : null }));
  const prepared = prepareDetGeneration(athlete, config);
  const pool = familySourcePool(family.key);
  const poolProblems = await poolLibraryProblems(pool);
  if (poolProblems.length) throw Error(poolProblems.join(' '));
  const sources = filterDraftV3Sources(pool.ids.map(findSource).filter((source): source is V3Workout => !!source), config, restrictions);
  const weeks: AppPlanningDetDraft['weeks'] = [];
  const pending = new Set<string>([
    'Sélection définitive et dose des séances à revoir ; les fiches ci-dessous sont des candidates, sans approbation créée.',
    'Charge actuelle, douleurs, prérequis et contre-indications à vérifier lors de la revue du plan.',
    'Jours proposés par le calendrier commun ; disponibilités et récupération entre séances non confirmées sans horaires.',
    'Volume, proportions sportives, progression et couverture effective des limiteurs restent à valider sur le plan final.',
  ]);
  for (let week = 1; week <= config.weeksAvailable!; week++) {
    const quota = prepared.weeklyQuotas[week];
    if (!quota?.layout) throw Error(`Le calendrier commun ne fournit pas la semaine ${week} ; aucun calendrier de remplacement n’est inventé.`);
    // Week type governs the executable prescription. Keep the shared macro
    // calendar intact; its peak block can overlap the beginning of taper.
    const phase = quota.weekType==='taper'||quota.weekType==='race'?'taper':quota.phase ?? null;
    const limiterFocus = prepared.limiterMesocycles.byWeek[week];
    const focusPriority = limiterFocus.focus ? priorities.find(priority => priority.raw === limiterFocus.focus) : null;
    const days = quota.layout.days.map(day => ({ day: day.dayName, rest: day.isRest, slots: day.slots.map(slot => {
      const role = slot.isRaceEvent ? 'race' as const : slot.isLongSession ? 'long' as const : slot.isKeySession ? 'key' as const : 'support' as const;
      const easy = (source: V3Workout) => ['recovery', 'moderate_lt1'].includes(source.primaryDomain ?? '') || ['technique_economy', 'mobility_prevention'].includes(source.primaryIntent);
      const eligible = role === 'race' ? [] : sources.filter(source => source.sport === slot.sport && (!phase || source.phase.includes(phase)) &&
        (quota.weekType !== 'recovery' || easy(source)) &&
        (slot.sport === 'strength' || role === 'key' || (role === 'long' ? source.primaryDomain === 'moderate_lt1' : easy(source))));
      const candidates = eligible.map(source => ({ source, hits: priorities.map(priority => affinity(source, priority.key)) })).sort((a,b) => {
        if (focusPriority) { const difference = Number(affinity(b.source,focusPriority.key))-Number(affinity(a.source,focusPriority.key)); if (difference) return difference; }
        for (let rank = 0; rank < priorities.length; rank++) { const difference = Number(b.hits[rank]) - Number(a.hits[rank]); if (difference) return difference; }
        return a.source.id.localeCompare(b.source.id);
      }).slice(0,3).map(({ source, hits }) => ({
        id: source.id, title: source.title, intent: source.prescription.physiologicalIntent.statement,
        primaryDomain: source.primaryDomain, limiterAffinity: hits[0] === true,
        limiterMatches: priorities.filter((_,index) => hits[index]).map(priority => priority.raw),
      }));
      if (!candidates.length && role !== 'race') pending.add(`S${week} ${day.dayName} : séance ${slot.sport} à choisir lors de la revue ; aucune candidate proposée pour ce créneau.`);
      // Shared templates allocate a 20-minute activation. During an ordinary
      // beginner finish plan, DET can select a shorter bounded warm-up/run/walk.
      const shortActivation=ordinaryProposal && slot.isActivation && slot.sport==='run' &&
        config.ambitionMeta?.trainingLevel==='untrained' && config.ambition==='finisher' &&
        slot.minDurationMin===20 && slot.maxDurationMin===30 && !config.constraints?.trim();
      if(shortActivation)pending.add('Affûtage en reprise : activation en marche-course possible entre 12 et 30 min dans le budget de la semaine.');
      return { sport: slot.sport, role, minimumMinutes: shortActivation?12:slot.minDurationMin ?? null, maximumMinutes:slot.maxDurationMin??null, candidates };
    }) }));
    weeks.push({ limiterFocus, week, phase, weekType: quota.weekType, days });
  }
  if (sources.some(source => source.sport === 'swim')) pending.add('Allures natation par domaine et durées individualisées non calculées tant que leurs références ne sont pas disponibles.');
  const limiterCandidates = priorities.map(priority => ({ limiter: priority.raw, sources: sources.filter(source => affinity(source, priority.key)).sort((a,b) => a.id.localeCompare(b.id)).slice(0,3).map(source => ({ id: source.id, title: source.title, primaryDomain: source.primaryDomain })) }));
  return { kind: 'planning_draft', limiterMesocycles:prepared.limiterMesocycles, athleteId: app.athleteId, planningInputFingerprint: app.fingerprint,
    limiterOrder: [...app.limiters.applied], limiterCandidates, objective: config.objective, prescriptionAllowed: false, validation: 'pending', weeks, pending: [...pending] };
}
