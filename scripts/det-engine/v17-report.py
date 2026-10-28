"""Build the V17 review dossier from accepted evidence; never generate or modify workouts."""
import pathlib,json,gzip,csv,collections,datetime,time,hashlib
D=pathlib.Path('docs/det-engine/v17');state=json.loads((D/'state.json').read_text());assert state['status']=='in_progress_no_go'and time.time()<datetime.datetime.fromisoformat(state['deadline']).timestamp()
def load(p):return json.loads(pathlib.Path(p).read_text())
def lines(p):return [json.loads(l)for l in gzip.open(p,'rt')]
def put(name,text):(D/name).write_text(text.strip()+'\n')
def table(head,rows):return '| '+' | '.join(head)+' |\n| '+' | '.join('---'for _ in head)+' |\n'+'\n'.join('| '+' | '.join(str(v).replace('|',' / ').replace('\n',' ')for v in row)+' |'for row in rows)+'\n'
C=lines('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');R=lines(D/'evidence/final/recipes.jsonl.gz');S=load(D/'evidence/final/summary.json');O=lines(D/'evidence/outputs-final/outputs.jsonl.gz');OS=load(D/'evidence/outputs-final/summary.json');Q=lines(D/'evidence/qualification-final.jsonl.gz');QS=load(D/'evidence/qualification-final.jsonl.gz.summary.json');overlays=load(D/'evidence/outputs-final/overlays.json');audit=load(D/'evidence/final/independent-audit.json');commands=load(D/'evidence/validation-3/commands.json');assert all(c['exitCode']==0 and c['error']is None for c in commands);assert audit['passed']==S['counts']['complete']and not audit['failures'];assert len(C)==len(R)==len(O)==len(Q)==920
byid={c['identity']['legacyId']:c for c in C};rid={r['legacyId']:r for r in R};oid={o['id']:o for o in O};complete=[r for r in R if r['classification']=='complete'];unknowns=collections.Counter(u for r in R for u in r['unknowns']);selection=load(D/'evidence/selection-final/selection-sensitivity.json');variant=load(D/'evidence/variant-constraints-summary.json');protected=len(load(D/'baseline-files.json'))
put('README.md',f'''# DET-ENGINE V17 — compilation de recettes et qualification

**PR #420 : DRAFT / NO-GO.** Baseline V16 `42a0ca0993a479d6d2f7498287ed855fdfa0dd5a`. Aucun fichier V2–V16 modifié ; aucune nouvelle migration V16. Les contrôles purs d’intégrité/compatibilité V16 sont réutilisés, pas ses dix unités.

Les 920 fiches ont été parcourues. **{len(complete)} chronologies génériques complètes** disposent d'une représentation structurée et d'un témoin dans les bornes écrites, vérifié indépendamment. Ce résultat n'est ni {len(complete)} prescriptions individuelles approuvées, ni une compilation de toutes leurs variantes par objectif.

- [Compilateur et IR](RECIPE_COMPILER.md), [résultats exhaustifs par discipline](COMPILATION_RESULTS.md).
- [Index des 920 fiches](COMPILATION_INDEX.csv), [liste des recettes complètes](COMPILED_RECIPES.md).
- [Overlays et ambiguïtés conservées](TECHNICAL_OVERLAYS.md).
- [Matrice scientifique](SCIENTIFIC_QUALIFICATION.md), [CSV des 920 qualifications](SCIENTIFIC_MATRIX.csv).
- [Sélection et contrat optionnel coach](PHYSIOLOGICAL_SELECTION.md).
- [Coach et Nolio](COACH_AND_NOLIO.md), [tests et rejeu](VALIDATION.md).
- [Critères de promotion](PRESCRIPTION_READINESS.md), [journal](JOURNAL.md), [reprise](REPRISE.md).

Aucune séance ajoutée au catalogue pour obtenir un résultat positif. Aucune durée ou capacité physiologique inventée. Aucun appel Nolio, aucune donnée réelle, aucun déploiement, aucune migration, aucune dépense. L'ancien catalogue et les moteurs/validateurs restent opérationnels dans leur état antérieur.
''')
put('RECIPE_COMPILER.md',f'''# Compilateur de recettes

IR typée/versionnée : `tfcl-recipe-ir-1.0.0`, interfaces TypeScript et schémas Zod. L'entrée est le canonique V16 archivé, contrôlé par empreinte ; la migration V16 n'est pas relancée. Le contrôle pur d'intégrité V16 peut recalculer une représentation attendue pour comparaison, sans remplacer ni régénérer le catalogue archivé. [enriched-canonical.jsonl.gz](evidence/final/enriched-canonical.jsonl.gz) conserve chaque objet V16 entier et ajoute son IR V17.

## Grammaires et portée

| Forme | Traitement |
| --- | --- |
| Durée simple ou plage, min/s, apostrophes, heures composées | Quantité dimensionnée avec texte et offsets UTF-16 exacts ; aucune durée extraite d'un titre |
| Addition explicite de blocs | Séquence conservant chaque terme ; un terme non quantifié reste inconnu |
| Répétition parenthésée fermée | Tous les enfants écrits font partie de chaque cycle ; répétitions variables bornées |
| `r=` ou `R:` après un intervalle | Travail et repos représentés ; occurrence du dernier repos inconnue, donc ambiguïté conservée |
| Éducatifs/mobilité avec durée écrite | Sous-bloc identifié sans lui attribuer une allure de course |
| Option explicite | Le témoin inclut le travail explicitement optionnel et le signale ; ne supprime jamais du travail essentiel |
| Échauffement/retour intégré | Cas source vérifié SEILER : inclus dans la durée principale, pas ajouté deux fois |
| Distance | Mètres distincts des secondes ; aucun temps inventé depuis CSS, niveau ou titre |
| Force/circuit | Modèle d'exercices avec occurrences de séries/répétitions/temps écrits et consignes de charge/tempo conservées ; durée réelle et charge individuelle inconnues |
| Brick/mixed | Jambes explicitement nommées, transitions séparées ; temps de transition inconnu jamais mis à zéro |
| Terrain/D+/D− | Texte et champs V16 conservés ; aucune tolérance musculaire ou dose D− imputée |
| Variantes | {variant['entries']} textes conservés, dont {variant['withLiteralQuantities']} avec quantités écrites repérées ; aucune variante complète inventée à partir de ces mentions |

Une recette complète désigne **le cœur générique décrit**, avec toutes ses parties courantes comprises et une chronologie instanciable dans les bornes sources. Les domaines individuels, variantes d'objectif et conditions de récupération ont leur contrôle séparé. Les phases, objectifs, interdictions, références et données opaques V16 restent intacts.

Le témoin technique choisit un point dans l'intersection des bornes écrites et de la durée annoncée. Il ne remplit pas un budget d'athlète et n'optimise pas une dose physiologique. Les occurrences répétées d'un même paramètre source gardent une valeur commune. Une instanciation non démontrée reste refusée, sans déclaration d'impossibilité biologique.

## Vérification indépendante

Le vérificateur Python n'importe ni le parseur ni l'évaluateur JS. Il reparcourt les spans sources, reconvertit les littéraux avec arithmétique rationnelle, vérifie les comptes, la structure de cycles, l'expansion des témoins, le partage des paramètres et les intersections de durées. Il vérifie également que chaque partie source est présente et que zones/consignes sont conservées. Les {audit['passed']} recettes complètes passent ces contrôles.

L'intensité descriptive reste verbatim. Une chronologie compilée ne fournit pas automatiquement le temps passé dans chaque domaine lors d'une montée progressive Z1→Z2. Le compilateur ne déduit aucune adaptation acquise ni récupération réelle.
''')
head=['Discipline source normalisée','Total','Complètes','Partielles','Ambiguës','Contradictoires','Non métaboliques/descriptives'];sporttable=table(head,[(sport,v['total'],v['complete'],v['partial'],v['ambiguous'],v['contradictory'],v['descriptive_non_metabolic'])for sport,v in S['bySport'].items()])
trail_ids={c['identity']['legacyId']for c in C if c['prescription']['discipline']=='trail'or 'trail'in c['original']['effective'].get('tags',[])or c['provenance']['file'].endswith(('enrichedWorkoutsTrail.ts','enrichedWorkoutsHedgehog.ts'))};trailcounts=collections.Counter(rid[id]['classification']for id in trail_ids)
put('COMPILATION_RESULTS.md',f'''# Compilation exhaustive des 920 fiches

{sporttable}

Total : **{S['counts']['complete']} complètes, {S['counts']['partial']} partielles, {S['counts']['ambiguous']} ambiguës, {S['counts']['contradictory']} contradictoires, {S['counts']['descriptive_non_metabolic']} descriptives/non métaboliques**. Une seule catégorie par fiche ; 920 IDs conservés.

La colonne run inclut des fiches trail stockées historiquement comme course. Le sous-ensemble explicitement trail par tag/fichier spécialisé/sport compte {len(trail_ids)} fiches ; répartition : {dict(trailcounts)}. C'est un filtre de provenance pour rendre la couverture visible, pas une attribution scientifique par mot-clé. Les trois fiches de sport natif trail ne sont pas masquées par les réussites de course.

La natation reste partielle ou ambiguë : distances connues et composantes conservées, mais temps d'exécution individuel et/ou récupération finale non établis. Aucun protocole n'est tronqué pour atteindre 45 minutes. Aucun des 55 bricks natifs n'est déclaré entièrement compilé avec transitions résolues. Les 127 fiches de force sont reconnues comme nécessitant un modèle technique distinct ; elles ne sont pas déclarées invalides faute d'un temps métabolique.

## Causes récurrentes

{table(['Cause/inconnue','Fiches concernées'],unknowns.most_common(14))}

Les occurrences de causes ne s'additionnent pas en nombre de fiches. Les 104 comparaisons de repos portent sur des répétitions dont les deux éléments travail/repos ont une durée connue ; elles ne règlent pas toutes les autres ambiguïtés.

## Contradictions et erreurs de portée

- `C_BRICK_TRANSITION_DRILL` : 55 min actives connues contre 30–45 annoncées ; transition inconnue. Aucun crédit artificiel de vélo long.
- `V3_RUN_10K_TEMPO_CRUISE` : 15 +4×(5+1) +10 =49 min, contre un minimum annoncé de50. Discordance technique du total, pas preuve d'un danger physiologique à49 min ; aucune minute ajoutée pour obtenir du vert.
- `B_TR_FARTLEK_TRAIL_10x1_2` : 40 min décrites et 50–75 annoncées, sans périphériques décrits. Classée ambiguë : du temps non attribué n'est pas automatiquement une contradiction physiologique.
- `V2_RUN_MENTAL_FATIGUE` : préparation cognitive30 +course60 ; portée de la durée annoncée55–70 à clarifier. Le temps cognitif n'est pas automatiquement une dose de course.

[recipes.jsonl.gz](evidence/final/recipes.jsonl.gz) et [classification-index.json](evidence/final/classification-index.json) donnent toutes les listes et témoins. Les anciennes configurations et les 600 références restent inchangées ; aucun taux de plans sportifs n'est dérivé de ces comptes de recettes.
''')
put('COMPILED_RECIPES.md',f'''# Les {len(complete)} chronologies génériques complètes

Chaque ligne a un contrôle Python indépendant positif. Les durées ci-dessous sont des témoins techniques, pas des doses automatiquement recommandées. L'objectif, l'ambition, le niveau, les variantes, la capacité et la récupération restent des conditions distinctes.

{table(['ID historique','Sport source','Bornes temporelles calculées (min)','Témoin (min)','Rendu'],[(r['legacyId'],byid[r['legacyId']]['prescription']['discipline'],str([r['elapsedSeconds']['min']/60,r['elapsedSeconds']['max']/60]),r['witness']['seconds']/60,'[Ouvrir](examples/'+r['legacyId']+'.md)')for r in complete])}

Tous les identifiants et contenus originaux sont conservés dans le canonique enrichi. Les variantes par objectif ne sont pas automatiquement approuvées par le passage du cœur générique.
''')
put('TECHNICAL_OVERLAYS.md',f'''# Overlays techniques et variantes non appliquées

Le [registre](evidence/outputs-final/overlays.json) contient {OS['technicalOverlayRecords']} interprétations techniques sourcées et {OS['unappliedRecoveryCandidates']} comparaisons de récupération **non appliquées**. Aucun texte du catalogue n'est modifié.

Les règles acceptées convertissent seulement des unités écrites, reconnaissent une durée après un nom d'activité, traitent l'accent Unicode de « Intégré » et évitent de recompter un échauffement/retour explicitement intégré. Le travail optionnel est inclus dans le témoin et reste signalé comme tel. Ni intensité, ni repos, ni répétition, ni charge musculaire ne sont changés.

## Dernier repos

Pour une répétition `n×travail r=repos`, deux contrats candidats sont exposés : repos entre les répétitions (n−1) ou après chacune (n). Le registre affiche les bornes en secondes, par répétition concernée, avec texte et empreinte source. Aucun contrat n'est choisi parce qu'il donne un meilleur taux de compilation ou rentre dans une plage catalogue. L'absence de repos entièrement décrit reste une donnée manquante.

## Portée de durée

Une préparation cognitive n'est pas comptée silencieusement comme course ; un Main incomplet n'est pas complété par un échauffement inventé. Ces questions de portée restent visibles. Les deux discordances arithmétiques identifiées demandent une correction de source proposée séparément ; aucune correction sportive n'est appliquée en V17.

Les variantes de durée réellement écrites sont indexées dans [variant-constraints.jsonl.gz](evidence/variant-constraints.jsonl.gz) : {variant['entries']} entrées, {variant['withLiteralQuantities']} avec quantités. Une mention «2h» dans une variante n'est pas une recette entière ni une autorisation de supprimer les périphériques du protocole générique.
''')
put('SCIENTIFIC_QUALIFICATION.md',f'''# Qualification scientifique : registre complet, validation non acquise

La [matrice JSON](evidence/qualification-final.jsonl.gz) et [son CSV](SCIENTIFIC_MATRIX.csv) couvrent les 920 fiches : revendication source, physiologie explicite, justification lorsqu'existante, méthode de construction, mentions bibliographiques, niveau de preuve applicable, hypothèses TFCL, preuves individuelles manquantes, restrictions, incertitudes et priorité de revue.

**0 fiche scientifiquement promue ou validée individuellement par V17.** {QS['explicitPhysiology']} métadonnées physiologiques sources sont conservées ; elles ne sont pas transformées en preuves d'efficacité de toutes les doses. Les mécanismes non évalués restent explicitement non évalués.

Aucun des liens individuels repérés dans les fiches ne correspond exactement à une URL de la bibliographie V8 vérifiée ({QS['exactIndividualVerifiedLinks']} correspondance). Les mentions auteur/année ne sont pas jointes automatiquement comme preuves. Les 12 références de contexte V8 et les commentaires des modules restent disponibles, sans attribution automatique à leurs séances.

## Trois annotations documentaires ciblées

- `D_BIKE_RECOVERY` et `D_RUN_REGEN` : Van Hooren & Peake2018, [PMID29663142](https://pubmed.ncbi.nlm.nih.gov/29663142/), DOI10.1007/s40279-018-0916-2. Revue narrative sur les retours au calme actifs ; la plupart des bénéfices de récupération couramment supposés ne sont pas établis. Cette revue ne valide pas directement une séance séparée de30–60 min de vélo ou20–45 min de course ni sa tolérance individuelle.
- `SEILER_BIKE_Z1_LONG` : Maunder et al.2021, [PMID33886100](https://pubmed.ncbi.nlm.nih.gov/33886100/), DOI10.1007/s40279-021-01459-0. Les attributs physiologiques évoluent pendant un effort prolongé ; suivre la durabilité est pertinent. Cela ne démontre ni la dose90–180 min ni les pourcentages propres à cette fiche ni une conséquence universelle du passage en Z3.

Ces associations sont des annotations documentaires explicites sur trois protocoles relus, pas une correspondance lexicale étendue aux 920 fiches. Deux résumés publics ont été lus ; aucun texte intégral acheté ou revue experte humaine prétendue. [Provenance](evidence/scientific-retrieval.json) : métadonnées, URL, SHA de réponse et bref extrait ; les résumés complets ne sont pas publiés dans le dépôt.

## Priorisation

{table(['Priorité','Fiches','Justification'],[(k,v,{0:'Discordance structurelle de source',1:'Fiche utilisée dans les calendriers archivés V14',2:'Prérequis structurés explicites',3:'Autres familles à qualifier'}[int(k)])for k,v in sorted(QS['reviewPriority'].items(),key=lambda p:int(p[0]))])}

Les occurrences V14 sont ventilées par profil et modèle ; elles ne représentent pas autant d'athlètes. La matrice distingue prescriptions de force, endurance, technique et récupération. L'absence d'un modèle métabolique classique n'est pas un défaut scientifique d'un exercice de mobilité ou de force.

Les principes documentés de Lorang (contexte, besoin du moment, équilibre et réponse observée), la doctrine TFCL et les réserves V8–V16 sont conservés. Aucun principe n'est converti en quota universel ou prédiction d'adaptation acquise.
''')
a,b=selection['rows']
put('PHYSIOLOGICAL_SELECTION.md',f'''# Sélection structurée et traçabilité physiologique

La couche V17 réutilise les filtres historiques via `evaluateCanonicalOffer` : objectif, phase, niveau, prérequis, contexte, intention explicitement documentée et durée. Elle ajoute la complétude de recette et une instanciation source, puis vérifie les fenêtres déclarées et l'indisponibilité d'une discipline lorsqu'elles sont fournies. Une fenêtre disponible n'est pas une preuve de capacité physiologique.

```mermaid
flowchart LR
 T[Résultat de test synthétique stocké] --> P[Effectif TFCL et diagnostic]
 P --> L[Limiteurs priorisés]
 L --> C[Catalogue historique et garde-fous]
 C --> R[Filtre de recettes compilées]
 R --> V[Offre à examiner par le coach]
 V --> Q[Capacité, intensités et réponse encore à vérifier]
```

## Sensibilité exécutée

Même contexte IM de test : estimation VLamax0,2→0,9. Les fonctions réelles produisent respectivement `{a['limiters']}` et `{b['limiters']}`. Le catalogue contient {len(a['compiledReviewCandidates'])} puis {len(b['compiledReviewCandidates'])} fiches dont la recette générique est compilée ; l'ordre et les offres sont conservés dans [selection-sensitivity.json](evidence/selection-final/selection-sensitivity.json). Ce sont des candidats de revue, pas autant de prescriptions admissibles.

La chaîne commence au résultat estimé de test déjà stocké, pas à une acquisition de lactate ou au calcul brut d'un sprint. Les contrats/limiteurs sont réellement calculés ; les données d'entrée restent synthétiques. Le choix physiologique optimal de dose et une réponse réelle ne sont pas démontrés.

Pour le cœur générique de la fiche réelle `A_RUN_Z2_EASY`, 45 min peuvent être instanciées en conservant les éducatifs explicitement optionnels dans le témoin. La variante propre à un objectif reste explicitement non résolue : cette instanciation ne valide pas une variante Marathon ou IM. Une intention mlss incompatible, une durée hors source, un créneau trop court ou une discipline indisponible restent refusés. Un repère de vitesse seuil effectif explicitement fourni modifie l'affichage du domaine selon la doctrine, sans augmenter automatiquement les minutes. Une limite propre à la fiche n'est jamais écrasée par une plage générique.

## Contrat optionnel de résistance à la fatigue

`CoachFatigueResistance` contient une appréciation qualitative low/typical/high/unknown, un sport, une date valide, une source, une base descriptive et une incertitude. Il n'ajoute pas de questionnaire quantitatif de charge ni de champ obligatoire pour toute séance fondamentale.

L'avis reste distinct du niveau d'entraînement et de l'état de fatigue récent. Un avis high ne prouve pas la récupération observée et ne franchit pas une capacité déclarée. Une progression au-delà de l'enveloppe reste `conditional_pending_reassessment` ; une demande actuelle dépassant une limite fournie reste `not_admissible`. Un champ `observedRecovered` ajouté à cet avis est refusé : il appartient à un contrat d'observation distinct.

L'absence d'avis ne bloque pas la revue d'une séance fondamentale. Low et high ne fabriquent pas deux doses différentes si les autres preuves sont identiques. Le champ n'existe pas encore comme liaison opérationnelle de production : V17 propose et teste le contrat offline, sans modifier l'interface.
''')
put('COACH_AND_NOLIO.md',f'''# Présentation coach et compatibilité Nolio simulée

**920 rendus** conservent les instructions et restrictions originales. Les {len(complete)} recettes complètes ont un [dossier lisible](COMPILED_RECIPES.md), comprenant durée témoin, répétitions, récupérations connues et justification de portée. Le rendu peut afficher un domaine individuel calculable lorsque le repère et sa provenance sont fournis ; les autres intensités restent inconnues. Un calcul de domaine ne transforme pas le témoin en dose optimale.

## Trois sorties distinctes

| Niveau | Résultat | Ce que cela prouve |
| --- | --- | --- |
| Lecture TFCLab |920/920 rendus conservés | Conservation des informations utiles et présentation du témoin |
| Payload texte v1 local |{OS['textLocalContractPass']} compatibles dans les fixtures | Forme et contenu textuel localement sérialisables ; durée de réservation explicitement fictive |
| Workout structuré v1 local |{OS['structuredLocalContractPass']} encodages | Chronologie et cibles d'un contrat de simulation explicitement fourni, sans acceptation distante |

Le contrat source reste celui de `nolio-send-plan` : ID partenaire numérique, date YYYY-MM-DD, durée en secondes, steps/répétitions, power en W et pace normalisée en m/s. Les domaines/correspondances et repères de ces 12 fixtures sont **explicitement synthétiques et candidats**, pas inférés comme intentions scientifiques des fiches. L'intégrité de l'IR est contrôlée avant tout rendu ou encodage.

{table(['ID structuré localement','Secondes du témoin'],[(id,rid[id]['witness']['seconds'])for id in OS['structuredIds']])}

Les conversions en cible chiffrée refusent les pourcentages sources non résolus, les zones composites ambiguës, les références absentes, la marche ou mobilité nécessitant un autre mode et les sous-blocs non métaboliques. Elles ne remplacent pas ces éléments par une cible no_target silencieuse. Un mode marche n'est jamais transformé en allure de course pour faire passer le contrat.

Les bricks et mixed conservent les jambes/disciplines parsées et les transitions connues dans l'IR. Une liste de jambes parsées peut rester partielle : elle n'est pas une fréquence disciplinaire effective. Les composantes vérifiées séparément (par exemple vélo30/course25 du brick contradictoire) restent dans knownComponentsFromExistingAudit ; les doses non attribuables ne sont jamais comptées à zéro. L'adaptateur mono-discipline les refuse au lieu de les ramener artificiellement au vélo ou à la course. Une transition manquante reste inconnue. Les entrées de repos/mobilité/nutrition mixed ne sont pas toutes des bricks.

L'API Nolio v2 et les versions inconnues restent refusées. Aucun schéma v2 n'est inventé, aucun appel réel, aucune synchronisation et aucun destinataire réel. L'ancien contrat de texte V16 n'est pas modifié. Les plans historiques gardent leurs IDs et leurs chemins de compatibilité.
''')
put('VALIDATION.md',f'''# Validation exécutée

{table(['Commande','Sortie','Erreur processus','Durée ms'],[(r['name'],r['exitCode'],r['error'],r['elapsedMs'])for r in commands])}

- Typage du périmètre expérimental : réussi.
- 25 tests Node dans la validation principale, puis **27** après les deux contrôles complémentaires de présentation/versions ; [reçu](evidence/contracts-final-supplement.json).
- **8 tests V17 de sélection**, deux processus identiques au rejeu.
- **3 tests de mutation du vérificateur Python** : altération d'un littéral, perte d'une partie et faux total détectés.
- **67/67 recettes complètes** avec contrôles Python de source, structure, plages et somme.
- Régression historique ciblée : **186 tests**,31 fichiers ; gardes expérimentaux : **30 tests**,8 fichiers,3 archivages conditionnels préexistants non exécutés.
- Régression de contrat V16 ciblée : **27 tests**. Les dix unités V16 ne sont pas relancées.

[Reproductibilité](evidence/validation-3/reproducibility.json) : deux compilations intégrales, deux études de sorties, deux sélections et deux qualifications indépendantes. La vérification complémentaire de sortie confirme l'identité après le support optionnel d'intensité coach et le refus des versions inconnues.

Les {protected} fichiers suivis avant V17, dont les 600 références et tous les registres V2–V16, sont inchangés. La suite applicative entière et les constructions de600 plans ne sont pas revendiquées comme rejouées. Aucun validateur historique ou moteur de production n'est modifié.

## Corrections et limites

Le premier audit d'inventaire utilisait une sortie git échappant les noms accentués ; le manifeste est désormais lu avec séparateurs NUL. Un contrôle de typage a rejeté map(JSON.parse) dans le nouveau harnais : remplacé par une fonction explicite, sans modifier le parser ni ses assertions sportives. Le résultat rejeté reste dans validation-2.

Le premier essai de sorties texte passait NaN pour les recettes sans témoin, à cause d'une expression optionnelle divisée avant le fallback. La correction restaure les833 contrats texte prévus, sans changer le nombre de recettes complètes ni les refus structurés. Les premiers artefacts sont conservés.

Le comptage des scopes cognitifs et des Main incomplets a été corrigé pour ne pas fabriquer des contradictions. Les répétitions gardent un paramètre source commun. Aucun repos final n'est inventé, aucune minute n'est ajoutée pour faire passer un total. Les tests de syntaxe utilisent des snippets ; aucune séance fictive n'est ajoutée au catalogue.

Compilation technique, encodage, pertinence scientifique et validation par un coach qualifié restent des preuves distinctes. Aucun test ne démontre une adaptation réellement obtenue.
''')
put('PRESCRIPTION_READINESS.md','''# Conditions d'utilisation et de promotion

| Niveau | État V17 | Condition suivante |
| --- | --- | --- |
| Canonique entier |920 sources conservées | Garder versions/empreintes et compatibilité des IDs |
| Chronologie générique complète |67 templates avec témoins vérifiés | Résoudre la variante d'objectif et l'intensité individuelle pertinente |
| Données de distance/force/mixed | Représentées avec inconnues | Modèles propres de temps, charge, technique ou transitions, sans capacité imputée |
| Qualification scientifique | Matrice complète,3 annotations documentaires ciblées | Revue des mécanismes, références et doses par famille, avec portée individuelle |
| Sélection individuelle | Garde-fous et sensibilités offline | Preuves réelles et articulation avec le calendrier complet, puis revue coach |
| Nolio texte/structuré | Contrats locaux de fixtures seulement | Fidélité complète et approbation du contenu exact avant toute autorisation réelle distincte |
| Nolio v2 | Refus explicite | Contrat machine officiel et structures complexes clarifiés |
| Production | Aucune activation | Autorisation explicite ultérieure ; DRAFT/NO-GO maintenu |

Aucune famille n'est promue automatiquement. Une recette complète n'implique pas qu'elle convient à une personne ni que toutes ses variantes sont compilées. Les hypothèses de coaching et conventions de catalogue restent candidates. Les conditions futures de suivi ne sont pas déclarées satisfaites.

L'ancien catalogue est intact et reste seul opérationnel. L'overlay V17 peut être ignoré sans réécrire les plans historiques ; IDs, sources V16 et empreintes permettent la lecture à version contrôlée. Aucune base, UI, migration, synchronisation ou API de production n'est ajoutée.

Les prochaines décisions réellement sportives concernent notamment l'occurrence du dernier repos et les ambiguïtés de source, la portée des préparations non sportives, l'attribution scientifique des familles et les preuves individuelles de tolérance. Les autres corrections techniques réversibles peuvent continuer dans un nouveau registre borné sans demander un arbitrage pour chaque défaut.
''')
put('REPRISE.md','''# Reprise V17

Baseline V16 `42a0ca0993a479d6d2f7498287ed855fdfa0dd5a`, branche experiment/det-engine, PR #420 en brouillon — NO-GO. Lire README, COMPILATION_RESULTS, SCIENTIFIC_QUALIFICATION, VALIDATION et state.json.

Budget : 60 minutes, 10 unités ; début le 28/10/2026 à 20:31:36 UTC, échéance à 21:31:36 UTC. Node 2 Go, étape 180 s, processus de validation à un worker. Aucune permanence ou relance automatique. Ne pas réinitialiser ce registre ni relancer les dix unités V16.

Entrée immuable : canonique final V16. `v17-build.mjs` ajoute l'IR dans un dossier neuf et refuse l'écrasement. `v17-independent-audit.py` vérifie le source et les témoins sans importer le compilateur JS. `v17-output-study.mjs` produit les trois niveaux de sortie localement. `v17-qualify.py` tient la matrice scientifique avec trois annotations documentaires explicites. `v17-run.mjs` supervise la validation et les comparaisons, avec état persistant et protection des fichiers antérieurs.

Sorties de référence : evidence/final, replay, outputs-final, outputs-replay, qualification-final et qualification-replay, selection-final et selection-replay. Les compléments de contrôle restent liés dans VALIDATION. Vérifier baseline-files, source-checksums, checksums et le vérificateur V17 avant toute reprise.

À préserver : 67 cœurs génériques chronométrés ; variantes spécifiques encore à résoudre ; 67/67 témoins vérifiés ; 0 prescription automatiquement approuvée ; 0 validation scientifique individuelle ou revue experte ; nage/brick non déclarés complets faute de données ; force reconnue comme modèle distinct ; avis coach optionnel non assimilé à une récupération observée ; API v2 refusée ; aucun accès réel Nolio ou athlète.

Une exécution interrompue conserve ses sorties et diagnostics ; vérifier le processus actif avant de libérer son verrou. Ne pas compter une sortie partielle comme succès, ne pas écraser les preuves acceptées et utiliser un nouveau chemin de sortie.

Une nouvelle session nécessite un nouveau mandat/budget et un registre séparé. Les choix de science ou de méthodologie restent candidats à revue indépendante ; aucune fusion, déploiement, migration, écriture réelle ou dépense n'est autorisée par ce dossier.
''')
# Exhaustive indexes preserve every ID and separate scope from suitability.
with(D/'COMPILATION_INDEX.csv').open('w',newline='')as f:
 w=csv.writer(f,lineterminator='\n');w.writerow(['legacy_id','sport','source_file','classification','bounds_min_seconds','bounds_max_seconds','witness_seconds','unknowns','automatic_prescription']);
 for c,r in zip(C,R):w.writerow([r['legacyId'],c['prescription']['discipline'],c['provenance']['file'],r['classification'],r['elapsedSeconds']['min'],r['elapsedSeconds']['max'],r['witness']['seconds']if r['witness']else'', ';'.join(r['unknowns']),False])
