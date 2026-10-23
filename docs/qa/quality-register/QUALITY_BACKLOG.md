# Registre de qualité TFCLab

Date de référence : 2026-10-23. Base auditée : `main` à `45988ae684b499fdbcee20b3b06ef38d749ccb4d` (squash de la PR #393).

Ce registre consolide les preuves versionnées du dépôt, les descriptions et états GitHub des PR #365 à #393, les exports B-5K conservés dans les tests, l'audit scientifique P0 et l'audit local reproductible des 897 fiches non structurées. Il regroupe les symptômes qui partagent une cause. Une réussite de CI prouve l'exécution des contrôles techniques ; elle ne valide pas sportivement un plan généré.

## Limite de provenance des « 8 P0 / 13 P1 »

Le dépôt et les branches GitHub accessibles ne contiennent pas le rapport source qui numérote explicitement ces 21 constats. La branche de sprint active `fix/p0-plan-validity-guardrails-20261023` contient un commit poussé (`8bc61949`) qui démontre deux causes P0 et un défaut de remontée P1. Les autres intitulés exacts de Claude ne sont pas reconstructibles sans son rapport ou sa conversation. Le tableau ci-dessous recense donc les anomalies prouvées par les sources disponibles et marque cette lacune comme `non vérifiable`, au lieu d'attribuer à Claude une liste inventée.

## États et comptage

| Priorité | Corrigé et fusionné | Corrigé mais non fusionné | Confirmé ouvert | Suspecté | Non vérifiable |
|---|---:|---:|---:|---:|---:|
| P0 | 8 | 2 | 0 | 0 | 1 |
| P1 | 9 | 1 | 5 | 4 | 1 |
| P2 | 2 | 0 | 3 | 5 | 2 |
| P3 | 2 | 0 | 1 | 2 | 1 |

Les **anomalies encore ouvertes démontrées** sont donc : P0 **0** sur `main` mais **2 protections P0 seulement corrigées sur la branche de Claude** ; P1 **6** en comptant le correctif non fusionné ; P2 **3** ; P3 **1**. Les signalements suspectés/non vérifiables sont suivis séparément et ne sont pas comptés comme défauts démontrés.

## Registre dédupliqué

| ID | P | Anomalie et conséquence | Preuve | État | Association | Effort / risque | Propriétaire |
|---|---|---|---|---|---|---|---|
| QP-001 | P0 | Un objectif 5 km pouvait produire 0 séance de course à cause d'un faux bannissement `Start-to-Run`, d'une normalisation `5 KM` absente et d'un contrôle silencieux. Plan inutilisable. | `RAPPORT_B5K_BEGINNER_CORRECTIFS.md`; tests `constraintRules`, `normalizeObjectiveKey`, `objectiveSportConflict`. | corrigé et fusionné | PR #375 | M / moyen | Claude |
| QP-002 | P0 | Un profil débutant pouvait recevoir des charges/intensités et un nombre de séances par jour incompatibles avec sa configuration. | PR #376, fixture B-5K et tests de niveau/contraintes. | corrigé et fusionné | PR #376 | M / moyen | Claude |
| QP-003 | P0 | Des protocoles spéciaux non confirmés entraient dans le catalogue initial ou les remplacements. | PR #377 puis couverture catalogue dans PR #378. | corrigé et fusionné | PR #377–378 | M / moyen | Claude |
| QP-004 | P0 | Des simulations semi/marathon/70.3/IM incompatibles avec un objectif 5/10 km étaient favorisées par le scoring. | PR #379 : cinq simulations et reproduction du rang n°1. | corrigé et fusionné | PR #379 | S / faible | Claude |
| QP-005 | P0 | Huit séances à prérequis « confirmé » étaient accessibles à un profil non entraîné. | PR #380 et tests catalogue/réconciliateur. | corrigé et fusionné | PR #380 | S / faible | Claude |
| QP-006 | P0 | Les réparations pouvaient remplacer une séance par une autre de même famille grossière mais d'objectif, prérequis, contexte ou semaine incompatibles. | `src/lib/plan/REPAIR_SPORTING_EQUIVALENCE.md`; PR #383. | corrigé et fusionné | PR #383 | L / moyen | Codex |
| QP-007 | P0 | Trois protocoles à risque ne devaient jamais être auto-autorisés et 26 séances avancées exigeaient une approbation vérifiée. | PR #393; tests `workoutEligibility`, catalogue et remappage. | corrigé et fusionné | PR #393 | M / moyen | Codex |
| QP-008 | P0 | Les contrôles débutant existaient en diagnostic seulement et pouvaient laisser croire à une couverture de sécurité complète. | `docs/audits/p0-b5k-deployment-readiness-2026-10-18.md`; six `it.todo`; PR #388. | corrigé et fusionné pour l'affichage/accès, blocage complet non revendiqué | PR #387–388 | M / moyen | Claude |
| QP-009 | P0 | Un plan 70.3 pouvait contenir zéro natation sans erreur bloquante, car le contrôle objectif↔sport quittait le cas multidiscipline et le ratio redistribuait les cibles. | Branche `fix/p0-plan-validity-guardrails-20261023`, commit `8bc61949`, `planValidator.ts` autour de `validateObjectiveSportCoherence`. Cas réel déclaré : 0 swim, 7 bike, 163 run. | corrigé mais non fusionné | branche Claude | S / faible | Claude |
| QP-010 | P0 | Un jalon 10 km pouvait devenir le pic final d'un plan 70.3 : le dernier objectif daté était retenu indépendamment de la priorité coach. | Même commit, nouvelle `validateFinalObjectiveMatchesMainGoal`; tests `planValidator.finalObjectiveMismatch`. | corrigé mais non fusionné | branche Claude | S / faible pour le garde-fou; correction source plus risquée | Claude |
| QP-011 | P0 | La liste source exacte des 8 P0 de l'audit global Claude n'est pas versionnée ; six entrées éventuelles ne peuvent pas être reliées sans ambiguïté aux causes ci-dessus. | Recherche sur `main`, toutes branches distantes et pièces jointes accessibles : aucun rapport numéroté 8/13. | non vérifiable | dépend du rapport Claude | — | Claude |
| QP-012 | P1 | `intentFamilyOf` pouvait classer un fartlek dur comme technique et les semaines de décharge pouvaient dépasser leur plafond d'intensité. | PR #381, tests bloc `Main` et recovery cap. | corrigé et fusionné | PR #381 | M / moyen | Claude |
| QP-013 | P1 | Chaleur non demandée et faux positifs repos/course/intensité dégradaient le plan et le diagnostic B-5K. | `RAPPORT_PILOTE_2026-10-15.md`; PR #382. | corrigé et fusionné | PR #382 | M / faible | Codex |
| QP-014 | P1 | Les doublons de `catalogId` et le cumul Sleep Low/Train Low/à jeun pouvaient survivre dans une même semaine. | PR #369–370. | corrigé et fusionné | PR #369–370 | S / faible | Claude |
| QP-015 | P1 | Les instructions Train Low contredisaient le plafond déterministe ; des phases laissaient des semaines hors bloc. | PR #366–368. | corrigé et fusionné | PR #366–368 | M / faible | Claude |
| QP-016 | P1 | La charge récente réelle pouvait être ignorée dans la cible de volume initiale ; 17 h de consolidation entraient en conflit avec 18 h. | PR #389, garde `NOLIO/SNAPSHOT`, plafond 17 h et tests du profil 10K→70.3. | corrigé et fusionné | PR #389 | M / moyen | Claude |
| QP-017 | P1 | Progression des sorties longues, fausse décharge des semaines peu fréquentes et taper IM pouvaient masquer une charge inadéquate. | PR #389, tests par discipline/deload/taper. | corrigé et fusionné | PR #389 | M / moyen | Claude |
| QP-018 | P1 | Un jalon course dans un cycle triathlon pouvait supprimer le rappel de maintien natation/vélo/briques. | PR #389 et tests Deno `jalonSwimBikeMaintenance`. | corrigé et fusionné | PR #389 | S / faible | Claude |
| QP-019 | P1 | Le Pilot Cockpit contournait le diagnostic et la stratégie ; les limiteurs/leviers n'étaient pas préparés par la chaîne coach. | PR #384 et `PILOT_PHYSIOLOGICAL_PIPELINE.md`. | corrigé et fusionné | PR #384 | M / moyen | Codex |
| QP-020 | P1 | Une violation `rest_floor_breached` du réconciliateur serveur n'atteint pas la validation finale visible sur `main`. | `src/lib/plan/qa/finalValidation.ts:46`; ajout et test sur branche `8bc61949`. | corrigé mais non fusionné | branche Claude | S / faible | Claude |
| QP-021 | P1 | 897/920 fiches n'ont toujours pas d'intention physiologique structurée certifiée ; 741 requièrent une revue manuelle selon l'audit déterministe. | Audit local `workout-audit-report.md`: 156 cohérentes selon règles, 741 manuelles, 0 contradiction certaine. | confirmé ouvert | aucune | XL / élevé | revue coach |
| QP-022 | P1 | La durée détaillée n'est complètement vérifiable que pour 330/897 fiches ; 567 restent partielles ou indéterminables. Cela empêche de prouver la cohérence prescription↔durée. | Audit physiologique 2026-10-22; limites mètres/km sans allure. | confirmé ouvert | aucune | L / moyen | Codex + coach |
| QP-023 | P1 | Les contrôles d'intensité de plan perdent encore une partie des durées structurées et ne comprennent pas toutes les répétitions/blocs. | `RAPPORT_PILOTE_2026-10-15.md`: S8 95 min reconnus vs 165 structurés, S11 30 vs 65. | confirmé ouvert | aucune | M / moyen | Codex |
| QP-024 | P1 | Les plafonds de plausibilité couvrent VO2max/VLamax/LT2/FatMax mais pas TTE, durabilité et économie ; une projection TTE peut atteindre +50 %. | `AUDIT_SCIENTIFIQUE_P0.md`, F2. | confirmé ouvert | aucune | M / élevé | revue coach puis Claude |
| QP-025 | P1 | Le modèle run MLSS repose sur une petite cohorte et son verdict de dérive n'est pas un kill-switch du chemin de production. | `AUDIT_SCIENTIFIQUE_P0.md`, F8–F9. | confirmé ouvert | aucune | L / élevé | revue coach |
| QP-026 | P1 | Les 99 séances avancées sans prérequis structurés étaient des candidats, pas 99 erreurs. PR #393 protège 29 cas nommés mais ne démontre pas la sûreté des autres. | Audit 897 + PR #393 (3 absolues, 26 conditionnelles). | suspecté | PR #393 partiel | L / moyen | revue coach |
| QP-027 | P1 | Quarante divergences objectif déclaré↔stimulus sont des candidats à revue, aucune contradiction certaine automatisée. | Audit 897 : `declared_objective_stimulus_mismatch=40`, certitude 0. | suspecté | aucune | M / moyen | revue coach |
| QP-028 | P1 | Le lien limiteur→levier→séance finale reste `not_verified` quand la fiche, la dose ou l'attribution causale manque ; l'instruction donnée à Gemini ne constitue pas une preuve. | `src/lib/plan/qa/SESSION_PHYSIOLOGICAL_TRACEABILITY.md:27`; PR #385. | suspecté selon séance | PR #385 | L / moyen | Codex + coach |
| QP-029 | P1 | Le corpus ne contient pas l'export structuré réel du plan 70.3 32 semaines mentionné par le sprint ; les assertions 0/7/163 proviennent du rapport/commit, pas d'un fichier rejouable sur `main`. | `RAPPORT_QUALITE_PLANS_T1T2T3.md` indique l'absence de corpus réel à sa date ; recherche actuelle sans export correspondant. | non vérifiable | dépend de l'export | S pour ajouter fixture | Claude |
| QP-030 | P2 | 84 ambiguïtés prioritaires de zones et 16 libellés hors référentiel nécessitent une revue ; Z4/Z5/Z6 ne sont pas convertibles entre grilles sans sémantique. | Audit 897; 295/897 fiches ont une grille ambiguë au sens large. | confirmé ouvert | aucune | L / moyen | revue coach |
| QP-031 | P2 | Neuf des douze effets de leviers n'ont pas de citation attachée à leurs bornes min/max. | `AUDIT_SCIENTIFIQUE_P0.md`, F1. | confirmé ouvert | aucune | M / faible | revue coach |
| QP-032 | P2 | Le facteur d'adaptation avec la durée est linéaire et non sourcé. | `AUDIT_SCIENTIFIQUE_P0.md`, F3. | confirmé ouvert | aucune | M / moyen | revue coach |
| QP-033 | P2 | La confiance VLamax est calculée mais n'influence pas la sélection des séances. | `AUDIT_SCIENTIFIQUE_P0.md`, F7; recherche `.confidence` dans les sélecteurs. | suspecté quant à l'effet sportif | aucune | M / élevé | revue coach puis Claude |
| QP-034 | P2 | La formule FatMax course est locale, non sourcée et ne dépend pas du VO2max, contrairement à la branche vélo ; les domaines ne permettent pas un portage automatique. | `AUDIT_SCIENTIFIQUE_P0.md`, F11. | suspecté | aucune | M / élevé | revue coach |
| QP-035 | P2 | La qualité des instructions athlète n'est pas contrôlée de façon déterministe au-delà de motifs/tokens ; clarté, exécution et sécurité contextuelle exigent une revue humaine. | Couverture des validateurs et limites de `SESSION_PHYSIOLOGICAL_TRACEABILITY.md`. | suspecté | aucune | L / moyen | revue coach |
| QP-036 | P2 | La fréquence réelle de réutilisation inter-plans n'est pas mesurable depuis les plans/exports présents. Les doublons intra-semaine sont protégés, pas une distribution d'exposition réelle. | PR #369 protège l'intra-semaine ; absence de corpus longitudinal. | non vérifiable | aucune | M / faible | Codex |
| QP-037 | P2 | La répartition récente de charge par sport (ex. 3 h swim/8 h bike/6 h run) reste dans un texte contextuel et n'est consommée par aucun champ structuré. | `src/lib/plan/qa/syntheticProfiles.ts:538`. | suspecté | aucune | L / élevé | Claude après sprint P0 |
| QP-038 | P3 | Le statut physiologique final distingue désormais `verified`, `uncertain` et `not_verified` sans gonfler les scores QA. | PR #385. | corrigé et fusionné | PR #385 | M / faible | Codex |
| QP-039 | P3 | Les corrections d'impression #390–392 ont résolu les exports tronqués/vides mais n'apportent aucune preuve sportive. | PR #390–392. | corrigé et fusionné | PR #390–392 | M / faible | Claude |
| QP-040 | P3 | Le registre ne dispose pas d'une source machine-readable unique liant chaque incident réel, export et décision coach. | Multiplicité des rapports racine, PR et branches ; source 8/13 absente. | confirmé ouvert | cette branche documentaire | S / faible | Codex |
| QP-041 | P3 | Les rapports coach peuvent afficher des indicateurs calculés sur des données faibles sans exposer partout la même confiance/source ; plusieurs correctifs historiques ont réduit les divergences mais aucune preuve globale n'existe. | F7/F9, PR #384–385 et branches historiques de cohérence de rapports. | suspecté | plusieurs branches fusionnées | L / moyen | revue coach + Codex |
| QP-042 | P3 | L'absence d'un signal dans le registre peut refléter un angle mort du corpus ou du validateur. | `RAPPORT_QUALITE_PLANS_T1T2T3.md` et couverture ci-jointe. | non vérifiable par définition | aucune | continu | Codex |

## Corrections fusionnées majeures

- Plans 10 km : dédoublonnage, cumul à jeun, cohérence du prompt et phases (#365–370).
- B-5K : objectif/sport, niveau, contextes spéciaux, simulations incompatibles, décharge et faux positifs (#375–382).
- Réparations sportives, chaîne physiologique et traçabilité finale (#383–385).
- Volume récent, progression longue, décharge, ambition/taper et jalon 10 km→triathlon (#389).
- Intentions structurées progressives et prérequis de sécurité (#393).

## Règles de lecture

- `corrigé et fusionné` signifie présent dans `main`, pas validé sur tous les athlètes.
- `corrigé mais non fusionné` signifie présent uniquement sur une branche distante.
- `suspecté` requiert une trace, un export réel ou une décision sportive.
- `not_verified` signifie données insuffisantes ; il ne signifie pas séance incorrecte.

