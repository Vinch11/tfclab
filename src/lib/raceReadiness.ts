// =============================================
// RACE READINESS - Score détaillé Multi-sport
// =============================================

import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTE, estimerTTESport, SportType, SnapshotNolio } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { determinerPriorite, PrioriteCoaching } from "@/types/seances";

export interface RaceReadinessDetails {
  vlamax: number;
  endurance: number;
  puissance: number;
  fraicheur: number;
}

export interface SportReadiness {
  sport: SportType;
  score: number;
  vlamax: number;
  tte: number;
}

export interface RaceReadinessResult {
  score: number;
  details: RaceReadinessDetails;
  label: string;
  color: string;
  parSport?: SportReadiness[];
}

// Obtenir le dernier snapshot par sport
export function getDernierSnapshotParSport(athlete: Athlete, sport: SportType): SnapshotNolio | null {
  const snapshots = athlete.historique.filter(s => s.sport === sport);
  if (snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

// Calcul du score Race Readiness Multi-Sport (0-100)
export function calculRaceReadiness(athlete: Athlete): RaceReadinessResult | null {
  const sports: SportType[] = ["vélo", "course", "natation"];
  const sportScores: SportReadiness[] = [];
  
  let totalScore = 0;
  let sportsCount = 0;

  for (const sport of sports) {
    const snapshot = getDernierSnapshotParSport(athlete, sport);
    if (!snapshot) continue;

    const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
    const tte = estimerTTESport(snapshot);
    
    // Sous-scores (chacun sur 25 points)
    const targetVlamax = athlete.objectif === "IM" ? 0.35 : 0.40;
    const scoreVL = Math.max(0, Math.min(25, 25 - (vlamax - targetVlamax) * 100));
    const scoreTTE = Math.min(25, (tte / 70) * 25);
    const scoreVO2 = snapshot.vo2max ? Math.min(25, (snapshot.vo2max / 70) * 25) : 15;
    const scoreFatigue = snapshot.hrv ? Math.min(25, (snapshot.hrv / 70) * 25) : 15;

    const sportScore = Math.round(scoreVL + scoreTTE + scoreVO2 + scoreFatigue);
    
    sportScores.push({
      sport,
      score: Math.min(sportScore, 100),
      vlamax,
      tte,
    });

    totalScore += sportScore;
    sportsCount++;
  }

  if (sportsCount === 0) {
    // Fallback au snapshot le plus récent tous sports confondus
    const snapshot = getDernierSnapshot(athlete);
    if (!snapshot) return null;

    const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
    const tte = estimerTTESport(snapshot);
    
    const targetVlamax = athlete.objectif === "IM" ? 0.35 : 0.40;
    const scoreVL = Math.max(0, Math.min(25, 25 - (vlamax - targetVlamax) * 100));
    const scoreTTE = Math.min(25, (tte / 70) * 25);
    const scoreVO2 = snapshot.vo2max ? Math.min(25, (snapshot.vo2max / 70) * 25) : 15;
    const scoreFatigue = snapshot.hrv ? Math.min(25, (snapshot.hrv / 70) * 25) : 15;

    totalScore = Math.round(scoreVL + scoreTTE + scoreVO2 + scoreFatigue);
    sportsCount = 1;

    sportScores.push({
      sport: snapshot.sport,
      score: Math.min(totalScore, 100),
      vlamax,
      tte,
    });
  }

  const score = Math.min(Math.round(totalScore / sportsCount), 100);

  // Labels et couleurs
  let label: string;
  let color: string;
  if (score >= 90) {
    label = "Race Ready!";
    color = "success";
  } else if (score >= 80) {
    label = "Presque prêt";
    color = "success";
  } else if (score >= 60) {
    label = "En progression";
    color = "warning";
  } else if (score >= 40) {
    label = "Travail en cours";
    color = "warning";
  } else {
    label = "Préparation requise";
    color = "destructive";
  }

  // Détails moyens
  const details: RaceReadinessDetails = {
    vlamax: Math.round(score * 0.25),
    endurance: Math.round(score * 0.25),
    puissance: Math.round(score * 0.25),
    fraicheur: Math.round(score * 0.25),
  };

  return {
    score,
    details,
    label,
    color,
    parSport: sportScores,
  };
}

// Texte explicatif pour l'athlète - Multi-sport
export function texteExplicatifAthlete(athlete: Athlete): string {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return "Aucune donnée disponible. Ajoutez un snapshot NOLIO pour obtenir une analyse personnalisée.";

  const readiness = calculRaceReadiness(athlete);
  if (!readiness) return "";

  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const tte = estimerTTESport(snapshot);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);
  const objectifLabel = athlete.objectif === "IM" ? "Ironman" : "70.3";

  let texte = `📊 **Score global : ${readiness.score}/100**\n\n`;

  // Scores par sport
  if (readiness.parSport && readiness.parSport.length > 1) {
    texte += `**Scores par sport :**\n`;
    for (const s of readiness.parSport) {
      const sportLabel = s.sport.charAt(0).toUpperCase() + s.sport.slice(1);
      texte += `• ${sportLabel}: ${s.score}/100 (VLamax: ${s.vlamax.toFixed(2)})\n`;
    }
    texte += `\n`;
  }

  // Message selon le score
  if (readiness.score >= 80) {
    texte += `Tu es proche de ton potentiel ${objectifLabel} actuel. L'objectif est maintenant de maintenir la stabilité métabolique et la fraîcheur.\n\n`;
  } else if (readiness.score >= 60) {
    texte += `La progression est solide mais encore incomplète. Le focus actuel vise à renforcer les fondations clés.\n\n`;
  } else {
    texte += `Les bases métaboliques doivent encore être consolidées avant d'optimiser la performance.\n\n`;
  }

  // Message selon la priorité
  texte += `🎯 **Priorité actuelle : ${priorite}**\n\n`;

  if (priorite === "Réduire VLamax") {
    texte += `L'objectif est de réduire la contribution glycolytique pour améliorer l'économie et la durabilité de l'effort. Privilégie les sorties longues en Z2 et les séances sweet spot prolongées.\n`;
  } else if (priorite === "Augmenter TTE") {
    texte += `L'objectif est d'augmenter ta capacité à soutenir une intensité proche du seuil sur une durée plus longue. Focus sur les intervalles au seuil et les efforts soutenus.\n`;
  } else {
    texte += `Ton profil métabolique est bien équilibré. L'objectif est de maintenir cet équilibre tout en préservant la fraîcheur. Mix de séances variées et récupération optimale.\n`;
  }

  texte += `\n💡 Les séances proposées sont ciblées pour t'amener progressivement vers une performance stable et durable le jour de course.`;

  return texte;
}
