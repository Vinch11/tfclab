// src/data/staffSessions.ts
// =============================================
// VINCE'S LAB — STAFF READY SESSIONS (v1)
// 30 séances (10 vélo / 10 course / 10 natation)
// Source: bibliothèque "staff ready" (interne)
// =============================================

export type SportType = "velo" | "course" | "natation";
export type SessionTag =
  | "VLAMAX"
  | "TTE"
  | "FTP"
  | "ENDURANCE"
  | "SPECIFIC"
  | "NEURO"
  | "RECOVERY"
  | "METABOLIC"
  | "RACE_SIM";

export type SessionLevel = "staff" | "standard";

export interface StaffSession {
  id: string;
  sport: SportType;
  title: string;

  // "Pourquoi / quand / comment" (staff-ready)
  objective: string;
  why: string;
  when: string;
  structure: string;

  // Staff notes
  indicators: string[];
  risks: string[];

  // Meta
  tags: SessionTag[];
  level: SessionLevel;
  duration_min?: number; // approx
}

// -----------------------------
// DATASET
// -----------------------------
export const STAFF_SESSIONS: StaffSession[] = [
  // ============================
  // 🚴‍♂️ VÉLO (10)
  // ============================
  {
    id: "bike_01_vlamax_down_foundation",
    sport: "velo",
    title: "Réduction VLamax — Fondatrice",
    objective: "Réduire la contribution glycolytique excessive (VLamax) et améliorer l'efficacité aérobie.",
    why: "Moins de glycolyse = meilleure soutenabilité, moindre coût énergétique, pacing plus stable (IM/70.3).",
    when: "Build / spécifique long. 1x/sem max (ou 1x/10j) selon fatigue.",
    structure:
      "Échauffement 20' Z2 + 3×30' @ 88–92% FTP (récup 5') + Retour au calme 10–15'.",
    indicators: [
      "FC stable / dérive limitée",
      "RPE modéré et contrôlé",
      "Cadence stable, pas de dérive de puissance"
    ],
    risks: [
      "Séance lourde si TTE faible",
      "Accumulation fatigue si enchaînée avec VO2 / sprints"
    ],
    tags: ["VLAMAX", "ENDURANCE", "SPECIFIC"],
    level: "staff",
    duration_min: 120
  },
  {
    id: "bike_02_tte_extension",
    sport: "velo",
    title: "Extension TTE FTP — Consolidation",
    objective: "Allonger la durée soutenable proche FTP (TTE).",
    why: "TTE élevé = puissance durable, meilleur maintien d'allure en fin de course.",
    when: "Spécifique IM/70.3. 1x/7–10j.",
    structure:
      "Échauffement 20' + 2×25–40' @ 95–100% FTP (récup 5') + Retour au calme 10'.",
    indicators: [
      "Puissance stable sur la fin",
      "FC dérive faible",
      "RPE en hausse progressive mais contrôlée"
    ],
    risks: [
      "Charge nerveuse élevée",
      "À éviter si sommeil/stress mauvais"
    ],
    tags: ["TTE", "FTP", "SPECIFIC"],
    level: "staff",
    duration_min: 110
  },
  {
    id: "bike_03_sweetspot_long",
    sport: "velo",
    title: "Sweet Spot prolongé — Ajustement",
    objective: "Renforcer le rendement métabolique et la tolérance à l'effort soutenu.",
    why: "Stimule adaptations périphériques sans le coût d'un vrai FTP.",
    when: "Transition Base → Build. 1x/sem.",
    structure: "Échauffement 20' + 4×20' @ ~90% FTP (récup 5') + Retour au calme 10'.",
    indicators: ["RPE stable", "Cadence stable", "Aucune dérive majeure de FC"],
    risks: ["Banalisation si trop fréquent", "À modérer si VLamax déjà basse"],
    tags: ["FTP", "ENDURANCE"],
    level: "staff",
    duration_min: 115
  },
  {
    id: "bike_04_ftp_progressive",
    sport: "velo",
    title: "FTP Progressif — Fondatrice",
    objective: "Augmenter FTP via travail au seuil.",
    why: "FTP ↑ = performance globale ↑ (à condition de contrôler VLamax).",
    when: "Build. 1x/7–10j.",
    structure: "Échauffement 20' + 3×15' @ 100–102% FTP (récup 6') + Retour au calme 10'.",
    indicators: ["Dernier bloc tenu sans dérive explosive", "RPE haut mais stable"],
    risks: ["Peut augmenter VLamax si trop fréquent", "À éviter en sur-fatigue"],
    tags: ["FTP"],
    level: "staff",
    duration_min: 95
  },
  {
    id: "bike_05_ftp_under_fatigue",
    sport: "velo",
    title: "FTP sous fatigue — Validation",
    objective: "Valider la robustesse et le maintien de puissance après volume.",
    why: "Reproduit le contexte course (effort long + maintien).",
    when: "Spécifique (6–10 semaines pré-course).",
    structure: "60–90' Z2 + 20' @ FTP + 10' cool down.",
    indicators: ["Tenue du 20' malgré fatigue", "FC maîtrisée"],
    risks: ["Récupération longue", "À éviter si charge hebdo déjà haute"],
    tags: ["SPECIFIC", "TTE", "RACE_SIM"],
    level: "staff",
    duration_min: 120
  },
  {
    id: "bike_06_low_glycogen_tempo",
    sport: "velo",
    title: "Tempo bas glycogène — Staff only",
    objective: "Stimuler l'oxydation lipidique et l'économie énergétique.",
    why: "Intéressant IM si bien placé (sans sacrifier qualité).",
    when: "Matin / fenêtre nutritionnelle contrôlée, jamais en période de stress élevé.",
    structure: "75–120' Z2/Tempo bas. Hydratation stricte, carbs limités selon protocole.",
    indicators: ["RPE bas-moyen", "Aucune baisse de puissance"],
    risks: ["Contre-productif si stress/sommeil mauvais", "Risque immunitaire si abus"],
    tags: ["METABOLIC", "ENDURANCE"],
    level: "staff",
    duration_min: 105
  },
  {
    id: "bike_07_over_under",
    sport: "velo",
    title: "Over-Under — Puissance durable",
    objective: "Tolérance lactate + capacité à 'recycler' sous contrainte.",
    why: "Améliore le contrôle physiologique autour du seuil.",
    when: "Build avancé / spécifique 70.3.",
    structure: "Échauffement 20' + 4×12' (2' @105% + 4' @95%) ×2 (récup 6') + 10' cool.",
    indicators: ["Stabilité cadence", "Capacité à redescendre en 'under'"],
    risks: ["Charge cardio élevée", "Mal placé → VLamax peut remonter"],
    tags: ["FTP", "TTE"],
    level: "staff",
    duration_min: 100
  },
  {
    id: "bike_08_neuro_activation",
    sport: "velo",
    title: "Activation neuromusculaire — Fraîcheur",
    objective: "Conserver puissance / coordination sans fatigue métabolique.",
    why: "Maintien 'sharpness' en semaine allégée ou pré-course.",
    when: "Allégée / pré-compétition.",
    structure: "60' Z2 + 6×10'' sprint (récup 3–4') + cool down.",
    indicators: ["Sprints 'faciles' neuromusculaires", "Pas d'essoufflement prolongé"],
    risks: ["À éviter si douleur tendineuse / genou"],
    tags: ["NEURO", "RECOVERY"],
    level: "staff",
    duration_min: 70
  },
  {
    id: "bike_09_im_simulation",
    sport: "velo",
    title: "Simulation course IM — Spécifique",
    objective: "Valider pacing, nutrition, position, confort.",
    why: "La performance IM = physiologie + exécution + nutrition.",
    when: "6–10 semaines avant course (max 2 fois).",
    structure: "3–4h à cible IM (IF/puissance cible) + nutrition course + dernier 30' stables.",
    indicators: ["Puissance stable", "Nutrition tolérée", "Pas de dérive FC majeure"],
    risks: ["Très coûteux", "Exige récup structurée"],
    tags: ["RACE_SIM", "SPECIFIC", "ENDURANCE"],
    level: "staff",
    duration_min: 210
  },
  {
    id: "bike_10_active_recovery",
    sport: "velo",
    title: "Récupération active — Régulation",
    objective: "Favoriser récup, circulation, maintien signal aérobie.",
    why: "Réduire rigidité, accélérer retour parasympathique.",
    when: "Post-bloc / lendemain séance clé.",
    structure: "45–60' Z1 (cadence libre), zéro intensité.",
    indicators: ["RPE très bas", "FC bas"],
    risks: ["Aucun (si vraiment facile)"],
    tags: ["RECOVERY"],
    level: "standard",
    duration_min: 50
  },

  // ============================
  // 🏃‍♂️ COURSE (10)
  // ============================
  {
    id: "run_01_long_threshold",
    sport: "course",
    title: "Seuil long — TTE CAP",
    objective: "Développer endurance spécifique au seuil (TTE course).",
    why: "Meilleure capacité à tenir l'allure cible longtemps avec coût maîtrisé.",
    when: "Build / spécifique (selon historique blessure).",
    structure: "Échauffement 15' + 3×15' au seuil (récup 3') + retour au calme 10'.",
    indicators: ["Allure stable", "RPE contrôlé", "Technique propre"],
    risks: ["Charge tendineuse", "Sur-risque si volume hebdo faible"],
    tags: ["TTE", "SPECIFIC"],
    level: "staff",
    duration_min: 75
  },
  {
    id: "run_02_continuous_tempo",
    sport: "course",
    title: "Tempo continu — Fondatrice",
    objective: "Économie de course + endurance musculaire.",
    why: "Construire une base solide avant intensités plus dures.",
    when: "Base / build léger.",
    structure: "10' facile + 40–60' tempo bas + 10' facile.",
    indicators: ["Respiration contrôlée", "Cadence stable"],
    risks: ["Monotonie si répété", "À ajuster selon fatigue"],
    tags: ["ENDURANCE"],
    level: "staff",
    duration_min: 70
  },
  {
    id: "run_03_long_intervals",
    sport: "course",
    title: "Intervalles longs — Puissance durable",
    objective: "Augmenter puissance aérobie durable.",
    why: "Améliore capacité à soutenir intensité élevée sans dérive.",
    when: "Build / spécifique 70.3.",
    structure: "Échauffement 15' + 4×8' seuil haut (récup 3') + 10' cool down.",
    indicators: ["Dernier intervalle tenu", "Technique stable"],
    risks: ["Fatigue centrale", "À éviter si HRV basse"],
    tags: ["FTP", "TTE"],
    level: "staff",
    duration_min: 75
  },
  {
    id: "run_04_race_pace_blocks",
    sport: "course",
    title: "Allure course IM/70.3 — Spécifique",
    objective: "Automatiser allure cible et économie à l'allure course.",
    why: "Exécution > physiologie le jour J.",
    when: "Spécifique (8–3 semaines avant).",
    structure: "20' easy + 2×30' allure course (récup 5') + 10' easy.",
    indicators: ["Allure stable", "FC stable"],
    risks: ["Inutile trop tôt", "À modérer si fatigue élevée"],
    tags: ["SPECIFIC", "RACE_SIM"],
    level: "staff",
    duration_min: 95
  },
  {
    id: "run_05_long_progressive",
    sport: "course",
    title: "Sortie longue progressive — Fondatrice",
    objective: "Endurance + robustesse + fin de sortie qualitative.",
    why: "Prépare les fins de course (IM/Marathon).",
    when: "Base avancée / spécifique.",
    structure: "1h45–2h30 easy + derniers 30' allure cible.",
    indicators: ["Finition propre", "Dérive FC contrôlée"],
    risks: ["Récupération longue", "Risques tendineux"],
    tags: ["ENDURANCE", "SPECIFIC"],
    level: "staff"
  },
  {
    id: "run_06_controlled_fartlek",
    sport: "course",
    title: "Fartlek contrôlé — Ajustement",
    objective: "Adaptabilité, variations d'allure sans rigidité.",
    why: "Bon compromis si fatigue modérée.",
    when: "Semaine chargée (remplace un dur).",
    structure: "45–60' avec 10×(1' vite / 1' facile) ou 6×(2'/2').",
    indicators: ["RPE maîtrisé", "Pas de 'sprint'"],
    risks: ["Manque de précision si trop libre"],
    tags: ["FTP"],
    level: "standard",
    duration_min: 60
  },
  {
    id: "run_07_speed_economy",
    sport: "course",
    title: "Vitesse économique — Neuromusculaire",
    objective: "Coordination, foulée, économie à vitesse élevée.",
    why: "Préserve la qualité mécanique sans stress métabolique long.",
    when: "Allégée / entretien.",
    structure: "Échauffement + 8×200m rapide (récup complète) + retour au calme.",
    indicators: ["Relâchement", "Technique propre"],
    risks: ["Risque si antécédents ischio/Achille"],
    tags: ["NEURO"],
    level: "staff",
    duration_min: 55
  },
  {
    id: "run_08_brick_run",
    sport: "course",
    title: "Brick CAP — Validation transfert",
    objective: "Transfert vélo → course, pacing et sensations.",
    why: "La course après vélo est une discipline spécifique.",
    when: "Spécifique (70.3/IM).",
    structure: "Après vélo ciblé: 30–60' allure course (ou progressif).",
    indicators: ["Stabilité allure", "RPE cohérent"],
    risks: ["Charge tendineuse + fatigue cumulée"],
    tags: ["SPECIFIC", "RACE_SIM"],
    level: "staff"
  },
  {
    id: "run_09_low_glycogen_easy",
    sport: "course",
    title: "Footing bas glycogène — Staff only",
    objective: "Stimuler adaptations métaboliques sans intensité.",
    why: "Potentiellement utile IM si bien placé.",
    when: "Rare, uniquement si récupération OK.",
    structure: "40–60' très facile, protocole nutritionnel contrôlé.",
    indicators: ["RPE très bas", "Aucune dérive"],
    risks: ["Risque immunitaire si abus", "À proscrire si stress élevé"],
    tags: ["METABOLIC", "RECOVERY"],
    level: "staff",
    duration_min: 50
  },
  {
    id: "run_10_recovery_jog",
    sport: "course",
    title: "Footing récupération — Régulation",
    objective: "Récup active, entretien minimal.",
    why: "Maintenir mouvement sans charge.",
    when: "Post séance clé / fatigue.",
    structure: "30–45' Z1 + mobilité 10'.",
    indicators: ["RPE très bas"],
    risks: ["Aucun si facile"],
    tags: ["RECOVERY"],
    level: "standard",
    duration_min: 40
  },

  // ============================
  // 🏊‍♂️ NATATION (10)
  // ============================
  {
    id: "swim_01_continuous_endurance",
    sport: "natation",
    title: "Endurance continue — Fondatrice",
    objective: "Endurance + technique sous durée.",
    why: "La natation tri = efficacité technique durable.",
    when: "Base / entretien hebdo.",
    structure: "3–4 km continu ou en blocs longs (ex: 3×800m).",
    indicators: ["Technique stable", "Respiration contrôlée"],
    risks: ["Monotonie", "Épaule si volume mal progressé"],
    tags: ["ENDURANCE"],
    level: "staff"
  },
  {
    id: "swim_02_css_long",
    sport: "natation",
    title: "CSS long — TTE natation",
    objective: "Développer soutenabilité à CSS.",
    why: "CSS = repère performance durable en tri.",
    when: "Build / spécifique.",
    structure: "Échauffement + 5×400m @ CSS (récup 30–45'') + retour au calme.",
    indicators: ["Temps stables", "Technique propre"],
    risks: ["Monotone si répétée"],
    tags: ["TTE", "SPECIFIC"],
    level: "staff"
  },
  {
    id: "swim_03_css_fractionated",
    sport: "natation",
    title: "CSS fractionné — Puissance durable",
    objective: "Maintenir allure course via volume de travail CSS.",
    why: "Accumulation temps à CSS = adaptation spécifique.",
    when: "Build / spécifique.",
    structure: "Échauffement + 10×200m @ CSS (récup 20–30'') + cool down.",
    indicators: ["Régularité", "Pas de dégradation technique"],
    risks: ["Fatigue épaules si surcharge"],
    tags: ["TTE", "SPECIFIC"],
    level: "staff"
  },
  {
    id: "swim_04_lactate_threshold",
    sport: "natation",
    title: "Seuil lactique — Ajustement",
    objective: "Tolérance effort soutenu au-dessus CSS.",
    why: "Utile pour pack, départ, variations.",
    when: "Build avancé.",
    structure: "8×100m @ seuil (récup 20'') + technique.",
    indicators: ["Temps cohérents", "Respiration maîtrisée"],
    risks: ["Perte technique si trop dur"],
    tags: ["FTP"],
    level: "staff"
  },
  {
    id: "swim_05_technique_under_fatigue",
    sport: "natation",
    title: "Technique sous fatigue — Staff",
    objective: "Préserver économie technique quand ça 'brûle'.",
    why: "La perf natation = technique d'abord.",
    when: "Fin de séance qualité.",
    structure: "Bloc éducatifs (pull/plaquettes légères) en fin, focus alignement + catch.",
    indicators: ["Qualité de prise d'eau", "Alignement"],
    risks: ["Épaule si matériel trop agressif"],
    tags: ["ENDURANCE"],
    level: "staff"
  },
  {
    id: "swim_06_pull_buoy_endurance",
    sport: "natation",
    title: "Pull buoy endurance — Spécifique IM",
    objective: "Transfert tri (position + traction).",
    why: "Renforce endurance haut du corps.",
    when: "Spécifique IM/70.3 (dosage).",
    structure: "3×600m pull (récup 45'') + 8×50m technique.",
    indicators: ["Pas de douleur épaules", "Temps stables"],
    risks: ["Déséquilibre musculaire si abus"],
    tags: ["SPECIFIC", "ENDURANCE"],
    level: "staff"
  },
  {
    id: "swim_07_short_sprints",
    sport: "natation",
    title: "Sprint court — Neuromusculaire",
    objective: "Coordination, vitesse, recrutement sans fatigue longue.",
    why: "Utile pour départ/pack.",
    when: "Allégée / pré-course.",
    structure: "12×25m très vite (récup complète) + 200m easy entre séries si besoin.",
    indicators: ["Vitesse propre", "Technique intacte"],
    risks: ["Épaule si sprints forcés"],
    tags: ["NEURO"],
    level: "staff",
    duration_min: 50
  },
  {
    id: "swim_08_mass_start_simulation",
    sport: "natation",
    title: "Simulation départ groupé — Spécifique course",
    objective: "Gestion stress + tolérance variations.",
    why: "Course = chaos : chocs, accélérations, orientation.",
    when: "Spécifique pré-course.",
    structure: "Série 6×(50m vite départ + 150m stable) + travail orientation.",
    indicators: ["Capacité à se calmer après départ", "Ligne stable"],
    risks: ["Stress élevé si mal encadré"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "staff"
  },
  {
    id: "swim_09_mixed_css_technique",
    sport: "natation",
    title: "Mix CSS + Technique — Consolidation",
    objective: "Tenue allure + maintien technique.",
    why: "Approche staff: qualité + volume utile.",
    when: "Toute saison.",
    structure: "6×200m @ CSS (récup 20'') + 6×50 éducatifs + 400 easy.",
    indicators: ["Temps stables", "Technique stable"],
    risks: ["Fatigue épaules si trop fréquent"],
    tags: ["TTE", "ENDURANCE"],
    level: "staff"
  },
  {
    id: "swim_10_recovery_swim",
    sport: "natation",
    title: "Récupération active — Régulation",
    objective: "Récup sans stress, mobilité scapulaire.",
    why: "Natation facile = excellent outil de régulation.",
    when: "Post-bloc / fatigue.",
    structure: "1500–2500m easy + éducatifs doux + dos.",
    indicators: ["RPE très bas"],
    risks: ["Aucun si easy"],
    tags: ["RECOVERY"],
    level: "standard",
    duration_min: 45
  }
];

// -----------------------------
// HELPERS (pour ton app)
// -----------------------------
export function getStaffSessions(options?: {
  sport?: SportType;
  tag?: SessionTag;
  level?: SessionLevel;
  query?: string;
}): StaffSession[] {
  const { sport, tag, level, query } = options || {};
  const q = (query || "").trim().toLowerCase();

  return STAFF_SESSIONS.filter((s) => {
    if (sport && s.sport !== sport) return false;
    if (level && s.level !== level) return false;
    if (tag && !s.tags.includes(tag)) return false;
    if (q) {
      const blob = `${s.title} ${s.objective} ${s.why} ${s.when} ${s.structure}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}
