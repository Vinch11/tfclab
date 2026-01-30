/**
 * TWO FOR COACHING LAB V2 — Configuration Scientifique
 * 
 * Fichier de configuration central pour la V2 scientifique.
 * Active/désactive le mode V2 Beta et définit les constantes scientifiques.
 */

// =============================================
// FLAG V2 — ACTIVATION
// =============================================

export const V2_CONFIG = {
  // Feature flag pour activer la V2
  ENABLED: true,
  
  // Affichage du badge beta
  SHOW_BETA_BADGE: true,
  
  // Label affiché
  LABEL: "Mode V2 Scientifique (Beta)",
  
  // Description courte
  DESCRIPTION: "Modélisation avancée – interprétation coach requise",
  
  // Version actuelle
  VERSION: "2.0.0-beta.1",
};

// =============================================
// SOURCES SCIENTIFIQUES DE RÉFÉRENCE
// =============================================

export const SCIENTIFIC_REFERENCES = {
  VLAMAX: [
    "Mader A. (1986) – Glycolysis model",
    "Heck H. et al. (1985) – Lactate threshold", 
    "INSCYD public documentation (2020+)",
    "PCr kinetics / Sprint contribution models",
    "Audit TFCL 2025: variance ±0.08 mmol/L/s recommandée"
  ],
  TTE: [
    "Jones A.M. & Burnley M. (2009) – Critical power",
    "Poole D.C. et al. (2016) – Endurance capacity",
    "Seiler S. (2010) – Polarized training",
    "Skiba P.F. et al. (2012) – W' reconstitution model",
    "Monod & Scherrer (1965) – Critical Power concept",
    "Jones A.M. & Vanhatalo A. (2017) – Critical Power applications"
  ],
  FATIGUE: [
    "Impellizzeri F.M. et al. (2019) – Training load",
    "Halson S.L. (2014) – Recovery monitoring",
    "Saw A.E. et al. (2016) – Subjective measures"
  ],
  NUTRITION: [
    "Burke L.M. et al. (2019) – Carbohydrate periodization",
    "Jeukendrup A. (2014, 2017) – CHO feeding during exercise, gut training",
    "Thomas D.T. et al. (2016) – ACSM position stand",
    "Pfeiffer B. et al. (2012) – Ironman nutrition study (90-108 g/h)",
    "Viribay A. et al. (2020) – 120 g/h achievable with training",
    "Stellingwerff T. (2012) – Elite marathon nutrition strategies"
  ],
  ECONOMY: [
    "Barnes K.R. & Kilding A.E. (2015) – Running economy",
    "Saunders P.U. et al. (2004) – Economy determinants",
    "Moore I.S. (2016) – Biomechanics of RE"
  ],
  PACING: [
    "Abbiss C.R. & Laursen P.B. (2008) – Pacing strategies",
    "Lorang D. (coaching philosophy) – Envelope-based pacing",
    "TrainingPeaks power file analysis (2020+)"
  ],
  CROSSOVER: [
    "Brooks G.A. & Mercier J. (1994) – Crossover concept",
    "Achten J. & Jeukendrup A.E. (2003) – FatMax determination"
  ],
  WPRIME: [
    "Skiba P.F. et al. (2012) – W' reconstitution",
    "Burnley M. & Jones A.M. (2018) – Power-duration relationship"
  ],
  EFFICIENCY: [
    "Coyle E.F. (1992) – Cycling efficiency",
    "Moseley L. & Jeukendrup A.E. (2001) – Efficiency changes with duration"
  ]
};

// =============================================
// BORNES PHYSIOLOGIQUES V2
// =============================================

export const PHYSIOLOGICAL_BOUNDS = {
  // VLamax — mmol/L/s
  VLAMAX: {
    MIN: 0.20,
    MAX: 1.00,
    SPRINTER_EXTREME: 0.90,
    ULTRA_ENDURANCE: 0.25,
    TYPICAL_RANGE: [0.30, 0.60] as [number, number],
  },
  
  // TTE — minutes
  TTE: {
    MIN: 25,
    MAX: 75,
    EXCELLENT_THRESHOLD: 55,
    WARNING_THRESHOLD: 35,
    TYPICAL_RANGE: [35, 60] as [number, number],
  },
  
  // FTP/kg — W/kg
  FTP_KG: {
    RECREATIONAL_MIN: 2.0,
    RECREATIONAL_MAX: 3.5,
    TRAINED_MIN: 3.5,
    TRAINED_MAX: 4.5,
    ELITE_MIN: 4.5,
    ELITE_MAX: 6.5,
    WORLD_CLASS_MIN: 6.0,
    WORLD_CLASS_MAX: 7.0,
  },
  
  // VO2max — mL/kg/min
  VO2MAX: {
    SEDENTARY: [25, 35] as [number, number],
    RECREATIONAL: [35, 50] as [number, number],
    TRAINED: [50, 65] as [number, number],
    ELITE: [65, 85] as [number, number],
  },
  
  // Fatigue — %
  FATIGUE: {
    MIN: 0,
    MAX: 100,
    FRESH_THRESHOLD: 30,
    FUNCTIONAL_THRESHOLD: 55,
    HIGH_THRESHOLD: 75,
  },
};

// =============================================
// NIVEAUX DE CONFIANCE V2
// =============================================

export const CONFIDENCE_LEVELS = {
  MEASURED_LAB: { value: 0.95, label: "Mesure labo", emoji: "🔬" },
  MEASURED_FIELD: { value: 0.85, label: "Mesure terrain", emoji: "📏" },
  ESTIMATED_STRONG: { value: 0.75, label: "Estimation solide", emoji: "🧮" },
  ESTIMATED_MODERATE: { value: 0.60, label: "Estimation modérée", emoji: "📊" },
  ESTIMATED_WEAK: { value: 0.45, label: "Estimation faible", emoji: "⚠️" },
  UNKNOWN: { value: 0.25, label: "Données insuffisantes", emoji: "❓" },
};

// =============================================
// TEXTES PÉDAGOGIQUES V2
// =============================================

export const V2_TEXTS = {
  MAIN_DISCLAIMER: `Cette estimation est issue du modèle Two For Coaching Lab V2™.
Elle doit être interprétée comme une plage réaliste, pas comme une valeur absolue.
L'incertitude affichée reflète les limites inhérentes à toute modélisation.`,

  WHEN_LAB_NEEDED: `Un test laboratoire est recommandé quand :
• La confiance globale est < 0.50
• Une incohérence apparaît entre modèle et terrain
• L'objectif justifie une précision maximale`,

  RANGE_INTERPRETATION: `Toujours lire une plage plutôt qu'un chiffre :
• Zone réaliste = valeurs probables
• Zone ambitieuse = possibles mais optimistes
• Zone improbable = hors portée raisonnable`,

  COACH_ROLE: `Le coach reste le décideur final.
Le modèle structure et hiérarchise l'information.
Il ne prescrit jamais automatiquement.`,
};

// =============================================
// HELPER — V2 FEATURE CHECK
// =============================================

/**
 * Vérifie si le mode V2 est activé pour un utilisateur/session
 * Pour l'instant, utilise la config globale
 * À terme, pourra lire les préférences utilisateur
 */
export function isV2Enabled(): boolean {
  // Future: lire depuis localStorage ou profil cloud
  return V2_CONFIG.ENABLED;
}

/**
 * Retourne le texte de badge V2
 */
export function getV2Badge(): string {
  return V2_CONFIG.SHOW_BETA_BADGE ? "V2 Beta" : "";
}
