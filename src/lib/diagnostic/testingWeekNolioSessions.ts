import { getProtocolDef } from "./buildDiagnosticProtocolHTML";
import {
  buildBikeSpec,
  buildRunSpec,
  buildCompactTriathlonItems,
  groupCompactItems,
  type NormDay,
  type NormStep,
} from "./buildTestingWeekProtocolHTML";

/**
 * testingWeekNolioSessions — Convertit le calendrier compact triathlon
 * (18 jours vélo + course + natation, cf. buildTestingWeekProtocolHTML.ts)
 * en séances envoyables à l'edge function `nolio-send-plan`, pour que le
 * coach puisse pousser ce protocole de test dans le calendrier Nolio de
 * l'athlète comme un plan classique, puis l'enregistrer comme modèle
 * directement depuis Nolio.
 *
 * Réutilise buildCompactTriathlonItems() / groupCompactItems() — la MÊME
 * source que le dossier PDF — pour ne jamais diverger de l'ordre/espacement
 * de récupération déjà audité.
 *
 * Deux volets complémentaires par séance :
 *  - `objectif` : description texte riche (échauffement / corps de séance /
 *    retour au calme + règles de pacing + critères de validité + données à
 *    enregistrer), construite ENTIÈREMENT ici (jamais via le champ
 *    `structure` de nolio-send-plan — buildDescription() y aplatit tout
 *    texte multi-paragraphe en une seule liste à puces continue, bug réel
 *    déjà observé en prod).
 *  - `structuredWorkout` : la STRUCTURE de la séance (une étape Nolio par
 *    étape du protocole, avec sa vraie durée) SANS cible chiffrée
 *    (`target_type: "no_target"`, dit "empty unit" côté Nolio) — seule la
 *    consigne (ex. "Z2 65-70% FTP", "ALL-OUT 30s") apparaît en note sur
 *    l'étape. Choix délibéré (demande coach) : ces tests visent à ÉTABLIR
 *    les zones (FTP/VMA/CSS) — il n'y a donc pas de référence fiable pour
 *    calculer une cible en %, ET un modèle Nolio à cible chiffrée fixe
 *    n'est de toute façon pas réutilisable d'un athlète à l'autre (Nolio
 *    n'accepte que des valeurs absolues, jamais un pourcentage — vérifié
 *    dans nolio-send-plan : `target_unit` est systématiquement supprimé
 *    avant l'envoi). La structure (durées + notes), elle, reste valable
 *    pour n'importe quel athlète.
 *
 * `structuredWorkout` est envoyé tel quel à nolio-send-plan (champ dédié
 * qui court-circuite buildStructuredFromParts) — on ne passe JAMAIS par le
 * champ `structure` (texte à reparser) pour la structure chiffrée : chaque
 * étape du protocole est déjà connue individuellement ici, pas besoin de
 * la faire deviner par un parseur de texte.
 */

export interface NolioStepLike {
  type: "step";
  intensity_type: "warmup" | "active" | "cooldown";
  step_duration_type: "duration";
  step_duration_value: number; // secondes
  target_type: "no_target";
  notes: string;
}

/**
 * Bloc de répétition Nolio natif (même shape que `NolioRepStep` côté
 * nolio-send-plan/index.ts : `structuredWorkout` construit ici est envoyé
 * TEL QUEL, sans repasser par buildStructuredFromParts). Utilisé quand le
 * protocole répète un même effort identique à l'identique (ex. CAP D1 : 2
 * sprints 15s séparés par la même récupération) — donne dans Nolio le même
 * rendu visuel "2x { ... }" qu'un bloc construit à la main (cf. demande
 * coach, capture TFCL Pool Day™).
 */
export interface NolioRepStepLike {
  type: "repetition";
  intensity_type: "repetition";
  value: number; // nombre de répétitions
  steps: NolioStepLike[];
}

export interface TestingWeekNolioSession {
  weekNumber: number;
  dayIndex: number; // 0-6, requis par nolio-send-plan
  sessionIndex: number;
  sport: string;
  title: string;
  objectif: string;
  details: string;
  isRest: false;
  structuredWorkout: (NolioStepLike | NolioRepStepLike)[];
}

function formatStep(s: NormStep): string {
  const dur = s.durationMin < 1 ? `${Math.round(s.durationMin * 60)} s` : `${s.durationMin} min`;
  return `${dur} — ${s.intensityLabel}${s.notes ? ` (${s.notes})` : ""}`;
}

function listLines(items: string[]): string {
  return items.map((it) => `• ${it}`).join("\n");
}

