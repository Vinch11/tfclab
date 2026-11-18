# Cibles internes : audit et correction du 18 novembre 2026

## Contrat scientifique

Les tableaux TFCL historiques ne constituent pas des normes validées croisant objectif, ambition, âge et sexe. Les valeurs numériques conservées sont des **repères de coaching**. Ni leur proximité avec une moyenne publiée, ni les tests logiciels ci-dessous ne valident ces seuils scientifiquement. Le code expose désormais `targetCalibration` séparément de la complétude des mesures. Les facteurs d'âge historiques sont des hypothèses ; aucun facteur féminin arbitraire n'est ajouté. Les âges hors population adulte, les débutants et les objectifs inconnus ne produisent plus de classement automatique de déficits de compétition.

Un chrono explicitement saisi impose une vitesse indépendante du sexe et de l'âge. Sa difficulté relative doit être située dans les résultats de l'épreuve et de la catégorie correspondante. Un objectif de classement/qualification ne peut pas être converti en exigences physiologiques universelles. Les descriptions d'ambition n'affirment plus une équivalence validée avec des percentiles précis.

## Corrections communes

- Accesseur unique VLamax : les cinq ambitions utilisent la même fourchette canonique du sport ; ancienne table brute masquée par l'accesseur. Half et Half-Ironman routent vers 70.3 ; Ultra utilise la course si le sport est omis.
- `targetsUsed` et `diagnostic.targets.current` exposent les nombres réellement comparés, ajustements d'âge inclus. Suppression du plancher TTE de 35 min qui contredisait les formats courts.
- Sélection des écarts en pourcentage, et non dans des unités arbitrairement comparées à −3.
- Aucune durabilité déduite de « durée course × fraction d'intensité » ni du franchissement du TTE. Le découplage observé demeure un indice distinct, dépendant du protocole et des conditions.
- Suppression du bonus de priorité VLamax à 50/60 ans : la source INSCYD citée auparavant ne justifiait pas les multiplicateurs 1,15/1,25.
- Une VLamax sous la borne n'est plus dite optimale et ne commande pas une baisse supplémentaire. Cela ne justifie pas non plus une hausse automatique : vérifier test, discipline et besoins d'épreuve.
- Un FatMax renseigné n'est plus invalidé par un modèle fondé sur la VLamax. Une estimation de FatMax reste une estimation ; aucun lien causal individuel n'est certifié.
- W′ absolu conservé descriptivement mais exclu du classement prescriptif automatique : norme non validée par masse, sexe et protocole.
- Statuts VO₂max/FTP/TTE cohérents avec les seuils du diagnostic, indépendants des arrondis d'affichage. Les seuils de tolérance restent des conventions de coaching.
- Les valeurs physiologiques non finies, nulles ou négatives restent inconnues.

## Parcours coach

- Tableau Academy : cinq niveaux sans crash, VMA pour les cibles de course disponibles, fourchettes VLamax cohérentes et statut de preuve explicite.
- Suivi : VMA/TTE course/VLamax course séparés de FTP/TTE vélo/VLamax vélo. Comparaisons métrique par métrique, sans moyenne à dénominateur variable ni date prédite d'atteinte d'ambition. Le suivi triathlon décrit explicitement le vélo ; il ne prétend pas couvrir la natation.
- Gap Ambition : chrono demandé récupéré du contrat d'objectif existant. Les chronos génériques et volumes standards ne sont plus présentés comme des exigences individuelles. Projection physiologique et demande restent séparées. Les tables exportées historiques subsistent pour la compatibilité des contrôles de plan, pas comme normes scientifiques.
- Scénario VMA publié : libellés descriptifs, jamais « pas de déficit » ni validation d'ambition. La fourchette reste une analyse de sensibilité, pas une distribution normative.

## Sources primaires et portée exacte

