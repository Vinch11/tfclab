/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MINI RAPPORT — Engine de profilage simplifié pour athlète
 *
 * Entrées minimales :
 *   - âge, sexe
 *   - VMA (km/h)
 *   - sprint 15s (mètres parcourus)
 *   - temps semi-marathon ou 20 km (optionnel) — sec
 *
 * Sorties :
 *   - VLamax estimée (calibration P4 : N=15, RMSE 0.073)
 *   - Profil métabolique (explosif / équilibré / endurant)
 *   - MLSS estimée (modèle C : N=44, RMSE 2.64%)
 *   - Allure au seuil (sec/km)
 *   - Zones Z1-Z7 (% VMA)
 *   - Conseils de travail adaptés au profil
 *
 * Ton du verbatim : « athlète éclairé » — termes techniques entre parenthèses.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type ReferenceRaceType = "semi" | "20k";
export type Sex = "M" | "F";
export type ProfileType = "explosif" | "equilibre" | "endurant";
export type VocabularyMode = "expert" | "beginner";

export interface MiniReportInput {
  age: number;
  sex: Sex;
  vmaKmh: number;
  sprint15sM: number;
  /** Temps de référence (secondes) — optionnel */
  referenceTimeSec?: number | null;
  referenceRaceType?: ReferenceRaceType | null;
  /** Nom de l'athlète (optionnel — pour le titre du rapport) */
  athleteName?: string | null;
  /** Mode vocabulaire : 'expert' (défaut, athlète éclairé) ou 'beginner' (ultra-pédagogique) */
  vocabularyMode?: VocabularyMode;
}

export interface TrainingZone {
  id: string;       // Z1..Z7
  label: string;
  pctVmaMin: number;
  pctVmaMax: number;
  paceMinSecPerKm: number;
  paceMaxSecPerKm: number;
  description: string;
  purpose: string;
}

export interface MiniReportResult {
  // Entrées normalisées
  input: Required<Omit<MiniReportInput, "referenceTimeSec" | "referenceRaceType" | "athleteName" | "vocabularyMode">> & {
    referenceTimeSec: number | null;
    referenceRaceType: ReferenceRaceType | null;
    athleteName: string | null;
    vocabularyMode: VocabularyMode;
  };
  // Calculs
  vlamax: number;                    // mmol/L/s (estimée)
  vlamaxConfidence: "good" | "moderate" | "low";
  profile: ProfileType;
  profileLabel: string;              // "Explosif", "Équilibré", "Endurant"
  ceMlPerKgPerKm: number;            // Coût énergétique estimé (mL O2/kg/km)
  mlssPct: number;                   // % de VMA
  paceThresholdSecPerKm: number;     // sec/km
  paceObservedSecPerKm: number | null; // depuis temps semi/20k si fourni
  vmaPaceSecPerKm: number;           // 100% VMA
  zones: TrainingZone[];
  // Verbatim
  profileNarrative: string;
  trainingAdvice: string[];
  caveats: string[];
}

// =============================================
// 1. VLAMAX depuis sprint 15s — Calibration P4
//    VLamax = −0.5066 + 0.01420 · sprint_m
//    Bornes physiologiques [0.20 ; 1.20] mmol/L/s
// =============================================
/**
 * Calibration P4 (N=15) : VLamax = −0.5066 + 0.01420·sprint_m
 * Spécificité course à pied : un sprint 15 s départ arrêté mobilise massivement
 * la PCr (filière alactique) — la corrélation sprint→VLamax est plus faible
 * qu'en sprint cycliste/Wingate. On applique :
 *   - un facteur correctif global de 0.80 (atténuation course à pied)
 *   - un offset négatif pour ramener la moyenne d'un coureur d'endurance vers ~0.40
 *   - bornes physiologiques resserrées [0.20 ; 1.00]
 */
