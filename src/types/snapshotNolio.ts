// =============================================
// SNAPSHOT NOLIO - Données importées depuis NOLIO
// Multi-sport: Vélo / Course / Natation
// =============================================

export type SportType = "vélo" | "course" | "natation";

export interface SnapshotNolio {
  id: string;
  date: string;
  sport: SportType;
  // Données communes
  poids: number;              // Poids (kg)
  vo2max?: number;            // VO2max estimé (ml/kg/min)
  hrv?: number;               // HRV (ms)
  fc_max?: number;            // FC max (bpm)
  fc_repos?: number;          // FC repos (bpm)
  // Vélo
  ftp?: number;               // FTP actuel (W)
  pmax_5s?: number;           // Puissance max 5 secondes (W)
  p30s_w?: number;            // Best 30s power (W)
  p60s_w?: number;            // Best 60s power (W)
  map5min_w?: number;         // MAP 5min power (W)
  protocol_quality?: number;  // Qualité du protocole (1-5)
  tss_7j?: number;            // TSS cumulé 7 derniers jours
  tss_28j?: number;           // TSS cumulé 28 jours (CTL)
  // Course
  vma?: number;               // VMA (km/h)
  allure_seuil?: number;      // Allure seuil (min/km)
  // Puissance Running (Stryd/Garmin/COROS)
  running_power_threshold?: number; // Puissance seuil course (W)
  running_power_max?: number;       // Puissance max course (W)
  running_power_1s?: number;        // Peak 1s running power (W)
  running_power_5s?: number;        // Peak 5s running power (W)
  running_power_30s?: number;       // Best 30s running power (W)
  running_power_60s?: number;       // Best 60s running power (W)
  running_power_5min?: number;      // Best 5min running power (W)
  // Natation
  pace100?: number;           // Pace 100m (secondes)
  css?: number;               // Critical Swim Speed (sec/100m)
  // TTE
  tte_observed_min?: number;     // TTE observée terrain (min)
  // Métadonnées
  source?: "nolio" | "manual";
  notes?: string;
}

// Estimation TTE basée sur le sport
export function estimerTTESport(snapshot: SnapshotNolio): number {
  if (snapshot.sport === "vélo") {
    // TTE vélo = 45 + tss_7j/10
    return snapshot.tss_7j ? Math.round(45 + snapshot.tss_7j / 10) : 45;
  }
  if (snapshot.sport === "course") {
    // TTE course = seuil * 4 (si allure_seuil disponible) sinon 45
    return snapshot.allure_seuil ? Math.round(snapshot.allure_seuil * 4 * 10) : 45;
  }
  if (snapshot.sport === "natation") {
    return 45; // moyenne séance natation
  }
  return 45;
}

// Estimation TTE vélo classique (pour compatibilité)
export function estimerTTE(ftp: number, tss_7j: number): number {
  return tss_7j ? Math.round(45 + tss_7j / 10) : 45;
}

// Résultat VLamax avec confiance et précision
export interface VLamaxAvecConfiance {
  vlamax: number;
  confiance: number;      // 0-100%
  precision: number;      // ± pourcentage d'erreur estimée
  ageSnapshot: number;    // Jours depuis le snapshot
}

// Score de confiance basé sur les données disponibles (avec pénalité âge)
export function scoreConfiance(snapshot: SnapshotNolio): number {
  let score = 0;
  
  // Score selon sport
  if (snapshot.sport === "vélo") {
    if (snapshot.ftp) score += 0.25;
    if (snapshot.pmax_5s) score += 0.25;
  } else if (snapshot.sport === "course") {
    if (snapshot.vma) score += 0.35;
    if (snapshot.allure_seuil) score += 0.15;
  } else if (snapshot.sport === "natation") {
    if (snapshot.pace100) score += 0.30;
    if (snapshot.css) score += 0.20;
  }
  if (snapshot.vo2max) score += 0.20;
  if (snapshot.hrv) score += 0.15;
  if (snapshot.poids) score += 0.15;
  
  // Pénalité pour ancienneté du snapshot (1% par semaine)
  const ageJours = calculerAgeSnapshot(snapshot.date);
  const penalite = Math.floor(ageJours / 7) * 0.01;
  score = Math.max(0, Math.min(1, score - penalite));
  
  return Math.round(score * 100);
}

// Calculer l'âge du snapshot en jours
export function calculerAgeSnapshot(date: string): number {
  if (!date) return 0;
  const dSnap = new Date(date);
  const dNow = new Date();
  return Math.floor((dNow.getTime() - dSnap.getTime()) / (1000 * 60 * 60 * 24));
}

// Calculer la précision estimée (± erreur en %)
export function calculerPrecision(confiance: number): number {
  // ± 10% minimum, jusqu'à ± 20% si confiance faible
  return Math.round(10 + ((100 - confiance) / 100) * 10);
}

// Créer un snapshot vide avec valeurs par défaut
export function creerSnapshotVide(sport: SportType = "vélo"): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    sport,
    poids: 70,
    source: "manual",
  };
}

// Créer un snapshot exemple vélo
export function creerSnapshotExemple(): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    sport: "vélo",
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

// Créer un snapshot exemple course
export function creerSnapshotExempleCourse(): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    sport: "course",
    poids: 70,
    vma: 18,
    allure_seuil: 4.2,
    vo2max: 55,
    hrv: 62,
    source: "nolio",
  };
}

// Créer un snapshot exemple natation
export function creerSnapshotExempleNatation(): SnapshotNolio {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    sport: "natation",
    poids: 70,
    pace100: 95,
    css: 1.6,
    vo2max: 50,
    source: "nolio",
  };
}
