# Prescription prospective V9 — preuve de concept offline

Reprise de902353d7. Aucun rejeu des dix unitésV8, aucune modification du moteur actuel. Deux cas pilotes et deux témoins de sensibilité : Ironman `trained/finisher` et trail montagne `trained/competitor`. Tous les profils sont synthétiques ; les champs viennent des préparateurs QA et fixturesV4 existants, sans ajout de valeur physiologique destiné à faire passer la sélection.

## Chaîne réellement calculée

1. `v9Pilots` prépare les contextes existants, dont leurs incertitudes.
2. `prospectiveInputs` extrait uniquement profil, diagnostic, contraintes coach, quota/floors et enveloppe. Aucun catalogue, ID de séance ou calendrier n’entre dans `decideBeforeSelection` ; des entrées de ce type sont explicitement refusées.
3. `decideBeforeSelection` produit limiteur, priorité, rôle, adaptation hypothétique, domaine plafond TFCL, minima et maxima, règle de dose, récupération, interactions, observations et critères de retrait. Cette intention reçoit une empreinte avant toute sélection.
4. `selectFromIntent` applique les conventions de dose annoncées et les contrôles catalogue, niveau, prérequis, intention et contexte temporel. Il choisit un ID existant et sa dose ou refuse explicitement. L’intention initiale n’est pas réécrite.
5. `placeSelected` construit les sept jours seulement après les étapes précédentes. Il vérifie disponibilité, nombre de séances par jour, absence de doublon disciplinaire le même jour, jours sans séance, espacement candidat des sorties longues et budget partagé.
6. Les validateurs historiques sont exécutés sur le préfixe d’une semaine dans le contexte complet de préparation. Leurs erreurs ne sont pas supprimées. Un tel préfixe ne constitue pas un plan complet de16semaines.
7. Le contrôleur de feedback traite des observations explicitement synthétiques. Toute substitution reste une proposition ; elle doit passer la non-régression et une revue coach avant application.

Les traces `evidence/canonical/decisions.json.gz` enregistrent les quatre étapes et leurs empreintes, les calendriers, les refus et les contrôles. Le test inverse l’ordre du catalogue sans changer le choix et refuse une intention modifiée après empreinte. Le rejeu complet est une seconde exécution indépendante, pas seulement une deuxième sérialisation du même objet.

## Portée physiologique

Le diagnostic guide l’hypothèse, pas une formule dose-réponse. VLamax n’est pas présentée comme une mesure de laboratoire ; TTE n’est pas assimilé à la durabilité. Le soutien aérobie général est distinct du travail ciblé TTE, ici refusé faute de preuve de tolérance à une dose de seuil. Une mobilité choisie comme soutien n’est pas une dose de force maximale démontrée.

Les domaines sont ceux de `src/lib/zones/tfclDoctrine.ts`. Le domaine de l’intention est un plafond demandé ; les zones exactes de la fiche restent affichées et inchangées. Aucun pourcentageVMA ajouté, aucune progression universelle et aucune adaptation réellement observée revendiquée.

## Quatre niveaux de preuve

- **Littérature** : référencesV8 vérifiées ;R25 contextualise les distributions,M21 la durabilité,S25 les limites de mesureVLamax. Aucune ne fournit la dose numérique optimale individuelle utilisée ici.
- **Lorang documenté** :L175/L417 justifient le raisonnement profil/historique/stimulus/retour, pas une recette universelle.
- **Catalogue et programmation** : bornes de durée, prérequis, quotas et budget restent des conventions existantes exécutables.
- **HypothèseTFCL** : enveloppe répartie, essai initial au bas de la plage admissible, refus conservateur des intentions ambiguës et des sollicitations verticales non attestées. Ces choix restent candidats, sans promotion méthodologique.

[Sources et limitesV8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md). Aucune source nouvelle ou efficacité clinique n’est inventée. Aucune famille ajoutée à la CoachPreview applicative ; sortie offline uniquement, revue coach obligatoire.
