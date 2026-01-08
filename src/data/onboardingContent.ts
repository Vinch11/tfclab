// =============================================
// CONTENU ADAPTATIF ONBOARDING
// =============================================

import type { UserRole } from "@/types/profile";

export interface OnboardingScreen {
  title: string;
  text: string;
}

export interface OnboardingContent {
  screens: OnboardingScreen[];
}

const contentByRole: Record<UserRole, OnboardingContent> = {
  ATHLETE_LOISIR: {
    screens: [
      {
        title: "Mieux comprendre ton corps",
        text: "Ton corps réagit différemment selon ton entraînement, ton rythme de vie et ton objectif. Two For Coaching Lab t'aide à comprendre comment tu produis ton énergie et comment progresser sans te mettre en difficulté.",
      },
      {
        title: "Être prêt, sans se griller",
        text: "L'app t'indique si ton entraînement est cohérent avec ton objectif et t'alerte quand il vaut mieux ajuster pour éviter fatigue ou blessure.",
      },
      {
        title: "Avancer avec ton coach",
        text: "L'application ne décide pas à ta place. Elle t'aide à comprendre ce que tu fais et à mieux échanger avec ton coach.",
      },
    ],
  },
  ATHLETE_ELITE: {
    screens: [
      {
        title: "Connaître ton profil énergétique",
        text: "La performance ne dépend pas d'un seul chiffre. L'app analyse ton profil glycolytique (VLamax) et ta capacité à soutenir l'effort (TTE) pour aligner physiologie et performance.",
      },
      {
        title: "Évaluer ta Race Readiness réelle",
        text: "Être fort à l'entraînement ne garantit rien le jour J. La Race Readiness évalue si ton profil physiologique est réellement adapté à ta distance et à ta charge actuelle.",
      },
      {
        title: "Une aide à la décision",
        text: "Two For Coaching Lab n'impose aucun plan. Elle apporte de la clarté pour faire les bons choix, au bon moment.",
      },
    ],
  },
  STAFF_COACH: {
    screens: [
      {
        title: "Lecture physiologique exploitable",
        text: "Two For Coaching Lab centralise VLamax effectif, TTE effectif et leur cohérence avec l'objectif sportif pour une analyse fiable et traçable.",
      },
      {
        title: "Race Readiness comme outil décisionnel",
        text: "La Race Readiness met en évidence incohérences, risques et marges de progression pour éclairer — jamais remplacer — la décision du coach.",
      },
      {
        title: "Transparence et responsabilité",
        text: "Aucune action n'est automatisée sans validation. Chaque recommandation est expliquée, traçable et modifiable par le staff.",
      },
    ],
  },
};

export function getOnboardingContent(role: UserRole): OnboardingContent {
  return contentByRole[role];
}
