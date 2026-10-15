# Pilot Cockpit — corrections ciblées du run B-5K-BEGINNER

Base : `c44a064037eb8ee2ddf4b37ba81db7e282aa98d1` (`main`).
Source : `2026-10-15_B-5K-BEGINNER_run1.json`, timestamp
`2026-10-15T11:48:09.269Z`, profil synthétique, 12 semaines, 3 chunks.
La fixture conserve les entrées et le plan fusionné du fichier fourni ; les
résultats historiques de validation ne sont pas utilisés comme oracle.

## Périmètre et coordination

- Aucun changement de `phaseWidener.ts`, de la protection des semaines de
  décharge, de la doctrine physiologique, des quotas ou du générateur Gemini.
- `planReconciler.ts` est modifié uniquement pour le contexte chaleur :
  classification et deux chemins de sélection de remplaçants. Ses routines
  de décharge restent identiques à la base.
- Aucun appel de génération IA, aucune fusion, aucun déploiement.
- Les changements évitent de réécrire le plan historique : les séances
  réellement présentes dans la fixture restent inspectables.

## 1. Chaleur non demandée

S5 et S7 contiennent `ENR_HEAT_ACCLIM_Z2`, sans contexte chaleur dans les
entrées du run. Le filtre partagé des contextes particuliers ne couvrait pas
la chaleur.

Ajout du motif `heat` à `UnconfirmedContextReason` : tags `heat`/`sauna` ou
segment d'ID `HEAT`. Le catalogue exclut ces protocoles par défaut. L'option
existante `confirmedSpecialContexts: new Set(["heat"])` permet une confirmation
explicite ; une confirmation altitude ne suffit pas. Une simple précaution
« éviter la chaleur » dans `avoid` n'exclut pas une séance ordinaire.

Protection des substitutions de durée/phase et du remappage vers un voisin
du catalogue injecté. Un protocole chaleur déjà présent peut conserver son
contexte ; aucune séance ordinaire ou d'altitude ne devient implicitement heat.
Ce correctif ne prétend pas détecter tout protocole chaleur rédigé librement
par le modèle sans ID catalogue.

## 2. Compétition objectif en affûtage

La course S12 porte le tag `[VO2/VMA · 95-100% VMA]`. Le contrôle de cohérence
de phase traite cette compétition comme une séance de développement VMA.
L'exception porte désormais sur la séance d'épreuve explicitement nommée en
début de titre, dans une discipline de compétition. Elle n'exempte ni la
semaine entière, ni une activation, ni une simulation, ni un fractionné
mentionnant une compétition. Les tests vérifient ces contre-exemples.

## 3. Repos

Sept faux positifs du fichier reproduits puis supprimés : S2 mardi, S5 jeudi,
S6 vendredi, S9 jeudi et samedi, S11 dimanche, S12 samedi.

Deux causes : `muscul` reconnaissait « régénération/fraîcheur musculaire » ;
`course` reconnaissait « semaine de course » et « affaires de course ».
La détection conserve muscu/musculation, renforcement, course réellement
prescrite, vélo et zones/durées d'activité. Les tests gardent notamment un
cas mêlant préparation des affaires et une vraie course de 30 minutes.

## 4. Investigation S4/S8/S11

Le rejeu applique `jsonPlanToParsedPlan`, puis `validatePlanPaces` comme le
cockpit, puis le validateur réel. Le contrôle B7 ajoute des tags aux titres
avant la validation physiologique. Ces métadonnées étaient relues comme du
contenu d'effort : « VMA », « seuil » et « Race pace » contaminaient les
minutes d'endurance. Elles sont maintenant retirées de l'analyse d'intensité,
ainsi que les références numériques `% VMA/VO2max/FTP` et les marqueurs d'ID.
Les zones structurées et les vrais blocs d'effort restent analysés.

