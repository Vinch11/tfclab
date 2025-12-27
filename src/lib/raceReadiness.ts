// =============================================
// RACE READINESS - Score détaillé + Texte athlète
// =============================================

import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTE } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { determinerPriorite, PrioriteCoaching } from "@/types/seances";

export interface RaceReadinessDetails {
  vlamax: number;
  endurance: number;
  puissance: number;
  fraicheur: number;
}

export interface RaceReadinessResult {
  score: number;
  details: RaceReadinessDetails;
  label: string;
  color: string;
}

// Calcul du score Race Readiness (0-100)
export function calculRaceReadiness(athlete: Athlete): RaceReadinessResult | null {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return null;

  const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const ftp_kg = snapshot.ftp / snapshot.poids;

  // Sous-scores (chacun sur 25 points)
  
  // VLamax: plus c'est bas, mieux c'est pour IM/703
  const targetVlamax = athlete.objectif === "IM" ? 0.35 : 0.40;
  const scoreVL = Math.max(0, Math.min(25, 25 - (vlamax - targetVlamax) * 100));

  // TTE: objectif 70 min
  const scoreTTE = Math.min(25, (tte / 70) * 25);

  // FTP: objectif 5.5 W/kg (elite)
  const scoreFTP = Math.min(25, (ftp_kg / 5.5) * 25);

  // Fraîcheur (HRV): objectif 70ms
  const scoreFatigue = snapshot.hrv
    ? Math.min(25, (snapshot.hrv / 70) * 25)
    : 15; // Score par défaut si pas de HRV

  const total = Math.round(scoreVL + scoreTTE + scoreFTP + scoreFatigue);
  const score = Math.min(total, 100);

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

  return {
    score,
    details: {
      vlamax: Math.round(scoreVL),
      endurance: Math.round(scoreTTE),
      puissance: Math.round(scoreFTP),
      fraicheur: Math.round(scoreFatigue),
    },
    label,
    color,
  };
}

// Texte explicatif pour l'athlète
export function texteExplicatifAthlete(athlete: Athlete): string {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return "Aucune donnée disponible. Ajoutez un snapshot NOLIO pour obtenir une analyse personnalisée.";

  const readiness = calculRaceReadiness(athlete);
  if (!readiness) return "";

  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);
  const objectifLabel = athlete.objectif === "IM" ? "Ironman" : "70.3";

  let texte = `📊 **État actuel : ${readiness.score}/100**\n\n`;

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
    texte += `Ton VLamax (${vlamax.toFixed(2)}) est au-dessus de la cible pour ${objectifLabel}. `;
    texte += `L'objectif est de réduire la contribution glycolytique pour améliorer l'économie et la durabilité de l'effort. `;
    texte += `Privilégie les sorties longues en Z2 et les séances sweet spot prolongées.\n`;
  } else if (priorite === "Augmenter TTE") {
    texte += `Ton TTE (${tte} min) est en dessous de la cible. `;
    texte += `L'objectif est d'augmenter ta capacité à soutenir une intensité proche du seuil sur une durée plus longue. `;
    texte += `Focus sur les intervalles au seuil et les efforts soutenus.\n`;
  } else {
    texte += `Ton profil métabolique est bien équilibré. `;
    texte += `L'objectif est de maintenir cet équilibre tout en préservant la fraîcheur. `;
    texte += `Mix de séances variées et récupération optimale.\n`;
  }

  // Détails des sous-scores
  texte += `\n📈 **Détails du score :**\n`;
  texte += `• VLamax : ${readiness.details.vlamax}/25\n`;
  texte += `• Endurance (TTE) : ${readiness.details.endurance}/25\n`;
  texte += `• Puissance (FTP) : ${readiness.details.puissance}/25\n`;
  texte += `• Fraîcheur (HRV) : ${readiness.details.fraicheur}/25\n`;

  texte += `\n💡 Les séances proposées sont ciblées pour t'amener progressivement vers une performance stable et durable le jour de course.`;

  return texte;
}
