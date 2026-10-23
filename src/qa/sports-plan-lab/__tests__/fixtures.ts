type Session = Record<string, unknown>;

const session = (
  dayName: string,
  dayIndex: number,
  sport: string,
  title: string,
  durationMin: number | null,
  options: Partial<Session> = {},
): Session => ({
  dayName, dayIndex, sport, title, details: "Prescription fixture QA",
  durationMin, zones: ["Z2"], isRest: false, isKeySession: false,
  catalogId: null, custom: true, ...options,
});

const rest = (dayName: string, dayIndex: number): Session => ({
  dayName, dayIndex, sport: "rest", title: "Repos", details: "",
  durationMin: 0, zones: [], isRest: true, isKeySession: false,
  catalogId: null, custom: true,
});

const strength = (week: number) => session("Jeudi", 3, "strength", `Renforcement S${week}`, 30);

function triWeek(weekNumber: number, finalTitle?: string) {
  return {
    weekNumber, phase: finalTitle ? "taper" : "build", theme: finalTitle ? "Compétition" : `Développement S${weekNumber}`, coachNotes: "",
    sessions: [
      session("Lundi", 0, "swim", "Technique natation", 45),
      session("Mardi", 1, "bike", "Vélo qualité", 120, { isKeySession: true, zones: ["Z4"] }),
      rest("Mercredi", 2),
      strength(weekNumber),
      session("Vendredi", 4, "swim", "Endurance natation", 45),
      session("Samedi", 5, "run", finalTitle ?? "Course endurance", finalTitle ? 180 : 60, { isKeySession: !!finalTitle, zones: finalTitle ? ["Z3"] : ["Z2"] }),
      session("Dimanche", 6, "bike", "Sortie vélo", 120),
    ],
  };
}

export const balanced703 = {
  title: "Fixture 70.3 équilibrée", totalWeeks: 4,
  weeks: [triWeek(1), triWeek(2), triWeek(3), triWeek(4, "Course objectif Ironman 70.3")],
};

export const noSwim703 = {
  title: "Fixture 70.3 sans natation", totalWeeks: 2,
  weeks: [1, 2].map(weekNumber => ({
    weekNumber, phase: weekNumber === 2 ? "taper" : "build", theme: "Triathlon", coachNotes: "",
    sessions: [session("Mardi", 1, "bike", "Vélo", 150), strength(weekNumber), session("Dimanche", 6, "run", weekNumber === 2 ? "Course objectif Ironman 70.3" : "Course", 75)],
  })),
};

export const final10kFor703 = {
  title: "Fixture 70.3 terminée par 10 km", totalWeeks: 12,
  weeks: Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const week = triWeek(weekNumber, weekNumber === 12 ? "Course objectif 10 km" : undefined);
    if (weekNumber === 4) week.sessions[5] = session("Samedi", 5, "run", "Compétition intermédiaire 10 km", 50, { isKeySession: true, zones: ["Z4"] });
    return week;
  }),
};

function runWeek(weekNumber: number, options: { theme?: string; race?: string; twoQuality?: boolean; unknown?: boolean; catalogId?: string } = {}) {
  const race = options.race;
  return {
    weekNumber, phase: race ? "taper" : "build", theme: options.theme ?? (race ? "Compétition" : "Construction"), coachNotes: "",
    sessions: [
      session("Mardi", 1, "run", "Intervalles", options.unknown ? null : 50, { isKeySession: true, zones: ["Z4"], catalogId: options.catalogId ?? null, custom: !options.catalogId }),
      strength(weekNumber),
      session("Mercredi", 2, "run", options.twoQuality ? "Seuil rapproché" : "Endurance", 50, { isKeySession: !!options.twoQuality, zones: options.twoQuality ? ["Z4"] : ["Z2"] }),
      session("Dimanche", 6, "run", race ?? "Sortie longue", race ? 60 : 80, { isKeySession: !!race, zones: race ? ["Z4"] : ["Z2"] }),
    ],
  };
}

