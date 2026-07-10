// ═══════════════════════════════════════════════════════════════
// SPORT RATIO MATRIX — Types, references, normalizers, constraints
// ═══════════════════════════════════════════════════════════════

// === RÉFÉRENTIEL ÉLITE : RATIOS DE RÉPARTITION SPORTIVE ===
// Sources scientifiques :
// - Muñoz et al. 2014 (EJSS) : Distribution d'entraînement chez triathlètes élite IM/70.3
// - Etxebarria et al. 2019 (IJSPP) : Training volume distribution in elite triathletes
// - Frontiers 2024 : Optimal training load in age-group triathletes
// - Seiler 2010 (SJMSS) : Polarized training intensity distribution
// - Haugen et al. 2022 (Sports Med) : Marathon training in elite runners
// - Billat et al. 2001 (Med Sci Sports Exerc) : Interval training at VO2max
// - Mujika 2010 (Int J Sports Physiol Perform) : Tapering for competition
// - Issurin 2010 (Sports Med) : Block periodization principles
// - Tjelta 2016 (IJSPP) : Training characteristics of elite distance runners

export interface SessionDurationGuide {
  // Standard session durations (swimMin/bikeMin/runMin) are now DERIVED
  // from the workout catalog stats + ambition scaling. Only race-specific
  // values that can't be derived from the library are kept here.
  longBikeMin?: [number, number]; // sortie longue vélo (minutes) — race-specific
  longRunMin?: [number, number];  // sortie longue CAP (minutes) — race-specific
  longSwimM?: [number, number];   // distance sortie longue natation (mètres)
  weeklyKmRun?: [number, number]; // km/sem CAP (Haugen 2022, Tjelta 2016)
  weeklyKmBike?: [number, number]; // km/sem vélo
}

export interface SportRatioRef {
  swimPct?: [number, number];
  bikePct?: [number, number];
  runPct?: [number, number];
  weeklyHours: [number, number];
  sessionsPerWeek: [number, number];
  keySessions: [number, number];
  progressionPct: [number, number];
  durations?: SessionDurationGuide;
}

