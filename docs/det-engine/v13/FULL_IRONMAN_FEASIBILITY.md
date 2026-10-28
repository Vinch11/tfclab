# Faisabilité Ironman16 semaines — aucune préparation complète admissible

Les deux horizons sont examinés jusqu’à S16, avant puis après réconciliation du paramètre expérimental de budget. Ce tableau décrit les exigences et leurs témoins ; **il n’est pas un calendrier de séances prescrit**. Aucun trou n’est rempli par un repos, une séance ou un événement fictif.


## IM_aerobic_history

| S | Phase/type | Plancher vélo/course | Enveloppe actuelle vélo/course | Plafond natif avant/après | Plafond effectif entraînement | Minima indépendants de source | Événements déclarés | Nécessaires satisfaits |
|---|---|---|---|---|---|---|---|---|
| 1 | base/load | 90/60 | 180/75 | 480/480 | 480 | 285 | 0 | True |
| 2 | base/load | 100/65 | 180/75 | 528/528 | 528 | 290 | 0 | True |
| 3 | base/load | 110/75 | 180/75 | 580/580 | 580 | 300 | 0 | True |
| 4 | base/recovery | 85/55 | 180/75 | 447/420 | 420 | None | 0 | False |
| 5 | build/load | 130/90 | 180/75 | 702/600 | 600 | None | 0 | False |
| 6 | build/load | 145/95 | 180/75 | 773/600 | 600 | None | 0 | False |
| 7 | build/load | 150/100 | 180/75 | 800/600 | 600 | None | 0 | False |
| 8 | build/recovery | 105/70 | 180/75 | 560/420 | 420 | None | 0 | False |
| 9 | build/load | 150/100 | 180/75 | 800/600 | 600 | None | 0 | False |
| 10 | build/load | 150/100 | 180/75 | 800/600 | 600 | None | 0 | False |
| 11 | build/load | 150/100 | 180/75 | 800/600 | 600 | None | 0 | False |
| 12 | build/recovery | 105/70 | 180/75 | 560/420 | 420 | None | 0 | False |
| 13 | build/taper | None/None | 180/75 | None/None | 600 | 140 | 0 | True |
| 14 | taper/taper | None/None | 180/75 | None/None | 600 | None | 0 | False |
| 15 | taper/taper | None/None | 180/75 | None/None | 600 | None | 0 | False |
| 16 | taper/race | None/None | 180/75 | None/None | 600 | 110 | 1 | True |

Premier témoin de capacité : S5, plancher90 min contre enveloppe documentée75 min. Le refus demeure après la correction du budget. Le tableau des sources compatibles ne constitue pas un calendrier joint ; les minima indépendants ne garantissent ni placement ni progression sportive.

## IM_balanced_history

| S | Phase/type | Plancher vélo/course | Enveloppe actuelle vélo/course | Plafond natif avant/après | Plafond effectif entraînement | Minima indépendants de source | Événements déclarés | Nécessaires satisfaits |
|---|---|---|---|---|---|---|---|---|
| 1 | base/load | 90/60 | 150/90 | 480/480 | 480 | 285 | 0 | True |
| 2 | base/load | 100/65 | 150/90 | 528/528 | 528 | 290 | 0 | True |
| 3 | base/load | 110/75 | 150/90 | 580/580 | 580 | 300 | 0 | True |
| 4 | base/recovery | 85/55 | 150/90 | 447/420 | 420 | None | 0 | False |
| 5 | build/load | 130/90 | 150/90 | 702/600 | 600 | None | 0 | False |
| 6 | build/load | 145/95 | 150/90 | 773/600 | 600 | None | 0 | False |
| 7 | build/load | 150/100 | 150/90 | 800/600 | 600 | None | 0 | False |
| 8 | build/recovery | 105/70 | 150/90 | 560/420 | 420 | None | 0 | False |
| 9 | build/load | 150/100 | 150/90 | 800/600 | 600 | None | 0 | False |
| 10 | build/load | 150/100 | 150/90 | 800/600 | 600 | None | 0 | False |
| 11 | build/load | 150/100 | 150/90 | 800/600 | 600 | None | 0 | False |
| 12 | build/recovery | 105/70 | 150/90 | 560/420 | 420 | None | 0 | False |
| 13 | build/taper | None/None | 150/90 | None/None | 600 | 140 | 0 | True |
| 14 | taper/taper | None/None | 150/90 | None/None | 600 | None | 0 | False |
| 15 | taper/taper | None/None | 150/90 | None/None | 600 | None | 0 | False |
| 16 | taper/race | None/None | 150/90 | None/None | 600 | 110 | 1 | True |

Premier témoin de capacité : S6, plancher95 min contre enveloppe documentée90 min. Le refus demeure après la correction du budget. Le tableau des sources compatibles ne constitue pas un calendrier joint ; les minima indépendants ne garantissent ni placement ni progression sportive.

## Correction logicielle expérimentale du budget

Les fixtures V10 avaient fixé weeklyHours à10 h mais conservé volumeRamp.weeklyHoursTarget à14 h depuis le cas QA initial. La copie V13 réconcilie la cible à10 h et maintient week1HoursMax8, pourcentages/paramètres existants, planchers, historique et enveloppes. Les plafonds natifs de charge ne dépassent plus600 min ; la récupérationS4 native devient420 au lieu de447, sans affecter le temps250 des blocs déjà examinés. La note QA de charge récente héritée reste explicitement synthétique : aucune mesure réelle ni conversion TSS→heures n’est inventée. Les fichiers V10–V12 ne sont pas modifiés.

Une borne native supérieure au budget coach n’était pas un volume obligatoire. L’intersection avec600 min était déjà imposée dans le premier audit ; la réconciliation corrige maintenant aussi l’entrée de rampe. Cette amélioration ne fait pas disparaître les refus de longues.

## Pourquoi ne pas produire le plan

Le profil aérobie ne dispose pas d’une preuve couvrant90 min de course en S5 sous son enveloppe actuelle75 ; l’équilibré manque de preuve pour95 min en S6 sous son enveloppe90, puis les exigences montent à100. Le simple passage de semaines planifiées ne crée pas cette capacité. Ces bornes synthétiques actuelles ne sont pas des plafonds physiologiques universels et ne prouvent pas l’impossibilité future d’un Ironman. Une nouvelle réponse documentée ou une revue méthodologique serait nécessaire ; aucune n’est inventée pour assembler.

S’ajoutent des temps individuels de nage inconnus, des recettes insuffisamment chronométrées, un brick corrigé seulement pour sa portion active, la réponse posturale non observée et la préparation spécifique/nutrition/force non attestées. La sélection de sources examine un pool borné et les domaines actuellement étayés ; une absence dans ce pool n’est pas une preuve d’absence globale dans les920 fiches.

Les minima d’entraînement sont dérivés des helpers existants et séparés des réservations officielles de compétition. La compétition déclarée n’est pas fabriquée comme séance catalogue ou entraînement ; sa durée demeure inconnue et n’est pas imputée au plafond600 min d’entraînement. Les phases et types natifs, y compris taper en phasebuild, sont exposés sans les modifier pour faciliter une insertion.

Conclusion opérationnelle : plan=null pour chaque profil. Aucune construction de16 semaines sportivement défendable n’est engagée au-delà des préconditions échouées. La validation technique/sportive/globale d’un plan complet n’est pas comptée passée : elle est non applicable faute d’objet admissible. Le contrôle de tout l’horizon est un audit nécessaire, pas une collection de microcycles validés ni un générateur complet démontré.
