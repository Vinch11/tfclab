# D1.15 — transformation réelle de deux séances en V2 dans une copie S3
Branche expérimentale uniquement. Poursuite de #440.

Essai volontairement étroit pour les S3 du 70.3 : seules les séances V1 de catégorie A et **non-clés** sont sélectionnables. La copie passe un vélo facile en V2_BIKE_01 et une course facile en V2_RUN_02. Les blocs V2 sont reconstruits à la **durée exacte** et documentés au niveau des secondes, sans ID V1 forgé. Le volume global, l'identité des semaines, le jour et le sport des séances restent inchangés. Un transfert est accepté dans le témoin seulement si la comparaison sportive D1.10 par minutes (avec l'hypothèse ±3) est compatible. Tous les contrôles natifs restent actifs avant/après par l'appel partagé de D1.8.

**Aucune validation sportive individuelle :** le statut `ready` est un témoin synthétique QA, non une preuve sur un athlète réel. Le remplacement des séances V1 A par V2 faciles n'établit pas une équivalence de stimulus ni l'adéquation d'une dose. La solution cherchée est volontairement bornée à une paire non-clé; un échec ne prouve pas qu'une programmation V2 complète est impossible. Si des erreurs natives persistent ou apparaissent, elles sont publiées telles quelles dans le log et aucune sauvegarde/export/déploiement n'est accordé.

CI : `D115_V2_COPY_NATIVE`. Production, DET, Supabase, Nolio et bibliothèque V1 inchangés.

## CI #900 — résultat effectif (GitHub Actions 4/4)
- `aerobic_dominant` S3 : **blocked / no_nonkey_A_bike_run_pair**.
- `glycolytic_dominant` S3 : **blocked / no_nonkey_A_bike_run_pair**.
- `balanced_typical` S3 : **blocked / already_inside_hypothetical_bands_no_edit_necessary**.

**Aucune séance n'a été remplacée.** L'exécution des contrôles est réussie, mais leur sortie ne vaut pas progression de conformité sportive. Les traces D1.2 indiquent notamment des séances de récupération V1 (IDs `D_RECOVERY_...`) dans des créneaux marqués `key:true`. Ceci démontre que **marquage de créneau clé ≠ contenu physiologique intense ni dose revue**. Ne pas débloquer artificiellement le test en retirant la condition d'intention non-clé ou en reclassant des séances de récupération comme stimulus.

## Prochaine correction à faire dans l'assembleur expérimental
1. Construire d'abord les **rôles physiologiques** des créneaux et leur niveau de preuve (endurance, seuil, VO₂, technique, récupération, brick), séparément du booléen `isKeySession`.
2. Établir des alternatives V2 compatibles avec chaque rôle et les données validées, puis allouer les durées avant de sélectionner un ID de fiche. En l'absence d'ancrage ou de dose revue, refuser/renvoyer au coach ; ne pas fabriquer de HIT.
3. Rejouer le vrai calendrier, les quotas, les catégories Lorang, l'espacement et la récupération avec les validateurs inchangés.
4. L'édition, la sauvegarde et l'export réel ne pourront être activés qu'après cette vérification et leur recette spécifique.
