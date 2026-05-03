/**
 * F8 — Ergogenic Aids Protocol Engine
 *
 * Références :
 *  - Maughan et al. 2018 — IOC Consensus Statement on Dietary Supplements
 *  - Jones 2014 — Dietary nitrate / beetroot juice
 *  - Saunders et al. 2017 — Beta-alanine meta-analysis
 *  - Kreider et al. 2017 — ISSN Position Stand on Creatine
 *  - Grgic et al. 2021 — Sodium bicarbonate meta-analysis
 *
 * Aides retenues (preuves A/B uniquement) :
 *  - Nitrates (jus de betterave) — 6–12 mmol NO₃⁻, 2–3h pré-effort, efforts 4–30 min
 *  - Beta-alanine — 3.2–6.4 g/j chronique (4–12 sem), efforts 1–10 min
 *  - Créatine monohydrate — 3–5 g/j chronique, sprints répétés / force
 *  - Bicarbonate de sodium — 0.2–0.3 g/kg, 60–180 min pré-effort, efforts 1–7 min
 *  - Caféine traitée séparément (F3)
 */

export type RaceProfile = "sprint" | "short" | "middle" | "long" | "ultra";

export type SourceTag = "IOC" | "ISSN" | "Meta-analysis" | "RCT" | "BJSM" | "Sports Med";

export interface AidCitation {
  /** Auteur année — résumé court */
  ref: string;
  /** Tags d'autorité affichés en chips (IOC, ISSN…) */
  tags: SourceTag[];
  /** DOI ou URL si dispo */
  doi?: string;
}

export interface ErgogenicAidsInput {
  weightKg: number | null;
  durationMin: number;
  /** Course explosive avec efforts répétés (sprints, attaques, côtes courtes) */
  hasRepeatedEfforts?: boolean;
  /** Tolérance GI déjà testée au bicarbonate */
  bicarbTested?: boolean;
  /** Régime végétarien/vegan (créatine plus impactante) */
  vegetarian?: boolean;
}

export interface AidProtocol {
  name: string;
  evidenceLevel: "A" | "B" | "C";
  recommended: boolean;
  reason: string;
  dose: string | null;
  timing: string | null;
  loadingPhase: string | null;
  /** Source courte legacy (compat affichage) */
  source: string;
  warnings: string[];
  /** Hypothèses sous-jacentes (staff mode) */
  assumptions: string[];
  /** Citations détaillées avec tags d'autorité (staff mode) */
  citations: AidCitation[];
  /** Mécanisme d'action court (staff mode) */
  mechanism: string;
}

export interface ErgogenicAidsResult {
  isApplicable: boolean;
  raceProfile: RaceProfile;
  aids: AidProtocol[];
  globalNotes: string[];
  references: string[];
}

// =============================================
// CLASSIFICATION DURÉE
// =============================================

function classifyRace(durationMin: number): RaceProfile {
  if (durationMin < 2) return "sprint";
  if (durationMin <= 10) return "short";
  if (durationMin <= 40) return "middle";
  if (durationMin <= 240) return "long";
  return "ultra";
}

// =============================================
// LOGIQUE PAR SUPPLÉMENT
// =============================================

function buildNitrates(profile: RaceProfile): AidProtocol {
  const recommended = profile === "short" || profile === "middle" || profile === "long";
  return {
    name: "Nitrates (jus de betterave)",
    evidenceLevel: "A",
    recommended,
    reason: recommended
      ? "Réduit coût en O₂ de 3–5 % et améliore TT 1–3 %"
      : profile === "ultra"
      ? "Bénéfice limité au-delà de 4h — pas prioritaire"
      : "Sprint <2 min : pas d'effet ergogénique démontré",
    dose: recommended ? "6–12 mmol NO₃⁻ (≈ 2 shots de 70 mL ou 500 mL jus)" : null,
    timing: recommended ? "T-150 min (pic plasma à 2–3h)" : null,
    loadingPhase: recommended ? "Optionnel : 3–6 jours à 6 mmol/j pour potentialisation" : null,
    source: "Jones 2014, Domínguez 2017",
    warnings: [
      "Éviter bain de bouche antiseptique 24h avant (détruit bactéries buccales nécessaires)",
      "Urines/selles colorées : normal et bénin",
    ],
    mechanism:
      "NO₃⁻ → NO₂⁻ (bactéries buccales) → NO : vasodilatation, ↓coût mitochondrial de l'ATP, ↑efficience contractile (fibres II).",
    assumptions: [
      "Athlète non-élite (effet réduit chez VO₂max >70 mL/kg/min — Porcelli 2015)",
      "Microbiote buccal intact (pas d'antiseptique <24h)",
      "Effort ≥40 % VO₂max (peu d'effet à intensité modérée)",
      "Statut nitrate alimentaire bas-modéré (légumes verts <200 g/j)",
    ],
    citations: [
      {
        ref: "Maughan 2018 — IOC Consensus on Dietary Supplements",
        tags: ["IOC"],
        doi: "10.1136/bjsports-2018-099027",
      },
      {
        ref: "Jones 2014 — Dietary nitrate and physical performance",
        tags: ["Sports Med"],
        doi: "10.1007/s40279-014-0149-y",
      },
      {
        ref: "Domínguez 2017 — Effects of beetroot juice on endurance (meta)",
        tags: ["Meta-analysis"],
        doi: "10.3390/nu9010043",
      },
    ],
  };
}

