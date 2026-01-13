// =============================================
// TYPES POUR TESTS VLAMAX MULTI-SPORT SCIENTIFIQUE
// =============================================

export interface TestResultat {
  puissanceMax?: number;      // W - pour test sprint vélo
  puissanceMoyenne?: number;  // W - pour Wingate
  puissance5s?: number;       // W - pour test 5s
  ftp?: number;               // W - pour calcul ratio
  vitesse?: number;           // km/h - pour test course
  vitesseMoyenne?: number;    // km/h - pour intervalles
  temps?: number;             // secondes - durée
  distance?: number;          // mètres - pour natation/course
  lactatePic?: number;        // mmol/L - mesure labo
  // Tests VLamax CAP avancés
  distSprint1?: number;       // m - distance sprint 1 (15s)
  distSprint2?: number;       // m - distance sprint 2 (15s)
  dist12min?: number;         // m - distance 12 min
  powerSprint1?: number;      // W/kg - puissance sprint 1
  powerSprint2?: number;      // W/kg - puissance sprint 2
  power12min?: number;        // W/kg - puissance 12 min
}

export interface TestVLamax {
  id: string;
  nom: string;
  sport: "vélo" | "course" | "natation";
  date: string;
  resultat: TestResultat;
  vlamax: number;
  notes?: string;
}

export interface TestProtocoleVLamax {
  id: string;
  nom: string;
  sport: "vélo" | "course" | "natation";
  protocole: string;
  duree: string;
  difficulte: "Facile" | "Modéré" | "Difficile";
  champsRequis: (keyof TestResultat)[];
  calcVLamax: (resultat: TestResultat) => number;
}

