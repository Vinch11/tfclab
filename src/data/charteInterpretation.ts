// =============================================
// CHARTE OFFICIELLE - COMMENT LIRE UN RAPPORT T4C
// Référence pédagogique unique pour Academy, PDF, Chatbot
// =============================================

export interface CharteSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  keyMessage?: string;
  examples?: string[];
  staffOnly?: boolean;
}

export interface CharteModule {
  id: string;
  metricId: string;
  title: string;
  conceptPhysio: string;
  howT4CUses: string;
  whatItMeans: string;
  whatItDoesNotMean: string;
  commonErrors: string[];
  coachUsage: string;
  scientificLimits: string;
  charteReference: string;
}

// =============================================
// PRÉAMBULE - CE QU'EST (ET N'EST PAS) T4C
// =============================================

export const CHARTE_PREAMBLE = `Two For Coaching Lab n'est ni un test physiologique de laboratoire, ni un planificateur automatique, ni une vérité physiologique absolue.

C'est un outil d'analyse, de modélisation et de mise en perspective des données de l'athlète, conçu pour aider le coach et l'athlète à mieux comprendre les mécanismes de performance, leurs limites, et leurs marges de progression.

Les résultats présentés sont des estimations contextualisées, construites à partir de données mesurées, de tests terrain et de modèles physiologiques reconnus dans la littérature scientifique.`;

export const CHARTE_CRITICAL_MESSAGE = "Un rapport Two For Coaching Lab n'a de valeur que s'il est interprété avec esprit critique.";

// =============================================
// SECTIONS PRINCIPALES DE LA CHARTE
// =============================================

