# #418 — finalisation opérationnelle multiobjectifs, 27 octobre 2026

Base inchangée : `73fd91ca17bf30b147cd63e32e38d10a5ea3d5eb`. Même branche et même PR brouillon #418. Ce rapport remplace le bilan initial du 26 octobre ; les preuves sont régénérées après les corrections.

**Quatre conclusions distinctes** : préparation technique par configuration ; construction complète réellement disponible ; contrôles sportifs déterministes ; revue scientifique/humaine. Aucune réussite de préparation n'est assimilée à un plan produit ni à une preuve scientifique. Aucun modèle appelé, aucune donnée athlète modifiée, aucune migration, modification Nolio, publication ou fusion. #407/#408 restent inactives.

La finalisation ciblée du comptage est détaillée dans [FINALISATION_COMPTAGE_CATALOGUE_2026-10-27.md](FINALISATION_COMPTAGE_CATALOGUE_2026-10-27.md). Les 11 anciennes alertes de cardinalité sont distinguées de la diversité limitée ; aucun quota ni catalogue admissible n’est élargi.

## Corrections démontrées dans cette continuation

| Cause / première étape défectueuse | Correction minimale | Preuve / protection conservée |
|---|---|---|
| Assimilation : total réduit de 30 %, minima par sport simultanément trop élevés | Réutiliser `applySessionsPerWeekTarget` sous le plafond déjà calculé, sans seconde réduction de 30 %. L'allocation protège le brick obligatoire et les floors existants | Tests sur les 8 objectifs dimensionnés × 5 ambitions, et LCW uniquement pour IM/703. Aucun plafond, maximum sportif, capacité quotidienne ou jour de repos augmenté |
| Retour à une SL nominale en récupération malgré une rampe initiale faible | Appliquer la même rampe au floor déjà réduit par le cycle. Rampe catégorielle et assimilation sont deux axes distincts ; aucun nouveau coefficient | Huit objectifs : S4 récupération ne réintroduit pas une SL supérieure à S3 chargée. L'ancien test qui attendait ce défaut est remplacé ; taper/race restent sans SL forcée |
| Placement glouton incomplet malgré des jours disponibles | Conserver le placement préféré lorsqu'il convient ; sinon utiliser les jours autorisés, réserver le renforcement et servir les sports les moins flexibles avant la nage | Pas de séance ajoutée au-delà des cibles/quota. Jours interdits, repos, séparation brick/CAP/vélo et contraintes renfo maintenus |
| Brique non placée déjà soustraite du vélo autonome ; au plus une brique résiduelle traitée | Calcul vélo à partir des bricks effectivement placés ; placement de chaque brick autorisé, sans coexistence avec run/bike autonomes | Le comptage rejoint `effectiveSessionQuota`, sans transformer deux sports en une seule séance artificiellement |
| Cas où le glouton reste incomplet | Recherche locale bornée à 50 000 états, sur les plages et les séances déjà prévues, ancrages longs/événements conservés, sans relever les capacités | Un échec reste bloquant. Il n'est pas présenté comme une preuve universelle qu'aucun autre placement n'existe. Aucune réécriture du moteur sportif |
| Socle catalogue correct pour l'union du chunk mais insuffisant pour une semaine | Réserver le socle existant par sport/famille dans chaque contrat hebdomadaire, parmi les seuls candidats déjà filtrés et scorés | Pas d'élargissement des phases, intensités, niveaux ou prérequis. La régénération par phase conserve le filtre strict et une préférence de rotation, plutôt qu'une exclusion de toutes les fiches offertes |
| Capping perdant les durées courtes, longues ou intermédiaires disponibles | Conserver une couverture de l’union complète des durées admissibles de chaque groupe hebdomadaire, variantes numériques comprises | On sélectionne des fiches existantes ; on ne raccourcit aucune fiche et on n'invente aucun protocole. Le contexte transmis peut augmenter |
| Variantes avec les clés existantes `half` / `olympic` mal normalisées | Normalisation stable des 13 `WorkoutGoal` canoniques | Aucune nouvelle catégorie ; une variante d'un autre objectif reste incompatible |
| Contrôle catalogue demandant encore le vélo remplacé par un brick obligatoire | Projeter les minima d'entraînement selon la convention existante, indépendamment de la réservation des compétitions officielles | Le quota final n'est pas modifié ; tests client et deux fonctions serveur conservent les disciplines restantes et l'immuabilité des entrées |
| Mesure de dose ignorant les variantes ou comptant une plage incapable de couvrir le créneau | Employer seulement les variantes numériques exécutables du bon objectif ; signaler séparément les créneaux sans plage compatible | Pas de conversion de prose en nombres, pas de réduction du floor pour rendre la fiche acceptable. Ce calcul fournit une borne de dose catalogue, pas une prescription |
| Semaine de course CAP composée seulement d'activations 20–30 min, sans le dimanche déclaré | Réserver le créneau au jour exact depuis les objectifs structurés, dans la fréquence déjà calculée, sans plafond d'activation | Aucun événement inventé et aucune séance créée. Date indisponible ou quota incompatible : blocage explicite. Le modèle doit encore produire l'événement canonique custom sans fiche ; LCW n'est jamais inféré comme un événement d'un jour |

