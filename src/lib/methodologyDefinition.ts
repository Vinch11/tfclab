/**
 * TWO FOR COACHING LAB METHOD™ — Définition Officielle
 * 
 * Méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance.
 * Conçue pour aider les coachs à interpréter des données complexes,
 * estimer des profils énergétiques, et guider la prise de décision stratégique.
 */

// =============================================
// TEXTE OFFICIEL — DÉFINITION DE LA MÉTHODE
// =============================================

export const METHOD_DEFINITION = `Two For Coaching Lab Method™ est une méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes, estimer des profils énergétiques, et guider la prise de décision stratégique.

Elle ne remplace ni l'expertise humaine du coach, ni un test physiologique de laboratoire.
Elle structure, hiérarchise et contextualise les informations disponibles afin de réduire l'incertitude et d'augmenter la cohérence des choix d'entraînement.`;

export const METHOD_WHAT_IT_DOES = [
  "Analyse des données mesurées (FTP, VO2max, VMA, poids, FC…)",
  "Estimation de paramètres physiologiques non mesurés directement (VLamax, TTE)",
  "Mise en relation des profils énergétiques avec les objectifs de course",
  "Identification des priorités d'entraînement",
  "Détection de signaux de fatigue et de risque",
  "Proposition de recommandations explicables et optionnelles"
];

export const METHOD_WHAT_IT_DOES_NOT = [
  { emoji: "❌", text: "Ne pose pas de diagnostic médical" },
  { emoji: "❌", text: "Ne remplace pas un test lactate" },
  { emoji: "❌", text: "Ne planifie pas automatiquement l'entraînement" },
  { emoji: "❌", text: "Ne garantit aucun résultat de performance" },
  { emoji: "❌", text: "Ne prétend pas mesurer directement la physiologie interne" }
];

export const METHOD_DISCLAIMER = `La Two For Coaching Lab Method™ est un outil d'aide à la décision, pas une vérité physiologique absolue.`;

// =============================================
// TABLEAU PARAMÈTRES OFFICIELS
// =============================================

export type ParameterStatus = 'MESURÉ' | 'CALCULÉ' | 'MODÉLISÉ' | 'COMPOSITE' | 'CONSEILLÉ';
export type UncertaintyLevel = 'faible' | 'moyenne' | 'élevée' | 'variable';

export interface MethodParameter {
  name: string;
  status: ParameterStatus;
  source: string;
  uncertainty: UncertaintyLevel;
  description?: string;
}

export const METHOD_PARAMETERS: MethodParameter[] = [
  { 
    name: "FTP", 
    status: "MESURÉ", 
    source: "Test terrain / plateforme", 
    uncertainty: "faible",
    description: "Puissance au seuil fonctionnel mesurée via test 20 min ou ramp test"
  },
  { 
    name: "VO2max", 
    status: "MESURÉ", 
    source: "Labo ou modèle", 
    uncertainty: "moyenne",
    description: "Consommation maximale d'oxygène, mesurée en labo ou estimée"
  },
  { 
    name: "VMA", 
    status: "MESURÉ", 
    source: "Test terrain", 
    uncertainty: "faible",
    description: "Vitesse Maximale Aérobie mesurée sur test VMA"
  },
  { 
    name: "FC Max", 
    status: "MESURÉ", 
    source: "Test ou course", 
    uncertainty: "faible",
    description: "Fréquence cardiaque maximale observée"
  },
  { 
    name: "VLamax", 
    status: "MODÉLISÉ", 
    source: "Proxy sprint / TTE / modèle", 
    uncertainty: "élevée",
    description: "Taux maximal de production de lactate, estimé par modélisation"
  },
  { 
    name: "TTE", 
    status: "MODÉLISÉ", 
    source: "Durabilité / charge / test", 
    uncertainty: "moyenne",
    description: "Time To Exhaustion au seuil, modélisé selon charge et profil"
  },
  { 
    name: "Fatigue", 
    status: "COMPOSITE", 
    source: "Charge + stress + récupération", 
    uncertainty: "moyenne",
    description: "Indice fonctionnel basé sur 4 piliers (charge, TTE, métabolique, subjectif)"
  },
  { 
    name: "Race Readiness", 
    status: "COMPOSITE", 
    source: "Profil métabolique + objectif", 
    uncertainty: "moyenne",
    description: "Score d'adéquation entre profil physiologique et objectif course"
  },
  { 
    name: "Recommandations", 
    status: "CONSEILLÉ", 
    source: "Moteur logique", 
    uncertainty: "variable",
    description: "Suggestions basées sur les règles métier et le contexte athlète"
  }
];

