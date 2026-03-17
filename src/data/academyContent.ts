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
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATION DE COURSE TFCL™ — MODULE ACADEMY
  // 8 leçons : 4 BASIC + 4 PRO
  // ═══════════════════════════════════════════════════════════════════════════

  // BASIC LESSONS (4)
  {
    id: "simulation-basic-why",
    title: "Simulation BASIC : pourquoi une version simplifiée ?",
    level: "basic",
    tags: ["simulation", "basic", "scénario", "décision", "robuste"],
    blocks: [
      {
        type: "text",
        title: "Philosophie TFCL™",
        content: "TFCL privilégie toujours une décision robuste à une précision illusoire. La version BASIC n'est PAS une version dégradée. Elle est volontairement plus conservative et plus robuste."
      },
      {
        type: "bullets",
        title: "Quand utiliser la version BASIC ?",
        content: [
          "Données physiologiques incomplètes (VLamax, TTE ou FatMax manquants)",
          "Première course sur un format donné",
          "Athlète loisir ou autonome",
          "Besoin d'une décision rapide et sûre",
          "Coach voulant aller vite sans sur-analyse"
        ]
      },
      {
        type: "callout",
        title: "Ce que BASIC ne fait pas",
        content: "La version BASIC ne donne PAS de temps exact, pas de simulation segment par segment, pas de courbe de glycogène. Elle donne une DIRECTION et un NIVEAU DE RISQUE."
      }
    ]
  },
  {
    id: "simulation-basic-inputs",
    title: "Simulation BASIC : données utilisées",
    level: "basic",
    tags: ["simulation", "basic", "inputs", "données"],
    blocks: [
      {
        type: "table",
        title: "Données utilisées en mode BASIC",
        content: {
          headers: ["Donnée", "Obligatoire", "Utilisation"],
          rows: [
            ["Type de course (IM/Marathon/etc.)", "✅ Oui", "Définit la durée et l'intensité de référence"],
            ["Allure cible ou FTP/VMA", "Optionnel", "Ajuste les estimations d'intensité"],
            ["Disponibilité TFCL™", "Recommandé", "Module le risque global selon l'état du jour"],
            ["Race Readiness V2", "Recommandé", "Détermine la zone d'intensité conseillée"]
          ]
        }
      },
      {
        type: "callout",
        title: "Ce qui N'est PAS utilisé en BASIC",
        content: "VLamax chiffrée, FatMax chiffrée, TTE chiffré. Ces données peuvent être présentes mais ne sont pas explicitement intégrées dans le calcul BASIC."
      },
      {
        type: "bullets",
        title: "Pourquoi cette limitation ?",
        content: [
          "Réduire le risque d'erreur de calibration",
          "Éviter les faux-positifs sur des données incertaines",
          "Proposer une décision 'worst-case' acceptable"
        ]
      }
    ]
  },
  {
    id: "simulation-basic-outputs",
    title: "Simulation BASIC : ce qui est affiché",
    level: "basic",
    tags: ["simulation", "basic", "outputs", "zone", "risque"],
    blocks: [
      {
        type: "table",
        title: "Outputs de la version BASIC",
        content: {
          headers: ["Élément", "Valeurs possibles", "Signification"],
          rows: [
            ["Zone d'intensité", "Sous contrôle / Limite / À risque", "Indique si l'objectif est compatible avec l'état actuel"],
            ["Indice global de risque", "LOW / MODERATE / HIGH", "Résume le risque global de la course"],
            ["Message principal", "Texte descriptif", "Explication claire et actionnable"],
            ["Scénario recommandé", "Conservateur / Optimal / Agressif", "Sans détails chiffrés, juste une direction"]
          ]
        }
      },
      {
        type: "callout",
        title: "Pas de temps exact",
        content: "La version BASIC ne donne JAMAIS de temps estimé. C'est volontaire. L'objectif est de guider la DÉCISION, pas de prédire un chrono."
      },
      {
        type: "bullets",
        title: "Exemples de messages BASIC",
        content: [
          "'Ce scénario est compatible avec ton état actuel'",
          "'Risque de dérive si pacing agressif'",
          "'Disponibilité insuffisante pour ce scénario'"
        ]
      }
    ]
  },
  {
    id: "simulation-basic-guardrails",
    title: "Simulation BASIC : garde-fous automatiques",
    level: "basic",
    tags: ["simulation", "basic", "garde-fous", "alerte", "sécurité"],
    blocks: [
      {
        type: "text",
        content: "La simulation affiche automatiquement des garde-fous si certaines conditions sont détectées. Ces alertes sont prioritaires sur les scénarios."
      },
      {
        type: "table",
        title: "Garde-fous BASIC",
        content: {
          headers: ["Condition", "Type", "Message affiché"],
          rows: [
            ["Disponibilité < 50%", "⚠️ Warning", "Disponibilité faible aujourd'hui : simulation informative mais prudence."],
            ["Risque blessure CAP élevé", "🚨 Critical", "Risque CAP élevé : attention aux scénarios agressifs."],
            ["Chaleur forte", "⚠️ Warning", "Chaleur forte : adapter l'hydratation et le pacing."],
            ["Terrain avec dénivelé", "ℹ️ Info", "Dénivelé : gérer l'effort dans les montées."]
          ]
        }
      },
      {
        type: "callout",
        title: "Le coach décide",
        content: "Ces garde-fous sont des RECOMMANDATIONS. L'app ne bloque jamais un scénario. Le coach reste décisionnaire."
      }
    ]
  },

  // PRO LESSONS (4)
  {
    id: "simulation-pro-requirements",
    title: "Simulation PRO : données requises",
    level: "staff",
    tags: ["simulation", "pro", "staff", "données", "VLamax", "TTE", "FatMax"],
    blocks: [
      {
        type: "text",
        title: "Accès au mode PRO",
        content: "La version PRO n'est accessible QUE si les données minimales sont présentes. Sans ces données, un bandeau indique 'Données insuffisantes pour la version PRO. La version BASIC est recommandée.'"
      },
      {
        type: "table",
        title: "Données requises pour le mode PRO",
        content: {
          headers: ["Donnée", "Obligatoire", "Impact si manquante"],
          rows: [
            ["VLamax (discipline pertinente)", "✅ Critique", "Impossible de calculer la dépendance glycolytique"],
            ["TTE effectif", "✅ Critique", "Impossible d'estimer le point de rupture"],
            ["FatMax TFCL™ (plage)", "✅ Important", "Crossover imprécis, risque glycogène sous-estimé"],
            ["Disponibilité TFCL™", "Recommandé", "Confiance réduite sur l'état du jour"],
            ["Nutrition planifiée (g/h)", "Optionnel", "Modèle utilise une valeur par défaut (60 g/h)"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Calcul de l'éligibilité PRO",
        content: [
          "Si 0 donnée manquante → PRO accessible, confiance maximale",
          "Si 1 donnée manquante → PRO accessible, confiance réduite",
          "Si 2+ données manquantes → BASIC recommandé, PRO dégradé"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "simulation-pro-segments",
    title: "Simulation PRO : analyse segment par segment",
    level: "staff",
    tags: ["simulation", "pro", "segments", "glycogène", "fuel", "risk"],
    blocks: [
      {
        type: "text",
        title: "Découpage de la course",
        content: "La version PRO décompose la course en segments (10% de la distance chacun). Pour chaque segment, l'app calcule un FuelRiskIndex et estime le glycogène restant."
      },
      {
        type: "table",
        title: "Métriques par segment",
        content: {
          headers: ["Métrique", "Plage", "Signification"],
          rows: [
            ["FuelRiskIndex", "0–100", "Risque d'épuisement glycogène (0=sûr, 100=critique)"],
            ["DepletionRisk", "LOW/MEDIUM/HIGH/CRITICAL", "Catégorie de risque pour ce segment"],
            ["Glycogène restant", "0–100%", "Estimation des réserves restantes"],
            ["RPE estimé", "1–10", "Effort perçu probable"],
            ["Carbs needed (g/h)", "Variable", "Apport glucidique recommandé pour ce segment"]
          ]
        }
      },
      {
        type: "callout",
        title: "Point de bascule",
        content: "Le modèle identifie le 'breakpointKm' : le kilomètre où le risque passe de modéré à élevé. C'est le point critique de la course.",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Facteurs du FuelRiskIndex",
        content: [
          "Intensité > FatMax → +20-40 points",
          "VLamax haute (>0.5) → +15-25 points",
          "TTE faible (<40 min) → +10-15 points",
          "Durée longue → accumulation progressive",
          "Nutrition planifiée → mitigation (-5 à -20 points)"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "simulation-pro-scenarios",
    title: "Simulation PRO : comparaison des scénarios",
    level: "staff",
    tags: ["simulation", "pro", "scénarios", "conservateur", "optimal", "agressif"],
    blocks: [
      {
        type: "text",
        title: "Les 3 scénarios PRO",
        content: "La version PRO génère 3 scénarios de pacing avec des intensités et des risques différents. Le coach choisit le scénario adapté à la situation."
      },
      {
        type: "table",
        title: "Comparaison des scénarios",
        content: {
          headers: ["Scénario", "Intensité", "Risque", "Probabilité succès", "Usage"],
          rows: [
            ["🛡️ Conservateur", "-5% vs optimal", "Faible", "85–95%", "Finish quasi-garanti, marge de sécurité"],
            ["⚡ Optimal", "Intensité de référence", "Modéré", "70–85%", "Équilibre risque/performance"],
            ["🚀 Agressif", "+5% vs optimal", "Élevé", "50–70%", "Performance maximale, risque de défaillance"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Ce que chaque scénario affiche",
        content: [
          "Temps estimé SOUS FORME DE PLAGE (ex: 3h05–3h15)",
          "Intensité cible (%FTP ou allure)",
          "Point de bascule (km où le risque augmente)",
          "Probabilité de succès",
          "Points forts et avertissements"
        ],
        staffOnly: true
      },
      {
        type: "callout",
        title: "Scénario recommandé",
        content: "L'app indique automatiquement le scénario recommandé selon le profil. Si Disponibilité faible ou Risque blessure élevé → Conservateur recommandé.",
        staffOnly: true
      }
    ]
  },
  {
    id: "simulation-pro-nutrition",
    title: "Simulation PRO : intégration nutrition",
    level: "staff",
    tags: ["simulation", "pro", "nutrition", "glucides", "glycogène", "g/h"],
    blocks: [
      {
        type: "text",
        title: "Rôle de la nutrition dans le modèle",
        content: "Les g/h planifiés sont intégrés dans le modèle Fuel & Risk. La nutrition RÉDUIT le risque d'épuisement glycogène mais ne l'ANNULE jamais."
      },
      {
        type: "table",
        title: "Impact de la nutrition",
        content: {
          headers: ["Apport planifié", "Réduction FuelRisk", "Commentaire"],
          rows: [
            ["< 40 g/h", "Faible (-5 pts)", "Insuffisant pour courses longues"],
            ["40–60 g/h", "Modéré (-10 pts)", "Standard, acceptable pour 70.3/Marathon"],
            ["60–80 g/h", "Bon (-15 pts)", "Recommandé pour Ironman"],
            ["80–100 g/h", "Excellent (-20 pts)", "Tolérance gastrique requise"],
            ["> 100 g/h", "Maximum (-20 pts)", "Au-delà, pas de bénéfice supplémentaire modélisé"]
          ]
        }
      },
      {
        type: "callout",
        title: "Avertissement nutrition",
        content: "Si les apports planifiés sont insuffisants pour la durée de course, l'app affiche un avertissement : 'Nutrition insuffisante pour la durée estimée. Risque glycogène accru.'",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Ce que le modèle NE fait PAS",
        content: [
          "Calculer les grammes exacts nécessaires",
          "Prédire la tolérance gastrique",
          "Recommander des produits spécifiques",
          "Remplacer une stratégie nutrition personnalisée"
        ],
        staffOnly: true
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // PACING ENVELOPE™ TFCL — LEÇONS ACADEMY
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: "pacing-envelope-intro",
    title: "Pourquoi les meilleurs perdent en allant trop vite",
    level: "basic",
    tags: ["pacing", "envelope", "discipline", "Dan Lorang", "endurance", "stratégie"],
    blocks: [
      {
        type: "text",
        title: "Le paradoxe de la performance",
        content: "En endurance, les plus rapides ne sont pas ceux qui partent le plus vite, mais ceux qui savent se freiner. Dan Lorang, coach de Jan Frodeno et Anne Haug, l'a démontré : la discipline de pacing est plus importante que la puissance brute."
      },
      {
        type: "callout",
        title: "Citation clé",
        content: "\"Les 30 premières minutes sont NON NÉGOCIABLES. Laisser partir les autres est une stratégie, pas un échec.\" — Philosophie Dan Lorang"
      },
      {
        type: "bullets",
        title: "Pourquoi baisser la VLamax rend le pacing plus critique",
        content: [
          "Une VLamax basse = excellente efficacité lipidique (utilisation des graisses)",
          "MAIS aussi = moins de 'tampon glycolytique' pour absorber les erreurs",
          "Chaque dépassement consomme disproportionnellement le glycogène",
          "L'erreur précoce coûte plus cher qu'elle ne rapporte en temps gagné"
        ]
      },
      {
        type: "text",
        title: "Le concept du Pacing Envelope™",
        content: "Le pacing n'est PAS un % de FTP ni une allure fixe. Le pacing EST un couloir physiologique sécurisé avec des zones à risque et des règles comportementales claires. Ce couloir est calculé selon votre profil métabolique réel (VLamax, TTE, FatMax)."
      },
      {
        type: "table",
        title: "Les 4 zones du Pacing Envelope™",
        content: {
          headers: ["Zone", "Description", "Risque", "Action"],
          rows: [
            ["🔵 Sous-exploitation", "< Limite basse -5%", "Faible", "Sécurité mais rendement sous-optimal"],
            ["🟢 Optimale", "Limite basse → Limite haute", "Minimal", "Zone cible — oxydation énergétique optimale"],
            ["🟠 Tolérée", "Limite haute → +10%", "Modéré", "Tolérable ponctuellement — discipline requise"],
            ["🔴 Interdite", "> Limite haute +10%", "Critique", "Activation glycolytique excessive — INTERDIT"]
          ]
        }
      }
    ]
  },
  {
    id: "pacing-envelope-vlamax",
    title: "VLamax basse : le profil sensible au pacing",
    level: "staff",
    tags: ["pacing", "VLamax", "profil sensible", "Ironman", "marathon", "métabolisme"],
    blocks: [
      {
        type: "text",
        title: "Pourquoi le profil VLamax basse est 'sensible'",
        content: "Un athlète avec VLamax < 0.35 mmol/L/s possède un excellent moteur aérobie mais un système glycolytique réduit. C'est une force pour l'endurance, mais aussi une vulnérabilité : chaque erreur de pacing amplifie les conséquences métaboliques."
      },
      {
        type: "callout",
        title: "🟣 Badge Profil Sensible",
        content: "Ce profil métabolique offre un rendement élevé mais une faible tolérance aux erreurs. La discipline prime sur la puissance instantanée."
      },
      {
        type: "bullets",
        title: "Caractéristiques du profil sensible",
        content: [
          "Enveloppe de pacing TRÈS étroite (±4-6% seulement)",
          "Tolérance zéro aux dépassements précoces",
          "Dérive > +5% pendant > 3 min = perturbation métabolique majeure",
          "Récupération plus lente après chaque erreur"
        ],
        staffOnly: true
      },
      {
        type: "table",
        title: "Comparaison largeur d'enveloppe selon VLamax",
        content: {
          headers: ["VLamax", "Profil", "Largeur enveloppe", "Tolérance erreur"],
          rows: [
            ["< 0.35", "Sensible", "±4-5%", "Très faible"],
            ["0.35–0.45", "Modéré", "±5-7%", "Faible"],
            ["0.45–0.55", "Équilibré", "±6-8%", "Modérée"],
            ["> 0.55", "Tolérant", "±8-12%", "Élevée (mais glycogène limité)"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Point staff",
        content: "Pour un athlète profil sensible, la consigne n'est pas 'pousser moins' mais 'être plus précis'. La performance vient de la constance, pas des pics d'intensité.",
        staffOnly: true
      }
    ]
  },
  {
    id: "pacing-envelope-errors",
    title: "Anatomie d'une erreur de pacing",
    level: "basic",
    tags: ["pacing", "erreur", "glycogène", "déplétion", "conséquences"],
    blocks: [
      {
        type: "text",
        title: "L'erreur précoce : la plus coûteuse",
        content: "Une erreur de pacing dans le premier tiers de la course coûte exponentiellement plus qu'en fin de parcours. Le corps a moins de temps pour compenser, et les réserves de glycogène sont entamées trop tôt."
      },
      {
        type: "table",
        title: "Coût métabolique d'une erreur selon le moment",
        content: {
          headers: ["Moment de l'erreur", "Impact glycogène", "Impact performance", "Récupérabilité"],
          rows: [
            ["Premier tiers", "-15 à -25%", "-5 à -10%", "Très difficile"],
            ["Tiers médian", "-10 à -15%", "-3 à -5%", "Possible"],
            ["Dernier tiers", "-5 à -10%", "-1 à -3%", "Limitée (course presque finie)"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Scénarios d'erreurs typiques",
        content: [
          "Départ explosif (+15% pendant 5 min) → Rupture probable avant 2/3 du parcours",
          "Suivi du groupe (+10% pendant 10 min au départ) → Déplétion anticipée, final compromis",
          "Tentative de rattraper un retard (middle push) → Épuisement progressif",
          "Côte trop intense → Chaque côte est une dette à rembourser sur le plat"
        ]
      },
      {
        type: "callout",
        title: "La règle d'or",
        content: "En endurance, on ne rattrape pas un retard au premier tiers. On le PAIE au dernier tiers. La dette métabolique n'a pas de crédit."
      }
    ]
  },
  {
    id: "pacing-envelope-discipline",
    title: "Les règles de discipline de pacing",
    level: "staff",
    tags: ["pacing", "discipline", "règles", "coach", "Dan Lorang"],
    blocks: [
      {
        type: "text",
        title: "Discipline vs Courage",
        content: "Dan Lorang privilégie la discipline au courage. Le courage pousse à suivre, à attaquer, à 'répondre'. La discipline permet de laisser partir, de résister à la pression sociale, de s'en tenir au plan."
      },
      {
        type: "table",
        title: "Règles non négociables par format",
        content: {
          headers: ["Format", "Règle principale", "Interdiction"],
          rows: [
            ["Ironman", "Première heure vélo = installation, pas de push", "Mode héros sur vélo = marche sur marathon"],
            ["70.3", "Départ vélo -5% sous plafond, montée progressive", "Suivre le peloton si au-dessus de l'enveloppe"],
            ["Marathon", "Negative split : 2ème moitié > 1ère moitié", "Accélération sur le 1er km"],
            ["Semi", "5 premiers km = 5-10 sec/km plus lents", "Push avant le 15e km"],
            ["10 km", "2 premiers km = installation du rythme", "Départ explosif sprint"]
          ]
        },
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Phrases coach à utiliser",
        content: [
          "\"Les 30 premières minutes sont non négociables.\"",
          "\"Laisser partir les autres est une stratégie.\"",
          "\"Ce profil ne tolère pas les pics précoces.\"",
          "\"La discipline prime sur la puissance instantanée.\"",
          "\"Chaque watt économisé maintenant est une minute gagnée plus tard.\""
        ],
        staffOnly: true
      },
      {
        type: "callout",
        title: "Règle de dérive",
        content: "Toute dérive > limite haute pendant plus de X minutes est interdite. X dépend du profil : profil sensible = 2-3 min, profil tolérant = 5-7 min.",
        staffOnly: true
      }
    ]
  },
  {
    id: "pacing-envelope-readiness",
    title: "Pacing et Race Readiness : ajustement du jour J",
    level: "staff",
    tags: ["pacing", "readiness", "disponibilité", "ajustement", "jour J"],
    blocks: [
      {
        type: "text",
        title: "L'enveloppe s'adapte à l'état du jour",
        content: "Le Pacing Envelope™ n'est pas figé. Il se réduit automatiquement si le Potentiel Physiologique est faible. Aujourd'hui, la robustesse prime sur l'ambition."
      },
      {
        type: "table",
        title: "Ajustement enveloppe selon Potentiel",
        content: {
          headers: ["Potentiel Physiologique", "Ajustement", "Message"],
          rows: [
            ["> 80%", "Aucun", "État optimal — enveloppe normale"],
            ["70-80%", "-1% plafond", "État modéré — rester dans la zone optimale"],
            ["60-70%", "-2-3% plafond", "État réduit — scénario conservateur recommandé"],
            ["< 60%", "-4-5% plafond", "État faible — robustesse absolue, finisher mode"]
          ]
        },
        staffOnly: true
      },
      {
        type: "callout",
        title: "Message automatique",
        content: "Si Readiness < 70% : 'Aujourd'hui, la robustesse prime sur l'ambition.' Ce message s'affiche dans le briefing staff et sur le Pacing Envelope™.",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Ce que TFCL ne fait PAS",
        content: [
          "Prescrire automatiquement une allure",
          "Forcer une décision",
          "Bloquer l'athlète dans une zone",
          "Remplacer le jugement du coach"
        ],
        staffOnly: true
      }
    ]
  },
  {
    id: "pacing-envelope-cases",
    title: "Études de cas : Ironman et Marathon",
    level: "basic",
    tags: ["pacing", "étude de cas", "Ironman", "marathon", "exemple"],
    blocks: [
      {
        type: "text",
        title: "Cas 1 : L'Ironman trop rapide au départ vélo",
        content: "Athlète profil VLamax 0.32, FTP 280W, objectif 10h30. Départ vélo à 85% FTP (238W) au lieu de l'enveloppe 68-74% (190-207W). Résultat : Glycogène épuisé au km 130, marathon marché, temps final 12h15."
      },
      {
        type: "callout",
        title: "Analyse",
        content: "L'erreur de +15% pendant les 30 premières minutes a consommé l'équivalent de 45 min de réserve glycogène. Le profil sensible a amplifié les conséquences. Leçon : même 'bien se sentir' au départ n'est pas une autorisation de dépasser."
      },
      {
        type: "text",
        title: "Cas 2 : Le Marathon negative split réussi",
        content: "Athlète profil VLamax 0.42, allure seuil 4:00/km, objectif sub-3h00. Départ à 4:22/km (5 premiers km), stabilisation à 4:15/km, derniers 10 km à 4:05/km. Temps final : 2h57."
      },
      {
        type: "bullets",
        title: "Clés du succès",
        content: [
          "Premier 5 km volontairement 10 sec/km plus lent que l'objectif",
          "Installation progressive dans la zone optimale",
          "Accélération autorisée uniquement après le 30e km",
          "Finir avec la sensation de pouvoir en donner plus"
        ]
      },
      {
        type: "callout",
        title: "Différence entre performance instantanée et performance durable",
        content: "La performance instantanée = ce que l'athlète peut produire à un instant T. La performance durable = ce que l'athlète peut maintenir sur la distance. TFCL optimise la performance durable."
      }
    ]
  },
  {
    id: "pacing-envelope-philosophy",
    title: "Philosophie : pourquoi TFCL ne prescrit pas",
    level: "staff",
    tags: ["pacing", "philosophie", "coach", "autonomie", "décision"],
    blocks: [
      {
        type: "text",
        title: "TFCL explique, simule, cadre — mais ne prescrit pas",
        content: "Le Pacing Envelope™ est un outil d'aide à la décision, pas un système automatique. Le coach garde toujours la main. L'athlète reste responsable de son exécution."
      },
      {
        type: "bullets",
        title: "Ce que TFCL fait",
        content: [
          "Définit un couloir physiologique sécurisé",
          "Génère des règles comportementales claires",
          "Simule les conséquences métaboliques des erreurs",
          "Affiche les risques sans bloquer",
          "Éduque l'athlète à l'autonomie"
        ]
      },
      {
        type: "bullets",
        title: "Ce que TFCL ne fait PAS",
        content: [
          "Prescrire automatiquement une allure exacte",
          "Forcer une décision de pacing",
          "Remplacer l'expertise du coach",
          "Garantir un résultat"
        ]
      },
      {
        type: "callout",
        title: "Orientation autonomie athlète",
        content: "L'objectif final est que l'athlète comprenne SON profil et SOIT CAPABLE de prendre les bonnes décisions en course, même sans le coach dans l'oreillette. L'éducation prime sur la prescription."
      },
      {
        type: "text",
        title: "Conclusion : la discipline comme compétence",
        content: "La discipline de pacing n'est pas une contrainte imposée, c'est une compétence à développer. Les meilleurs athlètes d'endurance ne sont pas ceux qui ignorent leurs limites, mais ceux qui les respectent avec précision."
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // NOUVELLE LEÇON: Références d'intensité TFCL V2
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: "intensity-reference-explained",
    title: "Pourquoi 80% ne veut rien dire sans référence",
    level: "basic",
    tags: ["intensité", "pacing", "FTP", "FatMax", "VMA", "physiologie", "INSCYD", "référence"],
    blocks: [
      {
        type: "callout",
        title: "Règle fondamentale TFCL V2",
        content: "Une intensité sans référence physiologique n'a AUCUNE valeur. 80% de quoi ? Cette question doit toujours avoir une réponse claire."
      },
      {
        type: "text",
        title: "Le problème des pourcentages abstraits",
        content: "Dans l'entraînement classique, on voit souvent des prescriptions du type 'roule à 75%' ou 'zone 3 à 85%'. Mais 85% de QUOI exactement ? Le FTP ? Le seuil lactique ? La puissance à FatMax ? Chaque référence implique une sollicitation métabolique radicalement différente."
      },
      {
        type: "bullets",
        title: "Exemples concrets d'erreur de pacing",
        content: [
          "80% de FTP ≠ 80% de FatMax : sur un Ironman, cette confusion peut coûter 45 minutes",
          "75% de VMA ≠ 75% d'allure marathon : la charge glycolytique est totalement différente",
          "Un athlète à VLamax basse qui roule à '85%' sans savoir de quoi risque l'explosion glycogénique",
          "Le même pourcentage pour deux profils différents → conséquences opposées"
        ]
      },
      {
        type: "table",
        title: "Impact réel : même % mais références différentes",
        content: {
          headers: ["Référence", "Valeur 75%", "Système sollicité", "Durabilité (IM)"],
          rows: [
            ["FatMax", "75% FatMax", "Aérobie pur (lipides)", "✓ Excellent"],
            ["FTP", "75% FTP (≈60% VO2max)", "Mixte modéré", "✓ Correct"],
            ["Seuil LT2", "75% LT2", "Aérobie dominante", "✓ Bon"],
            ["MAP/PMA", "75% PMA", "Glycolyse ++", "✗ Impossible"],
            ["Allure 10km", "75% v10k", "Zone haute", "✗ Non durable"]
          ]
        }
      },
      {
        type: "text",
        title: "Cas Ironman : la surconsommation glycogénique",
        content: "Un athlète qui 'se sent bien' à 82% de FTP alors que son FatMax est à 68% de FTP consomme du glycogène 3x plus vite que nécessaire. Après 4h, ses réserves sont épuisées. C'est invisible au départ, catastrophique à l'arrivée."
      },
      {
        type: "callout",
        title: "Philosophie Dan Lorang / INSCYD",
        content: "Dans la méthodologie INSCYD, chaque intensité est TOUJOURS rattachée à un seuil métabolique mesuré (FatMax, MLSS, VLamax). TFCL adopte exactement cette logique : on ne parle jamais de % abstrait."
      },
      {
        type: "bullets",
        title: "La hiérarchie TFCL des références",
        content: [
          "Priorité 1 (métabolique) : FatMax, Allure Course cible, Seuil métabolique",
          "Priorité 2 (power-based) : FTP (vélo), VMA (course), Allure seuil",
          "Priorité 3 (VO2max work) : MAP/PMA, %VMA haute",
          "Si référence manquante → affichage 'estimation indirecte' obligatoire"
        ]
      },
      {
        type: "text",
        title: "Comment TFCL affiche les intensités",
        content: "Dans toute l'application, une intensité est TOUJOURS affichée sous la forme 'X% de [RÉFÉRENCE]' avec un code couleur indiquant le système énergétique dominant : vert = aérobie, orange = mixte, rouge = glycolyse. Un badge indique si la référence est physiologique (FatMax) ou un fallback (FTP sans données métaboliques)."
      },
      {
        type: "table",
        title: "Code couleur des systèmes énergétiques",
        content: {
          headers: ["Couleur", "Système", "Signification", "Durabilité"],
          rows: [
            ["🟢 Vert", "Aérobie dominant", "Oxydation lipidique prioritaire", "Très haute"],
            ["🟠 Orange", "Zone mixte", "Glycolyse croissante, gestion requise", "Modérée"],
            ["🔴 Rouge", "Glycolyse dominante", "Consommation rapide du glycogène", "Limitée"]
          ]
        }
      },
      {
        type: "callout",
        title: "Message clé pour le coach",
        content: "On ne s'entraîne pas à des watts. On ne s'entraîne pas à des %. On s'entraîne à des SYSTÈMES ÉNERGÉTIQUES. La puissance ou l'allure ne sont que des indicateurs au service de cette cible physiologique."
      },
      {
        type: "bullets",
        title: "Actions concrètes pour le coach",
        content: [
          "Toujours préciser la référence quand tu prescris une intensité",
          "Vérifier que l'athlète comprend POURQUOI cette zone et pas une autre",
          "Utiliser le Pacing Envelope™ qui intègre automatiquement les bonnes références",
          "En cas de doute sur la référence → afficher le warning TFCL",
          "Éduquer l'athlète à reconnaître les sensations associées à chaque zone"
        ]
      },
      {
        type: "text",
        title: "Conclusion : la précision comme crédibilité",
        content: "Un coach qui dit '80% de FatMax pour économiser le glycogène' a une crédibilité scientifique. Un coach qui dit 'roule à 80%' sans plus de détails laisse place à l'interprétation. TFCL impose cette rigueur pour aligner discours, physiologie et résultats."
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // LEÇON PACING ENVELOPE™ — Discipline beats ambition
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: "pacing-envelope-discipline",
    title: "Pacing Envelope™: Why discipline beats ambition",
    level: "basic",
    tags: ["pacing", "discipline", "VLamax", "endurance", "Ironman", "marathon", "métabolisme", "Dan Lorang"],
    blocks: [
      {
        type: "callout",
        title: "Philosophie TFCL",
        content: "Le Pacing Envelope™ n'est PAS un outil de prédiction. C'est un SYSTÈME DE CONTRAINTE DÉCISIONNELLE. Il définit ce que l'athlète peut faire, ce qui est tolérable mais risqué, et ce qui est interdit le jour de course."
      },
      {
        type: "text",
        title: "Le paradoxe de la VLamax basse",
        content: "Un athlète avec une VLamax réduite (< 0.35 mmol/L/s) possède un excellent rendement énergétique — mais une tolérance quasi nulle aux erreurs de pacing. Ce profil, typique des athlètes ultra-endurance élites, est le plus performant ET le plus fragile. L'erreur précoce coûte plus qu'elle ne rapporte."
      },
      {
        type: "table",
        title: "Impact de la VLamax sur la tolérance au sur-pacing",
        content: {
          headers: ["Profil VLamax", "Largeur Envelope", "Tolérance erreur", "Stratégie"],
          rows: [
            ["< 0.30 (très basse)", "±4-5%", "Quasi nulle", "Discipline absolue"],
            ["0.30-0.45 (modérée)", "±5-7%", "Faible", "Prudence recommandée"],
            ["> 0.55 (élevée)", "±8-12%", "Modérée", "Plus de flexibilité"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Pourquoi le sur-pacing précoce est irréversible",
        content: [
          "L'activation glycolytique précoce augmente IRRÉVERSIBLEMENT la consommation de glycogène",
          "Le lactate accumulé dans les 30 premières minutes persiste tout au long de la course",
          "Se sentir 'bien' au départ ≠ un bon pacing (sensation vs métabolisme)",
          "L'effondrement arrive 2-3h après l'erreur, pas immédiatement"
        ]
      },
      {
        type: "callout",
        title: "Citation Dan Lorang",
        content: "\"Les 30 premières minutes sont NON NÉGOCIABLES.\" — La discipline en début de course détermine la capacité à performer en fin de course."
      },
      {
        type: "text",
        title: "Les 3 zones du Pacing Envelope™",
        content: "Le système définit trois zones claires basées sur la physiologie métabolique, pas sur les sensations ou l'ambition:"
      },
      {
        type: "bullets",
        title: "Zone SAFE (Verte)",
        content: [
          "Production de lactate < clearance (équilibre métabolique)",
          "Oxydation lipidique significative (épargne glycogène)",
          "Déplétion glycogénique compatible avec la durée de course",
          "C'est LA zone cible pour l'ultra-endurance"
        ]
      },
      {
        type: "bullets",
        title: "Zone RISK (Orange)",
        content: [
          "Intensité soutenable à court terme MAIS métaboliquement dangereuse",
          "Contribution glycolytique en forte hausse",
          "Tolérable ponctuellement (côte, relance) mais retour rapide requis",
          "Chaque minute dans cette zone coûte du glycogène irremplaçable"
        ]
      },
      {
        type: "bullets",
        title: "Zone FORBIDDEN (Rouge)",
        content: [
          "Accélère la déplétion glycogénique",
          "Accumulation lactate au-delà de la clearance",
          "Provoque un effondrement du pacing en fin de course",
          "INTERDIT sur longue distance — quelle que soit la sensation"
        ]
      },
      {
        type: "text",
        title: "Le cas concret Ironman",
        content: "Un athlète qui 'se sent bien' à 78% de FTP alors que son envelope SAFE est 65-72% consomme du glycogène 3x plus vite. Après 4h de vélo, ses réserves sont critiques. Le marathon devient une marche forcée. L'écart de 6% au départ = 45 min perdues à l'arrivée."
      },
      {
        type: "table",
        title: "Règles Coach — Système de warnings",
        content: {
          headers: ["Situation", "Warning TFCL", "Action recommandée"],
          rows: [
            ["Target en zone RISK", "⚠️ Risque de déplétion glycogénique prématurée", "Message: \"Stabilise maintenant\""],
            ["Target en zone FORBIDDEN", "🔴 Pacing hors enveloppe TFCL", "Intervention: \"Reviens dans le plan\""],
            ["VLamax confidence < 70%", "ℹ️ Enveloppe construite avec confiance modérée", "Considérer Reference Week TFCL"]
          ]
        }
      },
      {
        type: "text",
        title: "La performance élite = être ennuyeux au départ",
        content: "Jan Frodeno, Kristian Blummenfelt, Eliud Kipchoge — tous ces champions partagent une caractéristique: ils commencent SOUS leur potentiel apparent. L'objectif n'est pas de se sentir fort au départ. L'objectif est d'être ENCORE fort à l'arrivée."
      },
      {
        type: "callout",
        title: "Message clé de la leçon",
        content: "\"The goal is not to feel strong early. The goal is to still be strong late.\" — Le Pacing Envelope™ existe pour protéger l'athlète de sa propre ambition."
      },
      {
        type: "bullets",
        title: "Intégration dans TFCL",
        content: [
          "Le Pacing Envelope™ alimente Race Readiness, Simulation et Race-Day Briefing",
          "Une intensité sans référence = interdite pour le pacing jour J",
          "Le coach peut override mais doit justifier (responsabilité explicite)",
          "L'athlète ne peut PAS modifier les zones lui-même"
        ]
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // LEÇON LONG DISTANCE — Why Long-Distance Races Punish the Brave
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: "long-distance-pacing-discipline",
    title: "Why Long-Distance Races Punish the Brave",
    level: "staff",
    tags: ["pacing", "Ironman", "marathon", "ultra", "glycogène", "discipline", "VLamax", "LDRI", "longue distance"],
    blocks: [
      {
        type: "callout",
        title: "Philosophie TFCL Longue Distance",
        content: "\"Les athlètes ne perdent pas leur course en étant trop conservateurs au départ, mais en dépassant leur tolérance métabolique trop tôt.\" — La discipline est invisible. L'effondrement est spectaculaire."
      },
      {
        type: "text",
        title: "Le LDRI: Long Distance Risk Index",
        content: "TFCL calcule un indice de risque spécifique longue distance (0-100) basé sur: la durée de course, la VLamax, l'âge (>40 = sensibilité accrue), la confiance TTE, et l'historique de fade en fin de course. Plus le LDRI est élevé, plus le couloir de pacing doit être étroit."
      },
      {
        type: "table",
        title: "Niveau de risque LDRI",
        content: {
          headers: ["Score LDRI", "Niveau", "Implication pacing"],
          rows: [
            ["< 30", "Faible", "Profil robuste — discipline standard"],
            ["30-55", "Modéré", "Attention requise — rester dans zone safe"],
            ["55-75", "Élevé", "Discipline absolue — marge de sécurité obligatoire"],
            ["> 75", "Critique", "Toute erreur précoce = conséquences irréversibles"]
          ]
        }
      },
      {
        type: "text",
        title: "Inertie Métabolique: le point de non-retour",
        content: "L'activation glycolytique précoce NE PEUT PAS être inversée. Le lactate accumulé dans les 30-60 premières minutes persiste et s'accumule tout au long de la course. Se sentir 'bien' au départ ≠ un bon pacing. Le métabolisme n'est pas la sensation. L'effondrement arrive 2-3h APRÈS l'erreur, pas immédiatement."
      },
      {
        type: "bullets",
        title: "Irréversibilité de la Dette Glycogène",
        content: [
          "Chaque gramme de glycogène consommé précocement en sur-régime = indisponible pour la fin",
          "À 70% de déplétion, la capacité à maintenir l'intensité chute brutalement",
          "Sur Ironman: 6% trop haut au départ = 45 min perdues à l'arrivée",
          "INTERDICTION de 'banker du temps' — chaque minute gagnée tôt coûte 3-5 minutes tard"
        ]
      },
      {
        type: "text",
        title: "Le Discipline Buffer: cible vs maximum",
        content: "TFCL distingue l'intensité MAXIMUM autorisée (haut de zone Safe) de l'intensité RECOMMANDÉE (Discipline Target). La Discipline Target est 4-6% SOUS le maximum. C'est l'intensité où les élites courent. Ils ne frôlent pas la limite — ils restent délibérément en dessous."
      },
      {
        type: "table",
        title: "Comparaison Pacing Vélo Ironman: Élite vs Age-Group",
        content: {
          headers: ["Segment", "Élite", "Age-Group typique"],
          rows: [
            ["0-30 km", "68-70% FTP", "78-82% FTP"],
            ["90-120 km", "71-73% FTP", "70-72% FTP"],
            ["150-180 km", "72-75% FTP", "62-66% FTP"],
            ["Marathon", "Course stable", "Marche/Arrêts"]
          ]
        }
      },
      {
        type: "text",
        title: "Le Glycogen Collapse Threshold",
        content: "TFCL modélise un seuil d'intensité au-dessus duquel l'oxydation glucidique domine complètement (typiquement FatMax + 10-15%). Au-delà de ce seuil pendant plus de 30-45 min cumulées, le drift métabolique devient irréversible. Message clé: \"Au-dessus de ce seuil, la perte de performance est différée mais inévitable.\""
      },
      {
        type: "bullets",
        title: "Les 3 Scénarios de Pacing",
        content: [
          "DISCIPLINÉ: Intensité sous la cible — sensation 'trop facile' au départ → finish stable/négatif split",
          "AMBITIEUX: Au plafond zone Safe — bon ressenti mais vulnérable aux aléas → décroissance progressive",
          "AGRESSIF: Au-dessus zone Safe — sensation 'fort' (faux signal) → effondrement brutal"
        ]
      },
      {
        type: "text",
        title: "Pourquoi les Élites Semblent 'Lents' à la TV",
        content: "Jan Frodeno (Ironman): ses 10 premiers km vélo semblent 'faciles' en TV. Eliud Kipchoge (Marathon): son premier semi semble 'contrôlé'. Gustav Iden: départ vélo 'prudent'. Ils savent tous que la discipline précoce = vitesse tardive. Leur objectif n'est pas de se sentir fort au départ. Leur objectif est d'ÊTRE ENCORE FORT à l'arrivée."
      },
      {
        type: "callout",
        title: "Message Staff Report",
        content: "\"Pour cet athlète, aller plus fort tôt RÉDUIRA la performance finale. Le succès longue distance se décide AVANT la mi-course. Une intensité exprimée sans référence n'a aucune valeur physiologique.\""
      },
      {
        type: "bullets",
        title: "Règles UI TFCL",
        content: [
          "Vue Athlète: seule la Discipline Target est affichée (pas le max)",
          "Vue Coach: enveloppe complète + scénarios + LDRI",
          "Override Coach: justification écrite obligatoire + warning logged dans le rapport",
          "Aucun encouragement à dépasser l'enveloppe — TFCL favorise la qualité du finish"
        ]
      },
      {
        type: "callout",
        title: "Citation finale",
        content: "\"Discipline is invisible. Collapse is spectacular.\" — L'objectif n'est pas de se sentir fort au départ. L'objectif est d'être ENCORE fort à l'arrivée."
      }
    ]
  },
  {
    id: "race-readiness-v2-engine",
    title: "Pourquoi la Forme Seule ne Gagne pas les Courses",
    level: "staff",
    tags: ["potentiel physiologique", "disponibilité", "pacing", "simulation", "décision", "V2"],
    blocks: [
      {
        type: "text",
        title: "Principe fondamental TFCL",
        content: "Performance jour J = Potentiel × Disponibilité × Discipline. TFCL n'évalue jamais l'un sans les autres. La forme (potentiel) définit le plafond possible. La disponibilité définit ce qui est accessible aujourd'hui. La discipline (Pacing Envelope) garantit l'exécution."
      },
      {
        type: "callout",
        title: "La disponibilité fluctue plus vite que la forme",
        content: "VO2max, FTP et VLamax mettent des semaines à changer. La disponibilité peut changer en une nuit. Sommeil, stress, voyage, nutrition et récupération modulent la fraction du potentiel accessible AUJOURD'HUI."
      },
      {
        type: "table",
        title: "Plafond Utilisable (Usable Pacing Ceiling)",
        content: {
          headers: ["Concept", "Définition", "Formule"],
          rows: [
            ["Plafond Absolu", "Limite haute de l'enveloppe de pacing (potentiel)", "Envelope upper bound"],
            ["Plafond Utilisable", "Intensité MAX autorisée aujourd'hui", "Envelope × Race Readiness %"],
            ["Cible Discipline", "Intensité recommandée (3-5% sous le plafond)", "Usable ceiling - Buffer"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Statuts de décision",
        content: [
          "CRITIQUE (<50): Pacing sévèrement restreint ou simulation désactivée",
          "RESTREINT (50-65): Scénarios conservateurs uniquement",
          "NORMAL (65-80): Accès complet avec marges standards",
          "OPTIMAL (>80): Stratégies ambitieuses disponibles avec risques explicites"
        ],
        staffOnly: true
      },
      {
        type: "callout",
        title: "Conséquences, pas prédictions",
        content: "La simulation TFCL ne prédit PAS les temps d'arrivée. Elle simule des CONSÉQUENCES. Pour chaque choix de pacing: Quand l'athlète perd-il le contrôle métabolique? La récupération est-elle possible? Quel est le coût de l'agressivité précoce?"
      },
      {
        type: "bullets",
        title: "Templates de phrases TFCL",
        content: [
          "\"Ce pacing dépasse ce que ton corps peut défendre aujourd'hui.\"",
          "\"La fatigue apparaîtra avant de pouvoir être gérée.\"",
          "\"Tu empruntes une énergie que tu ne pourras pas rembourser.\"",
          "\"La décision prioritise la stabilité du finish sur la performance précoce.\""
        ]
      },
      {
        type: "callout",
        title: "Message clé",
        content: "\"La meilleure décision est celle que ton corps peut exécuter aujourd'hui.\" — TFCL ne promeut jamais le risque pour l'ego ou le classement. La simulation est éducative, pas prédictive. Race Readiness gate toujours le Pacing.",
        staffOnly: true
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // RUNNING FOCUS MODE™ — Leçon obligatoire
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: "running-focus-mode",
    title: "Running Focus Mode™ : Pourquoi TFCL sépare course et vélo",
    level: "basic",
    tags: ["running", "cap", "course", "méthodologie", "running-focus-mode", "rfm"],
    blocks: [
      {
        type: "text",
        content: "Le Running Focus Mode™ est une couche architecturale fondamentale de TFCL qui active un environnement 100% course à pied lorsque l'athlète a un objectif CAP (5K, 10K, Semi, Marathon, Trail). Ce n'est pas un simple filtre visuel, mais un verrou disciplinaire scientifiquement justifié."
      },
      {
        type: "callout",
        title: "Pourquoi cette séparation ?",
        content: "Un modèle unique CAP/Vélo serait scientifiquement FAUX. Les différences métaboliques et biomécaniques entre les deux disciplines sont trop importantes pour permettre une transposition directe des données."
      },
      {
        type: "bullets",
        title: "Différences métaboliques CAP vs Vélo",
        content: [
          "VLamax vélo ≠ VLamax CAP : les fibres recrutées et les patterns de contraction diffèrent",
          "Le coût énergétique de la course est dominé par les oscillations verticales (économie de course)",
          "L'oxydation lipidique à même intensité relative est différente selon le sport",
          "La dérive cardiaque suit des patterns distincts (impact vs pédalage)"
        ]
      },
      {
        type: "bullets",
        title: "Contraintes mécaniques spécifiques CAP",
        content: [
          "Impact répétés : 2-3x le poids du corps à chaque foulée",
          "Stress tendineux : Achille, fascia plantaire, ITB",
          "Fatigue neuromusculaire : la force excentrique diminue progressivement",
          "Cadence optimale : 180 spm ≠ 90 rpm vélo (le double !)"
        ]
      },
      {
        type: "table",
        title: "Comparaison des métriques clés",
        content: {
          headers: ["Domaine", "Course à pied (CAP)", "Vélo"],
          rows: [
            ["Intensité de référence", "% vVO2max, Allure (min/km)", "% FTP, Puissance (W)"],
            ["Seuil principal", "Allure Seuil, VMA", "FTP, MAP"],
            ["Métabolisme", "VLamax CAP", "VLamax Vélo"],
            ["Efficacité", "Économie de course (ml O2/kg/km)", "Efficacité brute (%)"],
            ["Durabilité", "Time to Exhaustion à allure", "TTE à FTP"],
            ["Fatigue", "Mécanique + Métabolique", "Principalement métabolique"]
          ]
        }
      },
      {
        type: "text",
        title: "Ce que le Running Focus Mode™ change",
        content: "Lorsque RUNNING_ONLY est actif, l'application masque automatiquement FTP, PMA, MAP vélo, cadence vélo, zones de puissance vélo, et toutes les références triathlon. Les analyses parlent exclusivement en allure (min/km), % vVO2max, VMA, et économie de course."
      },
      {
        type: "bullets",
        title: "Indicateurs clés en Running Focus Mode™",
        content: [
          "VO2max CAP : capacité aérobie maximale en course",
          "VLamax CAP : capacité glycolytique spécifique course",
          "Économie de course : coût énergétique par kilomètre",
          "Durabilité d'allure : temps limite à l'allure cible",
          "Dérive cardiaque : augmentation FC à allure constante",
          "Fatigue mécanique : stress musculaire et articulaire"
        ]
      },
      {
        type: "callout",
        title: "Message pour le coach",
        content: "En Running Focus Mode™, toute recommandation vélo est interdite. Les leviers d'optimisation sont 100% CAP : intervalles VO2max, tempo/seuil, allure spécifique, volume aérobie, technique d'économie, discipline de pacing, renforcement musculaire.",
        staffOnly: true
      },
      {
        type: "text",
        title: "Objectif stratégique",
        content: "Le Running Focus Mode™ positionne TFCL comme un outil NÉ pour la course à pied, crédible face aux solutions de laboratoire. Il réduit la charge cognitive du coach CAP en éliminant tout le bruit disciplinaire non pertinent, permettant une prise de décision plus claire et plus rapide."
      }
    ]
  },
  {
    id: "race-readiness-cap",
    title: "Pourquoi être en forme ne suffit pas — Race Readiness CAP",
    level: "basic",
    tags: ["race readiness", "disponibilité", "potentiel", "CAP", "running", "Dan Lorang", "decision"],
    blocks: [
      {
        type: "text",
        title: "La question centrale du Race Readiness",
        content: "Le Race Readiness TFCL répond à UNE question : 'L'athlète peut-il exprimer son potentiel physiologique CAP aujourd'hui ?' Ce score ne mesure pas la forme absolue, mais la capacité à mobiliser le potentiel existant sans dégradation excessive ni risque disproportionné."
      },
      {
        type: "callout",
        title: "Race Readiness ≠ Potentiel",
        content: "Un athlète avec un excellent VO2max et une VLamax optimale peut échouer le jour J si sa disponibilité est compromise. Le Race Readiness capture cette interaction entre physiologie (stable) et disponibilité (variable)."
      },
      {
        type: "table",
        title: "Les 3 piliers du Race Readiness CAP",
        content: {
          headers: ["Pilier", "Description", "Impact"],
          rows: [
            ["Potentiel (verrouillé)", "VLamax, VO2max, Durabilité — profil physiologique stable", "Définit le plafond de performance possible"],
            ["Disponibilité (variable)", "Sommeil, fatigue, douleur, stress, motivation", "Module la capacité à atteindre ce plafond"],
            ["Contexte risque", "Âge, historique blessure, phase du plan, importance course", "Ajuste la tolérance au risque"]
          ]
        }
      },
      {
        type: "table",
        title: "Interprétation des états Race Readiness",
        content: {
          headers: ["État", "Score", "Signification", "Implication pacing"],
          rows: [
            ["🟢 GREEN", "≥ 75%", "Conditions réunies pour exprimer le potentiel", "Allure planifiée autorisée"],
            ["🟠 ORANGE", "50-74%", "Course possible, vigilance accrue", "Pacing très discipliné, départ prudent"],
            ["🔴 RED", "< 50%", "Potentiel non exprimable aujourd'hui", "Course déconseillée ou allure très conservatrice"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Pourquoi des athlètes 'en forme' échouent",
        content: [
          "Fatigue résiduelle non assimilée malgré un profil physiologique optimal",
          "Stress mental élevé bloquant l'accès aux ressources énergétiques",
          "Douleur légère qui s'amplifie sous effort prolongé",
          "Mauvaise qualité de sommeil altérant la coordination neuromusculaire",
          "Charge récente excessive créant un déficit de fraîcheur"
        ]
      },
      {
        type: "callout",
        title: "Lien avec la méthode Dan Lorang",
        content: "Dan Lorang insiste : 'La physiologie évolue lentement, les décisions doivent être prises souvent.' Le Race Readiness est l'outil de la boucle rapide : il évalue chaque jour si l'athlète peut performer sans modifier le profil physiologique verrouillé.",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Application pratique pour le coach",
        content: [
          "GREEN : Exécuter le plan tel que prévu",
          "ORANGE : Réduire l'intensité de 10%, éviter les efforts explosifs, surveiller la dérive cardiaque",
          "RED : Proposer report de course ou allure très conservatrice (-20%), priorité récupération"
        ],
        staffOnly: true
      },
      {
        type: "text",
        title: "Garde-fou scientifique",
        content: "Le Race Readiness ne promet jamais de performance. Il indique une plage d'expression (80-100% du potentiel) et un facteur limitant principal. Le pacing reste une conséquence directe du score : plus le readiness est bas, plus la discipline de pacing doit être stricte."
      },
      {
        type: "callout",
        title: "Message clé",
        content: "TFCL distingue le potentiel physiologique de la capacité à l'exprimer le jour J. C'est cette distinction qui fait la différence entre un plan d'entraînement et une stratégie de course réussie."
      }
    ]
  },
  {
    id: "pacing-envelope-cap",
    title: "Pourquoi les meilleurs perdent en allant trop vite — Pacing Envelope™ CAP",
    level: "basic",
    tags: ["pacing", "envelope", "CAP", "running", "Dan Lorang", "marathon", "discipline"],
    blocks: [
      {
        type: "text",
        title: "Le concept du Pacing Envelope™",
        content: "Le Pacing Envelope™ TFCL est la plage d'intensité et d'allure dans laquelle l'athlète peut évoluer SANS déclencher un coût métabolique irréversible avant la fin de la course. Ce module NE calcule PAS un temps magique. Il définit ce qui est AUTORISÉ, RISQUÉ et INTERDIT."
      },
      {
        type: "callout",
        title: "Philosophie Dan Lorang",
        content: "'Si tu te sens facile au km 5, TU NE CHANGES RIEN. La course commence après le km 30.' L'erreur précoce coûte TOUJOURS plus cher qu'elle ne rapporte. C'est une loi physiologique, pas une opinion."
      },
      {
        type: "table",
        title: "Les 3 zones de pacing CAP",
        content: {
          headers: ["Zone", "Description", "Utilisation"],
          rows: [
            ["🟢 VERTE (Sustainable)", "Effort tenable jusqu'à la ligne d'arrivée", "Zone de référence — reste ici le plus longtemps possible"],
            ["🟠 ORANGE (Conditionnelle)", "Effort possible mais avec coût cumulatif", "Utilisable uniquement si pacing parfait jusque-là — pas avant 50% de course"],
            ["🔴 ROUGE (Interdite)", "Déclenchement probable de dérive lactate/glycogène", "INTERDIT en début de course — coût irréversible"]
          ]
        }
      },
      {
        type: "bullets",
        title: "Physiologie du départ trop rapide",
        content: [
          "L'intensité élevée précoce épuise les stocks de glycogène plus rapidement que prévu",
          "La production de lactate dépasse la capacité d'élimination (VLamax élevée = risque accru)",
          "La dérive cardiaque s'installe : même allure = coût énergétique croissant",
          "Le 'mur du marathon' est une conséquence directe d'un pacing mal maîtrisé",
          "Les 5% de temps 'gagnés' au début coûtent 15-20% de temps perdu à la fin"
        ]
      },
      {
        type: "table",
        title: "Impact de la VLamax sur le pacing",
        content: {
          headers: ["VLamax", "Profil", "Largeur enveloppe", "Stratégie"],
          rows: [
            ["< 0.30", "Très sensible", "Étroite (±4%)", "Discipline maximale — aucune marge d'erreur"],
            ["0.30-0.45", "Modéré", "Standard (±6%)", "Discipline élevée — negative split recommandé"],
            ["> 0.45", "Tolérant", "Large (±10%)", "Plus de marge — mais pas de carte blanche"]
          ]
        }
      },
      {
        type: "callout",
        title: "Règles d'or TFCL — Pacing CAP",
        content: "1. JAMAIS entrer en zone rouge dans le premier tiers\\n2. Toute entrée en zone orange avant 50% = pénalité finale\\n3. Le negative split n'est autorisé que si VLamax basse ET readiness GREEN\\n4. 'Facile au km 10' = tu es EXACTEMENT où tu dois être",
        staffOnly: true
      },
      {
        type: "bullets",
        title: "Cas réels : discipline vs ambition",
        content: [
          "Marathon de Berlin 2019 : Kipchoge maintient 2'52\"/km jusqu'au km 35 malgré les jambes fraîches",
          "Marathon de Paris 2022 : Leader à 2'55\"/km au km 10, finit à 3'15\"/km — effondrement glycogénique",
          "Semi de Nice 2023 : Athlète TFCL respecte la zone verte, perd 45s au km 5, gagne 2min sur le final",
          "10km de Lyon : Départ à 100% VMA, abandon au km 7 — accumulation lactique non récupérable"
        ]
      },
      {
        type: "text",
        title: "Le briefing athlète TFCL",
        content: "Le jour de la course, l'athlète reçoit 3 règles maximum et 1 phrase clé. Pas de tableaux complexes, pas de zones multiples à retenir. Exemple : 'Interdit de dépasser 4'15\"/km avant le km 30. Si tu te sens facile, tu ne changes rien.' La simplicité est la clé de l'exécution sous stress."
      },
      {
        type: "callout",
        title: "Message TFCL officiel",
        content: "TFCL ne cherche pas l'allure parfaite, mais l'allure la plus robuste jusqu'à la ligne. La discipline de pacing n'est pas une limitation — c'est une stratégie de performance."
      }
    ]
  }
];
