# Revue ciblée — navette lactate et séances norvégiennes

## Portée

Relecture des fiches et du mécanisme commun de sélection/substitution ; essais locaux de catalogue uniquement. Aucun appel IA, aucune génération de plan, aucune écriture athlète, aucun changement Nolio, aucun déploiement ni publication. Les résultats ne valident pas la qualité d'un plan complet.

## Correction du diagnostic initial

L'affirmation « toutes les séances norvégiennes sont impossibles à sélectionner » est inexacte. Trois identifiants du verrou n'existent pas dans la bibliothèque actuelle : `ENR_RUN_NORWEGIAN_4X8`, `ENR_RUN_NORWEGIAN_5X6`, `ENR_BIKE_NORWEGIAN_5X5`. Leur verrou ne dit rien sur l'accessibilité des autres fiches norvégiennes réellement présentes.

Les fiches `NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME` et `NORWEGIAN_BIKE_THRESHOLD_LOW` sont déjà accessibles au contrôle de prérequis. Les fiches AM et PM existent également et ne sont pas bloquées par une approbation nominative. Le double seuil course complet possède un minimum de niveau hautement entraîné et de 8 h/semaine, mais pas d'approbation explicite dans les métadonnées actuelles.

## Classement d'après le contenu réel

| Fiche | Contenu | Conclusion de revue |
|---|---|---|
| `B_RUN_LACTATE_SHUTTLE` | 4–6 × (3 min au seuil + 2 min récupération active Z2), variantes course | Candidate à une sélection conditionnelle sans approbation nominative ; ne pas l'assimiler à une séance maximale. Avant déblocage, traiter ses exclusions « VLamax très haute » et « fatigue élevée » sans inventer de seuil numérique. |
| `ENR_RUN_LACTATE_CLEARANCE` | 6 × (2 min Z5 + 4 min Z3 sans repos facile) | Domaine sévère présent ; conserver l'approbation. Ce n'est pas la même charge que la navette course au seuil. |
| `ENR_BIKE_LACTATE_SHUTTLE` | 8 × (90 s Z5 + 3 min Z3) | Domaine sévère présent ; conserver l'approbation. |
| `NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME` | Séance unique sous-seuil, continue ou fractionnée | Déjà accessible ; expliciter le domaine `sub_threshold` et ne pas annoncer un contrôle lactique sans mesure. |
| `NORWEGIAN_BIKE_THRESHOLD_LOW` | Séance sous-seuil vélo | Déjà accessible ; certaines variantes sont à intensité spécifique IM/70.3, pas au sous-seuil annoncé par le titre. Ne pas les relabeliser comme seuil. |
| Fiches AM/PM, double journée et semaine norvégienne | Organisation à forte dose cumulée | L'audit révèle des protections non homogènes ; ne pas les ouvrir davantage. Une véritable double journée doit rester soumise à revue explicite, volume et récupération. |
| `NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL` | Paliers avec prélèvements de lactate | Garder l'approbation. Un point de lactate fixe à 3,5–4 mmol/L ne prouve pas un MLSS individuel. |

## Ce que permet la littérature

- Casado, Foster, Bakken et Tjelta (2023), revue descriptive du modèle : les séances sont guidées par des mesures répétées de lactate, au sein d'un très gros volume principalement facile. Ce n'est ni une démonstration de supériorité universelle ni une justification d'une double journée pour tout athlète : https://www.mdpi.com/1660-4601/20/5/3782
- Brooks (2018), théorie de la navette lactate : explique le transport et l'utilisation du lactate. Elle ne valide pas à elle seule la recette « 4–6 × 3 min / 2 min » ni un gain spécifique garanti de clairance : https://www.cell.com/cell-metabolism/fulltext/S1550-4131(18)30186-4
- Les domaines prescrits restent ceux de `tfclDoctrine.ts`. Le nom d'un auteur ne définit ni l'intensité ni la sécurité.

## Essais locaux avant modification

Signal synthétique : niveau `trained`, source `manual`, 8 h/semaine ; fenêtre S5–S8 d'un horizon de 16 semaines, phase `build`, limiteur TTE. Catalogue avec plafonds 60 et 100 000. Aucun compte ni donnée réelle utilisés. Ces options ne reproduisent pas toutes les options d'un plan réel.

