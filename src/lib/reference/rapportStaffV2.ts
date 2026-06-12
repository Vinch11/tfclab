/**
 * TFCL Rapport Staff-Grade V2
 * Two For Coaching Lab Method™
 * 
 * Structure officielle du rapport PDF staff-grade
 * Conforme aux spécifications V2
 */

import {
  VLamaxV2Display,
  calibrateVLamaxV2,
  TFCLCalibrationInput,
  TFCL_STANDARD_TEXTS,
  ObjectifPrincipal,
  getObjectifLabel,
} from "./tfclV2Core";

// =============================================
// TYPES RAPPORT V2
// =============================================

export interface RapportStaffV2 {
  metadata: RapportMetadata;
  page1_contexte: RapportContexte;
  page2_positionnement: RapportPositionnement;
  page3_consequences: RapportConsequences;
  page4_objectifs: RapportObjectifs;
}

export interface RapportMetadata {
  athleteName: string;
  generatedAt: string;
  version: string;
  confidenceGlobal: number;
}

export interface RapportContexte {
  objectifPrincipal: string;
  objectifLabel: string;
  sourcesUtilisees: string[];
  donneesMesurees: string[];
  donneesEstimees: string[];
  donneesModelisees: string[];
  indiceConfiance: {
    score: number;
    label: string;
    explication: string;
  };
}

export interface AxePhysiologique {
  nom: string;
  valeur: number | null;
  unite: string;
  source: "mesuré" | "estimé" | "modélisé";
  plageTFCL: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  } | null;
  percentile: number | null;
  zone: string;
  commentaire: string;
}

export interface RapportPositionnement {
  axes: AxePhysiologique[];
  syntheseGlobal: string;
}

export interface DirectionEntrainement {
  type: "coherent" | "limitant" | "contre_productif";
  label: string;
  description: string;
  priorite: number;
}

export interface RapportConsequences {
  directions: DirectionEntrainement[];
  avertissement: string;
}

export interface PlageObjectif {
  metrique: string;
  unite: string;
  realiste: { min: number; max: number; justification: string };
  ambitieux: { min: number; max: number; justification: string };
  improbable: { min: number; justification: string };
}

export interface RapportObjectifs {
  plages: PlageObjectif[];
  noteMethodologique: string;
}

// =============================================
// GÉNÉRATION DU RAPPORT
// =============================================

export interface GenerateRapportInput {
  athleteName: string;
  objectif: ObjectifPrincipal;
  vlamax: number;
  vlamaxSource?: "estimation" | "test_terrain" | "test_labo";
  vo2max?: number;
  ftp?: number;
  tteMin?: number;
  sex?: "H" | "F";
  age?: number;
  poids?: number;
  volumeHebdo?: number;
  economie?: number;
  fatigueScore?: number;
}

/**
 * Génère le rapport staff-grade V2 complet
 */
export function generateRapportStaffV2(input: GenerateRapportInput): RapportStaffV2 {
  const { 
    athleteName, objectif, vlamax, vlamaxSource, vo2max, ftp, 
    tteMin, sex, age, poids, volumeHebdo, economie, fatigueScore 
  } = input;
  
  // Calibrer VLamax
  const vlamaxDisplay = calibrateVLamaxV2({
    objectif,
    vlamax,
    vlamaxSource,
    vo2max,
    sex,
    age,
    volumeHebdo,
  });
  
  // PAGE 1 — Contexte
  const page1 = generateContexte(input, vlamaxDisplay);
  
  // PAGE 2 — Positionnement
  const page2 = generatePositionnement(input, vlamaxDisplay);
  
  // PAGE 3 — Conséquences
  const page3 = generateConsequences(input, vlamaxDisplay);
  
  // PAGE 4 — Objectifs
  const page4 = generateObjectifs(input, vlamaxDisplay);
  
  return {
    metadata: {
      athleteName,
      generatedAt: new Date().toISOString(),
      version: "TFCL-V2.0",
      confidenceGlobal: vlamaxDisplay?.confidence.score || 0.5,
    },
    page1_contexte: page1,
    page2_positionnement: page2,
    page3_consequences: page3,
    page4_objectifs: page4,
  };
}

// =============================================
// GÉNÉRATION PAGE 1 — CONTEXTE
// =============================================

