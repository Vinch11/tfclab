# Compatibilité Nolio — audit et contrats locaux

**Zéro requête Nolio, zéro écriture, zéro synchronisation activée.** L'adaptateur n'est pas un client HTTP. Toute utilisation hors fixture synthétique est refusée.

## Contrat réellement utilisé dans le dépôt

`supabase/functions/nolio-send-plan/index.ts` construit six champs de base : `id_partner:number`, `athlete_id:number`, `sport_id:number`, `name`, `date_start:YYYY-MM-DD`, `description`. La durée optionnelle est en secondes. Le workout structuré actuel contient des steps de durée et des répétitions ; les normalisations de cibles sont propres au sender. [Le témoin AST](evidence/nolio-source-contract.json) conserve source, SHA, champs et types. Le contrat local testé est un sous-ensemble de ce code ; aucune réponse du serveur distant n'a été obtenue en V16.

La production actuelle supprime puis recrée une séance ; elle peut ajouter des pauses en natation et normaliser les cibles. V16 n'appelle pas ce sender, ne réutilise pas ses transformations comme preuve de fidélité, ne déclenche pas ces effets et ne lit pas les structures générées/overrides en base.

## Canonique → lecture → payload fictif

- **833 fiches mono-discipline** : mode texte explicitement choisi et accepté par le contrat local. Description intégrale de prescription, ID historique, date, discipline et durée de réservation fournis explicitement. La durée minimale annoncée utilisée dans ces fixtures est une entrée de test de sérialisation, pas une dose déclarée réalisable ou admissible. L'ID destinataire 1 est fictif ; aucun destinataire réel n'est consulté.
- **87 fiches brick/mixed** : refus de représentation via une discipline unique. Certaines mixed sont repos/mobilité/nutrition, pas des bricks ; aucune durée ou sport artificiel n'est ajouté pour les exporter.
- **0 recette source exportée en workout structuré certifié V16** : grammaire complète non établie, références individualisées ou modalités de répétitions/repos insuffisantes. Une demande structured échoue avec raisons explicites, jamais avec remplacement silencieux par du texte.
- Les tests de syntaxe DTO comprennent une répétition explicitement décrite, uniquement comme fixture de contrat, jamais comme séance ajoutée au catalogue ou plan sportif. Les payloads compatibles sont sérialisés puis rejoués à l'identique ; les dates invalides, budgets incompatibles, versions inconnues et sports ambigus sont refusés.

Le mode texte n'est pas annoncé comme une compatibilité structurée. Les templates mono-discipline décrivant plusieurs expositions AM/PM ne sont pas certifiés comme événements distincts ou planning intrajournalier. Les répétitions/repos/consignes restent lisibles dans la description, mais aucune équivalence machine n'est revendiquée. Les notes, dangers et inconnues ne sont pas effacés pour passer le contrat.

## Travaux Nolio v 2

Les six documents `docs/nolio-v2/` décrivent une proposition distincte : IDs opaques `usr_…`/`spt_…`, quantités et workout différents, absence d'id_partner documenté, révisions et périmètre initial de lecture seulement. Le JSON OpenAPI dont ils conservent le hash n'est pas présent dans cet environnement ; les documents eux-mêmes signalent que les répétitions/cibles complexes ne sont pas complètement spécifiées.

V16 **refuse la cible API v 2**, ne convertit pas les IDs numériques en faux IDs v 2, ne revendique aucun test de contrat officiel v 2 et n'active pas la proposition de lecture ou de publication. Une future implémentation demandera le contrat machine disponible et les structures complexes clarifiées, des mappings explicites et une autorisation distincte pour toute connexion réelle. L'accord de cette mission couvre uniquement le prototype offline présenté ici.
