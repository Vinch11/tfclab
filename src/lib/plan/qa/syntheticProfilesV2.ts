/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Priorité 2 (Performance Validation Lab V1) — Batterie de 20 scénarios à
 * 5 dimensions INDÉPENDANTES + 3 scénarios ciblés (marathon flagship,
 * cyclisme pur, ultra longue distance).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Les 12 profils `B-*` d'origine (`syntheticProfiles.ts`) partagent TOUS la
 * même physiologie (`commonAthlete`) — seuls l'objectif et l'ambition
 * varient. Ce fichier ajoute deux dimensions supplémentaires réellement
 * indépendantes : la physiologie (archétype de VALEURS) et la qualité des
 * données (complétude/fiabilité), plus les contraintes/disponibilité.
 *
 * MATRICE D'INDÉPENDANCE (20 scénarios V2-01..V2-20) — type carré latin :
 * chaque archétype physiologique (5) apparaît exactement 4× ; chaque niveau
 * de qualité de données (4) apparaît exactement 5× ; chaque profil de
 * contrainte (4) apparaît exactement 5× ; chaque palier d'ambition (5)
 * apparaît exactement 4× — AUCUNE paire de dimensions n'est figée ensemble
 * (ex. "world_class" apparaît avec 4 archétypes physio différents, pas
 * toujours le même).
 *
 * | #  | Discipline      | Ambition     | Physiologie          | Données      | Contraintes          |
 * |----|-----------------|--------------|----------------------|--------------|----------------------|
 * | 01 | 10K             | finisher     | aerobic_dominant     | complete     | unrestricted         |
 * | 02 | Marathon        | age_group    | glycolytic_dominant  | estimated    | heavily_constrained  |
 * | 03 | Trail Montagne  | competitor   | balanced_typical     | incomplete   | limited_terrain      |
 * | 04 | 70.3            | elite        | atypical_extreme     | minimal      | recent_injury        |
 * | 05 | Sprint Tri      | world_class  | master_40plus        | complete     | unrestricted         |
 * | 06 | Start to Run    | finisher     | aerobic_dominant     | estimated    | heavily_constrained  |
 * | 07 | 5K              | age_group    | glycolytic_dominant  | incomplete   | limited_terrain      |
 * | 08 | Semi            | competitor   | balanced_typical     | minimal      | recent_injury        |
 * | 09 | Trail Ultra     | elite        | atypical_extreme     | complete     | unrestricted         |
 * | 10 | Ironman         | world_class  | master_40plus        | estimated    | heavily_constrained  |
 * | 11 | 10K             | age_group    | aerobic_dominant     | incomplete   | limited_terrain      |
 * | 12 | Marathon        | competitor   | glycolytic_dominant  | minimal      | recent_injury        |
 * | 13 | Trail Montagne  | elite        | balanced_typical     | complete     | unrestricted         |
 * | 14 | 70.3            | world_class  | atypical_extreme     | estimated    | heavily_constrained  |
 * | 15 | Sprint Tri      | finisher     | master_40plus        | incomplete   | limited_terrain      |
 * | 16 | Start to Run    | age_group    | aerobic_dominant     | minimal      | recent_injury        |
 * | 17 | Olympique Tri   | competitor   | glycolytic_dominant  | complete     | unrestricted         |
 * | 18 | Trail Court     | elite        | balanced_typical     | estimated    | heavily_constrained  |
 * | 19 | 5K              | world_class  | atypical_extreme     | incomplete   | limited_terrain      |
 * | 20 | Semi            | finisher     | master_40plus        | minimal      | recent_injury        |
 *
 * SCÉNARIOS CIBLÉS (hors matrice, gaps identifiés explicitement par le coach) :
 * | EXTRA-MARATHON | Marathon | world_class | aerobic_dominant | complete | unrestricted — "meilleur cas" marathon, aucune des 2 occurrences ci-dessus (02/12) n'était à la fois haute ambition ET données complètes |
 * | EXTRA-CYCLING  | "Cyclosportive longue distance" (FTP/Gran Fondo) | competitor | glycolytic_dominant | complete | unrestricted — PROBE DE GAP CONNU : `normalizeObjectiveKey` (src/lib/normalizeObjectiveKey.ts) n'a AUCUNE branche reconnaissant un objectif cyclisme pur ("velo"/"cyclisme"/"ftp"/"gran fondo") ; ce scénario est attendu échouer ou dégrader silencieusement AVANT même de tester la qualité du plan — c'est le résultat recherché, pas un bug du scénario |
 * | EXTRA-ULTRA    | "UTMB 170km" (ultra format extrême, 28 sem) | elite | balanced_typical | incomplete | heavily_constrained — le seul TrailUltra de la matrice (09) est à 20 sem ; ce scénario stresse un format encore plus long et davantage de semaines de régénération/fenêtrage |
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { QAProfile, PhysiologyArchetype, DataQualityLevel, ConstraintsProfile } from "./syntheticProfiles";

