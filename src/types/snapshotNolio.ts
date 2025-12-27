// =============================================
// SNAPSHOT NOLIO - Données importées depuis NOLIO
// =============================================

export interface SnapshotNolio {
  id: string;
  date: string;
  // Données de puissance
  ftp: number;                // FTP actuel (W)
  pmax_5s: number;            // Puissance max 5 secondes (W)
  poids: number;              // Poids (kg)
  // Données physiologiques optionnelles
  vo2max?: number;            // VO2max estimé (ml/kg/min)
  hrv?: number;               // HRV (ms)
  fc_max?: number;            // FC max (bpm)
  fc_repos?: number;          // FC repos (bpm)
  // Charge d'entraînement
  tss_7j: number;             // TSS cumulé 7 derniers jours
  tss_28j?: number;           // TSS cumulé 28 jours (CTL)
  // Métadonnées
  source?: "nolio" | "manual";
  notes?: string;
}

// Estimation TTE basée sur TSS hebdomadaire
export function estimerTTE(ftp: number, tss_7j: number): number {
  if (tss_7j >= 700) return 70;
  if (tss_7j >= 550) return 65;
  if (tss_7j >= 400) return 55;
  return 45;
}

// Score de confiance basé sur les données disponibles
export function scoreConfiance(snapshot: SnapshotNolio): number {
  let score = 0;
  if (snapshot.ftp) score += 0.25;
  if (snapshot.pmax_5s) score += 0.25;
  if (snapshot.vo2max) score += 0.20;
  if (snapshot.hrv) score += 0.15;
  if (snapshot.poids) score += 0.15;
  return Math.round(Math.min(score, 1) * 100);
}

// Créer un snapshot vide avec valeurs par défaut
export function creerSnapshotVide(): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    ftp: 0,
    pmax_5s: 0,
    poids: 70,
    tss_7j: 0,
    source: "manual",
  };
}

// Créer un snapshot exemple
export function creerSnapshotExemple(): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    ftp: 280,
    pmax_5s: 1050,
    poids: 70,
    vo2max: 52,
    hrv: 60,
    fc_max: 190,
    fc_repos: 50,
    tss_7j: 550,
    tss_28j: 2200,
    source: "nolio",
  };
}