export function estimateVLamaxFromSprint(sprint15sM: number): number {
  const rawP4 = -0.5066 + 0.01420 * sprint15sM;
  const runAdjusted = rawP4 * 0.80 - 0.05;
  return Math.max(0.20, Math.min(1.00, Math.round(runAdjusted * 100) / 100));
}

function vlamaxConfidenceFromSprint(sprint15sM: number): "good" | "moderate" | "low" {
  // Plage validée resserrée : 70-95 m couvre le cœur de la cohorte runners.
  if (sprint15sM >= 70 && sprint15sM <= 95) return "good";
  if (sprint15sM >= 55 && sprint15sM <= 115) return "moderate";
  return "low";
}

// =============================================
// 2. Profil métabolique
// =============================================
// Seuils recalibrés pour la course à pied (post-correctif sprint→VLamax)
export function classifyProfile(vlamax: number): ProfileType {
  if (vlamax >= 0.65) return "explosif";
  if (vlamax < 0.45) return "endurant";
  return "equilibre";
}

const PROFILE_LABELS: Record<ProfileType, string> = {
  explosif: "Explosif",
  equilibre: "Équilibré",
  endurant: "Endurant",
};

// =============================================
// 3. Coût énergétique (CE) — proxy âge / VMA / sexe
//    Référence trained runner : ~200 mL O2/kg/km
//    Femmes : +5 mL en moyenne (plus petit pas, foulée plus économe variable)
//    Vétéran : +10 mL après 45 ans
// =============================================
// CE recalé sur runner club/loisir (la version précédente, 210 − 0.6·VMA,
// reflétait une moyenne élite trop optimiste).
export function estimateCE(age: number, sex: Sex, vmaKmh: number): number {
  let ce = 220 - 0.7 * vmaKmh;
  if (sex === "F") ce += 5;
  if (age >= 45) ce += 5;
  if (age >= 60) ce += 5;
  return Math.round(Math.max(180, Math.min(245, ce)));
}

// =============================================
// 4. MLSS (% VMA) — Modèle C calibré N=44
//    MLSS_pct = 1 − 0.337·VLamax − 0.0021·(CE − 200)
//    Bornes : [0.78 ; 0.92]
// =============================================
export function estimateMLSSPct(vlamax: number, ceMlPerKgPerKm: number): number {
  const raw = 1 - 0.337 * vlamax - 0.0021 * (ceMlPerKgPerKm - 200);
  return Math.max(0.78, Math.min(0.92, Math.round(raw * 1000) / 1000));
}

// =============================================
// 5. Allures
// =============================================
function vmaToPaceSecPerKm(vmaKmh: number): number {
  return Math.round(3600 / vmaKmh);
}

function paceFromTimeAndDistance(timeSec: number, distanceKm: number): number {
  return Math.round(timeSec / distanceKm);
}

