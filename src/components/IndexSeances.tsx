import { WahooWorkoutLibrary } from "@/components/WahooWorkoutLibrary";

// Legacy types preserved for backwards compatibility
export interface Seance {
  categorie: "A" | "B" | "C" | "D";
  nom: string;
  effet: string;
  contenu: string;
  necessite: "Obligatoire" | "Recommandé" | "Optionnel";
  sport?: "vélo" | "course" | "natation" | "général";
}

// Main component now uses the Wahoo SYSTM Library
export function IndexSeancesView() {
  return <WahooWorkoutLibrary />;
}
