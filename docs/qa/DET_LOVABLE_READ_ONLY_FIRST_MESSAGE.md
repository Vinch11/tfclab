# TFCLab — premier passage Lovable (lecture seule) avant recette DET

**Copier ce texte dans le chat du projet Lovable TFCLab si les outils Lovable ne sont pas accessibles autrement.**

> **AUDIT STRICTEMENT EN LECTURE SEULE — aucune action sur la production, aucune publication.** Nous préparons la recette de la PR GitHub #455, sans modifier le moteur DET, le frontend, la base de données, les règles RLS, les comptes utilisateurs, les fonctions Edge ni l'intégration Nolio.
>
> 1. Identifie de manière factuelle et sans exposer de secret si le backend de ce projet est **Lovable Cloud intégré** ou **Supabase externe**. Donne uniquement la nature du backend, les identifiants non sensibles nécessaires pour distinguer les environnements, et où les vérifier dans l'interface.
> 2. Inspecte si ce projet dispose **déjà** des environnements **Test et Live** distincts. Ne tente surtout pas d'activer Test/Live : la fonctionnalité est fermée aux nouveaux projets depuis le 24/03/2026. Attention : une base Test existante peut contenir des données copiées de Live à sa création.
> 3. Indique s'il existe **déjà** un backend de recette **physiquement/logiquement séparé** de Live, et si l'on peut y utiliser exclusivement **deux coachs et deux athlètes synthétiques sans données réelles**. Une preview et deux URL frontend ne prouvent pas une séparation de base.
> 4. À titre de métadonnées uniquement, vérifie dans l'environnement candidat l'existence des tables `athletes`, `tests`, `snapshots`, `plan_versions`, `plans` et si la RLS est active. Consulte les politiques existantes, les contraintes de FK et l'appartenance des athlètes, **sans lire les valeurs personnelles des lignes**.
> 5. Confirme les chemins de sauvegarde du code : `plan_versions` (insert) et `plans` (upsert). Vérifie que les migrations SQL et l'export Nolio ne peuvent pas affecter la production pendant la recette. Ne déclenche aucun appel externe.
> 6. Fournis un rapport court : type de backend, preuves d'isolement, état des cinq tables et RLS, risques détectés, étapes permises et **verdict GO/NO-GO pour DÉMARRER LES TESTS SYNTHÉTIQUES**, pas pour publier DET.
>
> **Interdictions pour cette demande :** pas de SQL de modification, pas de création de projet ou d'utilisateur, pas de migration, pas de changement de configuration, pas d'envoi d'e-mail, pas de données personnelles dans le rapport, pas de copie de base de production, pas de sauvegarde/restauration, pas de publication. Si une information est inaccessible, rapporte « non vérifié » et garde NO-GO. Ne contourne aucun contrôle.

Références : `docs/qa/DET_LOVABLE_MANAGED_BACKEND_RECIPE_2026-11-01.md` et `docs/qa/DET_ENGINE_P0_OPERATIONAL_GATE_2026-11-01.md`.

Documentation Lovable :
- https://docs.lovable.dev/features/database
- https://docs.lovable.dev/features/environments
- https://docs.lovable.dev/integrations/supabase
