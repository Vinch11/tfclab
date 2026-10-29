# Décision et risques résiduels

**NO-GO maintenu — #425 reste en DRAFT.** Ce lot permet la revue des corrections techniques ; il n'autorise ni fusion, activation, déploiement ni prescription individuelle.

## Conditions techniques de revue

- Aucune nouvelle erreur ESLint ; règles intactes, comparaison à la base exacte. Résultat local : 245 ≤ 246, contre 258 initialement.
- Tests V2, nouvelles non-régressions, 37 fixtures et sorties V2 conservés ; aucune correction d'équation, coefficient ou doctrine.
- TypeScript, build et protections de release passent ; déclaration source actualisée par l'outil normal, `attested:false`, `deploymentAttested:false`. Catalogue, contrats, locks et empreintes Edge inchangés.
- Les quatre checks GitHub du **dernier SHA publié** doivent être verts ; les résultats initiaux ou ceux d'un commit antérieur ne suffisent pas. Voir le compte rendu CI sur #425 et les preuves disponibles dans `evidence/`.
- Toute modification de discipline après import reste explicite. Une absence de coût, de comparaison ou de preuve scientifique ne vaut jamais statut favorable.

## Résultats et limites à ne pas masquer

La suite locale complète a exécuté 400 fichiers : **399 passent, un délai dépassé dans un test FIT non modifié** (5 509 ms pour une limite existante de 5 000 ms), 3 130 assertions passent, une échoue sur délai, une est ignorée et six sont TODO. Le rejeu isolé de ce fichier passe **11/11**, sans changer le délai, et est archivé séparément ; il ne transforme pas rétroactivement cette exécution en succès. Aucun délai ni assertion du test historique n'a été modifié. Les passes ciblées se recouvrent avec la suite complète et ne s'additionnent pas.

## Risques et décisions encore nécessaires

1. **Preuve physiologique indépendante** : archives observationnelles N=44/N=15/Modèle C non retrouvées par V2. Les commentaires, RMSE historiques et tests logiciels ne remplacent ni validation hors échantillon ni preuve individuelle. Registre V2 conservé.
2. **Sens de MLSS** : rapport vitesse seuil/VMA et pourcentage de VO₂max restent des grandeurs distinctes. Les équations ne sont pas remplacées ici ; la comparaison interne disponible avec coût explicite ne prouve pas leur équivalence expérimentale.
3. **Budget des notes** : notes et enveloppe partagent 2 000 caractères. Dépassement refusé explicitement ; aucune troncature ou migration automatique. Une évolution de stockage nécessiterait une décision séparée, hors périmètre.
4. **Historiques inconnus** : les valeurs restent consultables mais peuvent devenir inadmissibles pour une inférence spécifique sans discipline/provenance. Le coach doit qualifier la source, pas accepter une substitution automatique.
5. **Persistance et UI** : hook/transport simulé et navigateur/localStorage validés séparément ; pas de preuve réseau Supabase, RLS, concurrence entre onglets, OCR réel, impression native ou exhaustivité des surfaces legacy.
6. **DET** : le relais V24 est consulté en lecture seule ; son moteur n'est pas intégré/rejoué ici. Les règles de capacité, refus, source et récupération ne sont pas levées par le retrait de la comparaison MLSS invalide. Les adaptations restent à implémenter/revoir dans son propre chantier autorisé.
7. **Dette ESLint** : 245 erreurs préexistantes demeurent dans les fichiers concernés ; une CI verte signifie absence de régression comptée, pas absence de dette.

Décisions humaines : revue technique des corrections et du contrat, revue scientifique des sources/archives, puis qualification individuelle des références et des usages sportifs. Aucun GO sportif ou de production n'est déduit de la CI.
