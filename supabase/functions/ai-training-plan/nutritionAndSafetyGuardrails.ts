// =============================================================================
// NUTRITION MADER-HECK + TTE ÂGE + CAP INJURY RISK — Guardrails prompt injection
// Miroir compact des modules client :
//   - src/lib/v2/nutritionUnified.ts → computeBaseRateMader (F26/F30)
//   - src/lib/tteEffectif.ts / ttePro.ts → getTTETarget âge-ajusté (F33)
//   - src/lib/capInjuryRisk.ts → computeCAPInjuryRisk
// Objectif : injecter un bloc "🥗 Nutrition & 🛡️ Garde-fous" dans le diagnostic
// prompt de l'edge function (jusqu'ici absent — audit lot #1).
// =============================================================================

type Sport = "bike" | "cap" | "trail" | "ultra" | "swim" | "run" | "running";

interface GuardrailsInput {
  objective: string | null | undefined;
  ambition: string | null | undefined;
  age: number | null | undefined;
  weightKg: number | null | undefined;
  vo2max: number | null | undefined;
  vlamax: number | null | undefined;
  vlamaxRun: number | null | undefined;
  sportMain: string | null | undefined;
  heatCondition?: boolean;
  raceDurationHours?: number | null;
}

// Durées cibles par défaut (heures) par objectif × ambition — cohérence
// getRaceDurationHours (voir REFERENCE_STANDARDS). Fourchette prudente.
const DEFAULT_RACE_HOURS: Record<string, [number, number]> = {
  "StartToRun": [0.5, 0.9],
  "5K":         [0.3, 0.5],
  "10K":        [0.6, 1.1],
  "Semi":       [1.4, 2.3],
  "Marathon":   [2.8, 5.0],
  "Trail":      [3.0, 6.0],
  "TrailLong":  [6.0, 12.0],
  "Ultra":      [12.0, 24.0],
  "Sprint":     [1.0, 1.5],
  "Olympic":    [2.0, 3.5],
  "703":        [4.0, 6.5],
  "IM":         [9.0, 14.0],
};

function normObj(o: string | null | undefined): string {
  const s = String(o ?? "").toLowerCase();
  if (s.includes("70.3") || s === "703") return "703";
  if (s.includes("ironman") || s === "im") return "IM";
  if (s.includes("olymp")) return "Olympic";
  if (s.includes("sprint")) return "Sprint";
  if (s.includes("ultra")) return "Ultra";
  if (s.includes("trail") && s.includes("long")) return "TrailLong";
  if (s.includes("trail")) return "Trail";
  if (s.includes("semi") || s.includes("half")) return "Semi";
  if (s.includes("marathon")) return "Marathon";
  if (s.includes("10k")) return "10K";
  if (s.includes("5k")) return "5K";
  if (s.includes("start")) return "StartToRun";
  return "Marathon";
}

function sportOfObjective(obj: string, sportMain?: string | null): Sport {
  if (sportMain) {
    const s = sportMain.toLowerCase();
    if (s.includes("bike") || s.includes("velo")) return "bike";
    if (s.includes("ultra")) return "ultra";
    if (s.includes("trail")) return "trail";
    if (s.includes("run") || s.includes("cap")) return "cap";
  }
  if (obj === "IM" || obj === "703" || obj === "Sprint" || obj === "Olympic") return "bike";
  if (obj === "Ultra" || obj === "TrailLong") return "ultra";
  if (obj === "Trail") return "trail";
  return "cap";
}

// -----------------------------------------------------------------------------
// 1) CHO base rate (Mader-Heck compact)
// -----------------------------------------------------------------------------
function calculateCarbOxidationGmin(intensity: number, vo2: number, vlx: number, weightKg: number): number {
  // Approx: fraction glucidique croit avec %VO2 et VLamax
  const cho_frac = Math.min(1, 0.25 + 0.75 * (intensity / 100) + 0.4 * vlx);
  const vo2_abs = (vo2 * weightKg * intensity / 100) / 1000; // L/min
  // 1 L O2 (glucides) ≈ 5.05 kcal ; 4 kcal/g CHO
  const kcal_min = vo2_abs * 5.05 * cho_frac;
  return kcal_min / 4;
}

