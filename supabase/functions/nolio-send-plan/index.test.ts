import { assertEquals } from "jsr:@std/assert@1";
import {
  addDaysYMD,
  buildTargetFromText,
  canonicalizeStructuredShape,
  computeTargetValue,
  cssPctToHrZone,
  detectSportId,
  extractNutritionNote,
  highestZonePct,
  hrTargetFromPct,
  insertSwimBlockRests,
  isAllNoTargetStructure,
  isRestNode,
  isStartToRunSession,
  mapPartToIntensity,
  mapSport,
  mapTargetType,
  normalizeStr,
  paceSecFromStandardPct,
  parseDurationToSec,
  parsePctRange,
  parseRange,
  parseRepetitionPattern,
  stripTitleTags,
  summarizeStructuredWorkout,
  vmaPctToHrZone,
  wattsFromStandardPct,
} from "./index.ts";

// ─── wattsFromStandardPct / paceSecFromStandardPct ────────────────────────

Deno.test("wattsFromStandardPct — depuis FTP direct", () => {
  assertEquals(wattsFromStandardPct(90, { ftp: 280 }), 252);
});

Deno.test("wattsFromStandardPct — sans ftp ni zones dérivées → null", () => {
  assertEquals(wattsFromStandardPct(90, {}), null);
});

Deno.test("wattsFromStandardPct — priorité aux zones dérivées sur ftp brut", () => {
  const refs = { ftp: 280, derivedBikeWatts: (pct: number) => pct * 3 };
  assertEquals(wattsFromStandardPct(90, refs), 270);
});

Deno.test("paceSecFromStandardPct — depuis VMA direct", () => {
  // vma=18, pct=100 → 18 km/h → 3600/18 = 200 s/km
  assertEquals(paceSecFromStandardPct(100, { vma: 18 }), 200);
});

Deno.test("paceSecFromStandardPct — sans vma ni zones dérivées → null", () => {
  assertEquals(paceSecFromStandardPct(90, {}), null);
});

Deno.test("paceSecFromStandardPct — vitesse nulle/négative → null", () => {
  const refs = { derivedRunSpeedKmh: () => 0 };
  assertEquals(paceSecFromStandardPct(90, refs), null);
});

// ─── mapTargetType / computeTargetValue ────────────────────────────────────

Deno.test("mapTargetType — FTP/CP/MAP → power, VMA/CSS → pace, HR → heartrate, sinon no_target", () => {
  assertEquals(mapTargetType("FTP"), "power");
  assertEquals(mapTargetType("CP"), "power");
  assertEquals(mapTargetType("MAP"), "power");
  assertEquals(mapTargetType("VMA"), "pace");
  assertEquals(mapTargetType("CSS"), "pace");
  assertEquals(mapTargetType("HR"), "heartrate");
  assertEquals(mapTargetType("absolute"), "no_target");
});

Deno.test("computeTargetValue — intensité <=0 ou non finie → null", () => {
  assertEquals(computeTargetValue("FTP", 0, { ftp: 280 }), null);
  assertEquals(computeTargetValue("FTP", NaN, { ftp: 280 }), null);
});

Deno.test("computeTargetValue — CSS : plus % haut → vitesse plus rapide → valeur plus basse (s/100m)", () => {
  const refs = { css: 95 };
  const at100 = computeTargetValue("CSS", 100, refs)!;
  const at110 = computeTargetValue("CSS", 110, refs)!;
  assertEquals(at100, 95);
  assertEquals(at110 < at100, true);
});

Deno.test("computeTargetValue — CSS sans refs.css → null", () => {
  assertEquals(computeTargetValue("CSS", 100, {}), null);
});

Deno.test("computeTargetValue — HR depuis fcMax", () => {
  assertEquals(computeTargetValue("HR", 80, { fcMax: 185 }), 148);
});

// ─── parseDurationToSec ─────────────────────────────────────────────────────

Deno.test("parseDurationToSec — formats minutes/heures/secondes", () => {
  assertEquals(parseDurationToSec("30min"), 1800);
  assertEquals(parseDurationToSec("30 min"), 1800);
  assertEquals(parseDurationToSec("45'"), 2700);
  assertEquals(parseDurationToSec("1h"), 3600);
  assertEquals(parseDurationToSec("1h30"), 5400);
  assertEquals(parseDurationToSec("45 s"), 45);
  assertEquals(parseDurationToSec("45sec"), 45);
});

