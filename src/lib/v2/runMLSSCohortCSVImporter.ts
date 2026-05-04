/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUN MLSS COHORT — CSV IMPORTER
 *
 * Parser flexible pour ingérer des profils de validation externes (publications,
 * datasets labo, cohortes anonymisées) dans la table calibration_evidence.
 *
 * COLONNES RECONNUES (alias, casse insensible, séparateurs `_` ou ` ` tolérés) :
 *   - Identité       : nom_anonymise | id | name | athlete
 *   - Date           : date | test_date         (ISO ou YYYY-MM-DD, défaut = today)
 *   - VLamax         : vlamax_labo_mmol_l_s | vlamax | vlamax_run                 (mmol/L/s)
 *   - VO2max         : vo2max_mlkgmin | vo2max                                    (ml/kg/min)
 *   - VMA / vDOT     : vdot_ou_vma | vma | vdot                                   (km/h)
 *   - Pace seuil     : pace_threshold_sec_per_km | pace_sec | pace_min            (sec/km ou mm:ss)
 *   - MLSS direct    : mlss_pct_vo2max | mlss_pct | observed_mlss                 (% VO2max)
 *   - CE             : running_economy | ce | ce_mlo2kgkm                         (mlO2/kg/km)
 *   - Qualité        : protocol_quality | quality                                 (1-5)
 *   - Méthode/source : methode_mesure / method ; source_publication / source
 *   - Sport / sexe / âge / poids : facultatifs, stockés en notes
 *
 * RÈGLES :
 *   - `MLSS_pct_VO2max` direct prioritaire sur la dérivation pace+VMA.
 *   - Si CE absente et VLamax+MLSS connus → CE estimée par inversion du Modèle C
 *     (CE_est = ((1 − MLSS/100) − 0.337·VLa) / −0.0021 + 200, clampée 180-260).
 *   - Qualité défaut : 4 si méthode = lab/INSCYD/Mader_Heck, sinon 3.
 *   - used_in_calibration = false (trace pure, aucune influence calculs internes).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ImportRowResult {
  rowIndex: number;
  status: "ok" | "warn" | "error";
  message?: string;
  payload?: {
    date: string;
    protocolQuality: 2 | 3 | 4 | 5;
    confidence: number;
    notes: string;
    rawValues: {
      vlamaxRun: number;
      runningEconomy: number;
      paceThresholdSecPerKm: number;
      vmaKmh: number;
      observedMLSSPct: number;
      testProtocol?: string;
      tier: "lab" | "field";
      externalId?: string;
      method?: string;
      source?: string;
      sport?: string;
      sex?: string;
      age?: number;
      weightKg?: number;
    };
  };
}

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

// ─── Parser CSV minimal (gère quoting + virgule)  ────────────────────────────
export function parseCSV(text: string): ParsedCSV {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]).map((h) => normalizeKey(h));
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const COL_ALIASES: Record<string, string[]> = {
  externalId: ["nom_anonymise", "id", "name", "athlete", "athlete_id"],
  date: ["date", "test_date"],
  vlamax: ["vlamax_labo_mmol_l_s", "vlamax", "vlamax_run", "vla"],
  vo2max: ["vo2max_mlkgmin", "vo2max", "vo2_max"],
  vma: ["vdot_ou_vma", "vma", "vdot"],
  paceSec: ["pace_threshold_sec_per_km", "pace_sec_per_km", "pace_sec"],
  paceMmSs: ["pace", "pace_min_per_km", "pace_threshold"],
  mlss: ["mlss_pct_vo2max", "mlss_pct", "observed_mlss", "observed_mlss_pct"],
  ce: ["running_economy", "ce", "ce_mlo2kgkm", "running_economy_mlo2kgkm"],
  quality: ["protocol_quality", "quality"],
  method: ["methode_mesure", "method"],
  source: ["source_publication", "source"],
  sport: ["sport_specialite", "sport", "specialite"],
  sex: ["sexe", "sex"],
  age: ["age"],
  weight: ["poids_kg", "weight_kg", "weight"],
};

function findCol(headers: string[], aliases: string[]): number {
  for (const a of aliases) {
    const idx = headers.indexOf(a);
    if (idx >= 0) return idx;
  }
  return -1;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function paceMmSsToSec(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    if (sec >= 60) return null;
    return min * 60 + sec;
  }
  return num(s);
}

/** Inverse du Modèle C pour estimer CE quand absente : MLSS_pct = 1 − 0.337·VLa − 0.0021·(CE−200) */
function invertCE(vlamax: number, mlssPct: number): number {
  const mlssFrac = mlssPct / 100;
  const ce = ((1 - mlssFrac - 0.337 * vlamax) / -0.0021) + 200;
  // clamp physiologique
  return Math.max(180, Math.min(260, ce));
}

function inferQualityFromMethod(method?: string): 2 | 3 | 4 | 5 {
  if (!method) return 3;
  const m = method.toLowerCase();
  if (/lab|inscyd|mader|heck|ppd|gas/.test(m)) return 4;
  if (/field|terrain|race|estim/.test(m)) return 3;
  return 3;
}

