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
//   sprint   : <2 min   (track, crit final)
//   short    : 2–10 min (5k, 3k, pursuit)
//   middle   : 10–40 min (10k, 10mile, CX)
//   long     : 40–240 min (Semi, Marathon, 70.3, Olympic Tri)
//   ultra    : >240 min (IM, Ultra)

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
  source: string;
  warnings: string[];
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
  // Bénéfice fort : 4–30 min, modeste sur efforts plus longs
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
