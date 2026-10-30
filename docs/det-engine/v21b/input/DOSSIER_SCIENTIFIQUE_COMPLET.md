# TFCLab — Dossier scientifique V21B : référentiel de 15 familles et transfert contrôlé vers Codex

**Date de recherche : 2026-10-29.** **Dépôt visé :** `Vinch11/tfclab`, branche `experiment/det-engine`, PR #420 DRAFT/NO-GO, V21A `36fa6b24`. **Aucune écriture GitHub/Nolio/production effectuée par cette recherche.**

## Synthèse et portée de la livraison

Ce dossier comprend **46 notices scientifiques ou consensus identifiés et contrôlés au moins au niveau des métadonnées/résumés**, **15 familles V21A**, **26 formulations scientifiques de contexte**, **13 extractions de protocoles explicitement visibles dans les résumés** et un contrat d’intégration sécurisé. Les références ne sont pas toutes de même niveau de preuve; elles ne sont **pas** toutes analysées en texte intégral. Ce dossier **ne déclare aucune des 920 séances ni leurs 2 425 variantes scientifiquement validées**, et aucune prescription individuelle n’est approuvée.

La couverture est **exhaustive sur les 15 thèmes** et opérationnelle pour l’étape de qualification, mais **pas** une revue systématique PRISMA exhaustive de chaque discipline ni une lecture intégrale de toutes les études primaires. C’est la frontière honnête de ce livrable. Les fiches et leurs SHA restent détenus par V21A; aucune association aux 920 IDs n’a été inventée hors de la branche.

## Mode de lecture des preuves

| Niveau | Portée | Peut-il piloter une dose individuelle ? |
|---|---|---|
| Publication / consensus vérifié | Résultat ou constat au niveau population/protocole rapporté | **Non** par simple présence de la citation |
| `family_context` | Mécanisme de recherche commun | **Non** |
| `workout_mechanism` | Lien vérifié à la structure d’une fiche exacte | **Non**, sauf contrôles supplémentaires |
| `exact_recipe_dose` | Essai/protocole suffisamment comparable, structure et repos vérifiés | **Toujours conditionnel** : admissibilité individuelle séparée |
| `individual_admissibility` | Références, tolérance et microcycle propres à l’athlète | Revue coach et contrôle de sécurité requis |

**Méthode** — Les documents PubMed ont été consultés dans le navigateur de recherche le 29/10/2026. Les informations de population/protocole sont reprises uniquement lorsque visibles dans leur résumé; les détails non visibles restent inconnus. La source canonique est l’article. Les URL PubMed/DOI servent de pointeurs pérennes; ce dossier ne possède pas les empreintes brutes des pages, donc `responseSha256=null`, et **ne revendique aucun accès intégral**. Les références aux entretiens Dan Lorang sont classées comme principes de coaching documentés, non essais contrôlés. Recherche ciblée et non exhaustive; des publications contradictoires peuvent encore exister.

## Résultats prioritaires, transversaux