export type V2ProfileId =
  | `V2-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10"
      | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20"}`
  | "V2-EXTRA-MARATHON" | "V2-EXTRA-CYCLING" | "V2-EXTRA-ULTRA";

// ── Dimension 3 : archétypes physiologiques (valeurs RAW, indépendantes de leur complétude) ──
const PHYSIOLOGY_BASE: Record<PhysiologyArchetype, Partial<PlanAthleteData>> = {
  aerobic_dominant: { age: 32, vo2max: 65, vlamax: 0.35, vlamaxRun: 0.32, vma: 19.5, fcMax: 190 },
  glycolytic_dominant: { age: 29, vo2max: 52, vlamax: 0.75, vlamaxRun: 0.68, vma: 16.5, fcMax: 192 },
  balanced_typical: { age: 35, vo2max: 58, vlamax: 0.55, vlamaxRun: 0.50, vma: 18.0, fcMax: 188 },
  atypical_extreme: { age: 27, vo2max: 68, vlamax: 0.80, vlamaxRun: 0.72, vma: 20.0, fcMax: 194 },
  master_40plus: { age: 48, vo2max: 50, vlamax: 0.50, vlamaxRun: 0.46, vma: 15.5, fcMax: 172 },
};

const PHYSIOLOGY_LABEL: Record<PhysiologyArchetype, string> = {
  aerobic_dominant: "aérobie dominant",
  glycolytic_dominant: "glycolytique dominant",
  balanced_typical: "équilibré",
  atypical_extreme: "atypique (VO2max+VLamax hauts)",
  master_40plus: "master 40+",
};

/** Complète un archétype physio avec les champs dérivés "mesure complète"
 *  (ftp, poids, css, tte, puissances courtes, allure seuil, économie) —
 *  valeurs plausibles pour cet archétype, pas génériques. */
function completeAthleteFor(archetype: PhysiologyArchetype): PlanAthleteData {
  const base = PHYSIOLOGY_BASE[archetype];
  const vo2 = base.vo2max ?? 58;
  const vma = base.vma ?? 18;
  // Allure seuil approx. 88% VMA (cohérent avec le reste du moteur, cf.
  // vVo2maxPct clamp [102,135] dans deriveTrainingZones.ts — ici on part de
  // l'allure seuil pour remonter à la VMA, donc l'inverse : seuil ≈ VMA/0.88).
  const paceThresholdSecPerKm = Math.round(3600 / (vma * 0.88));
  return {
    nom: "QA Synthetic V2",
    sex: "male",
    age: base.age ?? 35,
    ftp: Math.round((base.vo2max ?? 58) * 4.6), // approx W/kg×poids, ordre de grandeur plausible
    weightKg: 72,
    vlamax: base.vlamax ?? 0.55,
    vlamaxRun: base.vlamaxRun ?? 0.50,
    vo2max: vo2,
    vma,
    css: 90,
    fcMax: base.fcMax ?? 188,
    tte: 45,
    pmax5s: 950,
    p30s: 620,
    p60s: 480,
    map5min: 380,
    paceThresholdSecPerKm,
    runMLSSEffectivePct: 0.86,
    runMLSSEffectiveSource: "observed",
    runEconomyScore: 3,
  };
}

