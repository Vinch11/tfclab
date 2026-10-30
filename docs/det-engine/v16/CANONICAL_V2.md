# Schéma canonique V2

Version `tfcl-canonical-v2.0.0`, convertisseur `det-v16-converter-1`. Le contrat exécutable Zod et son JSON Schema dérivé sont versionnés. Le convertisseur est une transformation pure ; les 920 reconversions et deux processus indépendants doivent donner les mêmes sorties.

| Bloc | Contenu et statut |
| --- | --- |
| Identité/provenance | ID historique intact, clé d'occurrence, fichier/export/index, SHA-256 source et contenus, différences d'enrichissement |
| Original | Objets complets avant/après pipeline, aucun champ opaque supprimé |
| Prescription | Discipline normalisée réversible, objectif, variantes, phases, durées déclarées et éventuelles durées par phase |
| Physiologie/intensité | Métadonnée source quand présente ; domaine seulement si explicitement déclaré dans la doctrine, aucun domaine inféré du titre ou de Z4 |
| Structure | Toutes les parties et consignes originales, zones, quantités/reps lexicales avec positions ; chronologie exécutable seulement pour grammaire entièrement reconnue |
| Intervalles | W′bal original intégral ; ce sous-ensemble ne prouve pas à lui seul la durée totale de la séance |
| Individualisation | Plages catalogue et références requises, sans capacité/tolérance imputée ; affichage intensité selon doctrine si repères et provenance fournis |
| Restrictions | When/avoid, nécessité, tags et prérequis explicites ; restrictions textuelles toujours visibles |
| Musculaire/terrain | Consignes de force/excentrique/terrain, D+ structuré lorsqu'existant, D− non structuré inconnu, récupération/tolérance individuelles inconnues |
| Science/réévaluation | Mentions bibliographiques source non vérifiées, progression et suivi sources, adaptation future jamais acquise |
| Conversion | Inconnues/anomalies, couverture technique, statut scientifique, absence explicite de promotion automatique |

Les comptes de répétitions ou nombres capturés dans un texte sont des **tokens**, pas une recette exécutable complète : unité du bloc, variantes, repos final, transitions et consignes périphériques peuvent rester inconnus. Le parseur ne prend jamais le premier nombre comme durée totale. Les durées manquantes/invalides deviennent `null` avec anomalie, jamais 0 ou une moyenne ; l'original reste entier.

Les états `represented_losslessly`, `requires_interpretation`, `not_validated_by_conversion` et `automaticPrescription:false` sont indépendants. Le schéma n'efface ni ne satisfait les trois états de capacité V14. Un hash/source ou un champ canonique altéré est refusé par les adaptateurs ; un changement légitime demande une nouvelle conversion/version de preuve.

L'alias technique `cyclisme→bike`, `course→run`, `natation→swim`, `renforcement→strength` est réversible via l'original. Aucune récupération, intensité, durée optimale ou référence scientifique n'est créée. Les bornes et principes viennent uniquement de `src/lib/zones/tfclDoctrine.ts`; la conversion d'un repère personnel en plage d'affichage reste une convention TFCL, pas une attestation de dose optimale.
