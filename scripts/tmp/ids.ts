import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { extractCatalogId } from "@/lib/catalogIdExtractor";
const bad = WorkoutLibrary.filter(w => extractCatalogId(w.id) !== w.id);
console.log("total", WorkoutLibrary.length, "unmatched", bad.length);
console.log([...new Set(bad.map(w => w.id.split("_")[0]))].join(" "));
