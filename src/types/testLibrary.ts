// =============================================
// BIBLIOTHÈQUE DE TESTS - Option A
// VLAMAX = alimente VLamax pondérée + Confiance + SPM
// REF = alimente uniquement refs (VMA/FTP/FCmax/CSS) + VO2max
// =============================================

import { Athlete, AthleteRefs } from "./athlete";

// Type de test: VLAMAX (modèle) ou REF (références seulement)
export type TestType = "VLAMAX" | "REF";

// Variable d'entrée pour un test
export interface TestVariable {
  key: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
}

// Résultat standardisé d'un test
export type VLamaxTendance = "aerobie" | "mixte" | "glycolytique";

export interface StandardTestResult {
  ok: boolean;
  msg?: string;
  vlamax?: number | null;
  raw: Record<string, number>;
  note: string;
  // Estimation "tendance" (test indicatif, ex. Wingate) — pas une mesure
  tendance?: VLamaxTendance;
  vlamaxRange?: [number, number];
}

// Résultat de test stocké sur l'athlète
export interface StoredTestResult {
  id: string;
  type: TestType;
  nom: string;
  sport: string;
  date: string;
  fiabilite: number | null;
  vlamax: number | null;
  raw: Record<string, number>;
  note: string;
  source: "library" | "manual";
  notes?: string;
  tendance?: VLamaxTendance;
  vlamaxRange?: [number, number];
}

// Définition d'un protocole de test
export interface TestProtocol {
  id: string;
  type: TestType;
  sport: "Cyclisme" | "Course à pied" | "Natation" | "Multi-sport";
  nom: string;
  objectif: string;
  variables: TestVariable[];
  protocole: string[];
  calcul: string;
  fiabilite: number | null; // null pour REF (pas de fiabilité VLamax)
  commentaire: string;
  // Fonction de conversion des inputs
  compute: (athlete: Athlete, input: Record<string, string | number>, refs?: AthleteRefs) => StandardTestResult;
}

// Re-export CiblesVLamax from centralized source
export { CiblesVLamax } from "@/lib/physiologicalTargets";

