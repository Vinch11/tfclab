# Intégration des 920 fiches et sélection contextualisée

Cette modification raccorde le catalogue réécrit au parcours normal DET de la
PR #464. Elle conserve le catalogue historique de 800 sources et ses pools CI.
Elle ne constitue ni une validation scientifique indépendante, ni une décision
individuelle de prescription, ni un déploiement de l’application.

## Admission enregistrée

| Disposition | Nombre | Effet dans le moteur |
| --- | ---: | --- |
| Sources ordinaires enregistrées | 826 | Identifiant V3 distinct et lien vers l’identifiant PDF |
| Sources passant les contrôles d’éligibilité | 661 | Candidates à la sélection pour un plan à relire |
| Sources bloquées par le contrôle de contenu | 165 | Exclues de la sélection, motifs conservés par source |
| Fiches à routage particulier | 94 | Conservées comme compositions, calendriers, tests, protocoles ou repos |
| Total des identifiants PDF couverts | 920 | Chaque fiche a une disposition explicite |

Les 165 réserves sont : inventaire de matériel de renforcement absent (132),
intention « intensités mixtes » avec un seul domaine principal (26), récupération
neuromusculaire non prouvée par le contrôle (5), prérequis de protocole-test absent
(1), et une discordance de contenu entre des fractions de 1000 m à allure 5 km
et une réécriture en accélérations alactiques de 10 secondes (1). Il faut une correction ou une revue de contenu adaptée ; une correspondance
avec un limiteur ne lève jamais ces réserves. Ce contrôle n’est pas exhaustif et
son auteur est aussi celui de la réécriture.

Les 94 autres fiches comprennent 62 séances multisports, 16 protocoles de support,
7 évaluations, 3 week-ends/compositions sur plusieurs jours, 3 journées à plusieurs
séances, 1 évaluation sur plusieurs jours, 1 repos et 1 protocole spécialisé.
Leur enregistrement n’ajoute pas de nouveaux composeurs exécutables. Elles ne
sont pas injectées comme une séance ordinaire : leurs transitions, calendrier,
mesures ou encadrement nécessitent leur parcours spécifique. Le repos et les
protocoles d’accompagnement ne créent aucune minute d’exercice fictive.

## Sélection et contexte de l’athlète

Le parcours normal utilise l’entrée de planification existante, figée pour
l’athlète : objectif, ordre brut des limiteurs, niveau réellement connu,
configuration et calendrier. Aucune fiche athlète, base de données ou séance
Nolio n’est écrite par cette modification.

Les nouvelles candidates sont filtrées par objectif déclaré, domaine spécifique
à l’épreuve, niveau, phase, contre-indications, prérequis négatifs, risque de
blessure et fatigue explicitement déclarée. Un niveau inconnu exclut les
nouvelles sources. Un limiteur non raccordé reste un refus, sans substitution.

Le calendrier et les doses natives sont d’abord assemblés par le moteur existant.
Une nouvelle recette peut être retenue comme alternative seulement à sport,
domaine principal, durée exacte, bilan de zones et correspondances de limiteurs
identiques ; elle ne doit pas demander de nouvelle ancre absente. Son exigence
propre de récupération est contrôlée contre le calendrier et les horaires saisis.
Une incompatibilité prouvée l’exclut ; une durée ou un horaire inconnu reste à
vérifier, sans prétendre prouver la récupération. Ce choix conservateur préserve
la progression et les décharges sur l’horizon complet, au lieu d’introduire une
petite dose qui rendrait une semaine suivante irréalisable.

Les recettes ne sont ni étirées hors bornes ni renommées pour satisfaire un
créneau. L’admission n’implique pas que chaque candidate sera retenue : une
fiche sans alternative de dose compatible peut ne jamais apparaître dans le
plan considéré. Les composantes choisies, empreintes, cibles, contrôles et motifs
restent dans la proposition source conservée avec le plan.

L’individualisation réutilise les repères disponibles et la doctrine TFCL.
Les cibles issues d’une référence restent des modèles et ne prouvent pas un
seuil biologique mesuré. Une allure natation ne calcule jamais une durée de
course/vélo. Le CSS ne remplit pas les domaines absents. Une séance de côte ne
reçoit pas automatiquement une allure de plat ; une technique de nage différente
ne reçoit pas automatiquement l’allure de nage complète. Les cibles ou durées
non déterminables restent explicites. Les alternatives natation au temps
existantes restent disponibles si les allures par domaine manquent.

La charge qualitative actuelle et la fatigue déclarée sont transmises par le
panneau existant. Leur absence reste « unknown » et la revue du plan reste
nécessaire. Les ancres, contrôles de douleur, matériel, tolérance des doses et
horaires ne sont jamais remplis avec une fixture de test.

## Parcours qualifié et traçabilité

La recherche coach retrouve les nouvelles fiches par titre, alias V3 ou ID PDF.
`library920RecordStatus` donne la disposition de chaque identifiant original.
Le constructeur qualifié peut reconnaître une nouvelle source demandée, mais
exige toujours une revue liée à l’athlète et à l’empreinte de source, des ancres
résolues et les contrôles du plan. Les pools qualifiés historiques ne sont pas
élargis automatiquement. Les réserves de technique, terrain ou durée empêchent
une admission stricte sans le contexte spécifique requis.

Aucune revue humaine n’est créée. Les indicateurs `automaticSelection`,
`scientificSessionValidated`, `humanSportingApproved`, `athleteApproved`,
`prescriptionAllowed` et `sportingAttestation` ne deviennent pas positifs par cet
import. Les tests positifs de revue utilisent uniquement des identités nommées
SYNTHETIC, dans les fichiers de test.

Les JSON importés, le registre et leurs chargeurs sont inclus dans l’empreinte de
version du moteur. Toute modification invalide la déclaration de version et les
revues qui lui sont liées. Le registre est reproductible hors réseau par :

```sh
node scripts/library-v3/generateLibrary920Registry.mjs
```

Le manifeste garde l’empreinte du PDF et celle du fichier candidat source, les
alias, objectifs historiques, pages et métadonnées de routage. Le contenu des
prescriptions source est conservé ; cette intégration n’attribue aucune recette
exacte à Dan Lorang ni à un autre entraîneur.

## Vérifications et limite de livraison

Les vérifications ciblées couvrent les 826 structures, les 920 identifiants,
les réserves, les ancrages d’intensité, les refus d’identité/revue périmée,
la récupération et une sélection effective dans le parcours normal. Les plans
semi, marathon (dont 40 semaines), 70.3 et Ironman existants sont rejoués ; les
contrats qualifiés historiques et leurs empreintes restent vérifiés séparément.
Le détail final des commandes et résultats figure dans le bilan JSON voisin.

Les fichiers sont proposés sur une branche issue de la PR #464. Sans fusion de
cette chaîne et déploiement de sa version cohérente, l’application publiée ne
consomme pas encore ce nouveau catalogue. La qualification scientifique
indépendante et les décisions réelles pour chaque athlète ne sont pas produites
par les contrôles informatiques.
