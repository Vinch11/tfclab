"""Coach-oriented views of executed results. No changes to prescriptions, source library or exports."""
import collections,datetime,gzip,hashlib,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v22-session.py'));S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S);S.guard();R=S.ROOT
E=R/'evidence/validation-1'
def raw(p):
 p=pathlib.Path(p)
 if not p.exists():p=pathlib.Path(str(p)+'.gz')
 return gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes()
def load(p):return json.loads(raw(p))
def write(n,s):(R/n).write_text(s.strip()+'\n')
def cell(v):return str(v).replace('|','\\|').replace('\n',' ')
rows=load(E/'build/prospective/results.json');inputs=load(R/'inputs.json');audit=load(R/'evidence/independent-after-archive.json');base=load(R/'evidence/baseline-1/results.json');development=load(E/'build/allocator/results.json');reg=load(R/'evidence/preregistration.json')
weekly=[];comparison=[];traces=[]
for row in rows:
 a=row['after'];b=row['before']['prefix'];checks=audit['profiles'][len(comparison)];states=collections.Counter(d['state']for d in a['decisions'])
 comparison.append({'profile':row['id'],'rawPhysiologyUnchanged':True,'initialStrictMesocycle':next(r['block']['status']for r in base if r['id']==row['id']),
 'initialStrictReason':next(r['block']['reason']for r in base if r['id']==row['id']),'newFirstMicrocycle':next(r['allocation']['status']for r in development if r['id']==row['id']),
 'beforeProspectiveMinutes':[w['reservedMinutes']for w in b['weeks']],'afterProspectiveMinutes':[w['reservedMinutes']for w in a['calendar']['weeks']],
 'nativeBudgets':[w['budget']for w in a['calendar']['weeks']],'structuralCalendarComplete':a['structuralCalendarComplete'],'status':a['status'],'states':dict(states),
 'historicalBlockingBefore':checks['historicalErrorsBefore'],'historicalBlockingAfter':checks['historicalErrorsAfter'],'historicalWarningsBefore':checks['historicalWarningsBefore'],'historicalWarningsAfter':checks['historicalWarningsAfter'],
 'canonicalWitnessesAtReservedDose':sum(d['canonicalReview']['witness']is not None for d in a['decisions']),
 'actualPrescriptionApproved':False,'expertReviewed':False})
 for d in a['decisions']:traces.append({'profile':row['id'],**d})
 for w in a['calendar']['weeks']:weekly.append({'profile':row['id'],'week':w['week'],'type':w['type'],'minutes':w['reservedMinutes'],'budget':w['budget'],'frequencies':dict(collections.Counter(s['role']['sport']for s in w['slots'])),'sourceIds':[s['card']['id']for s in w['slots']]})