export const valid10kNoSwim = {
  title: "Fixture 10 km valide", totalWeeks: 3,
  weeks: [runWeek(1), runWeek(2), runWeek(3, { race: "Course objectif 10 km" })],
};

export const marathonWithHalf = {
  title: "Fixture marathon avec semi", totalWeeks: 12,
  weeks: Array.from({ length: 12 }, (_, index) => {
    const week = index + 1;
    if (week === 6) return runWeek(week, { race: "Semi-marathon préparatoire" });
    if (week === 12) return runWeek(week, { race: "Course objectif Marathon" });
    return runWeek(week);
  }),
};

export const intenseRecoveryWeek = {
  title: "Fixture récupération intense", totalWeeks: 2,
  weeks: [runWeek(1), runWeek(2, { theme: "Semaine de récupération", twoQuality: true, race: "Course objectif 10 km" })],
};

export const qualityAccumulation = {
  title: "Fixture qualités rapprochées", totalWeeks: 2,
  weeks: [runWeek(1, { twoQuality: true }), runWeek(2, { race: "Course objectif 10 km" })],
};

export const unauthorizedAdvanced = {
  title: "Fixture séance avancée", totalWeeks: 2,
  weeks: [runWeek(1, { catalogId: "ADVANCED_TEST" }), runWeek(2, { race: "Course objectif 10 km" })],
};

export const partialDurations = {
  title: "Fixture durées partielles", totalWeeks: 2,
  weeks: [runWeek(1, { unknown: true }), runWeek(2, { race: "Course objectif 10 km" })],
};

export const valid5kNoSwim = {
  title: "Fixture 5 km valide", totalWeeks: 3,
  weeks: [runWeek(1), runWeek(2), runWeek(3, { race: "Course objectif 5 km" })],
};

export const balancedIronman = {
  title: "Fixture Ironman équilibrée", totalWeeks: 4,
  weeks: [triWeek(1), triWeek(2), triWeek(3), triWeek(4, "Course objectif Ironman")],
};

/**
 * Reconstruction synthétique, jamais présentée comme l'export réel : elle ne
 * conserve que les trois faits publiés dans le commit d'audit 8bc61949
 * (0 natation, 7 vélo, 163 course, dernière course = 10 km) afin de vérifier
 * que le laboratoire sait détecter ces symptômes si un export structuré les
 * expose. Aucune séance, durée ou semaine de ce fichier n'est une donnée
 * observée du plan historique.
 */
export const reported703IncidentShape = {
  title: "Reconstruction QA — incident 70.3 rapporté (pas l'export réel)",
  totalWeeks: 32,
  weeks: Array.from({ length: 32 }, (_, index) => {
    const weekNumber = index + 1;
    const runCount = weekNumber <= 3 ? 6 : 5;
    const sessions: Session[] = Array.from({ length: runCount }, (__, runIndex) => session(
      ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][runIndex],
      runIndex,
      "run",
      weekNumber === 32 && runIndex === runCount - 1 ? "Compétition finale Corrida WSL 10 km" : `Course S${weekNumber}.${runIndex + 1}`,
      60,
      { isKeySession: runIndex === 1, zones: runIndex === 1 ? ["Z4"] : ["Z2"] },
    ));
    if ([1, 5, 9, 13, 17, 21, 25].includes(weekNumber)) {
      sessions.push(session("Dimanche", 6, "bike", `Vélo S${weekNumber}`, 90));
    }
    sessions.push(strength(weekNumber));
    return {
      weekNumber,
      phase: weekNumber === 32 ? "taper" : "build",
      theme: weekNumber === 32 ? "Compétition" : `Construction S${weekNumber}`,
      coachNotes: "Reconstruction synthétique des seuls compteurs publiés.",
      sessions,
    };
  }),
};

