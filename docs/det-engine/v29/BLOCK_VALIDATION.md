# Contrôles du bloc : temps exacts, contraintes conservées

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

Les deux défauts flottants V28 sont exécutés par le chemin V28 inchangé : les sommes de minutes mathématiquement équivalentes ont des représentations binaires différentes. Les résultats ci-dessous ne sont pas rectifiés ou effacés.

| Témoin | Somme historique active min | Somme historique stockée min | Égalité stricte | Exécution exacte cible s | Nouvelles réservations S1 s |
|---|---|---|---|---|---|
| catch_pull_declared_timing | 475.91666666666663 | 475.9166666666667 | non | 2755 | 29100 |
| catch_focus_declared_timing | 477.66666666666663 | 477.6666666666667 | non | 2860 | 29100 |


Le chemin complémentaire utilise des sommes entières de secondes : volume planifié contre plafond sportif natif, réservations contre disponibilité déclarée, valeurs inchangées. Aucun epsilon ou arrondi n’est utilisé. Il ne fait pas passer une réservation pour une dose d’exercice. La disparition de l’erreur arithmétique dans cette représentation ne change pas le résultat historique et n’efface aucun dépassement réel de volume ou de disponibilité.

Les réservations des deux scénarios catch totalisent29100s contre36000s de disponibilité ; le volume planifié28555/28660s reste sous28800s. Le2K générique, initialement dans un créneau40min, atteint28800s de réservation et28590s planifiées, mais reste refusé pour sa variante Ironman inconnue. Le gainage totalise28500s réservées et28234/28324s planifiées : aucun nouveau défaut complémentaire. La source `v14-calendar.ts:90` distingue déjà disponibilité et plafond de volume ; aucun seuil n’est changé. Les tests négatifs refusent un vrai dépassement de chacun de ces plafonds. Pour les séances non ciblées, les minutes historiques servent seulement au budget planifié ; leur exécution reste explicitement inconnue. Les autres disciplines, jours, fréquences, repos et capacités restent inchangés. Une modification ultérieure du bloc ou du profil est refusée.

La portée quatre semaines et les sorties historiques intégrales restent attachées à chaque scénario. Les cinq erreurs historiques B et34 avertissements ne sont pas remplacés par le champ `noNewComplementaryDefect`. Ce champ indique seulement absence de nouvelle défaillance dans la représentation complémentaire. Les autres recettes et les horaires précis peuvent encore être inconnus. Aucun plan de quatre semaines ni préparation Ironman n’est déclaré sportivement approuvé.

Douleur, récupération défavorable, capacité insuffisante/inconnue, ancre nécessaire absente/incertaine, variantes et phases non compatibles restent bloquantes. Aucun volume compensatoire et aucune reprise automatique. Les7 refus course A et26 refus C, les quatre incompatibilités longue vélo, ainsi que la politique95→90 limitée sont conservés.