Deno.test("parseDurationToSec — aucun motif reconnu → null", () => {
  assertEquals(parseDurationToSec("libre"), null);
  assertEquals(parseDurationToSec(""), null);
});

// ─── normalizeStr / mapPartToIntensity ─────────────────────────────────────

Deno.test("normalizeStr — minuscules + accents retirés", () => {
  assertEquals(normalizeStr("Échauffement RÉCUP"), "echauffement recup");
});

Deno.test("mapPartToIntensity — reconnaît warmup/cooldown/active, insensible aux accents", () => {
  assertEquals(mapPartToIntensity("Échauffement"), "warmup");
  assertEquals(mapPartToIntensity("Warm-up"), "warmup");
  assertEquals(mapPartToIntensity("Retour au calme"), "cooldown");
  assertEquals(mapPartToIntensity("Cool down"), "cooldown");
  assertEquals(mapPartToIntensity("Corps de séance"), "active");
});

// ─── parseRange / parsePctRange ─────────────────────────────────────────────

Deno.test("parseRange — bpm, watts, avec tiret long/court", () => {
  assertEquals(parseRange("127-149 bpm", "bpm"), { min: 127, max: 149 });
  assertEquals(parseRange("200 – 250 W", "w"), { min: 200, max: 250 });
  // ordre inverse dans le texte → min/max toujours triés
  assertEquals(parseRange("250-200 W", "w"), { min: 200, max: 250 });
});

Deno.test("parseRange — accepte M:SS de part et d'autre du tiret", () => {
  assertEquals(parseRange("4:30-4:00/km", "\\/?\\s*km"), { min: 240, max: 270 });
});

Deno.test("parseRange — aucun match → null", () => {
  assertEquals(parseRange("libre", "bpm"), null);
});

Deno.test("parsePctRange — plage pourcentage triée", () => {
  assertEquals(parsePctRange("90-85%"), { min: 85, max: 90 });
  assertEquals(parsePctRange("sans pourcentage"), null);
});

// ─── hrTargetFromPct / highestZonePct / vmaPctToHrZone / cssPctToHrZone ────

Deno.test("hrTargetFromPct — clamp dans [40,100], fcMax par défaut 185", () => {
  const r = hrTargetFromPct(60, 70);
  assertEquals(r.pct_hrmax_min, 60);
  assertEquals(r.pct_hrmax_max, 70);
  assertEquals(r.target_value_min, Math.round(185 * 60 / 100));
  assertEquals(r.target_value_max, Math.round(185 * 70 / 100));
  assertEquals(r.target_type, "heartrate");
});

Deno.test("hrTargetFromPct — hiPct toujours > loPct même si pctLo===pctHi", () => {
  const r = hrTargetFromPct(70, 70);
  assertEquals(r.pct_hrmax_max > r.pct_hrmax_min, true);
});

Deno.test("hrTargetFromPct — clamp extrêmes (valeurs hors [40,100])", () => {
  const r = hrTargetFromPct(10, 250);
  assertEquals(r.pct_hrmax_min, 40);
  assertEquals(r.pct_hrmax_max, 100);
});

Deno.test("highestZonePct — englobe toutes les zones mentionnées, pas seulement la plus haute", () => {
  // Z3 (70-80) + Z4a (80-87) → doit couvrir [70, 87], pas juste Z4a
  assertEquals(highestZonePct("Z3 puis Z4a"), [70, 87]);
});

Deno.test("highestZonePct — une seule zone", () => {
  assertEquals(highestZonePct("Z2 footing"), [60, 70]);
});

Deno.test("highestZonePct — aucune zone → null", () => {
  assertEquals(highestZonePct("libre"), null);
  assertEquals(highestZonePct(undefined), null);
});

Deno.test("vmaPctToHrZone — paliers croissants", () => {
  assertEquals(vmaPctToHrZone(50), [50, 60]);
  assertEquals(vmaPctToHrZone(70), [60, 70]);
  assertEquals(vmaPctToHrZone(80), [70, 80]);
  assertEquals(vmaPctToHrZone(90), [80, 87]);
  assertEquals(vmaPctToHrZone(95), [87, 91]);
  assertEquals(vmaPctToHrZone(100), [91, 95]);
  assertEquals(vmaPctToHrZone(110), [95, 100]);
});

