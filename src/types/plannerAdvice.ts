// Types pour le système Planner Advisory Layer

export type AdviceScope = 'TODAY' | 'WEEK' | 'PHASE';
export type AdviceSeverity = 0 | 1 | 2 | 3;
export type SuggestedAction = 
  | 'NONE' 
  | 'REPLACE_TODAY_WITH_Z2' 
  | 'SWAP_WORKOUT_TYPE' 
  | 'ADD_WORKOUT' 
  | 'DELOAD_48H';

export interface AdvicePayload {
  replaceWith?: string;
  swapFrom?: string;
  swapTo?: string;
  add?: string;
  duration_min?: number;
}

export interface PlannerAdvice {
  id: string;
  athlete_id: string;
  date_scope: AdviceScope;
  severity: AdviceSeverity;
  title: string;
  message: string;      // Texte pédagogique
  why: string;          // Justification avec données
  suggested_action: SuggestedAction;
  payload: AdvicePayload;
  can_apply: boolean;
  created_at: string;
  // Métadonnées pour l'affichage
  source: 'life_first' | 'tte' | 'vlamax' | 'race_readiness';
  auto_applied?: boolean;
}

// Seuils par objectif
export interface ObjectiveThresholds {
  tteTarget: number;
  vlamaxMax: number;
  vlamaxIdeal: number;
}

// Map des seuils par type d'objectif
export const THRESHOLDS_BY_OBJECTIVE: Record<string, ObjectiveThresholds> = {
  ironman: { tteTarget: 55, vlamaxMax: 0.40, vlamaxIdeal: 0.35 },
  '70.3': { tteTarget: 50, vlamaxMax: 0.45, vlamaxIdeal: 0.38 },
  marathon: { tteTarget: 50, vlamaxMax: 0.50, vlamaxIdeal: 0.40 },
  semi: { tteTarget: 48, vlamaxMax: 0.50, vlamaxIdeal: 0.42 },
  olympic: { tteTarget: 45, vlamaxMax: 0.55, vlamaxIdeal: 0.45 },
  '10k': { tteTarget: 40, vlamaxMax: 0.60, vlamaxIdeal: 0.50 },
  autre: { tteTarget: 45, vlamaxMax: 0.50, vlamaxIdeal: 0.42 },
};

export const DEFAULT_THRESHOLDS: ObjectiveThresholds = {
  tteTarget: 45,
  vlamaxMax: 0.50,
  vlamaxIdeal: 0.42,
};