export const CHARTE_SECTIONS: CharteSection[] = [
  {
    id: "preambule",
    title: "Ce qu'est (et n'est pas) Two For Coaching Lab",
    icon: "🎯",
    content: CHARTE_PREAMBLE,
    keyMessage: CHARTE_CRITICAL_MESSAGE
  },
  {
    id: "ranges",
    title: "Le principe fondamental : pas de valeur unique, mais des plages",
    icon: "📊",
    content: `Dans la réalité physiologique, aucune variable de performance n'est parfaitement stable. Elle varie selon :
• L'état de fatigue
• La nutrition
• Le stress
• Le protocole de test
• Le contexte environnemental

C'est pourquoi Two For Coaching Lab ne présente jamais une valeur brute isolée comme une vérité, mais toujours :
• Une valeur centrale
• Une plage de plausibilité
• Un indice de confiance
• Une source explicite`,
    keyMessage: "Toute valeur présentée sans contexte est une erreur d'interprétation.",
    examples: [
      "VLamax = 0.37 (≈ 0.27–0.47), estimée, confiance modérée",
      "TTE = 48 min (≈ 41–55 min), estimé, confiance élevée",
      "Race Readiness = 72 (≈ 57–87), confiance modérée"
    ]
  },
  {
    id: "confidence",
    title: "Comprendre la notion de confiance",
    icon: "🔬",
    content: `L'indice de confiance ne mesure pas la qualité de l'athlète. Il mesure la fiabilité de la donnée.

Niveaux de confiance :
• Confiance élevée (> 0.85) : données mesurées directement, protocole robuste
• Confiance modérée (0.65 – 0.85) : tests terrain standardisés, estimation fiable mais indirecte
• Confiance faible (< 0.65) : données incomplètes, modélisation large, interprétation prudente`,
    keyMessage: "Un score avec une confiance faible n'est pas faux, il est simplement plus incertain."
  },
  {
    id: "sources",
    title: "Mesuré vs Estimé vs Modélisé",
    icon: "📐",
    content: `Three types de données coexistent dans Two For Coaching Lab :

🔬 MESURÉ
Issu d'un test direct (lactate, VO2max, TTE observé). Référence physiologique la plus fiable.

🧠 ESTIMÉ
Issu d'un test terrain standardisé. Très utile pour le suivi longitudinal, mais dépend du protocole.

🔁 MODÉLISÉ
Calcul issu de plusieurs indicateurs. Sert à orienter la réflexion, pas à trancher définitivement.`,
    keyMessage: "Two For Coaching Lab privilégie la cohérence globale plutôt que la précision illusoire."
  },
  {
    id: "scores",
    title: "Pourquoi les scores ne sont PAS des notes",
    icon: "⚖️",
    content: `Un score (Race Readiness, Robustesse, Risque) n'est pas une note de valeur. C'est un indicateur synthétique permettant de comparer des états, pas des personnes.

Pourquoi les scores sont donnés avec une plage :
• La physiologie n'est pas une science exacte
• Le contexte individuel modifie l'interprétation
• Les entrées peuvent être plus ou moins fiables

Pourquoi deux athlètes avec le même score peuvent nécessiter des stratégies différentes :
• L'âge, l'objectif et l'historique modifient les priorités
• Les marges de progression ne sont pas identiques
• Les risques et limites sont individuels`,
    keyMessage: "Le contexte (objectif, âge, sport) est toujours déterminant."
  },
  {
    id: "targets",
    title: "Objectifs et cibles : des zones, pas des obligations",
    icon: "🎯",
    content: `Les cibles proposées par Two For Coaching Lab sont des zones physiologiques plausibles, pas des objectifs imposés.

Exemples de cibles FTP/kg par profil :
• Triathlète 50 ans objectif IM : plausible 3.8–4.2 W/kg, ambitieux 4.3–4.5, élite > 4.5
• Triathlète 35 ans objectif 70.3 : plausible 4.0–4.4 W/kg, ambitieux 4.5–4.8, élite > 4.8
• Marathonien 40 ans : les cibles s'expriment en VMA relative

Ces valeurs s'inscrivent dans une logique de :
• Progressivité (pas de changement brutal)
• Réalisme (âge, disponibilité, historique)
• Respect du profil individuel (biomécanique, tolérance à la charge)`,
    keyMessage: "Une cible « idéale » qui ne tient pas compte du contexte est une cible inutile."
  },
  {
    id: "capabilities",
    title: "Ce que le rapport dit / ne dit pas",
    icon: "📋",
    content: `CE QUE LE RAPPORT PERMET ✅
• Identifier des leviers prioritaires d'amélioration
• Hiérarchiser les axes de travail selon l'objectif
• Anticiper certains risques (glycolytique, blessure, fatigue)
• Suivre l'évolution longitudinale d'un profil

CE QUE LE RAPPORT NE FAIT PAS ❌
• Prescrire un plan d'entraînement
• Garantir une performance le jour J
• Remplacer l'expertise du coach
• Poser un diagnostic médical
• Prédire avec certitude le comportement en course`,
    keyMessage: "Les décisions finales appartiennent toujours au coach et à l'athlète."
  }
];

// =============================================
// MODULES ACADEMY ALIGNÉS SUR LA CHARTE
// =============================================

