import { Athlete, defaultAthlete } from "@/types/athlete";
import { TestMetabolique } from "@/types/testMetabolique";
import { calculVLamax, ResultatVLamax } from "@/types/resultatVLamax";

// Athlete with embedded tests
export interface AthleteWithTests extends Athlete {
  tests: TestMetabolique[];
}

// Storage key
const STORAGE_KEY = "loranglab-athletes-data";

// Create new athlete
export function creerAthlete(
  id: string,
  poids: number,
  objectif: "IM" | "703",
  sexe: "M" | "F",
  vo2max: number,
  masse_grasse: number,
  masse_musculaire: number,
  fc_max: number,
  fc_repos: number,
  hrv: number,
  sommeil: number,
  fatigue_subjective: number,
  ftp: number
): AthleteWithTests {
  return {
    id,
    poids,
    objectif,
    sexe,
    vo2max,
    masse_grasse,
    masse_musculaire,
    fc_max,
    fc_repos,
    hrv,
    sommeil,
    fatigue_subjective,
    ftp,
    tests: [],
  };
}

// Load all athletes from localStorage
export function chargerAthletes(): AthleteWithTests[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Erreur chargement athlètes:", e);
  }
  return [];
}

// Save all athletes to localStorage
export function sauvegarderAthletes(athletes: AthleteWithTests[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
}

// Add athlete to collection
export function ajouterAthlete(
  athletes: AthleteWithTests[],
  athlete: AthleteWithTests
): AthleteWithTests[] {
  return [...athletes, athlete];
}

// Remove athlete from collection
export function supprimerAthlete(
  athletes: AthleteWithTests[],
  athleteId: string
): AthleteWithTests[] {
  return athletes.filter((a) => a.id !== athleteId);
}

// Update athlete in collection
export function mettreAJourAthlete(
  athletes: AthleteWithTests[],
  updatedAthlete: AthleteWithTests
): AthleteWithTests[] {
  return athletes.map((a) =>
    a.id === updatedAthlete.id ? updatedAthlete : a
  );
}

// Add test to athlete
export function ajouterTest(
  athletes: AthleteWithTests[],
  athleteId: string,
  test: TestMetabolique
): AthleteWithTests[] {
  return athletes.map((a) => {
    if (a.id === athleteId) {
      return {
        ...a,
        tests: [...(a.tests || []), test],
      };
    }
    return a;
  });
}

// Remove test from athlete
export function supprimerTest(
  athletes: AthleteWithTests[],
  athleteId: string,
  testId: string
): AthleteWithTests[] {
  return athletes.map((a) => {
    if (a.id === athleteId) {
      return {
        ...a,
        tests: a.tests.filter((t) => t.id !== testId),
      };
    }
    return a;
  });
}

// Compare tests for an athlete
export interface ComparaisonTest {
  dateDebut: string;
  dateFin: string;
  deltaVlamax: number;
  deltaTte: number;
  deltaCp: number;
  deltaPmax: number;
}

export function comparerTests(athlete: AthleteWithTests): ComparaisonTest[] {
  if (!athlete.tests || athlete.tests.length < 2) {
    return [];
  }

  const testsTries = [...athlete.tests].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const comparaisons: ComparaisonTest[] = [];

  for (let i = 1; i < testsTries.length; i++) {
    const prev = testsTries[i - 1];
    const curr = testsTries[i];

    // Calculate VLamax for each test
    const prevVlamax = calculVLamax(prev, athlete.poids).vlamax;
    const currVlamax = calculVLamax(curr, athlete.poids).vlamax;

    comparaisons.push({
      dateDebut: prev.date,
      dateFin: curr.date,
      deltaVlamax: currVlamax - prevVlamax,
      deltaTte: (curr.tte || 0) - (prev.tte || 0),
      deltaCp: (curr.cp || 0) - (prev.cp || 0),
      deltaPmax: (curr.pmax_5s || 0) - (prev.pmax_5s || 0),
    });
  }

  return comparaisons;
}

// Get latest test for athlete
export function getDernierTest(
  athlete: AthleteWithTests
): TestMetabolique | null {
  if (!athlete.tests || athlete.tests.length === 0) {
    return null;
  }
  const testsTries = [...athlete.tests].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return testsTries[0];
}

// Get VLamax history for athlete
export function getHistoriqueVlamax(athlete: AthleteWithTests): number[] {
  if (!athlete.tests || athlete.tests.length === 0) {
    return [];
  }

  const testsTries = [...athlete.tests].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return testsTries.map((test) => calculVLamax(test, athlete.poids).vlamax);
}

// Create default athlete with example data
export function creerAthleteExemple(): AthleteWithTests {
  const athlete = creerAthlete(
    crypto.randomUUID(),
    70,
    "IM",
    "M",
    52,
    18,
    45,
    190,
    50,
    60,
    7,
    4,
    320
  );

  athlete.nom = "Exemple";
  athlete.prenom = "Athlète";

  // Add example tests
  athlete.tests = [
    {
      id: crypto.randomUUID(),
      date: "2025-01-15",
      pmax_5s: 1050,
      cp: 320,
      tte: 50 * 60,
      cadence: 95,
      sprint_repetes: [{ puissance: 1020 }, { puissance: 1010 }],
    },
    {
      id: crypto.randomUUID(),
      date: "2025-06-20",
      pmax_5s: 1070,
      cp: 330,
      tte: 52 * 60,
      cadence: 96,
      sprint_repetes: [{ puissance: 1040 }, { puissance: 1030 }],
    },
  ];

  return athlete;
}