// ── Dimension 4 : qualité des données — transforme un profil "complet mesuré" ──
function applyDataQuality(complete: PlanAthleteData, quality: DataQualityLevel): PlanAthleteData {
  switch (quality) {
    case "complete_measured":
      return { ...complete };
    case "estimated_only":
      // Rien de mesuré en labo — seuls les proxys terrain (VMA, allure,
      // sprint) restent, pour que l'estimateur CAP (estimateVLamaxCap) et
      // le Modèle C (predictRunMLSSPctFromVLaCE) fassent le travail.
      return {
        ...complete,
        vlamax: null, vlamaxRun: null, vo2max: null, ftp: null, css: null, tte: null,
        runMLSSEffectivePct: null, runMLSSEffectiveSource: "predicted",
      };
    case "incomplete":
      // Plusieurs champs absents — pas un pattern cohérent (vrai cas réel :
      // un coach qui n'a renseigné qu'une partie du profil athlète).
      return {
        ...complete,
        vo2max: null, weightKg: null, fcMax: null, css: null, map5min: null,
      };
    case "minimal":
      // Quasi aucune donnée physio — cas StartToRun typique ou première
      // utilisation de l'app.
      return {
        nom: complete.nom, sex: complete.sex, age: complete.age,
        ftp: null, weightKg: complete.weightKg ?? null, vlamax: null, vlamaxRun: null,
        vo2max: null, vma: null, css: null, fcMax: null, tte: null,
        pmax5s: null, p30s: null, p60s: null, map5min: null,
        paceThresholdSecPerKm: null, runMLSSEffectivePct: null,
        runMLSSEffectiveSource: "none", runEconomyScore: null,
      };
  }
}

// ── Dimension 5 : contraintes/disponibilité ──
const CONSTRAINTS_TEXT: Record<ConstraintsProfile, string> = {
  unrestricted: "Profil synthétique QA — aucune contrainte, disponibilité large.",
  heavily_constrained: "Profil synthétique QA — natation interdite (épaule), jamais le mardi (garde d'enfant), disponibilité réduite.",
  limited_terrain: "Profil synthétique QA — urbain strict, pas de dénivelé significatif, pas d'accès piscine régulier.",
  recent_injury: "Profil synthétique QA — tendinite rotulienne récente (< 6 semaines), prudence sur l'impact répété en course à pied.",
};
const CONSTRAINTS_HOURS: Record<ConstraintsProfile, number> = {
  unrestricted: 1.0,
  heavily_constrained: 0.6, // disponibilité réduite
  limited_terrain: 0.85,
  recent_injury: 0.75,
};

