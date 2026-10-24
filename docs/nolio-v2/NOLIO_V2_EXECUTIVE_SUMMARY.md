# TFCLab — Synthèse exécutive Nolio v2

24 octobre 2026 — Investigation documentaire, aucune implémentation ni opération Nolio réalisée.

**Recommandation : migrer progressivement, en commençant par la sécurité et les lectures, puis l'export prévisualisé.** La v2 offre des briques utiles à une connexion bidirectionnelle : lien explicite entre séance prévue et réalisée, révisions contre l'écrasement, lots simulables, retours athlètes, données de charge et webhooks. Elle ne dispense ni d'une stratégie de reprise, ni d'une validation des prescriptions, ni du contrôle du coach.

L'audit s'appuie sur le code de `main` au commit [`d736e4763da33eda21c9e56a27d587dbecf546b6`](https://github.com/Vinch11/tfclab/tree/d736e4763da33eda21c9e56a27d587dbecf546b6) et sur **l'intégralité du fichier OpenAPI transmis** : 181 chemins, 301 opérations, 311 schémas ; empreinte et inventaires dans la matrice. Les chemins d'exécution sont vérifiés statiquement, sans prétendre mesurer l'usage ni l'état déployé en production.

## Les dix décisions importantes

1. **Créer ultérieurement une nouvelle application v2.** L'application v1 est refusée sur `/api/v2/` avec `wrong_api_version`. La v1 et le convertisseur d'IDs ont une échéance contractuelle au **30 juin 2027**. Prévoir conversion des IDs avant cette date et une marge de pilote ; rien n'a été créé pendant l'audit.
2. **Choisir la simplicité pour Two For Coaching.** PAT personnel exclusivement serveur si un compte responsable couvre les athlètes. Si plusieurs coachs ont besoin de leurs propres délégations et d'une gouvernance d'équipe, choisir l'application équipe OAuth. Ne pas partager implicitement l'autorité d'un PAT personnel avec tous les comptes TFCLab.
3. **Préparer le produit multi-coachs sans implémenter OAuth inutilement.** Modèle de connexion et isolation dès le départ ; OAuth partenaire lors de l'ouverture externe. App partenaire d'abord bloquée, examen Nolio, développement limité à cinq comptes connectés, puis examen de production.
4. **Garder les secrets hors du navigateur.** Les tokens v1 sont actuellement en colonnes text accessibles au propriétaire via RLS, et le state OAuth n'est pas lié à une transaction serveur vérifiée. Créer une persistance privée v2 et un flux OAuth sûr si utilisé. Ne pas copier ces mécanismes historiques.
5. **Remplacer le réexport destructif par des identités persistantes et des PATCH protégés.** La v1 supprime puis recrée par id_partner ; la v2 ne documente plus cette clé. Une occurrence publiée doit avoir un UUID local et un remote_id, une base synchronisée et une révision. Une édition faite dans Nolio devient un changement à intégrer ou un conflit à arbitrer.
6. **Publier seulement après aperçu et confirmation du contenu exact.** Utiliser batch/dry_run, inspecter toutes les opérations, figer le contenu, puis recueillir l'accord du coach. Pas de publication automatique d'un plan IA, pas de double écriture v1/v2 sur une séance.
7. **Ne pas promettre une fidélité structurée que le contrat ne décrit pas complètement.** Les familles de nœuds existent, mais `workout.items` n'est qu'un objet libre et le seul exemple détaille un step en zone. Demander le schéma complet des répétitions/cibles/récupérations et des formats complexes. Bloquer un export non certifiable ; aucune réduction textuelle automatique.
8. **Séparer observations, estimations et diagnostic.** La charge Coggan indique sa source ; Foster n'est pas TSS ; une charge issue du RPE n'est pas une preuve indépendante du RPE. CTL/ATL/TSB et HRV complètent les analyses TFCLab sans remplacer ses modèles ni produire seuls un diagnostic physiologique.
9. **Concevoir la reprise et la fin d'accès avant l'exploitation.** Les lots réussissent partiellement, les updates ne sont pas annulables et les créations ambiguës ne doivent pas être rejouées aveuglément. Déduplication, réconciliation et purge sous 30 jours sur access.ended ou absence confirmée de app/users sont indispensables dès les données réelles persistées.
10. **Rester dans l'architecture actuelle.** Client et adaptateurs Deno côté serveur, tables Postgres de correspondance/opérations/observations, puis inbox et worker durable quand les volumes l'exigent. Pas de refonte TFCLab, pas de nouveau système QA généraliste ; tests ciblés sur contrat, droits, fidélité, conflits, quotas et purge.

## Risques majeurs et réponses

| Risque | Constat probant | Décision de maîtrise |
|---|---|---|
| Mauvais destinataire ou mélange de comptes | ID Nolio fourni dans body de l'export v1 ; comparaison avec lien stocké absente malgré contrôle du coach local | Résolution serveur du lien et tests d'isolation ; aucun matching de nom seul |
| Prescription modifiée ou perdue | Normalisations v1 ajoutent/transforment des récupérations/cibles ; schéma workout v2 incomplet | Adaptateur certifié, comparaison sémantique, cas incomplet bloqué |
| Doublons / résultat partiel | Aucun id_partner ni idempotency key confirmé en v2 ; batch non atomique | Journal par opération, état unknown, réconciliation avant retry ; résumé exact au coach |
| Annulation impossible | Updates modifiants non undoables, team-owned non récupérable via API, droits recontrôlés, notifications non rappelées | Inspecter is_undoable et date_expires ; ne jamais annoncer rollback universel |
| Écrasement d'un changement coach dans Nolio | Sans revision, dernière écriture gagne | Révisions, base à trois versions, conflits visibles et approbation renouvelée |
| Fausse lecture scientifique | Import historique Coggan sinon Foster vers tss ; données restreintes/nulles et courses séparées en v2 | Provenance, types/unités distincts, couverture et confiance ; aucune modification du moteur dans la migration |
| Fuite / conservation excessive | Logs actuels contiennent noms, payloads et préfixe de token ; accès terminé à purger | Logs techniques minimisés, stockage protégé, purge des dérivés/copies, aucun secret exposé |
| Accès impossible malgré token | Refus athlète, scopes, sport inactif, équipe multi-coachs, pause ou abonnement | Diagnostiquer code 403, état explicite et aucune tentative de contournement |
| Perte d'événements | Retrys bornés, webhook désactivable, événements non rejoués pendant interruption | Inbox durable, suivi de santé et app/users + réconciliation de calendriers |
| Budget API insuffisant | Quotas dynamiques par application ; dry+publication N opérations = 2N+2 ; records 20/min | Mesurer budgets, borner et replanifier ; réserver quota aux accès/purges |

## Ordre de réalisation proposé

- **Phase 0 :** valider ces décisions et obtenir les précisions Nolio bloquantes.
- **Phase 1 :** connexion v2 en lecture, identité, correspondances et unités ; sécurité, réconciliation d'accès et purge minimales opérationnelles.
- **Phase 2 :** export structuré certifié, simulation puis publication approuvée ; résultats partiels et conflits maîtrisés.
- **Phase 3 :** réalisé, courses, charge et retours pour un tableau prévu/réalisé fiable.
- **Phase 4 :** webhooks complets, reprise, réconciliation et conflits entre outils.
- **Phase 5 :** propositions adaptatives expliquées, toujours validées par le coach et repassant par le flux de publication.

Le premier gain produit doit être **la confiance dans ce qui est publié et dans ce qui a été réellement observé**. Les alertes et propositions de modification viennent après la qualité des données, avec leur niveau de confiance et leurs limites visibles.

## Dossier livré et prochaine décision

- [NOLIO_V1_V2_MIGRATION_MATRIX.md](NOLIO_V1_V2_MIGRATION_MATRIX.md) : exécution réelle, endpoints, modèles, risques, inventaire contractuel intégral.
- [NOLIO_V2_ARCHITECTURE.md](NOLIO_V2_ARCHITECTURE.md) : choix PAT/OAuth, sécurité, données, publication, synchronisation, purge et conflits.
- [NOLIO_V2_OPPORTUNITIES.md](NOLIO_V2_OPPORTUNITIES.md) : données réellement exposées, conditions et priorités P0/P1/P2.
- [NOLIO_V2_IMPLEMENTATION_PLAN.md](NOLIO_V2_IMPLEMENTATION_PLAN.md) : phases, fichiers/modules proposés, tests et critères d'acceptation.

La prochaine validation porte sur le mode d'application du pilote, la politique d'accès/conservation, la stratégie de publication et le périmètre de phase 1. **Aucune implémentation de migration ne commence sans validation explicite.** Les réserves contractuelles, en particulier workouts et garanties REST d'aperçu/retry, restent ouvertes et sont identifiées comme telles.