export const SPORT_RATIO_REFS: Record<string, Record<string, SportRatioRef>> = {
  // ═══ IRONMAN ═══ (Muñoz 2014: Bike 45-55%, Run 25-30%, Swim 15-20%)
  // Race: 3.8km Swim + 180km Bike (5-7h) + 42.2km Run (3.5-5h+)
  // Frodeno peak: 30h/sem, Lange: 25-28h/sem (Lorang 2018)
  // SL Bike doit simuler la durée de course ou 70-80% de celle-ci (Neal 2020, Laursen 2002)
  // SL Run = max 2.5-3h pour limiter le risque blessure (Mujika 2018, Billat 2001)
  IM: {
    world_class:{ weeklyHours: [24,34], sessionsPerWeek: [14,20], keySessions: [3,5], progressionPct: [5,8], swimPct: [15,20], bikePct: [45,55], runPct: [25,35],
      durations: { longBikeMin: [330,450], longRunMin: [150,195], longSwimM: [4500,5500], weeklyKmRun: [80,150], weeklyKmBike: [350,650] } },
    elite:      { weeklyHours: [20,30], sessionsPerWeek: [12,16], keySessions: [3,4], progressionPct: [5,8], swimPct: [15,20], bikePct: [45,55], runPct: [25,35],
      durations: { longBikeMin: [300,420], longRunMin: [135,180], longSwimM: [4000,5000], weeklyKmRun: [60,120], weeklyKmBike: [300,550] } },
    competitor: { weeklyHours: [14,20], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,7], swimPct: [15,20], bikePct: [45,55], runPct: [25,35],
      durations: { longBikeMin: [240,360], longRunMin: [110,150], longSwimM: [3000,4000], weeklyKmRun: [40,80], weeklyKmBike: [200,400] } },
    age_group:  { weeklyHours: [10,15], sessionsPerWeek: [6,9],   keySessions: [2,2], progressionPct: [3,5], swimPct: [15,20], bikePct: [45,55], runPct: [25,35],
      durations: { longBikeMin: [210,300], longRunMin: [90,135], longSwimM: [2500,3500], weeklyKmRun: [30,55], weeklyKmBike: [150,280] } },
    finisher:   { weeklyHours: [8,12],  sessionsPerWeek: [5,7],   keySessions: [1,2], progressionPct: [3,3], swimPct: [15,20], bikePct: [45,55], runPct: [25,35],
      durations: { longBikeMin: [180,270], longRunMin: [75,120], longSwimM: [2000,3000], weeklyKmRun: [20,40], weeklyKmBike: [100,200] } },
  },
  // ═══ 70.3 ═══ (Etxebarria 2019: Bike 40-48%, Run 30-35%, Swim 15-20%)
  // Race: 1.9km Swim + 90km Bike (2.5-3.5h) + 21.1km Run (1.5-2.5h)
  // SL Bike = 80-100% de la durée course visée (Laursen 2002)
  // SL Run = 1.5-2h suffisant pour les adaptations LD (Seiler 2010, Billat 2001)
  "703": {
    world_class:{ weeklyHours: [18,26], sessionsPerWeek: [12,17], keySessions: [3,4], progressionPct: [5,8], swimPct: [15,20], bikePct: [40,50], runPct: [30,40],
      durations: { longBikeMin: [240,330], longRunMin: [110,150], longSwimM: [4000,5000], weeklyKmRun: [65,110], weeklyKmBike: [300,550] } },
    elite:      { weeklyHours: [15,22], sessionsPerWeek: [10,14], keySessions: [3,3], progressionPct: [5,8], swimPct: [15,20], bikePct: [40,50], runPct: [30,40],
      durations: { longBikeMin: [210,300], longRunMin: [100,135], longSwimM: [3500,4500], weeklyKmRun: [50,90], weeklyKmBike: [250,450] } },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7], swimPct: [15,20], bikePct: [40,50], runPct: [30,40],
      durations: { longBikeMin: [180,270], longRunMin: [90,120], longSwimM: [3000,4000], weeklyKmRun: [35,65], weeklyKmBike: [180,350] } },
    age_group:  { weeklyHours: [8,12],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5], swimPct: [15,20], bikePct: [40,50], runPct: [30,40],
      durations: { longBikeMin: [150,240], longRunMin: [75,105], longSwimM: [2500,3500], weeklyKmRun: [25,45], weeklyKmBike: [120,250] } },
    finisher:   { weeklyHours: [6,10],  sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3], swimPct: [15,20], bikePct: [40,50], runPct: [30,40],
      durations: { longBikeMin: [120,180], longRunMin: [60,90], longSwimM: [2000,3000], weeklyKmRun: [15,30], weeklyKmBike: [80,180] } },
  },
  // ═══ MARATHON ═══ (Haugen 2022: Elite 160-220km/sem, Tjelta 2016: 80% Z1-Z2)
  Marathon: {
    world_class:{ weeklyHours: [14,19], sessionsPerWeek: [11,15], keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [150,180], weeklyKmRun: [160,260] } },
    elite:      { weeklyHours: [12,16], sessionsPerWeek: [10,13], keySessions: [3,3], progressionPct: [5,8],
      durations: { longRunMin: [135,165], weeklyKmRun: [130,220] } },
    competitor: { weeklyHours: [8,12],  sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [105,150], weeklyKmRun: [70,130] } },
    age_group:  { weeklyHours: [6,9],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [90,120], weeklyKmRun: [45,80] } },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,3],
      durations: { longRunMin: [75,105], weeklyKmRun: [25,50] } },
  },
  Semi: {
    world_class:{ weeklyHours: [12,17], sessionsPerWeek: [9,13],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [100,135], weeklyKmRun: [120,190] } },
    elite:      { weeklyHours: [10,14], sessionsPerWeek: [8,11],  keySessions: [3,3], progressionPct: [5,8],
      durations: { longRunMin: [90,120], weeklyKmRun: [100,160] } },
    competitor: { weeklyHours: [7,10],  sessionsPerWeek: [6,8],   keySessions: [2,2], progressionPct: [5,7],
      durations: { longRunMin: [75,105], weeklyKmRun: [55,100] } },
    age_group:  { weeklyHours: [5,7],   sessionsPerWeek: [4,6],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [60,90], weeklyKmRun: [35,60] } },
    finisher:   { weeklyHours: [3,5],   sessionsPerWeek: [3,4],   keySessions: [1,1], progressionPct: [3,3],
      durations: { longRunMin: [50,75], weeklyKmRun: [20,40] } },
  },
  "10K": {
    world_class:{ weeklyHours: [10,14], sessionsPerWeek: [9,12],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [85,110], weeklyKmRun: [110,170] } },
    elite:      { weeklyHours: [9,12],  sessionsPerWeek: [8,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [75,100], weeklyKmRun: [90,140] } },
    competitor: { weeklyHours: [6,9],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [5,5],
      durations: { longRunMin: [65,90], weeklyKmRun: [50,90] } },
    age_group:  { weeklyHours: [4,6],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,5],
      durations: { longRunMin: [50,75], weeklyKmRun: [30,55] } },
    finisher:   { weeklyHours: [3,4],   sessionsPerWeek: [3,4],   keySessions: [1,1], progressionPct: [3,3],
      durations: { longRunMin: [40,60], weeklyKmRun: [15,35] } },
  },
  // ═══ 5K ═══ (Tjelta 2016: Elite 80-120km/sem, high VO2max focus)
  "5K": {
    world_class:{ weeklyHours: [9,13],  sessionsPerWeek: [8,12],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [70,95], weeklyKmRun: [100,150] } },
    elite:      { weeklyHours: [8,11],  sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [60,80], weeklyKmRun: [80,120] } },
    competitor: { weeklyHours: [5,8],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [5,5],
      durations: { longRunMin: [50,70], weeklyKmRun: [40,75] } },
    age_group:  { weeklyHours: [3,5],   sessionsPerWeek: [3,5],   keySessions: [1,2], progressionPct: [3,5],
      durations: { longRunMin: [40,60], weeklyKmRun: [20,45] } },
    finisher:   { weeklyHours: [2,4],   sessionsPerWeek: [3,4],   keySessions: [1,1], progressionPct: [3,3],
      durations: { longRunMin: [30,50], weeklyKmRun: [10,25] } },
  },
  // ═══ TRAIL ═══
  Trail: {
    world_class:{ weeklyHours: [14,21], sessionsPerWeek: [9,13],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [180,240], weeklyKmRun: [100,170] } },
    elite:      { weeklyHours: [12,18], sessionsPerWeek: [8,11],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [150,210], weeklyKmRun: [80,140] } },
    competitor: { weeklyHours: [8,14],  sessionsPerWeek: [6,9],   keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [120,180], weeklyKmRun: [50,90] } },
    age_group:  { weeklyHours: [6,10],  sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [90,150], weeklyKmRun: [35,60] } },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,3],
      durations: { longRunMin: [75,120], weeklyKmRun: [20,40] } },
  },
  // TrailShort = format court (15-35 km, < 4h, 500-1500m D+).
  // Volume hebdo plus proche d'un marathon route, sortie longue plafonnée, intensité (VO2/seuil) maintenue.
  // Différencié de Trail (long, 40-80 km) qui exige plus de volume Z2 et longues sorties dépassant 2h30.
  TrailShort: {
    world_class:{ weeklyHours: [10,15], sessionsPerWeek: [8,11],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [105,150], weeklyKmRun: [80,130] } },
    elite:      { weeklyHours: [9,13],  sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [90,135],  weeklyKmRun: [65,105] } },
    competitor: { weeklyHours: [6,10],  sessionsPerWeek: [5,8],   keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [75,120],  weeklyKmRun: [40,75] } },
    age_group:  { weeklyHours: [4,7],   sessionsPerWeek: [4,6],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [60,100],  weeklyKmRun: [25,50] } },
    finisher:   { weeklyHours: [3,5],   sessionsPerWeek: [3,5],   keySessions: [1,2], progressionPct: [3,3],
      durations: { longRunMin: [50,90],   weeklyKmRun: [15,35] } },
  },
  TrailMountain: {
    world_class:{ weeklyHours: [16,23], sessionsPerWeek: [9,14],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [210,330], weeklyKmRun: [85,150] } },
    elite:      { weeklyHours: [14,20], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,8],
      durations: { longRunMin: [180,300], weeklyKmRun: [70,120] } },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [6,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [150,240], weeklyKmRun: [45,80] } },
    age_group:  { weeklyHours: [7,12],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [120,180], weeklyKmRun: [30,55] } },
    finisher:   { weeklyHours: [5,8],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3],
      durations: { longRunMin: [90,150], weeklyKmRun: [20,40] } },
  },
  TrailUltra: {
    world_class:{ weeklyHours: [18,26], sessionsPerWeek: [9,14],  keySessions: [3,4], progressionPct: [5,8],
      durations: { longRunMin: [270,480], weeklyKmRun: [100,180] } },
    elite:      { weeklyHours: [15,22], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,8],
      durations: { longRunMin: [240,420], weeklyKmRun: [80,150] } },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [6,10],  keySessions: [2,3], progressionPct: [5,7],
      durations: { longRunMin: [180,300], weeklyKmRun: [50,100] } },
    age_group:  { weeklyHours: [8,13],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5],
      durations: { longRunMin: [150,240], weeklyKmRun: [35,70] } },
    finisher:   { weeklyHours: [5,9],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3],
      durations: { longRunMin: [120,180], weeklyKmRun: [25,50] } },
  },
  // ═══ TRIATHLON SPRINT ═══ (750m Swim + 20km Bike + 5K Run — 1h à 1h30)
  // Bevegård/Millet 2011, ITU pathway 2020 : intensité haute, volume modéré
  TriSprint: {
    world_class:{ weeklyHours: [16,22], sessionsPerWeek: [11,15], keySessions: [3,4], progressionPct: [5,8], swimPct: [22,28], bikePct: [40,48], runPct: [28,34],
      durations: { longBikeMin: [120,180], longRunMin: [70,90], longSwimM: [3500,4500], weeklyKmRun: [55,90], weeklyKmBike: [180,280] } },
    elite:      { weeklyHours: [12,18], sessionsPerWeek: [9,13],  keySessions: [3,3], progressionPct: [5,7], swimPct: [22,28], bikePct: [40,48], runPct: [28,34],
      durations: { longBikeMin: [105,150], longRunMin: [60,80], longSwimM: [3000,4000], weeklyKmRun: [45,75], weeklyKmBike: [150,240] } },
    competitor: { weeklyHours: [8,12],  sessionsPerWeek: [6,9],   keySessions: [2,3], progressionPct: [5,7], swimPct: [20,26], bikePct: [42,50], runPct: [28,34],
      durations: { longBikeMin: [90,120], longRunMin: [50,70], longSwimM: [2500,3500], weeklyKmRun: [30,55], weeklyKmBike: [100,180] } },
    age_group:  { weeklyHours: [6,9],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5], swimPct: [20,26], bikePct: [42,50], runPct: [28,34],
      durations: { longBikeMin: [75,105], longRunMin: [40,60], longSwimM: [2000,3000], weeklyKmRun: [20,40], weeklyKmBike: [70,140] } },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3], swimPct: [18,25], bikePct: [42,50], runPct: [28,34],
      durations: { longBikeMin: [60,90], longRunMin: [30,50], longSwimM: [1500,2500], weeklyKmRun: [12,25], weeklyKmBike: [50,100] } },
  },
  // ═══ TRIATHLON OLYMPIQUE ═══ (1.5km Swim + 40km Bike + 10K Run — 2h à 3h)
  // Millet 2011, Etxebarria 2019 : volume intermédiaire, ratio bike-dominant
  TriOlympique: {
    world_class:{ weeklyHours: [18,26], sessionsPerWeek: [12,17], keySessions: [3,4], progressionPct: [5,8], swimPct: [18,24], bikePct: [45,52], runPct: [28,34],
      durations: { longBikeMin: [150,240], longRunMin: [80,110], longSwimM: [4000,5000], weeklyKmRun: [65,100], weeklyKmBike: [250,400] } },
    elite:      { weeklyHours: [14,20], sessionsPerWeek: [10,14], keySessions: [3,3], progressionPct: [5,7], swimPct: [18,24], bikePct: [45,52], runPct: [28,34],
      durations: { longBikeMin: [135,210], longRunMin: [70,100], longSwimM: [3500,4500], weeklyKmRun: [50,85], weeklyKmBike: [200,340] } },
    competitor: { weeklyHours: [9,14],  sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7], swimPct: [18,24], bikePct: [45,52], runPct: [28,34],
      durations: { longBikeMin: [120,180], longRunMin: [60,90], longSwimM: [3000,4000], weeklyKmRun: [30,55], weeklyKmBike: [140,240] } },
    age_group:  { weeklyHours: [7,11],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5], swimPct: [16,22], bikePct: [45,52], runPct: [28,34],
      durations: { longBikeMin: [105,150], longRunMin: [50,80], longSwimM: [2500,3500], weeklyKmRun: [22,42], weeklyKmBike: [100,180] } },
    finisher:   { weeklyHours: [5,8],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3], swimPct: [15,22], bikePct: [45,52], runPct: [28,34],
      durations: { longBikeMin: [90,135], longRunMin: [45,65], longSwimM: [2000,3000], weeklyKmRun: [15,30], weeklyKmBike: [70,130] } },
  },
  // ═══ START TO RUN ═══ (débutant absolu, marche-course alternée, 8-12 sem)
  // Bredeweg 2010, Videbaek 2015 : progression prudente, ≤10% volume/sem, 3 séances max
  // Ambitions "elite/world_class/competitor" volontairement plafonnées : StartToRun = objectif débutant
  StartToRun: {
    world_class:{ weeklyHours: [3,5], sessionsPerWeek: [3,4], keySessions: [1,1], progressionPct: [5,10],
      durations: { longRunMin: [30,50], weeklyKmRun: [15,30] } },
    elite:      { weeklyHours: [3,5], sessionsPerWeek: [3,4], keySessions: [1,1], progressionPct: [5,10],
      durations: { longRunMin: [30,45], weeklyKmRun: [12,25] } },
    competitor: { weeklyHours: [2.5,4], sessionsPerWeek: [3,4], keySessions: [1,1], progressionPct: [5,10],
      durations: { longRunMin: [25,40], weeklyKmRun: [10,20] } },
    age_group:  { weeklyHours: [2,3.5], sessionsPerWeek: [3,3], keySessions: [1,1], progressionPct: [5,10],
      durations: { longRunMin: [20,35], weeklyKmRun: [8,15] } },
    finisher:   { weeklyHours: [1.5,3], sessionsPerWeek: [3,3], keySessions: [0,1], progressionPct: [5,10],
      durations: { longRunMin: [15,30], weeklyKmRun: [5,12] } },
  },
};