Deno.test("cssPctToHrZone — paliers décroissants (CSS élevé = plus lent = zone basse)", () => {
  assertEquals(cssPctToHrZone(120), [50, 60]);
  assertEquals(cssPctToHrZone(110), [60, 70]);
  assertEquals(cssPctToHrZone(105), [70, 80]);
  assertEquals(cssPctToHrZone(100), [80, 87]);
  assertEquals(cssPctToHrZone(95), [87, 91]);
  assertEquals(cssPctToHrZone(90), [91, 95]);
  assertEquals(cssPctToHrZone(80), [95, 100]);
});

// ─── buildTargetFromText ─────────────────────────────────────────────────────

Deno.test("buildTargetFromText — allure course explicite plage '4:30-4:45/km'", () => {
  const r = buildTargetFromText("4:30-4:45/km", {});
  assertEquals(r.target_type, "pace");
  assertEquals(r.target_value_min, 270); // 4:30
  assertEquals(r.target_value_max, 285); // 4:45
});

Deno.test("buildTargetFromText — allure course unique '5:25/km' → fenêtre ±5s", () => {
  const r = buildTargetFromText("5:25/km", {});
  assertEquals(r.target_type, "pace");
  assertEquals(r.target_value, 325);
  assertEquals(r.target_value_min, 320);
  assertEquals(r.target_value_max, 330);
});

Deno.test("buildTargetFromText — X-Y%FTP avec refs.ftp", () => {
  const r = buildTargetFromText("90-95% FTP", { ftp: 280 });
  assertEquals(r.target_type, "power");
  assertEquals(r.target_value_min, wattsFromStandardPct(90, { ftp: 280 }));
  assertEquals(r.target_value_max, wattsFromStandardPct(95, { ftp: 280 }));
});

Deno.test("buildTargetFromText — X%FTP sans refs.ftp → no_target", () => {
  const r = buildTargetFromText("90% FTP", {});
  assertEquals(r.target_type, "no_target");
});

Deno.test("buildTargetFromText — zone Z2 → heartrate", () => {
  const r = buildTargetFromText("Z2 footing", {});
  assertEquals(r.target_type, "heartrate");
});

Deno.test("buildTargetFromText — texte vide → no_target", () => {
  assertEquals(buildTargetFromText("", {}).target_type, "no_target");
});

// ─── parseRepetitionPattern ─────────────────────────────────────────────────

Deno.test("parseRepetitionPattern — '4x8\\'' sans récup", () => {
  const r = parseRepetitionPattern("4x8'");
  assertEquals(r?.reps, 4);
  assertEquals(r?.workSec, 480);
  assertEquals(r?.restSec, null);
});

Deno.test("parseRepetitionPattern — '6x3min / 1min récup' avec récup après slash", () => {
  const r = parseRepetitionPattern("6x3min / 1min récup");
  assertEquals(r?.reps, 6);
  assertEquals(r?.workSec, 180);
  assertEquals(r?.restSec, 60);
});

Deno.test("parseRepetitionPattern — '10×30s' en secondes", () => {
  const r = parseRepetitionPattern("10×30s");
  assertEquals(r?.reps, 10);
  assertEquals(r?.workSec, 30);
});

Deno.test("parseRepetitionPattern — aucun motif → null", () => {
  assertEquals(parseRepetitionPattern("footing libre"), null);
  assertEquals(parseRepetitionPattern(""), null);
});

// ─── canonicalizeStructuredShape ────────────────────────────────────────────

Deno.test("canonicalizeStructuredShape — step_type → type+intensity_type, description → notes", () => {
  const out = canonicalizeStructuredShape({
    step_type: "active",
    description: "Seuil",
  }) as Record<string, unknown>;
  assertEquals(out.type, "step");
  assertEquals(out.intensity_type, "active");
  assertEquals(out.notes, "Seuil");
  assertEquals("step_type" in out, false);
  assertEquals("description" in out, false);
});

Deno.test("canonicalizeStructuredShape — step_type:'repetition' → type repetition + value depuis repeat_count", () => {
  const out = canonicalizeStructuredShape({
    step_type: "repetition",
    repeat_count: 5,
    steps: [{ step_type: "active" }],
  }) as Record<string, unknown>;
  assertEquals(out.type, "repetition");
  assertEquals(out.intensity_type, "repetition");
  assertEquals(out.value, 5);
  const inner = (out.steps as Record<string, unknown>[])[0];
  assertEquals(inner.type, "step");
});

Deno.test("canonicalizeStructuredShape — reps array présent (steps[]) même sans step_type='repetition' → repetition", () => {
  const out = canonicalizeStructuredShape({
    step_type: "active",
    steps: [{ step_type: "active" }],
  }) as Record<string, unknown>;
  assertEquals(out.type, "repetition");
});

