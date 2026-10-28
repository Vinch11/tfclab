"""Render a coach-facing dossier from accepted offline evidence, without generating sessions."""
import json,gzip,pathlib,csv,collections,hashlib,re
D=pathlib.Path('docs/det-engine/v16');F=D/'evidence/final';I=D/'evidence/integration-final';V=D/'evidence/validate-3';P=D/'evidence/proof-1'
def load(p):return json.loads(pathlib.Path(p).read_text())
def write(name,text):
 # Format only prose: protect links, identifiers, source fingerprints and scientific tokens.
 pieces=re.split(r'(`[^`]*`|\[[^\]]*\]\([^)]*\)|https?://\S+|\b[a-f0-9]{16,}\b|\b[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+\b|\b(?:VO2max|VO2|VLamax|Wbal|L175|L417|M21|V\d+(?:[–/-]V?\d+)*)\b)',text)
 for i in range(0,len(pieces),2):
  pieces[i]=re.sub(r'([a-zàâéèêëïîôöùûüç])(?=\d)',r'\1 ',pieces[i])
  pieces[i]=re.sub(r'(?<=\d)(?=[a-zàâéèêëïîôöùûüç])',' ',pieces[i])
 formatted=''.join(pieces).replace('PR420','PR #420').replace('Node2Go','Node 2 Go').replace('20:26UTC','20:26 UTC').replace('Draft 202012Validator','Draft202012Validator')
 (D/name).write_text(formatted.rstrip()+'\n')
