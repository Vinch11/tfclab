# DET V3.59 — validation des quinze familles, 3 novembre 2026

Le périmètre d'acceptation comporte **15 familles, représentées par 28 calendriers
synthétiques complets et 420 semaines**. Chaque cas positif doit construire toutes
ses semaines et passer les contrôles requis : un refus ne compte jamais comme une
réussite. La CI du code exact et les contre-calculs restent la preuve d'exécution.

Ce résultat est une acceptation automatique de **ces références**, pas une
validation sportive humaine, scientifique ou de tous les paramètres possibles.
`humanReviewRequired=true`, `sportingRelevance=not_attested`,
`prescriptionAllowed=false` et `productionAllowed=false` restent en vigueur.

## Couverture exacte

| Famille | Scénario | Durée réellement testée | Plans de référence | Conditions principales |
| --- | --- | --- | ---: | --- |
| 1 | Marathon | 16 semaines | 2 | age_group 7 h ; competitor 9 h |
| 2 | Marathon long | 40 semaines | 2 | age_group 7 h ; competitor 9 h |
| 3 | Semi-marathon | 8 semaines | 2 | age_group 7 h ; competitor 9 h ; TTE |
| 4 | Semi-marathon long | 30 semaines | 2 | age_group 7 h ; competitor 9 h ; TTE |
| 5 | 10 km | 8, 10 et 12 semaines | 6 | Deux ambitions à chaque horizon ; TTE ; RUN_201 pour le compétiteur 10 semaines |
| 6 | Ironman 70.3 | 12 semaines | 2 | 10 h ; deux profils physiologiques |
| 7 | Ironman 70.3 — 9 h | 12 semaines | 1 | 9 h déclarées |
| 8 | Ironman 70.3 — 9,5 h | 12 semaines | 1 | 9,5 h déclarées |
| 9 | Ironman | 16 semaines | 3 | 14 h, deux profils ; 13 h |
| 10 | Triathlon sprint / olympique | 8 / 12 semaines | 2 | Sprint 8 h, VO2 ; olympique 10 h, TTE |
| 11 | Cyclisme FTP | 8 semaines | 1 | 7 h ; 4 vélos + 1 renforcement ; priorité FTP |
| 12 | Natation CSS / endurance | 8 semaines | 1 | 4 h ; 4 nages + 1 renforcement ; mercredi et samedi indisponibles ; priorité TTE/CSS ; repère 1500 m |
| 13 | Multi-objectifs | 16 semaines | 1 | 10 km B S8 samedi ; semi A S16 dimanche ; 8 h ; TTE |
| 14 | Disponibilités réduites | 12 semaines | 1 | 10 km ; 6 h 30 ; lundi, jeudi, samedi indisponibles |
| 15 | Récupération individualisée | 12 semaines | 1 | 10 km ; 7 h ; cadence 2:1 ; Sprint Ban |

Les cibles initiales de 8–16 semaines pour le triathlon court et le cyclisme, et
8–12 semaines pour la natation, ne sont pas toutes démontrées par ces seuls cas.
Le cyclisme couvre ici la préparation FTP, pas un protocole de contre-la-montre
supplémentaire. Le multi-objectifs couvre un objectif B intermédiaire puis un A ;
il ne démontre pas toutes les saisons à plusieurs pics. Les contraintes
individuelles testées ne constituent pas une validation clinique d'une blessure.

## Changements et preuves

- Les contrats de triathlon court conservent leurs quotas natifs et leur fréquence
  course d'affûtage. L'épreuve officielle compte dans le quota lorsqu'elle y est
  autorisée ; elle est séparée du quota d'entraînement lorsqu'il est nul. Aucune
  dérive de fréquence ne peut être remplacée par une preuve de ratio en minutes.
- Les ratios sprint et olympique utilisent leurs propres bornes natives. Les
  briques sont décomposées selon leurs deux sources réellement approuvées ; la
  transition reste non classée. Une preuve stricte des trois ratios et de la
  fréquence est nécessaire avant de réconcilier un ancien ratio en nombre de
  séances. Le constat natif original reste dans l'audit.
- La vraie épreuve de triathlon constitue aussi une exposition natation pour la
  récupération. Une brique d'entraînement vélo-course conserve deux disciplines.
- Les nouveaux cas exigent une vraie séance clé dans le domaine du limiteur
  déclaré : VO2 pour le sprint, MLSS pour TTE/CSS, et MLSS/sous-seuil/VO2 pour le
  développement FTP. Une accélération neuromusculaire ne peut pas la remplacer.
- Le cyclisme et la natation utilisent des fréquences explicitement déclarées
  par le coach synthétique, tracées `coach_declared`, avec modulation de récupération
  et affûtage. Leurs ancres individuelles sont fournies directement. Aucun nouveau
  diagnostic, seuil normatif, score ou objectif du formulaire produit n'est attesté.
