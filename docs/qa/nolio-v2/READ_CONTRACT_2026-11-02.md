# Nolio V2 — contrat officiel des lectures planifiées

Les quatre GET liste/détail proviennent du même OpenAPI officiel vérifié `bc43cbcd9298e6190237680024c4d969654e47b60bd646cf45d6d02b9b4a1965`. L'ancien extrait ne retenait que les créations ; leur absence dans cet extrait n'était pas une absence dans l'API.

`read-contract-2026-11-02.json` conserve les opérations et leurs composants transitifs, descriptions sémantiques et schémas de réponse. Le fichier `.source.json` donne les URL et empreintes. Aucun accès Nolio authentifié.

Listes : `GET /api/v2/planned/{trainings|competitions}/`, `athlete`, `date_from`, `date_to`, `limit` (max100), `starting_after` ; réponse `data` + `has_more`. Détail : même collection puis `{id}/`, avec `athlete` ; réponse directe. Ne pas ajouter `recurrence_action`, qui a un sens distinct. La liste ne suffit pas pour comparer le workout ; lire le détail. Les unités de lecture peuvent être normalisées (`duration` en secondes), et les IDs/enrichissements de nœuds sont des champs de lecture à normaliser, sans effacer une différence de prescription.

Le test Postgres indépendant dans `../NOLIO_V2_ROOT_DATABASE_PROBE_2026-11-02.json` valide réservation existante et compare-and-set, mais pas la concurrence : le connecteur a sérialisé les requêtes. Une ligne technique de recette est conservée, fermée comme `rejected`, sans Nolio.
