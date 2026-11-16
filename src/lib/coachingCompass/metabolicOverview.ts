import type { CoachingCompassInput } from './types';
import { calculateFatOxidation, calculateCarbOxidation, intensityToPowerWatts } from '@/lib/v2/maderMetabolicModel';

const positive = (v: number | null | undefined): v is number => v != null && Number.isFinite(v) && v > 0;

/** Exploratory display only: no prescriptions, no threshold fitting, no cross-sport inputs. */
export function metabolicOverview(input: CoachingCompassInput, sport: 'bike' | 'run') {
  const vlamax = sport === 'run' ? input.vlamaxRunReference?.value : input.vlamaxEffectif.value;
  const missing = [!positive(input.vo2max) && 'VO₂max', !positive(vlamax) && `VLamax ${sport === 'run' ? 'course' : 'vélo'}`, !positive(input.poids) && 'poids', !positive(sport === 'run' ? input.vma : input.ftp) && (sport === 'run' ? 'VMA' : 'FTP')].filter((v): v is string => typeof v === 'string');
  if (!positive(input.vo2max) || !positive(vlamax) || !positive(input.poids) || missing.length) return { missing, points: [], peak: null, crossover: null };
  const vo2max = input.vo2max, weight = input.poids;
  const points = Array.from({ length: 81 }, (_, i) => {
    const intensity = 20 + i;
    const fat = calculateFatOxidation(intensity, vo2max, vlamax, weight) * 60;
    const carbs = calculateCarbOxidation(intensity, vo2max, vlamax, weight) * 60;
    return { intensity, output: sport === 'run' ? (input.vma ?? 0) * intensity / 100 : intensityToPowerWatts(intensity, vo2max, weight, 0.23), fat, carbs, fatEnergy: fat * 9, carbEnergy: carbs * 4 };
  });
  const peak = points.reduce((best, p) => p.fat > best.fat ? p : best, points[0]);
  const crossover = points.find(p => p.carbEnergy >= p.fatEnergy) ?? null;
  return { missing, points, peak, crossover };
}