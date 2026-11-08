# Pré-remplissage du snapshot depuis les records Nolio V2 — 8 novembre 2026

## Ce qui a été livré

Nouveau chemin additif, séparé de l'export planifié (`nolio-v2-send-plan`) et de l'import CSV existant (`NolioImporter`) :

- `supabase/functions/_shared/nolioV2/recordsClient.ts` — lecture seule de `GET /api/v2/metrics/records/`, `fetch` injecté, forme de réponse validée strictement (jamais une liste vide inventée sur une forme hors contrat). Plan de requêtes fixe (`RECORDS_QUERY_PLAN`, 4 combinaisons cat/record_type), bien sous le plafond documenté de 20 req/min.
- `supabase/functions/_shared/nolioV2/recordsMapper.ts` — fonction pure : records bruts → candidats de snapshot. Chaque candidat garde sa date, son entraînement d'origine, sa source Nolio et la valeur/unité brute reçue. Conversions d'unité explicites par unité reçue (W, m/s, km/h, /km, /100m, bpm) ; une unité non reconnue produit un avertissement, jamais une valeur devinée. Plafonds de plausibilité repris de l'agrégation v1 existante (ratio/FTP pour la puissance courte, plage physiologique pour les temps de course, [70,180]s/100m pour le CSS, [150,210]bpm pour la FC max).
- `supabase/functions/nolio-v2-records-preview/index.ts` — auth + propriété (RLS) avant tout accès service-role, connexion V2 chargée, scope `metrics:read` vérifié explicitement (absent de `NOLIO_V2_REQUIRED_SCOPES`, qui ne couvre que l'export planifié). **Lecture seule : aucune écriture dans cette fonction.**
- `src/components/NolioV2RecordsImporter.tsx` — le coach choisit une période, voit les candidats avec leur provenance complète, édite si besoin, coche sa sélection, puis "Importer la sélection" verse les valeurs dans le formulaire de snapshot existant. **L'enregistrement reste le bouton "Enregistrer" déjà en place** — aucun nouveau chemin d'écriture n'a été créé, exactement le même principe que l'import CSV (`NolioImporter` → `handleNolioImport`).
- Tests purs (aucun réseau) : `src/lib/nolio/__tests__/nolioV2RecordsMapper.test.ts` (13 cas : fenêtres vélo, préférence FTP P30′ vs P20′×0.95, rejet de plausibilité, conversion d'unité course km/h/m·s⁻¹//km sans confusion, unité non reconnue, CSS best-of avec rejet hors plage, FC max, provenance) et `src/lib/nolio/__tests__/nolioV2RecordsClient.test.ts` (5 cas : validations d'entrée, forme de réponse, statut HTTP).

`npx tsc --noEmit` et `npx eslint` passent sans erreur nouvelle sur l'ensemble des fichiers créés/modifiés ; `vitest run src/lib/nolio/__tests__` : 18 fichiers, 219 tests, tous verts.

## Pourquoi ce choix d'architecture

Trois pièges identifiés dans l'audit Nolio v2 (7 novembre) guidaient la conception :

1. **Un record Nolio n'est pas un test validé.** Rien n'est écrit automatiquement — même le "confirm" serveur envisagé initialement a été abandonné au profit du mécanisme déjà existant et déjà éprouvé (aperçu → formulaire → bouton Enregistrer habituel), pour ne pas dupliquer ni contourner le chemin d'écriture déjà testé.
2. **Unités hétérogènes.** Chaque conversion est explicite par unité reçue ; voir les tests de non-confusion km/h vs m/s vs allure.
3. **Budget d'appels.** Le plan de requêtes est fixe et borné (4 appels), jamais une boucle par fenêtre ou par sport.

## Ce qui N'EST PAS fait, délibérément

- **`time_5k_sec`, `time_10k_sec`, `time_half_sec`, `time_marathon_sec` ne sont pas importables** depuis ce nouvel écran : la fonction les calcule et les affiche (transparence), mais le formulaire de snapshot (`SnapshotManager`) n'a aujourd'hui aucun champ pour ces temps de course — ils ne sont écrits que par l'ancienne synchronisation v1 automatique (`nolio-records`), sans revue coach. Ajouter ces champs au formulaire est un changement plus large (nouveaux inputs, nouvelle colonne visible) volontairement laissé hors de ce lot pour ne pas élargir le périmètre.
- **Aucun test live contre Nolio n'a été exécuté** — aucune credential Nolio n'est configurée dans cet environnement. Le chemin est testé unitairement (logique pure, fetch injecté) mais pas vérifié de bout en bout avec de vraies données. La première utilisation réelle doit être faite par un coach authentifié.
- **Pas de rafraîchissement de jeton OAuth** dans cette fonction (`loadAuthorizedV2Connection`, pas `loadV2ConnectionWithRefresh`) : si le jeton Nolio V2 est proche de l'expiration, le coach obtient un message "reconnectez Nolio" plutôt qu'un rafraîchissement automatique. Choix délibéré de simplicité pour ce premier lot ; alignable plus tard sur le mécanisme de `nolio-v2-send-plan` si le besoin se confirme.
- **Le scope `metrics:read`** n'est probablement pas encore accordé sur les connexions V2 existantes (il n'est pas dans `NOLIO_V2_REQUIRED_SCOPES`). Un coach déjà connecté verra `metrics_scope_missing` tant qu'il n'a pas reconnecté Nolio en accordant cette autorisation. Ce n'est pas un bug : c'est le comportement attendu, affiché clairement au coach plutôt que masqué.

## Prochaine étape si validé à l'usage

Ajouter les champs de temps de course au formulaire de snapshot, puis les rendre importables ici de la même façon ; envisager le rafraîchissement de jeton si les connexions proches d'expirer deviennent fréquentes en pratique.
