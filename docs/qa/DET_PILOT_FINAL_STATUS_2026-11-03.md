# TFCLab — suivi vérifié au 3 novembre 2026

Source QA isolée : `5e87411535aa028e609a10194d4edfcfb41c0cfb`. Non publiée, non attestée. Aucun changement main/production, aucune inférence IA et aucun appel Nolio authentifié.

## Réalisé
- Coach A : recette réelle dans son navigateur, 14/14 contrôles PASS ; rapport relu en base. Session existante seulement.
- Intégrité indépendante : 4 archives historiques A et courant A intacts ; 11 archives B et courant B intacts.
- Page `/__qa/pilot-review` : scénarios réels partagés avec le moteur, revue synthétique explicite, critères sans réponse par défaut, avis append-only lié au plan et à sa version de moteur. Structure et horaires exacts consultables. Relecture complète exigée.
- Quatre scénarios marathon acceptés en QA : 16/40 semaines, age group et compétiteur avec placement revu ; quatre refus historiques préservés.
- 16 PDF Chromium : 4 plans × 4 formats. Contrôle HTML par séance signale une durée absente pour la compétition finale ; aucune durée inventée. Coupures verticales, impression native/iPhone et revue visuelle exhaustive restent non prouvées.
- RLS avis corrigée pour qualifier le lien version/athlète ; privilèges des deux tables de rapports réduits à SELECT/INSERT propriétaire. Tables OAuth sans droits anon/authenticated.
- Aperçu Nolio utilisant l'extracteur exact du véritable expéditeur, sans valeurs de date/horaire ajoutées.
- OAuth V2 QA préparé : début, callback, état à usage unique/expiration/PKCE, vérification de l'application et sélection explicite parmi les athlètes autorisés. Grant reste en attente, jamais de connexion active créée.
- 123 tests ciblés Nolio/revue réussis, TypeScript/lint réussis ; [Deno indépendant réussi](https://github.com/Vinch11/tfclab/actions/runs/41619663409) sur 13 fichiers exacts.

## Prochaine action humaine
Ouvrir [la revue QA](https://lovable.dev/projects/c3941303-40d2-447e-9b87-867d82727fd1?preview-path=%2F__qa%2Fpilot-review) avec la session Coach A, commencer par Marathon 16 semaines age group, examiner semaines/séances/impression, et enregistrer un avis explicite. Aucun avis prérempli par l'agent ; au dernier contrôle, 0 avis enregistré.

## Nolio : encore nécessaire
Nouvelle application Nolio V2 partenaire/équipe et callback enregistré :
`https://lkjesdacgpolrwfxulbo.supabase.co/functions/v1/nolio-v2-oauth-callback`.
Secrets séparés `NOLIO_V2_CLIENT_ID` / `NOLIO_V2_CLIENT_SECRET` via interface sécurisée du projet, jamais dans le chat. Aucun secret configuré ou inspecté ici.

La préparation OAuth n'est pas une connexion opérationnelle. Restent : OAuth réel autorisé, confirmation des références et activation, rafraîchissement du jeton, dry-run serveur puis envoi et relecture sur un compte de test explicitement autorisé. Magasin, grants et états OAuth encore vides au dernier contrôle.

## GO/NO-GO
GO pour poursuivre la recette QA sur les cas testés. NO-GO prescription/pilote réel/production. Une opinion QA synthétique ne vaut ni attestation sportive ni validation scientifique indépendante. Nouvelle connexion A/B, revue humaine, impression native, Nolio réel et promotion attestée restent à clôturer. Le futur choix explicite DET Engine ou IA demeure conservé, sans repli silencieux.