// Bibliothèque complète des tests avec distinction VLAMAX / REF
export const TestLibrary: TestProtocol[] = [
  // =============================================
  // TESTS VLAMAX - Alimentent le modèle VLamax
  // =============================================
  // -------------------------------------------------------------
  // MARQUEUR COMPLÉMENTAIRE (REF) — Sprint 5–10 s vélo
  // Fenêtre 5–10 s = ATP-PCr (neuromusculaire), pas glycolytique.
  // Ne modifie plus la VLamax pondérée du profil.
  // -------------------------------------------------------------
  {
    id: "bike_sprint_10s",
    type: "REF",
    sport: "Cyclisme",
    nom: "Puissance neuromusculaire pic (5–10 s)",
    objectif: "Marqueur complémentaire — puissance pic ATP-PCr (pas d'estimation VLamax)",
    variables: [{ key: "pmax", label: "Puissance max (W)", unit: "W", min: 100, max: 2500 }],
    protocole: [
      "Échauffement 20 min progressif",
      "1 à 2 sprints maximaux de 5–10 s",
      "Récupération complète 5 min",
      "Capteur de puissance obligatoire"
    ],
    calcul: "Pmax observée (W) — marqueur ATP-PCr",
    fiabilite: null,
    commentaire: "Marqueur neuromusculaire. Ne modifie pas la VLamax (mauvaise filière).",
    compute: (_athlete, input) => {
      const p = Number(input.pmax);
      if (!p || p <= 0) return { ok: false, msg: "Puissance invalide", raw: { pmax: p || 0 }, note: "" };
      return { ok: true, vlamax: null, raw: { pmax: p }, note: `Pmax neuromusculaire: ${p} W (marqueur, pas VLamax)` };
    }
  },
  // -------------------------------------------------------------
  // Wingate 30 s — recalibré en TENDANCE, pas point précis
  // -------------------------------------------------------------
  {
    id: "bike_wingate",
    type: "VLAMAX",
    sport: "Cyclisme",
    nom: "Wingate 30 s (estimation indicative)",
    objectif: "Tendance métabolique glycolytique via ratio W/kg sur 30 s",
    variables: [
      { key: "pmean30", label: "Puissance moyenne 30 s (W)", unit: "W", min: 50, max: 1500 },
      { key: "weight", label: "Poids (kg) — optionnel si renseigné profil", unit: "kg", min: 30, max: 150 }
    ],
    protocole: [
      "Échauffement 20–25 min",
      "Sprint maximal 30 s",
      "Résistance constante",
      "Repos complet après le test"
    ],
    calcul: "Ratio Pmoy30/poids → tendance aérobie/mixte/glycolytique (fourchette VLamax indicative)",
    fiabilite: 0.35,
    commentaire: "Estimation indicative — donne une TENDANCE, pas une mesure précise. Pondérée faiblement dans le profil.",
    compute: (athlete, input) => {
      const p = Number(input.pmean30);
      const wIn = Number(input.weight);
      const lastSnap = athlete?.historique?.[athlete.historique.length - 1];
      const snapW = (lastSnap as any)?.poids;
      const w = wIn && wIn > 0 ? wIn : (snapW && snapW > 0 ? snapW : 0);
      if (!p || p <= 0) return { ok: false, msg: "Puissance invalide", raw: { pmean30: p || 0 }, note: "" };
      if (!w) return { ok: false, msg: "Poids athlète requis (profil ou champ)", raw: { pmean30: p, weight: 0 }, note: "" };

      const wkg = p / w;
      let tendance: VLamaxTendance;
      let range: [number, number];
      if (wkg < 5) { tendance = "aerobie"; range = [0.30, 0.40]; }
      else if (wkg < 7) { tendance = "mixte"; range = [0.40, 0.55]; }
      else { tendance = "glycolytique"; range = [0.55, 0.70]; }
      const vlamax = (range[0] + range[1]) / 2;

      return {
        ok: true,
        vlamax,
        tendance,
        vlamaxRange: range,
        raw: { pmean30: p, weight: w, wkg, vlamaxMin: range[0], vlamaxMax: range[1] },
        note: `Tendance ${tendance} (${wkg.toFixed(2)} W/kg) — VLamax indicative ${range[0].toFixed(2)}–${range[1].toFixed(2)}. Estimation indicative, pas mesure.`
      };
    }
  },
  // -------------------------------------------------------------
  // MARQUEUR COMPLÉMENTAIRE (REF) — 200 m nage libre
  // Effort majoritairement aérobie: pas d'estimation VLamax.
  // -------------------------------------------------------------
  {
    id: "swim_200m",
    type: "REF",
    sport: "Natation",
    nom: "Vitesse critique / capacité 200 m",
    objectif: "Marqueur complémentaire — capacité 200 m nage libre (pas d'estimation VLamax)",
    variables: [{ key: "time200", label: "Temps 200 m (sec)", unit: "s", min: 90, max: 400 }],
    protocole: [
      "Échauffement 15–20 min",
      "200 m à intensité maximale",
      "Chronométrage précis"
    ],
    calcul: "Vitesse moyenne 200 m (m/s) — marqueur aérobie",
    fiabilite: null,
    commentaire: "Marqueur aérobie natation. Ne modifie pas la VLamax (mauvaise filière).",
    compute: (_athlete, input) => {
      const t = Number(input.time200);
      if (!t || t <= 0) return { ok: false, msg: "Temps invalide", raw: { time200: t || 0 }, note: "" };
      const vms = 200 / t;
      return { ok: true, vlamax: null, raw: { time200: t, vms }, note: `Vitesse 200 m: ${vms.toFixed(2)} m/s (marqueur, pas VLamax)` };
    }
  },

  // =============================================
  // TESTS REF - Alimentent uniquement les références (zones)
  // Ne modifient PAS VLamax pondérée / Confiance / SPM
  // =============================================
  {
    id: "run_vma",
    type: "REF",
    sport: "Course à pied",
    nom: "Test VMA (Vameval / 6 min)",
    objectif: "Référence %VMA + VO2max estimée (zones course)",
    variables: [{ key: "vma", label: "VMA (km/h)", unit: "km/h", min: 8, max: 28 }],
    protocole: [
      "Test progressif ou test 6 min",
      "Dernier palier tenu = VMA"
    ],
    calcul: "VO2max ≈ VMA × 3.5",
    fiabilite: null,
    commentaire: "Base indispensable pour zones course. Ne modifie pas VLamax.",
    compute: (athlete, input, refs) => {
      const vma = Number(input.vma);
      if (!vma || vma <= 0) return { ok: false, msg: "VMA invalide", raw: { vma: vma || 0 }, note: "" };
      if (refs) refs.vma = vma;
      const vo2_est = vma * 3.5;
      if (!athlete.vo2max) athlete.vo2max = vo2_est;
      return { ok: true, vlamax: null, raw: { vma, vo2_est }, note: `VMA enregistrée + VO2max estimé: ${vo2_est.toFixed(1)}` };
    }
  },
  {
    id: "bike_ftp",
    type: "REF",
    sport: "Cyclisme",
    nom: "Test FTP 20 min",
    objectif: "Référence %FTP (zones puissance cyclisme)",
    variables: [{ key: "p20", label: "Puissance moyenne 20 min (W)", unit: "W", min: 50, max: 600 }],
    protocole: [
      "Échauffement 20 min avec accélérations",
      "5 min à bloc pour purger l'anaérobie",
      "Récupération 10 min",
      "20 min à fond régulier",
      "FTP = 95% de la puissance moyenne"
    ],
    calcul: "FTP = P20 × 0.95",
    fiabilite: null,
    commentaire: "Test classique pour zones puissance. Ne modifie pas VLamax.",
    compute: (athlete, input, refs) => {
      const p20 = Number(input.p20);
      if (!p20 || p20 <= 0) return { ok: false, msg: "Puissance invalide", raw: { p20: p20 || 0 }, note: "" };
      const ftp = Math.round(p20 * 0.95);
      if (refs) refs.ftp = ftp;
      return { ok: true, vlamax: null, raw: { p20, ftp_calc: ftp }, note: `FTP estimé: ${ftp} W (stocké dans références)` };
    }
  },
  {
    id: "hr_max",
    type: "REF",
    sport: "Multi-sport",
    nom: "Test FCmax terrain",
    objectif: "Référence %FCmax (zones cardiaques)",
    variables: [{ key: "fcmax", label: "FC max (bpm)", unit: "bpm", min: 120, max: 240 }],
    protocole: [
      "Échauffement progressif 15-20 min",
      "3 × 3 min à intensité croissante (90%, 95%, 100%)",
      "Récupération 2 min entre chaque",
      "Sprint final 30s-1min",
      "Noter la FC max atteinte"
    ],
    calcul: "FCmax = valeur pic observée",
    fiabilite: null,
    commentaire: "Référence pour zones cardiaques. Ne modifie pas VLamax.",
    compute: (athlete, input, refs) => {
      const fc = Number(input.fcmax);
      if (!fc || fc < 100) return { ok: false, msg: "FCmax invalide", raw: { fcmax: fc || 0 }, note: "" };
      if (refs) refs.fcMax = fc;
      return { ok: true, vlamax: null, raw: { fcmax: fc }, note: `FCmax: ${fc} bpm (stocké dans références)` };
    }
  },
  {
    id: "swim_css",
    type: "REF",
    sport: "Natation",
    nom: "Test CSS (Critical Swim Speed)",
    objectif: "Référence seuil lactique natation (zones natation)",
    variables: [
      { key: "t400", label: "Temps 400 m (sec)", unit: "s", min: 200, max: 900 },
      { key: "t200", label: "Temps 200 m (sec)", unit: "s", min: 100, max: 450 }
    ],
    protocole: [
      "Échauffement 15–20 min",
      "400 m à fond, repos 10 min",
      "200 m à fond"
    ],
    calcul: "CSS = (400-200) / (T400 - T200) en m/s → sec/100m",
    fiabilite: null,
    commentaire: "Excellent pour zones natation. Ne modifie pas VLamax.",
    compute: (athlete, input, refs) => {
      const t400 = Number(input.t400);
      const t200 = Number(input.t200);
      if (!t400 || !t200 || t400 <= t200) return { ok: false, msg: "Valeurs invalides (T400 > T200)", raw: { t400: t400 || 0, t200: t200 || 0 }, note: "" };
      const cssMs = 200 / (t400 - t200);
      const cssSec100 = 100 / cssMs;
      if (refs) refs.css = Math.round(cssSec100);
      return { ok: true, vlamax: null, raw: { t400, t200, css_sec100: Math.round(cssSec100) }, note: `CSS: ${cssSec100.toFixed(1)} sec/100m (stocké)` };
    }
  },
  {
    id: "run_cooper",
    type: "REF",
    sport: "Course à pied",
    nom: "Test Cooper 12 min",
    objectif: "Estimation VO2max (référence capacité aérobie)",
    variables: [{ key: "distance", label: "Distance parcourue (m)", unit: "m", min: 1000, max: 4500 }],
    protocole: [
      "Échauffement léger 10 min",
      "Courir à allure régulière pendant 12 min",
      "Mesurer la distance totale"
    ],
    calcul: "VO2max = (Distance - 504.9) / 44.73",
    fiabilite: null,
    commentaire: "Simple mais moins précis que VMA. Ne modifie pas VLamax.",
    compute: (athlete, input) => {
      const dist = Number(input.distance);
      if (!dist || dist <= 0) return { ok: false, msg: "Distance invalide", raw: { distance: dist || 0 }, note: "" };
      const vo2max = (dist - 504.9) / 44.73;
      if (!athlete.vo2max) athlete.vo2max = Math.round(vo2max * 10) / 10;
      return { ok: true, vlamax: null, raw: { distance: dist, vo2max_est: Math.round(vo2max * 10) / 10 }, note: `VO2max estimé: ${vo2max.toFixed(1)} mL/kg/min` };
    }
  },
  // =============================================
  // TEST VLAMAX CAP TERRAIN - Sprint 15s + 12 min
  // =============================================
  {
    id: "run_vlamax_sprint15_12min",
    type: "VLAMAX",
    sport: "Course à pied",
    nom: "VLamax rapide – Sprint 15s + 12 min (recommandé)",
    objectif: "Estimation VLamax course via sprint court (glycolytique) + effort 12 min (aérobie)",
    variables: [
      { key: "distSprint1", label: "Distance sprint 1 (m)", unit: "m", min: 30, max: 150 },
      { key: "distSprint2", label: "Distance sprint 2 (m)", unit: "m", min: 30, max: 150 },
      { key: "dist12min", label: "Distance 12 min (m)", unit: "m", min: 1000, max: 5000 }
    ],
    protocole: [
      "Échauffement 15–20 min Z2 + 4×20 s progressif",
      "2 × 15 s sprint all-out départ lancé (5–6 min récup)",
      "10–12 min récupération facile",
      "12 min all-out régulier",
      "Mesurer distances sprints et 12 min"
    ],
    calcul: "VLamax = 0.25 + 0.55 × clamp((SR - 1.55) / 0.35, 0, 1) où SR = V15 / V12",
    fiabilite: 0.80,
    commentaire: "Test terrain officiel Two For Coaching Lab. Reproductible et comparable.",
    compute: (athlete, input) => {
      const d1 = Number(input.distSprint1);
      const d2 = Number(input.distSprint2);
      const d12 = Number(input.dist12min);
      
      if (!d1 || !d2 || !d12 || d1 <= 0 || d2 <= 0 || d12 <= 0) {
        return { ok: false, msg: "Valeurs invalides", raw: { distSprint1: d1 || 0, distSprint2: d2 || 0, dist12min: d12 || 0 }, note: "" };
      }
      
      // Meilleure distance sur 15s
      const bestD15 = Math.max(d1, d2);
      const v15 = bestD15 / 15; // m/s
      const v12 = d12 / 720; // 12 min = 720 s
      
      // Sprint Ratio course
      const srRun = v15 / v12;
      
      // Formule VLamax_run
      const normalized = Math.max(0, Math.min(1, (srRun - 1.55) / 0.35));
      let vlamax = 0.25 + 0.55 * normalized;
      vlamax = Math.max(0.25, Math.min(0.95, vlamax));
      
      return { 
        ok: true, 
        vlamax, 
        raw: { distSprint1: d1, distSprint2: d2, dist12min: d12, v15, v12, srRun }, 
        note: `Sprint Ratio: ${srRun.toFixed(2)} | V15: ${v15.toFixed(2)} m/s | V12: ${v12.toFixed(2)} m/s` 
      };
    }
  },
  // =============================================
  // TEST VLAMAX CAP PUISSANCE (ADVANCED)
  // =============================================
  {
    id: "run_vlamax_power_advanced",
    type: "VLAMAX",
    sport: "Course à pied",
    nom: "VLamax CAP – Test Puissance (Advanced)",
    objectif: "Estimation VLamax course via puissance (méthode avancée staff-grade)",
    variables: [
      { key: "powerSprint1", label: "Puissance sprint 1 (W/kg)", unit: "W/kg", min: 2, max: 15 },
      { key: "powerSprint2", label: "Puissance sprint 2 (W/kg)", unit: "W/kg", min: 2, max: 15 },
      { key: "power12min", label: "Puissance 12 min (W/kg)", unit: "W/kg", min: 1, max: 10 }
    ],
    protocole: [
      "Échauffement 15–20 min Z2 + 3×20 s progressif",
      "2 × 15 s sprint all-out départ lancé (puissance max)",
      "5–6 min récup complète entre sprints",
      "10 min récupération facile",
      "12 min all-out régulier",
      "Relever puissance moyenne 15s et 12min"
    ],
    calcul: "Pgly = P15 − 0.25×P12 | Egly = Pgly × 9 | VLamax = (Egly/65) / 9",
    fiabilite: 0.90,
    commentaire: "Test avancé nécessitant puissance CAP (Stryd, Garmin, Coros). Plus précis que vitesse.",
    compute: (athlete, input) => {
      const p1 = Number(input.powerSprint1);
      const p2 = Number(input.powerSprint2);
      const p12 = Number(input.power12min);
      
      if (!p1 || !p2 || !p12 || p1 <= 0 || p2 <= 0 || p12 <= 0) {
        return { ok: false, msg: "Valeurs invalides", raw: { powerSprint1: p1 || 0, powerSprint2: p2 || 0, power12min: p12 || 0 }, note: "" };
      }
      
      // Meilleure puissance sur 15s
      const p15 = Math.max(p1, p2);
      
      // Constantes physiologiques
      const AEROBIC_CONTRIBUTION = 0.25;
      const ALACTIC_DELAY = 6;
      const LACTATE_ENERGY = 65;
      
      // Puissance glycolytique nette
      const pgly = p15 - (AEROBIC_CONTRIBUTION * p12);
      const tgly = 15 - ALACTIC_DELAY; // 9s
      
      // Énergie et VLamax
      const egly = pgly * tgly;
      const lactate = egly / LACTATE_ENERGY;
      let vlamax = lactate / tgly;
      vlamax = Math.max(0.20, Math.min(1.00, vlamax));
      
      return { 
        ok: true, 
        vlamax, 
        raw: { powerSprint1: p1, powerSprint2: p2, power12min: p12, p15, pgly, egly, lactate }, 
        note: `P15: ${p15.toFixed(2)} W/kg | P12: ${p12.toFixed(2)} W/kg | Pgly: ${pgly.toFixed(2)} W/kg` 
      };
    }
  }
];

