# Résultats V11 — DRAFT / NO-GO

Deux blocs de base de quatre semaines sont construits pour les deux profils synthétiques V10. Ils passent les contrôles bloquants hebdomadaires candidats exécutés, la sérialisation technique de bloc et les contrôles globaux exécutés. Ils conservent des avertissements historiques, des erreurs de ratios historiques et des inconnues de chronologie/fatigue. Aucun expert n’a validé ces prescriptions.

| Capacité | V10 conservée | V11 démontrée |
|---|---|---|
| Portée | Deux microcycles Ironman, une semaine chacun | Deux blocs distincts de quatre semaines,26 séances chacun |
| Développement/récupération | Sans validation interhebdomadaire de bloc | Trois semaines de développement, une recovery calculée ; contrat candidat pour ces cas |
| Dosage | Priorités, minima et enveloppes synthétiques | Maintien sans hausse forcée ; seul plancher natif cause+5 min de course en S3 du profil aérobie |
| Contexte source | Éligibilité générique et placement V6 | Exclusion explicite récupération + placement source ; nouvelle offre vélo ciblée par le constructeur existant |
| Feedback | Réduction même ID sur microcycle | Sept réponses par profil, revalidation du bloc entier ; deux réductions admissibles, quatre maintiens, huit rétentions |
| Validation | Plan complet appliqué à une semaine, limites signalées | Adaptateur hebdomadaire explicite séparé, historique brut conservé parallèlement |
| Trail | Trois routes de dose inconnue | Trois inconnues confirmées ; aucune attestation ni nouvelle capacité inventée |

| Profil | S1 | S2 | S3 | S4 récupération | Total bloc |
|---|---|---|---|---|---|
| IM_aerobic_history | 480 | 480 | 485 | 250 | 1695 |
| IM_balanced_history | 480 | 480 | 480 | 250 | 1690 |

Minutes prescrites. Budget déclaré commun 600 min/semaine ; plafonds natifs 480,528,580,447 min. Les plafonds candidats de développement sont volontairement plus bas lorsque rien ne justifie un supplément ; la récupération respecte aussi 70% de la dernière charge effectivement programmée (convention TFCL conservée). De ce plafond réduit, la semaine utilise 250 min et laisse encore du budget non utilisé. Une baisse n’est pas la preuve d’une récupération physiologique.

## Essais et corrections

- Critère « baisse dans chaque discipline » rejeté comme généralisation nouvelle non étayée : la natation minimale peut être maintenue ; volume total et règles natives restent contrôlés.
- Réduction équilibré 90→65 min rejetée pour nouvelle alerte de progression S3 ; alternative 75 min issue du plafond ordinaire déjà documenté, validée sur tout le bloc.
- Premier choix de récupération V3_BIKE_Z2_PROGRESSIF rejeté après lecture de avoid ; remplacement par A_BIKE_END_90_PRO existante,85 min dans75–105, sans modification de fiche.
- Champ douleur absent conservé inconnu, jamais converti automatiquement en false. Preuves avant correction et nouvelles preuves conservées ; décisions et doses identiques.
- Deux placements comparés, deux profils distincts : quatre blocs candidats calculés représentent **deux** cas physiologiques, pas quatre athlètes. Le placement séparé est retenu pour dossier, sans supériorité sportive démontrée.

## Validation et couverture

Typage final réussi ; 62 tests de gouvernance ; 102 tests expérimentaux réussis et 43 ignorés opt-in ; 2999 tests historiques réussis, 1 ignoré et 6 todo. 17 tests V11 ciblés réussissent aussi pendant la génération des preuves ; ils recouvrent les tests expérimentaux et trois tests opt-in de publication d’artefacts. Ils ne sont pas additionnés à la couverture comme tests indépendants.

Deux processus indépendants produisent exactement les mêmes cinq artefacts (empreintes dans evidence/reproducibility.json). Un redémarrage d’environnement a interrompu la première validation après ses trois premières étapes ; seule la commande historique non achevée a été reprise. La dernière correction du champ douleur a été vérifiée par typage et suite expérimentale complète, les entrées historiques et sources de production restant inchangées. Les échecs de typage initiaux et rejets ne sont pas effacés.

| Lecture | Résultat et limite |
|---|---|
| Technique | Deux blocs distincts complets et sérialisables ; pas de préparation de compétition entière |
| Hebdomadaire candidate | Aucun échec bloquant exécuté ; inconnues de fatigue, minutes internes et chronologie de certaines fiches |
| Globale candidate | Plafonds TFCL conservés, continuité des trois disciplines, récupération et transitions contrôlées ; pas de certificat de tolérance |
| Historique | Erreurs et avertissements bruts conservés ; pas de conformité complète historique revendiquée |
| Ratios | Fréquences et minutes distinctes ; quatre semaines ne couvrent pas la totalité du premier bloc de génération natif |
| Scientifique individuelle | Non démontrée : données et réponses synthétiques, pas d’adaptation observée ni dose optimale |
| Experte | Aucune revue indépendante effectuée |
| Historique600 | Références préservées byte-à-byte ; pas de nouveau calcul des 600 configurations dans cette mission V11 |
| Autres objectifs | Non-régression logicielle multiobjectifs existante ; aucun nouveau bloc sportif d’une autre famille démontré en V11 |

Les ratios historiques et répétitions ne sont pas tous des erreurs hors contexte : leur portée méthodologique reste à discuter. Les dossiers publient les nombres et diagnostics bruts par profil ; ils ne les masquent pas dans un score agrégé. Aucun HIT hebdomadaire n’est ajouté pour satisfaire une étiquette historique.

## Décisions humaines réellement nécessaires avant promotion

1. Revue sportive indépendante du couple longue+position et des deux blocs de base, des précautions posturales/symptomatiques et de la récupération avec natation minimale maintenue ; les variantes restent candidates.
2. Preuves de parcours et réponse musculaire individuelles pour les trois sources trail inconnues avant toute attestation verticale ; absence de D− jamais assimilée à zéro.
3. Avant extension spécifique Ironman : données de réponse suffisantes et objectifs de nutrition/longues/bricks explicités, puis revue de la préparation entière. La V11 ne démontre pas cette capacité ultérieure.

Aucune décision de production n’est demandée. Aucune fusion, publication Lovable, migration, dépense, écriture Nolio/athlète, modification du moteur actuel ou des validateurs historiques. PR420 reste en brouillon, NO-GO. Le registre de dix unités s’arrête à sa clôture ou au délai absolu ; aucune continuation permanente n’est prétendue.

Les huit livrables sont indexés dans [README](README.md). Provenance, scripts, versions et état de reprise sont conservés dans le même dossier.
