// =============================================
// LORANG STRATEGY ENGINE
// Moteur décisionnel transparent et pédagogique
// Inspiré de la méthodologie Dan Lorang
// =============================================

import { ObjectifType } from "@/types/athlete";

// =============================================
// TYPES
// =============================================

export type StrategyPriority = 
  | "VLAMAX_DOWN" 
  | "VLAMAX_UP" 
  | "TTE_UP" 
  | "FTP_UTIL" 
  | "ENDURANCE_UP" 
  | "VITESSE_UP"
  | "MAINTENANCE";

export type SessionRecommendation = "recommended" | "limited" | "avoid";

export interface SessionGuidance {
  type: string;
  description: string;
  recommendation: SessionRecommendation;
  reason: string;
}

export interface StrategyExplanation {
  title: string;
  context: string;
  whatItMeans: string;
  benefit: string;
}

export interface StrategyResult {
  priority: StrategyPriority;
  priorityLabel: string;
  priorityIcon: string;
  confidence: number;
  confidenceLabel: string;
  confidenceMessage: string | null;
  sessions: {
    recommended: SessionGuidance[];
    limited: SessionGuidance[];
    avoid: SessionGuidance[];
  };
  explanation: StrategyExplanation;
  alerts: string[];
  dataSource: {
    vlamax: { source: string; confidence: number };
    tte: { source: string; confidence: number };
    ftp: { source: string; confidence: number };
  };
}

export interface StrategyInputs {
  vlamax: number;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tte: number;
  tteSource: string;
  tteConfidence: number;
  ftp_kg: number;
  objectif: ObjectifType;
  seanceSpecifiqueValidee?: boolean;
  fatigueOk?: boolean;
}

// =============================================
// CIBLES PAR OBJECTIF (STAFF-GRADE)
// =============================================

interface ObjectifTargets {
  vlamaxMin: number;
  vlamaxMax: number;
  vlamaxOptimal: number;
  tteMin: number;
  ftpKgMin: number;
  label: string;
}

const OBJECTIF_TARGETS: Record<ObjectifType, ObjectifTargets> = {
  IM: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.40,
    vlamaxOptimal: 0.32,
    tteMin: 55,
    ftpKgMin: 4.6,
    label: "Ironman"
  },
  "703": {
    vlamaxMin: 0.25,
    vlamaxMax: 0.45,
    vlamaxOptimal: 0.38,
    tteMin: 45,
    ftpKgMin: 4.8,
    label: "70.3 / Half Ironman"
  },
  Marathon: {
    vlamaxMin: 0.25,
    vlamaxMax: 0.38,
    vlamaxOptimal: 0.30,
    tteMin: 60,
    ftpKgMin: 0,
    label: "Marathon"
  },
  Semi: {
    vlamaxMin: 0.35,
    vlamaxMax: 0.45,
    vlamaxOptimal: 0.40,
    tteMin: 50,
    ftpKgMin: 0,
    label: "Semi-Marathon"
  },
  Trail: {
    vlamaxMin: 0.30,
    vlamaxMax: 0.45,
    vlamaxOptimal: 0.38,
    tteMin: 50,
    ftpKgMin: 0,
    label: "Trail"
  },
  TrailShort: {
    vlamaxMin: 0.35,
    vlamaxMax: 0.50,
    vlamaxOptimal: 0.42,
    tteMin: 45,
    ftpKgMin: 0,
    label: "Trail Court"
  },
  TrailMountain: {
    vlamaxMin: 0.28,
    vlamaxMax: 0.42,
    vlamaxOptimal: 0.35,
    tteMin: 55,
    ftpKgMin: 0,
    label: "Trail Montagne"
  },
  TrailUltra: {
    vlamaxMin: 0.20,
    vlamaxMax: 0.35,
    vlamaxOptimal: 0.28,
    tteMin: 70,
    ftpKgMin: 0,
    label: "Ultra-Trail"
  }
};

