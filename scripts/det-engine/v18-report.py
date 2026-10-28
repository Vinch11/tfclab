"""Produce a readable, offline review dossier from accepted V18 evidence only."""
import pathlib,json,gzip,csv,datetime,hashlib,html
D=pathlib.Path('docs/det-engine/v18');state=json.loads((D/'state.json').read_text());now=datetime.datetime.now(datetime.timezone.utc)
assert state['status']=='in_progress_no_go'and now<datetime.datetime.fromisoformat(state['deadline'].replace('Z','+00:00'))
assert state['units'][8]['status']=='passed'
P=pathlib.Path(state['units'][8]['evidence']);B=P/'build';rel=str(P.relative_to(D));summary=json.loads((B/'summary.json').read_text());audit=json.loads((P/'independent.json').read_text());assert not audit['failures']
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
C=load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');R=load(B/'recipes.jsonl.gz');M=load(B/'models.jsonl.gz');V=load(B/'variants.jsonl.gz');O=load(B/'outputs.jsonl.gz');comparison=json.loads((B/'comparison.json').read_text());roots=json.loads((B/'root-causes.json').read_text());family=json.loads((P/'family/family-review.json').read_text());selection=json.loads((P/'selection-evidence/selection-sensitivity.json').read_text());commands=json.loads((P/'commands.json').read_text());oldO=load('docs/det-engine/v17/evidence/outputs-final/outputs.jsonl.gz')
byid={c['identity']['legacyId']:i for i,c in enumerate(C)}
def put(name,text):
 p=D/name;assert not p.exists(),('NO_OVERWRITE',p);p.parent.mkdir(exist_ok=True,parents=True);p.write_text(text if isinstance(text,str)else json.dumps(text,ensure_ascii=False,indent=2)+'\n')
def table(headers,rows):return'| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+''.join('| '+' | '.join(str(x).replace('|','/')for x in row)+' |\n'for row in rows)
def link(name,target):return f'[{name}]({target})'
no_go='Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.\n\n'
classes=['complete','partial','ambiguous','contradictory','descriptive_non_metabolic'];labels=['Chronologie générique complète','Partielle','Ambiguë','Contradictoire','Descriptive / non métabolique']
metrics=table(['Mesure','V17','V18'],[(label,summary['baselineCounts'][key],summary['counts'][key])for key,label in zip(classes,labels)]+[('Rendus coach',920,summary['coachRenders']),('Contrats texte locaux acceptés après gardes',833,summary['textNolioPass']),('Encodages structurés locaux, ancres explicitement synthétiques',12,summary['structuredNolioPass']),('Variantes autonomes entièrement structurées',0,summary['variantClasses']['fully_structured']),('Liaisons paramétriques locales vérifiées',0,summary['variantInstances']),('Validation scientifique individuelle / experte',0,0)])
sports=table(['Discipline canonique','Total','Complètes','Partielles','Ambiguës','Contradictoires','Descriptives'],[(sport,n['total'],*[n[k]for k in classes])for sport,n in summary['bySport'].items()])
put('README.md','# DET-ENGINE V18 — compilation et exécution multimodale\n\n'+no_go+f"Baseline `{state['baseline']}`. Les 920 objets canoniques V16 sont réutilisés sans conversion supplémentaire ; les 67 témoins complets V17 sont conservés à l’identique. {audit['completeChecked']} chronologies complètes sont contrôlées indépendamment.\n\n"+metrics+'\nLe gain de 8 chronologies ne résout pas les inconnues de récupération, de transition ou de capacité individuelle. Il ne démontre pas une qualification sportive massive. Les nouveaux modèles donnent une représentation dédiée aux familles auparavant aplaties en chronométrie cardio.\n\n'+table(['Dossier','Contenu'],[
 (link('Causes racines','ROOT_CAUSES.md'),'700 fiches incomplètes V17, groupes chevauchants et choix refusés'),(link('Compilateur et résultats','COMPILATION_RESULTS.md'),'Grammaires, tableau par sport, 75 témoins et garde des 67'),(link('Force','STRENGTH_MODEL.md'),'127 modèles, inconnues de charge et temps conservées'),(link('Natation','SWIM_GRAMMAR.md'),'119 modèles, distances / temps et CSS séparés'),(link('Brick et mixed','MULTIMODAL.md'),'87 modèles, transitions non remplacées par zéro'),(link('Variantes','VARIANTS.md'),'2 425 textes, six liaisons paramétriques contrôlées'),(link('Revue scientifique par familles','SCIENCE_FAMILIES.md'),'Neuf briefs de revue, aucune promotion'),(link('Coach et Nolio','COACH_NOLIO.md'),'920 rendus et refus de transport explicites'),(link('Consultation coach hors ligne','coach-library.html'),'Télécharger/ouvrir localement : recherche dans les 920 fiches, aucune connexion'),(link('Validation','VALIDATION.md'),'Tests, contrôle indépendant et rejeux'),(link('Résultats','V18_RESULTS.md'),'Avancées et limites'),(link('Journal','JOURNAL.md'),'Échec intermédiaire et réparation isolée'),(link('Reprise','REPRISE.md'),'Registre borné et prochaines conditions')])+'\nLes fichiers CSV fournissent les listes exactes : [920 recettes](RECIPES.csv), [2 425 variantes](VARIANTS.csv), [920 qualifications conservées](QUALIFICATION_MATRIX.csv). Les six flux enrichis sont archivés et hachés dans '+link('les preuves',rel+'/build/checksums.json')+'.\n')