write('comparison.json',json.dumps(comparison,ensure_ascii=False,indent=2));write('weekly-summary.json',json.dumps(weekly,ensure_ascii=False,indent=2));write('prescription-traces.jsonl','\n'.join(json.dumps(d,ensure_ascii=False,separators=(',',':'))for d in traces))
write('ENGINE_CAPABILITIES.md','''# Capacités du moteur effectivement exercées

**DRAFT — NO-GO.** Chaque classement ci-dessous s’appuie sur les appels réels des tests V22 (27 tests), la comparaison archivée et 175 tests de non-régression. « Opérationnelle » décrit une fonction et sa portée, jamais une approbation sportive ou scientifique.

| Capacité | État constaté | Fonctions réutilisées ou étendues | Preuve exécutée / limite |
|---|---|---|---|
| 1. Prioriser les limiteurs | Opérationnelle sur données disponibles ; bloquée par les données manquantes de C | prepareTrainingPlanContext → computeDiagnostic / computeDecision ; normalizeV22Evidence | TTE observés 65 et 28 conservés, origine VLamax terrain ; C reste unknown malgré le faux déficit de la sortie brute |
| 2. Choisir une adaptation | Partielle | decision.strategy.levers ; deriveV22StimulusRequests | A demande VO₂, B fondation/soutien du maintien d’intensité ; force/HIIT restent différés si leurs préconditions manquent |
| 3. Sélectionner une famille de stimuli | Partielle | prospectivePool, buildProspectiveCalendar, evaluateV18ReviewOffer | Pont explicite lever → familles du catalogue, puis filtres existants ; pas de dose d’intervalle tolérée démontrée ni de nouveau quota HIIT |
| 4. Individualiser les intensités | Partielle | resolvePhysiologicalReferences, getDoctrineDomain, deriveTrainingZones ; resolveV22Targets | Conversion W/vitesse et intersection avec la limite FTP écrite ; refus de l’ancre course A et des ancres C ; nage technique/multi-nages non résolue par CSS crawl |
| 5. Déterminer une dose admissible | Partielle | targetedTiming, explicitDose, evaluateV18ReviewOffer / instantiate, assessConditional | Minima de source et floors natifs réservés ; 31 témoins canoniques aux doses réservées sur 90, pas 90 doses complètes ; preuve individuelle toujours distincte |
| 6. Organiser un microcycle | Opérationnelle pour les réservations ; partielle pour une prescription | allocate / priorityIntent opt-in technique, puis calendrier V14 réutilisé | Première semaine construite au lieu du refus swim ; fréquences et jours conservés ; aucune source technique fictive ni séance approuvée |
| 7. Construire un mésocycle | Partielle | buildProspectiveCalendar avec horizon borné quatre semaines | 3 calendriers structurels, 1 candidat conditionnel B ; A/C gardent des refus, tous gardent la lecture historique brute non conforme |
| 8. Ajuster après réévaluation | Partielle | resolveInSimulation réutilisé via reassessV22 ; anciens nextWeekFeedback testés | Inconnu maintient l’attente, adverse interdit, favorable ne lève que 2 des 5 conditions ciblées ; aucun gain de capacité ni changement de dose inféré |

## Architecture : extension de fonctions existantes

```mermaid
flowchart TD
  A[Entrées synthétiques immuables] --> B[Normalisation des preuves via fonctions TFCLab]
  B --> C[prepareTrainingPlanContext : diagnostic et décision]
  C --> D[Demandes de stimuli explicites et différées]
  C --> E[Calendrier V14 existant : horizon 4 et minima de source]
  E --> F[Contrat canonique V18 et états conditionnels V14]
  F --> G[Domaines TFCL et contraintes écrites de la source]
  G --> H[Validateurs inchangés et audit indépendant]
  H --> I[Dossier coach, aucune libération automatique]
```

Aucun second solveur, service, moteur de zones ou questionnaire créé. Les modèles antérieurs restent disponibles. Trois fichiers expérimentaux existants sont étendus avec défaut inchangé ; production et validateurs historiques restent bit-identiques. L’option technique V10 améliore le microcycle ; son ancien mésocycle strict reste limité par la réutilisation de la même source lorsque le floor change. Le prospectif réutilise donc le moteur V14 déjà présent, pas une réécriture de V11.

Les nombres de dose sont des conventions de programmation sourcées, pas des optimums. Les textes de prescription historiques dans les leviers, y compris des progressions chiffrées, sont conservés comme sorties brutes et ne deviennent pas automatiquement des règles adoptées.
''')
profilelines=[]
for row in rows:
 rawcase=row['rawInput']['raw'];p=row['preparedAfter'];eff=p['diagnostic']['effectifs'];rank=' > '.join(x['metric']for x in p['trace']['diagnostic']['limiters']);profilelines.append(f"| {row['id']} | {rawcase['vo2max']} | {rawcase['ftp']} | {rawcase['vma']} | {rawcase['paceThresholdSecPerKm']} | {rawcase['css']} | {eff['tte']['tte_min']} / {eff['tte']['source']} | {rank} | {cell(p['trace']['decision']['primaryAction'])} |")
