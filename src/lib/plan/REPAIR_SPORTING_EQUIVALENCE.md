# P1 — Préservation de l’intention sportive pendant les réparations

## Périmètre

Cette correction ne change ni le diagnostic, ni le Strategy Engine, ni le prompt Gemini, ni le Pilot Cockpit. Elle intervient uniquement après génération, dans les réconciliateurs serveur et client.

Le catalogue affiché à Gemini reste strictement inchangé. Le client transmet désormais, dans des champs séparés du payload, les métadonnées complètes nécessaires aux réparations : sport, intention physiologique, objectifs compatibles, phases, plage de durée, zone principale maximale, contexte particulier, prérequis, nécessité, conditions de placement, contre-indications, tags, structure et zones.

## Comportement avant

Le serveur reconstruisait les candidats depuis le tableau Markdown compact et tronqué du prompt. Une structure non reconnue était classée `unknown`, puis `unknown` était accepté comme joker. Le client utilisait principalement le sport, la phase, la durée, les goals et une famille d’intensité à trois niveaux. Selon le chemin de réparation, la famille d’origine n’était pas toujours conservée. Le caractère recovery/deload dépendait d’une note libre `weeklyNotes`.

Ces règles permettaient notamment les chaînes constatées dans l’export `2026-10-15_B-5K-BEGINNER_run1.json` :

- sortie longue facile → 6 × 1 000 m Z4 ;
- séance build → protocole lactate norvégien ;
- endurance facile → allure Ironman post-vélo ;
- séance initiale → seuil 70.3 ;
- progression longue → allure semi-marathon ;
- semaine recovery → fartlek, côtes ou 4 × 1 000 m ;
- deuxième ouverture d’affûtage identique → remplacement sans preuve d’un rôle équivalent.

## Comportement après

Tous les sélecteurs génériques de remplacement et d’insertion utilisent la même règle structurée :

1. le sport doit correspondre ;
2. un remplacement doit conserver la famille d’intention fine (`endurance_fondamentale`, `seuil`, `vo2`, `sprint`, `technique`, `force`, `recuperation`, `test`, `race_pace`, `brick`, `fatmax`) ;
3. une fiche explicitement réservée à un objectif doit inclure l’objectif courant dans ses goals ; une distance citée dans le nom ne suffit pas à l’interdire ;
4. le candidat doit être compatible avec la phase ;
5. il ne peut introduire ni contexte particulier ni prérequis absent de la séance d’origine ;
6. une insertion sans séance d’origine ne peut introduire de contexte ou prérequis non confirmé ;
7. une semaine `recovery`/`deload` est plafonnée à Z2 et refuse les intentions qualité, même si `weeklyNotes` est absent ; le `weekType` des quotas est prioritaire ;
8. une intention ou des métadonnées inconnues ne valent jamais accord implicite.

Les seules différences d’intention autorisées sont déclarées par le chemin qui
répare précisément cette dimension : réduction d’un excès de séances VO2 vers
seuil/endurance, retrait d’un second contexte à jeun vers endurance/récupération,
et progression interne Start-to-Run entre technique et endurance facile. Elles
ne s’appliquent pas aux remplacements génériques.

Le serveur applique cette règle aux gardes trail hors objectif, au plancher de sortie longue, aux insertions de quota, au dédoublonnage, au plafond des séances à jeun, aux signatures LCW et au plancher quotidien. Le client l’applique aux réparations de phase, durée et discipline, aux insertions de quota, aux deux dédoublonnages, aux réductions d’accumulation intense, au remapping vers un voisin et aux remplacements Start-to-Run spécialisés.

## Réparations volontairement non résolues

Quand aucun candidat ne prouve une équivalence suffisante, la séance initiale reste en place et le chemin existant émet une anomalie explicite (`*_unresolved`, `reconcile_conflict`, `catalog_id_no_safe_neighbor`, `duplicate_catalog_id_unresolved`, ou équivalent spécialisé). Le système ne choisit plus un candidat `unknown` pour faire disparaître artificiellement l’anomalie.

Ce comportement est attendu pour les sept chaînes de non-régression lorsque le catalogue restreint ne contient aucune alternative réellement équivalente. Pour S11, deux ouvertures identiques restent visibles avec une anomalie de doublon si aucune autre ouverture 5 km, taper et `race_pace` n’est disponible.

## Validation sans Gemini

- TypeScript client : `tsc --noEmit`.
- Tests Vitest ciblés : équivalence sportive, famille d’intensité, recovery/deload, remapping et dédoublonnage client.
- Tests Deno ciblés : plancher de sortie longue, réconciliateur serveur, recovery sans `weeklyNotes`, doublon d’ouverture S11 et compatibilité structurée.
- Test d’enchaînement : la sortie serveur conservée en cas de réparation incompatible est passée au réconciliateur client, qui doit à son tour la conserver et maintenir l’anomalie au lieu d’introduire une nouvelle incompatibilité.
- Aucun appel Gemini n’est nécessaire : les plans, catalogues structurés et quotas sont des fixtures locales déterministes.