interface DisciplineSpec {
  objective: string;
  raceName: string;
  weeksAvailable: number;
  weeklyHoursBase: number;
  sessionsPerWeekBase: number;
  maxSessionsPerDay: number;
  strengthSessionsPerWeek: number;
  terrainAvailability: string;
  /** Rejoue la vraie formule de chunking (useAITrainingPlan.ts generatePlan,
   *  verrouillée par syntheticProfiles.test.ts::expectedChunksFor) — pas une
   *  approximation, cf. commentaire sur `expectedChunks` dans buildScenario. */
  expectedChunks: number;
}
const DISCIPLINES: Record<string, DisciplineSpec> = {
  "10K": { objective: "10 KM", raceName: "QA V2 10K", weeksAvailable: 10, weeklyHoursBase: 6, sessionsPerWeekBase: 5, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 3 },
  Marathon: { objective: "MARATHON", raceName: "QA V2 Marathon", weeksAvailable: 16, weeklyHoursBase: 9, sessionsPerWeekBase: 7, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 4 },
  TrailMountain: { objective: "TRAIL MONTAGNE 60KM", raceName: "QA V2 Trail Montagne", weeksAvailable: 14, weeklyHoursBase: 10, sessionsPerWeekBase: 6, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "montagne", expectedChunks: 3 },
  "70.3": { objective: "IRONMAN 70.3", raceName: "QA V2 70.3", weeksAvailable: 12, weeklyHoursBase: 10, sessionsPerWeekBase: 8, maxSessionsPerDay: 2, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 3 },
  SprintTri: { objective: "TRIATHLON SPRINT", raceName: "QA V2 Sprint", weeksAvailable: 6, weeklyHoursBase: 7, sessionsPerWeekBase: 6, maxSessionsPerDay: 2, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 1 },
  StartToRun: { objective: "START TO RUN", raceName: "QA V2 Start to Run", weeksAvailable: 8, weeklyHoursBase: 3, sessionsPerWeekBase: 3, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 2 },
  "5K": { objective: "5 KM", raceName: "QA V2 5K", weeksAvailable: 6, weeklyHoursBase: 5, sessionsPerWeekBase: 5, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 1 },
  Semi: { objective: "SEMI-MARATHON", raceName: "QA V2 Semi", weeksAvailable: 8, weeklyHoursBase: 6, sessionsPerWeekBase: 5, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 2 },
  TrailUltra: { objective: "TRAIL ULTRA UTMB", raceName: "QA V2 Trail Ultra", weeksAvailable: 20, weeklyHoursBase: 13, sessionsPerWeekBase: 7, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "montagne", expectedChunks: 4 },
  Ironman: { objective: "IRONMAN", raceName: "QA V2 IM", weeksAvailable: 16, weeklyHoursBase: 14, sessionsPerWeekBase: 10, maxSessionsPerDay: 2, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 4 },
  OlympicTri: { objective: "TRIATHLON OLYMPIQUE", raceName: "QA V2 Olympic", weeksAvailable: 10, weeklyHoursBase: 8, sessionsPerWeekBase: 6, maxSessionsPerDay: 2, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 2 },
  TrailShort: { objective: "TRAIL COURT 30KM", raceName: "QA V2 Trail Court", weeksAvailable: 8, weeklyHoursBase: 7, sessionsPerWeekBase: 5, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "vallonne", expectedChunks: 2 },
  CyclingPure: { objective: "CYCLOSPORTIVE LONGUE DISTANCE", raceName: "QA V2 Cyclosportive", weeksAvailable: 12, weeklyHoursBase: 9, sessionsPerWeekBase: 5, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "plat", expectedChunks: 3 },
  UltraExtreme: { objective: "TRAIL ULTRA UTMB 170KM", raceName: "QA V2 UTMB 170", weeksAvailable: 28, weeklyHoursBase: 15, sessionsPerWeekBase: 7, maxSessionsPerDay: 1, strengthSessionsPerWeek: 1, terrainAvailability: "montagne", expectedChunks: 5 },
};

type Ambition = "finisher" | "age_group" | "competitor" | "elite" | "world_class";

function buildScenario(
  id: V2ProfileId,
  disciplineKey: keyof typeof DISCIPLINES,
  ambition: Ambition,
  physio: PhysiologyArchetype,
  dataQuality: DataQualityLevel,
  constraintsProfile: ConstraintsProfile,
): QAProfile {
  const d = DISCIPLINES[disciplineKey];
  const complete = completeAthleteFor(physio);
  const athleteData = applyDataQuality(complete, dataQuality);
  const hoursFactor = CONSTRAINTS_HOURS[constraintsProfile];
  const planConfig: PlanConfig = {
    objective: d.objective,
    raceName: d.raceName,
    weeksAvailable: d.weeksAvailable,
    weeklyHours: Math.max(2, Math.round(d.weeklyHoursBase * hoursFactor)),
    sessionsPerWeek: d.sessionsPerWeekBase,
    maxSessionsPerDay: d.maxSessionsPerDay,
    strengthSessionsPerWeek: d.strengthSessionsPerWeek,
    ambition,
    constraints: CONSTRAINTS_TEXT[constraintsProfile],
    terrainAvailability: constraintsProfile === "limited_terrain" ? "plat" : d.terrainAvailability,
    recoveryStrategy: "passive",
  };
  return {
    id,
    label: `V2 — ${d.objective} · ${ambition} · ${PHYSIOLOGY_LABEL[physio]} · données ${dataQuality} · contraintes ${constraintsProfile}`,
    expectedWeeks: d.weeksAvailable,
    expectedChunks: d.expectedChunks,
    athleteData,
    planConfig,
    physiologyArchetype: physio,
    dataQuality,
    constraintsProfile,
  };
}