function computeCHO(input: GuardrailsInput, objKey: string, sport: Sport, durationH: number, intensityPct: number): { rate: number; capMax: number; method: "mader" | "fallback" | "insufficient" } {
  // AUDIT #6 — VLamax sport-résolu prioritaire.
  // `input.vlamax` provient de `diagnostic.effectifs.vlamax.value` (résolveur
  // sport-aware côté client : CAP-estimator pour run/trail, vlamax vélo sinon).
  // `input.vlamaxRun` = valeur brute snapshot, utilisée en dernier recours.
  // ⚠️ Aucun fake default (mémoire `insufficient-data-no-fake-defaults`).
  const vlx = input.vlamax ?? input.vlamaxRun ?? null;
  const vo2 = input.vo2max ?? null;
  const weight = input.weightKg ?? null;

  if (vlx == null || vo2 == null || weight == null) {
    // Données insuffisantes → pas de prescription Mader, laisser le prompt
    // système signaler l'absence plutôt que d'inventer 0.45 / 50 / 70 kg.
    const capMax = sport === "ultra" ? 60 : sport === "trail" ? 70 : (sport === "cap") ? 75 : 90;
    return { rate: 0, capMax, method: "insufficient" };
  }

  const carbOxGmin = calculateCarbOxidationGmin(intensityPct, vo2, vlx, weight);
  let totalOxGh = carbOxGmin * 60;
  if (input.heatCondition) totalOxGh *= 1.10; // +10% chaleur (une seule fois)

  const glycogen = weight * 5;
  const totalNeed = totalOxGh * durationH;
  const access = Math.min(0.75, 0.35 + 0.40 * Math.exp(-0.25 * durationH));
  const coverage = Math.min(0.85, (glycogen * access) / Math.max(1, totalNeed));
  const minExoFrac = durationH < 1 ? 0 : durationH < 2 ? 0.25 : durationH < 3 ? 0.40 : 0.50;
  let exoGh = totalOxGh * Math.max(minExoFrac, 1 - coverage);

  const capLike = sport === "cap" || sport === "trail" || sport === "ultra";
  const ultra = sport === "ultra";
  if (capLike) exoGh *= 0.82;
  if (ultra && durationH >= 6) exoGh *= 0.82;

  const capMax = ultra ? 60 : sport === "trail" ? 70 : capLike ? 75 : 90;
  const minFloor = durationH < 1 ? 0 : 30;
  const rate = Math.max(minFloor, Math.min(capMax, Math.round(exoGh)));
  return { rate, capMax, method: "mader" };
}

function hydrationRange(sport: Sport, weightKg: number, heat: boolean): [number, number] {
  const capLike = sport === "cap" || sport === "trail" || sport === "ultra";
  const lo = capLike ? 5 : 7;
  const hi = capLike ? 8 : 10;
  const mul = heat ? 1.25 : 1.0;
  return [Math.round(lo * weightKg * mul), Math.round(hi * weightKg * mul)];
}

function sodiumRange(heat: boolean, sport: Sport): [number, number] {
  const long = sport === "ultra" || sport === "trail";
  const base: [number, number] = long ? [500, 900] : [400, 700];
  if (heat) return [base[0] + 200, base[1] + 300];
  return base;
}

// -----------------------------------------------------------------------------
// 2) TTE âge-ajusté (F33) — masters
// -----------------------------------------------------------------------------
function tteAgeAdjust(age: number | null | undefined): { delta: number; label: string } {
  if (!age || age < 30) return { delta: 0, label: "adulte <30 (aucun ajustement)" };
  if (age < 40) return { delta: -2, label: "master 30-39 (−2 min sur cible TTE)" };
  if (age < 50) return { delta: -5, label: "master 40-49 (−5 min sur cible TTE)" };
  return { delta: -8, label: "master 50+ (−8 min sur cible TTE)" };
}

// -----------------------------------------------------------------------------
// 3) CAP injury risk (compact) + garde-fou master + world_class
// -----------------------------------------------------------------------------
function capRiskLevel(age: number | null | undefined, vlamaxForRun: number | null | undefined, sport: Sport, ambition: string): { level: "low" | "moderate" | "high" | "very-high"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (sport === "cap" || sport === "trail" || sport === "ultra") {
    if (age && age >= 50) { score += 2; reasons.push(`âge ${age} (impact ostéo-tendineux ↑)`); }
    else if (age && age >= 40) { score += 1; reasons.push(`âge ${age} (récupération ralentie)`); }
    if (vlamaxForRun && vlamaxForRun > 0.60) { score += 1; reasons.push(`VLamax run ${vlamaxForRun.toFixed(2)} élevée (raideur musculaire)`); }
    if (ambition === "elite" || ambition === "world_class") { score += 1; reasons.push(`ambition ${ambition} (charge spécifique élevée)`); }
    if (ambition === "world_class" && age && age >= 50) { score += 2; reasons.push(`⚠️ combinaison master 50+ × world_class`); }
  }
  const level = score >= 4 ? "very-high" : score >= 3 ? "high" : score >= 1 ? "moderate" : "low";
  return { level, reasons };
}

