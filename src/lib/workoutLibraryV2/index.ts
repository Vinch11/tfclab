/** V2 is an isolated, opt-in catalogue. No automatic Nolio/prescription integration. */
export { V2_WORKOUTS, V2_GOALS, V2_BY_ID, V2_SOURCES } from "./catalogue";
export { instantiateV2Workout } from "./engine";
export type {
  V2AthleteContext, V2Block, V2Event, V2Goal, V2InstantiatedWorkout,
  V2Level, V2Metric, V2NumberParameter, V2Phase, V2Sport, V2WorkoutTemplate,
} from "./engine";
