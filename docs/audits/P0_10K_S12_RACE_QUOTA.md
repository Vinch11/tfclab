# P0 S12 — correction des mécanismes partagés, portée par discipline

Base : `b70e94c56579b02a1e9876e293f16a0bad1480d4` (squash #416). PR brouillon #417.
Aucun appel modèle, accès/modification de données athlètes, migration, changement Nolio ou déploiement.

## Causes communes démontrées

1. La branche `race` de `sessionSizingMatrix.ts` divisait le **nombre de séances** par deux, tout en conservant les minima par discipline. Le défaut n'était pas propre au 10 km : les nouvelles reproductions échouaient aussi sur 5 km, semi-marathon, marathon, Half-Ironman et Ironman.
2. `weeklySlotLayout.ts` ne remplaçait un vélo autonome par le brick que si celui-ci était une sortie longue. En taper/race, les SL étant désactivées, cette substitution disparaissait, contrairement à `effectiveSessionQuota` utilisé par la réconciliation et la validation.
3. En taper/race, le placement des nages après la CAP saturait les mêmes jours de semaine, laissant un vélo obligatoire non placé malgré des créneaux possibles. La vérification du layout jusqu’au validateur final reproduisait le défaut en Half-Ironman et Ironman.
4. Le contrôle de couverture demandait toutes les fiches au catalogue d'entraînement, alors qu'un événement officiel déclaré est une séance custom sans fiche catalogue. Cette distinction concerne aussi les autres objectifs et les triathlons officiels.

Sept assertions sur huit échouaient dans la première reproduction interdisciplinaire avant correction (le 10 km avait déjà son correctif local). Un test 10 km vert masquait donc encore des contrats incohérents ailleurs.

## Corrections communes

### Total de semaine de course

La correction locale `if (objKey === "10K")` est remplacée par le calcul commun, à partir de **la ligne propre à l'objectif et à son ambition effective** :

```
minimumCardio = swim.min + bike.min + run.min + brick.min
race.total.min = max(minimumCardio, base.total.min − base.strength.min)
race.total.max = max(race.total.min, base.total.max − base.strength.min)
```

Les fourchettes de swim/bike/run/brick ne changent pas ; renforcement minimum et plancher deviennent zéro comme auparavant. Le plancher cardio évite notamment d'abaisser Start to Run sous sa fréquence propre. Ce calcul aligne le total sur les contraintes déjà prescrites, sans nouvel objectif de volume ou seuil de progression.

La règle d'affûtage déjà citée par TFCL (Mujika & Padilla 2003 ; Bosquet 2007) distingue volume réduit et fréquence maintenue. Les facteurs existants de cible de volume (`taperVolumeOverride.ts` : 0,60 en affûtage ; 0,35 en semaine de course), activations, jours de repos et protections restent inchangés. Une cible affichée ne prouve pas le volume effectivement produit : les durées restent à contrôler.

### Comptage des bricks

Le layout réutilise `effectiveSessionQuota`, **après le clamp nominal**, pour compter chaque brick comme remplacement d'un vélo autonome. La substitution n'est plus attachée au statut « sortie longue ». Les cibles nominales exposées par le layout sont conservées ; les créneaux réellement placés et le contrôle final appliquent la même convention. Aucun brick n'est transformé en plusieurs séances, aucune règle physiologique n'est remplacée.

En taper/race, le remplissage natation privilégie les jours de semaine les moins occupés après la CAP. Le dimanche reste le dernier recours ; jours de repos, capacité quotidienne, interdiction vélo/brick le même jour et fréquence demandée sont conservés. Cela évite de perdre une séance par saturation locale sans augmenter les quotas.

### Compétitions et couverture catalogue

Le helper partagé de couverture réserve le sport de l'événement explicitement déclaré à sa date : `run` pour course à pied/trail ; `brick` pour un triathlon continu. Ce sont les objectifs normalisés et sports d'événement existants, pas une nouvelle taxonomie.

Il ne change **jamais** le quota final, ne crée aucune séance et ne prouve pas la présence du Jour J. Les validations finales de présence, date, identité, durée, intensité et équivalence restent actives. Un triathlon réservé comme brick ne déduit pas simultanément une natation, un vélo et une CAP. Aucun événement n'est inféré d'un titre. Date absente/invalide, objectif inconnu ou format multi-étapes LCW : aucune déduction automatique. Une déclaration dupliquée ne déduit pas deux fois le même sport.

## Avant / après représentatif — age_group

| Objectif | Total nominal race avant correction commune | Après | CAP / autres spécificités |
|---|---:|---:|---|
| 5 km | 3–3 | 4–5 | Quota CAP propre conservé |
| 10 km | 3–3 dans main, 4–5 dans la première version de #417 | 4–5 | Quatre CAP, **course incluse**, renforcement facultatif |
| Semi-marathon | 3–3 | 4–5 | Affûtage propre conservé, pas celui du marathon |
| Marathon | 3–3 | 4–5 | Affûtage deux semaines conservé |
| Half-Ironman | 6–6, incompatible avec ses minima | 10–10 nominal ; 9–9 avec un brick | Quotas swim/bike/run/brick conservés ; vélo autonome remplacé une fois |
| Ironman | 6–6, incompatible avec ses minima | 10–10 nominal ; 9–9 avec un brick | Affûtage trois semaines conservé |
| Trail | Pas dimensionné par cette matrice : quota `null` | Inchangé | Voie terrain/D+/descente et affûtage dédié préservés |

Ces nombres sont des **contrats de comptage**, pas une recommandation universelle de fréquence ou une capacité individuelle démontrée. Les références de volume et les priorités physiologiques restent celles de chaque plan.

## Corrections et comportements spécifiques

- **Cas S12 10 km** : test synthétique de trois activations de 20 min plus une course de 45 min : quatre CAP, aucun cinquième entraînement requis. Ce n'est pas une prescription pour un athlète réel.
- **Triathlons** : tests spécifiques de substitution vélo/brick, minima natation, comptage final ; l'identité d'événement officiel est un brick custom, pas une simulation catalogue.
- **LCW** : quota brick nul et dernier sport de l'étape préservés ; aucune déduction de couverture « un événement brick » pour cette compétition multi-jours. Son organisation sportive complète n'est pas validée ici. Les placements complets des paliers très élevés et des variantes multi-bricks restent aussi à examiner sur des plans réels ; les tests de minima ne les certifient pas.
- **Trail** : aucun quota route ne lui est appliqué. Tests montagne et ultra de durée d'affûtage ; profil terrain/descente et décharge D+ −40–50 % toutes les 3–4 semaines conservés. La correction de couverture est testée séparément du dimensionnement du plan.
- **Niveau coach** : statut de charge inconnue, provenance manuelle, avertissement `coach_initial_load_unverified`, ordre des limiteurs et protections de progression conservés. Quatre CAP ne démontrent pas une tolérance réelle chez un athlète light ; validation coach toujours nécessaire.

## Disciplines effectivement testées

| Discipline | Vérifications offline représentatives | Ce qui reste à vérifier |
|---|---|---|
| 5 km | Minima/total, ambitions, comptage des créneaux, événement, calendrier/affûtage/récupération | Qualité d'un plan complet réellement généré |
| 10 km | Même socle + S1–12, S12 avec course incluse, garde-fous existants | Réponse future du modèle, tolérance individuelle, revue coach |
| Semi-marathon | Minima/total, ambitions, comptage, événement, affûtage une semaine | Plan complet et progressions réellement produites |
| Marathon | Même socle, affûtage deux semaines | Plan complet, tolérance musculo-tendineuse réelle |
| Trail | Absence de quota route imposé, événement, montagne/ultra, D+, descente, récupération et affûtage dédiés | Fréquence/volume d'un plan trail complet ; pas de matrice déterministe de quotas équivalente |
| Half-Ironman | Minima propres, ambitions, natation, bricks/vélo, comptage final, événement, affûtage deux semaines, exception LCW | Répartition/intensités d'un plan complet et organisation de la semaine de course |
| Ironman | Même socle, affûtage trois semaines, exception LCW | Plan complet, récupération et spécificité individuelles |

Les tests ne réduisent pas ces disciplines à un nombre fixe de sorties CAP. Ils utilisent leurs propres paramètres et comparent les deux côtés du contrat. Le même calendrier est testé avec cadences de récupération trois/quatre semaines. Des tests de sprint, olympique et Start to Run existants complètent le périmètre ; ils ne constituent pas une certification sportive générale.

## Reproduction et résultats

```sh
npx vitest run src/engines/plan/__tests__/raceWeek.crossDiscipline.test.ts
npx vitest run src/engines/plan/__tests__/tenKRaceWeek.test.ts
node scripts/quality/replay-10k-catalogue-contracts.mjs /tmp/tenk-s12.json
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
deno test --allow-read --allow-env supabase/functions/ai-training-plan supabase/functions/ai-training-plan-test
```

Le replay 10 km reste explicitement un cas 10 km, pas une validation générale. Les suites interdisciplines et leurs limites ci-dessus apportent les preuves supplémentaires. Résultats CI/reproductibilité au HEAD exact consignés dans la PR ; les anciens résultats du premier HEAD ne valent pas pour une révision ultérieure.

## Décision et limites

GO pour revue de la correction commune sous CI et reproductibilité vertes. Aucun GO sportif général ni autorisation d'utilisation automatique de futurs plans. Avant une nouvelle génération contrôlée : autorisations distinctes de fusion/publication/appel payant, versions compatibles attestées, validation coach sur la charge inconnue et la fréquence, puis revue du résultat réel. Les refus de la tentative historique sans identifiants précis restent non attribuables. Aucun appel payant ou publication exécuté ici.

La règle de compte rendu interdisciplinaire est inscrite dans `AGENTS.md` pour les corrections futures, en réutilisant les validations disponibles.