// FIX #2-obj: Order matters — check "70.3" BEFORE "ironman" to avoid "Ironman 70.3" → "IM"
export function normalizeObjKey(obj: string): string {
  const lower = obj.toLowerCase();
  // Order matters: "70.3" before "ironman" to avoid "Ironman 70.3" → "IM"
  if (lower.includes("70.3") || lower === "703") return "703";
  if (lower.includes("ironman") || lower === "im") return "IM";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("marathon")) return "Marathon";
  // Famous trail races → map to canonical sub-classes (must come before generic trail/ultra checks)
  if (lower.includes("utmb") || lower.includes("tor des") || lower.includes("hardrock") || lower.includes("western states")) return "TrailUltra";
  if (lower.includes("ccc")) return "TrailMountain";
  if (lower.includes("occ") || lower.includes("skyrun") || lower.includes("sky run") || lower.includes("vk ")) return "TrailMountain";
  if (lower.includes("trail") && lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("trail") && (lower.includes("montagne") || lower.includes("mountain"))) return "TrailMountain";
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short"))) return "TrailShort";
  if (lower.includes("trail")) return "Trail";
  if (lower.includes("ultra")) return "TrailUltra"; // ultra w/o "trail" keyword
  // FIX: "10" was too broad (matched "ironman 10h"). Use "10k"/"10km"/"10 km" like client-side
  if (lower.includes("10k") || lower.includes("10km") || lower.includes("10 km")) return "10K";
  if (lower.includes("5k") || lower === "5km") return "5K";
  if (lower.includes("start")) return "StartToRun";
  return obj;
}