function generateContexte(
  input: GenerateRapportInput,
  vlamaxDisplay: VLamaxV2Display | null
): RapportContexte {
  const sourcesUtilisees: string[] = [];
  const donneesMesurees: string[] = [];
  const donneesEstimees: string[] = [];
  const donneesModelisees: string[] = [];
  
  // Classifier les données
  if (input.vo2max) {
    sourcesUtilisees.push("VO2max");
    donneesMesurees.push("VO2max");
  }
  
  if (input.ftp) {
    sourcesUtilisees.push("FTP");
    donneesMesurees.push("FTP (test terrain)");
  }
  
  if (input.tteMin) {
    sourcesUtilisees.push("TTE");
    donneesEstimees.push("TTE (durée au seuil)");
  }
  
  if (input.vlamax) {
    sourcesUtilisees.push("VLamax");
    if (input.vlamaxSource === "test_labo") {
      donneesMesurees.push("VLamax (lactate)");
    } else if (input.vlamaxSource === "test_terrain") {
      donneesEstimees.push("VLamax (test terrain)");
    } else {
      donneesModelisees.push("VLamax (modèle TFCL)");
    }
  }
  
  if (input.economie) {
    donneesEstimees.push("Économie de course");
  }
  
  if (input.fatigueScore !== undefined) {
    donneesModelisees.push("Score de fatigue");
  }
  
  // Confiance
  const confidenceScore = vlamaxDisplay?.confidence.score || 0.5;
  let confidenceLabel: string;
  let confidenceExplication: string;
  
  if (confidenceScore >= 0.75) {
    confidenceLabel = "Élevée";
    confidenceExplication = "Données multiples cohérentes. Interprétation fiable.";
  } else if (confidenceScore >= 0.55) {
    confidenceLabel = "Moyenne";
    confidenceExplication = "Données partielles. Interprétation avec réserve.";
  } else {
    confidenceLabel = "Faible";
    confidenceExplication = "Données limitées. Confirmation recommandée.";
  }
  
  return {
    objectifPrincipal: input.objectif,
    objectifLabel: getObjectifLabel(input.objectif),
    sourcesUtilisees,
    donneesMesurees,
    donneesEstimees,
    donneesModelisees,
    indiceConfiance: {
      score: confidenceScore,
      label: confidenceLabel,
      explication: confidenceExplication,
    },
  };
}

// =============================================
// GÉNÉRATION PAGE 2 — POSITIONNEMENT
// =============================================

function generatePositionnement(
  input: GenerateRapportInput,
  vlamaxDisplay: VLamaxV2Display | null
): RapportPositionnement {
  const axes: AxePhysiologique[] = [];
  
  // VO2max
  if (input.vo2max) {
    axes.push({
      nom: "VO2max",
      valeur: input.vo2max,
      unite: "ml/kg/min",
      source: "mesuré",
      plageTFCL: null, // NON IMPLÉMENTÉ — référentiel VO2max à ajouter ultérieurement
      percentile: null,
      zone: input.vo2max >= 65 ? "Élevé" : input.vo2max >= 50 ? "Moyen" : "Bas",
      commentaire: `VO2max de ${input.vo2max} ml/kg/min.`,
    });
  }
  
  // VLamax
  if (vlamaxDisplay) {
    axes.push({
      nom: "VLamax",
      valeur: vlamaxDisplay.value,
      unite: vlamaxDisplay.unit,
      source: input.vlamaxSource === "test_labo" ? "mesuré" : 
              input.vlamaxSource === "test_terrain" ? "estimé" : "modélisé",
      plageTFCL: vlamaxDisplay.range,
      percentile: vlamaxDisplay.percentile,
      zone: vlamaxDisplay.zoneLabel,
      commentaire: vlamaxDisplay.interpretation,
    });
  }
  
  // TTE
  if (input.tteMin) {
    const tteZone = input.tteMin >= 55 ? "Excellent" : 
                    input.tteMin >= 45 ? "Bon" : 
                    input.tteMin >= 35 ? "Moyen" : "À développer";
    axes.push({
      nom: "TTE (Time to Exhaustion)",
      valeur: input.tteMin,
      unite: "min",
      source: "estimé",
      plageTFCL: null,
      percentile: null,
      zone: tteZone,
      commentaire: `Durabilité estimée de ${input.tteMin} min au seuil.`,
    });
  }
  
  // Économie
  if (input.economie) {
    axes.push({
      nom: "Économie de course",
      valeur: input.economie,
      unite: "ml/kg/km",
      source: "estimé",
      plageTFCL: null,
      percentile: null,
      zone: input.economie <= 180 ? "Excellente" : 
            input.economie <= 200 ? "Bonne" : "À améliorer",
      commentaire: `Économie estimée à ${input.economie} ml/kg/km.`,
    });
  }
  
  // Fatigue
  if (input.fatigueScore !== undefined) {
    axes.push({
      nom: "État de fatigue",
      valeur: input.fatigueScore,
      unite: "/100",
      source: "modélisé",
      plageTFCL: null,
      percentile: null,
      zone: input.fatigueScore <= 30 ? "Frais" : 
            input.fatigueScore <= 60 ? "Modéré" : "Élevé",
      commentaire: `Score de fatigue : ${input.fatigueScore}/100.`,
    });
  }
  
  // Synthèse globale
  let syntheseGlobal = "Profil physiologique ";
  if (vlamaxDisplay) {
    if (vlamaxDisplay.zone === "OPTIMAL") {
      syntheseGlobal += "équilibré pour l'objectif. ";
    } else if (vlamaxDisplay.zone === "LOW" || vlamaxDisplay.zone === "VERY_LOW") {
      syntheseGlobal += "orienté endurance (VLamax basse). ";
    } else {
      syntheseGlobal += "orienté puissance (VLamax haute). ";
    }
  }
  
  return { axes, syntheseGlobal };
}

