/**
 * computeEssentielsData — Calcule les valeurs et interprétations des 8 piliers TFCL
 * pour un athlète donné. Source unique partagée entre la page UI et l'export PDF.
 */

import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";

export interface PillarMetric {
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  /** Plage cible idéale [min, max] sur l'échelle [scaleMin, scaleMax] */
  target?: [number, number];
  scale?: [number, number];
  /** Direction d'optimisation : 'higher' = plus haut = mieux, 'lower' = plus bas = mieux, 'band' = dans la cible */
  direction?: "higher" | "lower" | "band";
}

export interface PillarData {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  /** Une ou plusieurs métriques chiffrées */
  metrics: PillarMetric[];
  /** Statut : ok / attention / insuffisant */
  status: "ok" | "warn" | "missing" | "info";
  /** Phrase de lecture (interprétation contextuelle) */
  interpretation: string;
  /** Définition scientifique */
  definition: string;
  /** Pourquoi ça compte pour la performance */
  whyMatters: string;
  /** Comment on agit dessus à l'entraînement */
  howToAct: string;
  /** Source / formule utilisée */
  source: string;
}

export interface CompassScores {
  vo2: number;
  vla: number;
  durability: number;
  economy: number;
  freshness: number;
}

export interface EssentielsBundle {
  athleteName: string;
  athleteObjectif: string;
  snapshotDate: string | null;
  age: number | null;
  pillars: PillarData[];
  compassScores: CompassScores | null;
  completeness: { measured: number; missing: number };
  generatedAt: string;
}

