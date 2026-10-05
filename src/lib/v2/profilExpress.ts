// =============================================
// PROFIL EXPRESS — estimation physiologique rapide (1 séance par discipline)
// =============================================
//
// Principe : identifier les limiteurs (plafond aérobie / capacité anaérobie /
// seuil) sans le protocole complet multi-jours, pour un athlète qui n'a pas
// encore de FTP/VMA mesuré. Réutilise les mêmes briques Mader/Critical Power
// déjà validées ailleurs dans l'app (computeMLSS, analyzeCriticalPower),
// appliquées à des efforts courts de terrain au lieu des tests dédiés.
//
// Chaîne de calcul :
//   Course : sprint 15s lancé (best of 2) + 1500m piste → VMA (pace directe,
//            Track Day™ Bloc 3) + VLamax (régression distance_15s, Track
//            Day™ Bloc 2) → VO2max (Léger-Mercier depuis VMA) → computeMLSS
//            → seuil
//   Vélo   : sprint court + MAP 5min → CP/W' (analyzeCriticalPower, FTP exclu
//            de la régression) → VLamax implicite (W'/poids/320) + VO2max
//            (Jeukendrup depuis MAP) → computeMLSS → seuil (watts)
//
// Toute valeur produite ici est une ESTIMATION, jamais une mesure directe —
// les appelants doivent la marquer comme telle (snapshot source
// "profil_express", confidence réduite) et ne jamais l'afficher comme un FTP
// ou une VMA "mesurés".
//
// Côté course, les formules reprennent EXACTEMENT celles déjà documentées et
// imprimées dans la fiche TFCL Track Day™ (buildDiagnosticProtocolHTML.ts,
// variante "profil rapide" du protocole) plutôt que de les mélanger avec une
// référence différente (ex. ratio sprint/12min, calibré contre une vitesse
// ~90-95% VMA, pas contre la VMA elle-même) — voir le commentaire sur
// vmaFromTrack1500m dans profilExpressFormulas.ts.
//
// Références : Mader (2003), Heck & Schulz (2002) — computeMLSS ;
// Monod & Scherrer (1965), Jones (2019) — Critical Power ;
// Léger-Boucher — VMA 1500m piste ; Léger & Mercier (1984) — VO2max/VMA ;
// Jeukendrup (1997) — VO2 depuis puissance.

import { computeMLSS } from "./maderMetabolicModel";
import { analyzeCriticalPower } from "./criticalPowerModel";
import { vmaFromTrack1500m, vlamaxRunFromSprint15Distance } from "./profilExpressFormulas";

// =============================================
// COURSE À PIED
// =============================================

export interface ProfilExpressRunInput {
  /** Meilleure des 2 distances sprint 15s lancé all-out (mètres). */
  distSprint1M: number;
  distSprint2M: number;
  /** Temps pour parcourir 1500m piste à allure maximale stable (secondes). */
  time1500mSec: number;
  weightKg: number;
}

export interface ProfilExpressRunResult {
  vo2max: number; // ml/kg/min
  vlamax: number; // mmol/L/s
  /** VMA estimée (km/h) — pace directe du 1500m piste, corrigée +2% extérieur. */
  vma: number;
  /** Vitesse de seuil (sec/km), ou null si non calculable (profil Mader hors bornes). */
  thresholdPaceSecPerKm: number | null;
  /** Intensité du seuil en % VO2max (sortie brute de computeMLSS). */
  thresholdIntensityPctVo2max: number | null;
  confidence: number;
  warnings: string[];
  sources: string[];
}

