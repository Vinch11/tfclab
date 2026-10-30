# CODEX — DET-ENGINE V21C : preuves primaires et comparaison des 51 fiches candidates

**Dépôt :** `Vinch11/tfclab` · **branche :** `experiment/det-engine` · **PR #420 :** DRAFT — NO-GO.
**Baseline à confirmer avant écriture :** `1953d108ce50b2962b87bf5b77974235727e2954`.
**Entrées :** dossier V21B sur GitHub et fichier joint `NOTE_SCIENTIFIQUE.md` (relais de recherche indépendant). Ne pas présenter les notes comme une revue humaine approuvant des doses.

## Mission

Ne plus augmenter artificiellement la couverture des 920 fiches. Construire la preuve d'applicabilité des **96 chronologies candidates sur 51 IDs**, en priorisant les séances utilisées dans les plans, les risques physiologiques et les incertitudes de récupération. **60 minutes / 10 unités maximum**, sans relance, dépenses ou API payantes.

1. **Vérification documentaire.** Rejouer le contrôle d'intégrité V21B, vérifier les six écarts d'identité/date/type ; produire un registre correctif séparé sans modifier les sources originales. Distinguer résumé, article complet effectivement lu et simple mention. Enregistrer URL, date, provenance et hash de l'artefact réellement récupéré ; ne pas inventer d'empreinte.
2. **Protocoles complets.** Rechercher les textes primaires accessibles gratuitement, prioritairement en récupération, HIIT, posture aéro, force, nage et spécificité Ironman. Vérifier conditions de l'étude, population, sport, type/volume/fréquence des efforts, ancre d'intensité, répétitions, récupération et critères étudiés. Les textes non accessibles restent signalés ; ne pas déduire leur contenu du résumé.
3. **Comparaisons source/étude.** Pour chaque candidat examiné, remplir un tableau `workout ID / source hash / candidate hash / PMID DOI / type d'accès / travail / repos / intensity anchor / population / comparability / supportable claim / unsupported claims / contraindications / additional individual data`.
4. **Contextes de récupération.** Partitionner les 416 conventions selon la place du repos : échauffement, interrépétitions, interséries, après bloc principal ou cool-down final. Afficher le nombre exact par catégorie. Les revues actives/passives n'autorisent pas à arbitrer la présence d'un dernier repos manquant.
5. **Statuts de preuve.** Ne permettre une assertion `exact_recipe_dose` qu'après vérification du protocole entier, de la concordance des intensités et des récupérations et d'une justification critique explicite ; le statut d'admissibilité individuelle reste séparé et non approuvé.
6. **Dossiers coach.** Pour les cas prioritaires, produire une page lisible « ce que l'étude soutient / ne soutient pas / ce qui dépend de l'athlète / décision attendue du coach ». Ne pas modifier les séances, les doses, l'export ni les 920 rendus.
7. **Tests et sorties.** Préserver 920 IDs, 2 425 variantes, 600 configurations, 96 candidats, 418 vues, 15 fixtures Nolio ; maintenir erreurs Ironman et refus. Tester les rejets d'une ancre FTP assimilée à VO2peak, d'une étude de course transposée au vélo, d'une étude aiguë transformée en gain chronique et d'un repos final inventé.

## Livrables

`docs/det-engine/v21c/README.md`, `PRIMARY_STUDY_REGISTER.csv`, `FULL_TEXT_ACCESS_LOG.md`, `EXACT_PROTOCOL_COMPARISONS.csv`, `RECOVERY_CONTEXTS.md`, `SCIENTIFIC_DISAGREEMENTS.md`, `COACH_REVIEW_PACKETS.md`, `VALIDATION.md`, `REPRISE.md` et artefacts versionnés.

Clore avec chiffres exacts : textes complets réellement examinés, dossiers de 51 IDs traités, comparaisons protocolaires conclues/inconclues, rattachements vérifiés, revues sportives humaines **0 si aucune**, et limites restantes. Ne pas prétendre que la dose individuelle est validée par la seule littérature.

**Gardes absolus :** aucune fusion/main, aucun déploiement, aucune modification production/sender/validateur, aucune donnée réelle, aucune migration, aucune écriture Nolio, aucun coût, aucune promotion scientifique automatique. PR #420 reste DRAFT — NO-GO.
