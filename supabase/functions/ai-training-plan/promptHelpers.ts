// ═══════════════════════════════════════════════════════════════
// PROMPT HELPERS — User prompt builder, CP/W' model, diagnostics
// ═══════════════════════════════════════════════════════════════

import { normalizeObjKey, normalizeAmbKey, getTimeTargetHint, getSportDistributionConstraint, extractLimiterKeywords, type CatalogDurationStats } from "./sportRatioMatrix.ts";
import { getVLamaxRangeForPlan } from "./vlamaxTargets.ts";

// === STRUCTURED DIAGNOSTIC BLOCK (config-based, always available) ===
// Builds a compact structured block from planConfig for re-injection in chunks
// FIX #3 (audit recap): Now includes estimated phase bounds for the full plan

/**
 * 🏙️ HARD-BAN TERRAIN BLOCK — Injecté en TÊTE de CHAQUE chunk (chunk 1, N, retries).
 * Quand l'athlète déclare terrain "plat"/"vallonné"/"mixte", on bannit explicitement
 * les patterns "montagne / +XXXXm D+" pour éviter que l'IA mime les exemples
 * du systemPrompt (qui contiennent de nombreuses tables avec +1200m/+1500m D+).
 */
export function buildTerrainHardBanBlock(config: any): string {
  const ta = config?.terrainAvailability;
  if (!ta || ta === "montagne") return "";
  const tp = config?.trailProfile;
  // Fallback when trailProfile is missing : on raisonne sur weeklyHours / défaut.
  const weeklyPeakDPlus = tp?.weeklyDPlusPeakM ?? 2000;

  const lines: string[] = [];
  lines.push(`\n🚨🚨🚨 CONTRAINTE TERRAIN — PRIORITÉ ABSOLUE (override TOUS les exemples du system prompt, même "+1200m D+ montagne") :`);
  if (ta === "plat") {
    const maxDPlusWeekday = 150;
    const maxDPlusWeekend = Math.round(weeklyPeakDPlus * 0.6);
    lines.push(`  • Athlète URBAIN en terrain PLAT (ex: Bruxelles, Amsterdam, Paris intra) — AUCUN dénivelé naturel disponible en semaine.`);
    lines.push(`  • ❌ INTERDIT en SEMAINE (lun-ven) : toute séance "montagne", "sentier montagne", "+500m D+" ou plus, "SL trail montagne", "back-to-back montagne", "massif".`);
    lines.push(`  • ❌ INTERDIT de prescrire >${maxDPlusWeekday}m D+ sur une séance de semaine (impossible à exécuter).`);
    lines.push(`  • ✅ QUOTA OBLIGATOIRE PAR SEMAINE : minimum 2 séances [URBAIN] dans chaque semaine de Build/Peak (tapis incliné, escaliers, côtes urbaines, excentrique salle). Chaque titre DOIT commencer par [URBAIN].`);
    lines.push(`  • ✅ Catalogue URBAIN à PIOCHER : URBAN_TAPIS_INCLINE_SEUIL, URBAN_COTES_URBAINES_VMA, URBAN_ESCALIERS_PYRAMIDE, URBAN_EXCENTRIQUE_DESCENTE_SALLE, URBAN_TAPIS_SL_LONG, URBAN_DOUBLE_TAPIS_AM_PM, URBAN_PARC_BOUCLES_VALLONNEES, V2_STR_ESCALIERS_TRAIL. Utilise leurs IDs explicitement.`);
    lines.push(`  • 🎒 ✅ WEEK-ENDS EXPÉ HORS-VILLE — PLANIFICATION OBLIGATOIRE (ne PAS oublier, c'est le pilier D+ du plan) :`);
    lines.push(`      → Build : MINIMUM 1 week-end expé tous les 14 jours (= 2/mois). Choisir EXPE_HORS_VILLE_SL_DPLUS (sam OU dim, ${maxDPlusWeekend}m D+ max).`);
    lines.push(`      → Peak (4-6 dernières sem avant course) : MINIMUM 2 week-ends expé/mois dont AU MOINS 1 EXPE_HORS_VILLE_BACK_TO_BACK (sam+dim consécutifs en massif).`);
    lines.push(`      → Si course inclut descentes techniques : ajouter 1× EXPE_HORS_VILLE_DESCENTE_TECHNIQUE /mois en Build/Peak.`);
    lines.push(`      → Chaque expé week-end DOIT apparaître nommément dans le plan avec titre commençant par [EXPÉ HORS-VILLE] et l'ID catalogue correspondant. NE PAS se contenter de "SL trail" générique.`);
    lines.push(`      → Si l'athlète indique l'impossibilité expé un week-end donné : substituer par URBAN_DOUBLE_TAPIS_AM_PM (sam 2h + dim 3h tapis incliné), mais cela reste l'EXCEPTION pas la règle.`);
    lines.push(`  • Sem 1 (S1) : pas d'expé week-end (adaptation). Compensations urbaines uniquement. EXPÉ démarre dès S2-S3.`);
    lines.push(`  • VALIDATION : plan INVALIDE si (a) <2 séances [URBAIN]/sem en Build/Peak, OU (b) <2 séances [EXPÉ HORS-VILLE]/mois en Build, OU (c) aucun back-to-back EXPÉ en Peak, OU (d) "montagne/+XXXm D+" en lun-ven.`);
  } else if (ta === "vallonne") {
    lines.push(`  • Athlète en terrain VALLONNÉ (collines 50-200m max) — pas de massif montagneux accessible en semaine.`);
    lines.push(`  • ❌ INTERDIT en semaine : séances "montagne >500m D+ continu", "SL trail montagne 1500m+", "altitude".`);
    lines.push(`  • ✅ QUOTA : minimum 1 séance [URBAIN] (tapis incliné ou excentrique salle) par semaine en Build/Peak, + 1-2 séances "collines locales" (VMA côtes / seuil montée).`);
    lines.push(`  • ✅ Catalogue à pioche : URBAN_TAPIS_INCLINE_SEUIL, URBAN_EXCENTRIQUE_DESCENTE_SALLE + sessions VMA côtes du catalogue trail.`);
    lines.push(`  • ✅ Week-ends massif (<2h route) : 1× tous les 10-15j possible. Tagger [EXPÉ HORS-VILLE].`);
  } else if (ta === "mixte") {
    lines.push(`  • Athlète MIXTE : urbain en semaine, accès montagne week-end uniquement.`);
    lines.push(`  • ❌ INTERDIT en semaine (lun-ven) : séances "montagne >500m D+", "SL trail montagne".`);
    lines.push(`  • ✅ QUOTA : minimum 1 séance [URBAIN] (tapis/escaliers/excentrique) par semaine en lun-ven.`);
    lines.push(`  • ✅ Concentrer TOUTES les séances montagne (SL D+ long, descente technique, back-to-back) sur sam/dim.`);
  }
  return lines.join("\n");
}

