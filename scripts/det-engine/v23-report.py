"""Reports only from executed results; original profiles and prescriptions remain untouched."""
import collections,datetime,gzip,hashlib,importlib.util,json,pathlib,re
sp=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v23-session.py'));S=importlib.util.module_from_spec(sp);sp.loader.exec_module(S);S.guard();R=S.ROOT;E=R/'evidence/validation-1'
def raw(p):
 p=pathlib.Path(p);return gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes()
def load(p):return json.loads(raw(p))
def write(n,s):
 text=s.strip()+'\n'
 if n.endswith('.md'):
  text=re.sub(r'(?<=\d)à(?=\d)',' à ',text)
  text=re.sub(r'(?<=\d)(?=[A-Za-zÀ-ÖØ-öø-ÿ])',' ',text)
  text=re.sub(r'(VO₂|TTE|FTP)(?=[0-9])',r'\1 ',text)
  text=re.sub(r'(?m)(^\|.*\|$)\n\n(?=\|)',r'\1\n',text)
  text=re.sub(r'(?m)(^\|.*\|$)\n(?=[^\n|])',r'\1\n\n',text)
 (R/n).write_text(text)

def cell(v):return str(v).replace('|','\\|').replace('\n',' ')
rows=load(E/'build/results.json.gz');audit=load(R/'evidence/independent-1.json');spec=load(R/'inputs.json');source={r['legacyId']:r for r in[json.loads(l)for l in pathlib.Path('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl').read_text().splitlines()]};summaries=[];chains=[]
for row in rows:
 a=row['after'];r=a['result'];before=row['before'];family=collections.defaultdict(int);sports=collections.defaultdict(int);weekrows=[]
 for w in r['calendar']['weeks']:
  for s in w['slots']:family[s['card']['intentFamily']]+=s['minutes'];sports[s['role']['sport']]+=s['minutes']
  weekrows.append({'week':w['week'],'minutes':w['reservedMinutes'],'budget':w['budget']})
 states=collections.Counter(d['state']for d in r['decisions']);conflicts=[c for c in a['capacity']if not c['currentlyWithinEnvelope']]
 summaries.append({'caseId':row['caseId'],'primaryAction':row['prepared']['trace']['decision']['primaryAction'],'programmingRequested':a['programming']['policy']is not None,'programmingAccepted':a['programmingAcceptance']['accepted'],'rejectedTrial':a['rejectedProgrammingAttempt']is not None,'retainedStatus':r['status'],'states':dict(states),'weeks':weekrows,'minutesByDiscipline':dict(sports),'minutesByCatalogueIntent':dict(family),'catalogueIntentMinutesAreDescriptiveNotEvidenceOfAdaptation':True,'additionalMinutesAttributedToLimiter':0,'scopeBlockErrors':len(a['scope']['executedBlockErrors']),'historicalScopeErrors':sum(h['classification']=='historical_sixteen_week_scope'for h in a['scope']['historicalClassifications']),'historicalWarningsBefore':before['rawValidation']['historical']['warnings'],'historicalWarningsRetained':r['rawValidation']['historical']['warnings'],'currentEnvelopeConflicts':len(conflicts),'rejectedAlternatives':sum(c['alternative']is not None for c in a['capacity']),'adverseHoldApplied':len(a['appliedObservations']),'actualPrescriptionApproved':False})
 chains.append({'caseId':row['caseId'],'rawInputUnchanged':row['input']['input'],'limiterTrace':row['prepared']['trace']['diagnostic'],'strategicLevers':row['prepared']['trace']['decision'],'requests':a['programming']['requests'],'policy':a['programming']['policy'],'acceptance':a['programmingAcceptance'],'selected':[{ 'week':w['week'],'slot':s['key'],'sourceId':s['card']['id'],'sourceEffectiveSha256':source[s['card']['id']]['source']['provenance']['effectiveContentSha256'],'catalogueIntent':s['card']['intentFamily'],'role':s['role'],'minutes':s['minutes'],'day':s['day'],'state':s['decision']['state']}for w in r['calendar']['weeks']for s in w['slots']],'capacity':a['capacity'],'actualAdaptationObserved':None})
