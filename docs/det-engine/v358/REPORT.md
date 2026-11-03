# DET V3.58 — semi-marathon et 10 km, 3 novembre 2026

Le banc d'acceptation exige dix calendriers synthétiques complets : semi-marathon
8/30 semaines et 10 km 8/10/12 semaines, chacun avec deux déclarations distinctes
(`age_group`, 7 h et 4 courses + 1 renforcement ; `competitor`, 9 h et 5 courses +
2 renforcements). Limiteur primaire déclaré : **TTE**. Il ne certifie pas les autres
limiteurs, tous les niveaux, tous les calendriers ou une performance chronométrique.

## Contrôles et changements

- Durée de préparation transmise AVANT le calcul des métadonnées dérivées.
- Le 10 km conserve son calendrier natif lorsqu'il est admissible. Sinon, le
  calendrier réserve deux semaines de développement et deux de spécificité avant
  l'affûtage existant, sans raccourcir la fondation calculée ni modifier les
  disponibilités. Refus si ce découpage ne tient pas ou si un calendrier explicite
  demanderait une nouvelle revue.
- La preuve spécifique doit être acquise avant la dernière semaine de charge du
  bloc spécifique, plutôt que d'attendre un créneau d'affûtage inadmissible.
- Les longs blocs sont décomposés uniquement sur des décharges réellement mesurées
  d'au moins 30 %. Le mécanisme de preuve de spécificité est partagé entre les
  objectifs, avec contrôle exact de l'objectif, de la source et de la dose.
- Affûtage reconnu à partir des minutes source exactes, de la baisse réelle du
  volume et d'une distribution majoritairement facile. Un simple titre ne suffit
  pas. Les constats natifs originaux restent dans l'audit.
- Les nouveaux témoins exigent au moins 75 % de minutes faciles sur TOUT le temps
  d'endurance des semaines de charge, minutes inconnues incluses au dénominateur.
  Les contrats historiques gardent leurs conditions antérieures et restent testés.
- Chaque semaine de charge possède une vraie séance clé course. La couverture TTE
  exacte est d'au moins 30 % de TOUTES les séances clés, sans retirer les clés
  faciles ou les sorties longues du dénominateur.

## Une dose V3 supplémentaire, sans altérer les 800 sources historiques

`V3P_RUN_201` : deux blocs de 12 min MLSS, échauffement 12 min, récupération
inter-blocs 3 min non classée, retour au calme 10 min : **49 min**, dont 24 min de
travail, **48 h** de récupération minimale. Les bornes déclarées et une éventuelle
modification du nombre de blocs restent soumises aux contrôles V3 habituels.

L'allure 10 km doit être individuellement confirmée et compatible avec MLSS.
Aucune équivalence universelle « allure 10 km = seuil » n'est revendiquée.
La fiche porte des références de principes, pas une validation scientifique
individuelle de cette combinaison de dose.

Cette candidate a son propre registre de source, son empreinte, ses prérequis et
ses contre-indications. Elle entre dans le contrat de 801 sources uniquement par
une revue explicite de son ID. Les anciens contrats conservent exactement leurs
800 sources. Le témoin compétiteur 10 semaines exige son utilisation réelle ; le
même calendrier sans cette dose supplémentaire approuvée reste refusé.

## Reproduction et portée

Le workflow `det-running-evidence.yml` exécute de vrais tests Vitest qui échouent
sur tout NO-GO d'un cas d'acceptation. Il conserve un témoin de refus distinct et
les tests négatifs d'identité, source, dose, périodisation et minutes inconnues.
`scripts/det-engine/verify_running_review_calendars.py` recalcule ensuite, sans
s'appuyer sur le verdict du validateur : volumes, fréquences, doses, répartition
par minutes, récupération source/horaires, décharges, couverture TTE et jour J.
Les calendriers complets et les journaux sont exportés par la CI sur son SHA exact.

`REFERENCE_ACCEPTANCE_SUMMARY.json` conserve les résultats de référence reproduits
localement ; le résultat GitHub du SHA exécuté reste nécessaire pour attester la CI.

**DRAFT — NO-GO prescription réelle / scientifique général / production.** Tous les
athlètes, horaires et accords coach de ces tests sont fictifs. Aucune connexion
Supabase, aucun Nolio, aucune IA, aucune fusion ni modification de la production.
La revue sportive humaine et la recette réelle sont distinctes de ces contrôles.
