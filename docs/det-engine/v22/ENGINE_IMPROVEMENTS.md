# Corrections et API expérimentales

## Extensions réutilisables livrées

- `normalizeV22Evidence` : transport explicite via computeTTEEffectif et computeVLamaxEffectif ; conservation de toutes les valeurs brutes et de leur origine synthétique.
- `priorityIntent`/`allocate` existants : option `candidateAllocationPolicy: 'v22_swim_technique'`. Un rôle nage technique est permis avec contenu explicite, domaine et fréquence conservés ; défaut inchangé.
- `buildProspectiveCalendar` existant : options bornées `horizonWeeks` et `dosePolicy: 'reserve_source_minima'`. Par défaut, comportement16 semaines historique inchangé.
- `deriveV22StimulusRequests` : consommation traçable des identifiants de leviers et des familles natives ; refus d’un TTE unknown pris pour un zéro observé ; maintien des interdictions et des doses d’intervalles/force non démontrées.
- `buildV22Prescription` : composition des fonctions précédentes, du contrat canonique V18 et des états V14. Ce n’est pas un nouveau solveur.
- `resolveV22Targets` : domaines provenant exclusivement de tfclDoctrine.ts et intersection avec une borne FTP explicite ; les instructions restantes ne disparaissent pas. Les vues numériques ne modifient ni l’export ni la source.
- `reassessV22` : réutilise resolveInSimulation, lie l’observation à une séance/source/semaine et ne résout que les conditions documentées ; aucun changement de capacité, de calendrier ou de dose automatique.

## Ce qui n’est pas corrigé par V22

L’ancien bloc V11 réutilise encore une source progressive120 min quand le floor de la semaine2 devient130 : ce candidat échoue à juste titre. Le prospectif V14 étendu choisit une source temporelle compatible et laisse les progrès futurs conditionnels. Le protocole de nage complet, la technique/charge de force, les variantes d’objectif et la tolérance posturale ne sont pas inventés.

Le rapprochement recettes/stimuli reste partiel : VO₂/force ciblés sont différés et le bloc de base A/B conserve les mêmes doses. La résolution d’intensité spécifique ne couvre qu’un motif explicite de pourcentage FTP en plus des domaines déclarés, pas toute grammaire physiologique. Les variantes non résolues restent bloquantes pour une prescription exécutée.

## Essais conservés

`baseline-1` est le premier passage immuable. `development-*`, `prospective-*`, `qualified` et `final` gardent les étapes de développement ; `validation-1/build` est la version retenue et `validation-1/replay` son rejeu. Les gros snapshots sont archivés sans perte ; le manifeste associe SHA des octets décompressés et chemins.

Un test de feedback intermédiaire attendait encore un seul prérequis restant. L’intégration canonique en préservait désormais trois (ventilation native, même prérequis canonique, variante d’objectif). Le test a été corrigé pour exiger leur conservation ; aucune condition n’a été supprimée pour obtenir le vert. Le log en échec est gardé. Aucun essai rejeté n’est compté comme amélioration sportive.

## Usage offline

Les tests construisent les cas depuis `inputs.json`, écrivent les entrées complètes avant calcul et bloquent fetch. `v22-run.mjs` borne chaque sous-processus à180s, limite mémoire/logs, épingle les sources et utilise deux exécutions. Il n’offre aucune relance permanente ; le budget global est fixé dans state.json. Aucun branchement UI ou service distant ajouté.
