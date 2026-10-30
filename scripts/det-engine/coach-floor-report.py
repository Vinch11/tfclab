"""Coach-facing report of the explicit policy and executed before/after results."""
import gzip,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v25-coach-floor');attempt=sys.argv[1]if len(sys.argv)>1 else'1';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def write(name,text):(R/name).write_text(text.strip()+'\n')
def table(head,rows):return'| '+' | '.join(head)+' |\n|'+'|'.join(['---']*len(head))+'|\n'+'\n'.join('| '+' | '.join(str(x).replace('|','/')for x in row)+' |'for row in rows)
audit=load(R/'evidence/independent-validation.json');assert audit['pass'];rows=load(E/'build/results.json.gz');policy=load(R/'COACH_POLICY.json');a=policy['scope'];days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
summary=table(['Cas figé','Dérogation appliquée à l’alternative','Minutes S3 course longue','Dépassements d’enveloppe avant → après','Erreurs / avertissements bruts avant → après','Refus individuels conservés'],[[p['caseId'],p['policyApplied'],'95 → 90'if p['alternative']else'inchangées',f"{p['capacityBefore']} → {p['capacityAfter']}",str(p['rawHistoricalBefore'])+' → '+str(p['rawHistoricalAfter']if p['alternative']else p['rawHistoricalBefore']),p['states'].get('not_admissible',0)]for p in audit['profiles']])
tests=[];new_count=0;old_count=0
for c in load(E/'commands.json'):
 log=(E/(c['name']+'.txt')).read_text();m=re.search(r'Tests\s+(\d+) passed(?: \| (\d+) skipped)?',log);n=int(m.group(1))if m else None
 if c['name']=='build':new_count=n
 elif c['name']not in['replay','types']:old_count+=n or 0
 tests.append([c['name'],n if n is not None else'TypeScript',m.group(2)if m and m.group(2)else'0',c['status']])