// === REFERENCE STANDARDS BY OBJECTIVE × AMBITION × SEX ===
// ⚠️ Standards populationnels (littérature / cohortes AG). Usage EXCLUSIF :
//    • GapAmbitionPanel (comparaison snapshot vs standard populationnel).
//    • Détection d'incohérence ambition↔physiologie (via deriveRaceTargets).
// NE JAMAIS consommer pour prescrire allures/chronos aux athlètes/séances :
// la source de vérité pour cela est deriveRaceTargets(snapshot).
export const REFERENCE_STANDARDS: Record<string, Record<string, { M: string; F: string }>> = {
  IM: {
    finisher:    { M: "14h – 17h",       F: "14h30 – 17h30" },
    age_group:   { M: "10h30 – 13h",     F: "11h – 14h" },
    competitor:  { M: "9h00 – 10h30",    F: "9h30 – 11h" },
    elite:       { M: "Sub 8h45",        F: "Sub 9h30" },
    world_class: { M: "Sub 8h00",        F: "Sub 8h45" },
  },
  "703": {
    finisher:    { M: "6h30 – 8h00",     F: "7h00 – 8h30" },
    age_group:   { M: "5h15 – 6h15",     F: "5h45 – 6h45" },
    competitor:  { M: "4h40 – 5h15",     F: "5h05 – 5h45" },
    elite:       { M: "4h15 – 4h40",     F: "4h40 – 5h05" },
    world_class: { M: "Sub 3h55",        F: "Sub 4h20" },
  },
  Marathon: {
    finisher:    { M: "4h30 – 5h+",    F: "4h55 – 5h30+" },
    age_group:   { M: "3h30 – 4h15",   F: "3h50 – 4h40" },
    competitor:  { M: "3h00 – 3h30",    F: "3h18 – 3h50" },
    elite:       { M: "2h45 – 3h00",    F: "3h05 – 3h20" },
    world_class: { M: "Sub 2h35",       F: "Sub 2h55" },
  },
  Semi: {
    finisher:    { M: "2h00 – 2h30",    F: "2h10 – 2h45" },
    age_group:   { M: "1h35 – 1h55",    F: "1h44 – 2h06" },
    competitor:  { M: "1h20 – 1h35",    F: "1h28 – 1h44" },
    elite:       { M: "1h12 – 1h20",    F: "1h20 – 1h28" },
    world_class: { M: "Sub 1h08",       F: "Sub 1h17" },
  },
  "10K": {
    finisher:    { M: "55' – 1h10",     F: "1h00 – 1h17" },
    age_group:   { M: "45' – 52'",      F: "49' – 57'" },
    competitor:  { M: "38' – 44'",      F: "42' – 48'" },
    elite:       { M: "33' – 37'",      F: "37' – 41'" },
    world_class: { M: "Sub 31'",        F: "Sub 35'" },
  },
  "5K": {
    finisher:    { M: "28' – 35'",      F: "30' – 38'" },
    age_group:   { M: "22' – 26'",      F: "24' – 29'" },
    competitor:  { M: "18' – 21'",      F: "20' – 23'" },
    elite:       { M: "16' – 18'",      F: "18' – 20'" },
    world_class: { M: "Sub 15'",        F: "Sub 17'" },
  },
  Trail: {
    finisher:    { M: "5h30 – 7h",      F: "6h00 – 7h45" },
    age_group:   { M: "4h00 – 5h15",    F: "4h25 – 5h45" },
    competitor:  { M: "3h15 – 4h00",    F: "3h35 – 4h25" },
    elite:       { M: "2h50 – 3h15",    F: "3h10 – 3h35" },
    world_class: { M: "Sub 2h45",       F: "Sub 3h05" },
  },
  TrailShort: {
    finisher:    { M: "3h00 – 4h15",    F: "3h20 – 4h45" },
    age_group:   { M: "2h15 – 2h55",    F: "2h30 – 3h15" },
    competitor:  { M: "1h45 – 2h10",    F: "1h55 – 2h25" },
    elite:       { M: "1h30 – 1h45",    F: "1h40 – 1h55" },
    world_class: { M: "Sub 1h25",       F: "Sub 1h35" },
  },
  TrailMountain: {
    finisher:    { M: "12h – 16h",      F: "13h – 17h30" },
    age_group:   { M: "9h – 11h30",     F: "10h – 12h40" },
    competitor:  { M: "7h – 9h",        F: "7h45 – 10h" },
    elite:       { M: "6h – 7h",        F: "6h40 – 7h45" },
    world_class: { M: "Sub 5h45",       F: "Sub 6h25" },
  },
  TrailUltra: {
    finisher:    { M: "30h – 46h",      F: "33h – 50h" },
    age_group:   { M: "22h – 30h",      F: "24h – 33h" },
    competitor:  { M: "18h – 22h",      F: "20h – 24h" },
    elite:       { M: "15h – 18h",      F: "17h – 20h" },
    world_class: { M: "Sub 14h30",      F: "Sub 16h30" },
  },
};

