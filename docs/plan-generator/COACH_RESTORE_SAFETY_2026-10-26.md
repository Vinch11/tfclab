# Recette coach : plan historique et restauration calendrier

Base : `b9c59986db492b43af813d1075d39cab5a1aaf38`. Investigation et tests offline uniquement ; aucun accès au compte ou aux données de l’athlète de la recette. Aucun appel IA ni écriture Supabase réelle.

## Matrice causale

| Incident | Cause démontrée | Correction / décision | Preuve | État |
|---|---|---|---|---|
| Course officielle 10 km S9 associée à V3_RUN_10K_RACE_SIM | La fiche est « Simulation course 10K — dress rehearsal », Build/Peak, 40–55 min, 6–8 km à allure cible ; elle décrit un entraînement S-2, pas un événement officiel de 10 km. Le validateur émet race_catalog_conflict. | Maintenir le rejet. Ni suppression automatique de l’ID ni conversion de la course en simulation. Aucun changement du validateur ou des prescriptions. | Fixture synthétique S9/S33 ; schéma client, contrôle course et tests existants client/serveur. | Association incorrecte confirmée ; origine exacte historique non attestée. |
| Historique du 24 octobre chargé puis refusé | Les protections race_catalog_conflict apparaissent dans #403 (00d513f7, 25 octobre), puis #404 (d74657fa). Le schéma à 78e5d960 (24 octobre) ne contient pas ce refus. | Préserver les versions et expliquer le rejet actuel. Pas de correction rétrospective automatique. | Historique Git + ouverture read-only et validation sans mutation. | Une ancienne génération est plausible ; SHA exécuté, payload et diagnostic détaillé du plan réel absents. |
| Restaurer, dans PlanHistory et PlanLibraryPage | DELETE de tout training_plan de l’athlète, puis INSERT indépendant. L’échec de suppression n’était même pas contrôlé. Un échec d’insertion laisse le calendrier vide ; une suppression refusée suivie d’insertion peut créer des doublons. | Retirer ces chemins d’écriture et suspendre les boutons avec explication visible. Conserver lecture/chargement dans la page Plan. | Tests rendus sur les deux interfaces : boutons désactivés, aucune mutation, archives intactes. | Risque contenu dans le correctif ; remplacement calendrier volontairement indisponible. |
| Séances placées le lundi | Calcul session.day - 1, sinon 0 ; les séances structurées portent notamment dayName/dayIndex. Un jour absent était donc converti en lundi. | Le code de projection calendrier est retiré avec la restauration. L’affichage bibliothèque lit les champs existants et signale jour absent ou contradictoire. | Sept jours, lundi index 0, samedi historique texte/numérique, champs absents/invalides/contradictoires ; rendu samedi réel dans la bibliothèque. | Aucun placement calendrier n’est effectué ; pas de correction prétendue d’une restauration suspendue. |
| Sync DB, dans PlanningPage et IndexSeances | Le serveur supprime workouts_library puis insère par lots indépendants ; success=true même avec des erreurs de lots. Ce chemin touche le catalogue, pas directement training_plan. | Suspendre les deux boutons, retourner un échec sans réseau dans l’ancien helper client, et HTTP 503 WORKOUT_SYNC_SUSPENDED côté fonction avant corps/auth/DB. Retirer le delete/insert dangereux. | Deux tests UI, appel helper ancien sans invoke, tests serveur HTTP 503 / corps non lu / CORS. | Suspendu dans le correctif, sans prétendre que le serveur déjà publié a changé. |

## Limites du diagnostic historique et des nouveaux plans

Le message global « Incohérence fondamentale objectif/contenu » peut regrouper plusieurs règles. Sans le résumé détaillé du plan réel, on ne démontre pas que race_catalog_conflict est son unique cause. La même association suffit cependant à reproduire une erreur non dérogeable sur main.

