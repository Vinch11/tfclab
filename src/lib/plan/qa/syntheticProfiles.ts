/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — Profils synthétiques FIXES pour la QA de la génération JSON.
 * ═══════════════════════════════════════════════════════════════════════════════
 * NE PAS MODIFIER sans mise à jour explicite des attendus de checks B4/B5/B7.
 *
 * Extension "Definition of Done" (2026-10-02) — les 3 profils d'origine ne
 * couvraient que 3 des 13 objectifs exposés dans l'UI (IM/Marathon/10K/5K/
 * Olympic/StartToRun/Trail* n'avaient jamais tourné de vraie génération QA)
 * ni les paliers d'ambition `elite`/`world_class`. Chaque nouveau profil
 * ajouté ici DOIT aussi être câblé dans `checks.ts::checkB4For` (switch
 * exhaustif, échec de compilation sinon via `assertNeverProfileId`) — c'est
 * le même garde-fou que `COVERAGE_GUARD` dans
 * `objectiveCoverage.definitionOfDone.test.ts`, appliqué ici à la QA E2E.
 *
 * Les 12 profils couvrent les 13 objectifs (703/IM/Sprint/Olympic partagent
 * la même famille de check B4 "multi-sport") et les 5 paliers d'ambition :
 *   - B-70.3           : Ironman 70.3, 12 sem, age_group
 *   - B-SEMI           : semi-marathon, 8 sem, competitor
 *   - B-SPRINT         : triathlon sprint, 6 sem, finisher
 *   - B-IM             : Ironman, 16 sem, elite
 *   - B-MARATHON       : marathon, 16 sem, world_class
 *   - B-10K            : 10 km, 10 sem, competitor
 *   - B-5K             : 5 km, 6 sem, age_group
 *   - B-OLYMPIC        : triathlon olympique, 10 sem, finisher
 *   - B-STARTTORUN     : débutant marche-course, 8 sem, finisher
 *   - B-TRAIL-SHORT    : trail court, 8 sem, competitor
 *   - B-TRAIL-MOUNTAIN : trail montagne, 14 sem, elite
 *   - B-TRAIL-ULTRA    : trail ultra, 20 sem, world_class
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import { QA_PROFILES_V2, type V2ProfileId } from "./syntheticProfilesV2";

export type QAProfileId =
  | "B-70.3" | "B-SEMI" | "B-SPRINT"
  | "B-IM" | "B-MARATHON" | "B-10K" | "B-5K" | "B-OLYMPIC" | "B-STARTTORUN"
  | "B-TRAIL-SHORT" | "B-TRAIL-MOUNTAIN" | "B-TRAIL-ULTRA"
  // Pilot Cockpit Mode B (consigne coach 2026-10-13) — distinct de
  // "B-STARTTORUN" ci-dessus : le vrai Start-to-Run de production est un
  // template STATIQUE 12 semaines sans IA (cf. startToRunTemplate.ts,
  // branché depuis AITrainingPlanPage.tsx) — jamais généré par le moteur
  // IA en conditions réelles. "B-STARTTORUN" reste utile comme filet de
  // régression générique (checkB4For/Definition-of-Done), mais n'a plus
  // sa place dans le Pilot Cockpit, dont le but est de valider le moteur
  // IA INDIVIDUALISÉ. "B-5K-BEGINNER" couvre le cas réel qui, lui,
  // sollicite bien l'IA : un débutant qui vient de terminer le cycle S2R
  // (30min de course continue acquis) et prépare son 1er 5km sur 12 sem.
  | "B-5K-BEGINNER"
  // Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER TEST
  // CONTRÔLÉ (consigne coach explicite) : profil RÉEL d'un athlète coaché
  // (pas un cas générique QA), triathlète confirmé préparant un 10 km
  // intermédiaire (priorité B, jalon de contrôle) puis un Ironman 70.3 à
  // Tours (priorité A, meilleure performance visée). Sert à vérifier en
  // conditions réelles les Corrections B à F (multi-objectif daté, charge
  // hebdo, cohérence d'ambition, historique de charge déclaratif 8h→17h,
  // plafond journées doubles) sur UN scénario sportif complet, sans compte
  // athlète Supabase. Famille de check B4 "multi-sport" (objectif final
  // 70.3) — voir checks.ts::checkB4For.
  | "B-10K-TO-70.3"
  | V2ProfileId;

