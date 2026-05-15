/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FatMax TFCL™ V2 – Estimation Métabolique Avancée
 * Two For Coaching Lab Method™
 * 
 * DÉFINITION OFFICIELLE:
 * La FatMax TFCL™ correspond à la zone d'intensité où l'oxydation lipidique est
 * probablement maximale pour un athlète donné, compte tenu de son profil métabolique
 * (VLamax), de sa durabilité (TTE), de son objectif et de son état de fatigue.
 * Il s'agit d'une estimation fonctionnelle, non d'une mesure directe.
 * 
 * MENTION SCIENTIFIQUE OBLIGATOIRE:
 * Sans calorimétrie indirecte, la FatMax exacte ne peut pas être mesurée.
 * TFCL propose une plage réaliste et contextualisée.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { calculateCrossoverZone } from './scenarioEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type FatMaxObjectif = "IM" | "70.3" | "Marathon" | "Semi" | "10km" | "Ironman";

export type FatMaxConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface FatMaxTFCLResult {
  // ─── FatMax PHYSIOLOGIQUE (pure, indépendante de l'objectif) ───
  // Cette valeur reflète la biologie de l'athlète (VLamax + VO2max + TTE + fatigue)
  centerPctFTP: number;        // = physioCenterPctFTP (compat ascendante)
  minPctFTP: number;
  maxPctFTP: number;
  physioCenterPctFTP: number;  // alias explicite
  physioMinPctFTP: number;
  physioMaxPctFTP: number;

  // ─── ZONE DE TRAVAIL RECOMMANDÉE (modulée par l'objectif) ───
  // Cette plage indique OÙ entraîner autour de la FatMax selon l'objectif
  workCenterPctFTP: number;
  workMinPctFTP: number;
  workMaxPctFTP: number;
  workZoneRationale: string;   // Justification du décalage objectif

  // Crossover Zone (50% lipides / 50% glucides) — basée sur la FatMax physiologique
  crossoverZone: [number, number];
  crossoverZoneLabel: string;
  
  // Confiance
  confidence: number;           // 0-1
  confidenceLevel: FatMaxConfidenceLevel;
  confidenceLabel: string;
  
  // Métadonnées
  objectif: FatMaxObjectif;
  objectifLabel: string;
  
  // Ajustements appliqués (pour transparence)
  adjustments: FatMaxAdjustment[];
  
  // Textes explicatifs
  interpretation: string;       // Texte pour l'athlète
  staffNote: string;            // Note technique pour le staff
  disclaimer: string;           // Avertissement scientifique
  
  // Indicateurs métaboliques
  metabolicZone: "lipid_dominant" | "balanced" | "carb_dominant";
  zoneLabel: string;
}

export interface FatMaxAdjustment {
  id: string;
  label: string;
  value: number;
  direction: "up" | "down" | "neutral";
  explanation: string;
}