export const CHARTE_MODULES: CharteModule[] = [
  {
    id: "module_vlamax",
    metricId: "vlamax",
    title: "VLamax : le moteur glycolytique",
    conceptPhysio: `La VLamax (Velocity of Lactate Maximum) représente le taux maximal de production de lactate par le système glycolytique. C'est la « puissance du turbo » énergétique.

Une VLamax haute = production rapide de lactate = énergie explosive mais consommation glycogène rapide.
Une VLamax basse = production modérée de lactate = endurance longue favorisée.`,
    howT4CUses: `Two For Coaching Lab estime la VLamax via plusieurs sources hiérarchisées :
1. Test lactate labo (🔬 mesurée, confiance ~0.95)
2. Test terrain sprint (🧠 estimée, confiance ~0.75)
3. Modèle FTP/Pmax (🔁 modélisée, confiance ~0.55)

La valeur affichée inclut toujours une plage d'incertitude (± 0.05 à ± 0.15 selon la source).`,
    whatItMeans: `Une VLamax dans la zone cible indique une cohérence entre le profil métabolique et l'objectif. Pour un Ironman, la cible est ~0.25–0.45 mmol/L/s. Pour un sprint, elle peut atteindre 0.6–0.8.`,
    whatItDoesNotMean: `La VLamax n'est PAS :
• Une note de performance
• Une valeur définitive
• Un indicateur suffisant pour décider seul
• Un diagnostic physiologique médical`,
    commonErrors: [
      "Croire qu'une VLamax basse est toujours « mieux » (faux pour les sprinters)",
      "Ignorer la marge d'incertitude et prendre la valeur comme absolue",
      "Comparer des VLamax issues de sources différentes (labo vs terrain)",
      "Modifier brutalement l'entraînement sur une seule mesure"
    ],
    coachUsage: `Le coach utilise la VLamax pour orienter la stratégie d'entraînement :
• VLamax haute pour IM/Marathon → privilégier Z2 longue, éviter sprints
• VLamax basse pour sprint → ajouter travail neuromusculaire

La VLamax guide les priorités, elle ne les impose pas.`,
    scientificLimits: `La VLamax est un concept issu du modèle Mader/Heck. Son estimation hors labo repose sur des hypothèses (efficacité mécanique, contribution aérobie du sprint) qui introduisent une incertitude irréductible.`,
    charteReference: "Selon la charte Two For Coaching Lab, toute VLamax estimée doit être interprétée comme un indicateur directionnel, pas comme une valeur absolue."
  },
  {
    id: "module_tte",
    metricId: "tte",
    title: "TTE : durabilité au seuil",
    conceptPhysio: `Le TTE (Time To Exhaustion) représente la durée maximale qu'un athlète peut maintenir une intensité égale à son FTP (ou seuil fonctionnel).

C'est un indicateur de durabilité : plus le TTE est élevé, plus l'athlète peut maintenir son seuil longtemps.`,
    howT4CUses: `Two For Coaching Lab estime le TTE via :
1. TTE observé lors d'un test spécifique (🔬 mesuré, confiance ~0.95)
2. Estimation basée sur la charge récente TSS 7j (🧠 estimé, confiance ~0.70)
3. Estimation basée sur FTP seul (🔁 modélisé, confiance ~0.50)

La valeur affichée inclut une plage (± 3 à ± 12 min selon la source).`,
    whatItMeans: `Un TTE suffisant signifie que l'athlète a la capacité d'endurance nécessaire pour son objectif. Les cibles varient : IM > 55 min, 70.3 > 48 min, Marathon > 45 min.`,
    whatItDoesNotMean: `Le TTE n'est PAS :
• Une prédiction de chrono
• Une garantie de tenir l'allure en course
• Indépendant de la nutrition et de la fatigue`,
    commonErrors: [
      "Confondre TTE labo et TTE terrain (protocoles différents)",
      "Croire qu'un TTE élevé compense tout",
      "Ignorer l'impact de la charge récente sur le TTE du jour",
      "Surestimer la précision du TTE estimé"
    ],
    coachUsage: `Le coach utilise le TTE pour évaluer si la base d'endurance est suffisante :
• TTE insuffisant → augmenter le volume au tempo
• TTE correct → maintenir et affiner l'allure spécifique`,
    scientificLimits: `Le TTE varie selon le protocole (ramp, constant, terrain) et l'état du jour. Les estimations via TSS sont des approximations.`,
    charteReference: "Selon la charte Two For Coaching Lab, le TTE est un indicateur de durabilité, pas une promesse de performance."
  },
  {
    id: "module_race_readiness",
    metricId: "race_readiness",
    title: "Race Readiness : état global, pas performance",
    conceptPhysio: `Race Readiness est un indicateur composite (0–100) qui évalue la cohérence entre le profil physiologique de l'athlète et son objectif de course.

Ce n'est pas un prédicteur de performance, mais un indicateur de préparation.`,
    howT4CUses: `Two For Coaching Lab calcule Race Readiness en combinant :
• VLamax (dans la zone cible ?)
• TTE (suffisant pour la durée ?)
• FTP/kg (puissance relative adaptée ?)
• Fraîcheur (fatigue récente maîtrisée ?)

La confiance globale dépend de la confiance des entrées.`,
    whatItMeans: `Un score élevé (> 80) indique une bonne cohérence actuelle. Un score bas (< 60) signale des axes de travail prioritaires.`,
    whatItDoesNotMean: `Race Readiness n'est PAS :
• Une prédiction de chrono
• Une garantie de performance
• Un remplacement du jugement coach`,
    commonErrors: [
      "Interpréter le score comme une note scolaire",
      "Comparer des athlètes entre eux via ce score",
      "Ignorer la plage d'incertitude du score",
      "Croire qu'un score de 90 garantit le succès"
    ],
    coachUsage: `Le coach utilise Race Readiness pour :
• Identifier les axes prioritaires (voir détail par composante)
• Ajuster l'affûtage pré-compétition
• Communiquer un état global à l'athlète`,
    scientificLimits: `Le score est une agrégation pondérée de métriques elles-mêmes estimées. La marge d'incertitude peut atteindre ±25 points.`,
    charteReference: "Selon la charte Two For Coaching Lab, Race Readiness est un indicateur de cohérence, pas une garantie de résultat."
  },
  {
    id: "module_compass",
    metricId: "compass",
    title: "Metabolic Performance Compass",
    conceptPhysio: `Le Compass est une représentation multi-axes du profil physiologique : Endurance, Puissance, Récupération, Robustesse.

Il permet de visualiser les forces et faiblesses relatives de l'athlète.`,
    howT4CUses: `Chaque axe du Compass est calculé à partir de métriques spécifiques :
• Endurance : TTE + lipolyse
• Puissance : FTP/kg + Pmax
• Récupération : CRR + fraîcheur
• Robustesse : cohérence globale des données`,
    whatItMeans: `Un axe élevé indique une force relative. Un axe bas signale un axe de travail potentiel.`,
    whatItDoesNotMean: `Le Compass n'est PAS :
• Une comparaison entre athlètes
• Une valeur absolue
• Un diagnostic définitif`,
    commonErrors: [
      "Vouloir maximiser tous les axes (impossible physiologiquement)",
      "Comparer des athlètes via le Compass",
      "Ignorer le contexte objectif"
    ],
    coachUsage: `Le coach utilise le Compass pour visualiser le profil et orienter les priorités selon l'objectif.`,
    scientificLimits: `Le Compass agrège des données de confiances variables. Certains axes sont plus fiables que d'autres.`,
    charteReference: "Selon la charte Two For Coaching Lab, le Compass est un outil de visualisation, pas une évaluation normative."
  },
  {
    id: "module_nutrition",
    metricId: "nutrition",
    title: "Nutrition prédictive",
    conceptPhysio: `La nutrition prédictive estime les besoins en glucides/heure en fonction du profil métabolique et de l'intensité cible.

Une VLamax haute = consommation glycogène rapide = besoins élevés.
Une VLamax basse = économie glycogène = besoins modérés.`,
    howT4CUses: `Two For Coaching Lab calcule une plage de besoins (ex : 60–80 g/h) basée sur :
• VLamax estimée
• Objectif et durée prévue
• TTE et intensité cible`,
    whatItMeans: `La plage indiquée guide la stratégie nutritionnelle, pas la prescription exacte.`,
    whatItDoesNotMean: `La nutrition prédictive n'est PAS :
• Une prescription diététique
• Adaptée aux intolérances individuelles
• Valide sans test terrain`,
    commonErrors: [
      "Appliquer les chiffres sans tester en entraînement",
      "Ignorer la tolérance gastrique individuelle",
      "Négliger l'hydratation"
    ],
    coachUsage: `Le coach utilise ces estimations comme point de départ pour construire une stratégie nutritionnelle à valider en entraînement.`,
    scientificLimits: `Les besoins réels dépendent de nombreux facteurs (température, stress, habitude) non modélisés.`,
    charteReference: "Selon la charte Two For Coaching Lab, les estimations nutritionnelles sont des guides, pas des prescriptions."
  },
  {
    id: "module_cap_risk",
    metricId: "cap_risk",
    title: "Risque blessure CAP",
    conceptPhysio: `Le risque blessure en course à pied intègre plusieurs facteurs : charge mécanique, fatigue neuromusculaire, économie de course, historique.`,
    howT4CUses: `Two For Coaching Lab estime un niveau de risque (faible/modéré/élevé) basé sur :
• VLamax et TTE
• Charge récente (CRR)
• Dérive cardiaque si disponible`,
    whatItMeans: `Un risque élevé suggère de réduire la charge CAP ou de renforcer la prévention.`,
    whatItDoesNotMean: `Le risque blessure n'est PAS :
• Un diagnostic médical
• Une prédiction de blessure
• Une contre-indication médicale`,
    commonErrors: [
      "Ignorer un risque élevé",
      "Paniquer sur un risque modéré",
      "Confondre risque estimé et réalité"
    ],
    coachUsage: `Le coach utilise cet indicateur pour moduler la charge et renforcer la prévention si nécessaire.`,
    scientificLimits: `Le modèle ne capture pas tous les facteurs (biomécanique, terrain, chaussures).`,
    charteReference: "Selon la charte Two For Coaching Lab, le risque blessure est un indicateur de vigilance, pas un diagnostic."
  },
  {
    id: "module_velo_vs_cap",
    metricId: "velo_vs_cap",
    title: "Différences vélo vs course à pied",
    conceptPhysio: `Le vélo et la course à pied sollicitent des filières énergétiques similaires mais avec des contraintes mécaniques différentes.

• Vélo : faible impact, récupération rapide, volume possible élevé
• CAP : impact élevé, stress neuromusculaire, risque blessure accru`,
    howT4CUses: `Two For Coaching Lab différencie les métriques vélo (FTP, Pmax) et CAP (VMA, CSS, allure seuil) pour éviter les confusions.`,
    whatItMeans: `Les performances dans un sport ne se transfèrent pas directement à l'autre.`,
    whatItDoesNotMean: `Un bon cycliste n'est pas automatiquement un bon coureur et vice-versa.`,
    commonErrors: [
      "Transférer des zones FC vélo à la CAP sans adaptation",
      "Comparer FTP/kg et VMA comme équivalents",
      "Négliger les spécificités de chaque discipline"
    ],
    coachUsage: `Le coach utilise des références spécifiques à chaque sport et adapte les zones.`,
    scientificLimits: `Les modèles de transfert vélo-CAP sont approximatifs.`,
    charteReference: "Selon la charte Two For Coaching Lab, chaque discipline a ses propres références."
  },
  {
    id: "module_modelisation",
    metricId: "modelisation",
    title: "Modélisation vs test labo",
    conceptPhysio: `Un test laboratoire mesure directement des paramètres physiologiques (lactate, VO2, ventilation). Une modélisation estime ces paramètres à partir d'autres données.`,
    howT4CUses: `Two For Coaching Lab combine les deux approches :
• Priorité aux mesures directes quand disponibles
• Estimation quand les mesures manquent
• Affichage explicite de la source et de la confiance`,
    whatItMeans: `Les estimations sont utiles pour le suivi longitudinal, mais ne remplacent pas un test labo pour les décisions critiques.`,
    whatItDoesNotMean: `Une estimation n'est PAS équivalente à une mesure.`,
    commonErrors: [
      "Traiter une estimation comme une mesure",
      "Ignorer la marge d'incertitude",
      "Comparer des données de sources différentes"
    ],
    coachUsage: `Le coach utilise les estimations pour le suivi, mais recommande des tests labo pour les bilans clés.`,
    scientificLimits: `Toute modélisation repose sur des hypothèses qui peuvent ne pas s'appliquer à l'individu.`,
    charteReference: "Selon la charte Two For Coaching Lab, les estimations sont des outils de pilotage, pas des vérités physiologiques."
  }
];

