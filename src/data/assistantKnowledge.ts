// =============================================
// BASE DE CONNAISSANCES - Assistant Two For Coaching Lab
// Contenu structuré pour RAG local + prompt AI
// =============================================

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: "faq" | "methodology" | "zones" | "metrics" | "app_usage" | "medical_disclaimer";
  tags: string[];
  content: string;
  staffOnly?: boolean;
}

// =============================================
// DISCLAIMER MÉDICAL (toujours prioritaire)
// =============================================

export const MEDICAL_DISCLAIMER = `
Cet assistant est un outil d'aide à la compréhension et à la décision destiné aux coachs et staffs techniques.

⚠️ LIMITES IMPORTANTES :
- Il ne pose aucun diagnostic médical
- Il ne prescrit aucun traitement
- Il ne remplace pas l'avis d'un professionnel de santé
- Il ne garantit aucune performance

Si vous avez une question médicale, consultez un médecin ou un professionnel de santé qualifié.
`;

// =============================================
// FAQ - CE QUE L'APP FAIT / NE FAIT PAS
// =============================================

export const FAQ_ARTICLES: KnowledgeArticle[] = [
  {
    id: "what_is_app",
    title: "C'est quoi Two For Coaching Lab ?",
    category: "faq",
    tags: ["introduction", "présentation", "app"],
    content: `Two For Coaching Lab est un laboratoire physiologique virtuel destiné aux coachs et staffs techniques en endurance.

L'application permet de :
- Centraliser les données physiologiques des athlètes (VLamax, TTE, FTP, VO2max, etc.)
- Calculer des indicateurs composites comme le Race Readiness
- Visualiser les zones d'entraînement avec leur logique physiologique
- Générer des rapports staff-grade avec annotations contextuelles

L'app ne prédit pas les performances. Elle aide à piloter l'entraînement.`
  },
  {
    id: "where_fcmax",
    title: "Où renseigner ma FCmax ?",
    category: "app_usage",
    tags: ["FCmax", "fréquence cardiaque", "paramètres", "saisie"],
    content: `Pour renseigner la FCmax d'un athlète :

1. Sélectionnez l'athlète concerné
2. Allez dans l'onglet "Profil" ou ouvrez le panneau "Références"
3. Dans la section "Références athlète", modifiez le champ "FC Max"
4. La valeur sera sauvegardée automatiquement

Conseil : utilisez une FCmax mesurée lors d'un test ou d'une course récente, pas une formule théorique (220 - âge est obsolète).`
  },
  {
    id: "demo_values",
    title: "Pourquoi je vois des valeurs demo ?",
    category: "faq",
    tags: ["demo", "exemple", "données", "test"],
    content: `Les valeurs "demo" s'affichent quand aucun athlète réel n'est sélectionné ou quand les données sont insuffisantes.

Pour voir vos vraies données :
1. Créez ou sélectionnez un athlète
2. Ajoutez un Snapshot avec les données réelles (FTP, poids, VMA, etc.)
3. Les calculs utiliseront automatiquement ces valeurs

Si une donnée reste en "demo", c'est qu'elle n'a pas été renseignée. Vérifiez le Snapshot actif.`
  },
  {
    id: "import_pdf",
    title: "Comment importer un PDF de test ?",
    category: "app_usage",
    tags: ["import", "PDF", "test", "labo", "Mika", "Quentin"],
    content: `L'app peut importer certains rapports PDF de test métabolique :

1. Allez dans l'onglet "Tests" ou "Snapshots"
2. Cliquez sur "Importer PDF" ou l'icône document
3. Sélectionnez votre fichier PDF
4. L'app extrait automatiquement les valeurs reconnues
5. Vérifiez les données avant de valider

Formats supportés : rapports Mika, rapports Quentin Marthouret.
L'extraction n'est pas parfaite - vérifiez toujours les valeurs !`
  },
  {
    id: "snapshot_pro",
    title: "Comment marche le Snapshot Pro ?",
    category: "app_usage",
    tags: ["snapshot", "pro", "données", "sauvegarde"],
    content: `Le Snapshot est une "photo" des données physiologiques d'un athlète à un instant T.

Il contient :
- Métriques vélo : FTP, Pmax 5s, FC Max
- Métriques CAP : VMA, CSS, allure seuil
- Données corporelles : poids, masse grasse
- Données métaboliques : VLamax, TTE, VO2max

Snapshot Actif vs Historique :
- Un seul snapshot peut être "actif" à la fois
- L'actif alimente tous les calculs (zones, Race Readiness, etc.)
- Les anciens snapshots restent consultables pour suivre l'évolution`
  },
  {
    id: "confidence_meaning",
    title: "C'est quoi l'indice de confiance ?",
    category: "methodology",
    tags: ["confiance", "fiabilité", "données", "source"],
    content: `L'indice de confiance (0 à 1) indique la fiabilité d'une donnée :

0.95 : Mesure laboratoire (lactate, VO2max) - très fiable
0.75 : Test terrain structuré (sprint 15s, ramp test) - fiable
0.55 : Estimation basée sur d'autres données - modéré
0.20 : Aucune donnée, valeur par défaut - très faible

Interprétation :
- Confiance ≥ 0.7 : "Robuste" - décision fiable
- Confiance 0.4-0.7 : "Prudent" - décision à nuancer
- Confiance < 0.4 : "Indicatif" - prudence maximale

Le staff doit ajuster ses décisions selon la confiance.`
  }
];

