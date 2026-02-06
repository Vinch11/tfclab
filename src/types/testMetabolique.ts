export interface SprintRepete {
  puissance: number;
  temps?: number;
}

export interface TestMetabolique {
  id: string;
  date: string;
  pmax_5s: number;        // Puissance maximale 5 secondes (W)
  cp: number;             // Critical Power / FTP (W)
  tte: number;            // Time to Exhaustion (secondes)
  cadence?: number;       // RPM
  sprint_repetes?: SprintRepete[]; // Sprints répétés
  // Computed/Optional fields
  athleteId?: string;
  notes?: string;
  type?: "ramp" | "20min" | "lactate" | "sprint" | "other";
  conditions?: string;
  createdAt?: string;
}

export const defaultTestMetabolique: TestMetabolique = {
  id: "",
  date: new Date().toISOString().split("T")[0],
  pmax_5s: 0,
  cp: 0,
  tte: 0,
  cadence: 0,
  sprint_repetes: [],
};

// Helper to compute VLamax estimate from test data
export const estimateVLamaxFromTest = (test: TestMetabolique, poids: number): number => {
  if (!test.pmax_5s || !test.cp || !poids) return 0;
  
  const peakWkg = test.pmax_5s / poids;
  const cpWkg = test.cp / poids;
  const anaerobicRatio = peakWkg / cpWkg;
  
  // Interpolation continue: ratio 2.0 → 0.22, ratio 3.0 → 0.37, ratio 4.0 → 0.52
  const estimatedVlamax = 0.22 + (anaerobicRatio - 2.0) * 0.15;
  return Math.max(0.15, Math.min(0.85, Math.round(estimatedVlamax * 100) / 100));
};

// Helper to format TTE
export const formatTTE = (seconds: number): string => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Helper to compute W' (anaerobic work capacity)
export const computeWPrime = (test: TestMetabolique): number => {
  if (!test.cp || !test.tte || !test.pmax_5s) return 0;
  // Simplified W' estimation: W' ≈ (Pmax - CP) * TTE_at_Pmax
  return Math.round((test.pmax_5s - test.cp) * 5);
};
