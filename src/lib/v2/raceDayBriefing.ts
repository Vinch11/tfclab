/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE DAY BRIEFING™ — Communication Athlète Jour J
 * Two For Coaching Lab Method™
 * 
 * CONCEPT:
 * Génère un briefing simplifié, non technique, pour l'athlète le jour de la course.
 * Zéro jargon physiologique, zéro prescription, uniquement du cadrage intelligent.
 * 
 * STRUCTURE:
 * 1. Message clé personnalisé
 * 2. Couloir de course simplifié (sans %)
 * 3. Règles d'or (max 5)
 * 4. Erreurs à éviter
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective } from "./pacingEnvelopeEngine";
import type { DisciplineRulesResult } from "./pacingDisciplineRules";
import type { ScenarioSimulationResult } from "./pacingScenarioSimulator";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AthleteBriefingInput {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  rules: DisciplineRulesResult;
  scenarios: ScenarioSimulationResult;
  raceObjective: RaceObjective;
  potentielPhysiologiqueScore: number | null;
}

export interface KeyMessage {
  title: string;
  message: string;
  tone: "confident" | "cautious" | "encouraging";
  icon: string;
}

export interface GoldenRule {
  id: string;
  text: string;
  isMemorizable: boolean;
}

export interface CriticalError {
  id: string;
  title: string;
  explanation: string;
  icon: string;
}

export interface SimplifiedZone {
  name: string;
  color: "green" | "orange" | "red";
  label: string;
  description: string;
}

export interface RaceDayBriefingResult {
  // Bloc 1: Message clé
  keyMessage: KeyMessage;
  
  // Bloc 2: Couloir simplifié
  zones: SimplifiedZone[];
  corridorPhrase: string;
  showNumbers: boolean; // Toggle pour afficher les %
  
  // Bloc 3: Règles d'or (max 5)
  goldenRules: GoldenRule[];
  
  // Bloc 4: Erreurs à éviter
  criticalErrors: CriticalError[];
  
