# Résultats V13 — DRAFT / NO-GO

**Aucun plan Ironman complet admissible de16 semaines n’est produit.** Les préconditions échouent avec les preuves actuelles ; le refus est conservé plutôt que d’augmenter artificiellement les capacités, tronquer une recette ou remplir le calendrier.

| Profil | Première contradiction de longue course | Nage45 min confirmée | Préparation complète |
|---|---|---|---|
| IM_aerobic_history | S5 | non | refusée avec témoins |
| IM_balanced_history | S6 | non | refusée avec témoins |

## Améliorations vérifiées

1. Audit de340 sources proposées sur l’horizon, avec couverture et inconnues distinctes. Le parseur partiel ne confond plus Main et séance entière dans cette couche. L’essai initial supersédé est conservé.
2. Overlay expérimental de la transition :30 min vélo +25 course actives ; temps total inconnu. Source de production, phases et intensités préservées ; aucune séance55 min artificiellement déclarée complète.
3. Nage : CSS90 de crawl seulement pour l’aérobie, CSS absente pour l’équilibré. Les autres temps manquent ; contrat numérique45 min accepté ne vaut pas faisabilité individuelle.
4. Copie de configuration V13 réconciliant la cible de rampe14→10 h, tout en conservant plafonds initiaux, planchers et enveloppes. Les refus de longues restent présents après correction :90>75 en S5 pour l’aérobie,95>90 en S6 pour l’équilibré.
5. Maintien et progression V12 recontrôlés avec plans/diagnostics identiques, sans supériorité démontrée ni adaptation acquise. Les principes Lorang restent des principes d’individualisation et réévaluation, pas des quotas universels.

Typage réussi ;62 tests de gouvernance ;122 tests expérimentaux réussis (47 opt-in ignorés) ;2999 historiques réussis (1 ignoré,6 todo). Les11 tests ciblés de preuve recouvrent la suite expérimentale et un test opt-in, sans addition comme couverture indépendante. Deux processus reproduisent exactement trois artefacts.

La correction tardive du seul paramètre expérimental de rampe a été suivie d’un nouveau typage et de toute la suite expérimentale ; les résultats historiques déjà réussis concernent des sources et entrées inchangées. Une tentative de validation différentielle a échoué sur le typage de la copie de profil ; ses preuves sont conservées dans evidence/rejected-delta-attempt-2. La correction générique a été revalidée sans changement de règle sportive. La première preuve opt-in a aussi dépassé le délai Vitest de5 s pendant son archivage (5,804 s) ; elle est conservée et non acceptée. Le rejeu de preuve utilise30 s par test sous plafond de processus180 s, sans modifier les assertions ou règles sportives. Aucune régression sportive critique introduite n’est détectée par ces contrôles. Les validateurs de préparation complète16 semaines ne sont pas exécutés sur un faux plan : ils restent non applicables.

## Décisions et preuves nécessaires avant nouvelle construction

- Exécutions complètes de nage avec allures/provenance des différentes nages et repos ; ne pas déduire ces valeurs d’un CSS de crawl ou du niveau.
- Réévaluation documentée de la capacité des longues et de la récupération avant les futurs planchers ; aucune progression acquise par simple calendrier. Toute modification de plancher/méthodologie nécessiterait une revue distincte, jamais un assouplissement pour assembler.
- Temps complet des transitions et recettes réellement exécutables, prérequis de force et nutrition individualisée ; le contrat actif corrigé du brick ne suffit pas.
- Revue sportive indépendante des hypothèses de maintien/consolidation posturale et des phases spécifiques/affûtage avant promotion.

Les références V2–V12 et les600 configurations restent intactes. Aucun accès Nolio, donnée réelle écrite, moteur/validateur de production modifié, migration, fusion, déploiement, publication Lovable, appel payant ou promotion automatique. Les dix unités sont bornées par une échéance absolue de60 minutes ; aucun processus permanent de développement n’est revendiqué.

[Inventaire des dossiers](README.md), [matrice16 semaines](FULL_IRONMAN_FEASIBILITY.md), [registre](REPRISE.md).
