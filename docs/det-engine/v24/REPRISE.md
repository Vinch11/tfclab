# Reprise V24

Baseline V23 : `4ec5547875768f8430606401bb750445e381f71f`. Branche exclusive `experiment/det-engine`. PR #420 doit rester DRAFT / NO-GO.

Le registre `state.json` conserve l'origine du budget, sa limite absolue et les unités; aucun budget ne se renouvelle. Vérifier son état de clôture avant toute exécution. `v24-run.mjs` refuse une session fermée, expirée, une mauvaise branche, plus de 10 unités, plus de 3 validations ou un répertoire de résultats existant. Il impose 2 Go au tas Node, un timeout au plus 180 s par processus et un plafond de logs; aucune relance externe n'est installée. Le quota/crédit exact n'est pas exposé par l'environnement.

Résultats retenus : `evidence/validation-2`, `evidence/independent-validation.json`, `calendar-before-after.csv`. Les validations exploratoires et leurs échecs ne sont pas effacés. `preregistered-models-1.json`, `preregistered-models-2.json` et `inputs.json` exposent l'ordre réel des hypothèses, toutes enregistrées avant leur exécution.

Code à réutiliser : `v24-prescription.ts` compose V23, `v24-placement.ts` transforme seulement les jours de sources existantes et garde les refus, `v24-capacity.ts` produit une contreproposition complète non retenue, `v24-reference.ts` qualifie le transport d'une ancre sans la promouvoir. Les calculateurs, validateurs et sources antérieurs sont inchangés.

Pour une nouvelle mission explicitement autorisée : confirmer les têtes distantes #420 et #424, relire les preuves, définir un nouveau budget et un nouveau registre. Ne pas relancer les unités V24 clôturées. Ne pas promouvoir les variantes rejetées par compteurs ni considérer le candidat #424 comme fusionné.

Prochaine priorité : revue coach des trois arbitrages de `COACH_DECISIONS.md`, puis développement expérimental ciblé à partir d'une preuve nouvelle. Pas de nouvelle recherche générale ni de hausse automatique des capacités.
