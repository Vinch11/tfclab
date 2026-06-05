/**
 * TFCL Testing Week - Official Protocol Data
 * Semaine de Référence TFCL™ pour calibration VLamax V2
 */

export interface TFCLStep {
  durationMin: number;
  intensityLabel: string;
  notes?: string;
}

export interface TFCLProtocol {
  warmup: TFCLStep[];
  main: TFCLStep[];
  recovery: TFCLStep[];
  pacingCadenceRules: string[];
  validityCriteria: string[];
  dataToRecord: string[];
  /** AUDIT #3 — Variante home-trainer : notes spécifiques pour exécuter le test en intérieur sur HT (calibration, ventilation, ERG mode, biais à corriger). Les métriques de sortie sont identiques (alimentent les mêmes champs p30s_w, p60s_w, map5min_w, ftp, tte_observed_min). */
  homeTrainerNotes?: string[];
}

export interface TFCLTestDay {
  dayKey: "D-1" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
  title: string;
  goal: string;
  sessionType: "TEST" | "RECOVERY" | "REST" | "VALIDATION";
  durationEstimateMin: number;
  protocol: TFCLProtocol;
}

export interface TFCLTestingWeek {
  title: string;
  description: string;
  prerequisites: {
    equipment: string[];
    conditions: string[];
    warnings: string[];
  };
  days: TFCLTestDay[];
}

