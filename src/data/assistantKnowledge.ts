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

Selon la charte Two For Coaching Lab : "Un rapport Two For Coaching Lab n'a de valeur que s'il est interprété avec esprit critique."

Si vous avez une question médicale, consultez un médecin ou un professionnel de santé qualifié.
`;

// =============================================
// CHARTE - RÉFÉRENCE OBLIGATOIRE POUR LE CHATBOT
// =============================================

export const CHARTE_REFERENCE = `
CHARTE D'INTERPRÉTATION — TWO FOR COACHING LAB METHOD™

Two For Coaching Lab Method™ est une méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes, estimer des profils énergétiques, et guider la prise de décision stratégique.

Elle ne remplace ni l'expertise humaine du coach, ni un test physiologique de laboratoire.
Elle structure, hiérarchise et contextualise les informations disponibles afin de réduire l'incertitude et d'augmenter la cohérence des choix d'entraînement.

La Two For Coaching Lab Method™ s'inspire de travaux scientifiques reconnus en physiologie de l'exercice (Mader, Heck, Jones, Burnley, Seiler, etc.), mais constitue une implémentation indépendante, originale et propriétaire.

Règle fondamentale : Toute donnée doit être interprétée avec :
- Sa valeur centrale ET sa plage d'incertitude
- Son indice de confiance (élevée > 0.85, modérée 0.65-0.85, faible < 0.65)
- Sa source (🔬 mesurée, 🧠 estimée, 🔁 modélisée)

Réponses du chatbot :
- Se présenter comme "Assistant Two For Coaching Lab Method™"
- Toujours citer la source et la confiance de la donnée
- Toujours rappeler la marge d'incertitude
- Ne jamais donner de réponse absolue ou prescriptive
- Référencer la méthodologie : "Selon la Two For Coaching Lab Method™..."
- Rappeler le rôle décisionnel du coach

Exemple de réponse type :
"Cette VLamax est une estimation issue de la Two For Coaching Lab Method™ (confiance modérée ≈ 0.70). Elle doit être interprétée comme un indicateur de profil énergétique, pas comme une mesure directe. La plage d'incertitude est d'environ ±0.08 mmol/L/s. Le coach reste le décideur final."

POSITIONNEMENT OFFICIEL :
La Two For Coaching Lab Method™ est un outil d'aide à la décision, pas une vérité physiologique absolue.
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
    title: "C'est quoi le Potentiel Physiologique ?",
    category: "metrics",
    tags: ["Potentiel Physiologique", "score", "préparation", "objectif"],
    content: `Le Potentiel Physiologique est un indicateur composite (0-100) d'adéquation entre le profil de l'athlète et son objectif.

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
// ARTICLES AVANCÉS - Trail, Affûtage, Polarisation, etc.
// =============================================

export const ADVANCED_ARTICLES: KnowledgeArticle[] = [
  {
    id: "trail_specificity",
    title: "Spécificités du Trail",
    category: "methodology",
    tags: ["trail", "ultra", "dénivelé", "spécifique", "montagne"],
    content: `Le Trail présente des contraintes uniques par rapport à la route.

Différences clés :
- Dénivelé positif (D+) : sollicitation musculaire intense (quadriceps)
- Dénivelé négatif (D-) : contractions excentriques → dommages musculaires
- Terrain technique : coordination, proprioception, mental
- Durée : souvent > 6h, parfois > 24h

Implications physiologiques :
- VLamax basse encore plus importante (économie de glycogène)
- Économie de course critique (technique descente)
- Force spécifique montée/descente obligatoire
- Gestion de l'effort sur la durée (pas de rythme constant)

Préparation :
1. Volume D+ progressif (règle : max +15%/semaine)
2. Séances spécifiques descente (travail excentrique)
3. Sorties en terrain varié (pas que du plat)
4. Simulation nutritionnelle sur sorties longues`
  },
  {
    id: "affutage_tapering",
    title: "L'affûtage (Tapering)",
    category: "methodology",
    tags: ["affûtage", "tapering", "course", "préparation", "récupération", "peaking"],
    content: `L'affûtage est l'art d'arriver "frais et fit" le jour J.

