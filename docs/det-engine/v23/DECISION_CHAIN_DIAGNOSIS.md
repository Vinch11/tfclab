# Où le lien intention → programmation se rompait

**DRAFT — NO-GO.** Diagnostic ciblé sur les appels réellement exécutés, sans nouvelle recherche générale. Les mêmes entrées A/B/C V22 sont relues ; cinq contrefactuels sont enregistrés séparément avant calcul. Les traces intégrales sont dans `decision-chains.jsonl` et les résultats avant/après dans `evidence/validation-1/`.

## Point de rupture précis

`buildV22 Prescription` appelait d’abord `buildProspectiveCalendar`, puis calculait `deriveV22 StimulusRequests` au moment du retour. Les intentions ne pouvaient donc pas modifier la sélection ou le placement déjà effectués. Le calendrier V14 choisissait des listes fixes par sport/rôle, triait les longues puis les clés de séances, et réservait les minima de source/floors. Le focus vélo était le même champ préenregistré pour A/B ; il ne provenait pas du levier dominant.

V23 crée les intentions avant la construction, puis transmet une politique explicite au même moteur V14. Aucun solveur concurrent. Les appels sans option restent identiques aux sorties archivées V22.

| Catégorie | Constat A/B et test exécuté |
|---|---|
| Différence physiologique exploitable | TTE vélo observé65 chez A,28 chez B ; la décision TFCL A demande VO₂, B demande une fondation liée au maintien d’intensité. Le TTE n’est pas une mesure de durabilité Ironman. |
| Différence sans effet de dose justifiable | Même objectif/base, disponibilité, enveloppes et minima. Aucun contrat vérifié ne convertit VO₂/TTE en minutes supplémentaires. Les doses restent identiques. |
| Intention bloquée par des prérequis | VO₂/seuil A : tolérance d’intervalles non documentée ; interdiction historique de blocs VO₂ lourds conservée. Force : compétence et charge non établies. |
| Catalogue insuffisant | Ne pas confondre offre de famille et recette admissible : les offres sont listées dans les traces ; variante/chronologie complète et preuve individuelle manquent sur les sources retenues. Il n’est pas démontré que le catalogue entier soit vide. |
| Arbitrage non appliqué | Avant V23, intentions non consommées. La politique testée agit réellement sur l’ordre et le placement, mais sa variante ajoute une alerte et est rejetée. Aucun reliquat de temps rempli sans raison de dose. |
| Transport de données | Le transport TTE/VLamax V22 fonctionne au rejeu. Un autre problème sémantique d’économie course apparaît à la frontière score/coût énergétique ; dossier séparé, pas de correction concurrente de formule. |
| Règle historique imposant une solution proche | Rôles essentiels, domaine modéré de base, floors et minima de sources contraignent les mêmes séances. Le floor95 en S3 reste incompatible avec une réduction à90 sous la convention actuelle. |

## Résultat honnête

A/B n’obtiennent pas deux volumes différents pour faire réussir un test. Les intentions différentes sont reliées à une décision de programmation testable, mais aucune modification physique n’est retenue au prix d’une alerte supplémentaire. L’absence de différence retenue est expliquée : contraintes communes, prérequis manquants et rejet documenté du candidat.
