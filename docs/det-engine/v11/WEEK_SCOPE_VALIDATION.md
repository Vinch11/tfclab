# Validation de portée hebdomadaire

L’adaptateur expérimental v11-week-validation.ts décide sur le contexte réel de la semaine. Il n’utilise pas un score de plan complet comme verdict hebdomadaire. Les routines historiques restent inchangées et leurs sorties brutes parallèles sont archivées sur le préfixe de préparation.

## Contrat explicite

Chaque semaine enregistre : numéro global, phasebase, typeload/recovery, position1–4, durée complète de préparation16, distance à la course issue des dates existantes, plafond natif, plafond de prescription candidat, modèle de placement et rôles essentiels. La phase et le type sont comparés aux contrats de génération déjà préparés, pas inférés du dernier élément du bloc.

- Développement : deux natations, deux vélos dont une longue autonome et une position, deux courses dont une longue, un soutien de mouvement.
- Récupération : minima natifs de cette semaine, soit deux natations, un vélo autonome, une course et un soutien. Les trois disciplines restent présentes. L’obligation longue n’est pas effacée : planchers natifs vélo85/course55min conservés. La séance de position et la seconde course ne sont pas des obligations de ce contexte réduit ; les différences sont journalisées explicitement.
- Aucune compétition, activation J−1/J−2 ou séance d’affûtage n’est inventée en base. Les dates et la distance à la compétition restent visibles dans les preuves.

## Contrôles exécutés

| Contrôle | Mécanisme et limite |
|---|---|
| Contexte et rôles | Comparaison avec quota/type/phase natifs et rôles V10 ; retrait d’un rôle ou falsification des métadonnées rejetés. |
| Catalogue et niveau | checkSessionCatalogue et generationEligibility existants ; prérequis non confirmés refusés, domaines issus de tfclDoctrine ; source originale comparée intégralement. |
| Dose | Intervalle catalogue, recette littérale reconnue, plancher de rôle et plafond individuel ; aucune compression de recette ou nouvelle capacité. Chronologie non parsée = inconnue explicite. |
| Contexte source | Interdiction littérale de récupération dans avoid, indication week-end ou milieu de semaine dans when, sourcePlacement V6 pour offsets et formats. Analyse bornée, pas interprétation clinique exhaustive de prose. |
| Calendrier | Sept jours, correspondance jour/index, chaque dose sérialisée exactement une fois, disponibilités, densité, repos, absence de doublon source ; espacement candidat des longues et selon modèle des expositions de même discipline. |
| Quotas hebdomadaires | validateWeeklyQuotas inchangé, avec la vraie entrée de semaine. Les avertissements de divergence du layout natif restent intégraux. |
| Bloc | validateCoachVolumeBudgets, audits globaux V4/V5 inchangés, continuité, volumes par discipline, longues autonomes et position séparées, transitions intersemaines, réduction réelle en S4. |
| Sécurité historique indépendante de portée | Violations prohibition_compliance et injury_risk_compliance originales restent bloquantes pour le bloc candidat. Les autres diagnostics historiques restent bruts et distingués. |
| Fatigue et intensité internes | Inconnues. Le temps nominal sous des zones source ne mesure ni le temps métabolique réel ni la fatigue. |

Le plafond TFCL existant de progression et le plafond de récupération70% sont conservés et testés comme conventions de programmation. Ils ne sont ni universalisés ni présentés comme certificats de sécurité. Aucune hausse hebdomadaire n’est exigée. Le moteur ne remplit pas automatiquement les minutes disponibles en S2/S3 ou en récupération.

## Deux lectures indépendantes

1. **Hebdomadaire candidate** : contrôles bloquants exécutés, avertissements et inconnues listés par semaine. Le passage n’est pas une attestation sportive générale.
2. **Historique brut** : validateExperimentalCandidate inchangé sur quatre semaines dans un contexte16semaines. race_day, calendar_coverage, continuité/frequence de préparation et titre attendent un plan complet. Ces résultats ne sont pas réinterprétés comme preuves de danger d’une semaine isolée.

Les erreurs sport_ratio et les avertissements anti_repetition/layout_drift ont une pertinence méthodologique réelle dans le bloc. Ils ne sont pas tous « hors contexte » et ne sont pas supprimés. Les fréquences physiques et minutes sont publiées séparément. Le témoin ratioWitness V6 produit les parts en minutes et en séances, par développement ou totalité du bloc ; le premier bloc natif de génération n’est pas entièrement couvert par ces quatre semaines. Aucun passage du contrat de ratio complet n’en est déduit.

Une note « passesExecutedBlocking=true » signifie uniquement absence d’échec des contrôles hebdomadaires candidats exécutés ; elle ne signifie ni conformité aux anciens validateurs, ni disparition des avertissements, ni revue experte.
