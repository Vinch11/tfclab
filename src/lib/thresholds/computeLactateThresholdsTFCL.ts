// =============================================
// LACTATE THRESHOLDS TFCL — Estimation LT1/LT2
// Staff-grade, transparent, pas "magique"
// =============================================

export interface LactateThreshold {
  pct_of_ftp?: number;
  watts?: number;
  label: string;
  confidence: number;
}

export interface LactateThresholdsTFCL {
  sport: "bike" | "run" | "unknown";
  lt1: LactateThreshold;
  lt2: LactateThreshold;
  notes: string[];
}

interface ComputeParams {
  ftp?: number | null;
  sport?: string | null;
  tteValue?: number | null;
  tteSource?: "observed" | "estimated" | "unknown";
  vlamaxValue?: number | null;
  vlamaxSource?: "test" | "snapshot" | "estimated" | "unknown";
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeLactateThresholdsTFCL(params: ComputeParams): LactateThresholdsTFCL {
  const { ftp, sport, tteValue, tteSource, vlamaxValue, vlamaxSource } = params;

  const notes: string[] = [];

  // Determine sport
  const isBike = sport === "vélo" || sport === "velo" || sport === "bike" || sport === "IM" || sport === "Ironman" || sport === "70.3" || sport === "Ironman70.3";
  const isRun = sport === "course" || sport === "run" || sport === "cap" || sport === "Marathon" || sport === "Semi" || sport === "semi" || sport === "Trail" || sport === "TrailLong" || sport === "10K" || sport === "5K";

  // Unknown sport / no data
  if (!isBike && !isRun) {
    return {
      sport: "unknown",
      lt1: { label: "Données insuffisantes", confidence: 0 },
      lt2: { label: "Données insuffisantes", confidence: 0 },
      notes: ["Sport non identifié — impossible d'estimer LT1/LT2."],
    };
  }

  // ═══════════════════════════════════════════
  // RUNNING — MVP zones relatives
  // ═══════════════════════════════════════════
  if (isRun) {
    return {
      sport: "run",
      lt1: { label: "LT1 estimé : bas Z2", confidence: 0.50 },
      lt2: { label: "LT2 estimé : haut Z3", confidence: 0.50 },
      notes: [
        "En CAP, LT1/LT2 seront affinés quand vSeuil (12min) ou VMA seront renseignés.",
        "Zones relatives basées sur le modèle TFCL.",
      ],
    };
  }

  // ═══════════════════════════════════════════
  // BIKE — Staff-grade estimation
  // ═══════════════════════════════════════════
  if (ftp == null || ftp <= 0) {
    return {
      sport: "bike",
      lt1: { label: "FTP requis pour LT1/LT2 vélo", confidence: 0 },
      lt2: { label: "FTP requis pour LT1/LT2 vélo", confidence: 0 },
      notes: ["FTP manquant — renseigner un snapshot avec FTP pour activer l'estimation."],
    };
  }

  // TTE effectif (default 45 if absent)
  const tteEff = (tteValue != null && tteValue > 0) ? tteValue : 45;
  if (tteValue == null || tteValue <= 0) {
    notes.push("TTE absent — valeur par défaut 45 min utilisée.");
  }

  // VLamax effectif (default 0.40 if absent)
  const vlamaxEff = (vlamaxValue != null && vlamaxValue > 0) ? vlamaxValue : 0.40;
  if (vlamaxValue == null || vlamaxValue <= 0) {
    notes.push("VLamax manquant — valeur neutre 0.40 utilisée.");
  }

  // LT2 = clamp(0.93, 0.99, 0.96 + (tte - 45) * 0.002)
  const lt2_pcnt = clamp(0.93, 0.99, 0.96 + (tteEff - 45) * 0.002);

  // LT1 gap = clamp(0.12, 0.18, 0.15 + (vlamax - 0.35) * 0.10)
  const lt1_gap = clamp(0.12, 0.18, 0.15 + (vlamaxEff - 0.35) * 0.10);
  const lt1_pcnt = lt2_pcnt - lt1_gap;

  const lt2_watts = Math.round(ftp * lt2_pcnt);
  const lt1_watts = Math.round(ftp * lt1_pcnt);

  // Confidence calculation
  let confidence = 0.70;
  if (tteSource === "observed") confidence += 0.10;
  if (vlamaxSource === "test") confidence += 0.10;
  if (tteSource === "estimated" && vlamaxSource === "estimated") confidence -= 0.10;
  if (tteSource === "unknown" && vlamaxSource === "unknown") confidence -= 0.10;
  confidence = clamp(0.45, 0.90, confidence);

  notes.push(
    `LT2 = ${(lt2_pcnt * 100).toFixed(0)}% FTP (TTE=${tteEff}min → ajustement seuil)`,
    `LT1 = ${(lt1_pcnt * 100).toFixed(0)}% FTP (VLamax=${vlamaxEff.toFixed(2)} → écart glycolytique)`,
  );

  return {
    sport: "bike",
    lt1: {
      pct_of_ftp: Math.round(lt1_pcnt * 100),
      watts: lt1_watts,
      label: `${Math.round(lt1_pcnt * 100)}% FTP — ${lt1_watts} W`,
      confidence,
    },
    lt2: {
      pct_of_ftp: Math.round(lt2_pcnt * 100),
      watts: lt2_watts,
      label: `${Math.round(lt2_pcnt * 100)}% FTP — ${lt2_watts} W`,
      confidence,
    },
    notes,
  };
}

// ═══════════════════════════════════════════
// FIXED TFCL ↔ LACTATE CORRESPONDENCE TABLE
// ═══════════════════════════════════════════

export interface TFCLLactateRow {
  element: string;
  correspondence: string;
  dataSource: string;
  staffWhy: string;
}

export const TFCL_LACTATE_TABLE: TFCLLactateRow[] = [
  {
    element: "FatMax zone",
    correspondence: "Proche LT1 — Z2",
    dataSource: "VLamax + FTP",
    staffWhy: "L'oxydation lipidique maximale se situe juste sous ou au niveau de LT1.",
  },
  {
    element: "Endurance stricte",
    correspondence: "Sous LT1 — Z1/Z2 bas",
    dataSource: "FTP + VLamax",
    staffWhy: "Maintien en zone aérobie pure, lactate stable < 2 mmol/L.",
  },
  {
    element: "Sweet Spot / Tempo",
    correspondence: "Entre LT1 et LT2 — haut Z3 / bas Z4",
    dataSource: "FTP + TTE + VLamax",
    staffWhy: "Zone de transition : sollicitation mixte aérobie-glycolytique.",
  },
  {
    element: "Seuil durable",
    correspondence: "LT2 — Z4 Seuil",
    dataSource: "FTP + TTE",
    staffWhy: "Intensité maximale soutenable sans accumulation nette de lactate (~4 mmol/L).",
  },
  {
    element: "Race Intensity long",
    correspondence: "Juste sous LT2 — Z3 haut",
    dataSource: "FTP + TTE",
    staffWhy: "Compromis optimal entre puissance et durabilité pour effort >2h.",
  },
];