| Source | Ce qu'elle soutient | Ce qu'elle ne valide pas |
| --- | --- | --- |
| Maunder et al., 2021, [doi:10.1007/s40279-021-01459-0](https://pubmed.ncbi.nlm.nih.gov/33886100/) | Durabilité = apparition et amplitude de dégradation pendant l'exercice prolongé. | Une conversion de temps de course en TTE requis. |
| Hunter et al., 2025, [méthodes de durabilité](https://pmc.ncbi.nlm.nih.gov/articles/PMC12576026/) | Conditions d'évaluation contrôlées, dont nutrition et environnement. | Des limites universelles à partir d'un découplage isolé. |
| Sitko et al., 2022, [doi:10.1016/j.jsams.2022.06.007](https://pubmed.ncbi.nlm.nih.gov/35835698/) | TTE à FTP estimée dépendant du niveau et de l'expérience, avec variabilité individuelle. | Équivalence FTP/CP/MLSS ou seuils TTE pour chaque âge/sexe/épreuve. |
| Quittmann et al., 2021, [doi:10.1055/a-1273-7589](https://pubmed.ncbi.nlm.nih.gov/33137832/) | VLamax à évaluer spécifiquement en course et à vélo. | Conversion individuelle par offset constant ou fourchette optimale par ambition. |
| Quittmann, revue 2025, [PMID:41171430](https://pubmed.ncbi.nlm.nih.gov/41171430/) | Fiabilité et spécificité des tests, limites actuelles de l’application individuelle et sous-représentation féminine. | Des cibles universelles ni un effet d’entraînement individuel garanti par une VLamax. |
| Gordon et al., 2017, [doi:10.2147/OAJSM.S141657](https://pmc.ncbi.nlm.nih.gov/articles/PMC5703178/) | Physiologie de groupes de marathoniens par temps réalisé. | Normes VMA de 5 km, triathlon, âge/sexe ou qualification ; moyenne ± SD ≠ intervalle optimal. |

Les nombres historiques (VO₂max, VMA, FTP/kg, TTE, charge, nutrition, multiplicateurs world_class et âge) restent **non calibrés** en tant que matrice objectif × ambition × population. La littérature justifie les distinctions physiologiques, pas l'ensemble de ces nombres. Les séances ne sont pas recalibrées par des normes inventées.

## Validation nécessaire pour des cibles personnalisées validées

Avant de qualifier cette matrice de scientifiquement validée : réunir données de tests avec discipline, protocole, date, incertitude et provenance ; résultats réels avec parcours, météo, âge, sexe et catégorie ; historique d'entraînement et horizon. Construire puis tester sur une cohorte indépendante des intervalles et erreurs par sous-groupe, en distinguant association et causalité. Aucune cohorte de ce type n'est fournie dans le dépôt. Les résultats d'épreuve servent à calibrer l'ambition relative ; ils ne permettent pas à eux seuls d'inférer VO₂max, VLamax ou FTP requis.

Les changements sont autorisés pour corriger le diagnostic, donc l'ordre automatique des priorités peut évoluer. Les choix explicites du coach, les règles de prescription par discipline et les contrôles IA/DET demeurent les contrats applicables. Aucun export Nolio réel ni génération payante n'est réalisé pour ces tests.

## Vérification locale

- 612 tests passent dans 75 fichiers couvrant diagnostic, cibles, comparaisons Compass et adaptation des priorités coach ; le test de matrice parcourt 13 objectifs × 5 ambitions × 11 âges × 2 sexes (1 430 combinaisons).
- 22 tests supplémentaires passent sur restauration de plans, contrats d'objectifs des premiers athlètes, contrats post-419 et build Lovable.
- Vérification TypeScript sur `tsconfig.app.json` réussie ; compilation Vite/PWA réussie. Le manifeste de source est régénéré par le script officiel.
- Aucun nouvel échec ESLint ; cinq erreurs préexistantes restent dans AIPlanViewer/ambitionLevel, reproduites sur le commit de départ fe3ed8b. Deux erreurs préexistantes ont été corrigées dans les fichiers touchés (ordre d'un hook React et expression régulière).
- Ces contrôles prouvent des propriétés logicielles, pas une validation scientifique de toutes les cibles ni l'efficacité d'un plan réel. Aucun test réel d'export Nolio n'a été effectué.

### Vérification des effets sur 600 scénarios de planification

Comparaison exhaustive au commit de départ : **590 lignes identiques ; seules les priorités changent sur 10 lignes** (9 StartToRun : suppression du faux déficit VO₂max ; 1 TrailMountain : cible VO₂max trail au lieu du repli 70.3). Aucun changement des phases, durées, doses, catalogues, alertes ou statuts de sécurité dans cette matrice. Le test conserve l’empreinte de référence antérieure et vérifie explicitement ces dix transitions ; il ne remplace pas aveuglément la référence.

Le passage complet a produit 3 699 tests réussis et cet unique écart d’empreinte. Après revue des dix transitions, le test global des 600 cas est rejoué et réussit (122,6 s). Aucune assertion de charge, de calendrier ou de sécurité n’est assouplie. Publication GitHub non effectuée : contrôle automatique d’approbation bloquant, en attente d’autorisation explicite.
