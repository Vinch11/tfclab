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
  },
  // =============================================
  // MODULES WAHOO / ZWIFT + INDICES PHYSIOLOGIQUES
  // =============================================
  {
    id: "lire-indices-tfc",
    title: "Lire les indices Two For Coaching Lab",
    level: "staff",
    tags: ["indices", "VLamax", "TTE", "confiance", "estimation", "mesure"],
    blocks: [
      {
        type: "text",
        content: "Two For Coaching Lab produit des indices physiologiques (VLamax, TTE, Fatigue, Risque CAP) qui alimentent les recommandations. Comprendre ces indices est essentiel pour une utilisation staff-grade."
      },
      {
        type: "bullets",
        title: "Différence estimation vs mesure",
        content: [
          "MESURE (test lab, terrain calibré) : confiance 0.85–0.95, fiabilité très haute",
          "ESTIMATION (modèle, proxy) : confiance 0.40–0.70, à utiliser avec recul",
          "HYBRIDE (mesure partielle + modèle) : confiance 0.60–0.80, compromis fiable"
        ]
      },
      {
        type: "table",
        title: "Lecture des niveaux de confiance",
        content: {
          headers: ["Confiance", "Interprétation", "Usage recommandé"],
          rows: [
            ["≥ 85%", "Très fiable – Décision directe possible", "Base solide pour choix d'entraînement"],
            ["70–84%", "Fiable – Valider avec contexte terrain", "Bon indicateur, croiser avec sensations"],
            ["50–69%", "Modéré – Prudence requise", "Orientation générale uniquement"],
            ["< 50%", "Faible – À confirmer par test", "Ne pas baser de décision majeure"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Ce que l'app fait / ne fait pas",
        content: "L'app AFFICHE les sources et confiances de chaque indice. Elle NE CACHE PAS les limitations. Quand une donnée manque, elle le dit explicitement et baisse la confiance globale.",
        staffOnly: true
      }
    ]
  },
  {
    id: "fatigue-vs-performance",
    title: "Fatigue vs Performance — Pourquoi ne pas pousser",
    level: "staff",
    tags: ["fatigue", "performance", "récupération", "surcharge", "adaptation"],
    blocks: [
      {
        type: "text",
        content: "La fatigue réduit le potentiel exprimable. Un athlète fatigué ne peut pas exprimer son FTP réel, même si sa capacité aérobie n'a pas changé. C'est la différence entre capacité et disponibilité."
      },
      {
        type: "bullets",
        title: "Pourquoi limiter l'intensité quand la fatigue est élevée",
        content: [
          "Fatigue > 55% : le système nerveux central est compromis, la qualité des contractions musculaires diminue",
          "Fatigue > 70% : risque de surentraînement, adaptations négatives possibles",
          "Pousser un athlète fatigué ≠ stimuler l'adaptation → c'est accumuler du stress sans bénéfice",
          "La récupération EST une partie de l'entraînement, pas une pause"
        ]
      },
      {
        type: "table",
        title: "Échelle Fatigue → Décision d'entraînement",
        content: {
          headers: ["Fatigue %", "Statut", "Action recommandée"],
          rows: [
            ["< 30%", "Fraîcheur optimale", "Séances qualitatives OK, pic de forme possible"],
            ["30–45%", "Fatigue légère", "Intensité possible mais contrôlée, éviter densité"],
            ["45–60%", "Fatigue modérée", "Priorité tempo/Z2, limiter VO2 et sprints"],
            ["> 60%", "Fatigue élevée", "Récupération active uniquement, pas de qualité"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Ce que l'app fait / ne fait pas",
        content: "L'app AFFICHE la fatigue et son impact sur le potentiel exprimable. Elle SUGGÈRE des séances adaptées. Elle NE BLOQUE PAS le coach — la décision finale reste humaine.",
        staffOnly: true
      }
    ]
  },
  {
    id: "vlamax-tte-seances",
    title: "VLamax, TTE et choix des séances",
    level: "staff",
    tags: ["VLamax", "TTE", "séances", "Wahoo", "Zwift", "recommandation"],
    blocks: [
      {
        type: "text",
        content: "Les indices VLamax et TTE déterminent quelles séances sont productives ou contre-productives. Une séance excellente pour un profil peut être néfaste pour un autre."
      },
      {
        type: "bullets",
        title: "Logique VLamax → Séances vélo",
        content: [
          "VLamax ÉLEVÉ (> 0.55) pour objectif long : ÉVITER sprints/MAP, PRIVILÉGIER force basse cadence + Z2",
          "VLamax BAS (< 0.35) : peut manquer de 'punch', PRIVILÉGIER séances neuromusculaires ponctuelles",
          "VLamax ADAPTÉ (0.35–0.50) : équilibre, toutes séances possibles selon objectif"
        ]
      },
      {
        type: "bullets",
        title: "Logique TTE → Durabilité",
        content: [
          "TTE < cible -5min : ÉVITER VO2 courts répétés, PRIVILÉGIER tempo long, sweet spot progression",
          "TTE proche cible : maintenir avec blocs au seuil, éviter surcharge",
          "TTE > cible : durabilité OK, focus sur autres axes"
        ]
      },
      {
        type: "table",
        title: "Mapping Séances Wahoo/Zwift",
        content: {
          headers: ["Profil", "Séances RECOMMANDÉES", "Séances DÉCONSEILLÉES"],
          rows: [
            ["VLamax élevé + objectif long", "Low Cadence Strength, SST, Tempo Blocks", "NM Sprint, MAP Intervals, Anaerobic"],
            ["TTE insuffisant", "Sustained Tempo, Sweet Spot Progression", "VO2 courts répétés, Over-Under intense"],
            ["Fatigue > 55%", "Endurance Z2, Recovery rides", "VO2, MAP, Over-Under"],
            ["Risque CAP élevé", "Vélo endurance substitution, CAP Z2 courte", "Intervalles VO2 CAP, Long runs agressifs"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Ce que l'app fait / ne fait pas",
        content: "L'app TAG chaque séance (Recommandé/Neutre/Déconseillé) avec la raison. Elle EXPLIQUE pourquoi via les indices liés. Elle NE REMPLACE PAS la séance automatiquement.",
        staffOnly: true
      }
    ]
  },
  {
    id: "cap-risque-substitution",
    title: "CAP : Risque blessure et substitution vélo",
    level: "staff",
    tags: ["CAP", "blessure", "risque", "substitution", "vélo", "robustesse"],
    blocks: [
      {
        type: "text",
        content: "La course à pied génère 2.5–3x le poids du corps à chaque foulée. Contrairement au vélo, la contrainte mécanique est incompressible. Le risque blessure CAP dépend de la fatigue + VLamax + TTE + charge + âge."
      },
      {
        type: "bullets",
        title: "Pourquoi substituer par le vélo",
        content: [
          "Le vélo développe le même système aérobie SANS la contrainte mécanique",
          "Pour les triathlètes : le temps vélo est souvent plus long que le temps CAP en course",
          "Un athlète blessé ne peut plus s'entraîner — la prudence protège la progression",
          "Substitution ≠ régression — c'est un choix tactique intelligent"
        ]
      },
      {
        type: "table",
        title: "Risque CAP → Options coach",
        content: {
          headers: ["Niveau risque", "Score", "Options proposées"],
          rows: [
            ["FAIBLE", "0–25", "Progression CAP standard, surveillance normale"],
            ["MODÉRÉ", "26–50", "Surveiller densité qualité CAP, privilégier Z2, éviter triade long+seuil+vitesse"],
            ["ÉLEVÉ", "51–75", "Limiter intensité CAP, substituer volume par vélo, insérer recovery"],
            ["CRITIQUE", "> 75", "Réduction charge CAP, priorité récupération, surveillance douleur/raideur"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Ce que l'app fait / ne fait pas",
        content: "L'app CALCULE le risque avec transparence (drivers affichés). Elle PROPOSE des options coach (3 max). Elle NE REMPLACE PAS les séances automatiquement et NE FAIT PAS de diagnostic médical.",
        staffOnly: true
      }
    ]
  },
  {
    id: "wahoo-zwift-intelligent",
    title: "Utiliser Wahoo / Zwift intelligemment",
    level: "staff",
    tags: ["Wahoo", "Zwift", "SYSTM", "séances", "indoor", "adaptation"],
    blocks: [
      {
        type: "text",
        content: "Wahoo SYSTM et Zwift proposent des séances prédéfinies. Leur nom ne suffit pas — il faut comprendre ce qu'elles stimulent physiologiquement pour les utiliser correctement."
      },
      {
        type: "bullets",
        title: "Lire une séance au-delà de son nom",
        content: [
          "Identifier la zone dominante (Z2, Sweet Spot, VO2, Sprint...)",
          "Vérifier la durée des intervalles et le ratio travail/repos",
          "Évaluer la charge totale (IF × durée)",
          "Croiser avec le profil : cette séance sert-elle l'objectif actuel ?"
        ]
      },
      {
        type: "bullets",
        title: "Adapter sans dénaturer le plan",
        content: [
          "Si la fatigue est élevée : remplacer VO2 par tempo, pas par repos complet",
          "Si le TTE est insuffisant : allonger les blocs au seuil, réduire la fréquence VO2",
          "Si VLamax trop élevé : ajouter force basse cadence, supprimer sprints",
          "Adaptation ≠ suppression — c'est un recalibrage intelligent"
        ]
      },
      {
        type: "table",
        title: "Catégories physiologiques des séances",
        content: {
          headers: ["Catégorie", "Objectif physiologique", "Exemples Wahoo/Zwift"],
          rows: [
            ["VO2MAX", "Augmenter cylindrée cardiaque", "The Shovel, VO2 Intervals, Gorby"],
            ["THRESHOLD / SWEET SPOT", "Repousser le seuil, durabilité", "Sustained Build, SST Medium, Tempo Builder"],
            ["LOW CADENCE FORCE", "Force musculaire, abaisser VLamax", "Low Cadence Strength, Time Crunched Climbs"],
            ["ENDURANCE Z2", "Base aérobie, lipolyse, récupération active", "Endurance Ride, Foundation, Recovery Spin"],
            ["NEUROMUSCULAR / SPRINT", "Explosivité, recrutement fibres rapides", "NM Sprint, Stinger, AC Intervals"],
            ["RECOVERY", "Régénération, flux sanguin", "Recovery Spin, Easy Spin, Cooldown"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Ce que l'app fait / ne fait pas",
        content: "L'app CATÉGORISE chaque séance et la TAG selon le profil. Elle AFFICHE un badge couleur (vert/gris/rouge). Elle EXPLIQUE la logique. Elle NE MODIFIE PAS le plan automatiquement.",
        staffOnly: true
      }
    ]
  }
];
