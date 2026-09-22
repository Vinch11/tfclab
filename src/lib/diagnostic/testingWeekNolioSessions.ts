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
 * (16 jours vélo + course + natation, cf. buildTestingWeekProtocolHTML.ts)
 * en séances envoyables à l'edge function `nolio-send-plan`, pour que le
 * coach puisse pousser ce protocole de test dans le calendrier Nolio de
 * l'athlète comme un plan classique.
 *
 * Réutilise buildCompactTriathlonItems() / groupCompactItems() — la MÊME
 * source que le dossier PDF — pour ne jamais diverger de l'ordre/espacement
 * de récupération déjà audité.
 *
 * Choix délibéré : aucun `structured_workout` (intervalles chiffrés Nolio)
 * n'est généré ici. Ces tests visent justement à ÉTABLIR les zones (FTP,
 * VMA, CSS...) — il n'y a donc pas encore de référence fiable pour calculer
 * des cibles en %. Chaque séance est envoyée avec une description texte
 * riche (échauffement / corps de séance / retour au calme + règles de
 * pacing + critères de validité + données à enregistrer), à suivre au
 * chronomètre comme dans le dossier papier.
 *
 * Le texte est construit ENTIÈREMENT ici (pas via le champ `structure` de
 * nolio-send-plan) : buildDescription() de nolio-send-plan aplatit chaque
 * "part" de `structure` en une seule liste à puces (toListLines), fusionnant
 * étapes/règles/critères/données à enregistrer en un seul bloc indistinct
 * dès que le texte contient plusieurs paragraphes — bug réel observé en
 * prod (retour coach : "la fin du bloc texte est très condensée"). Poser
 * tout le texte final dans `objectif` (jamais lu par toListLines) garde nos
 * propres sauts de ligne et titres de section intacts.
 */

export interface TestingWeekNolioSession {
  weekNumber: number;
  dayIndex: number; // 0-6, requis par nolio-send-plan
  sessionIndex: number;
  sport: string;
  title: string;
  objectif: string;
  details: string;
  isRest: false;
  /**
   * Défensif : aucun `structure` n'est jamais posé par ce module (cf. note
   * de tête de fichier), donc nolio-send-plan ne tenterait de toute façon
   * pas de générer un structured_workout chiffré — ce flag documente
   * explicitement l'intention si `structure` était réintroduit un jour.
   */
  noStructuredWorkout: true;
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

/**
 * Construit les séances Nolio du calendrier compact triathlon (16 jours),
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
          noStructuredWorkout: true,
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
        noStructuredWorkout: true,
      });
    });
  }
  return sessions;
}