/** @deprecated alias historique. Utiliser REFERENCE_STANDARDS. */
export const TIME_TARGET_HINTS = REFERENCE_STANDARDS;

/**
 * ⚠️ Lecture des standards populationnels UNIQUEMENT.
 * NE PAS utiliser pour prescrire des allures/temps de course : passer par deriveRaceTargets.
 */
export function getReferenceStandard(objective: string, ambition: string, sex?: string): string | null {
  const objKey = normalizeObjKey(objective);
  const ambKey = normalizeAmbKey(ambition);
  const entry = REFERENCE_STANDARDS[objKey]?.[ambKey];
  if (!entry) return null;
  return entry[sex === "F" ? "F" : "M"];
}

/** @deprecated alias historique — préférer getReferenceStandard. */
export const getTimeTargetHint = getReferenceStandard;


// FIX #2-amb: Normalize accented chars (é→e, è→e) before matching
// world_class = NOUVEAU palier "Elite" UI (top 3% AG). Doit être détecté AVANT `elite`
// car certains alias historiques ("worldclass") contiennent la sous-chaîne "class"/"world".
export function normalizeAmbKey(amb: string): string {
  const lower = amb.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z_]/g, "");
  if (lower.includes("world") || lower.includes("monde") || lower.includes("mondial") || lower === "wc") return "world_class";
  if (lower.includes("elite") || lower.includes("pro") || lower.includes("qualif")) return "elite";
  if (lower.includes("compet") || lower.includes("comp")) return "competitor";
  if (lower.includes("age") || lower.includes("group") || lower.includes("intermediaire") || lower.includes("confirme") || lower.includes("confirmed")) return "age_group";
  if (lower.includes("finisher") || lower.includes("fin") || lower.includes("decouverte") || lower.includes("discovery")) return "finisher";
  return "age_group"; // safer default than "finisher"
}