Objectif : Dissiper la fatigue accumulée tout en maintenant les adaptations physiologiques.

Règles d'or :
1. Volume : Réduction de 40% à 60% sur 7-14 jours
2. Fréquence : Maintenir le même nombre de séances
3. Intensité : MAINTENIR ! Rappels d'allure course courts
4. Durée : 1 semaine (Sprint) à 2-3 semaines (Ironman)

Erreurs fréquentes :
❌ Repos complet → le corps "s'endort" (baisse volume plasmatique)
❌ Continuer le volume → fatigue non dissipée
❌ Séances longues "de rassurance" → contre-productif

Exemple Ironman (2 semaines) :
- Semaine -2 : Volume -40%, intensité 100%, 2 rappels allure
- Semaine -1 : Volume -60%, intensité 100%, 1 rappel allure court
- Dernier jour : Activation légère 20-30 min avec 2-3 accélérations`
  },
  {
    id: "polarized_training",
    title: "Entraînement polarisé",
    category: "methodology",
    tags: ["polarisé", "80/20", "intensité", "volume", "distribution"],
    content: `L'entraînement polarisé est la distribution d'intensité la plus efficace pour l'endurance.

Principe : 80% du volume en Z1-Z2 (facile) / 20% en Z5-Z6 (dur)

Pourquoi ça marche :
- Le volume Z2 développe les adaptations aérobies sans stress excessif
- L'intensité haute stimule la VO2max et le seuil
- Pas de "zone grise" (Z3-Z4) chronique qui fatigue sans grands gains

Distribution type par semaine :
- 4-5 séances Z2 (endurance, récupération)
- 1-2 séances Z5/Z6 (intervalles, seuil)
- 0-1 séance Z3/Z4 uniquement pour spécificité course

Erreur classique :
La plupart des amateurs font l'inverse : 50% zone grise, 40% Z2, 10% intense.
Résultat : plateau, fatigue chronique, surentraînement.

Comment vérifier ?
Analyse la distribution de tes séances sur 4 semaines.
Si > 20% du temps est en Z3-Z4 hors blocs spécifiques → polariser davantage.`
  },
  {
    id: "fat_max",
    title: "Fat Max et lipolyse",
    category: "methodology",
    tags: ["fat max", "lipolyse", "graisse", "endurance", "VLamax"],
    content: `Le Fat Max est l'intensité où l'oxydation des graisses est maximale.

Pourquoi c'est important :
- Les réserves de graisses sont quasi-illimitées (80 000+ kcal)
- Le glycogène est limité (~2000 kcal musculaire + foie)
- Mieux utiliser les graisses = économiser le glycogène = éviter le mur

Position du Fat Max :
- Typiquement entre 55% et 75% de la VO2max
- Juste sous le SV1 (premier seuil ventilatoire)
- Correspond souvent à la Z2

Comment l'améliorer :
1. Volume en Z2 (le plus important)
2. Baisser la VLamax (éviter les sprints)
3. Sorties à jeun en Z2 (avec précaution)
4. Périodisation nutritionnelle (train low, compete high)

