# DET — trails, courses préparatoires et limiteurs supplémentaires

Candidat d’ingénierie pour la PR #462. Aucun déploiement de production, aucune attestation scientifique, aucune prescription ni écriture Nolio ne sont accordés par ces changements.

## Parcours raccordés

Les essais utilisent des enregistrements fictifs, le vrai pipeline de la page, l’entrée figée partagée IA/DET, le vrai solveur et ses validateurs finaux. Les revues de tests ne sont pas des revues humaines réelles.

| Parcours | Durée / budget | Contrôles d’acceptation |
| --- | --- | --- |
| Trail court | 12 semaines / 7 h | Diagnostic VO2max, parcours explicitement liés à l’athlète, récupération et D+/D− vérifiés |
| Trail montagne | 16 semaines / 9 h | Diagnostic TTE, mêmes preuves terrain et progression déclarée |
| Ultra trail | 20 semaines / 12 h | Diagnostic TTE, mêmes preuves terrain et sortie spécifique au pic |
| 10 km B → semi A | 16 semaines / 8 h | Courses de 40 et 95 minutes estimées, dates et récupération conservées |
| 10 km B → 70.3 A | 12 semaines / 9 h | Course B en semaine 5, récupération S6, quotas et ratios stricts du triathlon |
| 10 km B → semi B → marathon A | 40 semaines / 8 h | Courses S8/S24/S40, récupérations S9/S25, mésocycles et spécificité marathon |
| Marathon, primaire VO2max | 16 semaines / 7 h | Diagnostic inchangé ; couverture du primaire prouvée par les blocs exacts |
| Marathon, primaire VMA | 16 semaines / 7 h | VMA conservée comme vitesse, sans renommage en VO2max |
| Marathon, primaire VLamax | 16 semaines / 7 h | Valeur et cible du diagnostic documentent le sens de réduction ; aucune baisse mesurée n’est affirmée |

## Contrat trail

Le code applicatif n’importe pas de fixture. Le contrat `v407-reviewed-trail-contract.ts` reçoit les faits du coach : historique documenté, tolérance à la descente, récupération observée, limites de progression, D+/D−/minutes de descente de chaque parcours, ravitaillement pratiqué, doses et références de revue.

Le protocole testé demande cinq séances cardio (court) ou six (montagne/ultra), une force, deux séances maximum par jour, du cross-training vélo explicitement activé, sans natation. Il commence un lundi et se termine par la course le dimanche final. Son organisation est affichée puis confirmée. Une autre organisation est refusée ; elle n’est jamais alignée silencieusement sur le gabarit.

Les horaires restent ceux du coach, avec le fuseau et l’offset à la date réelle. Les interdictions de jours/sports et le plafond de journées doubles restent obligatoires. Aucune géométrie de parcours n’est déduite d’une allure sur route, du D+ ou d’une classe de distance. Les consignes de ressenti terrain sont des prescriptions individuelles déclarées, pas des seuils biologiques mesurés.

La revue du contenu des séances est accessible dans le parcours normal : blocs configurés par le même calcul que l’admission, lecture explicite par source, notes, session/athlète vérifiés, écriture append-only puis relecture exacte. Elle utilise `det_coach_review_contexts`, sans nouvelle table. Une modification des réponses de l’athlète, du terrain ou du profil invalide la réutilisation. Toute modification des réponses pendant une action annule son résultat en cours.

## Multi-objectifs

Le formulaire transmet les durées estimées de la course principale et de chaque course secondaire. Les priorités et dates d’origine sont conservées. Le contrat exige une seule course A, des B avant A, des dates uniques dans l’horizon et une semaine de récupération non recouverte par une autre course. Aucun temps de course n’est inventé.

La première semaine après B conserve ses fréquences et contrôles, mais n’impose pas la sortie longue de course ou de vélo d’une décharge ordinaire. La réduction mesurée de volume, la récupération, la polarisation et les contraintes de calendrier restent obligatoires. Les autres semaines ne changent pas de politique.

