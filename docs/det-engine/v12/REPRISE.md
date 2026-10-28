# Reprise V12 — branche expérimentale, NO-GO

Lire state.json et V12_RESULTS.md, puis PROGRESSION_MODELS.md et SPORTING_VALIDATION.md. Branche experiment/det-engine, PR420 en brouillon. Baseline V11 :0bf3d0a14738ea68ccf1cd347929b306b2b3b5b2. Les registres antérieurs restent intégraux.

Le registre V12 contient dix unités et une échéance absolue de60 minutes, sans renouvellement implicite. passed signifie unité de travail achevée, pas validation sportive humaine. Un lancement ultérieur exige un nouveau registre ; aucun processus permanent ni relance automatique de développement n’est revendiqué.

## Preuves à vérifier

Vérifier baseline-files.json, source-checksums.json, checksums.json et evidence/preregistration.json avant toute reprise. Le contrat v12-contract.ts était figé avant les candidats. Les calendriers V11 sont reproduits exactement avant chaque comparaison. Les sources/validateurs de production et les600 références historiques ne sont pas modifiés.

L’horloge de scénario reste26octobre2026 à12:00UTC pour les fixtures ; elle n’est ni l’heure de mission ni une observation athlète. Les sorties finales sont study.json.gz, summary.json, comparison.json.gz et comparison-summary.json. Le rejeu dans un processus distinct et un dossier séparé donne les mêmes empreintes. Ne jamais écraser evidence/final ni les dossiers des essais.

L’entrée de calcul est experimental/det-engine/v12-comparison.ts, réutilisant construction, calendrier et validation V11, catalogue et preuves V10, audits globaux V4/V5 et diagnostics historiques. v12-prescription.ts produit les décisions prospectives par séance ; v12-contract.ts contient la porte de réévaluation posturale. Ces propositions ne libèrent jamais automatiquement un calendrier.

## Commandes dans un budget ouvert

- `node scripts/det-engine/v12-run.mjs validation scripts/det-engine/v12-validate.mjs` : typage, gouvernance, suite expérimentale et suite historique.
- `node scripts/det-engine/v12-run.mjs determinism scripts/det-engine/v12-evidence.mjs` : deux processus offline et comparaison exacte de quatre artefacts, sous sorties neuves.
- `python scripts/det-engine/v12-specificity.py` : inventaire des quatre exemples source, sans prescription.
- `python scripts/det-engine/v12-report.py` : rendu des dossiers depuis les preuves finales ; aucune décision de dose.

Le contrôleur refuse mauvaise branche, unité close, autre unité active, budget épuisé ou plus de trois tentatives par unité. Les ressources sont bornées : un worker par suite, heap Node2Go, délais par commande et échéance absolue. Si une commande est interrompue, conserver sa réservation et ses traces ; vérifier les processus avant de la marquer interrompue et ne jamais compter un résultat partiel comme réussi. Un nouveau budget ne doit pas réexécuter les unités closes de V12 sous le même registre.

## Points de vigilance

1. La succession6×10→4×15 en position garde60 min de travail nominal, mais augmente durée ininterrompue et densité. Elle n’établit ni équivalence de fatigue ni capacité posturale acquise.
2. La compensation de minutes nominales est explicite : course70→65 pour l’aérobie, nage55→45 pour l’équilibré, uniquement S1. La nage conserve ses distances/répétitions ; si la recette ne rentre pas dans45 min sans changement d’intensité/repos, retenir/refuser cette version. La chronologie individuelle demeure inconnue.
3. Les retours favorables sont des scénarios fictifs, pas des observations ajoutées au profil. Douleur inconnue ne vaut pas absence de douleur ; retour incomplet ou adverse retient la transition. Même le scénario favorable exige revue et ne libère pas automatiquement le plan.
4. Aucun allongement automatique ou HIT obligatoire. Les rôles prioritaires sont déjà à leurs bornes actuelles. Maintenir un stimulus est une décision admissible, sans prétendre mesurer une adaptation.
5. La récupération250 min est une référence de minima, pas une règle universelle. Les alternatives270 et265 sont des sensibilités sur V11, non combinées au modèle technique final et non promues comme optimum.
6. Les sorties historiques restent non conformes au validateur de préparation complète. Les témoins de portée ne suppriment ni erreur ni sévérité. Les ratios, répétitions et divergences de layout gardent leur portée méthodologique réelle.
7. Le slot strength est de la mobilité ; une source lourde50–65 min dépasse le plafond actuel40. Expérience de barre et prescription de force ne sont pas inventées.
8. C_BRICK_TRANSITION_DRILL contient au moins55 min pour une durée annoncée30–45, hors transitions inconnues. Ne pas l’insérer, tronquer sa recette ou lui attribuer un crédit longue ; conserver le témoin pour revue de source distincte. Tous les bricks ne sont pas déclarés incompatibles.

Travail suivant utile : revue indépendante des deux dossiers et du coût postural, preuves d’exécution complète dans les créneaux, retours individuels utilisables, puis extension des phases Ironman spécifiques avec nutrition, force et bricks réellement admissibles. Les contrats restent candidats et les incertitudes doivent rester visibles.

Aucune fusion, aucun déploiement, aucune publication Lovable, aucun accès Nolio ou donnée réelle, migration, dépense, modification du moteur ou des validateurs de production. Le statut reste DRAFT — NO-GO.