// === AMBITION SCALING FACTORS for deriving standard session durations from catalog ===
// world_class (top 3%) > elite (top 10%) > competitor > age_group > finisher
export const AMBITION_SCALE: Record<string, number> = {
  world_class: 1.10,
  elite: 1.0,
  competitor: 0.85,
  age_group: 0.70,
  finisher: 0.55,
};

export interface CatalogDurationStats {
  [sport: string]: { minDur: number; maxDur: number; medianDur: number; count: number };
}

/**
 * Derive standard session durations from catalog stats + ambition scaling.
 * Returns formatted lines for the prompt, or empty array if no stats available.
 */
export function derivedSessionDurations(
  catalogStats: CatalogDurationStats | null,
  ambKey: string
): string[] {
  if (!catalogStats || Object.keys(catalogStats).length === 0) return [];
  const scale = AMBITION_SCALE[ambKey] ?? 0.70;
  const lines: string[] = [];

  const sportMap: Record<string, string> = {
    swim: "🏊 Natation standard",
    bike: "🚴 Vélo standard",
    run: "🏃 CAP standard",
    strength: "💪 Renfo/Force",
  };

  for (const [sport, stats] of Object.entries(catalogStats)) {
    const label = sportMap[sport];
    if (!label) continue;
    const lo = Math.round(stats.minDur * scale);
    const hi = Math.round(stats.maxDur * scale);
    lines.push(`| ${label} | ${lo}-${hi} min | Dérivé du catalogue TFCL™ (${stats.count} séances, médiane ${stats.medianDur}min) × facteur ${ambKey} |`);
  }
  return lines;
}