// =============================================
// EXPLICATIONS PÉDAGOGIQUES PAR PRIORITÉ
// =============================================

const PRIORITY_EXPLANATIONS: Record<StrategyPriority, StrategyExplanation> = {
  VLAMAX_DOWN: {
    title: "Pourquoi réduire ta VLamax ?",
    context: "Ton objectif de course est une épreuve d'endurance longue. Actuellement, ton VLamax est relativement élevée.",
    whatItMeans: "Cela signifie que ton métabolisme dépend fortement des glucides, ce qui augmente le risque d'épuisement énergétique sur longue distance. Tu consommes plus de sucres qu'un athlète avec une VLamax basse, même à intensité modérée.",
    benefit: "Les séances proposées visent à améliorer ton efficacité métabolique, à réduire ta production de lactate à intensité constante, et à te permettre de tenir plus longtemps à puissance élevée avec moins de fatigue."
  },
  VLAMAX_UP: {
    title: "Pourquoi augmenter ta VLamax ?",
    context: "Ta VLamax est actuellement très basse, ce qui limite ta capacité à produire de la puissance sur des efforts courts et intenses.",
    whatItMeans: "Bien que bénéfique pour l'endurance, une VLamax trop basse réduit ta capacité à répondre aux changements de rythme, attaques, et relances en compétition.",
    benefit: "Les séances proposées visent à restaurer ta capacité glycolytique, améliorer ta réactivité et ta puissance de pointe, tout en préservant tes qualités d'endurance."
  },
  TTE_UP: {
    title: "Pourquoi améliorer ton TTE ?",
    context: "Ton niveau de puissance est bon, mais ta capacité à la maintenir dans le temps est encore limitée.",
    whatItMeans: "Le Time To Exhaustion (TTE) est un facteur clé de la performance sur ta distance cible. Un TTE insuffisant signifie que tu fatigues trop vite à ta puissance au seuil.",
    benefit: "Les séances proposées visent à augmenter ta durabilité, à améliorer ta tolérance à l'effort prolongé, et à rendre ta puissance plus exploitable en course."
  },
  FTP_UTIL: {
    title: "Pourquoi développer ton FTP ?",
    context: "Ta VLamax et ton TTE sont dans les cibles, mais ta puissance au seuil (FTP) en W/kg reste en dessous de l'objectif.",
    whatItMeans: "Le FTP/kg détermine directement ta vitesse de croisière. Un FTP insuffisant limite ta capacité à maintenir un bon rythme sur le parcours.",
    benefit: "Les séances proposées visent à augmenter ta puissance au seuil de manière progressive, en travaillant le Sweet Spot et les intervalles au seuil."
  },
  ENDURANCE_UP: {
    title: "Pourquoi augmenter ton endurance ?",
    context: "Ton objectif nécessite une base d'endurance solide. Actuellement, ta capacité à soutenir un effort prolongé doit progresser.",
    whatItMeans: "L'endurance est la fondation de toute performance en course de distance. Sans elle, les autres qualités (puissance, VLamax) ne peuvent pas s'exprimer pleinement.",
    benefit: "Les séances proposées visent à construire une base aérobie robuste, améliorer l'utilisation des graisses comme carburant, et préparer ton corps aux efforts longs."
  },
  VITESSE_UP: {
    title: "Pourquoi améliorer ta vitesse ?",
    context: "Sur ta distance cible, un certain niveau de capacité glycolytique et de vitesse de pointe est nécessaire.",
    whatItMeans: "Ta VLamax ou ta VMA est actuellement insuffisante pour les exigences de ton objectif. Tu as besoin de plus de punch pour les phases rapides.",
    benefit: "Les séances proposées visent à développer ta vitesse maximale, ta puissance de pointe, et ta capacité à soutenir des efforts intenses courts."
  },
  MAINTENANCE: {
    title: "Pourquoi maintenir l'équilibre actuel ?",
    context: "Félicitations ! Tes indicateurs clés (VLamax, TTE, FTP) sont dans les cibles pour ton objectif.",
    whatItMeans: "Tu es dans une zone de performance optimale. Le risque maintenant est de sur-entraîner ou de dérégler ce qui fonctionne.",
    benefit: "Les séances proposées visent à maintenir tes acquis, affûter pour la compétition, et préserver ta fraîcheur physique et mentale."
  }
};

