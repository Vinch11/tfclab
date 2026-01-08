/**
 * Template Ironman 70.3 - 24 semaines
 * Basé sur la méthodologie Dan Lorang
 */
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";

export const IRONMAN_703_WEEKS: TemplateWeek[] = [
  // PHASE 1 : VITESSE/VO2MAX - Semaine 1
  {
    weekNumber: 1,
    phase: "🟥 Phase 1 : Vitesse/VO2max",
    theme: "État des Lieux & Explosivité",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Technique & Réveil", description: "45'. 10x50m Educ, 8x25m SPRINT MAX départ 1'.", notes: "Puissance pure pas de fatigue." },
      { day: "Mardi", discipline: "C.A.P", title: "TEST VMA", description: "1h00. 20' WU. Test Demi-Cooper (6 min à fond).", notes: "Mentalité Chasseur: ne garde rien sous le pied." },
      { day: "Mercredi", discipline: "Vélo", title: "Neuro & Vélocité", description: "1h15 HT. 6 x 10\" Sprints Explosifs R:4'.", notes: "Réveiller le système nerveux central." },
      { day: "Jeudi", discipline: "Natation", title: "TEST CSS", description: "1h00. 400m Max + 200m Max.", notes: "" },
      { day: "Vendredi", discipline: "Repos", title: "Gainage", description: "30' Gainage (Obliques/Lombaires).", notes: "Position aéro 70.3 plus agressive que IM." },
      { day: "Samedi", discipline: "Vélo", title: "TEST PMA/FTP", description: "1h15 HT. Ramp Test (ou 20min test).", notes: "PMA est un facteur clé sur 70.3." },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance & Brique", description: "2h00 Vélo Z2 + 20' CAP Progressif (fin Z4).", notes: "Habitue-toi à consommer 60-70g glucides/h." },
    ],
  },
  // PHASE 1 : VITESSE/VO2MAX - Semaine 2
  {
    weekNumber: 2,
    phase: "🟥 Phase 1 : Vitesse/VO2max",
    theme: "Développement VO2max (Turbo)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Vitesse & Explosivité", description: "1h00. 12 x 50m Départ 1'15 (Nage Z5).", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Courte (30/30)", description: "1h00. 2 x (10 x 30\" Z5 / 30\" Z1).", notes: "Goût du sang dans la bouche requis." },
      { day: "Mercredi", discipline: "Vélo", title: "PMA Courte", description: "1h15 HT. 2 x (10 x 30\" à 120-130% / 30\" Z1).", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Seuil CSS", description: "1h00. 15 x 100m Allure CSS (Z4). R:15-20\".", notes: "" },
      { day: "Vendredi", discipline: "Repos", title: "OFF", description: "Repos complet conseillé.", notes: "" },
      { day: "Samedi", discipline: "C.A.P", title: "Renfo & Côtes", description: "1h00. 8 x 45\" côte rapide (Z5).", notes: "Poussée genoux hauts." },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance & Brique", description: "2h45 Vélo (avec 3x10' Z3) + 30' CAP (10' Z3 haut).", notes: "Adopte ta cadence course (180spm) immédiatement à pied." },
    ],
  },
  // PHASE 1 : VITESSE/VO2MAX - Semaine 3
  {
    weekNumber: 3,
    phase: "🟥 Phase 1 : Vitesse/VO2max",
    theme: "Surcharge VMA/PMA",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Tolérance Lactique", description: "1h00. 12 x 100m (50m SPRINT + 10s pause + 50m souple).", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Longue", description: "1h15. 12 x 400m à 105% VMA. R:1'15.", notes: "Régularité à la seconde près." },
      { day: "Mercredi", discipline: "Vélo", title: "PMA Longue", description: "1h15 HT. 5 x 4' à 110-112% FTP. R:4'.", notes: "Si tu craques ne baisse pas les watts finis en Z4." },
      { day: "Jeudi", discipline: "Natation", title: "Endurance Vitesse", description: "1h00. 6 x 300m (200 CSS / 100 Vite).", notes: "" },
      { day: "Vendredi", discipline: "Repos", title: "TOTAL OFF", description: "Dors.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Force Explosive", description: "3h00. Attaque toutes les bosses < 5min en Z4/Z5.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance & Seuil", description: "2h30 Vélo + 40' CAP (2 x 10' Z4 Seuil).", notes: "Courir au seuil après le vélo est violent mais nécessaire." },
    ],
  },
  // PHASE 1 : VITESSE/VO2MAX - Semaine 4
  {
    weekNumber: 4,
    phase: "🟥 Phase 1 : Vitesse/VO2max",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Zéro sport.", notes: "" },
      { day: "Mardi", discipline: "Natation", title: "Technique & Glisse", description: "45'. 800m Pull Hypoxie + 8x25m Sprint.", notes: "" },
      { day: "Mercredi", discipline: "C.A.P", title: "Rappel Vitesse Light", description: "45'. 6 x 15\" Vite / 45\" Trot.", notes: "Juste qualité de pied." },
      { day: "Jeudi", discipline: "Vélo", title: "Vélocité", description: "1h00 Z1/Z2. 5 x 1' à 110-120 rpm.", notes: "Interdit de transformer en séance PMA même si tu te sens bien." },
      { day: "Vendredi", discipline: "Repos", title: "TOTAL OFF", description: "Check-up matériel.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Coffee Ride", description: "2h00 Z2 bas. Pas d'enchaînement.", notes: "" },
      { day: "Dimanche", discipline: "C.A.P", title: "Endurance Fondamentale", description: "1h00 Z2 stable.", notes: "" },
    ],
  },
  // PHASE 2 : FORCE & SEUIL - Semaine 5
  {
    weekNumber: 5,
    phase: "🟧 Phase 2 : Force & Seuil",
    theme: "Début Chantier Force",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force Spécifique", description: "1h00. 4 x 400m Pull+Grosses Plaquettes Z3.", notes: "Cherche à attraper l'eau loin devant." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Anaérobie", description: "1h10. 3 x 8' au Seuil (Z4). R:2'.", notes: "Ne pars pas à allure VMA ! Vise allure 10km." },
      { day: "Mercredi", discipline: "Vélo", title: "Force Endurance K3", description: "1h30 HT. 3 x 12' à 85-90% FTP. Cadence 50-55 RPM.", notes: "Douleur musculaire OK douleur articulaire (genou) NON -> monte à 60rpm." },
      { day: "Jeudi", discipline: "Natation", title: "Seuil CSS", description: "1h00. 15 x 100m CSS (Z4). R:15\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Entretien PMA", description: "1h00 HT. 10 x 40\"/20\". Rappel.", notes: "" },
      { day: "Samedi", discipline: "C.A.P", title: "Endurance & Renfo", description: "1h00. Footing Z2 avec 10 côtes de 30\" toniques.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Sortie Longue Rythme", description: "3h00 Vélo (2x20' Tempo) + 20' CAP (10' Z4).", notes: "Nutrition: Vise 180g glucides total sur le vélo." },
    ],
  },
  // PHASE 2 : FORCE & SEUIL - Semaine 6
  {
    weekNumber: 6,
    phase: "🟧 Phase 2 : Force & Seuil",
    theme: "Progression Force",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force & Gainage", description: "1h05. 3 x 800m (Plaq+Pull+Élastique).", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Extension", description: "1h15. 3 x 12' Seuil (Z4). R:3'.", notes: "Allure cible 70.3 - réserve de vitesse." },
      { day: "Mercredi", discipline: "Vélo", title: "Force Max Broyeur", description: "1h40 HT. 3 x 15' à 88-92% FTP. Cadence 50-55 RPM.", notes: "Fibres rapides travaillent en aérobie." },
      { day: "Jeudi", discipline: "Natation", title: "Endurance CSS", description: "1h00. 10 x 200m CSS (Z4). R:20\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00 Z1/Z2 souple.", notes: "" },
      { day: "Samedi", discipline: "C.A.P", title: "Force Explosive", description: "1h00. 8 x 1'00 Côte Forte (Z5).", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Brique 70.3", description: "3h15 Vélo (3x20' Tempo 60-70rpm) + 25' CAP (15' Z4).", notes: "Test nutrition : 70g glucides/h." },
    ],
  },
  // PHASE 2 : FORCE & SEUIL - Semaine 7
  {
    weekNumber: 7,
    phase: "🟧 Phase 2 : Force & Seuil",
    theme: "Pic de Charge (Force)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force Brute", description: "1h10. 10 x 300m Plaquettes/Pull Z3. R:20\".", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Le Juge", description: "1h20. 3 x 15' Seuil (Z4). R:3'.", notes: "Si tu exploses au 3ème bloc réduis l'allure de 5\"/km." },
      { day: "Mercredi", discipline: "Vélo", title: "Force Max Monstre", description: "1h45 HT. 3 x 20' à 88-92% FTP. Cadence 50-55 RPM.", notes: "Attention tendinites rotuliennes." },
      { day: "Jeudi", discipline: "Natation", title: "Seuil Vitesse", description: "1h00. 20 x 100m CSS (Z4). R:10-15\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00 Z1/Z2 moulinage.", notes: "" },
      { day: "Samedi", discipline: "C.A.P", title: "Force & Puissance", description: "1h10. 6 x 2'00 Côte Soutenue (Z4/Z5).", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Grosse Brique", description: "3h45 Vélo (3x25' Tempo) + 30' CAP (20' Z4).", notes: "Creuser le trou de fatigue avant la récup." },
    ],
  },
  // PHASE 2 : FORCE & SEUIL - Semaine 8
  {
    weekNumber: 8,
    phase: "🟧 Phase 2 : Force & Seuil",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dors, protéines.", notes: "" },
      { day: "Mardi", discipline: "Natation", title: "Vitesse Neuro", description: "40'. 800m Pull Z2 + 8x25m Sprint.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Vélocité", description: "1h00 Z1/Z2. 5 x 1' à 110-120 RPM.", notes: "Redonner de la souplesse après la force." },
      { day: "Jeudi", discipline: "C.A.P", title: "Technique", description: "45'. 6 x 20\" Strides.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Plaisir", description: "40'. Z2 bas.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Check vélo.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Test Fraîcheur", description: "2h00 Vélo (Test 20' Watts 70.3) + 20' CAP Z3.", notes: "FC doit être plus basse qu'en S5 pour mêmes watts." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 9
  {
    weekNumber: 9,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Rythme de Course",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Endurance Vitesse", description: "1h05. 3 x 800m Plaquettes Z3. R:45\".", notes: "Vise 1900m < 30-32'." },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo 70.3", description: "1h15. 2 x 20' Z4 (Allure 70.3). R:3'.", notes: "Métronome sur 20 minutes. Si tu dévisses l'allure est trop haute." },
      { day: "Mercredi", discipline: "Vélo", title: "Sweet Spot Cadence", description: "1h30 HT. 3 x 15' à 88-92% FTP. Cadence 90-95 RPM.", notes: "Cardio montera plus vite qu'en force (transfert cardio)." },
      { day: "Jeudi", discipline: "Natation", title: "Red Mist", description: "1h00. 20 x 100m Départ serré (CSS+10\").", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00. Focus position aéro.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Race Pace", description: "3h00. 3 x 20' Allure 70.3 (80-85% FTP).", notes: "Nutrition : 70-80g glucides/h." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue", description: "1h20. Finir 15' Z3 haut.", notes: "" },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 10
  {
    weekNumber: 10,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Volume d'Intensité",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Seuil & Mental", description: "1h10. 5 x 400m Z4. R:30\".", notes: "Negative Split sur les 400m." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Long", description: "1h20. 3 x 15' Z4 (Allure 70.3). R:2'30\".", notes: "Garder cadence 180spm même fatigué." },
      { day: "Mercredi", discipline: "Vélo", title: "Sweet Spot Maintien", description: "1h40 HT. 3 x 20' à 88-92% FTP. 90-95 RPM.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse & Draft", description: "1h00. 30 x 50m (25 Vite / 25 Course).", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00 Z1.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Rythme", description: "3h15. 2 x 30' Allure 70.3 (80-85% FTP).", notes: "Surveiller Dérive Cardiaque (Max 5%)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Active", description: "1h30. 1h Z2 + 30' Z3 haut.", notes: "" },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 11
  {
    weekNumber: 11,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Pic de Charge Spécifique",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Seuil & Volume", description: "1h15. 4 x 800m Plaq+Pull Z3. R:45\".", notes: "Mental : Nager 2x la distance course." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Extensif", description: "1h25. 3 x 20' Z4 (Allure 70.3). R:3'.", notes: "1h totale à allure spécifique. Séance étalon." },
      { day: "Mercredi", discipline: "Vélo", title: "Sweet Spot Monstre", description: "2h00 HT. 4 x 20' à 88-92% FTP. 90-95 RPM.", notes: "Bois 1 bidon/h minimum (surchauffe)." },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse Critique", description: "1h00. 20 x 100m Départ serré (CSS+2\").", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h15 Z2. 3 x 1' à 110 rpm.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie World Champ", description: "3h30. 3 x 30' à 85% FTP. Aéro stricte.", notes: "Nutrition : 90g glucides/h MANDATOIRE." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Pré-Fatigue", description: "1h40. 1h10 Z2 + 30' Z3/Z4.", notes: "Signaux fatigue: Sommeil agité normal." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 12
  {
    weekNumber: 12,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dors, sieste.", notes: "" },
      { day: "Mardi", discipline: "Natation", title: "Vitesse Neuro", description: "45'. 10 x 25m Sprint Max.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Vélocité", description: "1h00 Z2. 5 x 1' à 110-120 RPM.", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Rappel Technique", description: "45'. 6 x 20\" Strides.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Endurance Tech", description: "45'. Pull Hypoxie Z2.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Check complet vélo.", notes: "" },
      { day: "Dimanche", discipline: "Vélo", title: "Sortie Sociale", description: "2h00 Z2. Pas d'enchaînement.", notes: "Si 1-2kg à perdre serrer nutrition le soir cette semaine." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 13
  {
    weekNumber: 13,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Volume Spécifique & Briques",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Aérobie", description: "1h10. 3 x 1000m Z3. R:45\".", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo 70.3", description: "1h15. 3 x 12' Z4 (Allure 70.3). R:2'.", notes: "Respecter allure exacte." },
      { day: "Mercredi", discipline: "Vélo", title: "Spécifique Race Pace", description: "2h00. 4 x 15' à 85-90% FTP. 90-95 rpm.", notes: "100% Aéro." },
      { day: "Jeudi", discipline: "Natation", title: "Simulation Eau Libre", description: "1h00. 40 x 50m CSS. Départ 1'.", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Aéro & Souplesse", description: "1h15 Z2. 90% Prolongateurs.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Longue Spécifique", description: "3h30. 2 x 40' Allure 70.3 (80-85%). + 15' CAP Z4.", notes: "Reste couché même pour boire. Nutrition 80g/h avec alarme." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Fatigue", description: "1h30. Finir 20' Z3 haut.", notes: "" },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 14
  {
    weekNumber: 14,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Endurance Densité +",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Seuil & Mental", description: "1h15. 5 x 600m Plaquettes Z3. R:30\".", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo 70.3 Extension", description: "1h20. 3 x 15' Z4. R:2'30\".", notes: "Gérer le lactate." },
      { day: "Mercredi", discipline: "Vélo", title: "Spécifique Race Watts", description: "2h15. 3 x 20' à 85-90% FTP. 90-95 rpm.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse Lactique", description: "1h00. 15 x 100m MAX (Z5). R:30-40\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h30 Z2. 3 x 1' Vélocité.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Simulation 90km", description: "4h00. 3 x 30' Allure 70.3. + 20' CAP Z4 immédiat.", notes: "Brique violente : trouver allure cible dès 500m." },
      { day: "Dimanche", discipline: "C.A.P", title: "Longue Durabilité", description: "1h40. Finir 30' Z3 haut.", notes: "" },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 15
  {
    weekNumber: 15,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Pic de Charge (The Big Week)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Spécifique", description: "1h20. 2 x 1500m Broken (accéléré).", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Test Ultime", description: "1h30. 3 x 20' Z4. R:3'.", notes: "1h à allure course." },
      { day: "Mercredi", discipline: "Vélo", title: "Temps Limite", description: "2h30. 2 x 45' à 85-90% FTP. R:10'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse & Surcharge", description: "1h05. 30 x 100m CSS. Départ serré.", notes: "C'est ici que tu gagnes ton mental." },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h30 Z1/Z2. Mange/Bois pendant la sortie.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "RÉPÉTITION GÉNÉRALE", description: "4h-4h15. 2h30 Allure 70.3. + 30-40' CAP Allure 70.3.", notes: "Si tu tiens les watts mais explose à pied : tu roules trop fort (-10W)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Semi Pré-Fatigué", description: "1h50. Finir 15' Z3/Z4.", notes: "Immuno-dépression : Vitamine C/Zinc." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 16
  {
    weekNumber: 16,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Urgence absolue.", notes: "" },
      { day: "Mardi", discipline: "Natation", title: "Réveil Neuro", description: "45'. 10 x 25m Sprint.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Vélocité", description: "1h00 Z2. 5 x 1' 110-120 rpm.", notes: "Rebond parasympathique : fatigue paradoxale normale." },
      { day: "Jeudi", discipline: "C.A.P", title: "Rappel Technique", description: "45'. 8 x 20\" Strides.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Aérobie Légère", description: "45'. 3 x 500m Pull Z2.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Logistique.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Test Fraîcheur", description: "2h00 Vélo (15' Allure 70.3) + 20' CAP.", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 17
  {
    weekNumber: 17,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Reprise Intense & Survitesse",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Seuil Anaérobie", description: "1h10. 15 x 100m Z4+ (Plus vite que course).", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Longue", description: "1h15. 5 x 1200m Allure 10km (Z4 haut). R:2'.", notes: "Débrider le moteur pour que l'allure 70.3 semble lente." },
      { day: "Mercredi", discipline: "Vélo", title: "Over-Unders", description: "1h30. 3 x 12' (2' 90% / 1' 110%).", notes: "Nettoyer le lactate." },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse Pure", description: "1h00. 8 x 200m (50 Vite / 100 Moyen / 50 Vite).", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00 Z1.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Rythme Sup", description: "3h00. 3 x 20' à 90-95% FTP. + 15' CAP Z4/Z5.", notes: "Tester la Trifonction (frottements)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Progressive", description: "1h30. Finir 15' Z4 (Allure 70.3).", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 18
  {
    weekNumber: 18,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Densité Seuil (Overspeed II)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Seuil Anaérobie", description: "1h10. 10 x 200m Z4+.", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Lactique", description: "1h20. 4 x 8' Allure 10km. R:2'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Over-Unders Extension", description: "1h40. 4 x 12' (2' 90% / 1' 110%).", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Simulations Départs", description: "1h00. 2 x [4x50m Sprint + 400m Course].", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h00 Z1. Check matériel.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Rythme Spécifique", description: "3h15. 2 x 40' Allure 70.3 (85-90%). + 25' CAP.", notes: "Visualise le parcours (bosses, vent)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Longue Fartlek", description: "1h30. 3 x 10' Allure 70.3.", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 19
  {
    weekNumber: 19,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Pic Final & Validation",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Spécifique", description: "1h15. 3 x 1000m Allure Course Z3/Z4. R:45\".", notes: "" },
      { day: "Mardi", discipline: "C.A.P", title: "Test 70.3 Run", description: "1h15. 3 x 3000m Allure 70.3. R:2'30\".", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Dernier Rappel Seuil", description: "1h30. 4 x 10' Seuil (95-100% FTP).", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse & Réactivité", description: "1h00. 20 x 100m (3 Course / 1 MAX).", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup & Matos", description: "1h00 Z1. Vélo propre/chaîne lubrifiée.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "LA DERNIÈRE LONGUE", description: "3h30. 2h00 Allure 70.3 Continu. + 30-40' CAP 70.3.", notes: "Si ça passe samedi : arrête de douter." },
      { day: "Dimanche", discipline: "C.A.P", title: "Run Récup", description: "1h10 Z2.", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 20
  {
    weekNumber: 20,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Début Affûtage (Taper 1)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dormir 1h de plus.", notes: "" },
      { day: "Mardi", discipline: "Natation", title: "Seuil & Vitesse", description: "50'. 10 x 100m Allure Course.", notes: "" },
      { day: "Mercredi", discipline: "C.A.P", title: "Rappel Seuil", description: "1h00. 2 x 15' Allure 70.3. R:3'.", notes: "" },
      { day: "Jeudi", discipline: "Vélo", title: "Intensité Courte", description: "1h15. 5 x 4' à 105-110% FTP.", notes: "Garder système nerveux en alerte." },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse Pure", description: "45'. 12 x 50m (25 Vite/25 Souple).", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Spécifique Réduite", description: "2h30. 2 x 20' Allure 70.3. Config course.", notes: "Nutrition : Réduis calories le soir (moins d'entrainement)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Run Dynamique", description: "1h00. 10' Allure 70.3.", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 21
  {
    weekNumber: 21,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Affûtage Intermédiaire",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dernier massage profond.", notes: "Taper Tantrums : Douleurs fantômes normales." },
      { day: "Mardi", discipline: "Natation", title: "Allure Course", description: "50'. 5 x 200m Allure Course.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Rappel Puissance", description: "1h20. 3 x 8' Allure 70.3.", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Vitesse Spécifique", description: "50'. 2 x 10' Allure 70.3.", notes: "Arrêter protocole chaleur fin de semaine." },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse Pure", description: "40'. 8 x 50m Vitesse.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Dernière Longue Réduite", description: "2h15. 2 x 15' Allure 70.3.", notes: "Race Box : Prépare la boite maintenant." },
      { day: "Dimanche", discipline: "C.A.P", title: "Run Affûtage", description: "1h00. Dernières 8' Allure 70.3.", notes: "" },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 22
  {
    weekNumber: 22,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Affûtage Final & Transfert",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Vol avion : Bas contention, eau.", notes: "Jet Lag : Lumière matin, pas de sieste après 14h." },
      { day: "Mardi", discipline: "Natation", title: "Réveil Musculaire", description: "40'. 6 x 100m Allure 70.3.", notes: "Repérage bouées/courants." },
      { day: "Mercredi", discipline: "Vélo", title: "Check Vélo", description: "1h15. 3 x 5' Allure 70.3.", notes: "Nutrition : Optimisation (moins de fibres)." },
      { day: "Jeudi", discipline: "C.A.P", title: "Rappel Dynamique", description: "40'. 3 x 3' Allure 70.3.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse & Coffee", description: "30'. 8 x 25m Sprint.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Dernière Sortie", description: "1h30. 2 x 10' Allure 70.3.", notes: "Village Expo : Rentre t'allonger rapidement." },
      { day: "Dimanche", discipline: "C.A.P", title: "Footing Décrassage", description: "30' Très lent.", notes: "Repérage T2 Run Out." },
    ],
  },
  // PHASE 5 : COMPÉTITION - Semaine 23
  {
    weekNumber: 23,
    phase: "🏁 Phase 5 : Compétition",
    theme: "RACE WEEK",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "J-5", description: "25' souple. Gouter eau officielle.", notes: "Hydratation + sel." },
      { day: "Mardi", discipline: "Vélo + Run", title: "J-4 Dernière Brique", description: "45' Vélo (3x1') + 10' Run (3x30\").", notes: "" },
      { day: "Mercredi", discipline: "Repos", title: "J-3 Repos", description: "OFF. Prépare sacs.", notes: "Régime sans résidus (tout blanc)." },
      { day: "Jeudi", discipline: "Activ courte", title: "J-2 Bike Check-In", description: "15-20' léger. Dépôt vélo.", notes: "Dégonfle pneus. Repérage visuel transitions." },
      { day: "Vendredi", discipline: "Repos", title: "J-1 Repos Mental", description: "15' Footing ou Nage très tôt.", notes: "Jambes en l'air. Dernier gros repas midi." },
      { day: "SAMEDI", discipline: "IRONMAN 70.3", title: "JOUR J", description: "THE BIG DANCE.", notes: "Vélo : Ne dépasse jamais 110% cible en bosses. Run : Km 1-5 se freiner." },
      { day: "Dimanche", discipline: "Repos", title: "J+1 Finisher", description: "Marche 15-20 min.", notes: "" },
    ],
  },
  // PHASE 6 : RÉGÉNÉRATION - Semaine 24
  {
    weekNumber: 24,
    phase: "🏁 Phase 6 : Régénération",
    theme: "Post-Race",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "J+2 Le Lendemain", description: "Repos Total. Marche.", notes: "" },
      { day: "Mardi", discipline: "Piscine", title: "J+3 Thérapie Aquatique", description: "20-30' Piscine (Pull-Buoy).", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "J+4 Spinning", description: "30-45' Vélo très souple.", notes: "Post-Race Blues normal." },
      { day: "Jeudi", discipline: "Soins", title: "J+5 Mobilité", description: "Massage/Kiné.", notes: "Pas de CAP (Dégâts structurels)." },
      { day: "Vendredi", discipline: "Social", title: "J+6 Dîner", description: "Resto avec proches.", notes: "" },
      { day: "Samedi", discipline: "Plaisir", title: "J+7 Déconnexion", description: "VTT, Paddle, etc.", notes: "" },
      { day: "Dimanche", discipline: "Bilan", title: "J+8 Hot Wash", description: "30' Footing Test + Bilan.", notes: "" },
    ],
  },
];