export function getSportDistributionConstraint(objective: string, ambition: string, limiters?: string[], catalogStats?: CatalogDurationStats | null): string | null {
  const objKey = normalizeObjKey(objective);
  const ambKey = normalizeAmbKey(ambition);
  const ref = SPORT_RATIO_REFS[objKey]?.[ambKey];
  if (!ref) return null;

  const lines: string[] = [];
  lines.push(`\n### 🚨📊 CONTRAINTE CRITIQUE DE RÉPARTITION SPORTIVE (RÉFÉRENTIEL TFCL™ ${ambKey.toUpperCase()} — ${objKey})`);
  lines.push(`⛔ RÈGLE NON NÉGOCIABLE : Les ratios ci-dessous sont des CIBLES ABSOLUES. Tout plan qui ne les respecte pas sera REJETÉ.`);
  lines.push(`Le non-respect de ces ratios est l'erreur la plus fréquente et la plus grave dans les plans générés.\n`);

  if (ref.swimPct && ref.bikePct && ref.runPct) {
    lines.push(`| Discipline | Cible % volume | Minimum absolu | Maximum absolu |`);
    lines.push(`|------------|---------------|----------------|----------------|`);
    lines.push(`| 🏊 Natation | ${ref.swimPct[0]}-${ref.swimPct[1]}% | ${Math.max(ref.swimPct[0] - 3, 5)}% | ${ref.swimPct[1] + 3}% |`);
    lines.push(`| 🚴 Vélo | ${ref.bikePct[0]}-${ref.bikePct[1]}% | ${ref.bikePct[0] - 3}% | ${ref.bikePct[1] + 3}% |`);
    lines.push(`| 🏃 Course | ${ref.runPct[0]}-${ref.runPct[1]}% | ${ref.runPct[0] - 3}% | ${ref.runPct[1] + 3}% |`);
    lines.push(``);
    lines.push(`**⛔ ERREURS TYPIQUES À ÉVITER ABSOLUMENT :**`);
    lines.push(`- ❌ Natation > ${ref.swimPct[1] + 5}% → INTERDIT (erreur fréquente : trop de séances natation courtes)`);
    lines.push(`- ❌ Vélo < ${ref.bikePct[0] - 5}% → INTERDIT (le vélo est le sport dominant en triathlon, pas la natation)`);
    lines.push(`- ❌ Course < ${ref.runPct[0] - 5}% → INTERDIT (la CAP est le 2e sport en volume, pas le 3e)`);
    lines.push(``);
    lines.push(`**📐 MÉTHODE DE CALCUL :** Compte le nombre TOTAL de minutes par discipline sur l'ensemble du bloc. Divise chaque sport par le total. Vérifie que les % sont dans les fourchettes ci-dessus AVANT de finaliser.`);
    lines.push(`**💡 ASTUCE :** En triathlon, le Vélo = sport DOMINANT (40-55%), la Course = 2e (25-40%), la Natation = 3e (15-20%). Ne mets JAMAIS plus de natation que de course.`);
    lines.push(`\n**Règle** : La somme Natation + Vélo + Course = 100% (hors Renfo/Prévention qui s'ajoute en surplus).`);
    lines.push(`Si le limiteur principal justifie un dépassement de ±3%, CITE EXPLICITEMENT la raison dans l'en-tête du bloc concerné.`);
  }

  lines.push(`\n**Cibles structurelles :**`);
  lines.push(`- Volume hebdomadaire : ${ref.weeklyHours[0]}-${ref.weeklyHours[1]}h`);
  lines.push(`- Séances/semaine : ${ref.sessionsPerWeek[0]}-${ref.sessionsPerWeek[1]}`);
  lines.push(`- Séances clés 🔑 : ${ref.keySessions[0]}-${ref.keySessions[1]}/semaine`);
  lines.push(`- Progression volume : +${ref.progressionPct[0]}-${ref.progressionPct[1]}%/semaine max`);

  // ── SESSION DURATION MATRIX (hybrid: catalog-derived + race-specific) ──
  if (ref.durations || catalogStats) {
    const d = ref.durations;
    lines.push(`\n### 📏 MATRICE DURÉES DE SÉANCE × VOLUME — ${ambKey.toUpperCase()} / ${objKey}`);
    lines.push(`📚 Sources : Catalogue TFCL™ (durées dérivées de la bibliothèque de séances) + littérature (SL race-specific)`);
    lines.push(`⚠️ Ces durées sont CALIBRÉES pour le niveau ${ambKey.toUpperCase()}. Les dépasser ou les sous-estimer crée un décalage volume/ratio.\n`);

    lines.push(`| Paramètre | Fourchette cible | Justification scientifique |`);
    lines.push(`|-----------|-----------------|---------------------------|`);

    // Standard session durations — DERIVED from catalog stats
    const derivedLines = derivedSessionDurations(catalogStats ?? null, ambKey);
    if (derivedLines.length > 0) {
      lines.push(...derivedLines);
    }

    // Race-specific values — kept hardcoded (can't be derived from library)
    if (d?.longBikeMin) {
      lines.push(`| 🚴 Sortie longue vélo (SL) | ${d.longBikeMin[0]}-${d.longBikeMin[1]} min | Lorang : SL = pilier endurance spécifique, progression +15min/sem |`);
    }
    if (d?.longRunMin) {
      lines.push(`| 🏃 Sortie longue CAP (SL) | ${d.longRunMin[0]}-${d.longRunMin[1]} min | Haugen 2022 : SL CAP plafonnée pour limiter risque blessure |`);
    }
    if (d?.longSwimM) {
      lines.push(`| 🏊 Séance longue natation | ${d.longSwimM[0]}-${d.longSwimM[1]} m | Muñoz 2014 : volume technique, CSS + endurance aérobie |`);
    }
    if (d?.weeklyKmRun) {
      lines.push(`| 🏃 Volume hebdo CAP | ${d.weeklyKmRun[0]}-${d.weeklyKmRun[1]} km/sem | Haugen 2022, Tjelta 2016 : corrélation volume-performance |`);
    }
    if (d?.weeklyKmBike) {
      lines.push(`| 🚴 Volume hebdo vélo | ${d.weeklyKmBike[0]}-${d.weeklyKmBike[1]} km/sem | Etxebarria 2019 : volume vélo proportionnel au ratio cible |`);
    }
    lines.push(``);
    lines.push(`**⚠️ RÈGLES DURÉES :**`);
    lines.push(`- Les séances standard sont dérivées du catalogue TFCL™ et ajustées au niveau ${ambKey.toUpperCase()}. Les SL augmentent PROGRESSIVEMENT (+10-15%/sem).`);
    lines.push(`- Pour un ${ambKey === 'finisher' ? 'Finisher' : ambKey === 'age_group' ? 'Age Group' : ambKey === 'competitor' ? 'Competitor' : 'Élite'}, des séances trop longues = risque blessure. Des séances trop courtes = ratio sport faussé.`);
    lines.push(`- La durée des séances DOIT être cohérente avec le volume hebdomadaire cible (${ref.weeklyHours[0]}-${ref.weeklyHours[1]}h).`);
    lines.push(`- VÉRIFICATION : nb séances × durée moyenne ≈ volume hebdo. Si ça ne colle pas, ajuste les durées.`);
  }

  if (limiters && limiters.length > 0) {
    lines.push(`\n**Limiteur(s) identifié(s) pour cet athlète :** ${limiters.join(", ")}`);
    lines.push(`→ Un limiteur peut justifier un ajustement de ±3% MAXIMUM sur un sport. Au-delà, c'est une erreur.`);
    lines.push(`→ Si tu ajustes un ratio pour un limiteur, tu DOIS le mentionner dans le Récapitulatif Stratégique ET dans l'en-tête du bloc.`);
  }

  // ── MANDATORY RATIO VERIFICATION TABLE ──
  lines.push(`\n## 🚨🚨🚨 PROCÉDURE DE VÉRIFICATION DES RATIOS — OBLIGATOIRE 🚨🚨🚨`);
  lines.push(`⛔ Tu NE PEUX PAS soumettre un bloc sans avoir PRODUIT le tableau ci-dessous dans ta réponse.`);
  lines.push(`Ce tableau DOIT apparaître à la FIN de CHAQUE BLOC de semaines, AVANT le séparateur "---".`);
  lines.push(``);
  lines.push(`### FORMAT OBLIGATOIRE DU TABLEAU DE VÉRIFICATION :`);
  lines.push(`\`\`\``);
  lines.push(`📊 VÉRIFICATION RATIOS — Bloc [N] (Semaines X à Y)`);
  lines.push(`| Discipline | Minutes totales | % du total | Cible TFCL™ | ✅/❌ |`);
  lines.push(`|------------|----------------|------------|-------------|-------|`);
  if (ref.swimPct && ref.bikePct && ref.runPct) {
    lines.push(`| 🏊 Natation | [NNN] min | [XX]% | ${ref.swimPct[0]}-${ref.swimPct[1]}% | ✅/❌ |`);
    lines.push(`| 🚴 Vélo    | [NNN] min | [XX]% | ${ref.bikePct[0]}-${ref.bikePct[1]}% | ✅/❌ |`);
    lines.push(`| 🏃 Course  | [NNN] min | [XX]% | ${ref.runPct[0]}-${ref.runPct[1]}% | ✅/❌ |`);
  }
  lines.push(`| TOTAL      | [NNN] min | 100% |             |       |`);
  lines.push(`\`\`\``);
  lines.push(``);
  lines.push(`### RÈGLES D'APPLICATION :`);
  lines.push(`1. **CALCULE RÉELLEMENT** les minutes en additionnant CHAQUE séance du bloc (ne devine pas, compte).`);
  lines.push(`2. **Si un ratio est ❌** : tu DOIS réécrire les semaines concernées AVANT de soumettre le bloc.`);
  lines.push(`3. **Tolérance maximale** : ±3% par rapport à la fourchette cible. Au-delà = rejet.`);
  if (ref.swimPct && ref.bikePct && ref.runPct) {
    lines.push(`4. **Seuils de rejet automatique** :`);
    lines.push(`   - Natation > ${ref.swimPct[1] + 3}% → REJETÉ (erreur la plus fréquente)`);
    lines.push(`   - Vélo < ${ref.bikePct[0] - 3}% → REJETÉ (le vélo est le sport DOMINANT)`);
    lines.push(`   - Course < ${ref.runPct[0] - 3}% → REJETÉ (la course est le 2e sport en volume)`);
    lines.push(`   - Natation > Course → REJETÉ (la natation ne doit JAMAIS dépasser la course en triathlon)`);
  }
  lines.push(`5. **Si le limiteur justifie un écart** : CITE le limiteur et la raison dans la colonne "✅/❌" avec "⚠️ Justifié par [limiteur]".`);
  lines.push(`6. **Hiérarchie stricte (triathlon)** : Vélo > Course > Natation. Cette hiérarchie est INVIOLABLE.`);
  lines.push(``);
  lines.push(`### PROCÉDURE EN CAS DE ❌ :`);
  lines.push(`- Natation trop haute → REMPLACE 1-2 séances natation par du vélo Z2 ou de la course EF`);
  lines.push(`- Vélo trop bas → AJOUTE du volume vélo Z2 (SL vélo, Z2 vallonné, commute training)`);
  lines.push(`- Course trop basse → AJOUTE du volume course (EF, fartlek, SL progressive)`);
  lines.push(`- Ne jamais "tricher" en gonflant artificiellement les durées d'une discipline`);

  return lines.join("\n");
}

