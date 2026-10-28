# Reprise V14 — DRAFT / NO-GO

Baseline061b60e69637b081ac089be30ca157dacb7c1df7, branche experiment/det-engine, PR420 brouillon. Lire V14_RESULTS.md, CONDITIONAL_PROGRESS_CONTRACT.md, SCIENTIFIC_REASSESSMENT.md, VALIDATION.md et state.json avant toute reprise.

Le registre comporte dix unités et une échéance absolue de60 minutes. Une unité passée signifie travail expérimental borné terminé, jamais conformité sportive ou revue humaine. Aucun processus permanent ni relance automatique de développement n’est lancé. Un prochain mandat devra conserver ce registre et disposer d’un nouveau budget ; aucune unité close ne doit être relancée silencieusement.

## Preuves et périmètre

Vérifier baseline-files.json, source-checksums.json, checksums.json et evidence/preregistration.json. Tous les fichiers antérieurs suivis sont protégés, y compris les600 références et V2–V13. Les seuls ajouts autorisés sont les préfixes V14 des dossiers docs/det-engine, experimental/det-engine et scripts/det-engine. Le moteur actuel, les validateurs, le catalogue et les workflows de production restent inchangés.

L’horloge des fixtures est2026-10-26T12:00:00Z ; elle ne représente ni l’heure de mission ni une mesure individuelle réelle. v14-profiles réutilise les deux profils Ironman V10 et la réconciliation de budget V13, sans relever les capacités75/90 min de course ou inventer un CSS. Aucun nouveau questionnaire de charge n’est créé.

Les sorties finales sont study.json.gz, calendars.json.gz et summary.json. Les calendriers numériques sont des réservations **conditionnelles non opérationnelles** ; actualApprovedPlan reste null. Un calendrier prospectif complet n’est ni un plan actuellement admissible, ni un payload conforme au schéma d’export, ni une attestation sportive. La durée de compétition inconnue n’est pas changée en0.

## Reprise idempotente

v14-run.mjs borne branche, dix unités, trois tentatives contrôlées, registre actif unique et échéance ; les suites utilisent un worker et Node2Go. v14-validate.mjs exécute typage, gouvernance, expérimental et historique séparément. v14-evidence.mjs exige des répertoires de sortie nouveaux, produit deux processus indépendants et compare trois empreintes. Ne pas écraser evidence/final ou les sorties d’essais rejetés. Toute réservation interrompue exige vérification des processus et conservation du diagnostic avant libération manuelle ; aucun résultat partiel n’est passé.

Les corrections de sélection de sources ont été motivées par des témoins de contexte/disponibilité de fiches et de duplication. Les erreurs de typage et les échecs d’assemblage intermédiaires restent archivés. Les assertions de complétude et contrôles historiques ne sont pas affaiblis.

## Points à ne pas confondre

1. Une dose future90/95/100 min dépassant la preuve actuelle est une intention à réévaluer ; une dose déjà excessive aujourd’hui ou une contre-indication reste not_admissible.
2. Les minima natifs sont des conventions de programmation conservées, pas des seuils physiologiques universels. Le maintien75/90 laisse ses six/cinq écarts historiques visibles.
3. Les nages restent conditionnelles aux temps individuels de tous les éléments. La source de base2600 m n’est pas une nage2000 m certifiée45 min. La source build2800–3300 m réservée50 min reste une cible non démontrée ; si elle ne tient pas, aucune distance/récupération n’est supprimée, la semaine doit être replanifiée.
4. Main-only, intervalle catalogue ou bloc aéro quantifié ne prouve pas toute la chronologie. Les recettes continues explicitement bornées et périphériques intégrés sont auditées séparément ; aucun échauffement ni transition n’est inventé.
5. Les trajectoires favorables stipulent fictivement les preuves manquantes ; elles ne prédisent pas leur probabilité et ne peuvent pas approuver un plan réel. Une réponse adverse maintient une suspension, même après ajout d’un record favorable.
6. Les conditions de récupération, posture, compétence, prérequis et interaction sont indépendantes ; un nouveau plafond de course ne les résout pas à lui seul.
7. Deux erreurs historiques de ratios restent dans les modèles à cible native/par bloc. Les minutes réservées sont une lecture descriptive distincte. Ne pas changer une classification ou un validateur pour les supprimer.
8. Les avertissements de répétition, gabarit, clés, quota/phase et protocole non entièrement vérifié restent consultables. La phasetaper et le typetaper ne coïncident pas partout ; S13build/taper reste visible.
9. Absence de brick spécifique, nutrition individualisée, force maximale et réponse réelle interdit toute revendication de préparation Ironman sportivement complète. Les modules sont différés sans être crédités artificiellement à une autre séance.

La prochaine étape est une revue indépendante du contrat conditionnel, des cibles et de leurs critères de réévaluation, puis des preuves individuelles avant libération de créneaux. Les défauts techniques réversibles peuvent être travaillés sous un prochain budget autorisé ; aucun arbitrage de doctrine, action production ou dépense n’est inclus.

La correction finale de calendrier ajoute un garde littéral relatif : les fiches «lendemain» doivent disposer de l’exposition précédente exigée, et une alternative de récupération générique évite d’inventer une séance clé en affûtage. Les cinq contre-exemples après repos de l’essai précédent sont conservés. Un avertissement layout_drift net supplémentaire en S13 est conservé ; les deux erreurs historiques de ratio ne disparaissent pas. Voir evidence/relative-context-comparison.json. Le delta de validation et son échec de typage intermédiaire sont archivés séparément de la validation historique initiale.

Une réévaluation valide explicitement insuffisante refuse maintenant la cible à échéance (`reassessed_envelope_insufficient`) ; elle ne reste pas dans le même état que l’absence de données. Ce défaut a un témoin rouge préservé, puis une correction bornée avec validation dans reassessment-delta. Le scénario sans gain donne six/cinq refus de dose dans la fiction, sans rendre le maintien conforme aux planchers historiques.