**A. Récupération.** La reprise active après l’effort ne garantit pas une meilleure performance le lendemain; le repos passif peut favoriser la performance mécanique répétée dans certains HIIT. La synthèse 2026 chez des athlètes d’endurance ne démontre pas la supériorité systématique des modalités physiques sur le repos. **Implication :** les **416 conventions de récupération** V20 doivent rester candidates; ne pas choisir arbitrairement `n` ou `n-1` et ne pas donner au repos la zone du travail principal. Sources : [REC-01](https://pubmed.ncbi.nlm.nih.gov/29663142/), [REC-02](https://pubmed.ncbi.nlm.nih.gov/32744041/), [REC-03](https://pubmed.ncbi.nlm.nih.gov/42683395/).

**B. Force.** Les synthèses sur la course indiquent des bénéfices moyens des méthodes de force lourde/combinée sur performance et économie, sans gain démontré systématiquement de VO₂max. **Implication :** ne pas fusionner squat lourd, pliométrie, isométrie, gainage, corde de natation et basse cadence dans une unique « adaptation force ». Sources : [STR-01](https://pubmed.ncbi.nlm.nih.gov/38627351/), [STR-02](https://pubmed.ncbi.nlm.nih.gov/38165636/).

**C. Technique/économie.** Un changement de foulée observé n’est pas une économie énergétique mesurée; pour un apprentissage, il faut distinguer exécution, rétention, transfert et effet sur le coût. Source : [TEC-01](https://pubmed.ncbi.nlm.nih.gov/38268070/).

**D. Distribution d’intensité.** Les résultats de programme ne soutiennent ni une règle 80/20 universelle ni un rejet de la polarisation. Oliveira 2024 observe des avantages VO₂peak dans certains sous-groupes, alors que Rosenblat 2025 ne détecte pas de supériorité globale POL vs PYR et révèle un effet du niveau sportif. **Ce n’est pas contradictoire au point d’effacer les deux études** : les critères/populations/analyses diffèrent. Sources : [AER-01](https://pubmed.ncbi.nlm.nih.gov/38717713/), [AER-02](https://pubmed.ncbi.nlm.nih.gov/39888556/).

**E. VLamax.** La revue 2026 souligne des questions persistantes de définition, validation et utilité pour la performance prolongée. Un modèle est reproductible sans être juste pour chaque athlète : une étude de MLSS estimé rapporte des limites d’accord larges malgré une fiabilité acceptable. **Aucun seuil chiffré de VLamax, ni quota de force-endurance, n’est adopté automatiquement.** Sources : [VLA-01](https://pubmed.ncbi.nlm.nih.gov/41171430/), [VLA-02](https://pubmed.ncbi.nlm.nih.gov/40338332/).

**F. Durabilité.** Le degré de déclin après pré-fatigue dépend de l’exposition préalable, de l’intensité, de l’environnement et de l’alimentation. Cela ne se déduit pas d’une FTP, d’une VMA ou d’un TTE frais. Sources : [DUR-01](https://pubmed.ncbi.nlm.nih.gov/33886100/), [DUR-03](https://pubmed.ncbi.nlm.nih.gov/40150840/).

**G. Risques physiologiques.** Les protocoles de chaleur, nutrition, faible disponibilité glucidique et hydratation doivent être individuellement encadrés. La consigne LCW contenant `+500 mL/h de sommeil` reste **quarantinée** pour anomalie d’unité et exige une décision humaine; ne pas corriger en devinant. Sources : [NUT-01](https://pubmed.ncbi.nlm.nih.gov/28332114/), [NUT-04](https://pubmed.ncbi.nlm.nih.gov/37752011/), [HEAT-01](https://pubmed.ncbi.nlm.nih.gov/26002286/), [HEAT-03](https://pubmed.ncbi.nlm.nih.gov/28985128/).

## Dossiers par famille — mécanisme, preuve, dose et admission

### aerobic_endurance — Endurance aérobie

**Axe :** `mechanism`. **Sources principales :** [AER-01](https://pubmed.ncbi.nlm.nih.gov/38717713/), [AER-02](https://pubmed.ncbi.nlm.nih.gov/39888556/), [AER-03](https://pubmed.ncbi.nlm.nih.gov/20861519/), [DUR-01](https://pubmed.ncbi.nlm.nih.gov/33886100/).

**Ce que la littérature autorise au niveau famille :** L’endurance à intensité sous-maximale constitue un stimulus plausible dans un programme de longue durée. La distribution polarisée ne garantit pas la meilleure performance globale pour tous les athlètes.

**Ce qu’il est interdit d’en déduire automatiquement :** Z2 produit systématiquement une baisse de VLamax. 80/20 est la répartition optimale obligatoire. Une durée longue programmée prouve l’endurance individuelle acquise.

**Dose et portée :** Études comparant des PROGRAMMES sur semaines; aucune dose d’une séance individuelle n’est établie par ces revues.

**Données individuelles avant prescription :** ancre LT1 datée ou domaine opérationnel justifié ; discipline et historique de tolérance ; RPE/retour de séance ; disponibilité et charges croisées.

**Vérifications prioritaires sur les fiches :** périmètre exact des Z1/Z2 source ; durée effective versus réservation ; définition du volume faible intensité.

**Critères de suivi :** Performance, VO2peak, TTE, progression d’exposition et tolérance.


### vo2max — Stimuli VO2max

**Axe :** `mechanism`. **Sources principales :** [VO2-01](https://pubmed.ncbi.nlm.nih.gov/23539308/), [VO2-02](https://pubmed.ncbi.nlm.nih.gov/42237396/).

**Ce que la littérature autorise au niveau famille :** La structure travail/repos et la durée influencent le temps aigu passé à forte consommation d’oxygène. Un intervalle long peut produire davantage de temps proche de VO2max que certains formats très courts, mais la réponse varie.

**Ce qu’il est interdit d’en déduire automatiquement :** Titre VO2max = sollicitation VO2max atteinte. Minutes >90% VO2max = adaptation chronique garantie. Imposer une intensité FTP fixe pour tous.

**Dose et portée :** 239 protocoles aiguës de la revue 2026 ne déterminent pas le meilleur plan chronique individuel.

**Données individuelles avant prescription :** vVO2 ou pVO2 ou test valide selon sport ; contrôle tolérance intensité et récupération ; volume haute intensité sur semaine ; RPE et qualité répétitions.

**Vérifications prioritaires sur les fiches :** durées travail/repos exactes ; preuve du domaine à partir des tests disponibles ; conditions de progression.

**Critères de suivi :** VO2 mesurée/puissance aérobie et réponse répétitions.


### thresholds — Seuils et intensité soutenable

**Axe :** `mechanism`. **Sources principales :** [THR-01](https://pubmed.ncbi.nlm.nih.gov/21487146/), [THR-02](https://pubmed.ncbi.nlm.nih.gov/39196486/).

**Ce que la littérature autorise au niveau famille :** CP, MLSS et seuils sont des constructions et mesures liées mais non interchangeables sans méthodologie.

**Ce qu’il est interdit d’en déduire automatiquement :** FTP=MLSS=LT2=CP par définition. Séance au seuil a un avantage universel démontré sur les autres intensités.

**Dose et portée :** Aucune des sources examinées ne certifie les dosages exacts des 920 recettes de seuil.

**Données individuelles avant prescription :** définition et protocole de chaque ancre ; date du test ; erreur de mesure et domaine cible ; temps soutenable réel ou incertain.

**Vérifications prioritaires sur les fiches :** vérifier équivalence du repère au stimulus ; éviter seuils arbitraires ; sport, tests, zone de récupération.

**Critères de suivi :** TTE, référence soutenable, TT et tolérance.


### durability — Durabilité et fatigue prolongée

**Axe :** `mechanism`. **Sources principales :** [DUR-01](https://pubmed.ncbi.nlm.nih.gov/33886100/), [DUR-02](https://pubmed.ncbi.nlm.nih.gov/38871342/), [DUR-03](https://pubmed.ncbi.nlm.nih.gov/40150840/), [DUR-04](https://pubmed.ncbi.nlm.nih.gov/40640875/).

**Ce que la littérature autorise au niveau famille :** Un profil physiologique mesuré frais ne décrit pas à lui seul les performances après fatigue prolongée. Le préchargement, alimentation et environnement influencent le test de durabilité.

**Ce qu’il est interdit d’en déduire automatiquement :** TTE frais = durabilité. Une sortie longue prévue démontre adaptation future. Qualificatif coach résistant fatigue = preuve clinique.

**Dose et portée :** Protocoles très dépendants du préchargement; pas de plafond universel déductible.

**Données individuelles avant prescription :** épreuve fraîche et épreuve pré-fatiguée comparables ; travail préalable kJ/kg ou temps/intensité ; nutrition/chaleur ; historique tolérance et feedback.

**Vérifications prioritaires sur les fiches :** protocole de pré-fatigue ; validité cross-sport ; progressivité conditionnelle.

**Critères de suivi :** Déclin performance/physiologie à charge standardisée et feedback longitudinal.


### strength — Force et préparation musculaire

**Axe :** `mechanism`. **Sources principales :** [STR-01](https://pubmed.ncbi.nlm.nih.gov/38627351/), [STR-02](https://pubmed.ncbi.nlm.nih.gov/38165636/), [LOAD-01](https://pubmed.ncbi.nlm.nih.gov/32502973/).

**Ce que la littérature autorise au niveau famille :** Certaines formes de force lourde/combinée ou pliométrique améliorent performance et économie chez des coureurs entraînés. Des résultats de groupe n’authentifient pas chaque circuit de gainage.

**Ce qu’il est interdit d’en déduire automatiquement :** Tout renforcement améliore VO2max. Toute séance core prévient blessure. Force endurance basse cadence vélo = même preuve que squat lourd course.

**Dose et portée :** Études regroupées sur 6-40 semaines, souvent 1-4 fois/semaine: pas dose universelle d’une fiche TFCL.

**Données individuelles avant prescription :** exercice, séries, reps, intensité force, tempo, repos ; expérience technique, restrictions ; interférence avec séances endurance ; symptômes et tolérance musculaire.

**Vérifications prioritaires sur les fiches :** séparer isométrie, force lourde, pliométrie, circuit, corde nage ; prévenir durées calculées à partir de répétitions ; revue douleur.

**Critères de suivi :** Force, économie standardisée, performance, fatigue, symptômes.


### economy — Économie et coordination

**Axe :** `mechanism`. **Sources principales :** [STR-02](https://pubmed.ncbi.nlm.nih.gov/38165636/), [TEC-01](https://pubmed.ncbi.nlm.nih.gov/38268070/).

**Ce que la littérature autorise au niveau famille :** Des méthodes spécifiques de force peuvent améliorer le coût énergétique de la course. Un changement de mécanique de foulée ne garantit pas une économie améliorée.

**Ce qu’il est interdit d’en déduire automatiquement :** Éducatifs = gain mesuré d’économie. Une cadence universelle minimise le coût individuel.

**Dose et portée :** Travaux multi-semaines ou mécanismes; pas une dose validée de drills individuels.

**Données individuelles avant prescription :** vitesse/allure standardisée ; sport et mode de mesure ; capacité technique observée ; symptômes/réponse.

**Vérifications prioritaires sur les fiches :** séparer économie énergétique, coordination et performance ; contrôler effets adverses d’un changement forcé.

**Critères de suivi :** Coût énergétique à charge constante, transfert, performance.


### technique — Technique et apprentissage moteur

**Axe :** `mechanism`. **Sources principales :** [TEC-01](https://pubmed.ncbi.nlm.nih.gov/38268070/), [TEC-02](https://pubmed.ncbi.nlm.nih.gov/38678312/), [SWIM-03](https://pubmed.ncbi.nlm.nih.gov/34372755/).

**Ce que la littérature autorise au niveau famille :** Feedback, pratique et contexte peuvent modifier la réalisation du geste; rétention et transfert doivent être vérifiés.

**Ce qu’il est interdit d’en déduire automatiquement :** Feedback technique = économie améliorée. Drills systématiquement utiles sans déficit observable. Technique natation et foulée partagent une dose physiologique.

**Dose et portée :** Dosages spécifiques à l’apprentissage et à la population; pas de règle universelle.

**Données individuelles avant prescription :** critère technique mesurable ; mode de feedback, contexte de pratique ; qualité sous fatigue ; symptômes et rétention.

**Vérifications prioritaires sur les fiches :** drills vs posture aéro vs mobilité ; rétention hors feedback ; ne pas confondre technique et métabolisme.

**Critères de suivi :** Précision geste, rétention, transfert, économie si mesurée.


### recovery — Récupération et gestion fatigue

**Axe :** `mechanism`. **Sources principales :** [REC-01](https://pubmed.ncbi.nlm.nih.gov/29663142/), [REC-02](https://pubmed.ncbi.nlm.nih.gov/32744041/), [REC-03](https://pubmed.ncbi.nlm.nih.gov/42683395/).

**Ce que la littérature autorise au niveau famille :** Repos entre efforts, cool-down et séance facile séparée répondent à des questions distinctes. Le cool-down actif n’améliore pas systématiquement la performance au lendemain.

**Ce qu’il est interdit d’en déduire automatiquement :** Diminution lactatémie = récupération musculaire prouvée. Tout repos actif meilleur que passif. Dernier repos de chaque échauffement = cooldown final.

**Dose et portée :** Ne pas choisir n ou n-1 sans indication source ou décision éditoriale du coach.

**Données individuelles avant prescription :** emplacement du repos ; durée, type actif/passif, cible ; sollicitation précédente et microcycle ; RPE/douleur/sommeil et réaction.

**Vérifications prioritaires sur les fiches :** 416 politiques de récupération V19/V20 ; 59 cibles de repos non univoques ; éventuel risque zone de travail héritée.

**Critères de suivi :** Performance suivante, fatigue, qualité des répétitions, sécurité.


### trail — Trail, vertical et excentrique

**Axe :** `context`. **Sources principales :** [TRAIL-01](https://pubmed.ncbi.nlm.nih.gov/33037592/), [TRAIL-02](https://pubmed.ncbi.nlm.nih.gov/38921863/), [TRAIL-03](https://pubmed.ncbi.nlm.nih.gov/39992182/).

**Ce que la littérature autorise au niveau famille :** La descente peut induire un stress excentrique important malgré un coût métabolique relatif faible. Une habituation partielle à l’excentrique existe, mais ne démontre pas une tolérance illimitée.

**Ce qu’il est interdit d’en déduire automatiquement :** D+ suffit à quantifier D−. Courbatures en baisse = capacité neuromusculaire prouvée. Progression verticale universelle sans expérience préalable.

**Dose et portée :** Études ponctuelles à pentes spécifiques; aucune échelle générale de D− validée.

**Données individuelles avant prescription :** D+ et D− distincts ; pente, technicité, type terrain ; historique descente, douleur, fatigue après 24-72h ; matériel et expérience.

**Vérifications prioritaires sur les fiches :** règles de D−, escaliers vs terrain technique ; différencier marche/course descente ; refus si capacités inconnues.

**Critères de suivi :** Tolérance mécanique, fonction et récupération différée.


### swimming — Natation et milieu aquatique

**Axe :** `context`. **Sources principales :** [SWIM-01](https://pubmed.ncbi.nlm.nih.gov/39526869/), [SWIM-02](https://pubmed.ncbi.nlm.nih.gov/39044665/), [SWIM-03](https://pubmed.ncbi.nlm.nih.gov/34372755/).

**Ce que la littérature autorise au niveau famille :** La longueur des répétitions à vitesse critique en crawl modifie la réponse lactate/RPE/technique. Les contraintes piscine/eau libre et les nages sont distinctes.

**Ce qu’il est interdit d’en déduire automatiquement :** CSS crawl appliquée à brasse/dos/éducatifs. Distance totale = durée individuelle garantie. Une longueur à CSS donne une réponse identique quelle que soit récupération.

**Dose et portée :** Étude aiguë 5x400 r60/10x200 r30/20x100 r15 ne prouve pas supériorité chronique universelle.

**Données individuelles avant prescription :** CSS et provenance, date, nage concernée ; distances/restes exacts ; niveau technique, bassin/eau libre ; temps individuel et créneau.

**Vérifications prioritaires sur les fiches :** 119 fiches nage: durée et transitions ; mélanges de nages ; décompte échauffement/retour.

**Critères de suivi :** RPE, lactate, allure propre à nage, qualité technique.


### bricks — Bricks et transitions

**Axe :** `context`. **Sources principales :** [BRICK-01](https://pubmed.ncbi.nlm.nih.gov/35871903/), [BRICK-02](https://pubmed.ncbi.nlm.nih.gov/39313204/), [BRICK-03](https://pubmed.ncbi.nlm.nih.gov/36589784/).

**Ce que la littérature autorise au niveau famille :** L’enchaînement vélo-course modifie parfois performance et contrôle moteur de la course initiale. La modulation de puissance/cadence ne dispose pas de règle générale transférable à toute distance.

**Ce qu’il est interdit d’en déduire automatiquement :** Un brick a un temps de transition égal zéro si absent. Une séance vélo-course = vélo seul pour compte durée. 90% FTP sur 20 km = cible Ironman 180 km.

**Dose et portée :** Études souvent vélo court et course courte, aucun dosage optimal Ironman.

**Données individuelles avant prescription :** durées séparées par discipline et transitions ; références propres à chaque sport ; tolérance course post-vélo ; nutrition et état musculaire.

**Vérifications prioritaires sur les fiches :** 55 bricks + mixed réellement bricks séparés ; conversion Nolio multi-événements ; compatibilité créneaux.

**Critères de suivi :** Course sous fatigue, aisance en transition, réponse différée.


### ironman_specificity — Ironman et posture aéro

**Axe :** `context`. **Sources principales :** [IM-01](https://pubmed.ncbi.nlm.nih.gov/34025447/), [IM-02](https://pubmed.ncbi.nlm.nih.gov/42646883/), [IM-03](https://pubmed.ncbi.nlm.nih.gov/27490817/), [DUR-01](https://pubmed.ncbi.nlm.nih.gov/33886100/), [BRICK-01](https://pubmed.ncbi.nlm.nih.gov/35871903/).

**Ce que la littérature autorise au niveau famille :** La performance d’Ironman dépend d’interactions multisports, du maintien tardif et du contexte nutrition/posture. Une position aéro peut avoir un coût de confort et un besoin de tolérance spécifique.

**Ce qu’il est interdit d’en déduire automatiquement :** 6x10 et 4x15 sont physiologiquement équivalents car 60 min. Une expérience élite détermine le volume minimum amateur. Marathon sec permet prédire directement marathon IM.

**Dose et portée :** Aucune étude identifiée ne certifie les 4x15 ou 6x10 spécifiques à tous.

**Données individuelles avant prescription :** historique posture et symptômes ; références disciplines, tolérance à fatigue ; nutrition/hydratation ; calendrier entier et schéma compétition.

**Vérifications prioritaires sur les fiches :** 2 calendriers 16 sem: ratios et schéma course ; 4x15 postural vs 6x10 ; longues séances et enchaînements.

**Critères de suivi :** Tolérance position, qualité effort course, adaptation sans aggravation.


### taper — Affûtage et activation compétitive

**Axe :** `context`. **Sources principales :** [TAPER-01](https://pubmed.ncbi.nlm.nih.gov/17762369/), [TAPER-02](https://pubmed.ncbi.nlm.nih.gov/37163550/).

**Ce que la littérature autorise au niveau famille :** Réduire progressivement la charge avant compétition tout en maintenant des qualités de travail peut améliorer la performance de groupe.

**Ce qu’il est interdit d’en déduire automatiquement :** 41–60% exactement pour tout profil et toute course. Activation J−1 obligatoire et universelle.

**Dose et portée :** Réduction 41–60% sur 2 semaines = synthèse moyenne de méta-analyse, non cible automatique.

**Données individuelles avant prescription :** fatigue accumulée ; historique réponse affûtage ; date/heure/type de compétition ; contraintes calendrier.

**Vérifications prioritaires sur les fiches :** différencier décharge ordinaire et taper ; préserver intensity/frequency selon contexte ; schéma course événement.

**Critères de suivi :** Performance/course, fraîcheur et maintien intensité.


### nutrition — Nutrition et tolérance digestive

**Axe :** `support`. **Sources principales :** [NUT-01](https://pubmed.ncbi.nlm.nih.gov/28332114/), [NUT-02](https://pubmed.ncbi.nlm.nih.gov/29453741/), [NUT-03](https://pubmed.ncbi.nlm.nih.gov/37449467/), [NUT-04](https://pubmed.ncbi.nlm.nih.gov/37752011/), [NUT-05](https://pubmed.ncbi.nlm.nih.gov/41759826/).

**Ce que la littérature autorise au niveau famille :** L’apport de glucides à l’effort favorise généralement la performance pour efforts prolongés. Le gut training peut améliorer la tolérance; les adaptations aiguës train-low ne garantissent pas performance.

**Ce qu’il est interdit d’en déduire automatiquement :** Tous ont besoin de 90-120g/h. Train-low toujours bénéfique. Oxydation de lipides accrue = performance Ironman améliorée.

**Dose et portée :** Doses étudiées dépendent durée, formulation et entraînement intestinal; seuil de 120g/h non universel.

**Données individuelles avant prescription :** historique GI et quantités tolérées ; durée et intensité effort ; énergie disponible et signes REDs ; stratégie alimentaire, environnement.

**Vérifications prioritaires sur les fiches :** consignes LCW ambiguës ; fiches jeûne/sleep-low et mineurs ; ne pas délivrer nutrition thérapeutique universelle.

**Critères de suivi :** Performance, tolérance GI, récupération, santé.


### heat_hypoxia — Chaleur, hypoxie et environnement

**Axe :** `support`. **Sources principales :** [HEAT-01](https://pubmed.ncbi.nlm.nih.gov/26002286/), [HEAT-02](https://pubmed.ncbi.nlm.nih.gov/41015711/), [HEAT-03](https://pubmed.ncbi.nlm.nih.gov/28985128/), [HEAT-04](https://pubmed.ncbi.nlm.nih.gov/17277604/).

**Ce que la littérature autorise au niveau famille :** Expositions contrôlées à la chaleur peuvent favoriser l’acclimatation; sécurité et hydratation personnalisée essentielles.

**Ce qu’il est interdit d’en déduire automatiquement :** Sauna après chaque séance recommandé à tous. Volume hydrique universel. Sommeil = unité mL/h; corriger automatiquement la consigne LCW. Hypoxie et chaleur ont les mêmes protocoles.

**Dose et portée :** Consensus chaleur 1–2 semaines est une plage d’exposition générale, pas une prescription sans contexte.

**Données individuelles avant prescription :** température/humidité, état de santé ; historique de chaleur et signes d’intolérance ; pertes sudorales approximatives ; surveillance, accès refroidissement.

**Vérifications prioritaires sur les fiches :** bloc chaleur à haut risque et contre-indications ; LCW unité hydrique suspecte ; dissocier hypoxie, preuve non couverte dans cette revue.

**Critères de suivi :** Tolérance chaleur, symptômes, performance milieu cible.


## Prescriptions ambiguës et décisions humaines à ne pas éluder

| Point TFCLab | Décision documentaire | Statut |
|---|---|---|
| Dernier repos des séries (`n` ou `n−1`) | Dépend de l’emplacement et du stimulus; aucune règle globale approuvée | **Bloquer dose structurée sans accord** |
| 59 repos sans cible univoque | Ne pas hériter de l’intensité du travail | **Bloquer export structuré si cible requise** |
| 4 × 15 min aéro versus 6 × 10 min | Même temps sous position ≠ même densité, interruption ou fatigue | **Révision posturale** |
| 16 sem Ironman : ratios historiques et compétition | Garder 2 erreurs de fréquence + schéma course invalide | **NO-GO plan** |
| Natation crawl/CSS et 4 nages | Temps individuel et cible par nage non démontrés | **Conditions manquantes** |
| Trail D−/repeated-bout | D− et technicité distincts; tolérance non prouvée par le calendrier | **Conditions manquantes** |
| Train-low / nutrition / chaleur | Ne pas présumer bénéfice net, niveau glucidique et risque REDs | **Revue sécurité** |
| Hydratation LCW `+500 mL/h de sommeil` | Unité incohérente, aucune correction par hypothèse | **Quarantaine** |
| Nolio cibles d’allure | 4 pertes corrigées dans couche expérimentale, pas sender réel | **Pas d’export réel** |

## Comment Codex doit utiliser ce dossier

1. **Importer comme recherche, pas comme prescription.** Lire `mecanismes_15_familles.json`, `references_verifiees.json`, `assertions_familiales_non_liees.jsonl`, puis les 920 lignes de `docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl`.

2. **Ne pas produire de faux packets V21A** en inventant les hashes. À partir du dépôt original, joindre `legacyId`, `sourceEffectiveSha256`, `familyId`, et variantes/empreintes seulement si présents et confirmés. Gérer les deux IDs sans rattachement en `unresolved`.

3. Pour toute liaison à une fiche, comparer le contenu **effectif** (durée, sport, phases, cibles, restes, restrictions) et vérifier population/intervention/comparateur/critères de la publication. **Titre seul ou famille seule insuffisants.**

4. Garder `verification.status=abstract_reviewed` pour les notices ici, ou `metadata_verified` pour HEAT-02. **Ne pas prétendre au full-text** à partir de ces fichiers. Des empreintes de réponse absentes imposent des limites au schéma V21A : Codex doit créer une vérification reproductible réelle avant une promotion documentaire; aucune valeur factice.

5. Seules les annotations rédigées avec `scope=family_context`, et validées sur schéma et liens, peuvent être proposées comme première livraison. Les `workout_mechanism` nécessitent comparaison de recette et revue; les `exact_recipe_dose` nécessitent plus de preuves (protocole précis + SHA + dose/restes + conditions).

6. **Protéger la causalité** : décider intention depuis diagnostic/limiteurs *avant* la sélection; aucune justification a posteriori, pas d’optimum inventé. Contrôles non régressifs; export Nolio distinct de la bibliographie.

7. Émettre listes `ready_for_documentary_review`, `needs_full_text`, `not_applicable`, `dose_unverified`, `source_conflict`, `needs_coach_decision`; **aucune promotion scientifique**.

## Catalogue des sources

Le registre machine (`references_verifiees.csv` / `.json`) contient pour chaque référence PMID, DOI si identifié, résumé exact du constat de portée et limite de transfert. **Les résumés dans ce dossier sont des paraphrases et non des citations extensives.** Pour l’accès original : https://pubmed.ncbi.nlm.nih.gov/<PMID>/ .

## Prochaines preuves requises avant toute validation de dose

**Niveau P0 :** vérifier études primaires et texte intégral pertinent pour les récupérations conflictuelles, les intensités d’effort ciblées, l’hydratation et les fiches à risque. **P1 :** comparer 51 IDs/96 recettes V19 à des protocoles explicitement étudiés, sans leur attribuer collectivement une preuve. **P2 :** faire la même chose par famille pour le reste des 920 séances. Les décisions de coach exigent un journal daté et le contenu exact de la recette; les valeurs individuelles exigent des références et capacités réelles. La recherche disponible ici ne vaut pas approbation.