write('THREE_PHYSIOLOGICAL_PROFILES.md','''# Trois profils synthétiques préenregistrés

Même objectif IM, ambition finisher, niveau qualitatif trained, budget disponible 10 h/semaine, 16 semaines jusqu’à la course. Le bloc demandé couvre quatre semaines à partir du 2 novembre 2026 ; course déclarée le 21 février 2027. Disponible mardi–dimanche, lundi repos, au plus deux séances par jour. Mêmes enveloppes synthétiques déclarées : vélo long 180 min, course longue 90 min ; autres séances vélo120/course75/nage75/support40. Historique fictif de huit semaines à 600 min, pas de conversion TSS→heures.

Ces enveloppes sont des hypothèses de cas coach préenregistrées, pas des capacités mesurées chez une personne ni la preuve qu’une recette précise est tolérée. La force chargée, la tolérance posturale et les temps de nage de chaque geste ne sont pas attestés.

| Profil | VO₂max brute | FTP W | VMA km/h | Allure seuil s/km | CSS crawl s/100 m | TTE effectif / origine | Ordre brut des limiteurs | Décision TFCL calculée |
|---|---:|---:|---:|---:|---:|---|---|---|
'''+ '\n'.join(profilelines)+'''

## Interprétation et limites

- **A : capacité aérobie relativement limitante.** Le moteur conserve VLamax en premier dans son classement brut et VO₂max en second, puis choisit effectivement le levier VO₂. Aucun ordre souhaité n’est saisi après sortie. Il détecte aussi un conflit critique entre seuil course observé et modèle ; les sept réservations course sont refusées dans la couche V22, sans remplacer l’ancre par une valeur favorable.
- **B : maintien d’intensité vélo limitant.** Le TTE synthétique observé de 28 min est utilisé tel quel. Ce test n’est pas une mesure de durabilité Ironman. La sortie historique « développer la durabilité » reste une formulation brute, pas une preuve. Le conflit course est un avertissement, pas supprimé.
- **C : données manquantes.** La sortie historique contient TTE=0/source unknown et un texte « déficit100% ». V22 refuse de consommer ce zéro comme un déficit physiologique mesuré. Aucune FTP, allure seuil ou CSS de remplacement n’est fabriquée.

## Préenregistrement et transport

`inputs.json` n’a plus changé après le premier passage. Son empreinte figure dans `evidence/preregistration.json` ; `baseline-1/registered-full-inputs.json` a été écrit avant les appels aux diagnostics. Le champ textuel initial `registeredAt` porte un horaire nominal erroné, postérieur au premier passage ; il n’est pas utilisé comme preuve chronologique. Les horodatages réels de fichiers et les entrées complètes conservées rendent cette erreur explicite. Aucun résultat physiologique brut n’a été ajusté pour obtenir les sorties souhaitées.

Le transport expérimental corrige deux problèmes d’interface, sans changer les nombres : `observed` est relayé vers l’énumération existante `OBSERVED`, et la VLamax est calculée depuis un test terrain synthétique via computeVLamaxEffectif plutôt que présentée comme une mesure lactate de laboratoire. Le premier passage, où les deux TTE devenaient38 et la source VLamax était mal qualifiée, reste archivé.
''')
traceparts=['# Traces prospectives de prescription','\n**Aucune adaptation future ni approbation individuelle supposée.** `prescription-traces.jsonl` contient les 90 décisions complètes ; les objets sources, états et contrôles sont dans les archives exécutées.']
for row in rows:
 a=row['after'];traceparts.append(f"\n## {row['id']}\n")
 traceparts.append('| Levier effectivement calculé | Familles proposées | Décision de consommation V22 | Motifs |\n|---|---|---|---|')
 for request in a['stimulusRequests']:traceparts.append(f"| {cell(request['leverUnchanged']['label'])} | {', '.join(request['families'])} | {request['status']} | {cell('; '.join(request['reasons']))} |")
 traceparts.append('Le catalogue est filtré par les règles existantes. Les durées A/B restent identiques : aucune loi validée ne permet ici de transformer un VO₂ ou TTE différent en minutes optimales. Les profils diffèrent par les décisions, ancres, refus et demandes de stimuli ; cette session ne démontre pas une individualisation des volumes A/B.')
 traceparts.append('| Semaine | Adaptation / stimulus réservé | Dose et statut | Réévaluation |\n|---|---|---|---|')
 for w in a['calendar']['weeks']:
  longs=[d for d in a['decisions']if d['week']==w['week']and d['role']['kind']=='long']
  for d in longs:traceparts.append(f"| {w['week']} | {d['sport']} : {cell(d['role']['purpose'])} | {d['minutes']} min, {d['state']}, enveloppe actuelle {d['currentCapacity']} min | Avant S{w['week']}, source complète, symptômes, récupération et interactions ; réponse observée : aucune |")
 traceparts.append('Les augmentations 120→130→145 au vélo et 80→90→95 en course A/B suivent les floors de programmation natifs, pas une adaptation démontrée. S3 course95 dépasse l’enveloppe90 : condition de capacité obligatoire. Une alternative conservatrice dans l’enveloppe doit être revalidée et annoncer le déficit de floor ; elle n’est pas substituée silencieusement.')