// =============================================
// MENTIONS LÉGALES & SCIENTIFIQUES
// =============================================

export const SCIENTIFIC_ATTRIBUTION = `La Two For Coaching Lab Method™ s'inspire de travaux scientifiques reconnus en physiologie de l'exercice (Mader, Heck, Jones, Burnley, Seiler, etc.), mais constitue une implémentation indépendante, originale et propriétaire.`;

export const LEGAL_DISCLAIMER = `Two For Coaching Lab Method™ est une marque déposée de Two For Coaching.
Cette méthodologie ne constitue pas un avis médical et ne remplace pas un suivi professionnel.
Les estimations sont fournies à titre indicatif pour guider la décision du coach.`;

// =============================================
// RAPPORT PDF — TEXTES
// =============================================

export const PDF_INTRO_TEXT = `Ce rapport utilise la Two For Coaching Lab Method™.
Les résultats présentés sont des estimations et des analyses contextuelles destinées à guider la décision d'entraînement.`;

export const getConfidenceLevelLabel = (confidence: number): string => {
  if (confidence >= 0.85) return "★★★★☆ Haute confiance";
  if (confidence >= 0.70) return "★★★☆☆ Confiance modérée";
  if (confidence >= 0.55) return "★★☆☆☆ Confiance limitée";
  return "★☆☆☆☆ Confiance faible";
};

export const getConfidenceStars = (confidence: number): string => {
  if (confidence >= 0.85) return "★★★★☆";
  if (confidence >= 0.70) return "★★★☆☆";
  if (confidence >= 0.55) return "★★☆☆☆";
  return "★☆☆☆☆";
};

// =============================================
// ASSISTANT CHAT — RÉPONSES TYPE
// =============================================

export const ASSISTANT_METHOD_RESPONSE = (metricName: string, isEstimated: boolean, confidence: number): string => {
  const confidenceLabel = confidence >= 0.85 ? "élevée" : confidence >= 0.65 ? "modérée" : "faible";
  const sourceLabel = isEstimated ? "estimation issue du modèle Two For Coaching Lab Method™" : "mesure directe";
  
  return `Cette ${metricName} est une ${sourceLabel} (confiance ${confidenceLabel} ≈ ${confidence.toFixed(2)}). 
Selon la Two For Coaching Lab Method™, elle doit être interprétée comme une indication de profil énergétique, pas comme une mesure directe.
Le coach reste le décideur final.`;
};

// =============================================
// ACADEMY — CHAPITRES OFFICIELS
// =============================================