// Liste des tests SCIENTIFIQUES multi-sport
export const testsVLamaxDisponibles: TestProtocoleVLamax[] = [
  // ===== VÉLO =====
  {
    id: "sprint-5-10s-velo",
    nom: "Sprint 5-10s Vélo",
    sport: "vélo",
    protocole: "Sprint maximal de 5-10 secondes sur vélo, répéter 3 fois avec récupération complète. Mesurer puissance maximale.",
    duree: "20 min",
    difficulte: "Modéré",
    champsRequis: ["puissanceMax"],
    calcVLamax: (r) => {
      if (!r.puissanceMax) return 0.35;
      return Math.min(0.7, Math.max(0.2, r.puissanceMax / 2000));
    }
  },
  {
    id: "wingate-30s",
    nom: "Sprint 30s Wingate",
    sport: "vélo",
    protocole: "30 secondes de sprint maximal sur ergocycle. Mesurer puissance maximale et moyenne. Utiliser formule Monod & Scherrer pour VLamax.",
    duree: "15 min",
    difficulte: "Difficile",
    champsRequis: ["puissanceMax", "puissanceMoyenne"],
    calcVLamax: (r) => {
      if (!r.puissanceMoyenne) return 0.35;
      const fatigue = r.puissanceMax && r.puissanceMoyenne ? (r.puissanceMax - r.puissanceMoyenne) / r.puissanceMax : 0.3;
      return Math.min(0.7, Math.max(0.2, 0.25 + fatigue * 0.5 + (r.puissanceMoyenne / 1500) * 0.2));
    }
  },
  {
    id: "sprint-ftp-velo",
    nom: "Sprint + FTP Vélo",
    sport: "vélo",
    protocole: "5 secondes de sprint maximal suivi d'une évaluation FTP. Calcul VLamax = puissance sprint / FTP selon Two For Coaching Lab™.",
    duree: "45 min",
    difficulte: "Difficile",
    champsRequis: ["puissance5s", "ftp"],
    calcVLamax: (r) => {
      if (!r.puissance5s || !r.ftp) return 0.35;
      const ratio = r.puissance5s / r.ftp;
      return Math.min(0.7, Math.max(0.2, 0.15 + (ratio - 3) * 0.1));
    }
  },
  {
    id: "test-lactate-velo",
    nom: "Test Lactate Labo Vélo",
    sport: "vélo",
    protocole: "Test progressif en laboratoire avec prélèvements sanguins. Mesurer pic de lactate après effort maximal.",
    duree: "60 min",
    difficulte: "Difficile",
    champsRequis: ["lactatePic", "puissanceMax"],
    calcVLamax: (r) => {
      if (!r.lactatePic) return 0.35;
      return Math.min(0.7, Math.max(0.2, r.lactatePic / 20));
    }
  },

  // ===== COURSE =====
  {
    id: "tte-course",
    nom: "TTE Course",
    sport: "course",
    protocole: "Courir à intensité maximale jusqu'à épuisement. Mesurer vitesse et durée totale.",
    duree: "Variable",
    difficulte: "Difficile",
    champsRequis: ["vitesse", "temps"],
    calcVLamax: (r) => {
      if (!r.vitesse || !r.temps) return 0.35;
      const minutes = r.temps / 60;
      return Math.min(0.7, Math.max(0.2, 0.5 - (minutes / 100) + (r.vitesse / 50)));
    }
  },
  {
    id: "sprint-30-50m",
    nom: "Sprint 30-50m Course",
    sport: "course",
    protocole: "Sprint maximal sur 30-50 mètres. Mesurer distance et temps pour calculer vitesse maximale.",
    duree: "10 min",
    difficulte: "Facile",
    champsRequis: ["distance", "temps"],
    calcVLamax: (r) => {
      if (!r.distance || !r.temps) return 0.35;
      const vitesse = r.distance / r.temps;
      return Math.min(0.7, Math.max(0.2, 0.2 + vitesse * 0.05));
    }
  },
  {
    id: "intervalle-4x400",
    nom: "Intervalle 4x400m Course",
    sport: "course",
    protocole: "4x400m à intensité maximale avec 2-3 min repos. Mesurer vitesse moyenne et temps total.",
    duree: "25 min",
    difficulte: "Modéré",
    champsRequis: ["vitesseMoyenne", "temps"],
    calcVLamax: (r) => {
      if (!r.vitesseMoyenne || !r.temps) return 0.35;
      return Math.min(0.7, Math.max(0.2, 0.2 + (r.vitesseMoyenne / 25) - (r.temps / 1000)));
    }
  },
  {
    id: "test-vma",
    nom: "Test VMA (Vameval)",
    sport: "course",
    protocole: "Test progressif jusqu'à épuisement. Paliers de 0.5 km/h toutes les minutes.",
    duree: "15-25 min",
    difficulte: "Difficile",
    champsRequis: ["vitesse"],
    calcVLamax: (r) => {
      if (!r.vitesse) return 0.35;
      return Math.min(0.7, Math.max(0.2, 0.15 + (r.vitesse / 40)));
    }
  },

  // ===== TESTS VLAMAX CAP AVANCÉS (avec interface dédiée) =====
  {
    id: "run_vlamax_sprint15_12min",
    nom: "VLamax CAP – Sprint 15s + 12 min",
    sport: "course",
    protocole: "2 × 15s sprint all-out + 12 min all-out. Estimation VLamax via Sprint Ratio (SR = V15/V12). Test terrain officiel.",
    duree: "45 min",
    difficulte: "Difficile",
    champsRequis: ["distSprint1", "distSprint2", "dist12min"],
    calcVLamax: (r) => {
      const d1 = r.distSprint1 || 0;
      const d2 = r.distSprint2 || 0;
      const d12 = r.dist12min || 0;
      if (!d1 || !d2 || !d12) return 0.35;
      
      const bestD15 = Math.max(d1, d2);
      const v15 = bestD15 / 15;
      const v12 = d12 / 720;
      const srRun = v15 / v12;
      
      const normalized = Math.max(0, Math.min(1, (srRun - 1.55) / 0.35));
      let vlamax = 0.25 + 0.55 * normalized;
      return Math.max(0.25, Math.min(0.95, vlamax));
    }
  },
  {
    id: "run_vlamax_power_advanced",
    nom: "VLamax CAP – Test Puissance (Advanced)",
    sport: "course",
    protocole: "2 × 15s sprint + 12 min all-out avec puissance (Stryd/Garmin). Calcul VLamax via modèle Mader/Heck.",
    duree: "45 min",
    difficulte: "Difficile",
    champsRequis: ["powerSprint1", "powerSprint2", "power12min"],
    calcVLamax: (r) => {
      const p1 = r.powerSprint1 || 0;
      const p2 = r.powerSprint2 || 0;
      const p12 = r.power12min || 0;
      if (!p1 || !p2 || !p12) return 0.35;
      
      const p15 = Math.max(p1, p2);
      const pgly = p15 - (0.25 * p12);
      const tgly = 9;
      const egly = pgly * tgly;
      const lactate = egly / 65;
      let vlamax = lactate / tgly;
      
      return Math.max(0.20, Math.min(1.00, vlamax));
    }
  },

  // ===== NATATION =====
  {
    id: "sprint-25-50m-nat",
    nom: "Sprint Natation 25-50m",
    sport: "natation",
    protocole: "Sprint maximal de 25 à 50m crawl. Mesurer distance et temps pour calculer vitesse maximale.",
    duree: "5 min",
    difficulte: "Facile",
    champsRequis: ["distance", "temps"],
    calcVLamax: (r) => {
      if (!r.temps || !r.distance) return 0.35;
      const vitesse = r.distance / r.temps;
      return Math.min(0.7, Math.max(0.2, 0.2 + vitesse * 0.3));
    }
  },
  {
    id: "test-200m-nat",
    nom: "Test 200m Natation Max",
    sport: "natation",
    protocole: "Nager 200m à intensité maximale en crawl. Mesurer temps total et vitesse moyenne.",
    duree: "10 min",
    difficulte: "Modéré",
    champsRequis: ["temps"],
    calcVLamax: (r) => {
      if (!r.temps) return 0.35;
      const vitesse = 200 / r.temps;
      return Math.min(0.7, Math.max(0.2, 0.25 + vitesse * 0.25));
    }
  },
  {
    id: "test-4x50m-lactate",
    nom: "Test 4x50m Lactate Natation",
    sport: "natation",
    protocole: "4x50m à intensité croissante avec prélèvements lactate. Mesurer vitesse moyenne et lactate post-série.",
    duree: "20 min",
    difficulte: "Difficile",
    champsRequis: ["vitesseMoyenne", "lactatePic"],
    calcVLamax: (r) => {
      if (!r.vitesseMoyenne) return 0.35;
      const lactateFactor = r.lactatePic ? r.lactatePic / 15 : 0.3;
      return Math.min(0.7, Math.max(0.2, 0.2 + (r.vitesseMoyenne * 0.15) + lactateFactor * 0.2));
    }
  }
];

// Calculer VLamax moyen depuis tous les tests
export const calculerVLamaxMoyenTests = (tests: TestVLamax[]): number => {
  if (!tests || tests.length === 0) return 0;
  const sum = tests.reduce((acc, t) => acc + t.vlamax, 0);
  return sum / tests.length;
};

// Calculer VLamax moyen par sport
export const calculerVLamaxParSport = (tests: TestVLamax[]): Record<string, number> => {
  const result: Record<string, { sum: number; count: number }> = {};
  
  tests.forEach(t => {
    if (!result[t.sport]) {
      result[t.sport] = { sum: 0, count: 0 };
    }
    result[t.sport].sum += t.vlamax;
    result[t.sport].count += 1;
  });

  const averages: Record<string, number> = {};
  Object.entries(result).forEach(([sport, data]) => {
    averages[sport] = data.sum / data.count;
  });

  return averages;
};

// Obtenir le test le plus récent
export const getDernierTest = (tests: TestVLamax[]): TestVLamax | null => {
  if (!tests || tests.length === 0) return null;
  return tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

// Filtrer tests par sport
export const getTestsParSport = (tests: TestVLamax[], sport: "vélo" | "course" | "natation"): TestVLamax[] => {
  return tests.filter(t => t.sport === sport);
};
