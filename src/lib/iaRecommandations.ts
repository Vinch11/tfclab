// =============================================
// MODULE IA - Recommandations intelligentes
// =============================================

import { Athlete } from "@/types/athlete";
import { SnapshotNolio, SportType, estimerTTESport } from "@/types/snapshotNolio";
import { calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { determinerPriorite, PrioriteCoaching } from "@/types/seances";

export interface Recommendation {
  sport: SportType;
  action: string;
  priorite: PrioriteCoaching;
  urgence: "haute" | "moyenne" | "basse";
  icon: string;
}

export interface Alert {
  sport: SportType;
  message: string;
  type: "warning" | "danger" | "info";
  icon: string;
}

export interface Badge {
  id: string;
  nom: string;
  icon: string;
  description: string;
  obtenu: boolean;
}

// Générer des recommandations IA basées sur les données
export function genererRecommandationsIA(athlete: Athlete): Recommendation[] {
  const recs: Recommendation[] = [];
  const sports: SportType[] = ["vélo", "course", "natation"];

  for (const sport of sports) {
    const snapshot = athlete.historique.filter((h) => h.sport === sport).slice(-1)[0];
    if (!snapshot) continue;

    const calc = calculVLamaxAvecConfiance(snapshot, athlete.objectif);
    const tte = estimerTTESport(snapshot);
    const priorite = determinerPriorite(calc.vlamax, tte, athlete.objectif);
    const vo2max = snapshot.vo2max || 50;

    // Recommandations basées sur confiance
    if (calc.confiance < 50) {
      recs.push({
        sport,
        action: "Refaire test ou vérifier capteurs - données peu fiables",
        priorite,
        urgence: "haute",
        icon: "🔬",
      });
    } else if (calc.confiance < 70) {
      recs.push({
        sport,
        action: "Mettre à jour les données pour améliorer la précision",
        priorite,
        urgence: "moyenne",
        icon: "📊",
      });
    }

    // NOUVELLES RECOMMANDATIONS ENTRAINEMENT BASÉES SUR VLAMAX ET VO2MAX
    
    // VLamax élevé -> besoin de travail anaérobie
    if (calc.vlamax > 0.50) {
      recs.push({
        sport,
        action: "Anaérobie intense : intégrer sprints courts 5-10s répétés",
        priorite: "Réduire VLamax",
        urgence: "haute",
        icon: "💪",
      });
    } else if (calc.vlamax > 0.45 && athlete.objectif === "IM") {
      recs.push({
        sport,
        action: "Ajouter séances VLamax ↓ (endurance Z2, Sweet Spot)",
        priorite: "Réduire VLamax",
        urgence: "haute",
        icon: "⬇️",
      });
    } else if (calc.vlamax > 0.40 && athlete.objectif === "IM") {
      recs.push({
        sport,
        action: "Maintenir focus sur réduction VLamax",
        priorite: "Réduire VLamax",
        urgence: "moyenne",
        icon: "🎯",
      });
    }

    // VO2max faible -> besoin de travail aérobie
    if (vo2max < 45) {
      recs.push({
        sport,
        action: "Endurance critique : séances fractionnées VO2max 4-6x4min @ 90-95%",
        priorite: "Augmenter TTE",
        urgence: "haute",
        icon: "🏃",
      });
    } else if (vo2max < 55) {
      recs.push({
        sport,
        action: "Développer VO2max : intervalles 3x8min + sorties longues Z2",
        priorite: "Augmenter TTE",
        urgence: "moyenne",
        icon: "🫁",
      });
    }

    // VLamax optimal mais VO2max élevé -> puissance
    if (vo2max >= 55 && calc.vlamax < 0.35) {
      recs.push({
        sport,
        action: "Puissance : travail VLamax court intensif (sprints 15-30s)",
        priorite: "Maintenir équilibre",
        urgence: "moyenne",
        icon: "⚡",
      });
    }

    // Recommandations basées sur TTE et objectif
    if (tte < 50 && (athlete.objectif === "Marathon" || athlete.objectif === "IM")) {
      recs.push({
        sport,
        action: "Augmenter volume endurance longue (sorties 2h30+)",
        priorite: "Augmenter endurance",
        urgence: "haute",
        icon: "⏱️",
      });
    } else if (tte < 60 && athlete.objectif === "Marathon") {
      recs.push({
        sport,
        action: "Progresser vers sorties longues 2h+",
        priorite: "Augmenter endurance",
        urgence: "moyenne",
        icon: "🛤️",
      });
    }

    // Recommandations spécifiques par sport
    if (sport === "vélo" && snapshot.ftp && snapshot.poids) {
      const wpkg = snapshot.ftp / snapshot.poids;
      if (wpkg < 3.5) {
        recs.push({
          sport,
          action: `FTP/kg faible (${wpkg.toFixed(1)}W/kg) : travailler Sweet Spot + seuil`,
          priorite: "Augmenter TTE",
          urgence: "moyenne",
          icon: "🚴",
        });
      }
    }

    if (sport === "course" && snapshot.vma) {
      if (snapshot.vma < 16) {
        recs.push({
          sport,
          action: `VMA ${snapshot.vma} km/h : intégrer séances 30/30 et côtes`,
          priorite: "Améliorer vitesse",
          urgence: "moyenne",
          icon: "🏔️",
        });
      }
    }

    if (sport === "natation" && snapshot.pace100) {
      if (snapshot.pace100 > 100) {
        recs.push({
          sport,
          action: "Technique prioritaire : drills + éducatifs chaque séance",
          priorite: "Maintenir équilibre",
          urgence: "moyenne",
          icon: "🏊",
        });
      }
    }

    // Si tout va bien
    if (recs.filter((r) => r.sport === sport).length === 0) {
      recs.push({
        sport,
        action: "Maintenir la charge actuelle - bonne progression",
        priorite,
        urgence: "basse",
        icon: "✅",
      });
    }
  }

  return recs;
}

// Vérifier les alertes intelligentes
export function verifierAlertes(athlete: Athlete): Alert[] {
  const alertes: Alert[] = [];
  const sports: SportType[] = ["vélo", "course", "natation"];

  for (const sport of sports) {
    const hist = athlete.historique.filter((h) => h.sport === sport);
    if (hist.length < 2) continue;

    const lastSnapshot = hist[hist.length-1]!;
    const prevSnapshot = hist[hist.length-2]!;

    const lastCalc = calculVLamaxAvecConfiance(lastSnapshot, athlete.objectif);
    const prevCalc = calculVLamaxAvecConfiance(prevSnapshot, athlete.objectif);
    const tteLast = estimerTTESport(lastSnapshot);
    const ttePrev = estimerTTESport(prevSnapshot);

    // Alerte hausse VLamax rapide
    if (lastCalc.vlamax - prevCalc.vlamax > 0.08) {
      alertes.push({
        sport,
        message: "VLamax en hausse rapide - risque surcharge anaérobie",
        type: "danger",
        icon: "📈",
      });
    }

    // Alerte baisse TTE
    if (ttePrev - tteLast > 10) {
      alertes.push({
        sport,
        message: "TTE en baisse significative - vérifier récupération",
        type: "warning",
        icon: "📉",
      });
    }

    // Alerte confiance faible
    if (lastCalc.confiance < 50) {
      alertes.push({
        sport,
        message: "Données peu fiables - nouveau test recommandé",
        type: "warning",
        icon: "⚠️",
      });
    }

    // Alerte âge snapshot
    if (lastCalc.ageSnapshot > 30) {
      alertes.push({
        sport,
        message: "Données datées de plus de 30 jours",
        type: "info",
        icon: "📅",
      });
    }
  }

  return alertes;
}

// Calculer le score global de performance
export function calculerScoreGlobal(athlete: Athlete): number {
  const sports: SportType[] = ["vélo", "course", "natation"];
  let totalScore = 0;
  let sportCount = 0;

  for (const sport of sports) {
    const snapshot = athlete.historique.filter((h) => h.sport === sport).slice(-1)[0];
    if (!snapshot) continue;

    const calc = calculVLamaxAvecConfiance(snapshot, athlete.objectif);
    const tte = estimerTTESport(snapshot);

    // Score composé: confiance (40%) + TTE normalisé (30%) + VLamax optimal (30%)
    const confianceScore = calc.confiance;
    const tteScore = Math.min(100, (tte / 90) * 100);
    
    // VLamax optimal dépend de l'objectif
    let vlamaxOptimal = 0.35;
    if (athlete.objectif === "IM") vlamaxOptimal = 0.35;
    else if (athlete.objectif === "703") vlamaxOptimal = 0.40;
    else if (athlete.objectif === "Marathon") vlamaxOptimal = 0.32;
    else if (athlete.objectif === "Semi") vlamaxOptimal = 0.38;

    const vlamaxDiff = Math.abs(calc.vlamax - vlamaxOptimal);
    const vlamaxScore = Math.max(0, 100 - vlamaxDiff * 200);

    const sportScore = confianceScore * 0.4 + tteScore * 0.3 + vlamaxScore * 0.3;
    totalScore += sportScore;
    sportCount++;
  }

  return sportCount > 0 ? Math.round(totalScore / sportCount) : 0;
}

// Générer les badges obtenus
export function genererBadges(athlete: Athlete): Badge[] {
  const score = calculerScoreGlobal(athlete);
  const sports: SportType[] = ["vélo", "course", "natation"];
  
  const badges: Badge[] = [
    {
      id: "elite",
      nom: "Élite",
      icon: "🏆",
      description: "Score global > 80",
      obtenu: score > 80,
    },
    {
      id: "pro",
      nom: "Pro",
      icon: "🥈",
      description: "Score global > 60",
      obtenu: score > 60 && score <= 80,
    },
    {
      id: "amateur",
      nom: "Amateur confirmé",
      icon: "🥉",
      description: "Score global > 40",
      obtenu: score > 40 && score <= 60,
    },
    {
      id: "debutant",
      nom: "En progression",
      icon: "🌱",
      description: "Score global ≤ 40",
      obtenu: score <= 40,
    },
  ];

  // Badge multi-sport
  const sportsAvecData = sports.filter(
    (sport) => athlete.historique.filter((h) => h.sport === sport).length > 0
  );
  badges.push({
    id: "multi",
    nom: "Triathlète",
    icon: "🏊‍♂️🚴🏃",
    description: "Données sur 3 sports",
    obtenu: sportsAvecData.length === 3,
  });

  // Badge régularité
  const totalSnapshots = athlete.historique.length;
  badges.push({
    id: "regulier",
    nom: "Régulier",
    icon: "📈",
    description: "Plus de 5 snapshots",
    obtenu: totalSnapshots >= 5,
  });

  // Badge données récentes
  const snapshotRecent = athlete.historique.some((h) => {
    const age = Math.floor(
      (new Date().getTime() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return age < 7;
  });
  badges.push({
    id: "recent",
    nom: "À jour",
    icon: "✨",
    description: "Données de moins de 7 jours",
    obtenu: snapshotRecent,
  });

  return badges;
}

// Obtenir le niveau de performance
export function getNiveauPerformance(score: number): {
  niveau: string;
  couleur: string;
  icon: string;
} {
  if (score > 80) return { niveau: "Élite", couleur: "text-amber-500", icon: "🏆" };
  if (score > 60) return { niveau: "Pro", couleur: "text-slate-400", icon: "🥈" };
  if (score > 40) return { niveau: "Amateur", couleur: "text-amber-700", icon: "🥉" };
  return { niveau: "Débutant", couleur: "text-emerald-500", icon: "🌱" };
}