function buildBetaAlanine(profile: RaceProfile, hasRepeated: boolean): AidProtocol {
  const recommended = profile === "short" || profile === "middle" || hasRepeated;
  return {
    name: "Beta-alanine",
    evidenceLevel: "A",
    recommended,
    reason: recommended
      ? "Augmente carnosine musculaire → tampon H⁺, +2–3 % sur 1–10 min"
      : "Bénéfice marginal hors zone glycolytique soutenue",
    dose: recommended ? "3.2–6.4 g/j fractionnés en 2–4 prises de 0.8–1.6 g" : null,
    timing: recommended ? "Chronique uniquement — pas de dose pré-effort utile" : null,
    loadingPhase: recommended
      ? "4–12 semaines de charge (saturation carnosine ~10 sem)"
      : null,
    source: "Saunders 2017, Trexler 2015 (ISSN)",
    warnings: [
      "Paresthésies (fourmillements) si dose unique >0.8 g — fractionner",
      "Effet nul si pris uniquement le jour de course",
    ],
    mechanism:
      "Beta-alanine = facteur limitant de la synthèse de carnosine intramusculaire (tampon H⁺ pK 6.83). Saturation après 4–10 sem augmente capacité tampon de 30–80 %.",
    assumptions: [
      "Cycle de charge ≥4 semaines avant compétition",
      "Effort dans la fenêtre 1–10 min (production lactate maximale)",
      "Pas de co-supplémentation taurine (compétition transport)",
      "Réponse interindividuelle ±50 % (mesure carnosine non standard)",
    ],
    citations: [
      {
        ref: "Maughan 2018 — IOC Consensus on Dietary Supplements",
        tags: ["IOC"],
        doi: "10.1136/bjsports-2018-099027",
      },
      {
        ref: "Saunders 2017 — Beta-alanine supplementation (meta, n=40 RCTs)",
        tags: ["Meta-analysis", "BJSM"],
        doi: "10.1136/bjsports-2016-096396",
      },
      {
        ref: "Trexler 2015 — ISSN Position Stand: Beta-Alanine",
        tags: ["ISSN"],
        doi: "10.1186/s12970-015-0090-y",
      },
    ],
  };
}

function buildCreatine(hasRepeated: boolean, vegetarian: boolean): AidProtocol {
  const recommended = hasRepeated || vegetarian;
  return {
    name: "Créatine monohydrate",
    evidenceLevel: "A",
    recommended,
    reason: recommended
      ? vegetarian
        ? "Stocks musculaires bas chez végétariens — gain typique +20 %"
        : "Améliore puissance répétée (sprints, relances, côtes)"
      : "Endurance pure : bénéfice non démontré",
    dose: recommended ? "3–5 g/j en continu (pas de cyclage nécessaire)" : null,
    timing: recommended ? "Indifférent — co-ingestion glucides/protéines optimise capture" : null,
    loadingPhase: recommended
      ? "Optionnelle : 20 g/j × 5–7 j puis 3–5 g/j (sinon saturation en 3–4 sem)"
      : null,
    source: "Kreider 2017 (ISSN), Cooper 2012",
    warnings: [
      "Prise de poids 0.5–1.5 kg (rétention hydrique intracellulaire) — peser pour course en montagne",
      "Préférer monohydrate certifié (Creapure®) — formes alternatives non supérieures",
    ],
    mechanism:
      "↑ phosphocréatine intramusculaire → resynthèse ATP plus rapide en effort <30 s. Effet secondaire : signalisation anabolique mTOR.",
    assumptions: [
      "Stocks musculaires non saturés au baseline (omnivores : ~120 mmol/kg DM)",
      "Pas d'insuffisance rénale (créatininémie suivie si charge)",
      "Hydratation adéquate ≥35 mL/kg/j",
      "Pas de bénéfice ergogénique direct sur endurance pure (>30 min continu)",
    ],
    citations: [
      {
        ref: "Maughan 2018 — IOC Consensus on Dietary Supplements",
        tags: ["IOC"],
        doi: "10.1136/bjsports-2018-099027",
      },
      {
        ref: "Kreider 2017 — ISSN Position Stand: Creatine",
        tags: ["ISSN"],
        doi: "10.1186/s12970-017-0173-z",
      },
      {
        ref: "Cooper 2012 — Creatine and exercise performance review",
        tags: ["Meta-analysis"],
        doi: "10.1186/1550-2783-9-33",
      },
    ],
  };
}