| Objectif transmis | Fiches observées, parmi les fiches inspectées |
|---|---|
| 5 KM | Sous-seuil course volume, sous-seuil vélo, course AM et PM |
| 10 KM | Sous-seuil course volume et AM |
| Semi-marathon | Sous-seuil course volume et AM |
| Marathon | Sous-seuil course volume |
| Trail | Aucune des fiches inspectées ; ne pas forcer une recette route dans cette voie |
| Half | Sous-seuil course volume et AM |
| Ironman | Sous-seuil course volume, AM et PM |

Les trois navettes présentes sont refusées sans approbation dans tous ces essais. Des séances norvégiennes simples arrivent déjà au catalogue : leur absence dans un plan final ne s'explique donc pas uniquement par le verrou. Il reste à tracer leur classement, leur intention physiologique, les variantes et le choix final, sans leur imposer un quota artificiel.

## Suite recommandée

1. Corriger les métadonnées d'intention des fiches simples selon les domaines canoniques ; distinguer séance sous-seuil et variante spécifique course.
2. Préparer le déblocage de la seule navette course au seuil, avec exclusions réellement vérifiables, profil fiable et niveau adapté. Une exclusion qualitative non traduite en contrat valide reste un motif de non-activation, pas une invitation à inventer un chiffre.
3. Conserver les protections des navettes sévères et du test lactate ; harmoniser les protections des vraies doubles journées sans créer maintenant le parcours d'approbation refusé par le coach.
4. Vérifier catalogue et substitutions sur 5 km, 10 km, semi, marathon, trail, 70.3 et Ironman. Aucune preuve de plan impeccable ne peut être tirée de ces seuls tests.

Aucune règle de sélection n'est modifiée à l'issue de cette revue.

## Installation après approbation du plan

La phrase précédente décrit l'état de la revue avant approbation ; les corrections ci-dessous ont ensuite été installées :

- Intention canonique `sub_threshold` pour les séances course volume et vélo sous-seuil ; famille de couverture « seuil » conservée, sans les confondre avec le MLSS ni l'endurance LT1. Métadonnées de la navette au seuil et des deux navettes sévères relues explicitement.
- Fiches simples clarifiées : l'allure/puissance et la FC ne prouvent pas la lactatémie ; variantes spécifiques IM/70.3 signalées comme distinctes de la recette sous-seuil. Référence Brooks ramenée à une explication mécanistique, sans validation prétendue de cette recette.
- Approbation nominative ajoutée aux vraies fiches AM/PM, double journée course, semaine norvégienne et double seuil côte urbain. Le minimum existant de niveau/volume du double seuil complet est conservé. Le parcours d'approbation n'est pas construit : ces fiches demeurent donc fermées dans l'app réelle.
- La navette course au seuil reste automatiquement bloquée, même avec un accord nominatif : son signal actuel ne contient ni fatigue ni VLamax et ses exclusions qualitatives n'ont pas de contrat validé. Aucun seuil inventé ; préparation ne signifie pas activation.
- Navettes sévères et test lactate : approbation conservée.

Vérification : 58 tests dans huit fichiers passent, dont catalogue et non-contournement des substitutions pour sept objectifs ; déclaration de version vérifiée fraîche, dernier aperçu « build OK ». Essais locaux avec plafond 60 : sous-seuil course volume toujours présent pour 5 km, 10 km, semi, marathon, Half et Ironman ; aucune des fiches inspectées forcée dans Trail. Vélo sous-seuil présent dans les essais 5 km et 10 km sans filtre sportif ; cela n'atteste pas sa présence dans un vrai plan course pure.

Les fonctions `ai-training-plan` et `ai-training-plan-test` ont été déployées avec succès pour maintenir la concordance de version. Aucun appel IA, aucune génération complète ni validation coach de plan effectués. Aucun changement de données athlètes, de Nolio ou publication du site. La qualité d'un plan réel et les exclusions de fatigue/charge des fiches simples restent à vérifier dans le contexte complet du plan ; les essais ne certifient pas toutes les contre-indications textuelles.