with(D/'SCIENTIFIC_MATRIX.csv').open('w',newline='')as f:
 w=csv.writer(f,lineterminator='\n');w.writerow(['legacy_id','sport','source_claim','source_explicit_intent','evidence_level','documentary_annotation','review_priority','review_family','archived_v14_impact_by_variant','scientific_validation']);
 for q in Q:w.writerow([q['legacyId'],q['sport'],q['sourceClaim'],q['explicitPhysiology']['primary']if q['explicitPhysiology']else'',q['applicableEvidenceLevel'],q.get('experimentalDocumentaryAnnotation',{}).get('pmid',''),q['reviewPriority'],q['reviewFamily'],json.dumps(q['archivedV14Impact']),False])
E=D/'examples';E.mkdir(exist_ok=True)
for r in complete:(E/(r['legacyId']+'.md')).write_text(oid[r['legacyId']]['coach'])
summary={'version':'det-v17-dossier-1','counts':S['counts'],'bySport':S['bySport'],'trailSourceFacet':dict(trailcounts),'variants':variant,'outputs':OS,'qualification':QS,'protectedFiles':protected,'tests':{'nodeFinal':27,'selection':8,'independentMutation':3,'historicalTargeted':186,'experimentalGuards':30,'preexistingArchiveTestsSkipped':3,'v16ContractRegression':27},'independentCompleteWitnesses':audit['passed'],'newFullPlans':0,'expertReview':False,'scientificPromotion':0,'status':'DRAFT_NO_GO'};(D/'dashboard.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'sourceRecords':920,'completeExamples':len(complete),'localStructuredEncodings':OS['structuredLocalContractPass'],'scientificPromotions':0,'dossierReadyForReview':True}))