rootrows=sorted(roots['groups'].items(),key=lambda kv:-kv[1]['count'])
put('ROOT_CAUSES.md','# Causes communes — cohorte fixe V17\n\n'+no_go+f"Population : {roots['population']} IDs (299 partiels + 401 ambigus). Un ID peut apparaître dans plusieurs groupes ; les lignes ne s’additionnent pas. Les exemples et toutes les listes d’IDs sont dans [root-causes.json]({rel}/build/root-causes.json).\n\n"+table(['Cause enregistrée V17','IDs distincts','Exemples reproductibles'],[(reason,g['count'],', '.join('`'+x+'`'for x in g['ids'][:3]))for reason,g in rootrows])+'''

| Famille / hypothèse | Positif | Négatif | Risque et décision |
|---|---|---|---|
| Frontières lexicales des unités | `15' Z2 haut` contient 15 minutes, jamais 2 heures supplémentaires | `2h30` reste une durée réelle | Défaut logiciel démontré ; corriger les frontières, sans réécrire les zones |
| Quantité d’une activité nommée | `gainage doux 2min` contient une durée écrite | `gainage doux` n’en contient aucune | Ne pas inventer durée, charge ou équivalence avec la course |
| Cycle fermé / séries imbriquées | Travail + récupération écrits dans les crochets ; repos explicitement « entre séries » | `r=2min` sans occurrence finale | Résoudre uniquement la relation écrite ; pas de choix n−1/n pour entrer dans le créneau |
| Total avec phase finale | `60–90' Z2 avec 20' finish Z3` | `finish si frais` | Phase incluse, non ajoutée ; condition non résolue reste bloquante |
| Distance et cible relative | Distance nage + paramètre CSS séparé | CSS crawl appliquée à brasse ou éducatif | Paramètre de cible non converti en temps d’exécution |
| Transition | `<5min` donne une borne supérieure stricte, un minimum inconnu | Transition absente | Ni zéro ni durée implicite ajoutée |
| Variante de durée | Un seul nœud temporel source, variante entièrement quantitative | Recette warm-up / main / cool-down + durée isolée | Six liaisons candidates seulement ; aucune suppression implicite d’un composant |

'''+f"Gain réalisé : {summary['sourcePartsPreviouslyUnknownNowStructured']} parties auparavant `unknown` devenues structurées, sur {summary['sourcePartsProgressDistinctIds']} IDs ; {len(summary['newComplete'])} chronologies supplémentaires. Les parties reconnues peuvent rester bloquées par une autre inconnue. [Détail par partie]({rel}/build/source-part-progress.json).\n\nLa réparation de grammaire bénéficie aux familles récurrentes ; elle ne suffit pas à compléter les sources qui ne précisent pas les repos, les consignes d’exercices ou les transitions. Aucun overlay sportif de correction de dose n’a été appliqué.\n")
put('COMPILATION_RESULTS.md','# Compilateur V18 et résultats\n\n'+no_go+'''IR `tfcl-recipe-ir-1.1.0`, modèle multimodal `tfcl-multimodal-execution-1.0.0`. L’extension V18 reste séparée du compilateur V17 et de la production. Quantités dimensionnées, séries, répétitions, repos et sources UTF-16 restent vérifiables. Les catégories temporelles gardent la même portée qu’en V17.

Grammaires ajoutées : frontières de mots et secondes typographiques, activité explicitement chronométrée, cycle fermé avec commentaire conservé, séries de cycles avec repos explicitement entre séries, récupération écrite après chaque répétition y compris la dernière, total avec finish inclus, conteneur dont la somme est exacte, alternatives typées non sélectionnées et distance natation séparée d’un paramètre CSS. Les tests de grammaire sont des chaînes syntaxiques, jamais de nouvelles séances ajoutées au catalogue.

Une durée entre répétitions est n−1 uniquement si « entre » est écrit. Un `r=` nu reste inconnu. Les répétitions à durée variable conservent les bornes ; les valeurs partagées d’un même paramètre source restent identiques dans le témoin. Une variante non choisie n’acquiert pas de durée.

'''+sports+'\n'+metrics+'\nIDs nouvellement complets :\n\n'+''.join('- `'+x+'` : '+str(R[byid[x]]['witness']['seconds']/60)+' minutes dans le témoin générique.\n'for x in summary['newComplete'])+f"\nLes {summary['preservedV17Complete']} témoins V17 sont identiques, y compris la présence de l’éducatif optionnel. Tous les {audit['completeChecked']} témoins sont vérifiés par Python sans importer le compilateur JS. [Preuve]({rel}/independent.json).\n\n"+'''La troisième contradiction est une découverte de source, pas une séance ajoutée ou une baisse du seuil : `S2R_WALK_RUN_1_2` annonce 24–30 minutes ; 5 minutes de marche + 8×(1 minute de trot + 2 minutes de marche) + 5 minutes de marche + 3 minutes de mobilité = **37 minutes**. La source reste intacte et l’export est refusé. Les deux contradictions V17 persistent : brick de 55 minutes actives pour une enveloppe de 30–45, et recette course de 49 minutes pour un minimum annoncé de 50. Ce dernier écart n’est pas présenté comme une minute de danger physiologique.

Les trois fiches dont le champ canonique discipline vaut `trail` restent partielles. Des fiches trail sont aussi classées historiquement `run` ; le gain `A_TR_FLAT_SUPPORT_END` n’est ni une couverture de tous les trails ni un plan trail complet. Aucun nouveau plan n’a été produit.
''')
put('STRENGTH_MODEL.md','# Force — exécution spécifique\n\n'+no_go+f"Les {summary['strengthModels']} fiches restent disponibles et descriptives/non métaboliques dans la classification historique. Elles portent {summary['strengthBlocks']} blocs d’instructions/exercices structurés, pas {summary['strengthBlocks']} séances nouvelles. Le vérificateur indépendant contrôle {audit['strengthSourceEvidenceChecked']} preuves littérales de séries, répétitions, tempo, repos, charge, contraction ou circuit.\n\n"+'''
Chaque bloc conserve son libellé source, sa partie, son ordre, ses instructions complètes et ses offsets. Les titres A/B/C/D ou listes numérotées sont séparés lorsqu’ils sont explicites. Les listes compactes restent des blocs source ; un catalogue formel d’exercices et l’affectation d’une consigne globale à chaque exercice ne sont pas inventés.

| Champ | Traitement |
|---|---|
| Séries / répétitions | Littéraux écrits ; un `4×30s` ne devient jamais 30 répétitions |
| Tempo | Quatre nombres conservés ; ordre des phases non assigné s’il n’est pas nommé |
| Repos | Texte et quantités sources ; occurrence finale non supposée |
| Charge / mode | %1RM, RPE, RM, kg, poids de corps ou élastique seulement lorsqu’écrits ; charge individuelle inconnue |
| Contractions | Termes excentrique, concentrique, isométrique conservés ; pas d’inférence anatomique par le nom |
| Circuits | Ordre des blocs et annonces de tours/circuits ; portée globale à revoir si ambiguë |
| Durées | Durées écrites conservées comme preuves ; temps total d’un circuit non déduit des répétitions |
| Prérequis / restrictions | Objets canoniques inchangés ; aucune attestation de tolérance |

`C_STR_LOWER_PRO` conserve notamment squat, Romanian deadlift, Bulgarian split squat et mollets, leurs doses, charges/tempos et repos écrits. Les libellés historiques de zones ne sont **pas** une mesure de charge neuromusculaire. Le modèle est `structured_with_explicit_unknowns`, pas une autorisation d’exécution automatique. Le transport texte peut conserver la fiche ; le contrat cardio structuré ne suffit pas à représenter les charges et circuits.

[Exemple coach](examples/C_STR_LOWER_PRO.md). Aucun des 127 programmes n’a reçu une validation scientifique individuelle par cette conversion.
''')
put('SWIM_GRAMMAR.md','# Natation — structure, distance et temps individuel\n\n'+no_go+f"Les {summary['swimModels']} sources ont un modèle natation dédié : distances, répétitions, repos écrits, termes de nage et d’éducatifs, cibles relatives et inconnues. {summary['swimDrillEvidence']} occurrences techniques et {summary['swimRelativeTargetEvidence']} mentions de cible CSS sont conservées avec offsets.\n\n"+'''Une seconde de décalage CSS n’est pas une seconde d’exécution de la séance. L’absence de nage par défaut reste explicite. Une CSS crawl ne permet pas de chronométrer dos, brasse, papillon, multi-nages ou éducatifs.

Trois squelettes de protocole source sont complets selon la grammaire distance/temps écrite, sans témoin de durée individuelle :

'''+''.join('- `'+x+'`.\n'for x in summary['swimSourceProtocols'])+'''

`A_SWIM_CONTINUOUS_2K` contient réellement 400 m multi-nages + 2 000 m continus + 200 m dos, soit 2 600 m écrits. Le titre « 2K » ne réduit pas la séance à 2 000 m. La répartition interne du multi-nages et le choix de certains éducatifs demeurent des consignes source ouvertes à la revue ; ces trois structures ne sont pas des prescriptions individuellement exécutables.

Le scénario distance→temps requiert une référence explicitement propre à la nage, avec unité et provenance. Un exemple purement synthétique de 200 m crawl à 100 s/100 m vaut 200 s arithmétiques ; il n’atteste ni capacité, ni récupération, ni respect du créneau avec les autres parties. Les éducatifs refusent la réutilisation de cette référence. Les repos finaux non précisés restent ambigus et bloquent l’export machine qui exige leur nombre.

Aucune fiche natation n’est ajoutée au compte des 75 chronologies complètes. [Exemple coach](examples/A_SWIM_CONTINUOUS_2K.md).
''')
put('MULTIMODAL.md','# Bricks et mixed\n\n'+no_go+f"{summary['multimodalModels']} modèles couvrent exactement 55 fiches `brick` et 32 `mixed`. Un modèle n’équivaut pas à un brick admis ni à une occurrence de calendrier résolue.\n\n"+'''
Chaque partie conserve son ordre source, ses consignes, ses sous-nœuds, ses disciplines explicitement nommées, ses plages temporelles connues et les doses non attribuables. Les répétitions restent dans l’IR ; les mentions inline de discipline/transition sont des preuves littérales, sans fabrication d’un sous-calendrier.

- `BRICK_IM_Z2_RUN` conserve ses 90–150 minutes de vélo et 20–40 minutes de course. Sa transition absente reste `null`, jamais zéro.
- `ENR_BRICK_SWIM_BIKE` conserve sa transition `<5min` : maximum 300 secondes **strict**, minimum inconnu. Elle ne devient pas une transition fixe de cinq minutes.
- `ENR_RECUP_ACTIVE_MULTI` reste une fiche mixed ; sa phrase d’alternance n’est pas transformée en brick prescrit automatiquement.
- `REST_FULL_DAY` et les tâches mentales/restauratives restent des modèles descriptifs ; leur présence dans `mixed` ne leur attribue pas trois disciplines.

Les recettes de brick dont les sous-parties ou transitions manquent restent bloquées. Le rendu coach affiche les parties séparément et annonce les transitions inconnues. La sérialisation est du JSON expérimental TFCLab : elle ne constitue pas une API Nolio v2.

Le contrat local Nolio connu représente un événement avec un `sport_id`. Les 87 fiches brick/mixed sont refusées en transport événementiel mono-discipline ; elles ne sont ni aplaties en vélo/course ni éclatées silencieusement en faux événements datés. Un futur contrat doit préciser le regroupement, les identités d’occurrences, les transitions et le calendrier avant toute conversion machine fidèle.

[Brick](examples/BRICK_IM_Z2_RUN.md), [mixed de récupération](examples/ENR_RECUP_ACTIVE_MULTI.md).
''')
put('VARIANTS.md','# Variantes d’objectif\n\n'+no_go+table(['Catégorie','Nombre'],[(k,v)for k,v in summary['variantClasses'].items()])+'''

Les 2 425 textes, clés d’objectif, IDs source et empreintes sont conservés. Une variante autonome entièrement structurée n’est pas revendiquée : les descriptions ne nomment généralement pas toutes les parties nécessaires.

Six variantes se réduisent à une durée explicite sur une recette générique complète à un seul nœud temporel, sans warm-up/cool-down séparé à supprimer. La plage tient également dans l’enveloppe source. L’instanciation est versionnée, reliée au hash du texte et de la recette, garde l’ID historique et les restrictions, et produit un témoin arithmétique à la borne inférieure. Ce témoin n’est pas un choix optimal de dose ni une sélection automatique de l’ambition.

'''+table(['ID source','Objectif','Texte de variante','Témoin technique (min)'],[(v['legacyId'],v['goal'],v['sourceText'],v['instance']['executionWitness']['seconds']/60)for v in V if v['instance']])+'''

Les variantes de fréquence, placement ou intérêt qualitatif restent descriptives. Les durées isolées sur une recette à plusieurs parties, changements simultanés de discipline/intensité et progressions non mappées restent ambigus. Une plage en dehors de l’enveloppe générique est un conflit de portée à revoir, pas automatiquement une erreur physiologique.

Aucune séance essentielle, restriction, récupération ou transition n’est effacée. Les six liaisons demeurent soumises aux filtres sportifs, à la revue coach et à l’admission individuelle ; le sélecteur ne les applique pas silencieusement. [Liste exhaustive](VARIANTS.csv).
''')
put('SCIENCE_FAMILIES.md','# Qualification scientifique — revue par familles\n\n'+no_go+'''La matrice scientifique V17 de 920 lignes, ses 25 métadonnées physiologiques explicites et ses trois annotations documentaires sont conservées sans réattribution. V18 n’effectue pas une nouvelle revue systématique ni une nouvelle consultation externe des publications. Les liens bibliographiques ci-dessous renvoient à l’audit V8 et à ses limites de lecture, populations et transférabilité.

Les indices de file de revue proviennent des catégories éditoriales, disciplines, objectifs compatibles et zones littérales. Ils servent uniquement à répartir le travail de revue : aucune adaptation, mécanisme, efficacité ou référence de séance n’est attribuée par un nom ou un mot-clé.

'''+table(['Famille','Principe / limite','Preuve individuelle à examiner','Contexte V8'],[(b['family'],b['principle'],b['individualEvidenceForReview'],', '.join(b['contextReferencesInheritedFromV8'])or'aucune référence générale ajoutée')for b in family['briefs']])+'''

Lorang : les sources éditoriales L175/L417/L220 documentent individualisation, historique, feedback et ajustement des autres séances. Elles ne démontrent ni quota universel, ni durée optimale, ni tolérance acquise, ni questionnaire de fatigue obligatoire. La chaîne opérationnelle Profil→limiteurs→adaptations→stimuli→dose→organisation→récupération→réévaluation reste une formalisation TFCL candidate, pas une citation.

La conversion technique n’est pas une validation scientifique. Une série entièrement chronométrée peut garder une intention non explicitement qualifiée, des prérequis inconnus ou une intensité non individualisée. La force conserve sa charge musculaire non observée ; la natation sa vitesse par nage inconnue ; le trail sa tolérance verticale/excentrique inconnue ; l’Ironman son besoin de cohérence sur le calendrier intégral.

[Sources et limites V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md), [attribution Lorang](../v8/LORANG_METHODOLOGY.md), [annotations limitées V17](../v17/SCIENTIFIC_QUALIFICATION.md), [matrice des 920 fiches](QUALIFICATION_MATRIX.csv).
''')
put('COACH_NOLIO.md','# Coach et Nolio — trois niveaux distincts\n\n'+no_go+f"Les 920 rendus contiennent toutes les consignes originales, variantes et restrictions. [Consultation coach hors ligne](coach-library.html) ; les chaînes exactes sont aussi archivées dans [{rel}/build/outputs.jsonl.gz]({rel}/build/outputs.jsonl.gz).\n\n"+table(['Niveau','Résultat','Portée'],[('Coach TFCLab',920,'Lecture intégrale, source et inconnues conservées'),('Texte Nolio simulé après gardes',summary['textNolioPass'],'Contrat local actuel, pas acceptation distante ni prescription individuelle'),('Structuré local',summary['structuredNolioPass'],'Ancres et liaisons de domaines explicitement synthétiques'),('Bricks / mixed vers événement mono-discipline',0,'87 refus explicites, aucun aplatissement'),('Nolio v2',0,'Contrat machine officiel non disponible ; refus')])+'''

Les 833 compatibilités de schéma texte V17 ne sont pas toutes des transports admissibles : V18 refuse en plus les deux fiches de course connues contradictoires (`V3_RUN_10K_TEMPO_CRUISE`, `S2R_WALK_RUN_1_2`). Le brick contradictoire était déjà refusé pour sa structure multidisciplinaire. Le résultat passe donc à 831 sans modifier le contrat historique.

Les 13 encodages structurés emploient des ancres de **fixture** (FTP 250 W, vitesse MLSS 12 km/h) et une liaison coach candidate Z1→recovery / Z2→moderate_lt1, fournie explicitement. Les plages viennent exclusivement de `tfclDoctrine.ts`. Ils ne sont ni des zones d’un athlète réel, ni des séances individuellement admises. Le seul nouvel ID exportable localement est `A_TR_FLAT_SUPPORT_END`. Le finish Z3 explicite reste refusé en export machine tant que ses cibles par phase ne sont pas instanciées fidèlement.

Les récupérations finales indéterminées, alternatives non choisies, temps de nage individuels inconnus, cibles manquantes, charges de force et structures multidisciplinaires restent bloquants selon le format demandé. Un refus d’encodage n’efface pas la fiche coach. Aucun appel réseau ou événement Nolio réel n’existe dans cette couche.

Le vérificateur Python développe les répétitions des 13 payloads et compare chaque durée et note à l’IR, puis au total. Pour le texte, il contrôle les descriptions réelles des 831 payloads ; les hashes seuls ne sont pas utilisés comme preuve de non-perte.
''')
validation_rows=[(c['name'],c['exitCode'],c.get('error'),round(c['elapsedMs']/1000,2))for c in commands]
put('VALIDATION.md','# Validation exécutée\n\n'+no_go+table(['Commande','Code de sortie','Erreur de supervision','Secondes'],validation_rows)+f"\n[Reçus exacts]({rel}/commands.json), [reproductibilité multi-processus]({rel}/reproducibility.json), [contrôle indépendant]({rel}/independent.json). Tous les processus acceptés ont un code 0 et aucune erreur de supervision.\n\n"+'''
Tests nouveaux : compilation / refus / dimensions / modes / rendus sur les 920, sensibilité des sélecteurs et pipeline physiologique réel sur estimations synthétiques stockées, mutations de preuves contre fabrication/perte. Le contrôle Python n’importe ni le compilateur JS ni son évaluateur. Les mutations mettent également à jour la copie enrichie pour que l’échec ne repose pas seulement sur deux copies désaccordées.

Régression ciblée : contrats purs V17, catalogue/niveaux/objectifs, ancres physiologiques, doctrine des zones, prérequis de sécurité, contrats de catalogue et gardes expérimentaux V9–V15. Les campagnes V16/V17 et leurs registres clos ne sont pas relancés. Les trois tests historiques conditionnels déjà désactivés sont toujours indiqués comme skipped par leur suite ; aucun nouveau test n’a été neutralisé.

Les 600 configurations historiques ne sont pas rejouées comme nouveaux plans en V18 : leurs fichiers de référence restent byte-identiques avec tout le dépôt antérieur. La suite complète d’application et les accès Nolio réels ne sont pas revendiqués.

Les contrôles prouvent la fidélité technique dans leur périmètre ; ils ne prouvent ni réponse physiologique, ni récupération obtenue, ni qualité générale d’une préparation, ni revue experte.
''')
put('V18_RESULTS.md','# Résultats V18\n\n'+no_go+metrics+f"\nLes {audit['completeChecked']} témoins complets passent le contrôle indépendant ; {summary['preservedV17Complete']} conservent exactement leur témoin V17. {summary['sourcePartsPreviouslyUnknownNowStructured']} parties auparavant inconnues ont désormais une structure typée sur {summary['sourcePartsProgressDistinctIds']} IDs, avec les blocages résiduels conservés.\n\n"+'''Avancées démontrées : correction lexicale commune, grammaires composées bornées, structure de force spécifique, distinction distance/temps et nage en natation, représentation brick/mixed sans transition fictive, six liaisons de variantes non destructives, garde texte des contradictions, conservation des 920 rendus et qualification scientifique V17.

La qualification massive reste **incomplète** : 75 chronologies génériques complètes, aucune nouvelle approbation sportive, aucun brick complètement chronométré, aucun temps de nage individuel attesté, aucune source scientifique automatiquement promue. Les modèles dédiés ne doivent pas être additionnés aux 75 comme autant de prescriptions exploitables.

Décisions réellement ouvertes : clarifier les repos finaux et les variantes qui ne nomment pas leurs paramètres ; corriger les trois contradictions dans une source ou un overlay sportif revu ; documenter les références de nage par tâche et la tolérance musculaire lorsqu’elles deviennent nécessaires ; obtenir le contrat machine officiel multidisciplinaire avant export Nolio structuré. Ces besoins n’imposent pas de modifier la doctrine de production.

**Recommandation : maintenir DRAFT / NO-GO.** Les corrections techniques réversibles peuvent continuer avec un nouveau budget ; la promotion et les arbitrages sportifs ne sont pas autorisés par ce dossier.
''')
put('JOURNAL.md','# Journal des dix unités\n\n'+no_go+table(['Unité','Travail','Preuves'],[(i['unit'],i['name'],'preuves V18, tests ciblés puis validation globale')for i in state['units']])+'''

1. Baseline propre, HEAD V17 exact ; manifeste des 3 399 fichiers suivis existants, PR ouverte en brouillon.
2. Lecture des causes de 700 fiches incomplètes ; priorité à la grammaire, refus de choisir arbitrairement la récupération finale.
3. Candidats de grammaire conservés dans `candidate-1/2/3.json` et `candidate-build-*` ; comptes et limites restent visibles.
4. Une extension d’activité nommée a masqué le caractère optionnel d’un éducatif. Le test de témoin V17 et le contrôle indépendant ont échoué (`contracts-direct-2.txt`, `independent-attempt-2.json`). Cette interprétation n’a pas été acceptée. La voie optionnelle a été rétablie et les 67 témoins vérifiés à l’identique.
5. Le calcul exact du protocole marche/course a mis au jour 37 minutes contre une annonce 24–30. L’erreur source est conservée et l’export refusé ; aucune durée n’a été tronquée.
6. Des alternatives pouvaient être portées au mauvais niveau d’une répétition. Le candidat est archivé ; la grammaire atomique attache désormais le choix au repos concerné, en conservant son inconnue.
7. Le premier superviseur `spawnSync` remontait EPERM malgré une sortie 0, reproduit même sur `node --version` et `python3 --version`. Arrêt conservateur de `validation-1`, aucun vert forcé. Le diagnostic asynchrone ne présente pas cette erreur ; la supervision utilise les événements error/close et les mêmes limites, sans ignorer les erreurs.
8. Contrats texte : refus des deux sources course contradictoires, d’où 831 au lieu de 833 ; les 920 rendus restent disponibles. Aucun quota de réussite fixé.
9. Validation bornée, rejeu dans un autre processus, contrôle Python et mutations ; les corrections indépendantes sont conservées.
10. Dossier coach, registre, empreintes et mise à jour de la PR expérimentale ; aucune fusion, donnée réelle ou activation de workflow.

Toutes les sorties intermédiaires et erreurs sont conservées. La reprise n’est ni un processus permanent ni une promesse de redémarrage automatique.
''')
put('REPRISE.md','# Reprise V18\n\n'+no_go+f"Baseline V17 `{state['baseline']}`, branche `experiment/det-engine`. Début {state['startedAt']}, limite {state['deadline']}, maximum 10 unités, 2 Go par processus Node, 180 secondes par étape et un worker de validation. Aucun coût externe ni tâche permanente.\n\nPreuves acceptées : `{P}`. Lire README, V18_RESULTS, ROOT_CAUSES, VALIDATION et state.json. Les sources V16/V17, 600 références et les registres V2–V17 ne doivent pas être modifiés.\n\n"+'''Le compilateur V18 et ses modèles sont des fonctions pures réutilisables. `v18-build.mjs` écrit seulement dans un nouveau chemin V18 et refuse les registres clos/expirés ; le superviseur n’accepte que ses commandes fixes, trois tentatives et la branche expérimentale. Une relance ne doit pas écraser un sous-dossier existant ni compter une sortie partielle comme acceptée. Vérifier le PID et le reçu avant de libérer un verrou interrompu.

Pour la session suivante : nouveau mandat/budget et registre séparé, vérifier les empreintes et l’état distant, réutiliser les preuves sans rejouer les unités closes comme nouveau travail. Le vérificateur final de dépôt reste lisible sans modifier le registre. Les champs de réaction réellement observée restent inconnus ; aucune progression attendue ou conversion technique ne prouve une adaptation.

Priorités : clarification source des occurrences de repos et du périmètre des variantes ; poursuivre les grammaires dont des témoins écrits existent ; renforcer les modèles techniques sans inventer une dose ; revue scientifique individuelle progressive et contrat Nolio officiel avant tout transport multidisciplinaire.
''')
# Exact CSV registries.
def csvput(name,headers,rows):
 p=D/name;assert not p.exists()
 with p.open('w',newline='')as f:w=csv.writer(f);w.writerow(headers);w.writerows(rows)
