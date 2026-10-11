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
  },

  // ============================
  // 🏆 MÉTHODES RECONNUES (4)
  // Principes physiologiques de protocoles publics documentés — pas de
  // contenu propriétaire, pas d'association commerciale. Chaque séance
  // vérifiée distincte des entrées existantes (ex: le double seuil
  // norvégien est déjà couvert par elite_bike_01/02 et elite_run_01/02).
  // ============================
  {
    id: "elite_bike_08_im_brick_long",
    sport: "velo",
    title: "Brick longue distance — Façon Ironman (Sutton/Filliol)",
    objective: "Préparer la transition vélo→course sur un format long, spécifique Ironman.",
    why: "Les coachs longue distance (Brett Sutton, Joel Filliol) construisent la robustesse de fin de course via des bricks longs plutôt que des simulations courtes — le corps apprend à courir fatigué, pas frais.",
    when: "Spécifique IM, 6–3 semaines avant course. 1x/2–3 sem max (très sollicitant).",
    structure: "Vélo 3h–4h30 @ puissance cible IM (dernière heure à l'allure course précise) + Transition rapide (<5') + 45–60' course @ allure cible IM, nutrition identique au jour J.",
    indicators: ["Allure course stable malgré la fatigue vélo", "Pas de dérive FC excessive en course", "Gestion nutrition/hydratation réussie"],
    risks: ["Récupération 48–72h nécessaire", "Risque de surcharge si enchaîné avec une autre séance qualité dans la semaine", "Ne jamais faire ce format à moins de 10 jours de la course"],
    tags: ["RACE_SIM", "SPECIFIC", "TTE"],
    level: "elite",
    duration_min: 300
  },
  {
    id: "elite_run_08_canova_marathon_blocks",
    sport: "course",
    title: "Blocs spécifiques marathon — Façon Canova",
    objective: "Développer la capacité à répéter l'allure marathon par blocs, avec récupération active entre blocs plutôt qu'un seul effort continu.",
    why: "Renato Canova structure ses longues sorties en blocs d'allure cible séparés de récupération, pour accumuler plus de volume à allure spécifique qu'une sortie progressive classique, sans accroître le risque de craquage.",
    when: "Spécifique marathon, cycle final (8–3 semaines avant). 1x/10–14j.",
    structure: "20' Z1–Z2 échauffement + 3×(5km allure marathon cible + 1km récup Z1) + 10' retour au calme. Distance totale ~28–30km.",
    indicators: ["Allure marathon tenue sur chaque bloc sans dérive", "Récupération FC rapide pendant les km de transition", "Sensation de contrôle, pas d'épuisement en fin de dernier bloc"],
    risks: ["Très exigeant — réserver aux coureurs avec base solide (>80km/sem)", "Terrain plat/régulier nécessaire pour fiabilité de l'allure", "Espacer d'au moins 10 jours d'une autre séance spécifique lourde"],
    tags: ["SPECIFIC", "RACE_SIM", "TTE"],
    level: "elite",
    duration_min: 150
  },
  {
    id: "elite_run_09_lydiard_hill_circuit",
    sport: "course",
    title: "Circuit de côtes — Façon Lydiard",
    objective: "Développer la force spécifique de course et la puissance aérobie via un circuit continu, pas des répétitions isolées.",
    why: "Arthur Lydiard (méthode à l'origine de plusieurs champions olympiques néo-zélandais) utilisait un circuit continu (montée en bondissant, descente relâchée, plat en accélération) plutôt que des répétitions à VMA avec récupération complète — stimulus différent : force-endurance et relâchement, moins épuisant nerveusement que des répétitions maximales.",
    when: "Base avancée / pré-build. 1x/sem, cycle de 4–6 semaines.",
    structure: "15' footing Z2 + Circuit continu répété 4–6x : montée 60–90s en bondissant genoux hauts (Z3–Z4) + descente trot relâché (Z1) + 200m plat en accélération progressive (Z3) + 10' retour au calme.",
    indicators: ["Amplitude de bondissement maintenue sur tout le circuit", "Relâchement complet en descente", "Pas de raideur mollets/ischios le lendemain au-delà du normal"],
    risks: ["Terrain en descente = risque Achille/mollet si pente trop raide ou chaussures inadaptées", "Progressivité impérative sur le nombre de tours (commencer à 3–4)", "À éviter si antécédent tendineux récent"],
    tags: ["NEURO", "ENDURANCE", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_07_lactate_profile_set",
    sport: "natation",
    title: "Série profil lactate — Façon Olbrecht",
    objective: "Cartographier/entraîner la courbe lactate individuelle par paliers d'allure croissante, plutôt que de s'appuyer uniquement sur le CSS.",
    why: "Jan Olbrecht (biochimiste/coach ayant travaillé avec de nombreux nageurs olympiques) construit l'entraînement autour de la courbe lactate-vitesse propre à chaque nageur — deux nageurs au même CSS peuvent avoir des courbes très différentes, donc des zones d'entraînement différentes.",
    when: "Test de profil : début de cycle ou tous les 2–3 mois. Version entraînement (sans prise de sang) : 1x/10–14j en build.",
    structure: "Échauffement 400m + 5×200m à allure croissante (seuil -10%, seuil -5%, seuil, seuil +3%, seuil +6%), récup 45–60'' entre paliers. Version staff avec lactatemètre : prise de sang 1' après chaque palier. + 200m récup.",
    indicators: ["Temps cohérents sur chaque palier (pas de dérive technique)", "Si lactate dispo : identification du point d'inflexion de la courbe", "Dernier palier soutenable sans décomposition technique"],
    risks: ["Sans lactatemètre, repose sur le ressenti — moins précis mais toujours utile pour calibrer les zones", "Ne pas répéter trop souvent (coût métabolique élevé du dernier palier)"],
    tags: ["METABOLIC", "SPECIFIC", "TTE"],
    level: "elite",
    duration_min: 50
  },

  // ============================
  // 🏆 MÉTHODES RECONNUES — EXTENSION (30)
  // 10 par sport, même principe que les 4 premières : principes
  // physiologiques de protocoles publics documentés, pas de contenu
  // propriétaire ni d'association commerciale. Vérifié distinctes des 74
  // entrées existantes au moment de l'ajout.
  // ============================

  // ---- VÉLO (10) ----
  {
    id: "elite_bike_09_tabata_vo2",
    sport: "velo",
    title: "VO2max Tabata — Format court haute intensité",
    objective: "Développer la VO2max via un protocole ultra-court à intensité supramaximale.",
    why: "Le protocole Tabata (Pr. Izumi Tabata, étude originale sur patineurs japonais) montre des gains VO2max significatifs en 4 minutes d'effort — format très dense, à réserver aux athlètes expérimentés.",
    when: "Build/affûtage. 1x/sem max, jamais 2 jours de suite.",
    structure: "15' échauffement progressif + 8×(20s all-out / 10s récup) + 10' retour au calme.",
    indicators: ["Puissance maintenue sur les 8 répétitions (pas de chute >15%)", "FC proche du max en fin de série"],
    risks: ["Format extrêmement exigeant — à réserver aux athlètes avec base aérobie solide", "Échauffement neuromusculaire complet obligatoire avant"],
    tags: ["NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 30
  },
  {
    id: "elite_bike_10_40_20_microintervals",
    sport: "velo",
    title: "Micro-intervalles 40/20 — Format peloton",
    objective: "Accumuler un volume important à haute intensité avec une fatigue perçue réduite.",
    why: "Le format 40s effort / 20s récup (popularisé dans le peloton professionnel) permet de maintenir une puissance moyenne proche de VO2max sur une durée totale bien supérieure à des intervalles classiques, grâce à la récupération partielle qui limite l'accumulation de lactate.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 3×(10×40''@110–120% FTP / 20'' Z1) récup 5' entre blocs + 10' retour au calme.",
    indicators: ["Puissance stable sur les 3 blocs", "Pas de décrochage sur les dernières répétitions du 3e bloc"],
    risks: ["Fatigue cumulative sous-estimée car RPE par répétition modéré", "Ne pas enchaîner avec une séance intensive le lendemain"],
    tags: ["FTP", "SPECIFIC", "METABOLIC"],
    level: "elite",
    duration_min: 75
  },
  {
    id: "elite_bike_11_zone2_fatmax",
    sport: "velo",
    title: "Sortie longue Zone 2 stricte — Façon San Millán",
    objective: "Maximiser l'oxydation des graisses et la densité mitochondriale par un volume important à intensité strictement sous-seuil.",
    why: "Iñigo San Millán (physiologiste, a travaillé avec plusieurs champions du WorldTour) insiste sur la discipline stricte de la Zone 2 (sous le 1er seuil) pour ce travail — toute dérive vers la Zone 3 change le stimulus métabolique visé.",
    when: "Base / entretien. 1–2x/sem, format long.",
    structure: "3h–5h à intensité strictement sous le 1er seuil ventilatoire (discipline FC/puissance stricte, jamais de dérive), alimentation glucidique minimale pour favoriser l'oxydation lipidique.",
    indicators: ["FC/puissance restent sous le seuil sur toute la durée", "Capacité à tenir une conversation tout du long"],
    risks: ["La tentation d'accélérer annule le bénéfice recherché — discipline capteur obligatoire", "Apport calorique suffisant malgré l'intensité basse (ce n'est pas une sortie de récupération)"],
    tags: ["ENDURANCE", "METABOLIC"],
    level: "elite",
    duration_min: 240
  },
  {
    id: "elite_bike_12_wbal_repeats",
    sport: "velo",
    title: "Répétitions W' — Reconstitution sous puissance critique",
    objective: "Entraîner la capacité à répéter des efforts anaérobies avec reconstitution incomplète de la réserve W'.",
    why: "Le modèle de puissance critique (Dr. Philip Skiba, W'balance) montre que la capacité à répéter des efforts supra-CP dépend de la vitesse de reconstitution du W' pendant les phases sous-CP — ce qui différencie les coureurs capables d'attaques répétées en course.",
    when: "Spécifique course par étapes/critérium. 1x/10j.",
    structure: "15' échauffement + 10×(30s @150% CP / 4'30 @85–90% CP, pas de repos complet) + 10' retour au calme.",
    indicators: ["Puissance de sprint maintenue malgré la récupération incomplète", "Capacité à ressentir la reconstitution progressive de la réserve"],
    risks: ["Séance très exigeante sur le plan central — vérifier la fraîcheur avant de la lancer", "Nécessite une estimation fiable de CP et W' (test préalable)"],
    tags: ["VLAMAX", "SPECIFIC", "RACE_SIM"],
    level: "elite",
    duration_min: 65
  },
  {
    id: "elite_bike_13_crescendo_friel",
    sport: "velo",
    title: "Intervalles crescendo — Façon Joe Friel",
    objective: "Développer le seuil anaérobie via des répétitions d'intensité progressivement croissante au sein d'une même séance.",
    why: "Joe Friel (coach triathlon/cyclisme très référencé, auteur de 'The Cyclist's Training Bible') recommande des blocs crescendo pour habituer le système à produire un effort croissant sans paniquer physiologiquement — utile en préparation de course à profil varié.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 5×6' (intensité croissante de 90% à 105% FTP sur les 5 répétitions, récup 3' entre chaque) + 10' retour au calme.",
    indicators: ["Dernière répétition (105% FTP) tenue en entier", "Sensation de progressivité contrôlée, pas de brutal décrochage"],
    risks: ["Nécessite un bon contrôle pacing — ne pas sur-pousser les premières répétitions", "À adapter si fatigue résiduelle de la semaine"],
    tags: ["FTP", "TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 80
  },
  {
    id: "elite_bike_14_race_surges",
    sport: "velo",
    title: "Surges aléatoires — Simulation course par équipes",
    objective: "Reproduire la variabilité d'intensité d'une course réelle (attaques, relances) plutôt qu'un effort constant.",
    why: "Les courses ne se déroulent jamais à intensité constante — s'entraîner uniquement en blocs réguliers ne prépare pas à la variabilité réelle. Méthode largement utilisée en préparation de course par équipes/critérium.",
    when: "Pré-compétition. 1x/sem dans les 3 semaines avant course par étapes/critérium.",
    structure: "20' tempo continu (Z3) avec 8–10 surges aléatoires de 15–30s @ sprint insérées sans prévenir (minuteur caché ou partenaire qui déclenche), récup Z1 1' entre surges + 10' retour au calme.",
    indicators: ["Capacité à relancer après chaque surge sans décrochage prolongé", "Retour à l'allure tempo rapide après chaque surge"],
    risks: ["Fatigue neuromusculaire sous-estimée en fin de séance", "Nécessite un terrain sécurisé pour les accélérations"],
    tags: ["RACE_SIM", "NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 70
  },
  {
    id: "elite_bike_15_low_cadence_strength",
    sport: "velo",
    title: "Force à basse cadence — Gros braquet",
    objective: "Développer la force spécifique du pédalage sans sur-solliciter le système cardiovasculaire.",
    why: "Le travail à cadence basse (<60rpm) avec résistance élevée cible la filière musculaire plutôt que cardio-pulmonaire — méthode classique de préparation hivernale utilisée par de nombreux coachs de WorldTour pour construire la force avant la saison d'intensité.",
    when: "Base / préparation hivernale. 1x/sem.",
    structure: "20' échauffement + 6×5' @ 50–55rpm, gros braquet, intensité Z3 (récup 3' cadence libre) + 15' retour au calme.",
    indicators: ["Pas de douleur articulaire genou", "Position assise stable, pas de balancement du bassin"],
    risks: ["Risque articulaire genou si braquet excessif ou position non adaptée", "À éviter en période de reprise ou blessure récente"],
    tags: ["NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 70
  },
  {
    id: "elite_bike_16_seiler_4x8",
    sport: "velo",
    title: "4×8 minutes — Format polarisé norvégien (Seiler)",
    objective: "Maximiser le temps passé proche de VO2max avec un format éprouvé scientifiquement.",
    why: "Stephen Seiler (chercheur à l'origine du concept d'entraînement polarisé, étudié sur les fondeurs norvégiens) a documenté le format 4×8' à ~90% FCmax comme particulièrement efficace pour développer VO2max avec un bon rapport bénéfice/fatigue.",
    when: "Build. 1x/sem (le 2e pilier du modèle polarisé, à côté du volume Z1 majoritaire).",
    structure: "20' échauffement + 4×8' @ 88–92% FCmax (récup 2' Z1) + 10' retour au calme.",
    indicators: ["FC atteint la cible dans les 2–3 premières minutes de chaque répétition", "Puissance stable sur les 4 répétitions"],
    risks: ["Ne pas dépasser 90–92% FCmax (le format perd son efficacité documentée au-delà)", "S'inscrit dans un modèle où le reste de la semaine est à très faible intensité (polarisation)"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 70
  },
  {
    id: "elite_bike_17_sst_broken",
    sport: "velo",
    title: "Sweet Spot fractionné — Intervalles courts",
    objective: "Accumuler du temps au Sweet Spot avec une fatigue perçue moindre qu'en continu.",
    why: "Hunter Allen et Andrew Coggan (popularisateurs du concept Sweet Spot, 88–93% FTP) notent que la version fractionnée permet d'accumuler davantage de temps total à cette intensité qu'une version continue, à fatigue égale — complémentaire de la session longue continue déjà présente dans la bibliothèque.",
    when: "Base avancée / build. 1–2x/sem.",
    structure: "15' échauffement + 3×12' @ 88–93% FTP (récup 4') + 10' retour au calme.",
    indicators: ["Puissance stable sur les 3 blocs", "Cadence naturelle maintenue"],
    risks: ["Monotone si répétée sans variation — alterner avec la version longue continue", "Sous-estimer la fatigue cumulée sur plusieurs semaines"],
    tags: ["FTP", "TTE", "ENDURANCE"],
    level: "elite",
    duration_min: 75
  },
  {
    id: "elite_bike_18_sleep_low",
    sport: "velo",
    title: "Sleep Low, Train Low — Périodisation glucidique",
    objective: "Amplifier les adaptations mitochondriales en s'entraînant avec des réserves de glycogène volontairement réduites.",
    why: "La méthode 'sleep low, train low' (popularisée par les travaux de Louise Burke et adoptée par plusieurs équipes WorldTour) enchaîne une séance intense en fin de journée, un repas pauvre en glucides le soir, une nuit de sommeil, puis une séance d'endurance à jeun le matin — maximise le temps passé avec un glycogène bas, stimulus clé de la biogenèse mitochondriale.",
    when: "Base spécifique. 1x/sem max, jamais en période de charge compétitive.",
    structure: "J-1 soir : séance intense (intervalles) suivie d'un repas pauvre en glucides. J : sortie matinale à jeun 60–90' en Z1–Z2 strict, réalimentation glucidique seulement après la séance.",
    indicators: ["Pas de vertiges/malaise pendant la sortie à jeun (arrêter immédiatement si c'est le cas)", "Sensation d'endurance 'facile' malgré la déplétion"],
    risks: ["Jamais en période de charge compétitive ou de récupération insuffisante", "Risque hypoglycémie — toujours avoir de quoi se réalimenter en cas de besoin", "Contre-indiqué si antécédents de troubles alimentaires"],
    tags: ["METABOLIC", "ENDURANCE"],
    level: "elite",
    duration_min: 90
  },

  // ---- COURSE (10) ----
  {
    id: "elite_run_10_billat_30_30",
    sport: "course",
    title: "30/30 — Format Véronique Billat",
    objective: "Développer VO2max via un format d'intervalles courts à vVO2max avec récupération active égale.",
    why: "Véronique Billat (chercheuse, a notamment coaché des champions du monde de cross) a documenté le format 30s à vVO2max / 30s à 50% vVO2max comme optimal pour maximiser le temps passé proche de VO2max sans effondrement précoce — la récupération active (pas à l'arrêt) est la clé du protocole.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 2×(12–15×30'' @ vVO2max / 30'' @ 50% vVO2max) récup 3' entre blocs + 10' retour au calme.",
    indicators: ["Allure constante sur l'ensemble du bloc", "Récupération active réellement courue, pas marchée"],
    risks: ["vVO2max doit être réellement estimée (test VMA récent), pas approximée", "Terrain plat nécessaire pour la précision du pacing"],
    tags: ["SPECIFIC", "TTE"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_run_11_daniels_r_pace",
    sport: "course",
    title: "Répétitions R-pace — Méthode Jack Daniels",
    objective: "Développer l'économie de course et la puissance à vitesse supramaximale avec récupération complète.",
    why: "Jack Daniels (auteur de référence, système VDOT) distingue le travail 'R' (Repetition, proche de l'allure 1500m-mile) du travail 'I' (Interval) — le R-pace cible la mécanique et l'économie de course, pas la VO2max, d'où une récupération complète entre répétitions.",
    when: "Toute l'année en entretien, davantage en pré-compétition pour affûter la vitesse. 1x/sem.",
    structure: "20' échauffement + strides + 8×200m @ allure R (environ allure mile) récup 200m trot complet (marche si besoin) + 10' retour au calme.",
    indicators: ["Technique de course fluide, pas crispée", "Temps constants sur les répétitions malgré la récupération complète"],
    risks: ["Vitesse élevée = risque musculaire si échauffement insuffisant", "Ne pas transformer en séance VO2max en raccourcissant la récup"],
    tags: ["NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_run_12_daniels_i_pace",
    sport: "course",
    title: "Intervalles I-pace — Méthode Jack Daniels",
    objective: "Maximiser le temps passé à VO2max (allure I = environ allure 3000–5000m).",
    why: "Le travail 'I' de Daniels cible spécifiquement VO2max avec une récupération égale au temps d'effort (jamais plus) — principe central du système VDOT pour progresser en endurance de vitesse.",
    when: "Build. 1x/sem.",
    structure: "20' échauffement + 5×1000m @ allure I (5km) récup 2–3' trot (égale au temps d'effort) + 10' retour au calme.",
    indicators: ["Temps constants sur les 5 répétitions (±2–3s)", "RPE élevé mais contrôlé sur la dernière répétition"],
    risks: ["Allure I doit être recalculée après chaque progrès de VMA/5km (table VDOT)", "Ne jamais dépasser le temps de récupération recommandé (perd l'effet recherché)"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 60
  },
  {
    id: "elite_run_13_gerschler_hr_recovery",
    sport: "course",
    title: "Intervalles à récupération pilotée par FC — Méthode Gerschler",
    objective: "Développer le volume d'éjection cardiaque via des répétitions dont la récupération est déterminée par le retour de la FC, pas par un temps fixe.",
    why: "Woldemar Gerschler (entraîneur de Rudolf Harbig, détenteur du record du monde du 800m dans les années 1930) est à l'origine de l'entraînement fractionné moderne — le principe clé, encore valable aujourd'hui, est de repartir dès que la FC redescend à ~120–130bpm plutôt qu'après un temps fixe, ce qui individualise réellement la récupération.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 10–12×200m à allure soutenue, repartir dès que la FC redescend à 120–130bpm (cardiofréquencemètre obligatoire) + 10' retour au calme.",
    indicators: ["FC redescend de façon prévisible entre répétitions (signe de forme)", "Temps aux 200m stables malgré la récupération variable"],
    risks: ["Nécessite un cardiofréquencemètre fiable et réactif", "Séance plus longue si la récupération cardiaque est lente — ne pas forcer le rythme"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 50
  },
  {
    id: "elite_run_14_igloi_ladder",
    sport: "course",
    title: "Échelle de distances variées — Méthode Igloi",
    objective: "Développer la capacité à changer de rythme sur des distances variées au sein d'une même séance.",
    why: "Mihaly Igloi (coach hongrois puis américain, a entraîné plusieurs recordmen du monde dans les années 1950–60) structurait ses séances en échelles de distances variées plutôt qu'en répétitions identiques — travaille la polyvalence et évite l'accoutumance à un seul rythme.",
    when: "Build. 1x/10j.",
    structure: "15' échauffement + 300m-400m-600m-800m-600m-400m-300m à allure 3000–5000m (récup trot = moitié du temps d'effort) + 10' retour au calme.",
    indicators: ["Allure adaptée correctement à chaque distance (pas uniforme)", "Dernières répétitions aussi propres que les premières"],
    risks: ["Nécessite une bonne connaissance de ses allures cibles par distance", "Format long — bien gérer l'énergie dès le début"],
    tags: ["SPECIFIC", "TTE"],
    level: "elite",
    duration_min: 65
  },
  {
    id: "elite_run_15_lydiard_time_trial",
    sport: "course",
    title: "Contre-la-montre hebdomadaire — Méthode Lydiard",
    objective: "Évaluer la forme et apporter un stimulus anaérobie contrôlé une fois par semaine.",
    why: "Arthur Lydiard intégrait un contre-la-montre hebdomadaire (distance fixe, effort maximal) comme repère de progression ET comme seule séance réellement anaérobie de la semaine — le reste du volume restant aérobie, cohérent avec sa philosophie de base aérobie massive puis affûtage ciblé.",
    when: "Phase d'affûtage (dernières semaines avant objectif). 1x/sem, jamais en base.",
    structure: "15' échauffement + Contre-la-montre effort maximal sur distance fixe (1 mile ou 3–5km selon niveau) + 15' retour au calme.",
    indicators: ["Temps en progression (ou stable) semaine après semaine", "Capacité à gérer l'effort sur toute la distance (pas de craquage)"],
    risks: ["Effort maximal = fatigue significative, à positionner loin d'une autre séance dure", "Nécessite un parcours fixe et comparable d'une semaine à l'autre pour être un vrai repère"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_run_16_broken_tempo",
    sport: "course",
    title: "Tempo fractionné — Format Salazar",
    objective: "Accumuler du temps à allure seuil/tempo avec de courtes pauses qui permettent de maintenir une allure plus rapide qu'en continu.",
    why: "Alberto Salazar (ancien coach du Nike Oregon Project) a popularisé le tempo fractionné avec de très courtes récupérations (30–60s) — permet de courir chaque segment à une allure plus proche du seuil réel qu'un tempo continu classique, pour un stimulus similaire avec moins de dégradation technique en fin de séance.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 4×10' @ allure seuil (récup 60'' marche) + 10' retour au calme.",
    indicators: ["Allure constante ou légèrement progressive sur les 4 segments", "Récupération courte réellement respectée (pas d'excès)"],
    risks: ["La tentation est de partir trop vite sur le 1er segment — garder une marge", "Ne pas allonger les récupérations au-delà de 60s (change la nature du stimulus)"],
    tags: ["TTE", "SPECIFIC"],
    level: "elite",
    duration_min: 65
  },
  {
    id: "elite_run_17_hudson_threshold_hills",
    sport: "course",
    title: "Seuil en côte — Méthode Brad Hudson",
    objective: "Combiner le stimulus seuil et le renforcement spécifique de la côte.",
    why: "Brad Hudson (coach de plusieurs athlètes olympiques américains, co-auteur de 'Run Faster') recommande d'intégrer du travail seuil directement sur terrain vallonné plutôt que sur plat — construit la force spécifique en même temps que la capacité aérobie, gain de temps et spécificité accrue pour les courses à profil varié.",
    when: "Build. 1x/10j.",
    structure: "15' échauffement + 25–30' continu @ allure seuil sur parcours vallonné (vallons modérés, pas de côtes raides) + 10' retour au calme.",
    indicators: ["Effort perçu stable malgré le relief (ajustement naturel de l'allure en côte)", "Pas d'essoufflement excessif dans les montées"],
    risks: ["Nécessite un parcours vallonné mais pas trop raide (sinon ça devient du travail de côte pur)", "Allure/FC à interpréter avec souplesse vu le relief (pas un chrono pur)"],
    tags: ["TTE", "SPECIFIC", "ENDURANCE"],
    level: "elite",
    duration_min: 60
  },
  {
    id: "elite_run_18_kenyan_pyramid_fartlek",
    sport: "course",
    title: "Fartlek pyramide — Méthode kényane",
    objective: "Développer la polyvalence d'allure via une structure progressive puis dégressive.",
    why: "Le fartlek en pyramide (1-2-3-4-5-4-3-2-1 minutes) est une structure classique des camps d'entraînement kényans (largement documentée, notamment par les travaux de Toby Tanser) — alterne les efforts et la récupération égale en durée, sans repère de distance, ce qui favorise l'écoute des sensations plutôt que le chrono.",
    when: "Build. 1x/sem.",
    structure: "15' échauffement + 1'-2'-3'-4'-5'-4'-3'-2'-1' à allure soutenue (récup trot égale à la durée de l'effort précédent) + 10' retour au calme.",
    indicators: ["Allure perçue cohérente sur l'ensemble (pas de craquage au pic à 5')", "Capacité à relancer après chaque récupération"],
    risks: ["Sans repère chrono précis, facile de partir trop vite — garder une marge sur les premiers efforts courts", "Terrain varié accepté (c'est dans l'esprit de la méthode), mais éviter le très technique"],
    tags: ["SPECIFIC", "TTE", "ENDURANCE"],
    level: "elite",
    duration_min: 60
  },
  {
    id: "elite_run_19_pfitzinger_medium_long_surges",
    sport: "course",
    title: "Sortie moyenne-longue avec surges — Méthode Pfitzinger",
    objective: "Introduire des changements de rythme dans une sortie moyenne-longue pour préparer la gestion tactique de course.",
    why: "Pete Pfitzinger (ancien marathonien olympique américain, auteur de référence sur l'entraînement marathon) intègre des surges courtes dans ses sorties moyennes-longues pour habituer le coureur à accélérer sur jambes déjà sollicitées — situation fréquente en course (relance, franchissement d'un concurrent).",
    when: "Base avancée / build marathon. 1x/10–14j.",
    structure: "70–90' Z2 continu avec 6–8 surges de 1' @ allure 10km insérées toutes les 10–12', retour immédiat au Z2 après chaque surge + 10' retour au calme.",
    indicators: ["Retour rapide au rythme de base après chaque surge", "Pas de dégradation technique sur les dernières surges"],
    risks: ["Fatigue cumulée supérieure à une sortie longue classique — à positionner avec recul par rapport aux autres séances qualité", "Terrain dégagé nécessaire pour les surges en sécurité"],
    tags: ["ENDURANCE", "SPECIFIC", "RACE_SIM"],
    level: "elite",
    duration_min: 90
  },

  // ---- NATATION (10) ----
  {
    id: "elite_swim_08_usrpt",
    sport: "natation",
    title: "USRPT — Ultra-Short Race-Pace Training",
    objective: "Automatiser l'allure course exacte via de très courtes répétitions, arrêtées dès que l'allure n'est plus tenue.",
    why: "L'USRPT (Dr. Brent Rushall, méthode publiée et étudiée scientifiquement) repose sur le principe que seul l'entraînement à l'allure course exacte produit un transfert optimal — dès qu'un nageur ne tient plus l'allure cible sur une répétition, le bloc s'arrête, ce qui garantit l'exactitude du stimulus plutôt que l'accumulation de fatigue.",
    when: "Spécifique pré-compétition. 2–3x/sem en cycle court.",
    structure: "Échauffement 400m + 20×25m @ allure course exacte (ou plus rapide) du 100m cible, récup 15–20'' — arrêter le bloc dès qu'une répétition dépasse l'allure cible de plus d'1s + 200m récup.",
    indicators: ["Allure cible tenue sur l'ensemble du bloc (sinon arrêt = signal de forme insuffisante)", "Technique stable malgré le nombre de répétitions"],
    risks: ["Nécessite un chronométrage précis à chaque répétition (ou partenaire/coach dédié)", "Ne garde que peu de place pour le travail aérobie classique si suivi à la lettre — à utiliser en complément, pas en remplacement total"],
    tags: ["SPECIFIC", "RACE_SIM"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_swim_09_bowman_descending_400",
    sport: "natation",
    title: "400m fractionné descendant — Inspiré Bob Bowman",
    objective: "Développer la capacité à accélérer en fin d'effort sur une distance type course.",
    why: "Bob Bowman (coach de Michael Phelps) utilise des sets fractionnés où chaque segment doit être plus rapide que le précédent — entraîne la gestion de course négative (negative split), signature de nombreuses performances de ses nageurs.",
    when: "Build / spécifique. 1x/sem.",
    structure: "Échauffement 400m + 4×(4×100m descendant, chaque 100m plus rapide que le précédent, récup 10'' entre 100m, récup 1' entre blocs) + 200m récup.",
    indicators: ["Dernier 100m de chaque bloc effectivement le plus rapide", "Technique maintenue malgré l'accélération"],
    risks: ["Tentation de partir trop vite sur le 1er 100m — garder de la marge pour pouvoir réellement descendre", "Fatigue d'épaule si volume élevé — surveiller la technique de rattrapé"],
    tags: ["SPECIFIC", "RACE_SIM", "TTE"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_10_counsilman_send_off",
    sport: "natation",
    title: "Répétitions à départ fixe — Méthode Counsilman",
    objective: "Développer l'endurance spécifique via des répétitions à intervalle de départ fixe plutôt qu'à récupération fixe.",
    why: "James 'Doc' Counsilman (considéré comme le père de l'entraînement scientifique moderne en natation) a popularisé le travail à départ fixe (ex: départ toutes les 1'30 quel que soit le temps de nage) — la récupération devient directement un indicateur de forme : plus le nageur est en forme, plus elle est longue.",
    when: "Base / build. 1–2x/sem.",
    structure: "Échauffement 400m + 12×100m départ toutes les 1'30 (ajuster l'intervalle selon niveau) + 200m récup.",
    indicators: ["Temps constants sur l'ensemble du set", "Récupération ressentie suffisante avant chaque départ (signe de bon calibrage de l'intervalle)"],
    risks: ["Intervalle mal calibré = soit trop facile (pas de stimulus), soit impossible à tenir — ajuster après les premières répétitions si besoin", "Fatigue d'épaule en cas de volume élevé répété"],
    tags: ["TTE", "ENDURANCE"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_11_sweetenham_broken_pyramid",
    sport: "natation",
    title: "Pyramide fractionnée — Méthode Bill Sweetenham",
    objective: "Développer la tolérance lactique via une structure pyramidale de distances croissantes puis décroissantes.",
    why: "Bill Sweetenham (ancien directeur de la performance de la natation britannique et australienne) structure ses séries les plus exigeantes en pyramide fractionnée — la montée construit la fatigue progressivement, la descente teste la capacité à maintenir la qualité technique sous fatigue accumulée.",
    when: "Build avancé. 1x/10–14j, athlètes expérimentés.",
    structure: "Échauffement 400m + 50-100-150-200-150-100-50m @ effort soutenu (récup 15–30'' proportionnelle à la distance) + 200m récup.",
    indicators: ["Technique maintenue sur la phase descendante malgré la fatigue accumulée", "Temps cohérents sur les segments de même distance (50m aller vs 50m retour)"],
    risks: ["Set très exigeant physiologiquement — réserver aux nageurs expérimentés avec base solide", "Surveiller la technique de respiration en fin de pyramide (signe de fatigue excessive)"],
    tags: ["METABOLIC", "SPECIFIC"],
    level: "elite",
    duration_min: 50
  },
  {
    id: "elite_swim_12_catch_technique_resisted",
    sport: "natation",
    title: "Technique de prise d'eau résistée — Inspiré Gennadi Touretski",
    objective: "Renforcer la prise d'eau (catch) en début de traction via une résistance légère.",
    why: "Gennadi Touretski (coach d'Alexander Popov et Ian Thorpe) place un accent particulier sur la qualité de prise d'eau haute du coude — le travail résisté (plaquettes fines, élastique léger) exagère la sensation de surface pour mieux l'automatiser ensuite en nage libre.",
    when: "Toute l'année en travail technique. 1x/sem, en début de séance (technique sur jambes fraîches).",
    structure: "200m éducatifs catch-up + 8×50m avec plaquettes fines, focus exclusif sur la prise d'eau haute du coude (vitesse modérée, pas de recherche de vitesse) + 200m nage libre en intégrant la sensation.",
    indicators: ["Coude haut maintenu visuellement tout au long de la traction", "Sensation de 'prise' nette dès l'entrée de la main"],
    risks: ["Plaquettes = risque épaule si mal utilisées (jamais en fatigue, jamais en vitesse maximale)", "Progressivité sur la taille des plaquettes (commencer très fines)"],
    tags: ["NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 40
  },
  {
    id: "elite_swim_13_dave_scott_tri_specific",
    sport: "natation",
    title: "Natation spécifique enchaînement — Méthode Dave Scott",
    objective: "Préparer la sortie d'eau et l'enchaînement vers le vélo, pas seulement la performance de nage pure.",
    why: "Dave Scott (6 fois vainqueur de l'Ironman Hawaii, coach reconnu) insiste sur le fait que la nage en triathlon n'est pas une performance isolée — elle doit préparer physiquement la sortie d'eau et la mise en action rapide sur vélo, d'où des répétitions qui simulent l'intensité et la sortie immédiate.",
    when: "Spécifique triathlon, pré-compétition. 1x/sem.",
    structure: "Échauffement 600m + 6×200m @ allure course avec les 25 derniers mètres en accélération + sortie rapide du bassin simulée (si possible) + 200m récup.",
    indicators: ["Accélération effective sur les 25 derniers mètres de chaque répétition", "Sensation de jambes 'prêtes' à la sortie (pas lourdes)"],
    risks: ["La sortie simulée n'a de sens qu'en piscine avec échelle/plage accessible — sinon se concentrer sur l'accélération finale seule", "Ne pas négliger l'échauffement malgré le format orienté intensité"],
    tags: ["RACE_SIM", "SPECIFIC"],
    level: "elite",
    duration_min: 55
  },
  {
    id: "elite_swim_14_sighting_technique",
    sport: "natation",
    title: "Technique de visée eau libre — Méthode Sheila Taormina",
    objective: "Automatiser la visée (sighting) sans casser le rythme de nage ni la technique.",
    why: "Sheila Taormina (seule athlète olympique dans 3 disciplines différentes, spécialiste reconnue de la technique eau libre) documente la visée comme une compétence technique à part entière à automatiser en bassin avant de l'exporter en eau libre — mal maîtrisée, elle casse l'alignement du corps et coûte cher en efficacité.",
    when: "Avant compétition eau libre. 1–2x/sem dans les semaines précédant la course.",
    structure: "200m échauffement + 10×100m avec visée toutes les 6–8 brasses (lever les yeux brièvement façon crocodile, sans lever toute la tête) + travail spécifique en dernière longueur sur bouée/repère fixe si possible.",
    indicators: ["Visée brève (une fraction de seconde), pas de cassure prolongée du rythme", "Alignement du corps maintenu pendant et après la visée"],
    risks: ["Visée trop fréquente ou trop prolongée coûte en efficacité — doser selon besoin réel du parcours", "S'entraîner aussi en conditions réelles (vagues, soleil) avant la course si possible"],
    tags: ["SPECIFIC", "RACE_SIM"],
    level: "elite",
    duration_min: 40
  },
  {
    id: "elite_swim_15_resisted_power",
    sport: "natation",
    title: "Sprints résistés — Inspiré Dara Torres",
    objective: "Développer la puissance de nage pure via une résistance ajoutée (parachute ou élastique).",
    why: "Dara Torres (sprinteuse olympique, a prolongé sa carrière de haut niveau grâce à un travail de force/puissance spécifique poussé) intègre des sprints résistés pour développer une force propulsive que la nage libre seule ne sollicite pas suffisamment.",
    when: "Build / affûtage sprint. 1x/sem, athlètes expérimentés.",
    structure: "Échauffement 400m + 8×25m avec parachute ou élastique résistant, effort maximal, récup complète 1' + 8×25m nage libre immédiatement après retrait de la résistance (sensation de 'légèreté') + 200m récup.",
    indicators: ["Effort maximal réellement atteint sur chaque 25m résisté", "Sensation de vitesse accrue nette sur les 25m libres post-résistance"],
    risks: ["Charge articulaire épaule élevée — jamais en fatigue, surveiller tout signe de gêne", "Récupération complète impérative entre répétitions (travail de puissance, pas d'endurance)"],
    tags: ["NEURO", "SPECIFIC"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_swim_16_underwater_dolphin",
    sport: "natation",
    title: "Phase sous-marine — Travail du dauphin",
    objective: "Optimiser la phase sous-marine après chaque virage/départ, devenue un facteur de performance majeur.",
    why: "Depuis les Jeux Olympiques de Rio 2016, le travail spécifique de la phase sous-marine (ondulations dauphin après départs et virages) s'est généralisé à haut niveau — chez les meilleurs nageurs, cette phase peut représenter plusieurs dixièmes voire secondes gagnées par longueur, d'où un travail dédié plutôt qu'un sous-produit du reste de l'entraînement.",
    when: "Toute l'année, davantage en pré-compétition. 1x/sem, en complément de la nage.",
    structure: "200m échauffement + 10×15m ondulations dauphin sous l'eau depuis le mur (planche ou bras tendus), repos complet entre chaque + 6×50m départ plongé avec phase sous-marine maximale réglementaire + sortie en nage + 200m récup.",
    indicators: ["Nombre d'ondulations constant et amplitude stable sur les répétitions", "Distance sous-marine proche du maximum réglementaire (15m)"],
    risks: ["Respecter strictement la limite réglementaire de 15m en compétition — ne pas prendre de mauvaises habitudes à l'entraînement", "Vertige/essoufflement possible si répétitions trop rapprochées — récupération complète nécessaire"],
    tags: ["NEURO", "SPECIFIC", "RACE_SIM"],
    level: "elite",
    duration_min: 45
  },
  {
    id: "elite_swim_17_mixed_stroke_rate",
    sport: "natation",
    title: "Fréquence de bras variable — Contrôle du tempo",
    objective: "Développer la capacité à moduler volontairement la fréquence de bras selon l'intensité cible, plutôt que de la subir.",
    why: "Les nageurs de haut niveau modulent consciemment leur fréquence de bras (stroke rate) selon la portion de course — un travail dédié à la variation contrôlée de fréquence (plutôt que la vitesse pure) développe cette capacité de pilotage, utile pour gérer les changements de rythme en course.",
    when: "Build. 1x/sem.",
    structure: "Échauffement 400m + 8×100m en alternant 25m fréquence basse (amplitude maximale) / 25m fréquence haute (tempo rapide, amplitude réduite) / 25m fréquence basse / 25m fréquence haute, récup 20'' + 200m récup.",
    indicators: ["Changement de fréquence net et volontaire à chaque 25m (pas une dérive progressive)", "Vitesse globale maintenue malgré l'alternance"],
    risks: ["Ne pas confondre fréquence haute et désorganisation technique — la fréquence doit rester propre", "Séance technique, pas une séance d'intensité pure — doser l'effort en conséquence"],
    tags: ["NEURO", "SPECIFIC"],
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
