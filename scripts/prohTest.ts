import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import { PROHIBITION_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";

const prohibitions = [
  "🚫 SPRINT BAN STRICT — VLamax trop haute pour cet objectif longue distance. INTERDITS : sprints all-out, Tabata, micro-intervalles explosifs (<20s), sprints neuromusculaires (6×10s, 8×20s, etc.), pliométrie explosive, efforts erratiques non-structurés.",
];

const withProh = buildWorkoutCatalog("Ironman", 1, 8, 20, { maxItems: 80, limiters: ["vlamax"], prohibitions });
const sprintPat = PROHIBITION_SESSION_PATTERNS.sprints;
const microPat = PROHIBITION_SESSION_PATTERNS.micro_intervals;
const bad = withProh.filter(e => sprintPat.test(e.objectif + " " + e.structure) || microPat.test(e.objectif + " " + e.structure));
console.log(`\nAVEC prohibitions: ${withProh.length} séances, sprint/micro restantes: ${bad.length}`);
if (bad.length > 0) console.log("RESTANTES:\n" + bad.slice(0,10).map(e => `  ${e.id} [${e.sport}] ${e.objectif}`).join("\n"));

const noProh = buildWorkoutCatalog("Ironman", 1, 8, 20, { maxItems: 80, limiters: ["vlamax"] });
const badCtrl = noProh.filter(e => sprintPat.test(e.objectif + " " + e.structure) || microPat.test(e.objectif + " " + e.structure));
console.log(`\nSANS prohibitions: ${noProh.length} séances, sprint/micro: ${badCtrl.length}`);
console.log("Ex:\n" + badCtrl.slice(0,5).map(e => `  ${e.id} [${e.sport}] ${e.objectif}`).join("\n"));
