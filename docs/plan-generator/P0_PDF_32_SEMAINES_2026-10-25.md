# P0 — PDF réel de 32 semaines : événements et validation

## Preuves et versions

PDF reçu et extrait localement : 133 pages, Creator Safari, création
25/10/2026 13:06:40 UTC. Les trois captures à 14:06 montrent 66 %, 14 critiques,
9 avertissements, 107 écarts et un blocage avec une course non déclarée S28.
Ces données appartiennent à un **nouveau run**, distinct des 112 écarts.
Aucun appel de génération effectué pour cette investigation.

`origin/main` actualisé : `00d513f772b53994aa057800f12edc2ad0a56941`.
La page publique référence toujours `/assets/index-DwAgVmx3.js`, déjà relevé
avec version `2026.10.24-2302` dans le rapport précédent. Ceci ne prouve ni
le bundle Safari exécuté ni le SHA publié. Les versions Edge production/test
et le payload réellement envoyé restent inconnus ; aucun accès management
ni appel aux endpoints de génération. #404 reste non déployée.

Le PDF situe S1 au 26 octobre–1 novembre 2026, S28 au 3–9 mai 2027 et S32
au 31 mai–6 juin. Avec ce calendrier, 19 décembre 2026 = S8 samedi, 6 juin
2027 = S32 dimanche. C'est le calendrier rendu, pas une reconstruction du
payload ou de `weeksAvailable`. Aucune hypothèse S33 dans les fonctions
inspectées : les semaines attendues sont calculées depuis les dates ; le
repli prend la dernière semaine du tableau.

## Première transformation fautive démontrée

1. Page 132 : `COURSE : Ironman 70.3 Tours`, sport `brick`, natation 1.9 km,
   vélo 90 km, CAP 21.1 km. Le classificateur partagé de main reconnaît déjà
   ce titre, indépendamment du sport ; aucun besoin de fabriquer un Jour J.
2. Page 120 : `Brique Simulation Compétition 70.3`, sport `brick`, vélo120,
   CAP40. **Le classificateur de main retourne vrai**, car « compétition »
   suffit sans exclusion des simulations. La correction de #404 retourne
   faux et conserve la séance intacte. Cela reproduit le faux positif avec
   le texte réel ; sans JSON, on ne peut exclure un autre événement S28.
3. `validateRaceDayPresence` produit alors `race_day_unexpected` en S28.
   Dans `validatePlan`, `raceDayMissing` comptait **toutes** les erreurs de
   ce contrôle, y compris cette règle et `race_catalog_conflict`. Le résumé
   annonçait donc une finale absente alors qu'aucune erreur d'absence finale
   n'existait. La sauvegarde reprend ce résumé dans le dialogue. La capture
   montre précisément S28 en détail, pas une ligne d'absence S32.
4. Correction : résumer séparément les absences (avec semaines concernées),
   les événements non déclarés et les conflits de fiche. Aucune règle,
   sévérité, séance ou condition de blocage n'est supprimée.

C'est une explication reproductible de la contradiction affichée. Le code
exécuté et l'état exact du navigateur n'étant pas attestés, ce n'est pas une
preuve que **toutes** les erreurs du run ont cette cause.

## Sources PDF, diagnostic et sauvegarde

`AITrainingPlanPage` choisit `planOverride` hors chargement, puis
`jsonParsedPlan`, puis le parseur Markdown pour `rawParsedPlan`. Les
post-traitements et métadonnées produisent `parsedPlan`. Ce dernier est
fourni à `AIPlanViewer` et à `handleSaveToPlan` → `validatePlan`.

Le viewer possède cependant un état local initialisé depuis cette prop :
remplacements de séances et actualisation des valeurs modifient cet état.
L'export utilise cet état local ; le bouton sauvegarder appelle le parent
sans le lui transmettre. **Une divergence après édition locale est donc
possible dans le code.** Aucune preuve d'édition dans ce run ; cela n'est
pas présenté comme la cause de S32. Aucun remaniement de persistance/QA
entrepris ici sans test de l'ensemble des contrôles aval.

Le PDF restitue titre, sport et détails ; il ne certifie pas les propriétés
`custom`, `catalogId`, `isRest`, `dayIndex`, ni l'objet utilisé à la sauvegarde.
Le test appelle le véritable export HTML et le même `validatePlan` que la
sauvegarde sur une fixture commune. Il ne simule pas une sauvegarde Supabase
et ne prétend pas établir l'égalité des états historiques du navigateur.

## Matrice causale