// =============================================
// MÉTRIQUES - EXPLICATIONS STAFF-GRADE
// =============================================

export const METRICS_ARTICLES: KnowledgeArticle[] = [
  {
    id: "what_is_vlamax",
    title: "C'est quoi VLamax ?",
    category: "metrics",
    tags: ["VLamax", "lactate", "glycolytique", "métabolisme"],
    content: `VLamax = Velocity of Lactate Maximum (en mmol/L/s)

C'est le taux maximal de production de lactate par le système glycolytique.

En résumé :
- VLamax haute → "Turbo glycolytique" puissant → bon pour les sprints
- VLamax basse → Métabolisme lipidique dominant → bon pour l'endurance longue

Valeurs typiques :
- Sprinter : 0.6 - 0.9 mmol/L/s
- Endurant Ironman : 0.25 - 0.40 mmol/L/s
- Marathonien élite : 0.30 - 0.45 mmol/L/s

Pourquoi c'est important ?
Une VLamax trop haute pour un objectif longue distance = consommation glycogène trop rapide = risque de "mur" ou défaillance.`
  },
  {
    id: "what_is_tte",
    title: "C'est quoi TTE ?",
    category: "metrics",
    tags: ["TTE", "Time To Exhaustion", "endurance", "seuil"],
    content: `TTE = Time To Exhaustion (en minutes)

C'est la durée maximale qu'un athlète peut maintenir son FTP (ou intensité seuil) avant épuisement.

Sources de données :
- "Mesuré" (confiance 0.95) : test TTE réel réalisé
- "Estimé" (confiance 0.7) : basé sur la charge d'entraînement (TSS 7j)
- "Approx" (confiance 0.5) : basé sur FTP seul

Cibles par objectif :
- Ironman : 55+ min
- 70.3 : 50+ min
- Marathon : 50+ min
- Sprint : 35+ min

TTE insuffisant = l'athlète ne pourra pas tenir son allure cible.`
  },
  {
    id: "what_is_race_readiness",
    title: "C'est quoi Race Readiness ?",
    category: "metrics",
    tags: ["Race Readiness", "score", "préparation", "objectif"],
    content: `Race Readiness est un indicateur composite (0-100) d'adéquation physiologique entre le profil de l'athlète et son objectif.

Ce que c'est :
- Un outil d'aide à la décision pour le coach
- Une évaluation de la cohérence du profil métabolique
- Un guide pour orienter les priorités d'entraînement

Ce que ce n'est PAS :
- Une prédiction de performance
- Une garantie de résultat
- Un remplacement du jugement du coach

Composantes :
1. VLamax (dans la zone cible pour l'objectif ?)
2. TTE (suffisant pour la durée de l'épreuve ?)
3. FTP/kg (puissance relative adaptée ?)
4. Fraîcheur (fatigue récente maîtrisée ?)

Score > 80 : "Race Ready"
Score 60-80 : "En progression"
Score < 60 : "Travail à faire"`
  },
  {
    id: "what_is_glycolytic_risk",
    title: "C'est quoi le risque glycolytique ?",
    category: "metrics",
    tags: ["glycolytique", "risque", "nutrition", "mur"],
    content: `Le risque glycolytique évalue la probabilité que l'athlète consomme ses réserves de glycogène trop rapidement.

Causes d'un risque élevé :
- VLamax trop haute pour l'objectif → consommation glucidique excessive
- Intensité trop élevée → dépendance au glucose
- Nutrition insuffisante → pas de compensation

Conséquences :
- "Mur du marathon" (fringale)
- Défaillance en 2e partie de course
- Crampes et fatigue extrême

Solutions coaching :
1. Baisser la VLamax (beaucoup de Z2, éviter les sprints)
2. Adapter l'allure course (plus prudente)
3. Optimiser la nutrition (plus de glucides/h)
4. Travailler le fat max (sorties à jeun en Z2)`
  },
  {
    id: "what_is_robustesse",
    title: "C'est quoi la robustesse ?",
    category: "metrics",
    tags: ["robustesse", "fiabilité", "confiance", "données"],
    content: `La robustesse est un indicateur de fiabilité globale des calculs.

Elle dépend de :
1. La confiance des données sources (VLamax, TTE, etc.)
2. La fraîcheur des données (date du dernier snapshot)
3. La cohérence entre les métriques

Niveaux :
- "Robuste" : données récentes et fiables → décision sûre
- "Prudent" : certaines données estimées → nuancer
- "Indicatif" : données anciennes ou manquantes → prudence

Conseil : Avant une décision importante, vérifiez la robustesse des données.
Si elle est faible, actualisez le snapshot ou réalisez un test.`
  },
  {
    id: "what_is_crr",
    title: "C'est quoi la Charge Récente ?",
    category: "metrics",
    tags: ["charge", "CRR", "TSS", "entraînement", "fatigue"],
    content: `La Charge Récente (CRR) évalue la charge d'entraînement des 7 derniers jours.

Basée sur le TSS (Training Stress Score) cumulé sur 7 jours.

Interprétation :
- TSS_7j < 300 : Charge légère (récupération ou affûtage)
- TSS_7j 300-500 : Charge modérée (maintenance)
- TSS_7j 500-700 : Charge élevée (développement)
- TSS_7j > 700 : Charge très élevée (surcharge)

Impact sur Race Readiness :
Une charge trop élevée peut indiquer une fatigue qui limite les performances le jour J.
L'affûtage (réduction progressive) améliore la fraîcheur.`
  }
];