  // Métadonnées
  athleteName: string;
  raceObjective: RaceObjective;
  generatedAt: string;
  printable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_MESSAGES = {
  sensitive_profile: {
    title: "Ce qui fera ta performance aujourd'hui",
    messages: [
      "Ta force aujourd'hui, c'est la discipline.",
      "Tu es très efficient… mais peu tolérant aux erreurs.",
      "Si tu respectes le plan, tu seras fort à la fin.",
    ],
    tone: "cautious" as const,
    icon: "🎯",
  },
  balanced_profile: {
    title: "Ce qui fera ta performance aujourd'hui",
    messages: [
      "Ta constance sera ta meilleure arme.",
      "Le plan est simple : discipline au début, force à la fin.",
      "Fais confiance au processus, pas aux sensations.",
    ],
    tone: "confident" as const,
    icon: "💪",
  },
  low_readiness: {
    title: "Message du jour",
    messages: [
      "Aujourd'hui, la robustesse prime sur l'ambition.",
      "L'objectif est de finir fort, pas de partir fort.",
      "Ta meilleure stratégie : prudence et régularité.",
    ],
    tone: "cautious" as const,
    icon: "🛡️",
  },
  high_readiness: {
    title: "Ce qui fera ta performance aujourd'hui",
    messages: [
      "Tu es prêt. Maintenant, respecte le plan.",
      "L'état est optimal — ne gâche pas avec un départ trop rapide.",
      "La discipline transformera ta préparation en performance.",
    ],
    tone: "encouraging" as const,
    icon: "🚀",
  },
};

const RACE_CORRIDOR_PHRASES: Record<RaceObjective, string> = {
  IM: "Rester dans le vert pendant tout le vélo est la clé du marathon.",
  "70.3": "Rester dans le vert au début, c'est construire ta performance finale.",
  Marathon: "Les 10 premiers kilomètres dans le vert = les 10 derniers dans la force.",
  Semi: "Rester dans le vert les 15 premiers km, puis libérer.",
  "10km": "2 premiers kilomètres dans le vert, puis progression contrôlée.",
};

const GOLDEN_RULE_TEMPLATES = [
  { id: "first_30", text: "Les 30 premières minutes sont non négociables.", memorizable: true },
  { id: "hesitate_slow", text: "Si tu dois hésiter → ralentis.", memorizable: true },
  { id: "let_go", text: "Laisse partir ceux qui vont trop vite.", memorizable: true },
  { id: "race_starts_mid", text: "Ta course commence après la mi-parcours.", memorizable: true },
  { id: "discipline_advantage", text: "La discipline est ton avantage.", memorizable: true },
  { id: "trust_plan", text: "Fais confiance au plan, pas aux sensations.", memorizable: true },
  { id: "finish_strong", text: "Finir fort vaut mieux que partir fort.", memorizable: true },
];

const ERROR_TEMPLATES = [
  {
    id: "follow_group",
    title: "Suivre un groupe trop rapide",
    explanation: "Cette erreur coûte plus qu'elle ne rapporte.",
    icon: "👥",
  },
  {
    id: "compensate_sensation",
    title: "Compenser une mauvaise sensation par de la puissance",
    explanation: "Les sensations mentent souvent au début. Le plan, non.",
    icon: "💭",
  },
  {
    id: "seek_early_sensation",
    title: "Chercher des sensations trop tôt",
    explanation: "Les bonnes sensations viennent plus tard, pas au départ.",
    icon: "⚡",
  },
  {
    id: "panic_behind",
    title: "Paniquer si tu es 'derrière'",
    explanation: "Le classement au premier tiers ne veut rien dire.",
    icon: "😰",
  },
  {
    id: "race_others",
    title: "Courir contre les autres au lieu de ton plan",
    explanation: "Ta seule course est contre ton enveloppe.",
    icon: "🏃",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère le briefing Jour J pour l'athlète
 */
export function generateRaceDayBriefing(input: AthleteBriefingInput): RaceDayBriefingResult {
  const { athleteName, envelope, rules, scenarios, raceObjective, potentielPhysiologiqueScore } = input;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // BLOC 1: Message clé
  // ─────────────────────────────────────────────────────────────────────────────
  type MessageConfig = {
    title: string;
    messages: string[];
    tone: KeyMessage["tone"];
    icon: string;
  };
  
  let messageConfig: MessageConfig = KEY_MESSAGES.balanced_profile;
  
  if (envelope.pacingProfile.type === "sensitive") {
    messageConfig = KEY_MESSAGES.sensitive_profile;
  } else if (potentielPhysiologiqueScore != null && potentielPhysiologiqueScore < 70) {
    messageConfig = KEY_MESSAGES.low_readiness;
  } else if (potentielPhysiologiqueScore != null && potentielPhysiologiqueScore >= 85) {
    messageConfig = KEY_MESSAGES.high_readiness;
  }
  
  const randomMessage = messageConfig.messages[Math.floor(Math.random() * messageConfig.messages.length)];
  
  const keyMessage: KeyMessage = {
    title: messageConfig.title,
    message: randomMessage,
    tone: messageConfig.tone,
    icon: messageConfig.icon,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOC 2: Couloir simplifié
  // ─────────────────────────────────────────────────────────────────────────────
  const zones: SimplifiedZone[] = [
    {
      name: "Zone verte",
      color: "green",
      label: "Ta zone idéale",
      description: "C'est ici que tu dois passer le plus de temps possible.",
    },
    {
      name: "Zone orange",
      color: "orange",
      label: "Tolérable mais à limiter",
      description: "Passages brefs acceptés, mais retour rapide au vert.",
    },
    {
      name: "Zone rouge",
      color: "red",
      label: "À éviter absolument",
      description: "Chaque seconde ici te coûte cher plus tard.",
    },
  ];
  
  const corridorPhrase = RACE_CORRIDOR_PHRASES[raceObjective] || 
    "Rester dans le vert au début est une stratégie gagnante.";

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOC 3: Règles d'or (max 5)
  // ─────────────────────────────────────────────────────────────────────────────
  const goldenRulesSelection = selectGoldenRules(envelope, raceObjective, potentielPhysiologiqueScore);
  
  const goldenRules: GoldenRule[] = goldenRulesSelection.slice(0, 5).map(r => ({
    id: r.id,
    text: r.text,
    isMemorizable: r.memorizable,
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // BLOC 4: Erreurs à éviter
  // ─────────────────────────────────────────────────────────────────────────────
  const criticalErrors = selectCriticalErrors(envelope, scenarios);

  // ─────────────────────────────────────────────────────────────────────────────
  // Résultat final
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    keyMessage,
    zones,
    corridorPhrase,
    showNumbers: false, // Par défaut, pas de chiffres
    goldenRules,
    criticalErrors,
    athleteName,
    raceObjective,
    generatedAt: new Date().toISOString(),
    printable: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function selectGoldenRules(
  envelope: PacingEnvelopeResult,
  raceObjective: RaceObjective,
  potentielPhysiologiqueScore: number | null
): Array<{ id: string; text: string; memorizable: boolean }> {
  const selected: Array<{ id: string; text: string; memorizable: boolean }> = [];
  
  // Toujours inclure "30 premières minutes"
  selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "first_30")!);
  
  // Si profil sensible, ajouter discipline
  if (envelope.pacingProfile.type === "sensitive") {
    selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "discipline_advantage")!);
  }
  
  // Ajouter "laisser partir"
  selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "let_go")!);
  
  // Si readiness faible, ajouter finir fort
  if (potentielPhysiologiqueScore != null && potentielPhysiologiqueScore < 75) {
    selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "finish_strong")!);
  } else {
    selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "race_starts_mid")!);
  }
  
  // Ajouter une règle finale
  if (!selected.find(r => r.id === "hesitate_slow")) {
    selected.push(GOLDEN_RULE_TEMPLATES.find(r => r.id === "hesitate_slow")!);
  }
  
  // Dédupliquer
  return [...new Map(selected.filter(Boolean).map(r => [r.id, r])).values()];
}

