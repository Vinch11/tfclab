// =============================================
// TYPES SUIVI LONGITUDINAL & ALERTES
// =============================================

export type AlertLevel = "info" | "warn" | "error";

export interface Alert {
  level: AlertLevel;
  title: string;
  detail: string;
}

export interface MonthlyVLamaxData {
  month: string;
  vlamax: number | null;
  confPct: number;
  n: number;
}

export interface TrendResult {
  dir: "up" | "down" | "stable";
  slope: number;
}

export interface RefStatus {
  refs: {
    fcMax: number | null;
    vma: number | null;
    ftp: number | null;
    css: number | null;
  };
  missing: string[];
}
