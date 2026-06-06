/**
 * Trail Session Alternatives
 * ----------------------------------------------------------------------
 * Pour chaque séance trail (montée, descente, SL avec D+, race-sim
 * montagne…), propose 2–3 façons de la réaliser hors montagne :
 *   • 🏔️ Montagne (référence — séance d'origine)
 *   • 🏙️ Parc / boucles vallonnées (urbain outdoor)
 *   • 🏃 Tapis incliné
 *   • 🦔 Hérisson — côtes courtes répétées (parking, talus, escaliers)
 *
 * Pure mapping statique : ne touche pas au moteur de génération du plan.
 * Détecte l'intention via mots-clés titre + détails, retourne [] si la
 * séance n'est pas pertinente (route plate, natation, vélo, repos…).
 */

export type TrailAltKind = "mountain" | "urban" | "treadmill" | "hedgehog";

export interface TrailAlternative {
  kind: TrailAltKind;
  icon: string;       // emoji court, rendu inline
  label: string;      // libellé court
  hint: string;       // équivalence pratique (D+, intensité)
}

const TRAIL_HINT = /(trail|d\+|deniv|dénivel|montée|montee|monte\b|descente|côte|cote\b|cotes\b|côtes|sentier|montagne|escalier|rando|verti(?:cal|kilo)|kmv)/i;

function detectKind(text: string):
  | "race_sim"
  | "long_run_dplus"
  | "vma_cote"
  | "seuil_cote"
  | "descente"
  | "endurance_dplus"
  | null
{
  const t = text.toLowerCase();
  if (!TRAIL_HINT.test(t)) return null;
  if (/race[\s-]?sim|simulation course|simul course/.test(t)) return "race_sim";
  if (/descente|excentr/.test(t)) return "descente";
  if (/vma|30\/30|15\/15|sprint.*côte|sprint.*cote|côtes? courtes?|cotes? courtes?/.test(t)) return "vma_cote";
  if (/seuil|tempo|sweet[\s-]?spot|sst\b|threshold/.test(t)) return "seuil_cote";
  if (/(sl\b|sortie longue|long run|endurance longue|\b2h|\b3h|\b4h)/.test(t)) return "long_run_dplus";
  return "endurance_dplus";
}

/**
 * Retourne les alternatives pour une séance donnée.
 * Renvoie [] si la séance n'est pas trail / pas pertinente.
 */
export function getTrailSessionAlternatives(input: {
  sport?: string;
  title?: string;
  details?: string;
}): TrailAlternative[] {
  const sport = (input.sport || "").toLowerCase();
  // On ne propose pas d'alternative pour vélo / natation / force / repos.
  if (/swim|natation|bike|v[ée]lo|repos|rest|muscu|force|renfo/.test(sport)) return [];

  const text = `${input.title ?? ""} ${input.details ?? ""}`.trim();
  const kind = detectKind(text);
  if (!kind) return [];

  const mountain: TrailAlternative = {
    kind: "mountain",
    icon: "🏔️",
    label: "Montagne (référence)",
    hint: "Terrain trail réel — version prescrite",
  };

  switch (kind) {
    case "race_sim":
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Parc / boucles vallonnées",
          hint: "Sac lesté + matériel jour J, viser le D+ hebdo cible",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis incliné",
          hint: "≤ 2 h 30 à 4–7 % incl. Z2 + test nutrition complet",
        },
      ];

    case "long_run_dplus":
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Parc / boucles vallonnées",
          hint: "Cumuler D+ par boucles répétées (≥ 2 h outdoor)",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis incliné progressif",
          hint: "≤ 2 h à 3–8 % incl. Z2 (au-delà : préférer outdoor)",
        },
      ];

    case "vma_cote":
      return [
        mountain,
        {
          kind: "hedgehog",
          icon: "🦔",
          label: "Hérisson — côtes courtes",
          hint: "8–12 × 30–60 s côte 6–10 %, récup descente facile",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis VMA inclinée",
          hint: "Fartlek 30/30 ou 1'/1' à 6–10 % incl., allure VMA",
        },
      ];

    case "seuil_cote":
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Côte longue urbaine",
          hint: "3–5 × 6–10 min Z3–Z4 sur côte 4–8 %, récup descente",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis seuil progressif",
          hint: "Bloc continu 20–40 min à 3–6 % incl. au seuil",
        },
      ];

    case "descente":
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Sentier vallonné / parc",
          hint: "Répétitions descentes 200–500 m en contrôle excentrique",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Salle — excentrique guidé",
          hint: "Si tapis ne descend pas : squats + step-down excentriques",
        },
      ];

    case "endurance_dplus":
    default:
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Parc / boucles vallonnées",
          hint: "Reproduire D+/h cible par cumul de petites bosses",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis incliné Z2",
          hint: "Incl. 3–6 % en continu pour solliciter la chaîne postérieure",
        },
      ];
  }
}
