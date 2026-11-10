# Repères critiques — méthode et limites

## Sources
- Muniz-Pumares et al. (2019), revue méthodologique : https://journals.lww.com/nsca-jscr/fulltext/2019/02000/methodological_approaches_and_related_challenges.34.aspx
- Kordi et al., comparaison vitesse critique/D′ à deux et trois tests : https://doi.org/10.1123/ijspp.2017-0809
- Simpson et Kordi, protocole vélo 3/12 min et troisième test 5 min, familiarisation : https://doi.org/10.1123/ijspp.2016-0371
- Hunter et al., records habituels vs tests 3/7/12 min : https://repository.londonmet.ac.uk/8870/1/IJSPP-2023-0276_online.pdf

Deux tests peuvent être utiles et reproductibles dans des protocoles étudiés. TFCL exige conservativement trois points pour l’admissibilité de l’aperçu : avec deux points, le modèle interpole exactement et ne permet pas de contrôler les résidus. Cela n’est pas une invalidation scientifique de tous les protocoles à deux tests.

## Politique applicative initiale
Efforts de 120–900 secondes, rapport durée longue/courte ≥3, valeurs positives et intensité moyenne décroissante. Dates connues, pas futures, au plus 42 jours anciennes, étendue ≤28 jours. Conditions documentées identiques et référence de séance requises. Ces seuils de prudence sont des règles TFCL, pas des limites physiologiques universelles ni une garantie de validité.

Modèles linéaires : distance = VC × temps + D′ ; travail = CP × temps + W′. Écart relatif maximal ≤5 % ; sensibilité maximale au retrait d’un point ≤10 % pour VC/CP et D′/W′. R² ne suffit jamais à valider le protocole. Aucun intervalle de confiance statistique n’est prétendu.

D′ et W′ ne sont pas des mesures directes de capacité glycolytique. La sollicitation (intensité − repère critique) × temps vaut seulement pour un effort continu ; aucune reconstitution D′bal, récupération ou répétition n’est extrapolée.

## Livraison et dépendances
L’étude peut être saisie manuellement, alimentée par records Nolio explicitement convertibles, et exportée en JSON. Elle ne sauvegarde aucune donnée athlète, ne devient pas le bilan de référence et ne modifie aucun plan. Le calcul historique CP/W′ et ses consommateurs restent inchangés.

L’enregistrement structuré des efforts/confirmations attend une autorisation de migration. L’option de configuration et l’adaptation des séances ne sont pas activées sans stockage validé et contrats de variantes propres à chaque sport. Ne pas afficher une option qui n’aurait aucun effet réel.

## Vérifications réalisées
76 tests ciblés réussis : 19 du nouveau calcul, 16 import Nolio, 41 mécanisme vélo historique. Parcours connecté sur Emanuela sans sauvegarde, avec efforts explicitement fictifs : 3/7/12 minutes, VC 14,40 km/h et D′ 200 m, effort isolé 3 minutes à 16,2 km/h sollicitant 90 m (45 %). Modification d’un point annule l’accord. Affichage vérifié à 1280×1800 et 390×844 sans débordement horizontal du dialogue ; aperçu sans erreur de compilation.

L’import réel de tests critiques, la lecture après sauvegarde, les variantes de séances et un plan réellement généré ne sont pas vérifiés. Aucune généralisation aux sept disciplines : le planificateur n’a pas été modifié. Aucune fonction déployée car aucune fonction n’a changé.