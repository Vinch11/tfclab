/** The existing generation preparation, extracted unchanged for offline preview.
 * No model, auth, persistence read or write. Same artefacts feed actual generation. */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { TrainingSport, PhaseTag } from "@/types/workoutLibrary";
import { buildPeriodizationCalendar } from "./periodizationCalendar";
import { getCatalogSportFilter, getCatalogExclusions } from "./catalogScope";
import type { V3CoachPilotContext } from "@/lib/v3EngineBridge";
import { buildWorkoutCatalog, serializeCatalogForPrompt, computeCatalogDurationStats, resetCatalogAttribution, toInjuryRiskCatalogOption } from "@/lib/workoutCatalogBuilder";
import { isTrailCatalogId } from "./trailMarkers";
import { extractCatalogIdsFromDump } from "../../../supabase/functions/_shared/catalogueIds";
import { computeObjectiveCycleSegments } from "./multiObjectiveClassification";
import { inferWeekType, buildCoachVolumeBudget, buildQuotaPromptBlock, computeWeekQuotaEntry, applySlFloorIndividualization, type SlFloorRampAnchors } from "@/engines/plan/sessionSizingMatrix";
import { parseAthleteConstraints } from "./constraintRules";
import { buildWeeklySlotLayout, buildLayoutPromptBlock, type WeeklySlotLayout, type LayoutSport } from "@/engines/plan/weeklySlotLayout";
import { declaredRaceSlotsForWeek } from "../../../supabase/functions/_shared/catalogueTrainingMinima";
import { catalogueForWeek } from "../../../supabase/functions/_shared/sessionCatalogueContract";
import { normalizeRepairSport } from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { snapshotSLFloorAudit, traceSLFloorConsumer } from "./slFloorAudit";
import type { WeekQuotaEntry } from "./validateWeeklyQuotas";
export function prepareGenerationContracts(athleteData:PlanAthleteData,planConfig:PlanConfig,options:{historicalUsage?:Map<string,number>;rotationSeed?:number;v3CoachPilot?: V3CoachPilotContext}={}) {
 const totalWeeks=planConfig.weeksAvailable??0;
 if(!Number.isInteger(totalWeeks)||totalWeeks<=0)throw new Error("PREVALIDATION_INVALID_DURATION");
 const effTotalWeeks=planConfig.globalTotalWeeks??totalWeeks,weekOffset=planConfig.globalWeekOffset??0;
 const obj=(planConfig.objective??"").toUpperCase();
 const isTriVerbose=/IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
 const isTrailVerbose=/TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj)||(/TRAIL/i.test(obj)&&totalWeeks>=12);
 const CHUNK_SIZE=isTriVerbose?5:isTrailVerbose?6:4;
 const needsChunking=totalWeeks>(isTriVerbose?6:isTrailVerbose?8:6);
 const totalChunks=needsChunking?Math.ceil(totalWeeks/CHUNK_SIZE):1;
 let allowedCatalogIds:string[]=[];
      const phaseCalendar = buildPeriodizationCalendar(planConfig);
      const phaseOptions = (start: number, end: number) => {
        const phases = [...new Set(Array.from({ length: end - start + 1 }, (_, i) => phaseCalendar?.[start + i - weekOffset]).filter(Boolean))] as PhaseTag[];
        const weekContexts = Array.from({ length: end - start + 1 }, (_, i) => ({
          phase: isRegenGapWeek(start + i - weekOffset) ? "base" : phaseCalendar?.[start + i - weekOffset], objective: planConfig.catalogObjective || planConfig.objective,
          weekType: isRegenGapWeek(start + i - weekOffset) ? "recovery" : inferWeekType(start + i, effTotalWeeks, planConfig.catalogObjective || planConfig.objective, athleteData.age, planConfig.deloadCadenceWeeks),
        }));
        return phases.length ? { phaseOverride: phases, weekContexts } : { weekContexts };
      };
      // Build phase-specific workout catalogs for AI injection (fallback for non-chunked plans)
      const phaseCatalogs: Record<string, string> = {};
      const phaseRepairCatalogs: Record<string, Array<ReturnType<typeof buildWorkoutCatalog>[number]["repairMetadata"]>> = {};
      // NB : bornes CHEVAUCHANTES volontairement — usage = injection catalogue aux transitions.
      // La phase canonique des semaines est fixée par normalizeWeeksAndPhases (source unique).
      // Bornes exprimées en position GLOBALE (effTotalWeeks) : en régénération
      // de fenêtre, ça reflète la vraie place du bloc dans le plan complet
      // plutôt que de réinventer un cycle base/build/peak/taper sur la seule
      // fenêtre locale (cf. PlanConfig.globalTotalWeeks).
      const phaseRanges: Array<{ phase: string; start: number; end: number }> = [
        { phase: "base", start: 1, end: Math.ceil(effTotalWeeks * 0.35) },
        { phase: "build", start: Math.ceil(effTotalWeeks * 0.25), end: Math.ceil(effTotalWeeks * 0.65) },
        { phase: "peak", start: Math.ceil(effTotalWeeks * 0.55), end: Math.ceil(effTotalWeeks * 0.85) },
        { phase: "taper", start: Math.ceil(effTotalWeeks * 0.80), end: effTotalWeeks },
      ];
      // Objectif utilisé pour COMPOSER le catalogue envoyé à l'IA (sport
      // éligible, exclusions, scoring par tags `goals`) — distinct de
      // `planConfig.objective` (texte de prompt envoyé à l'edge function,
      // toujours l'objectif FINAL du plan, inchangé) quand cette fenêtre
      // appartient au cycle d'un objectif INTERMÉDIAIRE d'un plan
      // multi-objectifs (cf. PlanConfig.catalogObjective).
      //
      // Bug réel corrigé (audit "bibliothèque de séances", retour coach :
      // "très peu de CAP en préparation du marathon") : un premier fix
      // (PR précédente) n'appliquait `catalogObjective` qu'au SCORING dans
      // buildWorkoutCatalog, en gardant `catalogSportFilter`/exclusions basés
      // sur l'objectif final (Ironman → sports triathlon complets). Le socle
      // de couverture par (sport × famille) de buildWorkoutCatalog garantit
      // une présence minimale POUR CHAQUE SPORT ÉLIGIBLE, indépendamment du
      // score — vélo/natation gardaient donc une représentation quasi égale
      // à la course dans le catalogue envoyé, quel que soit le bonus de score
      // "objectif marathon". Le vrai levier est le FILTRE SPORT lui-même :
      // en appliquant `catalogObjective` ("Marathon") à `getCatalogSportFilter`
      // aussi, la fenêtre ne voit plus QUE des séances course/renfo pour ce
      // cycle — cohérent avec le traitement déjà appliqué à un plan Marathon
      // mono-objectif classique.
      const catalogObjective = planConfig.catalogObjective || planConfig.objective || "";
      const catalogSportFilter = getCatalogSportFilter(catalogObjective);
      const { excludeIdPatterns, excludeTags } = getCatalogExclusions(
        catalogObjective,
        planConfig.raceGoals
      );

      // Dose de maintenance vélo/natation (retour coach : "est-ce juste
      // scientifiquement pour quelqu'un qui prépare aussi un Ironman ?").
      // Exclure TOTALEMENT vélo/natation pendant tout un cycle Marathon
      // intermédiaire (parfois ~20 sem) risque une vraie perte spécifique
      // avant l'Ironman qui suit — feel-for-water en natation (se dégrade en
      // quelques semaines d'arrêt complet), tolérance posturale vélo (cf.
      // littérature désentraînement, Mujika & Padilla : une dose minimale,
      // pas un arrêt total, suffit à préserver l'essentiel). Ne s'applique
      // QUE si ce cycle est un objectif INTERMÉDIAIRE (catalogObjective ≠
      // objectif final du plan) ET que l'objectif final est lui-même un
      // triathlon (donc vélo/natation font partie de la préparation à venir) —
      // un vrai plan Marathon autonome garde le comportement précédent (0
      // vélo/natation, rien à maintenir pour un objectif purement course).
      const isIntermediateRunCycle = catalogObjective !== (planConfig.objective || "")
        && (getCatalogSportFilter(planConfig.objective || "") ?? []).some(s => s === "cyclisme" || s === "bike" || s === "natation" || s === "swim");
      const maintenanceSports: TrainingSport[] | undefined = isIntermediateRunCycle
        ? (["cyclisme", "natation"] as TrainingSport[])
        : undefined;

      // Compute catalog duration stats from all phases combined
      const allCatalogEntries: ReturnType<typeof buildWorkoutCatalog> = [];
      const usedIds = new Set<string>();

      // Reset l'attribution B5 avant les builds (accumule sur tous les chunks du plan)
      resetCatalogAttribution();


      // Limiteurs diagnostiqués (clés métriques brutes issues du diagnostic unifié)
      // — utilisés par scoreWorkout pour booster les séances qui adressent le limiteur.
      const limiterKeys = planConfig.identifiedLimitersRaw && planConfig.identifiedLimitersRaw.length > 0
        ? planConfig.identifiedLimitersRaw
        : undefined;

      // P3 diversité — mémoire inter-plans : fiches déjà servies à cet athlète
      // dans ses 3 derniers plans (pondérées par récence).
      const historicalUsage = options.historicalUsage ?? new Map<string, number>();
      // P4 diversité — départage des égalités de score (retour coach : "avec
      // le catalogue étoffé qu'on a, ce serait dommage que les plans soient
      // réduits à quelques séances type"). Un seed par génération (pas par
      // chunk) : les égalités varient d'une régénération à l'autre, mais
      // restent cohérentes entre les chunks d'UNE MÊME génération. Cf.
      // `rotationSeed` dans buildWorkoutCatalog (workoutCatalogBuilder.ts).
      const rotationSeed = options.rotationSeed ?? 0;

      // Segments de cycles multi-objectifs — même calcul que celui utilisé
      // plus bas pour le quota hebdomadaire (`cycleSegmentsForRegen`, PR
      // #272), dupliqué ici sous un autre nom pour éviter une redéclaration
      // dans le même scope : nécessaire ici en amont pour la construction de
      // chunkCatalogs, avant que ce second calcul n'existe dans la fonction.
      const cycleSegmentsForCatalog = computeObjectiveCycleSegments(
        planConfig?.raceGoals,
        planConfig?.planStartDate,
        effTotalWeeks,
      );
      const isRegenGapWeek = (localWeek: number): boolean => {
        const globalWeekNum = localWeek + weekOffset;
        return !!cycleSegmentsForCatalog
          && !cycleSegmentsForCatalog.some((seg) => globalWeekNum >= seg.startWeek && globalWeekNum <= seg.endWeek);
      };
      // Bug réel (audit "génération de plan IA", plan Emanuela, S22-23 —
      // "j'ai l'impression que le plan rattrape la natation absente en
      // première partie dans la deuxième partie") : sur une génération
      // fraîche multi-objectifs, `generatePlanWindowed`/
      // `computeObjectiveAwareWindows` (lignes ~104-148) découpe le plan en
      // FENÊTRES séparées, une par cycle + une par intervalle de
      // régénération inter-cycles — jamais mélangées. Pour la fenêtre de
      // régénération (S22-23), `buildWindowRegenConfig` (planWindowRegen.ts)
      // ne fournit pas de `cycle`, donc `catalogObjective` retombe sur
      // `planConfig.objective` (l'objectif FINAL, "Ironman" ici) : ouvrir le
      // filtre sport complet triathlon pour "reconnecter" natation/vélo
      // avant le cycle Ironman est cohérent avec l'intention du bloc, MAIS
      // cette fenêtre entière (`totalWeeks` local = 2) ne déclenche jamais
      // `needsChunking` (seuil 6-8 pour un objectif triathlon) — le
      // catalogue restreint additionnel de la PR précédente (phaseOverride
      // + strictPhaseFilter, gated par `if (needsChunking)` plus bas) ne se
      // construit donc JAMAIS pour ce cas réel, et `phaseCatalogs` (utilisé
      // à la place) reste calculé sur la position calendaire GLOBALE brute
      // (S22-23 sur 39 semaines ≈ 56-59% → "build"/"peak") : catalogue plein
      // volume (CSS pyramide Z4, seuil FTP 2x20 à 95-100%, drafting, brique
      // "Obligatoire" 120-180min) au lieu d'une vraie récupération. Comme
      // TOUTES les semaines locales d'une fenêtre de régénération pure sont
      // par construction des semaines de régénération (aucun mélange
      // possible avec de vraies semaines de charge dans la même fenêtre —
      // `computeObjectiveAwareWindows` ne les mélange jamais), on force ici
      // le catalogue ENTIER de cette fenêtre (phaseCatalogs ET chunkCatalogs
      // ci-dessous) en phase "base" stricte, plutôt que de dépendre du
      // mécanisme "bloc additionnel" pensé pour un chunk mixte qui ne se
      // produit pas dans cette architecture.
      const isPureRegenGapWindow = totalWeeks > 0
        && Array.from({ length: totalWeeks }, (_, i) => i + 1).every(isRegenGapWeek);
      // Bug réel (audit "génération de plan IA", plan Emanuela S22-23, 3ᵉ
      // vérification post-PR #274) : `phaseOverride:["base"]` filtre par
      // PHASE, pas par CHARGE — `C_STR_MAX_LOWER_HEAVY` (squat 4×4 @85-90%
      // 1RM) et `SEILER_BIKE_Z1_LONG` (jusqu'à 210min) sont légitimement
      // taguées `phase:["base",...]` (piliers authentiques de la phase base
      // en périodisation classique), donc le filtre par phase seul les
      // garde à raison — mais une semaine de régénération inter-cycles a
      // besoin d'un vrai déload, un axe orthogonal à la phase. Ajout de
      // `regenGapLoadFilter` (workoutCatalogBuilder.ts) pour filtrer aussi
      // par charge (tags force max, zones Z4+, plafond de durée).
      const regenGapPhaseOptions = isPureRegenGapWindow
        ? { phaseOverride: ["base"] as PhaseTag[], strictPhaseFilter: true, regenGapLoadFilter: true }
        : {};
      // P1 (audit "B-5K-BEGINNER round 2", consigne coach) : signal de niveau
      // réel transmis au catalogue — jamais dérivé d'`ambition` (cf. JSDoc
      // `beginnerIntensitySignal`, workoutCatalogBuilder.ts).
      const beginnerIntensitySignal = planConfig.ambitionMeta
        ? {
            trainingLevel: planConfig.ambitionMeta.trainingLevel,
            trainingLevelSource: planConfig.ambitionMeta.trainingLevelSource,
            weeklyHours: planConfig.weeklyHours ?? null,
          }
        : null;

      for (let i = 0; i < phaseRanges.length; i++) {
        const pr = phaseRanges[i];
        const catalog = buildWorkoutCatalog(
          catalogObjective,
          pr.start,
          pr.end,
          effTotalWeeks,
          { ...phaseOptions(pr.start, pr.end), strictPhaseFilter: true, maxItems: 80, chunkIndex: i, rotationIds: usedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions, sportFilter: catalogSportFilter, excludeIdPatterns, excludeTags, historicalUsage, rotationSeed, injuryRisk: toInjuryRiskCatalogOption(planConfig.injuryRisk), maintenanceSports, beginnerIntensitySignal, v3CoachPilot: options.v3CoachPilot, ...regenGapPhaseOptions }
        );
        phaseCatalogs[pr.phase] = serializeCatalogForPrompt(catalog);
        phaseRepairCatalogs[pr.phase] = catalog.map(entry => entry.repairMetadata);
        // ─── SONDE DIAGNOSTIC TRAIL (à retirer après analyse) ───
        {
          const trailEntries = catalog.filter((e) => isTrailCatalogId(e.id));
          console.log(
            `[trail_probe_phase] phase=${pr.phase} entries=${catalog.length} ` +
            `trail_entries=${trailEntries.length > 0 ? trailEntries.map((e) => e.id).join(",") : "NONE"}`,
          );
        }
        catalog.forEach(e => { allCatalogEntries.push(e); usedIds.add(e.id); });
      }

      // ─── OPTIMIZATION #1: Per-chunk filtered catalogs (40-50 ultra-relevant sessions) ───
      // Pre-compute one focused catalog per chunk using its EXACT week range.
      // The edge function will prefer these over phaseCatalogs when chunking.
      // This reduces cognitive noise: AI sees only sessions relevant to *this* block.
      const chunkCatalogs: string[] = [];
      const chunkRepairCatalogs: Array<Array<ReturnType<typeof buildWorkoutCatalog>[number]["repairMetadata"]>> = [];
      // Bug réel (audit "génération de plan IA", plan Emanuela, "Bloc 4 ·
      // Régénération post-pic" S22-23) : ce catalogue par chunk ne connaît
      // QUE la position calendaire brute (cStart/cEnd/totalWeeks, via
      // `phasesForWeekRange` dans buildWorkoutCatalog) — aucune awareness des
      // segments de cycles multi-objectifs. Pour un chunk de 5 semaines dont
      // le milieu calendaire tombe à ~55-65% du plan (typique d'un creux de
      // régénération inter-cycles entre un Marathon intermédiaire et
      // l'Ironman final), la phase calculée est ["build","peak"] — les DEUX
      // tags les plus intenses — et boost donc exactement les fiches FTP
      // threshold/MLSS/squat-deadlift lourd/VO2max/brick long que le prompt
      // demande par ailleurs d'éviter. Le fix PR #272 (weeklyQuotas
      // `isPostPeakRegenWeek`) réduit le nombre de séances de ces semaines,
      // mais ne change rien au contenu proposé pour les remplir — d'où la
      // persistance du bug malgré ce fix.
      //
      // Fix : en plus du catalogue normal du chunk (inchangé, toujours
      // utilisé par les semaines de charge normales du même chunk), on
      // construit un second catalogue RESTREINT (phaseOverride=["base"],
      // donc hard-exclusion Stage 6 des fiches build/peak-only) pour les
      // semaines de régénération inter-cycles couvertes par ce chunk. Les
      // deux sont envoyés à l'edge function, qui les distingue clairement
      // dans le prompt (cf. jsonPlanHandler.ts) au lieu de se substituer l'un
      // à l'autre.
      const chunkRegenCatalogs: string[] = [];
      const chunkRegenRepairCatalogs: Array<Array<ReturnType<typeof buildWorkoutCatalog>[number]["repairMetadata"]>> = [];
      const chunkRegenWeeks: number[][] = [];
      if (needsChunking) {
        const chunkUsedIds = new Set<string>();
        for (let ci = 0; ci < totalChunks; ci++) {
          const cStart = ci * CHUNK_SIZE + 1;
          const cEnd = Math.min(cStart + CHUNK_SIZE - 1, totalWeeks);
          // Cap relevé à 130 (v2 coverage-first) : garantit un socle par
          // (sport × famille d'intention) avant tri par score. Marge large
          // sous la limite de contexte edge (~33k chars ≪ 64k tokens).
          const chunkCatalog = buildWorkoutCatalog(
            catalogObjective,
            cStart,
            cEnd,
            totalWeeks,
            { ...phaseOptions(cStart + weekOffset, cEnd + weekOffset), strictPhaseFilter: true, maxItems: 130, chunkIndex: ci, rotationIds: chunkUsedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions, sportFilter: catalogSportFilter, excludeIdPatterns, excludeTags, historicalUsage, rotationSeed, injuryRisk: toInjuryRiskCatalogOption(planConfig.injuryRisk), maintenanceSports, beginnerIntensitySignal, v3CoachPilot: options.v3CoachPilot, ...regenGapPhaseOptions }
          );
          chunkCatalogs.push(serializeCatalogForPrompt(chunkCatalog));
          chunkRepairCatalogs.push(chunkCatalog.map(entry => entry.repairMetadata));
          // ─── SONDE DIAGNOSTIC TRAIL (à retirer après analyse) ───
          {
            const trailEntries = chunkCatalog.filter((e) => isTrailCatalogId(e.id));
            console.log(
              `[trail_probe_client] chunk=${ci} entries=${chunkCatalog.length} ` +
              `trail_entries=${trailEntries.length > 0 ? trailEntries.map((e) => e.id).join(",") : "NONE"} ` +
              `sportFilter=[${(catalogSportFilter ?? []).join(",")}] catalogObjective=${catalogObjective}`,
            );
          }

          const regenWeeksInChunk: number[] = [];
          for (let w = cStart; w <= cEnd; w++) if (isRegenGapWeek(w)) regenWeeksInChunk.push(w);
          if (regenWeeksInChunk.length > 0) {
            const regenCatalog = buildWorkoutCatalog(
              catalogObjective,
              cStart,
              cEnd,
              totalWeeks,
              { maxItems: 60, chunkIndex: ci, rotationIds: chunkUsedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions, sportFilter: catalogSportFilter, excludeIdPatterns, excludeTags, historicalUsage, rotationSeed, injuryRisk: toInjuryRiskCatalogOption(planConfig.injuryRisk), maintenanceSports, beginnerIntensitySignal, v3CoachPilot: options.v3CoachPilot, phaseOverride: ["base"], strictPhaseFilter: true }
            );
            chunkRegenCatalogs.push(serializeCatalogForPrompt(regenCatalog));
            chunkRegenRepairCatalogs.push(regenCatalog.map(entry => entry.repairMetadata));
            console.log(
              `[regen_gap_catalog] chunk=${ci} weeks=[${regenWeeksInChunk.join(",")}] entries=${regenCatalog.length}`,
            );
          } else {
            chunkRegenCatalogs.push("");
            chunkRegenRepairCatalogs.push([]);
          }
          chunkRegenWeeks.push(regenWeeksInChunk);

          // Rotation inter-chunk (P1 diversité) : on exclut désormais ~70 % des IDs
          // du chunk précédent (au lieu de 50 %), séances structurelles INCLUSES.
          // Le bypass structurel n'est plus appliqué ici : buildWorkoutCatalog
          // réinjecte lui-même une fiche longue si — et seulement si — la rotation
          // laisserait sa famille (sport × intention) sans alternative.
          const ROTATION_SHARE = 0.7;
          const rotatedIds = chunkCatalog
            .slice(0, Math.floor(chunkCatalog.length * ROTATION_SHARE))
            .map(e => e.id);
          rotatedIds.forEach(id => chunkUsedIds.add(id));
        }
      }

      // Derive duration stats from the actual library — sent to edge function
      const catalogDurationStats = computeCatalogDurationStats(allCatalogEntries);

      // Phase 0 QA — expose l'union des catalogId RÉELLEMENT PRÉSENTÉS au modèle.
      // Source de vérité = tous les dumps sérialisés envoyés au edge (phase-catalogs
      // ET chunk-catalogs). Ne PAS partir de `allCatalogEntries` : il est amputé par
      // l'exclusion cumulative `usedIds` entre phases. La soft-rotation entre chunks
      // amputerait de même. En parsant les strings effectivement envoyées, l'union
      // reflète ce que le modèle a vu — un ID retiré par rotation reste visible via
      // le chunk d'origine, donc NE compte PAS comme "hors catalogue".
      {
        const union = new Set<string>();
        const parseDumpIds = (dump: string) => extractCatalogIdsFromDump(dump).forEach(id => union.add(id));
        for (const dump of Object.values(phaseCatalogs)) parseDumpIds(dump);
        for (const dump of chunkCatalogs) parseDumpIds(dump);
        // Filet de sécurité : inclure aussi les IDs de allCatalogEntries au cas où
        // la sérialisation aurait un edge-case (ex : catalogue vide court-circuité).
        allCatalogEntries.forEach(e => union.add(e.id));
        allowedCatalogIds = [...union];
        console.log(
          `[b5_union_source] phase_catalogs=${Object.keys(phaseCatalogs).length} chunk_catalogs=${chunkCatalogs.length} union_size=${union.size}`,
        );
      }



      // ─── PHASE 2A : quotas hebdomadaires déterministes ──────────────────
      // Calculés côté client, injectés dans le userPrompt (via planConfig),
      // et validés post-merge. Le LLM n'a plus la main sur "combien".
      const weeklyQuotas: Record<number, WeekQuotaEntry> = {};
      const quotasByChunkText: string[] = [];
      const hoursAvail = typeof planConfig.weeklyHours === "number" ? planConfig.weeklyHours : 0;
      const ambitionForQuota = typeof planConfig.ambition === "string" ? planConfig.ambition : "age_group";
      // Bug réel (audit "génération de plan IA", plan Emanuela) : ce quota
      // hebdomadaire DÉTERMINISTE ("Le LLM n'a plus la main sur 'combien'",
      // cf. commentaire ci-dessus) utilisait TOUJOURS `planConfig.objective`
      // (l'objectif FINAL, ex. "Ironman") — même pour une fenêtre du cycle
      // intermédiaire Marathon, où `catalogObjective` restreint déjà
      // correctement le catalogue et le verrou sport côté serveur (PR #263 et
      // suivantes) à course/renfo. Résultat : le quota imposait quand même
      // "natation exactement 3, vélo exactement 3" dès S1 — recréant, via un
      // mécanisme totalement distinct (calcul client, jamais touché par
      // l'audit des prompts serveur), exactement la même contradiction
      // "0 fiche disponible vs quota obligatoire" déjà corrigée ailleurs.
      // Réutilise `catalogObjective` (déjà résolu plus haut dans cette
      // fonction) au lieu de relire `planConfig.objective` directement.
      const objectiveForQuota = catalogObjective || "";
      // Cible séances/semaine saisie (formulaire coach OU démarrage guidé) :
      // elle PRIME sur la matrice ambition×objectif, sinon le squelette imposé
      // au modèle ignorait la demande utilisateur.
      const targetSpw = typeof planConfig.sessionsPerWeek === "number" && planConfig.sessionsPerWeek > 0
        ? planConfig.sessionsPerWeek : null;
      // Disciplines interdites (champ libre "Contraintes") : le quota de la
      // discipline bannie est libéré et RÉAFFECTÉ aux sports autorisés.
      const rulesForQuota = parseAthleteConstraints(
        planConfig?.constraints ?? null,
      );
      const bannedSportsForQuota = rulesForQuota.bannedSports;
      // Format LCW 3 jours : brick banni du quota (cf. computeWeeklySessionQuota)
      // et étape décisive (run) servie en premier dans le layout de la semaine
      // de course. Calculé une fois hors boucle, identique pour tout le plan.
      const isLCWFormat = Array.isArray(planConfig?.raceGoals)
        && planConfig.raceGoals.some((g) => g?.raceFormat === "lcw_3day");
      // Bug réel (audit "génération de plan IA", plan Emanuela) : "Bloc 4 ·
      // Régénération post-pic" (S22-23, les 2 semaines de régénération inter-
      // cycles insérées par `computeObjectiveCycleSegments`/`buildPhaseBoundsSegmentLines`
      // entre le cycle Marathon et le cycle Ironman) affichait une semaine de
      // charge COMPLÈTE (natation CSS, vélo ramp jusqu'à 105% FTP, brique
      // longue, squat/deadlift lourds 4×5 @80-85% 1RM) — alors que le prompt
      // dit explicitement "vraie récupération (-40% volume, pas d'intensité)"
      // pour ces semaines. Cause : `inferWeekType` calcule `load`/`recovery`/
      // `taper`/`race` UNIQUEMENT depuis la position globale (numéro de
      // semaine % cadence de décharge, distance à la fin du plan) — il ignore
      // totalement les segments de cycles multi-objectifs, donc une semaine
      // de régénération inter-cycles (qui ne tombe dans AUCUN segment) reçoit
      // le même quota "load" qu'une semaine normale de développement.
      // Fix : toute semaine hors des segments de cycles connus (le "trou"
      // volontaire de `OBJECTIVE_CYCLE_REGEN_WEEKS_BETWEEN_PEAKS` semaines
      // entre deux pics complets) force `weekType="recovery"`, cohérent avec
      // le texte du prompt pour ces mêmes semaines.
      const cycleSegmentsForRegen = computeObjectiveCycleSegments(
        planConfig?.raceGoals,
        planConfig?.planStartDate,
        effTotalWeeks,
      );
      // Correction ciblée "P0 progression individualisée des charges"
      // (2026-10-24) : le plancher SL (slLongRideMin/slLongRunMin) exigeait
      // jusqu'ici la même durée dès S1 que n'importe quelle semaine de
      // build, quel que soit le niveau déclaré de l'athlète. Réutilise
      // EXCLUSIVEMENT les deux ancres déjà individualisées par
      // `planConfig.volumeRamp` (niveau déclaré, réconcilié avec la charge
      // réellement mesurée quand disponible — jamais fabriquées ici).
      // Absent (niveau non déclaré) → comportement inchangé (voir
      // applySlFloorIndividualization).
      const slRampAnchors: SlFloorRampAnchors | null = planConfig.volumeRamp
        ? {
          week1PctTarget: planConfig.volumeRamp.week1PctTarget,
          rampWeeks: planConfig.volumeRamp.rampWeeks,
          weeklyIncreasePctMax: planConfig.volumeRamp.weeklyIncreasePctMax,
        }
        : null;
      const injuryRiskForSlFloor = planConfig.injuryRisk
        ? { bike: planConfig.injuryRisk.bike?.level, run: planConfig.injuryRisk.run?.level }
        : null;
      const slFloorIndividualizationLog: string[] = [];
      for (let w = 1; w <= totalWeeks; w++) {
        // Position globale : quota/taper/recovery calculés sur la vraie place
        // de la semaine dans le plan (cf. PlanConfig.globalTotalWeeks).
        const globalWeekNum = w + weekOffset;
        const isPostPeakRegenWeek = !!cycleSegmentsForRegen
          && !cycleSegmentsForRegen.some((seg) => globalWeekNum >= seg.startWeek && globalWeekNum <= seg.endWeek);
        const weekType = isPostPeakRegenWeek
          ? "recovery"
          : inferWeekType(globalWeekNum, effTotalWeeks, objectiveForQuota, athleteData.age, planConfig.deloadCadenceWeeks);
        const entry = computeWeekQuotaEntry(objectiveForQuota, ambitionForQuota, hoursAvail, weekType, isLCWFormat, {
          sessionsPerWeek: targetSpw,
          maxSessionsPerDay: planConfig.maxSessionsPerDay,
          bannedSports: bannedSportsForQuota,
        });
        if (entry) {
          const individualized = applySlFloorIndividualization(
            entry.floors, globalWeekNum, weekType, slRampAnchors, injuryRiskForSlFloor,
          );
          if (individualized.reasons.length > 0) {
            slFloorIndividualizationLog.push(`S${w} (globale S${globalWeekNum}): planchers individualisés`);
          }
          const phase = phaseCalendar?.[w];
          const weekCatalog = chunkRepairCatalogs[Math.floor((w - 1) / CHUNK_SIZE)] ?? phaseRepairCatalogs[phase ?? "base"] ?? [];
          const availableSports = new Set(catalogueForWeek(weekCatalog, { phase, objective: objectiveForQuota, weekType }).eligible
            .map(m => normalizeRepairSport(m.sport) as LayoutSport));
          const layout: WeeklySlotLayout = buildWeeklySlotLayout(entry.quota, individualized.floors, weekType, {
            availableSports,
            raceEvents: declaredRaceSlotsForWeek(planConfig,w),
            dayBans: rulesForQuota.dayBans,
            finalStageSport: isLCWFormat ? "run" : undefined,
          });

          weeklyQuotas[w] = { ...entry, phase, expectedPhase:planConfig.windowWeekPhases?.[w], floors: individualized.floors, layout,
            volumeBudget: buildCoachVolumeBudget(planConfig.volumeRamp, globalWeekNum, weekType, planConfig.weeklyHoursSource),
            floorAudit: snapshotSLFloorAudit({ localWeek: w, globalWeek: globalWeekNum,
              rampConfigured: !!slRampAnchors,
              nominal: entry.floors, individualized: individualized.floors,
               }),
          };
          traceSLFloorConsumer("generation", w, weeklyQuotas[w]);
        }
      }
      if (slFloorIndividualizationLog.length > 0) {
        console.log(`[sl_floor_individualization] plancher sortie longue individualisé sur ${slFloorIndividualizationLog.length} semaine(s) :\n${slFloorIndividualizationLog.join("\n")}`);
      }


      // Bloc texte par chunk (uniquement les semaines du chunk concerné).
      const chunksForQuota: Array<{ start: number; end: number }> = [];
      if (needsChunking) {
        for (let ci = 0; ci < totalChunks; ci++) {
          const s = ci * CHUNK_SIZE + 1;
          chunksForQuota.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
        }
      } else {
        chunksForQuota.push({ start: 1, end: totalWeeks });
      }
      for (const c of chunksForQuota) {
        const scope: number[] = [];
        for (let w = c.start; w <= c.end; w++) if (weeklyQuotas[w]) scope.push(w);
        if (scope.length === 0) { quotasByChunkText.push(""); continue; }
        const quotaBlock = buildQuotaPromptBlock(scope, weeklyQuotas);
        const layoutMap: Record<number, WeeklySlotLayout> = {};
        for (const w of scope) if (weeklyQuotas[w].layout) layoutMap[w] = weeklyQuotas[w].layout!;
        const layoutBlock = Object.keys(layoutMap).length > 0
          ? buildLayoutPromptBlock(scope, layoutMap)
          : "";
        quotasByChunkText.push(layoutBlock ? `${quotaBlock}\n\n${layoutBlock}` : quotaBlock);
      }


 return {beginnerIntensitySignal,dayBans:rulesForQuota.dayBans,phaseCalendar,phaseCatalogs,phaseRepairCatalogs,chunkCatalogs,chunkRepairCatalogs,chunkRegenCatalogs,chunkRegenRepairCatalogs,chunkRegenWeeks,catalogDurationStats,weeklyQuotas,quotasByChunkText,allowedCatalogIds,historicalUsage,chunksForQuota,catalogObjective};
}