/**
 * Priorité 2 (Performance Validation Lab V1) — 5 dimensions INDÉPENDANTES
 * (coach, lot "batterie de 20 scénarios") :
 *   1. Discipline/objectif        → `planConfig.objective`
 *   2. Niveau/ambition            → `planConfig.ambition`
 *   3. Physiologie (archétype)    → `physiologyArchetype`
 *   4. Qualité des données        → `dataQuality`
 *   5. Contraintes/disponibilité  → `constraintsProfile`
 * (1) et (2) réutilisaient déjà les champs existants de `QAProfile` — seules
 * (3), (4), (5) sont nouvelles. Indépendantes = aucune des 20 n'associe
 * systématiquement un niveau d'une dimension à un niveau fixe d'une autre
 * (cf. `syntheticProfilesV2.ts` pour la matrice de répartition).
 */
export type PhysiologyArchetype =
  | "aerobic_dominant"      // VO2max haut, VLamax basse
  | "glycolytic_dominant"   // VLamax haute, VO2max modéré
  | "balanced_typical"      // valeurs médianes (proche de l'ancien profil unique)
  | "atypical_extreme"      // VO2max ET VLamax hauts simultanément (teste decorrelationGuard)
  | "master_40plus";        // âge élevé, cycle décharge 2:1 attendu

export type DataQualityLevel =
  | "complete_measured"   // labo : VLamax/VO2max/FTP/économie mesurés
  | "estimated_only"       // tout dérivé de VMA/allure/sprint (tier estimation)
  | "incomplete"           // plusieurs champs physio absents (null)
  | "minimal";             // quasi aucune donnée (cas StartToRun typique)

export type ConstraintsProfile =
  | "unrestricted"         // aucune contrainte, disponibilité large
  | "heavily_constrained"  // sport(s) banni(s), jour(s) interdit(s), dispo faible
  | "limited_terrain"      // urbain, pas de dénivelé/piscine
  | "recent_injury";       // blessure récente signalée en texte libre

export interface QAProfile {
  id: QAProfileId;
  label: string;
  expectedWeeks: number;
  expectedChunks: number;
  athleteData: PlanAthleteData;
  planConfig: PlanConfig;
  /** Priorité 2 — absent pour les 12 profils B-* d'origine (physiologie
   *  unique `commonAthlete`, pas de dimension à étiqueter) ; renseigné pour
   *  tous les profils V2 (`syntheticProfilesV2.ts`). */
  physiologyArchetype?: PhysiologyArchetype;
  dataQuality?: DataQualityLevel;
  constraintsProfile?: ConstraintsProfile;
}

const commonAthlete: PlanAthleteData = {
  nom: "QA Synthetic",
  sex: "male",
  age: 35,
  ftp: 280,
  weightKg: 72,
  vlamax: 0.55,
  vlamaxRun: 0.50,
  vo2max: 58,
  vma: 18.0,
  css: 90,
  fcMax: 188,
  tte: 45,
  pmax5s: 950,
  p30s: 620,
  p60s: 480,
  map5min: 380,
  paceThresholdSecPerKm: 220,
  runMLSSEffectivePct: 0.86,
  runMLSSEffectiveSource: "predicted",
  runEconomyScore: 3,
};