// =============================================
// ZONES D'ENTRAÎNEMENT
// =============================================

export const ZONES_ARTICLES: KnowledgeArticle[] = [
  {
    id: "zones_overview",
    title: "Vue d'ensemble des zones d'entraînement",
    category: "zones",
    tags: ["zones", "Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7"],
    content: `L'app utilise un système de 7 zones basé sur les seuils physiologiques :

Z1 (< 70% FCmax) : Récupération, échauffement
Z2 (70-78% FCmax) : Endurance fondamentale, lipolyse
Z3 (78-83% FCmax) : Endurance active, force basse cadence
Z4a (83-87% FCmax) : Allure marathon, sweet spot
Z4b (87-91% FCmax) : Allure semi, inconfort gérable
Z5 (91-94% FCmax) : Seuil, MLSS
Z6 (94-100% FCmax) : VO2max, zone rouge
Z7 (> 100% FCmax) : Neuromusculaire, sprint

Clé : La zone Z2 est souvent négligée. C'est pourtant le socle de la pyramide aérobie.`
  },
  {
    id: "z4a_vs_z4b",
    title: "Différence entre Z4a et Z4b",
    category: "zones",
    tags: ["Z4a", "Z4b", "marathon", "semi", "tempo"],
    content: `C'est la plus-value coach : distinguer Z4a et Z4b (souvent confondus en "Tempo").

Z4a - Allure Marathon :
- Sensation : "Je pourrais tenir indéfiniment" (tant qu'il y a du sucre)
- Durée tenable : 3h+
- Respiration : contrôlée, quelques mots possibles
- Usage : sorties longues, sweet spot

Z4b - Allure Semi :
- Sensation : "Le sablier coule" - autonomie 1h-1h15
- Durée tenable : 1h max
- Respiration : plus lourde, focus mental nécessaire
- Usage : blocs spécifiques semi, tempo dur

Erreur fréquente : faire de la Z4b en pensant faire de la Z4a → surcharge chronique.`
  },
  {
    id: "zone_grise",
    title: "C'est quoi la zone grise ?",
    category: "zones",
    tags: ["zone grise", "erreur", "entraînement", "fatigue"],
    content: `La zone grise est l'erreur d'entraînement la plus fréquente.

Définition :
C'est s'entraîner entre Z2 et Z4 : trop vite pour l'endurance, trop lent pour la VO2max.

Conséquences :
- Fatigue sans grandes adaptations
- Plateau de performance
- Surentraînement progressif

Comment l'éviter :
1. Polariser : 80% du volume en Z1-Z2, 20% en Z5-Z6
2. Respecter la Z2 : si tu peux parler par phrases → OK
3. Éviter les sorties "moyennement dures" sans objectif clair

L'app t'aide à identifier si ton athlète est trop souvent en zone grise.`
  }
];

