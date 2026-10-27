# Baseline V1 vérifiée pour DET-ENGINE V2

Référence immuable : `f933ced243d15bd759a0704b88aa140ac9b4f4d9`, moteur
`b6b3fcbc4d1166da28a6c38b570754594b38fd5ccba537eb89f7e68d9ad19947`.
Entrée : `docs/det-engine/evidence-final/matrix.json.gz`. Le fichier original et
ses résultats restent intacts. Le diagnostic V2 est une lecture indépendante ;
il ne modifie ni les séances ni les seuils ni les sévérités.

Vérification des chiffres : 600 identifiants distincts, 167 plans assemblés,
7 sans blocage enregistré, 160 assemblés non conformes, 433 refus. Un refus ne
vaut pas une impossibilité sportive : 200 routes/adaptateurs non couverts,
29 recherches épuisées, 58 prévalidations bloquantes, 92 domaines vides,
38 bornes de dose incompatibles avec le plafond et 16 affectations absentes
dans le pool/placement retenus. **Aucune impossibilité globale attestée.**

## Contrôles effectivement appelés par V1

| Contrôle | Invocation établie | Limite de l'attestation |
|---|---|---|
| `prepareGenerationContracts` + `assessPreparedGeneration` | 560 cas hors route statique | Contrats de calendrier, quotas, layout, catalogue et dose ; ne construit pas un plan |
| `evaluateRepairSportingEquivalence` + `checkSessionCatalogue` | Candidats examinés par la recherche | Phase, objectif, durée, métadonnées et prérequis ; nombre d'appels exact non enregistré |
| `validateWeeklyQuotas` | 167 plans assemblés | Quotas et planchers, layout, charge coach ; non appelé sur les refus |
| `validatePlan` | 167 plans assemblés | Règles conditionnelles aux données : pas de journal individuel passé/non applicable/non exécuté |
| B13 | 167 plans assemblés | Doublons intra-semaine et cumul de séances à jeun |
| B14 | 167 plans assemblés | Cohérence phase/fiche conditionnelle à la phase et à la fiche connues |
| B15 | 167 plans assemblés | Contrôle ambition/physiologie conditionnel ; standards chronométriques route et données nécessaires |
| `validateSessionCataloguePlan` | 167 plans assemblés | Prescription de fiche finale ; compétition sans durée estimée reste explicitement non attestée |
| `validateCoachLoadIssues` | 167 plans assemblés | Plafonds de charge et avertissement charge initiale ; une charge sous plafond n'atteste pas sa tolérance |

`validatePlan` agrège notamment intensité/polarisation, densité de jours durs,
accumulation débutant, intensité de récupération, charge/décharge, séances clés,
progression et stagnation des piliers, sorties longues et taper, transition de
jalon, cohérence de charge, ratios de sport et catalogue, prohibitions, phases,
course/calendrier, limiteurs, Wbal, densité et renforcement demandés, catégories
Lorang, contraintes sportives, risques de blessure, format de titre/récap/repos,
antirépétition, force StartToRun, back-to-back et D+ trail, planchers de fréquence,
signatures LCW et placement des rituels de course. L'appel de l'agrégateur ne
prouve pas que chaque règle interne était applicable.

V1 transmet `undefined` pour les clés structurées de limiteurs, l'ordre manuel
du coach, l'audit d'ambition et l'historique détaillé de charge. L'ambition
effective est calculée en amont et utilisée par le moteur, mais n'est pas
exportée dans les lignes de matrice ; les profils physiologiques et leurs
incertitudes n'y sont pas entièrement exposés. Le contrôle des limiteurs sur
libellés ne certifie donc pas la fidélité complète du diagnostic.

## Hypothèses prioritaires falsifiables

- Les 294 erreurs de rituels de course mal placés peuvent venir de fiches jour J
  admissibles dans un domaine générique : tester un filtre de sélection qui
  réutilise la règle de placement existante, sans masquer l'erreur finale.
- Les 405 erreurs de polarisation et 353 catégories Lorang peuvent venir du
  choix de la première affectation faisable sans coût physiologique global :
  comparer une sélection guidée par les contrôles existants, à dose inchangée.
- Les 3 771 avertissements d'auto-déclaration clé peuvent venir de l'annotation du
  créneau recopiée sans vérifier le rôle de la fiche : modifier le choix de
  séance plutôt que supprimer son avertissement pour faire monter un score.
- Les 40 erreurs course et 40 signatures LCW manquantes révèlent une construction
  d'événements/signatures incomplète ; un LCW assemblé n'est pas validé pour cela.
- L'absence de quota dédié trail est un manque de couverture, non un échec de
  prescription trail démontré. Les règles route ne doivent pas être transposées.

Ces fréquences sont des symptômes mesurés. Les causes ci-dessus sont des
hypothèses dépendant du catalogue, du placement, des prérequis et des doses ;
elles doivent être confirmées par les cycles ciblés.

## Sécurité et méthodologie

Les sévérités des validateurs sont conservées. Le tableau de bord sépare les
codes structuraux explicitement énumérés des autres contrôles ; il n'introduit
pas un nouveau schéma de validation complet. Les préférences de polarisation,
catégories ou diversité restent la méthodologie existante, sans être présentées
comme une vérité physiologique universelle. La validation générale des plans et
des incertitudes exige encore une revue experte.

`node scripts/det-engine/v2-diagnostic.mjs INPUT.json[.gz] OUT [VERSION]`
produit le diagnostic et le tableau de bord sans réseau. Reprise idempotente :
les mêmes lignes donnent le même JSON, aucune horloge ni compteur cumulatif.
Les tests du diagnostic vérifient les chiffres à partir de l'artefact, pas du
texte de la PR.
