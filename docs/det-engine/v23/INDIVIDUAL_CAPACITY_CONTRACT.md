# Capacité actuelle, projection et assimilation

**Une enveloppe documentée dans un cas synthétique ne vaut ni preuve de tolérance d’une recette exacte ni adaptation observée.** Le contrat V23 sépare ces niveaux ; les valeurs V22 restent inchangées.

| Notion | Traitement |
|---|---|
| Enveloppe actuelle déclarée | Origine préenregistrée conservée, indépendante du niveau qualitatif |
| Capacité présumée | Ne reçoit aucune valeur de remplacement ; source-specific capacity proven reste false |
| Dose future conditionnelle | Comparée à l’enveloppe actuelle et aux conditions datées ; pas actuellement dans l’enveloppe si elle la dépasse |
| Progression assimilée | Aucune observation réelle, donc null ; jamais acquise par le passage des semaines |

## Cas95 contre90

En S3 A/B,95 minutes de course dépassent l’enveloppe90. `currentlyWithinEnvelope=false`, `currentIndividualDoseApproved=false`. Le calendrier peut conserver cette perspective conditionnelle, mais la dose n’est jamais déclarée actuellement admissible.

L’alternative90 est examinée avec la source d’origine, les bornes temporelles, le catalogue et le contrat canonique. Elle échoue au floor natif95 ; pour cette source, la preuve temporelle complète de l’alternative reste également insuffisante. Aucune séance n’est raccourcie ou substituée silencieusement. Le floor est identifié comme convention de programmation, pas comme minimum physiologique universel ; le moteur ne s’autorise pas à le modifier.

Le contrefactuel fixe une enveloppe course75 avant calcul. S1 à80, S2 à90 et S3 à95 sont explicitement hors enveloppe. Pour la source A_RUN_Z2_EASY, l’alternative75 conserve échauffement10, corps55, retour au calme5 et éducatifs5 ; elle reste refusée car le floor80/90 n’est pas satisfait. Préserver la recette ne suffit donc pas à préserver toutes les obligations.

| Cas | Conflits d’enveloppe actuels/futurs explicités | Alternatives rejetées |
|---|---:|---:|
| A_aerobic | 1 | 1 |
| B_sustainability | 1 | 1 |
| C_uncertain | 0 | 0 |
| B_changed_relevant_limiter | 1 | 1 |
| B_missing_bike_reference | 1 | 1 |
| B_lower_run_capacity | 3 | 3 |
| B_adverse_recovery | 1 | 1 |
| B_insufficient_differentiation | 1 | 1 |

Total :9 alternatives rejetées sur les huit cas,0 appliquée. Les valeurs et répétitions des sources restent intactes. Les conflits sont séparés des erreurs structurelles de calendrier et des conditions de récupération.

## Réponse défavorable

Le cas préenregistré de récupération vélo incomplète avant S2 ajoute un arrêt à la réservation précise vélo long/S2. Il change le statut du bloc de candidat complet conditionnel en incomplet/refusé. Les autres séances et minutes ne sont pas compensées ; les semaines suivantes ne sont pas déclarées assimilées. L’observation est synthétique, ne constitue pas un avis coach humain et ne donne aucune nouvelle capacité.
