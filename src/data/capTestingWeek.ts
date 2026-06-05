/**
 * CAP Testing Week - Official Protocol Data
 * Semaine de Référence CAP TFCL™ pour calibration VLamax CAP
 */

export interface CAPStep {
  durationMin: number;
  intensityLabel: string;
  notes?: string;
}

export interface CAPProtocol {
  warmup: CAPStep[];
  main: CAPStep[];
  recovery: CAPStep[];
  pacingRules: string[];
  validityCriteria: string[];
  dataToRecord: string[];
}

export interface CAPTestDay {
  dayKey: "D-1" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
  title: string;
  goal: string;
  sessionType: "TEST" | "RECOVERY" | "REST" | "VALIDATION";
  durationEstimateMin: number;
  protocol: CAPProtocol;
  /** Variante indoor sur tapis (treadmill). Métriques de sortie identiques au protocole piste : alimente les mêmes champs (vma, pace_threshold_sec_per_km, tte_observed_min, run_hr_drift_pct…) et donc les mêmes calculs (VLamax CAP, MLSS, économie). */
  treadmillProtocol?: CAPProtocol;
  icon: "rest" | "sprint" | "threshold" | "vma" | "endurance" | "off";
}

export interface CAPTestingWeek {
  title: string;
  description: string;
  prerequisites: {
    equipment: string[];
    conditions: string[];
    warnings: string[];
  };
  days: CAPTestDay[];
}

