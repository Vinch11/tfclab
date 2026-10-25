# Premiers athlètes sous 72 heures — corrections indispensables et décision

Base : main `ac01beb8a09b43d73e8d445dea791fac14577e5a`, branche indépendante
`fix/first-athletes-readiness`. Aucun merge de #406/#407/#408, déploiement,
appel modèle, migration, donnée athlète ou Nolio modifié.

## Utilisable immédiatement

Les fixtures, contrôles offline et contrats d'édition/affichage/export/sauvegarde
sont utilisables pour une revue coach. Les fondations physiologiques et leurs
fiabilités existantes sont conservées. **Pas de GO nouveau plan automatique
destiné à un athlète sur la seule base des tests ou d'un score de conformité.**
La version publiée et les deux versions serveur restent à attester.

| Priorité sportive | Preuves disponibles, réutilisées | Limite pour le coaching réel |
|---|---|---|
| 10 km | Profils QA, fixture logique sans natation, identité des courses et catalogue | Pas de corpus complet de générations individuelles qualifiées |
| Semi-marathon | Profil QA, contrats objectif/catalogue/limiteurs | Pas de plan généré complet avec diagnostic historique retrouvé |
| Marathon | Profil et fixture avec semi préparatoire ; contrôles d'affûtage/progression | Fixture synthétique, pas preuve d'efficacité ni d'adéquation individuelle |
| Ironman | Profil, fixture multisport et identité de finale ; quotas/bricks | Ne pas confondre avec le PDF70.3 ni qualifier une course entière depuis une fixture logique |

Les quatre préparations exécutent diagnostic/décision existants, conservent des
limiteurs classés et produisent un catalogue différent quand ceux-ci sont fournis.
Cela prouve une influence **avant génération**. Le choix réel puis la dose finale
ne sont pas certifiés sans les états du plan ; pas de nouveau classement inventé.

## Défauts bloquants corrigés dans cette branche

| Défaut démontré | Correction minimale | Preuve |
|---|---|---|
| Totaux de validation calculés depuis la prose malgré `durationMin` disponible | Durée prescrite positive/finie prioritaire ; fallback legacy conservé ; pas de plafond240min imposé à une durée structurée connue | 3tests rouges/1vert avant ; après, plan enregistré synthétique S1=170, S8=165, S12=87min ; repos, durée courte, vélo330min et legacy couverts |
| Temps non analysé transformé en endurance facile | Reliquat inconnu d'une séance au total structuré reste `unknown`, pas `low` | 20minZ5 sur60min décrites partiellement :40min inconnues ; aucune invention d'endurance ni modification des seuils sportifs |
| Journaux serveur/navigateur contenant VMA, seuil, allures dérivées, volume, âge/sexe ou texte libre | Codes techniques seuls dans les chemins ciblés, sans objets personnels ni exceptions libres | Canaris sur les quatre méthodes console, deux miroirs serveur, miroir navigateur ; garde statique ciblée des entrées Edge |
| Entrées Edge non compilables (`full` inexistant) | Réemploi des trois corrections `fullPlanText` par miroir déjà démontrées dans #406, sans fusionner ses autres fonctions |8erreurs avant, contrôle de type des deux entrées vert après ; aucune protection LCW retirée |
| Test PDF pouvant imprimer l'écran de chargement | Attendre première ET dernière séance, polices et rendu avant impression ; assertions du contenu final inchangées | Reproduction causale P4 réutilisée ; répétitions Chromium sur les fixtures court/34semaines et document absent |

L'actualisation du test débutant distingue désormais durée structurée60min et
fallback textuel55min sur la même séance ; la non-régression « Z3 haut ≠3h »
et les vrais tests de durées en heures restent actifs. Aucune durée réelle,
fiche catalogue, intensité cible, règle de limiteur ou sévérité n'est falsifiée.

## Vérifications et réserves

Frontend : **353fichiers, 2603tests verts, 6TODO**. Serveur : **315tests par
miroir**, puis4tests ciblés de confidentialité sur les deux entrées finales.
Contrôle de type des deux index Edge et TypeScript frontend verts.
PDF Chromium : **9/9 cas verts**, trois répétitions sans retry ni délai augmenté.
CI et index de preuves : liés au SHA livré dans la PR. Édition, état courant, export,
sauvegarde et diagnostics réutilisent les régressions #405 ; aucune vraie
écriture Supabase pour les tester. Les six `todo` ne valent pas des réussites.