Deno.test("canonicalizeStructuredShape — value manquant/invalide sur repetition → fallback 1", () => {
  const out = canonicalizeStructuredShape({
    step_type: "repetition",
    steps: [],
  }) as Record<string, unknown>;
  assertEquals(out.value, 1);
});

Deno.test("canonicalizeStructuredShape — déjà au format officiel (type présent) → inchangé sur le champ type", () => {
  const out = canonicalizeStructuredShape({ type: "step", intensity_type: "rest" }) as Record<string, unknown>;
  assertEquals(out.type, "step");
  assertEquals(out.intensity_type, "rest");
});

Deno.test("canonicalizeStructuredShape — récursif sur un tableau", () => {
  const out = canonicalizeStructuredShape([
    { step_type: "active" },
    { step_type: "rest" },
  ]) as Record<string, unknown>[];
  assertEquals(out[0].type, "step");
  assertEquals(out[1].intensity_type, "rest");
});

// ─── detectSportId / mapSport ────────────────────────────────────────────────

Deno.test("detectSportId — ordre de priorité trail > run, home trainer > vélo route", () => {
  assertEquals(detectSportId("Trail long"), 52);
  assertEquals(detectSportId("Home trainer"), 18);
  assertEquals(detectSportId("Sortie vélo route"), 14);
  assertEquals(detectSportId("Natation"), 19);
  assertEquals(detectSportId("Renfo PPG"), 20);
  assertEquals(detectSportId("Course à pied"), 2);
  assertEquals(detectSportId("inconnu xyz"), null);
});

Deno.test("mapSport — cascade sport → title → id, défaut 2 (course)", () => {
  assertEquals(mapSport("velo", undefined, undefined), 14);
  assertEquals(mapSport("inconnu", "Sortie vélo", undefined), 14);
  assertEquals(mapSport("inconnu", undefined, "BIKE_123"), 14);
  assertEquals(mapSport("inconnu", "inconnu", "inconnu"), 2);
});

// ─── stripTitleTags / addDaysYMD ────────────────────────────────────────────

Deno.test("stripTitleTags — retire un ou plusieurs préfixes [TAG]", () => {
  assertEquals(stripTitleTags("[BASE · S3] Séance seuil"), "Séance seuil");
  assertEquals(stripTitleTags("[A][B] Titre"), "Titre");
  assertEquals(stripTitleTags("Sans tag"), "Sans tag");
});

Deno.test("stripTitleTags — chaîne vide/nulle", () => {
  assertEquals(stripTitleTags(""), "");
  assertEquals(stripTitleTags(null), "");
  assertEquals(stripTitleTags(undefined), "");
});

Deno.test("stripTitleTags — ne vide jamais complètement un titre qui n'est QUE des tags (fallback au brut)", () => {
  assertEquals(stripTitleTags("[ONLY TAG]"), "[ONLY TAG]");
});

Deno.test("addDaysYMD — ajoute des jours en UTC, gère le changement de mois", () => {
  assertEquals(addDaysYMD("2026-01-30", 3), "2026-02-02");
  assertEquals(addDaysYMD("2026-02-28", 1), "2026-03-01"); // 2026 non bissextile
  assertEquals(addDaysYMD("2026-03-01", 0), "2026-03-01");
});

// ─── isRestNode / insertSwimBlockRests ──────────────────────────────────────

Deno.test("isRestNode — vrai seulement pour type=step + intensity_type=rest", () => {
  assertEquals(isRestNode({ type: "step", intensity_type: "rest" }), true);
  assertEquals(isRestNode({ type: "step", intensity_type: "active" }), false);
  assertEquals(isRestNode({ type: "repetition", intensity_type: "rest" }), false);
  assertEquals(isRestNode(null), false);
});

Deno.test("insertSwimBlockRests — insère une pause entre deux blocs actifs consécutifs", () => {
  const out = insertSwimBlockRests([
    { type: "step", intensity_type: "active", name: "300m" },
    { type: "step", intensity_type: "active", name: "400m" },
  ]) as Record<string, unknown>[];
  assertEquals(out.length, 3);
  assertEquals(isRestNode(out[1]), true);
});

Deno.test("insertSwimBlockRests — pas de pause ajoutée si un repos existe déjà entre les blocs", () => {
  const out = insertSwimBlockRests([
    { type: "step", intensity_type: "active", name: "300m" },
    { type: "step", intensity_type: "rest", name: "récup" },
    { type: "step", intensity_type: "active", name: "400m" },
  ]) as Record<string, unknown>[];
  assertEquals(out.length, 3);
});