// -----------------------------------------------------------------------------
// Assemblage
// -----------------------------------------------------------------------------
export function buildNutritionAndSafetyBlock(input: GuardrailsInput): string {
  const objKey = normObj(input.objective);
  const sport = sportOfObjective(objKey, input.sportMain);
  const ambition = String(input.ambition ?? "age_group").toLowerCase();
  const range = DEFAULT_RACE_HOURS[objKey] ?? [3, 5];
  const durationH = input.raceDurationHours && input.raceDurationHours > 0
    ? input.raceDurationHours
    : (range[0] + range[1]) / 2;

  // Intensité race % VO2max approximative par objectif
  const intensityPct = objKey === "IM" ? 68
    : objKey === "703" ? 75
    : objKey === "Marathon" ? 78
    : objKey === "Semi" ? 85
    : objKey === "10K" ? 90
    : objKey === "5K" ? 95
    : objKey === "Ultra" ? 60
    : objKey === "TrailLong" ? 65
    : objKey === "Trail" ? 72
    : 75;

  const cho = computeCHO(input, objKey, sport, durationH, intensityPct);
  const weight = input.weightKg ?? 70;
  const heat = !!input.heatCondition;
  const [hydLo, hydHi] = hydrationRange(sport, weight, heat);
  const [naLo, naHi] = sodiumRange(heat, sport);
  const tteAdj = tteAgeAdjust(input.age);
  const risk = capRiskLevel(input.age, input.vlamaxRun, sport, ambition);

  const lines: string[] = [];
  lines.push(`\n### 🥗 NUTRITION MADER-HECK & 🛡️ GARDE-FOUS SANTÉ (Diagnostic auto)`);
  lines.push(`Ces prescriptions sont calculées côté serveur à partir du profil réel (Mader-Heck, F26-F31, F33). Elles PRIMENT sur toute règle générique de nutrition ou de charge.`);

  lines.push(`\n**Nutrition course (${objKey}, ${sport}, ~${durationH.toFixed(1)}h @ ${intensityPct}% VO₂max${heat ? ", chaleur >28°C" : ""})**`);
  lines.push(`- Glucides : **${cho.rate} g/h** (cap physiologique ${cho.capMax} g/h, méthode : ${cho.method})`);
  lines.push(`- Hydratation : **${hydLo}-${hydHi} ml/h** (${weight}kg${heat ? ", chaleur +25%" : ""})`);
  lines.push(`- Sodium : **${naLo}-${naHi} mg/h**${heat ? " (chaleur : +200 à +300 mg)" : ""}`);
  lines.push(`- ⚠️ Chaleur = **+10% CHO déjà intégré** (F30 : ne jamais double-compter dans les séances tardives).`);
  if (durationH >= 6) lines.push(`- 🕐 Événement >6h : tolérance digestive dégradée (−15%), prévoir gut training progressif dès Phase Build.`);
  if (objKey === "10K" || objKey === "5K" || objKey === "StartToRun") {
    lines.push(`- 🥤 Événement court (<1h) : plancher CHO = 0 (F31), aucune obligation en course. Séances longues (>1h30) suivent le taux ci-dessus.`);
  }
  lines.push(`- 📚 Séances "nutrition sim" en Race-Specific : reproduire ce taux exact (${cho.rate}g/h + ${hydLo}-${hydHi}ml/h).`);

  lines.push(`\n**TTE âge-ajusté (F33)**`);
  if (input.age) {
    lines.push(`- Âge déclaré : ${input.age} → **${tteAdj.label}**`);
    lines.push(`- Toute cible TTE injectée dans le plan DOIT appliquer cet ajustement (source unique : \`getTTETarget(objectif, age)\`).`);
  } else {
    lines.push(`- ⚠️ Âge non renseigné → utilise cibles TTE adultes standards SANS ajustement master. Ne pas fabriquer d'ajustement fictif.`);
  }

  lines.push(`\n**Risque blessure CAP (${sport}) — Niveau : ${risk.level.toUpperCase()}**`);
  if (risk.reasons.length > 0) {
    for (const r of risk.reasons) lines.push(`- ${r}`);
    if (risk.level === "high" || risk.level === "very-high") {
      lines.push(`- 🚨 **Charge cap : plafonner volume run à −15% vs matrice standard**, densifier récup active (Z1-Z2 vélo), interdire fractionné VMA >2×/sem.`);
      if (input.age && input.age >= 50 && (ambition === "elite" || ambition === "world_class")) {
        lines.push(`- 🚨 **Master 50+ × ${ambition}** : combinaison à haut risque santé. Le plan DOIT mentionner explicitement les précautions (récup ≥48h post-fractionné, monitoring HRV, semaine décharge tous les 3, pas tous les 4).`);
      }
    } else if (risk.level === "moderate") {
      lines.push(`- 🟡 Risque modéré : respecter progression volume ≤10%/semaine, 1 séance récup active/sem.`);
    }
  } else {
    lines.push(`- ✅ Aucun facteur de risque détecté au-delà du standard.`);
  }

  return lines.join("\n");
}