- Les deux courses du multi-objectifs sont liées à leur date et à leur objectif
  exacts : 10 km B le 19 décembre 2026, semi A le 14 février 2027. Les durées de
  40 et 95 minutes sont des **estimations planifiées**, pas des mesures ni des
  prédictions de performance. La semaine S9 de récupération conserve sa fréquence,
  retire la sortie longue obligatoire d'une décharge ordinaire et doit démontrer
  une baisse d'au moins 30 % des minutes planifiées, course estimée comprise. Le
  contre-calcul exige aussi 48 h après le B avant la prochaine exposition course.
- Pour les sept nouveaux calendriers, les minutes faciles doivent représenter au
  moins 75 % de **toute** la durée d'endurance des semaines de charge, inconnues
  comprises au dénominateur. Chaque décharge doit démontrer une baisse calculée
  d'au moins 30 %. Les contrats historiques conservent leurs critères propres et
  restent testés séparément.

## Bibliothèque V3

Les **800 recettes historiques restent intactes**. Deux candidates supplémentaires
possèdent leur registre de source et leur empreinte propres ; aucune n'est activée
sans revue explicite de son ID pour l'athlète synthétique du cas :

- `V3P_RUN_201` : 49 minutes, dont 2 × 12 min MLSS, récupération inter-blocs de
  3 min non classée, récupération minimale de 48 h. Cette candidate de V3.58 reste
  nécessaire au témoin 10 km de 10 semaines compétiteur.
- `V3P_RUN_202` : **22 minutes faciles**, 5 min de mise en route, 3 × (3 min de
  course douce + 1 min de marche), 5 min de retour facile ; récupération minimale
  de 24 h. Elle couvre un contact court de récupération sans seuil ni sprint. Le
  multi-objectifs doit réellement l'utiliser ; le même cas sans cette source reste
  refusé. Ce contenu est une candidate originale fondée sur des principes, sans
  approbation humaine ni validation scientifique individuelle implicite.

Les contrats anciens restent à 800 sources. Un contrat n'ajoute que les candidates
supplémentaires explicitement demandées (801 pour chacun des deux témoins ci-dessus).
Les compositions sprint/olympique réutilisent des sources existantes et ne comptent
pas comme des recettes supplémentaires : 35 + 3 + 35 min (sprint), 80 + 3 + 35 min
(olympique base), 110 + 3 + 35 min (olympique spécifique).

## Reproduction et limites

`det-fifteen-family-evidence.yml` exécute sept vrais cas positifs, deux refus
intentionnels et les tests de preuve/date/récupération. Il exporte les calendriers,
les journaux et la déclaration des sources calculée sans attestation de déploiement.
Le contre-calcul Python indépendant échoue sur tout écart de sources, blocs,
fréquences, ratios, minutes, horaires, récupération, dates ou contraintes vérifiées.
Pour les quatre nouveaux témoins multisports, il recalcule les doses directement
depuis les blocs JSON originaux, avec la doctrine TFCL comme source des zones.
Pour les trois témoins course, il conserve aussi la couverture TTE d'au moins 30 %
de toutes les séances clés. Les preuves de dose source et leurs refus restent
couverts par les tests d'ingestion.

Les workflows marathon et course réexécutent les 21 calendriers déjà acceptés,
avec leurs contre-calculs et leurs refus conservés. La CI générale vérifie les
sources TypeScript, les tests frontend/DET, ESLint, Deno et Playwright. La
fraîcheur de la déclaration des sources doit rester vérifiée ; elle ne prouve
aucune publication.

## Exécutions de référence sur le SHA exact

Code testé : `b40fd9174c2053a8c2523ca4ad00e877b962f965`.

- [Sept nouveaux calendriers, deux refus, six tests de preuve, TypeScript et contre-calcul](https://github.com/Vinch11/tfclab/actions/runs/41660718605) : réussis ; [artefact](https://github.com/Vinch11/tfclab/actions/runs/41660718605/artifacts/13242306276).
- [Dix semi/10 km, refus sans RUN_201, tests de source et sept références 70.3/Ironman](https://github.com/Vinch11/tfclab/actions/runs/41660719290) : réussis, contre-calcul course réussi ; [artefact](https://github.com/Vinch11/tfclab/actions/runs/41660719290/artifacts/13242590911).
- [Quatre marathons, quatre refus conservés et contre-calcul](https://github.com/Vinch11/tfclab/actions/runs/41660718571) : réussis ; [artefact](https://github.com/Vinch11/tfclab/actions/runs/41660718571/artifacts/13241147880).
- [CI générale du même code](https://github.com/Vinch11/tfclab/actions/runs/41660718555) : **5/5 jobs réussis** : frontend TypeScript/Vitest, moteur DET complet, ESLint, Deno et Playwright.

Les JSON voisins conservent la matrice des familles, les 28 identifiants exacts,
les résultats du nouveau contre-calcul et les empreintes SHA-256 des archives CI.
Les archives ont une rétention limitée ; les sources et commandes versionnées
permettent de rejouer le banc.

Aucune donnée athlète réelle, génération IA, écriture Supabase, sortie Nolio/PDF,
fusion ou publication n'est comprise dans cette validation.
