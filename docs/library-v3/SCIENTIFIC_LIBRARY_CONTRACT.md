# TFCLab — Bibliothèque V3 : contrat scientifique et fonctionnel
Statut : PROPOSITION / NON INTÉGRÉE / NO-GO prescription automatique
Date : 2026-10-30

## Mandat
Construire 100 fiches **distinctes et auditables** pour chacun de : natation, cyclisme, course à pied, préparation physique (400 fiches). Les enchaînements (brick) sont des compositions contraintes, pas une cinquième discipline comptée artificiellement. Ne pas confondre variation d'un paramètre avec une nouvelle fiche : 6×3 min et 7×3 min constituent **une** fiche paramétrable, pas deux.

Maintenir l'application existante inchangée tant que l'intégration, les tests sportifs et les tests de persistance ne sont pas validés. Aucune modification des profils, équations, limiteurs ou exports existants par cette branche.

## Fondements et distinction des preuves
1. **Dan Lorang : philosophie d'individualisation**, tests qui changent réellement la décision, charge soutenable, prise en compte du retour athlète, alternance de phases technique, vitesse/VO2, force/endurance et économie. Ce n'est pas une licence pour attribuer à Lorang des séances exactes qu'il n'a pas publiées. Sources : https://scientifictriathlon.com/tts175/ ; https://inscyd.com/user-story/danlorangprofiling2018en-kcx8b ; https://www.tri247.com/triathlon-news/elite/dan-lorang-jan-frodeno-coach
2. **Distribution d'intensité : pas de modèle unique**. La méta-analyse 2024 identifie un avantage limité du polarisé pour VO2peak, pas pour toutes les performances : https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/ ; cyclisme 2025 https://pubmed.ncbi.nlm.nih.gov/39788807/ .
3. **HIIT : la structure compte**. Revue 2026 sur le temps proche de VO2max, sans en déduire une prescription optimale universelle : https://pmc.ncbi.nlm.nih.gov/articles/PMC13480085/ .
4. **Natation : spécialité et distance comptent** : https://pubmed.ncbi.nlm.nih.gov/33952709/ ; https://pubmed.ncbi.nlm.nih.gov/41269307/ .
5. **Force et endurance** : effets possibles sur économie de course / performance, certitude variable : https://pubmed.ncbi.nlm.nih.gov/40153564/ ; https://pubmed.ncbi.nlm.nih.gov/40632222/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC11258194/ .

**Chaque fiche cite ses propres preuves** et porte evidence_level = direct_intervention | systematic_review_support | observational | coach_practice | mechanistic_hypothesis. Un article démontrant un principe ne doit pas être présenté comme validation d'une séance précise.

## Contrat minimal de chaque fiche
- id stable, version, sport, nom, discipline détaillée, niveau minimal
- objectif principal **unique** (LT1, LT2/MLSS, VO2max, vitesse/neuromusculaire, économie, technique, endurance spécifique, force maximale, puissance, récupération)
- objectifs secondaires explicites et compatibles ; limiteurs visés ; indications/contre-indications
- contexte (objectif compétitif, phase, terrain/bassin/équipement), charge qualitative de l'athlète, fréquence admissible
- recette **exécutable**, en unités appropriées : échauffement, blocs ordonnés [répétitions, travail, récupération, intensité, consigne], retour au calme
- paramètres modifiables et bornes auditées ; zones prescrites via ancrages du profil (CSS, LT1, LT2/MLSS, vVO2, FTP, seuil puissance, RPE...) et fallback RPE explicitement étiqueté
- durée **calculée** à partir des blocs et non du titre ; volume/distance estimés avec incertitude explicite
- conditions d'arrêt, récupération minimale recommandée, contraintes de proximité interséances
- provenance : source, type d'appui, date de revue, reviewer, justification et limites
- règles de transformation, règle de refus, version de contrat et statut candidate/validated/blocked

## Invariants non négociables
- Pas d'augmentation automatique de la charge intense simplement pour remplir la durée cible.
- La cible de durée n'autorise que les adaptations listées ; si aucune configuration admissible n'atteint le créneau, refus explicite avec raison.
- Calcul du temps : échauffement + somme répétitions × travail + récupérations réellement effectuées + interblocs + retour au calme. La récupération après la dernière répétition n'est comptée que si explicitement prévue.
- Pour la natation, distance et durée sont distinctes ; temps technique et temps de repos ne sont pas transformés en mètres.
- Intensité : ancrage et unité obligatoires ; aucune substitution implicite FTP→seuil de lactate ni CSS→allure de course.
- Le moteur ne sélectionne que des fiches publiées au statut validated et compatibles avec le profil, le créneau, les contraintes de fatigue et l'enchaînement.
- Brick : somme réelle vélo + transition + course ; contrôler les durées admissibles des deux sous-séances et la compatibilité de l'enchaînement.
- Les règles sportives incohérentes sont signalées comme contradictions de programmation, pas « corrigées » en maquillant les métadonnées.
- Réutiliser les 920 identifiants historiques seulement via un mapping explicite et traçable ; aucune écriture destructive.
- Les 20 fiches V2 existantes restent disponibles tant que la V3 n'a pas passé la recette.