export function importCSV(text: string, defaultDate?: string): ImportRowResult[] {
  const { headers, rows } = parseCSV(text);
  if (headers.length === 0) return [];

  const idx = {
    externalId: findCol(headers, COL_ALIASES.externalId),
    date: findCol(headers, COL_ALIASES.date),
    vlamax: findCol(headers, COL_ALIASES.vlamax),
    vo2max: findCol(headers, COL_ALIASES.vo2max),
    vma: findCol(headers, COL_ALIASES.vma),
    paceSec: findCol(headers, COL_ALIASES.paceSec),
    paceMmSs: findCol(headers, COL_ALIASES.paceMmSs),
    mlss: findCol(headers, COL_ALIASES.mlss),
    ce: findCol(headers, COL_ALIASES.ce),
    quality: findCol(headers, COL_ALIASES.quality),
    method: findCol(headers, COL_ALIASES.method),
    source: findCol(headers, COL_ALIASES.source),
    sport: findCol(headers, COL_ALIASES.sport),
    sex: findCol(headers, COL_ALIASES.sex),
    age: findCol(headers, COL_ALIASES.age),
    weight: findCol(headers, COL_ALIASES.weight),
  };

  const today = defaultDate ?? new Date().toISOString().split("T")[0];
  const results: ImportRowResult[] = [];

  rows.forEach((row, i) => {
    const get = (k: number): string | undefined => (k >= 0 ? row[k] : undefined);
    const externalId = get(idx.externalId)?.trim() || `IMPORT_${i + 1}`;

    const vlamax = num(get(idx.vlamax));
    const vma = num(get(idx.vma));
    const vo2 = num(get(idx.vo2max));
    let mlssPct = num(get(idx.mlss));
    let paceSec = idx.paceSec >= 0 ? num(get(idx.paceSec)) : paceMmSsToSec(get(idx.paceMmSs));
    let ce = num(get(idx.ce));

    const method = get(idx.method);
    const source = get(idx.source);

    if (vlamax == null || vlamax <= 0) {
      results.push({ rowIndex: i + 1, status: "error", message: `${externalId}: VLamax manquante ou invalide` });
      return;
    }

    // 1) MLSS observé : direct OU dérivé pace+VMA
    let observedSource: "direct" | "derived" | null = null;
    if (mlssPct != null && mlssPct >= 50 && mlssPct <= 100) {
      observedSource = "direct";
    } else if (paceSec != null && paceSec > 0 && vma != null && vma > 0) {
      const speedKmh = 3600 / paceSec;
      const ratio = (speedKmh / vma) * 100;
      if (ratio >= 50 && ratio <= 100) {
        mlssPct = Number(ratio.toFixed(1));
        observedSource = "derived";
      }
    }
    if (observedSource == null || mlssPct == null) {
      results.push({ rowIndex: i + 1, status: "error", message: `${externalId}: MLSS observé indéterminable (ni MLSS direct ni pace+VMA exploitables)` });
      return;
    }

    // 2) CE : direct OU estimée par inversion Modèle C
    let ceSource: "direct" | "estimated" = "direct";
    if (ce == null || ce <= 0) {
      ce = Number(invertCE(vlamax, mlssPct).toFixed(1));
      ceSource = "estimated";
    }

    // 3) Pace+VMA synthétiques si manquants (pour conformité buildCohortEntry)
    const vmaFinal = vma ?? (vo2 != null ? Number((vo2 / 3.5).toFixed(1)) : 16.0);
    if (paceSec == null) {
      const speedSeuilKmh = vmaFinal * (mlssPct / 100);
      paceSec = Math.round(3600 / speedSeuilKmh);
    }

    // 4) Qualité
    let q: 2 | 3 | 4 | 5;
    const qRaw = num(get(idx.quality));
    if (qRaw != null && qRaw >= 2 && qRaw <= 5) {
      q = Math.round(qRaw) as 2 | 3 | 4 | 5;
    } else {
      q = inferQualityFromMethod(method);
    }
    const tier: "lab" | "field" = q >= 4 ? "lab" : "field";

    const dateRaw = get(idx.date);
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : today;

    const sport = get(idx.sport);
    const sex = get(idx.sex);
    const age = num(get(idx.age));
    const weight = num(get(idx.weight));

    const noteParts = [
      `IMPORT CSV · ${externalId}`,
      sport ? `sport=${sport}` : null,
      sex ? `sexe=${sex}` : null,
      age != null ? `age=${age}` : null,
      weight != null ? `poids=${weight}kg` : null,
      vo2 != null ? `VO2max=${vo2}` : null,
      method ? `méthode=${method}` : null,
      source ? `source=${source}` : null,
      `MLSS=${observedSource}`,
      `CE=${ceSource}`,
    ].filter(Boolean).join(" · ");

    const confidence = q === 5 ? 0.95 : q === 4 ? 0.9 : q === 3 ? 0.75 : 0.6;

    results.push({
      rowIndex: i + 1,
      status: ceSource === "estimated" ? "warn" : "ok",
      message: ceSource === "estimated"
        ? `${externalId}: CE estimée par inversion Modèle C (${ce} mlO₂/kg/km)`
        : `${externalId}: OK (tier=${tier})`,
      payload: {
        date,
        protocolQuality: q,
        confidence,
        notes: noteParts,
        rawValues: {
          vlamaxRun: vlamax,
          runningEconomy: ce,
          paceThresholdSecPerKm: paceSec!,
          vmaKmh: vmaFinal,
          observedMLSSPct: mlssPct,
          testProtocol: method ?? "csv_import",
          tier,
          externalId,
          method,
          source,
          sport,
          sex,
          age: age ?? undefined,
          weightKg: weight ?? undefined,
        },
      },
    });
  });

  return results;
}

export const SYNTHETIC_COHORT_ATHLETE_NAME = "COHORT_EXTERNAL_REFERENCE";
