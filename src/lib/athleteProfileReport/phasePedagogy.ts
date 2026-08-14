/**
 * Pédagogie des blocs de planification (Rapport Profil Athlète)
 * ------------------------------------------------------------
 * Couche 100 % présentation : traduit une phase de la roadmap stratégique
 * (`src/lib/v2/strategicRoadmap.ts`) en explications compréhensibles par
 * l'athlète : pourquoi ce bloc existe, comment on va concrètement le
 * travailler (séances types issues des leviers actifs), et ce qu'il doit
 * ressentir / observer pour savoir que ça marche.
 *
 * Aucune logique physiologique n'est recalculée ici : on ne fait que
 * verbaliser les leviers et cibles déjà produits par le moteur.
 */

import type { ReportPhase } from "./types";

export interface PhasePedagogy {
  /** Pourquoi ce bloc, à quoi il sert dans la progression globale. */
  why: string;
  /** Comment on va travailler ça, concrètement (séances types). */
  how: string[];
  /** Signaux de réussite / ce que l'athlète doit ressentir. */
  feel: string;
  /** Erreur classique à éviter pendant ce bloc. */
  pitfall: string;
}

/** Dictionnaire levier → traduction concrète en séance. */
const LEVER_HOWTO: { match: RegExp; text: string }[] = [
  {
    match: /vo2\s*max|intervalles longs/i,
    text: "**Intervalles VO₂max** : des efforts de 3 à 5 min très soutenus (proche du maximum tenable), séparés de récupérations presque aussi longues. Objectif : passer du temps « au plafond » pour élever ta cylindrée aérobie.",
  },
  {
    match: /sprint ban|sprint.*⛔/i,
    text: "**Sprints supprimés (Sprint Ban)** : on retire volontairement les démarrages explosifs et les sprints. Ils entretiennent ta production de lactate, précisément ce qu'on cherche à faire baisser.",
  },
  {
    match: /sprints?( courts| neuromusculaires)?$|puissance max/i,
    text: "**Sprints courts** : 8 à 12 s à fond, récupération très longue. On travaille le recrutement nerveux et la puissance maximale, sans fatigue métabolique.",
  },
  {
    match: /sfr|force endurance|endurance de force/i,
    text: "**Force endurance (SFR / côtes à basse cadence)** : rouler ou courir en résistance, cadence basse, fréquence cardiaque contenue. On muscle la fibre sans casser la fraîcheur.",
  },
  {
    match: /sweet spot/i,
    text: "**Sweet Spot** : blocs de 10 à 20 min juste sous ton seuil. C'est le meilleur rapport bénéfice/fatigue pour élever le seuil sans coût nerveux.",
  },
  {
    match: /ftp intervals|seuil$|tempo(?! prolongé| long)/i,
    text: "**Séances au seuil** : 2 à 4 blocs de 8 à 20 min à l'allure/puissance seuil. C'est le cœur du développement de ta capacité à tenir vite longtemps.",
  },
  {
    match: /tempo prolongé|tempo long|progression runs/i,
    text: "**Tempo prolongé** : un seul bloc long (25 à 60 min) à intensité contenue mais continue. C'est la séance qui allonge ta durabilité (TTE).",
  },
  {
    match: /z2|volume z2|base|endurance fondamentale/i,
    text: "**Volume en Z2** : sorties longues en aisance respiratoire, où tu peux parler. C'est ce qui construit les mitochondries et l'utilisation des graisses — la fondation de tout le reste.",
  },
  {
    match: /train low|à jeun|jeûne/i,
    text: "**Train Low / sorties à jeun** : quelques séances faciles réalisées avec des réserves de glucides basses, pour forcer le corps à mieux utiliser les graisses. Toujours à faible intensité, jamais avant une séance dure.",
  },
  {
    match: /gut training|nutrition périodisée/i,
    text: "**Gut training** : on entraîne l'estomac à absorber les glucides à l'effort (montée progressive en g/h) pour que la stratégie nutritionnelle du jour J passe sans incident.",
  },
  {
    match: /race pace|allure cible|marathon pace|half marathon pace|allure marathon|allure semi/i,
    text: "**Allure course cible** : des fractions à l'intensité exacte de ta course, de plus en plus longues. C'est ce qui rend l'allure du jour J « familière » plutôt que subie.",
  },
  {
    match: /brique|brick/i,
    text: "**Briques vélo→course** : enchaîner une course juste après le vélo. On habitue les jambes à la transition, là où se perdent le plus de minutes en triathlon.",
  },
  {
    match: /race sim|simulation|dress rehearsal/i,
    text: "**Répétition générale** : une séance qui reproduit les conditions de course (horaire, matériel, nutrition, allure). On valide la stratégie avant qu'elle compte.",
  },
  {
    match: /long runs?|sorties? longues?/i,
    text: "**Sorties longues progressives** : on allonge la durée d'abord, puis on injecte de l'allure course sur la fin. C'est là que se construit la résistance à la fatigue.",
  },
  {
    match: /hill|côtes/i,
    text: "**Répétitions en côte** : effort en montée, retour en récupération. Force spécifique et économie de course, avec moins d'impact qu'une séance de vitesse à plat.",
  },
  {
    match: /force max|plyo/i,
    text: "**Force max & pliométrie** : charges lourdes à faible répétition et sauts. On améliore la raideur du tendon et donc l'économie — tu vas plus vite pour le même coût.",
  },
  {
    match: /cadence|drills|technique/i,
    text: "**Éducatifs & cadence** : blocs techniques courts pour améliorer la fréquence de pas et la propreté du geste. Peu coûteux, très rentables sur l'économie.",
  },
  {
    match: /fartlek|strides|lignes droites|vélocité/i,
    text: "**Fartlek / lignes droites** : accélérations courtes et libres à l'intérieur d'une sortie facile. Entretien de la vitesse sans séance dure supplémentaire.",
  },
  {
    match: /taper|affûtage/i,
    text: "**Affûtage** : on réduit fortement le volume (‑40 à ‑60 %) tout en gardant un peu d'intensité. La fatigue tombe plus vite que la forme : c'est là que la performance apparaît.",
  },
  {
    match: /opener/i,
    text: "**Openers** : séance très courte, quelques accélérations à intensité de course, la veille ou l'avant-veille. Ça réveille le système nerveux sans fatiguer.",
  },
];