write('PRESCRIPTION_DECISION_TRACES.md','\n'.join(traceparts))
cal=['# Calendriers prospectifs de quatre semaines','\n**Réservations pour revue coach. Zéro plan actuellement exécutable ou approuvé.** A et C conservent des séances refusées ; B est entièrement conditionnel. Les minutes réservées ne prouvent pas qu’une nage ou un exercice technique complet tient déjà dans ce créneau. Toutes les consignes originales restent disponibles dans les artefacts et dans les fiches historiques.']
names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
for row in rows:
 a=row['after'];cal.append(f"\n## {row['id']} — {a['status']}\n")
 cal.append('| Semaine | Type | Nage | Vélo | Course | Support musculaire | Total / plafond natif |\n|---|---|---:|---:|---:|---:|---:|')
 for w in a['rawValidation']['candidate']['wholeTimeline']:
  t=w['disciplineMinutes'];cal.append(f"| {w['week']} | {w['type']} | {t['swim']} | {t['bike']} | {t['run']} | {t['strength']} | {w['reservedMinutes']} / {w['budget']} min |")
 cal.append('\nLes semaines de développement comptent3 nages,2 vélos,2 courses et1 support ; S4 conserve3 nages,1 vélo,1 course et1 support. Aucun brick n’est compté comme vélo ou course autonome. Le support musculaire n’est pas une preuve de force maximale. La semaine4 allégée ne garantit pas une récupération obtenue.')
 for w in a['calendar']['weeks']:
  cal.append(f"\n### S{w['week']}\n\n| Date / jour | Séance source | Dose réservée | Repère candidat calculable | Statut / point de décision |\n|---|---|---:|---|---|")
  for day in range(7):
   date=(datetime.date.fromisoformat(inputs['common']['planStartDate'])+datetime.timedelta(days=(w['week']-1)*7+day)).isoformat();sessions=[d for d in a['decisions']if d['week']==w['week']and d['day']==day]
   if not sessions:cal.append(f"| {date} {names[day]} | Repos programmé | 0 | — | Pas une preuve de récupération |")
   for d in sessions:
    numeric=[]
    for t in d['targets']:
     if t.get('min')is None:continue
     if t['unit']=='m/s':
      def pace(speed):
       seconds=round(1000/speed);return f'{seconds//60}:{seconds%60:02d}/km'
      text=f"{t['zone']} plus lent que {pace(t['max'])}"if t['min']==0 else f"{t['zone']} {pace(t['max'])}–{pace(t['min'])}"
     else:text=f"{t['zone']} ≤{t['max']:.2f} W"if t['min']==0 else f"{t['zone']} {t['min']:.2f}–{t['max']:.2f} W"
     numeric.append(text)
    anchor=' ; '.join(numeric)or('Référence refusée/manquante'if d['hardFailures']else'Exécution technique/gestuelle à préciser')
    note='REFUS : '+', '.join(d['hardFailures'])if d['hardFailures']else'CONDITIONNEL : '+('temps complet et gestes de nage'if d['sport']=='swim'else'compétence et charge musculaire'if d['sport']=='strength'else'capacité/récupération, recette et prérequis')
    cal.append(f"| {date} {names[day]} | `{d['sourceId']}` | {d['minutes']} min | {cell(anchor)} | {cell(note)} |")
 cal.append('\nChaque semaine comporte un point de réévaluation préalable sans nouvelle dose de test inventée. Aucune semaine ultérieure n’est libérée automatiquement. Pour la nage, CSS n’est qu’un repère crawl ; dos, brasse, éducatifs, repos et temps complet restent à établir. Pour la posture, stabilité et symptômes doivent être revus ; même travail nominal ne signifie pas coût physiologique équivalent.')