// =============================================
// 6. Zones Z1-Z7 (% VMA)
// =============================================
function buildZones(vmaKmh: number): TrainingZone[] {
  const baseSec = 3600 / vmaKmh; // sec/km à 100% VMA

  const paceFor = (pct: number) => Math.round(baseSec / pct);

  const ZONES: Array<Omit<TrainingZone, "paceMinSecPerKm" | "paceMaxSecPerKm">> = [
    {
      id: "Z1",
      label: "Récupération active",
      pctVmaMin: 50,
      pctVmaMax: 60,
      description: "Allure très facile, conversation aisée. Cardio < 70% FC max.",
      purpose: "Récupération entre séances dures, échauffement, retour au calme.",
    },
    {
      id: "Z2",
      label: "Endurance fondamentale",
      pctVmaMin: 60,
      pctVmaMax: 75,
      description: "Allure confortable, respiration nasale possible. Pilier de la base aérobie.",
      purpose: "Développer la capillarisation, le métabolisme des graisses, l'endurance générale.",
    },
    {
      id: "Z3",
      label: "Endurance critique / Tempo",
      pctVmaMin: 75,
      pctVmaMax: 85,
      description: "Allure soutenue mais maîtrisée, conversation par phrases courtes.",
      purpose: "Améliorer la clairance du lactate sous le seuil, allure marathon/semi.",
    },
    {
      id: "Z4",
      label: "Seuil lactique (MLSS)",
      pctVmaMin: 85,
      pctVmaMax: 92,
      description: "Allure proche d'un effort 1h all-out (≈ semi-marathon rapide).",
      purpose: "Repousser le seuil — pierre angulaire pour les distances 10k à semi.",
    },
    {
      id: "Z5",
      label: "VO2max",
      pctVmaMin: 92,
      pctVmaMax: 100,
      description: "Effort intense, respiration ample. Soutenable 5 à 12 min en continu.",
      purpose: "Élever le plafond aérobie, intervalles de 3 à 6 min ou 30/30.",
    },
    {
      id: "Z6",
      label: "Anaérobie lactique",
      pctVmaMin: 100,
      pctVmaMax: 115,
      description: "Au-dessus de VMA, sollicite la glycolyse rapide (production lactate).",
      purpose: "Tolérance lactique, intervalles courts 30s à 2 min avec repos long.",
    },
    {
      id: "Z7",
      label: "Sprint / Neuromusculaire",
      pctVmaMin: 115,
      pctVmaMax: 150,
      description: "Effort maximal court (< 15 s). Filière phosphocréatine + recrutement.",
      purpose: "Force-vitesse, économie de course, foulée — repos complet entre reps.",
    },
  ];

  return ZONES.map((z) => ({
    ...z,
    paceMinSecPerKm: paceFor(z.pctVmaMax / 100),
    paceMaxSecPerKm: paceFor(z.pctVmaMin / 100),
  }));
}

