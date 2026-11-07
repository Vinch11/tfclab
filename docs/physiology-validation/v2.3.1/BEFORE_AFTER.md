# C8 — comparatif V2.3 → V2.3.1

Référence immuable : `9f67b70240d21f4d07ef29828a64d01b2060fadf`. Un worktree détaché exécute le même probe que la branche corrigée. Les deux captures, `evidence/chain-before.json` et `chain-after.json`, conservent les résultats réels, pas des nombres attendus reconstruits. Données entièrement synthétiques.

## A1 — sélection et conséquences aval

Entrée indépendante : course, VLamax brute 0,70, VMA 18 km/h, allure seuil 235 s/km. Le second cas ajoute seulement `vlamax_protocol = "Aucune mesure labo, valeur coach inconnue"`. Aucun sujet/source/protocole lactate documentaire ne justifie une priorité laboratoire.

| Frontière | V2.3 sans texte | V2.3 avec texte négatif | V2.3.1 avec texte négatif |
| --- | --- | --- | --- |
| Résolveur : valeur | 0,42 | **0,70** | **0,42** |
| Résolveur : confiance interne | 0,40 | **0,92** | **0,40** |
| Analyse de cycle : valeur | 0,42 | **0,70** | **0,42** |
| Diagnostic : valeur | 0,42 | **0,70** | **0,42** |
| Diagnostic : confiance interne | 0,50 | **0,95** | **0,50** |
| Diagnostic : catégorie de calcul | estimation | **test_labo** | **estimation** |
| Valeur transmise à la planification | 0,42 | **0,70** | **0,42** |
| Qualification individuelle | non établie | non établie | **non établie**, dose non approuvée |

L'entrée sans texte conserve ses résultats. Une négation, une mention historique, `LAB` ou une description libre ne modifie plus cette sélection. Les tests de catégorie LAB/LACTATE_LAB/VLAMAX_LAB reproduisent aussi l'absence de preuve suffisante.

Conséquences réelles du cas erroné corrigé : limiteur principal **glycolytic → aerobic_engine**, levier **decrease_vlamax → increase_vo2max**, sévérité **severe → moderate**, score indicatif de préparation **41 → 61** et catégorie **preparation_required → in_progress**. Le résultat rejoint celui de l'entrée sans texte. Ces changements ne sont ni masqués ni assimilés à une invariance QA ; ils résultent du changement de valeur sélectionnée, sans modification de formule de diagnostic, seuil ou protection. La confiance globale et ces scores restent des conventions internes, pas une validation individuelle ni une autorisation de prescription.

Une vraie référence documentaire synthétique, sujet/discipline/quantité/unité/valeur/méthode/date/source cohérents, `methodKind=blood_lactate_protocol`, source lactate primaire identifiable et nature calculée/estimée, conserve sa priorité : 0,70 dans le résolveur, le diagnostic et le cycle. La convention interne de confiance 0,92 du résolveur n'est pas recalibrée. Cette provenance est documentaire et non vérifiée expérimentalement. En l'absence d'autre voie admissible, un test course classifié ou un scalar course historique peut rester un **repli** ; il ne court-circuite plus un modèle disponible au seul motif d'un libellé laboratoire.

## A2–A5

| Anomalie indépendante | Avant | Après / vérification |
| --- | --- | --- |
| A2 — qualification de A rendue pour B | Contexte repris de `q.subjectId`, label documenté | Identité externe obligatoire ; A→B, B→A, identité absente et historique deviennent unknown / not_established. Une identité externe concordante conserve le contexte documentaire. Rendu de carte et export réels testés. |
| A3 — modèle de nature estimated | scientificOrigin=field_estimate | **model_inference** du brut à l'effectif et au contexte de planification. Six combinaisons cohérentes méthode/nature testées. |
| A4 — raisons null/objet/[null]/nombre | Exception map/startsWith | Validation runtime des objets, listes, chaînes, nombres, unités et qualifications ; rendu consultable et conservateur, sans modifier le JSON historique. Aucun catch global de calcul ajouté. |
| A5 — formulaire laboratoire accessible | « valeurs mesurées en laboratoire (VLamax…) » | Lactate mesurable ; VLamax calculée/estimée à partir de protocole/mesures ; référence saisie/importée non automatiquement validée ; comparaison au modèle distincte d'une validation individuelle. Rendu réel testé. |

Le transfert de planification demeure un contrat documentaire. Aucun appel de génération IA, dose individuelle approuvée, raccord DET ou persistance Supabase réelle n'est exécuté.