function selectCriticalErrors(
  envelope: PacingEnvelopeResult,
  scenarios: ScenarioSimulationResult
): CriticalError[] {
  const errors: CriticalError[] = [];
  
  // Toujours inclure "suivre un groupe"
  errors.push(ERROR_TEMPLATES.find(e => e.id === "follow_group")!);
  
  // Si profil sensible, ajouter "compenser par puissance"
  if (envelope.pacingProfile.type === "sensitive") {
    errors.push(ERROR_TEMPLATES.find(e => e.id === "compensate_sensation")!);
  }
  
  // Ajouter une erreur liée aux scénarios critiques
  if (scenarios.criticalScenarios.length > 0) {
    errors.push(ERROR_TEMPLATES.find(e => e.id === "seek_early_sensation")!);
  } else {
    errors.push(ERROR_TEMPLATES.find(e => e.id === "panic_behind")!);
  }
  
  return errors.filter(Boolean).slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getToneColor(tone: KeyMessage["tone"]): string {
  switch (tone) {
    case "confident":
      return "text-green-600 dark:text-green-400";
    case "cautious":
      return "text-orange-600 dark:text-orange-400";
    case "encouraging":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-foreground";
  }
}

export function getToneBgColor(tone: KeyMessage["tone"]): string {
  switch (tone) {
    case "confident":
      return "bg-green-100 dark:bg-green-900/30";
    case "cautious":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "encouraging":
      return "bg-blue-100 dark:bg-blue-900/30";
    default:
      return "bg-muted";
  }
}

export function getZoneColorClass(color: SimplifiedZone["color"]): string {
  switch (color) {
    case "green":
      return "bg-green-500";
    case "orange":
      return "bg-orange-500";
    case "red":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function getZoneBorderClass(color: SimplifiedZone["color"]): string {
  switch (color) {
    case "green":
      return "border-green-500";
    case "orange":
      return "border-orange-500";
    case "red":
      return "border-red-500";
    default:
      return "border-gray-500";
  }
}