// =============================================
// GUIDE D'UTILISATION APP
// =============================================

export const APP_USAGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "nav_dashboard",
    title: "Navigation - Dashboard",
    category: "app_usage",
    tags: ["dashboard", "navigation", "accueil"],
    content: `Le Dashboard est l'écran principal de l'app.

Il affiche :
- L'athlète sélectionné et son objectif
- Les métriques clés (VLamax, TTE, FTP/kg)
- Le score Race Readiness
- Les alertes et annotations contextuelles

Actions rapides :
- Changer d'athlète : sélecteur en haut
- Mode Staff : toggle pour voir les détails experts
- Ajouter un snapshot : bouton "+ Snapshot"`
  },
  {
    id: "nav_profile",
    title: "Navigation - Profil athlète",
    category: "app_usage",
    tags: ["profil", "athlète", "références"],
    content: `L'onglet Profil permet de gérer les données de l'athlète.

Sections :
- Informations générales : nom, objectif, sexe
- Références : FCmax, VMA, FTP, CSS
- Historique : liste des snapshots

Conseil : Les références sont des valeurs "de référence" validées.
Le snapshot actif alimente les calculs quotidiens.`
  },
  {
    id: "nav_tests",
    title: "Navigation - Tests",
    category: "app_usage",
    tags: ["tests", "VLamax", "terrain", "protocoles"],
    content: `L'onglet Tests permet de gérer les tests physiologiques.

Tests disponibles :
- Sprint 15s (estimation VLamax)
- Ramp test (FTP + VLamax estimée)
- Test lactate (VLamax mesurée - Staff)

Chaque test enregistré alimente les calculs :
- La VLamax du test devient source "test" (confiance 0.75)
- Plus récent = plus prioritaire

Conseil : Un test terrain bien fait vaut mieux qu'une estimation.`
  },
  {
    id: "annotation_meaning",
    title: "Que signifient les annotations ?",
    category: "app_usage",
    tags: ["annotations", "alertes", "icônes", "statut"],
    content: `Les annotations sont des indicateurs visuels contextuels.

Types :
🟢 Vert : OK, dans la cible
🟡 Jaune : Attention, à surveiller
🔴 Rouge : Alerte, action requise
ℹ️ Info : Explication ou conseil

Exemples :
- "VLamax haute pour IM" → réduire via Z2 + éviter sprints
- "TTE insuffisant" → augmenter volume ou tester observé
- "Données estimées" → confiance modérée, confirmer par test

Les annotations s'adaptent à l'objectif de l'athlète.`
  },
  {
    id: "option_longue_deconseille",
    title: "Pourquoi l'option longue est déconseillée ?",
    category: "methodology",
    tags: ["option", "longue", "séance", "risque"],
    content: `L'annotation "Option longue déconseillée" apparaît quand :

1. Le TTE est insuffisant pour l'objectif (< cible)
2. La charge récente est déjà élevée (TSS_7j > seuil)
3. Le risque de surentraînement est détecté

Explication :
Une sortie longue supplémentaire risque de :
- Accumuler de la fatigue sans bénéfice
- Retarder la récupération
- Augmenter le risque blessure

Alternative :
- Séance courte et intense (qualité > volume)
- Récupération active
- Reporter la longue après récupération`
  },
  {
    id: "injury_risk_high",
    title: "Que faire si le risque blessure est élevé ?",
    category: "app_usage",
    tags: ["blessure", "risque", "CAP", "économie"],
    content: `Un risque blessure élevé est détecté via l'analyse de l'économie de course.

Indicateurs :
- Dérive cardiaque importante (> 10%)
- Fatigue neuromusculaire détectée
- Charge mécanique excessive

Actions coach :
1. Réduire le volume de course à pied
2. Privilégier les surfaces souples (trail, herbe)
3. Augmenter le vélo/natation (moins d'impact)
4. Travail de renforcement et technique
5. Vérifier le sommeil et la récupération

Important : Ce n'est pas un diagnostic médical. En cas de douleur, consulter.`
  }
];

// =============================================
// CONSTANTES PHYSIOLOGIQUES
// =============================================

