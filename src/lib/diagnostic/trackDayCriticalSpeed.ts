/**
 * Vitesse critique du Track Day : 1 500 m puis 3 000 m maximaux, 30 min de récupération.
 *
 * Modèle distance–temps à deux points : d = D′ + CS·t, donc CS = (3000 − 1500) / (t3000 − t1500)
 * et D′ = 3000 − CS·t3000. Trois courses maximales le même jour avec 30 min de repos donnent la
 * même CS que le protocole classique sur tapis (Galbraith et al., IJSPP 2014) ; deux distances
 * suffisent à estimer la CS (Kordi et al., IJSPP 2019 : 4,94 m/s avec 2 ou 3 essais).
 * Avec deux points seulement, la CS reste une estimation : un troisième effort (1 000 m) la confirme.
 */
export interface TrackCriticalSpeed {
  valid: boolean;
  csMs: number;
  dPrimeM: number;
  error: string | null;
}

const NONE: TrackCriticalSpeed = { valid: false, csMs: 0, dPrimeM: 0, error: null };

export function criticalSpeedFromTrack(sec1500: number, sec3000: number): TrackCriticalSpeed {
  if (!(sec1500 > 0) || !(sec3000 > 0)) return NONE;
  const fail = (error: string): TrackCriticalSpeed => ({ ...NONE, error });
  if (sec1500 < 180 || sec1500 > 900) return fail("Temps du 1 500 m hors des limites (3 à 15 min).");
  if (sec3000 < 420 || sec3000 > 1500) return fail("Temps du 3 000 m hors des limites (7 à 25 min).");
  // Le 3 000 m doit être plus lent au kilomètre que le 1 500 m, sans l'être exagérément.
  const ratio = sec3000 / sec1500;
  if (ratio <= 2) return fail("Le 3 000 m est aussi rapide au kilomètre que le 1 500 m : un des deux efforts n'était pas maximal.");
  if (ratio > 2.6) return fail("Le 3 000 m est beaucoup plus lent que le 1 500 m : effort non maximal ou récupération insuffisante.");
  const csMs = 1500 / (sec3000 - sec1500);
  const dPrimeM = 3000 - csMs * sec3000;
  if (dPrimeM < 30 || dPrimeM > 500) return fail(`D′ calculé à ${Math.round(dPrimeM)} m, hors des valeurs plausibles (30–500 m) : vérifier les deux temps.`);
  return { valid: true, csMs, dPrimeM, error: null };
}
