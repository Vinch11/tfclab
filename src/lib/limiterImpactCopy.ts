/**
 * Pourquoi c'est important ? — Copy pédagogique par limiteur
 *
 * Format hybride :
 *  - sentence1 : phrase concrète terrain ("Tu cales en bosse longue.")
 *  - sentence2 : mécanisme physiologique vulgarisé ("Ton système aérobie ne soutient pas...")
 *
 * Aucune logique de calcul ici — uniquement du contenu éditorial.
 */

import type { UnifiedLimiter } from "@/lib/v2/unifiedLimiterDetection";

export interface LimiterImpactCopy {
  /** Phrase 1 — sensation terrain, tutoiement, exemple concret */
  sentence1: string;
  /** Phrase 2 — mécanisme physiologique vulgarisé */
  sentence2: string;
  /** Couleur d'accent sémantique (token Tailwind) */
  accent: "destructive" | "warning" | "primary" | "muted";
}

export const LIMITER_IMPACT_COPY: Record<UnifiedLimiter, LimiterImpactCopy> = {
  aerobic_engine: {
    sentence1:
      "Tu plafonnes dès que l'effort dépasse ~20 minutes en zone soutenue : la cadence baisse, la respiration s'emballe.",
    sentence2:
      "Ton moteur aérobie (VO2max / FTP par kilo) ne fournit pas assez d'énergie en continu, donc l'organisme bascule trop tôt sur les sucres et accumule du lactate.",
    accent: "destructive",
  },
  glycolytic: {
    sentence1:
      "Tu brûles tes réserves de glycogène très vite, surtout sur les relances et les côtes : sensations de jambes lourdes après 1h-2h.",
    sentence2:
      "Ta VLamax élevée traduit une glycolyse trop active : à intensité modérée, tu consommes déjà beaucoup de glucides au lieu d'utiliser les graisses, ce qui limite ton endurance et ta nutrition de course.",
    accent: "warning",
  },
  anaerobic_capacity: {
    sentence1:
      "Tu manques de punch sur les attaques courtes (<2 min) ou au contraire tu \"explose\" trop vite après une relance.",
    sentence2:
      "Ta capacité anaérobie (W') est désajustée par rapport à ton objectif : la réserve d'énergie au-dessus du seuil est soit trop faible, soit mal calibrée pour la discipline visée.",
    accent: "warning",
  },
  specific_endurance: {
    sentence1:
      "Tu tiens bien 20-40 min mais tu décroches nettement au-delà : la puissance chute, les jambes \"mollissent\" sans être en surrégime cardiaque.",
    sentence2:
      "Ton TTE (Time-to-Exhaustion au seuil) est court : ton seuil existe, mais tu ne peux pas le maintenir longtemps, faute de volume aérobie spécifique accumulé.",
    accent: "destructive",
  },
  metabolic_efficiency: {
    sentence1:
      "Tu \"sautes le mur\" facilement en sortie longue, et tu dois t'alimenter beaucoup pour tenir au-delà de 2h-3h.",
    sentence2:
      "Ton FatMax est bas : à intensité endurance, tu utilises trop peu les graisses comme carburant, donc tu épuises tes glucides plus vite et tu deviens dépendant de la nutrition.",
    accent: "warning",
  },
  availability: {
    sentence1:
      "Sur le papier ton moteur est correct, mais à l'entraînement tu n'arrives pas à exprimer ton vrai niveau : sensations lourdes, sommeil dégradé, motivation en baisse.",
    sentence2:
      "Ta disponibilité (fatigue, stress, récupération) plafonne ta capacité d'adaptation : tant qu'elle n'est pas restaurée, augmenter la charge produira plus de fatigue que de progrès.",
    accent: "muted",
  },
  neuromuscular: {
    sentence1:
      "À puissance ou allure égale, tu fatigues plus vite que les autres : geste moins fluide, coût énergétique élevé, surtout en fin de séance.",
    sentence2:
      "Ton économie / force neuromusculaire limite ta performance : pour produire la même puissance, tu dépenses plus d'énergie, ce qui pénalise toutes les autres qualités.",
    accent: "warning",
  },
  none: {
    sentence1:
      "Aucun limiteur clair ne ressort : ton profil est équilibré sur les 5 axes physiologiques.",
    sentence2:
      "Dans cette configuration, la progression vient surtout de la spécificité (gestes, allures cible) et du volume bien dosé, plutôt que de la correction d'une faiblesse.",
    accent: "primary",
  },
};

export function getLimiterImpactCopy(limiter: UnifiedLimiter | string | null | undefined): LimiterImpactCopy {
  if (!limiter || !(limiter in LIMITER_IMPACT_COPY)) {
    return LIMITER_IMPACT_COPY.none;
  }
  return LIMITER_IMPACT_COPY[limiter as UnifiedLimiter];
}