// =============================================
// SÉANCES PAR PRIORITÉ
// =============================================

const PRIORITY_SESSIONS: Record<StrategyPriority, { recommended: SessionGuidance[]; limited: SessionGuidance[]; avoid: SessionGuidance[] }> = {
  VLAMAX_DOWN: {
    recommended: [
      { type: "Endurance longue Z2", description: "4-6h à 60-70% FTP, cadence basse 50-60 rpm", recommendation: "recommended", reason: "Favorise l'utilisation des graisses et réduit la dépendance glycolytique" },
      { type: "Sweet Spot prolongé", description: "2x30-40min @ 88-93% FTP", recommendation: "recommended", reason: "Développe l'endurance au seuil sans stimuler la glycolyse" },
      { type: "Tempo stable", description: "1h30-2h @ 75-85% FTP", recommendation: "recommended", reason: "Améliore l'efficacité métabolique à intensité modérée" },
      { type: "Cadence basse", description: "Sorties à 50-60 rpm sur terrain vallonné", recommendation: "recommended", reason: "Recrute les fibres lentes, réduit l'activation des fibres rapides" }
    ],
    limited: [
      { type: "Intervalles 3-5min", description: "À 100-110% FTP", recommendation: "limited", reason: "Peut stimuler la glycolyse si trop fréquent" },
      { type: "VO2max", description: "Séries 4-6min à haute intensité", recommendation: "limited", reason: "Utile pour FTP mais limite l'effet VLamax down si abusé" }
    ],
    avoid: [
      { type: "Sprints courts", description: "5-30s all-out", recommendation: "avoid", reason: "Stimule fortement la production de lactate et la VLamax" },
      { type: "Tabata/HIIT court", description: "20s effort / 10s repos", recommendation: "avoid", reason: "Augmente la capacité glycolytique = contre-productif" },
      { type: "Force explosive", description: "Sprints en montée, départs arrêtés", recommendation: "avoid", reason: "Recrute les fibres rapides et stimule la VLamax" }
    ]
  },
  VLAMAX_UP: {
    recommended: [
      { type: "Sprints courts", description: "8-12 x 10-15s all-out, récup 3-5min", recommendation: "recommended", reason: "Stimule la production de lactate et les fibres rapides" },
      { type: "Force explosive", description: "Démarrages, sprints en côte", recommendation: "recommended", reason: "Développe la puissance de pointe et la capacité glycolytique" },
      { type: "Intervalles courts intenses", description: "30s-1min @ 130%+ FTP", recommendation: "recommended", reason: "Active le système anaérobie lactique" }
    ],
    limited: [
      { type: "Endurance longue", description: ">3h Z2", recommendation: "limited", reason: "Peut contrebalancer l'effet des sprints si trop fréquent" }
    ],
    avoid: [
      { type: "Sweet Spot très long", description: ">45min continu", recommendation: "avoid", reason: "Favorise la réduction de VLamax, effet inverse recherché" }
    ]
  },
  TTE_UP: {
    recommended: [
      { type: "Blocs au seuil progressifs", description: "2x20 → 3x20 → 2x30 → 1x60min @ 90-100% FTP", recommendation: "recommended", reason: "Augmente la capacité à tenir au seuil dans le temps" },
      { type: "Intervalles longs", description: "3-4 x 15-20min @ 95-100% FTP", recommendation: "recommended", reason: "Développe l'endurance au seuil et la durabilité" },
      { type: "Tempo soutenu", description: "1h30-2h @ 80-88% FTP", recommendation: "recommended", reason: "Prépare les adaptations pour le travail au seuil prolongé" }
    ],
    limited: [
      { type: "VO2max court", description: "<3min intervals", recommendation: "limited", reason: "Utile mais ne développe pas spécifiquement le TTE" }
    ],
    avoid: [
      { type: "Séances fragmentées", description: "Beaucoup de récup, efforts <10min", recommendation: "avoid", reason: "Ne sollicite pas assez la durabilité" },
      { type: "Sprints purs", description: "Sans travail au seuil associé", recommendation: "avoid", reason: "Ne développe pas la capacité à tenir l'effort" }
    ]
  },
  FTP_UTIL: {
    recommended: [
      { type: "Sweet Spot", description: "2-3 x 20-30min @ 88-93% FTP", recommendation: "recommended", reason: "Développe le FTP avec un stress physiologique modéré" },
      { type: "Intervalles au seuil", description: "4-5 x 8-12min @ 100-105% FTP", recommendation: "recommended", reason: "Stimule les adaptations au seuil lactique" },
      { type: "VO2max", description: "4-6 x 4-6min @ 105-115% FTP", recommendation: "recommended", reason: "Augmente la capacité aérobie qui soutient le FTP" }
    ],
    limited: [
      { type: "Endurance pure", description: ">4h Z2 uniquement", recommendation: "limited", reason: "Nécessaire mais insuffisant seul pour augmenter le FTP" }
    ],
    avoid: [
      { type: "Récupération excessive", description: "Trop de jours off ou Z1", recommendation: "avoid", reason: "Ne permet pas la surcharge progressive nécessaire" }
    ]
  },
  ENDURANCE_UP: {
    recommended: [
      { type: "Sorties longues progressives", description: "2h → 3h → 4h+ @ Z2", recommendation: "recommended", reason: "Construit la base aérobie et l'efficacité métabolique" },
      { type: "Volume Z2", description: "Augmenter le volume hebdo de 10-15%", recommendation: "recommended", reason: "Développe les adaptations d'endurance fondamentales" },
      { type: "Tempo modéré", description: "1h-1h30 @ 75-85% FTP", recommendation: "recommended", reason: "Transition vers le travail d'intensité" }
    ],
    limited: [
      { type: "Intervalles haute intensité", description: ">VO2max", recommendation: "limited", reason: "Peut épuiser sans base d'endurance suffisante" }
    ],
    avoid: [
      { type: "HIIT exclusif", description: "Séances intenses sans fond aérobie", recommendation: "avoid", reason: "Risque de surentraînement et plateau" }
    ]
  },
  VITESSE_UP: {
    recommended: [
      { type: "VMA/VO2max", description: "6-8 x 3-4min @ 100-110% VMA", recommendation: "recommended", reason: "Développe la vitesse maximale aérobie" },
      { type: "Côtes", description: "10-15 x 30-45s en côte, récup descente", recommendation: "recommended", reason: "Améliore la force et la vitesse" },
      { type: "Fartlek", description: "Variations de rythme sur 45-60min", recommendation: "recommended", reason: "Développe l'adaptabilité et la vitesse de changement de rythme" }
    ],
    limited: [
      { type: "Endurance pure", description: "Sorties trop lentes", recommendation: "limited", reason: "Maintenir mais ne pas en abuser" }
    ],
    avoid: [
      { type: "Volume excessif lent", description: ">80% du volume en Z1-Z2", recommendation: "avoid", reason: "Ne développe pas la vitesse recherchée" }
    ]
  },
  MAINTENANCE: {
    recommended: [
      { type: "Équilibre", description: "Mix varié : Z2 + seuil + VO2", recommendation: "recommended", reason: "Maintient tous les systèmes actifs" },
      { type: "Affûtage", description: "Réduction volume 30-40%, maintien intensité", recommendation: "recommended", reason: "Préserve la forme pour la compétition" },
      { type: "Séances spécifiques course", description: "Simulations partielles de l'objectif", recommendation: "recommended", reason: "Préparation mentale et ajustements tactiques" }
    ],
    limited: [
      { type: "Gros blocs d'entraînement", description: "Semaines à charge élevée", recommendation: "limited", reason: "Risque de fatigue avant l'objectif" }
    ],
    avoid: [
      { type: "Nouveautés", description: "Nouvelles séances, nouveaux équipements", recommendation: "avoid", reason: "Pas le moment d'expérimenter" }
    ]
  }
};