function stepsToLines(steps: NormStep[]): string {
  return listLines(steps.map(formatStep));
}

function nolioStep(intensity: NolioStepLike["intensity_type"], durationSec: number, notes: string): NolioStepLike {
  return {
    type: "step",
    intensity_type: intensity,
    step_duration_type: "duration",
    step_duration_value: Math.max(1, Math.round(durationSec)),
    target_type: "no_target",
    notes: notes.slice(0, 500),
  };
}

/** Repère un suffixe "(essai N)" / "(tentative N)" — sert à regrouper des tentatives identiques répétées. */
const ATTEMPT_SUFFIX = /\s*\((?:essai|tentative)\s*\d+\)\s*$/i;

/**
 * Regroupe les tentatives identiques consécutives du corps de séance en un
 * bloc de répétition Nolio natif ("2x { effort, récup }"), au lieu de la
 * liste à plat historique (effort 1, récup, effort 2). Ne s'applique QUE
 * quand deux (ou plus) efforts consécutifs ont la même durée et le même
 * libellé de base (hors suffixe "(essai N)"), séparés par une même étape de
 * récupération — sinon (cas normal : chaque étape du corps de séance est un
 * effort distinct, ex. P30s puis P60s) la séquence reste inchangée.
 *
 * Note assumée : le bloc de répétition inclut la récupération APRÈS CHAQUE
 * tentative, y compris la dernière (même convention que le calendrier
 * construit à la main par le coach dans Nolio, ex. TFCL Pool Day™ "2x { 25m
 * sprint, 3min récup }") — quelques minutes de récupération de plus avant le
 * retour au calme, jamais un raccourci du protocole.
 */
function groupRepeatedEffort(main: NormStep[]): (NolioStepLike | NolioRepStepLike)[] {
  const items: (NolioStepLike | NolioRepStepLike)[] = [];
  let i = 0;

  while (i < main.length) {
    const effort = main[i];
    const effortMatch = effort.intensityLabel.match(ATTEMPT_SUFFIX);

    if (effortMatch && i + 2 < main.length) {
      const recovery = main[i + 1];
      const nextEffort = main[i + 2];
      const nextMatch = nextEffort?.intensityLabel.match(ATTEMPT_SUFFIX);
      const baseLabel = effort.intensityLabel.replace(ATTEMPT_SUFFIX, "");
      const sameBase = nextMatch && nextEffort.intensityLabel.replace(ATTEMPT_SUFFIX, "") === baseLabel;
      const sameDuration = nextEffort && nextEffort.durationMin === effort.durationMin;
      const isRecoveryBetween = recovery && recovery.durationMin !== effort.durationMin;

      if (sameBase && sameDuration && isRecoveryBetween) {
        // Compte toutes les tentatives consécutives partageant ce même libellé de base.
        let reps = 1;
        let j = i;
        while (
          j + 2 < main.length &&
          main[j + 2]?.intensityLabel.replace(ATTEMPT_SUFFIX, "") === baseLabel &&
          main[j + 2].durationMin === effort.durationMin &&
          main[j + 1]?.durationMin !== effort.durationMin
        ) {
          reps++;
          j += 2;
        }

        const notesParts = [effort.notes, nextEffort.notes].filter((n): n is string => !!n);
        const mergedNotes = Array.from(new Set(notesParts)).join(" ");

        items.push({
          type: "repetition",
          intensity_type: "repetition",
          value: reps,
          steps: [
            nolioStep("active", effort.durationMin * 60, `${baseLabel}${mergedNotes ? ` (${mergedNotes})` : ""}`),
            nolioStep("cooldown", recovery.durationMin * 60, formatStep(recovery)),
          ],
        });

        i = j + 2; // saute toutes les tentatives + récups consommées
        continue;
      }
    }

    items.push(nolioStep("active", effort.durationMin * 60, formatStep(effort)));
    i++;
  }

  return items;
}

