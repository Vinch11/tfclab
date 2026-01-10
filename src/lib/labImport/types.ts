// =============================================
// TYPES - Lab Import PDF Parser
// =============================================

/**
 * Standard extraction format from lab PDF reports
 */
export interface LabExtract {
  meta: {
    reportType: "quentin" | "mika" | "unknown";
    reportDate: string | null;
    athleteName: string | null;
    discipline: string | null;
    sourceConfidence: number; // 0-1, reduced if OCR used
  };
  anthropo: {
    height_cm: number | null;
    weight_kg: number | null;
    fat_pct: number | null;
    bmi: number | null;
  };
  cardio: {
    hr_rest: number | null;
    hr_max: number | null;
    hrv: number | null;
    spo2: number | null;
    bp_sys: number | null;
    bp_dia: number | null;
  };
  performance: {
    sport: "run" | "bike" | "tri" | "unknown";
    vo2max_ml_kg_min: number | null;
    vo2max_l_min: number | null;
    vma_kmh: number | null;
    vma_pace_sec_km: number | null;
    ftp_w: number | null;
    pmax_w: number | null;
    pma_w: number | null;
  };
  thresholds: {
    lt1: {
      hr: number | null;
      speed_kmh: number | null;
      power_w: number | null;
      lactate: number | null;
    } | null;
    lt2: {
      hr: number | null;
      speed_kmh: number | null;
      power_w: number | null;
      lactate: number | null;
    } | null;
    obla: {
      hr: number | null;
      speed_kmh: number | null;
      power_w: number | null;
      lactate: number | null;
    } | null;
  };
  vlamax: {
    value: number | null;
    source: string | null;
  };
  lactate: {
    lactate_max: number | null;
  };
  glycemia: {
    min: number | null;
    max: number | null;
    notes: string | null;
  };
  economy: {
    running_cost_ml_kg_km: number | null;
  };
  notes: string[];
  raw: {
    textPages: string[];
    usedOcr: boolean;
  };
}

/**
 * Field extraction status for validation UI
 */
export interface ExtractedField {
  key: string;
  label: string;
  value: string | number | null;
  pageSource: number | null;
  status: "ok" | "verify" | "not_found";
  editable: boolean;
}

/**
 * Comparison with previous snapshot
 */
export interface SnapshotDelta {
  field: string;
  label: string;
  previous: number | null;
  imported: number | null;
  delta: string;
}

/**
 * Parser result
 */
export interface ParserResult {
  success: boolean;
  extract: LabExtract | null;
  error: string | null;
  parserUsed: "quentin" | "mika" | "generic" | "ocr" | null;
}

/**
 * Empty LabExtract factory
 */
export function createEmptyLabExtract(): LabExtract {
  return {
    meta: {
      reportType: "unknown",
      reportDate: null,
      athleteName: null,
      discipline: null,
      sourceConfidence: 0,
    },
    anthropo: {
      height_cm: null,
      weight_kg: null,
      fat_pct: null,
      bmi: null,
    },
    cardio: {
      hr_rest: null,
      hr_max: null,
      hrv: null,
      spo2: null,
      bp_sys: null,
      bp_dia: null,
    },
    performance: {
      sport: "unknown",
      vo2max_ml_kg_min: null,
      vo2max_l_min: null,
      vma_kmh: null,
      vma_pace_sec_km: null,
      ftp_w: null,
      pmax_w: null,
      pma_w: null,
    },
    thresholds: {
      lt1: null,
      lt2: null,
      obla: null,
    },
    vlamax: {
      value: null,
      source: null,
    },
    lactate: {
      lactate_max: null,
    },
    glycemia: {
      min: null,
      max: null,
      notes: null,
    },
    economy: {
      running_cost_ml_kg_km: null,
    },
    notes: [],
    raw: {
      textPages: [],
      usedOcr: false,
    },
  };
}