csvput('RECIPES.csv',['legacy_id','sport','v17_class','v18_class','generic_witness_seconds','strength_model','swim_structure_status','multimodal_kind','unknowns'],[(r['legacyId'],c['prescription']['discipline'],cmp['before'],r['classification'],r['witness']['seconds']if r['witness']else'',bool(m['strength']),m['swim']['structureStatus']if m['swim']else'',m['multimodal']['kind']if m['multimodal']else'',';'.join(r['unknowns']))for c,r,m,cmp in zip(C,R,M,comparison)])
csvput('VARIANTS.csv',['legacy_id','goal','source_text','class','reason','instance_key','witness_seconds'],[(v['legacyId'],v['goal'],v['sourceText'],v['classification'],v['reason'],v['instance']['instanceKey']if v['instance']else'',v['instance']['executionWitness']['seconds']if v['instance']else'')for v in V])
queue=load(P/'family/review-queue.jsonl.gz');csvput('QUALIFICATION_MATRIX.csv',['legacy_id','review_priority','review_hints_not_efficacy','source_claim','explicit_physiology','evidence_level','scientific_validation','expert_review','new_references'],[(q['legacyId'],q['scientificQualificationV17']['reviewPriority'],';'.join(q['sourceReviewHints']),q['scientificQualificationV17']['sourceClaim'],json.dumps(q['scientificQualificationV17']['explicitPhysiology'],ensure_ascii=False),q['scientificQualificationV17']['applicableEvidenceLevel'],False,False,0)for q in queue])
put('dashboard.json',{'mission':'V18','status':'DRAFT_NO_GO','summary':summary,'independent':{k:v for k,v in audit.items()if k!='witnesses'},'comparability':'same 920 source records; dedicated models are not additional complete prescriptions','scientificPromotion':False})
examples=list(dict.fromkeys(summary['newComplete']+['C_STR_LOWER_PRO','A_SWIM_CONTINUOUS_2K','BRICK_IM_Z2_RUN','ENR_RECUP_ACTIVE_MULTI','S2R_WALK_RUN_1_2','V3_RUN_10K_TEMPO_CRUISE']))
for id in examples:put('examples/'+id+'.md',O[byid[id]]['coach'])
# One standalone read-only offline artifact, no hosting, external scripts or network.
data=[{'id':r['legacyId'],'sport':c['prescription']['discipline'],'before':cmp['before'],'after':r['classification'],'coach':o['coach']}for c,r,o,cmp in zip(C,R,O,comparison)]
jsdata=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
viewer='''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; object-src 'none'"><title>DET-ENGINE V18 — revue coach hors ligne</title><style>body{font:16px system-ui;max-width:95ch;margin:2rem auto;padding:0 1rem;color:#182b35;background:#f6f8fa}h1{font-size:1.6rem}input,select{font:inherit;padding:.5rem;margin:.3rem 0;max-width:100%}#pick{width:100%}pre{white-space:pre-wrap;line-height:1.55;font:inherit;background:white;padding:1.5rem;border:1px solid #ccd8df}#scope{padding:1rem;background:#fff0ca}label{display:block}small{display:block}@media print{input,select,label,small{display:none}pre{border:0;padding:0}}</style><h1>DET-ENGINE V18 — bibliothèque pour revue coach</h1><p id="scope">920 sources conservées. DRAFT — NO-GO. Consultation hors ligne uniquement. Aucun bouton de prescription ou synchronisation. Chronologie compilée ≠ séance individuellement admise ; aucune revue experte attestée.</p><label>Recherche par ID ou texte <input id="q" type="search"></label><label>Discipline <select id="sport"><option value="">Toutes</option></select></label><small id="count"></small><select id="pick" aria-label="Séance"></select><p id="status"></p><pre id="view"></pre><script type="application/json" id="records">'''+jsdata+'''</script><script>const rows=JSON.parse(document.getElementById('records').textContent),q=document.getElementById('q'),sport=document.getElementById('sport'),pick=document.getElementById('pick');for(const s of [...new Set(rows.map(r=>r.sport))]){const o=document.createElement('option');o.value=s;o.textContent=s;sport.append(o);}function show(){const r=rows.find(r=>r.id===pick.value);document.getElementById('view').textContent=r?r.coach:'Aucun résultat';document.getElementById('status').textContent=r?'V17 : '+r.before+' → V18 : '+r.after+' — statut technique, aucune admission individuelle':'';}function filter(){const term=q.value.toLocaleLowerCase('fr');pick.replaceChildren();let n=0;for(const r of rows){if(sport.value&&r.sport!==sport.value)continue;if(term&&!(r.id+' '+r.coach).toLocaleLowerCase('fr').includes(term))continue;const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' · '+r.sport+' · '+r.after;pick.append(o);n++;}document.getElementById('count').textContent=n+' / 920 fiches';show();}q.addEventListener('input',filter);sport.addEventListener('change',filter);pick.addEventListener('change',show);filter();</script></html>'''
put('coach-library.html',viewer)
# Known rejected evidence; preserving failures is deliberate.
put('rejected-and-unknown.json',{'rejected':[{'evidence':'evidence/independent-attempt-2.json','cause':'optional exercise scope changed by named-activity grammar','resolution':'preserve optional branch and V17 witness'},{'evidence':'evidence/validation-1/failure.json','cause':'spawnSync reports EPERM even on version commands','resolution':'strict asynchronous process supervision; no ignored error'}],'unresolved':roots['groups'],'newSourceContradiction':'S2R_WALK_RUN_1_2: 37min vs 24–30min advertised','automaticSportsOverlaysApplied':0})
print(json.dumps({'dossier':str(D),'records':920,'complete':summary['counts']['complete'],'examples':len(examples),'offlineViewerBytes':(D/'coach-library.html').stat().st_size,'acceptedEvidence':str(P)}))
