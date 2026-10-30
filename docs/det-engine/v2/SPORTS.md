# Audit sportif V2 — sources et limites

L'audit `auditSportsContinuity(plan, config)` est en lecture seule. Il complète
les validateurs existants ; il ne génère ni séance, ni quota, ni règle de charge.
Chaque contrôle expose séparément son exécution (`executed`, `not_applicable`,
`not_implemented`), son résultat et sa nature (contrat, descriptif, revue experte).
Un résultat inconnu reste inconnu et n'est jamais compté comme un succès.

## Triathlon, dont Ironman continu

Le calendrier contient toutes les semaines attendues, sans doublon ni trou.
Chaque semaine de natation, vélo et course reste dans la chronologie, y compris
les semaines de récupération et de compétition.

Deux questions différentes sont mesurées : présence physique d'une discipline,
et fréquence d'entraînement correspondant au contrat existant. Les minima
proviennent de `catalogueTrainingMinimaForWeek` (événements déclarés) et
`effectiveSessionQuota` (un brick remplace un vélo autonome). Un brick ne dispense
jamais du quota autonome de course. Les compétitions ne deviennent pas des séances
d'entraînement artificielles. La présence d'un brick indique les disciplines
vélo/course, mais sa durée totale n'est pas arbitrairement répartie entre elles.

Les volumes par discipline sont exposés pour chaque semaine. Une simple présence
ne prouve ni une continuité physiologique adéquate ni une progression adéquate.
L'audit ne crée pas de règle de croissance monotone, ne contredit pas la baisse
de charge attendue en récupération et laisse la validation de charge existante
faire son travail. Le jugement de progression propre à chaque discipline reste
`unknown` et exige une revue experte.

Dans la baseline #420, les 40 IM continus se répartissent ainsi : 22 domaines
vides en S1, 8 en S3, 1 en S4 ; 5 doses minimales supérieures au budget en S1 ;
3 prévalidations bloquées ; 1 absence d'affectation en S3. Cela décrit les
obstacles du pipeline, pas 40 preuves d'impossibilité sportive globale.

Une cause logicielle possible est l'absence de parcours des variantes numériques
strictement exécutables (`executableCatalogueVariants`). Les variantes en prose,
comme «180-210 min Z1-Z2 — …», restent volontairement non exécutables dans le
contrat courant : elles ne doivent pas être transformées en dérogation.
Une autre cause possible est le contexte `post_bike` interdit en insertion :
`buildRepairWorkoutMetadata` le déduit de certains textes de fiche ; supprimer
ce garde-fou globalement serait une modification de sécurité, pas un correctif
acceptable. Le domaine doit exposer cette raison sans la contourner.

## Trail

Les classifications restent celles de `normalizeObjectiveKey` et
`isTrailWorkout`. Le D+ déclaré est une preuve de provenance issue du champ
`LibraryWorkout.dPlusTargetM`, pas une dose inventée à partir du texte. Les tags
existants `descente`, `excentrique`, `force`, `musculaire`, `technique` constituent
une preuve descriptive de contenu musculaire ; aucun seuil de fréquence ou de
fatigue inédit n'est imposé.

Le validateur existant `validateTrailDPlusPresence` ne contrôle pas une
progression chiffrée du dénivelé. L'audit l'indique explicitement : progression
D+ `not_implemented`, pertinence musculaire `unknown`. L'absence d'un plan trail
n'est jamais transformée en contrôle réussi. Aucun quota route n'est transposé.

## Tests

Les tests vérifient le calendrier, les ruptures de natation en récupération,
les contrats absents, la distinction brick/course autonome, l'ajustement d'une
compétition déclarée, la provenance d'une vraie fiche trail et les exclusions
de périmètre. Les petites structures de test de l'audit ne sont pas des séances
générées par le moteur et ne servent pas à améliorer son taux d'assemblage.

## Sonde causale des domaines Ironman continus

`TFCL_DET_IRONMAN_PROBE_OUT=docs/det-engine/v2/ironman-probe.json npx vitest run
--config experimental/det-engine/vitest.config.ts --maxWorkers=1
experimental/det-engine/v2-ironman-probe.test.ts` rejoue les 31 refus historiques
Ironman continu portant `empty_catalogue_domain_week_N`. L'horloge, le seed, le
hash de la baseline et les sources sont enregistrés ; tout appel réseau échoue.

Les 31 cas ont exactement un créneau bloquant : le brick long. Les deux fiches
éligibles à la semaine sont `BRICK_STAGE1_INTRO` (60–90 min) et
`BRICK_ACTIVATION_PRE_RACE` (30–50 min). Aucune n'est rejetée en insertion pour
contexte ou prérequis ; aucune n'atteint le plancher du slot, compris selon le
cas entre 95 et 170 minutes. Les variantes strictement exécutables ne réparent
aucun des 31 domaines.

La sonde reconstruit ensuite les options exactes du premier chunk (les 31
échecs concernés sont en S1–S4). Elle vérifie par égalité des identifiants que
`maxItems:130` reproduit le pool d'origine, puis modifie **uniquement**
`maxItems` à 10000. Sport, phases, contexte de semaine, risque, niveau coach,
limiteurs, interdictions, exclusions, historique vide, rotation et seed sont
conservés. Le pool non plafonné contient 3 à 28 bricks selon la configuration,
mais toujours seulement les deux fiches précédentes admissibles à la semaine.
**0/31 domaines sont réparés par suppression du plafond de catalogue.**

Le symptôme «domaine vide» est donc ici attribué à l'intersection des contrats
actuels de phase et de durée, et non au plafond de tokens du LLM ni au contexte
post-vélo. Cette preuve ne signifie pas que les 31 athlètes synthétiques ne
peuvent pas préparer un Ironman : elle montre qu'aucune affectation autorisée
n'existe dans ce créneau précis sous ces contrats.

Décision : préserver le refus et les preuves. Pour débloquer cette partie, une
revue méthodologique/éditoriale doit décider s'il faut une fiche de brick long
compatible avec cette phase, revoir le contrat de progression des bricks ou
revoir le placement. La sonde ne baisse aucun plancher, ne déplace pas les
phases, ne rebaptise pas une fiche et ne fabrique pas de nouvelle séance.
Les autres causes des 9 refus Ironman restants et la conformité des plans
nouvellement assemblés demeurent des sujets distincts.