// =============================================
// 7. Verbatim profil + conseils
// =============================================
function buildProfileNarrative(
  profile: ProfileType,
  vlamax: number,
  sex: Sex,
  age: number,
  mode: VocabularyMode = "expert"
): string {
  const vlamaxStr = vlamax.toFixed(2);
  const ageStr = age >= 45 ? "vétéran" : age >= 35 ? "senior" : "jeune adulte";
  const sexStr = sex === "F" ? "athlète féminine" : "athlète masculin";

  if (mode === "beginner") {
    switch (profile) {
      case "explosif":
        return (
          `Ton corps est plutôt **type "moteur diesel turbo"** : il sait produire beaucoup d'énergie ` +
          `très vite (utile pour sprinter, monter une côte, accélérer en fin de course). ` +
          `En contrepartie, à allure modérée tu fabriques rapidement de **l'acide lactique** ` +
          `(ce qui brûle les jambes), et ton corps consomme beaucoup d'énergie sur les longues distances. ` +
          `Concrètement : tu pars vite, mais tu peux "exploser" sur un semi ou un marathon si tu pars trop fort. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (la moyenne d'un coureur d'endurance est autour de 0.40). ` +
          `Ton enjeu : **apprendre à courir lentement et longtemps** pour développer ton "moteur d'endurance".`
        );
      case "endurant":
        return (
          `Ton corps est plutôt **type "diesel longue distance"** : il consomme peu d'énergie à allure ` +
          `modérée et fabrique très peu d'acide lactique. Tu es naturellement à l'aise sur les longues sorties ` +
          `(semi, marathon, trail) et tu récupères vite entre tes séances. ` +
          `En contrepartie, tu manques un peu de "punch" : sur un 5 km ou un 10 km rapide, tu peux te faire ` +
          `décrocher par des coureurs moins endurants mais plus explosifs. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (un sprinter dépasse souvent 0.60). ` +
          `Ton enjeu : **mettre un peu de piquant** dans ton entraînement pour gagner en vitesse.`
        );
      case "equilibre":
        return (
          `Ton corps est **équilibré** entre vitesse et endurance — tu n'as pas de point faible majeur, ` +
          `mais pas non plus d'avantage écrasant dans un domaine particulier. ` +
          `Tu peux performer aussi bien sur du 5 km que sur un semi-marathon, et c'est surtout ` +
          `**la façon dont tu t'entraînes** qui décidera de tes progrès. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (zone typique des coureurs polyvalents). ` +
          `Bon à savoir : tous types d'objectifs te sont accessibles, du moment que ton plan est cohérent avec la cible.`
        );
    }
  }

  switch (profile) {
    case "explosif":
      return (
        `Tu sembles être un profil **explosif**, avec une glycolyse rapide bien développée ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — la moyenne d'un coureur d'endurance se situe autour de 0.40). ` +
        `Ce profil te donne un avantage net sur les efforts courts et puissants (sprints, relances, côtes brèves), ` +
        `mais peut limiter ton endurance au seuil : ton organisme produit beaucoup de lactate à intensité ` +
        `modérée, ce qui dégrade ton coût énergétique sur les distances longues (semi, marathon). ` +
        `En tant que ${sexStr} ${ageStr}, ton enjeu est de **modérer** cette glycolyse pour gagner en économie sur le long.`
      );
    case "endurant":
      return (
        `Tu sembles être un profil **endurant**, avec une glycolyse modérée et donc une ` +
        `excellente capacité à soutenir des allures sub-seuil sans accumulation de lactate ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — un sprinter dépasse souvent 0.60). ` +
        `Tu es naturellement à l'aise sur les distances longues (semi, marathon, ultra) et tu ` +
        `récupères bien entre les séances aérobies. En revanche, tu manques probablement de ` +
        `puissance et de tolérance lactique pour les efforts courts intenses (10k, intervalles VO2max). ` +
        `Pour ton profil ${ageStr}, l'enjeu est d'**ajouter du piquant** sans détruire ta base.`
      );
    case "equilibre":
      return (
        `Tu sembles être un profil **équilibré** entre filière aérobie et glycolytique ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — dans la plage typique des coureurs polyvalents). ` +
        `Cette polyvalence te rend adapté à un large spectre de distances, du 5k au semi-marathon. ` +
        `Ton profil ne te ferme aucune porte mais ne te donne pas non plus d'avantage marqué : ` +
        `c'est la spécificité de ton entraînement qui orientera tes performances. ` +
        `En tant que ${sexStr} ${ageStr}, tu peux progresser de façon significative sur ` +
        `n'importe quelle distance avec une planification ciblée.`
      );
  }
}

interface AdviceContext {
  vlamax: number;
  vmaKmh: number;
  mlssPct: number;
  ce: number;
  age: number;
  sex: Sex;
  paceZ2Min: number; // sec/km à 75% VMA (borne rapide Z2)
  paceZ2Max: number; // sec/km à 60% VMA (borne lente Z2)
  paceThreshold: number; // sec/km au seuil
  paceVO2: number; // sec/km à 95% VMA
}

