# Audit de cohérence du Dashboard — 13 novembre 2026

## Verdict

Le Dashboard n'est pas encore cohérent dans sa lecture globale. Plusieurs valeurs sont partagées correctement, mais des sections utilisent des sources, des périmètres sportifs ou des significations différents sans suffisamment les distinguer. Aucun bilan, classement prescriptif, plan ou calcul physiologique n'a été modifié pendant cet audit.

Contrôle connecté réalisé sur Emanuela (Ironman, compétiteur) et Vince (10 km, compétiteur), ordinateur 1280 × 1800 et téléphone 430 × 706. Les deux compass d'Emanuela sont présents ; pas de débordement horizontal ni d'erreur JavaScript dans les parcours observés. Il ne s'agit pas d'un audit scientifique des modèles ni d'une validation de performance en course.

## Contradictions réellement observées

| Priorité | Sections | Constat | Interprétation / correction à préparer |
|---|---|---|---|
| Haute | Analyse, Synthèse, Facteurs limitants | Emanuela : score global 88 et « Prêt », mais pilier endurance 2,0/25 et durabilité classée prioritaire. Vince : « Profil équilibré — Prêt » malgré les écarts du diagnostic course. | Les agrégats ne répondent pas à la même question. Ne pas présenter « Prêt » comme validation de l'Ironman ou du 10 km ; expliquer couverture, limites et portée du score, sans baisser artificiellement les valeurs. |
| Haute | Compass, Analyse, Synthèse, Mécanisme TTE | Vince : TTE course 75 min, mais carte mécanismes « Cible 300 W · TTE final ~23 min », facteur W′. | Le second chiffre vient d'une simulation de puissance alimentée par des repères vélo, pas d'un test course. Ne pas l'assimiler au TTE course ni à sa cause démontrée. |
| Haute | Diagnostic course, radar, Analyse, échelle VLamax | Vince : diagnostic course 0,60 mmol/L/s ; Analyse et échelle 0,57 ; l'échelle dit « VLamax mesurée ». | Le diagnostic course prend le repère stocké, tandis que l'Analyse prend la valeur résolue. La différence peut être légitime mais doit nommer les sources ; une estimation ne doit pas être intitulée mesure. |
| Haute | Facteurs limitants | Emanuela : TTE 35 → 52 affiché avec « −17 % » ; durabilité 35 → 90 avec « −55 % ». | Ces nombres sont des différences en minutes, affichées comme pourcentages. Les déficits relatifs correspondants sont environ 32,7 % et 61,1 %. Corriger l'affichage séparément du classement historique. |
| Haute | Diagnostics compass vs Facteurs limitants / Leviers | Emanuela : diagnostic vélo ne classe pas le TTE estimé ; diagnostic course classe 40/52 ; moteur historique classe durabilité/TTE à partir de 35. | Les diagnostics descriptifs indépendants sont volontairement distincts du moteur des plans. Le problème est la lecture : estimation et robustesse non testée ne doivent pas devenir une faiblesse certaine dans le discours. Ne pas remplacer automatiquement les priorités des plans. |
| Moyenne | Progression en haut, Compass, Analyse, Synthèse | Emanuela : 77 % « Cibles », 70 % « Données » dans le compass, 90 % dans Analyse et 100 % de complétude dans Synthèse. Vince : 88 % « Cibles », 80 % de données compass. | Ce ne sont pas les mêmes indicateurs ni dénominateurs. Les différencier explicitement ; la complétude actuelle ne garantit ni provenance ni couverture triathlon. |
| Moyenne | Analyse / diagnostic course / Leviers | L'économie est dite modulateur non prioritaire dans le compass ; Analyse la marque « À développer », le classement historique l'associe au neuromusculaire et aux leviers de force. | Ne pas confondre amélioration descriptive, causalité et prescription. Vérifier la cohérence du mécanisme historique lors d'une correction dédiée. |
| Moyenne | Diagnostic course de Vince | Le texte évoque une allure marathon et la course après vélo pour un objectif 10 km. | Pédagogie non contextualisée : distinguer course seule et triathlon. |
| Moyenne | Leviers | Exemples génériques de longues sorties CAP, %VMA et prescriptions de force, parfois propositions en watts/FTP pour Vince. | Textes pas toujours propres au sport/objectif ou à la doctrine d'intensité ; ce n'est pas une séance individualisée validée. |

