# Inventaire de validation réutilisable

Référence vérifiée le 25/10/2026 : main `ac01beb8a09b43d73e8d445dea791fac14577e5a`.
#406 est ouverte, brouillon, HEAD `64a5d1c3bf48b56bf7e895de92f677ca0dac3641`.
Cette proposition part de main, pas de #406, et ne dépend pas de son déploiement.

## Ce qui est validé

Les tests valident des **contrats logiciels précis**, pas une famille entière
de profils sportifs en conditions réelles. Aucun profil n'est déclaré globalement
qualifié pour prescription autonome. Les contrôles négatifs du laboratoire
acceptent les fixtures 5 km/10 km sans natation, le marathon avec semi et les
triathlons équilibrés ; cela ne constitue pas une campagne clinique ou terrain.

| Outil / matériel existant | Réutilisation | Limite |
|---|---|---|
| `src/lib/plan/qa` : B1–B15, verdicts, cockpit | Contrôles structurés, diagnostic et trace finale | Boutons de génération payants interdits dans cette mission |
| `src/qa/sports-plan-lab` | Analyse pure d'un export déjà produit, 14 scénarios | Ne génère ni ne répare ; ratios et flags ne prouvent pas une dose physiologique |
| `SESSION_PHYSIOLOGICAL_TRACEABILITY.md`, `sessionPhysiologicalTraceability.ts` | Limiteur→levier→intention→dose finale, contrats connus | Liens non supportés et contexte manquant restent non vérifiés |
| `prepareTrainingPlanContext` et tests | Parité coach/Pilot Cockpit ; décision existante | Le runner QA historique ne transmet pas tout ce contexte |
| JSON `2026-10-15_B-5K-BEGINNER_run1.json` | Génération enregistrée sur profil synthétique : 12 semaines, 45 séances actives | Diagnostic/leviers historiques absents ; ne pas les recréer après coup |
| `b5kRun20261017.ts` | 33 séances CAP historiques réduites | Pas un plan complet ; pas de renforcement ou de fractions détaillées |
| `GOOD_PLAN/BAD_PLAN` Mode A | Contrôles positifs/négatifs manuels de 4 semaines | Pas des plans réels |
| Quatre cas PDF133pages, `sessionCatalogueContract.test.ts` | Vraies fiches, transcriptions S1/S4/S6/S10 | Pas une reconstruction du payload généré |
| Tests Deno des deux fonctions | JSON, catalogue par semaine, quotas, courses et réparations mockées | Ne pas appeler les fonctions distantes |
| CI existante | Vitest/TypeScript, Deno, lint différentiel, Playwright | Tests verts ≠ qualité sportive générale ; PDF natif non certifié |

## Audits à lire plutôt qu'à recommencer

- `AUDIT_LIMITEURS_SEANCES_V3.md` : historique des motifs et priorités ; ne pas
  considérer ses anciens nombres de tests comme le corpus actuel.
- `AUDIT_SCIENTIFIQUE_P0*`, `RAPPORT_ETAPE1_CORRECTIONS_VALIDATEUR.md` : bugs
  de négation, tags VMA, intensité inconnue et timeline inter-semaines déjà traités.
- `RAPPORT_PILOTE_2026-10-15.md` : chaleur non demandée, faux repos, lecture
  « Z3 haut » comme trois heures, limitations restantes des durées textuelles.
- `docs/audits/p3-traceability-diagnostic-2026-10-17.md` : critères de causalité
  et preuves encore absentes, 0 verified n'étant pas une note de qualité.
- `docs/plan-generator/P0_*` : causes et limites #401/#403/#404/#405 ; dernière
  référence séance : `P0_CONTRATS_SEANCES_2026-10-25.md`.
- `src/qa/sports-plan-lab/VALIDATION_REAL_CASES.md` : reconstruction de
  compteurs 70.3 distincte des PDF plus récents. L'ancienne affirmation « aucun
  plan réel dans le dépôt » de T1/T2/T3 est dépassée par le JSON débutant ajouté.

## Défauts ouverts prioritaires issus de Q1

1. `parseSessionDurationMin` ignore encore `durationMin` dans les métriques du
   validateur. Rejeu du JSON existant : S8 95 minutes au lieu de165, S12 zéro au
   lieu de87. La présente démonstration remesure ces valeurs sans réparer le moteur.
2. Le laboratoire assimile parfois `isKeySession=true` à effort intense : deux
   Z1–Z2 en S6 débutant déclenchent une critique de récupération. Distinguer
   priorité, dose et intensité avant de modifier une prescription.
3. Runner historique vs contexte physiologique préparé du cockpit : couverture
   non équivalente. Attribution causale fermée à certains leviers, ambiguïtés de
   motifs `test/récupération` et `force/proprioception` toujours documentées.
4. 70.3 : seuil historique S1 120/90, pertinence et ventilation des66/112/107
   écarts, objectifs/thèmes suspects et première introduction de certains IDs
   non attribuables sans états du run. Les protections de construction #405
   sont intégrées ; elles ne qualifient pas les plans historiques.

Aucun générateur de nouveau plan sportif **offline équivalent au modèle** n'a
été retrouvé. Disponibles : fixtures, replay, construction déterministe des
quotas/catalogues et mocks. Un mock de modèle n'est pas une génération réelle.
Le seul essai proposé ici concerne la mesure des minutes, pas une amélioration
sportive prétendument mesurée sur un nouveau programme.