export const PHYSIOLOGICAL_CONSTANTS: KnowledgeArticle[] = [
  {
    id: "const_vlamax_targets",
    title: "Cibles VLamax par objectif",
    category: "methodology",
    tags: ["VLamax", "cible", "objectif", "référence"],
    content: `Valeurs cibles VLamax selon l'objectif :

Ironman / Ultra :
- Cible : 0.25 - 0.40 mmol/L/s
- Idéal : 0.35 mmol/L/s

70.3 / Half :
- Cible : 0.25 - 0.45 mmol/L/s
- Idéal : 0.38 mmol/L/s

Marathon :
- Cible : 0.30 - 0.50 mmol/L/s
- Idéal : 0.40 mmol/L/s

Sprint / Olympique :
- Cible : 0.40 - 0.60 mmol/L/s
- Idéal : 0.50 mmol/L/s

Source : Littérature scientifique et expérience terrain.`
  },
  {
    id: "const_tte_targets",
    title: "Cibles TTE par objectif",
    category: "methodology",
    tags: ["TTE", "cible", "objectif", "référence"],
    content: `Valeurs cibles TTE (Time To Exhaustion) selon l'objectif :

Ironman : 55+ min
Ultra : 60+ min
70.3 / Half : 50+ min
Marathon : 50+ min
Semi : 45+ min
Sprint : 35+ min

Un TTE insuffisant indique :
- Charge chronique insuffisante
- Besoin de travail spécifique seuil
- Possible fatigue accumulée

Améliorer le TTE : 
- Volume en Z2 + blocs Z4a (sweet spot)
- Progression charge chronique sur 4-6 semaines`
  },
  {
    id: "const_ftp_kg",
    title: "Références FTP/kg",
    category: "methodology",
    tags: ["FTP", "puissance", "poids", "référence"],
    content: `Valeurs de référence FTP/kg (watts par kg) :

Niveau amateur :
- Débutant : 2.0 - 2.5 W/kg
- Intermédiaire : 2.5 - 3.5 W/kg
- Confirmé : 3.5 - 4.2 W/kg

Niveau compétiteur :
- Régional : 4.0 - 4.5 W/kg
- National : 4.5 - 5.0 W/kg
- International : 5.0 - 6.0 W/kg

Pour un Ironman compétitif : cible ~4.6 W/kg
Pour un 70.3 compétitif : cible ~4.8 W/kg

Note : Ces valeurs dépendent du morphotype et de l'âge.`
  }
];

// =============================================
// TOUS LES ARTICLES
// =============================================

export const ALL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  ...FAQ_ARTICLES,
  ...METRICS_ARTICLES,
  ...ZONES_ARTICLES,
  ...APP_USAGE_ARTICLES,
  ...PHYSIOLOGICAL_CONSTANTS,
];

// =============================================
// RECHERCHE DANS LA BASE DE CONNAISSANCES
// =============================================

/**
 * Recherche simple par mots-clés dans la KB
 */
export function searchKnowledge(query: string, maxResults: number = 5): KnowledgeArticle[] {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  
  if (queryWords.length === 0) return [];
  
  // Score chaque article
  const scored = ALL_KNOWLEDGE_ARTICLES.map(article => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const tagsLower = article.tags.map(t => t.toLowerCase());
    
    for (const word of queryWords) {
      // Titre = poids fort
      if (titleLower.includes(word)) score += 10;
      // Tags = poids moyen-fort
      if (tagsLower.some(t => t.includes(word))) score += 5;
      // Contenu = poids faible
      if (contentLower.includes(word)) score += 1;
    }
    
    return { article, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.article);
}

/**
 * Formate les articles trouvés pour le contexte AI
 */
export function formatKnowledgeForAI(articles: KnowledgeArticle[]): string {
  if (articles.length === 0) return "";
  
  return articles.map(a => 
    `[Source: ${a.category} > ${a.title}]\n${a.content}`
  ).join("\n\n---\n\n");
}

// =============================================
// SUGGESTIONS RAPIDES
// =============================================

export const QUICK_SUGGESTIONS = [
  { label: "C'est quoi VLamax ?", query: "C'est quoi VLamax ?" },
  { label: "Où renseigner FCmax ?", query: "Où renseigner ma FCmax ?" },
  { label: "Différence Z4a / Z4b", query: "C'est quoi la différence entre Z4a et Z4b ?" },
  { label: "Race Readiness", query: "Comment fonctionne le Race Readiness ?" },
  { label: "Risque glycolytique", query: "C'est quoi le risque glycolytique ?" },
  { label: "TTE insuffisant", query: "Mon TTE est insuffisant, que faire ?" },
  { label: "Importer un PDF", query: "Comment importer un PDF de test ?" },
  { label: "Mode Staff", query: "C'est quoi le mode Staff ?" },
];