Deno.test("insertSwimBlockRests — opère aussi sur un objet { steps: [...] }", () => {
  const out = insertSwimBlockRests({
    steps: [
      { type: "step", intensity_type: "active" },
      { type: "step", intensity_type: "active" },
    ],
  }) as Record<string, unknown>;
  assertEquals((out.steps as unknown[]).length, 3);
});

Deno.test("insertSwimBlockRests — entrée sans steps[] ni tableau → inchangée", () => {
  const input = { foo: "bar" };
  assertEquals(insertSwimBlockRests(input), input);
});

// ─── summarizeStructuredWorkout ─────────────────────────────────────────────

Deno.test("summarizeStructuredWorkout — somme simple de steps duration", () => {
  const out = summarizeStructuredWorkout([
    { type: "step", step_duration_type: "duration", step_duration_value: 600 },
    { type: "step", step_duration_type: "duration", step_duration_value: 1800 },
  ]);
  assertEquals(out.durationSec, 2400);
  assertEquals(out.distanceMeters, 0);
});

Deno.test("summarizeStructuredWorkout — repetition multiplie par le nombre de reps", () => {
  const out = summarizeStructuredWorkout([
    {
      type: "repetition",
      value: 4,
      steps: [
        { type: "step", step_duration_type: "duration", step_duration_value: 60 },
        { type: "step", step_duration_type: "duration", step_duration_value: 30 },
      ],
    },
  ]);
  assertEquals(out.durationSec, 4 * (60 + 30));
});

Deno.test("summarizeStructuredWorkout — repetition sans value valide → reps=1 (fallback)", () => {
  const out = summarizeStructuredWorkout([
    { type: "repetition", value: 0, steps: [{ type: "step", step_duration_type: "duration", step_duration_value: 100 }] },
  ]);
  assertEquals(out.durationSec, 100);
});

Deno.test("summarizeStructuredWorkout — distance + target_value (vitesse) → durée dérivée", () => {
  // 100 m à 2 m/s → 50s
  const out = summarizeStructuredWorkout([
    { type: "step", step_duration_type: "distance", step_duration_value: 100, target_value: 2 },
  ]);
  assertEquals(out.distanceMeters, 100);
  assertEquals(out.durationSec, 50);
});

Deno.test("summarizeStructuredWorkout — distance sans vitesse connue → durée 0 mais distance comptée", () => {
  const out = summarizeStructuredWorkout([
    { type: "step", step_duration_type: "distance", step_duration_value: 200 },
  ]);
  assertEquals(out.distanceMeters, 200);
  assertEquals(out.durationSec, 0);
});

// ─── isAllNoTargetStructure / extractNutritionNote / isStartToRunSession ───

Deno.test("isAllNoTargetStructure — vrai seulement si tous les steps sont no_target", () => {
  assertEquals(
    isAllNoTargetStructure([
      { type: "step", target_type: "no_target" },
      { type: "step", target_type: "no_target" },
    ]),
    true,
  );
  assertEquals(
    isAllNoTargetStructure([
      { type: "step", target_type: "no_target" },
      { type: "step", target_type: "power" },
    ]),
    false,
  );
});

Deno.test("isAllNoTargetStructure — descend dans les repetition", () => {
  assertEquals(
    isAllNoTargetStructure([
      { type: "repetition", steps: [{ type: "step", target_type: "power" }] },
    ]),
    false,
  );
});

Deno.test("isAllNoTargetStructure — tableau vide → true (vacuous)", () => {
  assertEquals(isAllNoTargetStructure([]), true);
});

Deno.test("extractNutritionNote — détecte un mot-clé nutrition et renvoie le texte court", () => {
  assertEquals(extractNutritionNote("Prévoir 60g CHO/h"), "Prévoir 60g CHO/h");
  assertEquals(extractNutritionNote("Pas de mention"), null);
});

Deno.test("extractNutritionNote — mot-clé présent mais texte trop long → null", () => {
  const long = "hydratation " + "x".repeat(120);
  assertEquals(extractNutritionNote(long), null);
});

Deno.test("isStartToRunSession — détecte le préfixe S2R_ insensible à la casse", () => {
  assertEquals(isStartToRunSession({ id: "S2R_W1D1" } as never), true);
  assertEquals(isStartToRunSession({ id: "s2r_w1d1" } as never), true);
  assertEquals(isStartToRunSession({ id: "OTHER", title: "", details: "" } as never), false);
});