| Incident | Cause démontrée | Correction | Test / état |
|---|---|---|---|
| Finale annoncée absente malgré course PDF | Résumé assimile toute erreur événement à une absence finale | Branches distinctes et semaines explicites | Résumé main : deux échecs ; corrigé : trois tests verts |
| Simulation S28 reconnue comme course | Mot compétition sans exclusion simulation dans main | Classificateur partagé #404, aucun retrait de séance | Titre exact PDF reproduit ; pas d'attribution exclusive sans JSON |
| Triathlon final brick | Aucun défaut démontré du classificateur sur ce titre/sport | Aucun ajout artificiel de course | Même fixture reconnue par export et validateur, vraie absence reste erreur |
| Fiches p6/p16/p28/p47 | PDF juxtapose prescription et référence sans vérifier leur équivalence | Pas de remplacement automatique sans preuve sportive | Associations confirmées ; origine initiale non disponible |
| 107 quotas | Seulement six lignes visibles, pas la liste entière | Instrumentation/offline #404 conservée | Impossible de ventiler les 101 autres ni de comparer globalement aux112 |

## Catalogue : constat et limites

- p6, S1 : 90min vélo Z2 +30min CAP Z1–Z2, ID
  `B_BRICK_RACE_PACE_SHORT_703`. Fiche Build/Peak, vélo80–88%FTP +CAPZ3.
- p16 (et non p17 dans ce fichier), S4 Fondation : `V3_BIKE_SST_PROGRESSIF`,
  fiche « Build phase » ; prescription 3×12min Sweet Spot.
- p28, S6 : `BR_HALF_V1_PRO`, prescription vélo80 Z2 +CAP25 Z1–Z2,
  fiche Build/Peak véloZ3–Z4a et CAPZ2→Z3.
- p47 : `A_RUN_DURABILITY_LONG`, prescription15+75+5=95min,
  fiche100–150min ; écart de durée réel, sans déduire la durée structurée.

`getFicheForSession` résout l'ID puis renvoie la fiche ; sa restriction
actuelle porte sur sport/objectif running, pas sur l'équivalence de phase,
durée ou structure de la prescription. L'export transmet titre/détails,
pas le contexte de phase. La fiche imprimée est donc une référence catalogue,
pas une preuve que le texte prescrit lui est équivalent. La discordance est
visible avant la fiche dans les détails `[ID: ...]` : le rendu n'invente pas
ces IDs à partir du titre. Les métadonnées ne sont pas modifiées ici.

Sans pool effectivement injecté et réponse brute, impossible de distinguer
choix initial du modèle et transformation ultérieure. Le succès du schéma
ne constitue pas une validation d'équivalence sportive.

## Quotas : six catégories conservées séparément

1. Prescription : absence d'une vraie SL compatible, à établir sur séances.
2. Association catalogue : exemples prouvés ci-dessus.
3. Identification clé : S1 vendredi, S2 vendredi, S3 mardi signalés non-clés ;
   flags bruts absents, ne pas passer automatiquement `isKeySession=true`.
4. Durée structurée : p47 texte95, valeur structurée inconnue.
5. Squelette/quota : S3 total8 attendu6 ; origine de la contrainte inconnue.
6. Réparation quota plein : conflits swim W3/W6/W7 visibles ; protection
   #403 conservée. Un refus d'insertion ne démontre pas une séance adaptée.

Autres lignes visibles : SL vélo S1/S2 ≥120 ou brick≥140 absente ; réparations
CAP W4 75min /W5 80min vers floor90 avec49 candidats, W8 activation10km J−3
45min vers90 avec33 candidats. Cette dernière cible invite à examiner la
sélection de la séance à réparer ; le PDF ne donne pas le quota brut ni les
motifs de rejet. Ne pas transformer arbitrairement une activation en SL.
Rampe et risque réels toujours inconnus ; origine historique120 non résolue.

## Prochaine preuve nécessaire

Le PDF évite de perdre le contenu lisible, mais ne remplace pas le JSON des
séances/quotas, les réponses serveur, les traces de réparation et la version
déployée. Un export local de diagnostic indépendant de la sauvegarde reste
nécessaire avant toute prochaine génération payante. Aucun déploiement,
appel Gemini, envoi Nolio, migration, écriture athlète ou fusion effectué.

## Vérifications

- Suite ciblée moteur + classificateur : **73 fichiers / 740 tests verts**.
- Trois tests nouveaux : **3 verts** sur le code corrigé. En rétablissant
  uniquement le résumé main : **2 échecs / 1 succès** ; en rétablissant
  uniquement l'identité main : **1 échec / 2 succès** (simulation S28).
  Chaque fichier de production a ensuite été restauré à sa version corrigée.
- TypeScript application : aucune erreur. ESLint du nouveau test : aucune
  erreur. `git diff --check` propre.
- Suite complète et CI : résultats suivis dans la description de #404.

Le test PDF utilise une fixture partielle explicitement transcrite, avec
séances faciles complémentaires pour isoler les règles de compétition des
autres contrôles. Il ne certifie pas les 32 semaines ni la pertinence des
quotas sportifs. Le défaut de synchronisation après édition locale reste
ouvert : l'égalité historique export/sauvegarde n'est pas démontrable.
