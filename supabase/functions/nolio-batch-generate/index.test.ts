import { assertEquals } from "jsr:@std/assert@1";
import { estimateCost, isPureRest, isRestWorkout, sha256Hex } from "./index.ts";

// ─── isRestWorkout / isPureRest ─────────────────────────────────────────────

Deno.test("isRestWorkout — isRest===true ou workout_id matchant REST_/REPOS_/..._RECOVERY", () => {
  assertEquals(isRestWorkout({ workout_id: "ANY", isRest: true, workoutText: "" }), true);
  assertEquals(isRestWorkout({ workout_id: "REST_FULL_DAY", workoutText: "" }), true);
  assertEquals(isRestWorkout({ workout_id: "REPOS_COMPLET", workoutText: "" }), true);
  assertEquals(isRestWorkout({ workout_id: "D_W3_RECOVERY", workoutText: "" }), true);
  assertEquals(isRestWorkout({ workout_id: "rest", workoutText: "" }), true); // insensible casse
  assertEquals(isRestWorkout({ workout_id: "BIKE_SEUIL_01", workoutText: "" }), false);
});

Deno.test("isPureRest — vrai uniquement pour les deux IDs exacts", () => {
  assertEquals(isPureRest({ workout_id: "REST_FULL_DAY", workoutText: "" }), true);
  assertEquals(isPureRest({ workout_id: "REPOS_COMPLET", workoutText: "" }), true);
  assertEquals(isPureRest({ workout_id: "REST_PARTIAL", workoutText: "" }), false);
  assertEquals(isPureRest({ workout_id: "BIKE_SEUIL_01", workoutText: "" }), false);
});

// ─── estimateCost ────────────────────────────────────────────────────────────

Deno.test("estimateCost — tarif Gemini 3.1 Pro Preview : $2/M in, $12/M out", () => {
  assertEquals(estimateCost(1_000_000, 0), 2);
  assertEquals(estimateCost(0, 1_000_000), 12);
  assertEquals(estimateCost(500_000, 100_000), 1 + 1.2);
  assertEquals(estimateCost(0, 0), 0);
});

// ─── sha256Hex ───────────────────────────────────────────────────────────────

Deno.test("sha256Hex — déterministe et correspond au SHA-256 connu de la chaîne vide", async () => {
  const hash = await sha256Hex("");
  assertEquals(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

Deno.test("sha256Hex — deux textes différents donnent des hash différents, même texte → même hash", async () => {
  const a1 = await sha256Hex("texte de séance A");
  const a2 = await sha256Hex("texte de séance A");
  const b = await sha256Hex("texte de séance B");
  assertEquals(a1, a2);
  assertEquals(a1 === b, false);
});