write('case-summary.json',json.dumps(summaries,ensure_ascii=False,indent=2));write('decision-chains.jsonl','\n'.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))for x in chains))
write('DECISION_CHAIN_DIAGNOSIS.md','''# Où le lien intention → programmation se rompait

**DRAFT — NO-GO.** Diagnostic ciblé sur les appels réellement exécutés, sans nouvelle recherche générale. Les mêmes entrées A/B/C V22 sont relues ; cinq contrefactuels sont enregistrés séparément avant calcul. Les traces intégrales sont dans `decision-chains.jsonl` et les résultats avant/après dans `evidence/validation-1/`.

## Point de rupture précis

`buildV22Prescription` appelait d’abord `buildProspectiveCalendar`, puis calculait `deriveV22StimulusRequests` au moment du retour. Les intentions ne pouvaient donc pas modifier la sélection ou le placement déjà effectués. Le calendrier V14 choisissait des listes fixes par sport/rôle, triait les longues puis les clés de séances, et réservait les minima de source/floors. Le focus vélo était le même champ préenregistré pour A/B ; il ne provenait pas du levier dominant.

V23 crée les intentions avant la construction, puis transmet une politique explicite au même moteur V14. Aucun solveur concurrent. Les appels sans option restent identiques aux sorties archivées V22.

| Catégorie | Constat A/B et test exécuté |
|---|---|
| Différence physiologique exploitable | TTE vélo observé65 chez A,28 chez B ; la décision TFCL A demande VO₂, B demande une fondation liée au maintien d’intensité. Le TTE n’est pas une mesure de durabilité Ironman. |
| Différence sans effet de dose justifiable | Même objectif/base, disponibilité, enveloppes et minima. Aucun contrat vérifié ne convertit VO₂/TTE en minutes supplémentaires. Les doses restent identiques. |
| Intention bloquée par des prérequis | VO₂/seuil A : tolérance d’intervalles non documentée ; interdiction historique de blocs VO₂ lourds conservée. Force : compétence et charge non établies. |
| Catalogue insuffisant | Ne pas confondre offre de famille et recette admissible : les offres sont listées dans les traces ; variante/chronologie complète et preuve individuelle manquent sur les sources retenues. Il n’est pas démontré que le catalogue entier soit vide. |
| Arbitrage non appliqué | Avant V23, intentions non consommées. La politique testée agit réellement sur l’ordre et le placement, mais sa variante ajoute une alerte et est rejetée. Aucun reliquat de temps rempli sans raison de dose. |
| Transport de données | Le transport TTE/VLamax V22 fonctionne au rejeu. Un autre problème sémantique d’économie course apparaît à la frontière score/coût énergétique ; dossier séparé, pas de correction concurrente de formule. |
| Règle historique imposant une solution proche | Rôles essentiels, domaine modéré de base, floors et minima de sources contraignent les mêmes séances. Le floor95 en S3 reste incompatible avec une réduction à90 sous la convention actuelle. |

## Résultat honnête

A/B n’obtiennent pas deux volumes différents pour faire réussir un test. Les intentions différentes sont reliées à une décision de programmation testable, mais aucune modification physique n’est retenue au prix d’une alerte supplémentaire. L’absence de différence retenue est expliquée : contraintes communes, prérequis manquants et rejet documenté du candidat.
''')
write('PHYSIOLOGICAL_STIMULUS_SELECTION.md','''# Sélection et programmation depuis les priorités

## Extension livrée

`deriveV23Programming` consomme les demandes V22 déjà calculées par les véritables fonctions TFCLab. Seule une demande de fondation déjà candidate, avec TTE vélo observé positif, ancre vélo disponible et preuve datée, peut proposer ici une priorité vélo. Une estimation seule ou une métrique inconnue ne suffit pas. Les familles sont celles du catalogue existant ; aucune dose universelle n’est calculée.

La politique optionnelle de `buildProspectiveCalendar` influence l’ordre de traitement des rôles, l’ordre des préférences de familles déjà disponibles et une préférence de placement d’une longue vélo prioritaire seule après le repos existant, lorsque le calendrier le permet. Les rôles essentiels, sources, durées, interdictions et disponibilités restent inchangés. C’est une **convention de programmation candidate et réversible**, pas une loi physiologique ni un bénéfice démontré.

## Essai et rejet

Pour B, la variante isole la longue vélo du mardi en déplaçant deux nages par semaine de charge : six placements changent, sans changer un ID ou une minute. Le validateur historique ajoute un avertissement `anti_repetition` en S3 (35→36 avertissements). V23 ne supprime pas cette alerte, ne réordonne pas artificiellement l’export pour la cacher et ne prétend pas qu’elle est invalide.

Le filtre de non-régression rejette ce candidat et conserve le calendrier V22. Trois contextes le proposent dans la cohorte de huit cas (B, B capacité réduite, B récupération adverse) ; tous trois sont conservés en `rejectedProgrammingAttempt`, avec l’alerte et les mouvements. Zéro modification de calendrier retenue. Les contrôles de capacité et de récupération restent actifs indépendamment de ce rejet.

## Ce qui reste différé

A n’a pas de demande ciblée actuellement admissible autorisant une nouvelle dose VO₂/seuil/force. B justifie une intention de maintien d’intensité, sans prouver qu’ajouter du volume est opportun. Le contrefactuel sans TTE observé ne reçoit pas de priorité vélo à partir de son seul TTE estimé ; il peut aussi produire d’autres leviers TFCL, sans forcer leur identité.

Le temps disponible après minima reste inutilisé sans justification source-spécifique. Aucun changement d’intensité, de repos, de catégorie de séance ou d’enveloppe n’est introduit pour créer une différence.
''')
cap=['# Capacité actuelle, projection et assimilation','\n**Une enveloppe documentée dans un cas synthétique ne vaut ni preuve de tolérance d’une recette exacte ni adaptation observée.** Le contrat V23 sépare ces niveaux ; les valeurs V22 restent inchangées.','\n| Notion | Traitement |\n|---|---|','| Enveloppe actuelle déclarée | Origine préenregistrée conservée, indépendante du niveau qualitatif |','| Capacité présumée | Ne reçoit aucune valeur de remplacement ; source-specific capacity proven reste false |','| Dose future conditionnelle | Comparée à l’enveloppe actuelle et aux conditions datées ; pas actuellement dans l’enveloppe si elle la dépasse |','| Progression assimilée | Aucune observation réelle, donc null ; jamais acquise par le passage des semaines |','''\n## Cas95 contre90

En S3 A/B,95 minutes de course dépassent l’enveloppe90. `currentlyWithinEnvelope=false`, `currentIndividualDoseApproved=false`. Le calendrier peut conserver cette perspective conditionnelle, mais la dose n’est jamais déclarée actuellement admissible.

L’alternative90 est examinée avec la source d’origine, les bornes temporelles, le catalogue et le contrat canonique. Elle échoue au floor natif95 ; pour cette source, la preuve temporelle complète de l’alternative reste également insuffisante. Aucune séance n’est raccourcie ou substituée silencieusement. Le floor est identifié comme convention de programmation, pas comme minimum physiologique universel ; le moteur ne s’autorise pas à le modifier.

Le contrefactuel fixe une enveloppe course75 avant calcul. S1 à80, S2 à90 et S3 à95 sont explicitement hors enveloppe. Pour la source A_RUN_Z2_EASY, l’alternative75 conserve échauffement10, corps55, retour au calme5 et éducatifs5 ; elle reste refusée car le floor80/90 n’est pas satisfait. Préserver la recette ne suffit donc pas à préserver toutes les obligations.

| Cas | Conflits d’enveloppe actuels/futurs explicités | Alternatives rejetées |\n|---|---:|---:|''']
for s in summaries:cap.append(f"| {s['caseId']} | {s['currentEnvelopeConflicts']} | {s['rejectedAlternatives']} |")
cap.append('''
Total :9 alternatives rejetées sur les huit cas,0 appliquée. Les valeurs et répétitions des sources restent intactes. Les conflits sont séparés des erreurs structurelles de calendrier et des conditions de récupération.

## Réponse défavorable

Le cas préenregistré de récupération vélo incomplète avant S2 ajoute un arrêt à la réservation précise vélo long/S2. Il change le statut du bloc de candidat complet conditionnel en incomplet/refusé. Les autres séances et minutes ne sont pas compensées ; les semaines suivantes ne sont pas déclarées assimilées. L’observation est synthétique, ne constitue pas un avis coach humain et ne donne aucune nouvelle capacité.
''')
write('INDIVIDUAL_CAPACITY_CONTRACT.md','\n'.join(cap))
write('RUN_REFERENCE_CONFLICT.md','''# Conflit de référence course A — dossier pour le chantier physiologique

**Calculs de production inchangés. Aucun envoi à un tiers effectué.** Le paquet reproductible `RUN_REFERENCE_HANDOFF.json` conserve les valeurs, réponses des fonctions réellement exécutées et six empreintes de sources. Les entrées V22 ne sont pas corrigées pour obtenir un résultat favorable.

## Chaîne retrouvée

1. V22 enregistre VMA15km/h, allure seuil290s/km, VLamax course0,3 et `runEconomyScore=3`.
2. `computeDiagnostic.computeRunMLSS` calcule la vitesse seuil depuis l’allure, puis le rapport vitesse seuil/VMA :82,8% après son arrondi existant.
3. Le même appel transmet directement `input.runEconomyScore` comme second argument de `predictRunMLSSPctFromVLaCE`.
4. Ce prédicteur documente un **coût en ml O₂/kg/km**, borne l’entrée CE à150–280 et la sortie à55–95. L’entrée numérique3 atteint donc la borne CE150 ; l’appel réel renvoie95%, contribution VLamax10,11 points et CE−10,5 points.
5. `crossValidateRunMLSS` renvoie82,8−95=−12,2 points, sévérité critique. Les sept réservations course A restent refusées.

## Diagnostic : ne pas conclure trop vite à un mauvais test

`vlamaxCapEstimator.ts` décrit ailleurs `runEconomyScore` comme un score0–100 ; le prédicteur de seuil attend un coût en oxygène. Le type DiagnosticInput ne déclare pas l’unité et aucune conversion n’existe à cette frontière. La fixture synthétique3 n’est pas établie comme mesure de CE. C’est un problème de sens/unité à clarifier ; il ne prouve pas que l’allure seuil de l’athlète soit erronée.

De plus, le rapport de vitesses seuil/VMA est documenté comme un proxy, tandis que le modèle exprime un pourcentage de VO₂max. Leur comparaison demande une justification de transférabilité. Une différence numérique ne suffit pas à démontrer un désaccord réel de deux mesures équivalentes.

Le transport TTE/VLamax V22 n’est pas la cause de cet écart : la reproduction appelle directement les fonctions existantes avec les mêmes valeurs et obtient le même résultat. Les conventions d’économie, la qualité de la fixture et la validité du modèle relèvent du chantier physiologique parallèle.

## Questions à transmettre

- Quelle unité et quelle échelle runEconomyScore doit-il porter dans chaque calculateur ?
- Où devrait être empêchée la confusion score/coût énergétique, sans conversion inventée ?
- Les deux pourcentages comparés représentent-ils la même grandeur avec une incertitude compatible ?
- Quelle preuve permettrait de résoudre la référence A sans remplacer une donnée conflictuelle par une valeur favorable ?

Aucun CE200, seuil ou autre référence de remplacement n’est inséré. Aucune formule ou alerte de production modifiée. Le dossier est prêt pour revue indépendante ; il ne déclare ni la formule validée ni le conflit résolu.
''')
write('FOUR_WEEK_VALIDATION_SCOPE.md','''# Contrôle candidat limité à quatre semaines

`validateFourWeekScopeV23` s’exécute en parallèle des validateurs historiques inchangés. Il ne transforme pas un préfixe en préparation Ironman complète et garde `fullIronmanPreparationValidated=false` ainsi que `currentlyPrescribable=false`.

## Contrôles exécutés

Couverture exacte S1–S4/28jours, schéma technique existant, quotas et budgets originaux, fréquences swim/bike/run/support, jours disponibles/repos/densité, source d’origine, chronologie sérialisée, floors, contexte de placement, espacement des longues et état conditionnel recalculé. L’enveloppe doit correspondre au profil préenregistré ; une capacité95 injectée pour faire passer la course95 est détectée.

Les unknowns de séance, conflits d’enveloppe, conditions futures et décisions coach ont des listes séparées. Zéro erreur structurelle dans les huit résultats retenus n’efface pas les refus A/C, la récupération adverse ou les recettes incomplètes.

## Quatre erreurs historiques conservées par cas

| Code brut | Pourquoi la portée16 semaines explique ce cas précis |
|---|---|
| race_day | La course déclarée est hors du bloc ; aucune course fictive ajoutée en S4 |
| calendar_coverage | Contrat complet16, préfixe exact1–4 observé |
| triathlon_discipline_continuity | L’audit complet porte sur les semaines futures absentes ; aucune violation de présence dans S1–S4 |
| triathlon_training_frequency | Les déficits du contrôle complet sont hors du préfixe ; fréquences natives respectées dans le bloc |

Les messages, codes et sévérités historiques sont gardés intégralement. La classification de portée est une annotation avec témoin (dates, semaines ou déficits), pas une modification de sévérité. Les avertissements historiques restent inchangés dans les résultats retenus.

## Tests négatifs importants

- Une semaine manquante empêche d’invoquer l’explication « préfixe exact1–4 ».
- Une nage supprimée est une vraie erreur de fréquence du bloc.
- Une durée sérialisée différente du registre est une erreur arithmétique/source.
- Une séance déplacée au lundi indisponible est refusée.
- Une compétition réellement dans le bloc ne bénéficie pas de l’exemption de portée.
- Une enveloppe relevée artificiellement, des conditions effacées ou une source modifiée sont détectées.

Ces refus viennent du contrat de bloc, sans changer un validateur existant ni ses seuils. Le contrôle ne prouve ni récupération obtenue, ni exécution complète d’une nage, ni dose individuelle optimale.
''')
comp=['# Comparaisons prospectives à entrées figées','\nTrois originaux V22 sont inchangés ; cinq contrefactuels distincts sont enregistrés avant calcul. Les deux versions reçoivent les mêmes entrées pour chaque cas. Aucune sélection manuelle de sortie favorable.','\n| Cas | Politique physiologique proposée | Placement retenu différent de V22 | Statut retenu | Refus / conditionnels | Avertissements avant → retenus |\n|---|---|---|---|---|---|']
for s in summaries:comp.append(f"| {s['caseId']} | {'Oui, essai rejeté'if s['rejectedTrial']else'Non : données/intention insuffisantes'} | Non | {s['retainedStatus']} | {s['states'].get('not_admissible',0)} / {s['states'].get('conditional_pending_reassessment',0)} | {s['historicalWarningsBefore']} → {s['historicalWarningsRetained']} |")
comp.append('''
## Interprétation des contrefactuels

- B avec références du limiteur différent : VO₂40 et TTE65 changent la décision réelle TFCL ; la nouvelle priorité vélo de fondation n’est pas imposée.
- B sans FTP : aucune ancre numérique vélo inventée ; pas de priorité personnalisée consommée.
- B avec plafond course75 : conflits et alternatives refusées malgré le niveau qualitatif inchangé.
- B avec récupération adverse : réservation vélo long S2 réellement mise en arrêt, statut de bloc changé, aucune compensation ailleurs.
- B sans TTE observé : l’estimation éventuelle et les autres leviers calculés ne deviennent pas automatiquement une preuve de priorité spécifique.

## Minutes par discipline et intention de catalogue

Les volumes et IDs retenus ne changent pas. Les familles ci-dessous sont des étiquettes descriptives du catalogue, pas une preuve d’adaptation ni une allocation causale de minutes au limiteur. Les minutes supplémentaires allouées à une formule de limiteur sont0. La famille «force» du tableau correspond au support/gainage de source, sans preuve de force maximale prescrite ou tolérée.

| Cas | Minutes par discipline sur4semaines | Minutes par intention du catalogue |
|---|---|---|
''')
for s in summaries:comp.append(f"| {s['caseId']} | {cell(s['minutesByDiscipline'])} | {cell(s['minutesByCatalogueIntent'])} |")
comp.append('Les signatures retenues séances/doses/jours sont identiques à V22. Les six mouvements de nage par essai ne concernent que les trois essais rejetés. Les dossiers conservent leurs32 annotations d’erreurs de portée (4parcas),9 conflits d’enveloppe et alternatives refusées, et les refus physiologiques propres à chaque profil.')
write('BEFORE_AFTER_PROFILES.md','\n'.join(comp))
coach=['# Comparaison pour le coach','\n**Aucune prescription approuvée.** Les calendriers retenus A/B/C restent ceux de V22 ; le dossier [quatre semaines V22](../v22/FOUR_WEEK_PLANS.md) conserve leurs consignes et repères. Les décisions V23 ci-dessous complètent ce dossier sans modifier les fiches.','\n| Profil | Ce qui est établi dans le cas synthétique | Ce qui reste à décider |\n|---|---|---|','| A | Levier VO₂ calculé, mais ciblage différé ; conflit course reproduit | Clarifier l’unité d’économie et la référence avec le chantier physiologique ; aucun remplacement favorable |','| B | Maintien d’intensité vélo observé limité ; priorité de programmation testée | L’essai de longue isolée ajoute une alerte : pas retenu automatiquement. Dose/course95, variantes, nage, force et posture restent conditionnelles |','| C | Références insuffisantes,26 refus conservés | Obtenir des références vérifiables avant prescription, sans inférer depuis le niveau |','\n## Résumé des quatre semaines retenues','\n| Profil | S1 | S2 | S3 | S4 | Point de capacité |\n|---|---:|---:|---:|---:|---|']
for s in summaries[:3]:coach.append(f"| {s['caseId']} | {s['weeks'][0]['minutes']} | {s['weeks'][1]['minutes']} | {s['weeks'][2]['minutes']} | {s['weeks'][3]['minutes']} | {'95 course contre90 en S3, non actuellement admissible'if s['currentEnvelopeConflicts']else'Les ancres manquantes interdisent la prescription'} |")
coach.append('''
## Essai de placement pour B : non retenu

La longue vélo reste mardi. Dans l’essai, catch nage passe mardi→mercredi et catch/pull mercredi→jeudi en S1/S2/S3, pour laisser la longue seule. Le temps et les sources sont identiques. L’alerte anti-répétition augmente de35à36 : la variante est gardée pour examen, le calendrier précédent est retenu. Ce n’est pas une amélioration physiologique démontrée.

## Décision nouvelle sur la récupération

Dans le cas défavorable, vélo long S2 à130min reste dans le calendrier comme réservation mais porte maintenant un refus explicite de réalisation. Le bloc n’est plus présenté comme candidat complet conditionnel. Aucun temps n’est réaffecté et aucune séance suivante n’est déclarée assimilée. La réaction est synthétique, pas une revue humaine effectuée.

## Ce que le coach ne doit pas conclure

Des minutes dans une enveloppe ne prouvent pas la tolérance de la recette exacte. Un calendrier de quatre semaines n’atteste pas une préparation Ironman16semaines. L’égalité des volumes A/B ne masque pas un choix automatique de dose optimale ; les preuves pour une différence sont insuffisantes. La revue doit distinguer priorités, possibilité de calendrier, capacité actuelle, exécution de source et réponse réellement observée.
''')
write('COACH_COMPARISON.md','\n'.join(coach))
write('V23_RESULTS.md','''# Résultats V23

**DRAFT — NO-GO.** V23 relie les intentions au moteur existant, teste une politique de programmation réelle et refuse de la conserver lorsqu’elle ajoute une alerte. Aucun second moteur, recherche générale ou migration.

## Capacités développées

1. Pont exécuté limiteur/levier → famille/rôle/priorité → sélecteur/placement. La demande fondation vélo observée de B produit six changements de placement dans l’essai, sans modifier les doses. Le filtre de non-régression rejette la variante ; calendrier V22 conservé.
2. Contrat explicite d’enveloppe actuelle, dose future et assimilation :95min contre90 n’est pas actuellement admissible. Neuf alternatives sont examinées et refusées, notamment pour floor natif ; aucune réduction cachée.
3. Récupération défavorable désormais appliquée à la réservation vélo S2 et à la décision du bloc. Cette amélioration fonctionnelle est démontrée avec les entrées préenregistrées ; aucune nouvelle hypothèse de dose nécessaire.
4. Validation quatre semaines parallèle, capable de distinguer les quatre erreurs historiques de portée des défauts réels de fréquence, temps, jour, source ou capacité. Aucune sévérité historique modifiée.
5. Dossier reproductible du conflit A : frontière score d’économie/coût énergétique suspecte, calculs et références inchangés, revue physiologique parallèle requise.

## Résultats vérifiés

- 3profils originaux inchangés +5contrefactuels,8blocs/240réservations/224jours examinés.
- 3variantes de priorité rejetées,0modification physique de calendrier retenue. Volumes A/B identiques et justifiés ; aucune différenciation de dose validée.
- 9conflits d’enveloppe et9alternatives refusées explicites ;1arrêt de récupération appliqué au cas défavorable.
- A conserve7refus course, C26refus ; B reste30réservations conditionnelles, pas une prescription validée.
- 4erreurs historiques de portée conservées par cas ;0erreur des contrôles structurels de bloc sur les sorties retenues. Unknowns/conditions/refus restent séparés et non approuvés.
- 25tests V23 passent au build et au rejeu ;27tests V22 et175tests de non-régression passent,5archivages antérieurs non activés. TypeScript passe.
- Vérificateur indépendant stdlib : signatures, sources, arithmétique, enveloppes, refus/rejets et2fichiers logiques identiques au rejeu.
- 4590anciens fichiers inchangés ; seules2fonctions expérimentales existantes sont étendues, défaut V22 rejoué à l’identique.920sources/2425variantes/600configurations/96chronologies/418vues/15fixtures préservées.

## Limites et suite

La politique de placement est candidate, pas un bénéfice sportif démontré. Les doses par limiteur, l’exécution des recettes de nage/force/posture, les variantes et la capacité95restent non établies. Les calendriers retenus ne changent pas pour forcer une différence ; la donnée ou convention permettant une autre prescription reste à démontrer.

Le chantier physiologique doit clarifier les unités d’économie et la comparaison des pourcentages avant de lever le conflit A. Les règles de récupération ou les floors ne sont pas modifiés. Aucun CE, test ou capacité de remplacement inventé.

Zéro approbation individuelle, zéro revue sportive humaine. Aucune production, donnée réelle, écriture Nolio, API payante, fusion ou déploiement. Toutes les preuves V2–V22 restent intactes.
''')
write('REPRISE.md','''# Reprise après V23

**DRAFT — NO-GO.** Baseline : `e449f302f4ebd8d7c5713bafe0596d4e61d70aae`. Branche `experiment/det-engine`, PR420 brouillon. Vérifier le head distant avant de reprendre.

## État retenu

Calendriers A/B/C et doses V22 conservés. Les priorités sont désormais transmises à la programmation, mais les trois essais de longue vélo isolée ajoutent une alerte et sont rejetés. Aucun bénéfice ni dose optimale revendiqué. A garde7refus, C26, B30réservations conditionnelles. Dans le contrefactuel défavorable, S2 vélo est mise en arrêt et le bloc devient incomplet/refusé.

95min course S3 contre90 reste hors capacité actuelle. Alternative90refusée car floor95 inchangé et preuve temporelle complète insuffisante. Les9alternatives de la cohorte sont conservées, jamais appliquées. La réévaluation ne crée pas d’adaptation.

## Artefacts et contrôles

- `inputs.json` : cinq deltas contrefactuels fixes ; SHA des entrées V22 conservé.
- `evidence/validation-1/build/results.json.gz` et `replay` : version retenue, traces initiales, essais rejetés, états, contrôle4semaines et sorties historiques intégrales.
- `evidence/development-*`, `qualified`, `final-probe` : essais antérieurs conservés, à ne pas additionner comme de nouveaux cas. Un test intermédiaire supposait à tort un levier Z2 dans le cas estimé ; le contrat a été corrigé pour vérifier les décisions réellement calculées, sans changer l’entrée.
- `decision-chains.jsonl`, `case-summary.json`, `RUN_REFERENCE_HANDOFF.json` : traces, bilan et paquet pour la revue physiologique parallèle.
- `evidence/independent-1.json`, `commands.json`, `source-pins.json` : audit et empreintes du code exécuté.
- `state.json`, `CYCLE_LOG.jsonl`, `final-integrity.json` : budget fixe et clôture.

## Prochain travail utile

1. Clarifier score/coût énergétique dans le chantier physiologique ; ne pas modifier concurremment les calculateurs et ne pas insérer une référence favorable.
2. Revue de la variante de placement et de son avertissement ; aucune désactivation de l’alerte ou variation artificielle de séances.
3. Preuve source-spécifique de capacité, récupération et recette pour une adaptation de dose acceptable. Si la capacité ne permet pas le floor, conserver le refus ou demander un arbitrage méthodologique explicite.
4. Étendre les demandes admissibles seulement avec données pertinentes : pas de VO₂/TTE→minutes universelles ni de HIIT imposé.

## Reprise idempotente

Budget V23 unique60min/10unités, sans renouvellement ni relance automatique. Ne pas relancer les unités clôturées V2–V23. Le contrôleur exige des sorties neuves et épingle le code ; une nouvelle session demande un nouveau registre autorisé. Audit en lecture : `PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v23-independent.py /tmp/v23-recheck.json` sur un chemin neuf.

Aucun changement production/catalogue/validateur historique, donnée réelle, migration, Nolio ou appel payant. Le quota exact de crédits n’est pas visible ; aucun coût externe engagé. La PR reste brouillon et NO-GO.
''')
write('README.md','''# DET-ENGINE V23 — programmation physiologique et sécurité des décisions

**DRAFT — NO-GO.** [Résultats](V23_RESULTS.md) · [Chaîne de décision](DECISION_CHAIN_DIAGNOSIS.md) · [Stimuli](PHYSIOLOGICAL_STIMULUS_SELECTION.md) · [Capacités](INDIVIDUAL_CAPACITY_CONTRACT.md) · [Conflit course](RUN_REFERENCE_CONFLICT.md) · [Portée4semaines](FOUR_WEEK_VALIDATION_SCOPE.md) · [Avant/après](BEFORE_AFTER_PROFILES.md) · [Dossier coach](COACH_COMPARISON.md) · [Reprise](REPRISE.md).

Le lien intention→programmation est exécuté, la variante ajoutant une alerte est rejetée, et les calendriers V22 sont conservés. Améliorations retenues : arrêt de récupération réellement appliqué, contrat de capacité explicite et validation de bloc séparée. Aucune dose ou adaptation individuelle approuvée.
''')
print(json.dumps({'requiredReports':9,'machineDecisionChains':len(chains),'cases':len(summaries),'actualApprovals':0}))
