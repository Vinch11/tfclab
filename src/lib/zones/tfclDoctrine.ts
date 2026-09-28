/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOCTRINE PHYSIOLOGIQUE TFCL — source unique des domaines d'intensité
 * ═══════════════════════════════════════════════════════════════════════════════
 * Ordre canonique (toujours croissant, jamais permuté) :
 *
 *   domaine modéré (≤ LT1) → allure/puissance IM → tempo → allure 70.3
 *       → allure marathon → sous-seuil norvégien → allure semi → LT2/MLSS
 *       → VO₂max → neuromusculaire
 *
 * Cadre scientifique : 3 domaines métaboliques (Poole & Jones 2016 ;
 * Jones et al. 2019) — MODÉRÉ (< LT1/GET), LOURD (LT1 → MLSS/CP), SÉVÈRE
 * (> MLSS/CP), + EXTRÊME (> tolérance VO₂max). Les zones TFCL en sont la
 * traduction ; les deux frontières physiologiques (LT1, MLSS) priment.
 * Si LT1 est MESURÉ (lactate, VT1, DFA-α1), il remplace la fraction par défaut.
 *
 * Règles :
 * 1. La PHYSIOLOGIE est la référence. Un domaine est défini par sa position
 *    relative au MLSS (vitesse seuil course / FTP vélo), jamais par un % VMA
 *    fixe : le % VMA du MLSS dépend de la VLamax et varie de ~80 à ~92 %.
 * 2. La ZONE TFCL (modèle 6 zones) est une TRADUCTION du domaine. Un domaine
 *    donné tombe toujours dans la même zone.
 * 3. Les AUTEURS (Seiler, Billat, Canova, Lydiard, Norvégien, Coggan,
 *    Rønnestad, Lorang…) sont des MÉTHODES de construction (structure,
 *    volume, récupération), jamais des définitions d'intensité. L'intensité
 *    d'une séance « norvégienne » ou « Canova » vient de ce tableau.
 * 4. Toute séance doit citer un DOMAINE ; les % affichés sont calculés à
 *    partir des repères de l'athlète.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { ZoneId6 } from "./zoneMapping";

export type DoctrineDomainId =
  | "recovery"
  | "moderate_lt1"
  | "tempo"
  | "im_pace"
  | "703_pace"
  | "marathon_pace"
  | "sub_threshold"
  | "semi_pace"
  | "mlss"
  | "vo2max"
  | "neuromuscular";

export interface FractionRange {
  /** Fraction de la référence seuil (1.00 = MLSS). */
  min: number;
  max: number;
}

export type MetabolicDomain = "moderate" | "heavy" | "severe" | "extreme";

export interface DoctrineDomain {
  id: DoctrineDomainId;
  /** Domaine métabolique (Poole & Jones). */
  metabolic: MetabolicDomain;
  /** Rang dans l'ordre canonique (croissant avec l'intensité). */
  rank: number;
  label: string;
  /** Repère physiologique qui définit le domaine. */
  anchor: string;
  /** Zone TFCL canonique (modèle 6 zones). */
  zone: ZoneId6;
  /** Fraction de la vitesse seuil course (null = non applicable / non piloté en allure). */
  run: FractionRange | null;
  /** Fraction de FTP (≈ MLSS) vélo. */
  bike: FractionRange | null;
  /** Synonymes acceptés dans les textes de séances (minuscules). */
  aliases: string[];
}

