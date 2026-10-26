# P0 10 km — semaine de course S12

Base : `b70e94c56579b02a1e9876e293f16a0bad1480d4` (squash #416).
Aucun appel modèle, changement de données, migration, changement Nolio ou déploiement.

## Cause et règle retenue

`sessionSizingMatrix.ts` hérite du quota CAP 10K age_group : quatre sorties, renforcement obligatoire une fois, total cinq à six séances en charge. La branche `race` divisait le total par deux, arrondi/plancher trois, mais gardait le minimum CAP de quatre. Le layout protégeait légitimement ce minimum : quatre ou cinq créneaux ne pouvaient respecter un plafond total de trois.

La règle d'affûtage déjà citée dans la branche `taper` et dans `weeklySlotLayout.ts` (Mujika & Padilla 2003 ; Bosquet 2007) distingue réduction du **volume** et maintien de la **fréquence**. La division du nombre de séances ne représentait donc pas cette règle. La correction ne déduit aucun nouveau pourcentage scientifique. Les facteurs de volume existants (`taperVolumeOverride.ts` : affûtage 0,60 ; semaine de course 0,35), activations courtes 20–30 min, suppression des SL obligatoires, repos et validations restent inchangés. Un facteur de cible affichée n'est pas une preuve du volume réellement produit : celui-ci reste à contrôler.

## Avant / après

| Contrat | Avant | Après |
|---|---|---|
| CAP en S12 | 4–4 | 4–4, **course incluse** |
| Total S12 | 3–3, impossible | 4–5 |
| Calcul du total | moitié du total de charge | total de référence moins le minimum de renforcement devenu facultatif : `[5−1, 6−1]` |
| Renforcement | minimum 0, plancher 0 | inchangé, facultatif, aucun ajout pour remplir le total |
| Sortie longue | non exigée | inchangé |
| Repos complet | minimum 1 | inchangé |
| Pool de fiches | minimum 4 CAP demandé aux seules fiches d'entraînement | minimum 3 fiches si une course 10K est explicitement déclarée dans cette semaine ; le total final exige toujours quatre CAP dont la course |

Cette correction de fréquence est limitée au 10K ; aucune règle de quota des autres disciplines n'est modifiée. Le décompte de couverture catalogue utilise seulement les objectifs déclarés et leurs dates ISO valides. Il ne déduit aucune compétition d'un titre ou de `weekType=race`, ne crée aucune séance et ne prouve pas sa présence dans le résultat. Absence de date, autre semaine, autre sport : aucune déduction. Une déclaration dupliquée ne soustrait pas deux événements. Le validateur final de présence/identité des compétitions est inchangé.

## Niveau coach et sécurité

Le niveau light plafonne déjà l'ambition demandée competitor vers age_group. Les quatre CAP proviennent de la matrice existante de cette ambition effective, pas d'un nouveau calcul de capacité. La première semaine et S1–11 ne sont pas augmentées. La fréquence en S12 est maintenue par rapport à S11 et au bloc de charge ; les entraînements deviennent courts, pas quatre séances de charge complète plus la course.

Heures et charge récente restent inconnues : quatre sorties ne constituent **pas** une tolérance démontrée chez cet athlète. L'avertissement `coach_initial_load_unverified`, la provenance manuelle et les contrôles de progression existants sont conservés. La faisabilité individuelle, les jours choisis et l'intérêt du renforcement facultatif doivent être relus par le coach. Aucun formulaire ou import n'est ajouté.

## Preuves reproductibles

- Avant : `tenKRaceWeek.test.ts` rouge, `expected 3 to be greater than or equal to 4`.
- Après : minimum CAP compatible avec le total ; un exemple synthétique de trois activations de 20 min et une course de 45 min passe le décompte final sans cinquième sortie. Ces durées sont une fixture, pas une prescription pour un athlète réel.
- Les douze semaines respectent l'inégalité minima obligatoires ≤ maximum total dans le cas 10K age_group rejoué. Les cinq ambitions 10K conservent leur fréquence CAP ; renforcement non obligatoire en course.
- Tests de non-régression des quotas existants semi, marathon, 70.3, Ironman, sprint, olympique et Start to Run ; couverture trail via les suites existantes. Ces autres règles ne sont pas déclarées sportivement parfaites par ce test.
- La couverture catalogue exclut uniquement l'événement officiel daté, jamais une simulation ou un événement supposé ; les refus d'équivalence, durée et intensité restent actifs.

```sh
node scripts/quality/replay-10k-catalogue-contracts.mjs /tmp/tenk-s12.json
npx vitest run src/engines/plan/__tests__/tenKRaceWeek.test.ts
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
deno test --allow-read --allow-env supabase/functions/ai-training-plan supabase/functions/ai-training-plan-test
```

Dans le replay anonymisé, pour les deux âges fictifs 32 et 50, S12 donne total 4–5, quatre CAP minimum, layout cinq séances si le renforcement compatible est disponible, seize candidats compatibles dont trois CAP, et aucun sport manquant après prise en compte du Jour J déclaré. L'exemple sans renforcement reste valide à quatre séances. Les contre-exemples sans objectif daté conservent le diagnostic de pool insuffisant.

## Limites et décision

Les réponses rejetées de la tentative historique restent indisponibles ; aucune attribution de leurs refus à une fiche précise. Les tests offline ne garantissent pas qu'une future réponse de modèle respectera les contrats. Les mêmes contrôles bloquants continuent de refuser une prescription réellement incompatible.

GO pour revue de cette correction, sous CI/reproductibilité vertes. GO **technique** pour envisager une génération contrôlée après autorisations séparées de fusion, publication coordonnée et appel payant ; validation du coach sur charge inconnue et fréquence indispensable. Pas de GO pour utiliser un plan futur sans revue sportive ni validation de sa sauvegarde. Aucun appel payant ou publication exécuté dans cette mission.

Résultats CI au HEAD exact et preuves de reproductibilité : voir la PR brouillon associée.