/** Construit le texte de description (sections clairement titrées) d'un jour vélo/course. */
function dayToDescriptionText(day: NormDay, flag?: string): string {
  const sections: string[] = [day.goal];

  if (day.warmup.length > 0) {
    sections.push(`🔥 ÉCHAUFFEMENT\n${stepsToLines(day.warmup)}`);
  }
  if (day.main.length > 0) {
    sections.push(`💪 CORPS DE SÉANCE\n${stepsToLines(day.main)}`);
  }
  if (day.recovery.length > 0) {
    sections.push(`🧘 RETOUR AU CALME\n${stepsToLines(day.recovery)}`);
  }
  if (day.pacingRules.length > 0) {
    sections.push(`🧭 RÈGLES DE PACING\n${listLines(day.pacingRules)}`);
  }
  if (day.validityCriteria.length > 0) {
    sections.push(`✅ CRITÈRES DE VALIDITÉ\n${listLines(day.validityCriteria)}`);
  }
  if (day.dataToRecord.length > 0) {
    sections.push(`📋 À ENREGISTRER\n${listLines(day.dataToRecord)}`);
  }
  if (flag) {
    sections.push(`⚠️ POINT DE VIGILANCE\n${flag}`);
  }

  return sections.join("\n\n");
}

/** Construit les étapes structurées (une par étape du protocole, sans cible chiffrée) d'un jour vélo/course. */
export function dayToNolioSteps(day: NormDay): (NolioStepLike | NolioRepStepLike)[] {
  return [
    ...day.warmup.map((s) => nolioStep("warmup", s.durationMin * 60, formatStep(s))),
    ...groupRepeatedEffort(day.main),
    ...day.recovery.map((s) => nolioStep("cooldown", s.durationMin * 60, formatStep(s))),
  ];
}

/** Construit le texte de description du protocole natation (TFCL Pool Day™, format blocs). */
function swimDescriptionText(): string {
  const p = getProtocolDef("pool-day");
  const sections: string[] = [p.subtitle];

  for (const b of p.blocks) {
    sections.push(`🏊 ${b.title.toUpperCase()} (${b.duration})\n${listLines(b.instructions)}`);
  }
  if (p.results.length > 0) {
    sections.push(`📋 RÉSULTATS À CALCULER\n${listLines(p.results.map((r) => `${r.metric} (${r.unit})`))}`);
  }

  return sections.join("\n\n");
}

/** "~20 min" / "~1h30" → secondes. Repli à 20 min si rien de reconnaissable (n'arrive jamais sur les blocs réels). */
function parseApproxDurationToSec(duration: string): number {
  const hourMatch = duration.match(/(\d+)\s*h\s*(\d+)?/i);
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10);
    const m = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    return h * 3600 + m * 60;
  }
  const minMatch = duration.match(/(\d+)/);
  return (minMatch ? parseInt(minMatch[1], 10) : 20) * 60;
}

/** Construit les étapes structurées du protocole natation — une par bloc (chaque bloc regroupe plusieurs consignes, pas de minutage plus fin dans la source). */
function swimNolioSteps(): NolioStepLike[] {
  const p = getProtocolDef("pool-day");
  return p.blocks.map((b, i) =>
    nolioStep(i === 0 ? "warmup" : "active", parseApproxDurationToSec(b.duration), `${b.title} — ${b.instructions.join(" ")}`),
  );
}

/**
 * Construit les séances Nolio du calendrier compact triathlon (18 jours),
 * numérotées weekNumber/dayIndex de façon séquentielle continue à partir
 * du Jour 1 (weekNumber=1+floor((n-1)/7), dayIndex=(n-1)%7) — indépendant
 * du jour de la semaine réel, puisqu'un `planStartDate` arbitraire ancre
 * ensuite le Jour 1 sur la date de démarrage choisie par le coach.
 */
export function buildCompactTriathlonNolioSessions(): TestingWeekNolioSession[] {
  const bikeSpec = buildBikeSpec();
  const runSpec = buildRunSpec();
  const items = buildCompactTriathlonItems(bikeSpec, runSpec);

  const sessions: TestingWeekNolioSession[] = [];
  for (const { dayNumber, group } of groupCompactItems(items)) {
    const weekNumber = 1 + Math.floor((dayNumber - 1) / 7);
    const dayIndex = (dayNumber - 1) % 7;

    group.forEach((it, sessionIndex) => {
      if (it.kind === "swim") {
        const p = getProtocolDef("pool-day");
        sessions.push({
          weekNumber,
          dayIndex,
          sessionIndex,
          sport: "Natation",
          title: p.name,
          objectif: swimDescriptionText(),
          details: p.subtitle,
          isRest: false,
          structuredWorkout: swimNolioSteps(),
        });
        return;
      }

      const day = it.day;
      sessions.push({
        weekNumber,
        dayIndex,
        sessionIndex,
        sport: it.sportLabel,
        title: day.title,
        objectif: dayToDescriptionText(day, it.flag),
        details: day.goal,
        isRest: false,
        structuredWorkout: dayToNolioSteps(day),
      });
    });
  }
  return sessions;
}