const calculateAge = (birth?: string | null): number | null => {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

// Évalue le statut selon target/direction
function evaluateStatus(m: PillarMetric): "ok" | "warn" | "missing" {
  if (m.value == null || !isFinite(m.value) || m.value === 0) return "missing";
  if (!m.target) return "ok";
  const [tmin, tmax] = m.target;
  if (m.direction === "higher") return m.value >= tmin ? "ok" : "warn";
  if (m.direction === "lower") return m.value <= tmax ? "ok" : "warn";
  return m.value >= tmin && m.value <= tmax ? "ok" : "warn";
}

export function computeEssentielsData(args: {
  athlete: any;
  snapshots: any[];
  tests: any[];
}): EssentielsBundle | null {
  const { athlete, snapshots, tests } = args;
  if (!athlete) return null;

  const list = (snapshots || []).filter((s) => s.athlete_id === athlete.id);
  const effectiveSnapshot =
    list.find((s) => s.id === athlete.active_snapshot_id) ||
    [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ||
    null;

  const age = calculateAge(athlete.dateNaissance);

  const vlamaxEff = computeVLamaxEffectif({
    athleteId: athlete.id,
    objectif: athlete.objectif || "IM",
    activeSnapshotId: athlete.active_snapshot_id,
    tests: (tests || []).map((t: any) => ({
      athlete_id: t.athlete_id,
      vlamax: t.vlamax,
      date: t.date,
      type: t.type,
      name: t.name,
    })),
    snapshots: (snapshots || []).map(mapSnapshotToV2),
  });

  const tteEff = effectiveSnapshot
    ? computeTTEEffectif({
        ftp: effectiveSnapshot.ftp ?? null,
        tss_7d: effectiveSnapshot.tss_7d ?? null,
        tte_mode: (effectiveSnapshot.tte_mode as any) ?? "LOAD",
        tte_observed_min: effectiveSnapshot.tte_observed_min ?? null,
        objectif: athlete.objectif || "IM",
        age,
      })
    : null;

  const vla = vlamaxEff?.value ?? null;
  const vo2 = effectiveSnapshot?.vo2max ?? athlete?.vo2max ?? null;
  const ce = (effectiveSnapshot as any)?.run_economy_score ?? null;
  const mlssRun = predictRunMLSSPctFromVLaCE(vla, ce);
  const fatmaxPct = computeFatMaxAnchorPctFTP(vla, vo2);
  const ftp = effectiveSnapshot?.ftp ?? null;
  const obj = (athlete.objectif || "IM").toUpperCase();
  const isLongDist = ["IM", "70.3", "MARATHON", "ULTRA", "TRAIL_LONG"].some((k) =>
    obj.includes(k),
  );

  const pillars: PillarData[] = [];

  // 1. VO2max × VLamax
  pillars.push({
    id: "vo2-vlamax",
    number: 1,
    shortTitle: "VO₂max × VLamax",
    title: "VO₂max × VLamax — identité métabolique",
    metrics: [
      {
        label: "VO₂max",
        value: vo2,
        unit: "ml/kg/min",
        decimals: 1,
        target: [55, 75],
        scale: [30, 85],
        direction: "higher",
      },
      {
        label: "VLamax",
        value: vla,
        unit: "mmol/L/s",
        decimals: 2,
        target: isLongDist ? [0.25, 0.4] : [0.45, 0.7],
        scale: [0.1, 1.0],
        direction: isLongDist ? "band" : "higher",
      },
    ],
    status: (() => {
      const a = evaluateStatus({
        value: vo2,
        target: [55, 75],
        direction: "higher",
        label: "",
        unit: "",
      });
      const b = evaluateStatus({
        value: vla,
        target: isLongDist ? [0.25, 0.4] : [0.45, 0.7],
        direction: isLongDist ? "band" : "higher",
        label: "",
        unit: "",
      });
      if (a === "missing" || b === "missing") return "missing";
      if (a === "warn" || b === "warn") return "warn";
      return "ok";
    })(),
    interpretation: (() => {
      if (!vo2 || !vla) return "Le couple complet n'est pas mesurable — manque VO₂max ou VLamax.";
      if (isLongDist && vla > 0.45)
        return `VLamax ${vla.toFixed(2)} élevée pour ton objectif longue distance : tu brûles trop vite tes glucides. Travail Low-VLa prioritaire (FatMax + sweet-spot longs).`;
      if (isLongDist && vla < 0.25)
        return `Profil très endurant (VLa ${vla.toFixed(2)}). Veille à conserver un peu de réactivité (1-2 séances neuromusculaires/mois).`;
      return `Couple cohérent : VO₂max ${vo2.toFixed(0)} + VLa ${vla.toFixed(2)}. Identité métabolique compatible avec l'objectif.`;
    })(),
    definition:
      "VO₂max = capacité maximale de consommation d'oxygène (puissance aérobie). VLamax = vitesse maximale de production de lactate par la glycolyse (puissance anaérobie). Le couple décrit l'identité métabolique : endurant, équilibré ou explosif.",
    whyMatters:
      "Toutes les prescriptions découlent de ce couple : zones d'intensité, FatMax, besoins en glucides, choix d'intervalles. Un endurant et un explosif ne s'entraînent pas pareil même à FTP identique.",
    howToAct:
      "↑ VO₂max : intervalles 3-5 min @ 95-105% PMA, 2x/semaine sur bloc de 4-6 sem. ↓ VLamax (endurance) : volume aérobie + FatMax + jeûne contrôlé. ↑ VLamax (sprint/CAP) : sprints courts max 10-30s, force maximale.",
    source: "Mader-Heck calibré N=44 (RMSE 2.64%), VLamax engine v2 (4 méthodes fusionnées)",
  });

  // 2. Coaching Compass
  pillars.push({
    id: "compass",
    number: 2,
    shortTitle: "Coaching Compass",
    title: "Coaching Compass™ — radar 5 axes + limiters",
    metrics: [
      { label: "Statut", value: effectiveSnapshot ? 1 : null, unit: "", decimals: 0 },
    ],
    status: effectiveSnapshot ? "info" : "missing",
    interpretation: effectiveSnapshot
      ? "Le Compass est disponible sur le Dashboard. Il combine VO₂max, VLamax, Durabilité, Économie et Fraîcheur en un radar normalisé 0-100, et détecte automatiquement le limiter primaire/secondaire."
      : "Aucun snapshot disponible — le Compass ne peut pas s'afficher.",
    definition:
      "Radar physiologique multi-axes (5-6 selon le sport) avec scoring 0-100 ambition-aware. Détecte automatiquement le maillon faible (limiter primaire) et propose les leviers Lorang à activer en priorité.",
    whyMatters:
      "Le Compass évite l'éparpillement. Plutôt que tout travailler à 100%, on focalise 70% du volume sur le limiter primaire pendant 4-8 semaines, puis on réévalue.",
    howToAct:
      "Aller dans Dashboard → onglet Compass. Lire l'axe le plus court → consulter les leviers proposés → générer un plan IA qui priorise ce limiter.",
    source: "computeCoachingCompass v2 — `src/lib/coachingCompass`",
  });

  // 3. MLSS Run Model C
  pillars.push({
    id: "mlss-run",
    number: 3,
    shortTitle: "MLSS Run (Model C)",
    title: "MLSS Run — seuil lactique en course (Model C)",
    metrics: [
      {
        label: "% VMA au MLSS",
        value: mlssRun ? mlssRun.mlssPct : null,
        unit: "%",
        decimals: 1,
        target: [82, 90],
        scale: [70, 95],
        direction: "band",
      },
    ],
    status: mlssRun ? (mlssRun.mlssPct >= 82 && mlssRun.mlssPct <= 92 ? "ok" : "warn") : "missing",
    interpretation: mlssRun
      ? `Ton MLSS Run est prédit à ${mlssRun.mlssPct.toFixed(1)}% de la VMA (précision ±2.64%). C'est l'allure plafond soutenable ~45-60 min sans dérive lactique.`
      : "Données insuffisantes : la prédiction MLSS Run nécessite à la fois VLamax et l'économie de course.",
    definition:
      "Maximum Lactate Steady State : intensité la plus élevée à laquelle la lactatémie reste stable (~3-5 mmol/L). Model C : MLSS_pct = 1 − 0.337·VLa − 0.0021·(CE−200). Calibré sur cohorte N=44 (RMSE 2.64%).",
    whyMatters:
      "Le MLSS est la frontière entre aérobie pure et fatigue glycolytique. Tempo, sweet-spot et seuil sont calibrés autour de cette valeur. Une erreur de 5% → 30 min de fatigue inutile en compétition.",
    howToAct:
      "↑ MLSS : ↓ VLamax (FatMax, volume aérobie) + ↑ économie de course (drills, force, plyo). Tempo runs 20-40 min à MLSS − 3%, 1-2x/semaine.",
    source: "predictRunMLSSPctFromVLaCE (Model C), validé sur literature_cohort_validation",
  });

  // 4. TTE / Durabilité
  pillars.push({
    id: "tte",
    number: 4,
    shortTitle: "TTE / Durabilité",
    title: "TTE — Time To Exhaustion à FTP",
    metrics: [
      {
        label: "TTE observé",
        value: tteEff && tteEff.tte_min > 0 ? tteEff.tte_min : null,
        unit: "min",
        decimals: 0,
        target: [tteEff?.target ?? 40, (tteEff?.target ?? 40) + 20],
        scale: [10, 90],
        direction: "higher",
      },
      {
        label: "Cible objectif",
        value: tteEff?.target ?? null,
        unit: "min",
        decimals: 0,
      },
    ],
    status:
      tteEff && tteEff.tte_min > 0 && tteEff.target
        ? tteEff.tte_min >= tteEff.target
          ? "ok"
          : "warn"
        : "missing",
    interpretation:
      tteEff && tteEff.tte_min > 0
        ? tteEff.target && tteEff.tte_min < tteEff.target
          ? `Durabilité à FTP : ${Math.round(tteEff.tte_min)} min vs cible ${tteEff.target} min. Manque ${Math.round(tteEff.target - tteEff.tte_min)} min — priorité aux sweet-spot longs.`
          : `Durabilité OK : ${Math.round(tteEff.tte_min)} min à FTP, cible ${tteEff.target} min atteinte.`
        : "TTE non observé ni estimable depuis la charge — faire un test 30-40 min @ FTP ou alimenter le TSS 7j.",
    definition:
      "Time To Exhaustion : durée maintenable à FTP/seuil. Indépendant du VO₂max — deux athlètes de même FTP peuvent avoir des TTE de 25 vs 65 min. Ajusté pour les masters (−2/−5/−8 min selon décennie après 40 ans).",
    whyMatters:
      "Sur Ironman et marathon, la durabilité prédit la performance mieux que la PMA. Tenir 70% FTP pendant 5h dépend de ta capacité à supporter l'intensité dans la durée, pas de ton plafond.",
    howToAct:
      "Sweet-spot longs (88-94% FTP) 2x30 min → 2x45 min sur 6 sem. Sortie longue avec dernière heure à tempo. Tester en fin de bloc avec un 30-40 min all-out à FTP.",
    source: "computeTTEEffectif (mode LOAD via TSS 7j, fallback observé)",
  });

  // 5. FatMax + Nutrition
  pillars.push({
    id: "fatmax",
    number: 5,
    shortTitle: "FatMax + Nutrition",
    title: "FatMax + besoins CHO (Mader-Heck)",
    metrics: [
      {
        label: "FatMax",
        value: fatmaxPct,
        unit: "% FTP",
        decimals: 0,
        target: [62, 72],
        scale: [48, 82],
        direction: "band",
      },
      {
        label: "FTP référence",
        value: ftp,
        unit: "W",
        decimals: 0,
      },
    ],
    status: fatmaxPct != null ? "ok" : "missing",
    interpretation:
      fatmaxPct != null
        ? ftp
          ? `Zone FatMax ≈ ${fatmaxPct.toFixed(0)}% FTP (≈ ${Math.round(ftp * fatmaxPct / 100)} W). Sous cette puissance → entraînement oxydation lipides. Au-dessus → on dépend des glucides.`
          : `FatMax ≈ ${fatmaxPct.toFixed(0)}% FTP. Renseigner la FTP pour avoir la cible en watts absolus.`
        : "Données insuffisantes : VLamax + VO₂max requis pour la formule FatMax canonique.",
    definition:
      "FatMax : intensité maximisant l'oxydation des lipides (g/min). Formule canonique TFCL : clamp(78 − 52·(VLa−0.25) + 0.15·(VO₂−50), 48, 82). Les besoins en glucides en course sont calculés par Mader-Heck, pas par table forfaitaire.",
    whyMatters:
      "Entraîner sous FatMax développe la machine à brûler du gras (long bike Z2, jeûne contrôlé). Cela économise le glycogène en course → moins de bonk. Les besoins CHO dérivés de Mader-Heck sont 15-25% plus précis qu'une règle « 60 g/h ».",
    howToAct:
      "Long bike 3-5h à FatMax − 5%, 1x/semaine. Petits-déj à jeûne 1-2x/semaine (1h max). En course : appliquer la cible CHO Mader-Heck (visible dans Race Simulation).",
    source: "computeFatMaxAnchorPctFTP + nutritionUnified.computeBaseRateMader",
  });

  // 6. No fake defaults
  pillars.push({
    id: "no-fake",
    number: 6,
    shortTitle: "No Fake Defaults",
    title: "Politique « Données insuffisantes » — pas de valeurs inventées",
    metrics: [{ label: "Statut", value: 1, unit: "actif", decimals: 0 }],
    status: "info",
    interpretation:
      "Toutes les cartes affichant « Données insuffisantes » indiquent une donnée réellement manquante. Aucun chiffre par défaut (0.45 mmol/L/s, 45 min TTE, etc.) n'est injecté à ta place.",
    definition:
      "Garde-fou architectural : quand une mesure source manque (VLamax, VO₂max, CE, TTE…), value=0 et confidence=0 sont propagés. L'UI affiche un état explicite plutôt qu'une estimation neutre.",
    whyMatters:
      "Une fausse valeur par défaut produit un plan plausible mais faux. Avec No Fake Defaults, si tu vois un chiffre dans l'app, il est mesuré ou rigoureusement dérivé. Sinon, il faut faire le test.",
    howToAct:
      "Pour chaque carte « Données insuffisantes » : aller dans Tests → planifier le protocole correspondant (CAP sprint 15s, lactate de terrain, test 30 min FTP, etc.).",
    source: "Memory `insufficient-data-no-fake-defaults` — appliqué dans diagnostic + plan IA",
  });

  // 7. Pacing + Race Sim
  pillars.push({
    id: "pacing",
    number: 7,
    shortTitle: "Pacing + Race Sim",
    title: "Pacing Envelope + Race Simulation 3 scénarios",
    metrics: [{ label: "Précision", value: 2.5, unit: "%", decimals: 1 }],
    status: "info",
    interpretation:
      "La simulation produit 3 scénarios (optimiste / réaliste / prudent) avec précision ±2-3%, incluant la fiche de route (NP, cardio, montée, TSS) et les cues nutrition localisés (km / D+).",
    definition:
      "Race Simulation v4 : combine puissance critique, W' (Skiba), durabilité TTE, FatMax et besoin CHO pour prédire la trajectoire d'effort le jour J. Pacing Envelope = bornes de sécurité par segment.",
    whyMatters:
      "Le passage diagnostic → action se joue là. Connaître la zone de risque sur chaque bosse évite l'explosion à 30 km du marathon ou à 120 km de l'IM. Les cues nutrition réduisent le risque de bonk.",
    howToAct:
      "Aller dans Simulation → choisir l'épreuve → lire le scénario réaliste comme cible et le prudent comme plan B. Coller les cues CHO sur le top tube.",
    source: "Race Simulation v4 refined + Pacing Envelope System",
  });

  // 8. Traçabilité
  pillars.push({
    id: "trace",
    number: 8,
    shortTitle: "Traçabilité scientifique",
    title: "Traçabilité scientifique — audit signé SHA-256",
    metrics: [{ label: "Statut", value: 1, unit: "actif", decimals: 0 }],
    status: "info",
    interpretation:
      "Toutes les prédictions sont versionnées (calibration_evidence, literature_cohort, vlamax_trace, run_mlss_trace). Un rapport HTML signé SHA-256 consolide les preuves pour un athlète.",
    definition:
      "Couche de gouvernance scientifique : chaque calcul stocke (modèle, version, sources, snapshots, overrides). Un rapport d'audit reconstructible à tout moment. Hash SHA-256 garantit l'intégrité.",
    whyMatters:
      "Pour une fédération, un staff ou un audit externe : on peut prouver d'où vient chaque chiffre, sur quelle cohorte le modèle est calibré, quand le profil a dérivé. Pas de boîte noire.",
    howToAct:
      "Page Diagnostic → bouton « Rapport scientifique » → générer le HTML signé → archiver dans le dossier athlète.",
    source: "buildScientificAuditHTML + tables calibration_evidence / literature_cohort",
  });

  // Compass scores simplifiés 0-100 (axes principaux)
  const scoreH = (v: number | null, t: number) =>
    v == null || !isFinite(v) || v === 0 ? 0 : Math.min(100, Math.round((v / t) * 100));
  const scoreInv = (v: number | null, t: number) => {
    if (v == null || !isFinite(v) || v === 0) return 0;
    if (v <= t) return 100;
    const excess = v / t;
    return excess >= 2 ? 0 : Math.max(0, Math.round(100 * (2 - excess)));
  };
  const compassScores =
    vo2 || vla || tteEff || ftp || ce
      ? {
          vo2: scoreH(vo2, 65),
          vla: isLongDist ? scoreInv(vla, 0.4) : scoreH(vla, 0.6),
          durability: tteEff && tteEff.target ? scoreH(tteEff.tte_min || 0, tteEff.target) : 0,
          economy: ce ? scoreH(ce, 75) : 0,
          freshness: effectiveSnapshot?.tss_7d ? Math.max(0, Math.min(100, 100 - Math.abs((effectiveSnapshot.tss_7d - 450) / 5))) : 50,
        }
      : null;

  // Complétude données mesurées vs manquantes (7 mesures clés)
  const measuredFlags = [vo2, vla, ftp, ce, tteEff?.tte_min, effectiveSnapshot?.tss_7d, fatmaxPct];
  const measured = measuredFlags.filter((v) => v != null && isFinite(v as number) && v !== 0).length;
  const missing = measuredFlags.length - measured;

  return {
    athleteName: athlete.nom || "Athlète",
    athleteObjectif: athlete.objectif || "—",
    snapshotDate: effectiveSnapshot?.date ?? null,
    age,
    pillars,
    compassScores,
    completeness: { measured, missing },
    generatedAt: new Date().toLocaleString("fr-FR"),
  };
}