// =============================================
// GÉNÉRATION PAGE 3 — CONSÉQUENCES
// =============================================

function generateConsequences(
  input: GenerateRapportInput,
  vlamaxDisplay: VLamaxV2Display | null
): RapportConsequences {
  const directions: DirectionEntrainement[] = [];
  
  if (!vlamaxDisplay) {
    return {
      directions: [],
      avertissement: "Données insuffisantes pour générer des orientations.",
    };
  }
  
  const zone = vlamaxDisplay.zone;
  const objectif = input.objectif;
  
  // Analyser cohérence
  if (zone === "OPTIMAL") {
    directions.push({
      type: "coherent",
      label: "Profil métabolique adapté",
      description: "VLamax dans la plage optimale pour votre objectif. Maintenir l'équilibre actuel.",
      priorite: 1,
    });
  }
  
  // Longue distance avec VLamax haute
  if ((objectif === "Ironman" || objectif === "Marathon" || objectif === "Trail") && 
      (zone === "HIGH" || zone === "VERY_HIGH")) {
    directions.push({
      type: "limitant",
      label: "VLamax élevée pour longue distance",
      description: "Profil glycolytique nécessitant une adaptation. Privilégier le travail en endurance fondamentale.",
      priorite: 1,
    });
    directions.push({
      type: "contre_productif",
      label: "Éviter les séances explosives",
      description: "Les intervalles courts haute intensité risquent de maintenir la VLamax élevée.",
      priorite: 2,
    });
    directions.push({
      type: "coherent",
      label: "Volume modéré en Z2",
      description: "Augmentation progressive du volume en zone 2 pour favoriser les adaptations aérobies.",
      priorite: 2,
    });
  }
  
  // Courte distance avec VLamax basse
  if ((objectif === "10K" || objectif === "Court") && 
      (zone === "LOW" || zone === "VERY_LOW")) {
    directions.push({
      type: "limitant",
      label: "VLamax basse pour courte distance",
      description: "Profil très aérobie limitant les performances explosives. Potentiel d'amélioration via travail glycolytique.",
      priorite: 1,
    });
    directions.push({
      type: "coherent",
      label: "Inclure des séances de vitesse",
      description: "Sprints courts et intervalles haute intensité pour développer la capacité glycolytique.",
      priorite: 2,
    });
  }
  
  // TTE faible
  if (input.tteMin && input.tteMin < 40) {
    directions.push({
      type: "limitant",
      label: "Durabilité à développer",
      description: "TTE inférieur à 40 min. Travail spécifique au seuil recommandé.",
      priorite: 2,
    });
  }
  
  // Fatigue élevée
  if (input.fatigueScore && input.fatigueScore > 70) {
    directions.push({
      type: "contre_productif",
      label: "État de fatigue élevé",
      description: "Reporter les séances clés. Privilégier la récupération active.",
      priorite: 1,
    });
  }
  
  // Trier par priorité
  directions.sort((a, b) => a.priorite - b.priorite);
  
  return {
    directions,
    avertissement: "Ces orientations sont des directions physiologiques, pas des prescriptions de séances. L'adaptation doit être réalisée par le coach.",
  };
}