## Causes retrouvées dans les sources

- **Écart max mal étiqueté** : `buildCategoryRanking` conserve `gap` (unité brute) dans `worstGap` (`src/lib/v2/unifiedLimiterDetection.ts:176–201`) ; `LimiteursSection.tsx:156–164` l'affiche en %. Le TTE dispose déjà de `gapPercent` calculé séparément.
- **TTE mécanismes** : `Index.tsx:1859–1872` transmet FTP, CP et W′ vélo, même en mode course ; `TTEGlycogenInsightsCard.tsx:110–117` calcule à cette puissance. La durée totale projetée d'un Ironman peut également alimenter une simulation vélo sans découpage des segments.
- **VLamax différente** : `coachingCompass/presentation.ts:52` privilégie `vlamaxRunReference` stocké pour le diagnostic course ; `Index.tsx:1846–1854` donne la valeur résolue à l'échelle ; `VLamaxProfileScale.tsx:136` dit systématiquement « mesurée ».
- **Progression** : `AmbitionProgressMini.tsx:184–230` suit les derniers bilans par date, VLamax générique, TTE vélo et FTP/kg, sans VMA/TTE course et sans suivre nécessairement le bilan de référence actif (`Index.tsx:1331–1335`).
- **Bilan de référence** : la sélection centrale utilise `pickReferenceSnapshot` ; `effectiveRefs.ts:35–56` et `Index.tsx:500–505` ont encore des sélections parallèles sans tous les critères de départage. Risque confirmé dans le code ; divergence effective lors d'une égalité de dates non reproduite sur ces deux profils.
- **Complétude** : Synthèse utilise cinq champs et retire dix points par champ absent (`Index.tsx:1835–1838`), ce qui ne peut pas atteindre zéro même si les cinq manquent. Les autres sections utilisent d'autres règles.
- **Cibles stratégie** : `Index.tsx:875–881` conserve une cible VO₂max fixe par ambition et une cible TTE sans âge dans la stratégie parallèle, alors que le diagnostic utilise les cibles objectif/ambition/âge. Divergence potentielle, à ne pas corriger en fusionnant les moteurs sans validation.

## Extensions repérées dans les onglets Profil / Stratégie

Ces constats proviennent du code ; ils ne sont pas présentés comme tous reproduits à l'écran pendant ce parcours Dashboard.

- Nutrition course triathlon reprend la VLamax vélo si la VLamax course manque ; la confiance TTE est passée comme confiance VLamax (`Index.tsx:2295–2300`).
- `VLamaxUnifiedCard.tsx:347–358` peut reprendre valeur et provenance vélo dans l'analyse course.
- Des replis subsistent : TTE absent = 45 dans Index, poids 70 kg dans l'oxydation, VO₂max/VLamax/poids inventés dans `NutritionPredictiveChart.tsx:88–94`. Le graphique nomme %FTP une intensité transmise au modèle sans entrée FTP.
- Les graphiques scientifiques n'obtiennent pas toutes les puissances courtes/VMA/CSS disponibles, contrairement à la carte CP dédiée (`Index.tsx:2098–2123` vs 2200–2207).
- La carte CP juxtapose CP bornée pour récupération, courbe CP brute et W′ brut ; les hypothèses effectives de récupération ne sont pas toujours celles du réservoir affiché (`CPWPrimeCurveCard.tsx:72–84,335–355,482`).
- Charge 28 jours reconstruite depuis TSS 7 jours ×4 ; fatigue absente remplacée par un état par défaut. Ce sont des hypothèses, pas des observations.

## Points cohérents à préserver

- Séparation des deux compass, TTE vélo/course et absence de transfert des watts dans les axes course.
- VMA d'Emanuela 14,2 conservée sans inventer une cible triathlon ni afficher un faux zéro ; les cibles VMA examinées proviennent du même référentiel.
- TTE vélo 35 explicitement estimé, TTE course 40 déclaré ; W′/D′ complémentaires et durabilité après effort prolongé non évaluée dans les diagnostics compass.
- VO₂max partagée indiquée comme un seul repère, pas deux tests sportifs.
- Les diagnostics compass restent descriptifs et ne remplacent pas automatiquement les priorités des plans.

## Modification autorisée pendant l'audit

