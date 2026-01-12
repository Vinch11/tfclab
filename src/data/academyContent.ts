// Staff-grade structured content for Academy
// This is the reliable, structured version of the DOCX content

export type BlockType = "text" | "bullets" | "table" | "callout";

export interface ContentBlock {
  type: BlockType;
  title?: string;
  content: string | string[] | TableData;
  staffOnly?: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface AcademySection {
  id: string;
  title: string;
  level: "basic" | "staff";
  blocks: ContentBlock[];
  tags: string[];
}

export const academySections: AcademySection[] = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    level: "basic",
    tags: ["introduction", "méthodologie", "planification"],
    blocks: [
      {
        type: "text",
        content: "En tant que coach, notre rôle est d'agir comme un architecte de la physiologie : nous ne cherchons pas seulement à \"fatiguer\" le corps, mais à cibler des filières énergétiques et des adaptations neuromusculaires précises."
      },
      {
        type: "bullets",
        title: "Ce que l'Academy explique",
        content: [
          "Les zones d'entraînement (Z1 → Z7) et leurs objectifs physiologiques",
          "Le placement des seuils (SV1/SL1, SV2/SL2)",
          "Le découplage Z4a vs Z4b (point coach avancé)",
          "La force à basse cadence et ses applications",
          "La VLaMax : comment la moduler selon les objectifs"
        ]
      }
    ]
  },
  {
    id: "zones-master",
    title: "Tableau Maître des Zones",
    level: "basic",
    tags: ["zones", "Z1", "Z2", "Z3", "Z4a", "Z4b", "Z5", "Z6", "Z7", "FCmax", "VMA", "FTP", "tableau"],
    blocks: [
      {
        type: "text",
        content: "Ce tableau est la référence centrale du coach. Il aligne les zones avec les concepts physiologiques pour un pilotage précis de l'entraînement."
      },
      {
        type: "table",
        title: "Zones, Intensités & Objectifs",
        content: {
          headers: ["Zone", "% FCmax", "% VMA (Course)", "% FTP (Vélo)", "Objectif Physiologique", "Seuils"],
          rows: [
            ["Z1", "< 70%", "< 60%", "< 55%", "Affûtage, Récupération, Échauffement", "< SL1"],
            ["Z2", "70 - 78%", "60 - 70%", "56 - 75%", "Endurance Fondamentale, Lipolyse, Volume mitochondrial", "Approche SV1"],
            ["Z3", "78 - 83%", "70 - 78%", "76 - 90%", "Force (si basse cadence), Base aérobie solide", "Aisance respi. perdue"],
            ["Z4a", "83 - 87%", "78 - 83%", "88 - 93%", "Allure Marathon, Sweet Spot, Durabilité", "Entre les seuils"],
            ["Z4b", "87 - 91%", "83 - 88%", "94 - 99%", "Allure Semi, Tolérance à l'inconfort, Mental", "Montée vers SV2"],
            ["Z5", "91 - 94%", "88 - 92%", "99 - 106%", "Seuil/MLSS, Repousser le seuil anaérobie", "SV2 (≈4 mmol/L)"],
            ["Z6", "94 - 100%", "95 - 100%", "106 - 120%", "VO2max, Cylindrée cardiaque (Zone Rouge)", "> SV2"],
            ["Z7", "N/A", "> 100%", "> 120%", "Neuromusculaire, Explosivité, Force Alactique", "Anaérobie"]
          ]
        }
      },
      {
        type: "callout",
        title: "Note du coach",
        content: "C'est la Z2 qui est la plus négligée. Beaucoup d'athlètes s'entraînent dans la \"zone grise\" (trop vite pour l'endurance, trop lent pour la VO2max), ce qui crée de la fatigue sans grandes adaptations.",
        staffOnly: true
      }
    ]
  },
  {
    id: "thresholds",
    title: "Les Seuils (SV1/SV2)",
    level: "basic",
    tags: ["seuils", "SV1", "SV2", "SL1", "SL2", "lactate", "MLSS", "ventilatoire"],
    blocks: [
      {
        type: "text",
        title: "Premier Seuil (SV1 / SL1)",
        content: "Le moment où le lactate commence à monter légèrement au-dessus du niveau de repos (environ 2 mmol/L). On passe de l'aisance respiratoire totale à une respiration un peu plus marquée."
      },
      {
        type: "bullets",
        title: "Position du SV1",
        content: [
          "Se situe à la frontière entre Z2 (Endurance Fondamentale) et Z3 (Endurance Active)",
          "Si l'athlète peut parler par phrases complètes → Z2 (sous SV1)",
          "S'il doit couper ses phrases pour respirer → Z3 (au-dessus de SV1)"
        ]
      },
      {
        type: "text",
        title: "Second Seuil (SV2 / SL2)",
        content: "Le seuil anaérobie ou MLSS (Maximal Lactate Steady State). Le point de rupture où le corps ne peut plus recycler l'acide lactique aussi vite qu'il le produit (environ 4 mmol/L)."
      },
      {
        type: "bullets",
        title: "Position du SV2",
        content: [
          "Correspond à la zone \"Seuil\" (Z5)",
          "Les zones Z4a et Z4b sont \"sous-critiques\" : difficiles mais stables",
          "Dès qu'on touche la zone Seuil, le chrono tourne : épuisement en 20 à 60 min selon le niveau"
        ]
      },
      {
        type: "callout",
        title: "Point de vigilance",
        content: "Ne confonds pas Z4a/Z4b avec le Seuil. Z4a et Z4b sont des zones \"sous-critiques\" où l'athlète ne \"explose\" pas tout de suite. C'est la différence fondamentale avec Z5.",
        staffOnly: true
      }
    ]
  },
  {
    id: "z4-decoupling",
    title: "Découplage Z4a vs Z4b",
    level: "staff",
    tags: ["Z4a", "Z4b", "découplage", "marathon", "semi", "sensation", "coaching"],
    blocks: [
      {
        type: "text",
        content: "C'est ta plus-value de coach. La plupart des plans \"génériques\" mettent tout cela dans une grande zone \"Tempo\". Toi, tu différencies Z4a et Z4b."
      },
      {
        type: "callout",
        title: "Z4a — Allure Marathon",
        content: "L'athlète doit sentir qu'il pourrait tenir \"indéfiniment\" tant qu'il a du sucre. Sensation de contrôle, d'économie. C'est la zone de la durabilité."
      },
      {
        type: "callout",
        title: "Z4b — Allure Semi",
        content: "L'athlète sent que le sablier coule. Il a environ 1h-1h15 d'autonomie max à cette allure. C'est la zone de l'inconfort gérable."
      },
      {
        type: "bullets",
        title: "Comment le sentir / interpréter",
        content: [
          "Z4a : Respiration contrôlée, capable de dire quelques mots",
          "Z4b : Respiration plus lourde, focus mental nécessaire",
          "Transition Z4a → Z4b : L'effort \"bascule\" mentalement",
          "Après 45-60 min en Z4b, l'athlète sent clairement la limite"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "low-cadence-force",
    title: "Force Basse Cadence",
    level: "basic",
    tags: ["force", "cadence", "vélo", "K3", "fibres", "neuromusculaire", "recrutement"],
    blocks: [
      {
        type: "text",
        content: "La Force se travaille principalement en Z3 (Vélo) mais avec une modalité spécifique : cadence basse (40-50 rpm). La puissance reste modérée, mais la tension musculaire est maximale."
      },
      {
        type: "bullets",
        title: "Objectifs de la force basse cadence",
        content: [
          "Recruter les fibres rapides (Type II) pour les forcer à travailler en aérobie",
          "Améliorer l'économie du geste et retarder la fatigue musculaire",
          "Améliorer le recrutement des fibres musculaires sans hypertrophie"
        ]
      },
      {
        type: "callout",
        title: "Piège classique — Point de vigilance",
        content: "La Force n'apparaît pas comme une zone d'intensité \"haute\" (elle se fait en Z3 vélo), mais elle crée une tension musculaire équivalente à de la Z6/Z7. Le cœur est bas, mais les muscles trinquent. Ne te fie pas à la FC !",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Application pratique",
        content: [
          "Vélo : Force sous-max (K3), grand braquet, 40-50 rpm, intensité modérée",
          "Course à pied : Côtes courtes et très pentues sprintées, fentes, bondissements",
          "Musculation : Charges lourdes, peu de répétitions (3-5 reps), récupération longue"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "vlamax",
    title: "VLaMax : Baisser vs Monter",
    level: "basic",
    tags: ["VLaMax", "glycolytique", "lactate", "sprint", "endurance", "Ironman", "marathon"],
    blocks: [
      {
        type: "text",
        content: "La VLaMax est le taux maximal de production de lactate. C'est le \"Turbo Glycolytique\" de l'athlète."
      },
      {
        type: "bullets",
        title: "Qui veut quoi ?",
        content: [
          "Sprinter (piste, 100m) → VLaMax haute (grosse puissance explosive)",
          "Endurant (Ironman, Marathon) → VLaMax basse (économise le glycogène)"
        ]
      },
      {
        type: "callout",
        title: "Pourquoi baisser la VLaMax ?",
        content: "Une VLaMax haute consomme les réserves de glycogène trop vite. Baisser la VLaMax remonte le seuil anaérobie et améliore l'endurance de l'athlète."
      },
      {
        type: "table",
        title: "Comment moduler la VLaMax",
        content: {
          headers: ["Objectif", "Méthode", "Zones utilisées"],
          rows: [
            ["Baisser (Endurance)", "Beaucoup de Z2 + Z3/Z4a, éviter les sprints", "Z2, Z3, Z4a (Sweet Spot)"],
            ["Baisser (Endurance)", "Force à basse cadence", "Z3 avec 40-50 rpm"],
            ["Baisser (Endurance)", "Périodisation nutritionnelle (low glycogen)", "Z2 longue"],
            ["Monter (Sprint)", "Z7 avec longs repos (10-15 min)", "Z7 Neuromusculaire"],
            ["Monter (Sprint)", "Sprints maximaux 15-30s", "Z7"]
          ]
        }
      },
      {
        type: "callout",
        title: "Point staff-grade",
        content: "Pour baisser la VLaMax, prescris beaucoup de Z2 (pour consommer les graisses) et beaucoup de Z3/Z4a (pour forcer le corps à ne pas utiliser trop de sucre). Évite absolument les sprints répétés.",
        staffOnly: true
      }
    ]
  },
  {
    id: "fc-vs-power",
    title: "FC vs Puissance",
    level: "staff",
    tags: ["FC", "puissance", "watts", "dérive", "cardiaque", "intervalles"],
    blocks: [
      {
        type: "text",
        content: "Note que %FTP est souvent plus haut que %FCmax en Z3/Z4. C'est normal : le cœur a une inertie (dérive cardiaque), alors que les watts sont instantanés."
      },
      {
        type: "callout",
        title: "Règle pratique",
        content: "Sur des intervalles courts (< 3 min), ne regarde que la puissance ou la VMA, oublie la FC. La fréquence cardiaque met trop de temps à réagir pour être pertinente."
      },
      {
        type: "bullets",
        title: "Pourquoi la FC dérive",
        content: [
          "Thermorégulation : le corps chauffe, le cœur accélère",
          "Déshydratation : le volume plasmatique baisse, le cœur compense",
          "Fatigue musculaire : le recrutement augmente, le cœur suit",
          "Stress mental : l'adrénaline fait monter la FC"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "faq-coach",
    title: "FAQ Coach",
    level: "basic",
    tags: ["FAQ", "questions", "coach", "dérive", "puissance", "Z4a", "Z4b"],
    blocks: [
      {
        type: "callout",
        title: "Pourquoi la FC dérive pendant l'effort ?",
        content: "La dérive cardiaque est normale : thermorégulation, déshydratation, fatigue musculaire. C'est pourquoi la puissance est plus fiable que la FC sur les efforts longs."
      },
      {
        type: "callout",
        title: "Pourquoi la puissance est instantanée ?",
        content: "Les watts mesurent le travail mécanique immédiat (force × vitesse). La FC, elle, réagit avec un délai de 30s à 2min. Sur les intervalles courts, fiez-vous à la puissance."
      },
      {
        type: "callout",
        title: "Pourquoi Z4a ≠ Z4b ?",
        content: "Z4a (Marathon) = sensation de contrôle indéfini. Z4b (Semi) = sensation de sablier qui coule. C'est une différence de sensation ET de durée tenable (3h+ vs 1h-1h15)."
      },
      {
        type: "callout",
        title: "Pourquoi la Z2 est-elle si importante ?",
        content: "C'est le \"socle\" de la pyramide. Elle développe les mitochondries, améliore l'utilisation des lipides, et prépare le corps à absorber les charges plus intenses. Sans Z2, pas de fondation."
      },
      {
        type: "callout",
        title: "Comment savoir si on est en Z2 ou Z3 ?",
        content: "Test conversationnel : Z2 = phrases complètes possibles. Z3 = phrases coupées pour respirer. C'est le passage du SV1."
      }
    ]
  },
  {
    id: "fatigue-fonctionnelle",
    title: "Fatigue Fonctionnelle – Two For Coaching Lab",
    level: "basic",
    tags: ["fatigue", "récupération", "TTE", "charge", "fraîcheur", "readiness"],
    blocks: [
      {
        type: "text",
        title: "Définition officielle",
        content: "La fatigue correspond à une diminution estimée de la capacité de l'athlète à exprimer son potentiel physiologique actuel, en raison de la charge récente, de la durabilité à l'effort (TTE), de la fraîcheur métabolique et de facteurs individuels. Ce score est un indicateur fonctionnel d'aide à la décision, et non une mesure biologique directe."
      },
      {
        type: "table",
        title: "Les 4 piliers de la fatigue fonctionnelle",
        content: {
          headers: ["Pilier", "Poids", "Description"],
          rows: [
            ["Charge récente", "35%", "TSS 7 jours comparé à la charge habituelle"],
            ["Durabilité (TTE)", "25%", "TTE effectif vs cible selon objectif"],
            ["Fraîcheur métabolique", "25%", "Score Race Readiness"],
            ["Facteurs modérateurs", "15%", "Âge + profil VLamax"]
          ]
        }
      },
      {
        type: "table",
        title: "Échelle officielle d'interprétation",
        content: {
          headers: ["Score", "Niveau", "Interprétation"],
          rows: [
            ["0–15%", "Très faible", "Très frais, potentiel pleinement exprimable"],
            ["15–30%", "Légère", "Fatigue légère, charge bien absorbée"],
            ["30–45%", "Modérée", "Fatigue modérée, vigilance sur l'intensité"],
            ["45–60%", "Élevée", "Fatigue élevée, risque de stagnation"],
            [">60%", "Critique", "Fatigue critique, priorité récupération"]
          ]
        }
      },
      {
        type: "callout",
        title: "Garde-fous scientifiques",
        content: "Les scores sont des estimations. Ils doivent être interprétés avec le contexte. Le jugement du coach prime sur l'algorithme. Aucun score ne doit être utilisé isolément."
      },
      {
        type: "callout",
        title: "Note staff – Impact sur le Compass",
        content: "La fatigue module l'axe Capacité Aérobie (potentiel exprimable) et influence l'axe Robustesse. Elle n'est jamais prescriptive.",
        staffOnly: true
      }
    ]
  },
  {
    id: "fatigue-velo-vs-cap",
    title: "Fatigue : Vélo vs Course à Pied",
    level: "staff",
    tags: ["fatigue", "vélo", "CAP", "blessure", "risque", "mécanique"],
    blocks: [
      {
        type: "text",
        content: "La fatigue n'a pas le même impact sur le vélo et la course à pied. Le vélo est principalement une contrainte métabolique, tandis que la CAP ajoute une contrainte mécanique majeure (impacts, tendons, articulations)."
      },
      {
        type: "table",
        title: "Guideline Fatigue Vélo (staff)",
        content: {
          headers: ["Fatigue", "Recommandation vélo"],
          rows: [
            ["<30%", "Séances qualitatives OK"],
            ["30–45%", "Intensité possible mais contrôlée (éviter densité)"],
            ["45–60%", "Priorité tempo/Z2, limiter VO2 et sprints"],
            [">60%", "Récupération active uniquement"]
          ]
        }
      },
      {
        type: "callout",
        title: "Risque Blessure CAP",
        content: "Pour la course à pied, un score spécifique 'Risque Blessure CAP' est calculé. Il intègre : Fatigue (30%), VLamax (20%), TTE (20%), Charge CAP (20%), Âge (10%)."
      },
      {
        type: "table",
        title: "Échelle Risque Blessure CAP",
        content: {
          headers: ["Score", "Niveau", "Action recommandée"],
          rows: [
            ["0–25", "Faible", "CAP normale, surveiller densité"],
            ["26–50", "Modéré", "Surveiller qualité CAP, privilégier Z2"],
            ["51–75", "Élevé", "Limiter intensité CAP, privilégier vélo"],
            ["76–100", "Critique", "Réduction charge CAP recommandée"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Facteurs de risque surveillés",
        content: [
          "Fatigue élevée + VLamax élevé = récupération plus lente des fibres rapides",
          "TTE faible = moins de capacité à soutenir les allures sans dérive",
          "Charge CAP élevée = contrainte mécanique répétée",
          "Âge >40 ans = temps de récupération allongé"
        ],
        staffOnly: true
      },
      {
        type: "callout",
        title: "Non prescriptif",
        content: "L'app n'applique aucun changement automatique. Elle propose des 'Options coach' : 1) Remplacer qualité CAP par vélo Z2, 2) Réduire volume CAP 10-20%, 3) Ajouter journée recovery.",
        staffOnly: true
      }
    ]
  },
  {
    id: "periodization",
    title: "Phases de Planification",
    level: "staff",
    tags: ["périodisation", "spécifique", "affûtage", "tapering", "peaking"],
    blocks: [
      {
        type: "text",
        title: "Phase Spécifique",
        content: "On passe de \"s'entraîner pour être en forme\" à \"s'entraîner pour la course\". C'est la répétition générale."
      },
      {
        type: "bullets",
        title: "Contenu de la phase spécifique",
        content: [
          "Simulation d'allure : blocs à allure course dans les sorties longues",
          "Spécificité du terrain : dénivelé, chaleur, conditions réelles",
          "Nutrition & Matériel : on teste tout, aucun changement après cette phase",
          "Enchaînements (Triathlon) : séances \"brique\" (Vélo + CAP immédiate)"
        ]
      },
      {
        type: "text",
        title: "Affûtage (Tapering)",
        content: "L'art d'arriver \"frais et fit\". Dissiper la fatigue accumulée tout en maintenant les adaptations physiologiques."
      },
      {
        type: "bullets",
        title: "Règle d'or de l'affûtage",
        content: [
          "Volume : réduction de 40% à 60% sur les 7-14 jours avant l'épreuve",
          "Fréquence : maintenir le même nombre de séances (ou très légèrement moins)",
          "Intensité : MAINTENIR ! C'est crucial. Rappels d'allure course courts",
          "Repos complet = le corps \"s'endort\" (baisse du volume plasmatique)"
        ]
      }
    ]
  },
  {
    id: "vo2max",
    title: "VO2max (Le Moteur)",
    level: "basic",
    tags: ["VO2max", "moteur", "HIIT", "intervalles", "capacité", "oxygène"],
    blocks: [
      {
        type: "text",
        content: "L'objectif est d'augmenter la capacité maximale du corps à absorber et utiliser l'oxygène. C'est la cylindrée du moteur."
      },
      {
        type: "bullets",
        title: "Comment on la travaille",
        content: [
          "Intensités très élevées, proches ou supérieures à VMA/PMA",
          "Temps cumulé dans la \"Zone Rouge\" (> 90-95% FCmax)",
          "Intervalles courts (HIIT) : 30/30 à 105% VMA",
          "Intervalles longs : 3-5 min à 95% VO2max",
          "Blocs polarisés : jours faciles + jours très durs"
        ]
      },
      {
        type: "callout",
        title: "Exemple classique",
        content: "Le 30/30 (30 sec à 105% VMA / 30 sec récup) permet d'accumuler beaucoup de temps à haute intensité sans accumuler trop d'acide lactique trop vite."
      }
    ]
  }
];
