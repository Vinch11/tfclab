# DET consomme le profil de planification EXISTANT de l'app — 2026-11-04 (révision 2)

QA uniquement. Aucune équation/calibration modifiée, aucune donnée réelle, prod, main, Nolio, IA payante ni publication.

## Sauts de source (chemin normal, unique)
1. `computeAppAthleteContext` (`src/lib/plan/appPlanningPipeline.ts`) = ancien `buildDiagnosticForAthlete`
   + `computeAthleteContext` de la page, déplacés tels quels ; la page les appelle.
2. `buildAppPlanConfig` = ancien `buildConfigFromDiag` déplacé tel quel ; la page applique ensuite
   `buildConfigWithCoachOverrides` comme avant.
3. Page : gel `freezeAppPlanningInput` (date de début intégrée AVANT l'empreinte ; incohérence ⇒ erreur),
   jeton annulant tout gel en attente, `appPlanningRef` = dernier profil courant, statut ready/pending/missing.
4. `AthleteDetSimplePanel` : `appInput` OBLIGATOIRE (sinon message nommé, bouton désactivé) ; plus aucun
   `buildCoachPlanInputs` / `eligibleLimiterMetrics` / ordre réordonnable dans ce panneau. IA et DET partent
   du même profil (`planningInputFor`, DET n'ajoute que `_outputFormat`).
5. Vérifications DET : `planningInputFingerprint` dans le snapshot (donc dans `inputs_hash` et la ligne append-only) ;
   revue humaine relue seulement si sa ligne porte la même empreinte et n'est pas une recopie du panneau ;
   `runCoachDetPlan` refuse empreinte/date/athlète différents.
6. Annulation : clé de contexte = athlète + formulaire + empreinte + moteur ; contrôle après chaque await
   (garde, hash, INSERT, solveur) dans le panneau, puis à l'installation (`isLatest`) avant et après prévalidation,
   pour IA et DET.
7. Origine des limiteurs : `coach_override` seulement si ordre de page, `limiterOrder`, exclusion ou
   primaire/secondaire explicitement surchargés (`explicitCoachLimiterOverride`) ; les autres payloads
   (interdictions, S2R…) ne comptent pas. Limiteurs sans définition DET : `unrecognizedByDet`, conservés, jamais remplacés.

Chemin manuel (`CoachDetInputsPanel`, `buildCoachPlanInputs`) : uniquement dans « Avancé », tracé `manual_coach_inputs` ;
il enregistre l'empreinte du profil courant avec sa revue.

## Preuves
- Frontière MOQUÉE (`appPlanningInput.test.ts`, 13) : solveur capturé qui refuse toujours — prouve l'absence de
  recalcul et la transmission, PAS une acceptation. Champs riches écrits dans le test : ne prouvent pas que le pipeline les produit.
- Intégration RÉELLE (`appPlanningIntegration.test.ts`, 3) : lignes synthétiques au format du dépôt → pipeline de la page →
  vrai solveur + validateurs finaux.
  - Semi 8 sem./6 h (seuil 4:00/km) : limiteurs produits par le diagnostic de l'app (`["VLamax"]`), ACCEPTÉ, 8 semaines,
    entrée IA = DET, tss7d/économie/dérive/fatigue/durée cible présents dans le diagnostic brut, sauvegarde/réouverture
    conservant empreinte + provenance (transport mémoire, pas JWT).
  - Marathon 16 sem./7 h (seuil 3:42/km) : le vrai diagnostic donne `["Durabilité","TTE"]` ; refus réel
    (polarization, lorang_categories, det_v351…, det_v316…), « Durabilité » signalé `unrecognizedByDet`.
    L'acceptation marathon antérieure venait de l'ancien diagnostic réduit (TTE en tête) : elle n'est PAS reproduite sur le profil complet.
  - Changement de physiologie ⇒ nouvelle empreinte ; revue et vérifications précédentes refusées.
- Suite src/lib/det + src/lib/plan + src/components/plan : 867 cas = 861 réussis + 6 todo, 0 échec.

## Reste ouvert
- Marathon depuis le profil complet : il manque au moteur DET une définition du limiteur app « Durabilité »
  (correspondance revue vers un domaine doctrine) ; tâche distincte, à ne pas résoudre par substitution.
- Non vérifié dans un navigateur authentifié.

## Patch de transfert TFCLab 2.1 (à relire, non appliqué)
- nouveaux : `src/lib/plan/appPlanningPipeline.ts`, `src/lib/det/appPlanningInput.ts`, `src/lib/det/appRecordView.ts`
- modifiés : `src/pages/AITrainingPlanPage.tsx` (délégation au pipeline, gel + jeton + ref, panneau), `src/lib/det/coachDetRun.ts`,
  `src/lib/det/athleteDetBridge.ts`, `src/lib/det/coachDetContext.ts`, `src/lib/plan/planProvenance.ts`,
  `src/components/plan/AthleteDetSimplePanel.tsx`, `src/pages/__qa/CoachDetInputsPanel.tsx`
- tests : `appPlanningInput.test.ts`, `appPlanningIntegration.test.ts`, `coachDetRun.test.ts` ; `planReleaseManifest.ts` recalculé.
