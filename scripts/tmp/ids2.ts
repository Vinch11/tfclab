import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { extractCatalogId } from "@/lib/catalogIdExtractor";
const bad = WorkoutLibrary.filter(w => extractCatalogId(w.id) !== w.id);
for (const w of bad.filter(w=>/^(D|REST|FM)_/.test(w.id))) console.log(w.id);
