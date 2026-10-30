/**
 * Curated provenance V1 → V2 (pilot). No V1 workout is converted or mutated.
 * A source is an EDITORIAL ANCESTOR, never a claim of sporting equivalence.
 * V2 does not inherit eligibility, variant, duration, intensity or permission.
 */
import type { WorkoutGoal } from "@/types/workoutLibrary";
import { WORKOUT_V2_MODELS } from "./catalog";

export interface WorkoutV1Lineage {
  v2Id: string;
  sourceV1Id: string;
  relationship: "inspired_by_not_equivalent";
  discrepancy: string;
  review: "required";
}

/** All IDs are genuine V1 records; keep the explicit list versioned. */
export const WORKOUT_V1_TO_V2: readonly WorkoutV1Lineage[] = [
  { v2Id:"V2_RUN_01",sourceV1Id:"S2R_WALK_RUN_1_2",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 impose 8 × 1min course/2min marche ; V2 permet d'autres expositions, sans autoriser une progression hebdomadaire.",review:"required" },
  { v2Id:"V2_RUN_02",sourceV1Id:"A_RUN_Z2_EASY",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 inclut éducatifs optionnels et phase base/build ; V2 utilise un temps continu et autorise davantage de phases/objectifs.",review:"required" },
  { v2Id:"V2_RUN_03",sourceV1Id:"A_RUN_DURABILITY_LONG",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 prescrit 100–150min en build avec suivi drift ; V2 a une plage plus large et ne calcule pas le drift.",review:"required" },
  { v2Id:"V2_RUN_04",sourceV1Id:"B_RUN_THRESHOLD",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 est 3×10min à zones Z4b–Z5 et récupération trot ; V2 cible une allure seuil vérifiée et des paramètres variables.",review:"required" },
  { v2Id:"V2_RUN_05",sourceV1Id:"B_RUN_VO2_LONG_4x5",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 propose 4×5min ; V2 permet d'autres durées et répétitions. Cela ne garantit pas le même temps proche de VO₂max.",review:"required" },
  { v2Id:"V2_RUN_06",sourceV1Id:"C_RUN_STRIDES",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 décrit 8×100m progressifs et récupérations en distance ; V2 exprime des fractions temporelles, pas une équivalence démontrée.",review:"required" },
  { v2Id:"V2_BIKE_01",sourceV1Id:"A_BIKE_Z2_LONG",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 ajoute éventuellement 3×10min Z3 en build ; V2 ne comporte qu'un bloc continu contrôlé et des durées potentiellement différentes.",review:"required" },
  { v2Id:"V2_BIKE_02",sourceV1Id:"B_BIKE_THRESHOLD_2x20",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : 2×20min, 95–100% FTP, récupération 8min ; V2 : répétitions et zone plus larges à justifier.",review:"required" },
  { v2Id:"V2_BIKE_03",sourceV1Id:"B_BIKE_VO2_5x5",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : 5×5min à 105–115% FTP ; V2 accepte d'autres durées et jusqu'à 118% FTP, sans validation d'équivalence.",review:"required" },
  { v2Id:"V2_BIKE_04",sourceV1Id:"A_703_BIKE_RACE_SIM",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 est une simulation 70.3 en peak, 150–180min ; V2 couvre d'autres triathlons/phases/durées, intensité RPE à préciser.",review:"required" },
  { v2Id:"V2_SWIM_01",sourceV1Id:"A_SWIM_AEROBIC",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 est structurée en mètres + éducatifs, la V2 en temps continu ; ni distances ni allures techniques ne sont transférées.",review:"required" },
  { v2Id:"V2_SWIM_02",sourceV1Id:"B_SWIM_TRI_CSS_10x200",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : 8–10×200m, CSS, éducatifs échauffement ; V2 varie la distance et calcule uniquement le crawl, sans éducatifs implicites.",review:"required" },
  { v2Id:"V2_SWIM_03",sourceV1Id:"C_SWIM_TECH_DRILLS",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : 12×50m scull/catch + 6×100m ; V2 : fractions chronométrées sans identifier chaque éducatif.",review:"required" },
  { v2Id:"V2_TRAIL_01",sourceV1Id:"B_TR_HILL_REPS_SHORT",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 prescrit 12–20×30–45s + descente lente ; V2 varie plus largement les durées et n'explicite pas D+/pente.",review:"required" },
  { v2Id:"V2_TRAIL_02",sourceV1Id:"A_TR_LONG_PROGRESSIVE",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 est progressive avec finish Z3 ; V2 est continue en RPE et ne reconstruit pas le dénivelé ni le terrain.",review:"required" },
  { v2Id:"V2_TRAIL_03",sourceV1Id:"B_TR_DESCENT_TOLERANCE",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 est 6–10×2–3min avec remontée ; V2 accepte d'autres intervalles temporels, sans charge excentrique quantifiée.",review:"required" },
  { v2Id:"V2_BRICK_01",sourceV1Id:"BRICK_IM_Z2_RUN",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : vélo 90–150min + CAP 20–40min en build/peak ; V2 permet des briques plus courtes et d'autres phases.",review:"required" },
  { v2Id:"V2_BRICK_02",sourceV1Id:"BRICK_703_RACE_SIM",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 : simulation spécifique half/peak ; V2 couvre olympique/IM et build sans réutiliser sa dose race-pace.",review:"required" },
  { v2Id:"V2_STRENGTH_01",sourceV1Id:"C_STR_LOWER_PRO",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 prescrit des séries, charges, tempos et repos distincts par mouvement ; V2 applique un schéma uniforme simplifié, non équivalent.",review:"required" },
  { v2Id:"V2_STRENGTH_02",sourceV1Id:"C_STR_HIP_MOBILITY_PRO",relationship:"inspired_by_not_equivalent",discrepancy:"La V1 décrit plusieurs mobilités et activations, sans quantification uniforme du tempo ; V2 est un circuit pilote différent.",review:"required" },
] as const;

export function getWorkoutV1Lineage(v2Id: string): WorkoutV1Lineage | null {
  return WORKOUT_V1_TO_V2.find(x => x.v2Id === v2Id) ?? null;
}
export function findV2ModelsInspiredByV1(v1Id: string): readonly string[] {
  return WORKOUT_V1_TO_V2.filter(x=>x.sourceV1Id===v1Id).map(x=>x.v2Id);
}
export function workoutV1Coverage() {
  return {
    linked: WORKOUT_V1_TO_V2.length,
    models: WORKOUT_V2_MODELS.length,
    unmapped: WORKOUT_V2_MODELS.filter(x=>!getWorkoutV1Lineage(x.id)).map(x=>x.id),
  };
}
/** Passing a V1 source ID does NOT permit any implicit sport/goal/phase adaptation. */
export function sourceV1CanAutoReplace(_sourceId: string, _goal: WorkoutGoal): false {
  return false;
}