export const QA_PROFILES: QAProfile[] = [
  {
    id: "B-70.3",
    label: "Ironman 70.3 · 12 sem · age_group",
    expectedWeeks: 12,
    expectedChunks: 3, // triVerbose → CHUNK_SIZE=5, 12/5 = 3
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "IRONMAN 70.3",
      raceName: "QA 70.3 Test",
      weeksAvailable: 12,
      weeklyHours: 10,
      sessionsPerWeek: 8,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "age_group",
      constraints: "Profil synthétique QA — pas d'accès trail/montagne.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-SEMI",
    label: "Semi-marathon · 8 sem · competitor",
    expectedWeeks: 8,
    expectedChunks: 2, // non-verbose → CHUNK_SIZE=4, threshold 6 → 8 sem chunké
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "SEMI-MARATHON",
      raceName: "QA Semi Test",
      weeksAvailable: 8,
      weeklyHours: 6,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-SPRINT",
    label: "Triathlon sprint · 6 sem · finisher",
    expectedWeeks: 6,
    expectedChunks: 1, // triVerbose threshold=6 → mono-bloc à 6 sem exact
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRIATHLON SPRINT",
      raceName: "QA Sprint Test",
      weeksAvailable: 6,
      weeklyHours: 7,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — sprint distance.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-IM",
    label: "Ironman · 16 sem · elite",
    expectedWeeks: 16,
    expectedChunks: 4, // triVerbose → CHUNK_SIZE=5, 16>threshold(6) → ceil(16/5)=4
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "IRONMAN",
      raceName: "QA IM Test",
      weeksAvailable: 16,
      weeklyHours: 14,
      sessionsPerWeek: 10,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "elite",
      constraints: "Profil synthétique QA — pas d'accès trail/montagne.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-MARATHON",
    label: "Marathon · 16 sem · world_class",
    expectedWeeks: 16,
    expectedChunks: 4, // non-verbose → CHUNK_SIZE=4, 16>threshold(6) → ceil(16/4)=4
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "MARATHON",
      raceName: "QA Marathon Test",
      weeksAvailable: 16,
      weeklyHours: 9,
      sessionsPerWeek: 7,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "world_class",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-10K",
    label: "10 km · 10 sem · competitor",
    expectedWeeks: 10,
    expectedChunks: 3, // non-verbose → CHUNK_SIZE=4, 10>threshold(6) → ceil(10/4)=3
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "10 KM",
      raceName: "QA 10K Test",
      weeksAvailable: 10,
      weeklyHours: 6,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-5K",
    label: "5 km · 6 sem · age_group",
    expectedWeeks: 6,
    expectedChunks: 1, // non-verbose → CHUNK_SIZE=4, threshold=6 → 6 n'excède pas 6 → mono-bloc
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "5 KM",
      raceName: "QA 5K Test",
      weeksAvailable: 6,
      weeklyHours: 5,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "age_group",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-OLYMPIC",
    label: "Triathlon olympique · 10 sem · finisher",
    expectedWeeks: 10,
    expectedChunks: 2, // triVerbose → CHUNK_SIZE=5, 10>threshold(6) → ceil(10/5)=2
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRIATHLON OLYMPIQUE",
      raceName: "QA Olympic Test",
      weeksAvailable: 10,
      weeklyHours: 8,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — distance olympique.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-STARTTORUN",
    label: "Débutant Start to Run · 8 sem · finisher",
    expectedWeeks: 8,
    expectedChunks: 2, // non-verbose → CHUNK_SIZE=4, 8>threshold(6) → ceil(8/4)=2
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "START TO RUN",
      raceName: "QA Start to Run Test",
      weeksAvailable: 8,
      weeklyHours: 3,
      sessionsPerWeek: 3,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — débutant absolu, marche-course.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-SHORT",
    label: "Trail court · 8 sem · competitor",
    expectedWeeks: 8,
    // isTrailVerbose nécessite ULTRA/MOUNTAIN/MONT/UTMB/CCC/OCC/LONG dans
    // l'objectif OU totalWeeks≥12 — "TRAIL COURT" à 8 sem ne matche aucun des
    // deux → non-verbose → CHUNK_SIZE=4, 8>threshold(6) → ceil(8/4)=2
    expectedChunks: 2,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL COURT 30KM",
      raceName: "QA Trail Court Test",
      weeksAvailable: 8,
      weeklyHours: 7,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — trail court, D+ modéré.",
      terrainAvailability: "vallonne",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-MOUNTAIN",
    label: "Trail montagne · 14 sem · elite",
    // isTrailVerbose matche "MONT" → CHUNK_SIZE=6, threshold=8 → 14>8 → ceil(14/6)=3
    expectedWeeks: 14,
    expectedChunks: 3,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL MONTAGNE 60KM",
      raceName: "QA Trail Montagne Test",
      weeksAvailable: 14,
      weeklyHours: 10,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "elite",
      constraints: "Profil synthétique QA — trail montagne, D+ élevé.",
      terrainAvailability: "montagne",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-ULTRA",
    label: "Trail ultra · 20 sem · world_class",
    // isTrailVerbose matche "ULTRA" → CHUNK_SIZE=6, threshold=8 → 20>8 → ceil(20/6)=4
    expectedWeeks: 20,
    expectedChunks: 4,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL ULTRA UTMB",
      raceName: "QA Trail Ultra Test",
      weeksAvailable: 20,
      weeklyHours: 13,
      sessionsPerWeek: 7,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "world_class",
      constraints: "Profil synthétique QA — ultra distance, D+ très élevé.",
      terrainAvailability: "montagne",
      recoveryStrategy: "passive",
    },
  },
  {
    // Pilot Cockpit Mode B (consigne coach 2026-10-13) — remplace
    // "B-STARTTORUN" dans le Pilot Cockpit, cf. docstring QAProfileId.
    // Athlète venant de graduer le cycle marche-course S2R (30min de
    // course continue acquis, template statique startToRunTemplate.ts,
    // NON modifié ni généré ici) et préparant son 1er objectif chronométré
    // — un 5km, 12 semaines. Physiologie délibérément DISTINCTE de
    // `commonAthlete` (qui représente un coureur déjà entraîné, VO2max 58,
    // VMA 18) : valeurs plausibles d'adulte débutant réel (VO2max/VMA
    // cohérents via Léger-Mercier VO2max≈3.5×VMA ; aucune mesure labo —
    // sprint/MAP/FTP/CSS non testés chez un pur débutant coureur).
    id: "B-5K-BEGINNER",
    label: "Débutant post-S2R · 1er 5km · 12 sem · finisher",
    expectedWeeks: 12,
    expectedChunks: 3, // non-verbose ("5 KM" ne matche ni tri ni trail) → CHUNK_SIZE=4, 12>threshold(6) → ceil(12/4)=3
    athleteData: {
      nom: "QA Synthetic Beginner",
      sex: "female",
      age: 42,
      ftp: null,
      weightKg: 68,
      vlamax: 0.55,
      vlamaxRun: 0.55,
      vo2max: 34,
      vma: 9.5,
      css: null,
      fcMax: 178,
      tte: null,
      pmax5s: null,
      p30s: null,
      p60s: null,
      map5min: null,
      paceThresholdSecPerKm: 474, // ≈7:54/km, dérivé de VMA×80% (pas 88% comme un coureur entraîné)
      runMLSSEffectivePct: 0.80,
      runMLSSEffectiveSource: "predicted", // aucun vrai test seuil — estimation Modèle C depuis VLamax run + économie
      runEconomyScore: 2, // économie de course sous la moyenne (technique encore en construction, cf. S2R)
    },
    planConfig: {
      objective: "5 KM",
      raceName: "QA Pilote Débutant 5K Test",
      weeksAvailable: 12,
      weeklyHours: 3,
      sessionsPerWeek: 3,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      // Audit "B-5K-BEGINNER round 2" : ce profil ne portait AUCUN signal de
      // niveau (ni même le fallback-prudent) — `ambitionMeta` absent fait que
      // le pipeline réel (planConfigBuilder.ts) n'en reçoit jamais pour ce
      // profil QA, contrairement au flux UI coach normal. Champ EXISTANT
      // (PlanConfig.ambitionMeta, cf. useAITrainingPlan.ts), jamais un nouveau
      // système : renseigné ici en cohérence avec la description du profil
      // (débutant post-S2R) et `source: "manual"` (jamais "fallback-prudent",
      // qui n'est explicitement pas une mesure fiable du niveau réel) — rend
      // ce profil testable par le contrôle d'accumulation de séances
      // exigeantes (validateDemandingSessionAccumulation, planValidator.ts).
      ambitionMeta: {
        saisie: "finisher",
        effective: "finisher",
        saisieLabel: "Découverte",
        effectiveLabel: "Découverte",
        downgraded: false,
        trainingLevel: "untrained",
        trainingLevelSource: "manual",
        diagnosticNote: null,
      },
      constraints: "Profil synthétique Pilot Cockpit — débutant ayant terminé le cycle marche-course (30min continu acquis), prépare son 1er 5km. Objectif distinct du template Start-to-Run statique (jamais généré par IA en production) : ce profil sollicite réellement le moteur de génération individualisée.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    // Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER
    // TEST CONTRÔLÉ (consigne coach explicite, sans compte athlète Supabase).
    // Caractéristiques CONFIRMÉES par le coach : âge, poids, VMA, FTP, CSS,
    // trainingLevel, ambition, historique de charge (8h chronique → 17h
    // récent sur 4 sem), dates/priorités des 2 objectifs, contraintes
    // d'agenda (dispo tous les jours, max 4 journées doubles/sem, max 2
    // séances/jour, 11 séances/sem).
    //
    // Champs physiologiques NON confirmés par le coach (fcMax, VLamax,
    // sprint/MAP, TTE, pace seuil, économie de course, TSS mesuré) sont
    // délibérément laissés `null` — jamais inventés — pour ne pas
    // contaminer ce test de données non déclarées. Seule exception :
    // `vo2max`, dérivé de la VMA confirmée via la conversion Léger-Mercier
    // déjà utilisée dans ce fichier pour "B-5K-BEGINNER" (VO2max≈3.5×VMA),
    // pas une valeur additionnelle inventée.
    id: "B-10K-TO-70.3",
    label: "10 km (B, jalon) → Ironman 70.3 Tours (A) · 32 sem · perf/elite",
    expectedWeeks: 32,
    expectedChunks: 7, // triVerbose ("70.3"→IRONMAN 70.3) → CHUNK_SIZE=5, ceil(32/5)=7
    athleteData: {
      nom: "QA Pilote 10K→70.3 Tours",
      sex: "male",
      age: 42,
      ftp: 300,
      weightKg: 90,
      vma: 17,
      css: 85,
      // Dérivé (Léger-Mercier ×3.5 depuis la VMA confirmée), PAS une mesure
      // confirmée par le coach — cf. commentaire ci-dessus.
      vo2max: 59.5,
      vlamax: null,
      vlamaxRun: null,
      fcMax: null,
      tte: null,
      pmax5s: null,
      p30s: null,
      p60s: null,
      map5min: null,
      paceThresholdSecPerKm: null,
      runMLSSEffectivePct: null,
      runMLSSEffectiveSource: null,
      runEconomyScore: null,
    },
    planConfig: {
      // Objectif PRIMAIRE (priorité A) = celui qui détermine la famille de
      // check B4 "multi-sport" (natation+vélo+course chaque semaine active)
      // et le dimensionnement des chunks — le 10K (priorité B) n'est qu'un
      // jalon intermédiaire sur la route du 70.3.
      objective: "IRONMAN 70.3",
      raceName: "QA Pilote 70.3 Tours",
      raceDate: "2027-06-06",
      // Convention confirmée dans AITrainingPlanPage.tsx (cf. `allGoalsWithObjective`/
      // `allRaceGoals`) : `raceGoals` transporte la liste COMPLÈTE, objectif
      // primaire (A) inclus en premier, puis les objectifs secondaires.
      raceGoals: [
        { objective: "IRONMAN 70.3", raceName: "QA Pilote 70.3 Tours", raceDate: "2027-06-06", priority: "A", raceFormat: "continuous" },
        { objective: "10 KM", raceName: "QA Pilote 10K intermédiaire", raceDate: "2026-12-19", priority: "B", targetTimeMinutes: 40 },
      ],
      planStartDate: "2026-10-26",
      weeksAvailable: 32,
      // Cible/disponibilité déclarée pour CE plan — reprend le volume
      // RÉCEMMENT tenu (17h/sem), pas une estimation distincte. C'est
      // précisément le cas que les Corrections C/E doivent savoir moduler
      // (ne jamais traiter 17h comme durablement assimilé).
      weeklyHours: 17,
      sessionsPerWeek: 11,
      maxSessionsPerDay: 2,
      maxDoubleDaysPerWeek: 4,
      ambition: "elite", // clé canonique de "perf" (cf. AMBITION_ALIASES, ambitionLevel.ts) — UI "Qualifiable"
      ambitionMeta: {
        saisie: "elite",
        effective: "elite", // trainingLevel "trained" → plafond "elite" (AMBITION_MAX_BY_LEVEL) : aucun déclassement
        saisieLabel: "Qualifiable",
        effectiveLabel: "Qualifiable",
        downgraded: false,
        trainingLevel: "trained",
        trainingLevelSource: "manual",
        diagnosticNote: null,
      },
      // Historique de charge DÉCLARATIF (Correction #E) — jamais transformé
      // en TSS fictif, ne modifie jamais volumeRamp/weeklyHours/volumeCible
      // (invariant vérifié par planConfigBuilder.loadHistoryInvariant.test.ts).
      loadHistory: {
        chronicWeeklyHours: 8,
        recentWeeklyHours: 17,
        recentWeeksCount: 4,
      },
      constraints: "Profil RÉEL coach (pas un cas générique QA) — triathlète confirmé préparant un 10 km intermédiaire (priorité B, jalon de contrôle, objectif ~40 min) puis un Ironman 70.3 à Tours (priorité A, meilleure performance visée). Disponible tous les jours de la semaine, aucune discipline ni jour interdit. Récupération subjective bonne sur les 4 dernières semaines à charge élevée. Répartition récente (17h/sem cumulées) : natation ≈3h, vélo ≈8h, course ≈6h — information contextuelle uniquement, aucun champ structuré de ce moteur ne consomme une répartition par sport de la charge récente à ce jour (limite résiduelle connue, non corrigée dans ce correctif ciblé).",
      terrainAvailability: "mixte",
      recoveryStrategy: "passive",
      // `deloadCadenceWeeks` volontairement NON renseigné (auto) : à 42 ans,
      // `inferWeekType` (sessionSizingMatrix.ts) applique automatiquement la
      // cadence 2:1 (tous les 3 semaines) plutôt que 3:1 — comportement par
      // défaut déjà vérifié et jugé physiologiquement justifié (doctrine
      // Tanaka/Seals), pas modifié ici. Le coach peut l'overrider via ce
      // champ (3 = 2:1, 4 = 3:1) s'il souhaite un choix différent.
    },
  },
  // Priorité 2 (Performance Validation Lab V1) — 20 scénarios à 5 dimensions
  // indépendantes + 3 scénarios ciblés (marathon flagship, cyclisme pur,
  // ultra longue distance) — cf. syntheticProfilesV2.ts pour la matrice
  // complète et le détail de chaque dimension.
  ...QA_PROFILES_V2,
];
