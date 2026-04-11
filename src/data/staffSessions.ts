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

export type SessionLevel = "staff" | "standard" | "beginner" | "elite";

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
  },

  // ============================
  // 🟢 DÉBUTANT — VÉLO (7)
  // ============================
  {
    id: "beg_bike_01_first_ride",
    sport: "velo",
    title: "Première sortie structurée",
    objective: "Poser les bases : cadence, position, régularité.",
    why: "Avant d'augmenter l'intensité, il faut maîtriser la gestuelle et la régularité de pédalage.",
    when: "Tout début de programme. 2–3x/sem.",
    structure: "10' très facile Z1 + 30' Z2 continu (cadence cible 80–90 RPM) + 5' retour au calme.",
    indicators: ["Cadence régulière", "FC stable en Z2", "Confort sur le vélo"],
    risks: ["Trop fort trop tôt", "Position inadaptée = douleurs"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 45
  },
  {
    id: "beg_bike_02_endurance_build",
    sport: "velo",
    title: "Endurance progressive Z2",
    objective: "Augmenter progressivement le volume aérobie.",
    why: "Le développement mitochondrial nécessite un volume croissant en zone aérobie.",
    when: "Semaines 3–8. 2x/sem.",
    structure: "10' Z1 + 45–60' Z2 continu + 5' retour au calme.",
    indicators: ["FC drift < 5%", "RPE 3–4/10", "Capacité à parler"],
    risks: ["Augmentation trop rapide du volume (>10%/sem)", "Négliger l'hydratation"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 75
  },
  {
    id: "beg_bike_03_tempo_intro",
    sport: "velo",
    title: "Introduction au Tempo",
    objective: "Découvrir la zone Tempo (Z3) et l'effort 'confortablement dur'.",
    why: "Transition entre endurance pure et travail au seuil, développe l'économie de pédalage.",
    when: "À partir de la semaine 6. 1x/sem.",
    structure: "15' Z1–Z2 + 3×8' Z3 (récup 3' Z1) + 10' retour au calme.",
    indicators: ["Puissance/FC stable sur chaque bloc", "RPE 5–6/10"],
    risks: ["Transformer en séance seuil", "Récupérations trop courtes"],
    tags: ["FTP", "ENDURANCE"],
    level: "beginner",
    duration_min: 60
  },
  {
    id: "beg_bike_04_cadence_drills",
    sport: "velo",
    title: "Gammes de cadence",
    objective: "Améliorer la fluidité et l'efficacité du pédalage.",
    why: "La coordination neuromusculaire est la base de tout progrès futur en puissance.",
    when: "1x/sem, toute phase.",
    structure: "10' Z1 + 6×3' alternance cadence haute (100 RPM) / basse (60 RPM) en Z2 + 10' Z2 libre + 5' retour au calme.",
    indicators: ["Fluidité du pédalage", "Pas de rebond en selle à haute cadence"],
    risks: ["Forcer en basse cadence = stress genoux", "Perdre le contrôle en haute cadence"],
    tags: ["NEURO", "ENDURANCE"],
    level: "beginner",
    duration_min: 50
  },
  {
    id: "beg_bike_05_first_intervals",
    sport: "velo",
    title: "Premiers intervalles — Sweet Spot Light",
    objective: "Première exposition au travail structuré sous-seuil.",
    why: "Le Sweet Spot offre un excellent rapport stimulus/fatigue pour les débutants.",
    when: "À partir de la semaine 8. 1x/sem.",
    structure: "15' Z2 + 3×6' @ 85–88% FTP (récup 4' Z1) + 10' retour au calme.",
    indicators: ["Puissance constante sur chaque intervalle", "RPE 6/10 max"],
    risks: ["Intervalles trop longs trop tôt", "Ne pas respecter la récup"],
    tags: ["FTP", "SPECIFIC"],
    level: "beginner",
    duration_min: 55
  },
  {
    id: "beg_bike_06_recovery_active",
    sport: "velo",
    title: "Récupération active vélo",
    objective: "Faciliter la récupération sans arrêt complet.",
    why: "Le flux sanguin accru aide à éliminer les métabolites sans ajouter de stress.",
    when: "Lendemain de séance difficile. 1–2x/sem.",
    structure: "30–40' Z1 strict (cadence libre, terrain plat).",
    indicators: ["FC < 65% FCmax", "RPE 1–2/10", "Sensation de légèreté en fin"],
    risks: ["Rouler trop fort (ego)", "Transformer en sortie endurance"],
    tags: ["RECOVERY"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_bike_07_hill_intro",
    sport: "velo",
    title: "Initiation côtes courtes",
    objective: "Découvrir l'effort en montée et la gestion de cadence.",
    why: "Les côtes développent la force spécifique et la gestion d'effort.",
    when: "À partir de la semaine 6. 1x/sem.",
    structure: "15' Z2 plat + 5×2' en côte modérée (Z3–Z4, assis, 65–75 RPM) récup descente + 10' Z1.",
    indicators: ["Cadence contrôlée", "Pas d'essoufflement excessif"],
    risks: ["Partir trop fort", "Mauvaise position (danseuse non maîtrisée)"],
    tags: ["FTP", "NEURO"],
    level: "beginner",
    duration_min: 55
  },

  // ============================
  // 🟢 DÉBUTANT — COURSE (7)
  // ============================
  {
    id: "beg_run_01_walk_run",
    sport: "course",
    title: "Marche / Course alternée",
    objective: "Construire la capacité de courir en continu sans blessure.",
    why: "L'alternance marche/course réduit le stress musculo-squelettique tout en développant l'aérobie.",
    when: "Début de programme. 3x/sem.",
    structure: "5' marche rapide + 8×(2' course facile / 1' marche) + 5' marche retour au calme.",
    indicators: ["Pas de douleur articulaire", "FC raisonnable en phase course", "Capable de parler"],
    risks: ["Courir trop vite dans les phases course", "Sauter les phases marche"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_run_02_continuous_easy",
    sport: "course",
    title: "Footing continu facile",
    objective: "Première course continue — développer l'endurance fondamentale.",
    why: "Courir 20–30' sans pause est le premier jalon de tout coureur.",
    when: "Semaines 4–8. 2–3x/sem.",
    structure: "5' marche + 20–30' course continue Z1–Z2 + 5' marche.",
    indicators: ["Allure régulière", "FC < 75% FCmax", "RPE 3–4/10"],
    risks: ["Augmenter la durée trop vite (>10%/sem)", "Terrain trop vallonné"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_run_03_strides_intro",
    sport: "course",
    title: "Lignes droites (Strides)",
    objective: "Améliorer la foulée et la coordination neuromusculaire.",
    why: "Les accélérations courtes développent l'économie de course sans fatigue métabolique.",
    when: "1x/sem, après footing facile.",
    structure: "20' footing Z1–Z2 + 6×20s accélération progressive (pas sprint) / récup 60s marche + 5' retour au calme.",
    indicators: ["Foulée fluide et relâchée", "Pas d'effort maximal", "Bonne posture"],
    risks: ["Sprinter au lieu d'accélérer progressivement", "Terrain glissant/inégal"],
    tags: ["NEURO", "ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_run_04_fartlek_fun",
    sport: "course",
    title: "Fartlek ludique",
    objective: "Découvrir les variations d'allure de façon naturelle.",
    why: "Le fartlek développe la capacité aérobie et l'adaptabilité sans la pression des temps précis.",
    when: "Semaines 6+. 1x/sem.",
    structure: "10' footing Z2 + 6×(1' accélération modérée / 2' footing facile) + 5' retour au calme.",
    indicators: ["Capable de revenir facilement au footing", "RPE accélérations 6–7/10"],
    risks: ["Trop d'enthousiasme = trop rapide", "Ne pas récupérer entre les accélérations"],
    tags: ["ENDURANCE", "SPECIFIC"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_run_05_long_run_first",
    sport: "course",
    title: "Première sortie longue",
    objective: "Découvrir la gestion d'effort sur une durée étendue.",
    why: "La sortie longue développe l'endurance lipidique et la résistance mentale.",
    when: "1x/sem (week-end). Semaines 6+.",
    structure: "5' marche + 40–50' footing Z1–Z2 (intégrer 2–3' marche si besoin) + 5' marche.",
    indicators: ["Negative split (2e moitié pas plus lente)", "Hydratation régulière"],
    risks: ["Partir trop vite", "Pas d'hydratation/nutrition sur >45'"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 55
  },
  {
    id: "beg_run_06_core_run",
    sport: "course",
    title: "Footing + Gainage",
    objective: "Combiner course et renforcement du tronc pour prévenir les blessures.",
    why: "Un core solide améliore la stabilité pelvienne et l'économie de course.",
    when: "2x/sem, toute phase.",
    structure: "20' footing Z2 + Circuit : 3×(30s planche + 30s planche latérale/côté + 30s superman + 30s repos) + 5' étirements.",
    indicators: ["Maintien correct des postures", "Pas de douleur lombaire"],
    risks: ["Mauvaise forme de gainage", "Négliger cet aspect du programme"],
    tags: ["ENDURANCE", "SPECIFIC"],
    level: "beginner",
    duration_min: 40
  },
  {
    id: "beg_run_07_recovery_walk",
    sport: "course",
    title: "Marche de récupération",
    objective: "Récupération active sans impact de course.",
    why: "La marche maintient la mobilité et le flux sanguin sans stress articulaire.",
    when: "Lendemain de séance difficile.",
    structure: "30–40' marche rapide terrain plat ou légèrement vallonné.",
    indicators: ["FC < 60% FCmax", "Sensation de détente"],
    risks: ["Transformer en course", "Négliger les jours off complets"],
    tags: ["RECOVERY"],
    level: "beginner",
    duration_min: 35
  },

  // ============================
  // 🟢 DÉBUTANT — NATATION (6)
  // ============================
  {
    id: "beg_swim_01_technique_basics",
    sport: "natation",
    title: "Apprentissage crawl — Bases",
    objective: "Maîtriser la respiration, la position et le mouvement de bras en crawl.",
    why: "La technique est le facteur limitant n°1 en natation pour les débutants.",
    when: "Début de programme. 2–3x/sem.",
    structure: "200m éducatifs (battements bras tendus, respiration latérale) + 4×50m crawl facile (repos 30s) + 100m dos récup.",
    indicators: ["Respiration sans panique", "Position horizontale", "Mouvement de bras fluide"],
    risks: ["Aller trop vite", "S'épuiser sur la respiration"],
    tags: ["ENDURANCE", "NEURO"],
    level: "beginner",
    duration_min: 30
  },
  {
    id: "beg_swim_02_endurance_build",
    sport: "natation",
    title: "Endurance crawl progressive",
    objective: "Augmenter la distance continue en crawl.",
    why: "Construire la capacité à nager sans s'arrêter est la base de tout programme natation.",
    when: "Semaines 3–8. 2x/sem.",
    structure: "200m éducatifs + 6×100m crawl Z2 (repos 20s) + 100m dos retour au calme.",
    indicators: ["Allure régulière", "Nombre de coups/25m stable", "Pas d'essoufflement"],
    risks: ["Trop de repos entre séries", "Perte de technique avec la fatigue"],
    tags: ["ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_swim_03_kick_drills",
    sport: "natation",
    title: "Travail de battements",
    objective: "Renforcer la propulsion des jambes et la position dans l'eau.",
    why: "Des battements efficaces stabilisent le corps et réduisent la traînée.",
    when: "1–2x/sem, toute phase.",
    structure: "100m nage libre + 6×50m battements avec planche (repos 15s) + 4×50m crawl complet + 100m dos.",
    indicators: ["Battements depuis la hanche (pas les genoux)", "Position horizontale maintenue"],
    risks: ["Battements trop amples", "Crampes mollets si déshydraté"],
    tags: ["NEURO", "ENDURANCE"],
    level: "beginner",
    duration_min: 30
  },
  {
    id: "beg_swim_04_pull_focus",
    sport: "natation",
    title: "Travail de traction (Pull)",
    objective: "Améliorer la phase de traction et la prise d'eau.",
    why: "80% de la propulsion en crawl vient des bras — optimiser la traction est prioritaire.",
    when: "1x/sem, semaines 4+.",
    structure: "200m éducatifs + 4×100m avec pull-buoy Z2 (repos 20s) + 4×50m crawl complet + 100m récup.",
    indicators: ["Sensation de 'prise' dans l'eau", "Allure stable avec pull-buoy"],
    risks: ["Trop de dépendance au pull-buoy", "Épaule douloureuse = stop"],
    tags: ["NEURO", "ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_swim_05_first_intervals",
    sport: "natation",
    title: "Premiers intervalles natation",
    objective: "Découvrir le travail fractionné en piscine.",
    why: "Les intervalles courts permettent de maintenir une bonne technique à intensité légèrement supérieure.",
    when: "Semaines 6+. 1x/sem.",
    structure: "200m éducatifs + 8×50m crawl (départ toutes les 1'15–1'30, allure soutenue) + 200m récup nage libre.",
    indicators: ["Temps réguliers sur les 50m", "Technique maintenue", "RPE 6/10"],
    risks: ["Partir trop vite sur les premiers 50m", "Perdre la technique"],
    tags: ["SPECIFIC", "ENDURANCE"],
    level: "beginner",
    duration_min: 35
  },
  {
    id: "beg_swim_06_open_water_intro",
    sport: "natation",
    title: "Introduction eau libre",
    objective: "Transition piscine → eau libre en toute sécurité.",
    why: "L'eau libre ajoute des contraintes (orientation, vagues, combinaison) qu'il faut apprivoiser.",
    when: "Avant toute compétition en eau libre. 1–2 séances.",
    structure: "5' nage facile le long du bord + 3×200m en ligne droite avec repérage (repos 30s) + 5' nage retour au calme.",
    indicators: ["Navigation rectiligne", "Pas de panique", "Confort avec la combinaison"],
    risks: ["Ne jamais nager seul", "Eau froide = hypothermie si pas de combi"],
    tags: ["SPECIFIC", "ENDURANCE"],
    level: "beginner",
    duration_min: 30
  },

  // ============================
  // 🔴 ÉLITE — VÉLO (7)
  // ============================
  {
    id: "elite_bike_01_double_threshold",
    sport: "velo",
    title: "Double Seuil Norvégienne — Matin",
    objective: "Séance AM du protocole norvégien : seuil bas (2.0–2.5 mmol/L).",
    why: "Maximiser le temps au seuil sur la journée (50–60' total) avec moins de fatigue qu'une séance unique.",
    when: "Build/spécifique. 1–2x/sem (Elite). Toujours couplé avec séance PM.",
    structure: "15' Z2 + 25–30' continu @ seuil bas (88–92% FTP, FC seuil -5bpm) + 10' retour au calme.",
    indicators: ["Lactate 2.0–2.5 mmol/L", "FC stable", "RPE 6/10"],
    risks: ["Pas de repos suffisant avant la séance PM", "Nutrition inadéquate entre les séances"],
    tags: ["TTE", "FTP", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_bike_02_double_threshold_pm",
    sport: "velo",
    title: "Double Seuil Norvégienne — Soir",
    objective: "Séance PM du protocole norvégien : seuil haut (3.0–4.0 mmol/L).",
    why: "Deuxième stimulus de la journée, cible le haut du seuil pour un effet cumulé maximal.",
    when: "Build/spécifique. Même jour que la séance AM.",
    structure: "15' Z2 + 25–30' continu @ seuil haut (95–100% FTP) + 10' retour au calme.",
    indicators: ["Lactate 3.0–4.0 mmol/L", "Puissance constante", "RPE 7–8/10"],
    risks: ["Fatigue cumulée = vérifier HRV le matin", "Ne pas enchaîner si la séance AM était trop dure"],
    tags: ["TTE", "FTP", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_bike_03_vo2max_long",
    sport: "velo",
    title: "VO2max — Blocs longs 5'",
    objective: "Maximiser le temps à VO2max pour les athlètes avec VLamax basse.",
    why: "Les intervalles longs (5') recrutent un maximum de fibres aérobies et poussent le VO2max au plafond.",
    when: "Build. 1x/sem max. VLamax < 0.35 uniquement.",
    structure: "20' Z2 + 4–5×5' @ 105–110% FTP (récup 5' Z1) + 10' retour au calme.",
    indicators: ["FC > 90% FCmax sur les 2 dernières min", "Puissance maintenue", "RPE 9/10"],
    risks: ["Interdit si VLamax > 0.40 (risque de stimulation glycolytique)", "Max 1x/sem"],
    tags: ["SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 80
  },
  {
    id: "elite_bike_04_tte_race_pace",
    sport: "velo",
    title: "TTE Race Pace — Simulation",
    objective: "Consolider la puissance cible course sur une durée proche de la compétition.",
    why: "Valider que la puissance visée est soutenable, calibrer pacing et nutrition.",
    when: "Spécifique. 1x/10–14j.",
    structure: "20' Z2 + 60–90' @ puissance cible course (70.3/IM) + 10' Z1.",
    indicators: ["Puissance constante", "FC drift < 5%", "Tolérance GI aux glucides"],
    risks: ["Séance très éprouvante — bien récupéré avant", "Nutrition identique au jour de course"],
    tags: ["TTE", "RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 120
  },
  {
    id: "elite_bike_05_sfr_heavy",
    sport: "velo",
    title: "SFR Heavy — Force maximale",
    objective: "Développer la force spécifique à très basse cadence pour élites.",
    why: "SFR lourd recrute les fibres de type IIa en mode aérobie, réduisant la VLamax à long terme.",
    when: "Base / Build. 1x/sem. Progression sur 4–6 semaines.",
    structure: "20' Z2 + 4×8' @ 88–92% FTP à 40–50 RPM (récup 5' Z1 cadence libre) + 10' retour au calme.",
    indicators: ["Couple de force élevé", "Pas de douleur genou", "RPE 8/10"],
    risks: ["Douleurs rotules si progression trop rapide", "Échauffement insuffisant"],
    tags: ["VLAMAX", "FTP", "NEURO"],
    level: "elite",
    duration_min: 75
  },
  {
    id: "elite_bike_06_over_unders",
    sport: "velo",
    title: "Over/Unders — Clearance lactate",
    objective: "Entraîner la capacité à gérer et éliminer le lactate autour du seuil.",
    why: "Simule les variations de puissance en course : dépassements puis retour sous le seuil.",
    when: "Build / Spécifique. 1x/sem.",
    structure: "20' Z2 + 3×(3' @ 105% FTP + 3' @ 90% FTP) × 2 séries (récup 5' entre séries) + 10' Z1.",
    indicators: ["Capacité à stabiliser FC après les 'over'", "Puissance constante dans les 'under'"],
    risks: ["Les 'over' trop forts = craquage en série 2", "Cumul fatigue avec d'autres séances seuil"],
    tags: ["FTP", "TTE", "METABOLIC"],
    level: "elite",
    duration_min: 80
  },
  {
    id: "elite_bike_07_race_opener",
    sport: "velo",
    title: "Activation pré-course (Opener)",
    objective: "Stimuler le système neuromusculaire 24–48h avant la course.",
    why: "Les openers activent les fibres rapides et affûtent le système nerveux sans créer de fatigue.",
    when: "J-2 ou J-1 course. 1 seule séance.",
    structure: "15' Z2 + 3×(30s @ 120% FTP / 2' Z1) + 2×(10s sprint max / 3' Z1) + 10' Z1.",
    indicators: ["Sensation de vivacité", "Puissance élevée sans effort", "RPE global < 5/10"],
    risks: ["Trop de volume = fatigue résiduelle", "Ne pas faire la veille si course le matin"],
    tags: ["RACE_SIM", "NEURO"],
    level: "elite",
    duration_min: 40
  },

  // ============================
  // 🔴 ÉLITE — COURSE (7)
  // ============================
  {
    id: "elite_run_01_double_threshold_am",
    sport: "course",
    title: "Double Seuil Norvégienne CAP — Matin",
    objective: "Séance AM au seuil bas en course à pied.",
    why: "Protocole norvégien adapté CAP : maximiser le temps au seuil avec récupération inter-séances.",
    when: "Build. 1–2x/sem (Elite). Couplé avec séance PM.",
    structure: "10' footing Z2 + 25' continu @ allure seuil bas (marathon pace +5–10s/km) + 10' Z1.",
    indicators: ["Allure régulière", "FC seuil -5bpm", "RPE 6/10"],
    risks: ["Terrain trop vallonné", "Pas assez de récup avant PM"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_run_02_double_threshold_pm",
    sport: "course",
    title: "Double Seuil Norvégienne CAP — Soir",
    objective: "Séance PM au seuil haut en course à pied.",
    why: "Deuxième stimulus : cible le seuil anaérobie pour un effet cumulé.",
    when: "Build. Même jour que la séance AM.",
    structure: "10' footing Z2 + 25' continu @ allure seuil haut (semi-marathon pace) + 10' Z1.",
    indicators: ["Allure constante", "FC plateau au seuil", "RPE 7–8/10"],
    risks: ["Fatigue cumulée — monitorer HRV", "Nutrition entre les séances cruciale"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_run_03_vo2_hills",
    sport: "course",
    title: "VO2max côtes — Hill repeats",
    objective: "Développer le VO2max avec protection articulaire (montée = moins d'impact).",
    why: "Les côtes permettent d'atteindre des intensités élevées avec moins de stress mécanique.",
    when: "Build. 1x/sem max.",
    structure: "15' footing Z2 + 8×90s en côte raide (8–12%, effort max) / récup descente trot + 10' Z1.",
    indicators: ["FC > 92% FCmax sur les dernières reps", "Fréquence de foulée maintenue"],
    risks: ["Descente = risque tendon d'Achille", "Pas plus de 10 reps"],
    tags: ["SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_run_04_tempo_long",
    sport: "course",
    title: "Tempo long — Allure marathon",
    objective: "Valider l'allure cible marathon sur une durée significative.",
    why: "Développe l'endurance spécifique et calibre le pacing de course.",
    when: "Spécifique marathon. 1x/sem.",
    structure: "15' footing Z2 + 45–60' @ allure marathon cible + 10' Z1.",
    indicators: ["Allure constante (< 3s/km de variation)", "FC stable", "Nutrition testée"],
    risks: ["Trop rapide = mini course, fatigue excessive", "Déshydratation sur la durée"],
    tags: ["TTE", "RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 80
  },
  {
    id: "elite_run_05_speed_endurance",
    sport: "course",
    title: "Endurance de vitesse — 1000m",
    objective: "Développer la capacité à maintenir une allure rapide sur des répétitions.",
    why: "Stimule la VO2max et l'économie de course à haute vitesse.",
    when: "Build / Peak. 1x/sem.",
    structure: "15' footing + 5–6×1000m @ allure 5K (récup 2'30 trot) + 10' retour au calme.",
    indicators: ["Temps réguliers (< 3s d'écart)", "Foulée économique maintenue"],
    risks: ["Les premiers trop rapides → craquage", "Volume total > 6km = trop pour la plupart"],
    tags: ["SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 60
  },
  {
    id: "elite_run_06_progression_run",
    sport: "course",
    title: "Sortie longue progressive — Finish Fast",
    objective: "Simuler la fin de course en augmentant l'allure sur les derniers km.",
    why: "Entraîne la capacité à accélérer en état de pré-fatigue, comme en compétition.",
    when: "Spécifique. 1x/2 sem.",
    structure: "60' footing Z2 + 20' progression Z3 → allure seuil + 10' Z4 (finish) + 5' Z1.",
    indicators: ["Negative split", "FC progressive mais pas explosive", "RPE final 8–9/10"],
    risks: ["Finir trop vite = mini course + 3–4j de récup", "Terrain plat obligatoire"],
    tags: ["RACE_SIM", "TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 95
  },
  {
    id: "elite_run_07_brick_run",
    sport: "course",
    title: "Brick Run — Post vélo",
    objective: "Adapter la foulée à la transition vélo → course (triathlon).",
    why: "La transition affecte la biomécanique, le coût énergétique et la FC — il faut la pratiquer.",
    when: "Spécifique triathlon. 1x/sem.",
    structure: "Vélo 60–90' @ puissance cible course → Transition rapide → 20–30' course @ allure cible ± 5s/km + 5' Z1.",
    indicators: ["Allure stabilisée dans les 5 premières min", "FC retour à la normale en <3'"],
    risks: ["Crampes si nutrition vélo insuffisante", "Trop rapide en début de course"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 120
  },

  // ============================
  // 🔴 ÉLITE — NATATION (6)
  // ============================
  {
    id: "elite_swim_01_css_long",
    sport: "natation",
    title: "CSS Long — Seuil aérobie continu",
    objective: "Consolider le seuil aérobie natation sur des distances longues.",
    why: "La CSS (Critical Swim Speed) est l'équivalent du FTP en natation — la clé du pacing.",
    when: "Build / Spécifique. 2x/sem.",
    structure: "400m éducatifs + 5×400m @ CSS (repos 15–20s) + 200m récup.",
    indicators: ["Allure régulière ±1s/100m", "Coup de bras constant", "RPE 7/10"],
    risks: ["Partir trop vite sur le 1er 400", "Forme qui se dégrade après le 3ème"],
    tags: ["TTE", "FTP", "SPECIFIC"],
    level: "elite",
    duration_min: 60
  },
  {
    id: "elite_swim_02_race_pace_200",
    sport: "natation",
    title: "Race Pace 200m — Vitesse spécifique",
    objective: "Travailler l'allure de compétition sur des fractions de 200m.",
    why: "Calibre le pacing 1500m/OW et développe la tolérance au lactate.",
    when: "Peak / Spécifique. 1x/sem.",
    structure: "300m éducatifs + 8×200m @ allure 1500m (repos 20s) + 200m récup.",
    indicators: ["Temps très réguliers", "Virages efficaces", "RPE 8/10"],
    risks: ["Mauvais pacing = craquage série 5+", "Technique avant vitesse"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_03_descending_set",
    sport: "natation",
    title: "Série descendante — 400/300/200/100",
    objective: "Développer le changement de rythme et la gestion d'effort progressif.",
    why: "La série descendante entraîne la capacité à accélérer quand la distance raccourcit.",
    when: "Build. 1x/sem.",
    structure: "400m éducatifs + 2×(400-300-200-100 descending, repos 10s entre distances, 60s entre séries) + 200m récup.",
    indicators: ["Chaque distance plus rapide que la précédente", "Technique maintenue"],
    risks: ["Commencer trop vite le 400", "Volume total élevé (~3200m main set)"],
    tags: ["SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 65
  },
  {
    id: "elite_swim_04_paddles_power",
    sport: "natation",
    title: "Paddles Power — Force propulsive",
    objective: "Développer la force de traction avec plaquettes.",
    why: "Les plaquettes augmentent la surface de traction et renforcent les muscles moteurs.",
    when: "Build. 1–2x/sem. Progression taille plaquettes.",
    structure: "300m éducatifs + 6×200m avec plaquettes @ Z3 (repos 20s) + 4×50m sprint technique + 200m récup.",
    indicators: ["Sensation de puissance dans l'eau", "Pas de douleur épaule"],
    risks: ["Plaquettes trop grandes = blessure épaule", "Progression lente obligatoire"],
    tags: ["NEURO", "FTP"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_05_hypoxic_set",
    sport: "natation",
    title: "Série hypoxique — Tolérance CO2",
    objective: "Améliorer la tolérance au CO2 et l'efficacité respiratoire.",
    why: "En eau libre, la respiration est contrainte (vagues, drafting) — l'adaptation hypoxique prépare à ça.",
    when: "Spécifique. 1x/sem. Athlètes expérimentés uniquement.",
    structure: "300m éducatifs + 8×100m crawl (respi tous les 5 temps, repos 15s) + 4×50m respi tous les 7 + 200m récup.",
    indicators: ["Pas de panique", "Allure maintenue", "RPE respiratoire 7/10"],
    risks: ["Ne jamais forcer si sensation de malaise", "Jamais en eau libre seul"],
    tags: ["SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_swim_06_ow_race_sim",
    sport: "natation",
    title: "Simulation course eau libre",
    objective: "Reproduire les conditions de course : départ, drafting, navigation.",
    why: "La performance en eau libre dépend de la tactique autant que de la condition physique.",
    when: "Pré-compétition. 1–2 séances.",
    structure: "10' nage facile + Départ simulé (sprint 50m) + 1500–2000m @ allure course avec 3 changements de direction + Finish sprint 100m + 5' récup.",
    indicators: ["Navigation rectiligne", "Draft efficace", "Finish explosif"],
    risks: ["Courants / température", "Ne jamais nager seul en eau libre"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 50
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