Les corrections de la première partie de #418 restent conservées : IDs mixtes, référence inconnue non déguisée en custom, titre/protocole complets et bornes explicites, intentions accessoires, rotation souple, filtre Sprint/Olympic, capacités/jours interdits, totaux d'affûtage et arrêt avant modèle pour un contrat impossible.

## Règles réellement utilisées

- Plafond d'assimilation : `floor(load.totalSessions.max × 0.7)`, inchangé. Si les minima le dépassent, allocation cardio existante sous `plafond − renforcement.minimum`, sans nouvelle modulation `×0.7`. L'allocation n'est acceptée que si les floors essentiels peuvent tenir et si aucun maximum par sport n'augmente. Les protections spécifiques S2R et LCW demeurent.
- SL : `floor_recovery_existant × facteur_de_rampe_existant`, avec l'arrondi existant. Il ne s'agit pas d'une charge observée : niveau coach et statut inconnu restent distincts d'une mesure. Les tests de progression et de récupération restent bloquants.
- Placement : aucune augmentation d'heures, de plafond quotidien ou de fréquence pour absorber un calendrier impossible. Un jour brick ne reçoit pas un run ou un vélo autonome ; le renforcement reste limité aux jours autorisés, sans l'empiler avec deux autres séances ni à la veille d'une SL vélo déplacée.
- Catalogue : critères sportifs inchangés. Une meilleure couverture signifie sélectionner les candidats déjà admissibles, pas changer leur contenu. Les diagnostics de diversité et de manque par sport ne sont pas des preuves qu'une prescription existe ; custom et répétitions restent à contrôler séparément.
- Intensités, confiance physiologique, limiteurs et ordre de priorité : règles TFCL existantes, non remplacées. Les compétitions officielles ne deviennent pas des simulations. Les vrais refus de durée, intensité, intention et phase restent testés.

## Couverture et preuves de plans complets

Noyau : 13 clés `ObjectifType` × 4 niveaux manuels × 5 ambitions demandées × 2 états de charge = 520 configurations, plus 80 LCW IM/703. Les cinq archétypes et quatre profils de contraintes existants, trois durées et jalon présent/absent couvrent les paires du noyau ; pas toutes les combinaisons conjointes. Ambition demandée et ambition effective plafonnée sont séparées. `auto` n'est pas un cinquième niveau manuel. Les qualités de données réutilisées restent corrélées aux archétypes ; aucun nouveau profil clinique n'est inventé.

- Une vraie sortie modèle 5 km de 12 semaines archivée : adaptateur, post-traitement courant, validation, édition, sauvegarde JSON simulée, rechargement, Markdown et HTML PDF. Elle demeure rejetée pour son défaut historique. Son classement historique des limiteurs et sa confiance sont absents : leur traduction ne peut pas être réinventée à partir du diagnostic actuel.
- Trois plans de 12 semaines du vrai générateur statique S2R, doses full/light/none. Les alertes du validateur générique sont conservées et contextualisées : elles ne sont pas une expertise du protocole S2R.
- Sept contrôles complets déjà écrits : 703, IM, marathon avec semi, 10 km, 5 km, récupération trop intense et absence de natation. Ce sont des **contrôles synthétiques existants**, pas de nouvelles sorties Gemini. Leur conservation, édition, diagnostic et export sont rejoués ; aucun n'est modifié pour obtenir un score vert.
- Sept contrôles négatifs supplémentaires : la même archive complète 5 km ne peut certifier Sprint/Olympic/703/IM ; le manque de D+ reste visible pour trail court/montagne/ultra. Cela teste un refus déterministe, pas la construction d'un plan adapté à ces objectifs.
- Les tests contrôlés de limiteurs gardent l'ordre des seuls facteurs réellement identifiés, distinguent niveau manuel et charge inconnue, et montrent l'effet du changement de priorité sur le classement catalogue à cas constant. Ils ne prouvent pas que les séances d'une réponse modèle manquante suivraient ces priorités.

Le transport mémoire de `useCloudData` exerce également sauvegarde/rechargement des plans, tests et profils, ainsi qu'un échec préservant la version précédente. Aucun accès à la base réelle. Le PDF est contrôlé au niveau HTML et E2E ; impression native Safari/ordinateur et revue du document final restent une recette humaine.

## Résultats et verdicts

**600 préparations, dont 227 cas avec quotas déterministes sans signal mécanique/catalogue/dose.** Les 200 cas S2R/trail empruntent une voie différente et ne sont pas ajoutés à ce nombre de GO techniques. Chaque combinaison exacte est dans le CSV.