export const CAP_TESTING_WEEK: CAPTestingWeek = {
  title: "Semaine de Tests CAP TFCL™",
  description: "Protocole de testing standardisé sur 8 jours pour calibrer VLamax CAP avec précision maximale. Chaque test alimente l'estimation de votre profil métabolique en course à pied.",
  prerequisites: {
    equipment: [
      "Montre GPS avec précision ≤2m",
      "Cardiofréquencemètre fiable",
      "Piste 400m ou parcours plat mesuré",
      "Chronomètre ou assistant pour le sprint 15s",
      "Cônes de marquage (optionnel)",
      "Capteur de puissance running (optionnel mais recommandé)"
    ],
    conditions: [
      "Arriver reposé (charge TSS < 250 sur 7j avant D-1)",
      "Alimentation normalisée (pas de régime restrictif)",
      "Hydratation optimale",
      "Température stable (12–22°C idéal)",
      "Sommeil ≥ 7h les 3 nuits précédentes",
      "Chaussures habituelles d'entraînement (pas de nouvelles)"
    ],
    warnings: [
      "Reporter si fatigue anormale, douleur ou maladie",
      "Éviter alcool et caféine excessive 24h avant tests",
      "Prévoir 15–20 min de récup passive après chaque test",
      "Ne pas enchaîner plusieurs tests le même jour",
      "Attention aux conditions météo (vent, chaleur)"
    ]
  },
  days: [
    {
      dayKey: "D-1",
      title: "Repos actif",
      goal: "Neutraliser la fatigue résiduelle, préparer le système neuromusculaire",
      sessionType: "RECOVERY",
      durationEstimateMin: 40,
      icon: "rest",
      protocol: {
        warmup: [],
        main: [
          { durationMin: 30, intensityLabel: "Footing Z1", notes: "Très facile, conversation possible sans effort" },
          { durationMin: 10, intensityLabel: "Marche/étirements", notes: "Retour au calme, mobilité dynamique" }
        ],
        recovery: [],
        pacingRules: [
          "Allure facile : +90s à +2min/km par rapport au seuil",
          "FC < 70% FCmax",
          "Aucune accélération"
        ],
        validityCriteria: [
          "Sensation de fraîcheur en fin de session",
          "Pas de fatigue musculaire résiduelle"
        ],
        dataToRecord: [
          "FC moyenne",
          "Sensation subjective (1–10)"
        ]
      }
    },
    {
      dayKey: "D1",
      title: "TEST SPRINT 15s",
      goal: "Mesurer la capacité glycolytique maximale via sprint anaérobie",
      sessionType: "TEST",
      durationEstimateMin: 45,
      icon: "sprint",
      protocol: {
        warmup: [
          { durationMin: 10, intensityLabel: "Footing Z2", notes: "Allure confortable, activation progressive" },
          { durationMin: 5, intensityLabel: "Gammes", notes: "Montées de genoux, talons-fesses, foulées bondissantes" },
          { durationMin: 6, intensityLabel: "Accélérations", notes: "3×8s progressives (60%→80%→95%), récup 2 min marche" },
          { durationMin: 4, intensityLabel: "Récup", notes: "Marche ou footing très lent" }
        ],
        main: [
          { durationMin: 0.25, intensityLabel: "SPRINT MAXIMAL 15s (essai 1)", notes: "Départ arrêté. Effort 100% dès le départ. Un assistant chronomètre et siffle l'arrêt à 15s." },
          { durationMin: 8, intensityLabel: "Récupération longue (8 min)", notes: "Marche + footing Z1 très lent. Récup portée à 8 min (vs 5 min historique) pour garantir resynthèse PCr complète et éviter l'effet fatigue sur le 2e sprint (recommandation audit #5)." },
          { durationMin: 0.25, intensityLabel: "SPRINT MAXIMAL 15s (essai 2)", notes: "Deuxième et dernière tentative — garder la meilleure distance des 2 essais. Format réduit à 2 sprints (vs 3) pour préserver la fraîcheur glycolytique." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Footing Z1", notes: "Retour au calme progressif" }
        ],
        pacingRules: [
          "Sprint MAXIMAL dès le premier pas",
          "Ne pas regarder le chrono pendant l'effort",
          "Surface dure et régulière (piste synthétique idéale)",
          "Terrain parfaitement plat, sans vent si possible",
          "Maintenir l'effort jusqu'au signal - pas de ralentissement anticipé",
          "Format 2 sprints × 8 min de récup (audit #5) — si écart >3 m entre les 2 essais, refaire un 3e sprint après 8 min de récup supplémentaire"
        ],
        validityCriteria: [
          "Écart < 3m entre les 2 essais (reproductibilité)",
          "Pas de faux départ ni hésitation",
          "Sprint réellement maximal (sensation d'épuisement)",
          "RPE = 10/10 sur le sprint",
          "Sensation de fraîcheur identique avant chaque essai (sinon récup insuffisante)"
        ],
        dataToRecord: [
          "Distance sprint 15s - essai 1 (m)",
          "Distance sprint 15s - essai 2 (m)",
          "Meilleure distance (m)",
          "Écart entre les 2 essais (m)",
          "HR max atteinte",
          "Conditions (vent, température)",
          "Qualité protocole (1–5)"
        ]
      }
    },
    {
      dayKey: "D2",
      title: "Récupération",
      goal: "Permettre la récupération du système glycolytique",
      sessionType: "RECOVERY",
      durationEstimateMin: 45,
      icon: "rest",
      protocol: {
        warmup: [],
        main: [
          { durationMin: 35, intensityLabel: "Footing Z1", notes: "Endurance fondamentale très facile" },
          { durationMin: 10, intensityLabel: "Étirements/mobilité", notes: "Routine habituelle" }
        ],
        recovery: [],
        pacingRules: [
          "Allure très facile, conversation fluide",
          "Aucune intensité"
        ],
        validityCriteria: [
          "Sensation de récupération",
          "Jambes fraîches en fin de session"
        ],
        dataToRecord: [
          "FC moyenne",
          "Sensation (1–10)"
        ]
      }
    },
    {
      dayKey: "D3",
      title: "TEST VMA",
      goal: "Mesurer la Vitesse Maximale Aérobie",
      sessionType: "TEST",
      durationEstimateMin: 50,
      icon: "vma",
      protocol: {
        warmup: [
          { durationMin: 12, intensityLabel: "Footing Z2", notes: "Allure confortable, préparation aérobie" },
          { durationMin: 5, intensityLabel: "Gammes", notes: "Activation neuromusculaire" },
          { durationMin: 6, intensityLabel: "Progressif", notes: "2×2 min à 85% allure seuil (récup 2 min)" },
          { durationMin: 5, intensityLabel: "Récup", notes: "Marche/footing lent avant le test" }
        ],
        main: [
          { durationMin: 8, intensityLabel: "TEST VAMEVAL recommandé (durée totale > 6 min)", notes: "Option A (RECOMMANDÉE, audit #4) : Test VAMEVAL sur piste — paliers de 1 min, +0.5 km/h par palier, départ à 8 km/h. Durée totale TYPIQUE 8–14 min selon niveau. VMA = vitesse du dernier palier complet. Option B (fallback, biais +3–5%) : 6 min all-out — utiliser UNIQUEMENT si pas d'accès piste ou matériel VAMEVAL. La méthode 6 min surestime la VMA de 3–5% (départ trop rapide, pacing imparfait, peu de paliers d'incrémentation)." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Marche/footing Z1", notes: "Retour au calme progressif" }
        ],
        pacingRules: [
          "Pacing régulier (éviter le départ trop rapide)",
          "Viser une allure stable les 4 premières minutes",
          "Finir en accélérant légèrement les 90 dernières secondes",
          "Ne pas abandonner avant la fin"
        ],
        validityCriteria: [
          "FC atteint ≥95% FCmax en fin de test",
          "Variabilité d'allure < 5%",
          "RPE = 10/10 en fin d'effort",
          "Incapacité physique à continuer"
        ],
        dataToRecord: [
          "Distance parcourue (m) ou palier VAMEVAL",
          "VMA calculée (km/h)",
          "HR max atteinte",
          "HR moyenne",
          "Temps total (si 6 min test)",
          "RPE (1–10)",
          "Qualité protocole (1–5)"
        ]
      },
      treadmillProtocol: {
        warmup: [
          { durationMin: 12, intensityLabel: "Footing Z2 tapis (pente 1%)", notes: "Pente 1% obligatoire (Jones 1996) pour compenser absence résistance air" },
          { durationMin: 5, intensityLabel: "Gammes au sol (hors tapis)", notes: "Activation neuromusculaire à côté du tapis" },
          { durationMin: 6, intensityLabel: "Progressif tapis", notes: "2×2 min à 90% VMA estimée, pente 1%, récup 2 min marche" },
          { durationMin: 5, intensityLabel: "Récup", notes: "Marche tapis 5 km/h" }
        ],
        main: [
          { durationMin: 12, intensityLabel: "RAMPE TAPIS — départ 8 km/h, +0.5 km/h/min", notes: "Pente 1%. Protocole rampe (plus fiable que 6 min all-out sur tapis car évite l'inertie de calage). Continuer jusqu'à incapacité de tenir le palier ≥45s. VMA = vitesse du dernier palier complet." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Marche tapis 5 km/h pente 0%", notes: "Retour au calme + descendre du tapis dès récup HR <120" }
        ],
        pacingRules: [
          "Pente fixée à 1% (Jones 1996) — équivalent énergétique terrain",
          "Ventilateur frontal puissant OBLIGATOIRE (sinon FC artificiellement élevée)",
          "Température ambiante idéale 16–20°C",
          "Calibration vitesse tapis : courir 1 km mesuré au préalable et comparer affichage vs distance réelle",
          "Ne JAMAIS sauter du tapis en mouvement — ralentir progressivement"
        ],
        validityCriteria: [
          "FC ≥95% FCmax au dernier palier",
          "RPE = 10/10",
          "Dernier palier tenu ≥45s (sinon prendre l'avant-dernier)",
          "Pas de fuite de l'effort (tenir la barre = invalide)"
        ],
        dataToRecord: [
          "Vitesse dernier palier complet (km/h) → VMA",
          "Pente utilisée (%)",
          "HR max atteinte",
          "HR moyenne dernière minute",
          "RPE (1–10)",
          "Modèle tapis + calibration vitesse (oui/non)",
          "Qualité protocole (1–5)"
        ]
      }
    },
    {
      dayKey: "D4",
      title: "Repos complet",
      goal: "Récupération totale avant le test seuil",
      sessionType: "REST",
      durationEstimateMin: 30,
      icon: "off",
      protocol: {
        warmup: [],
        main: [
          { durationMin: 25, intensityLabel: "Footing Z1 (optionnel)", notes: "20–30 min très facile OU repos complet selon sensation" },
          { durationMin: 5, intensityLabel: "Mobilité", notes: "Étirements doux" }
        ],
        recovery: [],
        pacingRules: [
          "Si sortie : allure très facile (+2min/km vs seuil)",
          "Objectif : jambes fraîches pour D5"
        ],
        validityCriteria: [
          "Sensation de récupération complète",
          "Motivation haute pour D5"
        ],
        dataToRecord: [
          "Sensation (1–10)",
          "Qualité du sommeil"
        ]
      }
    },
    {
      dayKey: "D5",
      title: "TEST ALLURE SEUIL + TTE",
      goal: "Mesurer l'allure seuil et le Time To Exhaustion",
      sessionType: "TEST",
      durationEstimateMin: 75,
      icon: "threshold",
      protocol: {
        warmup: [
          { durationMin: 12, intensityLabel: "Footing Z2", notes: "Activation progressive" },
          { durationMin: 5, intensityLabel: "Gammes", notes: "Préparation neuromusculaire" },
          { durationMin: 8, intensityLabel: "Progressif", notes: "2×3 min à 90% allure seuil estimée (récup 2 min)" },
          { durationMin: 5, intensityLabel: "Récup", notes: "Marche avant le test" }
        ],
        main: [
          { durationMin: 30, intensityLabel: "30 min au seuil (calage allure)", notes: "Effort maximal soutenable sur 30 min. Allure régulière du début à la fin. Si vous tenez aisément 30 min, l'allure était trop basse." },
          { durationMin: 45, intensityLabel: "Extension TTE — jusqu'à épuisement (cap 45 min)", notes: "AUDIT #2 — extension étendue de 5 à 45 min : continuer à l'allure seuil jusqu'à incapacité physique de maintenir l'allure (chute >5 s/km pendant >30 s). Arrêt obligatoire à 45 min de TTE total (30 + 15) pour éviter biais glycogénique. Cette extension permet de discriminer correctement les profils competitor (TTE 45–55 min) et elite (TTE 55–70 min), impossible avec une extension limitée à 5 min." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Marche/footing Z1", notes: "Retour au calme" }
        ],
        pacingRules: [
          "Pacing TRÈS régulier (éviter le positive split)",
          "Viser une allure constante à ±5s/km",
          "Terrain plat obligatoire",
          "Utiliser les 3 premiers km pour caler l'allure",
          "Acceptable : finir légèrement plus vite les 2 derniers km"
        ],
        validityCriteria: [
          "Variabilité d'allure < 3%",
          "Sensation 'confortablement difficile' tout au long",
          "FC dérive logique (+5–10 bpm sur la durée)",
          "RPE 8–9/10 à la fin des 30 min"
        ],
        dataToRecord: [
          "Allure moyenne sur 30 min (min:sec/km)",
          "Allure en secondes/km",
          "Distance totale (m)",
          "HR moyenne",
          "HR max",
          "HR drift (%)",
          "TTE total si extension (min)",
          "RPE (1–10)",
          "Qualité protocole (1–5)"
        ]
      },
      treadmillProtocol: {
        warmup: [
          { durationMin: 12, intensityLabel: "Footing Z2 tapis (pente 1%)", notes: "Activation aérobie progressive, ventilateur ON" },
          { durationMin: 5, intensityLabel: "Gammes au sol", notes: "Hors tapis" },
          { durationMin: 8, intensityLabel: "Progressif tapis", notes: "2×3 min à 90% allure seuil estimée (pente 1%), récup 2 min marche" },
          { durationMin: 5, intensityLabel: "Récup", notes: "Marche tapis 5 km/h" }
        ],
        main: [
          { durationMin: 25, intensityLabel: "25 min vitesse seuil FIXÉE (pente 1%)", notes: "Démarrer à 90% VMA. Vitesse imposée par tapis = pacing PARFAIT. Si tenu 'confortablement difficile' = OK." },
          { durationMin: 45, intensityLabel: "Extension TTE — +0.3 km/h jusqu'à épuisement (cap 45 min)", notes: "AUDIT #2 — extension étendue : si encore capable de parler en mots courts à la fin des 25 min, augmenter de +0.3 km/h et tenir jusqu'à incapacité (= TTE). Cap absolu 45 min de TTE total (25 + 20) pour éviter biais glycogénique. Permet de discriminer competitor (45–55 min) vs elite (55–70 min). Si chute de vitesse impossible sur tapis : test invalide → refaire 0.3 km/h plus bas." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Marche tapis 5 km/h", notes: "Retour au calme + boire" }
        ],
        pacingRules: [
          "Pente 1% obligatoire",
          "Ventilateur frontal puissant + temp <22°C (sinon FC artificiellement +10 bpm)",
          "Vitesse FIXÉE — aucune variation autorisée pendant 25 min",
          "Si vitesse a dû être baissée → test INVALIDE, refaire 0.3 km/h plus bas",
          "Calibration vitesse tapis vérifiée (1 km mesuré)"
        ],
        validityCriteria: [
          "Vitesse maintenue 25 min sans baisse",
          "FC dérive +5–10 bpm (acceptable jusqu'à +12 avec chaleur tapis)",
          "RPE 8–9/10 à la fin",
          "Sensation confortablement difficile tout au long"
        ],
        dataToRecord: [
          "Vitesse seuil tapis (km/h) → converti en s/km pour pace_threshold_sec_per_km",
          "Pente (%)",
          "HR moyenne",
          "HR max",
          "HR drift (%)",
          "TTE total si extension (min)",
          "RPE (1–10)",
          "Température salle (°C)",
          "Ventilateur (oui/non)",
          "Qualité protocole (1–5)"
        ]
      }
    },
    {
      dayKey: "D6",
      title: "Endurance Validation + TEST Économie de Course (RE)",
      goal: "Validation de la récupération + mesure de l'économie de course (CE en kJ/km) — AUDIT #1",
      sessionType: "VALIDATION",
      durationEstimateMin: 75,
      icon: "endurance",
      protocol: {
        warmup: [
          { durationMin: 15, intensityLabel: "Footing Z2 progressif", notes: "Activation aérobie, finir à 80% allure seuil" }
        ],
        main: [
          { durationMin: 35, intensityLabel: "Footing Z2 stable", notes: "35 min à allure endurance fondamentale (~70% allure seuil) — sert de baseline HR drift" },
          { durationMin: 12, intensityLabel: "TEST RE — 3×1 km allure marathon", notes: "AUDIT #1 — bloc d'économie de course : 3×1 km à allure marathon estimée (~85% allure seuil, ~88–92% FC seuil), récup 90 s footing lent entre chaque répétition. Mesurer puissance running moyenne (W) + FC stable sur le 3e km. CE (kJ/km) = (puissance moyenne W × 1 km × 3.6) / vitesse (km/h). Cible : CE 0.95–1.10 kJ/kg/km (élite <0.95). Nécessite capteur de puissance running (Stryd, COROS POD2, Garmin RD Pod)." },
          { durationMin: 10, intensityLabel: "Retour au calme", notes: "Footing Z1 + marche + étirements" }
        ],
        recovery: [],
        pacingRules: [
          "Bloc Z2 : allure stable et confortable, conversation fluide",
          "Bloc 3×1km : allure marathon RÉGULIÈRE (±3 s/km), pas de positive split",
          "Récup 90 s entre les 1km — footing lent (pas de marche complète)",
          "Si pas de capteur de puissance : enregistrer FC moyenne 3e km + allure → estimation CE via Léger/Di Prampero"
        ],
        validityCriteria: [
          "HR drift < 5% sur le bloc Z2 de 35 min",
          "Bloc 3×1km : variabilité allure < 2% entre les 3 répétitions",
          "FC stabilisée sur le 3e km (plateau aérobie atteint)",
          "Sensation 'confortablement soutenable' sur les 1km (RPE 6–7/10)",
          "Foulée fluide sans dégradation technique"
        ],
        dataToRecord: [
          "Allure moyenne Z2 (min:sec/km)",
          "HR drift Z2 (%)",
          "Allure moyenne 3×1km (min:sec/km)",
          "FC moyenne 3e km (bpm)",
          "Puissance running moyenne 3e km (W) — si capteur",
          "CE calculée (kJ/km ou kJ/kg/km)",
          "RPE (1–10)",
          "Notes confort/récupération",
          "Qualité protocole (1–5)"
        ]
      },
      treadmillProtocol: {
        warmup: [
          { durationMin: 15, intensityLabel: "Footing Z2 tapis (pente 1%)", notes: "Activation progressive, ventilateur ON" }
        ],
        main: [
          { durationMin: 35, intensityLabel: "Vitesse FIXE = 70% allure seuil tapis (pente 1%)", notes: "Vitesse imposée 35 min, ventilateur ON. Mesure pure de la dérive cardiaque (HR drift) sans variation pacing — alimente run_hr_drift_pct et run_economy." },
          { durationMin: 12, intensityLabel: "TEST RE tapis — 3×1 km allure marathon (pente 1%)", notes: "AUDIT #1 — bloc d'économie de course tapis : 3×1 km à vitesse fixée correspondant à ~85% allure seuil (pente 1%), récup 90 s marche 5 km/h entre chaque répétition. Mesurer puissance running + FC stable sur le 3e km. CE (kJ/km) calculée comme outdoor. Tapis = pacing parfait, idéal pour RE." },
          { durationMin: 10, intensityLabel: "Marche tapis", notes: "Retour au calme" }
        ],
        recovery: [],
        pacingRules: [
          "Pente 1% obligatoire (tapis)",
          "Ventilateur frontal OBLIGATOIRE (sinon dérive HR faussée par chaleur)",
          "Vitesse FIXE sur le bloc Z2 — aucune variation",
          "Bloc 3×1km : 3 paliers de 1 km à vitesse correspondant à ~85% allure seuil, récup 90 s marche 5 km/h",
          "Hydratation autorisée pendant l'effort"
        ],
        validityCriteria: [
          "HR drift < 5% sur le bloc Z2 de 35 min (idéal)",
          "HR drift < 8% (acceptable avec chaleur tapis)",
          "Bloc 3×1km : FC stabilisée sur le 3e km (plateau aérobie)",
          "RPE ≤ 4/10 sur Z2, 6–7/10 sur 1km",
          "Si drift Z2 >8% → ventilation insuffisante, refaire"
        ],
        dataToRecord: [
          "Vitesse imposée Z2 (km/h)",
          "HR drift Z2 (%)",
          "Vitesse imposée 3×1km (km/h)",
          "FC moyenne 3e km (bpm)",
          "Puissance running moyenne 3e km (W) — si capteur",
          "CE calculée (kJ/km ou kJ/kg/km)",
          "RPE début/fin",
          "Température salle",
          "Ventilateur (oui/non)",
          "Qualité protocole (1–5)"
        ]
      }
    },
    {
      dayKey: "D7",
      title: "OFF + COHÉRENCE CHECK",
      goal: "Repos complet + validation croisée des résultats (audit #6)",
      sessionType: "REST",
      durationEstimateMin: 15,
      icon: "off",
      protocol: {
        warmup: [],
        main: [],
        recovery: [],
        pacingRules: [
          "Aucune activité sportive — repos complet",
          "Prendre 10–15 min pour remplir la table de cohérence ci-dessous"
        ],
        validityCriteria: [
          "AUDIT #6 — Table COHÉRENCE CHECK à remplir (validation croisée) :",
          "• Ratio allure seuil / VMA = pace_seuil_kmh / VMA → attendu 0.85–0.92 (élite jusqu'à 0.93)",
          "• Ratio VLamax (sprint) / Allure seuil : VLamax >0.55 + ratio seuil/VMA <0.83 = profil glycolytique (cohérent)",
          "• VLamax <0.40 + ratio seuil/VMA >0.88 = profil aérobie/économie (cohérent)",
          "• VLamax >0.55 + ratio seuil/VMA >0.90 = INCOHÉRENT (probable sous-estimation sprint OU surestimation seuil)",
          "• VLamax <0.40 + ratio seuil/VMA <0.83 = INCOHÉRENT (probable surestimation sprint OU sous-estimation seuil)",
          "• TTE observé vs ambition : ultra >55 min, competitor 45–55 min, fitness 30–45 min, débutant <30 min",
          "• HR drift Z2 D6 < 5% = récupération validée — si >8% : reporter analyse, refaire D5+D6 dans 7 j"
        ],
        dataToRecord: [
          "Sensation générale (1–10)",
          "Cohérence des ratios (cohérent / à recalibrer)",
          "Tests à refaire éventuellement",
          "Date prévue prochaine semaine de tests (recalibration suggérée tous les 8–12 semaines)"
        ]
      }
    }
  ]
};

// Helper: calcul de la complétude du profil CAP
export interface CAPCompletionStatus {
  isComplete: boolean;
  completedTests: string[];
  missingData: string[];
  confidenceAdjustment: number;
  message: string;
}

export function computeCAPCompletion(snapshot: {
  sprint_15s_distance?: number | null;
  vma?: number | null;
  pace_threshold_sec_per_km?: number | null;
  tte_observed_min?: number | null;
  tte_observed_min_run?: number | null;
  running_power_max?: number | null;
  running_power_threshold?: number | null;
  protocol_quality?: number | null;
}): CAPCompletionStatus {
  const completedTests: string[] = [];
  const missingData: string[] = [];

  // D1 - Sprint 15s
  if (snapshot.sprint_15s_distance) {
    completedTests.push("D1 - Sprint 15s");
  } else {
    missingData.push("Sprint 15s (m)");
  }

  // D3 - VMA
  if (snapshot.vma) {
    completedTests.push("D3 - Test VMA");
  } else {
    missingData.push("VMA (km/h)");
  }

  // D5 - Allure Seuil + TTE
  if (snapshot.pace_threshold_sec_per_km) {
    completedTests.push("D5 - Allure Seuil");
  } else {
    missingData.push("Allure Seuil (s/km)");
  }
  
  // TTE CAP = champ dédié `tte_observed_min_run` (séparé du TTE vélo)
  const tteCap = snapshot.tte_observed_min_run ?? null;
  if (tteCap) {
    completedTests.push("D5 - TTE observé");
  } else {
    missingData.push("TTE observé (min)");
  }

  // Bonus: Running Power (optionnel mais améliore la précision)
  if (snapshot.running_power_max && snapshot.running_power_threshold) {
    completedTests.push("Données Puissance CAP (bonus)");
  }

  // Confidence adjustment based on protocol quality
  const quality = snapshot.protocol_quality ?? 3;
  let confidenceAdjustment = 0;
  if (quality <= 2) confidenceAdjustment = -0.10;
  else if (quality === 4) confidenceAdjustment = +0.05;
  else if (quality >= 5) confidenceAdjustment = +0.10;

  // Core requirements: sprint + VMA + allure seuil
  const isComplete = snapshot.sprint_15s_distance != null && 
                     snapshot.vma != null && 
                     snapshot.pace_threshold_sec_per_km != null;

  const message = isComplete
    ? "Profil CAP complet - VLamax CAP calibrée ✓"
    : `Profil CAP partiel — ${missingData.length} donnée(s) manquante(s)`;

  return {
    isComplete,
    completedTests,
    missingData,
    confidenceAdjustment,
    message
  };
}