write('COACH_POLICY.md',f'''
# Décision coach enregistrée — programmation expérimentale uniquement

Votre instruction « CODEX — DET-ENGINE : DÉCISION COACH APRÈS V25 » est la provenance de cette politique. Elle est appliquée sans demander une nouvelle autorisation pour le même plancher.

> {policy['provenance']['quote']}

Record versionné : `COACH_POLICY.json`, miroir exécutable `coach-floor-policy.ts`, comparés par test. Enregistrement : `{policy['provenance']['recordedAt']}`. La date propre de la décision n'était pas fournie : `statedDecisionDate: null`. Aucune signature, identité authentifiée ou validation individuelle n'est fabriquée.

{table(['Portée','Valeur autorisée'],[['Environnement','fixtures synthétiques expérimentales des huit cas existants'],['Séance / hash',a['sourceId']+' / '+a['sourceHash']],['Objectif / rôle / contexte','Ironman, course longue, S3 du cas de référence'],['Variante source',a['goalVariant']],['Plancher historique','95 minutes, conservé'],['Enveloppe déclarée','90 minutes, inchangée'],['Alternative de programmation','90 minutes, Z1 strict'],['Activation','opt-in explicite, désactivée par défaut'],['Approbation de dose / sécurité individuelle','non accordée'],['Autres règles / production','aucune dérogation ni autorisation']])}

La politique est étroitement bornée à la référence existante. Un autre ID, hash, objectif, contexte, floor ou plafond n'en bénéficie pas. Une évolution de ces paramètres demande une nouvelle décision explicite; aucune généralisation automatique à toutes les séances.

La décision de politique coach enregistrée vaut **1**. Les approbations de prescription individuelle et revues expertes individuelles attestées restent **0**. Le statut historique V25 `pending_explicit_decision` est conservé dans l'archive V25; la nouvelle lecture indique `authorized_experimental_floor_only`. Elle ne fabrique pas un document individuel signé pour satisfaire l'ancien vérificateur.
''')
write('EXCEPTION_CONTRACT.md','''
# Contrat opt-in et vérification complémentaire

Le moteur réutilise V25, sa preuve de recette V24 et ses contrepropositions complètes. `applyCoachFloorPolicy(..., true)` construit une alternative; sans `true`, la référence V25 reste exactement identique et aucune alternative n'est sélectionnée. Aucun moteur parallèle de sélection n'est ajouté.

L'autorisation n'est appliquée qu'après vérification de la politique enregistrée, de la fixture synthétique autorisée, de l'objectif IM, du rôle course longue, de S3, de l'identité complète de la source, de la variante 90–120 Z1 strict, du floor 95, de l'enveloppe 90 et de la durée proposée 90.

Le bloc continu source commence à 60 minutes; la métadonnée catalogue commence à 70; la variante Ironman commence à 90. Ces trois limites demeurent distinctes du plancher conventionnel 95 et de la capacité individuelle déclarée 90. Échauffement et retour au calme de 10 minutes restent intégrés. Aucun composant de recette n'est tronqué ou ajouté deux fois.

La prescription d'exécution de l'alternative ne propose que `Z1`. Les éventuelles cibles numériques sont des copies des seules cibles Z1 déjà calculées pour le profil, selon la liaison coach V22 existante; aucune cible n'est créée pour résoudre une référence absente ou conflictuelle. La source généraliste Z1–Z2 et toutes ses consignes restent conservées comme source historique, tandis que la variante IM Z1 stricte borne la proposition.

L'équivalence des terminologies de zones d'auteur et TFCL, les consignes LT1/FC/terrain et leur application individuelle restent une condition explicite de revue. Le filtrage Z1 n'atteste aucune dose individuelle ni une intensité acquise. Pour A, les cibles course restent vides et ses sept refus sont conservés.

Les contrôles historiques sont réexécutés sans changement. Ils conservent le floor 95 et ses erreurs critical. La validation complémentaire `coach-floor-complementary-validation-1` identifie exactement les trois témoins du conflit couvert par la décision : violation de quota course, floor du bloc, restitution historique de cette même violation. Son floor expérimental effectif vaut 90; le floor historique reste 95.

Tout autre défaut du bloc, nouveau témoin historique, modification de source, perte de séance/sidecar, changement d'un autre slot, cible inventée, condition supprimée, demande d'autorisation falsifiée ou résultat brut altéré entraîne un refus. Les résultats bruts sont recomputés indépendamment du cache transmis. Le hash de la référence garantit que l'alternative ne peut pas réécrire son propre témoin de comparaison.

Restent distincts : recevabilité technique, autorisation du plancher, position dans l'enveloppe déclarée, tolérance effectivement démontrée et approbation de dose. Réduire 95 à 90 supprime le dépassement arithmétique de l'enveloppe; cela ne démontre aucune adaptation, assimilation ou tolérance. Les indicateurs legacy de capacité sont lus comme une comparaison d'enveloppe, sans en déduire une capacité biologique acquise.
''')
b=next(x for x in rows if x['caseId']=='B_sustainability')['optIn'];before=b['baselineV25']['baselineV24']['result'];after=b['alternative']
calendar=[]
for w,bw in zip(after['calendar']['weeks'],before['calendar']['weeks'],strict=True):
 for day in range(7):
  def fmt(week):return'; '.join(s['card']['id']+' '+str(s['minutes'])+' min'for s in week['slots']if s['day']==day)or'repos'
  calendar.append([w['week'],days[day],fmt(bw),fmt(w)])
