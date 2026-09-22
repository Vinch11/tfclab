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
 */

export interface TestingWeekNolioSession {
  weekNumber: number;
  dayIndex: number; // 0-6, requis par nolio-send-plan
  sessionIndex: number;
  sport: string;
  title: string;
  objectif: string;
  details: string;
  structure: Array<{ part: string; zones: string[]; text: string }>;
  isRest: false;
  /**
   * `structure` sert uniquement à la description texte (nolio-send-plan
   * la lit pour le rendu 🔥/💪/🧘) — jamais à un structured_workout chiffré.
   * Chaque "part" ici encode une SÉQUENCE de plusieurs étapes minutées
   * (plusieurs lignes de warmup/main/recovery concaténées), pas une seule
   * consigne : le générateur d'intervalles de nolio-send-plan suppose une
   * part = une étape et produisait des durées/cibles fausses (bug réel
   * observé en prod — étapes dupliquées, mauvaises unités W/bpm) en tentant
   * de condenser toute la séquence en un seul step programmé.
   */
  noStructuredWorkout: true;
}

function formatStep(s: NormStep): string {
  const dur = s.durationMin < 1 ? `${Math.round(s.durationMin * 60)} s` : `${s.durationMin} min`;
  return `${dur} — ${s.intensityLabel}${s.notes ? ` (${s.notes})` : ""}`;
}

function stepsToText(steps: NormStep[]): string {
  return steps.map(formatStep).join("\n");
}

/** Construit la `structure` (parts échauffement/travail/récupération) d'un jour vélo/course. */
function dayToStructure(day: NormDay): Array<{ part: string; zones: string[]; text: string }> {
  const structure: Array<{ part: string; zones: string[]; text: string }> = [];

  if (day.warmup.length > 0) {
    structure.push({ part: "Échauffement", zones: [], text: stepsToText(day.warmup) });
  }

  const mainLines: string[] = [];
  if (day.main.length > 0) mainLines.push(stepsToText(day.main));
  if (day.pacingRules.length > 0) mainLines.push(`Règles de pacing :\n${day.pacingRules.map((r) => `- ${r}`).join("\n")}`);
  if (day.validityCriteria.length > 0) mainLines.push(`Critères de validité :\n${day.validityCriteria.map((r) => `- ${r}`).join("\n")}`);
  if (day.dataToRecord.length > 0) mainLines.push(`À enregistrer : ${day.dataToRecord.join(", ")}`);
  if (mainLines.length > 0) {
    structure.push({ part: "Travail", zones: [], text: mainLines.join("\n\n") });
  }

  if (day.recovery.length > 0) {
    structure.push({ part: "Récupération", zones: [], text: stepsToText(day.recovery) });
  }

  return structure;
}

/** Construit la `structure` du protocole natation (TFCL Pool Day™, format blocs). */
function swimStructure(): Array<{ part: string; zones: string[]; text: string }> {
  const p = getProtocolDef("pool-day");
  const [warmupBlock, ...restBlocks] = p.blocks;

  const structure: Array<{ part: string; zones: string[]; text: string }> = [];
  if (warmupBlock) {
    structure.push({
      part: "Échauffement",
      zones: [],
      text: `${warmupBlock.title} (${warmupBlock.duration})\n${warmupBlock.instructions.join("\n")}`,
    });
  }
  const mainLines = restBlocks.map((b) => `${b.title} (${b.duration})\n${b.instructions.join("\n")}`);
  if (p.results.length > 0) {
    mainLines.push(`Résultats à calculer : ${p.results.map((r) => r.metric).join(", ")}`);
  }
  if (mainLines.length > 0) {
    structure.push({ part: "Travail", zones: [], text: mainLines.join("\n\n") });
  }
  return structure;
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
          objectif: p.subtitle,
          details: p.subtitle,
          structure: swimStructure(),
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
        objectif: it.flag ? `${day.goal}\n\n⚠️ ${it.flag}` : day.goal,
        details: day.goal,
        structure: dayToStructure(day),
        isRest: false,
        noStructuredWorkout: true,
      });
    });
  }
  return sessions;
}