// === FIX M3: Extract keywords from a limiter name for session matching ===
// AUDIT 2026-04-04: VLamax keywords were INVERTED (sprint/force = increases VLamax).
// Fixed: VLamax REDUCTION keywords = train low, Z2 long, glycolytique suppression.
// Keywords are now MUTUALLY EXCLUSIVE to avoid cross-limiter false positives.
export function extractLimiterKeywords(limiterName: string): string[] {
  const kw: string[] = [];
  const l = limiterName.toLowerCase();
  // VLamax (reduction) = glycolytic suppression, NOT sprint/force (which INCREASE VLamax)
  if (/vlamax/i.test(l)) kw.push("vlamax", "train low", "glycoly", "z2 long", "endurance fond", "aérobie pur", "jeun", "seuil long", "threshold long", "sfr", "force basse cadence", "low cadence");
  if (/tte|time.to.exhaust/i.test(l)) kw.push("tte", "seuil continu", "norvégi", "mlss", "tempo long", "threshold long");
  if (/durabilit/i.test(l)) kw.push("durabilit", "sortie longue", "long run", "brick", "finish rapide", "simulation");
  if (/fatmax|lipid|fat.ox/i.test(l)) kw.push("fatmax", "fat max", "lipid", "oxydation", "glycogène", "gut training");
  if (/econom|running.econ/i.test(l)) kw.push("économie", "cadence", "technique", "gammes", "foulée", "strides", "côte", "sfr");
  if (/ftp|puissance.seuil/i.test(l)) kw.push("ftp", "sweet spot", "over-under", "threshold power", "seuil puissance");
  if (/vo2|vo2max|pma/i.test(l)) kw.push("vo2", "pma", "interval", "30/30", "billat", "hiit");
  if (/vma/i.test(l)) kw.push("vma", "interval", "fractionné", "30/30", "piste", "billat");
  if (/force|renfo/i.test(l)) kw.push("force", "renfo", "muscul", "côte", "sfr", "rønnestad");
  if (/natation|swim|css/i.test(l)) kw.push("natation", "swim", "css", "crawl", "pull");
  if (/sprint|pmax|neuro/i.test(l)) kw.push("sprint", "pmax", "neuro", "explo", "plyo", "force max");
  if (kw.length === 0) {
    kw.push(...l.split(/[\s/,()]+/).filter(w => w.length > 3));
  }
  return kw;
}
