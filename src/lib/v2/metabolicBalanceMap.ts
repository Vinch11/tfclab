/**
 * TWO FOR COACHING LAB METHOD™ — Metabolic Balance Map™
 * 
 * Le graphique signature TFCL™ :
 * - Axe X = VLamax effectif
 * - Axe Y = TTE effectif
 * - Taille bulle = FTP/kg
 * - Couleur = Risque blessure
 * 
 * 4 ZONES OFFICIELLES :
 * A - Endurance durable (IM / longue distance)
 * B - Équilibré (70.3 / marathon)
 * C - Puissant mais fragile (risque glycogène / blessure)
 * D - Explosif (sprint / courte distance)
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import type { InjuryRiskEnvelope } from './injuryRiskUnified';

// ============================================
// TYPES
// ============================================

export type MapZoneId = 'A' | 'B' | 'C' | 'D';

export interface MapZone {
  id: MapZoneId;
  label: string;
  shortLabel: string;
  description: string;
  profiles: string[];
  colorHsl: string;
  colorBg: string;
  vlamaxRange: [number, number];  // [min, max]
  tteRange: [number, number];     // [min, max]
}

export interface AthleteMapPosition {
  x: number;          // VLamax
  y: number;          // TTE
  size: number;       // FTP/kg normalisé (10-50)
  color: string;      // HSL basé sur risque
  zone: MapZoneId;
  zoneName: string;
  confidence: number;
  isDashed: boolean;  // Contour pointillé si confiance < 0.65
}

export interface MapDataPoint {
  id: string;
  name: string;
  vlamax: number;
  tte: number;
  ftpKg: number;
  riskScore: number;
  riskLevel: string;
  confidence: number;
  position: AthleteMapPosition;
  label?: string;
}

export interface MetabolicBalanceMapData {
  current: MapDataPoint | null;
  projected: MapDataPoint | null;  // Après ajustements
  zones: MapZone[];
}

export interface MapExplanation {
  why: string;
  implications: string[];
  recommendations: string[];
}

// ============================================
// ZONES OFFICIELLES
// ============================================

export const MAP_ZONES: MapZone[] = [
  {
    id: 'A',
    label: 'Endurance durable',
    shortLabel: 'A',
    description: 'VLamax bas, TTE élevé — Profil longue distance optimisé',
    profiles: ['Ironman', 'Ultra-endurance', 'Longue distance'],
    colorHsl: 'hsl(var(--success))',
    colorBg: 'hsla(var(--success), 0.15)',
    vlamaxRange: [0.20, 0.38],
    tteRange: [50, 80]
  },
  {
    id: 'B',
    label: 'Équilibré',
    shortLabel: 'B',
    description: 'Profil polyvalent — Adaptabilité maximale',
    profiles: ['70.3', 'Marathon', 'Demi-fond'],
    colorHsl: 'hsl(var(--primary))',
    colorBg: 'hsla(var(--primary), 0.15)',
    vlamaxRange: [0.38, 0.50],
    tteRange: [42, 55]
  },
  {
    id: 'C',
    label: 'Puissant mais fragile',
    shortLabel: 'C',
    description: 'VLamax élevé, TTE moyen — Risque glycogène et blessure',
    profiles: ['Olympique', 'Montagne', 'Critérium'],
    colorHsl: 'hsl(var(--warning))',
    colorBg: 'hsla(var(--warning), 0.15)',
    vlamaxRange: [0.50, 0.70],
    tteRange: [35, 50]
  },
  {
    id: 'D',
    label: 'Explosif',
    shortLabel: 'D',
    description: 'VLamax élevé, TTE bas — Sprint et courte distance',
    profiles: ['Sprint', 'Contre-la-montre court', 'Piste'],
    colorHsl: 'hsl(var(--destructive))',
    colorBg: 'hsla(var(--destructive), 0.15)',
    vlamaxRange: [0.55, 0.90],
    tteRange: [25, 40]
  }
];

// ============================================
// TEXTES PÉDAGOGIQUES
// ============================================

export const MAP_PEDAGOGY = {
  mainText: `Ce graphique ne classe pas les athlètes.
Il montre l'équilibre entre production d'énergie rapide
et capacité à la soutenir dans le temps.`,
  
  disclaimer: `La position sur la carte n'est ni bonne ni mauvaise.
Elle doit être cohérente avec l'objectif de l'athlète.`,
  
  staffUsage: [
    "Comparer profils athlètes",
    "Visualiser effets d'une stratégie",
    "Justifier un choix d'entraînement",
    "Montrer les risques invisibles"
  ],
  
  guardrails: [
    "Pas de score global",
    "Pas de classement",
    "Toujours afficher incertitude"
  ]
};

// ============================================
// MODULE ACADEMY
// ============================================

export const ACADEMY_METABOLIC_MAP_MODULE = {
  id: 'metabolic-balance-map',
  title: 'Lire la Metabolic Balance Map™',
  icon: '🗺️',
  duration: '15 min',
  
  sections: [
    {
      id: 'concept',
      title: 'Le concept',
      content: `La Metabolic Balance Map™ visualise l'équilibre entre :
- Axe X : VLamax — capacité de production rapide d'énergie
- Axe Y : TTE — capacité à maintenir l'effort dans le temps

Ce graphique montre OÙ vous êtes, pas SI vous êtes bon.`
    },
    {
      id: 'zones',
      title: 'Les 4 zones',
      content: `ZONE A — Endurance durable
VLamax bas + TTE élevé = profil longue distance idéal

ZONE B — Équilibré
Profil polyvalent adapté au 70.3 et marathon

ZONE C — Puissant mais fragile
VLamax élevé + TTE moyen = risque déplétion glycogène

ZONE D — Explosif
Profil sprint, inadapté à la longue distance sans ajustement`
    },
    {
      id: 'codage',
      title: 'Comprendre le codage visuel',
      content: `La TAILLE de la bulle = FTP/kg
Plus elle est grande, plus la puissance relative est élevée.

La COULEUR = Risque blessure
Vert → Faible
Orange → Modéré
Rouge → Élevé

Le CONTOUR pointillé = Confiance < 65%
Les données sont incertaines.`
    },
    {
      id: 'erreurs',
      title: "Erreurs d'interprétation courantes",
      content: `❌ "Zone A est la meilleure"
→ Non, elle est optimale pour Ironman, pas pour un sprinteur.

❌ "Zone D signifie mauvais endurant"
→ Non, cela signifie profil à adapter pour longue distance.

❌ "Bulle plus grande = meilleur athlète"
→ Non, la taille montre la puissance relative, pas la performance.`
    },
    {
      id: 'cas-pratiques',
      title: 'Cas pratiques',
      content: `CAS 1 : Athlète Zone C visant Ironman
→ Travail de réduction VLamax + développement TTE nécessaire

CAS 2 : Athlète Zone A visant 70.3
→ Profil déjà excellent, optimiser puissance sans dégrader TTE

CAS 3 : Athlète Zone D visant Marathon
→ Transformation métabolique longue durée requise`
    }
  ],
  
  profilesTypes: [
    {
      name: "L'Ultra-Endurant",
      zone: 'A',
      vlamax: 0.28,
      tte: 62,
      description: 'Profil idéal Ironman. Faible VLamax, TTE remarquable.'
    },
    {
      name: 'Le Polyvalent',
      zone: 'B',
      vlamax: 0.42,
      tte: 48,
      description: 'Adaptable à plusieurs formats. Équilibre métabolique.'
    },
    {
      name: 'Le Puissant Fragile',
      zone: 'C',
      vlamax: 0.58,
      tte: 42,
      description: 'Puissant mais consomme vite. Attention glycogène.'
    },
    {
      name: "L'Explosif",
      zone: 'D',
      vlamax: 0.72,
      tte: 32,
      description: 'Profil sprint. Transformation longue pour endurance.'
    }
  ]
};

// ============================================
// CONTENU PDF
// ============================================

export const PDF_MAP_SECTION = {
  title: 'Metabolic Balance Map™',
  subtitle: 'Position métabolique Two For Coaching Lab',
  
  generateContent: (
    current: MapDataPoint | null,
    projected: MapDataPoint | null,
    objectif: string
  ): string => {
    if (!current) {
      return 'Données insuffisantes pour générer la carte métabolique.';
    }
    
    const zone = MAP_ZONES.find(z => z.id === current.position.zone);
    const zoneName = zone?.label || 'Inconnue';
    
    let content = `POSITION ACTUELLE
Zone : ${zoneName} (${current.position.zone})
VLamax : ${current.vlamax.toFixed(2)} mmol/L/s
TTE : ${current.tte} min
FTP/kg : ${current.ftpKg.toFixed(1)} W/kg
Risque : ${current.riskLevel} (${current.riskScore}%)
`;

    if (projected) {
      const projectedZone = MAP_ZONES.find(z => z.id === projected.position.zone);
      content += `
CIBLE RÉALISTE (après ajustements)
Zone cible : ${projectedZone?.label || 'Inconnue'} (${projected.position.zone})
VLamax cible : ${projected.vlamax.toFixed(2)} mmol/L/s
TTE cible : ${projected.tte} min
`;
    }

    content += `
COMMENTAIRE STAFF-GRADE
${generateStaffComment(current, objectif, zone)}
`;

    return content;
  }
};

function generateStaffComment(
  data: MapDataPoint,
  objectif: string,
  zone: MapZone | undefined
): string {
  const goal = objectif.toLowerCase();
  const isLongDistance = goal.includes('im') || goal.includes('ironman') || goal.includes('marathon');
  const isShortDistance = goal.includes('sprint') || goal.includes('olympique');
  
  if (zone?.id === 'A' && isLongDistance) {
    return `Profil métabolique aligné avec l'objectif ${objectif}. 
Position Zone A = endurance durable optimisée. 
Maintenir l'équilibre actuel, travailler la puissance sans dégrader le TTE.`;
  }
  
  if (zone?.id === 'D' && isLongDistance) {
    return `Écart significatif entre profil actuel (Zone D) et objectif ${objectif}.
VLamax élevé (${data.vlamax.toFixed(2)}) et TTE bas (${data.tte} min) = déplétion glycogène rapide.
Recommandation : transformation métabolique progressive sur 12-16 semaines.`;
  }
  
  if (zone?.id === 'C') {
    return `Zone C = puissance présente mais durabilité fragile.
Pour ${objectif}, surveiller risque glycogène sur les longues durées.
Travailler le TTE via endurance fondamentale et intervalles longs.`;
  }
  
  if (zone?.id === 'B') {
    return `Profil équilibré (Zone B) = polyvalence métabolique.
Pour ${objectif}, orientation possible vers Zone A (plus d'endurance) ou Zone C (plus de puissance).
Décision fonction de la stratégie de course prioritaire.`;
  }
  
  if (zone?.id === 'A' && isShortDistance) {
    return `Profil Zone A actuellement en décalage avec objectif ${objectif}.
Excellent TTE mais VLamax trop bas pour les efforts explosifs courts.
Envisager développement puissance sans sacrifier totalement l'endurance.`;
  }
  
  return `Position en Zone ${zone?.id || '?'} pour objectif ${objectif}.
Analyse personnalisée requise pour optimiser le profil métabolique.`;
}

// ============================================
// HELPERS
// ============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getRiskColor(riskScore: number): string {
  if (riskScore <= 25) return 'hsl(var(--success))';
  if (riskScore <= 45) return 'hsl(142, 71%, 45%)'; // Vert-jaune
  if (riskScore <= 65) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function getZoneForPosition(vlamax: number, tte: number): MapZoneId {
  // Logique de zone basée sur les seuils
  const isLowVlamax = vlamax <= 0.38;
  const isMidVlamax = vlamax > 0.38 && vlamax <= 0.50;
  const isHighVlamax = vlamax > 0.50;
  
  const isHighTTE = tte >= 50;
  const isMidTTE = tte >= 38 && tte < 50;
  const isLowTTE = tte < 38;
  
  // Zone A : VLamax bas + TTE élevé
  if (isLowVlamax && isHighTTE) return 'A';
  
  // Zone B : VLamax moyen + TTE moyen-haut
  if ((isLowVlamax || isMidVlamax) && isMidTTE) return 'B';
  if (isMidVlamax && isHighTTE) return 'B';
  
  // Zone D : VLamax élevé + TTE bas
  if (isHighVlamax && isLowTTE) return 'D';
  
  // Zone C : VLamax élevé + TTE moyen
  return 'C';
}

function normalizeFtpKg(ftpKg: number): number {
  // Normaliser FTP/kg (2.0 - 6.0 W/kg) vers taille bulle (12-45)
  const minFtp = 2.0;
  const maxFtp = 6.0;
  const minSize = 12;
  const maxSize = 45;
  
  const normalized = clamp((ftpKg - minFtp) / (maxFtp - minFtp), 0, 1);
  return minSize + normalized * (maxSize - minSize);
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

export interface MapInput {
  id?: string;
  name?: string;
  vlamax: number | null;
  tte: number | null;
  ftpKg: number | null;
  riskEnvelope: InjuryRiskEnvelope | null;
  confidence?: number;
  label?: string;
}

export function computeAthleteMapPosition(input: MapInput): MapDataPoint | null {
  const { id, name, vlamax, tte, ftpKg, riskEnvelope, confidence = 0.7, label } = input;
  
  if (vlamax === null || tte === null) return null;
  
  const effectiveFtpKg = ftpKg ?? 3.5; // Fallback
  const effectiveRiskScore = riskEnvelope?.score ?? 40;
  const effectiveRiskLevel = riskEnvelope?.levelLabel ?? 'Modéré';
  const effectiveConfidence = riskEnvelope?.confidence ?? confidence;
  
  const zone = getZoneForPosition(vlamax, tte);
  const zoneDef = MAP_ZONES.find(z => z.id === zone)!;
  
  const position: AthleteMapPosition = {
    x: vlamax,
    y: tte,
    size: normalizeFtpKg(effectiveFtpKg),
    color: getRiskColor(effectiveRiskScore),
    zone,
    zoneName: zoneDef.label,
    confidence: effectiveConfidence,
    isDashed: effectiveConfidence < 0.65
  };
  
  return {
    id: id ?? 'current',
    name: name ?? 'Athlète',
    vlamax,
    tte,
    ftpKg: effectiveFtpKg,
    riskScore: effectiveRiskScore,
    riskLevel: effectiveRiskLevel,
    confidence: effectiveConfidence,
    position,
    label
  };
}

export function computeProjectedPosition(
  current: MapDataPoint,
  deltaVlamax: number,
  deltaTTE: number
): MapDataPoint {
  const newVlamax = clamp(current.vlamax + deltaVlamax, 0.20, 0.90);
  const newTTE = clamp(current.tte + deltaTTE, 25, 80);
  
  const newZone = getZoneForPosition(newVlamax, newTTE);
  const zoneDef = MAP_ZONES.find(z => z.id === newZone)!;
  
  // Estimer le nouveau risque (simplifié)
  const riskDelta = deltaVlamax > 0 ? 5 : -5; // VLamax down = risk down
  const newRiskScore = clamp(current.riskScore + riskDelta, 0, 100);
  
  const position: AthleteMapPosition = {
    x: newVlamax,
    y: newTTE,
    size: current.position.size,
    color: getRiskColor(newRiskScore),
    zone: newZone,
    zoneName: zoneDef.label,
    confidence: current.confidence * 0.85, // Projection = moins de confiance
    isDashed: true // Projection toujours en pointillés
  };
  
  return {
    ...current,
    id: 'projected',
    name: `${current.name} (projection)`,
    vlamax: newVlamax,
    tte: newTTE,
    riskScore: newRiskScore,
    position,
    label: 'Après ajustements'
  };
}

// ============================================
// EXPLICATIONS INTERACTIVES
// ============================================

export function generateMapExplanation(
  data: MapDataPoint,
  objectif: string
): MapExplanation {
  const zone = MAP_ZONES.find(z => z.id === data.position.zone);
  const goal = objectif.toLowerCase();
  const isLongDistance = goal.includes('im') || goal.includes('ironman') || goal.includes('marathon');
  
  // Pourquoi vous êtes ici
  let why = `Votre VLamax (${data.vlamax.toFixed(2)}) et TTE (${data.tte} min) vous positionnent en Zone ${data.position.zone}.`;
  
  if (zone) {
    why += ` ${zone.description}`;
  }
  
  // Implications
  const implications: string[] = [];
  
  switch (data.position.zone) {
    case 'A':
      implications.push('Excellente utilisation des graisses comme carburant');
      implications.push('Capacité à maintenir des efforts prolongés');
      implications.push('Risque de manque de punch sur les variations');
      break;
    case 'B':
      implications.push('Profil adaptable à plusieurs formats de course');
      implications.push('Équilibre entre puissance et endurance');
      implications.push('Marge d\'optimisation dans les deux directions');
      break;
    case 'C':
      implications.push('Bonne puissance mais durabilité limitée');
      implications.push('Risque de déplétion glycogène sur longue distance');
      implications.push('Nécessite stratégie nutritionnelle rigoureuse');
      break;
    case 'D':
      implications.push('Profil explosif, excellente capacité sprint');
      implications.push('Consommation rapide des réserves de glycogène');
      implications.push('Inadapté aux efforts > 2h sans transformation');
      break;
  }
  
  // Recommandations
  const recommendations: string[] = [];
  
  if (data.position.zone === 'A' && isLongDistance) {
    recommendations.push('Maintenir le profil actuel');
    recommendations.push('Travailler la puissance sans dégrader le TTE');
    recommendations.push('Optimiser la nutrition pour performance');
  } else if (data.position.zone === 'D' && isLongDistance) {
    recommendations.push('Réduction progressive de VLamax');
    recommendations.push('Développement TTE via Z2 et Sweet Spot');
    recommendations.push('Transformation sur 12-16 semaines minimum');
  } else if (data.position.zone === 'C') {
    recommendations.push('Allonger les sorties d\'endurance fondamentale');
    recommendations.push('Intégrer des blocs Z2 prolongés');
    recommendations.push('Surveiller la nutrition en course');
  } else {
    recommendations.push('Ajuster selon objectif prioritaire');
    recommendations.push('Équilibrer charge qualité vs volume');
    recommendations.push('Réévaluer après bloc d\'entraînement');
  }
  
  return { why, implications, recommendations };
}

// ============================================
// CHATBOT Q&A
// ============================================

export const CHATBOT_MAP_QA = [
  {
    question: "Que signifie ma position sur la Metabolic Balance Map ?",
    answer: "Votre position montre l'équilibre entre votre capacité de production rapide d'énergie (VLamax) et votre capacité à maintenir l'effort (TTE). Ce n'est pas un classement — chaque zone est optimale pour différents types d'épreuves."
  },
  {
    question: "Pourquoi ma bulle est-elle rouge ?",
    answer: "La couleur indique votre niveau de risque blessure. Rouge signifie risque élevé, ce qui appelle à la prudence dans la programmation mais ne signifie pas que vous êtes blessé."
  },
  {
    question: "Comment passer de Zone C à Zone A ?",
    answer: "La transformation métabolique prend du temps (12-16 semaines). Il faut réduire le VLamax par du travail d'endurance fondamentale et développer le TTE par des efforts prolongés en Zone 2-3."
  },
  {
    question: "La taille de ma bulle est petite, est-ce grave ?",
    answer: "La taille représente votre FTP/kg (puissance relative). Une petite bulle signifie un FTP/kg plus bas, ce qui peut être normal selon votre niveau et votre objectif."
  }
];

// Export unique
export function generateMetabolicBalanceMapData(
  currentInput: MapInput,
  showProjection: boolean = false,
  deltaVlamax: number = -0.05,
  deltaTTE: number = 5
): MetabolicBalanceMapData {
  const current = computeAthleteMapPosition(currentInput);
  
  let projected: MapDataPoint | null = null;
  if (showProjection && current) {
    projected = computeProjectedPosition(current, deltaVlamax, deltaTTE);
  }
  
  return {
    current,
    projected,
    zones: MAP_ZONES
  };
}