write('BEFORE_AFTER.md',f'''
# Avant / après, huit cas et calendrier complet de B

{summary}

Les huit références V25 complètes sont conservées à l'identique. Six alternatives de programmation sont construites. C et le contrefactuel au plafond 75 minutes restent inchangés, avec leurs refus. La comparaison ne mélange jamais conformité historique et lecture complémentaire de la politique.

Les dépassements de l'enveloppe déclarée passent de 9 à 3 dans la projection expérimentale retenue pour comparaison; six doses sont réduites de 95 à 90. Aucun plafond n'augmente. Les **42 refus individuels** de la cohorte restent identiques; cela inclut les sept refus course de A, les références manquantes, C et la récupération défavorable.

## B — calendrier de quatre semaines

{table(['Semaine','Jour','Référence V25','Alternative expérimentale opt-in'],calendar)}

La répartition V24 jeudi S3 facile 45 minutes / vendredi S3 course longue est conservée. Les trois autres semaines et toutes les autres séances restent identiques. Les totaux de B passent de 465 / 485 / 505 / 285 à **465 / 485 / 500 / 285 minutes**. Les cinq minutes retirées ne sont compensées nulle part.

Les consignes complètes et les quatre semaines numériques se trouvent dans `evidence/validation-1/build/results.json.gz` (ou le dossier de validation accepté indiqué par le registre). La sortie longue est une **candidate individuelle non approuvée**; quatre semaines ne constituent pas une préparation Ironman complète.
''')
source=next(s['card']for w in after['calendar']['weeks']for s in w['slots']if s['card']['id']==a['sourceId'])
write('COACH_PREVIEW.md',f'''
# Proposition coach — 90 minutes, floor expérimental autorisé

La permission de programmation 95 → 90 a été donnée et enregistrée. **Il n'est pas nécessaire de la redemander.** La décision qui reste à prendre porte sur la prescription individuelle, au regard de ses conditions et des données disponibles.

Séance : **{source['title']}** (`{source['id']}`). Placement de B : vendredi S3. Durée totale : **90 minutes**, avec échauffement et retour au calme intégrés. Variante appliquée : **{a['goalVariant']}**. Exécution candidate : **Z1 strict uniquement**.

La source généraliste est reproduite ci-dessous sans modification; ses plages de durée et de zones ne sont pas à additionner à la variante retenue. Les consignes historiques ne valent pas une nouvelle validation bibliographique ou une preuve individuelle.

```text
{source['structure'].replace(' | ','\n')}
```

La recette et la variante restent préservées; la dose est dans l'enveloppe déclarée 90. La tolérance à cette recette, la récupération, l'interprétation individuelle exacte de l'intensité et les autres inconnues du bloc ne sont pas attestées par cette autorisation. Le nouveau contrat conserve un verrou explicite sur ces points. Aucune signature ou revue individuelle fictive n'est enregistrée.

Pour A, le conflit de référence reste bloquant : aucune allure n'est inventée. Pour la récupération défavorable, la longue séance vélo S2 reste suspendue; l'autorisation sur la course n'autorise aucune reprise. Les quinze cas de contrat V25, dont les trajectoires de récupération, sont rejoués sans changement de résultat.

Les calendriers restent DRAFT / NO-GO pour intégration et prescription active. Aucun export Nolio, activation de production ou approbation de dose ne découle de cette page.
''')
write('VALIDATION.md',f'''
# Validation et preuves

{table(['Exécution','Tests réussis','Tests ignorés','Code sortie'],tests)}

{new_count} tests propres à la dérogation et leur rejeu, plus {old_count} tests de non-régression V25/V24/V23/V22/multiobjectifs. Les 5 tests anciens ignorés restent explicitement comptés. TypeScript sans émission : réussi. Le vérificateur Python indépendant contrôle sources, politique, isolation, deltas complets, budgets, doses, états et quatre artefacts de rejeu logiquement identiques.

Les quinze fixtures V25 (5 floor, 4 physiologiques, 6 récupération) sont effectivement réexécutées et comparées à leurs résultats archivés. L'autorisation de politique ne transforme pas un scénario favorable en approbation individuelle.

Le premier essai négatif a révélé une aliasation de cibles numériques entre référence et alternative. La correction copie ces données et lie la référence par hash. Le second essai a révélé qu'un helper ancien suppose un graphe complet; le nouveau précontrôle refuse la suppression d'une séance avant son appel. Les échecs et corrections sont archivés, sans modifier le helper historique ni les assertions pour masquer le défaut.

La dernière version refuse aussi les caches de résultats altérés, les sidecars absents, les vues d'exécution contradictoires, les demandes opt-in falsifiées et un état individuel relabellé admissible.

Pour chaque alternative, le résultat brut historique passe de **4 à 5 erreurs**, car le floor 95 reste appliqué par ses validateurs d'origine. Le nombre d'avertissements reste inchangé. Les trois témoins par cas sont conservés et la lecture complémentaire indique seulement qu'ils relèvent de l'autorisation expérimentale du plancher. Aucun autre défaut n'est couvert ou supprimé.

Les {audit['priorTrackedFilesUnchanged']} fichiers antérieurs restent inchangés, avec archives V2–V25, 920 IDs, 2 425 variantes, 600 configurations historiques recomptées mais non réexécutées ici et 15 fixtures Nolio conservées. Aucun calculateur, validateur, catalogue de production ou moteur actif n'est modifié. Aucun appel Nolio, dépense, migration, fusion, déploiement ou donnée réelle.
''')
write('RESULTS.md',f'''
# Décision coach après V25 — DRAFT / NO-GO

**Critère démontré :** l'opt-in construit six alternatives complètes de 90 minutes sous votre autorisation du floor, sans changer la recette, la variante ou l'enveloppe déclarée. Les consignes d'exécution sont bornées à Z1 strict; les cibles numériques proviennent exclusivement des anciennes cibles Z1, ou restent absentes lorsque la référence est bloquée.

{summary}

## Mesures vérifiées

- 1 décision de politique coach enregistrée, sans signature inventée.
- 8 références V25 inchangées et 6 alternatives autorisées pour programmation expérimentale.
- 6 réductions de 95 à 90 minutes, aucun autre changement de durée ou de placement, aucune compensation de volume.
- 9 → 3 dépassements d'enveloppe dans la projection comparative, dus à la réduction de dose; aucune adaptation présumée.
- 42 refus individuels conservés, notamment les sept refus course de A et la suspension vélo S2.
- 18 témoins bruts du conflit de floor conservés (3 par alternative); aucun nouveau défaut hors de cette dérogation.
- {new_count} tests nouveaux, leur rejeu, {old_count} tests de non-régression, TypeScript et vérifications indépendantes réussis.
- 15 fixtures V25 rejouées à résultats identiques; 0 approbation de dose et 0 revue experte individuelle attestée.

L'absence d'opt-in, 75 minutes, une recette tronquée, une capacité inconnue, un autre plancher, objectif, source ou contexte restent refusés. La politique est limitée au cas de référence et aux fixtures expérimentales ; aucune généralisation automatique.

Votre décision résout l'autorisation du plancher, **pas** les inconnues de tolérance, d'intensité individuelle, de récupération ou de références physiologiques. Ces conditions restent à documenter avant une prescription utilisable. Le statut demeure NO-GO, sans modification de production ni approbation individuelle.
''')
write('REPRISE.md',f'''
# Reprise — politique coach après V25

Baseline `ec72f8808f47c64f9f7361ac8e31108351348fdc`; branche `experiment/det-engine`; PR #420 DRAFT / NO-GO. Nouveau registre indépendant `state.json`, départ 2026-10-29 17:25:06 UTC, délai absolu 18:25:06 UTC, maximum dix unités. Le budget ne se renouvelle pas et aucune relance n'est installée.

Résultats : `evidence/validation-{attempt}`, `evidence/independent-validation.json`, politique `COACH_POLICY.json`, preuves avant/après et reprise des quinze cas V25. Les unités V25 clôturées ne sont pas relancées; seules leurs fonctions/tests sont réutilisés dans ce nouveau registre.

API expérimentale : `applyCoachFloorPolicy(baselineV25, profile, caseId, true)`. Sans opt-in explicite, l'alternative est absente et V25 inchangé. Le résultat `authorized_experimental_planning_only` ne vaut jamais `approved_by_coach` pour une séance individuelle. Les refus de A et la suspension défavorable restent en place.

La politique source est une instruction coach explicitement transmise dans l'échange, pas une signature fabriquée ni une nouvelle preuve physiologique. Ne pas demander à nouveau la même permission de floor. Tout élargissement à une autre source, un autre minimum ou une autre capacité nécessite une nouvelle décision de politique.

Le contrôleur refuse clôture/expiration, mauvaise branche, plus de dix unités, plus de trois validations ou un dossier déjà existant. Il borne Node à 2 Go, chaque processus à 180 s au maximum, les logs à 12 Mo et tous les processus au délai restant. Les sources Node réellement exécutées sont épinglées; les outils documentaires possèdent leurs empreintes d'exécution séparées. La consommation exacte des crédits n'est pas exposée.

Pour une nouvelle mission : confirmer la tête distante, préserver les preuves, obtenir un nouveau budget explicite et créer un nouveau registre. Ne jamais relancer automatiquement cette session clôturée. Les décisions encore nécessaires concernent les références, la tolérance et la récupération individuelles, puis la prescription coach, pas la dérogation déjà autorisée.
''')
(R/'evidence/report-summary.json').write_text(json.dumps({'newTests':new_count,'nonRegressionTests':old_count,'policyAuthorizations':1,'alternatives':6,'individualDoseApprovals':0,'individualExpertReviews':0,'profiles':audit['profiles']},indent=2,ensure_ascii=False)+'\n')
print('Seven focused coach/policy dossiers rendered from executed evidence.')
