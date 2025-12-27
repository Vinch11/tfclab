// =============================================
// TYPES POUR TESTS VLAMAX
// =============================================

export interface TestResultat {
  puissanceMax?: number;    // W - pour test 10s/30s
  puissance5s?: number;     // W - pour test 5s
  ftp?: number;             // W - pour calcul ratio
  vitesse?: number;         // km/h - pour test course
  temps?: number;           // secondes - durée TTE
  lactatePic?: number;      // mmol/L - si mesure disponible
}

export interface TestVLamax {
  id: string;
  nom: string;
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

// Liste des tests disponibles
export const testsVLamaxDisponibles: TestProtocoleVLamax[] = [
  {
    id: "test-10s-30s",
    nom: "Test 10s / 30s Vélo",
    sport: "vélo",
    protocole: "Sprint maximal de 10 secondes suivi de récupération, répéter 3 fois. Mesurer puissance maximale et moyenne.",
    duree: "20 min",
    difficulte: "Modéré",
    champsRequis: ["puissanceMax"],
    calcVLamax: (r) => {
      if (!r.puissanceMax) return 0.35;
      // Formule simplifiée: ratio puissance max sur 1000
      return Math.min(0.7, Math.max(0.2, r.puissanceMax / 2000));
    }
  },
  {
    id: "test-5s-ftp",
    nom: "Test 5s Vélo + FTP",
    sport: "vélo",
    protocole: "5 secondes de sprint maximal suivi d'une évaluation FTP pour calculer VLamax selon formule de Lorang.",
    duree: "45 min",
    difficulte: "Difficile",
    champsRequis: ["puissance5s", "ftp"],
    calcVLamax: (r) => {
      if (!r.puissance5s || !r.ftp) return 0.35;
      // Formule Dan Lorang simplifiée
      const ratio = r.puissance5s / r.ftp;
      return Math.min(0.7, Math.max(0.2, 0.15 + (ratio - 3) * 0.1));
    }
  },
  {
    id: "test-tte-course",
    nom: "Test TTE Course",
    sport: "course",
    protocole: "Courir à intensité maximale jusqu'à épuisement. Calculer VLamax avec vitesse et durée.",
    duree: "Variable",
    difficulte: "Difficile",
    champsRequis: ["vitesse", "temps"],
    calcVLamax: (r) => {
      if (!r.vitesse || !r.temps) return 0.35;
      // Plus le temps est court à haute vitesse, plus VLamax est élevée
      const minutes = r.temps / 60;
      return Math.min(0.7, Math.max(0.2, 0.5 - (minutes / 100) + (r.vitesse / 50)));
    }
  },
  {
    id: "test-lactate",
    nom: "Test Lactate Labo",
    sport: "vélo",
    protocole: "Test en laboratoire avec prélèvements sanguins pour mesurer le pic de lactate après effort maximal.",
    duree: "60 min",
    difficulte: "Difficile",
    champsRequis: ["lactatePic", "puissanceMax"],
    calcVLamax: (r) => {
      if (!r.lactatePic) return 0.35;
      // Conversion directe du lactate en VLamax
      return Math.min(0.7, Math.max(0.2, r.lactatePic / 20));
    }
  }
];

// Calculer VLamax moyen depuis tous les tests
export const calculerVLamaxMoyenTests = (tests: TestVLamax[]): number => {
  if (!tests || tests.length === 0) return 0;
  const sum = tests.reduce((acc, t) => acc + t.vlamax, 0);
  return sum / tests.length;
};

// Obtenir le test le plus récent
export const getDernierTest = (tests: TestVLamax[]): TestVLamax | null => {
  if (!tests || tests.length === 0) return null;
  return tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};
