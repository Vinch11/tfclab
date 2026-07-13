/**
 * Parser FIT - Lecture et extraction des données d'un fichier FIT
 * Utilise fit-file-parser pour le décodage binaire
 */

import FitParser from "fit-file-parser";
import type { FitSession, FitRecord, FitLap } from "./types";

/**
 * Parse un fichier FIT et retourne une session structurée
 */
export async function parseFitFile(file: File): Promise<FitSession> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error("Impossible de lire le fichier"));
          return;
        }

        const fitParser = new FitParser({
          force: true,
          speedUnit: "m/s",
          lengthUnit: "m",
          temperatureUnit: "celsius",
          elapsedRecordField: true,
          mode: "list",
        });

        fitParser.parse(arrayBuffer, ((error: string | null, data: FitData) => {
          if (error) {
            reject(new Error(`Erreur de parsing FIT: ${error}`));
            return;
          }

          try {
            const session = extractSession(data);
            resolve(session);
          } catch (e) {
            reject(e);
          }
        }) as any);
      } catch (e) {
        reject(new Error(`Erreur de lecture: ${e instanceof Error ? e.message : "Inconnue"}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erreur de lecture du fichier"));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Type pour les données FIT parsées
interface FitData {
  sessions?: FitSessionRaw[];
  records?: FitRecordRaw[];
  laps?: FitLapRaw[];
  device_infos?: FitDeviceInfo[];
  file_ids?: FitFileId[];
  activity?: FitActivity;
}

interface FitSessionRaw {
  start_time?: Date | string;
  timestamp?: Date | string;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  sport?: string;
  sub_sport?: string;
  avg_power?: number;
  max_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  normalized_power?: number;
}

interface FitRecordRaw {
  timestamp?: Date | string;
  power?: number;
  heart_rate?: number;
  cadence?: number;
  speed?: number;
  enhanced_speed?: number;
  altitude?: number;
  enhanced_altitude?: number;
  distance?: number;
  temperature?: number;
  position_lat?: number;
  position_long?: number;
}

interface FitLapRaw {
  start_time?: Date | string;
  timestamp?: Date | string;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  avg_power?: number;
  max_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  avg_speed?: number;
  lap_trigger?: string;
}

interface FitDeviceInfo {
  manufacturer?: string;
  product?: string | number;
  serial_number?: number;
  device_type?: string;
}

interface FitFileId {
  time_created?: Date | string;
  manufacturer?: string;
  product?: string | number;
  serial_number?: number;
  type?: string;
}

interface FitActivity {
  timestamp?: Date | string;
  total_timer_time?: number;
  num_sessions?: number;
}

/**
 * Extrait une session FIT structurée des données brutes
 */
function extractSession(data: FitData): FitSession {
  const sessionRaw = data.sessions?.[0];
  const recordsRaw = data.records || [];
  const lapsRaw = data.laps || [];
  const deviceInfo = data.device_infos?.[0] || data.file_ids?.[0];

  // Déterminer le temps de début
  let startTime = new Date();
  if (sessionRaw?.start_time) {
    startTime = parseDate(sessionRaw.start_time);
  } else if (recordsRaw[0]?.timestamp) {
    startTime = parseDate(recordsRaw[0].timestamp);
  }

  // Extraire les records
  const records: FitRecord[] = recordsRaw.map((r) => ({
    timestamp: parseDate(r.timestamp),
    powerW: r.power ?? undefined,
    heartRate: r.heart_rate ?? undefined,
    cadence: r.cadence ?? undefined,
    speed: r.enhanced_speed ?? r.speed ?? undefined,
    altitude: r.enhanced_altitude ?? r.altitude ?? undefined,
    distance: r.distance ?? undefined,
    temperature: r.temperature ?? undefined,
    position: r.position_lat && r.position_long
      ? { lat: r.position_lat, lng: r.position_long }
      : undefined,
  })).filter(r => r.timestamp);

  // Extraire les laps
  const laps: FitLap[] = lapsRaw.map((l) => ({
    startTime: parseDate(l.start_time),
    endTime: parseDate(l.timestamp),
    totalTimerTime: l.total_timer_time ?? l.total_elapsed_time ?? 0,
    totalDistance: l.total_distance ?? 0,
    avgPower: l.avg_power ?? undefined,
    maxPower: l.max_power ?? undefined,
    avgHeartRate: l.avg_heart_rate ?? undefined,
    maxHeartRate: l.max_heart_rate ?? undefined,
    avgCadence: l.avg_cadence ?? undefined,
    avgSpeed: l.avg_speed ?? undefined,
    lapTrigger: l.lap_trigger ?? undefined,
  }));

  // Calculer le temps total et le temps en mouvement
  const totalTimeSec = sessionRaw?.total_elapsed_time ?? calculateTotalTime(records);
  const movingTimeSec = sessionRaw?.total_timer_time ?? calculateMovingTime(records);
  const totalDistance = sessionRaw?.total_distance ?? (records[records.length - 1]?.distance ?? 0);

  // Calculer les moyennes si non présentes
  const avgPower = sessionRaw?.avg_power ?? calculateAvg(records, "powerW");
  const maxPower = sessionRaw?.max_power ?? calculateMax(records, "powerW");
  const avgHeartRate = sessionRaw?.avg_heart_rate ?? calculateAvg(records, "heartRate");
  const maxHeartRate = sessionRaw?.max_heart_rate ?? calculateMax(records, "heartRate");
  const avgCadence = sessionRaw?.avg_cadence ?? calculateAvg(records, "cadence");

  return {
    startTime,
    endTime: records[records.length - 1]?.timestamp,
    sport: sessionRaw?.sport ?? detectSportFromData(records),
    subSport: sessionRaw?.sub_sport,
    totalTimeSec,
    movingTimeSec,
    totalDistance,
    records,
    laps,
    deviceInfo: deviceInfo
      ? {
          manufacturer: deviceInfo.manufacturer,
          product: String(deviceInfo.product ?? ""),
          serialNumber: String(deviceInfo.serial_number ?? ""),
        }
      : undefined,
    avgPower,
    maxPower,
    avgHeartRate,
    maxHeartRate,
    avgCadence,
    normalizedPower: sessionRaw?.normalized_power,
  };
}

/**
 * Parse une date depuis différents formats FIT
 */
function parseDate(value: Date | string | number | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // FIT timestamp: seconds since 1989-12-31 00:00:00 UTC
    const fitEpoch = 631065600; // 1989-12-31 in Unix timestamp
    return new Date((value + fitEpoch) * 1000);
  }
  return new Date(value);
}

/**
 * Calcule le temps total depuis les records
 */
function calculateTotalTime(records: FitRecord[]): number {
  if (records.length < 2) return 0;
  const first = records[0].timestamp.getTime();
  const last = records[records.length - 1].timestamp.getTime();
  return (last - first) / 1000;
}

/**
 * Calcule le temps en mouvement (excluant pauses)
 */
function calculateMovingTime(records: FitRecord[]): number {
  if (records.length < 2) return 0;

  let movingTime = 0;
  const pauseThresholdMs = 30000; // 30s de pause max

  for (let i = 1; i < records.length; i++) {
    const delta = records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
    if (delta < pauseThresholdMs) {
      movingTime += delta;
    }
  }

  return movingTime / 1000;
}

/**
 * Calcule la moyenne d'un champ sur les records
 */
function calculateAvg(records: FitRecord[], field: keyof FitRecord): number | undefined {
  const values = records
    .map((r) => r[field])
    .filter((v): v is number => typeof v === "number" && !isNaN(v));

  if (values.length === 0) return undefined;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calcule le maximum d'un champ sur les records
 */
function calculateMax(records: FitRecord[], field: keyof FitRecord): number | undefined {
  const values = records
    .map((r) => r[field])
    .filter((v): v is number => typeof v === "number" && !isNaN(v));

  if (values.length === 0) return undefined;
  return Math.max(...values);
}

/**
 * Détecte le sport à partir des données (fallback)
 */
function detectSportFromData(records: FitRecord[]): string {
  // Si on a de la puissance, probablement vélo ou course avec capteur
  const hasPower = records.some((r) => r.powerW !== undefined);
  const avgSpeed = calculateAvg(records, "speed") ?? 0;

  // Vitesse moyenne > 15 km/h et puissance -> vélo
  if (hasPower && avgSpeed > 4) {
    return "cycling";
  }
  // Vitesse < 6 m/s (21.6 km/h) -> probablement course
  if (avgSpeed < 6) {
    return "running";
  }
  return "cycling";
}

/**
 * Valide qu'un fichier est un FIT valide
 */
export function validateFitFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "Aucun fichier fourni" };
  }

  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "fit") {
    return { valid: false, error: "Le fichier doit avoir l'extension .fit" };
  }

  // Taille max 50 MB
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: "Fichier trop volumineux (max 50 MB)" };
  }

  return { valid: true };
}