## Matrice des 100 fiches par sport
Chaque famille ci-dessous constitue une cible éditoriale de dix **mécanismes de séance différents** (et non dix permutations de répétitions). Aucun numéro de fiche non rédigé ne compte comme séance livrée.

| Famille | Natation | Cyclisme | Course à pied | Préparation physique |
|---|---|---|---|---|
| 01 | Alignement/respiration | Endurance aisée | Endurance aisée | Force maximale bilatérale |
| 02 | Traction/appuis | Endurance LT1 | Endurance LT1 | Force maximale unilatérale |
| 03 | Battements/position | Tempo durable | Tempo durable | Force endurance |
| 04 | Virages/départs | Seuil LT2 | Seuil LT2 | Puissance/explosivité |
| 05 | Économie/CSS stable | VO2 long | VO2 long | Plyométrie/réactivité |
| 06 | Seuil CSS | VO2 court | VO2 court | Tronc/anti-rotation |
| 07 | VO2/puissance aérobie | Sprint/anaérobie | Sprint/vitesse | Tendon/mollet/pied |
| 08 | Sprint/anaérobie | Force/cadence/torque | Côtes/force spécifique | Hanche/genou/ischios |
| 09 | Endurance longue/spécifique | Course/CLM/triathlon | 5 km à marathon/trail | Mobilité/contrôle |
| 10 | Récupération/taper/test | Récupération/taper/test | Récupération/taper/test | Préhab/récupération/test |

## Seize fiches candidates entièrement identifiées : exemples de recette
Ce sont des **exemples candidats**, pas 16 fiches validées et encore moins 400 livrées. Les intensités sont des points de départ pour revue scientifique et contrôle sportif.

### SWIM-001 — CSS fractions régulières
- Intention : endurance proche CSS ; niveau intermédiaire+ ; profil : CSS mesurée.
- Recette : 300 m aisés + 6×50 m éducatifs r=15 s + 3×(4×100 m à CSS + marge contrôlée, r=15–25 s), r interbloc=60 s + 200 m aisés.
- Paramètres : blocs 2–4 ; répétitions 3–5 ; récupération 15–30 s ; préserver le caractère de seuil.
- Refus : CSS non fiable et aucune intensité RPE de repli autorisée ; perte technique persistante.

### SWIM-002 — Technique : respiration et alignement
- Intention : compétence motrice, faible charge cardio.
- Recette : 200 m aisés + 8×50 m exercices alignement/respiration alternés, r=20 s + 8×50 m nage intégrée concentration technique, r=15 s + 100 m aisés.
- Paramètres : 6–12×50 m dans chacun des deux blocs ; pas de conversion artificielle en séance VO2.

### SWIM-003 — 25 m vitesse avec récupération complète
- Intention : vitesse/qualité neuromusculaire.
- Recette : 400 m progressifs + 8×25 m accélérations progressives r=30 s + 2×(6×25 m très rapides r=60–90 s), interbloc 3 min + 200 m aisés.
- Paramètres : 1–3 blocs, 4–8 répétitions ; arrêt si technique dégradée.

### SWIM-004 — Endurance spécifique eau libre
- Intention : endurance soutenable et orientation.
- Recette : 300 m faciles + 3×600 m continus modérés avec visée/orientation contrôlée, r=45 s + 200 m faciles.
- Paramètres : 2–4×400–800 m ; sécurité eau libre spécifique obligatoire si hors bassin.

### BIKE-001 — LT1 stable
- Intention : endurance aérobie en dessous de LT1 estimé.
- Recette : 15 min faciles + 3×20 min proche mais sous LT1, r=5 min facile entre blocs + 10 min faciles.
- Paramètres : 2–4 blocs de 15–30 min ; le surplus autorisé est facile sous LT1, pas intensité ajoutée.

### BIKE-002 — Seuil 3×12
- Intention : maintenir puissance voisine du seuil sans dépassement excessif.
- Recette : 15 min progressifs + 3×12 min à intensité seuil individuelle, r=6 min faciles entre répétitions + 10 min faciles.
- Paramètres : 2–4 répétitions, travail 8–15 min ; refuse si profil et récupération non adaptés.

