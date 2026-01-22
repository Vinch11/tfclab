/**
 * Types pour l'import et l'analyse de fichiers FIT
 * Module Two For Coaching Lab - Import Séances Nolio
 */

// Structure de base d'un enregistrement FIT
export interface FitRecord {
  timestamp: Date;
  powerW?: number;
  heartRate?: number;
  cadence?: number;
  speed?: number; // m/s
  altitude?: number; // m
  distance?: number; // m cumulative
  temperature?: number; // C
  position?: { lat: number; lng: number };
}

// Structure d'un lap/tour
export interface FitLap {
  startTime: Date;
  endTime: Date;
  totalTimerTime: number; // seconds
  totalDistance: number; // meters
  avgPower?: number;
  maxPower?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  avgSpeed?: number;
  lapTrigger?: string;
}

// Session FIT parsée
export interface FitSession {
  startTime: Date;
  endTime?: Date;
  sport?: string;
  subSport?: string;
  totalTimeSec: number;
  movingTimeSec: number;
  totalDistance: number; // meters
  records: FitRecord[];
  laps: FitLap[];
  deviceInfo?: {
    manufacturer?: string;
    product?: string;
    serialNumber?: string;
  };
  avgPower?: number;
  maxPower?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  normalizedPower?: number;
}

// Types de tests détectables
export type DetectedTestType =
  | "FTP_20MIN"
  | "FTP_2x8MIN"
  | "FTP_RAMP"
  | "MAP_5MIN"
  | "SPRINT_15S"
  | "SPRINT_30S"
  | "SPRINT_60S"
  | "Z2_DRIFT"
  | "TTE_THRESHOLD"
  | "UNKNOWN";

// Résultat de la détection du type de test
export interface TestTypeDetection {
  type: DetectedTestType;
  confidence: number; // 0-1
  reasoning: string;
  alternativeTypes?: DetectedTestType[];
}

// Best Efforts calculés
export interface BestEfforts {
  p5s?: number;
  p15s?: number;
  p30s?: number;
  p60s?: number;
  p5min?: number;
  p8min?: number;
  p12min?: number;
  p20min?: number;
  p40min?: number;
  p60min?: number;
  // HR correspondantes
  hr5s?: number;
  hr15s?: number;
  hr30s?: number;
  hr60s?: number;
  hr5min?: number;
  hr8min?: number;
  hr12min?: number;
  hr20min?: number;
  hr40min?: number;
  hr60min?: number;
  // Timestamps des meilleurs efforts
  timestamps?: Record<string, Date>;
}

// Résultats du calcul de drift/decoupling
export interface DriftAnalysis {
  driftPercent: number;
  powerAvg1stHalf: number;
  hrAvg1stHalf: number;
  powerAvg2ndHalf: number;
  hrAvg2ndHalf: number;
  ratio1stHalf: number;
  ratio2ndHalf: number;
  driftLevel: "low" | "moderate" | "high";
  segmentDurationMin: number;
  isValid: boolean;
  invalidReason?: string;
}

// Estimation FTP
export interface FtpEstimate {
  ftpWatts: number;
  method: string;
  basePower: number;
  coefficient: number;
  confidence: number;
  notes?: string;
}

// TTE observé
export interface TteObservation {
  tteMinutes: number;
  targetFtp: number;
  intensityThreshold: number; // % of FTP (0.95 or 1.0)
  continuousDurationSec: number;
  avgPowerDuringTte: number;
  confidence: number;
  notes?: string;
}

// Score de qualité du protocole
export interface ProtocolQuality {
  score: number; // 1-5
  factors: {
    powerStability: number; // CV
    noPauses: boolean;
    pacingCoherent: boolean;
    hrResponseCoherent: boolean;
    sensorsPresent: {
      power: boolean;
      heartRate: boolean;
      cadence: boolean;
    };
  };
  justification: string;
}

// Résultat complet de l'analyse FIT
export interface FitAnalysisResult {
  session: FitSession;
  testType: TestTypeDetection;
  bestEfforts: BestEfforts;
  ftpEstimate?: FtpEstimate;
  mapEstimate?: number;
  tteObservation?: TteObservation;
  driftAnalysis?: DriftAnalysis;
  protocolQuality: ProtocolQuality;
  // Métriques brutes pour stockage
  rawMetrics: {
    avgPower?: number;
    maxPower?: number;
    avgHr?: number;
    maxHr?: number;
    avgCadence?: number;
    totalDuration: number;
    movingTime: number;
    normalizedPower?: number;
  };
}

// Données pour le "Test Observé" à sauvegarder
export interface ObservedTestData {
  athleteId: string;
  type: DetectedTestType;
  date: string;
  metrics: {
    ftp?: number;
    map?: number;
    p30s?: number;
    p60s?: number;
    p5min?: number;
    tte_observed_min?: number;
    drift_percent?: number;
  };
  bestEfforts: BestEfforts;
  protocolQuality: number;
  confidence: number;
  source: "FIT_IMPORT";
  fileMeta: {
    fileName: string;
    fileSize: number;
    device?: string;
    sport?: string;
  };
  rawSession?: Partial<FitSession>;
}

// Impact sur le profil de référence
export interface ProfileUpdatePreview {
  field: string;
  label: string;
  currentValue?: number;
  newValue?: number;
  source: string;
  willUpdate: boolean;
  requiresConfirmation: boolean;
}
