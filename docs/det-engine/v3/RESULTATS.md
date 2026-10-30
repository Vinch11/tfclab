# DET-ENGINE AUTONOMOUS V3 — résultats vérifiés

**NO-GO pour intégration. PR #420 à conserver en brouillon.** La qualité des réparations progresse ; la pertinence sportive générale n'est pas démontrée.

## Comparaison à la baseline V2

| Indicateur | V2 retenue | V3 retenue |
|---|---:|---:|
| Configurations comparées | 600 | 600 |
| Plans construits dans la matrice conservatrice | 167 | 167 |
| Sans erreur bloquante des contrôles exécutés | 11 | 11 |
| Occurrences bloquantes sur construits | 1151 | 1109 |
| Avertissements sur construits | 7118 | 7092 |
| Refus hérités | 433 | 433 |

**41 remplacements retenus / 9483 propositions nouvelles**, plus **2 réductions de durée / 47 propositions**. 42 occurrences bloquantes et 26 avertissements de moins. Aucun candidat antérieurement construit ou sans erreur exécutée n'est perdu ; aucune nouvelle occurrence critique comparable n'est introduite sur les transitions retenues. Chaque passe des 600 sorties est identique à son second calcul.

Il s'agit de revalidation/réparation des candidats de la baseline gelée : les 433 refus sont repris inchangés, sans prétendre avoir reconstruit ces plans. Leur diagnostic V2 reste : 200 routes non couvertes, 29 recherches inconclusives et 204 rejets du contrat courant, sans preuve d'impossibilité sportive générale. Les essais Ironman supplémentaires reconstruisent réellement leurs candidats, dans une expérience séparée.

## Qualité des réparations historiques

Les **245 réparations V2** sont reconstruites successivement et revalidées ; chaque plan final est retrouvé exactement. Les +92 avertissements V2 se décomposent : polarisation +72, déclaration de séance clé +88, répétition +34, progression +3, limiteurs +1, catégories TFCL −106. Une gravité émise « warning » n'est pas une garantie d'innocuité.

195 réparations sur 245 demandent une revue selon la politique relative V3 ; 50 passent ce garde-fou sans certification scientifique. Les groupes se recoupent : 188 ajoutent une alerte, 22 aggravent une progression descriptive, 6 aggravent une alerte numérique d'intensité ; 118 présentent un avertissement nouveau du même code et de la même semaine alors qu'un blocage correspondant diminue. 91 configurations sont concernées. Quatre des 11 candidats sans erreur ont cet historique.

Ces réparations signalées ne sont pas approuvées sportivement. La baseline et ses preuves restent intactes ; un retour arrière automatique pourrait réintroduire des blocages et n'est pas déclaré sûr. La suite V3 protège les nouvelles alertes, leurs sous-types/semaines, les amplitudes d'intensité contrôlées et les hausses interhebdomadaires par discipline. Les dernières passes enregistrent aussi le détail du garde-fou par proposition.

[Classification et conséquences](final/AVERTISSEMENTS.md) · [Tableau de bord par objectif, ambition, niveau et profil](final/dashboard.md).

## Ironman continu et trail

Cinq contrats Ironman sont comparés sur les 40 configurations, chacun rejoué exactement : témoin 0 construit ; trois variantes 13 ; variante traitant aussi la récupération **26/40 construits**. **Aucun n'est sans erreur sportive ni conforme au contrat témoin.** Les 65 candidats assemblés au total des variantes passent séparément le schéma/calendrier ; les duplications entre modèles ne deviennent pas 65 configurations différentes.

Le second audit de continuité utilise la structure réelle des bricks. Dans la variante à 26 constructions : deux candidats ont une discipline absente à certaines semaines, trois ont au moins une présence incertaine, avec recoupement possible. Les minima effectifs nuls ne prouvent pas la continuité. Cumul sur trois semaines, récupération, séance du lendemain, durées autonomes et composantes inconnues sont publiés ; la fatigue biologique reste non attestée.

Trois architectures trail dédiées produisent **36 enveloppes synthétiques sur 504 semaines décrites**, identiques au rejeu, et **zéro plan complet**. Les 160 cas historiques restent refusés faute de géométrie explicite suffisante. Distance/D+, D− lorsqu'il existe, terrain, course/marche, force, excentrique, durée et récupération restent des dimensions distinctes. Aucun quota marathon n'est transposé. Le niveau coach ne prouve pas l'habituation musculaire.

[Modèles et résultats détaillés](MODELES.md) · [Sources scientifiques et limites des conventions](SCIENCE_ET_CONTRATS.md).

## Progression et tentatives rejetées

Deux réductions de vélo en semaine 7 de plans LCW retirent trois alertes de progression : 150→90 min sur un cas 70.3 et 150→105 min sur un cas IM. Les plages catalogue/créneau et la revalidation du plan entier restent obligatoires ; ces plans gardent d'autres défauts. Cette amélioration limitée ne démontre pas la progression physiologique générale.

L'essai initial qui ajoutait de la durée pour faire disparaître des alertes est rejeté et archivé : 12 allongements et 14 alertes retirées ne constituaient pas une amélioration justifiée. Les 1417 permutations de séances à doses constantes n'apportent aucun gain retenu ; l'approche n'est pas répétée indéfiniment.

## Vérifications finales

- Suite historique inchangée : **2999 tests réussis**, 1 ignoré et 6 TODO.
- Suite expérimentale courante : **29 tests réussis**, 10 opt-in ignorés dans cette passe ; simulations opt-in exécutées et publiées séparément.
- Garde-fous/diagnostics Node : **48 réussites**, aucun ignoré, avec cycle CLI réel hérité et contrôle V3 de reprise idempotente en checkout expérimental isolé.
- TypeScript réussi. Schéma/calendrier/provenance de la matrice finale : **167/167**, 433 refus non applicables.
- 600 sorties identiques au rejeu sur chaque transition retenue ; 200 scénarios de construction Ironman et 36 enveloppes trail comparées deux fois.

Les contrôles complets de quotas, plan, contexte physiologique et validation finale B13/B14/B15 sont exécutés sur les candidats assemblés. La réponse physiologique réelle, la tolérance excentrique individuelle, la dose optimale et la charge totale incluant des compétitions de durée inconnue restent non attestées. Tout candidat nécessite une revue humaine. Les succès de test n'annulent pas les défauts sportifs.

La première capture supervisée EPERM est refusée, puis rejouée avec une capture vérifiable ; les erreurs TypeScript initiales et les essais rejetés restent conservés. Aucun seuil sportif ni test n'est assoupli.

## Arrêt, reprise et décisions

Les **12 unités de correction autorisées sont consommées** : 7 améliorations retenues, 3 essais non retenus, 2 évaluations séparées. La validation globale finale passe. Le registre est clôturé après 51.5 minutes, dans l'autorisation maximale de 60 minutes ; ce n'est pas un arrêt pour épuisement des 60 minutes. Les journaux et l'échéance restent conservés, sans processus permanent.

La décision indispensable avant promotion est une revue sportive indépendante des contrats phase/durée/récupération des bricks et du contrat trail de calendrier, doses verticales et tolérance musculaire. Davantage de corrections exigent une nouvelle autorisation d'itérations ; aucun compteur n'est remis à zéro silencieusement. Aucune autorisation de fusion ou de déploiement n'en découle.

[Journal des cycles](CYCLES.md) · [Orchestration](ORCHESTRATION.md) · [État de reprise](RESUME.md).

Aucune modification de main, des sources de production, des athlètes/Nolio, migration, déploiement, API payante, dépendance ajoutée ou push forcé.
