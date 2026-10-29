# Contrôle candidat limité à quatre semaines

`validateFourWeekScopeV23` s’exécute en parallèle des validateurs historiques inchangés. Il ne transforme pas un préfixe en préparation Ironman complète et garde `fullIronmanPreparationValidated=false` ainsi que `currentlyPrescribable=false`.

## Contrôles exécutés

Couverture exacte S1–S4/28 jours, schéma technique existant, quotas et budgets originaux, fréquences swim/bike/run/support, jours disponibles/repos/densité, source d’origine, chronologie sérialisée, floors, contexte de placement, espacement des longues et état conditionnel recalculé. L’enveloppe doit correspondre au profil préenregistré ; une capacité95 injectée pour faire passer la course95 est détectée.

Les unknowns de séance, conflits d’enveloppe, conditions futures et décisions coach ont des listes séparées. Zéro erreur structurelle dans les huit résultats retenus n’efface pas les refus A/C, la récupération adverse ou les recettes incomplètes.

## Quatre erreurs historiques conservées par cas

| Code brut | Pourquoi la portée16 semaines explique ce cas précis |
|---|---|
| race_day | La course déclarée est hors du bloc ; aucune course fictive ajoutée en S4 |
| calendar_coverage | Contrat complet16, préfixe exact1–4 observé |
| triathlon_discipline_continuity | L’audit complet porte sur les semaines futures absentes ; aucune violation de présence dans S1–S4 |
| triathlon_training_frequency | Les déficits du contrôle complet sont hors du préfixe ; fréquences natives respectées dans le bloc |

Les messages, codes et sévérités historiques sont gardés intégralement. La classification de portée est une annotation avec témoin (dates, semaines ou déficits), pas une modification de sévérité. Les avertissements historiques restent inchangés dans les résultats retenus.

## Tests négatifs importants

- Une semaine manquante empêche d’invoquer l’explication « préfixe exact1–4 ».
- Une nage supprimée est une vraie erreur de fréquence du bloc.
- Une durée sérialisée différente du registre est une erreur arithmétique/source.
- Une séance déplacée au lundi indisponible est refusée.
- Une compétition réellement dans le bloc ne bénéficie pas de l’exemption de portée.
- Une enveloppe relevée artificiellement, des conditions effacées ou une source modifiée sont détectées.

Ces refus viennent du contrat de bloc, sans changer un validateur existant ni ses seuils. Le contrôle ne prouve ni récupération obtenue, ni exécution complète d’une nage, ni dose individuelle optimale.