Le JSON structuré actuel refuse une compétition reconnue avec custom=false/catalogId ; custom=true/catalogId=null demeure accepté. Les deux schémas Edge portent la même règle que le client. Les contrôles de sauvegarde détectent également l’ID placé dans les textes historiques (tests real703RaceIdentity existants). Cela ne prouve pas qu’un modèle ne proposera jamais une association incorrecte : un ancien plan ou une référence textuelle peut encore parvenir au contrôle final et être refusé. Aucun nouveau plan réel n’a été généré et aucune garantie de qualité sportive générale n’est déduite des tests.

Le contrôle n’est donc pas assoupli. Pour rendre une copie du plan historique exploitable, il faut une revue coach explicite de la compétition (date, distance complète, consignes, durée et identité autonome), puis une nouvelle version validée ; ne pas retirer simplement l’ID en conservant une éventuelle prescription de simulation. Aucune version réelle n’a été modifiée ici.

## Choix de sécurité sans migration

Aucune RPC transactionnelle de remplacement calendrier/catalogue n’a été trouvée dans les migrations et contrats du dépôt. Le backend réellement publié n’est pas attesté par cette inspection. Une séquence HTTP delete/insert ou insert/delete, même avec compensation, ne garantit pas atomicité, concurrence, conservation des séances réalisées et identifiants externes. Elle n’est pas présentée comme solution.

La suspension est la correction minimale autorisée. Le chargement d’une archive dans l’éditeur (`restoreStructuredPlan`) est distinct d’un remplacement de training_plan. Il conserve les jours, durées, variantes, identités et absence de champs historiques sans muter l’archive. Les suppressions manuelles explicites de versions déjà existantes ne sont pas modifiées par cette PR.

## Tests et preuves

- Avant correction : les cinq nouveaux tests de garde UI/helper échouent sur b9c59986 ; après, ils passent.
- Suite ciblée : sauvegarde/rechargement et échec de sauvegarde du hook existant, état courant édition/export, récupération structurée, règles course/simulation, quatre actions suspendues et compatibilité Lovable.
- Deno sync-workouts-library : 20 tests passent, dont 2 nouveaux tests de suspension ; auxiliaires de durée inchangés.
- TypeScript applicatif et CI du HEAD exact à joindre dans la PR.

La « restauration réussie » couverte est le chargement read-only d’une archive dans l’éditeur, pas le remplacement du calendrier. Une tentative de remplacement est refusée avant écriture ; aucune restauration transactionnelle réussie ne peut être certifiée dans ce périmètre sans primitive serveur. Les tests mocks/offline ne certifient ni la durabilité RLS/Supabase réelle ni la correction sportive complète d’un plan historique.

## Conditions de reprise et risques résiduels

- Après revue humaine, fusion et publication séparément autorisées : vérifier sur données synthétiques que les quatre actions sont suspendues, que la fonction sync refuse l’appel et que le chargement/édition/sauvegarde d’une nouvelle version reste disponible. Pour neutraliser les anciens clients, la garde serveur sync devra aussi être déployée, sous autorisation distincte. Aucun déploiement réalisé ici.
- Tant que le correctif n’est pas publié, éviter Restaurer et Sync DB dans les versions actuellement déployées. Ne pas relancer la recette sur un vrai calendrier avec ces actions.
- La restauration calendrier ne doit être réactivée qu’avec contrat atomique démontré, validation de tous les jours avant écriture, contrôle d’accès, protection des séances réalisées et références externes, tests de rollback/concurrence ; aucun de ces travaux n’est lancé ici.
- Régression fonctionnelle assumée et annoncée : remplacement calendrier et synchronisation catalogue indisponibles ; consultation et sauvegarde d’une nouvelle version de plan restent disponibles sous les protections existantes.
- Déclaration des empreintes régénérée pour le frontend modifié, sans élargir les exclusions ou désactiver la compatibilité. Une future publication reste coordonnée ; les artefacts générateur ne comprennent pas sync-workouts-library.

GO pour revue de la suspension. NO-GO pour une recette de remplacement de calendrier tant qu’une restauration atomique n’existe pas. Pas de fusion, déploiement, migration, publication, modification Nolio ou données athlètes, activation #407, ni appel Gemini.