// =============================================
// LABELS ET ICÔNES
// =============================================

const PRIORITY_LABELS: Record<StrategyPriority, string> = {
  VLAMAX_DOWN: "Réduire la VLamax",
  VLAMAX_UP: "Augmenter la VLamax",
  TTE_UP: "Améliorer le TTE",
  FTP_UTIL: "Développer le FTP",
  ENDURANCE_UP: "Augmenter l'endurance",
  VITESSE_UP: "Améliorer la vitesse",
  MAINTENANCE: "Maintien & Affûtage"
};

const PRIORITY_ICONS: Record<StrategyPriority, string> = {
  VLAMAX_DOWN: "⬇️",
  VLAMAX_UP: "⬆️",
  TTE_UP: "⏱️",
  FTP_UTIL: "💪",
  ENDURANCE_UP: "🛤️",
  VITESSE_UP: "⚡",
  MAINTENANCE: "✅"
};

// =============================================
// MOTEUR DE DÉCISION
// =============================================

export function computeLorangStrategy(inputs: StrategyInputs): StrategyResult {
  const { vlamax, vlamaxSource, vlamaxConfidence, tte, tteSource, tteConfidence, ftp_kg, objectif } = inputs;
  
  const targets = OBJECTIF_TARGETS[objectif] || OBJECTIF_TARGETS.IM;
  const alerts: string[] = [];
  let priority: StrategyPriority = "MAINTENANCE";
  
  // =============================================
  // RÈGLES DE DÉCISION (ORDRE DE PRIORITÉ)
  // =============================================
  
  // 1. VLamax trop élevée pour l'objectif
  if (vlamax > targets.vlamaxMax) {
    priority = "VLAMAX_DOWN";
    alerts.push(`VLamax (${vlamax.toFixed(2)}) supérieure à la cible max (${targets.vlamaxMax}) pour ${targets.label}`);
  }
  
  // 2. TTE insuffisant pour l'objectif (priorité haute pour endurance)
  else if (tte < targets.tteMin) {
    if (objectif === "Marathon" || objectif === "TrailUltra" || objectif === "TrailMountain") {
      priority = "ENDURANCE_UP";
      alerts.push(`TTE (${tte}min) insuffisant pour ${targets.label} (cible: ${targets.tteMin}min)`);
    } else {
      priority = "TTE_UP";
      alerts.push(`TTE (${tte}min) insuffisant pour ${targets.label} (cible: ${targets.tteMin}min)`);
    }
  }
  
  // 3. VLamax trop basse (sauf pour ultra/marathon)
  else if (vlamax < targets.vlamaxMin && !["Marathon", "TrailUltra", "TrailMountain"].includes(objectif)) {
    priority = "VLAMAX_UP";
    alerts.push(`VLamax (${vlamax.toFixed(2)}) trop basse pour ${targets.label} (min: ${targets.vlamaxMin})`);
  }
  
  // 4. FTP insuffisant (pour triathlon vélo)
  else if (targets.ftpKgMin > 0 && ftp_kg < targets.ftpKgMin && vlamax <= targets.vlamaxMax && tte >= targets.tteMin) {
    priority = "FTP_UTIL";
    alerts.push(`FTP/kg (${ftp_kg.toFixed(1)}) insuffisant pour ${targets.label} (cible: ${targets.ftpKgMin}W/kg)`);
  }
  
  // 5. Besoin de vitesse pour Semi
  else if (objectif === "Semi" && vlamax < 0.35) {
    priority = "VITESSE_UP";
    alerts.push("Capacité glycolytique trop basse pour les exigences du Semi-Marathon");
  }
  
  // 6. Toutes les cibles atteintes = maintenance
  else {
    priority = "MAINTENANCE";
    if (vlamax >= targets.vlamaxMin && vlamax <= targets.vlamaxMax) {
      alerts.push(`VLamax dans la zone cible (${targets.vlamaxMin}-${targets.vlamaxMax})`);
    }
    if (tte >= targets.tteMin) {
      alerts.push(`TTE suffisant (${tte}min ≥ ${targets.tteMin}min)`);
    }
  }
  
  // =============================================
  // CALCUL DE LA CONFIANCE GLOBALE
  // =============================================
  
  const avgConfidence = Math.round((vlamaxConfidence + tteConfidence) / 2);
  
  let confidenceLabel: string;
  let confidenceMessage: string | null = null;
  
  if (avgConfidence >= 80) {
    confidenceLabel = "Élevée";
  } else if (avgConfidence >= 60) {
    confidenceLabel = "Moyenne";
    confidenceMessage = "Certaines données sont estimées. Les recommandations sont pertinentes, mais seront plus précises après de nouveaux tests ou snapshots.";
  } else {
    confidenceLabel = "Faible";
    confidenceMessage = "Les données utilisées sont en grande partie estimées. Il est fortement recommandé de réaliser des tests terrain (VLamax, TTE) pour affiner les recommandations.";
  }
  
  // =============================================
  // RÉSULTAT
  // =============================================
  
  return {
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    priorityIcon: PRIORITY_ICONS[priority],
    confidence: avgConfidence,
    confidenceLabel,
    confidenceMessage,
    sessions: PRIORITY_SESSIONS[priority],
    explanation: PRIORITY_EXPLANATIONS[priority],
    alerts,
    dataSource: {
      vlamax: { source: vlamaxSource, confidence: vlamaxConfidence },
      tte: { source: tteSource, confidence: tteConfidence },
      ftp: { source: "snapshot", confidence: 80 }
    }
  };
}

