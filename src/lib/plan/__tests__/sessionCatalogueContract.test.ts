import { describe, it, expect } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildRepairWorkoutMetadata } from "../repairCatalogMetadata";
import { checkSessionCatalogue, catalogueForWeek } from "../../../../supabase/functions/_shared/sessionCatalogueContract";
const metadata = (id: string) => buildRepairWorkoutMetadata(WorkoutLibrary.find(w => w.id === id)!);
const cases = [
 ["S1", "B_BRICK_RACE_PACE_SHORT_703", "brick", "base", 120, ["Z1","Z2"], "Brique Introductive Vélo-Course", "Vélo :90min endurance fondamentale Z2. Course :30min Z1-Z2", "phase:base"],
 ["S4", "V3_BIKE_SST_PROGRESSIF", "bike", "base", 80, ["Z4a"], "Vélo Sweet Spot Progressif", "3x12min Z4a", "phase:base"],
 ["S6", "BR_HALF_V1_PRO", "brick", "base", 105, ["Z1","Z2"], "Brique aérobie contrôlée", "Bike:80min Z2. Run:25min Z1-Z2", "catalogue_intensity_diluted"],
 ["S10", "A_RUN_DURABILITY_LONG", "run", "build", 95, ["Z2"], "Sortie longue endurance & durabilité", "Warm-up:15min Z1-Z2. Main:75min Z2. Cool-down:5min", "catalogue_duration"],
] as const;
describe("contrat initial — prescriptions transcrites du PDF, métadonnées réelles", () => {
 it.each(cases)("%s : incompatibilité explicite, aucune mutation", (_, id, sport, phase, durationMin, zones, title, details, expected) => {
  const session = { day: "samedi", custom: false, catalogId: id, sport, durationMin, zones: [...zones], title, details };
  const contract = { catalog: [metadata(id)], phase, objective: "703" };
  const before = structuredClone(session);
  expect(checkSessionCatalogue(session, contract).errors).toContain(expected);
  expect(session).toEqual(before);
 });
 it("le pool d'un chunk mixte ne rend pas une fiche Build admissible en Fondation", () => {
  const catalog = [metadata("V3_BIKE_SST_PROGRESSIF")];
  expect(catalogueForWeek(catalog, { phase: "base" }, { bike: { min: 2 } }).missingSports).toEqual(["bike"]);
  expect(catalogueForWeek(catalog, { phase: "base" }).eligible).toEqual([]);
  expect(catalogueForWeek(catalog, { phase: "build" }).eligible).toHaveLength(1);
 });
 it("une variante numérique explicitement sélectionnée peut adapter la durée sans élargir la phase", () => {
  const fiche = { ...metadata("A_RUN_DURABILITY_LONG"), variants: { half: "Z2 40–70 min" } };
  const session = { catalogId: fiche.id, sport: "run", durationMin: 60, zones: ["Z2"], title: "Endurance fondamentale", variantKey: "half" };
  expect(checkSessionCatalogue(session, { phase: "build", catalog: [fiche] }).errors).toEqual([]);
  expect(checkSessionCatalogue(session, { phase: "base", catalog: [fiche] }).errors).toContain("phase:base");
 });
 it("une brique intense ne rentre pas en décharge même si sa phase Build convient", () => {
  const fiche = metadata("BR_HALF_V1_PRO"), before = structuredClone(fiche);
  expect(catalogueForWeek([fiche], { phase: "build", weekType: "recovery" }, { bike: { min: 1 } }).eligible).toEqual([]);
  expect(fiche).toEqual(before);
 });
 it("une variante en prose n'est ni un passe-droit ni une incompatibilité inventée", () => {
  const fiche = { ...metadata("A_RUN_DURABILITY_LONG"), variants: { half: "utile" } };
  const result = checkSessionCatalogue({ catalogId: fiche.id, sport: "run", durationMin: 60, variantKey: "half" }, { catalog: [fiche], phase: "build" });
  expect(result.unknown).toContain("variant_not_executable");
  expect(result.errors).not.toContain("catalogue_duration");
 });
 it("structure explicitement différente : diagnostic conservé sans réécriture", () => {
  const fiche = metadata("V3_BIKE_SST_PROGRESSIF");
  const session = { catalogId: fiche.id, title: fiche.title, sport: "bike", durationMin: 90, zones: ["Z4"], details: "12x1min Z4" };
  expect(checkSessionCatalogue(session, { catalog: [fiche], phase: "build" }).errors).toContain("catalogue_structure");
 });
 it("une ancienne séance sans durée ne reçoit aucune valeur inventée", () => {
  const session = { catalogId: "A_RUN_DURABILITY_LONG", title: "Endurance", sport: "run" };
  const result = checkSessionCatalogue(session, { phase: "build", catalog: [metadata(session.catalogId)] });
  expect(result.unknown).toContain("duration_not_preserved"); expect(session).not.toHaveProperty("durationMin");
 });
 it("les compétitions officielles restent custom et ne reçoivent aucune fiche", () => {
  const race = { title: "COURSE : Ironman 70.3 Tours", sport: "brick", custom: true, catalogId: null, durationMin: 330 };
  expect(checkSessionCatalogue(race, { catalog: [] })).toEqual({ errors: [], unknown: [] });
  expect(checkSessionCatalogue({ ...race, catalogId: "V3_RUN_10K_RACE_SIM" }, { catalog: [] }).errors).toContain("race_catalog_conflict");
 });
});
