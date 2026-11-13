# Profil physiologique complet et premium

## Résultat attendu
Une lecture complète, intuitive et soignée des informations physiologiques : les indicateurs ne disparaissent plus, les tests sont traçables et les courbes expliquent clairement ce qui est mesuré ou modélisé. La richesse d’information d’INSCYD est une direction, pas une revendication d’équivalence scientifique.

## 1. Restaurer tous les indicateurs
- Conserver la section existante et son style Daylight, avec des valeurs lisibles, des unités stables et des détails dépliables plutôt qu’une accumulation de paragraphes.
- Séparer « Priorités pour l’objectif » et « Profil complet » : TTE bien visible ; W′/D′, économie, dérive et FatMax présents comme informations complémentaires, sans leur attribuer automatiquement un déficit.
- Afficher les indicateurs absents avec « Données insuffisantes » ; une valeur sans cible reste visible sans score inventé.
- En triathlon, conserver vélo et course dans la même section, avec données propres à chaque sport ; présenter CSS séparément pour la natation.
- Harmoniser valeurs, sources et explications avec les rapports existants, sans changer les classements historiques des plans.

## 2. Fiabiliser la lecture des tests
- Ajouter une vue des preuves enregistrées pour l’athlète sélectionné : date, résultat brut, sport, origine, protocole, capteur et conditions.
- Identifier clairement les informations manquantes et les records à vérifier, sans certifier un test par son nom ou sa fiabilité calculée.
- Donner accès aux parcours de tests déjà disponibles et aux vérifications du bilan ; corriger les intitulés qui confondent durée au seuil et durabilité prolongée.
- Vérifier les conditions permettant de qualifier un TTE : seuil préalable, effort continu, épuisement documenté ; sinon conserver une estimation ou un minimum, jamais une mesure certifiée.
- Ne pas modifier les bilans de Vince ou d’Emanuela pour les besoins des contrôles.

## 3. Contrôler et rendre lisibles les courbes
- Réunir les courbes existantes par question physiologique, avec unités cohérentes et détails avancés repliables.
- Montrer les entrées utilisées, le sport, les hypothèses et les limites de chaque modèle ; conserver une vue explicite quand une courbe est indisponible.
- Contrôler les prérequis, valeurs finies, conversions d’unités et cohérence entre courbes et résumés ; supprimer les valeurs moyennes inventées et les conversions vélo/course non justifiées.
- Distinguer oxydation des glucides, apport alimentaire et tolérance digestive ; afficher FatMax avec intensité et débit lorsque le modèle le permet.
- Distinguer FTP, CP et MLSS ; ne pas présenter une courbe de lactate simulée comme un test réalisé.

## Validation et limites
- Tests automatisés ciblés sur données absentes, séparation sportive, provenance, unités et non-modification des plans.
- Contrôle connecté Vince/Emanuela sur ordinateur et téléphone : indicateurs, preuves, accès aux tests et courbes disponibles/indisponibles.
- Vérifier les rapports concernés, la compilation et la cohérence des versions ; redéployer les fonctions de génération si leur déclaration de version doit être synchronisée.
- Documenter les modèles réellement contrôlés et les validations expérimentales restant nécessaires. Une cohorte synthétique ou un test logiciel ne démontre pas une équivalence scientifique avec INSCYD.

## Détails techniques
- Projections de présentation en lecture seule dans `coachingCompass`, basées sur les diagnostics sportifs et `staffEvidence` existants.
- Réutiliser les composants de design, les tokens Daylight et les parcours de tests existants ; éviter un second dashboard ou un moteur physiologique concurrent.
- Toute correction de validation de saisie reste partagée entre création et modification ; les contrats IA/DET et autorisations des séances demeurent inchangés.
- Aucune publication automatique. Aucun nouveau protocole scientifique ou résultat clinique inventé.