// =============================================
// GÉNÉRATEUR BLOC 3 SEMAINES
// =============================================

import { Athlete } from "@/types/athlete";
import { genererSemaineType, SemaineType, JourSemaine } from "./semaineGenerator";

export type ChargeType = "Progressive" | "Consolidation" | "Allégée (-30%)";

export interface BlocSemaine {
  numeroSemaine: number;
  charge: ChargeType;
  description: string;
  semaine: SemaineType | null;
  tssEstime: number;
}

export interface Bloc3Semaines {
  athleteNom: string;
  objectif: "IM" | "703";
  priorite: string;
  semaines: BlocSemaine[];
  tssTotal: number;
}

// Modifier la charge d'une semaine
function ajusterChargeSemaine(semaine: SemaineType, facteur: number): SemaineType {
  // Retourne une copie avec indication de charge réduite
  return {
    ...semaine,
    volumeTotal: facteur < 1 
      ? `${Math.round(parseInt(semaine.volumeTotal) * facteur)}-${Math.round(parseInt(semaine.volumeTotal.split('-')[1]) * facteur)}h`
      : semaine.volumeTotal,
  };
}

// Générer un bloc de 3 semaines (2 progressives + 1 allégée)
export function genererBloc3Semaines(athlete: Athlete): Bloc3Semaines | null {
  const semaine1 = genererSemaineType(athlete);
  if (!semaine1) return null;

  const semaine2 = genererSemaineType(athlete);
  const semaine3 = genererSemaineType(athlete);

  // TSS estimés par semaine selon objectif
  const tssBase = athlete.objectif === "IM" ? 600 : 500;

  const semaines: BlocSemaine[] = [
    {
      numeroSemaine: 1,
      charge: "Progressive",
      description: "Montée en charge progressive. Focus sur les séances clés avec récupération adéquate.",
      semaine: semaine1,
      tssEstime: tssBase,
    },
    {
      numeroSemaine: 2,
      charge: "Consolidation",
      description: "Consolidation des acquis. Volume maintenu, intensité ajustée.",
      semaine: semaine2 ? ajusterChargeSemaine(semaine2, 1.05) : null,
      tssEstime: Math.round(tssBase * 1.05),
    },
    {
      numeroSemaine: 3,
      charge: "Allégée (-30%)",
      description: "Semaine de récupération. Volume réduit de 30% pour permettre l'adaptation.",
      semaine: semaine3 ? ajusterChargeSemaine(semaine3, 0.7) : null,
      tssEstime: Math.round(tssBase * 0.7),
    },
  ];

  return {
    athleteNom: athlete.nom,
    objectif: athlete.objectif,
    priorite: semaine1.priorite,
    semaines,
    tssTotal: semaines.reduce((acc, s) => acc + s.tssEstime, 0),
  };
}