function buildTrainingAdvice(
  profile: ProfileType,
  mode: VocabularyMode,
  ctx: AdviceContext
): string[] {
  const { vlamax, vmaKmh, mlssPct, ce, age, paceZ2Min, paceZ2Max, paceThreshold, paceVO2 } = ctx;
  const z2 = `${formatPace(paceZ2Max)}–${formatPace(paceZ2Min)}/km`;
  const seuil = `${formatPace(paceThreshold)}/km`;
  const vo2 = `${formatPace(paceVO2)}/km`;
  const isVet = age >= 45;
  const isMaster = age >= 55;
  const lowVMA = vmaKmh < 14;
  const highVMA = vmaKmh >= 18;
  const highCE = ce >= 215; // économie médiocre
  const goodCE = ce <= 195; // bonne économie
  const highMLSS = mlssPct >= 0.88;
  const lowMLSS = mlssPct <= 0.83;

  const advice: string[] = [];

  if (mode === "beginner") {
    if (profile === "explosif") {
      advice.push(
        `**Cours lentement, longtemps** : 60 à 90 min en allure facile (${z2}), 2 à 3 fois par semaine — c'est ta priorité absolue pour construire ton moteur d'endurance.`,
        `**Une séance « tempo » par semaine** : 2 × 15 à 20 min autour de ${seuil} (allure soutenue, 2-3 mots à la fois). Ça apprend à ton corps à recycler le lactate que tu produis facilement.`,
        `**Lève le pied sur les fractionnés très intenses** : 1 séance toutes les 2 semaines suffit. Tu as déjà la vitesse — c'est inutile d'en rajouter.`,
        `**Une sortie longue par semaine** (1h15 à 2h très tranquille). Idéalement le matin avec juste un café — ça apprend à ton corps à brûler les graisses au lieu du sucre.`,
      );
      if (highCE) advice.push(`**Travaille ta foulée** : 4 à 6 lignes droites de 80 m relâchées + éducatifs (talons-fesses, montées de genoux) en fin de footing. Ton coût énergétique (${ce} mL O₂/kg/km) est élevé — tu peux gagner gratuitement quelques secondes au km.`);
      else advice.push(`Renforcement musculaire 1 à 2 fois par semaine (gainage, squats, fentes) pour préserver ta puissance naturelle sans perdre l'endurance.`);
    } else if (profile === "endurant") {
      advice.push(
        `**Continue tes sorties tranquilles** (${z2}) — c'est ton point fort, ne le sacrifie pas. Mais ne fais PAS que ça.`,
        `**Une séance VO2max par semaine** : 5 à 6 fois 3 min à ${vo2} (très rapide, presque tout donné), avec 2 min de footing entre. Ça relève ton plafond de vitesse, qui est ton vrai frein.`,
        `**Sprints courts en côte** une fois par semaine : 6 à 8 sprints de 8 à 12 secondes en montée pentue, récup complète en marchant. Ça réveille tes fibres rapides sans te casser.`,
        `**Avant un objectif court** (10 km, cross), bascule sur de la tolérance lactique : 8 à 10 fois 1 min très rapide, 1 min de récup. Court mais douloureux — c'est exactement ce qui te manque.`,
      );
      advice.push(isVet
        ? `Pliométrie douce (sauts à la corde, petits bonds) 2 fois par semaine — à ${age} ans, ton système nerveux a besoin de stimulation pour rester réactif.`
        : `Gainage et exercices de sauts 2 fois par semaine pour rendre ta foulée plus économique et explosive.`);
    } else {
      // équilibré
      advice.push(
        `**Adapte selon ton objectif principal** : pour un semi/marathon → priorité aux sorties longues et au tempo (${seuil}) ; pour un 10 km ou un trail court → ajoute du VO2max (${vo2}).`,
        `**Alterne les semaines** : une semaine « volume » (beaucoup de footing facile en ${z2}, une seule séance dure), une semaine « qualité » (deux séances dures, volume réduit). Ton profil polyvalent répond très bien à cette ondulation.`,
        `**Teste-toi tous les 6 à 8 semaines** : un 30 min en course officielle ou un test sur 5 km bien préparé — ça te permet de recaler tes allures et de visualiser tes progrès.`,
        `**Garde quelques sprints courts** (6 × 10 s en fin de footing facile, 1 fois par semaine) : tu entretiens ta vitesse maximale sans fatigue, et ta foulée reste vive.`,
      );
      advice.push(lowMLSS
        ? `**Ton seuil est encore bas** (${Math.round(mlssPct * 100)} % VMA) : insiste sur du tempo continu de 25 à 35 min à ${seuil} toutes les semaines pendant 6 à 8 semaines, c'est ta plus grosse marge de progrès.`
        : `Suis une logique de progression classique : d'abord du foncier (4 à 6 sem), puis du seuil (3 à 4 sem), puis de la VO2max (3 à 4 sem), puis du repos avant la course.`);
    }
    return advice;
  }

  // ===== EXPERT =====
  if (profile === "explosif") {
    advice.push(
      `**Bâtir le socle Z2** : 60 à 90 min à ${z2} (65–72 % VMA), 2 à 3×/sem. Chantier prioritaire — la VLamax élevée (${vlamax.toFixed(2)}) doit être compensée par une oxydation lipidique solide.`,
      `**Sub-seuil continu plutôt que fractions courtes** : 2 × 20 min ou 1 × 35-40 min à ${seuil} (≈ ${Math.round(mlssPct * 100)} % VMA). Cible la clairance lactate, pas la production — privilégie le continu sur l'intermittent.`,
      `**Plafonner l'intensité Z6/Z7 à 1×/2 sem** sur cycles d'endurance. Tu produis déjà beaucoup de lactate naturellement, en rajouter ne fait que dégrader la base.`,
      `**Sortie longue progressive** (75-120 min en Z1-Z2, finir 15 dernières min en Z3) — stimule lipolyse + densité mitochondriale + gestion de l'acidose en fin d'effort.`,
    );
    advice.push(highCE
      ? `**Économie de course** : 6-8 lignes droites 80-100 m relâchées + éducatifs (skipping, foulées bondissantes) 2×/sem. CE = ${ce} mL O₂/kg/km, marge nette à récupérer.`
      : `Force-pliométrie 1-2×/sem (squats lourds 3-5 reps, bondissements alternés) pour valoriser ton gain neuromusculaire sans détourner la base aérobie.`);
  } else if (profile === "endurant") {
    advice.push(
      `**Préserver le socle Z2** (${z2}) — c'est ton ADN, pas le réduire. Mais cesser d'y consacrer 100 % du volume.`,
      `**Bloc VO2max prioritaire** : 1×/sem minimum, idéalement 2× en cycle dur. 5-6 × 3 min à ${vo2} (95-100 % VMA), récup 2 min trot. Plafond aérobie = ton vrai limiteur.`,
      `**Force-vitesse hebdomadaire** : 6-8 × 8-12 s en côte (8-12 % de pente), récup complète. Recrutement neuromusculaire et raideur tendineuse, sans dette glycolytique.`,
      `**Bloc tolérance lactique ponctuel** (4-6 sem avant 10k/cross) : 8-10 × 1 min à 105-110 % VMA, récup 1 min — ce que ta VLamax basse (${vlamax.toFixed(2)}) ne te donne pas naturellement.`,
    );
    advice.push(isMaster
      ? `Pliométrie douce + mobilité 2×/sem (corde à sauter, drills cheville) — préserver la raideur tendineuse devient critique après ${age} ans.`
      : `Pliométrie + gainage profond 2×/sem — gain en économie probablement supérieur à toute optimisation métabolique chez ton profil.`);
  } else {
    // équilibré
    advice.push(
      `**Spécifier le mix selon objectif** : semi/marathon → bloc Z2-Z3 long + tempo seuil (${seuil}) ; 10 km/cross → ajout Z5 (${vo2}) et Z6 court ; trail → Z2 vallonné + force excentrique en descente.`,
      `**Distribution pyramidale** : 70 % Z1-Z2, 15-20 % Z3-Z4 (sub-seuil/seuil), 10-15 % Z5+ — supérieure au polarisé strict pour un profil polyvalent qui répond aux deux extrêmes.`,
      `**Calage régulier du seuil** : test 30 min CP ou semi de prépa toutes les 6-8 sem. MLSS estimée à ${Math.round(mlssPct * 100)} % VMA — la précision du calage conditionne tout le plan.`,
      `**Maintenir Z7** 1×/sem (6 × 10 s en fin de Z2) — entretient vitesse max et foulée à coût neuro/métabolique nul.`,
    );
    advice.push(highMLSS
      ? `**Périodisation centrée sur le plafond** : ton MLSS (${Math.round(mlssPct * 100)} % VMA) est déjà élevé — la marge est sur la VMA elle-même via VO2max long (5-8 min) et CV.`
      : lowMLSS
        ? `**Périodisation seuil-dominante** sur 6-8 sem (3× tempo continu/sem) : ton MLSS à ${Math.round(mlssPct * 100)} % VMA laisse une marge nette avant de basculer sur la VO2max.`
        : `Périodisation classique : aérobie (4-6 sem) → seuil (3-4 sem) → VO2max (3-4 sem) → affûtage (2 sem).`);
  }

  if (lowVMA && profile !== "explosif") {
    advice.push(`**VMA modeste (${vmaKmh.toFixed(1)} km/h)** : intègre 1×/sem un format VO2max court type 30/30 ou 1 min/1 min — c'est le levier le plus rentable pour ton niveau actuel.`);
  } else if (highVMA && profile !== "endurant") {
    advice.push(`**VMA élevée (${vmaKmh.toFixed(1)} km/h)** : la marge est désormais sur la spécificité (allure cible) plus que sur la VMA brute — privilégie les blocs longs à allure compétition.`);
  }

  return advice;
}