function isPosFinite(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

export function computeProfilExpressRun(input: ProfilExpressRunInput): ProfilExpressRunResult | null {
  const { distSprint1M, distSprint2M, time1500mSec, weightKg } = input;
  if (![distSprint1M, distSprint2M, time1500mSec, weightKg].every(isPosFinite)) return null;

  const bestD15 = Math.max(distSprint1M, distSprint2M);

  const vma = vmaFromTrack1500m(time1500mSec);
  const vlamax = vlamaxRunFromSprint15Distance(bestD15);

  if (!isPosFinite(vma)) return null;

  // VO2max depuis VMA — Léger & Mercier 1984 (VO2max ≈ 3,5 × VMA_kmh), même
  // relation que trailSimulation.ts:332.
  const vo2max = vma * 3.5;

  const warnings: string[] = [];
  const sources = ["1500m piste (VMA)", "Sprint 15s lancé (VLamax)"];

  let thresholdPaceSecPerKm: number | null = null;
  let thresholdIntensityPctVo2max: number | null = null;
  const mlss = computeMLSS({ vo2max, vlamax, weight: weightKg });
  if (mlss) {
    thresholdIntensityPctVo2max = mlss.intensityPct;
    const vSeuilKmh = vma * (mlss.intensityPct / 100);
    thresholdPaceSecPerKm = vSeuilKmh > 0 ? Math.round(3600 / vSeuilKmh) : null;
    sources.push("Mader MLSS (seuil dérivé)");
  } else {
    warnings.push("Seuil non calculable (profil Mader hors bornes physiologiques) — zones en repli sur VMA seule.");
  }

  // Écart entre les 2 sprints : même logique que VLamaxRunFieldTest.tsx
  // (computeConfidence) — un protocole mal exécuté (sprints très différents)
  // réduit la confiance.
  const maxD = Math.max(distSprint1M, distSprint2M);
  const minD = Math.min(distSprint1M, distSprint2M);
  const ecartPct = maxD > 0 ? ((maxD - minD) / maxD) * 100 : 0;
  // Base 0.65 (< le 0.80 du test VLamax dédié) : ce résultat empile le MLSS
  // dérivé par-dessus le VLamax terrain, une incertitude de plus.
  let confidence = 0.65;
  if (ecartPct >= 6) confidence = 0.45;
  else if (ecartPct >= 3) confidence = 0.55;
  if (!mlss) confidence = Math.min(confidence, 0.45);

  return {
    vo2max: Math.round(vo2max * 10) / 10,
    vlamax,
    vma: Math.round(vma * 10) / 10,
    thresholdPaceSecPerKm,
    thresholdIntensityPctVo2max,
    confidence,
    warnings,
    sources,
  };
}

// =============================================
// VÉLO
// =============================================

export interface ProfilExpressBikeInput {
  /** Puissance moyenne sur l'effort 5min all-out (watts) — obligatoire. */
  map5MinW: number;
  /** Puissance moyenne sur 30s all-out (watts) — optionnel mais recommandé pour un meilleur ajustement CP/W'. */
  p30sW?: number | null;
  /** Pic de puissance 5s all-out (watts) — optionnel, overlay seulement (hors régression). */
  pmax5sW?: number | null;
  weightKg: number;
}

export interface ProfilExpressBikeResult {
  vo2max: number; // ml/kg/min (Jeukendrup, depuis MAP5min)
  /** VLamax implicite depuis W' — null si CP/W' non calculable ou données implausibles. */
  vlamax: number | null;
  /** Seuil estimé (watts) — null si VLamax non calculable ou profil Mader hors bornes. */
  ftpEstimatedW: number | null;
  cp: number | null;
  wprimeKJ: number | null;
  confidence: number;
  warnings: string[];
  sources: string[];
}

export function computeProfilExpressBike(input: ProfilExpressBikeInput): ProfilExpressBikeResult | null {
  const { map5MinW, p30sW, pmax5sW, weightKg } = input;
  if (!isPosFinite(map5MinW) || !isPosFinite(weightKg)) return null;

  const warnings: string[] = [];
  const sources = ["MAP 5min (VO2max)"];

  // VO2 depuis puissance — Jeukendrup 1997, même formule que adaptationPredictor.ts
  // (VO2 = puissance/poids × 10,8 + 7), appliquée ici à un effort MAP 5min
  // plutôt qu'au FTP.
  const vo2max = (map5MinW / weightKg) * 10.8 + 7;

  // CP/W' — FTP volontairement omis (non mesuré à ce stade) ; analyzeCriticalPower
  // l'exclut de la régression de toute façon (cf. criticalPowerModel.ts).
  const cpResult = analyzeCriticalPower({
    map5min_w: map5MinW,
    p30s_w: p30sW ?? null,
    pmax_5s: pmax5sW ?? null,
    ftp: null,
    weight_kg: weightKg,
  });

  let vlamax: number | null = null;
  let cp: number | null = null;
  let wprimeKJ: number | null = null;

  if (!cpResult) {
    warnings.push("CP/W' non calculable — au moins 2 points de durée distincte requis (ex: P30s + MAP5min).");
  } else {
    cp = cpResult.cp;
    wprimeKJ = cpResult.wprimeKJ;
    sources.push("Critical Power / W'");
    if (cpResult.dataQuality === "implausible") {
      warnings.push("Données CP implausibles — VLamax non estimée depuis W'.");
    } else {
      // W' ≈ VLamax × poids × 320 (Mader, Burnley & Jones 2018) — même formule
      // que vlamaxBikeV2Enhanced.ts (voie M4, cross-validation W').
      vlamax = Math.max(0.15, Math.min(1.10, Number((cpResult.wprime / (weightKg * 320)).toFixed(3))));
      sources.push("VLamax implicite (W')");
      if (cpResult.dataQuality === "suspect") {
        warnings.push("Données CP suspectes — VLamax/seuil estimés avec une confiance réduite.");
      }
    }
  }

  let ftpEstimatedW: number | null = null;
  if (vlamax != null) {
    const mlss = computeMLSS({ vo2max, vlamax, weight: weightKg });
    if (mlss) {
      ftpEstimatedW = mlss.power;
      sources.push("Mader MLSS (seuil dérivé)");
    } else {
      warnings.push("Seuil non calculable (profil Mader hors bornes physiologiques).");
    }
  }

  let confidence = 0.6; // base < 0.65 (course) : VO2max lui-même ici est une estimation (Jeukendrup), pas une mesure Cooper.
  if (!cpResult || cpResult.dataQuality === "implausible") confidence = 0.3;
  else if (cpResult.dataQuality === "suspect") confidence = 0.45;
  if (ftpEstimatedW == null) confidence = Math.min(confidence, 0.3);

  return {
    vo2max: Math.round(vo2max * 10) / 10,
    vlamax,
    ftpEstimatedW,
    cp,
    wprimeKJ,
    confidence,
    warnings,
    sources,
  };
}