export const TFCL_TESTING_WEEK: TFCLTestingWeek = {
  title: "Semaine de Référence TFCL™",
  description: "Protocole de testing standardisé sur 8 jours pour calibrer VLamax V2 Enhanced avec précision maximale. Ce n'est pas un plan d'entraînement, mais un protocole de mesure scientifique.",
  prerequisites: {
    equipment: [
      "Capteur de puissance calibré",
      "Cardio-fréquencemètre fiable",
      "Home trainer ou parcours plat reproductible",
      "Chronomètre ou application de mesure"
    ],
    conditions: [
      "Arriver reposé (charge TSS < 300 sur 7j avant D-1)",
      "Alimentation normalisée (pas de régime restrictif)",
      "Hydratation optimale",
      "Température stable (18–24°C idéal)",
      "Sommeil ≥ 7h les 3 nuits précédentes"
    ],
    warnings: [
      "Reporter si fatigue anormale ou maladie",
      "Éviter alcool et caféine excessive 24h avant tests",
      "Prévoir 10–15 min de récup passive après chaque test",
      "Ne pas enchaîner plusieurs tests le même jour"
    ]
  },
  days: [
    {
      dayKey: "D-1",
      title: "Repos actif",
      goal: "Neutraliser la fatigue résiduelle, préparer le système nerveux",
      sessionType: "RECOVERY",
      durationEstimateMin: 45,
      protocol: {
        warmup: [],
        main: [
          { durationMin: 30, intensityLabel: "Z1–Z2", notes: "Très facile, 60–65% FTP max" },
          { durationMin: 15, intensityLabel: "Z1", notes: "Retour au calme progressif" }
        ],
        recovery: [],
        pacingCadenceRules: [
          "Cadence libre et confortable (80–90 rpm)",
          "Éviter toute accélération brutale",
          "FC < 70% FCmax"
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
      title: "TEST GLYCOLYTIQUE (P30s + P60s)",
      goal: "Mesurer la capacité glycolytique maximale via sprints anaérobies",
      sessionType: "TEST",
      durationEstimateMin: 55,
      protocol: {
        warmup: [
          { durationMin: 10, intensityLabel: "Z2", notes: "65–70% FTP, cadence 85–95 rpm" },
          { durationMin: 5, intensityLabel: "Z2→Z3", notes: "Progressif, atteindre 80% FTP en fin" },
          { durationMin: 6, intensityLabel: "Accélérations", notes: "3×10s accélérations (récup 2 min Z1 entre chaque)" },
          { durationMin: 5, intensityLabel: "Z1", notes: "Récupération complète avant le test" }
        ],
        main: [
          { durationMin: 0.5, intensityLabel: "ALL-OUT 30s", notes: "Sprint maximal, départ lancé 20–25 km/h, cadence libre naturelle (éviter >115 rpm forcé)" },
          { durationMin: 10, intensityLabel: "Z1", notes: "Récupération complète" },
          { durationMin: 1, intensityLabel: "ALL-OUT 60s", notes: "Sprint maximal, cadence cible 95–105 rpm, pacing maximal mais contrôlé" }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Z1", notes: "Retour au calme progressif" }
        ],
        pacingCadenceRules: [
          "P30s : Cadence libre, privilégier la puissance brute",
          "P60s : Cadence 95–105 rpm, contrôler le pacing",
          "Départ lancé obligatoire (pas d'arrêt complet)",
          "Éviter les pics de cadence >115 rpm non naturels"
        ],
        validityCriteria: [
          "Puissance stable ≥80% de la moyenne sur l'effort",
          "Pas de chute brutale en fin d'effort",
          "FC monte progressivement",
          "Pas de dérive cadence/power >15%",
          "RPE ≥ 9/10 en fin de sprint"
        ],
        dataToRecord: [
          "P30s avg (W)",
          "P30s max (W)",
          "HR max P30s",
          "P60s avg (W)",
          "P60s max (W)",
          "HR max P60s",
          "RPE global (1–10)",
          "Qualité protocole (1–5)"
        ],
        homeTrainerNotes: [
          "AUDIT #3 — Variante HOME-TRAINER (HT) D1 Glycolytique :",
          "Calibration : spin-down obligatoire 10 min après échauffement (sinon biais −5 à −15 W sur sprints courts)",
          "Mode résistance LIBRE (NE PAS utiliser ERG sur sprints all-out — l'ERG plafonne et fausse le P30s)",
          "Ventilateur frontal PUISSANT obligatoire (sinon dérive thermique = perte de puissance 3–8% sur le P60s)",
          "Température salle <22°C idéale, hydratation à portée de main",
          "Inertie : préférer HT direct-drive (Wahoo Kickr, Tacx Neo) — les HT à roue surestiment P30s de 5–10% à cause de l'inertie du volant",
          "Départ lancé sur HT : monter à 25 km/h équivalent (≈ 200–250 W Z2) avant de déclencher le sprint",
          "Si test outdoor disponible : préférer outdoor (référence). HT = fallback hiver/intempéries."
        ]
      }
    },
    {
      dayKey: "D2",
      title: "Récupération",
      goal: "Permettre la récupération du système glycolytique",
      sessionType: "RECOVERY",
      durationEstimateMin: 60,
      protocol: {
        warmup: [],
        main: [
          { durationMin: 45, intensityLabel: "Z1–Z2", notes: "Endurance fondamentale, <70% FTP" },
          { durationMin: 15, intensityLabel: "Z1", notes: "Très facile" }
        ],
        recovery: [],
        pacingCadenceRules: [
          "Cadence confortable 80–90 rpm",
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
      title: "TEST MAP 5 min (point court de la régression CP)",
      goal: "Mesurer la Puissance Aérobie Maximale sur 5 min. Combiné au FTP 20 min de D5, il sert de point court pour la régression Critical Power (CP) + W' (modèle Monod-Scherrer).",
      sessionType: "TEST",
      durationEstimateMin: 60,
      protocol: {
        warmup: [
          { durationMin: 15, intensityLabel: "Z2", notes: "65–70% FTP, préparer le système aérobie" },
          { durationMin: 5, intensityLabel: "85% FTP", notes: "Activation au seuil léger" },
          { durationMin: 9, intensityLabel: "Intervalles", notes: "3×1 min @105% FTP (récup 2 min Z1)" },
          { durationMin: 5, intensityLabel: "Z1", notes: "Récupération avant le test" }
        ],
        main: [
          { durationMin: 5, intensityLabel: "ALL-OUT régulier", notes: "Effort maximal soutenu 5 min. INTERDIT de partir >105% de la puissance moyenne finale prévue. Cadence 90–100 rpm." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Z1", notes: "Retour au calme progressif" }
        ],
        pacingCadenceRules: [
          "Cadence stable 90–100 rpm",
          "Pacing régulier (éviter le 'all-out' initial)",
          "Interdit de partir à >105% de la moyenne finale",
          "Accepter de monter progressivement les 60 premières secondes"
        ],
        validityCriteria: [
          "Variabilité de puissance <10%",
          "FC atteint ≥90–95% FCmax",
          "Pas de chute >5% sur la dernière minute",
          "RPE ≥ 9/10"
        ],
        dataToRecord: [
          "MAP 5min avg (W)",
          "HR avg",
          "HR max",
          "RPE (1–10)",
          "Qualité protocole (1–5)"
        ],
        homeTrainerNotes: [
          "AUDIT #3 — Variante HOME-TRAINER (HT) D3 MAP 5 min :",
          "Spin-down obligatoire après échauffement (15 min) — la dérive thermique du HT peut décaler la puissance de 5–10 W sur un effort de 5 min",
          "ERG mode AUTORISÉ et même RECOMMANDÉ : régler à la MAP 5 min cible estimée, le HT lisse les fluctuations = pacing parfait",
          "Si ERG non disponible : mode résistance fixe + pacing manuel (plus difficile, biais positive split)",
          "Ventilateur frontal OBLIGATOIRE — sans ventilation, perte de 8–12 W sur 5 min par dérive thermique",
          "Température salle <22°C, hydratation accessible",
          "Cadence stable 90–100 rpm comme outdoor — surveiller que le HT n'impose pas une cadence artificielle"
        ]
      }
    },
    {
      dayKey: "D4",
      title: "Repos complet",
      goal: "Récupération totale avant le test FTP + TTE",
      sessionType: "REST",
      durationEstimateMin: 30,
      protocol: {
        warmup: [],
        main: [
          { durationMin: 30, intensityLabel: "Z1 (optionnel)", notes: "30 min très facile OU repos complet selon sensation" }
        ],
        recovery: [],
        pacingCadenceRules: [
          "Si sortie : < 60% FTP",
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
      title: "TEST FTP + TTE (point long de la régression CP)",
      goal: "Valider/recalibrer le FTP et mesurer le Time To Exhaustion au seuil. Couplé au MAP 5 min de D3, ce point long alimente la régression Critical Power → CP + W' (≠ MAP seul, qui ne donne que la PAM).",
      sessionType: "TEST",
      durationEstimateMin: 90,
      protocol: {
        warmup: [
          { durationMin: 15, intensityLabel: "Z2", notes: "Activation progressive, 65% FTP" },
          { durationMin: 5, intensityLabel: "90% FTP", notes: "Préparation au seuil" },
          { durationMin: 10, intensityLabel: "Intervalles", notes: "2×2 min @100% FTP (récup 3 min Z1)" },
          { durationMin: 5, intensityLabel: "Z1", notes: "Récupération avant le test" }
        ],
        main: [
          { durationMin: 50, intensityLabel: "Option A : FTP connu", notes: "Tenir 100% FTP le plus longtemps possible. Arrêter si incapacité à maintenir ≥97% FTP." },
          { durationMin: 50, intensityLabel: "Option B : FTP à recalibrer", notes: "40–50 min steady max (pacing régulier). FTP = Pavg × 0.95. TTE = durée ≥ FTP." }
        ],
        recovery: [
          { durationMin: 10, intensityLabel: "Z1", notes: "Retour au calme" }
        ],
        pacingCadenceRules: [
          "Cadence stable 85–95 rpm",
          "Pacing TRÈS régulier (éviter le positive split)",
          "Acceptable : monter légèrement les 3 dernières minutes",
          "Si chute <97% FTP pendant >30s → arrêt"
        ],
        validityCriteria: [
          "Variabilité de puissance <5%",
          "Pacing constant (pas de pic initial)",
          "FC dérive logique (+5–10 bpm sur la durée)",
          "Arrêt volontaire ou incapacité physique"
        ],
        dataToRecord: [
          "FTP utilisé (W)",
          "Durée totale (TTE observé, min)",
          "Puissance moyenne (W)",
          "HR drift (%)",
          "RPE (1–10)",
          "Qualité protocole (1–5)"
        ],
        homeTrainerNotes: [
          "AUDIT #3 — Variante HOME-TRAINER (HT) D5 FTP + TTE :",
          "Spin-down obligatoire (15 min échauffement puis recalibration)",
          "ERG mode RECOMMANDÉ pour Option A (FTP connu) : régler à 100% FTP, le HT impose la puissance = TTE pur sans biais de pacing",
          "ATTENTION ERG : risque de 'death spiral' si fatigue (cadence chute, ERG augmente couple, blocage). Surveillance critique : si cadence <80 rpm pendant >10 s → ARRÊT (= TTE atteint)",
          "Option B (recalibration) : mode résistance fixe + pacing manuel, FTP = Pavg × 0.95",
          "Ventilation MAXIMALE (2 ventilateurs si possible) — un effort de 40–60 min sans ventilation perd 15–25 W par hyperthermie",
          "Hydratation 500 mL/h minimum, gel optionnel après 30 min",
          "FTP HT typiquement 3–7% inférieur au FTP outdoor (moins d'inertie, monotonie) — noter sur quel format le FTP a été mesuré pour traçabilité"
        ]
      }
    },
    {
      dayKey: "D6",
      title: "Z2 Validation",
      goal: "Validation de la récupération et de la cohérence du profil",
      sessionType: "VALIDATION",
      durationEstimateMin: 75,
      protocol: {
        warmup: [],
        main: [
          { durationMin: 60, intensityLabel: "Z2 stable", notes: "60–90 min à 65–70% FTP, cadence naturelle" },
          { durationMin: 15, intensityLabel: "Z1", notes: "Retour au calme" }
        ],
        recovery: [],
        pacingCadenceRules: [
          "Cadence naturelle et confortable",
          "Puissance stable sans variation",
          "Objectif : vérifier la récupération après D5"
        ],
        validityCriteria: [
          "HR drift <5% sur 60 min",
          "Sensation de facilité (RPE ≤ 4)",
          "Cadence stable sans fatigue"
        ],
        dataToRecord: [
          "HR drift (%)",
          "Cadence moyenne",
          "RPE (1–10)",
          "Notes confort/récupération",
          "Qualité protocole (1–5)"
        ],
        homeTrainerNotes: [
          "AUDIT #3 — Variante HOME-TRAINER (HT) D6 Z2 Validation :",
          "ERG mode IDÉAL ici : régler à 65–70% FTP, le HT impose la puissance constante = mesure pure du HR drift sans variation de pacing",
          "Ventilateur frontal OBLIGATOIRE — le HR drift sans ventilation est faussé (+8 à +15 bpm artificiel)",
          "Température salle <22°C, hydratation 500 mL/h",
          "HR drift acceptable sur HT : <8% (vs <5% outdoor) à cause de la chaleur résiduelle inévitable",
          "Si drift HT >10% : refaire avec meilleure ventilation, sinon la validation D5 n'est pas exploitable"
        ]
      }
    },
    {
      dayKey: "D7",
      title: "OFF + COHÉRENCE CHECK",
      goal: "Repos complet + validation croisée des résultats (audit #6)",
      sessionType: "REST",
      durationEstimateMin: 15,
      protocol: {
        warmup: [],
        main: [],
        recovery: [],
        pacingCadenceRules: [
          "Aucune activité sportive — repos complet",
          "Prendre 10–15 min pour remplir la table de cohérence ci-dessous"
        ],
        validityCriteria: [
          "AUDIT #6 — Table COHÉRENCE CHECK à remplir (validation croisée) :",
          "• Ratio FTP/MAP (PAM 5 min) : attendu 0.78–0.88 (élite jusqu'à 0.92) — hors plage = test à refaire",
          "• Ratio P30s/FTP : attendu 2.5–4.0 (sprinter naturel >3.5, endurant <3.0) — cohérent avec VLamax estimée",
          "• Ratio P60s/FTP : attendu 1.8–2.5 — si <1.6 = P60s sous-estimé (pacing trop conservateur)",
          "• VLamax bike estimée (sprint P30s) vs ratio FTP/MAP : VLamax >0.55 attendu si ratio FTP/MAP <0.80 (profil glycolytique), VLamax <0.40 attendu si ratio >0.86 (profil aérobie). Sinon = incohérence à investiguer.",
          "• TTE observé vs ambition : ultra/IM >55 min, competitor 45–55 min, fitness 30–45 min, débutant <30 min",
          "• HR drift Z2 D6 <5% outdoor / <8% HT = récupération validée — si >10% : reporter analyse, refaire D5+D6 dans 7 j"
        ],
        dataToRecord: [
          "Sensation générale (1–10)",
          "Cohérence des ratios (cohérent / à recalibrer)",
          "Tests à refaire éventuellement",
          "Date prévue prochaine semaine de tests (recalibration suggérée tous les 8–12 semaines, ou en cas de bloc d'entraînement majeur)"
        ]
      }
    }
  ]
};

// Helper: calcul de la complétude du profil
export interface TFCLCompletionStatus {
  isComplete: boolean;
  completedTests: string[];
  missingData: string[];
  confidenceAdjustment: number;
  message: string;
}

export function computeTFCLCompletion(snapshot: {
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  ftp?: number | null;
  tte_observed_min?: number | null;
  protocol_quality?: number | null;
}): TFCLCompletionStatus {
  const completedTests: string[] = [];
  const missingData: string[] = [];

  // D1 - Glycolytic
  if (snapshot.p30s_w && snapshot.p60s_w) {
    completedTests.push("D1 - Test Glycolytique (P30s + P60s)");
  } else {
    if (!snapshot.p30s_w) missingData.push("P30s (W)");
    if (!snapshot.p60s_w) missingData.push("P60s (W)");
  }

  // D3 - MAP
  if (snapshot.map5min_w) {
    completedTests.push("D3 - Test MAP 5 min");
  } else {
    missingData.push("MAP 5min (W)");
  }

  // D5 - FTP + TTE
  if (snapshot.ftp && snapshot.tte_observed_min) {
    completedTests.push("D5 - Test FTP + TTE");
  } else {
    if (!snapshot.ftp) missingData.push("FTP (W)");
    if (!snapshot.tte_observed_min) missingData.push("TTE observé (min)");
  }

  // Confidence adjustment based on protocol quality
  const quality = snapshot.protocol_quality ?? 3;
  let confidenceAdjustment = 0;
  if (quality <= 2) confidenceAdjustment = -0.10;
  else if (quality === 4) confidenceAdjustment = +0.05;
  else if (quality >= 5) confidenceAdjustment = +0.10;

  const isComplete = snapshot.p30s_w != null && snapshot.p60s_w != null && 
                     snapshot.map5min_w != null && snapshot.ftp != null && 
                     snapshot.tte_observed_min != null;

  const message = isComplete
    ? "Profil Référence complet VLamax V2 ✓"
    : `Profil partiel — VLamax prudente (${missingData.length} donnée(s) manquante(s))`;

  return {
    isComplete,
    completedTests,
    missingData,
    confidenceAdjustment,
    message
  };
}

// Helper: confidence label from quality
export function getProtocolQualityLabel(quality: number): string {
  switch (quality) {
    case 1: return "Très mauvais";
    case 2: return "Insuffisant";
    case 3: return "Correct";
    case 4: return "Bon";
    case 5: return "Excellent";
    default: return "Non évalué";
  }
}

export function getProtocolQualityColor(quality: number): string {
  switch (quality) {
    case 1: return "text-red-500";
    case 2: return "text-orange-500";
    case 3: return "text-yellow-500";
    case 4: return "text-emerald-500";
    case 5: return "text-green-500";
    default: return "text-muted-foreground";
  }
}