// =============================================
// GÉNÉRATION PAGE 4 — OBJECTIFS
// =============================================

function generateObjectifs(
  input: GenerateRapportInput,
  vlamaxDisplay: VLamaxV2Display | null
): RapportObjectifs {
  const plages: PlageObjectif[] = [];
  
  // FTP si données disponibles
  if (input.ftp && input.poids) {
    const ftpKg = input.ftp / input.poids;
    const ageMultiplier = input.age ? (input.age > 40 ? 0.95 : 1) : 1;
    
    // Calcul des plages basé sur VLamax et volume
    const volumeMultiplier = input.volumeHebdo ? 
      (input.volumeHebdo >= 15 ? 1.1 : input.volumeHebdo >= 10 ? 1.05 : 1) : 1;
    
    const vlamaxPenalty = vlamaxDisplay && vlamaxDisplay.zone === "VERY_HIGH" ? 0.95 : 1;
    
    const realisteMax = ftpKg * 1.05 * ageMultiplier * volumeMultiplier * vlamaxPenalty;
    const realisteMin = ftpKg * 0.98;
    const ambitieuxMax = ftpKg * 1.12 * ageMultiplier * volumeMultiplier * vlamaxPenalty;
    const improbable = ftpKg * 1.20 * ageMultiplier;
    
    plages.push({
      metrique: "FTP/kg",
      unite: "W/kg",
      realiste: {
        min: Number(realisteMin.toFixed(2)),
        max: Number(realisteMax.toFixed(2)),
        justification: "Progression typique sur 12 semaines avec charge adaptée.",
      },
      ambitieux: {
        min: Number(realisteMax.toFixed(2)),
        max: Number(ambitieuxMax.toFixed(2)),
        justification: "Nécessite conditions optimales : récupération, nutrition, volume.",
      },
      improbable: {
        min: Number(improbable.toFixed(2)),
        justification: "Dépasserait les adaptations physiologiques typiques sur cette période.",
      },
    });
  }
  
  // TTE
  if (input.tteMin) {
    const tteRealiste = Math.min(60, input.tteMin + 5);
    const tteAmbitieux = Math.min(65, input.tteMin + 10);
    const tteImprobable = input.tteMin + 20;
    
    plages.push({
      metrique: "TTE",
      unite: "min",
      realiste: {
        min: input.tteMin,
        max: tteRealiste,
        justification: "Amélioration de 5 min typique sur cycle de 8-12 semaines.",
      },
      ambitieux: {
        min: tteRealiste,
        max: tteAmbitieux,
        justification: "Nécessite travail spécifique au seuil et volume suffisant.",
      },
      improbable: {
        min: tteImprobable,
        justification: "Adaptation exceptionnelle dépassant les normes observées.",
      },
    });
  }
  
  return {
    plages,
    noteMethodologique: `Les plages sont calculées en fonction de : âge (${input.age || "inconnu"}), VLamax (${vlamaxDisplay?.zoneLabel || "non calibrée"}), volume hebdomadaire (${input.volumeHebdo || "inconnu"} h). Elles représentent des probabilités, pas des garanties.`,
  };
}

// =============================================
// EXPORT TEXTE PDF
// =============================================

/**
 * Génère le texte formaté pour export PDF
 */