Pour le triathlon, une estimation d’épreuve ne peut être retirée du seul décompte des entraînements qu’après égalité avec la déclaration réelle (date, sport et durée), unicité de l’événement et contrôle du calendrier complet. Une durée forgée, un événement dupliqué ou une source catalogue déguisée en course sont refusés. Les ratios en minutes ne remplacent l’ancien diagnostic par nombre de séances qu’après leur preuve stricte et la validation séparée des fréquences.

Les pools de course ajoutent les sources existantes RUN_102/RUN_104 et la source complémentaire RUN_202, déjà présente dans le registre. Aucun contenu nouveau n’est fabriqué pour combler un trou. Les empreintes des pools et les manifestes de revue changent : une ancienne revue ne vaut pas lecture des nouveaux éléments. La recherche inclut maintenant les sources complémentaires.

## Limiteurs

La traduction est toujours sans perte et le libellé brut reste inchangé. VMA et VO2max possèdent des clés distinctes. VLamax ne devient jamais TTE.

Le contrôle du primaire utilise le domaine, les clés physiologiques de la source admise et les minutes exactes des blocs configurés. Sa cible de couverture de 30 % reprend la règle de premier rang de l’app, avec toutes les séances clés originales au dénominateur. Les autres sports et les clés non prouvées ne sont pas retirés pour faire passer le résultat.

Pour VO2max/VMA, la preuve de plafond aérobie demande le domaine VO2max, les clés `aerobic_ceiling` et `severe_domain_tolerance` et la dose exacte déjà exigée par le contrôle trail existant. Pour VLamax, la direction est lue dans la valeur et la cible du diagnostic existant ; l’endurance prolongée et le seuil long sont des prescriptions compatibles/co-contributrices selon la politique existante de l’app. Ils ne prouvent ni ne garantissent une adaptation réelle de VLamax.

Les audits de structure, de pic, de mésocycles et d’affûtage restent actifs. L’audit TTE à 30 % reste obligatoire lorsque TTE ou la durabilité relative à l’épreuve est le primaire. Un autre primaire utilise sa propre preuve à 30 %, plutôt que d’être forcé à porter l’étiquette TTE.

## Limites explicites

- Ces essais ne valident pas toutes les durées, tous les budgets, toutes les géométries ou tous les profils réels.
- Le contrat multi-objectifs ne prend pas en charge les trails multiples, les priorités C ni LCW sur trois jours sans déclaration séparée par discipline. Ces cas sont refusés.
- FatMax, FTP/kg, Économie, Robustesse, W′ et découplage ne reçoivent pas artificiellement une nouvelle branche primaire de course. Les libellés secondaires restent dans la trace. Les familles triathlon conservent leur politique native historique hors du raccordement démontré.
- Les profils IA, le diagnostic et leur stratégie ne sont ni recalculés ni remplacés dans DET. Aucun basculement vers l’IA n’est automatique.
- Une recette authentifiée, une revue réelle du coach et la validation scientifique indépendante restent distinctes des tests logiciels. Aucune nouvelle opération Lovable payante ni aucun envoi Nolio n’a été lancé pour ce chantier.

## Vérification locale avant publication

- Parcours applicatif et contrôles de non-régression : 11 fichiers, 187 tests réussis.
- Contrats expérimentaux V35–V36/V404–V408 : 21 fichiers, 151 tests réussis, aucun délai de test assoupli.
- Dernière vérification des trois trails avec choix explicite du vélo : 11 contrôles réussis (cas applicatifs, contrat coach et empreintes des pools).
- TypeScript valide ; construction Vite et génération PWA réussies. ESLint ne relève aucune erreur sur les nouveaux composants et les modules DET ciblés. La page historique conserve sa dette ESLint préexistante, contrôlée séparément par la CI différentielle.

Ces résultats locaux ne sont ni une attestation scientifique ni une recette authentifiée du code déployé. Les validations distantes et les SHA livrés figurent dans la PR #462.
