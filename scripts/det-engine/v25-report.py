"""Render the executed contract decisions as nine coach dossiers; no prescription approval."""
import gzip,json,pathlib,re
R=pathlib.Path('docs/det-engine/v25');E=R/'evidence/validation-3'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def write(name,text):(R/name).write_text(text.strip()+'\n')
def table(head,rows):return'| '+' | '.join(head)+' |\n|'+'|'.join(['---']*len(head))+'|\n'+'\n'.join('| '+' | '.join(str(x).replace('|','/')for x in row)+' |'for row in rows)
audit=load(R/'evidence/independent-validation.json');assert audit['pass'];rows=load(E/'build/results.json.gz');fixtures=load(E/'build/registered-contract-fixtures.json');contracts=load(E/'build/contract-results.json')['contracts'];source=load(R/'evidence/pr424-readonly.json');spec=load(R/'inputs.json')
profileTable=table(['Cas figé','Réservations identiques','Alternative 90 min techniquement recevable','Conflits capacité conservés','Refus / conditions','Erreurs / avertissements historiques'],[[p['caseId'],p['reservationsUnchanged'],p['receivableFloorAlternatives'],p['capacityConflicts'],f"{p['states'].get('not_admissible',0)} / {p['states'].get('conditional_pending_reassessment',0)}",f"{p['historicalBlockingUnchanged']} / {p['historicalWarningsUnchanged']}"]for p in audit['profiles']])
floorTable=table(['Fixture','Minutes','Recette complète','Variante IM, durée','Dans enveloppe','Statut'],[[x['id'],x['decision']['minutes'],x['decision']['recipeComplete'],x['decision']['goalVariantCompatible'],x['decision']['withinDeclaredEnvelope'],x['decision']['status']]for x in contracts['floors']])
recoveryTable=table(['Trajectoire prospective figée','État après réévaluation','Capacité initiale inchangée','Suspension opérationnelle conservée'],[[x['id'],x['decision']['state'],x['decision']['currentCapacityMinutes'],x['decision']['recoveryHoldStillOperative']]for x in contracts['recovery']])
tests=[]
for c in load(E/'commands.json'):
 text=(E/(c['name']+'.txt')).read_text();m=re.search(r'Tests\s+(\d+) passed(?: \| (\d+) skipped)?',text);tests.append([c['name'],m.group(1)if m else'TypeScript',m.group(2)if m and m.group(2)else'0',c['status']])
