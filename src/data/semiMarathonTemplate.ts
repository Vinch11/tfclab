/**
 * Template Semi-Marathon 12 semaines
 * Importé depuis SEMI.xlsx
 */
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";

export const SEMI_MARATHON_WEEKS: TemplateWeek[] = [
  // PHASE 1 - Développement Moteur (Semaines 1-4)
  {
    weekNumber: 1,
    sessions: [
      { day: "Lundi", sport: "Vélo", title: "Repos / Vélo", details: "45' Z1 (mouliner pour vasculariser)" },
      { day: "Mardi", sport: "CAP", title: "VMA Courte", details: "20' WU + 2 x (10 x 30\" Z6 / 30\" Z1) R:3' + 10' CD. Focus: Dynamisme" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "50' Z2 pure" },
      { day: "Jeudi", sport: "CAP", title: "Force Max", details: "20' WU + 10 x 15\" Sprint en côte raide (Z7) r:2' marche + 10' CD. Focus: Poussée" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing actif", details: "45' Z2 + 5 lignes droites (accélérations sur 100m)" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h15 Z2 sur terrain vallonné" },
    ],
    coachAdvice: "Phase 1 - Développement Moteur : Activation & Vitesse (VO2max & Force)",
  },
  {
    weekNumber: 2,
    sessions: [
      { day: "Lundi", sport: "Natation", title: "Repos / Natation", details: "45' cool" },
      { day: "Mardi", sport: "CAP", title: "VMA Moyenne", details: "20' WU + 15 x 1' Z6 (100-105% VMA) r:1' Z1 + 10' CD" },
      { day: "Mercredi", sport: "Vélo/CAP", title: "Vélo ou Footing", details: "1h Vélo Z2 ou 50' Footing Z2" },
      { day: "Jeudi", sport: "CAP", title: "Renfo / Seuil", details: "20' WU + 3 x 8' Z3 haut/Z4a bas (Tempo) r:2' + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing", details: "45' Z2 tranquille" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h20 Z2 dont 20' central en Z3" },
    ],
    coachAdvice: "Charge VO2max",
  },
  {
    weekNumber: 3,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "VO2max Longue", details: "20' WU + 5 x 3' à Z5 haute/Z6 basse (95-98% VMA) r:2' + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "1h Footing Z2" },
      { day: "Jeudi", sport: "CAP", title: "Force Spécifique", details: "20' WU + 12 x 45\" Côte (Z6) r:1'30 descente + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Technique", details: "40' Z2 + Gammes techniques" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h30. Intégrer 3 x 5' Z4a (Allure Marathon) au milieu" },
    ],
    coachAdvice: "Pic Intensité (Semaine dure)",
  },
  {
    weekNumber: 4,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Entretien", details: "20' WU + 10 x 45\" Z5/Z6 r:45\" + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "45' Z2" },
      { day: "Jeudi", sport: "Repos", title: "Repos / Stretch", details: "Repos ou Stretching actif" },
      { day: "Vendredi", sport: "CAP", title: "Réveil", details: "30' Z1/Z2 + 4 accélérations" },
      { day: "Samedi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Dimanche", sport: "CAP", title: "Endurance", details: "1h10 Z2 strict (Recharge)" },
    ],
    coachAdvice: "Assimilation (Allégée)",
  },
  // PHASE 2 - Seuil & Endurance (Semaines 5-8)
  {
    weekNumber: 5,
    sessions: [
      { day: "Lundi", sport: "Natation", title: "Repos / Natation", details: "Repos ou Natation" },
      { day: "Mardi", sport: "CAP", title: "Seuil Anaérobie", details: "20' WU + 4 x 6' Z5 bas r:2' trot + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "1h Footing Z2" },
      { day: "Jeudi", sport: "CAP", title: "Tempo", details: "15' WU + 30' continu en Z3 haut/Z4a + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing", details: "50' Z2 terrain varié" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h30. Finir les 15 dernières minutes en Z3" },
    ],
    coachAdvice: "Phase 2 - Seuil & Endurance : Entrée dans le Seuil (Cible: Sweet Spot)",
  },
  {
    weekNumber: 6,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Seuil Anaérobie", details: "20' WU + 3 x 10' Z5 bas r:2'30 trot + 10' CD. Séance clé" },
      { day: "Mercredi", sport: "Vélo/CAP", title: "Vélo ou Footing", details: "1h15 Vélo Z2 ou 50' Footing" },
      { day: "Jeudi", sport: "CAP", title: "Vitesse rappel", details: "20' WU + 12 x 200m Z6 (Vite et relâché) r:40\" + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing", details: "45' Z2" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h40. Intégrer 2 x 15' Z4a (Allure Marathon) r:5' Z2" },
    ],
    coachAdvice: "Soutien",
  },
  {
    weekNumber: 7,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Seuil Extensif", details: "20' WU + 3 x 12' Z4b/Z5 (Mix allure semi/seuil) r:3' + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "1h Footing Z2" },
      { day: "Jeudi", sport: "CAP", title: "Continu", details: "15' WU + 40' Z3 haut/Z4a (Allure Marathon) + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing actif", details: "50' Z2 + 5 lignes droites" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h45. Intégrer 30' Z3 en un bloc au milieu" },
    ],
    coachAdvice: "\"Mur\" du volume",
  },
  {
    weekNumber: 8,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Entretien", details: "20' WU + 2 x 10' Z4a (Marathon) r:2' + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "45' Z2" },
      { day: "Jeudi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Vendredi", sport: "CAP", title: "Footing", details: "30' Z2" },
      { day: "Samedi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Dimanche", sport: "CAP", title: "Endurance", details: "1h15 Z2. Préparation bloc spécifique" },
    ],
    coachAdvice: "Assimilation (Allégée)",
  },
  // PHASE 3 - Spécifique (Semaines 9-11)
  {
    weekNumber: 9,
    sessions: [
      { day: "Lundi", sport: "Natation", title: "Repos / Natation", details: "Repos ou Natation Z1" },
      { day: "Mardi", sport: "CAP", title: "Spécifique Long", details: "20' WU + 3 x 3000m à Z4b r:2'30. Cible: 12'00/3km. Max 3:58/km" },
      { day: "Mercredi", sport: "CAP", title: "Récup", details: "1h Footing Z2 récup" },
      { day: "Jeudi", sport: "CAP", title: "Rappel VMA", details: "20' WU + 10 x 400m Z5/Z6 r:1' + 10' CD" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Footing", details: "45' Z2 cool" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h45. Pyramide : 15' Z4a + 10' Z4b + 5' Z5 (r:2' Z2 entre blocs)" },
    ],
    coachAdvice: "Phase 3 - Spécifique : Choc Spécifique 1 (Allure AS21 - Z4b)",
  },
  {
    weekNumber: 10,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Le Juge de Paix", details: "20' WU + 2 x 5000m à Z4b R:3' trot + 10' CD. Cible: 20'00/5km" },
      { day: "Mercredi", sport: "Vélo", title: "Vélo", details: "45' Vélo Z1 très souple (indispensable)" },
      { day: "Jeudi", sport: "CAP", title: "Footing", details: "50' Z2 dont 10' Z3 décrassage" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Technique", details: "40' Z2 + gammes" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Longue", details: "1h30. Intégrer 20' à Z4b après 45' de course (simuler fatigue)" },
    ],
    coachAdvice: "LA Semaine Clé",
  },
  {
    weekNumber: 11,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Mardi", sport: "CAP", title: "Rappel Spé", details: "20' WU + 3 x 2000m Z4b r:2' + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "50' Z2" },
      { day: "Jeudi", sport: "Natation", title: "Repos / Natation", details: "Repos ou 30' Natation" },
      { day: "Vendredi", sport: "Repos", title: "Repos", details: "Repos complet" },
      { day: "Samedi", sport: "CAP", title: "Réveil", details: "30' Z2 + 4 x 100m progressifs" },
      { day: "Dimanche", sport: "CAP", title: "Sortie Courte", details: "1h00 Z2 dont seulement 10' à Z4a. (Volume réduit 30-40%)" },
    ],
    coachAdvice: "Affûtage progressif",
  },
  // PHASE 4 - Affûtage & Course (Semaine 12)
  {
    weekNumber: 12,
    sessions: [
      { day: "Lundi", sport: "Repos", title: "Repos", details: "Repos total. Massage si possible" },
      { day: "Mardi", sport: "CAP", title: "Dernière touche", details: "20' WU + 3 x 1000m à Z4b r:2' ample + 10' CD" },
      { day: "Mercredi", sport: "CAP", title: "Footing", details: "40' Z1/Z2 très lent" },
      { day: "Jeudi", sport: "Repos", title: "Repos", details: "Repos complet. Hydratation +++" },
      { day: "Vendredi", sport: "CAP", title: "Réveil (Option)", details: "20' réveil musculaire + 3 accélérations (ou repos si voyage)" },
      { day: "Samedi", sport: "Repos", title: "Repos / Test", details: "Repos ou 15' trot test chaussures. Charge glucidique" },
      { day: "Dimanche", sport: "CAP", title: "🏅 SEMI-MARATHON", details: "KM 0-5 : Z4a haut (Calme). KM 5-15 : Z4b (Calé 4:00/km). KM 15-21 : Z5 (Mental / Ouvrir les vannes)" },
    ],
    coachAdvice: "Phase 4 - Affûtage & Course : Tapering & Race",
  },
];
