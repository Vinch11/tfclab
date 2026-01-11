// =============================================
// KNOWLEDGE BASE - Two For Coaching Lab
// Source of truth versionnée pour l'assistant
// =============================================

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: "definition" | "app_usage" | "methodology" | "disclaimer" | "zones" | "interpretation";
  tags: string[];
  level: "athlete" | "staff";
  contentMarkdown: string;
  lastUpdated: string;
}

// =============================================
// VERSION CONTROL
// =============================================

export const KNOWLEDGE_BASE_VERSION = "1.0.0";
export const KNOWLEDGE_BASE_UPDATED = "2026-01-10";

// =============================================
// DISCLAIMER (toujours prioritaire)
// =============================================

export const DISCLAIMER_ARTICLES: KnowledgeArticle[] = [
  {
    id: "disclaimer_medical",
    title: "Limitations médicales de l'app",
    category: "disclaimer",
    tags: ["médical", "diagnostic", "limite", "santé"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Ce que l'app NE FAIT PAS

**AUCUN diagnostic médical**
- L'app ne diagnostique pas de pathologie
- L'app ne prescrit aucun traitement
- L'app ne remplace pas un médecin

**En cas de question médicale :**
Consulte un professionnel de santé qualifié.

**Responsabilité :**
Les indicateurs fournis sont des outils d'aide à la décision pour le coach.
Ils ne garantissent aucune performance et ne constituent pas un avis médical.`
  },
  {
    id: "disclaimer_app_scope",
    title: "Ce que l'app fait et ne fait pas",
    category: "disclaimer",
    tags: ["app", "fonctionnalités", "limites", "scope"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Ce que l'app FAIT

✅ Centralise les données physiologiques (VLamax, TTE, FTP, VO2max)
✅ Calcule des indicateurs composites (Race Readiness)
✅ Affiche les zones d'entraînement personnalisées
✅ Génère des rapports staff-grade avec annotations
✅ Aide à la prise de décision coaching

## Ce que l'app NE FAIT PAS

❌ Prédire les performances (temps, classement)
❌ Diagnostiquer des pathologies
❌ Prescrire des traitements ou régimes
❌ Remplacer le jugement du coach
❌ Garantir des résultats`
  }
];

// =============================================
// DÉFINITIONS MÉTRIQUES
// =============================================

export const DEFINITION_ARTICLES: KnowledgeArticle[] = [
  {
    id: "def_vlamax",
    title: "Définition VLamax",
    category: "definition",
    tags: ["VLamax", "lactate", "glycolytique", "métabolisme", "définition"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## VLamax (Velocity of Lactate Maximum)

**Définition :** Taux maximal de production de lactate par le système glycolytique (en mmol/L/s).

**Interprétation :**
- VLamax **haute** (> 0.5) → "Turbo glycolytique" puissant → favorable aux sprints
- VLamax **basse** (< 0.4) → Métabolisme lipidique dominant → favorable à l'endurance longue

**Valeurs de référence par objectif :**
| Objectif | Cible VLamax |
|----------|--------------|
| Ironman/Ultra | 0.25 - 0.40 mmol/L/s |
| 70.3 | 0.25 - 0.45 mmol/L/s |
| Marathon | 0.30 - 0.50 mmol/L/s |
| Sprint/Olympique | 0.40 - 0.60 mmol/L/s |

**Pourquoi c'est important ?**
Une VLamax trop haute pour un objectif longue distance = consommation glycogène trop rapide = risque de "mur" ou défaillance.

**Comment la baisser ?**
1. Volume en Z2 (le plus efficace)
2. Éviter les sprints et intervalles courts
3. Sorties longues à jeun (avec précaution)`
  },
  {
    id: "def_tte",
    title: "Définition TTE",
    category: "definition",
    tags: ["TTE", "Time To Exhaustion", "endurance", "seuil", "définition"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## TTE (Time To Exhaustion)

**Définition :** Durée maximale qu'un athlète peut maintenir son FTP (ou intensité seuil) avant épuisement (en minutes).

**Sources de données et confiance :**
| Source | Confiance | Fiabilité |
|--------|-----------|-----------|
| Mesuré (test TTE) | 0.95 | Très fiable |
| Estimé (TSS 7j) | 0.70 | Fiable |
| Approx (FTP seul) | 0.50 | Modéré |
| Défaut | 0.30 | Indicatif |

**Cibles par objectif :**
| Objectif | Cible TTE |
|----------|-----------|
| Ironman | 55+ min |
| Ultra | 60+ min |
| 70.3 | 50+ min |
| Marathon | 50+ min |
| Sprint | 35+ min |

**TTE insuffisant = l'athlète ne pourra pas tenir son allure cible sur la durée de l'épreuve.**

**Comment l'améliorer ?**
1. Volume en Z2 + blocs Z4a (sweet spot)
2. Progression charge chronique sur 4-6 semaines
3. Test TTE réel pour confirmer`
  },
  {
    id: "def_race_readiness",
    title: "Définition Race Readiness",
    category: "definition",
    tags: ["Race Readiness", "score", "préparation", "objectif", "définition"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Race Readiness

**Définition :** Indicateur composite (0-100) d'adéquation physiologique entre le profil de l'athlète et son objectif.

**Ce que c'est :**
- Un outil d'aide à la décision pour le coach
- Une évaluation de la cohérence du profil métabolique
- Un guide pour orienter les priorités d'entraînement

**Ce que ce n'est PAS :**
- ❌ Une prédiction de performance
- ❌ Une garantie de résultat
- ❌ Un remplacement du jugement du coach

**Composantes du calcul :**
1. **VLamax** : Dans la zone cible pour l'objectif ?
2. **TTE** : Suffisant pour la durée de l'épreuve ?
3. **FTP/kg** : Puissance relative adaptée ?
4. **Fraîcheur** : Fatigue récente maîtrisée ?

**Interprétation du score :**
| Score | Statut | Signification |
|-------|--------|---------------|
| > 80 | Race Ready | Profil cohérent avec l'objectif |
| 60-80 | En progression | Travail à continuer |
| < 60 | Travail à faire | Gaps identifiés à combler |`
  },
  {
    id: "def_crr",
    title: "Définition Charge Récente (CRR)",
    category: "definition",
    tags: ["charge", "CRR", "TSS", "entraînement", "fatigue", "définition"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Charge Récente (CRR)

**Définition :** Évaluation de la charge d'entraînement des 7 derniers jours basée sur le TSS (Training Stress Score).

**Interprétation par paliers :**
| TSS 7 jours | Statut | Signification |
|-------------|--------|---------------|
| < 300 | Légère | Récupération ou affûtage |
| 300-500 | Modérée | Maintenance |
| 500-700 | Élevée | Développement |
| > 700 | Très élevée | Surcharge (attention) |

**Impact sur Race Readiness :**
Une charge trop élevée avant une course = fatigue non dissipée = performance limitée.

**Pourquoi c'est surveillé ?**
- Éviter le surentraînement
- Optimiser l'affûtage pré-course
- Adapter la charge selon la phase`
  },
  {
    id: "def_robustesse",
    title: "Définition Robustesse",
    category: "definition",
    tags: ["robustesse", "fiabilité", "confiance", "données", "définition"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Robustesse

**Définition :** Indicateur de fiabilité globale des calculs basé sur la qualité des données sources.

**Dépend de :**
1. La confiance des données sources (VLamax, TTE, etc.)
2. La fraîcheur des données (date du dernier snapshot)
3. La cohérence entre les métriques

**Niveaux :**
| Niveau | Confiance moyenne | Signification |
|--------|-------------------|---------------|
| Robuste | ≥ 0.70 | Décision fiable |
| Prudent | 0.40 - 0.70 | Nuancer la décision |
| Indicatif | < 0.40 | Prudence maximale |

**Conseil staff :**
Avant une décision importante, vérifiez la robustesse.
Si elle est faible → actualiser le snapshot ou réaliser un test.`
  },
  {
    id: "def_risque_glycolytique",
    title: "Définition Risque Glycolytique",
    category: "definition",
    tags: ["glycolytique", "risque", "nutrition", "mur", "définition"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Risque Glycolytique

**Définition :** Probabilité que l'athlète consomme ses réserves de glycogène trop rapidement pendant l'épreuve.

**Causes d'un risque élevé :**
- VLamax trop haute pour l'objectif → dépendance au glucose
- Intensité prévue trop élevée
- Nutrition glucidique insuffisante

**Échelle :**
| Niveau | Signification |
|--------|---------------|
| Faible | Profil adapté à l'objectif |
| Modéré | Attention à la nutrition |
| Élevé | Risque de défaillance significatif |

**Conséquences si non adressé :**
- "Mur du marathon" (fringale)
- Défaillance en 2e partie de course
- Crampes et fatigue extrême

**Solutions coaching :**
1. Baisser la VLamax (volume Z2, éviter sprints)
2. Adapter l'allure course (plus prudente)
3. Optimiser la nutrition (plus de glucides/h)`
  },
  {
    id: "def_risque_blessure_cap",
    title: "Définition Risque Blessure CAP",
    category: "definition",
    tags: ["blessure", "risque", "CAP", "course", "économie", "définition"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Risque Blessure CAP

**Définition :** Évaluation du risque de blessure en course à pied basée sur l'économie de course et la fatigue neuromusculaire.

**Indicateurs utilisés :**
- Dérive cardiaque (> 10% = alerte)
- Fatigue neuromusculaire détectée
- Charge mécanique excessive
- Économie de course dégradée

**Lien VLamax/TTE :**
- VLamax haute + TTE bas = profil "fragile" en longue distance
- L'athlète puise trop dans ses réserves = fatigue précoce = altération de la technique = risque blessure

**Actions coaching si risque élevé :**
1. Réduire le volume de course à pied
2. Privilégier les surfaces souples (trail, herbe)
3. Augmenter le vélo/natation (moins d'impact)
4. Travail de renforcement et technique
5. Vérifier le sommeil et la récupération

**Important :** Ce n'est pas un diagnostic médical. En cas de douleur, consulter.`
  },
  {
    id: "def_confiance",
    title: "Définition Indice de Confiance",
    category: "definition",
    tags: ["confiance", "fiabilité", "source", "données", "définition"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Indice de Confiance

**Définition :** Score de 0 à 1 indiquant la fiabilité d'une donnée selon sa source.

**Échelle :**
| Confiance | Source typique | Interprétation |
|-----------|----------------|----------------|
| 0.95 | Test laboratoire (lactate, VO2max) | Très fiable |
| 0.75 | Test terrain structuré (sprint 15s, ramp) | Fiable |
| 0.55 | Estimation basée sur autres données | Modéré |
| 0.30 | Valeur par défaut (aucune donnée) | Indicatif seulement |

**Impact sur les décisions :**
- Confiance ≥ 0.7 → Décision robuste possible
- Confiance 0.4-0.7 → Nuancer, confirmer si important
- Confiance < 0.4 → Prudence maximale, obtenir des données réelles

**Comment augmenter la confiance ?**
1. Réaliser un test terrain (sprint 15s, ramp test)
2. Importer un rapport de test laboratoire
3. Mettre à jour le snapshot avec des données récentes`
  }
];

// =============================================
// ZONES D'ENTRAÎNEMENT
// =============================================

export const ZONES_ARTICLES: KnowledgeArticle[] = [
  {
    id: "zones_table",
    title: "Table officielle des zones",
    category: "zones",
    tags: ["zones", "Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7", "FC", "puissance"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Zones d'entraînement (7 zones)

| Zone | Nom | % FCmax | Description |
|------|-----|---------|-------------|
| Z1 | Récupération | < 70% | Échauffement, récupération active |
| Z2 | Endurance | 70-78% | Fondation aérobie, lipolyse |
| Z3 | Tempo léger | 78-83% | Endurance active, force basse cadence |
| Z4a | Allure marathon | 83-87% | Sweet spot, tenable 3h+ |
| Z4b | Allure semi | 87-91% | Tempo dur, tenable ~1h |
| Z5 | Seuil | 91-94% | MLSS, zone rouge proche |
| Z6 | VO2max | 94-100% | Intervalles intenses |
| Z7 | Neuromusculaire | > 100% | Sprints, recrutement max |

**Clé :** La Z2 est le socle de la pyramide aérobie. Souvent négligée, c'est pourtant la zone où se construisent les adaptations fondamentales.`
  },
  {
    id: "zones_z4_difference",
    title: "Différence Z4a et Z4b",
    category: "zones",
    tags: ["Z4a", "Z4b", "marathon", "semi", "tempo", "distinction"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Z4a vs Z4b : La distinction clé

**Z4a - Allure Marathon :**
- Sensation : "Je pourrais tenir indéfiniment" (tant qu'il y a du sucre)
- Durée tenable : 3h+
- Respiration : contrôlée, quelques mots possibles
- Usage : sorties longues, sweet spot

**Z4b - Allure Semi :**
- Sensation : "Le sablier coule" - autonomie 1h-1h15
- Durée tenable : 1h max
- Respiration : plus lourde, focus mental nécessaire
- Usage : blocs spécifiques semi, tempo dur

**Erreur fréquente :**
Faire de la Z4b en pensant faire de la Z4a → surcharge chronique sans gains optimaux.

**Comment distinguer ?**
- Si tu peux parler par phrases = Z4a max
- Si parler demande un effort = Z4b`
  },
  {
    id: "zones_zone_grise",
    title: "La zone grise",
    category: "zones",
    tags: ["zone grise", "erreur", "entraînement", "fatigue", "piège"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## La zone grise : le piège classique

**Définition :**
S'entraîner entre Z2 et Z4 : trop vite pour l'endurance, trop lent pour la VO2max.

**Conséquences :**
- Fatigue accumulée sans grandes adaptations
- Plateau de performance
- Surentraînement progressif

**Comment l'éviter ?**
1. **Polariser** : 80% du volume en Z1-Z2, 20% en Z5-Z6
2. **Respecter la Z2** : si tu peux parler par phrases → OK
3. **Éviter les sorties "moyennement dures"** sans objectif clair

**Vérification :**
Analyse la distribution de tes séances sur 4 semaines.
Si > 20% du temps est en Z3-Z4 hors blocs spécifiques → polariser davantage.`
  }
];

// =============================================
// GUIDE D'UTILISATION APP
// =============================================

export const APP_USAGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "app_where_fcmax",
    title: "Où renseigner la FCmax",
    category: "app_usage",
    tags: ["FCmax", "fréquence cardiaque", "paramètres", "saisie", "où"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Où renseigner la FCmax ?

**Chemin :**
1. Sélectionne l'athlète concerné
2. Va dans l'onglet **"Profil"** ou ouvre le panneau **"Références"**
3. Dans la section **"Références athlète"**, modifie le champ **"FC Max"**
4. La valeur est sauvegardée automatiquement

**Conseil :**
Utilise une FCmax mesurée lors d'un test ou d'une course récente.
La formule 220 - âge est obsolète et imprécise.

**Si la donnée n'est pas renseignée :**
L'app utilisera une valeur par défaut (confiance faible).`
  },
  {
    id: "app_demo_values",
    title: "Pourquoi des valeurs demo ?",
    category: "app_usage",
    tags: ["demo", "exemple", "données", "test", "pourquoi"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Pourquoi des valeurs "demo" apparaissent ?

**Causes possibles :**
1. Aucun athlète n'est sélectionné
2. L'athlète n'a pas de snapshot actif
3. Certaines données du snapshot sont vides

**Solution :**
1. Crée ou sélectionne un athlète
2. Ajoute un **Snapshot** avec les données réelles (FTP, poids, VMA, etc.)
3. Les calculs utiliseront automatiquement ces valeurs

**Comment vérifier ?**
Ouvre l'onglet **"Contexte"** de l'Assistant pour voir quelles données sont utilisées.
Les valeurs manquantes sont indiquées.`
  },
  {
    id: "app_why_estimated",
    title: "Pourquoi une valeur est estimée ?",
    category: "app_usage",
    tags: ["estimé", "estimation", "source", "confiance", "pourquoi"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Pourquoi une valeur est marquée "estimée" ?

**Signification :**
La donnée n'a pas été mesurée directement. Elle a été calculée à partir d'autres données disponibles.

**Exemples :**
- **VLamax estimée** : Calculée à partir du FTP et Pmax, pas de test sprint ou lactate
- **TTE estimé** : Basé sur la charge 7j (TSS), pas de test TTE réel

**Pourquoi la confiance est plus basse ?**
Une estimation introduit une marge d'erreur. Plus la source est directe, plus la confiance est haute.

**Comment obtenir une valeur "mesurée" ?**
1. Réalise un test terrain (sprint 15s, ramp test)
2. Importe un rapport de test laboratoire
3. Les données mesurées remplacent les estimations`
  },
  {
    id: "app_import_pdf",
    title: "Comment importer un PDF de test ?",
    category: "app_usage",
    tags: ["import", "PDF", "test", "labo", "Mika", "Quentin", "comment"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Comment importer un PDF de test ?

**Chemin :**
1. Va dans l'onglet **"Tests"** ou **"Snapshots"**
2. Clique sur **"Importer PDF"** ou l'icône document
3. Sélectionne ton fichier PDF
4. L'app extrait automatiquement les valeurs reconnues
5. **Vérifie** les données avant de valider

**Formats supportés :**
- Rapports Mika
- Rapports Quentin Marthouret
- (autres formats en cours d'ajout)

**Limites :**
- L'extraction n'est pas parfaite
- Certains champs peuvent être mal reconnus
- **Toujours vérifier** les valeurs extraites avant validation

**Si l'import échoue :**
Saisis les valeurs manuellement dans un nouveau Snapshot.`
  },
  {
    id: "app_snapshot_explained",
    title: "Comment marche le Snapshot ?",
    category: "app_usage",
    tags: ["snapshot", "données", "sauvegarde", "actif", "historique", "comment"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Comment marche le Snapshot ?

**Définition :**
Le Snapshot est une "photo" des données physiologiques d'un athlète à un instant T.

**Contenu d'un Snapshot :**
- Métriques vélo : FTP, Pmax 5s, FC Max
- Métriques CAP : VMA, CSS, allure seuil
- Données corporelles : poids, masse grasse
- Données métaboliques : VLamax, TTE, VO2max

**Snapshot Actif vs Historique :**
- Un seul snapshot peut être **"actif"** à la fois
- Le snapshot actif alimente tous les calculs (zones, Race Readiness, etc.)
- Les anciens snapshots restent consultables pour suivre l'évolution

**Comment ajouter un Snapshot ?**
1. Va dans l'onglet **"Snapshots"**
2. Clique sur **"+ Nouveau Snapshot"**
3. Remplis les champs disponibles
4. Le nouveau snapshot devient automatiquement actif`
  },
  {
    id: "app_increase_confidence",
    title: "Comment augmenter la confiance ?",
    category: "app_usage",
    tags: ["confiance", "augmenter", "améliorer", "fiabilité", "comment"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Comment augmenter la confiance d'une métrique ?

**Principe :**
Plus la source de la donnée est directe et récente, plus la confiance est haute.

**Actions pour augmenter la confiance :**

1. **Réaliser un test terrain**
   - Sprint 15s (VLamax)
   - Ramp test (FTP + VLamax)
   - Test TTE (durée à seuil)

2. **Importer un rapport de test labo**
   - Test lactate = confiance maximale
   - VO2max mesurée = confiance maximale

3. **Mettre à jour le snapshot**
   - Données récentes = plus pertinentes
   - Un snapshot vieux de 6 mois = confiance réduite

**Où voir la confiance ?**
Active le **Mode Staff** pour afficher les indices de confiance sur chaque métrique.`
  },
  {
    id: "app_option_longue_deconseille",
    title: "Pourquoi l'option longue est déconseillée ?",
    category: "interpretation",
    tags: ["option", "longue", "séance", "risque", "déconseillée", "pourquoi"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Pourquoi l'option longue est déconseillée ?

**L'annotation apparaît quand :**
1. Le TTE est insuffisant pour l'objectif (< cible)
2. La charge récente est déjà élevée (TSS 7j > seuil)
3. Un risque de surentraînement est détecté

**Pourquoi c'est un problème ?**
Une sortie longue supplémentaire risque de :
- Accumuler de la fatigue sans bénéfice proportionnel
- Retarder la récupération
- Augmenter le risque de blessure

**Alternatives recommandées :**
1. Séance courte et intense (qualité > volume)
2. Récupération active
3. Reporter la longue après une phase de récupération

**Action dans l'app :**
Vérifie le **TSS 7j** et le **statut TTE** dans le tableau de bord.`
  }
];

// =============================================
// MÉTHODOLOGIE
// =============================================

export const METHODOLOGY_ARTICLES: KnowledgeArticle[] = [
  {
    id: "method_polarized",
    title: "Entraînement polarisé 80/20",
    category: "methodology",
    tags: ["polarisé", "80/20", "intensité", "distribution", "méthodologie"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Entraînement polarisé (80/20)

**Principe :**
80% du volume en Z1-Z2 (facile) / 20% en Z5-Z6 (dur)

**Pourquoi ça marche :**
- Le volume Z2 développe les adaptations aérobies sans stress excessif
- L'intensité haute stimule la VO2max et le seuil
- Pas de "zone grise" chronique qui fatigue sans grands gains

**Distribution type par semaine :**
- 4-5 séances Z2 (endurance, récupération)
- 1-2 séances Z5/Z6 (intervalles, seuil)
- 0-1 séance Z3/Z4 uniquement pour spécificité course

**Erreur classique :**
La plupart des amateurs font l'inverse : 50% zone grise, 40% Z2, 10% intense.
Résultat : plateau, fatigue chronique, surentraînement.`
  },
  {
    id: "method_tapering",
    title: "L'affûtage (Tapering)",
    category: "methodology",
    tags: ["affûtage", "tapering", "course", "préparation", "récupération", "méthodologie"],
    level: "athlete",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## L'affûtage (Tapering)

**Objectif :**
Dissiper la fatigue accumulée tout en maintenant les adaptations physiologiques.

**Règles d'or :**
1. **Volume** : Réduction de 40% à 60% sur 7-14 jours
2. **Fréquence** : Maintenir le même nombre de séances
3. **Intensité** : MAINTENIR ! Rappels d'allure course courts
4. **Durée** : 1 semaine (Sprint) à 2-3 semaines (Ironman)

**Erreurs fréquentes :**
❌ Repos complet → le corps "s'endort"
❌ Continuer le volume → fatigue non dissipée
❌ Séances longues "de rassurance" → contre-productif

**Exemple Ironman (2 semaines) :**
- Semaine -2 : Volume -40%, intensité 100%, 2 rappels allure
- Semaine -1 : Volume -60%, intensité 100%, 1 rappel allure court`
  },
  {
    id: "method_fat_max",
    title: "Fat Max et lipolyse",
    category: "methodology",
    tags: ["fat max", "lipolyse", "graisse", "endurance", "VLamax", "méthodologie"],
    level: "staff",
    lastUpdated: "2026-01-10",
    contentMarkdown: `## Fat Max (Oxydation maximale des graisses)

**Définition :**
Intensité où l'oxydation des graisses est maximale.

**Pourquoi c'est important :**
- Réserves de graisses quasi-illimitées (80 000+ kcal)
- Glycogène limité (~2000 kcal)
- Mieux utiliser les graisses = économiser le glycogène = éviter le mur

**Position typique :**
- Entre 55% et 75% de la VO2max
- Juste sous le SV1 (premier seuil ventilatoire)
- Correspond souvent à la Z2

**Comment l'améliorer :**
1. Volume en Z2 (le plus important)
2. Baisser la VLamax (éviter les sprints)
3. Sorties à jeun en Z2 (avec précaution)

**Attention :**
Fat Max ≠ perte de poids optimale. C'est un indicateur métabolique, pas un régime.`
  }
];

// =============================================
// TOUS LES ARTICLES
// =============================================
// ARTICLES WAHOO SYSTM
// =============================================

export const WAHOO_ARTICLES: KnowledgeArticle[] = [
  {
    id: "wahoo_what_is",
    title: "Qu'est-ce que Wahoo SYSTM ?",
    category: "methodology",
    tags: ["Wahoo", "SYSTM", "Sufferfest", "plateforme", "externe"],
    level: "athlete",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Wahoo SYSTM

**Définition :** Plateforme d'entraînement indoor (ex-Sufferfest) avec des séances structurées vélo et course à pied.

**Dans Two For Coaching Lab :**
- L'app RECONNAÎT les séances Wahoo et les INTERPRÈTE physiologiquement
- Elle génère des SUGGESTIONS personnalisées basées sur ton profil
- Elle NE REMPLACE PAS Wahoo, elle l'ÉCLAIRE

**Ce que fait l'app :**
✅ Expliquer les effets d'une séance sur VLamax/TTE
✅ Alerter si une séance est incohérente avec ton profil
✅ Proposer des alternatives plus adaptées

**Ce que l'app NE FAIT PAS :**
❌ Modifier le plan
❌ Remplacer la décision du coach
❌ Créer des séances Wahoo`
  },
  {
    id: "wahoo_why_suggested",
    title: "Pourquoi une séance Wahoo est suggérée",
    category: "methodology",
    tags: ["Wahoo", "suggestion", "pourquoi", "proposée", "recommandée"],
    level: "staff",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Logique des suggestions Wahoo

**Une séance est suggérée si elle répond à un besoin physiologique identifié :**

| Besoin | Condition | Séances typiques |
|--------|-----------|------------------|
| NEED_VLAMAX_DOWN | VLamax > seuil objectif | Endurance 1.5, Tempo Low Cadence |
| NEED_TTE_UP | TTE < cible - 5 min | Sweet Spot, Sustained Tempo |
| NEED_ENDURANCE_BASE | Charge faible ou RR endurance bas | Endurance 2.0, Long Endurance |
| NEED_RECOVERY | Fatigue ≥7 ou risque blessure | Recovery Ride, Serbia Upside Down |
| NEED_VO2_UP | Objectif court + VLamax bas | VO2 Intervals (usage limité) |

**Priorité :** RECOVERY > VLAMAX_DOWN > TTE_UP > ENDURANCE_BASE > VO2_UP

**Le "Pourquoi" cite toujours les valeurs effectives** (VLamax, TTE, objectif).`
  },
  {
    id: "wahoo_why_avoided",
    title: "Pourquoi une séance Wahoo est déconseillée",
    category: "methodology",
    tags: ["Wahoo", "déconseillé", "éviter", "risque", "contre-indication"],
    level: "staff",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Séances Wahoo déconseillées

**Une séance est déconseillée si :**

1. **VLamax déjà élevée + séance glycolytique**
   - Nine Hammers, Violator, Short KOM → augmentent VLamax
   - Risque : aggraver le déséquilibre métabolique

2. **Objectif longue distance (IM/70.3/Marathon)**
   - Séances risk_level 3 (AC, NM, VO2 intense)
   - Contre-productif pour l'économie d'effort

3. **Fatigue ou risque blessure élevé**
   - Toute séance à stress neuromusculaire élevé
   - Privilégier récupération

4. **Contre-indications explicites dans le mapping**
   - Ex: "Objectif Ironman", "VLamax > 0.50", "Fatigue accumulée"

**Alternative :** L'app propose 1-2 séances plus cohérentes.`
  },
  {
    id: "wahoo_effects_vlamax",
    title: "Effets des séances Wahoo sur VLamax",
    category: "methodology",
    tags: ["Wahoo", "VLamax", "effet", "baisse", "hausse", "glycolytique"],
    level: "staff",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Impact des séances Wahoo sur VLamax

**Séances qui BAISSENT VLamax (↓) :**
- Endurance 1.0, 1.5, 2.0 (Z2 prolongée)
- Tempo Low Cadence (force-endurance)
- Long Endurance Ride
- Foundation Ride

**Séances NEUTRES (=) :**
- Sweet Spot, Sustained Tempo (tempo modéré)
- Threshold, Over-Under (seuil)
- Recovery (trop court pour impact)

**Séances qui AUGMENTENT VLamax (↑) :**
- Nine Hammers, Violator (glycolytique max)
- VO2 Intervals, MAP (haute intensité)
- Short KOM, AC Intervals (anaérobie)
- NM Sprints (neuromusculaire)

**Règle :** Pour objectif longue distance, éviter les séances ↑ VLamax sauf usage ponctuel.`
  },
  {
    id: "wahoo_effects_tte",
    title: "Effets des séances Wahoo sur TTE",
    category: "methodology",
    tags: ["Wahoo", "TTE", "effet", "durabilité", "seuil", "endurance"],
    level: "staff",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Impact des séances Wahoo sur TTE

**Séances qui AMÉLIORENT TTE (↑) :**
- Sustained Tempo, Tempo Varying Cadence
- Sweet Spot, Sweet Spot Progressif
- Over-Under Intervals
- Threshold Intervals
- Endurance longue (effet indirect)

**Séances NEUTRES (=) :**
- Endurance courte (< 90 min)
- Recovery, Easy Spin
- VO2 Intervals (pas d'impact TTE direct)

**Séances qui DÉGRADENT TTE (↓) :**
- Nine Hammers (stress excessif)
- Violator, AC Intervals
- Séances très glycolytiques répétées

**Conseil :** TTE se développe par le volume au tempo/seuil, pas par les pics d'intensité.`
  },
  {
    id: "wahoo_categories",
    title: "Catégories de séances Wahoo",
    category: "methodology",
    tags: ["Wahoo", "catégorie", "type", "classification", "zone"],
    level: "athlete",
    lastUpdated: "2026-01-11",
    contentMarkdown: `## Catégories Wahoo SYSTM

| Catégorie | Exemples | Effet principal |
|-----------|----------|-----------------|
| RECOVERY | Recovery Ride, Easy Spin | Récupération active |
| Z2_ENDURANCE | Endurance 1.0, 1.5, 2.0 | VLamax ↓, base aérobie |
| Z2_LONG | Long Endurance Ride | VLamax ↓, nutrition |
| TEMPO_DURABILITY | Sweet Spot, Sustained Tempo | TTE ↑ |
| FORCE_ENDURANCE | Tempo Low Cadence, Torque | VLamax ↓ + force |
| THRESHOLD_MLSS | Threshold, Over-Under | TTE ↑, seuil |
| VO2_MAP | VO2 Intervals, Nine Hammers | VO2max ↑ (VLamax ↑) |
| ANAEROBIC_AC | Violator, Short KOM | Puissance (VLamax ↑↑) |
| NEUROMUSCULAR_NM | Sprints, NM | Explosivité (VLamax ↑) |

**Conseil :** Pour IM/Marathon, privilégier RECOVERY + Z2 + TEMPO + FORCE.`
  },
];

export const ALL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  ...DISCLAIMER_ARTICLES,
  ...DEFINITION_ARTICLES,
  ...ZONES_ARTICLES,
  ...APP_USAGE_ARTICLES,
  ...METHODOLOGY_ARTICLES,
  ...WAHOO_ARTICLES,
];

// =============================================
// RECHERCHE DANS LA KB
// =============================================

export interface SearchResult {
  article: KnowledgeArticle;
  score: number;
  matchedTags: string[];
}

/**
 * Recherche dans la Knowledge Base
 * Retourne les articles les plus pertinents par score
 */
export function searchKnowledgeBase(query: string, limit: number = 4): SearchResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const results: SearchResult[] = [];
  
  for (const article of ALL_KNOWLEDGE_ARTICLES) {
    let score = 0;
    const matchedTags: string[] = [];
    
    // Score par titre
    const titleLower = article.title.toLowerCase();
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 5;
      }
    }
    
    // Score par tags (le plus important)
    for (const tag of article.tags) {
      const tagLower = tag.toLowerCase();
      for (const word of queryWords) {
        if (tagLower.includes(word) || word.includes(tagLower)) {
          score += 10;
          if (!matchedTags.includes(tag)) {
            matchedTags.push(tag);
          }
        }
      }
    }
    
    // Score par contenu
    const contentLower = article.contentMarkdown.toLowerCase();
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += Math.min(matches * 2, 8); // Cap à 8 points par mot
    }
    
    // Bonus questions spécifiques
    if (queryLower.includes("pourquoi") && article.contentMarkdown.toLowerCase().includes("pourquoi")) {
      score += 3;
    }
    if (queryLower.includes("comment") && (article.category === "app_usage" || article.contentMarkdown.toLowerCase().includes("comment"))) {
      score += 3;
    }
    if (queryLower.includes("où") && article.category === "app_usage") {
      score += 5;
    }
    
    if (score > 0) {
      results.push({ article, score, matchedTags });
    }
  }
  
  // Tri par score décroissant
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

/**
 * Formate les résultats de recherche pour le prompt AI
 */
export function formatKnowledgeForPrompt(results: SearchResult[]): string {
  if (results.length === 0) {
    return "Aucun article pertinent trouvé dans la base de connaissances.";
  }
  
  const formatted = results.map((r, i) => {
    // Extraire les premiers paragraphes (max ~400 caractères)
    const excerpt = r.article.contentMarkdown
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .slice(0, 6)
      .join('\n')
      .slice(0, 500);
    
    return `### ${i + 1}. ${r.article.title} [${r.article.category}]
Tags: ${r.matchedTags.join(', ') || r.article.tags.slice(0, 3).join(', ')}

${excerpt}...`;
  });
  
  return formatted.join('\n\n---\n\n');
}

/**
 * Liste des citations sources pour une réponse
 */
export function getSourceCitations(results: SearchResult[]): string[] {
  return results.map(r => `Academy > ${r.article.category} > ${r.article.title}`);
}
