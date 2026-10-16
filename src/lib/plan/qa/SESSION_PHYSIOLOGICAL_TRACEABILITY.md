# Traçabilité physiologique des séances finales

## Chaîne réellement disponible

| Élément | Source | État avant P3 | Vérification P3 |
|---|---|---|---|
| Limiteurs classés | `prepareTrainingPlanContext.ts` → `identifiedLimitersRaw` | Calculés, transmis au catalogue/prompt et contrôlés seulement en agrégat | Rang conservé et lié à une séance uniquement par un contrat déterministe connu |
| Leviers | `computeDecision.ts` → `strategyContext.levers` | Calculés et consommés par le prompt | Liés à une intention seulement pour les IDs de leviers dont le contrat est fermé |
| Intention | `LibraryWorkout` → `buildRepairWorkoutMetadata()` → `intentFamilyOf()` | Disponible pour les réparations, absente du plan final | Retrouvée depuis le `catalogId` final et confrontée au texte final avec le même classifieur |
| Dose finale | `MergedSession.durationMin`, `zones`, `title`, `details` | Disponible mais sans preuve causale | Durée et zone comparées aux bornes de la fiche ; répétitions, récupération et volume extraits comme preuves |
| Séance finale | `MergedPlan.weeks[].sessions[]` | Disponible dans le cockpit | Une attribution et ses anomalies sont produites pour chaque séance active |

La fonction pure `buildSessionPhysiologicalTraceability()` se trouve dans
`sessionPhysiologicalTraceability.ts`. Elle s'exécute après toutes les
mutations et réparations, sur le `MergedPlan` réellement livré au cockpit.

## Sens des statuts

- `verified` : l'identité catalogue finale est autorisée pour le run, les
  métadonnées sont présentes, un couple limiteur–levier actif possède un
  contrat compatible avec l'intention, la durée et l'intensité finales restent
  dans les bornes de la fiche, et les confiances diagnostic/stratégie ne sont
  pas faibles.
- `uncertain` : une partie de la chaîne est démontrée, mais la dose, le couple
  causal, la confiance ou une incompatibilité empêche une validation complète.
- `not_verified` : les données structurées sont insuffisantes, par exemple une
  séance custom sans `catalogId`. Le système ne fabrique alors aucun limiteur,
  levier ou objectif.
- `not_applicable` : jour de repos.

`verified` décrit la concordance de données calculées avec la séance finale. Il
ne signifie jamais que Gemini a respecté une instruction simplement parce que
cette instruction figurait dans le prompt.

## Contrôles déterministes

Le rapport détecte séparément :

1. les séances sans intention vérifiable ou sans métadonnées catalogue ;
2. les durées hors plage et les zones finales dépassant la fiche ;
3. une intention explicite du texte final différente de l'intention catalogue,
   même lorsque la zone reste identique ;
4. les conflits avec les prohibitions structurées ;
5. les prérequis de niveau déjà confirmés par
   `levelPrerequisiteCompatibility.ts` ;
6. les séances clés intenses sous charge récente haute/surcharge et les séances
   à impact élevé sous risque blessure élevé ;
7. l'absence de séance causalement vérifiée pour L1 alors qu'une priorité
   secondaire est représentée.

Ces anomalies restent hors du calcul de `validatePlan()` et de B1–B14. Elles
sont affichées et exportées par le Pilot Cockpit sans modifier les scores QA
existants. Seuls les conflits avec une interdiction, un prérequis démontré, une
intensité supérieure au contrat, un ID étranger au catalogue du run ou une
intention finale contradictoire sont qualifiés de critiques. Les données
manquantes et les écarts de couverture restent informatifs ou avertissements.

## Limites restantes

- Le plan final ne contient pas encore un journal structuré exhaustif de toutes
  les substitutions serveur puis client. P3 peut prouver la cohérence du
  résultat final et détecter une contradiction textuelle, mais l'intention de
  la séance remplacée peut rester inconnue.
- Les contraintes générales restent du texte libre. Elles sont signalées comme
  présentes, sans prétendre qu'elles ont toutes été interprétées.
- `recentLoad` couvre la charge courante. L'historique longitudinal détaillé des
  séances n'est pas transmis à cette étape.
- Les répétitions, récupérations et volumes sont extraits de façon
  déterministe. Une cohérence détaillée n'est affirmée que lorsque la fiche
  catalogue fournit une borne directement comparable.
- Le contrat levier→intention est fermé aux leviers connus. Un nouveau levier
  apparaît comme non vérifié jusqu'à l'ajout explicite de son contrat et de ses
  tests.

## Validation locale sans Gemini

Les tests construisent des `MergedPlan` déterministes et couvrent : chaîne
complète cohérente, données insuffisantes, changement d'intention à zone égale,
prohibition, priorité L1 absente, prérequis de niveau et profil
`B-5K-BEGINNER`. Aucun test ne déclenche `generatePlan()` ni une fonction edge
distante.