write('CAPACITY_VS_PLANNING_FLOOR.md',f'''
# Capacité, recette et plancher de programmation

Le moteur ne confond plus la recevabilité d'une proposition de dérogation avec une dose autorisée. La lecture V24 reste conservée; une **évaluation complémentaire V25**, nommée `det-v25-complementary-floor-review-1`, décrit ce qui peut être soumis à une décision humaine.

## Six dimensions explicites

{table(['Champ','Valeur pour l’alternative S3','Portée réelle'],[['source_recipe_minimum','60 min','bloc continu historique avec périphériques intégrés; métadonnée catalogue minimale distincte : 70 min'],['goal_variant_minimum','90 min','variante Ironman littérale 90–120 min Z1 strict'],['planning_floor','95 min','convention native individualisée, conservée sans modification'],['current_capacity_envelope','90 min','enveloppe coach synthétique préenregistrée; pas une adaptation obtenue'],['individual_tolerance_verified','false','aucune preuve individuelle de tolérance à cette recette exacte'],['coach_override_status','pending_explicit_decision','aucune approbation humaine enregistrée']])}

La validité physiologique du stimulus reste une question distincte : le contexte familial documenté en V21 ne valide ni cette dose exacte ni son applicabilité individuelle. Une adaptation future est une possibilité conditionnelle, jamais une capacité acquise.

La preuve V24 est réutilisée avec l'identité complète de la fiche. Échauffement et retour au calme de 10 minutes sont intégrés, jamais ajoutés ou tronqués. V25 réexécute le contrat catalogue et le contexte de placement originaux. La compatibilité de variante annoncée porte sur sa durée et la conservation des consignes; l'affectation individuelle exacte de l'intensité reste non vérifiée. La consigne Z1 stricte n'est pas transformée en autorisation générale Z2.

{floorTable}

À 75 minutes, le contenu continu de base peut entrer dans la plage source et la métadonnée 70–150, mais la variante Ironman 90–120 est incompatible. Une diminution d'une autre recette qui perdrait une partie obligatoire est refusée. Une capacité inconnue n'est jamais traitée comme un plafond favorable.

## Vérification sur les blocs complets

Neuf conflits d'enveloppe donnent lieu à des examens; six alternatives à 90 minutes sont techniquement recevables pour instruire une exception strictement limitée au floor. Les trois réductions à 75 minutes du contrefactuel restent bloquées. Les 240 réservations retenues restent identiques à V24, dont la course candidate de 95 minutes, toujours au-delà de l'enveloppe actuelle de 90.

Chaque contreproposition complète conserve **trois témoins** du même conflit : `original_weekly_quota_or_budget` avec `quota_floor_violation`, `four_week_native_floor`, et sa restitution historique `historical_error_not_explained_by_scope`. Le complément lie exactement semaine, slot, source, durée, capacité et floor; un autre quota ou défaut reste une erreur distincte. Aucun témoin brut n'est effacé : ces contrepropositions ont toujours 5 erreurs historiques, contre 4 dans la réservation native.

Leur S3 utilise 500 minutes au lieu de 505, sans compensation des 5 minutes retirées. Ce sont des alternatives, pas les calendriers retenus. La recevabilité technique de A ne retire aucun de ses sept refus course; celle du cas de récupération défavorable ne lève pas sa suspension vélo.
''')
write('COACH_OVERRIDE_CONTRACT.md','''
# Contrat de dérogation coach — limité au plancher

Une dérogation ne peut concerner que `planning_floor_only`. Elle ne change ni `source_recipe_minimum`, ni `goal_variant_minimum`, ni capacité, intensité, tolérance ou récupération. Le paquet conserve l'objectif Ironman, la semaine, le slot, l'ID historique et son hash, la dose proposée, le floor et le contexte de profil. Un hash complémentaire lie le paquet à tous les contrôles du bloc.

Le statut actuel des six propositions est `pending_explicit_decision`. Elles sont présentables au coach avec leur lecture historique intégrale et l'évaluation complémentaire V25. Aucune dérogation n'est activée et la réservation principale de 95 minutes n'est pas remplacée.

La frontière future exige un document : identifiant, sujet haché, portée exacte, décision, acteur coach qualifié, date, motif, signature, et contrôle d'authenticité par un vérificateur externe. Le prototype ne dispose d'aucun vérificateur humain authentifié ni de décision réelle. Il refuse les simples déclarations d'approbation, les sujets/portées incorrects et tout document synthétique ou contexte simulé, avant même d'appeler un vérificateur permissif.

Les tests adversariaux contiennent des demandes d'approbation volontairement non fiables pour démontrer leur rejet. Ce ne sont ni des décisions humaines enregistrées ni des validations de dose.

Même une future décision authentique sur le floor ne constituerait pas une approbation `session_prescription`. La dose, l'ancrage d'intensité, les conditions individuelles et le microcycle nécessitent une décision distincte. Aucun connecteur d'export ou de production ne consomme ces statuts.

Réversibilité : retirer ou refuser cette proposition laisse le calendrier V24 intact. Tout changement de source, de capacité, de profil ou de contexte doit conduire à une nouvelle évaluation; les anciens paquets ne constituent pas un droit général à réduire les séances.
''')
write('PHYSIOLOGY_424_CONTRACT.md',f'''
# Transfert physiologique #424 → DET-ENGINE, sans fusion

PR #424 examinée en lecture seule au SHA `{source['ref']}`, inchangé par rapport à V24. La PR #420 commence à `24024f6f9f7bc91b4c9a8bdce676d21625eff29b`. Les SHA distants sont archivés. Trois fichiers pertinents sont récupérés et leurs objets Git/SHA-256 effectivement recalculés; le dossier V24 de reproduction reste intact.

## Frontière typée

Le contrat `det-v25-run-cost-1` distingue `running_oxygen_cost` / `ml_O2/kg/km` de `run_economy_score` / `score_0_100`. Il exige valeur explicite, provenance versionnée, artefact vérifié, liaison aux entrées brutes, dates d'application, méthode, statut et incertitude documentée. Un intervalle individuel inconnu reste `null`, pas un intervalle inventé.

La méthode et la revendication sont liées au contenu vérifié : quantité, unité, valeur, identifiant de méthode, hash des entrées et caractère synthétique. Le seul contexte positif de V25 provient de la valeur **200 explicitement écrite dans le test synthétique #424**. Ce n'est ni une mesure individuelle ni une preuve scientifique. Le registre en permet uniquement cet usage documentaire/simulé.

Un test négatif a démontré qu'un hash de fichier seul était insuffisant : la valeur 65 pouvait être réétiquetée comme coût contre le même fichier. Ce comportement exploratoire a été rejeté. La version retenue vérifie la revendication exacte et refuse aussi une réattribution à un autre sujet, même avec un nouveau hash auto-calculé. Le log de l'échec est conservé dans `evidence/claim-binding-negative-before.txt` ou son archive sans perte.

## Trois situations exécutées

{table(['Situation','Décision V25','Conséquence'],[['coût typé documenté, fixture distincte','typed_context_consumed_for_review','prédicteur existant : 83,2%; natif : 93,7%; sorties séparées'],['valeur incertaine','hold_typed_reference','pas de prédiction expérimentale; données et refus natifs conservés'],['coût absent','hold_typed_reference','aucun score, coût moyen ou coefficient de remplacement'],['score fourni comme coût','hold_typed_reference','erreur de dimension et de revendication explicites']])}

Les huit cas historiques n'ont reçu aucun coût supplémentaire. L'absence de coût bloque ce contexte Modèle C; elle n'est pas assimilée à l'absence d'une allure seuil déjà transmise. Les ancres existantes et refus restent inchangés, notamment **les sept refus course de A**. La valeur 200 du cas #424 n'est jamais transférée à A.

V25 appelle uniquement le prédicteur et le contrôle croisé existants avec ce coût explicitement typé dans une sortie séparée. Aucun fichier de #424 n'est fusionné, aucun calculateur n'est modifié, aucun seuil ou donnée VLamax/VO₂max/VMA/FTP n'est remplacé. Les bornages et libellés du modèle historique restent ceux du modèle, pas des attestations de validité individuelle. Son « observedPct » est une valeur dérivée allure/VMA, pas une mesure directe de MLSS.

Le contrat est prêt pour examen entre responsables #424/#420. Il ne raccorde aucune donnée réelle ni aucune approbation à la production. Une future valeur mesurée/estimée devrait disposer de ses propres preuves et revendications vérifiées; le registre synthétique actuel ne l'autorise pas.
''')
write('RECOVERY_REASSESSMENT.md',f'''
# Suspension, réévaluation et reprise conditionnelle

La machine `det-v25-recovery-reassessment-1` représente `planned_conditional`, `suspended_due_to_recovery`, `awaiting_reassessment`, `candidate_for_coach_review`, `not_admissible` et la frontière réservée `approved_by_coach`. Le journal est limité à 32 événements; il n'existe aucune boucle de reprise automatique.

La réévaluation exige même slot/source/hash, dates cohérentes, validité au moment simulé, récupération favorable déclarée, absence explicitement déclarée de douleur/symptôme/restriction, observation de tolérance à la séance précédente, référence exploitable, capacité déjà documentée et compatibilité du microcycle. Les dates d'expiration sont des données de preuve explicites, pas un délai de récupération universel.

{recoveryTable}

Ces trajectoires sont **prospectives synthétiques** : suspension le 9 novembre 2026 à 08 h, demande de réévaluation à 09 h et observation éventuelle à 18 h. Elles sont figées avant exécution; elles ne constituent pas des observations actuellement obtenues. Le scénario de capacité 120 minutes est une fixture distincte préenregistrée, pas une diminution produite par la récupération. La cible reste 130 minutes.

Le cas favorable documente synthétiquement une séance précédente de 120 minutes. Cette observation est une entrée synthétique nouvelle, jamais déduite de la présence d'une séance au calendrier. Elle ne prouve pas la tolérance à la dose cible 130, ni une adaptation. Le plafond déclaré 180 minutes reste inchangé. La cible, l'ancre FTP et la compatibilité structurelle du microcycle sont confrontées indépendamment au résultat TFCLab réellement calculé pour B et aux contrôles quatre semaines exécutés; ces contrôles ne prouvent pas une récupération physiologique ni la validation de toutes les conditions du bloc.

Le résultat est seulement `candidate_for_coach_review`, avec hash du paquet de réévaluation; la suspension opérationnelle reste active. Aucun statut approuvé n'est atteint en simulation, même si un vérificateur permissif est injecté dans le test négatif.

Dans les huit cas V23/V24, la suspension vélo S2 est conservée. Son observation d'origine ne possède pas de date explicite : V25 n'en invente aucune. Le paquet signale `observedAt: null`, et une réévaluation ultérieure exige d'abord une provenance temporelle suffisamment documentée. Les trajectoires nouvelles ne sont pas fusionnées dans ce cas historique.

Aucun volume n'est déplacé ou compensé, aucune capacité n'augmente après disparition de symptômes, aucun défaut de référence ou de calendrier n'est annulé par un ressenti favorable. La machine ne modifie pas le calendrier ni ses validateurs.
''')
write('BEFORE_AFTER.md',f'''
# V24 / V25 — entrées et réservations constantes

{profileTable}

Les huit sorties V24 complètes rejouées sont égales aux archives, avec entrées, sources, doses, domaines, jours et contrôles. Les 240 réservations, 9 conflits d'enveloppe, 32 erreurs historiques et 282 avertissements restent identiques. B garde jeudi S3 à 45 minutes et vendredi S3 en course longue candidate à 95 minutes. Les neuf propositions V24 avec compromis restent séparées.

## Décisions fonctionnelles ajoutées

{table(['Avant','Après V25','Ce qui ne change pas'],[['90 min rejetées sans lecture complémentaire du conflit','6 paquets techniquement recevables pour une dérogation limitée, avec trois témoins historiques conservés','aucune dérogation ni dose approuvée; calendriers retenus identiques'],['transfert surtout dimension/provenance','coût typé lié à une revendication précise et aux entrées vérifiées; prédiction séparée exécutée','A garde ses refus; aucun coût inventé'],['suspension défavorable sans chemin détaillé de réévaluation','journal daté, refus et candidature à revue coach dans 6 trajectoires','suspension native conservée, aucun rattrapage ni hausse de capacité']])}

Les alternatives sont évaluées à côté des réservations; elles ne transforment pas les résultats historiques en résultats verts. Les quatre semaines restent un bloc conditionnel, pas une préparation Ironman complète. Une réévaluation simulée n'est pas une preuve d'assimilation.
''')
write('SPORTING_SAFETY.md',f'''
# Validation et sécurité sportive

{table(['Exécution','Tests réussis','Tests ignorés','Code sortie'],tests)}

40 tests V25, puis rejeu des mêmes 40; 250 tests pertinents V24/V23/V22 et multiobjectifs réussis, 5 anciens tests ignorés. TypeScript sans émission réussi. Le vérificateur Python indépendant compare les huit résultats V24 complets, les hashes des sources, les revendications, les bornes de recettes, les 15 fixtures et les journaux d'états. Quatre artefacts de rejeu sont logiquement identiques.

Un test négatif sur la liaison valeur/source a d'abord échoué : ce résultat et la première validation à 37 tests sont conservés. La seconde validation teste le correctif; la troisième ajoute le refus structurel des sujets de récupération invalides. Aucun seuil sportif ou calculateur n'a été modifié pour rendre un test vert.

Les erreurs brutes du plancher restent critical dans leurs contrôles d'origine. Le complément V25 ne les remplace ni ne les reclasse; il les identifie comme objets exacts de la dérogation à examiner et conserve tout défaut supplémentaire. Des tests empêchent une erreur vélo/quota étrangère ou une source modifiée d'être couverte par cette dérogation.

Les rejets portent aussi sur capacité inconnue ou insuffisante, recette tronquée, variante Ironman trop courte, score/coût confondus, source non vérifiée, revendication altérée, mauvaise identité, référence périmée/future, récupération inconnue/défavorable, douleur, tolérance antérieure absente, microcycle incompatible, document coach non authentifié et toute approbation simulée.

Les {audit['priorTrackedFilesUnchanged']} fichiers antérieurs sont inchangés : archives V2–V24 et preuves V21, 920 IDs, 2 425 variantes, 600 configurations recomptées mais non rejouées ici, 96 chronologies / 51 IDs, 418 vues et 15 fixtures Nolio. Aucune écriture/export Nolio, donnée réelle, migration, fusion, déploiement, API payante, modification de production, de catalogue, de calculateur ou de validateur.

Les seuils historiques ne deviennent pas des lois physiologiques du seul fait d'exister dans le code. Inversement, les qualifier de conventions ne les désactive pas. La revue humaine reste obligatoire; aucun plan ou dose n'est sportivement approuvé.
''')
write('COACH_DECISION_PACKET.md','''
# Paquet de décision coach

## Alternative de course S3

La séance historique `SEILER_RUN_Z1_EASY_LONG` peut être présentée en 90 minutes, sans perdre l'échauffement/retour au calme intégrés ni la variante Ironman littérale 90–120 min Z1 strict. Le plancher de programmation reste 95; il est donc nécessaire d'examiner une exception limitée et documentée. Le plafond déclaré reste 90.

Le paquet montre séparément : recette, variante, floor, capacité, tolérance individuelle et décision humaine. La recevabilité complémentaire n'efface aucune erreur historique. Elle ne résout ni la référence course conflictuelle de A, ni les inconnues d'intensité, de tolérance, de récupération ou d'exécution natation/posture du bloc.

## Transfert physiologique

Le prototype peut consommer le coût 200 de la fixture distincte #424 comme contexte typé et vérifié, avec incertitude explicite et sorties natives séparées. Cette valeur synthétique ne doit être attribuée à aucun athlète. Une future référence individuelle demande ses propres preuves, qualité de méthode et validation de cohérence. Une correction d'unité n'est pas une validation de la valeur.

## Après récupération défavorable

Le journal distingue suspension, demande de réévaluation et réponse documentée. Une réponse favorable ne suffit pas si douleur, référence, capacité, tolérance antérieure ou microcycle restent problématiques. Lorsque les prérequis synthétiques sont documentés, il prépare une candidature à revue, conserve l'historique défavorable et maintient le verrou opérationnel.

Le cas historique de vélo S2 reste suspendu. Sa provenance temporelle doit être précisée avant d'envisager un réexamen réel. Les trajectoires futures simulées ne valent pas une observation obtenue.

## Décisions réellement nécessaires

1. Examiner si l'exception 95 → 90 est acceptable comme convention limitée de programmation, indépendamment de la dose et des capacités.
2. Examiner avec #424 la preuve et le typage des références course individuelles. A garde actuellement ses sept refus.
3. Documenter une réévaluation réelle puis une décision coach distincte pour toute reprise. La tolérance à 120 minutes et une enveloppe déclarée 180 ne prouvent pas automatiquement l'aptitude à 130.

Décisions humaines authentifiées enregistrées : **0**. Doses individuelles approuvées : **0**. La chaîne d'authentification d'une signature coach n'est pas raccordée dans ce prototype offline. Aucun statut de ce dossier ne déclenche un export ou une prescription active.
''')
write('V25_RESULTS.md',f'''
# V25 — DRAFT / NO-GO

## Réponses aux critères fonctionnels

1. **90 minutes techniquement recevables sous dérogation contrôlée : oui, comme proposition.** Six alternatives de blocs sont présentables pour une exception explicitement limitée au plancher. Les erreurs historiques restent intégrales; aucune dérogation n'est activée.
2. **Approbation sportive : toujours empêchée.** Intensité exacte, tolérance à la recette, récupération et conditions individuelles restent non attestées. Les refus physiologiques et autres inconnues du bloc subsistent. 95 minutes dépassent toujours l'enveloppe actuelle de 90; 75 ne satisfont pas la variante Ironman.
3. **Contrat futur #424 consommable sans invention : oui, comme contexte vérifié séparé.** Un coût explicitement présent dans une fixture source est consommé par le modèle existant. Une unité corrigée ne valide pas la valeur. Les huit cas historiques ne reçoivent aucun coût et A garde ses sept refus.
4. **Réévaluation traçable après récupération défavorable : oui.** Six trajectoires préenregistrées couvrent attente, maintien de suspension, refus et candidature à revue. Aucune simulation n'autorise la reprise.
5. **Capacités réellement exécutées :** contrat de floor avec preuve de recette/variante/enveloppe, complément de bloc, transfert typé lié à la revendication/source/entrées, machine à états bornée et frontière d'authentification coach séparant floor et séance.
6. **Plan sportivement approuvé : non.** Les calendriers restent conditionnels et les preuves individuelles/humaines manquent. Quatre semaines ne valent pas une préparation Ironman complète.

{profileTable}

## Mesures vérifiées

240 réservations V24 inchangées; 9 conflits d'enveloppe conservés; 9 alternatives examinées, 6 techniquement recevables pour revue du floor; 1 suspension native conservée; 5 fixtures floor, 4 physiologiques et 6 de récupération nouvelles. Un seul contexte de coût est consommé; un seul scénario de récupération aboutit à une candidature coach. **0 approbation individuelle, 0 revue experte humaine, 0 volume de compensation.**

40 tests V25 et leur rejeu réussissent; 250 tests de non-régression réussissent, 5 anciens tests sont ignorés; TypeScript et vérification Python indépendante passent. Les archives et tous les fichiers antérieurs restent inchangés. Les 600 références historiques sont conservées et recomptées, pas réexécutées dans V25.

La première validation à 37 tests et l'échec négatif démontrant l'insuffisance d'un hash de fichier seul sont archivés. La version retenue lie la revendication exacte. Aucun assouplissement de règle ni aucune donnée physiologique favorable n'a servi à lever un refus.

Les neuf dossiers détaillent les contrats, décisions, limites et conditions de reprise. Le statut reste **NO-GO**, sans action de production. Les prochains arbitrages humains sont limités au floor candidat, aux preuves course avec #424 et à une réévaluation individuelle réelle.
''')
write('REPRISE.md','''
# Reprise V25

Baseline `24024f6f9f7bc91b4c9a8bdce676d21625eff29b`, branche `experiment/det-engine`, PR #420 DRAFT / NO-GO. #424 lu au SHA `36a8f2f69c07248aa4e08bbc4bb322e9ae4c759d`; aucun fichier fusionné et aucun calculateur modifié.

Le nouveau registre `state.json` fixe le départ à 15:39:05 UTC et la limite absolue à 16:39:05 UTC le 29 octobre 2026, avec dix unités maximum. Il ne renouvelle pas le budget et n'installe aucune relance. La consommation exacte des crédits n'est pas exposée par l'environnement.

Résultat retenu : `evidence/validation-3`, `evidence/independent-validation.json`, `registered-contract-fixtures.json` et `contract-results.json`. La validation 1 et le test négatif de liaison valeur/source sont conservés. Les entrées complètes sont archivées avant l'exécution des nouveaux contrats. Les observations de novembre sont des trajectoires futures simulées, pas des données actuelles.

Réutiliser `v25-prescription.ts` pour la composition V24 et les paquets complémentaires, `v25-floor.ts` pour l'exception limitée, `v25-physiology.ts` pour le transfert typé, `v25-recovery.ts` pour les événements et `v25-coach.ts` pour la frontière humaine. Aucun de ces modules ne remplace les règles historiques ou n'active une prescription.

Le contrôleur refuse une session clôturée/expirée, mauvaise branche, plus de dix unités, plus de trois validations ou un dossier de sortie déjà existant. Node est borné à 2 Go de tas, chaque processus à 180 secondes au maximum et les logs à 12 Mo; le délai restant raccourcit ces limites. Le journal de récupération est limité à 32 événements.

Pour toute mission ultérieure, confirmer les têtes distantes, lire le statut de clôture, créer un nouveau budget explicitement autorisé et préserver ces preuves. Ne pas relancer les unités V25 clôturées. Ne jamais transformer `technically_receivable_for_explicit_floor_review` ou `candidate_for_coach_review` en approbation individuelle. Une signature humaine authentifiée et les preuves sportives restent indispensables.
''')
(R/'evidence/report-summary.json').write_text(json.dumps({'profiles':audit['profiles'],'tests':tests,'newContractFixtures':15,'floorAlternativesTechnicallyReceivable':6,'individualDoseApprovals':0,'humanExpertReviews':0,'status':'DRAFT_NO_GO'},indent=2)+'\n')
print('Nine V25 dossiers rendered from independently verified execution.')
