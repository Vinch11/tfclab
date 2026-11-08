/**
 * Séances d'un plan IA → opérations planned Nolio V2 (pur, sans réseau).
 *
 * Un plan IA ne porte pas de structure DET minutée bloc par bloc : la séance
 * est envoyée avec son titre, sa durée et sa prescription complète en
 * description (texte exact du plan), et un seul pas minuté « sans cible » de
 * la durée de la séance — forme validée par Nolio en simulation. Aucune
 * allure, puissance ou zone n'est inventée ni recalculée ici.
 * Ce qui ne peut pas être représenté fidèlement ⇒ refus explicite.
 */
import { NOLIO_V2_CONTRACT, RACE_TITLE_PREFIX, raceIdentityOf, type MapResult, type NolioV2Refs, type PlanSessionInput, type V2Operation } from "./plannedMapper.ts";
import { isRealYmd } from "./localTime.ts";

const USR = /^usr_[A-Za-z0-9]+$/, SPT = /^spt_[A-Za-z0-9]+$/;
const MAX_DESCRIPTION = 8000;

/** Libellé de sport du plan → clé de sport TFCL utilisée par les correspondances Nolio. */
export function tfclSportKey(raw: string): string | null {
  const s = raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (!s) return null;
  if (/^(repos|rest|off)\b/.test(s)) return null;
  if (/brick|enchainement|combine/.test(s)) return "brick";
  if (/natation|swim|nage|piscine|eau libre/.test(s)) return "swim";
  if (/velo|cyclisme|bike|cycling|vtt|home.?trainer|ride/.test(s)) return "bike";
  if (/renfo|force|muscu|strength|gainage|ppg|mobilite|core/.test(s)) return "strength";
  if (/course|run|footing|trail|marche|cap\b|running/.test(s)) return "run";
  return null;
}

export function mapAiSessionsToNolioV2(sessions: PlanSessionInput[], refs: NolioV2Refs): MapResult {
  const operations: V2Operation[] = [];
  const refusals: MapResult["refusals"] = [];
  const refuse = (sessionKey: string, reason: string) => { refusals.push({ sessionKey, reason }); };
  if (!USR.test(refs.athleteId)) return { operations, refusals: [{ sessionKey: "*", reason: "athlete_reference_not_opaque" }] };
  const seen = new Set<string>();
  for (const s of sessions) {
    if (s.isRest) continue;
    if (seen.has(s.sessionKey)) { refuse(s.sessionKey, "duplicate_session_key"); continue; }
    seen.add(s.sessionKey);
    if (!isRealYmd(s.date)) { refuse(s.sessionKey, "date_invalid"); continue; }
    const name = (s.title ?? "").trim().slice(0, 200);
    if (!name) { refuse(s.sessionKey, "title_missing"); continue; }
    const key = tfclSportKey(s.sport ?? "");
    if (!key) { refuse(s.sessionKey, `sport_unrecognized:${String(s.sport ?? "").slice(0, 30)}`); continue; }
    const sport = refs.sportIds[key];
    if (!sport || !SPT.test(sport)) { refuse(s.sessionKey, `sport_reference_missing:${key}`); continue; }
    // Course objectif du plan : créée comme compétition (nom + date), sans recette.
    if (name.startsWith(RACE_TITLE_PREFIX)) {
      const race = raceIdentityOf({ ...s, catalogId: null });
      if (!race) { refuse(s.sessionKey, "race_identity_invalid"); continue; }
      operations.push({ kind: "competition", path: NOLIO_V2_CONTRACT.competitionsPath, sessionKey: s.sessionKey, sourceId: null,
        body: { name: race.name, date_start: race.date, sport, athletes: [refs.athleteId] }, precisionNotes: [] });
      continue;
    }
    const minutes = typeof s.durationMin === "number" && Number.isFinite(s.durationMin) ? Math.round(s.durationMin) : null;
    if (minutes === null || minutes <= 0 || minutes > 24 * 60) { refuse(s.sessionKey, "duration_unknown"); continue; }
    const description = (s.details ?? "").trim().slice(0, MAX_DESCRIPTION);
    const body: Record<string, unknown> = {
      name, date_start: s.date, sport, athletes: [refs.athleteId],
      duration: { value: minutes, unit: "min" },
      workout: [{ kind: "step", duration: { value: minutes * 60, unit: "s" }, targets: [{ type: "no_target" }] }],
      ...(description ? { description } : {}),
    };
    operations.push({ kind: "training", path: NOLIO_V2_CONTRACT.trainingsPath, sessionKey: s.sessionKey, sourceId: s.catalogId || "ai-plan",
      body, precisionNotes: ["séance IA : prescription complète en description, un seul pas minuté sans cible"] });
  }
  return { operations, refusals };
}