write('FOUR_WEEK_PLANS.md','\n'.join(cal))
comparisonmd=['# Comparaison avant / après V22','\nTrois lectures sont séparées : ancien bloc strict V11, moteur prospectif V14 initial au même préfixe de quatre semaines, puis extension V22. Le V14 initial complet16 reste également archivé. Aucun résultat16 n’est comparé directement à un résultat4 pour améliorer artificiellement les statistiques.','\n| Profil | Ancien bloc strict | Microcycle après option technique | Minutes V14 initiales S1–S4 | Minutes V22 S1–S4 | Erreurs historiques avant → après | Avertissements avant → après | Statut V22 |\n|---|---|---|---|---|---|---|---|']
for c in comparison:comparisonmd.append(f"| {c['profile']} | Refus : {c['initialStrictReason']} | {c['newFirstMicrocycle']} | {c['beforeProspectiveMinutes']} | {c['afterProspectiveMinutes']} | {c['historicalBlockingBefore']} → {c['historicalBlockingAfter']} | {c['historicalWarningsBefore']} → {c['historicalWarningsAfter']} | {c['status']} |")
comparisonmd.append('''
« constructed » dans la colonne microcycle désigne uniquement l’assemblage technique V10. C reste refusé par la couche physiologique V22 ; aucun assemblage technique n’est présenté comme prescription admissible.

## Comportements nouveaux vérifiables

1. Les observations TTE65/28 n’étaient pas consommées : les deux devenaient38 min estimées. La normalisation d’énumération permet aux vraies fonctions TFCLab de les distinguer, sans modifier les nombres d’entrée. La VLamax terrain n’est plus étiquetée labo.
2. Trois rôles de nage ne pouvaient être couverts par deux sources d’endurance distinctes. L’option explicite d’un rôle technique, avec contenu technique réellement écrit, construit le premier microcycle sans réduire la fréquence. Le yoga ou une nage facile ne sont pas requalifiés en stimulus de force/technique pour faire passer le test.
3. Le prospectif16 existant dépassait le budget des premières semaines (A/B510>480 puis530>528). Réserver d’abord les minima de sources et les floors natifs produit465≤480 et485≤528. Pas de séance supprimée, composant tronqué ou seuil de validateur modifié.
4. Un horizon explicite4 produit un objet ParsedPlan.totalWeeks=4 et28 jours, au lieu de devoir appeler16 puis découper un résultat. Les défauts de portée du validateur complet restent exposés.
5. L’ancien convertisseur d’intensité refusait globalement les pourcentages spécifiques d’une source. V22 peut fournir une intersection candidate documentée pour l’endurance vélo55–72%FTP : à FTP265,145,75–190,8W, sans élargir à75%FTP ni résoudre silencieusement les consignes FC/terrain.
6. Le levier brut de C assimilait TTE unknown/0 à un déficit100%. Le pont de consommation V22 refuse cette interprétation. Les sorties brutes restent visibles.
7. Le contrat canonique V18 est exécuté pour chaque réservation : les recettes partielles, variantes et repos finaux non arbitrés restent des conditions avant prescription, même si la durée numérique passe le catalogue historique.

Les sept séances course A restent refusées et C garde26 refus physiologiques. B garde30 réservations conditionnelles, pas30 approbations. Les volumes et sources A/B sont identiques : aucune individualisation des durées par une loi VO₂/TTE n’est démontrée. Les différences de décision et de refus sont réelles, explicites et testées.

Aucune erreur/alerte historique nouvelle au même préfixe. La disparition de certains avertissements de cohérence du limiteur résulte du TTE observé effectivement relayé, pas d’une suppression ou reclassification de l’alerte. La conformité brute reste négative.
''')
write('BEFORE_AFTER_COMPARISON.md','\n'.join(comparisonmd))
write('ENGINE_IMPROVEMENTS.md','''# Corrections et API expérimentales

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
''')
validation=['# Validation sportive et technique','\n**DRAFT — NO-GO. Zéro dose individuelle ou plan sportivement approuvé.** Les mêmes validateurs historiques sont exécutés sans modification ; leurs résultats complets sont conservés.','\n| Vérification réellement exécutée | Résultat |\n|---|---|','| Tests V22 | 27 passent, même ensemble au build et au rejeu |','| Non-régression | 175 passent, 5 tests conditionnels d’archivage antérieur non activés ; 12 fichiers |','| TypeScript | tsc --noEmit -p experimental/det-engine/tsconfig.json : code0 |','| Contrôle indépendant stdlib | 90 réservations,84 jours,30 doses par profil ; fréquences, disponibilité, restes, sources et arithmétique |','| Vues numériques de domaines | 42 vérifiées indépendamment, aucune dose optimale ou temps métabolique observé déduit |','| Reproductibilité | 4 fichiers logiques identiques, trois résultats et entrées complètes ; empreintes du code exécuté stables |','| Conservation | 4 514 anciens fichiers identiques ; seules3 extensions expérimentales opt-in ; archives V2–V21C intactes |','| Références conservées | 920 IDs,2425 variantes,600 configurations,96 chronologies/51 IDs,418 vues,15 fixtures Nolio |']
validation.append('''
## Les quatre erreurs historiques restantes par profil

- `race_day` : contrôle de préparation complète cherchant la course en dernière semaine du plan4 ; la course réelle déclarée reste en semaine16, hors du bloc.
- `calendar_coverage` : le contrat complet attend16 semaines, le bloc en fournit4.
- `triathlon_discipline_continuity` et `triathlon_training_frequency` : l’audit complet inclut les semaines5–16 absentes. Le contrôle indépendant du préfixe1–4 confirme les fréquences exactes natives pour chaque sport et semaine.

Ces erreurs de portée restent des erreurs dans la lecture brute : elles ne sont ni désactivées, ni reclassifiées dans le validateur, ni comptées comme un succès historique. La couverture codée en dur « all16weeks » dans le validateur V14 est également conservée dans l’objet brut, avec une annotation de portée réelle4/28 dans le résultat V22. Aucun départ de course fictif ajouté en S4.

## Avertissements restant visibles

| Profil | Par code |
|---|---|
''')
for row in rows:
 warns=collections.Counter(i['code']for i in row['after']['rawValidation']['historical']['issues']if i['severity']=='warning');validation.append(f"| {row['id']} | {cell(dict(warns))} |")
