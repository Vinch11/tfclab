# Reprise V13 — DRAFT / NO-GO

Branche experiment/det-engine, PR420 à conserver en brouillon. Baseline V12 :e014106819b84036970171586854a9ad3a5029b3. Lire state.json, V13_RESULTS.md, FULL_IRONMAN_FEASIBILITY.md et CATALOGUE_INTEGRITY.md avant reprise.

Le registre V13 comporte exactement dix unités et une échéance absolue de60 minutes. passed signifie travail borné achevé, pas validation scientifique humaine. Un nouveau budget doit disposer d’un nouveau registre ; aucune unité close ne doit être rejouée sous V13. Aucun processus permanent ni relance automatique de développement n’est revendiqué.

## Vérifications

Contrôler baseline-files.json, source-checksums.json, checksums.json et evidence/preregistration.json. Les références V2–V12, les600 configurations et le catalogue/les validateurs de production restent inchangés. L’horloge des fixtures reste26octobre2026 à12:00UTC ; elle n’est ni l’heure de mission ni une observation réelle.

Les sorties finales sont study.json.gz, summary.json et requirements16.json. Le dernier fichier est une **matrice d’exigences et de refus**, jamais un plan rempli. plan=null signifie absence de préparation complète admissible. Ne pas remplacer les trous par des repos, des séances inventées ou une compétition chronométrée fictivement.

Le contrôleur scripts/det-engine/v13-run.mjs borne branche, unités, tentatives et délai. Validation :v13-validate.mjs ; correction finale purement expérimentale :v13-final-delta.mjs ; preuves indépendantes :v13-evidence.mjs. Node est limité à2Go et les suites à un worker. Une réservation interrompue et ses traces doivent être conservées ; vérifier les processus avant de la libérer. Aucun résultat partiel n’est un succès. Une reprise de preuves exige de nouveaux dossiers, sans écraser evidence/final.

## Pièges à préserver

1. CSS de crawl ≠ temps en dos/brasse. Un calcul partiel qui tient dans45 min ne confirme pas toute la séance. CSS manquante ne doit pas être estimée depuis VLamax, VO2max ou niveau.
2. Bloc Main seul ≠ durée totale certaine. Conserver les projections du parseur historique mais ne pas les utiliser comme preuve de borne supérieure. Le premier essai de catalogue est archivé et supersédé après revue des faux diagnostics ; ne pas reprendre ses six conflits comme six fiches prouvées impossibles.
3. Le brick de transition contient55 min actifs (30 vélo,25 course) au minimum, avec transitions non quantifiées. L’overlay corrige le contrat actif, pas une durée totale exécutable. Source, phases et intensités originales inchangées ; aucun crédit de55 min de vélo ou de longue autonome.
4. L’opener vélo composé contient30 min faciles,4×1 min,3 ou4 repos de3 min,10 min de retour :53–56 min de blocs quantifiés. Ne pas omettre les30+10 min en ne lisant que les répétitions.
5. Les fixtures héritées déclaraient10h mais conservaient une cible de rampe14h. La copie expérimentale V13 réconcilie cette cible à10h en conservant protections initiales, planchers et capacités. La note QA de charge récente héritée reste synthétique ; aucune conversion TSS→heures ni nouvelle mesure n’est inventée.
6. Les enveloppes de course75/90 min ne sont pas des plafonds physiologiques universels. Les planchers futurs90/95 puis100 min nécessitent des preuves nouvelles ; elles ne sont pas inférées du simple passage des semaines. Ne pas abaisser les obligations ou relever les capacités pour assembler.
7. Les créneaux de compétition déclarés sont séparés des minima d’entraînement avec les helpers existants. Une durée de compétition inconnue reste inconnue et n’est pas absorbée dans le plafond de temps d’entraînement.
8. Pas de plan complet : les validateurs techniques/sportifs/globaux d’un plan16 semaines restent non applicables et ne sont pas comptés passés. Seuls les contrôles nécessaires de l’horizon et les relectures de blocs existants sont exécutés.

Travaux suivants : preuves d’exécution des nages, réponses posturales et récupération, capacités longues documentées après réévaluation, durée de transitions et cohérence des sources, puis nouvelle tentative de construction intégrale si les préconditions sont réellement satisfaites. Les hypothèses de récupération, affûtage, nutrition et force restent candidates ou conditionnelles aux données connues.

Aucune fusion, aucun déploiement/publication Lovable, aucun moteur ou validateur de production modifié, aucune donnée réelle/Nolio, migration ou dépense. Aucune promotion automatique des contrats candidats.

Clôture : dix unités V13 achevées, état completed_no_go. Source et preuves publiées : c4581976bb0734c786d090595353649641d1f622. Voir publication-proof.json pour le point de contrôle distant avant la clôture documentaire. Une reprise nécessite un mandat/budget explicite distinct ; aucun processus permanent n’est lancé.
