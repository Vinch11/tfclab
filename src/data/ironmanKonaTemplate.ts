/**
 * Template Ironman Kona - 24 semaines
 * Basé sur la méthodologie Dan Lorang
 */
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";

export const IRONMAN_KONA_WEEKS: TemplateWeek[] = [
  // PHASE 1 : CONSTRUCTION - Semaine 1
  {
    weekNumber: 1,
    phase: "🟥 Phase 1 : Construction",
    theme: "Tests & Bilan",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Technique & Vitesse", description: "45' Z1. Focus appuis et glisse. Finir par 8 x 50m progressif 1 à 4.", notes: "Semaine de bilan de santé. Recalibrage des zones impératif après cette semaine." },
      { day: "Mardi", discipline: "C.A.P", title: "TEST VMA", description: "1h00. 20' WU. Test Demi-Cooper (6 min à fond). Distance / 100 = VMA.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Réveil Neuromusculaire", description: "1h15 HT. 5 sprints de 10 sec MAX (Départ arrêté, grand plateau) r:4'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "TEST CSS", description: "1h00. 400m Max + 200m Max. Chrono précis.", notes: "" },
      { day: "Vendredi", discipline: "Repos", title: "Soins / Étirements", description: "Repos complet ou 30' Yoga/Mobilité. Hydratation +++.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "TEST FTP", description: "1h30 HT. Ramp Test ou 20 min Test (Effort max stable).", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance & Brique", description: "2h30 Vélo Z2 + 20' CAP (10' Z4a + 10' Z2). Valider le matériel.", notes: "" },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 2
  {
    weekNumber: 2,
    phase: "🟥 Phase 1 : Construction",
    theme: "Début Chantier VO2max",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Technique & Vitesse Pure", description: "45'-1h. 12 x 25m Sprint Max départ 1'. 800m Pull Z2.", notes: "Si FTP a augmenté, la séance de Vendredi va sembler impossible. Ne pars pas trop fort." },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Courte", description: "1h10. 2 x (10 x 30\" Z6 / 30\" Z1). Cible 105-110% VMA.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Neuromusculaire", description: "1h30 HT. 10 x 15\" Sprints Départ Arrêté (Grand plateau). R:3'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Seuil (Dev CSS)", description: "1h00. 15 x 100m Allure CSS (Z4). R:15-20\".", notes: "Régularité : Tu dois tenir le même chrono du 1er au 15ème." },
      { day: "Vendredi", discipline: "Vélo", title: "PMA (Puissance Max)", description: "1h15 HT. 4 x 4' à 110-115% FTP (Z5). R:4' Z1.", notes: "L'objectif est de cumuler 16 minutes dans la zone rouge." },
      { day: "Samedi", discipline: "C.A.P", title: "Endurance Force", description: "1h00. 8 x 45\" côte rapide (Z5/Z6). Récup redescente.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance Fondamentale", description: "2h45 Vélo Z2 (avec 3x1' vélocité/h) + 20' CAP Z2/Z3.", notes: "Nutrition : 60g glucides/h. Boire une gorgée toutes les 10-15 min." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 3
  {
    weekNumber: 3,
    phase: "🟥 Phase 1 : Construction",
    theme: "Surcharge & Mental",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Hypoxie", description: "1h00. 3 blocs de (6 x 75m) Z5. Respiration 3, puis 3/5, puis 5/7.", notes: "PMA du Vendredi (5x4') : Ne regarde pas le chrono global, compte par blocs de 30s." },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Longue", description: "1h15. 12 x 400m à 105% VMA (Z6). R:1'. Brutal.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Submax (K3)", description: "1h45. 3 x 15' Force (50-55 rpm) Z3. R:5'. Pédalage rond.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Endurance Vitesse", description: "1h00. 8 x 300m Allure CSS (Z4). R:30\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "PMA (Augmentation)", description: "1h15 HT. 5 x 4' à 112-115% FTP (Z5). R:4'.", notes: "" },
      { day: "Samedi", discipline: "C.A.P", title: "Force & Plyo", description: "1h10. 10 x 1' Côte très raide (Z6/Z7). Focus poussée explosive.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance & Position", description: "3h15 Vélo Z2 (Pos Aéro 3x30') + 30' CAP Z2/Z3.", notes: "Position Aéro : Douleurs trapèzes normales. Nutrition : Passe à 70g glucides/h." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 4
  {
    weekNumber: 4,
    phase: "🟥 Phase 1 : Construction",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "Repos Complet", description: "Zéro sport. Massage ou étirements légers.", notes: "Semaine de récupération. Tu dois finir chaque séance avec l'envie d'en faire plus." },
      { day: "Mardi", discipline: "C.A.P", title: "Rappel Vitesse Light", description: "45'. 8 x 30\" Vite (Z5) / 30\" Trot. Juste dynamique.", notes: "" },
      { day: "Mercredi", discipline: "Natation", title: "Technique Pure", description: "45'. 2000m Glisse/Roulis. Tuba frontal recommandé.", notes: "" },
      { day: "Jeudi", discipline: "Vélo", title: "Vélocité", description: "1h00. Z1/Z2 avec 3 x 1' à 110 rpm. Pas de force.", notes: "Attention au piège du \"Je me sens bien\" vers jeudi. Interdit d'ajouter des séances." },
      { day: "Vendredi", discipline: "Repos", title: "Repos Complet", description: "Check-up matériel.", notes: "" },
      { day: "Samedi", discipline: "Natation", title: "Vitesse ou Eau Libre", description: "45'. 10 x 50m progressif 1-4. Reste souple.", notes: "" },
      { day: "Dimanche", discipline: "Vélo", title: "Coffee Ride", description: "2h00 Z1/Z2 Bas. Pas d'enchaînement CAP.", notes: "Nutrition : Réduis les féculents le soir, augmente les protéines." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 5
  {
    weekNumber: 5,
    phase: "🟥 Phase 1 : Construction",
    theme: "Retour au Charbon",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Aérobie & Vitesse", description: "1h00. 4 x 400m (200 Z2 / 100 Z3 / 100 Z4). R:30\".", notes: "Mardi Pyramide : Ne pars pas trop vite sur le premier bloc sinon le 2ème sera un calvaire." },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Pyramide", description: "1h15. 2 blocs de [1'-2'-3'-2'-1'] Z5/Z6. R:Temps effort.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Endurance", description: "1h30 HT. 3 x 12' à 88-90% FTP. Cadence 50/90/60 rpm.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Seuil CSS", description: "1h00. 20 x 100m à CSS (Z4). R:15\". Monotone et dur.", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "PMA Intermittente", description: "1h15 HT. 3 x (6 x 40\" Z6 / 20\" Z1). R:5'.", notes: "Le 40\"/20\" est plus taxant que le 30/30. Prépare-toi à souffrir." },
      { day: "Samedi", discipline: "C.A.P", title: "Endurance Active", description: "1h00. Footing Z2 avec 20' Tempo (Z3/Z4a) au milieu.", notes: "" },
      { day: "Dimanche", discipline: "Vélo", title: "Endurance Longue", description: "3h30 Z2. Toutes les 30 min : 2 min \"Big Gear\" (50 rpm).", notes: "Big Gear recrute les fibres dormantes. Nutrition : 70g glucides/h." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 6
  {
    weekNumber: 6,
    phase: "🟥 Phase 1 : Construction",
    theme: "Volume d'Intensité",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force Spécifique", description: "1h00. 3 x 800m (Pull+Plaquettes). Varier Z2/Z3 tous les 200m.", notes: "Mardi 10x500m : Les 3 dernières répétitions se jouent au mental. Sois un métronome." },
      { day: "Mardi", discipline: "C.A.P", title: "VMA Longue 500", description: "1h15. 10 x 500m à 105% VMA (Z6). R:1'15.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Max", description: "1h45. 5 x 6' Force Max (45-50 rpm) Z3/Z4. R:4'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Seuil CSS", description: "1h00. 10 x 200m à CSS-2sec (Z4+). R:20\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "PMA Pyramide", description: "1h15 HT. 3'-4'-5'-4'-3' à 110% FTP. R:Temps effort.", notes: "Quand ça devient insupportable (bloc de 5'), concentre-toi uniquement sur l'expiration." },
      { day: "Samedi", discipline: "C.A.P", title: "Endurance & Seuil", description: "1h10. 2 x 10' Z4a (Allure Semi) R:2'.", notes: "" },
      { day: "Dimanche", discipline: "Vélo", title: "Volume & Tempo", description: "4h00 Z2. Intégrer 3 x 20' Tempo (Z3). Position Aéro obligatoire.", notes: "Vise moins de 10% de temps en roue libre. Nutrition : 70-80g glucides/h." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 7
  {
    weekNumber: 7,
    phase: "🟥 Phase 1 : Construction",
    theme: "Pic de Charge (Overreaching)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force & Hypoxie", description: "1h10. 4 x 600m Plaquettes. Respiration 3/5/3. Z3 soutenu.", notes: "Semaine la plus dure. Si le cœur ne monte pas (système nerveux saturé), transforme en Z1/Z2." },
      { day: "Mardi", discipline: "C.A.P", title: "VMA 1000m", description: "1h20. 6 x 1000m à 100-102% VMA. R:2'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Sous-Max", description: "2h00. 3 x 20' Force (50-55 rpm) Z3 haut. R:5'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse Critique", description: "1h00. 15 x 100m Départ 1'45 (Max possible).", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "PMA Agonie", description: "1h15 HT. 5 x 5' à 110-112% FTP. R:5' Z1.", notes: "Test ultime. Prépare musique et ventilo. Si tu craques, finis en Z3/Z4, ne bâche pas." },
      { day: "Samedi", discipline: "C.A.P", title: "Seuil & Fatigue", description: "1h15. 3 x 10' Z4b (Allure Semi) R:2'.", notes: "" },
      { day: "Dimanche", discipline: "Vélo + CAP", title: "Endurance XXL", description: "4h30 Vélo (3x30' Tempo) + 30' CAP Z3.", notes: "Nutrition : 80g glucides/h. Mange immédiatement après chaque séance cette semaine." },
    ],
  },
  // PHASE 1 : CONSTRUCTION - Semaine 8
  {
    weekNumber: 8,
    phase: "🟥 Phase 1 : Construction",
    theme: "Récupération (Transition)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Pas de natation. Dors, mange, hydrate-toi.", notes: "Interdiction formelle de rajouter des kilomètres. Tes mitochondries se multiplient maintenant." },
      { day: "Mardi", discipline: "Natation", title: "Vitesse & Technique", description: "45'. 10 x 50m Vite (Z5) départ 1'15. Technique parfaite.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Souplesse", description: "1h15 Z1/Z2. 5 x 30\" à 110 rpm. Aucune résistance.", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Fartlek Léger", description: "45'. 8 x 20\" Accélérations / 40\" Trot. Délier les jambes.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Plaisir / Glisse", description: "45'. Nage souple ou fractionné long Z2.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Ou 30' Yoga. Prépare le matériel pour Phase 2.", notes: "Analyse tes points faibles de la Phase 1 (Souffle ? Jambes ? Mental ?)." },
      { day: "Dimanche", discipline: "Vélo", title: "Sortie Plaisir", description: "2h30 Z2 (60-70% FTP). Pas de CAP derrière.", notes: "Prépare-toi pour le chantier \"Diesel\" de la semaine prochaine." },
    ],
  },
  // PHASE 2 : DIESEL - Semaine 9
  {
    weekNumber: 9,
    phase: "🟧 Phase 2 : Diesel",
    theme: "Entrée Sweet Spot",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force Spécifique", description: "1h00. 3 x 800m (Pull+Grosses Plaquettes). Z3 stable.", notes: "Séance vélo Mercredi (50-55 rpm) : Ne monte pas les watts pour compenser la sensation cardiaque basse." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Extensif", description: "1h15. 3 x 12' Z4a (Allure Marathon). R:3'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Endurance", description: "1h45. 3 x 15' à 85-90% FTP. Cadence 50-55 RPM.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Endurance Rythmée", description: "1h00. 10 x 300m (200 Z2 / 100 Z4). R:20\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Endurance Aéro", description: "1h15 Z2. Travail de position aéro uniquement.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Longue Tempo", description: "3h30 Z2 avec 2 x 30' à 80-85% FTP (Z3). Position Aéro.", notes: "Nutrition : 80g glucides/h intransigeant." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue", description: "1h30 Z2. Finir par 15' Z3 haut (Allure IM).", notes: "" },
    ],
  },
  // PHASE 2 : DIESEL - Semaine 10
  {
    weekNumber: 10,
    phase: "🟧 Phase 2 : Diesel",
    theme: "Diesel & Force",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force & Endurance", description: "1h10. 3 x 900m (Pull+Plaq). Z3 bas continu. Max 30\" pause.", notes: "Vélo Mercredi : Si douleur articulaire genoux, augmente cadence à 60-65. Douleur musculaire OK." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Extensif", description: "1h20. 2 x 20' Z4a (Allure Marathon -5\"). R:4'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Endurance", description: "2h00. 3 x 20' à 88-92% FTP. Cadence 50-55 RPM.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Seuil CSS", description: "1h00. 6 x 400m CSS (Z4). R:30\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h15 Z2. Pédalage unijambiste (5 x 30\"/30\").", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Longue", description: "4h00 Z2. Intégrer 3 x 25' à 85% FTP.", notes: "Nutrition : Essaie 90g glucides/h. Assure-toi d'avoir assez d'eau (700-800ml pour 90g)." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Durabilité", description: "1h40. 1h10 Z2 + 20' Z3 haut (IM).", notes: "" },
    ],
  },
  // PHASE 2 : DIESEL - Semaine 11
  {
    weekNumber: 11,
    phase: "🟧 Phase 2 : Diesel",
    theme: "Pic de Charge Diesel",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force & Volume", description: "1h15. 4 x 800m (Plaq+Pull) Z3 soutenu. R:45\".", notes: "Vélo Mercredi (4x20') : Risque de crampes ou douleur lombaire. Lève-toi 30s toutes les 10 min." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil Extensif", description: "1h25. 3 x 20' Z4a (Allure Marathon). R:3'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Force Endurance Monstre", description: "2h15. 4 x 20' à 88-92% FTP (50-55 RPM). R:5'.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse Croisière", description: "1h00. 20 x 100m Plaquettes (CSS + 2\"). R:10\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h15 Z2 très souple.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Ironman Foundation", description: "4h30 Z2. Intégrer 3 x 30' à 85% FTP (Z3). Aéro.", notes: "Nutrition : 90g glucides/h MANDATOIRE. Valide le protocole pour Kona." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Pré-Fatigue", description: "1h50. 1h20 Z2 + 30' Z3 (Allure IM).", notes: "Signaux fatigue S11 : Sommeil agité, irritabilité, FC repos +5bpm. Normal." },
    ],
  },
  // PHASE 2 : DIESEL - Semaine 12
  {
    weekNumber: 12,
    phase: "🟧 Phase 2 : Diesel",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dors, Sieste, Nutrition de qualité.", notes: "Règle d'or : On divise le volume par deux. Zéro fatigue accumulée." },
      { day: "Mardi", discipline: "Natation", title: "Vitesse Pure", description: "45'. 10 x 25m Sprint Max départ 1'. Explosivité.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Vélocité", description: "1h00 Z2. 5 x 1' à 110-120 RPM.", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Rappel Allure Light", description: "45'. 5 x 1' Z4b (Allure Semi) R:1'.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Endurance Technique", description: "45'. Nage continue Pull-Buoy. Zéro chrono.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Check complet vélo. Prépa Phase 3.", notes: "Poids de forme : Si besoin de perdre 1-2kg, c'est maintenant (Phase 3)." },
      { day: "Dimanche", discipline: "Vélo", title: "Coffee Ride", description: "2h30 Z2. Pas d'enchaînement.", notes: "Mental : Prépare-toi aux sorties de 5h-6h dès la semaine prochaine." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 13
  {
    weekNumber: 13,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Volume & Spécificité",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Aérobie", description: "1h10. 3 x 1000m Z2 stable (Allure IM). R:45\".", notes: "Allure Ironman (Z3 bas) semble trop facile frais. Ne dépasse pas les watts cibles !" },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo IM", description: "1h30. 3 x 15' Z3 haut/Z4a bas (Allure IM). R:3'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Maintien Tension", description: "2h00. 3 x 15' Z3 haut (85% FTP). Cadence course.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Simulation Eau Libre", description: "1h00. 3000m Continu avec 50m Polo tous les 500m.", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Aéro & Souplesse", description: "1h30 Z2. 90% du temps sur prolongateurs.", notes: "Vaseline/Crème chamois en quantité pour tanner la peau." },
      { day: "Samedi", discipline: "Vélo", title: "La Longue Sortie IM", description: "4h30 Z2 haut (70-75% FTP). 15' CAP enchaîné.", notes: "Nutrition : 90g/h sans y penser. Alarme nutrition toutes les 20 min." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue", description: "1h45 Z2 stable. Focus économie.", notes: "" },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 14
  {
    weekNumber: 14,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Endurance Spécifique",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Endurance Force", description: "1h15. 4 x 800m (Plaq+Pull) Z3. R:30\".", notes: "Sortie Vélo Samedi (5h) : Baisse de motivation à la 4ème heure normale. Utilise des mantras." },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo IM Long", description: "1h35. 2 x 25' Z3 haut/Z4a bas. R:4'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Spécifique IM", description: "2h15. 3 x 20' Z3 (80-85% FTP). Aéro stricte.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse & Changements", description: "1h00. 15 x 200m (50 Vite / 100 IM / 50 Vite).", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h30 Z2. 3 x 1' Vélocité.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Barre des 5 Heures", description: "5h00 Z2 avec 3 x 40' Allure IM. 20' CAP enchaîné.", notes: "Brique CAP : Les 5 premières minutes déterminent ton marathon. Cours EXACTEMENT à l'allure cible." },
      { day: "Dimanche", discipline: "C.A.P", title: "Longue Durabilité", description: "1h50 Z2. Intégrer 30' Allure IM après 1h10.", notes: "Sommeil : Couche-toi 30 min plus tôt. Surveille magnésium/fer si impatiences." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 15
  {
    weekNumber: 15,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Pic de Volume (The Big Week)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Mental", description: "1h20. 2 x 1500m Continuous Z3 (Allure Course). R:1'.", notes: "Pic de volume absolu. Immuno-dépression : Évite les foules, prends Vitamine C et Zinc." },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo IM Fatigue", description: "1h45. 3 x 20' Z3 haut/Z4a. R:5'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Spécifique Mi-Semaine", description: "3h00. 2 x 45' Allure IM. 15' CAP enchaîné.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Simulation Course", description: "1h10. 3800m Chronométré d'une traite.", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h30 Z1/Z2. Mange et bois pendant la sortie.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "SIMULATION IRONMAN", description: "6h00. 4h00 à Allure IM Stricte. 30' CAP enchaîné.", notes: "Utilise TOUT ton équipement de course. Pacing : 230W constants, pas de variations." },
      { day: "Dimanche", discipline: "C.A.P", title: "Marathon Pré-Fatigué", description: "2h15 Z2 stable à jeun/léger.", notes: "Jambes en bois les 20 premières minutes. Si FC dérive >10 puls, marche 1 min." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 16
  {
    weekNumber: 16,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Assimilation (Recovery)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dors, protéines, hydratation.", notes: "Semaine OBLIGATOIRE. Blues de la récupération possible (douleurs fantômes)." },
      { day: "Mardi", discipline: "Natation", title: "Récup Active", description: "45'. 1000m Pull Z1/Z2 + 4x50m progressif.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Vélocité & Neuro", description: "1h15 Z2. 5 x 30\" Sprint assis (Z6).", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Footing Technique", description: "45' Z2. 6 lignes droites (Strides) fin.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse Courte", description: "45'. 10 x 25m Vite départ 1'.", notes: "" },
      { day: "Samedi", discipline: "Repos", title: "TOTAL OFF", description: "Déconnexion mentale.", notes: "Nutrition : Priorité Micronutriments (Légumes, fruits, Omega-3)." },
      { day: "Dimanche", discipline: "Vélo", title: "Sortie Courte", description: "2h15 Z2. Test position aéro 2x15'.", notes: "Fais vérifier ton vélo par un mécanicien." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 17
  {
    weekNumber: 17,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Spécificité & Précision",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Endurance Musculaire", description: "1h15. 3 x 1000m Plaquettes. Z3 stable. R:45\".", notes: "Heat Training : Sauna/Bain chaud après séances Mardi/Jeudi pour acclimatation." },
      { day: "Mardi", discipline: "C.A.P", title: "Seuil IM", description: "1h30. 2 x 30' Z3 haut/Z4a (Allure IM). R:4'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Rappel VLaMax", description: "2h00. 3 x 20' Sweet Spot (88-90% FTP). 60-70 RPM.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Simulation Eau Libre", description: "1h00. 3000m Broken (accélérer 20 coups toutes les 5').", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup & Aéro", description: "1h15 Z2. 100% Prolongateurs.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Race Pace", description: "5h00. 2 x 90' Allure IM. 20' CAP enchaîné.", notes: "Précision Watts : Si cible 230W, faire 240W est une faute professionnelle." },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Progressive", description: "1h50. 1h20 Z2 + 30' Z3 haut (Allure IM).", notes: "Nutrition : Pas de fibres Vendredi soir et Samedi matin (Gut training)." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 18
  {
    weekNumber: 18,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Durabilité Spécifique",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Force & Hypoxie", description: "1h15. 5 x 600m (50m Polo / 550m Nage). Z3.", notes: "Cardiac Drift : Si FC monte de +10/15 bpm au 3ème bloc Samedi, bois et refroidis-toi." },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo IM Long", description: "1h40. 3 x 25' Z3 haut. R:3'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Maintien FTP", description: "2h15. 4 x 15' Seuil (90-95% FTP). 90 rpm.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Vitesse & Draft", description: "1h10. 40 x 75m (25 Vite / 50 Course). R:15\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup Active", description: "1h30 Z2. Visualisation parcours.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Ironman Sandwich", description: "5h30. 3 x 1h00 Allure IM. 30' CAP enchaîné.", notes: "Nutrition : Teste une petite portion de solide sur la 1ère partie vélo. Arrêt solide après 3h." },
      { day: "Dimanche", discipline: "C.A.P", title: "Le Semi Pré-Fatigué", description: "2h00. 1h30 Z2 + 30' Z3 haut (IM).", notes: "Commande ton matériel neuf maintenant (pneus, lacets). Pas de neuf en S23." },
    ],
  },
  // PHASE 3 : SPÉCIFIQUE - Semaine 19
  {
    weekNumber: 19,
    phase: "🟩 Phase 3 : Spécifique",
    theme: "Peak Week (Sommet)",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "Volume Continu", description: "1h20. 3800m Continu Pull+Plaq Z2/Z3.", notes: "Peak Week. Fonctionne en mode robot. Hygiène de guerre : douche froide, compression, isolement." },
      { day: "Mardi", discipline: "C.A.P", title: "Tempo IM (Test 30k)", description: "1h50. 2 x 40' Z3 haut/Z4a. R:5'.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Volume Mi-Semaine", description: "3h30. 3 x 30' Allure IM. 15' CAP enchaîné.", notes: "" },
      { day: "Jeudi", discipline: "Natation", title: "Simulation Rythme", description: "1h10. 10 x 300m (100 Vite / 200 Course). R:20\".", notes: "" },
      { day: "Vendredi", discipline: "Vélo", title: "Récup & Activation", description: "1h30 Z2. 3 x 2' Allure Course.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "SIMULATION KONA", description: "6h00-6h30. 4h30 Allure IM Stricte. 45'-1h CAP enchaîné.", notes: "Dress Rehearsal. Conditions réelles (Trifonction). Si tu ne tiens pas le run après, tu as roulé trop fort." },
      { day: "Dimanche", discipline: "C.A.P", title: "Récupération Longue", description: "1h45 Z1/Z2. Métaboliser les graisses.", notes: "Ne juge pas ta forme sur la fatigue de cette semaine. L'affûtage arrive." },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 20
  {
    weekNumber: 20,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Début Affûtage (Taper 1)",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dors, Massage léger.", notes: "Affûtage : Volume baisse de 25-30% mais intensité maintenue. Ne teste pas ta forme." },
      { day: "Mardi", discipline: "Natation", title: "Rappel Allure", description: "1h00. 6 x 400m Allure Course (Z3). R:30\".", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Spécifique Allégé", description: "2h00. 2 x 20' Allure IM (Watts Cibles).", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Tempo IM Rappel", description: "1h15. 2 x 15' Z3 haut (Allure IM). R:3'.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse & Sensation", description: "45'. 10 x 50m progressif. 800m Pull Z2.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Sortie Longue Moyenne", description: "3h30 Z2 avec 2 x 30' Allure IM. 15' CAP enchaîné.", notes: "Logistique : As-tu réservé la valise vélo ? Pneus neufs montés ?" },
      { day: "Dimanche", discipline: "C.A.P", title: "Sortie Longue Réduite", description: "1h30 Z2. Finir 10' Allure IM.", notes: "Nutrition : Réduis un peu les glucides le soir (besoins caloriques en baisse)." },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 21
  {
    weekNumber: 21,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Affûtage Intermédiaire",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Dernier massage profond.", notes: "Taper Tantrums : Douleurs fantômes et hypocondrie normales. Reste calme." },
      { day: "Mardi", discipline: "Natation", title: "Allure Course", description: "50'. 4 x 400m Allure Course. R:30\".", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Rappel Puissance", description: "1h30. 3 x 10' Allure IM. R:5'.", notes: "" },
      { day: "Jeudi", discipline: "C.A.P", title: "Vitesse Spécifique", description: "1h00. 2 x 10' Z3 haut (IM). R:3'.", notes: "Heat Training : Arrête le protocole chaleur fin de cette semaine." },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse Pure", description: "40'. 8 x 50m Allure 70.3. 400m Pull.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Dernière Longue Sortie", description: "2h30-3h00 Z2. 2 x 20' Allure IM. Vélo config course.", notes: "Race Box : Prépare ta boîte avec tout le matériel de transition maintenant." },
      { day: "Dimanche", discipline: "C.A.P", title: "Run Affûtage", description: "1h15 Z2. Dernières 10' Allure IM.", notes: "Poids : Mange à ta faim. Ne cherche pas à perdre du poids." },
    ],
  },
  // PHASE 4 : AFFÛTAGE - Semaine 22
  {
    weekNumber: 22,
    phase: "🏁 Phase 4 : Affûtage",
    theme: "Affûtage Final & Transfert",
    sessions: [
      { day: "Lundi", discipline: "Repos", title: "TOTAL OFF", description: "Vol avion : Bas de contention, boire 1L/4h.", notes: "Jet Lag : Lumière du jour le matin, pas de sieste après 14h, entraînement le matin." },
      { day: "Mardi", discipline: "Natation", title: "Réveil Musculaire", description: "40'. Nage mer + 4 x 200m Allure Course.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "Check Vélo", description: "1h30. Z2 + 3 x 6' Allure IM.", notes: "Nutrition : Optimisation. Réduis les fibres (légumes crus, complet) à partir de Jeudi/Vendredi." },
      { day: "Jeudi", discipline: "C.A.P", title: "Rappel Dynamique", description: "45'. 4 x 3' Allure IM. 4 Strides.", notes: "" },
      { day: "Vendredi", discipline: "Natation", title: "Vitesse & Coffee", description: "30'. 6 x 50m Rythme 70.3.", notes: "" },
      { day: "Samedi", discipline: "Vélo", title: "Dernière Sortie Sérieuse", description: "1h45. Z2 + 2 x 15' Allure IM.", notes: "Village Expo : Limite le temps debout. Fais tes achats et rentre t'allonger." },
      { day: "Dimanche", discipline: "C.A.P", title: "Footing Décrassage", description: "40' Très lent. Z1/Z2 bas.", notes: "Hydratation : Urine claire en permanence (mais pas transparente)." },
    ],
  },
  // PHASE 5 : COMPÉTITION - Semaine 23
  {
    weekNumber: 23,
    phase: "🏁 Phase 5 : Compétition",
    theme: "RACE WEEK",
    sessions: [
      { day: "Lundi", discipline: "Natation", title: "J-5", description: "30' souple. Quelques accéls.", notes: "Objectif : Charger les batteries. Zéro bêtises." },
      { day: "Mardi", discipline: "Vélo + Run", title: "J-4 Dernière Brique", description: "1h Vélo (4x2' IM) + 15' Run (4x30\" IM).", notes: "" },
      { day: "Mercredi", discipline: "Repos", title: "J-3 Repos & Logistique", description: "OFF. Prépare sacs transition.", notes: "Nutrition : Arrêt TOTAL fibres. Régime blanc (riz, pâtes, dinde)." },
      { day: "Jeudi", discipline: "Activ courte", title: "J-2 Bike Check-In", description: "20' Nage ou Vélo léger. Dépôt vélo.", notes: "Dégonfle pneus si soleil. Repère visuellement le trajet Eau -> Vélo." },
      { day: "Vendredi", discipline: "Repos", title: "J-1 Repos Mental", description: "15' Footing ou Nage très tôt.", notes: "Jambes en l'air. Dernier gros repas à 13h00. Soir léger." },
      { day: "SAMEDI", discipline: "IRONMAN", title: "JOUR J", description: "THE BIG DANCE. Réveil 3h30-4h.", notes: "Pacing Vélo : Ne dépasse jamais cible +10W. Nutrition : Mange dès la 10ème min." },
      { day: "Dimanche", discipline: "Repos", title: "J+1 Survivant", description: "Marche 15-20 min. Mange ce que tu veux.", notes: "" },
    ],
  },
  // PHASE 6 : RÉGÉNÉRATION - Semaine 24
  {
    weekNumber: 24,
    phase: "🏁 Phase 6 : Régénération",
    theme: "Post-Race",
    sessions: [
      { day: "Lundi", discipline: "Marche", title: "J+2 Zombie Walk", description: "Repos Total.", notes: "Bois beaucoup (filtration myoglobine). Mange des protéines." },
      { day: "Mardi", discipline: "Piscine", title: "J+3 Thérapie Aquatique", description: "20-30' Piscine (Pull-Buoy). Pas de longueurs.", notes: "" },
      { day: "Mercredi", discipline: "Vélo", title: "J+4 Spinning", description: "30-45' Vélo très souple (si possible assis).", notes: "Post-Ironman Blues : Vide émotionnel normal vers mercredi/jeudi. Ne prends aucune décision radicale." },
      { day: "Jeudi", discipline: "Mobilité", title: "J+5 Mobilité", description: "Étirements légers / Yoga.", notes: "Immuno : Fenêtre ouverte aux virus (72h-7j). Lave-toi les mains." },
      { day: "Vendredi", discipline: "Social", title: "J+6 Dîner Merci", description: "Repas avec proches.", notes: "" },
      { day: "Samedi", discipline: "Plaisir", title: "J+7 Activité non-Tri", description: "Marche, Paddle, Bricolage.", notes: "Pas de Course à Pied ! L'impact est interdit cette semaine (dégâts structurels)." },
      { day: "Dimanche", discipline: "Bilan", title: "J+8 Bilan à froid", description: "Noter souvenirs de course.", notes: "" },
    ],
  },
];