validation.append('''
Les19 layout_drift par profil sont conservés : l’indépendant prouve disponibilité, fréquence et espacement, pas l’équivalence physiologique de chaque modèle de disposition. Les répétitions restent visibles et la diversité n’est pas artificiellement créée. Les réservations utilisent des sources complètes conservées, mais pas nécessairement des recettes exécutables au créneau choisi ; le contrat canonique laisse ces cas conditionnels.

A garde7 refus d’ancre course critique. C garde26 refus de références, plus4 supports conditionnels. B a30 réservations conditionnelles. Chaque profil conserve les inconnues de nage, force, posture, récupération, variantes et interactions. Les dix témoins canoniques A/B et onze C à la dose réservée attestent seulement une assignation technique de durée, pas une preuve individuelle.

## Feedback et non-acquisition des adaptations

Neuf scénarios synthétiques au total : inconnu, adverse, récupération documentée pour le vélo long S2. Un compte rendu favorable dans l’enveloppe déjà déclarée fait passer5 conditions à3, sans donner de capacité nouvelle. Les trois restantes portent sur ventilation native/canonique et variante. Inconnu reste en attente ; douleur/récupération incomplète interdit. Les calendriers avant/après feedback sont identiques ; le bloc entier ne reçoit aucune autorisation.

Les données de réaction réellement observées sont nulles. Les seuils natifs de progression/volume restent des conventions TFCL, pas une preuve universelle de sécurité. Les7 premières réservations course A ne sont pas débloquées en changeant une valeur ou un seuil. Les erreurs des plans Ironman V20/V21C restent intégralement conservées par empreinte.

## Limites de couverture

Les 600 cas historiques ne sont pas reconstruits. La non-régression couvre les fonctions existantes de diagnostic, zones, objectifs, dimensionnement, allocation, blocs, feedback et conditions prospectives ; elle n’atteste pas des plans complets pour toutes les disciplines. La partie nouvelle de construction concerne uniquement ces3 profils IM et leur bloc de base4 semaines. Pas de nouvelle recherche bibliographique ni d’appel Gemini/Nolio. Le sender, les920 fiches et les validateurs de production restent inchangés.
''')
write('SPORTING_VALIDATION.md','\n'.join(validation))
results=['# Résultats V22','\n**DRAFT — NO-GO.** Le sprint développe des capacités exécutées dans le moteur existant. Aucun nouveau dossier bibliographique V21A–V21C, aucun moteur concurrent ni changement de production.','\n| Profil | Calendrier structurel | Réservations conditionnelles | Refus physiologiques | Statut | Erreurs historiques / avertissements |\n|---|---|---:|---:|---|---|']
for c in comparison:results.append(f"| {c['profile']} | 4 semaines /28 jours /30 doses réservées | {c['states'].get('conditional_pending_reassessment',0)} | {c['states'].get('not_admissible',0)} | {c['status']} | {c['historicalBlockingAfter']} / {c['historicalWarningsAfter']} |")
results.append('''
## Améliorations démontrées

- Observations TTE et origine terrain réellement transmises, sorties A/B distinctes et refus du faux déficit de C.
- Rôle natation technique compatible avec3 nages sans suppression de discipline ; premier microcycle construit là où le moteur strict refusait.
- Horizon4 natif et allocation à partir des minima de sources, corrigeant les dépassements de S1/S2 sans changer les validateurs.
- Pont exécuté vers le contrat canonique pour90 réservations, conditions de variantes/compilation conservées.
- Domaines individualisés avec contraintes écrites de source ; refus des ancres manquantes/contradictoires et des raccourcis CSS/force.
- Réévaluation liée à la séance, conservant les prérequis non prouvés et refusant toute adaptation future acquise.

27 tests V22 et175 de non-régression passent ;5 archivages antérieurs restent volontairement désactivés. TypeScript passe. Audit indépendant de90 réservations et42 vues de domaines ;4 fichiers logiques identiques au rejeu. Aucune nouvelle erreur/alerte historique au même préfixe.

## Ce qui n’est pas démontré

Aucun bloc actuellement prescriptible, aucune dose individuelle optimale, aucune adaptation obtenue, aucune revue sportive humaine. B est un calendrier complet **conditionnel**, avec lecture historique brute toujours non conforme. A et C fournissent les calendriers et parties de chaîne réellement construits, avec refus explicites.

Les volumes A/B restent identiques. La progression numérique reflète les floors natifs et exige réévaluation ; le moteur ne prouve pas encore une allocation quantitative spécifique à chaque limiteur. Nage, force chargée, posture, variantes, interaction et récupération restent à établir. Les mêmes séances se répètent :11 avertissements anti_repetition A/B,12 C, conservés.

## Priorités techniques et décisions coach

Priorité technique : résoudre les variantes et témoins temporels des sources réellement sélectionnées, puis introduire une portée de validation pré-compétitive explicite dans une couche candidate, sans toucher aux validateurs historiques. Le changement de dose selon une réévaluation doit ensuite être testé sur un bloc entier avec données admissibles.

Décisions coach/scientifiques : vérifier l’ancre course A, examiner les avertissements B, décider des stimuli ciblés au regard des interdictions force/HIIT, et fournir les preuves source-spécifiques de nage, force et posture. Ces données ne sont pas inventées. Aucune autorisation d’intégration, fusion, export réel ou production n’est sollicitée.
''')
write('V22_RESULTS.md','\n'.join(results))
write('REPRISE.md','''# Reprise après V22

**DRAFT — NO-GO.** Baseline : `0f5079d93c03fb5d3c488ea11a3ba3253460068a`, branche `experiment/det-engine`, PR #420 brouillon. Vérifier le head distant avant toute écriture suivante.

## État fonctionnel

Les trois cas sont immuables dans `inputs.json` et `evidence/baseline-1/registered-full-inputs.json`. La correction de transport ne change pas leurs valeurs. B possède un candidat conditionnel4 semaines ; A garde7 refus course, C26 refus de références. Trois calendriers structurels existent, aucun bloc approuvé. A/B :465/485/505/285min ; C455/465/480/265. Aucun gain physiologique acquis.

## Version retenue et preuves

- `evidence/validation-1/build/prospective/results.json.gz` : sorties complètes et comparaison au préfixe initial ; `replay` est identique.
- `evidence/validation-1/build/allocator/results.json.gz` : extension opt-in du premier microcycle et défaut V11 restant visible en S2.
- `evidence/baseline-1/results.json` : premier passage intact, utilisé comme golden de non-régression par défaut.
- `evidence/independent-after-archive.json`, `evidence/validation-1/commands.json`, `regression-tests.txt` : contrôles exécutés.
- `evidence/result-archives.json` : compression sans perte des snapshots intermédiaires, SHA des octets d’origine ; ne pas les additionner comme de nouveaux profils ou plans.
- `comparison.json`, `weekly-summary.json`, `prescription-traces.jsonl`, `FOUR_WEEK_PLANS.md` : lecture synthétique/coach.
- `state.json`, `CYCLE_LOG.jsonl`, `final-integrity.json` : registre borné et clôture.

## Reprise idempotente

Ce mandat dispose d’un budget unique60min/10 unités, sans renouvellement ni relance automatique. Ne pas relancer une unité clôturée ou les unités V2–V21C. Un nouveau cycle exige son propre mandat et registre. Les sorties du contrôleur doivent être neuves, les entrées et le code sont épinglés ; toute régression est conservée.

Un audit en lecture peut se rejouer avec `PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v22-independent.py /tmp/v22-recheck.json` sur un chemin neuf. Les tests V22 se lancent sans variables TFCL_DET_V22_* pour ne pas réécrire d’artefacts. Le contrôleur de génération refuse une session clôturée. Les snapshots compressés conservent exactement les octets d’origine.

## Prochaine unité utile

1. Résolution explicite des variantes d’objectif des sources sélectionnées et de leur recette temporelle, sans les promouvoir scientifiquement.
2. Contrat candidat de validation limité à un bloc pré-compétitif : conserver les quatre erreurs brutes actuelles en parallèle et ne pas ajouter de course fictive.
3. Preuves individuelles de récupération, d’exécution nage/force/posture et vérification du seuil course A. Sans elles, maintien/refus ; jamais un gain de capacité déduit du calendrier.
4. Allocation différenciée des doses selon les besoins réellement documentés : non démontrée entre A/B dans V22. Ne pas inventer une équation VO₂/TTE→minutes.

Archives V2–V21C,600 configurations,920 IDs/2425 variantes,96 chronologies,418 vues et15 fixtures préservées. Seules trois fonctions/types expérimentaux existants sont étendus avec défaut conservé et tests ; aucun moteur/validateur de production modifié. Aucune fusion, migration, donnée réelle, API payante ou écriture Nolio. Le quota exact de crédits n’est pas exposé ; aucun coût externe engagé.
''')
write('README.md','''# DET-ENGINE V22 — capacités de prescription candidates

**DRAFT — NO-GO.** [Résultats](V22_RESULTS.md) · [Capacités testées](ENGINE_CAPABILITIES.md) · [Profils](THREE_PHYSIOLOGICAL_PROFILES.md) · [Traces](PRESCRIPTION_DECISION_TRACES.md) · [Calendriers complets et refus](FOUR_WEEK_PLANS.md) · [Avant/après](BEFORE_AFTER_COMPARISON.md) · [Corrections](ENGINE_IMPROVEMENTS.md) · [Validation](SPORTING_VALIDATION.md) · [Reprise](REPRISE.md).

Trois calendriers structurels4 semaines, un candidat entièrement conditionnel B, refus maintenus pour A et C. Zéro prescription approuvée. Les données synthétiques et les preuves antérieures ne sont pas transformées en validation individuelle. Les résultats par profil et les erreurs restantes sont exposés séparément.
''')
print(json.dumps({'coachPlanDocuments':3,'calendarDays':84,'decisionTraces':len(traces),'mandatoryDocuments':9,'actualPrescriptionApprovals':0}))