def table(headers,rows):return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(str(v).replace('|',' / ').replace('\n',' ')for v in r)+' |'for r in rows)+'\n'
m=load(F/'manifest.json');dash=load(F/'dashboard.json');study=load(I/'integration-study.json');cards=[json.loads(l)for l in gzip.open(F/'canonical.jsonl.gz','rt')];renders={x['id']:x['text']for x in (json.loads(l)for l in gzip.open(F/'coach-renders.jsonl.gz','rt'))};temporal=study['temporalAudit'];protected=load(D/'baseline-files.json');state=load(D/'state.json');counts=collections.Counter(d['field']for c in cards for d in c['provenance']['enrichmentChanges']);sportrows=[(sport,v['total'],v['anomalies'].get('PHYSIOLOGY_UNDOCUMENTED',0),v['anomalies'].get('DOMAIN_UNRESOLVED',0),sum(c['prescription']['restrictions']['prerequisites']is not None for c in cards if c['prescription']['discipline']==sport))for sport,v in dash['audit']['bySport'].items()]
write('README.md',f'''# DET-ENGINE V16 — bibliothèque canonique parallèle

**PR #420 : DRAFT / NO-GO.** Baseline V15 `e9fd91a6e9d4eb3cf2c59d708818e5901ae69d07`. Aucune promotion en production.

Les **{len(cards)} fiches / {m['uniqueLegacyIds']} IDs uniques** de la bibliothèque opérationnelle sont représentés dans le format V2, avec contenu avant/après enrichissement, empreintes et inconnues. Cela ne constitue ni une validation scientifique ni {len(cards)} recettes exécutables certifiées.

- [Inventaire et manifeste](INVENTORY.md).
- [Schéma V2 et conversion](CANONICAL_V2.md), [JSON Schema](CANONICAL_SCHEMA_V2.json).
- [Tableau de bord](CONVERSION_DASHBOARD.md), [anomalies et couverture](ANOMALY_REPORT.md).
- [Rendus coach comparés](COACH_RENDER_COMPARISON.md).
- [Contrat Nolio simulé](NOLIO_COMPATIBILITY.md).
- [Chaîne physiologique et sensibilités](PHYSIOLOGICAL_LINEAGE.md), [sélection comparée](SELECTION_PARITY.md).
- [Promotion et retour arrière](MIGRATION_PROMOTION.md), [tests](VALIDATION.md).
- [Résultats V16](V16_RESULTS.md), [registre de reprise](REPRISE.md), [journal](JOURNAL.md).

Les calendriers/profils et conditions V14–V15 sont préservés ; aucun nouveau plan complet, aucune condition levée, aucune revue coach prétendue. Les payloads Nolio sont des objets locaux fictifs, jamais transmis.
''')
write('INVENTORY.md',f'''# Inventaire exhaustif, périmètre et provenance

Entrée réelle : `src/lib/workoutLibrary.ts`, incluant les tableaux construits programmatiquement, les templates et toutes les extensions poussées dans l'agrégateur. Résultat vérifié contre le module opérationnel réel : **920 occurrences, 920 IDs uniques**, 22 groupes, aucune collision d'ID ni doublon exact de contenu hors ID détecté. Les {sum(len(c['prescription']['variants'])for c in cards)} entrées de variantes sont des textes attachés aux fiches, pas des séances uniques supplémentaires.

{table(['Source','Export / groupe','Fiches'],[(g['file'],g['export'],g['count'])for g in m['groups']])}

Le manifeste [manifest.json](evidence/final/manifest.json) donne pour chaque occurrence : ID, fichier/export/index, SHA-256 du fichier, empreintes des contenus avant/après enrichissement, sport, plage de durée, phases, objectifs, variantes, champs, W′bal et prérequis. [MANIFEST.csv](MANIFEST.csv) permet une lecture tabulaire des 920 lignes.

L'extracteur évalue uniquement les modules TypeScript locaux nécessaires, sans binding réseau ni processus, et capture avant le premier enrichissement. La liste de dépendances contient {len(m['dependencies'])} fichiers avec empreinte. Aucun code source n'est modifié. [source-bundle.json.gz](evidence/source-bundle.json.gz) archive également le texte intégral des31 fichiers sources/runtime/types/doctrine, commentaires scientifiques compris. Les références d'un commentaire de module ne sont pas attribuées automatiquement à chacune de ses fiches. Les définitions candidates trouvées dans `libraryDurationIndex.ts` et `workoutCatalogBuilder.ts` sont des index/listes de travail consommateurs, pas deux bibliothèques omises. Les mappings Wahoo/Zwift et plans Excel sont des sources externes/consommatrices distinctes du catalogue de fiches ; les fiches dérivées incluses sont comptées via `TemplateDerivedWorkouts`.

Les enrichissements existants changent {counts['goals']} champs goals, {counts['phase']} champs phase, {counts['prerequisites']} prérequis et {counts['physiology']} métadonnées physiologiques. Le canonique conserve les deux états et chaque différence ; il ne transforme pas les inférences historiques de phase/objectif en preuves scientifiques.

{table(['Discipline normalisée','Fiches','Sans métadonnée physio explicite','Sans domaine métabolique explicite','Prérequis structurés'],sportrows)}

La catégorie source `course` peut contenir du trail ; les objectifs, tags et consignes terrain sont conservés. `mixed` ne signifie pas nécessairement brick : on y trouve aussi repos, mobilité, respiration, nutrition et LCW. Aucun sport n'est réattribué sur une simple intuition textuelle.
''')
write('CANONICAL_V2.md','''# Schéma canonique V2

Version `tfcl-canonical-v2.0.0`, convertisseur `det-v16-converter-1`. Le contrat exécutable Zod et son JSON Schema dérivé sont versionnés. Le convertisseur est une transformation pure ; les 920 reconversions et deux processus indépendants doivent donner les mêmes sorties.

| Bloc | Contenu et statut |
| --- | --- |
| Identité/provenance | ID historique intact, clé d'occurrence, fichier/export/index, SHA-256 source et contenus, différences d'enrichissement |
| Original | Objets complets avant/après pipeline, aucun champ opaque supprimé |
| Prescription | Discipline normalisée réversible, objectif, variantes, phases, durées déclarées et éventuelles durées par phase |
| Physiologie/intensité | Métadonnée source quand présente ; domaine seulement si explicitement déclaré dans la doctrine, aucun domaine inféré du titre ou de Z4 |
| Structure | Toutes les parties et consignes originales, zones, quantités/reps lexicales avec positions ; chronologie exécutable seulement pour grammaire entièrement reconnue |
| Intervalles | W′bal original intégral ; ce sous-ensemble ne prouve pas à lui seul la durée totale de la séance |
| Individualisation | Plages catalogue et références requises, sans capacité/tolérance imputée ; affichage intensité selon doctrine si repères et provenance fournis |
| Restrictions | When/avoid, nécessité, tags et prérequis explicites ; restrictions textuelles toujours visibles |
| Musculaire/terrain | Consignes de force/excentrique/terrain, D+ structuré lorsqu'existant, D− non structuré inconnu, récupération/tolérance individuelles inconnues |
| Science/réévaluation | Mentions bibliographiques source non vérifiées, progression et suivi sources, adaptation future jamais acquise |
| Conversion | Inconnues/anomalies, couverture technique, statut scientifique, absence explicite de promotion automatique |

Les comptes de répétitions ou nombres capturés dans un texte sont des **tokens**, pas une recette exécutable complète : unité du bloc, variantes, repos final, transitions et consignes périphériques peuvent rester inconnus. Le parseur ne prend jamais le premier nombre comme durée totale. Les durées manquantes/invalides deviennent `null` avec anomalie, jamais 0 ou une moyenne ; l'original reste entier.

Les états `represented_losslessly`, `requires_interpretation`, `not_validated_by_conversion` et `automaticPrescription:false` sont indépendants. Le schéma n'efface ni ne satisfait les trois états de capacité V14. Un hash/source ou un champ canonique altéré est refusé par les adaptateurs ; un changement légitime demande une nouvelle conversion/version de preuve.

L'alias technique `cyclisme→bike`, `course→run`, `natation→swim`, `renforcement→strength` est réversible via l'original. Aucune récupération, intensité, durée optimale ou référence scientifique n'est créée. Les bornes et principes viennent uniquement de `src/lib/zones/tfclDoctrine.ts`; la conversion d'un repère personnel en plage d'affichage reste une convention TFCL, pas une attestation de dose optimale.
''')
write('CONVERSION_DASHBOARD.md',f'''# Tableau de bord de conversion

{table(['Indicateur','Résultat','Portée'],[
('Fiches / IDs uniques',f"{len(cards)} / {m['uniqueLegacyIds']}",'Agrégateur opérationnel entier'),('Schéma V2',dash['coverage']['schemaPass'],'Conformité de représentation'),('Reconversions identiques',dash['coverage']['reconvertedIdentically'],'Idempotence de transformation'),('Rendus coach sans perte contrôlée',dash['coverage']['losslessCoachRenders'],'Consignes et champs de prescription ; mapping interne gardé dans la source'),('Comparaisons de sélection',study['selectionParity']['cases'],'Même sélection historique/canonique, pas des plans'),('Comparaisons de filtres',study['filterParity']['comparisons'],'920 fiches, niveaux et contextes'),('Fiches W′bal',sum(c['prescription']['intervalEvidence']is not None for c in cards),'Sous-structures sources préservées'),('D+ structuré',sum(c['prescription']['terrain']['dPlusM']is not None for c in cards),'Aucune tolérance individuelle déduite'),('Mentions bibliographiques repérées',sum(bool(c['prescription']['references'])for c in cards),'Mentions non vérifiées, pas références validées'),('Timing V14 déclaré couvert',temporal['targetedTimingComplete'],'Couverture du parseur existant, pas capacité individuelle'),('Recettes strictement compilées V16',dash['audit']['literalTimedPartRecords'],'Grammaire volontairement étroite ; pas preuve que les autres sont invalides'),('Contrats texte Nolio v1 simulés',dash['nolio']['localV1TextFixturePass'],'Mode texte explicite, sans structure machine ni approbation sportive'),('Contrats structurés source certifiés V16',dash['nolio']['localV1StructuredFixturePass'],'Aucune recette source entière compilée'),('Promotions automatiques',0,'Ancien catalogue seul opérationnel'),('Revue scientifique approfondie des 920',0,'Registre préparé, tâche restante'),('Appels/écritures Nolio réels',0,'Fixtures et mocks locaux seulement'),('Nouveaux plans complets',0,'V14/V15 inchangés')])}

{table(['Sport source normalisé','Fiches'],[(s,v['total'])for s,v in dash['audit']['bySport'].items()])}

Les compteurs d'anomalies sont des occurrences de contrôle et ne s'additionnent pas en nombre de séances incorrectes. Les inconnues sont séparées des conflits démontrés. La conversion intégrale est prouvée ; l'exécutabilité et la pertinence scientifique intégrales ne le sont pas.
''')
write('ANOMALY_REPORT.md',f'''# Anomalies, inconnues et couverture

Le registre global se trouve dans [conversion-reports.jsonl](evidence/final/conversion-reports.jsonl) et [ANOMALIES.csv](ANOMALIES.csv). [quality-register.jsonl.gz](evidence/quality-register.jsonl.gz) joint les920 fiches canoniques aux audits temporels V13/V14, avec ID et empreintes ; [quality-dashboard.json](evidence/quality-dashboard.json) sépare le conflit temporel prouvé de la couverture inconnue. Il comprend toutes les fiches, les IDs et les empreintes. Les données détaillées de l'audit temporel préexistant sont dans `integration-study.json`, section temporalAudit.

{table(['Contrôle V16','Occurrences','Signification'],[(k,v,{'RECIPE_NOT_FULLY_EXECUTABLE':'Couverture du parseur strict insuffisante, pas invalidité sportive démontrée','PHYSIOLOGY_UNDOCUMENTED':'Métadonnée explicite absente, ne pas inventer une adaptation','DOMAIN_UNRESOLVED':'Domaine explicite absent ; tâches non métaboliques incluses','PHASE_ENRICHMENT_DIVERGENCE':'Deux états source/opérationnel conservés, revue de portée','BRICK_COMPONENTS_UNRESOLVED':'Brick explicite ; doses/transitions non certifiées par le convertisseur','MIXED_SPORT_SEMANTICS_UNRESOLVED':'Sport mixed ambigu, ne pas le transformer automatiquement en brick','TRAIL_EXPOSURE_INCOMPLETE':'Exposition spécifique potentielle, tolérance individuelle inconnue','NONCANONICAL_ZONE_LABEL':'Libellé composite/non métabolique à interpréter, pas automatiquement une intensité invalide'}.get(k,'Voir diagnostic par fiche'))for k,v in dash['audit']['anomalyCounts'].items()])}

Les sévérités `blocking_automatic_execution`, `technical_blocker`, `review_required` concernent la nouvelle couche. Elles ne remplacent aucune sévérité historique ni aucune condition V14. La bibliothèque historique reste utilisable dans son périmètre antérieur.

## Audit temporel réutilisé sans modification

{table(['Statut V13','Fiches'],temporal['counts'].items())}

V14 fournit {temporal['targetedTimingComplete']} bornes de contenu déclaré couvertes, sans prouver l'exécution réelle. Les catégories ne sont pas des avis scientifiques. Les plages partiellement incompatibles et temps non attribués demandent une revue du protocole ; aucun texte ou minimum sportif n'est automatiquement changé.

**Témoin bloquant : `C_BRICK_TRANSITION_DRILL`.** Plage annoncée 30–45 min ; échauffement vélo15 +5×(vélo3+course3) +retour course10 =55 min actives, soit vélo30 et course25. Temps de transition inconnu. Ni 45 min complètes, ni 55 min de vélo autonome. La fiche reste consultable mais la dose contradictoire est refusée par le contrat temporel existant. V13 conserve déjà une proposition séparée d'overlay ; V16 ne la promeut pas.

Aucune collision d'ID ou copie de contenu exactement identique hors ID détectée. L'équivalence physiologique des variantes proches n'a pas été auditée automatiquement. Les libellés Force/Gainage/Mental/Respiratoire ne sont pas convertis en haute intensité. Un objectif trail compatible ne signifie pas qu'une nage nécessite une tolérance excentrique : les signalements terrain ciblent les consignes/sports concernés.

## Ordre de revue proposé

1. Protocoles avec conflit arithmétique ou prérequis de sécurité explicite.
2. Sources réellement retenues dans les calendriers V14–V15 : nages complètes, posture aéro, circuit musculaire et durées réelles.
3. Bricks et expositions trail spécifiques : composantes, D−, terrain et tolérance individuelle.
4. Familles de doses répétées : préciser les repos/transitions et paramètres sans perdre les consignes.
5. Attribution bibliographique et cohérence des adaptations ; validation coach par famille.

Ce classement prépare des travaux ultérieurs ; aucune des 920 conversions n'est déclarée scientifiquement relue par ce classement.
''')
write('NOLIO_COMPATIBILITY.md',f'''# Compatibilité Nolio — audit et contrats locaux

**Zéro requête Nolio, zéro écriture, zéro synchronisation activée.** L'adaptateur n'est pas un client HTTP. Toute utilisation hors fixture synthétique est refusée.

## Contrat réellement utilisé dans le dépôt

`supabase/functions/nolio-send-plan/index.ts` construit six champs de base : `id_partner:number`, `athlete_id:number`, `sport_id:number`, `name`, `date_start:YYYY-MM-DD`, `description`. La durée optionnelle est en secondes. Le workout structuré actuel contient des steps de durée et des répétitions ; les normalisations de cibles sont propres au sender. [Le témoin AST](evidence/nolio-source-contract.json) conserve source, SHA, champs et types. Le contrat local testé est un sous-ensemble de ce code ; aucune réponse du serveur distant n'a été obtenue en V16.

La production actuelle supprime puis recrée une séance ; elle peut ajouter des pauses en natation et normaliser les cibles. V16 n'appelle pas ce sender, ne réutilise pas ses transformations comme preuve de fidélité, ne déclenche pas ces effets et ne lit pas les structures générées/overrides en base.

## Canonique → lecture → payload fictif

- **{dash['nolio']['localV1TextFixturePass']} fiches mono-discipline** : mode texte explicitement choisi et accepté par le contrat local. Description intégrale de prescription, ID historique, date, discipline et durée de réservation fournis explicitement. La durée minimale annoncée utilisée dans ces fixtures est une entrée de test de sérialisation, pas une dose déclarée réalisable ou admissible. L'ID destinataire1 est fictif ; aucun destinataire réel n'est consulté.
- **87 fiches brick/mixed** : refus de représentation via une discipline unique. Certaines mixed sont repos/mobilité/nutrition, pas des bricks ; aucune durée ou sport artificiel n'est ajouté pour les exporter.
- **0 recette source exportée en workout structuré certifié V16** : grammaire complète non établie, références individualisées ou modalités de répétitions/repos insuffisantes. Une demande structured échoue avec raisons explicites, jamais avec remplacement silencieux par du texte.
- Les tests de syntaxe DTO comprennent une répétition explicitement décrite, uniquement comme fixture de contrat, jamais comme séance ajoutée au catalogue ou plan sportif. Les payloads compatibles sont sérialisés puis rejoués à l'identique ; les dates invalides, budgets incompatibles, versions inconnues et sports ambigus sont refusés.

Le mode texte n'est pas annoncé comme une compatibilité structurée. Les templates mono-discipline décrivant plusieurs expositions AM/PM ne sont pas certifiés comme événements distincts ou planning intrajournalier. Les répétitions/repos/consignes restent lisibles dans la description, mais aucune équivalence machine n'est revendiquée. Les notes, dangers et inconnues ne sont pas effacés pour passer le contrat.

## Travaux Nolio v2

Les six documents `docs/nolio-v2/` décrivent une proposition distincte : IDs opaques `usr_…`/`spt_…`, quantités et workout différents, absence d'id_partner documenté, révisions et périmètre initial de lecture seulement. Le JSON OpenAPI dont ils conservent le hash n'est pas présent dans cet environnement ; les documents eux-mêmes signalent que les répétitions/cibles complexes ne sont pas complètement spécifiées.

V16 **refuse la cible API v2**, ne convertit pas les IDs numériques en faux IDs v2, ne revendique aucun test de contrat officiel v2 et n'active pas la proposition de lecture ou de publication. Une future implémentation demandera le contrat machine disponible et les structures complexes clarifiées, des mappings explicites et une autorisation distincte pour toute connexion réelle. L'accord de cette mission couvre uniquement le prototype offline présenté ici.
''')
rows=study['physiologicalSensitivity']['rows'];sensitivity=[]
for r in rows:sensitivity.append((r['id'],r['effective']['value'],str(r['tteEffective']['tte_min'])+' / '+r['tteEffective']['source'],', '.join(r['limiters']or[]),sum(len(d['offers'])for d in r['domains']if d['role']['sport']=='bike'and d['role']['kind']=='long')))
write('PHYSIOLOGICAL_LINEAGE.md',f'''# Chaîne physiologique TFCLab → DET-ENGINE

L'audit statique est traçable par fichier/ligne/SHA dans [lineage-source-map.json](evidence/lineage-source-map.json). Les exécutions sur fixtures se trouvent dans `integration-study.json`, sans consultation d'athlète réel.

| Maillon | Lien réellement présent | Limite de preuve |
| --- | --- | --- |
| Tests terrain → références | La page lit tests et snapshots ; VLamax effectif reçoit les tests via un précalcul. FTP/VMA/CSS proviennent de getEffectiveRefs (snapshot/profil). | Un enregistrement de test n'alimente pas automatiquement toutes les références ; méthode/date/source doivent être vérifiées. |
| Profil → limiteurs | computeDiagnostic et limiteur unifié calculent valeurs, impacts, ordre et incertitudes. | Les valeurs des fixtures sont fictives, pas de mesures individuelles validées. |
| Limiteurs → adaptations | prepareTrainingPlanContext exécute computeDecision et transmet leviers/prohibitions/strategyContext. | Une recommandation stratégique n'est pas encore une dose optimale. |
| Adaptations → catalogue | Le builder réutilise l'ordre des limiteurs, ses patterns et garde-fous. Les 25 métadonnées explicites sont conservées ; les autres restent inconnues. | Classification par motifs héritée ≠ attribution scientifique relue. |
| Intention → dose V10/V14 | Rôles essentiels, minima sources, budget et remplissage borné par priorité. | focusSport et capacités de séance viennent du cas synthétique manuel, pas d'une formule terrain→dose validée. |
| Dose → calendrier | V14 place des réservations conditionnelles et contrôle les16 semaines. | 104 créneaux conditionnels ne deviennent pas approuvés par la conversion. |
| Réaction → réévaluation | États et simulations favorables/défavorables/inconnues V14, suivi V15 conservés. | Aucune adaptation observée réelle, aucun feedback de production branché à une prescription autonome. |

## Sensibilités réellement exécutées

Même cas IM, niveau/budget/disponibilité et plafonds individuels hérités constants ; seul le paramètre décrit change. Horloge des tests fixée au28/10/2026. Les valeurs représentent des fixtures déclarées, jamais des capacités réelles acquises.

{table(['Fixture','VLamax effective','TTE effectif / source','Limiteurs transmis','Offres vélo long'],sensitivity)}

VLamax0,2→0,9 ajoute VLamax en tête et le levier force-endurance, et change le domaine d'offres vélo long3→2. Le stimulus principal de base reste modéré : pas de dose haute intensité imposée pour créer une différence. Les plafonds identiques restent identiques, car une estimation modifiée ne prouve pas une tolérance de durée supérieure.

Le contrôle initial héritait `tteMode=synthetic_estimate` : une valeur brute45 ne devient pas une observation et le moteur calcule43 estimé. Dans les deux fixtures supplémentaires déclarées `OBSERVED` **au sein de la simulation seulement**,20 et60 sont correctement transmis : à60, TTE disparaît des limiteurs. Cela vérifie le contrat de provenance ; cela ne transforme pas une fiction en observation réelle.

L'état fresh→high modifie l'indice de fatigue dans le diagnostic. Dans ces cas, il ne change pas automatiquement les plafonds ni les offres : **la réponse dose/récupération n'est donc pas causalement démontrée de bout en bout**. Il faut conserver ce manque, pas annoncer une adaptation autonome aboutie. La suppression des données de limiteur maintient le refus `limiter_missing`.

L'affichage d'intensité canonique utilise seulement un domaine explicite et un repère avec provenance : une FTP synthétique250→300 modifie la plage en watts, sans modifier la durée. Domaine absent, seuil course absent ou borne VO₂ individuelle absente ⇒ inconnu. Aucun %VMA neuf ni optimum quantitatif n'est inventé. Une limite chiffrée propre à la source (par exemple55–72%FTP et exceptions terrain de SEILER_BIKE_Z1_LONG) bloque la personnalisation générique jusqu'à résolution spécifique : la plage plus large de la doctrine ne l'écrase pas.

## Résistance à la fatigue : trois notions séparées

| Notion | Disponibilité auditée | Ce qu'elle ne prouve pas |
| --- | --- | --- |
| Niveau qualitatif coach | trainingLevel existe et est transmis | Durabilité longue ou assimilation de la semaine |
| État de fatigue récent | fatigue_state, check-ins sommeil/fatigue/douleur/courbatures ; indice effectif | Capacité stable à résister à la fatigue |
| Résistance présumée | TTE, proxies chronos/dérive et conventions peuvent l'éclairer | Durabilité multisport/posture/excentrique démontrée |
| Assimilation observée | Réponses/récupération V11–V15 sont synthétiques ; pas de réaction réelle lue ici | Adaptation acquise du seul passage des semaines |
| Appréciation qualitative dédiée du coach | Aucun champ dédié transmis à DET-ENGINE trouvé dans les contrats audités ; coach_notes existe en texte libre | Les notes ne sont pas parsées comme preuve positive de durabilité |

Pas de nouveau questionnaire. Un futur lien de preuve devrait préciser auteur/date, discipline, contexte et durée, observation citée, incertitude et portée ; un avis présumé doit rester distinct d'une exposition effectivement assimilée. Aucun tel lien réel n'est créé en V16.

Les principes documentés L175/L417 (besoin du moment, contexte, équilibre, feedback), M21 (durabilité distincte d'un seuil frais) et les réserves scientifiques V8/V15 motivent cette séparation. Ils ne sont pas transformés en quotas ou taux universels. Aucune nouvelle attribution bibliographique individuelle n'est fabriquée.
''')
write('SELECTION_PARITY.md',f'''# Sélection historique / canonique

La vue de compatibilité restaure les objets opérationnels complets à partir du canonique, sans modifier l'export du module réel. Les tests utilisent une copie mockée uniquement dans leur processus isolé ; aucun moteur de production n'est modifié.

- Égalité intégrale avec l'extracteur :920 fiches.
- Métadonnées de réparation existantes identiques :920/920.
- Sélections exactes identiques :{study['selectionParity']['cases']}/{study['selectionParity']['cases']},12 objectifs ×4 niveaux ×4 phases ; ordres de limiteurs VLamax/TTE ou TTE/VO₂ selon le contexte, seed0, filtres de phase stricts.
- Comparaisons de filtres niveau/prérequis et objectif/phase/type :{study['filterParity']['comparisons']}, plus conservation des bornes de durée et intentions explicites.
- Un filtre de revue canonique expérimental réutilise generationEligibility, la politique de prérequis et le timing ciblé existants ; une intention absente n'est pas inventée. Offre compatible signifie à examiner, jamais automatiquement prescriptible.

Le contrôle positif est la fiche réelle A_RUN_Z2_EASY45min, contexte Marathon/base/trained, intention explicite moderate_lt1. Il refuse1min, une intention mlss incompatible, une intention manquante sur la fiche de nage non documentée et un protocole avancé chez untrained. Aucune fiche n'a été ajoutée pour faire passer ces tests.

Cette égalité prouve la non-perte des critères consommés par le builder actuel. Elle ne certifie ni tous les gardes-fous sportifs, ni la sélection scientifiquement optimale. LCW est inventorié/conservé via son module dédié ; cette matrice de sélection ne prétend pas exercer chaque contrat de format LCW ni chaque ambition. Les 600 cas historiques ne sont pas modifiés ou remplacés par ces192 cas de compatibilité.
''')
write('MIGRATION_PROMOTION.md','''# Promotion progressive et retour arrière

L'ancien catalogue reste seul opérationnel. Aucun import applicatif vers V16, aucun drapeau activé, aucune migration de base, aucun workflow ou endpoint ajouté. Le retour arrière immédiat consiste à ne pas brancher cette couche expérimentale ; les anciens plans gardent leurs IDs et leur sémantique source.

## Conditions par famille

| Niveau | Preuves nécessaires avant promotion |
| --- | --- |
| Représentation | Inventaire complet, provenance/source immuable, schéma, reconversion, lecture sans perte, version verrouillée |
| Compatibilité sélection | Comparaisons d'objectifs/niveaux/phases/intention/durée/prérequis et maintien des refus |
| Exécution technique | Toutes composantes, répétitions, repos finaux, transitions, variantes et intensités résolues ou conditions explicites ; aucune inconnue transformée en0 |
| Cohérence scientifique | Adaptation visée et portée des références relues ; conventions éditoriales/coaching séparées ; incertitudes conservées |
| Admissibilité individuelle | Références et capacités réellement documentées, récupérations et conditions applicables contrôlées |
| Préparation de plan | Validation globale des charges, disciplines, calendrier, progression et spécificité ; conditions futures non approuvées d'avance |
| Validation coach | Revue datée, version/famille et limites identifiées, aucune approbation déduite des tests |
| Export | Contrat exact et représentation fidèle, périmètre/destinataire, approbation du contenu exact ; autorisation distincte pour toute opération réelle |

Promouvoir une famille indépendamment n'autorise pas la promotion des autres. Une fiche consultable ou un payload texte bien formé ne franchit pas automatiquement les étapes suivantes. Les blocs avancés, bricks et expositions trail requièrent des preuves propres.

## Plans historiques

Les IDs ne sont ni renommés ni réassignés. `restoreHistorical` permet la compatibilité offline à version contrôlée ; le manifeste archive aussi l'empreinte du contenu original. Un ID stable ne signifie pas que son contenu futur sera identique : les futurs plans devront conserver la version/empreinte de fiche utilisée ou son instantané. V16 ne réécrit aucun plan sauvegardé.

Avant toute intégration ultérieure : lecture comparative à blanc, mapping de version explicite, refus des versions inconnues et des preuves altérées, possibilité de revenir à la source historique archivée et examen coach des écarts. Aucun déploiement, fusion, donnée réelle ou connexion Nolio n'est autorisé par ces critères.
''')
# Preserve complete source text, including module comments, without attributing module-level science to every card.
bundle_paths=sorted(set([x['path']for x in m['dependencies']]+['src/lib/zones/tfclDoctrine.ts','src/types/workoutLibrary.ts']))
bundle=[{'path':p,'sha256':hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest(),'text':pathlib.Path(p).read_text()}for p in bundle_paths]
for dep in m['dependencies']:assert next(x['sha256']for x in bundle if x['path']==dep['path'])==dep['sha256']
(D/'evidence/source-bundle.json.gz').write_bytes(gzip.compress(json.dumps({'version':'v16-source-bundle-1','files':bundle,'moduleCommentsScientificallyAttributedToIndividualCards':False},ensure_ascii=False,separators=(',',':')).encode(),mtime=0))

