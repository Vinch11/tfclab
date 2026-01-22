// =============================================
// GLOSSAIRE DES TERMES TECHNIQUES
// Définitions accessibles pour coaches débutants
// =============================================

export interface GlossaryTerm {
  id: string;
  term: string;
  shortDefinition: string;
  fullDefinition: string;
  example?: string;
  relatedTerms?: string[];
  category: "physiological" | "performance" | "training" | "metabolic";
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Métabolique
  {
    id: "vlamax",
    term: "VLamax",
    shortDefinition: "Capacité à produire de l'énergie rapidement via la glycolyse",
    fullDefinition: "La VLamax (Vitesse maximale de production de Lactate) mesure la puissance de ton moteur glycolytique. Une VLamax élevée est bonne pour les sprints courts, mais moins adaptée aux efforts d'endurance longs où une VLamax basse est préférable.",
    example: "Un sprinteur a une VLamax ~0.6-0.8 mmol/L/s, un marathonien ~0.2-0.3 mmol/L/s",
    relatedTerms: ["FTP", "VO2max", "Seuil lactique"],
    category: "metabolic",
  },
  {
    id: "tte",
    term: "TTE (Time To Exhaustion)",
    shortDefinition: "Durée maximale de maintien de l'effort au seuil",
    fullDefinition: "Le TTE représente combien de temps tu peux maintenir ton effort à FTP/seuil avant épuisement. Un TTE élevé (40-60 min) indique une bonne durabilité ; un TTE bas (<30 min) signifie que tu te fatigues vite à intensité élevée.",
    example: "TTE de 45 min = tu peux tenir 45 min à ton seuil de puissance",
    relatedTerms: ["FTP", "Endurance", "Fatigue"],
    category: "performance",
  },
  {
    id: "ftp",
    term: "FTP (Functional Threshold Power)",
    shortDefinition: "Puissance maximale tenable environ 1 heure",
    fullDefinition: "Le FTP est la puissance (en watts) que tu peux maintenir pendant environ une heure. C'est une mesure clé pour calibrer tes zones d'entraînement et suivre ta progression en cyclisme.",
    example: "FTP de 280W = tu peux tenir 280W pendant ~1h",
    relatedTerms: ["Zones d'entraînement", "Seuil", "W/kg"],
    category: "performance",
  },
  {
    id: "ftp-kg",
    term: "FTP/kg (W/kg)",
    shortDefinition: "Puissance au seuil rapportée au poids",
    fullDefinition: "Le rapport puissance/poids est crucial pour les sports où tu déplaces ton corps (vélo en montée, course). Plus ce ratio est élevé, meilleure est ta performance relative. Un amateur entraîné vise 3-4 W/kg, un pro 5.5-6+ W/kg.",
    example: "70 kg avec 280W FTP = 4.0 W/kg",
    relatedTerms: ["FTP", "Poids", "Performance"],
    category: "performance",
  },
  {
    id: "vo2max",
    term: "VO2max",
    shortDefinition: "Consommation maximale d'oxygène",
    fullDefinition: "La VO2max mesure le volume maximal d'oxygène que ton corps peut utiliser par minute. C'est un indicateur de ton potentiel aérobie. Plus elle est élevée, plus tu peux produire d'énergie via le système aérobie.",
    example: "VO2max de 55 ml/kg/min = bonne capacité aérobie pour un amateur",
    relatedTerms: ["VMA", "Aérobie", "Endurance"],
    category: "physiological",
  },
  {
    id: "vma",
    term: "VMA (Vitesse Maximale Aérobie)",
    shortDefinition: "Vitesse de course à VO2max",
    fullDefinition: "La VMA est la vitesse de course à laquelle tu atteins ta VO2max. Elle sert de référence pour calculer tes allures d'entraînement en course à pied. Tu peux la maintenir environ 6-8 minutes.",
    example: "VMA de 18 km/h = tu cours à 18 km/h à ton max aérobie",
    relatedTerms: ["VO2max", "Allures", "Course à pied"],
    category: "performance",
  },
  {
    id: "race-readiness",
    term: "Race Readiness",
    shortDefinition: "Score de préparation pour ton objectif",
    fullDefinition: "La Race Readiness évalue si ton profil physiologique actuel (VLamax, TTE, FTP/kg) est adapté aux exigences de ta course cible. Un score élevé signifie que tu es bien préparé ; un score bas indique des axes d'amélioration.",
    example: "Race Readiness 85% pour un Ironman = profil bien adapté à l'épreuve",
    relatedTerms: ["Objectif", "Profil métabolique", "Préparation"],
    category: "performance",
  },
  {
    id: "fatmax",
    term: "FatMax",
    shortDefinition: "Intensité où tu brûles le plus de graisses",
    fullDefinition: "Le FatMax est l'intensité d'effort (en watts ou FC) où ton corps oxyde le maximum de lipides. C'est crucial pour l'endurance longue distance où l'économie de glycogène est clé.",
    example: "FatMax à 180W = intensité optimale pour brûler les graisses",
    relatedTerms: ["Métabolisme lipidique", "Endurance", "Glycogène"],
    category: "metabolic",
  },
  {
    id: "zones",
    term: "Zones d'entraînement",
    shortDefinition: "Plages d'intensité pour structurer l'entraînement",
    fullDefinition: "Les zones (Z1 à Z6) découpent ton effort en plages d'intensité basées sur ta FTP ou FC max. Chaque zone cible un système énergétique différent : Z1-Z2 (endurance), Z3-Z4 (seuil), Z5-Z6 (VO2max/anaérobie).",
    example: "Z2 = 55-75% FTP, parfait pour le travail de base aérobie",
    relatedTerms: ["FTP", "FC max", "Intensité"],
    category: "training",
  },
  {
    id: "tss",
    term: "TSS (Training Stress Score)",
    shortDefinition: "Score de charge d'entraînement",
    fullDefinition: "Le TSS quantifie la charge d'une séance en fonction de l'intensité et de la durée. 100 TSS = 1h à FTP. Il aide à gérer la fatigue et éviter le surentraînement.",
    example: "Sortie 2h à 70% FTP ≈ 100 TSS",
    relatedTerms: ["Charge", "Fatigue", "Récupération"],
    category: "training",
  },
  {
    id: "css",
    term: "CSS (Critical Swim Speed)",
    shortDefinition: "Vitesse de nage tenable longtemps",
    fullDefinition: "Le CSS est l'équivalent du FTP en natation : l'allure que tu peux maintenir environ 30-60 minutes. Il sert de base pour calibrer tes séances de natation.",
    example: "CSS de 1:40/100m = tu peux nager 100m en 1:40 sur une longue durée",
    relatedTerms: ["FTP", "Seuil", "Natation"],
    category: "performance",
  },
  {
    id: "map",
    term: "MAP (Maximal Aerobic Power)",
    shortDefinition: "Puissance maximale aérobie",
    fullDefinition: "La MAP est la puissance développée à VO2max, généralement sur un effort de 5 minutes. C'est un indicateur de ton plafond aérobie en cyclisme.",
    example: "MAP de 350W avec FTP de 280W = bon ratio aérobie",
    relatedTerms: ["VO2max", "FTP", "Puissance"],
    category: "performance",
  },
  {
    id: "drift",
    term: "Drift cardiaque",
    shortDefinition: "Dérive de la FC à puissance constante",
    fullDefinition: "Le drift mesure l'augmentation de ta FC au fil d'un effort à puissance stable. Un drift élevé (>5%) peut indiquer fatigue, déshydratation ou manque d'acclimatation thermique.",
    example: "Drift 8% = ta FC a augmenté de 8% sur la durée de l'effort",
    relatedTerms: ["FC", "Fatigue", "Durabilité"],
    category: "physiological",
  },
  {
    id: "ambition",
    term: "Niveau d'ambition",
    shortDefinition: "Objectif de performance (Finisher → Elite)",
    fullDefinition: "Le niveau d'ambition définit tes cibles physiologiques. Finisher = terminer l'épreuve, Age Group = top 30-50%, Compétiteur = top 10-20%, Elite = podium. Chaque niveau a des exigences VLamax/TTE/FTP différentes.",
    example: "Ambition 'Compétiteur' en Ironman = FTP/kg cible ~3.2-3.5 W/kg",
    relatedTerms: ["Objectif", "Cibles", "Progression"],
    category: "training",
  },
];

// Fonction helper pour récupérer un terme par ID
export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.id === id);
}

// Fonction pour rechercher dans le glossaire
export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return GLOSSARY_TERMS.filter(
    (t) =>
      t.term.toLowerCase().includes(lowerQuery) ||
      t.shortDefinition.toLowerCase().includes(lowerQuery)
  );
}
