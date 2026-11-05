import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
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
  limiterCandidates: Array<{ limiter: string; sources: Array<{ id: string; title: string; primaryDomain: string | null }> }>;
  prescriptionAllowed: false;
  validation: 'pending';
  weeks: Array<{
    week: number; phase: string | null; weekType: string;
    days: Array<{ day: string; rest: boolean; slots: Array<{
      sport: string; role: 'race' | 'long' | 'key' | 'support';
      minimumMinutes: number | null;
      candidates: Array<{ id: string; title: string; intent: string; primaryDomain: string | null; limiterAffinity: boolean; limiterMatches: string[] }>;
    }> }>;
  }>;
  pending: string[];
}

/** Preview affinity from the engine's existing domain/key definitions (V403,
 * V408). A match is a search lead, never exact-dose/coverage evidence. */
function affinity(source: V3Workout, key: DetLimiterKey | null): boolean {
  const domain = source.primaryDomain;
  const keys = source.prescription.physiologicalIntent.limiterKeys;
  const threshold = domain === 'mlss' && keys.includes('threshold_tolerance');
  if (key === 'tte' || key === 'durability_race_relative' || key === 'css_threshold') return threshold;
  if (key === 'vo2max' || key === 'vma_velocity') return domain === 'vo2max' && keys.includes('aerobic_ceiling') && keys.includes('severe_domain_tolerance');
  if (key === 'vlamax_reduction') return threshold || (domain === 'moderate_lt1' && keys.includes('aerobic_capacity'));
  if (key === 'ftp' || key === 'ftp_relative') return ['mlss', 'sub_threshold', 'vo2max'].includes(domain ?? '');
  return false;
}

export interface DraftRestrictions { presentContraindications?: readonly string[]; unmetPrerequisites?: readonly string[]; injuryScreen?: string }
export async function buildAppPlanningDetDraft(app: FrozenAppPlanningInput, expectedAthleteId: string, restrictions: DraftRestrictions = {}): Promise<AppPlanningDetDraft> {
  if (app.athleteId !== expectedAthleteId || app.source !== 'app_planning_pipeline') throw Error('Profil partagé absent ou différent de cet athlète.');
  if (await planningFingerprint(app.athlete, app.config) !== app.fingerprint) throw Error('Profil partagé modifié : rechargez avant de préparer le brouillon.');
  if (JSON.stringify(app.limiters.applied) !== JSON.stringify(app.config.identifiedLimitersRaw ?? [])) throw Error('Ordre des limiteurs incohérent avec la configuration.');
  const { athlete, config } = planningInputFor(app, 'det');
  if (!config.objective || !/^\d{4}-\d{2}-\d{2}$/.test(config.planStartDate ?? '') || !Number.isInteger(config.weeksAvailable) || config.weeksAvailable! < 1 || config.weeksAvailable! > 104 || !Number.isFinite(config.weeklyHours) || config.weeklyHours! <= 0 || !Number.isInteger(config.sessionsPerWeek) || config.sessionsPerWeek! < 1) throw Error('Complétez l’objectif, le début, la durée, les heures et les séances dans la configuration commune.');
  const family = coachFamilyFor(config.objective);
  if (!family) throw Error('Cette famille ne dispose pas encore de sources DET pour un brouillon.');
  const semantics = traceLimiterSemantics(app.limiters.applied, family.key);
  if (semantics.blocking) throw Error(`Limiteur principal non raccordé : ${semantics.blocking.raw}. Aucune autre priorité n’est substituée.`);
  if (!semantics.resolutions.length) throw Error('Le profil partagé ne contient pas de limiteur prioritaire.');
  const priorities = semantics.resolutions.map(resolution => ({ raw: resolution.raw, key: resolution.status === 'supported' ? resolution.key : null }));
  const prepared = prepareGenerationContracts(athlete, config);
  const pool = familySourcePool(family.key);
  const poolProblems = await poolLibraryProblems(pool);
  if (poolProblems.length) throw Error(poolProblems.join(' '));
  const bannedPatterns = resolveProhibitionKeys(config.prohibitions).map(key => PROHIBITION_SESSION_PATTERNS[key]).filter(Boolean);
  const sources = pool.ids.map(findSource).filter((source): source is V3Workout => !!source).filter(source => {
    if (restrictions.injuryScreen === 'contraindication') return false;
    if (source.prerequisites.some(key => restrictions.unmetPrerequisites?.includes(key)) || source.contraindications.some(key => restrictions.presentContraindications?.includes(key))) return false;
    const risk = source.sport === 'run' ? config.injuryRisk?.run?.level : source.sport === 'bike' ? config.injuryRisk?.bike?.level : null;
    if (risk === 'ELEVE' || risk === 'CRITIQUE') return false;
    return !bannedPatterns.some(pattern => pattern.test(`${source.id} ${source.title} ${source.focus} ${source.methodology} ${JSON.stringify(source.blocks)}`));
  });
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
    const phase = quota.phase ?? null;
    const days = quota.layout.days.map(day => ({ day: day.dayName, rest: day.isRest, slots: day.slots.map(slot => {
      const role = slot.isRaceEvent ? 'race' as const : slot.isLongSession ? 'long' as const : slot.isKeySession ? 'key' as const : 'support' as const;
      const easy = (source: V3Workout) => ['recovery', 'moderate_lt1'].includes(source.primaryDomain ?? '') || ['technique_economy', 'mobility_prevention'].includes(source.primaryIntent);
      const eligible = role === 'race' ? [] : sources.filter(source => source.sport === slot.sport && (!phase || source.phase.includes(phase)) &&
        (quota.weekType !== 'recovery' || easy(source)) &&
        (slot.sport === 'strength' || role === 'key' || (role === 'long' ? source.primaryDomain === 'moderate_lt1' : easy(source))));
      const candidates = eligible.map(source => ({ source, hits: priorities.map(priority => affinity(source, priority.key)) })).sort((a,b) => {
        for (let rank = 0; rank < priorities.length; rank++) { const difference = Number(b.hits[rank]) - Number(a.hits[rank]); if (difference) return difference; }
        return a.source.id.localeCompare(b.source.id);
      }).slice(0,3).map(({ source, hits }) => ({
        id: source.id, title: source.title, intent: source.prescription.physiologicalIntent.statement,
        primaryDomain: source.primaryDomain, limiterAffinity: hits[0] === true,
        limiterMatches: priorities.filter((_,index) => hits[index]).map(priority => priority.raw),
      }));
      if (!candidates.length && role !== 'race') pending.add(`S${week} ${day.dayName} : séance ${slot.sport} à choisir lors de la revue ; aucune candidate proposée pour ce créneau.`);
      return { sport: slot.sport, role, minimumMinutes: slot.minDurationMin ?? null, candidates };
    }) }));
    weeks.push({ week, phase, weekType: quota.weekType, days });
  }
  if (sources.some(source => source.sport === 'swim')) pending.add('Allures natation par domaine et durées individualisées non calculées tant que leurs références ne sont pas disponibles.');
  const limiterCandidates = priorities.map(priority => ({ limiter: priority.raw, sources: sources.filter(source => affinity(source, priority.key)).sort((a,b) => a.id.localeCompare(b.id)).slice(0,3).map(source => ({ id: source.id, title: source.title, primaryDomain: source.primaryDomain })) }));
  return { kind: 'planning_draft', athleteId: app.athleteId, planningInputFingerprint: app.fingerprint,
    limiterOrder: [...app.limiters.applied], limiterCandidates, objective: config.objective, prescriptionAllowed: false, validation: 'pending', weeks, pending: [...pending] };
}