Les essais locaux simultanés ont produit des timeouts FIT et une navigation
initiale PDF dépassant30s. Ils sont conservés dans les preuves ; les mêmes
tests passent en exécution isolée, sans hausse de timeout ni changement de test
physiologique. Une extraction PDF Chromium verte ne certifie pas le dialogue
d'impression natif Safari/desktop ni toute pagination réelle.

La confidentialité testée concerne les chemins corrigés. Les protections
complémentaires des échecs SSE/statistiques de #406 attendent toujours revue :
ne pas présenter ce lot comme un audit exhaustif de toutes les données/logs.
Les quotas historiques66/112/107, le seuilS1 et les thèmes/course suspects
restent documentés dans les rapports existants ; pas de nouveau patch conjectural.

## Blocages P4 qui nécessitent une action humaine

- **Versions** : GET public à19:33UTC le25/10 : frontend embarqué
  `2026.10.24-2302`, mêmes assets qu'en P4, sans SHA Git/publicationId attesté.
  Deux Edge Functions : versions/dates/sources **inconnues**, aucun accès
  management disponible. GitHub n'atteste pas le déploiement.
- **Collecte non destructive** : propriétaire du bon projet, lister les fonctions
  avant/après téléchargement de `ai-training-plan` et `ai-training-plan-test`
  avec la CLI Supabase déjà authentifiée (`functions list/download --project-ref`).
  Conserver versions stables, sources et SHA256, dates, import maps, JWT et runtime.
  Aucun jeton ou fichier `.env` à partager.
- **Rollback** : retrouver publication frontend complète et versions/sources
  saines des deux fonctions, copies durables et procédure fournisseur. Référence
  Git ou deux fichiersJS ne suffisent pas ; aucune restauration réelle testée.
- **Runtime/compatibilité** : contrôles Deno offline ≠ runtime Supabase attesté.
  Vérifier le runtime cible et les contrats frontend/deux fonctions/catalogue
  depuis **le même commit approuvé**. Les artefacts #406 du SHA64a5 ne comprennent
  pas ces corrections ; reconstruction indispensable, pas de mélange d'archives.
- **Publication** : si #406 est retenue après revue, son build ordinaire non
  attesté bloque la génération. Confirmer la capacité Lovable à publier la
  release préparée ; aucune fusion/publication implicite pour découvrir ce point.

## Chemin minimal vers une première utilisation

1. **Dès maintenant** : obtenir attestations et sauvegardes de rollback ; examiner
   ce petit lot et les protections déjà préparées de #406. #407/#408 et une
   campagne Auto-QA payante peuvent attendre ; elles ne sont pas un prérequis.
2. **Après revue explicite** : arrêter le SHA de release, reconstruire/contrôler
   les trois composants et le runtime, puis demander une autorisation de
   déploiement distincte. Aucun déploiement autorisé par le présent rapport.
3. **Avant le premier athlète** : recette humaine du plan courant après édition,
   sauvegarde/chargement et PDF natif Safari/desktop sur cas synthétique, rôles et
   confidentialité vérifiés ; aucun envoi Nolio. Ne pas créer/modifier de données
   réelles dans cette mission. Le harness local permet l'impression synthétique
   sans modèle. Si aucun plan test n'est déjà accessible dans l'interface, la
   recette complète reste non exécutée : pas d'import inexistant supposé ni de
   génération payante implicite ; autorisation distincte d'un essai borné requise.
4. **Premier usage borné** : revue coach de chaque séance finale, rangs effectifs,
   dose, récupération et objectif pour le cas individuel ; toute génération
   payante reste soumise à autorisation. Aucun usage d'un plan bloqué ou non
   vérifiable sous prétexte d'un score logiciel vert.

**Décision actuelle : GO préparation et revue offline ; NO-GO publication et
prescription automatique non supervisée.** Une mise en service sous72h dépend
des attestations, du rollback, de la recette native et des autorisations humaines,
pas de la création de nouvelles fonctionnalités ou d'une refonte méthodologique.
