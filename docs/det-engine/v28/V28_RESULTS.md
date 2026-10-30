# V28 — résolution paramétrique vérifiée

DRAFT — NO-GO. Tous les cas sont synthétiques. Complétude technique, compatibilité de calendrier, admissibilité individuelle et approbation coach sont distinctes. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée.

Baseline `aaefc53771c6a12639b0e3669c58d922be162291`. Le profil B original, lui-même synthétique, conserve exactement ses 30 réservations et ses trois contrats exécutables de course issus d’un ID. A et C, leurs références, calendriers et résultats bruts restent inchangés.

**Gain fonctionnel :** 6 scénarios paramétrés complètement instanciés sur 4 sources distinctes : `A_STR_STABILITY_CORE`, `C_BIKE_AERO_POSITION_DRILLS`, `C_SWIM_CATCH_FOCUS`, `C_SWIM_TRI_CATCH_PULL`. Aucun de ces paramètres nouveaux n’est injecté dans B. La force acquiert un calcul d’exécution complet qui n’existait pas en V27 ; nage et aéro réutilisent leurs marcheurs/parsers et gagnent un contrat de paramètres liés à la source, des intensités de segments et une revue de bloc.

| Scénario | Source | Temps exact | Complet techniquement | Créneau compatible | Variante compatible | Bloc sans nouveau défaut |
|---|---|---|---|---|---|---|
| aero_between | C_BIKE_AERO_POSITION_DRILLS | 85:00 | oui | oui | oui | oui |
| aero_after_each | C_BIKE_AERO_POSITION_DRILLS | 90:00 | oui | non | oui | non |
| aero_unknown | C_BIKE_AERO_POSITION_DRILLS | inconnue | non | non | oui | non |
| catch_pull_declared_timing | C_SWIM_TRI_CATCH_PULL | 45:55 | oui | oui | oui | non |
| catch_focus_declared_timing | C_SWIM_CATCH_FOCUS | 47:40 | oui | oui | oui | non |
| continuous_generic_declared_timing | A_SWIM_CONTINUOUS_2K | 51:30 | non | oui | inconnu | non |
| css_only_not_drill_or_other_stroke_pace | C_SWIM_CATCH_FOCUS | inconnue | non | non | oui | non |
| css_absent | A_SWIM_CONTINUOUS_2K | inconnue | non | non | inconnu | non |
| strength_between_explicit | A_STR_STABILITY_CORE | 30:34 | oui | oui | oui | non |
| strength_after_each_explicit | A_STR_STABILITY_CORE | 32:04 | oui | oui | oui | non |
| strength_occurrence_unknown | A_STR_STABILITY_CORE | inconnue | non | non | oui | non |


7 temps complets sont calculés. Un seul scénario (`aero_between`) passe la comparaison de bloc sans nouveau défaut. Ce résultat signifie absence de régression par rapport à la baseline conditionnelle ; **les cinq erreurs historiques B et ses 34 avertissements ne disparaissent pas**. Ce n’est pas une validation complète du mésocycle ou de la préparation Ironman.

Les chronologies natation/force exactes avec secondes ne sont pas insérables dans le schéma historique `durationMin` entier : 5 essais refusés. Les diagnostics complets sont conservés. Les deux alertes arithmétiques supplémentaires sur les propositions de nage proviennent aussi d’une comparaison flottante stricte ; les sommes indépendantes restent sous budget. Aucun seuil ni validateur n’est modifié, aucun arrondi ou contenu tronqué.

**Sécurité corrigée avant conservation :** le premier modèle de force choisissait implicitement les occurrences finales des repos. Un garde indépendant et un test rouges le démontrent. La deuxième revue a également exigé les transitions périphériques et la composition des repos à la frontière exercice/tour. Les premiers runs verts ne qualifient donc pas ces modèles comme complets. Les conventions et transitions nouvelles sont enregistrées dans deux fichiers séparés avant leur exécution ; inconnues ou propositions restent bloquantes. Les sources et preuves des trois validations sont préservées.

Validation finale : **42 tests V28**, rejeu ; **383 tests de non-régression**, 5 skips historiques inchangés ; TypeScript réussi. Six artefacts logiques identiques au rejeu ; vérifications Python indépendantes et garde de repos réussis. Les mutants de repos, tempo, source, CSS transférée et approbation fictive sont rejetés.

5289 fichiers antérieurs inchangés ; 920 IDs, 2 425 variantes, 600 configurations historiques et 15 fixtures Nolio préservés. Les 600 cas sont recomptés, pas réexécutés. Aucun appel Nolio, aucune nouvelle sortie exportée, aucun changement de production ou des 920 sources. Zéro approbation individuelle, zéro revue sportive humaine, zéro substitution automatique.

#425 a avancé de `9f67b702…` à `429a84c1c35255843251a478ef3f48ab0dd907c6` au démarrage ; son dossier de risques V2.3.1 a été lu comme contrat candidat uniquement. Aucune formule ou valeur importée ; les sept refus course A et les 26 refus C restent identiques.
