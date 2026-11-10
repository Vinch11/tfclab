# Vitesse critique et puissance critique dans TFCL

## Objectif
Ajouter un parcours clair pour estimer puis valider la vitesse critique/D′ course et la puissance critique/W′ vélo, avant de les utiliser pour individualiser certaines séances. LT1, MLSS, durabilité, fatigue et nutrition restent les repères des autres efforts.

## 1. Valider les méthodes et les données admissibles
- Revoir le calcul vélo existant : il utilise aujourd’hui surtout 30 s, 60 s et 5 min, sans garantir des tests confirmés. Ne pas le présenter comme un protocole critique validé.
- Définir, à partir de références scientifiques, les durées admissibles, l’espacement des efforts, les conditions comparables et les contrôles de qualité propres à chaque sport.
- Viser trois efforts maximaux de durées bien distinctes dans une plage adaptée au modèle, généralement de quelques minutes à environ 12–15 minutes. Deux efforts pourront donner une estimation provisoire, mais ne suffiront pas à vérifier l’ajustement.
- Exclure du calcul les sprints très courts et une FTP sans durée d’effort connue. Vérifier capteur, unités, pauses, terrain, conditions et caractère maximal.
- Ne pas assimiler CP/vitesse critique à FTP/MLSS et ne pas appeler W′/D′ une mesure directe de glycolyse ou de VLamax.

## 2. Relier Nolio et les journées de tests
- Réutiliser la sélection de période, des sports et des séances Nolio ; proposer les records pertinents sans les certifier automatiquement.
- Pour chaque effort : conserver durée, puissance moyenne vélo ou distance course, date, séance, segment lorsqu’il est disponible, conditions et provenance.
- Permettre aussi une saisie manuelle documentée ; préserver les résultats déjà saisis.
- Le coach pourra confirmer qu’un record vient d’un test maximal conforme. Les confirmations actuelles ne deviendront pas rétroactivement une validation du nouveau protocole.
- Garder les données vélo/course séparées, et distinguer les conditions incompatibles : tapis/extérieur, home trainer/route, parcours vallonné/piste.

## 3. Créer un écran « Repères critiques » lié au bilan
Accessible depuis le bilan et le profil, sans ajouter un huitième onglet principal.
- Deux vues : **Course** et **Vélo**.
- Course : vitesse critique en km/h et min/km, D′ en mètres ; vélo : CP en watts, W′ en kJ.
- Liste des efforts retenus, courbe, écarts du modèle, date et provenance de chaque point.
- Statuts séparés : **Estimation sur records**, **Tests confirmés — qualité à vérifier**, **Validé pour les intervalles**, **Données insuffisantes**.
- Montrer la sensibilité au choix des efforts ; un R² élevé seul ne prouve pas la validité. Ne pas inventer une marge d’incertitude avec deux points.
- Confirmation explicite du coach pour retenir un résultat dans le bilan de référence ; historiques conservés et recalcul invalidant l’ancienne autorisation.

## 4. Intégrer progressivement les séances
### Première étape : aperçu comparatif, sans modification automatique
- Ajouter dans la configuration du plan un choix désactivé par défaut : « Utiliser les repères critiques validés ».
- Montrer sur les intervalles admissibles le repère critique, la sollicitation estimée de W′/D′ et une proposition comparée à la séance originale.
- Records seuls, données suspectes, anciennes ou manquantes : information seulement, prescription habituelle conservée.

### Deuxième étape : adaptation encadrée
- Autoriser l’adaptation uniquement sur des variantes de catalogue explicitement compatibles, après validation de leurs contrats sportifs.
- Pour la course, commencer par l’allure et le volume des fractions continues au-dessus de la vitesse critique ; ne pas transposer la récupération W′bal vélo en D′bal course.
- Pour le vélo, réviser le mécanisme existant de recalcul des récupérations pour qu’il utilise la provenance et les critères du nouveau parcours.
- Ne pas utiliser ces modèles pour prédire précisément les récupérations courtes, les sprints ou le nombre de répétitions jusqu’à épuisement.
- Respecter niveau, charge, fatigue, récupération, phase et autorisations de séances exigeantes. Les commentaires IA ne pourront pas modifier les résultats ou les limites.
- Sans repère admissible, revenir aux variantes habituelles : ce module ne doit pas bloquer la sauvegarde d’un plan autrement valide.

## 5. Vérification et activation
- Tests numériques sur profils de référence et cas invalides : unités, doublons, efforts trop proches, manque de points, valeurs incohérentes, dates et provenance.
- Tests garantissant qu’un record non confirmé n’autorise pas l’adaptation, qu’une validation coach ne contourne pas une mauvaise qualité et que course/vélo restent séparés.
- Vérifier import → sélection → calcul → confirmation → lecture du bilan de référence → aperçu d’intervalle, en création et modification, ordinateur et mobile.
- Vérifier les impacts sur 5 km, 10 km, semi, marathon, trail, 70.3 et Ironman, en distinguant les usages réellement admissibles et ceux inchangés.
- Fournir un bilan des contrôles réalisés avant activation ; un test synthétique ne validera pas la qualité sportive d’un plan réel.

## Détails techniques
- Conserver le moteur CP/W′ historique pour ses usages existants tant que sa migration n’est pas validée ; ajouter un calcul documenté à partir d’efforts avec provenance, sans modifier silencieusement les diagnostics VLamax.
- Calcul course : modèle distance = vitesse critique × durée + D′ ; vélo : travail = CP × durée + W′. Vérifier les limites et la sensibilité des modèles avant prescription.
- Centraliser calculs, admissibilité et statuts, puis les partager entre profil, import et génération/régénération simple et groupée.
- Séparer résultats bruts et résultats autorisés pour prescription ; lier les validations à l’athlète, au sport, aux efforts et au bilan de référence.
- Prévoir des données structurées pour conserver les efforts et validations ; toute migration ou écriture réelle nécessite une autorisation distincte.
- Toute modification des fonctions du générateur inclura déclaration de version à jour, tests et déploiement coordonné des deux fonctions.

## Limites de cette étape
Préparer et tester sans appel IA payant, sans sauvegarde de données athlète, sans migration, sans changement des identifiants Nolio et sans publication. Les lectures Nolio existantes sont réutilisées ; un protocole réellement confirmé et un plan complet feront l’objet d’une vérification autorisée séparément.

**Ordre de livraison : méthodes et calculs → écran et import → aperçu comparatif → adaptation des variantes validées.**