// =============================================
// 8. Pipeline principal
// =============================================
export function computeMiniReport(input: MiniReportInput): MiniReportResult {
  const vlamax = estimateVLamaxFromSprint(input.sprint15sM);
  const vlamaxConfidence = vlamaxConfidenceFromSprint(input.sprint15sM);
  const profile = classifyProfile(vlamax);
  const ce = estimateCE(input.age, input.sex, input.vmaKmh);
  const mlssPctModel = estimateMLSSPct(vlamax, ce);

  const vmaPaceSecPerKm = vmaToPaceSecPerKm(input.vmaKmh);

  // Allure observée depuis temps semi/20k (si fourni)
  let paceObservedSecPerKm: number | null = null;
  let mlssPctEffective = mlssPctModel;
  let mlssAnchorSource: "model_C" | "race_anchor" = "model_C";

  if (input.referenceTimeSec && input.referenceRaceType) {
    const distanceKm = input.referenceRaceType === "semi" ? 21.0975 : 20;
    paceObservedSecPerKm = paceFromTimeAndDistance(input.referenceTimeSec, distanceKm);

    // Ratio race→MLSS : un coureur entraîné soutient ~90 % MLSS sur semi/20k.
    // → vMLSS_kmh = vRace_kmh / 0.90  ; mlssPct = vMLSS / VMA
    const RACE_TO_MLSS_RATIO = 0.90;
    const vRaceKmh = (distanceKm / input.referenceTimeSec) * 3600;
    const vMlssKmh = vRaceKmh / RACE_TO_MLSS_RATIO;
    const mlssPctFromRace = vMlssKmh / input.vmaKmh;

    // Sanity bounds : on n'accepte le recalage que si plausible
    if (mlssPctFromRace >= 0.75 && mlssPctFromRace <= 0.95) {
      mlssPctEffective = Math.round(mlssPctFromRace * 1000) / 1000;
      mlssAnchorSource = "race_anchor";
    }
  }

  const paceThresholdSecPerKm = Math.round(vmaPaceSecPerKm / mlssPctEffective);

  const mode: VocabularyMode = input.vocabularyMode ?? "expert";
  const zones = buildZones(input.vmaKmh);
  const profileNarrative = buildProfileNarrative(profile, vlamax, input.sex, input.age, mode);
  const paceZ2Min = Math.round(vmaPaceSecPerKm / 0.75); // borne rapide Z2 (à 75% VMA)
  const paceZ2Max = Math.round(vmaPaceSecPerKm / 0.60); // borne lente Z2 (à 60% VMA)
  const paceVO2 = Math.round(vmaPaceSecPerKm / 0.95);
  const trainingAdvice = buildTrainingAdvice(profile, mode, {
    vlamax,
    vmaKmh: input.vmaKmh,
    mlssPct: mlssPctEffective,
    ce,
    age: input.age,
    sex: input.sex,
    paceZ2Min,
    paceZ2Max,
    paceThreshold: paceThresholdSecPerKm,
    paceVO2,
  });

  const caveats: string[] = mode === "beginner"
    ? [
        "Ce rapport est une **estimation rapide** à partir de quelques chiffres terrain. C'est une boussole, pas une mesure de précision.",
        "Pour un bilan vraiment précis, le mieux reste un **test en laboratoire** (mesure de lactate sur tapis ou vélo) ou un test VLamax dédié.",
      ]
    : [
        "Estimation à partir de 4 à 5 paramètres terrain — précision indicative (±5 % sur les allures, ±0.10 mmol/L/s sur la VLamax).",
        "Pour une analyse fine, un test labo lactate (4-5 paliers) ou un test VLamax dédié est recommandé.",
      ];
  if (mlssAnchorSource === "race_anchor") {
    caveats.push(
      mode === "beginner"
        ? `Bonne nouvelle : ton allure au seuil a été calée sur ton temps ${input.referenceRaceType === "semi" ? "semi-marathon" : "20 km"} — c'est plus fiable qu'une simple estimation.`
        : `Allure au seuil ancrée sur ton temps ${input.referenceRaceType === "semi" ? "semi-marathon" : "20 km"} (ratio race→MLSS = 0.90) — plus fiable que l'estimation modèle.`
    );
  }
  if (vlamaxConfidence === "low") {
    caveats.push(
      mode === "beginner"
        ? "Ton sprint 15s est hors de la plage habituelle (entre 70 et 95 m) — l'estimation de ton profil est à prendre avec prudence."
        : "Sprint 15s hors plage validée (70-95 m) — la VLamax estimée est à interpréter avec prudence."
    );
  } else if (vlamaxConfidence === "moderate") {
    caveats.push(
      mode === "beginner"
        ? "Ton sprint 15s est un peu en marge de la plage habituelle — confiance moyenne sur l'estimation du profil."
        : "Sprint 15s en marge de la plage validée — confiance modérée sur la VLamax."
    );
  }
  if (paceObservedSecPerKm && mlssAnchorSource === "model_C") {
    const deltaSec = paceObservedSecPerKm - paceThresholdSecPerKm;
    if (Math.abs(deltaSec) > 15) {
      caveats.push(
        `Écart marqué entre allure ${input.referenceRaceType === "semi" ? "semi" : "20k"} (${formatPace(paceObservedSecPerKm)}/km) ` +
        `et seuil estimé (${formatPace(paceThresholdSecPerKm)}/km) — VMA ou sprint 15s peut-être à recalibrer.`
      );
    }
  }

  return {
    input: {
      age: input.age,
      sex: input.sex,
      vmaKmh: input.vmaKmh,
      sprint15sM: input.sprint15sM,
      referenceTimeSec: input.referenceTimeSec ?? null,
      referenceRaceType: input.referenceRaceType ?? null,
      athleteName: input.athleteName ?? null,
      vocabularyMode: mode,
    },
    vlamax,
    vlamaxConfidence,
    profile,
    profileLabel: PROFILE_LABELS[profile],
    ceMlPerKgPerKm: ce,
    mlssPct: mlssPctEffective,
    paceThresholdSecPerKm,
    paceObservedSecPerKm,
    vmaPaceSecPerKm,
    zones,
    profileNarrative,
    trainingAdvice,
    caveats,
  };
}

// =============================================
// Helpers de formatage
// =============================================
export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeToSec(input: string): number | null {
  const parts = input.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}