function buildBicarbonate(profile: RaceProfile, weightKg: number | null, tested: boolean): AidProtocol {
  const recommended = (profile === "short" || profile === "middle") && tested;
  const dose = weightKg && recommended ? `${(0.2 * weightKg).toFixed(0)}–${(0.3 * weightKg).toFixed(0)} g (0.2–0.3 g/kg)` : null;
  return {
    name: "Bicarbonate de sodium (NaHCO₃)",
    evidenceLevel: "B",
    recommended,
    reason: recommended
      ? "Tampon extracellulaire H⁺, +2 % sur efforts 1–7 min"
      : !tested && (profile === "short" || profile === "middle")
      ? "À tester d'abord à l'entraînement (risque GI majeur)"
      : "Hors fenêtre d'efficacité (efforts trop courts ou trop longs)",
    dose,
    timing: recommended ? "T-90 à T-180 min — fractionner avec repas riche en glucides" : null,
    loadingPhase: recommended
      ? "Alternative : protocole chronique 0.5 g/kg/j × 3–7 j (réduit GI)"
      : null,
    source: "Grgic 2021, McNaughton 2016",
    warnings: [
      "Risque GI majeur (50 % des utilisateurs naïfs) — JAMAIS en course sans test préalable",
      "Apport sodium massif : intégrer dans le bilan hydratation (F6)",
      "Formes gastro-résistantes (capsules entériques) réduisent significativement les troubles GI",
    ],
    mechanism:
      "↑ HCO₃⁻ plasmatique → gradient pH transmembranaire → efflux H⁺ et lactate hors du muscle, retarde l'acidose métabolique.",
    assumptions: [
      "Tolérance GI validée à l'entraînement (≥2 essais)",
      "Pas d'HTA non contrôlée ni régime sodé restrictif médical",
      "Co-ingestion glucides 1–1.5 g/kg pour lisser absorption",
      "Effort majoritairement glycolytique (lactate >8 mmol/L attendu)",
    ],
    citations: [
      {
        ref: "Maughan 2018 — IOC Consensus on Dietary Supplements",
        tags: ["IOC"],
        doi: "10.1136/bjsports-2018-099027",
      },
      {
        ref: "Grgic 2021 — Sodium bicarbonate meta-analysis",
        tags: ["Meta-analysis", "Sports Med"],
        doi: "10.1007/s40279-020-01394-6",
      },
      {
        ref: "McNaughton 2016 — Bicarbonate, performance and side effects review",
        tags: ["Sports Med"],
        doi: "10.1007/s40279-016-0509-x",
      },
    ],
  };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeErgogenicAids(input: ErgogenicAidsInput): ErgogenicAidsResult {
  const { weightKg, durationMin, hasRepeatedEfforts = false, bicarbTested = false, vegetarian = false } = input;

  const baseRefs = [
    "Maughan et al. 2018 — IOC Consensus on Dietary Supplements",
    "Jones 2014 — Dietary nitrate (Sports Med)",
    "Saunders et al. 2017 — Beta-alanine meta-analysis (BJSM)",
    "Kreider et al. 2017 — ISSN Position Stand on Creatine",
    "Trexler et al. 2015 — ISSN Position Stand on Beta-Alanine",
    "Grgic et al. 2021 — Sodium bicarbonate meta-analysis (Sports Med)",
  ];

  if (!weightKg || weightKg < 30 || durationMin <= 0) {
    return {
      isApplicable: false,
      raceProfile: "long",
      aids: [],
      globalNotes: ["Poids athlète et durée d'effort requis."],
      references: baseRefs,
    };
  }

  const raceProfile = classifyRace(durationMin);

  const aids: AidProtocol[] = [
    buildNitrates(raceProfile),
    buildBetaAlanine(raceProfile, hasRepeatedEfforts),
    buildCreatine(hasRepeatedEfforts, vegetarian),
    buildBicarbonate(raceProfile, weightKg, bicarbTested),
  ];

  const globalNotes: string[] = [
    "🧪 Règle d'or : aucun supplément testé pour la première fois en compétition.",
    "🏛️ Vérifier statut AMA et certification antidopage (Informed-Sport, Cologne List) systématiquement.",
    "🧬 Réponse interindividuelle élevée : tester sur 2–3 séances clés avant de valider.",
  ];

  if (raceProfile === "ultra") {
    globalNotes.push(
      "Profil ultra : prioriser hydratation (F6), gut training (F5) et fueling (F4) avant ergogéniques."
    );
  }

  return {
    isApplicable: true,
    raceProfile,
    aids,
    globalNotes,
    references: baseRefs,
  };
}

export const ERGOGENIC_DISCLAIMER =
  "Protocole pédagogique. Toujours valider avec un médecin/nutritionniste. Vérifier le statut AMA des produits (certification Informed-Sport ou Cologne List).";
