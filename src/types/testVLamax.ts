// =============================================
// TYPES POUR TESTS VLAMAX MULTI-SPORT
// =============================================

export interface TestResultat {
  puissanceMax?: number;      // W - pour test sprint vélo
  puissance5s?: number;       // W - pour test 5s
  ftp?: number;               // W - pour calcul ratio
  vitesse?: number;           // km/h - pour test course
  vitesseMoyenne?: number;    // km/h - pour intervalles
  temps?: number;             // secondes - durée
  distance?: number;          // mètres - pour natation
  lactatePic?: number;        // mmol/L - si mesure disponible
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

// Liste des tests disponibles MULTI-SPORT
export const testsVLamaxDisponibles: TestProtocoleVLamax[] = [
  // ===== VÉLO =====
  {
    id: "sprint-velo-10s",
    nom: "Sprint Vélo 10s",
    sport: "vélo",
    protocole: "Sprint maximal de 10 secondes sur vélo, répéter 3 fois avec 3 min repos. Mesurer puissance maximale.",
    duree: "20 min",
    difficulte: "Modéré",
    champsRequis: ["puissanceMax"],
    calcVLamax: (r) => {
      if (!r.puissanceMax) return 0.35;
      return Math.min(0.7, Math.max(0.2, r.puissanceMax / 2000));
    }
  },
  {
    id: "test-5s-ftp",
    nom: "FTP + Sprint 5s Vélo",
    sport: "vélo",
    protocole: "5 secondes de sprint maximal suivi d'une évaluation FTP pour calcul VLamax selon formule Dan Lorang.",
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
    protocole: "Test en laboratoire avec prélèvements sanguins pour mesurer le pic de lactate après effort maximal.",
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
    protocole: "Courir à intensité maximale jusqu'à épuisement. Mesurer vitesse et temps total.",
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
    id: "intervalle-4x1000",
    nom: "Intervalle 4x1000m Course",
    sport: "course",
    protocole: "4x1000m à intensité élevée avec 2 min repos. Mesurer vitesse moyenne et temps total.",
    duree: "25 min",
    difficulte: "Modéré",
    champsRequis: ["vitesseMoyenne", "temps"],
    calcVLamax: (r) => {
      if (!r.vitesseMoyenne || !r.temps) return 0.35;
      // Plus la vitesse est haute pour un temps court, plus VLamax est élevée
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
      // VMA haute = bonne capacité anaérobie
      return Math.min(0.7, Math.max(0.2, 0.15 + (r.vitesse / 40)));
    }
  },

  // ===== NATATION =====
  {
    id: "sprint-natation-50m",
    nom: "Sprint Natation 50m",
    sport: "natation",
    protocole: "Sprint maximal 50m crawl, mesurer temps. Départ plongé ou poussé.",
    duree: "5 min",
    difficulte: "Facile",
    champsRequis: ["distance", "temps"],
    calcVLamax: (r) => {
      if (!r.temps) return 0.35;
      // 50m - temps court = VLamax élevée
      const vitesse = 50 / (r.temps || 30);
      return Math.min(0.7, Math.max(0.2, 0.2 + vitesse * 0.3));
    }
  },
  {
    id: "test-200m-natation",
    nom: "Test 200m Natation Max",
    sport: "natation",
    protocole: "Nager 200m à intensité maximale en crawl. Mesurer temps total.",
    duree: "10 min",
    difficulte: "Modéré",
    champsRequis: ["distance", "temps"],
    calcVLamax: (r) => {
      if (!r.temps) return 0.35;
      // 200m - équilibre aérobie/anaérobie
      const vitesse = 200 / (r.temps || 150);
      return Math.min(0.7, Math.max(0.2, 0.25 + vitesse * 0.25));
    }
  },
  {
    id: "test-100m-natation",
    nom: "Test 100m Natation Sprint",
    sport: "natation",
    protocole: "Sprint 100m crawl à intensité maximale. Mesurer temps et vitesse.",
    duree: "5 min",
    difficulte: "Modéré",
    champsRequis: ["temps"],
    calcVLamax: (r) => {
      if (!r.temps) return 0.35;
      // 100m - bon indicateur VLamax
      const vitesse = 100 / (r.temps || 70);
      return Math.min(0.7, Math.max(0.2, 0.22 + vitesse * 0.28));
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
