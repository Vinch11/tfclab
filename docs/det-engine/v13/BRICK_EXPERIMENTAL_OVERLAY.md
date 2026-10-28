# Overlay expérimental du brick de transition

Correction de contrat actif, pas fabrication d’une séance complète admissible. Source de production inchangée, même identifiant et empreinte conservés.

| Élément | Résultat |
|---|---|
| Annonce originale | [30, 45] |
| Vélo actif connu | 30 |
| Course active connue | 25 |
| Total actif connu | 55 |
| Temps des transitions | inconnu |
| Durée totale maximale | inconnue |
| Séance complète exécutable | False |
| Erreur historique à55 min | ['catalogue_duration'] |
| Contrôle de la portion active corrigée | {'errors': [], 'unknown': []} |
| Phases/intensités modifiées | non |

Les15 min de vélo initiales, cinq séquences de3 min vélo/3 min course, puis10 min de jogging donnent30 min vélo et25 min course. Un objectif de transition sous30 s n’est ni une observation ni une durée nulle. Le contrat expérimental actif devient55 min ; le contrat de temps total reste minimum55, maximum inconnu. Il n’est pas inséré comme séance55 min dans un plan.

Le contrôle original conserve catalogue_duration. Le contrôle parallèle de portion active n’est jamais présenté comme passage du validateur original ni comme validation du temps total. La couche ne supprime aucun bloc et ne fait pas passer55 min pour55 min de vélo. Aucun crédit de longue autonome n’est attribué.

Le contexte source restepeak et les restrictions originales sont conservées. Les prérequis individuels, la durée totale et le placement doivent être établis avant toute utilisation. Tous les autres bricks ne sont pas déclarés incompatibles par ce témoin.
