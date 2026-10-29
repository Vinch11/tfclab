# Protocole des itérations de qualité sportive

Statut : proposition, intégration API et exécution autonome non activées.
Lire d'abord [l'inventaire](STATE_OF_VALIDATION.md), le
[contrat scientifique](SPORT_SCIENCE_CONTRACT.md) et les [portes](QUALITY_GATES.md).

## Responsabilités

| Acteur | Responsabilité | Interdiction |
|---|---|---|
| Codex | Reproduction, correction minimale, branche isolée, tests et preuves | S'auto-certifier scientifiquement, changer ses critères, toucher à la production |
| Évaluateur scientifique OpenAI | Contradictions, limiteurs→dose finale, critères sourcés, rejet possible malgré tests verts | Modifier le candidat, inventer une source ou une approbation clinique |
| Contrôleur déterministe | Budgets, temps, empreintes, règles d'arrêt et permissions | Interpréter un avis vague comme acceptation |
| GitHub | Commits, CI, rapports, PR et décisions | Auto-merge, publication ou transfert de secrets vers le code candidat |
| Responsable humain | Périmètre initial, arbitrages sensibles, fusion/publication | Son silence ne vaut pas accord |

## Une mission bornée

1. Sélectionner un seul défaut ouvert du registre existant. Fixer incident,
   SHA de base, fixture/hash, critères applicables, commandes autorisées,
   fichiers modifiables, budget et horizon. Pas de sélection depuis une issue
   libre non approuvée ni depuis un commentaire pouvant injecter des instructions.
2. Rejouer la baseline sur les mêmes entrées ; archiver aussi les contrôles
   négatifs et la couverture manquante. Une baseline rouge attendue n'est pas
   un échec de l'infrastructure ; un échec nouveau non expliqué l'est.
3. Codex propose la cause et un diff minimal sur `quality/<mission>`. Le
   contrôleur refuse toute modification hors périmètre. Pas de réécriture
   générale, modification de fixture de référence ou assouplissement des alertes.
4. Tester le candidat offline, mêmes dépendances et fixtures ; tests ciblés puis
   CI pertinente. Capturer résultats numériques, différences et traces assainies.
5. Construire un dossier immuable, manifesté : baseSHA, candidateSHA, arbre/diff,
   fixtures, critères, références, commandes, versions outils et résultats.
   Le SHA d'un commit ne prouve pas qu'un worktree sale a été testé : attester
   explicitement l'état et arrêter s'il contient des modifications non enregistrées.
6. Sur un job distinct, l'évaluateur reçoit ce seul dossier approuvé, sans outil
   d'écriture ni secret de dépôt. L'avis JSON strict lie chaque critère aux preuves.
7. Le contrôleur recoupe schéma, identités, hashes et résultats. `reject` et
   `escalate` arrêtent ; `iterate` respecte les plafonds ; `accept` peut préparer
   la PR brouillon. Un nouveau commit invalide l'avis précédent.
8. Le job rédacteur, distinct des tests et de la revue, reçoit seulement les
   artefacts vérifiés et les droits de créer la branche/PR. Aucun droit de fusion.
   Il ne lance jamais un script du candidat avec le jeton GitHub d'écriture.
9. Journaliser résultat final même en cas d'arrêt, coût réservé/réel et limites.
   L'humain décide séparément de la fusion, et séparément encore de la publication.

## Mécanismes officiels et intégration future

Une session ChatGPT interactive n'est pas un service permanent appelable par CI.
Codex peut être invoqué par le [CLI non interactif officiel](https://developers.openai.com/codex/noninteractive/)
ou [l'action officielle](https://developers.openai.com/codex/github-action/).
L'avis séparé peut utiliser la Responses API avec sortie JSON Schema stricte,
sans outils, `store:false`, modèle/version approuvés et contexte neuf.
Le refus et le statut incomplet restent des états d'échec explicites.

Le dossier de données exclut les données athlètes ; seules fixtures synthétiques
approuvées et métriques techniques sont admissibles par défaut. L'accès à Internet
du réviseur n'est pas nécessaire : les références scientifiques du dépôt sont
jointes avec leurs limites. Une question nouvelle déclenche l'escalade humaine.

**Non implémentés dans cette proposition :** client API, courtier budgétaire
réseau, isolation conteneur de l'agent, signature/provenance de l'avis et création
automatique de PR par CI. Ne pas présenter le workflow offline proposé comme une
boucle autonome payante opérationnelle. Leur activation nécessite une revue dédiée.
