import type {
  CanonicalSport, CatalogEvidence, ControlCoverage, DisciplineSummary,
  NormalizedPlan, NormalizedSession, PlanFinding, ReferenceScenario,
  SportsPlanQaReport, WeeklySummary,
} from "./types";

const CARDIO: CanonicalSport[] = ["swim", "bike", "run"];
const DELOAD_RX = /\b(recup(?:eration)?|recovery|deload|decharge|assimilation|allegee?)\b/i;
const RACE_RX = /\b(course|competition|objectif|race|jour\s*j|event)\b/i;

function plain(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesAny(value: string, tokens: readonly string[]): boolean {
  const normalized = plain(value);
  return tokens.some(token => normalized.includes(plain(token)));
}

function ref(session: NormalizedSession): string {
  return `S${session.weekNumber} ${session.dayName} — ${(session.catalogId ?? session.title) || "séance"}`;
}

function activeSessions(plan: NormalizedPlan): NormalizedSession[] {
  return plan.weeks.flatMap(week => week.sessions.filter(session => !session.isRest));
}

function knownDuration(session: NormalizedSession): number | null {
  return session.durationMin !== null && session.durationMin > 0 ? session.durationMin : null;
}

function maxRawZone(zones: readonly string[]): string | null {
  const candidates = zones.flatMap(zone => {
    const match = String(zone).trim().match(/^Z\s*([1-7])([ab])?$/i);
    return match ? [{ token: `Z${match[1]}${(match[2] ?? "").toLowerCase()}`, rank: Number(match[1]) }] : [];
  });
  candidates.sort((a, b) => b.rank - a.rank);
  return candidates[0]?.token ?? null;
}

function weeklySummaries(plan: NormalizedPlan): WeeklySummary[] {
  return plan.weeks.map((week, index) => {
    const active = week.sessions.filter(session => !session.isRest);
    const bySportMin: Partial<Record<CanonicalSport, number>> = {};
    const rawZoneMinutes: Record<string, number> = {};
    let knownDurationMin = 0;
    let unknownDurationSessions = 0;
    for (const session of active) {
      const duration = knownDuration(session);
      if (duration === null) unknownDurationSessions += 1;
      else {
        knownDurationMin += duration;
        bySportMin[session.sport] = (bySportMin[session.sport] ?? 0) + duration;
        const zone = maxRawZone(session.zones);
        if (zone) rawZoneMinutes[zone] = (rawZoneMinutes[zone] ?? 0) + duration;
      }
    }
    const declared = DELOAD_RX.test(plain(`${week.theme} ${week.notes}`));
    const previous = plan.weeks[index - 1];
    const previousActive = previous?.sessions.filter(session => !session.isRest) ?? [];
    const previousKnown = previousActive.every(session => knownDuration(session) !== null);
    const previousTotal = previousActive.reduce((sum, session) => sum + (knownDuration(session) ?? 0), 0);
    const volumeDrop = unknownDurationSessions === 0 && previousKnown && previousTotal > 0 && knownDurationMin <= previousTotal * 0.9;
    return {
      weekNumber: week.weekNumber,
      phase: week.phase,
      theme: week.theme,
      knownDurationMin,
      unknownDurationSessions,
      sessions: active.length,
      keySessions: active.some(session => session.isKeySession !== null)
        ? active.filter(session => session.isKeySession === true).length
        : null,
      bySportMin,
      rawZoneMinutes,
      deloadEvidence: declared ? "declared" : volumeDrop ? "volume_drop" : unknownDurationSessions > 0 ? "not_verifiable" : "none",
    };
  });
}

function disciplineSummaries(plan: NormalizedPlan): DisciplineSummary[] {
  const sessions = activeSessions(plan);
  const knownCardio = sessions.filter(session => CARDIO.includes(session.sport)).reduce((sum, session) => sum + (knownDuration(session) ?? 0), 0);
  const sports = [...new Set<CanonicalSport>(sessions.map(session => session.sport))].sort();
  return sports.map(sport => {
    const matching = sessions.filter(session => session.sport === sport);
    const known = matching.reduce((sum, session) => sum + (knownDuration(session) ?? 0), 0);
    return {
      sport,
      sessions: matching.length,
      knownDurationMin: known,
      unknownDurationSessions: matching.filter(session => knownDuration(session) === null).length,
      cardioShare: CARDIO.includes(sport) && knownCardio > 0 ? known / knownCardio : null,
    };
  });
}

function push(findings: PlanFinding[], finding: PlanFinding): void {
  findings.push(finding);
}

export function analyzeSportsPlan(
  plan: NormalizedPlan,
  scenario: ReferenceScenario,
  catalog: ReadonlyMap<string, CatalogEvidence> = new Map(),
): SportsPlanQaReport {
  const findings: PlanFinding[] = [];
  const coverage: ControlCoverage[] = [];
  const weeks = weeklySummaries(plan);
  const disciplines = disciplineSummaries(plan);
  const active = activeSessions(plan);
  const presentSports = new Set(active.map(session => session.sport));

  for (const sport of scenario.expectations.requiredSports) {
    if (!presentSports.has(sport)) push(findings, { code: "required_sport_missing", severity: "critical", message: `Discipline attendue absente : ${sport}.`, evidence: `Objectif ${scenario.planConfig.objective}` });
  }
  for (const sport of scenario.expectations.forbiddenSports ?? []) {
    for (const session of active.filter(candidate => candidate.sport === sport)) {
      push(findings, { code: "forbidden_sport_present", severity: "critical", message: `Discipline explicitement interdite présente : ${sport}.`, weekNumber: session.weekNumber, sessionRef: ref(session) });
    }
  }
  coverage.push({ control: "disciplines_expected", status: "checked", detail: "Sports structurés comparés aux exigences du scénario." });

  const unknownDurations = active.filter(session => knownDuration(session) === null);
  for (const session of unknownDurations) push(findings, { code: "duration_unknown", severity: "not_verifiable", message: "Durée active absente, nulle ou non numérique.", weekNumber: session.weekNumber, sessionRef: ref(session) });
  coverage.push({ control: "weekly_and_sport_volume", status: unknownDurations.length ? "partial" : "checked", detail: `${active.length - unknownDurations.length}/${active.length} séances actives ont une durée exploitable.` });

  const cardioUnknown = active.some(session => CARDIO.includes(session.sport) && knownDuration(session) === null);
  if (!cardioUnknown) {
    for (const [sport, range] of Object.entries(scenario.expectations.cardioShareRanges ?? {}) as Array<["swim" | "bike" | "run", [number, number]]>) {
      const summary = disciplines.find(item => item.sport === sport);
      const share = summary?.cardioShare ?? 0;
      if (share < range[0] || share > range[1]) push(findings, { code: "discipline_share_outside_range", severity: "warning", message: `${sport} représente ${(share * 100).toFixed(1)} % du volume cardio connu, hors plage ${(range[0] * 100).toFixed(0)}–${(range[1] * 100).toFixed(0)} %.`, evidence: "Plage définie par le scénario QA, pas une norme universelle." });
    }
    coverage.push({ control: "discipline_distribution", status: "checked", detail: "Parts calculées sur les minutes cardio structurées ; les bricks ne sont pas ventilés." });
  } else {
    coverage.push({ control: "discipline_distribution", status: "not_verifiable", detail: "Au moins une durée cardio est inconnue." });
  }

  const lastWeek = plan.weeks.at(-1);
  const lastEvidence = (lastWeek?.sessions ?? []).filter(session => !session.isRest).map(session => `${session.title} ${session.details}`).join(" | ");
  const finalMatches = matchesAny(lastEvidence, scenario.expectations.finalRaceTokens);
  if (!finalMatches) {
    push(findings, {
      code: RACE_RX.test(plain(lastEvidence)) ? "final_objective_mismatch" : "final_race_not_identified",
      severity: RACE_RX.test(plain(lastEvidence)) ? "critical" : "warning",
      message: `La compétition finale ${scenario.expectations.objectiveFamily} n'est pas identifiable dans la dernière semaine.`,
      weekNumber: lastWeek?.weekNumber,
      evidence: lastEvidence || "Aucune séance active en dernière semaine.",
    });
  }
  coverage.push({ control: "final_objective_and_race", status: "partial", detail: "Le contrat de séance n'a pas d'identifiant d'événement ; vérification conservatrice sur le texte de la dernière semaine." });

  for (const race of scenario.expectations.intermediateRaces ?? []) {
    const candidates = plan.weeks.filter(week => Math.abs(week.weekNumber - race.expectedWeek) <= 1)
      .flatMap(week => week.sessions.filter(session => matchesAny(`${session.title} ${session.details}`, race.tokens)));
    if (candidates.length === 0) push(findings, { code: "intermediate_race_missing", severity: "warning", message: `Compétition intermédiaire ${race.family} non identifiée autour de S${race.expectedWeek}.`, weekNumber: race.expectedWeek });
  }

  const maxIncrease = scenario.expectations.maxWeeklyVolumeIncreasePct;
  if (maxIncrease !== undefined) {
    for (let index = 1; index < weeks.length; index++) {
      const previous = weeks[index - 1];
      const current = weeks[index];
      if (previous.unknownDurationSessions || current.unknownDurationSessions || previous.knownDurationMin <= 0) continue;
      const increase = ((current.knownDurationMin - previous.knownDurationMin) / previous.knownDurationMin) * 100;
      if (increase > maxIncrease) push(findings, { code: "weekly_volume_increase", severity: "warning", message: `Hausse de volume de ${increase.toFixed(1)} % (seuil scénario ${maxIncrease} %).`, weekNumber: current.weekNumber, evidence: `${previous.knownDurationMin} → ${current.knownDurationMin} min` });
    }
    coverage.push({ control: "volume_progression", status: unknownDurations.length ? "partial" : "checked", detail: `Seuil contextuel du scénario : ${maxIncrease} %.` });
  } else coverage.push({ control: "volume_progression", status: "partial", detail: "Volumes exposés sans seuil de progression imposé pour ce scénario." });

  const deloadCadence = scenario.planConfig.deloadCadenceWeeks;
  if (deloadCadence) {
    for (const week of weeks.filter(item => item.weekNumber % deloadCadence === 0 && !/taper/i.test(item.phase))) {
      if (week.deloadEvidence === "not_verifiable") push(findings, { code: "deload_not_verifiable", severity: "not_verifiable", message: "Semaine de décharge attendue mais volume incomplet.", weekNumber: week.weekNumber });
      else if (week.deloadEvidence === "none") push(findings, { code: "deload_missing", severity: "warning", message: `Aucune baisse de volume ni mention de décharge à la cadence ${deloadCadence - 1}:1.`, weekNumber: week.weekNumber });
    }
    coverage.push({ control: "deload_cadence", status: unknownDurations.length ? "partial" : "checked", detail: `Cadence explicite ${deloadCadence - 1}:1.` });
  } else coverage.push({ control: "deload_cadence", status: "partial", detail: "Seules les semaines explicitement nommées récupération/décharge sont contrôlées." });

  for (const week of weeks.filter(item => item.deloadEvidence === "declared")) {
    if (week.keySessions === null) push(findings, { code: "recovery_intensity_not_verifiable", severity: "not_verifiable", message: "Semaine de récupération déclarée sans marqueurs isKeySession exploitables.", weekNumber: week.weekNumber });
    else if (week.keySessions >= 2) push(findings, { code: "recovery_week_too_intense", severity: "critical", message: `Semaine de récupération avec ${week.keySessions} séances qualitatives.`, weekNumber: week.weekNumber });
  }

  const quality = active.filter(session => session.isKeySession === true && session.dayIndex !== null)
    .map(session => ({ session, absoluteDay: (session.weekNumber - 1) * 7 + session.dayIndex! }))
    .sort((a, b) => a.absoluteDay - b.absoluteDay);
  for (let index = 1; index < quality.length; index++) {
    const gap = quality[index].absoluteDay - quality[index - 1].absoluteDay;
    if (gap < 2) push(findings, { code: "quality_sessions_too_close", severity: "warning", message: `Deux séances qualitatives sont espacées de ${gap} jour civil.`, weekNumber: quality[index].session.weekNumber, sessionRef: `${ref(quality[index - 1].session)} → ${ref(quality[index].session)}`, evidence: "Le contrat ne fournit pas l'heure ; 48 h exactes restent non vérifiables." });
  }
  const keyKnown = active.filter(session => session.isKeySession !== null).length;
  coverage.push({ control: "quality_spacing", status: keyKnown === active.length ? "checked" : keyKnown > 0 ? "partial" : "not_verifiable", detail: `${keyKnown}/${active.length} séances exposent isKeySession.` });

  const requestedStrength = scenario.expectations.minimumStrengthSessionsPerWeek ?? scenario.planConfig.strengthSessionsPerWeek ?? 0;
  if (requestedStrength > 0) {
    for (const week of plan.weeks.filter(item => !/taper/i.test(item.phase))) {
      const count = week.sessions.filter(session => !session.isRest && session.sport === "strength").length;
      if (count < requestedStrength) push(findings, { code: "strength_request_not_met", severity: "warning", message: `${count} séance(s) de renforcement, ${requestedStrength} demandée(s).`, weekNumber: week.weekNumber });
    }
    coverage.push({ control: "requested_strength", status: "checked", detail: "Comptage des séances sport=strength hors taper." });
  } else coverage.push({ control: "requested_strength", status: "checked", detail: "Aucun minimum demandé." });

  const allowedDays = scenario.expectations.allowedDayIndexes;
  if (allowedDays) {
    for (const session of active) {
      if (session.dayIndex === null) push(findings, { code: "availability_not_verifiable", severity: "not_verifiable", message: "Jour de séance non normalisable.", weekNumber: session.weekNumber, sessionRef: ref(session) });
      else if (!allowedDays.includes(session.dayIndex)) push(findings, { code: "availability_conflict", severity: "critical", message: `Séance placée un jour indisponible (${session.dayName}).`, weekNumber: session.weekNumber, sessionRef: ref(session) });
    }
    coverage.push({ control: "availability", status: active.every(session => session.dayIndex !== null) ? "checked" : "partial", detail: "Disponibilités structurées du scénario comparées aux jours du plan." });
  } else coverage.push({ control: "availability", status: "not_verifiable", detail: "Aucune disponibilité structurée dans ce scénario ; le texte libre n'est pas interprété." });

  const approved = new Set((scenario.expectations.approvedAdvancedSessionIds ?? []).map(id => id.toUpperCase()));
  let catalogLinked = 0;
  let auditedIntent = 0;
  let finalIntentAvailable = 0;
  for (const session of active) {
    if (!session.catalogId) continue;
    const evidence = catalog.get(session.catalogId.toUpperCase());
    if (!evidence) continue;
    catalogLinked += 1;
    const prerequisites = evidence.prerequisites;
    if (prerequisites?.blockAutomaticSelection) push(findings, { code: "advanced_session_absolute_block", severity: "critical", message: "Séance exclue de toute sélection automatique par ses prérequis audités.", weekNumber: session.weekNumber, sessionRef: ref(session) });
    else if (prerequisites?.requireExplicitCoachApproval && !approved.has(session.catalogId.toUpperCase())) push(findings, { code: "advanced_session_unapproved", severity: "critical", message: "Séance avancée sans approbation nominative vérifiable.", weekNumber: session.weekNumber, sessionRef: ref(session) });
    if (evidence.physiology) {
      auditedIntent += 1;
      if (session.finalPhysiologicalIntent) {
        finalIntentAvailable += 1;
        if (session.finalPhysiologicalIntent !== evidence.physiology.primary) push(findings, { code: "physiological_intent_mismatch", severity: "critical", message: `Intention finale ${session.finalPhysiologicalIntent} différente de l'intention auditée ${evidence.physiology.primary}.`, weekNumber: session.weekNumber, sessionRef: ref(session) });
      } else push(findings, { code: "final_intent_not_verifiable", severity: "not_verifiable", message: `Intention catalogue auditée (${evidence.physiology.primary}), mais aucune intention finale structurée n'est exportée.`, weekNumber: session.weekNumber, sessionRef: ref(session) });
    }
  }
  coverage.push({ control: "advanced_prerequisites", status: catalogLinked ? "checked" : "not_verifiable", detail: `${catalogLinked}/${active.length} séances reliées à une fiche connue.` });
  coverage.push({ control: "declared_objective_vs_final_stimulus", status: auditedIntent === 0 ? "not_verifiable" : finalIntentAvailable === auditedIntent ? "checked" : "partial", detail: `${finalIntentAvailable}/${auditedIntent} séances à métadonnée auditée exposent aussi une intention finale structurée.` });

  const rawZoneSessions = active.filter(session => maxRawZone(session.zones) !== null).length;
  coverage.push({ control: "intensity_distribution", status: rawZoneSessions === 0 ? "not_verifiable" : rawZoneSessions === active.length ? "checked" : "partial", detail: `${rawZoneSessions}/${active.length} séances ont une zone Z1–Z7 stricte. Les zones restent ventilées par libellé brut, sans équivalence interdisciplinaire.` });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scenario: { id: scenario.id, label: scenario.label, objective: scenario.planConfig.objective },
    plan: { title: plan.title, totalWeeks: plan.totalWeeks, sourceShape: plan.sourceShape },
    disciplines,
    weeks,
    findings,
    critical: findings.filter(finding => finding.severity === "critical"),
    warnings: findings.filter(finding => finding.severity === "warning"),
    notVerifiable: findings.filter(finding => finding.severity === "not_verifiable"),
    coverage,
    limitations: [
      "Aucun score global n'est calculé : une anomalie critique reste visible.",
      "Les zones Z1–Z7 sont rapportées telles quelles sans supposer une équivalence course/vélo/natation.",
      "Les dates/heures exactes, la charge interne et la récupération réelle ne sont pas déduites du texte.",
      "Une intention envoyée au modèle ou portée par le catalogue ne prouve pas l'intention de la prescription finale adaptée.",
      "Les plages de répartition par discipline sont des attentes de scénario QA, pas des normes médicales universelles.",
    ],
  };
}