export const QA_PROFILES_V2: QAProfile[] = [
  buildScenario("V2-01", "10K", "finisher", "aerobic_dominant", "complete_measured", "unrestricted"),
  buildScenario("V2-02", "Marathon", "age_group", "glycolytic_dominant", "estimated_only", "heavily_constrained"),
  buildScenario("V2-03", "TrailMountain", "competitor", "balanced_typical", "incomplete", "limited_terrain"),
  buildScenario("V2-04", "70.3", "elite", "atypical_extreme", "minimal", "recent_injury"),
  buildScenario("V2-05", "SprintTri", "world_class", "master_40plus", "complete_measured", "unrestricted"),
  buildScenario("V2-06", "StartToRun", "finisher", "aerobic_dominant", "estimated_only", "heavily_constrained"),
  buildScenario("V2-07", "5K", "age_group", "glycolytic_dominant", "incomplete", "limited_terrain"),
  buildScenario("V2-08", "Semi", "competitor", "balanced_typical", "minimal", "recent_injury"),
  buildScenario("V2-09", "TrailUltra", "elite", "atypical_extreme", "complete_measured", "unrestricted"),
  buildScenario("V2-10", "Ironman", "world_class", "master_40plus", "estimated_only", "heavily_constrained"),
  buildScenario("V2-11", "10K", "age_group", "aerobic_dominant", "incomplete", "limited_terrain"),
  buildScenario("V2-12", "Marathon", "competitor", "glycolytic_dominant", "minimal", "recent_injury"),
  buildScenario("V2-13", "TrailMountain", "elite", "balanced_typical", "complete_measured", "unrestricted"),
  buildScenario("V2-14", "70.3", "world_class", "atypical_extreme", "estimated_only", "heavily_constrained"),
  buildScenario("V2-15", "SprintTri", "finisher", "master_40plus", "incomplete", "limited_terrain"),
  buildScenario("V2-16", "StartToRun", "age_group", "aerobic_dominant", "minimal", "recent_injury"),
  buildScenario("V2-17", "OlympicTri", "competitor", "glycolytic_dominant", "complete_measured", "unrestricted"),
  buildScenario("V2-18", "TrailShort", "elite", "balanced_typical", "estimated_only", "heavily_constrained"),
  buildScenario("V2-19", "5K", "world_class", "atypical_extreme", "incomplete", "limited_terrain"),
  buildScenario("V2-20", "Semi", "finisher", "master_40plus", "minimal", "recent_injury"),

  // Scénarios ciblés (hors matrice, demandés explicitement) :
  buildScenario("V2-EXTRA-MARATHON", "Marathon", "world_class", "aerobic_dominant", "complete_measured", "unrestricted"),
  // PROBE DE GAP CONNU — voir docstring en tête de fichier. Résultat attendu :
  // échec ou dégradation silencieuse dès `normalizeObjectiveKey`, AVANT
  // même la qualité du contenu généré.
  buildScenario("V2-EXTRA-CYCLING", "CyclingPure", "competitor", "glycolytic_dominant", "complete_measured", "unrestricted"),
  buildScenario("V2-EXTRA-ULTRA", "UltraExtreme", "elite", "balanced_typical", "incomplete", "heavily_constrained"),
];
