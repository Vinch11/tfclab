# TFCLab DET V3.10 — dossier de preuve expérimentale (31 octobre 2026)

## Isolation et verdict
- Branche expérimentale de la PR #454, **DRAFT / NO-GO**. Pas de fusion ni de modification en production.
- Athlètes, approvals, horaires et dates de course du banc d'essai **entièrement synthétiques**.
- Les 800 fiches V3 ne sont **pas** équivalentes à 800 candidates simultanément utilisables dans un calendrier : les filtres objectif / phase / ancrages / approbation / créneau sont obligatoires.
- Construire 12 ou 16 semaines n'est **pas** prouver leur conformité sportive.

## Dernier point de référence vérifié avant les nouveaux garde-fous
CI du commit `3bff896aeb936fbf903ad9f182f1cd061c30fed9` :
- DET spécialisé : **195 tests réussis, 7 ignorés**, aucun échec (45 fichiers de tests, 44 réussis et 1 ignoré).
- Frontend CI : **3 échecs** — 2 empreintes d'attestation Lovable `PLAN_RELEASE_DECLARATION_STALE:releaseId`, 1 empreinte de matrice globale de planification. Ne pas les blanchir ni les traiter comme un GO.
- ESLint, TypeScript expérimental, Deno et Playwright : jobs verts.

## Résultats du solveur structuré sur sources individuellement admises
| Scénario QA | Sans horaires coach attestés | Avec horaires synthétiques explicitement confirmés |
|---|---|---|
| 70.3 | Refus S1 en 0 nœud, `missing_certified_slot` (les domaines réellement sûrs manquent de sources prouvées) | **12/12 semaines construites**, 108 nœuds, conformité globale **NON** |
| Ironman | Refus S1 en 0 nœud, même classe de preuve manquante | **16/16 semaines construites**, 181 nœuds, conformité globale **NON** |

Le certificat en 0 nœud couvre **le domaine de candidats du calendrier en question**, jamais toute la bibliothèque ni la faisabilité pour un coach disposant de nouveaux créneaux.

Ces deux variantes avec horaires confirmés bénéficient d'un pool élargi de sources V3 réelles et approuvées **uniquement par le coach synthétique du test** : 51 acceptées pour le 70.3 et 48 pour l'Ironman, pas 800 séances approuvées automatiquement.

### Ratios observés dans les semaines de charge : minute exacte, pas nombre de séances
| Discipline | Cible 70.3 | 70.3 | Cible Ironman | Ironman |
|---|---:|---:|---:|---:|
| Natation | 15–20% | **26,3725%** | 15–20% | **23,7780%** |
| Vélo | 40–50% | **29,0107%** | 45–55% | **32,8922%** |
| Course | 30–40% | **44,6168%** | 25–35% | **43,3298%** |

- Tous ces ratios sont hors cibles dans ce banc d'essai.
- Le certificat de capacité constate que la marge restante ne permet même pas de régler l'excès de natation **par ajout seulement** de minutes non-natation : en 70.3, besoin optimiste 1 144 min / marge au mieux 313,67 min ; en Ironman 1 256 min / 611 min.
- Ce verdict est **spécifique aux séances déjà sélectionnées** ; il ne prouve pas que toute autre réaffectation des sources approuvées soit impossible.
- Le contrôle historique par **nombre de séances** reste incompatible avec ces quotas ; sa migration vers les minutes strictes n'est autorisée qu'avec dose exacte, composition des bricks prouvée, quotas de fréquence indépendants et toutes les cibles dans leur plage. Il ne faut pas neutraliser un autre blocage sportif.

### Polarisation
- Le test rigoureux `requireStructuredPolarizationOnLoadWeeks` raisonne sur les blocs de zones des sources V3 revues, non sur la lecture approximative du texte.
- Une borne optimiste permet de prouver une impossibilité locale sans aucun DFS lorsque la couverture certifiée manque.
- Les échecs du **validateur historique** de polarisation restent bloquants : aucune substitution automatique n'est justifiée par les seules durées structurées.
- Une recherche arrêtée sur budget n'est **jamais** une impossibilité démontrée.
- Le scénario S9 70.3 a reçu des candidats peak seuil/VO2 et endurance faciles existants, **sans invention de nouvelles prescriptions** ; le test ajouté ci-dessous doit certifier les doses *effectivement sélectionnées* avant de qualifier ce progrès.

## Garde-fou additionnel (commits V3.10 du 31 octobre)
1. `matchingStructuredDose` refuse maintenant un registre où les minutes `low + mid + high + unknown` ne totalisent pas exactement la durée prescrite (tolérance numérique `1e-7` min), ou si une composante est négative/non finie ; préserve les secondes de natation fractionnaires légitimes.
2. `composeReviewedBrickZoneDose` vérifie d'abord la conservation des minutes des **deux** sources composantes : une transition ne peut pas dissimuler des minutes de zone falsifiées.
3. Tests de non-régression sur injections de minutes incohérentes, NaN, négatives, infinité et allures de natation fractionnaires.
4. Le scénario 70.3/IM avec horaires synthétiques vérifie indépendamment, **sur chaque semaine de charge du plan retourné**, la traçabilité de chaque séance d'endurance, la conservation du temps, la proportion `Z1-Z2 >=75%` des minutes classifiables et `inconnues <=30%` des minutes d'endurance. La trace détaille la S9 du 70.3.

**Résultats CI de ces garde-fous : à relever sur le SHA final ; ne pas reprendre les 195/7 du SHA précédent comme leur preuve.**

## Priorité sportive suivante (ordre, sans baisser les exigences)
1. **Reconstruction simultanée** : allocation des sources et doses vélo/natation/CAP compatibles avec les trois ratios stricts *et* les plafonds, la récupération, les seuils clés, les décharges et les quotas sportifs. Ne pas tenter une simple extension du budget DFS.
2. **Bricks** : refus sans composition vélo-transition-course approuvée, y compris aux semaines peak. Pas de partage 50/50 fictif.
3. **Convergence des validations de polarisation** : comparer explicitement chaque semaine un registre physiologique V3 structuré aux classements natifs, sans effacer les blocages natifs avant preuve de remplacement strict.
4. **CI intégrale et production** : conserver les verrous d'attestation; tester séparément persistance Supabase, réouverture et export, et prévoir une revue coach indépendante.

**Verdict : amélioration mesurable de la fiabilité des preuves, mais conformité multisport non démontrée, diffusion aux athlètes NON.**
