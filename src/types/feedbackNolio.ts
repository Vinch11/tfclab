export type StabiliteType = "stable" | "instable";
export type EnergieType = "diesel" | "equilibre" | "explosif";

export interface FeedbackNolio {
  id: string;
  workoutId?: string;
  date: string;
  rpe: number;                // Rate of Perceived Exertion (1-10)
  stabilite: StabiliteType;   // Stability of effort
  energie: EnergieType;       // Energy profile during session
  // Additional optional fields
  fatigue?: number;           // Fatigue level (1-5)
  sommeil?: number;           // Sleep quality (1-5)
  stress?: number;            // Stress level (1-5)
  hydratation?: boolean;      // Was hydration adequate?
  nutrition?: boolean;        // Was nutrition adequate?
  notes?: string;             // Free text notes
  createdAt?: string;
}

export const defaultFeedbackNolio: FeedbackNolio = {
  id: "",
  date: new Date().toISOString().split("T")[0],
  rpe: 5,
  stabilite: "stable",
  energie: "equilibre",
};

// RPE descriptions
export const rpeDescriptions: Record<number, string> = {
  1: "Très très léger",
  2: "Très léger",
  3: "Léger",
  4: "Modéré léger",
  5: "Modéré",
  6: "Modéré dur",
  7: "Dur",
  8: "Très dur",
  9: "Très très dur",
  10: "Maximum",
};

// Get RPE color
export const getRpeColor = (rpe: number): string => {
  if (rpe <= 3) return "text-success";
  if (rpe <= 5) return "text-primary";
  if (rpe <= 7) return "text-warning";
  return "text-destructive";
};

// Get RPE background color
export const getRpeBgColor = (rpe: number): string => {
  if (rpe <= 3) return "bg-success";
  if (rpe <= 5) return "bg-primary";
  if (rpe <= 7) return "bg-warning";
  return "bg-destructive";
};

// Get energie label
export const getEnergieLabel = (energie: EnergieType): string => {
  switch (energie) {
    case "diesel": return "Diesel";
    case "equilibre": return "Équilibré";
    case "explosif": return "Explosif";
    default: return energie;
  }
};

// Get energie color
export const getEnergieColor = (energie: EnergieType): string => {
  switch (energie) {
    case "diesel": return "text-blue-400";
    case "equilibre": return "text-success";
    case "explosif": return "text-accent";
    default: return "text-muted-foreground";
  }
};

// Analyze feedback trends
export const analyzeFeedbackTrend = (feedbacks: FeedbackNolio[]): {
  avgRpe: number;
  stabilityScore: number;
  dominantEnergie: EnergieType;
  fatigueAlert: boolean;
} => {
  if (feedbacks.length === 0) {
    return {
      avgRpe: 0,
      stabilityScore: 100,
      dominantEnergie: "equilibre",
      fatigueAlert: false,
    };
  }

  const avgRpe = feedbacks.reduce((sum, f) => sum + f.rpe, 0) / feedbacks.length;
  const stableCount = feedbacks.filter((f) => f.stabilite === "stable").length;
  const stabilityScore = Math.round((stableCount / feedbacks.length) * 100);

  // Count energie types
  const energieCounts: Record<EnergieType, number> = {
    diesel: 0,
    equilibre: 0,
    explosif: 0,
  };
  feedbacks.forEach((f) => {
    energieCounts[f.energie]++;
  });
  const dominantEnergie = Object.entries(energieCounts).sort((a, b) => b[1] - a[1])[0][0] as EnergieType;

  // Check for fatigue alert (high RPE + instability in recent sessions)
  const recentFeedbacks = feedbacks.slice(0, 3);
  const recentAvgRpe = recentFeedbacks.reduce((sum, f) => sum + f.rpe, 0) / recentFeedbacks.length;
  const recentInstability = recentFeedbacks.filter((f) => f.stabilite === "instable").length;
  const fatigueAlert = recentAvgRpe >= 7 && recentInstability >= 2;

  return {
    avgRpe: parseFloat(avgRpe.toFixed(1)),
    stabilityScore,
    dominantEnergie,
    fatigueAlert,
  };
};
