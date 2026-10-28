# Spécificité Ironman : ce que couvre réellement la base

Le bloc couvre quatre semaines de base, pas une préparation Ironman complète. Les éléments manquants sont analysés sans ajouter des séances pour remplir des cases. Les exemples ci-dessous sont des fiches existantes ; leurs noms ou indications ne remplacent pas les prérequis et les règles du moteur.

| Besoin | Dans V11/V12 | Place pertinente à examiner dans une préparation complète | Preuve avant ajout ou modification |
|---|---|---|---|
| Natation technique | Deux présences d’endurance ; multi-nages et variété, sans diagnostic de nage ni progression technique mesurée | Travail ciblé en base, puis réévaluation et entretien selon besoin ; C_SWIM_CATCH_FOCUS est un exemple source base/build de 35–50 min | Défaut technique observé, aptitude au contenu, protocole complet réalisable dans le temps et arbitrage explicite du rôle remplacé. Aucune séance ajoutée ici. |
| Force réellement prescrite | Yoga/mobilité 30 min ; le slot logiciel strength ne prouve aucune dose de force | Source C_STR_MAX_LOWER_HEAVY située base/début build, avec expérience de barre et technique vérifiées ; ce n’est pas un calendrier obligatoire | Source minimum50 min > plafond de soutien V10 de40 min ; expérience barre et référence de charge non établies. Ne pas tronquer à30–40 min ni compter la mobilité comme force lourde. |
| Endurance longue | Vélo autonome180 ou120 min selon profil ; course initiale65/90 min dans V12, puis planchers réels ; continuité des disciplines préservée | Construire ensuite la spécificité et les longues compatibles avec phases, sources, disponibilité et réponses | Les longues actuelles satisfont les planchers de base individualisés, pas une exigence Ironman universelle. Le plafond vélo150 min du profil équilibré ne garantit pas une fiche complète compatible plus tard. |
| Position aéro | Source dédiée, distincte de la longue ; scénario10→15 min par bloc en V12 | Développer l’exécution puis l’intégration à une endurance plus spécifique lorsque capacité, confort et réponse sont documentés | Posture stable, symptômes, réglage/confort appropriés et récupération. Aucune équivalence de dose longue ni de fatigue n’est inférée. |
| Nutrition | Une source longue mentionne le ravitaillement, sans protocole individuel exécutable ni observation de tolérance | Entraînement progressif et individualisé sur efforts pertinents, avant simulation spécifique et compétition | Quantités, conditions et tolérance à documenter ; aucun objectif universel en g/h créé à partir de cette étude. Mention dans la fiche ≠ stratégie validée. |
| Futurs bricks | Aucun en base dans ces blocs ; aucun crédit combiné artificiel | Introduction de transition et travail plus spécifique selon objectif/phase et réponse post-vélo ; composantes explicites obligatoires | Durées vélo/course, récupération, calendrier et tolérance au post-vélo. Ne pas retirer une discipline autonome ou créditer toute la durée du brick comme longue vélo. |

LL24 soutient certains bénéfices moyens de modalités de renforcement, sans établir que toute fiche strength traite un défaut d’économie individuel. Les charges et pourcentages figurant dans les fiches sont leurs prescriptions existantes, pas de nouvelles règles V12. Les sources et limites scientifiques restent celles de la matrice V8.

## Témoin reproductible : une fiche de transition ne peut pas être insérée telle quelle

C_BRICK_TRANSITION_DRILL (src/lib/enrichedWorkoutsV4.ts) annonce30–45 min. Sa structure contient15 min de vélo, puis cinq fois3 min de vélo +3 min de course, puis10 min de jogging :

**15 + 5 × (3 + 3) + 10 = 55 min au minimum**, hors temps de transitions non quantifiés.

Les composantes nommées donnent30 min de vélo et25 min de course, avec un supplément de transitions encore inconnu. Ce témoin dépasse déjà le maximum45 min. La fiche indique aussi peak dans when et build/peak dans phase ; aucune insertion en base n’est effectuée. Ce résultat porte sur cette fiche, pas sur tous les bricks du catalogue.

Une réparation de source ou de contrat serait nécessaire avant de la retenir intégralement ; la V12 n’altère ni catalogue ni validateur de production. Le diagnostic est conservé dans evidence/specificity-inventory.json avec ancre et empreinte de fichier. On ne réduit pas les répétitions ni ne supprime l’échauffement pour rendre la durée artificiellement admissible.

## Limites de la préparation ultérieure

Aucun calendrier des douze semaines restantes n’est revendiqué. La phase exacte, les compétitions, les capacités mises à jour, les séances longues, l’eau libre, la nutrition et les composantes de bricks devront être construites et contrôlées ensemble. Les variations évaluées ici n’autorisent ni fusion ni promotion de doctrine. Une revue indépendante reste nécessaire.
