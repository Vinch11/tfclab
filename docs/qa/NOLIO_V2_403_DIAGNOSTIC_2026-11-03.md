# Nolio V2 QA — motif du refus 403, 3 novembre 2026

Le premier essai manuel réel a été refusé à **18:02:23 Europe/Brussels** (2026-11-03T17:02:23.486886Z). Le reçu `47be28c7-807c-4a0c-9e7e-45c4ea118623` contient HTTP 403, REFUSED, code générique forbidden_403 et envoi réel absent. Il a été relu après correction et reste identique. La cause précise de ce refus initial demeure inconnue.

## Défaut et correction

Le classeur retournait forbidden_403 avant de lire le code technique du fournisseur. Cette information a été perdue pour le premier appel ; aucune raison n'est reconstituée artificiellement.

La nouvelle source QA `264d10cbd4f59c30da0a46c9d6b3f0afc9c78608` extrait uniquement error.code pour un HTTP 403 et seulement si la valeur appartient aux six codes officiels reconnus. Un corps inconnu, malformé ou contenant une valeur non reconnue reste générique. Aucun message brut, champ privé, nom, URL ou référence Nolio n'est conservé.

L'interface affiche une explication française liée au code reconnu. Une restriction d'équipe est une hypothèse possible ; elle n'est pas confirmée par l'ancien reçu. Le contrôle en base montre une connexion active, génération 1, refresh idle, consentement et sélection présents, planned:write et planned:read accordés.

## Vérifications

- 91 tests ciblés réussis ; TypeScript et ESLint valides.
- [CI Deno indépendante réussie](https://github.com/Vinch11/tfclab/actions/runs/41682446729) sur 18 fichiers exacts du commit source final. Snapshot `16db9c3f3b07b8fd24ed79110be4c410f4391514`.
- Un seul des 18 modules serveur change : dryRun.ts ; les 17 autres sont identiques au snapshot vérifié précédent.
- Reçu initial relu et inchangé ; aucune migration ni réécriture de données.
- Nouvelle version de nolio-v2-dry-run seule redéployée ; sender réel et OAuth inchangés.
- dry_run forcé, validation 2xx stricte, URL fixe, délais, absence de retry et relecture RLS du reçu préservés.
- Aucun nouvel appel Nolio authentifié effectué par l'agent. Aucun changement d'autorisation, clé, consentement, association ou paramètre Nolio.

## Prochaine action manuelle

Recharger /__qa/pilot-review dans la session du coach, vérifier l'état puis cliquer une fois sur « Tester la séance sans l'envoyer ». Copier le résultat détaillé. Le nouveau motif permettra une correction ciblée ; s'il demeure non identifié, ne pas lui attribuer une cause supposée.

Référence primaire consultée : [guide officiel Nolio, sections 4.3 et 5.7](https://github.com/NolioApp/NolioAPI-Documentation/blob/main/migration/v1-to-v2.md#43-team-permission-new). Le guide fournit les codes reconnus ; il ne prouve pas lequel a causé la demande utilisateur.

QA isolée, release non attestée `9fc3cb52bf49eb29342fd76db1f4ab930a046a29cdd7edf703e86826e6d46885`. Aucun main, V1, TFCLab v2.1, calendrier réel, publication ou validation sportive modifié.
