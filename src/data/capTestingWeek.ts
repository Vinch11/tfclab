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
          { durationMin: 0.25, intensityLabel: "SPRINT MAXIMAL 15s", notes: "Départ arrêté. Effort 100% dès le départ. Un assistant chronomètre et siffle l'arrêt à 15s." },
          { durationMin: 5, intensityLabel: "Récupération", notes: "Marche complète" },
          { durationMin: 0.25, intensityLabel: "SPRINT MAXIMAL 15s (essai 2)", notes: "Deuxième tentative pour confirmer ou améliorer" },
          { durationMin: 5, intensityLabel: "Récupération", notes: "Marche complète" },
          { durationMin: 0.25, intensityLabel: "SPRINT MAXIMAL 15s (essai 3)", notes: "Troisième tentative - garder la meilleure distance" }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Footing Z1", notes: "Retour au calme progressif" }
        ],
        pacingRules: [
          "Sprint MAXIMAL dès le premier pas",
          "Ne pas regarder le chrono pendant l'effort",
          "Surface dure et régulière (piste synthétique idéale)",
          "Terrain parfaitement plat, sans vent si possible",
          "Maintenir l'effort jusqu'au signal - pas de ralentissement anticipé"
        ],
        validityCriteria: [
          "Écart < 3m entre les 3 essais (reproductibilité)",
          "Pas de faux départ ni hésitation",
          "Sprint réellement maximal (sensation d'épuisement)",
          "RPE = 10/10 sur le sprint"
        ],
        dataToRecord: [
          "Distance sprint 15s - essai 1 (m)",
          "Distance sprint 15s - essai 2 (m)",
          "Distance sprint 15s - essai 3 (m)",
          "Meilleure distance (m)",
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
          { durationMin: 6, intensityLabel: "TEST VAMEVAL ou 6 min ALL-OUT", notes: "Option A : Test VAMEVAL sur piste. Option B : 6 min effort maximal régulier. VMA = distance / 6 × 10 (km/h)" }
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
          { durationMin: 30, intensityLabel: "30 min au seuil", notes: "Effort maximal soutenable sur 30 min. Allure régulière du début à la fin. Si vous tenez aisément 30 min, l'allure était trop basse." },
          { durationMin: 5, intensityLabel: "Extension TTE (optionnel)", notes: "Si possible, continuez jusqu'à l'épuisement pour mesurer le TTE réel au seuil" }
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
          { durationMin: 5, intensityLabel: "Extension TTE — +0.3 km/h", notes: "Si encore capable de parler en mots courts, augmenter de +0.3 km/h et tenir jusqu'à incapacité (= TTE). Si chute de vitesse impossible sur tapis : test invalide → refaire 0.3 km/h plus bas." }
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
      title: "Endurance Validation",
      goal: "Validation de la récupération et cohérence du profil",
      sessionType: "VALIDATION",
      durationEstimateMin: 60,
      icon: "endurance",
      protocol: {
        warmup: [],
        main: [
          { durationMin: 50, intensityLabel: "Footing Z2 stable", notes: "50–60 min à allure endurance fondamentale (~70% allure seuil)" },
          { durationMin: 10, intensityLabel: "Retour au calme", notes: "Marche + étirements" }
        ],
        recovery: [],
        pacingRules: [
          "Allure stable et confortable",
          "Conversation fluide possible",
          "Objectif : vérifier la récupération après D5"
        ],
        validityCriteria: [
          "HR drift < 5% sur 50 min",
          "Sensation de facilité (RPE ≤ 4)",
          "Foulée fluide sans fatigue"
        ],
        dataToRecord: [
          "Allure moyenne",
          "HR drift (%)",
          "RPE (1–10)",
          "Notes confort/récupération",
          "Qualité protocole (1–5)"
        ]
      },
      treadmillProtocol: {
        warmup: [],
        main: [
          { durationMin: 50, intensityLabel: "Vitesse FIXE = 70% allure seuil tapis (pente 1%)", notes: "Vitesse imposée 50 min, ventilateur ON. Mesure pure de la dérive cardiaque (HR drift) sans variation pacing — alimente run_hr_drift_pct et run_economy." },
          { durationMin: 10, intensityLabel: "Marche tapis", notes: "Retour au calme" }
        ],
        recovery: [],
        pacingRules: [
          "Pente 1% obligatoire",
          "Ventilateur frontal OBLIGATOIRE (sinon dérive HR faussée par chaleur)",
          "Vitesse FIXE — aucune variation",
          "Hydratation autorisée pendant l'effort"
        ],
        validityCriteria: [
          "HR drift < 5% sur 50 min (idéal)",
          "HR drift < 8% (acceptable avec chaleur tapis)",
          "RPE ≤ 4/10 stable",
          "Si drift >8% → ventilation insuffisante, refaire"
        ],
        dataToRecord: [
          "Vitesse imposée (km/h)",
          "HR moyenne 5 premières min vs 5 dernières min → HR drift %",
          "RPE début/fin",
          "Température salle",
          "Ventilateur (oui/non)",
          "Qualité protocole (1–5)"
        ]
      }
    },
    {
      dayKey: "D7",
      title: "OFF",
      goal: "Repos complet pour assimilation",
      sessionType: "REST",
      durationEstimateMin: 0,
      icon: "off",
      protocol: {
        warmup: [],
        main: [],
        recovery: [],
        pacingRules: [],
        validityCriteria: [
          "Pas d'activité sportive",
          "Récupération mentale et physique"
        ],
        dataToRecord: [
          "Sensation générale (1–10)"
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
