# V29 — pont temporel exact, sans durée fictive

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

Baseline `59e1b079ad8c11726d3ca92007fbecb75c5047aa`. Les onze scénarios V28 sont rejoués avec recettes, paramètres, sujets et profils inchangés. La représentation historique reste intacte ; les résultats V28 en échec demeurent visibles.

**Gain démontré :** sept chronologies connues sont transportées sans perte à la seconde. Les sources fractionnaires dont recette et variante sont compatibles sont `A_STR_STABILITY_CORE`, `C_SWIM_CATCH_FOCUS`, `C_SWIM_TRI_CATCH_PULL`. La nage continue2K possède aussi une chronologie générique transportable, mais sa variante Ironman reste non résolue. Aucun de ces cas n’ajoute une séance à B.

| Scénario | Exécution s | Créneau s | Marge s | Transport sans perte | Créneau compatible | Bloc sans nouveau défaut |
|---|---|---|---|---|---|---|
| aero_between | 5100 | 5100 | 0 | oui | oui | oui |
| aero_after_each | 5400 | 5100 | 0 | oui | non | non |
| aero_unknown | inconnu | 5100 | inconnu | non | inconnu | non |
| catch_pull_declared_timing | 2755 | 3300 | 545 | oui | oui | oui |
| catch_focus_declared_timing | 2860 | 3300 | 440 | oui | oui | oui |
| continuous_generic_declared_timing | 3090 | 3300 | 210 | oui | oui | non |
| css_only_not_drill_or_other_stroke_pace | inconnu | 2100 | inconnu | non | inconnu | non |
| css_absent | inconnu | 2400 | inconnu | non | inconnu | non |
| strength_between_explicit | 1834 | 2100 | 266 | oui | oui | oui |
| strength_after_each_explicit | 1924 | 2100 | 176 | oui | oui | oui |
| strength_occurrence_unknown | inconnu | 2100 | inconnu | non | inconnu | non |


Les six chronologies techniquement complètes de V28 restent six ; V29 améliore leur transport, pas leur validation scientifique. Six créneaux synthétiques sont compatibles avec le temps d’exécution, dont cinq ont aussi recette et variante compatibles ; la nage2K reste bloquée malgré son temps calculable. Cinq scénarios ne créent aucun nouveau défaut complémentaire de bloc : aéro85min, les deux nages catch et les deux conventions de gainage. V28 n’en comptait qu’un. Ce résultat **ne lève pas** les cinq erreurs historiques B,34 avertissements, conditions individuelles ou horaires inconnus.

**Budgets distincts, valeurs inchangées :** le plafond de volume planifié S1 est480min (28800s), tandis que la disponibilité déclarée est10h (36000s). Le premier prototype comparait à tort les réservations, marge incluse, au plafond d’exercice ; un test rouge conserve ce défaut. Le pont corrigé compare le volume planifié au plafond de volume et les réservations à la disponibilité. Pour catch/pull et catch focus :28555/28660s planifiées,29100s réservées. Pour les gainages :28234/28324s planifiées,28500s réservées. Aucun plafond n’est augmenté et aucune autre discipline réduite. Les doses historiques des autres séances restent des valeurs planifiées pour ce budget, et non des durées d’exécution intégralement vérifiées ou réalisées. Les55/35min restent des créneaux synthétiques, sans insertion dans B.

Deux témoins reproduisent les comparaisons flottantes strictes V28. Le nouveau chemin additionne uniquement des entiers de secondes et n’insère aucune durée fractionnaire dans `durationMin`. Aucun epsilon, arrondi, contenu tronqué ou marge transformée en activité.

Validation finale : **44 tests V29**, puis rejeu ; **425 tests de non-régression**, 5 skips historiques inchangés ; TypeScript réussi. Quatre artefacts logiques identiques au rejeu. Vérification Python indépendante et six mutations négatives rejetées. Quatre tests rouges ont corrigé une exigence cardiaque inappropriée en force, une exposition mutable du registre et la perte du mode poids du corps dans le texte local et la confusion volume/disponibilité ; sources et échecs avant correction conservés.

5442 anciens fichiers inchangés ;920 IDs,2 425 variantes,600 configurations historiques et15 fixtures Nolio préservés. Les600 configurations sont conservées et recomptées, pas réexécutées. A/B/C gardent90 réservations identiques ;7 refus course A et26 refus C. Suspensions et dérogation course95→90 préservées ;0 nouvelle politique coach,0 substitution,0 approbation individuelle.

Nolio : sept représentations internes exactes, cinq payloads texte locaux conservant les secondes ; aucun workout structuré officiel émis, aucun appel réel ou export. #425 a avancé en lecture seule de `429a84c1c35255843251a478ef3f48ab0dd907c6` à `18c20998eed1539f5c5fc2f8831d41245b237fe5` pendant la mission. Sa clôture technique C8 annoncée ne constitue ni un audit V29 de ce code ni une approbation scientifique/DET. Aucun correctif physiologique importé.
