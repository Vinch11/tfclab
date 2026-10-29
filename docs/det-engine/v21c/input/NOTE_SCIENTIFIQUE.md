# TFCLab — Relais scientifique ciblé V21B vers V21C

**Date de préparation : 29 octobre 2026.** État GitHub contrôlé : PR #420, branche `experiment/det-engine`, commit `1953d108ce50b2962b87bf5b77974235727e2954`, **DRAFT — NO-GO**.

## Portée et statut

Ce dossier complète le triage documentaire V21B, mais ne constitue ni une revue systématique exhaustive ni un avis sportif validant une séance. Les informations ci-dessous sont extraites de pages scientifiques consultables publiquement, avec un niveau d'accès indiqué. Les détails non vérifiés des textes intégraux restent inconnus. Aucun rattachement automatique aux 920 IDs, aucune dose individuelle approuvée.

## Sources prioritaires et portée d'utilisation

### REC-01 — Retour au calme après la séance
Van Hooren B, Peake JM (2018). *Do We Need a Cool-Down After Exercise?* Sports Medicine 48:1575–1595. DOI 10.1007/s40279-018-0916-2. Texte intégral ouvert : https://link.springer.com/article/10.1007/s40279-018-0916-2 ; PMCID PMC5999142.
- Type : revue narrative ; sections méthodologie et résultats du texte intégral librement accessibles consultées.
- Comparaison : activité faible/modérée dans l'heure suivant l'exercice vs repos passif ; évaluation de performance >4h après et jours suivants.
- Constat : peu de soutien à un gain constant de performance ultérieure ; clairance lactate sanguin plus rapide ne démontre pas une récupération complète.
- Portée : **retour au calme post-séance**, pas récupération **entre répétitions** ou dans un échauffement ; aucun nombre universel de minutes ni convention « dernier repos » pour la bibliothèque.

### REC-02 — Récupérations actives ou passives entre intervalles
Zouhal H et al. (2024). *Effects of Passive or Active Recovery Regimes Applied During Long-Term Interval Training on Physical Fitness in Healthy Trained and Untrained Individuals: A Systematic Review.* Sports Medicine - Open 10:21. DOI 10.1186/s40798-024-00673-0. Texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC10914654/
- Type : revue systématique, 24 études éligibles, programmes hétérogènes et absence de méta-analyse.
- Question : effet sur adaptations à plusieurs semaines de récupération **entre séries/efforts**, active ou passive.
- Constat : les deux modalités sont compatibles avec des améliorations ; pas de supériorité claire démontrée du type de récupération dans cet ensemble hétérogène.
- Portée : n'autorise pas à choisir une récupération Z1 systématique, un repos final n ou n−1, ou une durée universelle pour les 416 propositions.

### VO2-01 — 3 minutes travail / 3 minutes récupération
*Central and Peripheral Oxygen Distribution in Two Different Modes of Interval Training* (2021). PMID 34822448. https://pmc.ncbi.nlm.nih.gov/articles/PMC8623252/ ; https://pubmed.ncbi.nlm.nih.gov/34822448/
- Type : comparaison aiguë croisée ; 24 participants ; 3 min de travail / 3 min de récupération active vs 30 s / 30 s, charge moyenne et durée contrôlées ; travail à 80 % de la puissance à VO2peak et récupération à 85 % de la puissance au seuil d'échanges gazeux.
- Constat : différences dans la réponse cardio-respiratoire durant les intervalles, sans démonstration d'un protocole optimal chronique.
- Confrontation `B_BIKE_VO2_3MIN` : le format 3/3 est pertinent comme **contexte mécanistique**, mais l'étude ne démontre pas la cible Z5, les 5–7 répétitions, la récupération propre à l'athlète ni la fréquence hebdomadaire de la fiche.
- Niveau de lecture : informations de l'article affichées sur la page indexée, pas revendication de lecture intégrale vérifiée ligne à ligne ici.

### VO2-02 — Entraînement chronique 4 × 4 min
Étude randomisée publiée en 2023 chez 48 hommes bien entraînés, PMID 36314990. https://pubmed.ncbi.nlm.nih.gov/36314990/ ; texte accessible https://pmc.ncbi.nlm.nih.gov/articles/PMC10099854/
- Trois séances par semaine pendant huit semaines : protocole de course 4 × 4 min à ~95 % de la vitesse aérobie maximale avec 3 min de récupération active, comparé à deux formats sprint.
- Le VO2max a davantage augmenté dans le groupe intervalles aérobies longs que dans les deux groupes sprint, dans la population et les conditions étudiées.
- **Ne démontre pas** l'équivalence à 5–7 × 3 min Z5 en cyclisme, ni une dose individuelle issue de FTP ou VLamax.
- Niveau de lecture : résumé PubMed revu ; ne pas présenter les méthodes complètes comme vérifiées.

### POST-01 — Position cycliste et confort
*Effect of bike-fit in the perception of comfort, fatigue and pain.* Journal of Sports Sciences, publié en ligne 2016, numéro de revue 2017. PMID 27490817 ; DOI 10.1080/02640414.2016.1215496. https://pubmed.ncbi.nlm.nih.gov/27490817/
- Type : étude aiguë, 20 cyclistes ; trois positions ; 45 min à 50 % de la puissance aérobie maximale individuelle.
- Constat : confort, douleur et fatigue perçus varient selon les positions étudiées.
- **Ne démontre pas** l'équivalence 4×15 min vs 6×10 min, la tolérance posturale d'un Ironman, la récupération de cinq minutes ou la position optimale individuelle.
- Niveau de lecture : résumé et publication en ligne, texte intégral non confirmé.

## Décisions pour V21C

1. Corriger les identités bibliographiques de THR-01 et VLA-03 uniquement dans un registre corrigé séparé ; conserver les six divergences V21B et les originaux.
2. Distinguer **récupération interrépétition**, **récupération après échauffement**, **retour au calme**, **séance facile distincte**. Aucun arbitrage unique pour 416 propositions.
3. Confronter les 96 chronologies / 51 IDs en priorité à des **protocoles primaires précisément décrits** ; noter source, population, objectif mesuré, fréquence, travail, repos, modalités, limites de transfert.
4. Traiter `B_BIKE_VO2_3MIN` et `C_IM_AERO_HOLD` comme des **brouillons de contexte scientifique**, non des prescriptions validées.
5. Maintenir les 133 fiches sans appui de contenu en attente de revue humaine ; ne pas transformer les 787 contextes en preuves de mécanisme.
6. Distinguer source vérifiée, protocole compatible, mécanisme plausible et **dose admissible chez un individu**. Ce dernier niveau exige des capacités, restrictions, réponse et disponibilité attestées.
7. Respecter le schéma V21A `tfcl-evidence-attachment-1.0.0`, empreintes exactes et refus des citations non vérifiées.
8. Maintenir quarantaine des consignes hydriques LCW, stratégies nutritionnelles restrictives et expositions thermiques risquées.
9. Aucun changement de production ni d'envoi réel Nolio ; préserver les historiques, les 15 fixtures et les blocages Ironman.

## Mesure de réussite scientifique

Rapporter pour chaque catégorie : sources avec texte intégral réellement consulté ; protocoles primaires effectivement comparés ; rattachements contextuels valides ; mécanismes de séances suffisamment argumentés ; doses exactes soutenues par une étude comparable ; doses **individuelles** validées (attendues à 0 avant preuve individualisée). Aucun quota artificiel.