Attention : 
Fat Max ≠ perte de poids optimale. 
C'est un indicateur métabolique, pas un régime.`
  },
  {
    id: "force_training",
    title: "Travail de force en endurance",
    category: "methodology",
    tags: ["force", "musculation", "cadence", "puissance", "économie"],
    content: `La force est un pilier souvent négligé en endurance.

Objectifs :
- Recruter les fibres rapides (Type II) en aérobie
- Améliorer l'économie de mouvement
- Retarder la fatigue musculaire
- Prévenir les blessures

Méthodes vélo :
- Force basse cadence (K3) : 40-50 rpm en Z3, grand braquet
- Sprints courts départ arrêté : recrutement maximal
- Montées assis : 50-60 rpm, intensité modérée

Méthodes course à pied :
- Côtes courtes et pentues (10-15 sec)
- Fentes, bondissements, montées d'escaliers
- Renforcement : squats, fentes, mollets

Méthodes musculation :
- Charges lourdes (3-5 reps) pour force max
- Charges légères (15+ reps) pour endurance de force
- 2-3 séances/semaine en phase de préparation générale

Attention :
La force en Z3 basse cadence fatigue les muscles sans fatiguer le cœur.
Ne te fie pas à la FC basse - les muscles trinquent !`
  },
  {
    id: "deroulement_seance",
    title: "Structure d'une séance type",
    category: "app_usage",
    tags: ["séance", "structure", "échauffement", "récupération", "bloc"],
    content: `Structure recommandée d'une séance d'entraînement :

1. ÉCHAUFFEMENT (15-25 min)
   - 10-15 min Z1-Z2 progressif
   - Mobilité articulaire
   - 3-5 accélérations courtes (10-20 sec)

2. CORPS DE SÉANCE
   - Bloc principal selon objectif
   - Intervalles : respecter les temps de récupération
   - Continu : maintenir la zone cible

3. RÉCUPÉRATION (10-15 min)
   - Retour progressif en Z1
   - Ne pas couper brutalement
   - Étirements légers si souhaité

4. POST-SÉANCE
   - Nutrition dans les 30 min (surtout après intensité)
   - Hydratation
   - Notation RPE dans l'app

Conseil : L'échauffement est souvent bâclé.
Un bon échauffement = meilleure séance + moins de blessures.`
  },
  {
    id: "surentrainement",
    title: "Reconnaître le surentraînement",
    category: "methodology",
    tags: ["surentraînement", "fatigue", "récupération", "signes", "prévention"],
    content: `Le surentraînement (ou OTS - Overtraining Syndrome) est une fatigue profonde qui nécessite des semaines/mois de récupération.

Signes avant-coureurs :
- Performances en baisse malgré l'entraînement
- Fatigue persistante malgré le repos
- Troubles du sommeil
- Irritabilité, perte de motivation
- FC repos élevée (+5-10 bpm)
- Infections fréquentes (rhumes, etc.)

Facteurs de risque :
- Augmentation brutale du volume (> 10%/semaine)
- Pas de semaine de récupération
- Stress vie quotidienne + entraînement
- Nutrition insuffisante
- Manque de sommeil

Prévention :
1. Respecter la règle des 10% (volume)
2. 1 semaine allégée toutes les 3-4 semaines
3. Écouter les signaux du corps
4. Suivi de la charge récente (TSS 7j) dans l'app

Si surentraînement installé :
Arrêt complet 2-4 semaines, puis reprise très progressive.
Consulter un médecin si les symptômes persistent.`
  },
  {
    id: "brick_session",
    title: "Séance Brique (Triathlon)",
    category: "methodology",
    tags: ["brique", "enchaînement", "triathlon", "vélo", "CAP", "transition"],
    content: `La séance "brique" est l'enchaînement vélo → course à pied typique du triathlon.

Objectif :
Habituer le corps (et le mental) à courir sur des jambes fatiguées par le vélo.

Types de briques :
1. Brique courte : 45-60 min vélo + 15-20 min CAP
2. Brique longue : 2-4h vélo + 30-60 min CAP
3. Brique qualité : Intervalles vélo + tempo CAP

Clés de réussite :
- Transition rapide (< 2-3 min) comme en course
- Premiers km CAP en "gestion" (ne pas partir trop vite)
- Adapter l'allure aux sensations (jambes lourdes = normal)

Fréquence :
- 1 brique/semaine en phase spécifique
- 1 brique/2 semaines en phase préparatoire

Erreur classique :
Faire des briques trop longues trop souvent → fatigue accumulée.
Qualité > Volume pour les briques.`
  },
  {
    id: "periodisation_phases",
    title: "Les phases de la périodisation",
    category: "methodology",
    tags: ["périodisation", "phases", "préparation", "spécifique", "compétition"],
    content: `La périodisation organise l'entraînement en phases distinctes.

PHASE 1 - Préparation Générale (8-12 semaines)
- Objectif : Construire le socle aérobie
- Contenu : Beaucoup de Z2, force, technique
- Intensité : Faible à modérée
- Volume : Progressif

PHASE 2 - Préparation Spécifique (6-8 semaines)
- Objectif : Développer les qualités spécifiques
- Contenu : Z4/Z5, blocs spécifiques objectif
- Intensité : Moyenne à haute
- Volume : Stabilisé ou légèrement réduit

PHASE 3 - Pré-compétition (3-4 semaines)
- Objectif : Affiner, simuler
- Contenu : Répétition générale, allure course
- Intensité : Haute mais volume réduit
- Sorties reconnaissance parcours

PHASE 4 - Affûtage (1-3 semaines)
- Objectif : Dissiper fatigue, maintenir forme
- Contenu : Volume -40 à -60%, intensité maintenue
- Repos stratégique

PHASE 5 - Récupération (2-4 semaines post-course)
- Objectif : Régénération complète
- Contenu : Activités plaisir, pas de structure
- Repos mental autant que physique`
  },
  {
    id: "economie_course",
    title: "Économie de course à pied",
    category: "metrics",
    tags: ["économie", "CAP", "course", "technique", "efficacité"],
    content: `L'économie de course (Running Economy) mesure l'efficacité énergétique du coureur.

Définition :
Consommation d'oxygène à une allure donnée. Moins tu consommes → plus tu es économe.

Facteurs influençant l'économie :
1. Technique : cadence, posture, oscillation verticale
2. Force : muscles des jambes et gainage
3. Élasticité : tendons, aponévroses
4. Poids : chaque kg compte sur marathon
5. Chaussures : légèreté et réponse élastique

Comment l'améliorer :
- Travail de technique (gammes, éducatifs)
- Renforcement musculaire (squats, fentes)
- Plyométrie (bondissements, sauts)
- Volume progressif (adaptation des tissus)
- Intervalles courts (5x 200m rapide)

Indicateur dans l'app :
L'économie de course est estimée via la dérive cardiaque.
Une faible dérive = bonne économie.
Une forte dérive (> 10%) = économie à travailler.`
  },
  {
    id: "derive_cardiaque",
    title: "Dérive cardiaque",
    category: "metrics",
    tags: ["dérive", "FC", "cardiaque", "fatigue", "endurance"],
    content: `La dérive cardiaque est l'augmentation progressive de la FC à allure constante.

Causes :
1. Thermorégulation : le corps chauffe, le cœur accélère
2. Déshydratation : volume plasmatique baisse
3. Fatigue musculaire : recrutement compensatoire
4. Stress métabolique : acidose, déplétion glycogène

Interprétation :
- Dérive < 5% sur 1h : Excellent (bonne endurance)
- Dérive 5-10% : Normal à modéré
- Dérive > 10% : Fatigue significative, économie à travailler

Utilisation coaching :
- Test de dérive : 1h à allure constante, mesurer FC début vs fin
- Évaluation de la forme : dérive qui diminue = progression
- Alerte fatigue : dérive inhabituelle = récupération nécessaire

Dans l'app :
La dérive est utilisée pour évaluer l'économie de course
et le risque de blessure CAP.`
  },
  {
    id: "nutrition_course",
    title: "Nutrition en course",
    category: "methodology",
    tags: ["nutrition", "course", "glucides", "ravitaillement", "gel"],
    content: `La nutrition en course est cruciale sur les épreuves longues (> 90 min).

Règles de base :
- Objectif : 60-90g glucides/h (selon tolérance)
- Vélo : tolérance plus élevée (90-120g/h possible)
- CAP : tolérance réduite (60-80g/h max)
- Triathlon : charger sur le vélo, maintenir en CAP

Sources de glucides :
- Gels : 20-30g par gel
- Barres : 30-50g par barre
- Boissons : 40-80g/L
- Solides : banane, pâte de fruit

Stratégie type (Ironman vélo) :
- 0-30 min : hydratation uniquement
- 30 min - fin : gel toutes les 20-25 min + boisson

Entraîner l'intestin :
- Tester TOUTE la nutrition à l'entraînement
- Jamais de nouveauté le jour J
- Augmenter progressivement les quantités

Signes de problème digestif :
Ballonnement, nausée, crampes → réduire la concentration.`
  },
  {
    id: "adaptation_chaleur",
    title: "Acclimatation à la chaleur",
    category: "methodology",
    tags: ["chaleur", "acclimatation", "été", "température", "performance"],
    content: `La chaleur impacte significativement la performance (jusqu'à -15% sur marathon).

Adaptations physiologiques recherchées :
- Sudation plus précoce et abondante
- Fréquence cardiaque stabilisée
- Thermorégulation plus efficace
- Meilleure tolérance perceptive

Protocole d'acclimatation (10-14 jours) :
1. Semaine 1 : Séances courtes (30-45 min) en chaleur
2. Semaine 2 : Allonger progressivement (60-90 min)
3. Maintenir : 1-2 séances/semaine en chaleur

Alternatives si pas de chaleur :
- Sauna post-entraînement (15-20 min)
- Vêtements chauds sur vélo home trainer
- Bains chauds

Le jour J en chaleur :
- Départ conservateur (-5 à -10% d'allure)
- Hydratation renforcée
- Refroidissement actif (eau sur la nuque, glace)
- Accepter que la perf sera impactée`
  },
  {
    id: "mode_staff",
    title: "C'est quoi le mode Staff ?",
    category: "app_usage",
    tags: ["staff", "mode", "expert", "confiance", "annotations"],
    content: `Le mode Staff active les fonctionnalités avancées de l'app.

Ce qui change en mode Staff :
- Affichage des indices de confiance sur chaque métrique
- Annotations contextuelles détaillées
- Messages "Pourquoi ce score ?" explicatifs
- Warnings et alertes staff-grade
- Détails des calculs (sources, formules)

Pour qui ?
- Coachs professionnels
- Staffs techniques
- Utilisateurs avancés voulant comprendre les calculs

Comment l'activer ?
Toggle "Mode Staff" dans le dashboard ou la navigation.
Le réglage est sauvegardé pour les prochaines sessions.

Conseil :
En mode Staff, chaque valeur affiche sa source et sa confiance.
Utilise ces informations pour nuancer tes décisions.`
  }
];