// Récupérer un test par ID
export function getTestById(id: string): TestProtocol | undefined {
  return TestLibrary.find(t => t.id === id);
}

// Filtrer les tests par type
export function getVLamaxTestsOnly(tests: StoredTestResult[]): StoredTestResult[] {
  return tests.filter(t => t.type === "VLAMAX" && typeof t.vlamax === "number" && !isNaN(t.vlamax));
}

export function getRefTestsOnly(tests: StoredTestResult[]): StoredTestResult[] {
  return tests.filter(t => t.type === "REF");
}

// Ajouter un résultat de test à un athlète
export function addTestResultToAthlete(
  athlete: Athlete,
  testDef: TestProtocol,
  input: Record<string, string | number>
): { ok: boolean; msg?: string; entry?: StoredTestResult } {
  // Initialiser si nécessaire
  if (!athlete.tests) athlete.tests = [];
  if (!athlete.refs) athlete.refs = { fcMax: null, vma: null, ftp: null, css: null };

  const result = testDef.compute(athlete, input, athlete.refs);
  
  if (!result.ok) {
    return { ok: false, msg: result.msg || "Erreur lors du test" };
  }

  const stored: StoredTestResult = {
    id: `${testDef.id}_${Date.now()}`,
    type: testDef.type,
    nom: testDef.nom,
    sport: testDef.sport,
    date: new Date().toISOString(),
    fiabilite: testDef.type === "VLAMAX" ? (testDef.fiabilite ?? 0.5) : null,
    vlamax: testDef.type === "VLAMAX" ? (result.vlamax ?? null) : null,
    raw: result.raw,
    note: result.note,
    source: "library",
    tendance: result.tendance,
    vlamaxRange: result.vlamaxRange,
  };

  athlete.tests.push(stored);
  return { ok: true, entry: stored };
}