# Join the existing temporal audits with every canonical conversion; never rewrite the source record.
temporal_by_id={r['legacy']['id']:r for r in temporal['rows']}
assert len(temporal_by_id)==len(cards)==920
quality=[]
for c in cards:
 t=temporal_by_id[c['identity']['legacyId']]
 quality.append({'legacyId':c['identity']['legacyId'],'source':c['provenance'],'conversion':c['conversion'],'temporalAuditV13':t['legacy'],'targetedTimingV14':t['targeted'],'automaticPrescription':False,'scientificValidation':False})
(D/'evidence/quality-register.jsonl.gz').write_bytes(gzip.compress(('\n'.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))for r in quality)+'\n').encode(),mtime=0))
(D/'evidence/quality-dashboard.json').write_text(json.dumps({'records':len(quality),'conversionAnomalies':dash['audit']['anomalyCounts'],'sourceTemporalStatus':temporal['counts'],'provenFatalTemporalConflicts':len(temporal['fatalConflicts']),'fatalSourceIds':temporal['fatalConflicts'],'deepScientificValidation':False,'unknownGrammarIsNotInvalidPrescription':True},indent=2)+'\n')

# Full manifest and anomaly tables are not limited to selected examples.
with (D/'MANIFEST.csv').open('w',newline='')as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['legacy_id','source_file','source_export','source_index','source_sha256','sport','category','duration_min','duration_max','phases','goals','variant_keys','scientific_status','automatic_prescription']);
 for c in cards:
  p=c['prescription'];w.writerow([c['identity']['legacyId'],c['provenance']['file'],c['provenance']['export'],c['provenance']['index'],c['provenance']['sha256'],p['discipline'],p['category'],*(p['durationMinutes']or['unknown','unknown']),','.join(p['phases']),','.join(p['goals']),','.join(p['variants']),c['conversion']['scientificStatus'],False])