### BIKE-003 — VO2 long 5×3
- Intention : haute sollicitation aérobie.
- Recette : 20 min progressifs + 5×3 min puissance haute intensité adaptée au profil, r=3 min faciles entre répétitions + 12 min faciles.
- Paramètres : 4–6 répétitions, 3–4 min ; éviter extrapolation directe du %FTP vers VO2 individuelle.

### BIKE-004 — CLM position et alimentation
- Intention : durabilité spécifique en position.
- Recette : 20 min faciles + 3×20 min effort spécifique CLM/70.3, r=5 min faciles + 10 min faciles.
- Paramètres : 2–4×15–30 min ; posture, tolérance et ravitaillement prescrits explicitement.

### RUN-001 — Endurance LT1
- Intention : volume aérobie facile.
- Recette : 10 min très faciles + 40 min sous LT1 + 5 min faciles.
- Paramètres : bloc 20–100 min selon historique, niveau, charge ; progression externe validée.

### RUN-002 — Seuil 3×10
- Intention : travail autour du LT2/MLSS individuel.
- Recette : 15 min faciles + éducatifs 5 min + 3×10 min seuil, r=3 min trot entre efforts + 10 min faciles.
- Paramètres : 2–4×8–12 min ; priorité à la justesse du seuil plutôt qu'à une allure arbitraire.

### RUN-003 — VO2 5×3
- Intention : puissance aérobie, avec temps de récupération suffisant.
- Recette : 20 min progressifs + 5×3 min soutenues au repère aérobie individualisé, r=3 min trot entre efforts + 10 min faciles.
- Paramètres : 4–6 répétitions de 2–4 min ; refuse si fatigue ou douleurs locomotrices.

### RUN-004 — Économie : lignes droites
- Intention : contrôle moteur et vitesse sans volume glycolytique important.
- Recette : 30 min très faciles + 6×15 s progressifs sur plat, r=90 s marche/trot entre + 5 min faciles.
- Paramètres : 4–8 répétitions de 10–20 s ; vitesse maîtrisée, pas sprint maximal.

### S&C-001 — Force lourde membre inférieur
- Intention : force maximale ; prérequis : technique et charge tolérée.
- Recette : échauffement 12 min ; squat 4×4 RPE 7–8 r=3 min ; soulevé terre roumain 3×5 RPE 7 r=2 min ; mollets lourds 3×6 r=90 s.
- Paramètres : séries squat 3–5, répétitions 3–6 ; conserver récupération et qualité.

### S&C-002 — Force unilatérale
- Intention : contrôle et force jambe par jambe.
- Recette : échauffement 10 min ; split squat 3×6/côté r=90 s ; step-up 3×6/côté r=90 s ; farmer carry 3×30 m.
- Paramètres : 2–4 séries selon niveau ; progression technique avant surcharge.

### S&C-003 — Économie neuromusculaire / plyométrie modérée
- Intention : raideur active et coordination chez athlète préparé.
- Recette : échauffement 15 min ; pogo 3×12 ; bondissements contrôlés 3×6 ; sauts sur boîte basse 3×5, récupération 90–120 s.
- Paramètres : contacts et difficulté bornés selon historique, douleur et surface ; jamais de simple allongement pour compléter une durée.

### S&C-004 — Tronc anti-rotation et hanche
- Intention : stabilité fonctionnelle.
- Recette : échauffement 8 min ; Pallof press 3×10/côté ; side plank 3×25–35 s/côté ; hip airplane assisté 3×5/côté ; single-leg RDL 3×8/côté.
- Paramètres : 2–4 séries ; contrôle prioritaire ; arrêter à douleur ou compensation.

## Gates avant utilisation
G0 : contrat + provenance bibliographique de la fiche.
G1 : revue technique et sportive de chaque fiche (durée, unités, densité, sécurité).
G2 : couverture réelle des profils / sports / niveaux / durées et impossibilités documentées.
G3 : validateur d'adaptation + refus déterministes + tests de propriétés.
G4 : intégration **en lecture seule**, aucun remplacement de la bibliothèque existante.
G5 : ordonnance réelle du moteur, chronologies, limites hebdomadaires et enchaînements.
G6 : tests réels sauvegarde/édition/réouverture Supabase et export Nolio/PDF.
G7 : approbation coach, lancement contrôlé. Toute étape non prouvée = NO-GO.

## Critère d'arrêt du chantier
On ne produit pas 400 descriptions sans code d'exécution, et on ne déclare pas « 100 par sport » sans **100 recettes réellement distinctes**, paramétrables, sourcées, vérifiées et testées par sport. Le périmètre est fermé : pas de refonte des équations de physiologie ni des rapports.