| Mesure sur les mêmes 600 entrées | Avant (507a06c0) | Après |
|---|---:|---:|
| Contradictions minima / plafond, occurrences hebdomadaires | 160 | 0 |
| Configurations mécaniquement bloquées | 162 | 58 |
| Insuffisances catalogue par capacité hebdomadaire | 111 (ancien compteur de fiches distinctes) | 0 ; 11 avertissements de diversité conservés |

Les 58 refus d'agenda restants sont tous associés à une condition nécessaire de capacité non satisfaite (total minimal, exclusion brick/run/bike, capacité renfo et/ou jours disponibles). Aucun échec de recherche inexpliqué n'est observé sur ce corpus. Ne pas extrapoler cette conclusion à tout texte libre ou calendrier possible.

La borne de dose corrigée produit 64 signaux hebdomadaires et le contrôle de plages 310 créneaux non couverts par le catalogue sélectionné. Ce sont des mesures distinctes, parfois superposées : pas autant de bugs ni de violations sportives. Une prescription custom autorisée n'est pas évaluée par cette borne catalogue.

**213 tests offline ciblés verts**, couvrant préparation, 11 plans/contrôles existants et contrôles négatifs de transfert d'objectif. Suites serveur : 347 tests production et 343 fonction test ; TypeScript app vérifié. Résultats CI du HEAD final dans #418.

La matrice finale par **objectif, format et chacune des cinq ambitions** se trouve dans [GO_NO_GO_BY_AMBITION.md](global-p0-evidence/GO_NO_GO_BY_AMBITION.md). **GO technique seulement pour les configurations identifiées ; pas de GO scientifique ni d'approbation automatique de prescription.** Construction adaptée non attestée là où aucune sortie réelle correspondante n'existe. Le détail des erreurs conservées du corpus est dans `replay.json`.

Contexte catalogue maximal mesuré : 250933 caractères, pas un comptage de tokens ni une estimation attestée de coût/latence Gemini. Aucun appel n'a été effectué pour le mesurer.



Les fichiers `global-p0-evidence/matrix.csv`, `matrix.jsonl`, `summary.json` et `replay.json` donnent les cas et les semaines exacts. Les codes de quota et de précontrôle peuvent décrire le même incident : ils ne sont jamais additionnés comme un nombre de défauts sportifs distincts. Une préparation sans signal est une preuve de contrat offline, pas un plan généré.

## Seuls blocages nécessitant une décision ou une preuve humaine

1. **Agenda incompatible avec la demande** : fréquence, repos, jours interdits, date de course et charge ne peuvent être arbitrés en ajoutant des séances ou en relevant les plafonds. Le coach choisit la contrainte à revoir, l'ambition ou l'objectif. Les cas concernés restent NO-GO individuellement ; cela ne bloque pas toutes les configurations de la famille.
2. **Absence réelle de fiche pour un rôle / dose** : certaines activations/SL et plages de bricks. Les 11 anciennes alertes de cardinalité sont des avertissements de diversité, pas des pools vides ; la possibilité de répétition ne démontre pas l’adéquation de dose ou de rôle. Ne pas rendre une fiche intense compatible par ses métadonnées. Le choix est une variante réellement autorisée, un protocole custom explicitement revu, ou une modification des contraintes par le coach. Les bornes catalogue ne suffisent pas à prouver l'impossibilité de tout custom autorisé.
3. **Sorties complètes adaptées manquantes** : pas de JSON complet actuel correspondant à chaque famille/ambition. Les PDF athlètes historiques cités dans la conversation ne sont pas présents dans ce workspace ; les PDF de recette disponibles sont des documents synthétiques et ne sont pas comptés comme plans athlètes. Pour augmenter la preuve de construction et de traduction des limiteurs, fournir des exports assainis existants avec diagnostic ordonné, confiance, contraintes, calendrier et plan final. Aucune nouvelle génération n'est lancée.
4. **Revue des premières prescriptions** : charge réellement supportable quand elle est inconnue, contenu physiologique, enchaînement des séances et récupération autour des jalons doivent être revus par le coach. Aucun test de préparation ou marqueur `isKeySession` ne remplace cette revue.

Un éventuel échec de recherche bornée de placement reste un résultat technique à diagnostiquer, pas une justification de relâcher les règles sportives ni une preuve scientifique d'impossibilité. Les voies trail et les étapes LCW ne reçoivent pas les règles du 10 km ; leur absence de sorties adaptées interdit une attestation générale.

## Reproduction

```sh
node scripts/quality/validate-planning-offline.mjs /tmp/tfcl-p418-offline
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
node_modules/.bin/vitest run
# Imports Deno mis en cache préalablement ; aucune permission réseau pour les tests
# deno test --cached-only --allow-read --allow-env supabase/functions/ai-training-plan
# deno test --cached-only --allow-read --allow-env supabase/functions/ai-training-plan-test
```

Les quatre jobs CI et la reproductibilité du HEAD exact sont liés dans la description de #418. Les artefacts sont des builds offline, jamais des attestations de déploiement. PR conservée en brouillon, sans fusion.