// =============================================
// HELPERS POUR CHATBOT
// =============================================

export function getCharteReferenceForMetric(metricId: string): string {
  const module = CHARTE_MODULES.find(m => m.metricId === metricId);
  return module?.charteReference || "Selon la charte Two For Coaching Lab, toute donnée doit être interprétée avec son contexte et sa confiance.";
}

export function getCharteModuleContent(metricId: string): CharteModule | undefined {
  return CHARTE_MODULES.find(m => m.metricId === metricId);
}

export function getCharteSection(sectionId: string): CharteSection | undefined {
  return CHARTE_SECTIONS.find(s => s.id === sectionId);
}

export function formatCharteForChatbot(metricId: string): string {
  const module = getCharteModuleContent(metricId);
  if (!module) {
    return `Selon la charte Two For Coaching Lab : ${CHARTE_CRITICAL_MESSAGE}`;
  }
  
  return `${module.charteReference}

Ce que cela signifie : ${module.whatItMeans}

Ce que cela ne signifie PAS : ${module.whatItDoesNotMean}

Erreurs fréquentes à éviter :
${module.commonErrors.map(e => `• ${e}`).join('\n')}`;
}

// =============================================
// EXPORT PDF - PAGE "COMMENT LIRE CE RAPPORT"
// =============================================