/** Générique par position de phase quand aucun levier n'a matché. */
const FALLBACK_HOW: Record<number, string> = {
  0: "**Travail de base structuré** : régularité avant intensité, on installe les habitudes et le volume soutenable.",
  1: "**Montée en charge progressive** : on ajoute une séance qualitative par semaine, en gardant le volume facile.",
  2: "**Spécificité** : les séances clés reproduisent de plus en plus les contraintes de ta course.",
  3: "**Récupération active** : moins de volume, on garde des rappels d'intensité très courts.",
};

const WHY_BY_INDEX: Record<number, string> = {
  0: "C'est le bloc de **fondation**. On ne cherche pas encore la performance : on installe le socle (volume soutenable, qualités de base) sur lequel tout le reste va s'appuyer. Sauter cette étape, c'est construire vite… puis plafonner.",
  1: "C'est le bloc de **transformation**. Les qualités développées au bloc précédent sont converties en capacité utile : tenir plus fort, plus longtemps. C'est généralement le bloc le plus exigeant du plan.",
  2: "C'est le bloc **spécifique**. Tout converge vers ta course : les intensités, les durées, la nutrition, le matériel. Ce que tu répètes ici est exactement ce que tu feras le jour J.",
  3: "C'est le bloc d'**affûtage**. On ne gagne plus de forme, on révèle celle qui est déjà là en laissant tomber la fatigue accumulée. La tentation de « rassurer » avec des grosses séances est le piège classique.",
};

const FEEL_BY_INDEX: Record<number, string> = {
  0: "Tu dois finir ce bloc en te sentant **plus solide que fatigué** : les sorties faciles deviennent plus faciles à la même allure, et la fréquence cardiaque baisse pour un même effort.",
  1: "Attends-toi à des semaines **franchement fatigantes**, avec une récupération qui redevient bonne après chaque semaine allégée. Si la fatigue ne redescend jamais, on ajuste.",
  2: "L'allure de course doit progressivement passer de « difficile » à **« contrôlable »**. C'est le meilleur indicateur que le bloc fonctionne.",
  3: "Sensation de **jambes qui reviennent**, parfois d'ennui ou de fausse lourdeur en milieu de bloc : c'est normal et attendu. La fraîcheur arrive dans les tout derniers jours.",
};

const PITFALL_BY_INDEX: Record<number, string> = {
  0: "Vouloir aller trop vite sur les sorties faciles. Le bénéfice de ce bloc vient de l'intensité **basse**, pas de l'effort.",
  1: "Enchaîner deux séances dures sans jour facile entre les deux. La charge de ce bloc ne pardonne pas l'improvisation.",
  2: "Ajouter du volume « au cas où ». À ce stade, la spécificité prime sur la quantité.",
  3: "Faire une dernière grosse séance pour se rassurer. Elle ne peut plus rien apporter, mais elle peut coûter la course.",
};

function phaseSlot(phase: ReportPhase, total: number): number {
  const idx = Math.max(0, (phase.id || 1) - 1);
  if (total <= 4) return Math.min(idx, 3);
  // Plans avec plus de 4 blocs : on ramène sur les 4 archétypes.
  return Math.min(3, Math.round((idx / Math.max(1, total - 1)) * 3));
}

export function buildPhasePedagogy(phase: ReportPhase, totalPhases: number): PhasePedagogy {
  const slot = phaseSlot(phase, totalPhases);

  const how: string[] = [];
  const seen = new Set<string>();
  for (const lever of phase.levers || []) {
    const entry = LEVER_HOWTO.find((l) => l.match.test(lever));
    if (entry && !seen.has(entry.text)) {
      seen.add(entry.text);
      how.push(entry.text);
    }
    if (how.length >= 4) break;
  }
  if (how.length === 0) how.push(FALLBACK_HOW[slot]);

  return {
    why: WHY_BY_INDEX[slot],
    how,
    feel: FEEL_BY_INDEX[slot],
    pitfall: PITFALL_BY_INDEX[slot],
  };
}
