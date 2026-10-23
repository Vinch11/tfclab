# Laboratoire indépendant de validation sportive

Ce répertoire analyse un plan déjà produit. Il ne génère, ne répare et ne
modifie aucun plan. Il n'appelle ni Gemini, ni Supabase, ni un validateur de
production.

## Commande

```bash
bun src/qa/sports-plan-lab/cli.ts --list-scenarios
bun src/qa/sports-plan-lab/cli.ts \
  --plan chemin/plan.json \
  --scenario confirmed-703 \
  --format markdown \
  --out rapport.md
```

Formats reconnus : plan direct avec `weeks`, `{ mergedPlan }`,
`{ finalMergedPlan }`, `{ output: { mergedPlan } }` et
`{ output: { finalMergedPlan } }`. Le code ne transforme jamais le fichier
d'entrée. Le code de sortie CLI vaut `2` si le rapport contient au moins une
anomalie critique, `1` si l'entrée ou la commande est invalide, et `0` sinon.

## Contrôles

- présence et interdiction de disciplines selon le scénario ;
- minutes hebdomadaires et par discipline lorsque `durationMin` est fiable ;
- parts cardio attendues pour les scénarios multisports ;
- identification conservatrice de la compétition finale et des compétitions
  intermédiaires ;
- hausse hebdomadaire de volume et décharges lorsque le scénario porte un
  seuil ou une cadence explicite ;
- intensité d'une semaine déclarée de récupération via `isKeySession` ;
- espacement civil des séances portant `isKeySession=true` ;
- présence du renforcement demandé ;
- jours disponibles uniquement quand le scénario les structure ;
- prérequis audités de la bibliothèque via `catalogId`, sans appeler la logique
  des validateurs ou du reconciler ;
- intention finale contre intention auditée seulement si les deux sont
  structurées dans les données.

Le rapport ne produit aucun score global. Les zones sont agrégées sous leur
libellé brut (`Z1`…`Z7`) et ne sont jamais converties entre disciplines.

## Ce qui reste non vérifiable

- une durée absente ou nulle pour une séance active ;
- les 48 heures exactes entre deux séances lorsque seules les dates civiles
  sont connues ;
- la charge interne, le sommeil et la récupération réellement observés ;
- l'intention de la prescription finale si seul le catalogue ou le prompt
  porte une intention ;
- une disponibilité décrite uniquement en texte libre ;
- l'identité certaine d'une compétition, car le contrat de séance n'expose
  pas encore d'identifiant d'événement.

Les 14 scénarios sont des fixtures non cliniques. Ils utilisent les types
`PlanAthleteData` et `PlanConfig`, mais ne fournissent aucune VMA, FTP, CSS ou
VO2max fictive présentée comme une mesure réelle.

## Validation sur les incidents disponibles

Voir [VALIDATION_REAL_CASES.md](./VALIDATION_REAL_CASES.md). Le plan 70.3 de
32 semaines et le plan 10 km historique n'étaient pas disponibles sous une
forme structurée réutilisable. La suite distingue donc :

- les fixtures entièrement synthétiques de non-régression ;
- une reconstruction synthétique des seuls compteurs publiés de l'incident
  70.3, utilisée pour caractériser les trois alertes attendues ;
- les exports réels texte/PDF, explicitement refusés par le normaliseur tant
  qu'une extraction structurée fiable n'existe pas.

