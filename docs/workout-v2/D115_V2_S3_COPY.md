# D1.15 — transformation réelle de deux séances en V2 dans une copie S3
Branche expérimentale uniquement. Poursuite de #440.

Essai volontairement étroit pour les S3 du 70.3 : seules les séances V1 de catégorie A et **non-clés** sont sélectionnables. La copie passe un vélo facile en V2_BIKE_01 et une course facile en V2_RUN_02. Les blocs V2 sont reconstruits à la **durée exacte** et documentés au niveau des secondes, sans ID V1 forgé. Le volume global, l'identité des semaines, le jour et le sport des séances restent inchangés. Un transfert est accepté dans le témoin seulement si la comparaison sportive D1.10 par minutes (avec l'hypothèse ±3) est compatible. Tous les contrôles natifs restent actifs avant/après par l'appel partagé de D1.8.

**Aucune validation sportive individuelle :** le statut `ready` est un témoin synthétique QA, non une preuve sur un athlète réel. Le remplacement des séances V1 A par V2 faciles n'établit pas une équivalence de stimulus ni l'adéquation d'une dose. La solution cherchée est volontairement bornée à une paire non-clé; un échec ne prouve pas qu'une programmation V2 complète est impossible. Si des erreurs natives persistent ou apparaissent, elles sont publiées telles quelles dans le log et aucune sauvegarde/export/déploiement n'est accordé.

CI : `D115_V2_COPY_NATIVE`. Production, DET, Supabase, Nolio et bibliothèque V1 inchangés.
