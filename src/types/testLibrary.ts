// =============================================
// BIBLIOTHÈQUE DE TESTS - Avec conversion standardisée VLamax
// =============================================

import { Athlete, AthleteRefs } from "./athlete";

// Variable d'entrée pour un test
export interface TestVariable {
  key: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
}

// Résultat standardisé d'un test
export interface StandardTestResult {
  vlamax: number | null;
  raw: Record<string, number>;
  note: string;
}

// Résultat de test stocké sur l'athlète
export interface StoredTestResult {
  id: string;
  nom: string;
  sport: string;
  date: string;
  fiabilite: number;
  vlamax: number | null;
  raw: Record<string, number>;
  note: string;
  source: "library" | "manual";
  notes?: string;
}

// Définition d'un protocole de test
export interface TestProtocol {
  id: string;
  sport: "Cyclisme" | "Course à pied" | "Natation" | "Multi-sport";
  nom: string;
  objectif: string;
  variables: TestVariable[];
  protocole: string[];
  calcul: string;
  fiabilite: number;
  commentaire: string;
  // Fonction de conversion des inputs vers VLamax standardisé
  toStandardResult: (athlete: Athlete, input: Record<string, string | number>, refs?: AthleteRefs) => StandardTestResult;
}

// Cibles VLamax par objectif
export const CiblesVLamax = {
  IM: { min: 0.30, max: 0.60, optimal: 0.45 },
  "703": { min: 0.40, max: 0.70, optimal: 0.55 },
  Marathon: { min: 0.25, max: 0.50, optimal: 0.35 },
  Semi: { min: 0.35, max: 0.60, optimal: 0.45 }
};