// =============================================
// HELPERS POUR L'UI
// =============================================

export function getPriorityColor(priority: StrategyPriority): string {
  switch (priority) {
    case "VLAMAX_DOWN": return "text-blue-400";
    case "VLAMAX_UP": return "text-orange-400";
    case "TTE_UP": return "text-amber-400";
    case "FTP_UTIL": return "text-primary";
    case "ENDURANCE_UP": return "text-green-400";
    case "VITESSE_UP": return "text-red-400";
    case "MAINTENANCE": return "text-emerald-400";
    default: return "text-muted-foreground";
  }
}

export function getPriorityBgColor(priority: StrategyPriority): string {
  switch (priority) {
    case "VLAMAX_DOWN": return "bg-blue-400/10 border-blue-400/30";
    case "VLAMAX_UP": return "bg-orange-400/10 border-orange-400/30";
    case "TTE_UP": return "bg-amber-400/10 border-amber-400/30";
    case "FTP_UTIL": return "bg-primary/10 border-primary/30";
    case "ENDURANCE_UP": return "bg-green-400/10 border-green-400/30";
    case "VITESSE_UP": return "bg-red-400/10 border-red-400/30";
    case "MAINTENANCE": return "bg-emerald-400/10 border-emerald-400/30";
    default: return "bg-muted/10 border-border";
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-emerald-400";
  if (confidence >= 60) return "text-amber-400";
  return "text-red-400";
}

export function getObjectifTargets(objectif: ObjectifType): ObjectifTargets {
  return OBJECTIF_TARGETS[objectif] || OBJECTIF_TARGETS.IM;
}