export const TFCL_DOCTRINE: DoctrineDomain[] = [
  {
    id: "recovery", rank: 0, metabolic: "moderate", label: "Récupération", zone: "Z1",
    anchor: "Sous LT1 — aucun stress métabolique",
    run: { min: 0, max: 0.75 }, bike: { min: 0, max: 0.55 },
    aliases: ["récupération", "recup", "footing récup"],
  },
  {
    id: "moderate_lt1", rank: 1, metabolic: "moderate", label: "Domaine modéré (≤ LT1 / FatMax)", zone: "Z2",
    anchor: "Jusqu'à LT1 et haut de la fenêtre FatMax",
    run: { min: 0.75, max: 0.82 }, bike: { min: 0.55, max: 0.75 },
    aliases: ["endurance fondamentale", "ef", "fatmax", "lt1", "z2"],
  },
  {
    id: "im_pace", rank: 2, metabolic: "heavy", label: "Allure / puissance Ironman", zone: "Z3",
    anchor: "À LT1 ou juste au-dessus (bas du domaine lourd) — tenable 3–8 h ; chez les moins entraînés, peut rester sous LT1",
    run: { min: 0.78, max: 0.85 }, bike: { min: 0.68, max: 0.76 },
    aliases: ["allure im", "puissance im", "allure ironman"],
  },
  {
    id: "tempo", rank: 3, metabolic: "heavy", label: "Tempo", zone: "Z3",
    anchor: "Entre LT1 et LT2 — lactate stable mais en hausse",
    run: { min: 0.82, max: 0.88 }, bike: { min: 0.76, max: 0.88 },
    aliases: ["tempo"],
  },
  {
    id: "703_pace", rank: 4, metabolic: "heavy", label: "Allure / puissance 70.3", zone: "Z3",
    anchor: "Haut du tempo — tenable ~1h30–2h30",
    run: { min: 0.85, max: 0.92 }, bike: { min: 0.78, max: 0.85 },
    aliases: ["allure 70.3", "puissance 70.3", "allure half"],
  },
  {
    id: "marathon_pace", rank: 5, metabolic: "heavy", label: "Allure marathon", zone: "Z4",
    anchor: "Bas du domaine seuil — tenable 2–4 h",
    run: { min: 0.88, max: 0.94 }, bike: null,
    aliases: ["allure marathon", "am"],
  },
  {
    id: "sub_threshold", rank: 6, metabolic: "heavy", label: "Sous-seuil (seuil bas norvégien)", zone: "Z4",
    anchor: "2–3 mmol/L — juste sous le MLSS, jamais LT1 (Casado 2022, Tjelta 2019)",
    run: { min: 0.92, max: 0.97 }, bike: { min: 0.88, max: 0.93 },
    aliases: ["seuil bas norvégien", "sous-seuil", "sub-threshold", "double seuil bas"],
  },
  {
    id: "semi_pace", rank: 7, metabolic: "heavy", label: "Allure semi-marathon", zone: "Z4",
    anchor: "Juste sous le MLSS — tenable ~1–2 h",
    run: { min: 0.95, max: 1.0 }, bike: null,
    aliases: ["allure semi", "as"],
  },
  {
    id: "mlss", rank: 8, metabolic: "heavy", label: "LT2 / MLSS", zone: "Z4",
    anchor: "MLSS ± 3 % — plus haut état stable de lactate",
    run: { min: 0.97, max: 1.03 }, bike: { min: 0.95, max: 1.03 },
    aliases: ["mlss", "seuil", "lt2", "seuil lactique", "ftp", "sweet spot haut"],
  },
  {
    id: "vo2max", rank: 9, metabolic: "severe", label: "VO₂max", zone: "Z5",
    anchor: "Au-dessus du MLSS jusqu'à vVO₂max / PMA",
    run: { min: 1.03, max: 1.2 }, bike: { min: 1.05, max: 1.3 },
    aliases: ["vo2max", "vma", "pma", "vvo2max"],
  },
  {
    id: "neuromuscular", rank: 10, metabolic: "extreme", label: "Neuromusculaire", zone: "Z6",
    anchor: "Au-dessus de vVO₂max — alactique / sprint",
    run: null, bike: null,
    aliases: ["sprint", "neuromusculaire", "alactique"],
  },
];

export function getDoctrineDomain(id: DoctrineDomainId): DoctrineDomain {
  const d = TFCL_DOCTRINE.find((x) => x.id === id);
  if (!d) throw new Error(`Domaine doctrine inconnu: ${id}`);
  return d;
}

/**
 * Convertit un domaine en % VMA pour un athlète donné.
 * Le % VMA n'est JAMAIS fixe : il dépend de la fraction MLSS/VMA de l'athlète.
 * Retourne null si la fraction seuil de l'athlète est inconnue (pas de défaut inventé).
 */
export function domainToPctVMA(
  id: DoctrineDomainId,
  mlssFractionOfVMA: number | null | undefined,
): FractionRange | null {
  const d = getDoctrineDomain(id);
  if (!d.run || !mlssFractionOfVMA || mlssFractionOfVMA <= 0) return null;
  return {
    min: Math.round(d.run.min * mlssFractionOfVMA * 1000) / 10,
    max: Math.round(d.run.max * mlssFractionOfVMA * 1000) / 10,
  };
}

/** Vérifie qu'une zone citée correspond bien à la zone canonique du domaine. */
export function isZoneConsistentWithDomain(id: DoctrineDomainId, zone: ZoneId6): boolean {
  return getDoctrineDomain(id).zone === zone;
}

/**
 * Frontière LT1 en fraction du seuil. Priorité : valeur MESURÉE de l'athlète
 * (lactate / VT1 / DFA-α1) ; sinon repère de population 0.82 (course) / 0.75 (vélo),
 * signalé comme estimé.
 */
export function resolveLT1Fraction(
  sport: "run" | "bike",
  measured?: number | null,
): { value: number; measured: boolean } {
  if (measured && measured > 0.5 && measured < 0.95) return { value: measured, measured: true };
  return { value: sport === "run" ? 0.82 : 0.75, measured: false };
}