with (D/'ANOMALIES.csv').open('w',newline='')as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['legacy_id','sport','severity','control','scope','detail']);
 for c in cards:
  for a in c['conversion']['anomalies']:w.writerow([c['identity']['legacyId'],c['prescription']['discipline'],a['severity'],a['code'],a['scope'],json.dumps(a['detail'],ensure_ascii=False)])
  t=temporal_by_id[c['identity']['legacyId']]['legacy']
  if t['fatalDurationConflict'] or t['status']in ['advertised_range_partly_outside_demonstrated_recipe','unattributed_advertised_session_time']:
   w.writerow([c['identity']['legacyId'],c['prescription']['discipline'],'technical_blocker'if t['fatalDurationConflict']else'review_required','EXISTING_V13_TEMPORAL:'+t['status'],'source_duration',json.dumps({'declared':t['originalRange'],'knownTimed':t['knownTimedBlocksRange'],'fullRange':t['fullRecipeTimeRange'],'brick':t['brick']},ensure_ascii=False)])
ids=['A_RUN_Z2_EASY','A_SWIM_AEROBIC_MULTI_NAGES','C_BRICK_TRANSITION_DRILL','C_BIKE_AERO_POSITION_DRILLS','A_STR_STABILITY_CORE','REST_FULL_DAY','B_LCW_NUTRITION_RECHARGE']
for sport in dash['audit']['bySport']:
 c=next(c for c in cards if c['prescription']['discipline']==sport)
 if c['identity']['legacyId']not in ids:ids.append(c['identity']['legacyId'])
