import { QA_PROFILES, type QAProfile, type QAProfileId } from "./syntheticProfiles";

/**
 * Préparation pilote Mode B (consigne coach) — les 5 profils validés,
 * dans l'ordre d'exécution décidé : débutant → 10 km → trail montagne →
 * marathon → Ironman (du moins coûteux au plus coûteux, pour détecter un
 * problème tôt avant d'engager le plus gros).
 */
export const PILOT_PROFILE_IDS: QAProfileId[] = [
  "B-STARTTORUN",
  "B-10K",
  "B-TRAIL-MOUNTAIN",
  "B-MARATHON",
  "B-IM",
];

function findProfile(id: QAProfileId): QAProfile {
  const p = QA_PROFILES.find((q) => q.id === id);
  if (!p) throw new Error(`Profil pilote introuvable dans QA_PROFILES: ${id}`);
  return p;
}

/** Les 5 profils, dans l'ordre pilote — lève une erreur explicite au
 *  chargement du module si l'un d'eux disparaît de QA_PROFILES (mieux
 *  qu'un plantage silencieux au clic). */
export const PILOT_PROFILES: QAProfile[] = PILOT_PROFILE_IDS.map(findProfile);
