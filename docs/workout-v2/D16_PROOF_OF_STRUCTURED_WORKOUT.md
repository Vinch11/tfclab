# D1.6 — De la bibliothèque V2 à une proposition structurée contrôlable

**Statut : pilote isolé / NO-GO sportif et opérationnel.** Base exacte : PR #431, SHA `b29bbd3928c4486260bea5b166ea67a5d4799963`. Le travail ne modifie ni la PR #427, ni `main`, ni DET ENGINE, ni la bibliothèque V1, ni les systèmes Nolio/Supabase.

## Résultat concret

`d16V2SlotProposals.ts` réutilise **les vrais 20 modèles V2**, l'instanciateur et le fitter temporel existants et le bridge réel vers `zSession`. Pour un créneau de qualité défini en semaine de charge, il peut maintenant :

- Rechercher uniquement des modèles compatibles avec discipline, objectif, phase et intention **explicitement demandée par le coach** (seuil ou VO₂max).
- Exiger que le limiteur demandé existe dans les priorités transportées par le plan ; aucun diagnostic `aerobic_dominant`/`glycolytic_dominant` ne se transforme automatiquement en prescription.
- Exiger une ancre spécifique à la discipline **explicitement vérifiée et munie d'une provenance**, sans considérer FTP/VMA/CSS/TTE synthétiques comme des mesures certifiées.
- Ajuster uniquement les paramètres temporels permis par V2 pour obtenir une **durée exacte**, sans changer l'intensité ou les limites de séance.
- Restituer les segments de travail ciblés séparément de l'échauffement, des récupérations et du retour au calme ; produire une prévisualisation V2 `custom=true/catalogId=null`, sans réutilisation trompeuse d'un ID V1.
- Garder le drapeau `doseAdequacyReviewed=false` : une séance techniquement réalisable **n'est pas une dose individuellement démontrée**. Le contrôle D1.4 doit encore signaler `missing_verified_stimulus`.

Le test positif utilise une **ancre fictive explicitement marquée vérifiée pour le seul test** et une hypothèse coach `TTE → seuil`. Il démontre la construction d'une séance seuil vélo de 60 minutes, pas l'efficacité physiologique de la séance ni le lien causal TTE↔seuil chez une personne réelle. Un deuxième test fait apparaître le modèle VO₂ vélo uniquement lorsqu'une hypothèse distincte est demandée. **Aucune hiérarchie automatique de limiteurs n'est imposée aux trois profils**.

Pour les trois profils D1 existants, les références transportées sont **synthétiques** : test négatif obligatoire, aucun candidat certifié pour une prescription individuelle, aucune levée des 3/4/4 erreurs historiques. Les quatre semaines D1.2 et leur compétition en S12 demeurent intactes.

## Deuxième progrès sur les ratios : le brick V2

`d16BrickEvidence.ts` lit les étapes de `V2_BRICK_01` / `V2_BRICK_02` et calcule une répartition **exacte prescrite**, sans hypothèse 50/50. Une séance `V2_BRICK_01` par défaut : 55 min vélo (échauffement inclus), 20 min course (retour au calme inclus), 2 min transition = 77 min exactes. Mutation des étapes, sport inconnu, somme incohérente ou temps fractionnaire impossible à transporter : refus.

Cette ventilation alimente le contrôle temporel exploratoire D1.4. **Prévu ≠ exécuté ; précision du calcul ≠ validité des ratios cibles.** `SPORT_RATIO_TARGETS` et les autres validateurs actifs ne sont pas modifiés, et ce test ne prouve pas que les bricks V1 sont ventilables.

## Critères de sortie inchangés

1. Approuver la signification scientifique des ratios (fréquences ou temps) et leur politique de charge.
2. Réconcilier les **véritables** sources de stimuli V2, les profils et les limiteurs avec des références documentées et une validation de dose indépendante.
3. Tester les 28 jours issus du vrai parcours D1, vérifier toutes les interdictions et la récupération sans supprimer de contrôles.
4. Effectuer sauvegarde, fermeture/réouverture et export de contrôle sur environnement de test autorisé, avant tout GO coach.

Le pilote D1.6 n'écrit aucun plan, ne modifie aucune compétition, n'effectue aucune action Nolio ou Supabase, et maintient le NO-GO production.