export function buildStructuredDiagnosticBlock(config: any, totalWeeks?: number): string {
  const lines: string[] = [];
  
  // Objective & Ambition
  const objKey = normalizeObjKey(config?.objective || "");
  const ambKey = normalizeAmbKey(config?.ambition || "");
  lines.push(`🎯 Objectif: ${config?.objective || "N/A"} (normalisé: ${objKey})`);
  lines.push(`🏅 Ambition: ${config?.ambition || "N/A"} (normalisé: ${ambKey})`);
  const diagTimeTarget = getTimeTargetHint(config?.objective || "", config?.ambition || "", config?._athleteSex);
  if (diagTimeTarget) lines.push(`🎯 Temps cible: ${diagTimeTarget}`);
  
  // Limiters (structured, ranked) — utilise la liste RAW légère (noms de métriques)
  // pour rester compact (chunks 2..N réinjectent ce bloc).
  const limitersRaw: string[] | undefined = config?.identifiedLimitersRaw;
  if (limitersRaw && limitersRaw.length > 0) {
    lines.push(`\n🔴 LIMITEURS CLASSÉS (${limitersRaw.length} identifiés) :`);
    limitersRaw.forEach((l: string, i: number) => {
      const tag = i === 0 ? "L1 (PRIORITAIRE)" : i === 1 ? "L2 (SECONDAIRE)" : `L${i + 1}`;
      lines.push(`  ${tag}: ${l}`);
    });
  } else {
    lines.push(`\n⚠️ Aucun limiteur identifié — plan généraliste.`);
  }
  
  // Active levers
  if (config?.activeLevers && config.activeLevers.length > 0) {
    lines.push(`\n⚡ Leviers actifs: ${config.activeLevers.join(", ")}`);
  }
  
  // Prohibitions — injected in detail later (see L3853+), only add brief reminder here
  // (detailed injection with PRIORITÉ ABSOLUE is done below in the athlete profile section)

  // 📍 PROFIL COURSE TRAIL — pré-calculé côté code (D+/km, terrain, D+ hebdo cible)
  // Injecté UNE SEULE FOIS dans chunk 1 (≈80 tokens). Évite hallucination du profil.
  if (config?.trailProfile) {
    const tp = config.trailProfile;
    const durMin = tp.estimatedRaceDurationMin;
    const durStr = durMin
      ? `${Math.floor(durMin / 60)}h${(durMin % 60).toString().padStart(2, "0")}`
      : "n/r";
    lines.push(`\n📍 PROFIL COURSE TRAIL (valeurs finales, ne pas recalculer) :`);
    lines.push(`  • Distance: ${tp.distanceKm} km · D+: ${tp.elevationGainM} m · Ratio: ${tp.dPlusPerKm} m/km → terrain "${tp.terrainLabel}"`);
    lines.push(`  • Durée estimée: ${durStr}${tp.needsNightSimulation ? " (≥6h → simulations nocturnes obligatoires)" : ""}`);
    lines.push(`  • D+ hebdo cible: base ${tp.weeklyDPlusBaseM}m → peak ${tp.weeklyDPlusPeakM}m`);
    lines.push(`  • 🚦 RAMPE D+ MAX: +30%/sem (Gabbett ACWR ≤1.3). NE PAS sauter de base→peak en <4 sem. Décharge -40% D+ toutes les 3 sem.`);
    if (tp.descentTechnicalRequired) {
      lines.push(`  • ⚠️ Descente technique OBLIGATOIRE 1x/sem en Build/Peak (ratio ≥35 m/km)`);
    }
    if (tp.needsAcclimatation) {
      lines.push(`  • ⚠️ Altitude max ≥2000m → bloc d'acclimatation (3-4 sem) ou simulation hypoxie`);
    }
    lines.push(`  • Gut Training cible: ${tp.gutTrainingTargetGPerH} g CHO/h testé en simulation longue`);
  }

  // 🏙️ ATHLÈTE URBAIN — substitutions montagne obligatoires
  // Injecté chunk 1 quand le coach déclare terrain=plat/vallonné/mixte sur un objectif trail.
  // Sans cela, l'IA prescrit des séances montagne irréalisables (frustration + non-adhérence).
  if (config?.terrainAvailability && config.terrainAvailability !== "montagne" && config?.trailProfile) {
    const ta = config.terrainAvailability as "plat" | "vallonne" | "mixte";
    const tp = config.trailProfile;
    const dPlusWeekly = tp.weeklyDPlusPeakM;
    const labelMap = { plat: "PLAT (urbain, aucun dénivelé semaine)", vallonne: "VALLONNÉ (collines 50-200m)", mixte: "MIXTE (urbain semaine + montagne weekend)" };
    lines.push(`\n🏙️ ATHLÈTE URBAIN — TERRAIN DÉCLARÉ : ${labelMap[ta]}`);
    lines.push(`  ⚠️ Le profil course exige ${dPlusWeekly}m D+/sem en peak, mais l'athlète vit en terrain ${ta === "plat" ? "plat" : ta === "vallonne" ? "vallonné" : "mixte"}.`);
    lines.push(`  RÈGLES DE SUBSTITUTION OBLIGATOIRES (à appliquer pour CHAQUE semaine du plan) :`);
    if (ta === "plat") {
      lines.push(`  • Remplacer toute "séance montagne / D+ long" semaine par : (1) tapis roulant incliné 8-15% [60-120min], (2) répétitions escaliers building/parking [25-45min], ou (3) côtes urbaines courtes répétées (passerelles, ponts) [40-70min].`);
      lines.push(`  • Sorties longues (SL) D+ : programmer 1× tous les 15j en WEEK-END "EXPÉDITION" hors-ville (Ardennes, Vosges, Hautes Fagnes, etc.) — distance et temps de trajet à intégrer comme contrainte.`);
      lines.push(`  • Back-to-back week-ends (Build/Peak) : OBLIGATOIRE 2-3× / phase en sortie hors-ville. Si impossible, fractionner en 2 doubles (samedi 2h tapis incliné + dimanche 3h tapis incliné).`);
      lines.push(`  • Descente technique : substituer par travail excentrique en salle (presse 120° avec phase descente 3-4s, step-downs lents 4×8/côté, Nordic curls) — minimum 2×/sem en Build.`);
      lines.push(`  • Calculer D+ hebdo cumulé réaliste : ~60% du target théorique (${Math.round(dPlusWeekly * 0.6)}m) atteint en compensation + 40% concentré sur les 2-3 week-ends expé/mois.`);
    } else if (ta === "vallonne") {
      lines.push(`  • Utiliser au MAX les collines locales : 2-3× /sem en VMA côtes / seuil montée sur les bosses 50-200m disponibles (répétitions multiples).`);
      lines.push(`  • Compléter avec : tapis incliné 8-15% pour les blocs de seuil montée long (>30min continu impossible sur les collines courtes).`);
      lines.push(`  • Sortie longue D+ : programmer 1× tous les 10-15j en week-end hors-ville (massif accessible <2h route).`);
      lines.push(`  • D+ hebdo cible réaliste : ~80% du target théorique (${Math.round(dPlusWeekly * 0.8)}m).`);
    } else {
      // mixte
      lines.push(`  • Semaine en ville : 70% du D+ cible via tapis incliné + côtes urbaines + escaliers.`);
      lines.push(`  • Week-end montagne : SL D+ long + back-to-back possibles. Concentrer les séances clés montagne (descente technique, D+ long >2000m) sur ces 2 jours.`);
      lines.push(`  • Pendant phase Spécifique (4-6 dernières sem) : viser 2 week-ends montagne / mois minimum.`);
      lines.push(`  • D+ hebdo cible réaliste : ~90% du target théorique (${Math.round(dPlusWeekly * 0.9)}m).`);
    }
    lines.push(`  • Catalogue séances à PRIVILÉGIER : "V2_STR_ESCALIERS_TRAIL", "URBAN_TAPIS_INCLINE_SEUIL", "URBAN_COTES_URBAINES_VMA", "URBAN_ESCALIERS_PYRAMIDE", "URBAN_EXCENTRIQUE_DESCENTE_SALLE".`);
    lines.push(`  • Chaque séance "compensation urbaine" DOIT être annotée [URBAIN] dans le titre pour traçabilité.`);
    lines.push(`  • Si bloc d'acclimatation altitude requis (course >2000m) : recommander stage 7-14j sur place J-21 à J-7 (intégrer dans constraints du plan).`);
  }

  // Volume constraints
  if (config?.weeklyHours) lines.push(`\n📊 Volume: ${config.weeklyHours}h/sem`);
  if (config?.sessionsPerWeek) lines.push(`📊 Séances: ${config.sessionsPerWeek}/sem`);
  if (config?.maxSessionsPerDay) lines.push(`📊 Max/jour: ${config.maxSessionsPerDay}`);

  // Charge récente — contexte d'absorption (CTL/ATL proxy via TSS 7j)
  if (config?.recentLoad) {
    const rl = config.recentLoad;
    const statusEmoji =
      rl.status === "overload" ? "🔴" :
      rl.status === "high" ? "🟠" :
      rl.status === "optimal" ? "🟢" :
      rl.status === "low" ? "🔵" : "⚪";
    lines.push(`\n${statusEmoji} CHARGE RÉCENTE (TSS 7j) : ${rl.tss7d ?? "N/R"} — statut "${rl.status}" — cible objectif : min ${rl.target.min} / opt ${rl.target.opt} / max ${rl.target.max}`);
    if (rl.status === "overload" || rl.status === "high") {
      lines.push(`  ⚠️ Athlète déjà chargé : NE PAS dépasser +5-7 TSS/sem en S1-S2. Prévoir 1 semaine d'allègement avant montée en charge.`);
    } else if (rl.status === "low") {
      lines.push(`  ⚠️ Athlète peu chargé : progression +5-7 TSS/sem MAX. Pas de saut brutal de volume sur S1-S2 pour éviter blessure.`);
    } else if (rl.status === "unknown") {
      lines.push(`  ⚠️ Charge inconnue : démarrer prudemment au volume cible MIN, monter de +5-7 TSS/sem.`);
    } else {
      lines.push(`  ✅ Charge cohérente avec l'objectif. Progression normale +5-7 TSS/sem possible.`);
    }
  }

  // 🚦 RAMPE DE VOLUME OBLIGATOIRE — contrainte dure Sem 1 + ramp-up
  // Injectée chunk 1 uniquement (buildStructuredDiagnosticBlock = chunk 1).
  // Dérivée de `trainingLevel` (coach) + `weeklyHours` cible.
  if (config?.volumeRamp) {
    const vr = config.volumeRamp;
    const levelLabel = {
      untrained: "Non entraîné",
      light: "Entraînement léger",
      trained: "Entraîné",
      highly_trained: "Très entraîné / Peak form",
    }[vr.trainingLevel as string] || vr.trainingLevel;
    const capStr = vr.week1HoursCap !== null ? ` (plafond absolu ${vr.week1HoursCap}h)` : "";
    lines.push(`\n🚦 RAMPE DE VOLUME OBLIGATOIRE — niveau déclaré "${levelLabel}" :`);
    lines.push(`  • Cible finale : ${vr.weeklyHoursTarget}h/sem (à atteindre progressivement, PAS dès Sem 1)`);
    lines.push(`  • Semaine 1 : MAX ${vr.week1HoursMax}h (= ${Math.round(vr.week1PctTarget * 100)}% de la cible)${capStr}`);
    lines.push(`  • Rampe : atteindre ${vr.weeklyHoursTarget}h en ~${vr.rampWeeks} semaine(s), progression MAX +${Math.round(vr.weeklyIncreasePctMax * 100)}%/sem (règle des 10%, ACWR ≤ 1.3 — Gabbett)`);
    lines.push(`  ⚠️ NE PAS appliquer le volume cible "weeklyHours" dès Sem 1 : c'est la cible APRÈS la rampe, pas le point de départ.`);
    lines.push(`  ⚠️ Une semaine de décharge (deload) DOIT intervenir tous les 3 microcycles de charge même pendant la rampe.`);
  }

  // FIX C5 + audit V8: Limiter-aware phase heuristics — works for ANY plan ≥4 semaines.
  // Avant: gating à tw>10 laissait l'IA improviser sur 4-10 sem (cas typique trail 6 sem).
  if (totalWeeks && totalWeeks >= 4) {
    const tw = totalWeeks;
    const isFinisher = ambKey === "finisher";
    // Utilise la liste RAW (noms métriques) ; fallback sur identifiedLimiters si absent
    const rawList: string[] = (config?.identifiedLimitersRaw && config.identifiedLimitersRaw.length > 0)
      ? config.identifiedLimitersRaw
      : (config?.identifiedLimiters || []);
    const L1 = (rawList[0] || "").toLowerCase();
    const L2 = (rawList[1] || "").toLowerCase();

    // Taper duration adapté à la durée du plan (max 3 sem, min 1 sem)
    const fullTaper = ["IM", "TrailUltra"].includes(objKey) ? 3 : ["703", "Marathon"].includes(objKey) ? 2 : ["Semi", "Trail", "TrailMountain"].includes(objKey) ? 2 : 1;
    // Plan court: on rogne le taper plutôt que les phases (mais on garde ≥1 sem)
    const taperWeeks = Math.max(1, Math.min(fullTaper, Math.floor(tw * 0.2)));

    // Race-specific: rogné aussi pour plans courts
    const targetRaceSpecific = isFinisher ? 0 : Math.min(4, Math.max(2, Math.floor(tw * 0.15)));
    const raceSpecificWeeks = Math.max(0, Math.min(targetRaceSpecific, tw - taperWeeks - 2)); // au moins 2 sem pour fondation+build

    const remainingWeeks = Math.max(2, tw - taperWeeks - raceSpecificWeeks);

    const isVlamaxLimiter = /vlamax|glycoly|anaerob/i.test(L1);
    const isDurabilityLimiter = /durabilit|tte|endurance|fatmax|lipid/i.test(L1);
    const isEconomyLimiter = /econom|technique|cadence|biom[ée]can/i.test(L1);

    let fondationPct = 0.35;
    if (isEconomyLimiter) fondationPct = 0.42;
    else if (isVlamaxLimiter) fondationPct = 0.30;
    else if (isDurabilityLimiter) fondationPct = 0.30;

    // Garantit fondation ≥1 sem et build ≥1 sem (jamais négatif)
    let fondationWeeks = Math.max(1, Math.floor(remainingWeeks * fondationPct));
    let buildWeeks = remainingWeeks - fondationWeeks;
    if (buildWeeks < 1) {
      buildWeeks = 1;
      fondationWeeks = Math.max(1, remainingWeeks - 1);
    }

    const L1Short = L1 ? L1.split(/[\s(,]/)[0] : "Limiteur #1";
    const L2Short = L2 ? L2.split(/[\s(,]/)[0] : "Limiteur #2";

    const planLengthTag = tw < 8 ? " — PLAN COURT (densité prioritaire sur volume)" : tw < 12 ? " — PLAN MOYEN" : "";
    lines.push(`\n📅 BORNES DE PHASE ESTIMÉES (${tw} semaines, ajustées selon L1="${L1Short}")${planLengthTag} :`);
    if (isFinisher) {
      lines.push(`  Phase 1 — Adaptation : S1-S${fondationWeeks}`);
      lines.push(`  Phase 2 — Développement : S${fondationWeeks + 1}-S${fondationWeeks + buildWeeks}`);
      if (raceSpecificWeeks > 0) lines.push(`  Phase 3 — Consolidation : S${fondationWeeks + buildWeeks + 1}-S${tw - taperWeeks}`);
      lines.push(`  Phase ${raceSpecificWeeks > 0 ? "4" : "3"} — Affûtage : S${tw - taperWeeks + 1}-S${tw}`);
    } else {
      const chantierEnd = fondationWeeks + Math.max(1, Math.ceil(buildWeeks * (isVlamaxLimiter || isDurabilityLimiter ? 0.55 : 0.5)));
      const consolEnd = fondationWeeks + buildWeeks;
      lines.push(`  Bloc Fondation + Intensité : S1-S${fondationWeeks}${isEconomyLimiter ? " (étendu: adaptation motrice L1)" : ""}`);
      lines.push(`  Bloc Chantier [${L1Short}↓] : S${fondationWeeks + 1}-S${chantierEnd}${isVlamaxLimiter ? " (étendu: chantier métabolique prioritaire)" : ""}`);
      if (consolEnd > chantierEnd) lines.push(`  Bloc Consolidation [${L2Short}] : S${chantierEnd + 1}-S${consolEnd}`);
      if (raceSpecificWeeks > 0) lines.push(`  Bloc Race-Specific : S${consolEnd + 1}-S${tw - taperWeeks}`);
      lines.push(`  Bloc Affûtage : S${tw - taperWeeks + 1}-S${tw}`);
    }
    if (tw < 8) {
      lines.push(`  ⚠️ PLAN COURT (<8 sem) : pas de redondance. CHAQUE séance compte. Densité Z3/Z4 maintenue dès S1 (pas de "vraie" base aérobie possible).`);
    }
    lines.push(`  ⚠️ Ces bornes sont INDICATIVES mais adaptées aux limiteurs détectés. Le Récapitulatif Stratégique du chunk 1 fait foi.`);
  }
  
  return lines.join("\n");
}

// === EXTRACT STRATEGIC RECAP from chunk 1 text ===
// FIX #1 (audit recap): Robust multi-pattern extraction for the Récapitulatif Stratégique
export function extractStrategicRecap(chunkText: string): string {
  // Pattern 1: Standard "## Récapitulatif Stratégique" with optional numbering/emoji
  // Captures everything until the next ## heading or ### Semaine
  const patterns = [
    // ## Récapitulatif Stratégique / ## 2. Récapitulatif / ## 📊 Récapitulatif
    /(?:#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?R[ée]capitulatif[^\n]*\n)([\s\S]*?)(?=\n#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?(?:Semaine|Bloc|Phase|Programme|Plan\s))/iu,
    // Broader: match until any ## header that's NOT part of the recap
    /(?:#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?R[ée]capitulatif[^\n]*\n)([\s\S]*?)(?=\n#{2,3}\s)/iu,
  ];

  for (const pattern of patterns) {
    const match = chunkText.match(pattern);
    if (match && match[1].trim().length > 50) {
      // F-12 (audit IA plan v8): bumped 4000 → 6000 chars to preserve full periodization
      // narrative on long plans (Ironman 28w, Trail Mountain 24w). Token budget profiler
      // (scripts/profileChunkTokenBudget.py) confirms <5% Gemini Flash 1M context, +500 tok/chunk safe.
      return match[1].trim().slice(0, 6000);
    }
  }

  // Fallback: capture any table that references Blocs/Phases with week ranges
  const blocTableMatch = chunkText.match(
    /(\|[^\n]*(?:Bloc|Phase|Limiteur)[^\n]*\|\s*\n\|[\s\-:|]+\|\s*\n(?:\|[^\n]+\|\s*\n)+)/i
  );
  if (blocTableMatch) {
    return blocTableMatch[1].trim().slice(0, 3500);
  }

  // Fallback: capture Synergies + Limiteurs sections (bullet lists + tables combined)
  const limiterTableMatch = chunkText.match(
    /(\|[^\n]*(?:#|Rang|Priorit)[^\n]*Limiteur[^\n]*\|\s*\n\|[\s\-:|]+\|\s*\n(?:\|[^\n]+\|\s*\n)+)/i
  );
  const synergyMatch = chunkText.match(
    /(?:#{2,4}\s*Synergies[^\n]*\n)((?:\s*[-•]\s*[^\n]+\n?)+)/i
  );
  const combined = [
    limiterTableMatch ? limiterTableMatch[1].trim() : "",
    synergyMatch ? `Synergies:\n${synergyMatch[1].trim()}` : "",
  ].filter(Boolean).join("\n\n");
  if (combined.length > 80) return combined.slice(0, 6000);

  // Last resort: capture lines mentioning phase boundaries (S1-SN patterns)
  const phaseLines = chunkText.match(/(?:Fondation|Chantier|Build|Consolidation|Race.Specific|Aff[ûu]tage|Taper|Sp[ée]cifique|D[ée]veloppement|Pr[ée]paration)[^\n]*S\d+[^\n]*/gi) || [];
  if (phaseLines.length > 0) {
    return phaseLines.slice(0, 20).join("\n");
  }

  return "";
}

// === DETECT ACTIVE PHASE from generated text ===
// FIX #4 (audit recap): Broader detection — matches multiple header formats
export function detectActivePhase(text: string, currentPhase: string): string {
  // Match various header formats for phase/bloc names
  const patterns = [
    /##\s*Bloc\s*\d+\s*[:—–\-]\s*([^\n(]+)/gi,        // ## Bloc 3 : Race-Specific
    /##\s*Bloc\s+([^\n(]+)\s*\(S/gi,                     // ## Bloc Chantier VLamax↓ (S7-S12)
    /##\s*(Fondation|Chantier|Consolidation|Build|Race.Specific|Affûtage|Taper|Adaptation|Développement)[^\n]*/gi,
    /###\s*Phase\s*\d*\s*[:—–\-]?\s*([^\n]+)/gi,        // ### Phase 2 : Build
    /\*\*Phase\s*(?:active)?\s*[:—–]?\s*\*\*\s*([^\n]+)/gi, // **Phase active :** Build
  ];

  let lastPhase = "";
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const candidate = (m[1] || m[0]).replace(/^##\s*Bloc\s*\d+\s*[:—–\-]?\s*/i, "").replace(/\*\*/g, "").trim();
      if (candidate && candidate.length > 2 && candidate.length < 80) {
        lastPhase = candidate;
      }
    }
  }

  return lastPhase || currentPhase;
}

// === VALIDATE CHUNK 1 OUTPUT ===
// FIX #6 (audit recap): Check that chunk 1 contains a Récapitulatif with phase boundaries
export function validateChunk1HasRecap(chunkText: string): { hasRecap: boolean; hasPhases: boolean } {
  const hasRecap = /##\s*(?:2\.\s*)?R[ée]capitulatif/i.test(chunkText);
  const hasPhases = /S\d+\s*[-–—]\s*S\d+/i.test(chunkText) || /Semaines?\s*\d+\s*[-–àto]\s*\d+/i.test(chunkText);
  return { hasRecap, hasPhases };
}

// === SHARED CP/W' COMPUTATION (used by both buildCPWprimeSection and chunk prompts) ===
// FIXED: P5s and FTP excluded from regression (Jones 2019) — only P30s, P60s, MAP5min used
// FIXED: effectiveCP bounding by FTP, W' bounded [10kJ floor, 35kJ ceiling] (R8 — aligned with client-side criticalPowerModel.ts)
export function computeCPWprime(data: any): { cpRound: number; effectiveCP: number; wprimeKJ: number; wprimeJ: number; wprimeEffJ: number; cpBounded: boolean; wprimeCapped: boolean } | null {
  // Only use points within the valid 2-parameter model range (~30s–5min)
  const regressionPoints: { dur: number; pow: number }[] = [];
  if (data?.p30s && data.p30s > 0) regressionPoints.push({ dur: 30, pow: data.p30s });
  if (data?.p60s && data.p60s > 0) regressionPoints.push({ dur: 60, pow: data.p60s });
  if (data?.map5min && data.map5min > 0) regressionPoints.push({ dur: 300, pow: data.map5min });
  if (regressionPoints.length < 2) return null;

  const n = regressionPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of regressionPoints) {
    const x = p.dur, y = p.pow * p.dur;
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const cp = (n * sumXY - sumX * sumY) / denom;
  const wprime = (sumY - cp * sumX) / n;
  if (cp < 30 || cp > 800 || wprime < 500 || wprime > 80000) return null;

  const cpRound = Math.round(cp);
  const ftp = data?.ftp ? Number(data.ftp) : null;

  // Effective CP — bounded by FTP when CP is suspect (aligned with client-side)
  const CP_FTP_MAX_GAP = 20;
  const CP_FTP_EFFECTIVE_OFFSET = 10;
  let effectiveCP = cpRound;
  let cpBounded = false;
  if (ftp && ftp > 0 && cpRound > ftp + CP_FTP_MAX_GAP) {
    effectiveCP = ftp + CP_FTP_EFFECTIVE_OFFSET;
    cpBounded = true;
  }

  // R8: W' bounds — plancher 10 kJ + plafond 35 kJ (aligné avec effectiveWprime() côté client)
  // Plancher : fiabilité minimale des prescriptions de repos
  // Plafond : limite physiologique haute (au-delà : artefact de régression)
  const W_PRIME_FLOOR = 10000; // 10 kJ
  const W_PRIME_CEILING = 35000; // 35 kJ
  const wprimeEffJ = Math.min(Math.max(wprime, W_PRIME_FLOOR), W_PRIME_CEILING);
  const wprimeCapped = wprime > W_PRIME_CEILING;

  return { cpRound, effectiveCP, wprimeKJ: Math.round(wprime / 100) / 10, wprimeJ: wprime, wprimeEffJ, cpBounded, wprimeCapped };
}

// === CRITICAL POWER / W' INLINE MODEL (Skiba 2012) ===
// ─── RECOVERY STRATEGY ────────────────────────────────────────────────────
// Permet au coach de choisir le profil de récupération inter-séries qui sera
// utilisé pour calculer les durées de repos via le modèle W'bal (Skiba 2012).
//   - "passive"        : récupération à 0 W (debout/marche, pédalage <50W)
//   - "active-light"   : récupération à 50% CP (Z1, "spinning" léger)
//   - "active-tempo"   : récupération à 70% CP (haut Z2 / bas Z3, type over-under)
// Une récupération active augmente le tau de réplétion W' → repos prescrits
// plus longs pour atteindre la même qualité de reconstitution.
export type RecoveryStrategy = "passive" | "active-light" | "active-tempo";

export function resolveRecoveryPower(
  strategy: RecoveryStrategy,
  effectiveCP: number
): { recPow: number; label: string; pctCP: number } {
  switch (strategy) {
    case "active-light":
      return { recPow: Math.round(effectiveCP * 0.50), label: "Active légère (50% CP — Z1, spinning)", pctCP: 50 };
    case "active-tempo":
      return { recPow: Math.round(effectiveCP * 0.70), label: "Active tempo (70% CP — haut Z2)", pctCP: 70 };
    case "passive":
    default:
      return { recPow: 0, label: "Passive (0 W — debout/marche)", pctCP: 0 };
  }
}

// F-07: pure helpers aligned with src/lib/v2/criticalPowerModel.ts so that edge-side
// recovery prescriptions stay consistent with client-side W'bal simulation.
export function calcTauEdge(effectiveCP: number, recPow: number): number {
  const dcp = effectiveCP - recPow;
  if (dcp <= 0) return Infinity;
  return Math.max(200, Math.min(1500, 546 * Math.exp(-0.01 * dcp) + 316));
}

export function calcRecoveryEdge(
  effectiveCP: number,
  wprimeEffJ: number,
  intPow: number,
  intDur: number,
  recPow: number
): { rest: number; maxReps: number } {
  if (intPow <= effectiveCP) return { rest: 60, maxReps: 20 };
  const wbalAfter = Math.max(0, wprimeEffJ - (intPow - effectiveCP) * intDur);
  const depleted = wprimeEffJ - wbalAfter;
  const safeRecPow = recPow >= effectiveCP ? 0 : recPow;
  const tau = calcTauEdge(effectiveCP, safeRecPow);
  const target75 = wprimeEffJ * 0.75;
  const remaining = wprimeEffJ - target75;
  const optRest =
    depleted > 0 && remaining < depleted ? Math.round(-tau * Math.log(remaining / depleted)) : 60;
  const wCost = (intPow - effectiveCP) * intDur;
  let maxReps = 0;
  let simWbal = wprimeEffJ;
  for (let rep = 0; rep < 30; rep++) {
    simWbal = Math.max(0, simWbal - wCost);
    if (simWbal <= 0) break;
    maxReps++;
    const depNow = wprimeEffJ - simWbal;
    simWbal = wprimeEffJ - depNow * Math.exp(-optRest / tau);
    if (simWbal - wCost <= 0) break;
  }
  return { rest: optRest, maxReps: Math.max(1, maxReps) };
}

export function buildCPWprimeSection(data: any, recoveryStrategy: RecoveryStrategy = "passive"): string | null {
  // Reuse shared computation
  const result = computeCPWprime(data);
  if (!result) return null;

  const { cpRound, effectiveCP, wprimeKJ, wprimeJ: wprime, wprimeEffJ, cpBounded, wprimeCapped } = result;

  // All points for display (including overlay-only P5s and FTP)
  const points: { dur: number; pow: number; label: string; regression: boolean }[] = [];
  if (data.pmax5s && data.pmax5s > 0) points.push({ dur: 5, pow: data.pmax5s, label: "P5s", regression: false });
  if (data.p30s && data.p30s > 0) points.push({ dur: 30, pow: data.p30s, label: "P30s", regression: true });
  if (data.p60s && data.p60s > 0) points.push({ dur: 60, pow: data.p60s, label: "P60s", regression: true });
  if (data.map5min && data.map5min > 0) points.push({ dur: 300, pow: data.map5min, label: "MAP5min", regression: true });
  if (data.ftp && data.ftp > 0) points.push({ dur: 3600, pow: data.ftp, label: "FTP", regression: false });
  const regressionPts = points.filter(p => p.regression);
  const n = regressionPts.length;

  // R² — computed on regression points only
  let sumX = 0, sumY = 0;
  for (const p of regressionPts) { sumX += p.dur; sumY += p.pow * p.dur; }
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const p of regressionPts) {
    const yA = p.pow * p.dur;
    const yP = cpRound * p.dur + wprime;
    ssTot += (yA - yMean) ** 2;
    ssRes += (yA - yP) ** 2;
  }
  const r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;
  const weight = data.weightKg ? Number(data.weightKg) : null;
  const ftp = data.ftp ? Number(data.ftp) : null;

  const lines: string[] = [];
  lines.push(`\n#### ⚡ Modèle Critical Power / W' (Skiba — individualisé)`);
  lines.push(`- **CP (régression brute)** : ${cpRound}W${weight ? ` (${(cpRound / weight).toFixed(2)} W/kg)` : ""}`);
  if (cpBounded) {
    lines.push(`- **⚠️ CP effectif (borné par FTP)** : ${effectiveCP}W${weight ? ` (${(effectiveCP / weight).toFixed(2)} W/kg)` : ""}`);
    lines.push(`  → Le CP brut (${cpRound}W) est artificiellement gonflé (écart >${cpRound - (ftp || 0)}W avec FTP). Le CP effectif = FTP+10W est utilisé pour les prescriptions de repos.`);
  }
  if (ftp) {
    lines.push(`- **FTP (terrain)** : ${ftp}W — référence principale pour l'intensité des séances`);
    lines.push(`  → Le FTP reste la métrique de référence pour calibrer les zones d'entraînement. CP n'est utilisé que pour le modèle W'bal de repos inter-séries.`);
  }
  const wEffKJ = Math.round(wprimeEffJ / 100) / 10;
  const wprimeFloored = wprimeEffJ > wprime;
  lines.push(`- **W' (capacité anaérobie)** : ${wprimeKJ} kJ${weight ? ` (${Math.round(wprime / weight)} J/kg)` : ""}`);
  if (wprimeFloored) {
    lines.push(`- **⚠️ W' effectif (plancher physiologique)** : ${wEffKJ} kJ — Le W' mesuré (${wprimeKJ} kJ) est sous le seuil physiologique. Un plancher de 10 kJ est appliqué pour les prescriptions de repos.`);
  }
  if (wprimeCapped) {
    lines.push(`- **⚠️ W' effectif (plafond physiologique)** : ${wEffKJ} kJ — Le W' mesuré (${wprimeKJ} kJ) dépasse le plafond physiologique de 35 kJ (artefact de régression probable). Un plafond de 35 kJ est appliqué pour les prescriptions de repos.`);
  }
  lines.push(`- **Qualité du modèle** : R²=${r2} (${r2 > 0.95 ? "excellent" : r2 > 0.90 ? "bon" : "acceptable"}, ${n} points)`);
  lines.push(`- **Qualité des données** : ${!cpBounded && !wprimeFloored && !wprimeCapped ? "✅ Cohérent" : "⚠️ Bornes appliquées"}`);

  // CRITICAL: Always prioritize FTP over CP for training intensities
  lines.push(`\n#### 🎯 HIÉRARCHIE D'INTENSITÉ`);
  lines.push(`- **Zones d'entraînement** → TOUJOURS basées sur le FTP (${ftp || "n/a"}W), PAS sur le CP`);
  lines.push(`- **Repos inter-séries** → calculés via W'bal avec CP effectif (${effectiveCP}W) et W' effectif (${wEffKJ} kJ)`);
  lines.push(`- **CP brut (${cpRound}W)** → affiché uniquement pour information, JAMAIS utilisé comme cible d'intensité`);

  // W'bal recovery prescriptions — delegate to F-07 helpers (aligned with
  // src/lib/v2/criticalPowerModel.ts). calcTauEdge returns Infinity when recPow ≥ CP and
  // calcRecoveryEdge falls back to passive rest in that defensive case.
  const calcRecovery = (intPow: number, intDur: number, recPow: number) =>
    calcRecoveryEdge(effectiveCP, wprimeEffJ, intPow, intDur, recPow);

  const fmtRest = (sec: number) => sec >= 120 ? `${Math.round(sec / 60)}min` : `${sec}s`;

  // Stratégie de récupération choisie par le coach (par défaut: passive).
  // Détermine la puissance de récupération entre les répétitions, sauf pour les
  // formats qui ont une sémantique propre (over-under, 5min Z3-tempo).
  const baseRecovery = resolveRecoveryPower(recoveryStrategy, effectiveCP);
  const formats = [
    { label: "30/30 VO2max", pct: 1.20, dur: 30, recPow: baseRecovery.recPow, fixed: false },
    { label: "1min @120%", pct: 1.20, dur: 60, recPow: baseRecovery.recPow, fixed: false },
    { label: "3min @VO2max", pct: 1.15, dur: 180, recPow: baseRecovery.recPow, fixed: false },
    // 5min @105% : récup mi-active conservée pour éviter un repos > 8min sur passif strict
    { label: "5min @105%", pct: 1.05, dur: 300, recPow: Math.max(baseRecovery.recPow, Math.round(effectiveCP * 0.5)), fixed: false },
    // Over-under : la sémantique impose un "under" à 85% CP (intrinsèque au format)
    { label: "Over-under 3min", pct: 1.05, dur: 180, recPow: Math.round(effectiveCP * 0.85), fixed: true },
    { label: "Sprint 10s", pct: 2.00, dur: 10, recPow: baseRecovery.recPow, fixed: false },
  ];

  lines.push(`\n#### 🔄 Durées de Repos Optimales W'bal (Skiba 2012 — CP effectif ${effectiveCP}W, W' effectif ${wEffKJ}kJ)`);
  lines.push(`- **Stratégie de récupération inter-séries** : ${baseRecovery.label}`);
  if (recoveryStrategy !== "passive") {
    lines.push(`  → Une récupération active augmente le temps de réplétion W' : les durées de repos ci-dessous sont allongées par rapport à un repos passif.`);
  }
  lines.push(`| Format | Puissance | Récup. | Repos optimal | Reps max |`);
  lines.push(`|--------|-----------|--------|---------------|----------|`);
  for (const f of formats) {
    const pow = Math.round(effectiveCP * f.pct);
    const rec = calcRecovery(pow, f.dur, f.recPow);
    const powLabel = weight ? `${pow}W (${(pow / weight).toFixed(1)}W/kg)` : `${pow}W`;
    const recPowLabel = f.fixed ? `${f.recPow}W (fixe — over)` : f.recPow === 0 ? "0W (passif)" : `${f.recPow}W`;
    lines.push(`| ${f.label} | ${powLabel} | ${recPowLabel} | ${fmtRest(rec.rest)} | ${rec.maxReps} |`);
  }
  lines.push(`\n⚠️ UTILISE CES DURÉES DE REPOS quand tu prescris des intervalles. Elles sont calculées à partir du W' individuel de l'athlète (${wEffKJ} kJ), du CP effectif (${effectiveCP}W) et de la stratégie de récupération choisie (${baseRecovery.label}).`);
  lines.push(`- Repos trop court = W' non reconstitué → qualité dégradée dès rep 3`);
  lines.push(`- Repos trop long = stimulus insuffisant`);
  if (recoveryStrategy === "passive") {
    lines.push(`- Mode passif : prescris explicitement "récup debout/marche" ou "<50W" entre les reps.`);
  } else if (recoveryStrategy === "active-light") {
    lines.push(`- Mode actif léger : prescris explicitement "spinning Z1 ~${baseRecovery.recPow}W" entre les reps.`);
  } else {
    lines.push(`- Mode actif tempo : prescris explicitement "récup roulée ~${baseRecovery.recPow}W (haut Z2)" entre les reps — typique des séances over-under.`);
  }
  lines.push(`\n📝 OBLIGATION D'AFFICHAGE W'bal : Dans CHAQUE séance d'intervalles, mentionne explicitement dans la description :`);
  lines.push(`  1. La durée de repos prescrite ET sa justification W'bal (ex: "Repos 2min30 — calibré W'bal ${wEffKJ}kJ, récup ${baseRecovery.recPow}W")`);
  lines.push(`  2. Le nombre de répétitions max soutenable (ex: "×6 reps max avant dégradation W'")`);
  lines.push(`  3. Si le format est supra-CP, précise "effort supra-CP (${effectiveCP}W)" dans le titre ou la description`);
  lines.push(`  Cela garantit au coach la traçabilité physiologique de chaque prescription d'intervalles.`);

  return lines.join("\n");
}

export function buildUserPrompt(data: any, config: any, catalogDurationStats?: CatalogDurationStats | null): string {
  const lines: string[] = ["## Demande de Plan d'Entraînement TFCL™\n"];

  const parseIsoDateUtc = (iso?: string): number | undefined => {
    if (!iso) return undefined;
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return undefined;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return Date.UTC(y, m - 1, d);
  };

  const formatIsoDateFr = (iso?: string): string => {
    if (!iso) return "";
    const utc = parseIsoDateUtc(iso);
    if (utc === undefined) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(utc));
  };

  const computeGoalWeek = (goal: any): number | undefined => {
    // PRIORITÉ ABSOLUE: calculer depuis les dates (source de vérité)
    if (goal?.raceDate && config?.planStartDate) {
      const raceUtc = parseIsoDateUtc(goal.raceDate);
      const startUtc = parseIsoDateUtc(config.planStartDate);
      if (raceUtc !== undefined && startUtc !== undefined) {
        const days = Math.round((raceUtc - startUtc) / (24 * 3600 * 1000));
        if (days >= 0) return Math.floor(days / 7) + 1;
      }
    }

    // Fallback uniquement si aucune date exploitable
    if (typeof goal?.weeksUntilRace === "number" && Number.isFinite(goal.weeksUntilRace)) {
      return Math.max(1, Math.floor(goal.weeksUntilRace));
    }

    return undefined;
  };

  const getWeekBounds = (weekNumber?: number): { start: string; end: string } | undefined => {
    if (!weekNumber || !config?.planStartDate) return undefined;
    const startUtc = parseIsoDateUtc(config.planStartDate);
    if (startUtc === undefined) return undefined;

    const weekStartUtc = startUtc + (weekNumber - 1) * 7 * 24 * 3600 * 1000;
    const weekEndUtc = weekStartUtc + 6 * 24 * 3600 * 1000;

    const fmt = (ms: number) =>
      new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(ms));

    return { start: fmt(weekStartUtc), end: fmt(weekEndUtc) };
  };

  // --- Config ---
  lines.push("### Configuration du Plan");

  // Multi-objective support
  if (config.raceGoals && config.raceGoals.length > 0) {
    const isMulti = config.raceGoals.length > 1;
    if (isMulti) {
      lines.push("\n#### 🎯 PLANIFICATION MULTI-OBJECTIFS");
      lines.push("Ce plan couvre PLUSIEURS courses/objectifs. Tu DOIS structurer la périodisation pour TOUS les atteindre :\n");
    } else {
      lines.push("\n#### 🎯 OBJECTIF COURSE");
    }

    const sortedGoals = [...config.raceGoals].sort((a: any, b: any) => {
      if (a.raceDate && b.raceDate) return a.raceDate.localeCompare(b.raceDate);
      const prio: Record<string, number> = { A: 1, B: 2, C: 3 };
      return (prio[a.priority] || 3) - (prio[b.priority] || 3);
    });

    // F-26: Helpers — format coach-provided targetTimeMinutes + derive race pace
    const formatTargetTime = (min: number): string => {
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
    };
    const deriveRacePace = (goal: any): string | null => {
      if (!goal?.targetTimeMinutes || goal.targetTimeMinutes <= 0) return null;
      let dist: number | null = (typeof goal.distanceKm === "number" && goal.distanceKm > 0) ? goal.distanceKm : null;
      if (!dist) {
        const obj = String(goal.objective || "");
        if (/marathon/i.test(obj) && !/semi/i.test(obj)) dist = 42.195;
        else if (/semi/i.test(obj)) dist = 21.0975;
        else if (/10\s*k/i.test(obj)) dist = 10;
        else if (/5\s*k/i.test(obj)) dist = 5;
      }
      if (!dist) return null;
      const p = goal.targetTimeMinutes / dist;
      const pm = Math.floor(p);
      const ps = Math.round((p - pm) * 60);
      return `${pm}:${String(ps).padStart(2, "0")}/km`;
    };

    sortedGoals.forEach((goal: any, idx: number) => {
      const prioEmoji = goal.priority === "A" ? "🅰️ PRINCIPAL" : goal.priority === "B" ? "🅱️ INTERMÉDIAIRE" : "🆎 SECONDAIRE";
      const goalWeek = computeGoalWeek(goal);
      const bounds = getWeekBounds(goalWeek);
      const weekAnchor = goalWeek ? ` — Échéance: Semaine ${goalWeek}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}` : "";
      lines.push(`**Objectif ${idx + 1} — ${prioEmoji}** : ${goal.objective}${goal.raceName ? ` (${goal.raceName})` : ""}${goal.raceDate ? ` — Date : ${goal.raceDate}` : ""}${weekAnchor}`);
      // F-26: Coach-provided target time → derive race pace + anchor key sessions
      if (goal.targetTimeMinutes && goal.targetTimeMinutes > 0) {
        const tFmt = formatTargetTime(goal.targetTimeMinutes);
        const pace = deriveRacePace(goal);
        lines.push(`→ ⏱️ **Temps cible coach (PRIORITÉ)** : ${tFmt}${pace ? ` → allure cible **${pace}**` : ""}.`);
        lines.push(`→ Les séances spécifiques (race-pace, simulation, sortie longue progressive) DOIVENT inclure des blocs à ${pace || `l'allure cible (${tFmt})`}. Le temps statistique éventuel est SECONDAIRE.`);
      }
      if (goalWeek && goal.raceDate) {
        lines.push(`→ Ancrage absolu : la course ${goal.objective} DOIT être planifiée le ${goal.raceDate} (${formatIsoDateFr(goal.raceDate)}), dans S${goalWeek}${bounds ? ` [${bounds.start} → ${bounds.end}]` : ""}.`);
        lines.push(`→ INTERDIT de la placer une semaine avant/après (ex: ${goal.raceDate} ≠ ${goalWeek > 1 ? `S${goalWeek - 1}` : "S1"}).`);
        lines.push(`→ La DERNIÈRE semaine du plan (S${goalWeek}) DOIT être la SEMAINE DE COURSE avec : mini-taper, activation J-2/J-1, et Jour de Course le jour exact de la compétition.`);
      }
    });

    if (isMulti) {
      lines.push("\n### FORMAT OBLIGATOIRE EN SORTIE (MULTI-OBJECTIFS)");
      lines.push("Au début de la réponse, ajoute OBLIGATOIREMENT une section `## Jalons multi-objectifs` avec:");
      lines.push("- Une ligne par objectif (A, B, C) avec la semaine cible exacte (ex: `Objectif B Marathon → S5`).");
      lines.push("- Les semaines de mini-taper et récupération pour chaque objectif B/C (ex: `Mini-taper B: S4`, `Récup post-B: S6`).");
      lines.push("Si cette section est absente, la réponse est INVALIDE.");

      // Calculate inter-race gaps
      const datesGoals = sortedGoals.filter((g: any) => g.raceDate);
      if (datesGoals.length >= 2) {
        lines.push("\n**Intervalles entre courses :**");
        for (let i = 1; i < datesGoals.length; i++) {
          const d1 = new Date(datesGoals[i - 1].raceDate);
          const d2 = new Date(datesGoals[i].raceDate);
          const gapWeeks = Math.round((d2.getTime() - d1.getTime()) / (7 * 24 * 3600 * 1000));
          lines.push(`- ${datesGoals[i - 1].objective} → ${datesGoals[i].objective} : **${gapWeeks} semaines**`);
        }
      }

      lines.push("\n**⚠️ RÈGLES MULTI-OBJECTIFS :**");
      lines.push("1. **Objectif A (PRINCIPAL)** : le plan est optimisé GLOBALEMENT pour cet objectif. C'est le pic de forme principal.");
      lines.push("2. **Objectif B (INTERMÉDIAIRE)** : reçoit un mini-taper de 7-10 jours avant la course + adaptation des 1-2 semaines post-course (récupération + relance).");
      lines.push("3. L'objectif B sert de JALON et de course de préparation. Ne pas sacrifier la progression vers l'objectif A pour un pic total sur B.");
      lines.push("4. Inclure une semaine de récupération post-course B avant de relancer le bloc suivant vers l'objectif A.");
      lines.push("5. **Ne PAS créer 2 blocs indépendants.** La préparation est CONTINUE avec des ajustements autour des courses intermédiaires.");
    }
    lines.push("");
  } else {
    if (config.objective) lines.push(`- **Objectif course :** ${config.objective}`);
    if (config.raceName) lines.push(`- **Nom de la course :** ${config.raceName}`);
    if (config.raceDate) lines.push(`- **Date de course :** ${config.raceDate}`);
  }

  // Inject time target hint based on objective × ambition × sex
  const athleteSex = data?.sex || data?.sexe || null;
  const timeTarget = getTimeTargetHint(config.objective || "", config.ambition || "", athleteSex);
  if (timeTarget) {
    lines.push(`- **🎯 Temps cible estimé :** ${timeTarget}`);
    lines.push(`  → Ce temps cible sert UNIQUEMENT à guider la progression du plan (volume de travail à allure spécifique, distribution des séances clés, stratégie de course J-J).`);
    lines.push(`  → Les ZONES D'ENTRAÎNEMENT (Z1-Z7) restent 100% individualisées à partir des valeurs physiologiques de l'athlète (VMA, FTP, FCmax). Ne JAMAIS recalculer ou modifier les zones à partir du temps cible.`);
    lines.push(`  → En résumé : le temps cible = objectif de performance final. Les zones = outils d'entraînement individualisés. Les deux sont indépendants.`);
  }
  if (config.weeksAvailable) lines.push(`- **Semaines disponibles :** ${config.weeksAvailable}`);
  if (config.weeklyHours) {
    lines.push(`- **Heures dispo/semaine :** ${config.weeklyHours}h`);
  } else {
    lines.push(`- **Heures/semaine :** Non spécifié — utilise le volume OPTIMAL recommandé dans la littérature scientifique pour cet objectif × niveau d'ambition (cf. tableaux de référence TFCL ci-dessus).`);
  }
  if (config.sessionsPerWeek) {
    lines.push(`- **Séances/semaine max :** ${config.sessionsPerWeek}`);
  } else {
    lines.push(`- **Séances/semaine :** Non spécifié — utilise le nombre de séances OPTIMAL recommandé dans la littérature scientifique pour cet objectif × niveau d'ambition (cf. tableaux de référence TFCL ci-dessus).`);
  }
  if (config.strengthSessionsPerWeek !== undefined && config.strengthSessionsPerWeek !== null) {
    if (config.strengthSessionsPerWeek === 0) {
      lines.push(`- **⚠️ Renforcement musculaire : 0 séance/sem — NE PAS inclure de séance de renforcement/musculation/PPG dans le plan.**`);
    } else {
      lines.push(`- **🏋️ Renforcement musculaire : ${config.strengthSessionsPerWeek} séance(s)/sem — Inclure EXACTEMENT ${config.strengthSessionsPerWeek} séance(s) de renforcement/PPG par semaine dans le plan.**`);
    }
  }
  if (config.maxSessionsPerDay) {
    const maxLabel = config.maxSessionsPerDay === 1 ? "1 séance/jour max (PAS de doubles)" :
                     config.maxSessionsPerDay === 2 ? "2 séances/jour max (doubles autorisées, PAS de triples)" :
                     "3 séances/jour max (doubles et triples autorisées)";
    lines.push(`- **⚠️ Max séances par jour :** ${maxLabel}`);
    if (config.maxSessionsPerDay === 1) {
      lines.push(`  → RÈGLE STRICTE : 1 seule séance par jour. Aucune double séance. Chaque jour n'a qu'UNE SEULE ligne dans le tableau.`);
    } else if (config.maxSessionsPerDay === 2) {
      lines.push(`  → RÈGLE STRICTE : Maximum 2 séances par jour. Pas de triples. Chaque jour a 1 ou 2 lignes max dans le tableau.`);
    } else if (config.maxSessionsPerDay === 3) {
      // Calculate minimum sessions: 6 training days × 2 min sessions = 12, with some at 3
      const minSessions = 14;
      const maxSessions = 18;
      lines.push(`  → RÈGLE STRICTE : Doubles et triples séances OBLIGATOIRES pour un athlète élite.`);
      lines.push(`  → **MINIMUM ${minSessions} séances par semaine, idéalement ${minSessions}-${maxSessions}.**`);
      lines.push(`  → Chaque jour d'entraînement (hors repos) DOIT avoir 2 ou 3 lignes dans le tableau.`);
      lines.push(`  → Utilise "Lundi matin", "Lundi midi", "Lundi soir" pour séparer les séances.`);
      lines.push(`  → Exemple de structure semaine type avec 1 jour repos :`);
      lines.push(`    Lundi matin : Natation technique | Lundi midi : Renfo/Core | Lundi soir : Vélo Z2`);
      lines.push(`    Mardi matin : Natation seuil | Mardi soir : CAP intervalles`);
      lines.push(`    Mercredi matin : Vélo intensité | Mercredi midi : Renfo | Mercredi soir : CAP récup`);
      lines.push(`    etc.`);
      lines.push(`  → Un jour d'entraînement avec UNE SEULE séance est une ERREUR GRAVE. Ajoute au minimum natation technique, renfo/core ou Z1 récup.`);
      lines.push(`  → VÉRIFIE que le total de séances par semaine est ≥ ${minSessions} avant de soumettre.`);
    }
    // Anti-contradiction: never mix rest + real session on same day
    lines.push(`- **⚠️ Anti-contradiction :** Si un jour a une séance d'entraînement, NE PAS ajouter de ligne "Repos" pour ce même jour. Le Repos est UNIQUEMENT pour les jours sans aucune séance.`);
  }
  if (config.ambition) lines.push(`- **Niveau d'ambition :** ${config.ambition}`);

  // === CONTRAINTE EXPLICITE : RATIOS DE RÉPARTITION SPORTIVE PAR NIVEAU D'AMBITION ===
  const sportRatios = getSportDistributionConstraint((config.objective || "").toUpperCase(), (config.ambition || "").toLowerCase(), config.identifiedLimitersRaw ?? config.identifiedLimiters, catalogDurationStats);
  if (sportRatios) {
    lines.push(sportRatios);
  }

  // === PISTE 2 : CAPS DE DURÉE PROGRESSIFS (dérivés du catalogue réel) ===
  // Empêche l'IA de prescrire des séances irréalistes (ex: 4h vélo en S1 pour finisher)
  // ou trop courtes en pic (ex: 1h30 LR en S10 pour elite Ironman).
  // Les bornes viennent du catalogue TFCL™ validé — pas de chiffres arbitraires.
  if (catalogDurationStats && Object.keys(catalogDurationStats).length > 0) {
    const ambKeyDur = normalizeAmbKey(config?.ambition || "");
    // Ramp factor S1-S2 : finisher démarre plus prudemment, elite peut taper plus haut tôt
    const startFactor = ambKeyDur === "finisher" ? 0.75 : ambKeyDur === "elite" ? 0.95 : 0.85;
    const midFactor   = ambKeyDur === "finisher" ? 0.90 : 1.00;
    lines.push(`\n### ⏱️ CAPS DE DURÉE PROGRESSIFS PAR SÉANCE (dérivés du catalogue, NON-NÉGOCIABLES)`);
    lines.push(`Chaque séance individuelle DOIT respecter ces bornes selon la phase du plan.`);
    lines.push(`Objectif : éviter sur-prescription précoce (blessure) et sous-stimulation tardive (sous-performance).\n`);
    lines.push(`| Sport | S1-S2 (max/séance) | S3-mi-plan (max) | Pic/Race-Specific (max) | Médiane catalogue |`);
    lines.push(`|-------|--------------------|------------------|-------------------------|-------------------|`);
    for (const [sport, st] of Object.entries(catalogDurationStats)) {
      const start = Math.round(st.medianDur * startFactor / 5) * 5;
      const mid   = Math.round(((st.medianDur + st.maxDur) / 2) * midFactor / 5) * 5;
      const peak  = st.maxDur;
      lines.push(`| ${sport} | ${start} min | ${mid} min | ${peak} min | ${st.medianDur} min |`);
    }
    lines.push(`\n⚠️ Règles d'application :`);
    lines.push(`- **NE PAS dépasser** le cap S1-S2 sur les 2 premières semaines, même pour une séance d'endurance.`);
    lines.push(`- **NE PAS descendre sous 60% du cap pic** sur les semaines de pic/race-specific (sinon stimulus insuffisant).`);
    lines.push(`- Le **taper** (2 dernières semaines) peut redescendre librement (-30 à -50% du pic).`);
    lines.push(`- Si une séance du catalogue dépasse ces caps, tu peux la prescrire mais en tronquant à la borne (ex: "réduire à ${ambKeyDur === "finisher" ? "75%" : "85%"} pour S1").`);
  }

  if (config.constraints) lines.push(`- **Contraintes :** ${config.constraints}`);

  // === CALENDAR MAPPING: inject exact dates for each week so the AI can anchor races precisely ===
  if (config.planStartDate && config.weeksAvailable) {
    const startMs = parseIsoDateUtc(config.planStartDate);
    if (startMs !== undefined) {
      const totalW = config.weeksAvailable as number;
      lines.push(`\n### 📅 CALENDRIER ABSOLU (source de vérité pour les dates)`);
      lines.push(`Le plan commence le ${formatIsoDateFr(config.planStartDate)} (lundi). Voici le calendrier exact :\n`);
      
      // Build a lookup of race dates per week for annotation
      const racesByWeek: Record<number, string[]> = {};
      if (config.raceGoals) {
        config.raceGoals.forEach((g: any) => {
          const w = computeGoalWeek(g);
          if (w) {
            if (!racesByWeek[w]) racesByWeek[w] = [];
            racesByWeek[w].push(`${g.priority}: ${g.objective}${g.raceName ? ` (${g.raceName})` : ""} le ${g.raceDate}`);
          }
        });
      }

      for (let w = 1; w <= Math.min(totalW, 30); w++) {
        const wStartMs = startMs + (w - 1) * 7 * 86400000;
        const wEndMs = wStartMs + 6 * 86400000;
        const fmtShort = (ms: number) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(ms));
        const annotation = racesByWeek[w] ? ` ← 🏁 ${racesByWeek[w].join(", ")}` : "";
        lines.push(`- **S${w}** : du ${fmtShort(wStartMs)} au ${fmtShort(wEndMs)}${annotation}`);
      }
      
      lines.push(`\n⚠️ UTILISE CE CALENDRIER pour nommer tes semaines : "### Semaine N (du JJ/MM au JJ/MM) — [Thème]".`);
      lines.push(`⚠️ Quand une course est marquée dans ce calendrier, elle DOIT apparaître dans la semaine correspondante, PAS la semaine d'avant ni d'après.`);
    }
  }

  // --- Athlete Profile ---
  lines.push("\n### Profil Athlète");
  if (data.nom) lines.push(`- **Nom :** ${data.nom}`);

  lines.push("\n#### Moteur Aérobie");
  if (data.ftp) lines.push(`- FTP vélo : ${data.ftp}W`);
  if (data.weightKg) lines.push(`- Poids : ${data.weightKg}kg`);
  if (data.ftp && data.weightKg) lines.push(`- W/kg : ${(data.ftp / data.weightKg).toFixed(2)}`);
  if (data.vo2max) lines.push(`- VO₂max : ${data.vo2max} mL/kg/min`);
  if (data.tte) lines.push(`- TTE : ${data.tte} min`);

  lines.push("\n#### Glycolytique");
  if (data.vlamax) lines.push(`- VLamax vélo : ${data.vlamax} mmol/L/s`);
  if (data.vlamaxRun) lines.push(`- VLamax course : ${data.vlamaxRun} mmol/L/s`);

  // ✅ AUDIT FIX : injection dynamique de la cible VLamax (objectif × ambition × sport)
  const sportForVlamax = (data.sport_main || data.sportMain || (config?.objective?.startsWith?.("Marathon") || config?.objective?.startsWith?.("Semi") || config?.objective === "Trail" ? "run" : null)) ?? null;
  const vlmRange = getVLamaxRangeForPlan(config?.objective, config?.ambition, sportForVlamax);
  const vlmCurrent = data.vlamaxRun ?? data.vlamax;
  const vlmStatus = vlmCurrent == null
    ? "non renseignée"
    : vlmCurrent < vlmRange.min
      ? `🔻 SOUS la cible (${(vlmRange.min - vlmCurrent).toFixed(2)} en dessous) → travail de capacité glycolytique requis`
      : vlmCurrent > vlmRange.max
        ? `🔺 AU-DESSUS de la cible (+${(vlmCurrent - vlmRange.max).toFixed(2)}) → priorité VLamax↓ (Z2 long, Train Low, SFR, seuil long continu)`
        : `✅ DANS la cible`;
  lines.push(`- 🎯 **Cible VLamax pour ${config?.objective || "?"} (${config?.ambition || "age_group"}${sportForVlamax ? `, ${sportForVlamax}` : ""}) :** min ${vlmRange.min.toFixed(2)} / optimal ${vlmRange.optimal.toFixed(2)} / max ${vlmRange.max.toFixed(2)} mmol/L/s`);
  lines.push(`- État actuel : ${vlmStatus}`);
  lines.push(`- ⚠️ RÈGLE : N'utilise QUE cette fenêtre cible pour juger « VLamax trop haute / trop basse ». Ignore toute valeur générique du prompt système.`);

  lines.push("\n#### Neuromusculaire");
  if (data.pmax5s) lines.push(`- Pmax 5s : ${data.pmax5s}W`);
  if (data.p30s) lines.push(`- P30s : ${data.p30s}W`);
  if (data.p60s) lines.push(`- P60s : ${data.p60s}W`);
  if (data.map5min) lines.push(`- MAP 5min : ${data.map5min}W`);

  // === CRITICAL POWER / W' MODEL (Skiba 2012 — individualisé) ===
  const recoveryStrategy: RecoveryStrategy = (config?.recoveryStrategy === "active-light" || config?.recoveryStrategy === "active-tempo")
    ? config.recoveryStrategy
    : "passive";
  const cpwSection = buildCPWprimeSection(data, recoveryStrategy);
  if (cpwSection) lines.push(cpwSection);

  lines.push("\n#### Autres Métriques");
  if (data.vma) lines.push(`- VMA : ${data.vma} km/h`);
  if (data.css) lines.push(`- CSS natation : ${data.css} sec/100m`);
  if (data.fcMax) lines.push(`- FC Max : ${data.fcMax} bpm`);

  // --- Computed training zones & pace anchors (TFCL Z1→Z7 methodology) ---
  const formatPace = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.round(totalSec % 60);
    return `${m}'${s.toString().padStart(2, "0")}"`;
  };

  // Build TFCL Z1→Z7 zones table with actual values
  const vmaKmh = data.vma ? Number(data.vma) : null;
  const ftpW = data.ftp ? Number(data.ftp) : null;
  const fcMaxBpm = data.fcMax ? Number(data.fcMax) : null;

  lines.push(`\n#### ⚠️ GRILLE ZONES D'ENTRAÎNEMENT TFCL™ Z1→Z7 (RÉFÉRENCE OBLIGATOIRE)`);
  lines.push(`Ces zones sont les leviers physiologiques utilisés par le coach. Tu DOIS prescrire les séances en utilisant UNIQUEMENT ces zones.`);
  lines.push(`Les valeurs ci-dessous sont calculées à partir du profil de l'athlète. NE PAS inventer d'autres valeurs.\n`);

  // Zone definitions: [name, description, fcLow, fcHigh, vmaLow, vmaHigh, ftpLow, ftpHigh]
  const zones: [string, string, number, number, number, number, number, number][] = [
    ["Z1 Récupération", "Récupération, affûtage, échauffement, lactate de base", 0, 70, 0, 60, 0, 55],
    ["Z2 Endurance Fondamentale", "Lipolyse, volume mitochondrial, base aérobie", 70, 78, 60, 70, 56, 75],
    ["Z3 Endurance Active", "Base aérobie solide, force si basse cadence", 78, 83, 70, 78, 76, 90],
    ["Z4a Allure Marathon / Sweet Spot", "Économie de course, durabilité, spécifique long", 83, 87, 78, 83, 88, 93],
    ["Z4b Allure Semi", "Tolérance à l'inconfort, mental, spécifique moyen", 87, 91, 83, 88, 94, 98],
    ["Z5 Seuil (MLSS)", "Repousser le seuil anaérobie, MLSS", 91, 94, 88, 92, 99, 105],
    ["Z6 VO2max / VMA", "VO2max, cylindrée cardiaque", 95, 100, 95, 105, 106, 120],
    ["Z7 Neuromusculaire / Anaérobie Alactique", "Explosivité, force max, vitesse pure", 0, 0, 120, 200, 150, 300],
  ];

  lines.push(`| Zone | Description | FC | VMA | FTP | Allure CAP |`);
  lines.push(`|------|-------------|----|----|-----|------------|`);
  for (const [name, desc, fcL, fcH, vmaL, vmaH, ftpL, ftpH] of zones) {
    const fcStr = fcMaxBpm
      ? (fcL === 0 && name.includes("Z1") ? `0-${Math.round(fcMaxBpm * fcH / 100)}` :
         fcL === 0 && name.includes("Z7") ? "N/A" :
         `${Math.round(fcMaxBpm * fcL / 100)}-${Math.round(fcMaxBpm * fcH / 100)}`)
      : `${fcL}-${fcH}%`;
    const vmaStr = `${vmaL}-${vmaH}%`;
    const ftpStr = ftpW
      ? `${Math.round(ftpW * ftpL / 100)}-${Math.round(ftpW * ftpH / 100)}W`
      : `${ftpL}-${ftpH}%`;
    // Compute pace range for running if VMA available
    let paceStr = "—";
    if (vmaKmh && vmaKmh > 0 && vmaL > 0 && vmaH <= 200) {
      const paceHigh = 3600 / (vmaKmh * vmaL / 100); // slower (low % VMA)
      const paceLow = 3600 / (vmaKmh * vmaH / 100);  // faster (high % VMA)
      paceStr = `${formatPace(paceLow)}-${formatPace(paceHigh)}/km`;
    }
    lines.push(`| ${name} | ${desc} | ${fcStr} | ${vmaStr} | ${ftpStr} | ${paceStr} |`);
  }

  // Explicit pace hierarchy rule
  if (vmaKmh && vmaKmh > 0) {
    const seuilPace = 3600 / (vmaKmh * 0.90); // Z5 low bound
    lines.push(`\n**Allures spécifiques calculées :**`);
    lines.push(`- Allure EF/Z2 : ${formatPace(3600 / (vmaKmh * 0.65))}-${formatPace(3600 / (vmaKmh * 0.70))}/km`);
    lines.push(`- Allure Marathon (Z4a) : ${formatPace(3600 / (vmaKmh * 0.83))}-${formatPace(3600 / (vmaKmh * 0.78))}/km`);
    lines.push(`- Allure Semi (Z4b) : ${formatPace(3600 / (vmaKmh * 0.88))}-${formatPace(3600 / (vmaKmh * 0.83))}/km`);
    lines.push(`- Allure Seuil (Z5) : ${formatPace(3600 / (vmaKmh * 0.92))}-${formatPace(3600 / (vmaKmh * 0.88))}/km`);
    lines.push(`- Allure VMA (Z6) : ${formatPace(3600 / (vmaKmh * 1.05))}-${formatPace(3600 / (vmaKmh * 0.95))}/km`);

    // ── ANCRAGE SEUIL RUN INDIVIDUALISÉ (TFCL™ Modèle C, RMSE 2.64%) ───────
    // Si pace_threshold observé OU prédit via VLamax run + CE → ancrer Z5 sur cette valeur
    const mlssPct = data.runMLSSEffectivePct ? Number(data.runMLSSEffectivePct) : null;
    const mlssSource = data.runMLSSEffectiveSource as string | null;
    const observedPaceSec = data.paceThresholdSecPerKm ? Number(data.paceThresholdSecPerKm) : null;
    if (observedPaceSec && observedPaceSec > 0) {
      lines.push(`\n🎯 **Allure seuil INDIVIDUALISÉE (test de terrain observé)** : ${formatPace(observedPaceSec)}/km`);
      lines.push(`→ Cette valeur PRIME sur la fourchette Z5 générique ci-dessus. Ancrer toutes les séances de seuil long / Norvégienne / MLSS sur cette allure (±5 sec/km).`);
    } else if (mlssPct && mlssPct > 0 && mlssSource === "predicted") {
      const predictedSpeedKmh = vmaKmh * mlssPct / 100;
      const predictedPaceSec = 3600 / predictedSpeedKmh;
      lines.push(`\n🧪 **Allure seuil ESTIMÉE (Modèle C — VLamax run + Économie, RMSE ±2.64%)** : ${formatPace(predictedPaceSec)}/km (≈ ${mlssPct.toFixed(1)}% VMA)`);
      lines.push(`→ Pas de test de seuil disponible : utilise cette estimation comme point d'ancrage Z5. À confirmer par un test 30min ou MLSS de terrain.`);
    }

    lines.push(`\n🚨 HIÉRARCHIE INVIOLABLE (du plus lent au plus rapide) : Z2 > Z4a Marathon > Z4b Semi > Z5 Seuil > Z6 VMA`);
    lines.push(`Si une allure spécifique course est plus rapide que le seuil (Z5), c'est une ERREUR. Allure semi TOUJOURS plus lente que seuil.`);
  }

  // --- Identified weaknesses (ranked by importance) ---
  if (config.identifiedLimiters && config.identifiedLimiters.length > 0) {
    lines.push("\n### 🔴 LIMITEURS IDENTIFIÉS PAR L'APP — CLASSÉS PAR IMPORTANCE — SÉANCES CLÉS OBLIGATOIRES");
    lines.push("Les limiteurs ci-dessous sont calculés et classés par le diagnostic TFCL™ (impact pondéré = importance × gap vs cible).");
    lines.push("Le plan DOIT adresser CHAQUE limiteur, du plus critique au moins critique, avec une périodisation séquentielle.");
    lines.push("");
    config.identifiedLimiters.forEach((l: string) => lines.push(l));

    // ====== ENHANCED: Detailed limiter-to-session matrix per phase ======
    lines.push("\n### 📋 MATRICE SÉANCE CLÉ × LIMITEUR × PHASE (Dan Lorang / TFCL™)");
    lines.push("Utilise cette matrice pour sélectionner les séances clés EXACTES selon le limiteur identifié et la phase de préparation.\n");

    lines.push("| Limiteur | Phase Base (4-6 sem) | Phase Build (4-6 sem) | Phase Spécifique (3-4 sem) | Phase Taper (1-2 sem) |");
    lines.push("|----------|---------------------|----------------------|---------------------------|----------------------|");
    lines.push("| VO2max bas | Billat 30/30 (2×8min), 3×3min @VMA | 5×1200m @100% VMA r=3min, VMA longue 4×4min | VMA courte (200-400m) + rappels race pace | 2×(4×200m) @VMA rappel, volume -60% |");
    lines.push("| VLamax trop haute | Z2 long 2h-2h30 Train Low, EF fondamentale 90min+, SFR 3×8min @50rpm | Z2 long 2h30-3h à jeun, EF aérobie pur 2h+, Seuil continu long 2×20min (synergie TTE↑→VLamax↓), SFR force basse cadence 40-50rpm | Simulation course Z2-Z3 progressive, Train Low maintien, Seuil long 1×30min rappel | Z2 60-90min, 1 rappel EF long |");
    lines.push("| TTE faible (<45min) | Seuil continu 2×15min @Z5, Norvégienne simple | Seuil 2×20min→1×30min, Double seuil Norvégienne 2x/sem | Seuil long 1×35-40min, Race pace intégré | 1×20min seuil rappel, volume -50% |");
    lines.push("| FTP/kg bas | Sweet spot 3×12min @88-93% FTP, Z3 tempo 45min | Sweet spot 2×20min, over-unders 6×(3min@105%+2min@85%), Norvégienne vélo | FTP test simulation, race power practice | 1×15min sweet spot rappel |");
    lines.push("| Économie basse | Côtes 8×30s, SFR 3×8min @50rpm, Rønnestad force 2x/sem | Côtes longues 6×2min, pliométrie 80 contacts, force maintien 1x/sem | Rappels côtes courtes, strides post-EF | Strides 6×100m, 1 séance force légère |");
    lines.push("| FatMax bas | Train Low Z2 2h à jeun, Z1 longue 1h30 | Z2 longue 2h30-3h Train Low 2-3x/sem, Gut Training progressif | Simulation nutrition course, Z2 Train Low maintien | Z2 1h à jeun, rappel nutrition |");
    lines.push("| Pmax/Sprint faible | Sprints 6×10s all-out r=3min, force max Rønnestad | Sprints 8×15s, pliométrie drop jumps + bounds, SFR | Rappels 4×8s, maintien plio 1x/sem | 3×6s rappel neuromusculaire |");
    lines.push("| Endurance durabilité | Sorties longues progressives (+10-15min/sem), Z2 2h+ | SL avec finish rapide 25km (derniers 8km @Z4a), briques | Simulation course complète, SL race pace finish | SL courte 60-70min Z2 |");

    lines.push("\n### 🔄 SYNERGIES ENTRE LIMITEURS (Exploiter les interactions positives)");
    lines.push("| Action principale | Effets secondaires positifs |");
    lines.push("|-------------------|---------------------------|");
    lines.push("| VLamax↓ (Z2 long + Train Low) | → TTE↑, FatMax↑, économie glycogène↑ |");
    lines.push("| VO2max↑ (Billat/VMA) | → FTP/kg↑, vitesse aérobie↑, récupération inter-effort↑ |");
    lines.push("| TTE↑ (seuil long continu) | → VLamax↓ (synergie : déplétion glycolytique via effort soutenu au seuil), allure course↑, résistance fatigue↑ |");
    lines.push("| SFR / Force basse cadence (40-60rpm) | → VLamax↓ (synergie : recrutement fibres Type I, réduction contribution glycolytique rapide), économie↑ (+4.8%) |");
    lines.push("| Force max (Rønnestad) | → économie↑, prévention blessures, puissance neuromusculaire↑ |");
    lines.push("| FatMax↑ (Train Low) | → VLamax↓ (synergie), autonomie glycogène↑, durabilité↑ |");
    lines.push("⚠️ IMPORTANT : Le seuil long continu et la force basse cadence (SFR) sont des CO-CONTRIBUTEURS prouvés à la réduction de la VLamax. Quand L1=VLamax, prescris ces séances EN PLUS du Z2 long/Train Low pour maximiser la suppression glycolytique.\n");

    lines.push("### ⚙️ RÈGLES DE PÉRIODISATION SÉQUENTIELLE STRICTES");
    lines.push("1. **Limiteur #1 (🔴 CRITIQUE)** :");
    lines.push("   - Reçoit la Séance Clé #1 de CHAQUE semaine de la Phase Base à la fin de la Phase Build.");
    lines.push("   - Fréquence : 2-3 stimuli/sem en Base, 2 stimuli/sem en Build, 1-2 rappels en Spécifique.");
    lines.push("   - Le volume/intensité de ce stimulus suit la colonne correspondante dans la matrice ci-dessus.");
    lines.push("2. **Limiteur #2 (🔴 ou 🟡)** :");
    lines.push("   - Reçoit la Séance Clé #2 dès la Phase Base (1-2x/sem), montée en importance en Build (2x/sem).");
    lines.push("   - Si #2 est synergique avec #1, combiner dans certaines séances (ex: Z2 long Train Low travaille VLamax↓ ET FatMax↑).");
    lines.push("3. **Limiteurs #3+ (🟡 SOUS-OPTIMAUX)** :");
    lines.push("   - Intégrés comme composantes secondaires : ex. strides post-EF (économie), rappels force 1x/sem (maintien Rønnestad).");
    lines.push("   - Montée en priorité en Phase Spécifique si les limiteurs #1 et #2 ont suffisamment progressé.");
    lines.push("4. **Principe de non-régression** :");
    lines.push("   - Quand on passe au limiteur suivant, maintenir les acquis du limiteur précédent avec 1 rappel/sem minimum.");
    lines.push("   - Jamais d'abandon complet d'un travail spécifique après une phase.");
    lines.push("5. **Phase Taper** :");
    lines.push("   - Rappels courts de CHAQUE limiteur travaillé (volume -50 à -60%, intensité maintenue).");
    lines.push("   - 1 séance rappel par limiteur adressé dans la dernière semaine pré-course.");

    lines.push("\n⚠️ RÈGLE SÉANCES CLÉS PAR LIMITEUR (RÉSUMÉ RAPIDE) :");
    lines.push("- Limiteur #1 = 'VO2max bas' → clé #1 = VMA/VO2max (Billat 30/30, 5×1200m).");
    lines.push("- Limiteur #1 = 'VLamax trop haute' → clé #1 = Z2 long Train Low, clé #2 = Sweet Spot long basse cadence (2×20-30min @88-92% FTP, 55-65 RPM), clé #3 = SFR/force basse cadence + seuil long continu.");
    lines.push("- Limiteur #1 = 'TTE faible' → clé #1 = seuil continu long (Norvégienne 2×20min→1×40min).");
    lines.push("- Limiteur #1 = 'Économie basse' → clé #1 = côtes/SFR + force max (Rønnestad).");
    lines.push("- Limiteur #1 = 'FatMax bas' → clé #1 = Z2 longue à jeun Train Low (2h30+).");
    lines.push("- Limiteur #1 = 'FTP/kg bas' → clé #1 = sweet spot + over-unders + Norvégienne vélo.");
    lines.push("- Le Limiteur #2 reçoit la séance clé #2 avec la même logique.");
    lines.push("- En Phase Spécifique, les séances clés deviennent race-specific tout en maintenant le travail sur les limiteurs principaux.");
  }

  if (config.activeLevers && config.activeLevers.length > 0) {
    lines.push("\n### Leviers TFCL™ Actifs");
    config.activeLevers.forEach((l: string) => lines.push(`- ⚡ ${l}`));
    lines.push("Les leviers actifs doivent être intégrés dans les séances clés 🔑 et les consignes coach.");
  }

  // --- Prohibitions (Sprint Ban, VO2max restrictions, etc.) ---
  if (config.prohibitions && config.prohibitions.length > 0) {
    lines.push("\n### 🚨 INTERDICTIONS / AUTORISATIONS SPÉCIFIQUES À CET ATHLÈTE — PRIORITÉ ABSOLUE");
    lines.push("⚠️ Ces règles sont calculées par le moteur TFCL™ en fonction de l'objectif, l'ambition et le profil métabolique.");
    lines.push("Tu DOIS les respecter IMPÉRATIVEMENT. Elles PRIMENT sur les recommandations générales de périodisation.");
    lines.push("Toute séance qui viole ces interdictions sera rejetée par le moteur de validation.");
    config.prohibitions.forEach((p: string) => lines.push(`- ${p}`));
  }

  // --- Adaptation Predictor Projections ---
  if (config.adaptationProjections && config.adaptationProjections.length > 0) {
    lines.push("\n### 🔮 PROJECTIONS ADAPTATION PREDICTOR™ (Impact attendu du bloc d'entraînement)");
    lines.push("Le module Adaptation Predictor™ a simulé l'impact physiologique attendu. Le plan DOIT s'aligner sur ces projections.");
    lines.push("");

    for (const proj of config.adaptationProjections) {
      const isBest = config.adaptationProjections.indexOf(proj) === 0;
      const tag = isBest ? "⭐ STRATÉGIE RECOMMANDÉE" : "Alternative";
      lines.push(`#### ${tag} : ${proj.leverLabel} (Score impact: ${proj.impactScore}/100 — ${proj.impactLabel})`);
      
      if (proj.metrics && proj.metrics.length > 0) {
        lines.push("Adaptations physiologiques attendues (bloc 4-6 semaines) :");
        for (const m of proj.metrics) {
          const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
          const sign = m.deltaPct > 0 ? "+" : "";
          lines.push(`  - ${m.label}: ${m.current?.toFixed(2) ?? "?"} → ${m.projected?.toFixed(2) ?? "?"} (${sign}${m.deltaPct.toFixed(1)}% ${arrow})`);
        }
      }

      if (proj.performanceImpacts && proj.performanceImpacts.length > 0) {
        const impacts = proj.performanceImpacts
          .filter((p: any) => Math.abs(p.improvementPct) > 0.1)
          .map((p: any) => `${p.distance}: ${p.improvementPct > 0 ? "+" : ""}${p.improvementPct.toFixed(1)}%`)
          .join(", ");
        if (impacts) {
          lines.push(`  Impact performance estimé : ${impacts}`);
        }
      }

      lines.push(`  💡 ${proj.recommendation}`);
      lines.push("");
    }

    lines.push("CONSIGNE : Le plan doit PRIORITAIREMENT appliquer la stratégie recommandée (⭐). Les séances clés doivent refléter les adaptations projetées.");
    lines.push("Mentionne dans le récapitulatif stratégique les projections attendues du Predictor™.");
  }

  // Sport coherence reminder based on objective
  // FIX: Use normalizeObjKey for reliable matching (was using strict === on uppercase string,
  // which NEVER matched objectives like "Ironman", "Ironman 70.3", "Semi-marathon", etc.)
  const objKeyForRappel = normalizeObjKey(config.objective || "");
  if (objKeyForRappel === "IM") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE IRONMAN");
    lines.push("Objectif IRONMAN → applique les ratios Lorang/Frodeno :");
    lines.push("- Vélo 45-55% | CAP 25-35% | Natation 15-20% | Renfo 5-10%");
    lines.push("- Min 3 natation/sem (technique + CSS + OWS), 4 vélo/sem, 3 CAP/sem");
    lines.push("- Briques vélo→CAP 1-2x/sem en phase spécifique");
    lines.push("- Train Low 2-3x/sem en phase base");
    lines.push("- Gut Training progressif obligatoire");
  } else if (objKeyForRappel === "703") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE 70.3");
    lines.push("Objectif 70.3 → applique les ratios Lorang/Haug :");
    lines.push("- Vélo 40-50% | CAP 30-40% | Natation 15-20% | Renfo 5-10%");
    lines.push("- Min 3 natation/sem, 3 vélo/sem, 3 CAP/sem");
    lines.push("- Plus d'intensité seuil/tempo qu'en IM");
  } else if (objKeyForRappel === "Marathon") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE MARATHON");
    lines.push("- CAP 85-90% | Renfo 10-15%");
    lines.push("- 2 séances qualité/sem + 1 sortie longue progressive");
    lines.push("- Minimum 5 séances CAP/sem : EF, tempo, seuil, SL, fartlek/côtes");
    lines.push("- Vélo optionnel : max 1-2x/sem, 45-60min Z1-Z2 uniquement (récupération active, cross-training)");
  } else if (objKeyForRappel === "Semi") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE SEMI-MARATHON");
    lines.push("- CAP 85-90% | Renfo 10-15%");
    lines.push("- Accent VMA + seuil. Minimum 4-5 séances CAP/sem.");
    lines.push("- Séances types : EF Z2, Tempo allure semi, VMA 30/30, Seuil 2×20min, SL 15-20km, Fartlek, Côtes");
    lines.push("- Vélo optionnel : max 1-2x/sem, 45-60min Z1-Z2 uniquement");
  } else if (objKeyForRappel === "TrailUltra") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL ULTRA (>80km)");
    lines.push("- CAP/Trail 65-75% | Renfo 15-20% | Vélo cross-training Z1 5-10%");
    lines.push("- D+ progressif : base 1500m/sem → build 4000m/sem → peak 5000-6000m/sem");
    lines.push("- Back-to-back weekends OBLIGATOIRES en Build/Peak");
    lines.push("- Simulation ultra 6-8h : 1x/mois en Build, 1x en Peak");
    lines.push("- Simulation nuit OBLIGATOIRE : 2-3 sorties nocturnes");
    lines.push("- Force excentrique lourde 2x/sem + proprioception avancée");
    lines.push("- Gut Training progressif 40→90g/h testé en simulation");
    lines.push("- Bâtons : entraînement spécifique si utilisés en course");
    lines.push("- Taper ultra = 14-21j (plus long que route)");
  } else if (objKeyForRappel === "TrailMountain") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL MONTAGNE (42-80km)");
    lines.push("- CAP/Trail 70-80% | Renfo 15-20% | Vélo cross-training Z1 5-10%");
    lines.push("- D+ progressif : base 1000m/sem → build 3000m/sem → peak 4000m/sem");
    lines.push("- Back-to-back weekends en Build/Peak (SL samedi + SL dimanche)");
    lines.push("- Seuil montée long 2x/sem. Descente technique 1x/sem");
    lines.push("- Force excentrique lourd 2x/sem + proprioception");
    lines.push("- Simulation nuit : 1-2 sorties en Peak");
    lines.push("- Gut Training progressif 40→70g/h");
  } else if (["Trail", "TrailShort"].includes(objKeyForRappel)) {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL COURT (<42km)");
    lines.push("- CAP/Trail 70-80% | Renfo 20-25% | Vélo Z1 optionnel 0-5%");
    lines.push("- D+ progressif : base 500m/sem → build 1500m/sem → peak 2000m/sem");
    lines.push("- VMA côtes 2x/sem + seuil montée 1x/sem + descente technique 1x/sem");
    lines.push("- Force excentrique prioritaire (prévention quadriceps)");
    lines.push("- Proprioception obligatoire (Bosu, single leg, terrain instable)");
    lines.push("- Séances TOUJOURS en terrain trail/sentier, jamais route");
  } else if (["10K", "5K"].includes(objKeyForRappel)) {
    lines.push(`\n### ⚠️ RAPPEL COHÉRENCE ${objKeyForRappel}`);
    lines.push("- CAP 85-90% | Renfo 10-15%");
    lines.push("- 1 seuil/tempo + 1 VMA + 1 sortie longue/sem + EF Z2");
    lines.push("- Vélo optionnel : max 1x/sem, 45min Z1-Z2 uniquement");
  } else if (objKeyForRappel === "StartToRun") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE START TO RUN (DÉBUTANT)");
    lines.push("- PROGRAMME DÉBUTANT : alternance marche/course progressive.");
    lines.push("- Sem 1-4 : 70% marche / 30% course. Sem 5-8 : 50/50. Sem 9-12 : 70% course.");
    lines.push("- JAMAIS 2 jours consécutifs de course les premières semaines.");
    lines.push("- Renfo/mobilité = 25-40% du volume (prévention blessures prioritaire).");
    lines.push("- Max 3-4 séances/sem. Repos = progression.");
    lines.push("- Allure : conversationnelle. Cadence : 170-180 spm.");
    lines.push("- Pas de fractionné tant que l'athlète ne court pas 30min continu.");
  }

  // Multi-objective: also emit sport coherence for B/C goals
  if (config.raceGoals && config.raceGoals.length > 1) {
    const otherGoals = config.raceGoals.filter((g: any) => g.priority !== "A");
    for (const goal of otherGoals) {
      const goalObjKey = normalizeObjKey(goal.objective || "");
      const goalName = goal.raceName ? ` (${goal.raceName})` : "";
      if (["Marathon", "Semi"].includes(goalObjKey)) {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Les semaines précédant cette course B doivent inclure des séances spécifiques à l'allure ${goal.objective}.`);
        lines.push(`- Mini-taper 7-10j avant : réduction volume, rappels allure course.`);
        lines.push(`- Post-course : 1 semaine récupération avant relance vers objectif A.`);
      } else if (["IM", "703"].includes(goalObjKey)) {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Intégrer natation + vélo + briques dans la préparation vers cette course B.`);
        lines.push(`- Mini-taper 10-14j avant. Simulation race-pace 2 semaines avant la course B.`);
        lines.push(`- Post-course B : 1-2 semaines récupération avant relance.`);
      } else {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Inclure des séances spécifiques à cet objectif dans les semaines précédant la date de course.`);
        lines.push(`- Mini-taper 7j avant + récupération post-course.`);
      }
    }
  }

  // Double sessions reminder based on ambition
  const ambition = (config.ambition || "").toLowerCase();
  const objKeyForTriCheck = normalizeObjKey(config.objective || "");
  const isTriathlon = ["IM", "703"].includes(objKeyForTriCheck);
  if (isTriathlon) {
    lines.push("\n### 🔥🔥🔥 DOUBLES/TRIPLES SÉANCES — RÈGLE #1 LA PLUS IMPORTANTE 🔥🔥🔥");
    lines.push("Un plan triathlon IM/70.3 n'est PAS un plan de course à pied. Un triathlète s'entraîne PLUSIEURS FOIS PAR JOUR.");
    lines.push("⛔ Un jour avec 1 seule séance (hors repos) est une ERREUR GRAVE pour World Class/Elite/Competitor.");
    lines.push("");
    if (ambition === "world_class" || ambition === "worldclass" || ambition === "world-class") {
      lines.push("Ambition WORLD CLASS (top 3% AG) → minimum 18-22 séances/semaine, 12-16 doubles et 2-4 triples par semaine.");
      lines.push("- CHAQUE jour (sauf 1 jour repos absolu) DOIT avoir 2 ou 3 séances.");
      lines.push("- Référence directe : semaine-type Frodeno/Blummenfelt en pic de prépa Kona/Mondial.");
      lines.push("- Volume cible : 26-34h/sem. Nat 5-6 séances, Vélo 5-6, CAP 4-5, Renfo 2-3.");
      lines.push("- Triples obligatoires 3-4 fois/sem : Nat matin + Vélo midi + CAP soir.");
      lines.push("- Inclure 1-2 micro-cycles 'choc' (3 jours doubles + 1 jour triple).");
    } else if (ambition === "elite") {
      lines.push("Ambition ELITE (top 10% AG) → minimum 14-16 séances/semaine, 10-14 doubles ou triples.");
      lines.push("- Chaque jour (sauf repos) DOIT avoir 2 ou 3 séances séparées.");
      lines.push("- Utilise la semaine-type Frodeno/Blummenfelt comme référence directe.");
      lines.push("- Volume cible : 22-30h/sem. Nat 4-5 séances, Vélo 4-5, CAP 3-4, Renfo 2-3.");
      lines.push("- Exemples de TRIPLES : Nat matin + Vélo midi + CAP soir. Nat matin + Vélo midi + Renfo soir.");
    } else if (ambition === "competitor") {
      lines.push("Ambition COMPETITOR → minimum 10-12 séances/semaine, 5-8 doubles.");
      lines.push("- Au moins 5 jours avec doubles séances.");
      lines.push("- Volume cible : 15-22h/sem. Nat 3-4 séances, Vélo 3-4, CAP 3-4, Renfo 2.");
    } else if (ambition === "age_group" || ambition === "agegroup") {
      lines.push("Ambition AGE GROUP → 8-10 séances/semaine, 2-4 doubles.");
      lines.push("- 2-3 jours avec doubles séances (nat matin + renfo soir, brique).");
      lines.push("- Volume cible : 10-15h/sem.");
    } else {
      lines.push("Ambition FINISHER → 5-7 séances/semaine, pas de doubles.");
      lines.push("- 1 séance/jour max. Focus terminer en sécurité.");
    }
    lines.push("- Format : UNE LIGNE PAR SÉANCE dans le tableau. 'Mardi matin', 'Mardi midi', 'Mardi soir' = 3 lignes séparées.");
    lines.push("- JAMAIS 2 intensités le même jour sauf brique planifiée.");
    lines.push("- Le tableau d'une semaine Elite/World Class IM doit avoir 14-20 lignes (pas 7 !).");
  }

  const weeks = config.weeksAvailable || 12;

  // Multi-objective final reminder
  if (config.raceGoals && config.raceGoals.length > 1) {
    const sortedGoals = [...config.raceGoals].sort((a: any, b: any) => {
      if (a.raceDate && b.raceDate) return a.raceDate.localeCompare(b.raceDate);
      return 0;
    });
    const goalA = sortedGoals.find((g: any) => g.priority === "A");
    const goalsB = sortedGoals.filter((g: any) => g.priority === "B" || g.priority === "C");

    lines.push(`\n---`);
    lines.push(`## 🔥🔥🔥 RAPPEL FINAL MULTI-OBJECTIFS — RÈGLE ABSOLUE 🔥🔥🔥`);
    lines.push(`Ce plan a ${config.raceGoals.length} objectifs de course. Tu DOIS TOUS les intégrer dans la planification :\n`);
    
    sortedGoals.forEach((goal: any) => {
      const prioLabel = goal.priority === "A" ? "🅰️ OBJECTIF PRINCIPAL (pic de forme)" : goal.priority === "B" ? "🅱️ OBJECTIF INTERMÉDIAIRE (mini-taper)" : "🆎 SECONDAIRE";
      const goalWeek = computeGoalWeek(goal);
      const bounds = getWeekBounds(goalWeek);
      const weekInfo = goalWeek ? ` — Semaine cible: S${goalWeek}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}` : "";
      lines.push(`- **${goal.objective}**${goal.raceName ? ` — ${goal.raceName}` : ""}${goal.raceDate ? ` — ${goal.raceDate}` : ""}${weekInfo} → ${prioLabel}`);
      if (goal.raceDate) {
        lines.push(`  ↳ Date absolue obligatoire: ${goal.raceDate} (${formatIsoDateFr(goal.raceDate)}).`);
      }
    });

    if (goalsB.length > 0) {
      lines.push(`\n### Structure obligatoire pour chaque objectif B/C :`);
      goalsB.forEach((g: any) => {
        const w = computeGoalWeek(g);
        const bounds = getWeekBounds(w);
        if (w) {
          lines.push(`- **${g.objective}${g.raceName ? ` (${g.raceName})` : ""}** : mini-taper en S${Math.max(1, w - 1)}, course en S${w}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}, récupération en S${w + 1}. Date course IMPÉRATIVE: ${g.raceDate || "n/a"}.`);
        }
      });
      lines.push(`1. **Semaines pré-course B** : les 1-2 semaines avant la course B doivent montrer une RÉDUCTION de volume (-20 à -30%) avec maintien d'intensité courte (mini-taper). Marque-les explicitement "Mini-Taper pour [nom course B]".`);
      lines.push(`2. **Semaine de course B** : la semaine contenant la course B doit inclure la course comme séance principale (ex: "🏁 COURSE : Marathon de Paris"). Volume très réduit le reste de la semaine.`);
      lines.push(`3. **Semaine post-course B** : semaine de récupération (-40% volume, pas d'intensité, régénération). Marque-la "Récupération post-${goalsB[0]?.objective || 'course B'}".`);
      lines.push(`4. **Relance vers objectif A** : après la récupération, reprendre la progression vers l'objectif A avec une montée en charge progressive.`);
      lines.push(`\n⚠️ Si tu génères le plan sans mentionner l'objectif B ni inclure de mini-taper/récupération autour de sa date, le plan est INVALIDE. RECOMMENCE.`);
    }

    if (goalA) {
      lines.push(`\nObjectif principal (A) : ${goalA.objective}${goalA.raceDate ? ` le ${goalA.raceDate}` : ""}. Le pic de forme PRINCIPAL vise cette course.`);
    }
  }

  lines.push(`\n---\nGénère le plan COMPLET de ${weeks} semaines, semaine par semaine, SANS EN OMETTRE AUCUNE. Chaque semaine a son propre tableau. Ne résume jamais. Chaque séance doit être actionnable immédiatement.`);

  return lines.join("\n");
}