Le coach a confirmé « Labels et sources uniquement ». Remplacement des pourcentages de confiance dans Facteurs limitants, Mécanismes TTE et le widget d'estimation VLamax (y compris son info-bulle) par les labels qualitatifs existants. La carte TTE précise désormais « Simulation, pas un test TTE ». Aucune provenance labo n'est déduite d'un score de confiance. Les autres pourcentages (écarts, scores, complétude) ne sont pas des pourcentages de confiance et restent inchangés.

Les pourcentages de confiance repérés ailleurs dans Profil (LT1/LT2 et prédiction de performance) restent à traiter dans une harmonisation ciblée ; cet audit ne prétend pas que l'application entière en est débarrassée.

## Ordre de correction proposé, non appliqué

1. Corriger les unités d'écart et les intitulés « mesurée », « Prêt » et TTE simulé, sans toucher les classements.
2. Unifier bilan de référence et provenance affichée ; rendre la progression et la complétude propres au sport et au bilan sélectionné.
3. Éliminer les transferts vélo → course dans les simulations/nutrition et les valeurs inventées en données manquantes.
4. Réviser séparément les catégories historiques et recommandations, avec tests multi-objectifs, avant tout effet sur IA/DET.

## Vérifications

72 tests ciblés diagnostics/compass/rapports réussis après les changements de fiabilité. Nouveau contrôle connecté Emanuela/Vince : labels qualitatifs et mention simulation présents, aucun pourcentage de confiance dans le texte du Dashboard, TTE conservés, téléphone sans débordement et aucune erreur JavaScript. Compilation OK ; déclaration de version synchronisée et vérifiée ; fonctions `ai-training-plan` et `ai-training-plan-test` redéployées avec succès. Publication non effectuée. Aucun nouvel export PDF ni appel IA de génération de plan.

## Corrections finales demandées par le coach

- Référence unique via `pickReferenceSnapshot`, provenance renseignée/estimée/test déclaré ; VLamax résolue course commune au Dashboard, au Profil et à la projection des rapports. Les modèles Nolio alternatifs restent explicitement exploratoires.
- « Prêt » remplacé par des repères favorables, score /100 non assimilé à une validation de course. La lecture Analyse du Profil réutilise celle du Dashboard, sans classement concurrent ni conseils vélo pour un 10 km.
- Couverture commune par sport : Emanuela 8/9 (89 %, VLamax course absente), Vince 6/6 (100 %, présence uniquement). Progression = moyenne des axes avec cible disponible, sans faux historique ni score de robustesse.
- Écarts relatifs : TTE 35/52 = 32,69 % ; indice historique 35/90 = 61,11 %. Classements historiques conservés mais clairement séparés des diagnostics autonomes ; économie, W′ et durabilité ne deviennent pas des faiblesses prouvées.
- Stratégie descriptive contextualisée, domaines physiologiques, cibles VO₂max/TTE avec ambition et âge ; suppression des doses et exemples génériques présentés comme séances.
- TTE simulé réservé au vélo et à ses entrées disponibles ; pas de durée Ironman complète comparée à un segment vélo ni de diagnostic psychologique. TSS 28 jours non reconstruit depuis une semaine ; fatigue réutilisée depuis le diagnostic, pas de nouvel état inventé.
- Nutrition et graphiques : suppression des poids/VO₂max/VLamax moyens, blocage de nutrition course quand sa VLamax manque, unités %VO₂max explicites ; oxydation distincte de l’ingestion, repère 88 % VMA signalé comme théorique. Graphiques puissance/lactate vélo non transposés à la course ; prévisions limitées au sport renseigné et pas de prévision triathlon depuis une seule VLamax vélo.
- CP/W′ : distinction courbe brute / paramètres bornés utilisés pour les récupérations, bornes explicites, aucune promesse de maintien infini.

### Validation finale et périmètre

109 tests ciblés (12 fichiers), dont 5 km, 10 km, semi, marathon, trail, 70.3 et Ironman : contrôles de projections et invariance des contrats, pas validation sportive de plans réels. Vérification connectée Vince/Emanuela après rechargement dans Dashboard, Profil et Stratégie ; ordinateur et téléphone, captures inspectées, pas d’erreur JavaScript ni débordement horizontal. Bilans et plans enregistrés non modifiés ; catégories historiques du moteur conservées, modèles non certifiés. Pas de nouveau plan IA/DET généré, de nouveau PDF réel ni de publication pendant ce correctif. Fonctions des deux générateurs synchronisées et déployées ; état final contrôlé avant commit.