// =============================================
// ARTICLES RÉCUPÉRATION, SOMMEIL, STRESS
// =============================================

export const RECOVERY_ARTICLES: KnowledgeArticle[] = [
  {
    id: "recovery_basics",
    title: "Les bases de la récupération",
    category: "methodology",
    tags: ["récupération", "repos", "adaptation", "surcompensation", "fatigue"],
    content: `La récupération est là où l'adaptation se produit réellement.

Principe fondamental :
Entraînement = stimulus + récupération → adaptation
Sans récupération → pas de progression, voire régression.

Les 3 piliers de la récupération :
1. SOMMEIL : Le plus important (voir article dédié)
2. NUTRITION : Reconstitution des réserves + réparation
3. REPOS ACTIF : Circulation sanguine sans stress supplémentaire

Fenêtre de récupération post-entraînement :
- 0-30 min : Hydratation + glucides + protéines
- 2-4h : Repas complet équilibré
- 24-72h : Récupération musculaire (selon intensité)
- 7-14j : Récupération systémique (blocs intensifs)

Signes de récupération insuffisante :
- Performances en baisse
- FC repos élevée le matin
- Sommeil perturbé
- Irritabilité, motivation en berne
- Courbatures persistantes > 48h

Règle d'or :
"Mieux vaut être un peu sous-entraîné et frais qu'un peu surentraîné et fatigué."`
  },
  {
    id: "sleep_performance",
    title: "Sommeil et performance",
    category: "methodology",
    tags: ["sommeil", "récupération", "performance", "hormones", "nuit"],
    content: `Le sommeil est le facteur de récupération N°1 - non négociable.

Pourquoi le sommeil est critique :
- Sécrétion d'hormone de croissance (pic à 23h-2h)
- Réparation musculaire et tissulaire
- Consolidation de la mémoire motrice
- Régulation hormonale (cortisol, testostérone)
- Renforcement du système immunitaire

Besoins pour un athlète :
- Minimum : 7h (grand minimum)
- Optimal : 8-9h (recommandé)
- Charge élevée : 9-10h (périodes intensives)

Qualité > Quantité - Critères d'un bon sommeil :
✅ Endormissement < 20 min
✅ Réveils nocturnes < 2
✅ Réveil spontané (pas d'alarme)
✅ Sensation de repos au réveil

Optimiser son sommeil :
1. Régularité : heures fixes de coucher/lever
2. Température : 18-19°C dans la chambre
3. Obscurité : complète (masque si nécessaire)
4. Écrans : arrêt 1h avant le coucher
5. Caféine : dernière prise avant 14h
6. Sieste : 20-30 min max, avant 15h

Impact d'une dette de sommeil :
- -1h/nuit pendant 1 semaine ≈ -10% de performance
- Risque blessure multiplié par 1.7 si < 7h
- Récupération musculaire ralentie de 30%`
  },
  {
    id: "sleep_tracking",
    title: "Suivi du sommeil",
    category: "methodology",
    tags: ["sommeil", "tracking", "montre", "HRV", "analyse"],
    content: `Le suivi du sommeil aide à objectiver la récupération.

Métriques utiles :
1. Durée totale : Temps au lit vs temps de sommeil réel
2. Phases : Profond / Léger / REM (proportions)
3. Réveils : Nombre et durée
4. HRV nocturne : Variabilité de la fréquence cardiaque
5. FC repos : Mesurée au réveil

Interprétation HRV :
- HRV stable/haute : Bonne récupération
- HRV en baisse : Fatigue, stress, ou maladie à venir
- Tendance > valeur absolue (compare à TA moyenne)

Outils de mesure :
- Montres GPS (Garmin, Polar, Coros) : Estimation correcte
- Anneaux (Oura, Whoop) : Plus précis
- Matelas connectés : Très précis
- Ressenti subjectif : Ne pas négliger !

Conseil pratique :
Note chaque matin (1-5) :
- Qualité perçue du sommeil
- Énergie au réveil
- Motivation à s'entraîner

Ces notes simples sont souvent plus fiables que les gadgets.`
  },
  {
    id: "stress_management",
    title: "Gestion du stress",
    category: "methodology",
    tags: ["stress", "cortisol", "mental", "vie", "équilibre"],
    content: `Le stress total (vie + entraînement) doit être géré comme un tout.

Principe clé :
Le corps ne distingue pas les sources de stress.
Stress pro + stress perso + entraînement = charge totale.

Types de stress :
1. Physique : Entraînement, manque de sommeil, maladie
2. Mental : Travail, problèmes perso, anxiété
3. Émotionnel : Conflits, incertitude, pression

Impact du cortisol chroniquement élevé :
- Catabolisme musculaire
- Stockage de graisse abdominale
- Récupération ralentie
- Système immunitaire affaibli
- Troubles du sommeil

Stratégies de gestion :
1. Identifier les sources : Journal de stress (1-10/jour)
2. Adapter l'entraînement : Moins intense si stress élevé
3. Techniques de relaxation : Respiration, méditation
4. Activités plaisir : Hobbies, nature, social
5. Limites : Savoir dire non, déléguer

Règle pratique :
Semaine très stressante au travail ?
→ Réduire l'intensité, privilégier Z2
→ Ajouter une séance de récupération active
→ Ne pas culpabiliser de lever le pied`
  },
  {
    id: "hrv_recovery",
    title: "HRV et récupération",
    category: "metrics",
    tags: ["HRV", "variabilité", "récupération", "système nerveux", "autonome"],
    content: `La HRV (Heart Rate Variability) reflète l'état du système nerveux autonome.

Définition :
Variation du temps entre chaque battement cardiaque.
Plus c'est variable → meilleure récupération (en général).

Système nerveux autonome :
- Sympathique : "Combat ou fuite" (stress, effort)
- Parasympathique : "Repos et digestion" (récupération)

HRV haute (parasympathique dominant) :
✅ Bonne récupération
✅ Prêt pour l'entraînement
✅ Système nerveux détendu

HRV basse (sympathique dominant) :
⚠️ Fatigue ou stress
⚠️ Récupération incomplète
⚠️ Jour léger conseillé

Comment mesurer :
- Matin au réveil (avant de se lever)
- Position allongée, 3-5 min
- App + ceinture cardiaque = plus fiable
- Montres GPS = correct mais moins précis

Interprétation intelligente :
1. Regarde la TENDANCE sur 7-14 jours
2. Compare à TA propre moyenne (pas aux autres)
3. Un jour bas ≠ alarme, une semaine basse = attention
4. Combine avec ressenti subjectif

Attention :
L'alcool, la caféine et la déshydratation faussent les mesures.`
  },
  {
    id: "active_recovery",
    title: "Récupération active",
    category: "methodology",
    tags: ["récupération", "active", "Z1", "circulation", "mobilité"],
    content: `La récupération active accélère la régénération sans ajouter de stress.

Principe :
Un effort léger stimule la circulation sanguine, élimine les déchets métaboliques et maintient les amplitudes articulaires.

Exemples de récupération active :
- Vélo facile 30-45 min (< 55% FCmax)
- Natation légère (technique, pas d'intensité)
- Marche / randonnée tranquille
- Yoga / stretching dynamique
- Mobilité articulaire

Quand l'utiliser :
- Lendemain de séance intense
- Entre 2 blocs d'entraînement
- Semaine de récupération (décharge)
- Après une compétition

Ce que ce n'est PAS :
❌ Une séance Z2 "facile" (trop intense)
❌ Du fractionné court "pour bouger"
❌ Un entraînement de groupe à rythme variable

Intensité cible :
- FC < 60% FCmax
- RPE 2-3/10
- Respiration nasale possible
- Aucune sensation d'effort

Durée :
- 20-45 min suffisent
- Plus long ≠ mieux
- Écoute ton corps`
  },
  {
    id: "deload_week",
    title: "Semaine de décharge",
    category: "methodology",
    tags: ["décharge", "récupération", "semaine", "volume", "adaptation"],
    content: `La semaine de décharge permet l'adaptation et prévient le surentraînement.

Principe :
Après 3-4 semaines de charge progressive, 1 semaine allégée pour absorber le travail.

Programmation type :
- Semaine 1 : Charge normale
- Semaine 2 : Charge +5-10%
- Semaine 3 : Charge +5-10%
- Semaine 4 : DÉCHARGE (-40 à -50%)

Contenu de la semaine de décharge :
✅ Volume : -40 à -50%
✅ Intensité : Maintenue (rappels courts)
✅ Fréquence : Légèrement réduite (-1 séance)
✅ Sommeil : Priorité absolue
✅ Nutrition : Maintenue (pas de restriction)

Erreurs fréquentes :
❌ Repos complet (le corps s'endort)
❌ "Je me sens bien, j'envoie" (fatigue masquée)
❌ Sauter la décharge car "pas le temps"
❌ Réduire trop la nutrition

Bénéfices attendus :
- Dissipation de la fatigue accumulée
- Absorption des adaptations
- Rechargement mental
- FC repos qui baisse
- Motivation qui remonte

Indicateur clé :
Tu dois te sentir "affûté" et impatient de reprendre en fin de semaine.`
  },
  {
    id: "mental_recovery",
    title: "Récupération mentale",
    category: "methodology",
    tags: ["mental", "récupération", "motivation", "burnout", "équilibre"],
    content: `La fatigue mentale est aussi limitante que la fatigue physique.

Signes de fatigue mentale :
- Perte de motivation à s'entraîner
- Entraînement = corvée (plus de plaisir)
- Difficulté à se concentrer
- Irritabilité, humeur variable
- Procrastination des séances

Causes fréquentes :
- Monotonie (toujours les mêmes séances)
- Pression de performance (objectifs irréalistes)
- Déséquilibre vie/entraînement
- Manque de variété
- Absence de pause mentale

Stratégies de récupération mentale :
1. Variété : Changer de lieu, de sport, de parcours
2. Social : Entraînement en groupe, sorties plaisir
3. Déconnexion : Jours sans montre, sans analyse
4. Plaisir : Séances ludiques sans objectif
5. Pause : 1-2 semaines off après objectif majeur

Après une course importante :
- 1 semaine : Repos ou activité plaisir uniquement
- 2 semaines : Reprendre sans structure ni montre
- 3 semaines : Retour progressif à l'entraînement

Règle d'or :
"Si tu n'as pas envie de t'entraîner depuis 3 jours, c'est que ton corps (ou ta tête) a besoin de repos. Écoute-le."`
  },
  {
    id: "breathing_techniques",
    title: "Techniques de respiration",
    category: "methodology",
    tags: ["respiration", "relaxation", "stress", "parasympathique", "calme"],
    content: `La respiration est le levier le plus accessible pour activer la récupération.

Pourquoi ça marche :
Le nerf vague (parasympathique) est stimulé par la respiration lente et profonde.
→ Baisse du cortisol, FC, tension artérielle
→ Activation du mode "repos et récupération"

Technique 1 : Respiration carrée (Box Breathing)
- Inspire 4 sec
- Retiens 4 sec
- Expire 4 sec
- Retiens 4 sec
- Répète 5-10 cycles

Technique 2 : Cohérence cardiaque
- Inspire 5 sec
- Expire 5 sec
- 6 cycles/min pendant 5 min
- 3 fois par jour = effet maximal

Technique 3 : 4-7-8 (pour s'endormir)
- Inspire 4 sec
- Retiens 7 sec
- Expire 8 sec
- 4-8 cycles

Quand l'utiliser :
- Matin au réveil (activation douce)
- Avant une séance (focus)
- Après une séance (retour au calme)
- Avant de dormir (sommeil)
- Moment de stress (régulation)

Bénéfices prouvés :
- Réduction du stress et de l'anxiété
- Amélioration du sommeil
- Meilleure HRV
- Récupération accélérée`
  },
  {
    id: "nutrition_recovery",
    title: "Nutrition de récupération",
    category: "methodology",
    tags: ["nutrition", "récupération", "protéines", "glucides", "réparation"],
    content: `La nutrition post-entraînement optimise la récupération et l'adaptation.

Fenêtre anabolique (0-30 min post-effort) :
- Glucides : 1-1.2g/kg (reconstitution glycogène)
- Protéines : 20-30g (synthèse musculaire)
- Hydratation : 150% des pertes (1.5L pour 1kg perdu)

Ratio glucides/protéines :
- Après endurance longue : 3:1 ou 4:1
- Après force/intensité : 2:1
- Exemple : 60g glucides + 20g protéines

Sources pratiques post-entraînement :
- Lait chocolaté (ratio parfait)
- Yaourt + fruit + miel
- Sandwich jambon/fromage
- Shake protéines + banane
- Riz + poulet (si repas proche)

Hydratation :
- Pesée avant/après : 1kg perdu = 1.5L à boire
- Boisson avec sodium si > 2h d'effort
- Urine claire = bien hydraté

Repas dans les 2-4h :
- Repas complet équilibré
- Protéines + glucides complexes + légumes
- Graisses saines (pas de restriction)

Erreurs fréquentes :
❌ Sauter le repas post-entraînement (anorexie d'effort)
❌ Restriction calorique après effort long
❌ Oublier les protéines (juste du sucre)
❌ Alcool après l'entraînement (bloque la récupération)`
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
  ...ADVANCED_ARTICLES,
  ...RECOVERY_ARTICLES,
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
  { label: "Différence Z4a / Z4b", query: "C'est quoi la différence entre Z4a et Z4b ?" },
  { label: "Potentiel Physiologique", query: "Comment fonctionne le Potentiel Physiologique ?" },
  { label: "TTE insuffisant", query: "Mon TTE est insuffisant, que faire ?" },
  { label: "Affûtage", query: "Comment faire un bon affûtage avant une course ?" },
  { label: "Polarisé", query: "C'est quoi l'entraînement polarisé ?" },
  { label: "Sommeil", query: "Quel est l'impact du sommeil sur la performance ?" },
  { label: "Récupération", query: "Quelles sont les bases de la récupération ?" },
  { label: "Gestion du stress", query: "Comment gérer le stress vie + entraînement ?" },
  { label: "HRV", query: "C'est quoi la HRV et comment l'utiliser ?" },
  { label: "Semaine de décharge", query: "Comment faire une semaine de décharge ?" },
];
