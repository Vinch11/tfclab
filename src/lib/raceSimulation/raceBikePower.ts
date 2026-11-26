/** Puissance vélo du jour de course : source unique partagée avec les edge functions (plans). */
export {
  raceBikePower, raceBikeCap, raceBikeSpeedKmh, raceBikeDistanceKey, normalizeRaceAmbition,
  type RaceBikePowerInput, type RaceBikePowerResult, type RaceBikeDistance,
} from "../../../supabase/functions/_shared/raceBikePower.ts";