// Bibliothèque complète des tests avec conversion VLamax
export const TestLibrary: TestProtocol[] = [
  {
    id: "bike_sprint_10s",
    sport: "Cyclisme",
    nom: "Sprint maximal 5–10 s",
    objectif: "Estimation VLamax (débit glycolytique) via puissance max",
    variables: [{ key: "pmax", label: "Puissance max (W)", unit: "W", min: 100, max: 2500 }],
    protocole: [
      "Échauffement 20 min progressif",
      "1 à 2 sprints maximaux de 5–10 s",
      "Récupération complète 5 min",
      "Capteur de puissance obligatoire"
    ],
    calcul: "VLamax ≈ Pmax / 1000",
    fiabilite: 0.90,
    commentaire: "Très bon indicateur terrain de la capacité anaérobie.",
    toStandardResult: (athlete, input) => {
      const p = Number(input.pmax);
      if (!p || p <= 0) return { vlamax: null, raw: { pmax: p || 0 }, note: "Valeur invalide" };
      const vlamax = p / 1000;
      return { vlamax, raw: { pmax: p }, note: "Proxy VLamax via Pmax/1000" };
    }
  },
  {
    id: "bike_wingate",
    sport: "Cyclisme",
    nom: "Wingate 30 s",
    objectif: "Capacité anaérobie + proxy VLamax via puissance moyenne",
    variables: [{ key: "pmean30", label: "Puissance moyenne 30 s (W)", unit: "W", min: 50, max: 1500 }],
    protocole: [
      "Échauffement 20–25 min",
      "Sprint maximal 30 s",
      "Résistance constante",
      "Repos complet après le test"
    ],
    calcul: "VLamax ≈ Pmoy30 / 1000",
    fiabilite: 0.75,
    commentaire: "Plus fatigant, à éviter en période chargée.",
    toStandardResult: (athlete, input) => {
      const p = Number(input.pmean30);
      if (!p || p <= 0) return { vlamax: null, raw: { pmean30: p || 0 }, note: "Valeur invalide" };
      const vlamax = p / 1000;
      return { vlamax, raw: { pmean30: p }, note: "Proxy VLamax via Pmoy30/1000" };
    }
  },
  {
    id: "bike_sprint_ftp",
    sport: "Cyclisme",
    nom: "Sprint + FTP",
    objectif: "Proxy VLamax via ratio sprint/FTP",
    variables: [
      { key: "p5", label: "Puissance 5 s (W)", unit: "W", min: 100, max: 2500 },
      { key: "ftp", label: "FTP (W)", unit: "W", min: 50, max: 600 }
    ],
    protocole: [
      "Échauffement 20 min progressif",
      "Sprint maximal 5 s (noter puissance pic)",
      "Test FTP ou valeur connue"
    ],
    calcul: "VLamax ≈ P5 / FTP (ratio)",
    fiabilite: 0.50,
    commentaire: "Estimation grossière, combiner avec d'autres tests.",
    toStandardResult: (athlete, input) => {
      const p5 = Number(input.p5);
      const ftp = Number(input.ftp);
      if (!p5 || !ftp || ftp <= 0) return { vlamax: null, raw: { p5: p5 || 0, ftp: ftp || 0 }, note: "Valeurs invalides" };
      const vlamax = p5 / ftp;
      return { vlamax, raw: { p5, ftp }, note: "Proxy VLamax via P5/FTP" };
    }
  },
  {
    id: "bike_ftp",
    sport: "Cyclisme",
    nom: "Test FTP 20 min",
    objectif: "Estimation FTP (seuil fonctionnel) - référence zones",
    variables: [{ key: "p20", label: "Puissance moyenne 20 min (W)", unit: "W", min: 50, max: 600 }],
    protocole: [
      "Échauffement 20 min avec accélérations",
      "5 min à bloc pour purger l'anaérobie",
      "Récupération 10 min",
      "20 min à fond régulier",
      "FTP = 95% de la puissance moyenne"
    ],
    calcul: "FTP = P20 × 0.95",
    fiabilite: 0.85,
    commentaire: "Test classique, bon indicateur du seuil.",
    toStandardResult: (athlete, input, refs) => {
      const p20 = Number(input.p20);
      if (!p20 || p20 <= 0) return { vlamax: null, raw: { p20: p20 || 0 }, note: "Valeur invalide" };
      const ftp = Math.round(p20 * 0.95);
      // Stocker FTP dans refs si disponible
      if (refs) refs.ftp = ftp;
      return { vlamax: null, raw: { p20, ftp_calc: ftp }, note: `FTP estimé: ${ftp} W (stocké dans références)` };
    }
  },
  {
    id: "run_sprint_40m",
    sport: "Course à pied",
    nom: "Sprint 30–50 m",
    objectif: "Proxy VLamax course via vitesse max",
    variables: [
      { key: "dist", label: "Distance (m)", unit: "m", min: 20, max: 100 },
      { key: "time", label: "Temps (s)", unit: "s", min: 2, max: 20 }
    ],
    protocole: [
      "Échauffement complet",
      "Sprint départ arrêté ou lancé",
      "Chronométrage précis",
      "2–3 essais max"
    ],
    calcul: "VLamax ≈ (m/s) / 10",
    fiabilite: 0.70,
    commentaire: "Sensibilité à la technique de course.",
    toStandardResult: (athlete, input) => {
      const d = Number(input.dist);
      const t = Number(input.time);
      if (!d || !t || t <= 0) return { vlamax: null, raw: { dist: d || 0, time: t || 0 }, note: "Valeurs invalides" };
      const vms = d / t;
      const vlamax = vms / 10;
      return { vlamax, raw: { dist: d, time: t, vms }, note: "Proxy VLamax via (m/s)/10" };
    }
  },
  {
    id: "run_vma",
    sport: "Course à pied",
    nom: "Test VMA (Vameval / 6 min)",
    objectif: "Estimation VO2max / VMA - référence zones",
    variables: [{ key: "vma", label: "VMA (km/h)", unit: "km/h", min: 8, max: 28 }],
    protocole: [
      "Test progressif ou test 6 min",
      "Dernier palier tenu = VMA"
    ],
    calcul: "VO2max ≈ VMA × 3.5",
    fiabilite: 0.80,
    commentaire: "Base indispensable pour zones et planification.",
    toStandardResult: (athlete, input, refs) => {
      const vma = Number(input.vma);
      if (!vma || vma <= 0) return { vlamax: null, raw: { vma: vma || 0 }, note: "Valeur invalide" };
      // Stocker VMA dans refs
      if (refs) refs.vma = vma;
      const vo2_est = vma * 3.5;
      return { vlamax: null, raw: { vma, vo2_est }, note: `VMA stockée + VO2max estimé: ${vo2_est.toFixed(1)} mL/kg/min` };
    }
  },
  {
    id: "run_cooper",
    sport: "Course à pied",
    nom: "Test Cooper 12 min",
    objectif: "Estimation VO2max",
    variables: [{ key: "distance", label: "Distance parcourue (m)", unit: "m", min: 1000, max: 4500 }],
    protocole: [
      "Échauffement léger 10 min",
      "Courir à allure régulière pendant 12 min",
      "Mesurer la distance totale"
    ],
    calcul: "VO2max = (Distance - 504.9) / 44.73",
    fiabilite: 0.75,
    commentaire: "Simple mais moins précis que VMA.",
    toStandardResult: (athlete, input) => {
      const dist = Number(input.distance);
      if (!dist || dist <= 0) return { vlamax: null, raw: { distance: dist || 0 }, note: "Valeur invalide" };
      const vo2max = (dist - 504.9) / 44.73;
      return { vlamax: null, raw: { distance: dist, vo2max_est: Math.round(vo2max * 10) / 10 }, note: `VO2max estimé: ${vo2max.toFixed(1)} mL/kg/min` };
    }
  },
  {
    id: "swim_200m",
    sport: "Natation",
    nom: "Test 200 m nage libre",
    objectif: "Estimation VLamax / capacité anaérobie natation",
    variables: [{ key: "time200", label: "Temps 200 m (sec)", unit: "s", min: 90, max: 400 }],
    protocole: [
      "Échauffement 15–20 min",
      "200 m à intensité maximale",
      "Chronométrage précis"
    ],
    calcul: "VLamax ≈ vitesse (m/s) / 3",
    fiabilite: 0.70,
    commentaire: "Très dépendant de la technique.",
    toStandardResult: (athlete, input) => {
      const t = Number(input.time200);
      if (!t || t <= 0) return { vlamax: null, raw: { time200: t || 0 }, note: "Valeur invalide" };
      const vms = 200 / t;
      const vlamax = vms / 3;
      return { vlamax, raw: { time200: t, vms }, note: "Proxy VLamax natation via vitesse/3" };
    }
  },
  {
    id: "swim_css",
    sport: "Natation",
    nom: "Test CSS (Critical Swim Speed)",
    objectif: "Estimation seuil lactique natation - référence zones",
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
    fiabilite: 0.80,
    commentaire: "Excellent pour définir les zones natation.",
    toStandardResult: (athlete, input, refs) => {
      const t400 = Number(input.t400);
      const t200 = Number(input.t200);
      if (!t400 || !t200 || t400 <= t200) return { vlamax: null, raw: { t400: t400 || 0, t200: t200 || 0 }, note: "Valeurs invalides (T400 doit être > T200)" };
      const cssMs = 200 / (t400 - t200);
      const cssSec100 = 100 / cssMs;
      // Stocker CSS dans refs
      if (refs) refs.css = Math.round(cssSec100);
      return { vlamax: null, raw: { t400, t200, css_sec100: Math.round(cssSec100) }, note: `CSS: ${cssSec100.toFixed(1)} sec/100m (stocké)` };
    }
  },
  {
    id: "hr_max",
    sport: "Multi-sport",
    nom: "Test FCmax terrain",
    objectif: "Déterminer la fréquence cardiaque maximale - référence zones",
    variables: [{ key: "fcmax", label: "FC max (bpm)", unit: "bpm", min: 120, max: 240 }],
    protocole: [
      "Échauffement progressif 15-20 min",
      "3 × 3 min à intensité croissante (90%, 95%, 100%)",
      "Récupération 2 min entre chaque",
      "Sprint final 30s-1min",
      "Noter la FC max atteinte"
    ],
    calcul: "FCmax = valeur pic observée",
    fiabilite: 0.95,
    commentaire: "À faire en état de forme optimale.",
    toStandardResult: (athlete, input, refs) => {
      const fc = Number(input.fcmax);
      if (!fc || fc < 100) return { vlamax: null, raw: { fcmax: fc || 0 }, note: "Valeur invalide" };
      if (refs) refs.fcMax = fc;
      return { vlamax: null, raw: { fcmax: fc }, note: `FCmax: ${fc} bpm (stocké dans références)` };
    }
  }
];

// Récupérer un test par ID
export function getTestById(id: string): TestProtocol | undefined {
  return TestLibrary.find(t => t.id === id);
}

// Ajouter un résultat de test à un athlète
export function addTestResultToAthlete(
  athlete: Athlete,
  testDef: TestProtocol,
  input: Record<string, string | number>
): StoredTestResult {
  // Initialiser les tests si nécessaire
  if (!athlete.historique) athlete.historique = [];
  if (!athlete.refs) athlete.refs = { fcMax: null, vma: null, ftp: null, css: null };

  const result = testDef.toStandardResult(athlete, input, athlete.refs);

  const stored: StoredTestResult = {
    id: `${testDef.id}_${Date.now()}`,
    nom: testDef.nom,
    sport: testDef.sport,
    date: new Date().toISOString(),
    fiabilite: testDef.fiabilite,
    vlamax: result.vlamax,
    raw: result.raw,
    note: result.note,
    source: "library"
  };

  return stored;
}
