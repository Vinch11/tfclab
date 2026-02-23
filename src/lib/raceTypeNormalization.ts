/**
 * Race Type Normalization — Source Unique de Vérité
 * 
 * Cette fonction normalise tous les formats de types de course vers un format canonique.
 * Exemples: "703" → "70.3", "im" → "IM", "semi" → "Semi"
 * 
 * IMPORTANT: Utiliser cette fonction partout où un type de course est affiché ou comparé.
 */

// Format canonique pour l'affichage
export type CanonicalRaceType = 'IM' | '70.3' | 'Marathon' | 'Semi' | '10km' | 'StartToRun' | 'Trail' | 'TrailLong' | 'Ultra' | 'Sprint' | 'Olympic';

// Format interne (clés dans physiologicalTargets)
export type InternalRaceType = 'IM' | '703' | 'Marathon' | 'Semi' | '10km' | 'StartToRun' | 'Trail' | 'TrailLong' | 'Ultra' | 'Sprint' | 'Olympic';

/**
 * Normalise un type de course vers le format canonique pour l'AFFICHAGE
 * Retourne toujours "70.3" (pas "703")
 */
export function normalizeRaceTypeForDisplay(input: string | null | undefined): CanonicalRaceType {
  if (!input) return '70.3';
  
  const lower = input.toLowerCase().trim();
  
  // Ironman
  if (lower === 'im' || lower === 'ironman' || lower.includes('ironman')) {
    return 'IM';
  }
  
  // 70.3 / Half - LE CAS PRINCIPAL
  if (lower === '703' || lower === '70.3' || lower === '70,3' || lower === 'half' || lower.includes('70.3') || lower.includes('half')) {
    return '70.3';
  }
  
  // Marathon (mais pas Semi-Marathon)
  if ((lower === 'marathon' || lower.includes('marathon')) && !lower.includes('semi')) {
    return 'Marathon';
  }
  
  // Semi-Marathon
  if (lower === 'semi' || lower.includes('semi')) {
    return 'Semi';
  }
  
  // 10km
  if (lower === '10km' || lower === '10k' || lower.includes('10k')) {
    return '10km';
  }

  // Start to Run
  if (lower === 'starttorun' || lower === 'start to run' || lower.includes('start to run')) {
    return 'StartToRun';
  }
  
  // Trail
  if (lower === 'trail' || lower === 'trailcourt' || lower === 'trailshort') {
    return 'Trail';
  }
  if (lower === 'traillong' || lower.includes('traillong')) {
    return 'TrailLong';
  }
  if (lower === 'ultra' || lower.includes('ultra')) {
    return 'Ultra';
  }
  
  // Sprint / Olympic
  if (lower === 'sprint') return 'Sprint';
  if (lower === 'olympic' || lower === 'olympique') return 'Olympic';
  
  // Default
  return '70.3';
}

/**
 * Normalise un type de course vers le format INTERNE (pour les clés de lookup)
 * Retourne "703" (pas "70.3") pour compatibilité avec physiologicalTargets
 */
export function normalizeRaceTypeForInternal(input: string | null | undefined): InternalRaceType {
  const display = normalizeRaceTypeForDisplay(input);
  return display === '70.3' ? '703' : display as InternalRaceType;
}

/**
 * Labels lisibles pour chaque type de course
 */
export const RACE_TYPE_LABELS: Record<CanonicalRaceType, string> = {
  'IM': 'Ironman',
  '70.3': 'Ironman 70.3',
  'Marathon': 'Marathon',
  'Semi': 'Semi-Marathon',
  '10km': '10 km',
  'StartToRun': 'Start to Run',
  'Trail': 'Trail Court',
  'TrailLong': 'Trail Long',
  'Ultra': 'Ultra-Trail',
  'Sprint': 'Triathlon Sprint',
  'Olympic': 'Triathlon Olympique',
};

/**
 * Retourne le label lisible pour un type de course
 */
export function getRaceTypeLabel(input: string | null | undefined): string {
  const canonical = normalizeRaceTypeForDisplay(input);
  return RACE_TYPE_LABELS[canonical] || canonical;
}

/**
 * Vérifie si un type de course est un triathlon
 */
export function isTriathlon(input: string | null | undefined): boolean {
  const canonical = normalizeRaceTypeForDisplay(input);
  return ['IM', '70.3', 'Sprint', 'Olympic'].includes(canonical);
}

/**
 * Vérifie si un type de course est une course à pied pure
 */
export function isRunningOnly(input: string | null | undefined): boolean {
  const canonical = normalizeRaceTypeForDisplay(input);
  return ['Marathon', 'Semi', '10km', 'StartToRun', 'Trail', 'TrailLong', 'Ultra'].includes(canonical);
}

/**
 * Vérifie si c'est une course longue distance (>90 minutes typiquement)
 */
export function isLongDistance(input: string | null | undefined): boolean {
  const canonical = normalizeRaceTypeForDisplay(input);
  return ['IM', '70.3', 'Marathon', 'TrailLong', 'Ultra'].includes(canonical);
}