export interface FatMaxTFCLInput {
  // Sources unifiées uniquement
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  vo2maxEffectif: number | null;
  tteEffectif: number | null;           // en minutes
  tteConfidence: number;
  fatigueIndex: number | null;          // 0-100
  objectif: FatMaxObjectif;
  ftp?: number | null;                  // Optionnel, pour calcul W
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const OBJECTIF_OFFSET: Record<FatMaxObjectif, number> = {
  IM: 4,
  Ironman: 4,
  "70.3": 2,
  Marathon: 3,
  Semi: 1,
  "10km": -3,
};

const OBJECTIF_LABELS: Record<FatMaxObjectif, string> = {
  IM: "Ironman",
  Ironman: "Ironman",
  "70.3": "70.3 / Half Ironman",
  Marathon: "Marathon",
  Semi: "Semi-Marathon",
  "10km": "10 km",
};

export const FATMAX_DEFINITIONS = {
  official: `La FatMax TFCL™ correspond à la zone d'intensité où l'oxydation lipidique est probablement maximale pour un athlète donné, compte tenu de son profil métabolique (VLamax), de sa durabilité (TTE), de son objectif et de son état de fatigue. Il s'agit d'une estimation fonctionnelle, non d'une mesure directe.`,
  
  disclaimer: `Sans calorimétrie indirecte, la FatMax exacte ne peut pas être mesurée. TFCL propose une plage réaliste et contextualisée.`,
  
  scientificWarning: `FatMax TFCL™ est une estimation, pas une mesure directe. Valeurs dépendantes du modèle et du contexte.`,
  
  athleteExplanation: `Cette zone correspond à l'intensité où ton corps utilise le plus efficacement les graisses selon ton profil actuel.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Audit 2D F29 — Ancre FatMax canonique (%FTP)
 *
 * Formule unifiée TFCL : `clamp(78 − 52·(VLa−0.25) + 0.15·(VO2−50), 48, 82)`.
 * Source unique pour tous les pipelines (snapshot diagnostic, ExportTools,
 * coachingCompass, nutrition). Ne PAS dupliquer ailleurs.
 *
 * @param vlamax mmol/L/s (effectif)
 * @param vo2max ml/kg/min (optionnel — terme correctif)
 * @returns %FTP arrondi, ou null si VLamax invalide
 */
export function computeFatMaxAnchorPctFTP(
  vlamax: number | null | undefined,
  vo2max: number | null | undefined = null
): number | null {
  if (vlamax == null || !Number.isFinite(vlamax) || vlamax <= 0) return null;
  const vo2Term = (vo2max != null && Number.isFinite(vo2max) && vo2max > 0)
    ? 0.15 * (vo2max - 50)
    : 0;
  const raw = 78 - 52 * (vlamax - 0.25) + vo2Term;
  return Math.round(clamp(raw, 48, 82));
}

/**
 * Calcule la FatMax TFCL™ selon la formule officielle V2
 * 
 * Formule:
 * FatMax_center_%FTP = CLAMP(78 - 45 × (vlamaxEffectif − 0.25), 52, 82)
 * 
 * Règle physiologique:
 * - VLamax basse → dépendance lipidique élevée → FatMax plus haute
 * - VLamax élevée → glycolyse dominante → FatMax plus basse
 */
export function computeFatMaxTFCL(input: FatMaxTFCLInput): FatMaxTFCLResult | null {
  const {
    vlamaxEffectif,
    vlamaxConfidence,
    vo2maxEffectif,
    tteEffectif,
    tteConfidence,
    fatigueIndex,
    objectif,
  } = input;

  // Validation: VLamax obligatoire
  if (vlamaxEffectif === null || !Number.isFinite(vlamaxEffectif) || vlamaxEffectif <= 0) {
    return null;
  }

  const adjustments: FatMaxAdjustment[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Centre métabolique FatMax (%FTP) — FORMULE OFFICIELLE TFCL V2
  // FatMax = 78 − 52 × (VLamax − 0.25) + 0.15 × (VO2max − 50)
  // Borne basse 48% (sprinters purs), borne haute 82% (oxydatifs purs)
  // ─────────────────────────────────────────────────────────────────────────────
  const vo2Term = (vo2maxEffectif !== null && Number.isFinite(vo2maxEffectif) && vo2maxEffectif > 0)
    ? 0.15 * (vo2maxEffectif - 50)
    : 0;
  const rawCenter = 78 - 52 * (vlamaxEffectif - 0.25) + vo2Term;
  const centerBase = clamp(rawCenter, 48, 82);
  
  adjustments.push({
    id: "base",
    label: "Centre métabolique",
    value: centerBase,
    direction: "neutral",
    explanation: vo2maxEffectif
      ? `VLamax ${vlamaxEffectif.toFixed(2)} + VO2max ${vo2maxEffectif.toFixed(0)} → base ${centerBase.toFixed(0)}% FTP`
      : `VLamax ${vlamaxEffectif.toFixed(2)} → base ${centerBase.toFixed(0)}% FTP (VO2max indisponible)`,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Objectif → décalage de ZONE DE TRAVAIL (PAS de la FatMax physio)
  // P2 V2: La FatMax est une réalité biologique, elle ne change pas selon l'objectif.
  // Seule la zone d'entraînement recommandée se décale autour d'elle.
  // ─────────────────────────────────────────────────────────────────────────────
  const normalizedObjectif = (objectif === "IM" ? "Ironman" : objectif) as FatMaxObjectif;
  const objectifOffset = OBJECTIF_OFFSET[normalizedObjectif] ?? 0;

  let workZoneRationale = "Zone de travail centrée sur la FatMax physiologique.";
  if (objectifOffset > 0) {
    workZoneRationale = `Objectif ${OBJECTIF_LABELS[normalizedObjectif]} → travail recommandé légèrement au-dessus de FatMax (+${objectifOffset}%) pour habituer au rythme course.`;
  } else if (objectifOffset < 0) {
    workZoneRationale = `Objectif ${OBJECTIF_LABELS[normalizedObjectif]} → travail recommandé en-dessous de FatMax (${objectifOffset}%) car distance courte = enjeu glucidique.`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Ajustement durabilité (TTE) — affecte la FatMax PHYSIO
  // ─────────────────────────────────────────────────────────────────────────────
  let tteOffset = 0;
  if (tteEffectif !== null && Number.isFinite(tteEffectif)) {
    if (tteEffectif < 40) {
      tteOffset = -3;
      adjustments.push({
        id: "tte",
        label: "Durabilité faible",
        value: tteOffset,
        direction: "down",
        explanation: `TTE ${tteEffectif} min < 40 → efficacité lipidique réduite`,
      });
    } else if (tteEffectif > 65) {
      tteOffset = 2;
      adjustments.push({
        id: "tte",
        label: "Durabilité élevée",
        value: tteOffset,
        direction: "up",
        explanation: `TTE ${tteEffectif} min > 65 → métabolisme aérobie optimisé`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Ajustement fatigue — affecte la FatMax PHYSIO
  // ─────────────────────────────────────────────────────────────────────────────
  let fatigueOffset = 0;
  if (fatigueIndex !== null && Number.isFinite(fatigueIndex)) {
    if (fatigueIndex > 70) {
      fatigueOffset = -3;
      adjustments.push({
        id: "fatigue",
        label: "Fatigue élevée",
        value: fatigueOffset,
        direction: "down",
        explanation: `Fatigue ${fatigueIndex}% → efficacité métabolique dégradée`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: FatMax PHYSIOLOGIQUE finale (sans offset objectif)
  // ─────────────────────────────────────────────────────────────────────────────
  const physioOffset = tteOffset + fatigueOffset;
  const physioCenter = clamp(centerBase + physioOffset, 48, 85);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Plage FatMax physiologique
  // ─────────────────────────────────────────────────────────────────────────────
  const globalConfidence = Math.min(
    vlamaxConfidence,
    tteConfidence,
    fatigueIndex !== null ? 0.8 : 0.6
  );
  
  let rangeWidth = 4;
  if (globalConfidence < 0.55) {
    rangeWidth = 8;
  } else if (globalConfidence < 0.7) {
    rangeWidth = 6;
  }

  const physioMin = clamp(physioCenter - rangeWidth, 48, 85);
  const physioMax = clamp(physioCenter + rangeWidth, 48, 85);

  // Zone de travail = FatMax physio + offset objectif
  const workCenter = clamp(physioCenter + objectifOffset, 48, 92);
  const workMin = clamp(physioMin + objectifOffset, 48, 92);
  const workMax = clamp(physioMax + objectifOffset, 48, 92);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Confiance et niveau
  // ─────────────────────────────────────────────────────────────────────────────
  let confidenceLevel: FatMaxConfidenceLevel;
  let confidenceLabel: string;
  
  if (globalConfidence >= 0.8) {
    confidenceLevel = "HIGH";
    confidenceLabel = "Élevée";
  } else if (globalConfidence >= 0.6) {
    confidenceLevel = "MEDIUM";
    confidenceLabel = "Moyenne";
  } else {
    confidenceLevel = "LOW";
    confidenceLabel = "Faible";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: Zone métabolique (basée sur physio)
  // ─────────────────────────────────────────────────────────────────────────────
  let metabolicZone: FatMaxTFCLResult["metabolicZone"];
  let zoneLabel: string;
  
  if (physioCenter >= 72) {
    metabolicZone = "lipid_dominant";
    zoneLabel = "Profil lipidique dominant";
  } else if (physioCenter <= 62) {
    metabolicZone = "carb_dominant";
    zoneLabel = "Profil glucidique dominant";
  } else {
    metabolicZone = "balanced";
    zoneLabel = "Profil équilibré";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 9: Crossover Zone (basée sur la FatMax PHYSIO)
  // ─────────────────────────────────────────────────────────────────────────────
  const crossoverZone = calculateCrossoverZone({
    fatmaxPct: physioCenter,
    vlamaxValue: vlamaxEffectif,
    confidence: globalConfidence,
  });
  const crossoverZoneLabel = `Zone de transition lipides/glucides: ${crossoverZone[0]}–${crossoverZone[1]}% FTP`;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 10: Textes explicatifs
  // ─────────────────────────────────────────────────────────────────────────────
  const interpretation = generateAthleteInterpretation(physioCenter, metabolicZone, normalizedObjectif);
  const staffNote = generateStaffNote(input, physioCenter, globalConfidence, crossoverZone);

  return {
    // Physio (compat: centerPctFTP === physioCenterPctFTP)
    centerPctFTP: Math.round(physioCenter),
    minPctFTP: Math.round(physioMin),
    maxPctFTP: Math.round(physioMax),
    physioCenterPctFTP: Math.round(physioCenter),
    physioMinPctFTP: Math.round(physioMin),
    physioMaxPctFTP: Math.round(physioMax),
    // Zone de travail (modulée par objectif)
    workCenterPctFTP: Math.round(workCenter),
    workMinPctFTP: Math.round(workMin),
    workMaxPctFTP: Math.round(workMax),
    workZoneRationale,
    crossoverZone,
    crossoverZoneLabel,
    confidence: globalConfidence,
    confidenceLevel,
    confidenceLabel,
    objectif: normalizedObjectif,
    objectifLabel: OBJECTIF_LABELS[normalizedObjectif],
    adjustments,
    interpretation,
    staffNote,
    disclaimer: FATMAX_DEFINITIONS.disclaimer,
    metabolicZone,
    zoneLabel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - GÉNÉRATION DE TEXTES
// ═══════════════════════════════════════════════════════════════════════════════

function generateAthleteInterpretation(
  center: number,
  zone: FatMaxTFCLResult["metabolicZone"],
  objectif: FatMaxObjectif
): string {
  const baseText = FATMAX_DEFINITIONS.athleteExplanation;
  
  let zoneText = "";
  switch (zone) {
    case "lipid_dominant":
      zoneText = "Ton profil favorise naturellement l'utilisation des graisses, ce qui est un atout pour les épreuves longues.";
      break;
    case "carb_dominant":
      zoneText = "Ton profil métabolique s'appuie davantage sur les glucides. Une nutrition adaptée sera clé en course.";
      break;
    case "balanced":
      zoneText = "Ton profil métabolique est équilibré entre lipides et glucides.";
      break;
  }
  
  return `${baseText} ${zoneText}`;
}

function generateStaffNote(
  input: FatMaxTFCLInput,
  center: number,
  confidence: number,
  crossoverZone?: [number, number]
): string {
  const parts: string[] = [];
  
  parts.push(`FatMax estimée à ${center}% FTP (confiance ${(confidence * 100).toFixed(0)}%).`);
  
  if (crossoverZone) {
    parts.push(`Crossover Zone: ${crossoverZone[0]}–${crossoverZone[1]}% FTP.`);
  }
  
  if (input.vlamaxEffectif !== null) {
    parts.push(`VLamax source: ${input.vlamaxEffectif.toFixed(2)} mmol/L/s.`);
  }
  
  if (input.tteEffectif !== null) {
    parts.push(`TTE: ${input.tteEffectif} min.`);
  }
  
  if (confidence < 0.7) {
    parts.push("⚠️ Confiance limitée – recommander test terrain ou labo pour affiner.");
  }
  
  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getFatMaxConfidenceColor(level: FatMaxConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "text-green-600 dark:text-green-400";
    case "MEDIUM":
      return "text-amber-600 dark:text-amber-400";
    case "LOW":
      return "text-red-600 dark:text-red-400";
  }
}

export function getFatMaxConfidenceBadgeClass(level: FatMaxConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700";
    case "MEDIUM":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700";
    case "LOW":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
  }
}

export function getMetabolicZoneColor(zone: FatMaxTFCLResult["metabolicZone"]): string {
  switch (zone) {
    case "lipid_dominant":
      return "text-emerald-600 dark:text-emerald-400";
    case "balanced":
      return "text-blue-600 dark:text-blue-400";
    case "carb_dominant":
      return "text-orange-600 dark:text-orange-400";
  }
}

export function formatFatMaxRange(result: FatMaxTFCLResult): string {
  return `${result.minPctFTP}–${result.maxPctFTP}% FTP`;
}

export function formatFatMaxWatts(result: FatMaxTFCLResult, ftp: number | null): string | null {
  if (ftp === null || ftp <= 0) return null;
  
  const minW = Math.round(ftp * result.minPctFTP / 100);
  const maxW = Math.round(ftp * result.maxPctFTP / 100);
  
  return `${minW}–${maxW} W`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONNÉES POUR GRAPHIQUE SIGNATURE
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnergyProfileDataPoint {
  intensityPctFTP: number;
  lipidPct: number;
  carbPct: number;
  label: string;
  isFatMaxZone: boolean;
  isRaceIntensity: boolean;
}

/**
 * Génère les données pour le graphique signature FatMax vs Race Intensity
 */
export function generateEnergyProfileData(
  fatmax: FatMaxTFCLResult,
  raceIntensityPct: number | null = null
): EnergyProfileDataPoint[] {
  const data: EnergyProfileDataPoint[] = [];
  
  // Générer les points de 45% à 95% FTP
  for (let intensity = 45; intensity <= 95; intensity += 5) {
    // Modèle de décroissance lipidique
    // À FatMax center, lipides = 50%
    // Au-dessus, lipides diminuent
    // En-dessous, lipides augmentent
    const distanceFromFatMax = intensity - fatmax.centerPctFTP;
    
    // Décroissance sigmoïde modifiée
    let lipidPct: number;
    if (intensity <= fatmax.minPctFTP) {
      // Zone basse: lipides dominants
      lipidPct = Math.min(85, 60 + (fatmax.minPctFTP - intensity) * 1.5);
    } else if (intensity >= fatmax.maxPctFTP) {
      // Zone haute: glucides dominants
      const excess = intensity - fatmax.maxPctFTP;
      lipidPct = Math.max(5, 45 - excess * 2.5);
    } else {
      // Zone FatMax: max lipides
      lipidPct = 50 + 10 * Math.cos((intensity - fatmax.centerPctFTP) / (fatmax.maxPctFTP - fatmax.minPctFTP) * Math.PI);
    }
    
    lipidPct = Math.max(5, Math.min(85, lipidPct));
    const carbPct = 100 - lipidPct;
    
    const isFatMaxZone = intensity >= fatmax.minPctFTP && intensity <= fatmax.maxPctFTP;
    const isRaceIntensity = raceIntensityPct !== null && Math.abs(intensity - raceIntensityPct) < 3;
    
    data.push({
      intensityPctFTP: intensity,
      lipidPct: Math.round(lipidPct),
      carbPct: Math.round(carbPct),
      label: `${intensity}%`,
      isFatMaxZone,
      isRaceIntensity,
    });
  }
  
  return data;
}

/**
 * Détermine si l'intensité course est dans la zone de conflit métabolique
 */
export function isMetabolicConflict(
  fatmax: FatMaxTFCLResult,
  raceIntensityPct: number
): boolean {
  return raceIntensityPct > fatmax.maxPctFTP;
}

/**
 * Génère le message de conflit métabolique
 */
export function getMetabolicConflictMessage(
  fatmax: FatMaxTFCLResult,
  raceIntensityPct: number
): string | null {
  if (!isMetabolicConflict(fatmax, raceIntensityPct)) {
    return null;
  }
  
  const gap = raceIntensityPct - fatmax.maxPctFTP;
  
  if (gap > 10) {
    return `⚠️ Intensité course ${raceIntensityPct}% très au-dessus de la FatMax (${fatmax.maxPctFTP}%). Dépendance glucidique critique – nutrition et pacing à optimiser.`;
  }
  
  return `⚠️ Intensité course ${raceIntensityPct}% au-dessus de la zone FatMax. Apport glucidique soutenu requis.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMY CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

export const FATMAX_ACADEMY_CONTENT = {
  title: "FatMax : estimation, limites et usages pratiques",
  
  sections: [
    {
      id: "definition",
      title: "Qu'est-ce que la FatMax ?",
      content: `La FatMax (Fat Oxidation Max) désigne l'intensité d'effort à laquelle l'organisme utilise le maximum de graisses comme source d'énergie. Au-delà de cette intensité, la contribution des glucides augmente rapidement.

TFCL estime cette zone à partir du profil métabolique de l'athlète, sans prétendre remplacer une mesure directe.`,
    },
    {
      id: "lab-vs-model",
      title: "Labo vs Modélisation",
      content: `**Mesure directe (calorimétrie indirecte):**
- Analyse des échanges gazeux (O2/CO2) pendant un test incrémental
- Précision: ±2-5% selon les protocoles
- Coût: 150-400€, disponibilité limitée

**Modélisation TFCL:**
- Basée sur VLamax, TTE, objectif et fatigue
- Produit une plage (pas une valeur unique)
- Avantage: accessible, contextualisée, actualisable`,
    },
    {
      id: "errors",
      title: "Erreurs fréquentes des autres apps",
      content: `1. **Afficher une valeur unique** – La FatMax n'est pas un point fixe
2. **Ignorer la VLamax** – Sans profil glycolytique, l'estimation est aveugle
3. **Promettre une oxydation en g/min** – Impossible sans calorimétrie
4. **Ne pas contextualiser** – La FatMax varie selon l'objectif et la fatigue

TFCL évite ces pièges en produisant une **plage contextualisée** avec indice de confiance.`,
    },
    {
      id: "usage",
      title: "Comment utiliser la FatMax TFCL™",
      content: `**Pour l'athlète:**
- Zone cible pour les sorties longues Z2
- Repère pour le pacing marathon/Ironman
- Indicateur de la marge avant basculement glucidique

**Pour le coach:**
- Piloter la nutrition (g/h glucides relatifs à FatMax)
- Identifier le conflit métabolique si intensité course > FatMax
- Adapter l'entraînement pour élever la FatMax (travail VLamax)`,
    },
    {
      id: "improvement",
      title: "Comment améliorer sa FatMax",
      content: `**Leviers physiologiques:**
1. **Baisser la VLamax** – Travail aérobie prolongé, séances Z2 longues
2. **Augmenter la TTE** – Blocs de durabilité, nutrition adaptée
3. **Optimiser la composition corporelle** – Ratio masse maigre/grasse

**Délai:** 6-12 semaines pour observer des changements significatifs.`,
    },
  ],
  
  disclaimer: FATMAX_DEFINITIONS.scientificWarning,
};