export const ACADEMY_METHOD_CHAPTERS = [
  {
    id: "method_why_model",
    title: "Pourquoi modéliser plutôt que mesurer ?",
    content: `La mesure directe en laboratoire reste l'étalon-or de la physiologie. Cependant :

**Réalité terrain :**
- Les tests lactate ne sont pas accessibles à tous les athlètes
- Les conditions de test varient (fatigue, motivation, environnement)
- Les mesures ponctuelles ne reflètent pas toujours l'état fonctionnel

**Avantage de la modélisation :**
- Suivi continu sans tests invasifs
- Intégration de multiples sources de données
- Détection de tendances et de dérives
- Aide à la décision entre deux tests labo

**Limite fondamentale :**
Un modèle est une approximation. Il réduit l'incertitude mais ne l'élimine jamais.`
  },
  {
    id: "method_what_estimates_mean",
    title: "Ce que signifient les estimations",
    content: `Chaque valeur affichée dans Two For Coaching Lab a un statut précis :

**🔬 MESURÉ** — Donnée directe (test FTP, VMA terrain)
→ Confiance élevée, base solide

**🧮 CALCULÉ** — Dérivé mathématique simple (FTP/kg, allure seuil)
→ Fiabilité dépend de la mesure source

**🧠 MODÉLISÉ** — Estimé par algorithme (VLamax, TTE)
→ Toujours afficher avec plage d'incertitude

**📊 COMPOSITE** — Combinaison de plusieurs sources (Fatigue, Race Readiness)
→ Outil de synthèse, pas mesure unique

**💡 CONSEILLÉ** — Recommandation basée sur règles métier
→ Option pour le coach, jamais prescription`
  },
  {
    id: "method_read_ranges",
    title: "Lire une plage plutôt qu'un chiffre",
    content: `Two For Coaching Lab Method™ affiche des **plages**, pas des valeurs absolues.

**Exemple VLamax :**
- Affichage : "0.38 ± 0.06 mmol/L/s"
- Signification : la vraie valeur est probablement entre 0.32 et 0.44

**Pourquoi c'est important :**
- Un VLamax de 0.40 ≈ 0.42 → même profil, même décision
- Un VLamax de 0.35 vs 0.50 → profils différents, décisions différentes

**Règle du coach :**
Ne changez pas de stratégie pour une différence dans la plage d'incertitude.
Changez de stratégie quand les plages ne se chevauchent plus.`
  },
  {
    id: "method_understand_uncertainty",
    title: "Comprendre l'incertitude",
    content: `L'incertitude n'est pas un défaut — c'est une information.

**Confiance élevée (> 0.85) :**
- Données récentes et fiables
- Décision robuste possible
- Exemple : FTP mesuré cette semaine

**Confiance modérée (0.65 – 0.85) :**
- Mix données mesurées et estimées
- Prudence recommandée
- Exemple : VLamax estimée sur sprint récent

**Confiance faible (< 0.65) :**
- Données anciennes ou manquantes
- Indicatif uniquement
- Action : planifier un test de confirmation

**Le coach gagne en crédibilité en admettant l'incertitude.**`
  },
  {
    id: "method_decide_with_imperfection",
    title: "Décider malgré l'imperfection",
    content: `Le coach doit décider avec des données imparfaites. C'est normal.

**Stratégie 1 : Triangulation**
Croiser plusieurs indicateurs plutôt que se fier à un seul.
→ Si VLamax + TTE + sensations vont dans le même sens : signal fort

**Stratégie 2 : Décision réversible**
Privilégier les choix ajustables plutôt que les changements radicaux.
→ "On teste 2 semaines de Z2 longue, on réévalue"

**Stratégie 3 : Seuil d'action**
Ne pas agir sur de petites variations dans la plage d'incertitude.
→ "On ajuste si l'écart dépasse ±10% sur 3 semaines"

**L'outil aide à voir, le coach décide.**`
  },
  {
    id: "method_when_lab_test",
    title: "Quand un test labo devient indispensable",
    content: `Two For Coaching Lab Method™ peut indiquer qu'un test laboratoire est nécessaire.

**Signaux déclencheurs :**
1. Confiance globale < 0.50 sur plusieurs métriques clés
2. Incohérence entre mesures et sensations terrain
3. Plateau de performance inexpliqué depuis > 6 semaines
4. Préparation d'un objectif majeur (IM, Marathon élite)
5. Retour de blessure ou maladie

**Le test labo permet :**
- Calibrer le modèle avec précision
- Lever les doutes sur le profil métabolique
- Rassurer l'athlète et le coach

**Two For Coaching Lab Method™ + Test Labo = Complémentarité optimale**`
  }
];

// =============================================
// ABOUT SECTION — UI
// =============================================

export const METHOD_ABOUT_SECTION = {
  title: "Two For Coaching Lab Method™",
  subtitle: "Méthodologie d'analyse physiologique pour l'entraînement d'endurance",
  definition: METHOD_DEFINITION,
  whatItDoes: {
    title: "Ce que fait la méthode",
    items: METHOD_WHAT_IT_DOES
  },
  whatItDoesNot: {
    title: "Ce que la méthode ne fait pas",
    items: METHOD_WHAT_IT_DOES_NOT
  },
  disclaimer: METHOD_DISCLAIMER,
  scientificNote: SCIENTIFIC_ATTRIBUTION
};