| Semaine | Observation initiale reproduite | Diagnostic et résultat |
|---|---|---|
| S4 | 0 % low, 100 % high | Tags d'affichage sur le fartlek et la sortie Z2. Après nettoyage : 93 % low, 7 % high sur le temps reconnu. |
| S8 | 16 % low, 84 % high ; 3 séances exigeantes sur 4 | Le footing Z1 est contaminé par le tag VMA. Le parseur lit aussi « Z3 haut » comme **3 h**, soit 180 min fictives. La sortie longue passe de 235 à 55 min reconnues après correction du motif horaire. Le faux signal d'accumulation disparaît ; les avertissements de distribution Lorang restent présents. |
| S11 | 2 séances exigeantes sur 3, dont le footing de 15 min Z1 | Le footing devient correctement facile. Plus de signal d'accumulation ; le décalage entre phase déclarée « Développement » et thème « Affûtage » reste signalé et appartient au travail de coordination des phases. |

**Limites restantes, non refondues ici :** le mapping vers `ParsedSession`
ne conserve pas `durationMin`. Le parseur historique ignore certains segments
de moins de 15 minutes et ne comprend pas toutes les répétitions (`4×30s`,
`8 répétitions de (…)`) ou tous les blocs séparés par `+`. Par exemple, S4
n'utilise que 2 durées sur 4 séances ; S8 reconnaît désormais 95 minutes
alors que les durées structurées totalisent 165 minutes ; S11 reconnaît 30
minutes contre 65 structurées. Un titre de séance au seuil peut encore
influencer la première clause d'échauffement.

Les pourcentages corrigés sont donc des **estimations du texte reconnu**,
pas une certification physiologique du plan. Une suite séparée peut propager
les durées structurées puis analyser les blocs d'effort/récupération, avec
tests dédiés. Aucun seuil d'alerte n'a été assoupli dans cette PR.

## 5. B1/B9 dans le Pilot Cockpit

Le fichier historique indique « Stat manquante » (B1) et « résumé absent »
(B9), malgré un plan fusionné et de l'usage token. Il ne contient ni le
journal localStorage ni les résumés sémantiques : impossible de certifier
rétroactivement ces deux checks à partir de ce seul export.

Bug reproduit : `readPlanStats()` garde les 50 dernières entrées, mais le
cockpit utilisait `after.slice(before.length)`. À 50 entrées, la nouvelle
statistique est perdue systématiquement. La sélection compare désormais
l'instantané avant/après et le début du run. Le test du hook simule une
génération locale avec journal plein et vérifie B1/B9 via le vrai cockpit.
La saturation est une cause démontrée dans le code ; son occurrence dans
le navigateur du run historique n'est pas prouvée par l'export.

B9 ne lisait également que le premier `value_check_summary`. Il agrège
maintenant tous les résumés et échoue si un chunk ultérieur comporte une
valeur non résolue, un absolu résiduel ou un résumé mal formé. Une statistique
ou un résumé réellement absent reste un échec ; aucun succès n'est inventé.

## Validation locale

- Compilation : `tsc --noEmit -p tsconfig.app.json` réussie.
- ESLint différentiel : aucune nouvelle erreur ni nouvel avertissement.
  Dette identique à la base : 6 erreurs dans `planValidator.ts`, 79 dans
  `planReconciler.ts` ; nouveaux tests sans erreur.
- Tests de catalogue chaleur, des deux chemins du réconciliateur, du rejeu
  réel, des repos/compétitions et de la télémétrie circulaire.
- Suite complète : **272 fichiers, 2 050 tests réussis**. Après la dernière
  correction du motif horaire : **25 fichiers ciblés, 239 tests réussis**,
  incluant le nouveau contre-exemple « Z3 haut ». Aucun appel IA.

Environnement Windows : installation locale isolée des dépendances. Le
couple déclaré Vitest 4 / Vite 5 échoue au chargement de `vite/module-runner`.
Pour exécuter les tests, Vite 7.3.7 est substitué **localement seulement** et
Vitest 4.1.11 lancé par `startVitest` avec les mêmes include/setup/globals,
happy-dom, alias `@` et JSX automatique via esbuild. Le binding SWC récent
refuse le cache du sandbox Windows. Aucun manifest, lockfile, configuration
CI ou dépendance de production n'est modifié dans la PR. La CI habituelle
reste une vérification distincte de cet environnement local.
