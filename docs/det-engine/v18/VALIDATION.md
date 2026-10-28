# Validation exécutée

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

| Commande | Code de sortie | Erreur de supervision | Secondes |
|---|---|---|---|
| types | 0 | None | 41.39 |
| contracts | 0 | None | 9.61 |
| build | 0 | None | 7.06 |
| replay | 0 | None | 7.99 |
| independent | 0 | None | 1.35 |
| independent_replay | 0 | None | 1.32 |
| mutations | 0 | None | 14.33 |
| selection | 0 | None | 7.79 |
| selection_replay | 0 | None | 6.67 |
| historical_regression | 0 | None | 20.12 |
| experimental_guards | 0 | None | 50.31 |
| v17_pure_contracts | 0 | None | 10.37 |
| family_review | 0 | None | 0.26 |
| family_replay | 0 | None | 0.25 |

[Reçus exacts](evidence/validation-3/commands.json), [reproductibilité multi-processus](evidence/validation-3/reproducibility.json), [contrôle indépendant](evidence/validation-3/independent.json). Tous les processus acceptés ont un code 0 et aucune erreur de supervision.


Tests nouveaux : compilation / refus / dimensions / modes / rendus sur les 920, sensibilité des sélecteurs et pipeline physiologique réel sur estimations synthétiques stockées, mutations de preuves contre fabrication/perte. Le contrôle Python n’importe ni le compilateur JS ni son évaluateur. Les mutations mettent également à jour la copie enrichie pour que l’échec ne repose pas seulement sur deux copies désaccordées.

Régression ciblée : contrats purs V17, catalogue/niveaux/objectifs, ancres physiologiques, doctrine des zones, prérequis de sécurité, contrats de catalogue et gardes expérimentaux V9–V15. Les campagnes V16/V17 et leurs registres clos ne sont pas relancés. Les trois tests historiques conditionnels déjà désactivés sont toujours indiqués comme skipped par leur suite ; aucun nouveau test n’a été neutralisé.

Les 600 configurations historiques ne sont pas rejouées comme nouveaux plans en V18 : leurs fichiers de référence restent byte-identiques avec tout le dépôt antérieur. La suite complète d’application et les accès Nolio réels ne sont pas revendiqués.

Les contrôles prouvent la fidélité technique dans leur périmètre ; ils ne prouvent ni réponse physiologique, ni récupération obtenue, ni qualité générale d’une préparation, ni revue experte.

## Compléments de preuve de la clôture

Les sorties Node capturées par pipes par le premier superviseur asynchrone étaient vides dans cet environnement, alors que les codes de sortie et les artefacts de test existaient. Ce défaut de journalisation n’est pas assimilé à une preuve du nombre de tests. Les mêmes suites ciblées ont donc été capturées directement dans des fichiers lors de la revue finale :

| Preuve | Résultat observé |
|---|---|
| [Contrats V18](evidence/contracts-logged-final.txt) | 32 tests passés |
| [Sélection V18](evidence/selection-logged-final.txt) | 9 tests passés |
| [Catalogue / doctrine / sécurité historiques](evidence/historical-logged-final.txt) | 186 tests, 31 fichiers passés |
| [Gardes expérimentaux](evidence/guards-logged-final.txt) | 30 passés, 3 skips préexistants, 8 fichiers |
| [Contrats purs V17](evidence/v17-contracts-logged-final.txt) | 27 tests passés |
| [Mutations indépendantes](evidence/validation-3/mutations.txt) | 7 passées, sources jumelles modifiées également |
| [Consultation hors ligne](evidence/viewer-attempt-3.txt) | 920 rendus fidèles, recherche/filtres, aucun accès réseau |
| [Supervision par descripteurs directs](evidence/process-hard-bound-test.txt) | stdout/stderr, code non nul, binaire absent, timeout et anti-écrasement contrôlés |
| [Relance d’unité close](evidence/closed-unit-refusal.json) | refus explicite ; registre inchangé |

La supervision réutilisable écrit désormais directement sur des descripteurs de fichiers et arrête son propre enfant à la limite de temps/volume de logs. La correction de journalisation a été testée isolément ; elle ne nécessite aucune modification des règles sportives. La campagne complète `validation-3` reste celle exécutée avant ce changement de capture ; les compléments ci-dessus explicitent cette provenance. Le typage a réussi avec une sortie vide attendue. Les avertissements Vite de configuration sont conservés dans les logs et ne sont pas des avertissements sportifs.

La vérification de style Git a détecté des fins de ligne CRLF produites par le dialecte CSV par défaut. Les trois registres ont été réécrits en LF ; toutes les cellules parsées sont strictement identiques avant/après. Le générateur utilise désormais explicitement LF. Le contrôle du code source est propre ; six diagnostics de blancs restent dans les sorties brutes de tests archivées, conservées sans réécriture des preuves ([audit de style](evidence/whitespace-after-csv-fix.txt)). Ce contrôle de style n’est pas présenté comme intégralement vert sur les traces brutes.