export function generateRapportPDFText(rapport: RapportStaffV2): string {
  const lines: string[] = [];
  
  // Header
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("RAPPORT STAFF-GRADE TWO FOR COACHING LAB V2");
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Athlète : ${rapport.metadata.athleteName}`);
  lines.push(`Généré le : ${new Date(rapport.metadata.generatedAt).toLocaleDateString("fr-FR")}`);
  lines.push(`Version : ${rapport.metadata.version}`);
  lines.push("");
  lines.push(TFCL_STANDARD_TEXTS.reportHeader);
  lines.push("");
  
  // PAGE 1
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("1. CONTEXTE & MÉTHODOLOGIE");
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`Objectif principal : ${rapport.page1_contexte.objectifLabel}`);
  lines.push("");
  lines.push("Sources utilisées :");
  rapport.page1_contexte.sourcesUtilisees.forEach(s => lines.push(`  • ${s}`));
  lines.push("");
  if (rapport.page1_contexte.donneesMesurees.length > 0) {
    lines.push("Données mesurées :");
    rapport.page1_contexte.donneesMesurees.forEach(d => lines.push(`  ✓ ${d}`));
  }
  if (rapport.page1_contexte.donneesEstimees.length > 0) {
    lines.push("Données estimées :");
    rapport.page1_contexte.donneesEstimees.forEach(d => lines.push(`  ~ ${d}`));
  }
  if (rapport.page1_contexte.donneesModelisees.length > 0) {
    lines.push("Données modélisées :");
    rapport.page1_contexte.donneesModelisees.forEach(d => lines.push(`  ≈ ${d}`));
  }
  lines.push("");
  lines.push(`Indice de confiance : ${rapport.page1_contexte.indiceConfiance.label} (${(rapport.page1_contexte.indiceConfiance.score * 100).toFixed(0)}%)`);
  lines.push(rapport.page1_contexte.indiceConfiance.explication);
  lines.push("");
  
  // PAGE 2
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("2. POSITIONNEMENT PHYSIOLOGIQUE");
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("");
  
  for (const axe of rapport.page2_positionnement.axes) {
    lines.push(`${axe.nom} : ${axe.valeur} ${axe.unite} [${axe.source}]`);
    if (axe.plageTFCL) {
      lines.push(`  Plage TFCL : ${axe.plageTFCL.p25.toFixed(2)} – ${axe.plageTFCL.p75.toFixed(2)}`);
      lines.push(`  Percentile : P${axe.percentile}`);
    }
    lines.push(`  Zone : ${axe.zone}`);
    lines.push(`  ${axe.commentaire}`);
    lines.push("");
  }
  
  lines.push(rapport.page2_positionnement.syntheseGlobal);
  lines.push("");
  lines.push(TFCL_STANDARD_TEXTS.vlamaxDisclaimer);
  lines.push("");
  
  // PAGE 3
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("3. CONSÉQUENCES D'ENTRAÎNEMENT");
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("");
  
  const coherents = rapport.page3_consequences.directions.filter(d => d.type === "coherent");
  const limitants = rapport.page3_consequences.directions.filter(d => d.type === "limitant");
  const contreProductifs = rapport.page3_consequences.directions.filter(d => d.type === "contre_productif");
  
  if (coherents.length > 0) {
    lines.push("✓ Cohérent avec l'objectif :");
    coherents.forEach(d => lines.push(`  • ${d.label} — ${d.description}`));
    lines.push("");
  }
  
  if (limitants.length > 0) {
    lines.push("⚠ Facteurs limitants :");
    limitants.forEach(d => lines.push(`  • ${d.label} — ${d.description}`));
    lines.push("");
  }
  
  if (contreProductifs.length > 0) {
    lines.push("✗ Contre-productif :");
    contreProductifs.forEach(d => lines.push(`  • ${d.label} — ${d.description}`));
    lines.push("");
  }
  
  lines.push(rapport.page3_consequences.avertissement);
  lines.push("");
  
  // PAGE 4
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("4. PLAGES D'OBJECTIFS RÉALISTES");
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("");
  
  for (const plage of rapport.page4_objectifs.plages) {
    lines.push(`${plage.metrique} (${plage.unite}) :`);
    lines.push(`  Zone réaliste : ${plage.realiste.min} – ${plage.realiste.max}`);
    lines.push(`    ${plage.realiste.justification}`);
    lines.push(`  Zone ambitieuse : ${plage.ambitieux.min} – ${plage.ambitieux.max}`);
    lines.push(`    ${plage.ambitieux.justification}`);
    lines.push(`  Zone improbable : > ${plage.improbable.min}`);
    lines.push(`    ${plage.improbable.justification}`);
    lines.push("");
  }
  
  lines.push(rapport.page4_objectifs.noteMethodologique);
  lines.push("");
  
  // Footer
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push(TFCL_STANDARD_TEXTS.reportFooter);
  lines.push("═══════════════════════════════════════════════════════════");
  
  return lines.join("\n");
}