for c in cards:
 if c['prescription']['terrain']['dPlusM']is not None:
  if c['identity']['legacyId']not in ids:ids.append(c['identity']['legacyId'])
  break
examples=D/'evidence/coach-examples';examples.mkdir(exist_ok=True)
for id in ids:
 if id in renders:(examples/(id+'.md')).write_text(renders[id])
write('COACH_RENDER_COMPARISON.md',f'''# Présentation coach comparée

Les920 fiches ont un rendu texte contrôlé et conservé dans [coach-renders.jsonl.gz](evidence/final/coach-renders.jsonl.gz). Les exemples ci-dessous ne limitent pas la conversion. Les consignes originales, échauffements, corps, récupérations, retours au calme, variantes, restrictions et objectifs sont présents sans réduction. Le mapping interne defaultSportId reste dans le canonique, sans encombrer le rendu coach. Aucun hash ou statut interne ne remplace les consignes.

L'intensité personnalisée reste inconnue sans domaine explicite et repère documenté ; un test synthétique vérifie, pour B_BIKE_VO2_3MIN avec FTP250/PMA300 explicitement fictives, la plage262,5–300W du stimulus principal selon la doctrine TFCL. Il s'agit d'affichage selon la doctrine TFCL, pas de preuve de tolérance. Le HTML échappe tout texte source et ne charge aucun actif distant.

{table(['ID historique','Fiche source','Rendu coach'],[(id,'[Source](../../../'+next(c['provenance']['file']for c in cards if c['identity']['legacyId']==id)+')',f'[Ouvrir](evidence/coach-examples/{id}.md)')for id in ids if id in renders])}

Les comparaisons automatisées parcourent les champs utiles et les instructions exactes des920 sources. Une phrase scientifiquement douteuse est conservée et signalée comme à revoir, jamais supprimée pour améliorer la présentation. Ces vérifications n'attestent pas une revue ergonomique ou sportive humaine.
''')
# Results and validation documents use actual receipts, never old test numbers as new runs.
commands=load(V/'commands.json');logs={x['name']:(V/(x['name']+'.txt')).read_text()for x in commands}
write('VALIDATION.md',f'''# Validation V16 réellement exécutée

{table(['Commande / périmètre','Sortie','Erreur processus','Durée ms'],[(x['name'],x['exitCode'],x['error'],x['elapsedMs'])for x in commands])}

Le détail des nombres de fichiers/tests est dans [les logs](evidence/validate-3/commands.json). La suite Node du canonique/présentation/Nolio a passé26 tests dans validate-3, puis27 dans la validation complémentaire du garde de limites sources ([reçu](evidence/intensity-guard-validation.json)) ; le fichier d'étude contient9 tests couvrant192 sélections exactes et5520 comparaisons de filtres. Les30 tests de garde expérimentaux passent (8fichiers,3tests d'archivage conditionnels préexistants non exécutés) et les186 tests historiques ciblés passent (31fichiers). Les régressions expérimentales ciblées et historiques ciblées sont réellement rejouées par le runner V16, séparément ; aucun compte V14/V15 n'est présenté comme une nouvelle exécution. La régression historique ciblée utilise un garde réseau offline ; aucun appel réel n'est autorisé par ces tests.

La preuve [reproducibility.json](evidence/proof-1/reproducibility.json) compare deux processus indépendants pour les fichiers de migration et deux pour l'étude. Les rendus et payloads texte compatibles sont également sérialisés/rejoués dans les tests. Après le garde de limites d'intensité source, une troisième conversion contrôlée reproduit les sept artefacts à l'identique ([reçu](evidence/post-intensity-guard-verification.json)). Le processus ayant perdu son handle pendant une transition d'environnement reste conservé avec statut de sortie inconnu, sans servir de preuve d'exécution réussie. Le JSON Schema est contrôlé sur les920 représentations par Python jsonschema4.26.0, Draft202012Validator :920valides,0erreur. Voir [le reçu indépendant](evidence/json-schema-validation.json).

Les {len(protected)} fichiers suivis avant V16 sont vérifiés avant/après. Cela inclut les600 configurations, les contrats et preuves V2–V15, le catalogue, les validateurs et le moteur de production. Aucun de ces fichiers n'est corrigé par V16.

## Échecs conservés

- Les premiers essais de l'étude avaient une annotation de profil trop large puis un mauvais nom de propriété diagnostic ; les logs de types/étude initiaux et affinés sont conservés. Le champ réel effectifs a été repris sans modifier le diagnostic. Les fixtures TTE montrent aussi explicitement la différence entre un mode non observé hérité et OBSERVED simulé.
- Une tentative de suite expérimentale globale a atteint180s ; deux tests V16 y dépassaient le timeout5s de la configuration héritée. Cette tentative est rejetée/conservée. Le fichier V16 déclare désormais un timeout60s pour ses192 comparaisons et les études. Les anciennes recherches exhaustives ne sont pas relancées ; les huit fichiers de garde pertinents et les tests historiques catalogue/physiologie/zones sont listés dans les configs V16. La suite applicative entière et les600 constructions historiques ne sont pas revendiquées comme rejouées.
- Une relecture a identifié que la plage générique d'affichage pouvait dépasser les contraintes chiffrées d'une fiche. Le test de régression échouant est conservé, puis le garde refuse la personnalisation tant que ces contraintes ne sont pas résolues. Les27 tests Node passent après correction ; aucun domaine, intensité source ou validateur historique n'est modifié.
- Le premier runner a reçu exit0 **avec EPERM** du sandbox. Il a refusé cette preuve et conservé validate-1/failure.json. La relance contrôlée ne l'efface pas et n'assimile pas0 à une preuve acceptable si une erreur processus existe.

Aucun validateur historique n'est affaibli, aucun test n'est supprimé ou désactivé pour améliorer le résultat. Un succès technique ne constitue pas une validation scientifique ou une signature coach.
''')
write('V16_RESULTS.md',f'''# Résultats V16 — DRAFT / NO-GO

La totalité de la bibliothèque opérationnelle est représentée :920 fiches,920 IDs uniques,22 groupes et2425 textes de variantes conservés. Avant/après enrichissement sont distingués,920 schémas et reconversions passent, les rendus coach gardent les données de prescription. Les anciennes références et600 configurations restent intactes.

La sélection historique/canonique est identique sur192 contextes ; les5520 comparaisons de filtres et les920 métadonnées concordent. Un filtre de revue canonique réutilise les gardes existants et refuse les intentions manquantes/incompatibles, durées et prérequis impossibles. Il n'approuve aucune prescription.

Le registre de qualité couvre les920 sources. Le conflit de brick55min actives contre30–45annoncées est reproduit. La couverture temporelle stricte reste limitée ; les sources non interprétées ne sont pas artificiellement déclarées incorrectes, corrigées ou certifiées.895 fiches n'ont pas de métadonnée physiologique explicite et898 n'ont pas de domaine métabolique explicite — ces compteurs incluent des tâches non métaboliques et ne prouvent pas autant d'erreurs sportives.

Nolio :833 contrats locaux de texte explicite,0 workout source entier certifié par la nouvelle grammaire,87refus brick/mixed,0appel réel. Les templates mono-discipline qui décrivent plusieurs expositions intrajournalières restent de simples descriptions dans cesfixtures ; aucun placement AM/PM ni comptage de séances physiques n'est certifié. Les transformations et IDs v2 ne sont pas inventés ; ciblev2 refusée faute de contrat machine disponible et de clarification des structures complexes.

La chaîne terrain→profil→limiteurs→adaptations→offres est observable sur fixtures : VLamax0,2→0,9 change la priorité et certaines offres, TTE20→60 correctement marqué OBSERVED simulé modifie les limiteurs. Les plafonds restent ceux du coach synthétique ; la dose optimale, l'assimilation réelle et l'adaptation future ne sont pas démontrées. Le niveau d'entraînement et l'état de fatigue ne sont pas assimilés à une résistance durable ; aucun champ dédié transmis n'a été trouvé.

Aucun nouveau calendrier complet, aucun athlète/Nolio lu ou écrit, aucune condition V14/V15 satisfaite, aucune revue experte humaine, aucune promotion ou modification de production. Les contrats scientifiques restent candidats.

Les prochains travaux techniques peuvent utiliser le registre global pour résoudre progressivement les recettes par famille. Les décisions réellement nécessaires concernent la revue des ambiguïtés sportives, la portée des preuves individuelles et le contrat Noliov2 complet ; aucune autorisation de fusion/déploiement n'est impliquée.
''')
write('REPRISE.md',f'''# Reprise V16

Baseline V15 :e9fd91a6e9d4eb3cf2c59d708818e5901ae69d07. Branche experiment/det-engine, PR420brouillon, NO-GO. Lire README, V16_RESULTS, ANOMALY_REPORT et state.json. Préserver tous les registres et preuves ; ne pas relancer les unités closes comme s'il s'agissait de nouveaux progrès.

Dix unités au maximum, délai absolu28octobre2026à20:26UTC, Node2Go, étape180s, trois tentatives maximum par unité du runner. Le runner contrôle branche, fichiers protégés, état/lock, délai et codes/erreurs des sous-processus. Aucune permanence ni relance automatique n'est annoncée.

`v16-extract.mjs` inventorie la bibliothèque ; `v16-canonical.mjs` convertit sans perte et reconvertit à l'identique ; `v16-migrate.mjs` produit les artefacts dans un dossier neuf, refuse l'écrasement et n'appelle aucun réseau. Le modèle est versionné ; une inconnue de protocole reste opaque et visible. `v16-selection.ts` est un filtre de revue, pas un moteur de prescription approuvé.

`v16-run.mjs validate` exécute typage, contrats Node, suites de régression expérimentales/historiques ciblées offline. `proof` exécute deux migrations et deux études indépendantes. Les dossiers existants sont immuables. Après clôture/échéance, établir un nouveau registre explicitement autorisé pour poursuivre, sans réinitialiser V16.

Sorties de référence :evidence/final, evidence/replay, evidence/integration-final et integration-replay. Vérifier checksums/source-checksums et baseline-files. Les {len(protected)} fichiers antérieurs doivent rester inchangés. Les CSV manifest/anomalies couvrent les920fiches.

Limites à préserver :pas d'approbation canonique automatique ;0workout source entier certifié V16 ;87sports brick/mixed refusés par l'adaptateur v1mono-discipline ; v2non implémenté ; pas de champ qualitatif dédié de résistance transmis ; capacités/focus partiellement manuels ; récupération/assimilation réelles inconnues. Les futures conditions normales ne sont pas des erreurs et ne sont pas déclarées remplies.

Poursuite possible sans arbitrage scientifique majeur :compléter les parseurs à preuves source explicites, améliorer l'ergonomie des rendus et les contrats locaux, étendre les sensibilités sans inventer des capacités. Modifications sportives ambiguës :garder une proposition séparée et obtenir une revue qualifiée. Aucune connexion Nolio réelle ni écriture athlète, migration, fusion, production ou API payante.
''')
print(json.dumps({'documentsGenerated':14,'manifestRows':len(cards),'conversionAnomalyRows':sum(len(c['conversion']['anomalies'])for c in cards),'existingTemporalAnomalyRows':sum(t['legacy']['fatalDurationConflict']or t['legacy']['status']in ['advertised_range_partly_outside_demonstrated_recipe','unattributed_advertised_session_time']for t in temporal['rows']),'coachExamples':len(ids),'deepScientificReview':False}))