export function buildChartePageHTML(): string {
  return `
    <div class="page charte-page" style="page-break-before: always; padding: 40px;">
      <h1 style="font-size: 24px; color: #1e40af; margin-bottom: 24px; border-bottom: 2px solid #1e40af; padding-bottom: 12px;">
        📖 Comment lire ce rapport
      </h1>
      
      <div style="background: linear-gradient(135deg, #fef3c7, #fef9c3); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
        <p style="font-weight: 600; color: #92400e; font-size: 15px; margin: 0;">
          ⚠️ ${CHARTE_CRITICAL_MESSAGE}
        </p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 12px 0;">🎯 Ce qu'est Two For Coaching Lab</h3>
        <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.6;">
          Un outil d'analyse et de modélisation physiologique pour aider le coach à prendre des décisions éclairées.
          <strong>Ce n'est pas</strong> un test laboratoire, un planificateur automatique, ni une vérité absolue.
        </p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; border: 1px solid #bbf7d0;">
          <h4 style="font-size: 12px; color: #166534; margin: 0 0 8px 0;">✅ Ce que le rapport permet</h4>
          <ul style="font-size: 11px; color: #15803d; margin: 0; padding-left: 16px; line-height: 1.5;">
            <li>Identifier les leviers prioritaires</li>
            <li>Hiérarchiser les axes de travail</li>
            <li>Anticiper certains risques</li>
            <li>Suivre l'évolution longitudinale</li>
          </ul>
        </div>
        <div style="background: #fef2f2; border-radius: 8px; padding: 12px; border: 1px solid #fecaca;">
          <h4 style="font-size: 12px; color: #991b1b; margin: 0 0 8px 0;">❌ Ce que le rapport ne fait pas</h4>
          <ul style="font-size: 11px; color: #dc2626; margin: 0; padding-left: 16px; line-height: 1.5;">
            <li>Prescrire un plan d'entraînement</li>
            <li>Garantir une performance</li>
            <li>Remplacer l'expertise coach</li>
            <li>Poser un diagnostic médical</li>
          </ul>
        </div>
      </div>
      
      <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 12px 0;">📐 Comprendre les sources de données</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e2e8f0;">
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Type</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Signification</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Confiance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">🔬 Mesurée</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Test direct (labo, lactate)</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Élevée (> 0.85)</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0;">🧠 Estimée</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Test terrain standardisé</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Modérée (0.65 – 0.85)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">🔁 Modélisée</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Calcul croisé</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Faible (< 0.65)</td>
          </tr>
        </tbody>
      </table>
      
      <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 12px 0;">📊 Comprendre les plages d'incertitude</h3>
      <p style="font-size: 11px; color: #475569; margin: 0 0 12px 0; line-height: 1.6;">
        Chaque métrique affiche une <strong>valeur centrale</strong> et une <strong>plage de plausibilité</strong>.
        Plus la confiance est basse, plus la plage est large. Exemple :
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 11px;">
        VLamax = 0.37 mmol/L/s (≈ 0.27 – 0.47) — confiance modérée
      </div>
      
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
          <strong>Les décisions finales d'entraînement appartiennent toujours au coach et à l'athlète.</strong>
        </p>
      </div>
    </div>
  `;
}
