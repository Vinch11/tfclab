# Décision coach enregistrée — programmation expérimentale uniquement

Votre instruction « CODEX — DET-ENGINE : DÉCISION COACH APRÈS V25 » est la provenance de cette politique. Elle est appliquée sans demander une nouvelle autorisation pour le même plancher.

> Le coach autorise explicitement, pour les tests expérimentaux uniquement, une dérogation au plancher conventionnel de programmation. Cette autorisation porte exclusivement sur la règle de planification, et non sur la sécurité ou l’admissibilité individuelle de la séance.

Record versionné : `COACH_POLICY.json`, miroir exécutable `coach-floor-policy.ts`, comparés par test. Enregistrement : `2026-10-29T17:28:38.351017+00:00`. La date propre de la décision n'était pas fournie : `statedDecisionDate: null`. Aucune signature, identité authentifiée ou validation individuelle n'est fabriquée.

| Portée | Valeur autorisée |
|---|---|
| Environnement | fixtures synthétiques expérimentales des huit cas existants |
| Séance / hash | SEILER_RUN_Z1_EASY_LONG / 37dabb2a7f964813df64301ea52cf5d450203344b1f657eb8694b82554005e51 |
| Objectif / rôle / contexte | Ironman, course longue, S3 du cas de référence |
| Variante source | 90-120 min Z1 strict — fondement de la préparation IM longue distance |
| Plancher historique | 95 minutes, conservé |
| Enveloppe déclarée | 90 minutes, inchangée |
| Alternative de programmation | 90 minutes, Z1 strict |
| Activation | opt-in explicite, désactivée par défaut |
| Approbation de dose / sécurité individuelle | non accordée |
| Autres règles / production | aucune dérogation ni autorisation |

La politique est étroitement bornée à la référence existante. Un autre ID, hash, objectif, contexte, floor ou plafond n'en bénéficie pas. Une évolution de ces paramètres demande une nouvelle décision explicite; aucune généralisation automatique à toutes les séances.

La décision de politique coach enregistrée vaut **1**. Les approbations de prescription individuelle et revues expertes individuelles attestées restent **0**. Le statut historique V25 `pending_explicit_decision` est conservé dans l'archive V25; la nouvelle lecture indique `authorized_experimental_floor_only`. Elle ne fabrique pas un document individuel signé pour satisfaire l'ancien vérificateur.
